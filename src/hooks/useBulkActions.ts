import { useCallback, useEffect, useMemo, useState } from 'react';
import { useContactStore } from './useContactStore';
import { Contact } from '../types/contact';
import { useContactSelectionStore } from '../store/contactSelectionStore';
import { useContactSelectionModeStore } from '../store/contactSelectionModeStore';
import { pushUndo } from '../lib/undo/undoStack';
import { capturePrevious } from '../lib/records/undoPatches';
import { computeSelectionBanner, resolveAllMatchingIds, stillAllMatching } from '../lib/records/selection';

export interface BulkResult {
  ok: number;
  failed: number;
}

const FIELD_LABELS: Partial<Record<keyof Contact, string>> = {
  status: 'status',
  interestLevel: 'interest',
  tags: 'tags',
};

const plural = (n: number) => `${n} contact${n === 1 ? '' : 's'}`;

/** Ids whose promise fulfilled. */
const succeeded = (ids: string[], results: PromiseSettledResult<unknown>[]) => ids.filter((_, i) => results[i]!.status === 'fulfilled');

/**
 * Apply the same updates to many contacts and offer one Undo that restores every contact's previous values.
 * Only contacts that were actually saved are restored.
 */
export async function bulkUpdateWithUndo(ids: string[], updates: Partial<Contact>): Promise<BulkResult> {
  const { updateContact, contacts } = useContactStore.getState();
  const keys = Object.keys(updates) as (keyof Contact)[];
  const previous = capturePrevious(contacts, ids, keys);
  const results = await Promise.allSettled(ids.map((id) => updateContact(id, updates)));
  const okIds = new Set(succeeded(ids, results));
  const restorable = previous.filter((p) => okIds.has(p.id));
  if (restorable.length > 0) {
    const what = keys.length === 1 ? FIELD_LABELS[keys[0]!] ?? String(keys[0]) : 'fields';
    pushUndo(`Updated ${what} on ${plural(restorable.length)}`, async () => {
      const { updateContact: update } = useContactStore.getState();
      await Promise.all(restorable.map((p) => update(p.id, p.previous)));
    });
  }
  return { ok: okIds.size, failed: ids.length - okIds.size };
}

/** Add tags to many contacts (existing tags kept); Undo restores each contact's previous tag list. */
export async function bulkAddTagsWithUndo(targets: Contact[], tags: string[]): Promise<BulkResult> {
  const clean = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  if (clean.length === 0) return { ok: 0, failed: 0 };
  const { updateContact } = useContactStore.getState();
  const ids = targets.map((c) => c.id);
  const previous = capturePrevious(targets, ids, ['tags']);
  const results = await Promise.allSettled(
    targets.map((c) => updateContact(c.id, { tags: Array.from(new Set([...(c.tags ?? []), ...clean])) }))
  );
  const okIds = new Set(succeeded(ids, results));
  const restorable = previous.filter((p) => okIds.has(p.id));
  if (restorable.length > 0) {
    pushUndo(`Added tags to ${plural(restorable.length)}`, async () => {
      const { updateContact: update } = useContactStore.getState();
      await Promise.all(restorable.map((p) => update(p.id, { tags: p.previous.tags ?? [] })));
    });
  }
  return { ok: okIds.size, failed: ids.length - okIds.size };
}

/** Move many contacts to the Trash; Undo restores the ones that were trashed. */
export async function bulkTrashWithUndo(ids: string[]): Promise<BulkResult> {
  const { deleteContact } = useContactStore.getState();
  const results = await Promise.allSettled(ids.map((id) => deleteContact(id)));
  const okIds = succeeded(ids, results);
  if (okIds.length > 0) {
    pushUndo(`Moved ${plural(okIds.length)} to Trash`, async () => {
      const { restoreContact } = useContactStore.getState();
      await Promise.all(okIds.map((id) => restoreContact(id)));
    });
  }
  return { ok: okIds.length, failed: ids.length - okIds.length };
}

/**
 * Selection + bulk actions over the current (filtered) contacts.
 * Backed by the shared selection store so every view and the toolbar agree.
 * "All matching" mode: selects every filtered contact (not just the visible rows) and shows the count.
 */
export function useBulkActions(contacts: Contact[]) {
  const selectedIds = useContactSelectionStore((s) => s.selected);
  const toggleOne = useContactSelectionStore((s) => s.toggle);
  const selectAll = useContactSelectionStore((s) => s.selectAll);
  const clear = useContactSelectionStore((s) => s.clear);
  const visibleIds = useContactSelectionModeStore((s) => s.visibleIds);
  const allMatching = useContactSelectionModeStore((s) => s.allMatching);
  const setAllMatching = useContactSelectionModeStore((s) => s.setAllMatching);
  const [isProcessing, setIsProcessing] = useState(false);

  const matchingIds = useMemo(() => contacts.map((c) => c.id), [contacts]);
  const selectedContacts = useMemo(() => contacts.filter((c) => selectedIds.has(c.id)), [contacts, selectedIds]);
  const isAllSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  // Leave all-matching mode as soon as the selection no longer equals the matching set (row deselected, filter changed).
  useEffect(() => {
    if (allMatching && !stillAllMatching(matchingIds, selectedIds)) setAllMatching(false);
  }, [allMatching, matchingIds, selectedIds, setAllMatching]);

  const banner = useMemo(
    () => computeSelectionBanner({ visibleIds: visibleIds ?? matchingIds, matchingIds, selectedIds, allMatching }),
    [visibleIds, matchingIds, selectedIds, allMatching]
  );

  const toggleSelectAll = useCallback(() => {
    if (useContactSelectionStore.getState().selected.size === matchingIds.length) clear();
    else selectAll(matchingIds);
  }, [matchingIds, clear, selectAll]);

  const toggleSelect = useCallback((id: string) => toggleOne(id, matchingIds), [toggleOne, matchingIds]);

  const clearSelection = useCallback(() => {
    clear();
    setAllMatching(false);
  }, [clear, setAllMatching]);

  /** Switch to all-matching mode: every id of the filtered list becomes selected. */
  const selectAllMatching = useCallback(() => {
    selectAll(resolveAllMatchingIds(matchingIds));
    setAllMatching(true);
  }, [matchingIds, selectAll, setAllMatching]);

  /** Ids bulk actions act on (all matching in all-matching mode, otherwise the selection). */
  const targetIds = useCallback(
    () => (allMatching ? resolveAllMatchingIds(matchingIds) : Array.from(useContactSelectionStore.getState().selected)),
    [allMatching, matchingIds]
  );

  const bulkUpdateField = useCallback(
    async (field: keyof Contact, value: unknown) => {
      const ids = targetIds();
      if (ids.length === 0) return;
      setIsProcessing(true);
      try {
        await bulkUpdateWithUndo(ids, { [field]: value } as Partial<Contact>);
        clearSelection();
      } finally {
        setIsProcessing(false);
      }
    },
    [targetIds, clearSelection]
  );

  const bulkDelete = useCallback(async () => {
    const ids = targetIds();
    if (ids.length === 0) return;
    if (!confirm(`Move ${plural(ids.length)} to Trash? You can restore them from Deleted.`)) return;
    setIsProcessing(true);
    try {
      await bulkTrashWithUndo(ids);
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  }, [targetIds, clearSelection]);

  return {
    selectedIds,
    selectedContacts,
    isAllSelected,
    isSomeSelected,
    isProcessing,
    allMatching,
    banner,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
    selectAllMatching,
    bulkUpdateField,
    bulkDelete,
  };
}
