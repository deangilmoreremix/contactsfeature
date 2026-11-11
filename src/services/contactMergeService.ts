import { supabase } from '../lib/supabase';
import { useContactStore } from '../hooks/useContactStore';
import type { Contact } from '../types/contact';
import { mergeContactRecords, mergePatch, MAX_MERGE_RECORDS } from '../lib/merge/mergeContacts';
import { logger } from './logger.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MergeRequest {
  /** Records to merge; `winnerId` is kept, the rest are merged into it. */
  contacts: Contact[];
  winnerId: string;
  /** field -> id of the record whose value should be used */
  overrides?: Record<string, string>;
}

/**
 * Merge contacts. Uses the Postgres function `merge_contacts` (atomic, re-points related rows) when the
 * contacts live in Supabase, and an equivalent local merge otherwise (demo / offline contacts).
 */
export async function mergeContacts({ contacts, winnerId, overrides = {} }: MergeRequest): Promise<void> {
  if (contacts.length < 2) throw new Error('Select at least 2 contacts to merge');
  if (contacts.length > MAX_MERGE_RECORDS) throw new Error(`You can merge at most ${MAX_MERGE_RECORDS} contacts at once`);
  const winner = contacts.find((c) => c.id === winnerId);
  if (!winner) throw new Error('Choose which contact to keep');
  const losers = contacts.filter((c) => c.id !== winnerId);
  const store = useContactStore.getState();

  const allUuid = contacts.every((c) => UUID.test(c.id));
  if (allUuid) {
    const { error } = await supabase.rpc('merge_contacts', {
      p_winner: winnerId,
      p_losers: losers.map((c) => c.id),
      p_overrides: overrides,
      p_dry_run: false,
    } as never);
    if (!error) {
      await store.fetchContacts();
      return;
    }
    // Only fall back to a local merge in development (no database function deployed yet).
    if (!import.meta.env.DEV) throw new Error(error.message || 'Merge failed');
    logger.warn('merge_contacts RPC unavailable, merging locally', { error: error.message });
  }

  const { merged } = mergeContactRecords([winner, ...losers], overrides);
  const patch = mergePatch(winner, merged);
  if (Object.keys(patch).length > 0) await store.updateContact(winnerId, patch);
  const results = await Promise.allSettled(losers.map((c) => store.deleteContact(c.id)));
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) throw new Error(`${failed} merged contact(s) could not be removed`);
}
