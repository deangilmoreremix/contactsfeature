/**
 * "Recently viewed" contacts: the last few records opened in the detail view, kept per user in
 * localStorage. Pure (storage is injectable) and tolerant of unavailable / corrupt storage.
 */
export interface RecentContact {
  id: string;
  name: string;
  /** Epoch ms of the last view. */
  at: number;
}

export const RECENT_CONTACTS_LIMIT = 10;
const KEY_PREFIX = 'smartcrm.recentContacts.v1';

export const recentContactsKey = (userId: string | null | undefined): string => `${KEY_PREFIX}.${userId || 'anon'}`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Keeps well-formed entries, newest first, one per id, at most the limit. */
export function normalizeRecents(raw: unknown): RecentContact[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: RecentContact[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { id, name, at } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: typeof name === 'string' ? name : '', at: typeof at === 'number' && Number.isFinite(at) ? at : 0 });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, RECENT_CONTACTS_LIMIT);
}

export function readRecentContacts(userId: string | null | undefined, storage: StorageLike | null = defaultStorage()): RecentContact[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(recentContactsKey(userId));
    return raw ? normalizeRecents(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** Moves (or adds) the contact to the front, dedupes by id and trims to the limit. Returns the new list. */
export function recordRecentContact(
  userId: string | null | undefined,
  contact: { id: string; name?: string | undefined },
  now: number = Date.now(),
  storage: StorageLike | null = defaultStorage(),
): RecentContact[] {
  if (!contact.id) return readRecentContacts(userId, storage);
  const current = readRecentContacts(userId, storage).filter((r) => r.id !== contact.id);
  const next = [{ id: contact.id, name: contact.name ?? '', at: now }, ...current].slice(0, RECENT_CONTACTS_LIMIT);
  if (storage) {
    try { storage.setItem(recentContactsKey(userId), JSON.stringify(next)); } catch { /* quota / blocked: skip */ }
  }
  return next;
}
