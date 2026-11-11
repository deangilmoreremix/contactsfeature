/**
 * Duplicate detection for contacts. Two contacts are candidates when they share a normalized email,
 * a normalized phone number, or the same name + company. Candidates are clustered transitively
 * (A~B by email and B~C by phone -> one group). Criteria idea from Twenty's duplicate criteria (AGPL);
 * implemented from scratch. Mirrors the SQL function find_contact_duplicates.
 */
import type { Contact } from '../../types/contact';

export type DuplicateReason = 'email' | 'phone' | 'name_company';

export interface DuplicateGroup {
  id: string;
  contacts: Contact[];
  reasons: DuplicateReason[];
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export const normalizeEmail = (v: unknown) => clean(v);
export const normalizePhone = (v: unknown) => (typeof v === 'string' ? v.replace(/\D/g, '') : '');

function keysFor(c: Contact): Array<{ reason: DuplicateReason; key: string }> {
  const keys: Array<{ reason: DuplicateReason; key: string }> = [];
  const email = normalizeEmail(c.email);
  if (email) keys.push({ reason: 'email', key: `email:${email}` });
  const phone = normalizePhone(c.phone);
  if (phone.length >= 7) keys.push({ reason: 'phone', key: `phone:${phone.slice(-10)}` });
  const name = clean(c.name) || clean(`${c.firstName ?? ''} ${c.lastName ?? ''}`);
  const company = clean(c.company);
  if (name && company) keys.push({ reason: 'name_company', key: `nc:${name}|${company}` });
  return keys;
}

export function findDuplicateGroups(contacts: Contact[]): DuplicateGroup[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(x) !== root) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  contacts.forEach((c) => parent.set(c.id, c.id));
  const byKey = new Map<string, { reason: DuplicateReason; ids: string[] }>();
  for (const c of contacts) {
    for (const { reason, key } of keysFor(c)) {
      const entry = byKey.get(key);
      if (entry) entry.ids.push(c.id);
      else byKey.set(key, { reason, ids: [c.id] });
    }
  }
  const reasonsByRoot = new Map<string, Set<DuplicateReason>>();
  for (const { ids } of byKey.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i++) union(ids[0]!, ids[i]!);
  }
  for (const { reason, ids } of byKey.values()) {
    if (ids.length < 2) continue;
    const root = find(ids[0]!);
    if (!reasonsByRoot.has(root)) reasonsByRoot.set(root, new Set());
    reasonsByRoot.get(root)!.add(reason);
  }

  const members = new Map<string, Contact[]>();
  for (const c of contacts) {
    const root = find(c.id);
    if (!reasonsByRoot.has(root)) continue;
    const list = members.get(root);
    if (list) list.push(c);
    else members.set(root, [c]);
  }
  return [...members.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([root, list]) => ({ id: root, contacts: list, reasons: [...reasonsByRoot.get(root)!] }))
    .sort((a, b) => b.contacts.length - a.contacts.length);
}
