/**
 * Import helpers: CSV parsing, column auto-matching, row -> contact conversion, duplicate flagging.
 * The wizard flow (upload -> choose header -> match columns -> validate) is modelled on Twenty's
 * spreadsheet import (AGPL); implemented from scratch with Fuse.js (already a dependency).
 */
import Fuse from 'fuse.js';
import type { Contact } from '../../types/contact';
import { findDuplicateGroups } from '../merge/findDuplicates';

export interface ImportTarget {
  key: string; // Contact property, or `custom:<label>`
  label: string;
  aliases: string[];
  required?: boolean;
}

export const BASE_IMPORT_TARGETS: ImportTarget[] = [
  { key: 'firstName', label: 'First name', required: true, aliases: ['first name', 'firstname', 'first', 'given name', 'forename'] },
  { key: 'lastName', label: 'Last name', required: true, aliases: ['last name', 'lastname', 'last', 'surname', 'family name'] },
  { key: 'name', label: 'Full name', aliases: ['full name', 'fullname', 'name', 'contact name', 'contact'] },
  { key: 'email', label: 'Email', required: true, aliases: ['email', 'e-mail', 'email address', 'mail', 'work email'] },
  { key: 'phone', label: 'Phone', aliases: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel'] },
  { key: 'title', label: 'Title', aliases: ['title', 'job title', 'position', 'role'] },
  { key: 'company', label: 'Company', aliases: ['company', 'organization', 'organisation', 'employer', 'account', 'company name'] },
  { key: 'industry', label: 'Industry', aliases: ['industry', 'sector', 'vertical'] },
  { key: 'status', label: 'Status', aliases: ['status', 'stage', 'lifecycle', 'lead status'] },
  { key: 'interestLevel', label: 'Interest', aliases: ['interest', 'interest level', 'interestlevel', 'temperature', 'priority'] },
  { key: 'tags', label: 'Tags', aliases: ['tags', 'labels', 'tag'] },
  { key: 'sources', label: 'Sources', aliases: ['source', 'sources', 'lead source', 'origin'] },
  { key: 'notes', label: 'Notes', aliases: ['notes', 'note', 'comments', 'description'] },
  { key: 'socialProfiles.linkedin', label: 'LinkedIn', aliases: ['linkedin', 'linkedin url', 'linkedin profile'] },
  { key: 'socialProfiles.twitter', label: 'Twitter / X', aliases: ['twitter', 'x', 'twitter url', 'twitter handle'] },
  { key: 'socialProfiles.website', label: 'Website', aliases: ['website', 'web', 'url', 'site', 'homepage'] },
];

export const IGNORE = '';

const ZWJ = '‍';
/** Remove the zero-width joiner our CSV export prepends to formula-looking values (round trip). */
export const cleanImportedValue = (v: unknown): string => String(v ?? '').replace(new RegExp(`^${ZWJ}`), '').trim();

const norm = (s: string) => s.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

/** RFC 4180 CSV parser: quoted fields, escaped quotes, commas and newlines inside quotes. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

/**
 * Suggest a target for each file column. Exact alias matches win; otherwise Fuse.js fuzzy matching
 * (accepted only when clearly better than the runner-up). Each target is used at most once.
 */
export function autoMatchColumns(headers: string[], targets: ImportTarget[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const used = new Set<string>();
  const byAlias = new Map<string, string>();
  targets.forEach((t) => {
    byAlias.set(norm(t.label), t.key);
    t.aliases.forEach((a) => byAlias.set(norm(a), t.key));
  });

  headers.forEach((h, i) => {
    const key = byAlias.get(norm(h));
    if (key && !used.has(key)) { mapping[i] = key; used.add(key); }
  });

  const fuse = new Fuse(
    targets.flatMap((t) => [t.label, ...t.aliases].map((text) => ({ key: t.key, text: norm(text) }))),
    { keys: ['text'], includeScore: true, threshold: 0.3 }
  );
  headers.forEach((h, i) => {
    if (i in mapping || !norm(h)) return;
    const results = fuse.search(norm(h)).filter((r) => !used.has(r.item.key));
    const best = results[0];
    if (!best || (best.score ?? 1) >= 0.4) return;
    const runnerUp = results.find((r) => r.item.key !== best.item.key);
    if (runnerUp && (runnerUp.score ?? 1) - (best.score ?? 0) < 0.05) return;
    mapping[i] = best.item.key;
    used.add(best.item.key);
  });

  headers.forEach((_, i) => { if (!(i in mapping)) mapping[i] = IGNORE; });
  return mapping;
}

const STATUSES = ['lead', 'prospect', 'customer', 'churned', 'active', 'pending', 'inactive'];
const INTERESTS = ['hot', 'medium', 'low', 'cold'];
const splitList = (v: string) => v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);

export interface ImportedRow {
  rowNumber: number; // 1-based in the file (header = 1)
  contact: Record<string, any>;
  errors: string[];
}

export function validateImportedContact(c: Record<string, any>): string[] {
  const errors: string[] = [];
  if (!c['firstName']) errors.push('First name is required');
  if (!c['lastName']) errors.push('Last name is required');
  if (!c['email']) errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c['email'])) errors.push('Invalid email format');
  if (c['interestLevel'] && !INTERESTS.includes(c['interestLevel'])) errors.push('Interest level must be: hot, medium, low, or cold');
  if (c['status'] && !STATUSES.includes(c['status'])) errors.push(`Status must be: ${STATUSES.join(', ')}`);
  return errors;
}

/** Apply a mapping to raw rows. `rows` excludes the header row; `firstRowNumber` is the file row of rows[0]. */
export function rowsToContacts(rows: string[][], mapping: Record<number, string>, firstRowNumber = 2): ImportedRow[] {
  return rows.map((row, idx) => {
    const c: Record<string, any> = {};
    Object.entries(mapping).forEach(([col, target]) => {
      if (!target) return;
      const value = cleanImportedValue(row[Number(col)]);
      if (!value) return;
      if (target.startsWith('socialProfiles.')) {
        c['socialProfiles'] = { ...(c['socialProfiles'] ?? {}), [target.split('.')[1]!]: value };
      } else if (target.startsWith('custom:')) {
        c['customFields'] = { ...(c['customFields'] ?? {}), [target.slice(7)]: value };
      } else if (target === 'tags' || target === 'sources') {
        c[target] = splitList(value);
      } else if (target === 'status' || target === 'interestLevel') {
        c[target] = value.toLowerCase();
      } else if (target === 'email') {
        c[target] = value.toLowerCase();
      } else c[target] = value;
    });

    // Full name <-> first/last
    if (c['name'] && !c['firstName'] && !c['lastName']) {
      const parts = String(c['name']).split(/\s+/);
      c['firstName'] = parts.shift() ?? '';
      c['lastName'] = parts.join(' ');
    }
    if (!c['name'] && (c['firstName'] || c['lastName'])) c['name'] = `${c['firstName'] ?? ''} ${c['lastName'] ?? ''}`.trim();

    const errors = validateImportedContact(c);
    // Defaults (same as the previous importer)
    c['sources'] = c['sources']?.length ? c['sources'] : ['Manual Import'];
    c['interestLevel'] = c['interestLevel'] || 'medium';
    c['status'] = c['status'] || 'lead';
    c['company'] = c['company'] || 'Unknown Company';
    c['title'] = c['title'] || 'Professional';
    c['avatarSrc'] = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
    c['tags'] = c['tags'] ?? [];
    return { rowNumber: firstRowNumber + idx, contact: c, errors };
  });
}

export interface DuplicateFlag {
  rowNumber: number;
  /** 'existing' = matches a contact already in the CRM, 'file' = matches an earlier row in this file */
  kind: 'existing' | 'file';
  matchName: string;
}

/** Flag rows that duplicate existing contacts or an earlier row of the same file. */
export function flagImportDuplicates(rows: ImportedRow[], existing: Contact[]): DuplicateFlag[] {
  const asContacts = (r: ImportedRow, id: string) => ({ ...(r.contact as object), id } as unknown as Contact);
  const fileContacts = rows.map((r) => asContacts(r, `row:${r.rowNumber}`));
  const flags: DuplicateFlag[] = [];
  const groups = findDuplicateGroups([...existing, ...fileContacts]);
  for (const g of groups) {
    const existingMember = g.contacts.find((c) => !String(c.id).startsWith('row:'));
    const fileMembers = g.contacts.filter((c) => String(c.id).startsWith('row:'));
    fileMembers.forEach((c, i) => {
      const rowNumber = Number(String(c.id).slice(4));
      if (existingMember) flags.push({ rowNumber, kind: 'existing', matchName: existingMember.name });
      else if (i > 0) flags.push({ rowNumber, kind: 'file', matchName: fileMembers[0]!.name });
    });
  }
  return flags.sort((a, b) => a.rowNumber - b.rowNumber);
}
