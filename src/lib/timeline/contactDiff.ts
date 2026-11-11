/**
 * Timeline helpers: what changed on a contact (before/after per field) and month grouping.
 * The `{ field: { before, after } }` event shape and month grouping follow Twenty's timeline
 * activities (AGPL); implemented from scratch.
 */
import type { Contact } from '../../types/contact';

export interface FieldChange {
  before: unknown;
  after: unknown;
}
export type ContactDiff = Record<string, FieldChange>;

/** Bookkeeping fields that never appear in the history. */
const IGNORED = new Set(['updatedAt', 'createdAt', 'activityLog', 'position', 'avatarSrc', 'nextSendDate']);

const norm = (v: unknown) => (v === undefined || v === null || v === '' ? null : JSON.stringify(v));

export function computeContactDiff(before: Contact, after: Contact): ContactDiff {
  const diff: ContactDiff = {};
  const b = before as unknown as Record<string, unknown>;
  const a = after as unknown as Record<string, unknown>;
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (IGNORED.has(key)) continue;
    if (norm(b[key]) !== norm(a[key])) diff[key] = { before: b[key] ?? null, after: a[key] ?? null };
  }
  return diff;
}

const LABELS: Record<string, string> = {
  firstName: 'First name', lastName: 'Last name', interestLevel: 'Interest', aiScore: 'AI score',
  socialProfiles: 'Social profiles', customFields: 'Custom fields', isFavorite: 'Favorite',
  lastConnected: 'Last contact',
};
export const fieldLabel = (key: string) =>
  LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export function formatDiffValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'empty';
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'empty';
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    return keys.length ? keys.join(', ') : 'empty';
  }
  return String(v);
}

export type DiffActivityType = 'status_changed' | 'score_calculated' | 'updated';

export function classifyDiff(diff: ContactDiff): DiffActivityType {
  const keys = Object.keys(diff);
  if (keys.includes('status')) return 'status_changed';
  if (keys.length === 1 && keys[0] === 'aiScore') return 'score_calculated';
  return 'updated';
}

export function describeDiff(diff: ContactDiff): string {
  const keys = Object.keys(diff);
  if (keys.length === 1) {
    const k = keys[0]!;
    const d = diff[k]!;
    return `${fieldLabel(k)}: ${formatDiffValue(d.before)} → ${formatDiffValue(d.after)}`;
  }
  const shown = keys.slice(0, 3).map(fieldLabel).join(', ');
  return `Updated ${shown}${keys.length > 3 ? ` and ${keys.length - 3} more` : ''}`;
}

export interface MonthGroup<T> {
  key: string; // YYYY-MM
  label: string; // e.g. "November 2026"
  events: T[];
}

/** Newest month first; events inside a month keep newest-first order. */
export function groupEventsByMonth<T extends { createdAt: string }>(events: T[], locale?: string): Array<MonthGroup<T>> {
  const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups: Array<MonthGroup<T>> = [];
  for (const e of sorted) {
    const d = new Date(e.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: d.toLocaleString(locale ?? 'en-US', { month: 'long', year: 'numeric' }), events: [] };
      groups.push(g);
    }
    g.events.push(e);
  }
  return groups;
}
