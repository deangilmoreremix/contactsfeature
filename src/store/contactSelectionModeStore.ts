import { create } from 'zustand';

/**
 * Extra selection state for the "Select all N matching" banner.
 * - visibleIds: rows a view currently renders (null = same as the filtered list).
 * - allMatching: the user chose "Select all M matching".
 */
interface ContactSelectionModeStore {
  visibleIds: string[] | null;
  allMatching: boolean;
  setVisibleIds: (ids: string[] | null) => void;
  setAllMatching: (v: boolean) => void;
}

export const useContactSelectionModeStore = create<ContactSelectionModeStore>((set) => ({
  visibleIds: null,
  allMatching: false,
  setVisibleIds: (visibleIds) => set({ visibleIds }),
  setAllMatching: (allMatching) => set({ allMatching }),
}));
