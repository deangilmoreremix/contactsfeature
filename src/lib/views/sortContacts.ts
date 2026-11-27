/**
 * Multi-column stable sort for contacts.
 * - Sorts are applied in list order; later sorts only break ties of earlier ones.
 * - Empty values (null / undefined / NaN / invalid date) always sort last, in either direction.
 * - Text is compared case-insensitively, numbers numerically, dates chronologically.
 * - Equal rows keep their original order (stable), and the input array is never mutated.
 */
import type { Contact } from '../../types/contact';
import type { ViewSortConfig } from '../../types/view';

export type SortKind = 'text' | 'number' | 'date';

export interface SortFieldSpec<T = Contact> {
  kind: SortKind;
  get: (item: T) => unknown;
  /** Treat '' as a real (smallest) text value instead of an empty one. Keeps the legacy Name/Company sort. */
  emptyStringIsValue?: boolean;
}

export type SortFieldMap<T = Contact> = Record<string, SortFieldSpec<T>>;

/** Fields offered by the Contacts toolbar sort control (ids match its <option> values). */
export const CONTACT_SORT_FIELDS: SortFieldMap = {
  name: { kind: 'text', get: (c) => c.name?.toLowerCase(), emptyStringIsValue: true },
  company: { kind: 'text', get: (c) => c.company?.toLowerCase(), emptyStringIsValue: true },
  score: { kind: 'number', get: (c) => c.aiScore || 0 },
  updated: { kind: 'date', get: (c) => c.updatedAt },
  email: { kind: 'text', get: (c) => c.email },
  title: { kind: 'text', get: (c) => c.title },
  status: { kind: 'text', get: (c) => c.status },
  interestLevel: { kind: 'text', get: (c) => c.interestLevel },
  industry: { kind: 'text', get: (c) => c.industry },
  lastConnected: { kind: 'text', get: (c) => c.lastConnected },
};

export const CONTACT_SORT_LABELS: Record<string, string> = {
  name: 'Name',
  company: 'Company',
  score: 'Score',
  updated: 'Updated',
  email: 'Email',
  title: 'Title',
  status: 'Status',
  interestLevel: 'Interest',
  industry: 'Industry',
  lastConnected: 'Last contact',
};

type Normalized = string | number | null;

function normalize(value: unknown, spec: SortFieldSpec<any>): Normalized {
  if (value === null || value === undefined) return null;
  if (spec.kind === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (spec.kind === 'date') {
    const t = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(String(value));
    return Number.isNaN(t) ? null : t;
  }
  const s = String(value).toLowerCase();
  if (s.trim() === '' && !spec.emptyStringIsValue) return null;
  return s;
}

/** Returns a new, sorted array. Unknown sort fields are ignored. */
export function sortContacts<T = Contact>(
  items: readonly T[],
  sorts: readonly ViewSortConfig[],
  fields: SortFieldMap<T> = CONTACT_SORT_FIELDS as unknown as SortFieldMap<T>
): T[] {
  const active = sorts.filter((s) => fields[s.field]);
  const decorated = items.map((item, index) => ({
    item,
    index,
    keys: active.map((s) => normalize(fields[s.field]!.get(item), fields[s.field]!)),
  }));
  decorated.sort((a, b) => {
    for (let i = 0; i < active.length; i++) {
      const x = a.keys[i]!;
      const y = b.keys[i]!;
      if (x === y) continue;
      if (x === null) return 1; // empty last, whatever the direction
      if (y === null) return -1;
      const cmp = x < y ? -1 : 1;
      return active[i]!.direction === 'desc' ? -cmp : cmp;
    }
    return a.index - b.index;
  });
  return decorated.map((d) => d.item);
}

/** Header click: plain click makes `field` the only sort (toggling direction); shift+click adds / toggles a secondary sort. */
export function nextSorts(
  current: readonly ViewSortConfig[],
  field: string,
  opts: { additive?: boolean } = {}
): ViewSortConfig[] {
  const existing = current.find((s) => s.field === field);
  const flipped: ViewSortConfig = { field, direction: existing?.direction === 'asc' ? 'desc' : 'asc' };
  if (opts.additive) {
    if (!existing) return [...current, { field, direction: 'asc' }];
    return current.map((s) => (s.field === field ? flipped : s));
  }
  return [flipped];
}

/** Legacy single sort (what presets stored before) -> list. */
export function toSortList(single: { by: string; order: 'asc' | 'desc' }, thenBy: readonly ViewSortConfig[] = []): ViewSortConfig[] {
  return [{ field: single.by, direction: single.order }, ...thenBy.filter((s) => s.field !== single.by)];
}
