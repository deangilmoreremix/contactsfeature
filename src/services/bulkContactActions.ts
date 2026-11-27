import { useContactStore } from '../hooks/useContactStore';
import type { Contact } from '../types/contact';

export interface BulkResult {
  ok: number;
  failed: number;
}

const tally = (results: PromiseSettledResult<unknown>[]): BulkResult => ({
  ok: results.filter((r) => r.status === 'fulfilled').length,
  failed: results.filter((r) => r.status === 'rejected').length,
});

/** Apply the same field updates to many contacts (one request per contact, in parallel). */
export async function bulkUpdateContacts(ids: string[], updates: Partial<Contact>): Promise<BulkResult> {
  const { updateContact } = useContactStore.getState();
  return tally(await Promise.allSettled(ids.map((id) => updateContact(id, updates))));
}

/** Add tags to many contacts without removing existing ones. */
export async function bulkAddTags(contacts: Contact[], tags: string[]): Promise<BulkResult> {
  const clean = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  if (clean.length === 0) return { ok: 0, failed: 0 };
  const { updateContact } = useContactStore.getState();
  return tally(
    await Promise.allSettled(
      contacts.map((c) => updateContact(c.id, { tags: Array.from(new Set([...(c.tags ?? []), ...clean])) }))
    )
  );
}

export async function bulkDeleteContacts(ids: string[]): Promise<BulkResult> {
  const { deleteContact } = useContactStore.getState();
  return tally(await Promise.allSettled(ids.map((id) => deleteContact(id))));
}
