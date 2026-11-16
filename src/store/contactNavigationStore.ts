import { create } from 'zustand';
import { sameIds } from '../lib/contacts/recordNavigation';

/** Ordered ids of the (filtered + sorted) list shown in ContactsModal; drives previous / next record. */
interface ContactNavigationState {
  ids: string[];
  setIds: (ids: string[]) => void;
}

export const useContactNavigationStore = create<ContactNavigationState>((set, get) => ({
  ids: [],
  setIds: (ids) => {
    if (!sameIds(get().ids, ids)) set({ ids });
  },
}));
