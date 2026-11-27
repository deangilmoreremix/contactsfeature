/**
 * Duplicate hint for the open contact: other (non-trashed) contacts that directly share a normalised
 * email, phone or name + company with it, and the per-pair "dismissed" memory (localStorage).
 * Reuses findDuplicateGroups so the rules match the merge picker / review modal.
 */
import type { Contact } from '../../types/contact';
import { findDuplicateGroups, type DuplicateReason } from './findDuplicates';

export interface DuplicateHintMatch {
  contact: Contact;
  reasons: DuplicateReason[];
}

/** Direct (non-transitive) matches of `contact` among `contacts`. Empty for trashed contacts. */
export function findDuplicatesOf(contact: Contact, contacts: readonly Contact[]): DuplicateHintMatch[] {
  if (contact.deletedAt) return [];
  const candidates = contacts.filter((c) => c.id !== contact.id && !c.deletedAt);
  const group = findDuplicateGroups([contact, ...candidates]).find((g) => g.contacts.some((c) => c.id === contact.id));
  if (!group) return [];
  const out: DuplicateHintMatch[] = [];
  for (const other of group.contacts) {
    if (other.id === contact.id) continue;
    const pair = findDuplicateGroups([contact, other])[0];
    if (pair) out.push({ contact: other, reasons: pair.reasons });
  }
  return out;
}

export const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

const KEY_PREFIX = 'smartcrm.duplicateHint.dismissed.v1';
export const dismissedKey = (userId: string | null | undefined): string => `${KEY_PREFIX}.${userId || 'anon'}`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
function defaultStorage(): StorageLike | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function readDismissedPairs(userId: string | null | undefined, storage: StorageLike | null = defaultStorage()): Set<string> {
  if (!storage) return new Set();
  try {
    const raw = JSON.parse(storage.getItem(dismissedKey(userId)) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function dismissPair(userId: string | null | undefined, a: string, b: string, storage: StorageLike | null = defaultStorage()): Set<string> {
  const next = readDismissedPairs(userId, storage);
  next.add(pairKey(a, b));
  if (storage) {
    try { storage.setItem(dismissedKey(userId), JSON.stringify([...next].slice(-500))); } catch { /* ignore */ }
  }
  return next;
}
