import { create } from 'zustand';

/**
 * Shared record selection for every Contacts view (List cards, Table rows, bulk actions).
 * Inspired by Twenty's record-selection (AGPL); implemented here with zustand.
 */

/** Ids between two ids (inclusive) in display order – used for shift-click ranges. */
export function getIdsBetween(orderedIds: string[], a: string, b: string): string[] {
  const i = orderedIds.indexOf(a);
  const j = orderedIds.indexOf(b);
  if (i === -1 || j === -1) return [];
  return orderedIds.slice(Math.min(i, j), Math.max(i, j) + 1);
}

interface ContactSelectionStore {
  selected: Set<string>;
  /** Last individually toggled id; anchor for shift-click ranges. */
  anchorId: string | null;
  isSelected: (id: string) => boolean;
  /** Toggle one id. With `shift` and an anchor, selects the whole range instead. */
  toggle: (id: string, orderedIds: string[], opts?: { shift?: boolean }) => void;
  selectAll: (ids: string[]) => void;
  setMany: (ids: string[] | ((prev: string[]) => string[])) => void;
  clear: () => void;
}

export const useContactSelectionStore = create<ContactSelectionStore>((set, get) => ({
  selected: new Set(),
  anchorId: null,
  isSelected: (id) => get().selected.has(id),

  toggle: (id, orderedIds, opts) =>
    set((s) => {
      const next = new Set(s.selected);
      if (opts?.shift && s.anchorId && s.anchorId !== id) {
        const range = getIdsBetween(orderedIds, s.anchorId, id);
        if (range.length) {
          // Range takes the state of the anchor (selected -> select range).
          const select = s.selected.has(s.anchorId) || !s.selected.has(id);
          range.forEach((r) => (select ? next.add(r) : next.delete(r)));
          return { selected: next, anchorId: id };
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selected: next, anchorId: id };
    }),

  selectAll: (ids) => set({ selected: new Set(ids) }),

  setMany: (ids) =>
    set((s) => {
      const arr = typeof ids === 'function' ? ids(Array.from(s.selected)) : ids;
      return { selected: new Set(arr) };
    }),

  clear: () => set({ selected: new Set(), anchorId: null }),
}));
