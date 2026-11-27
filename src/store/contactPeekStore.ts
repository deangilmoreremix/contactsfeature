import { create } from 'zustand';

/** Which contact the read-only Peek drawer shows (null = closed). Views open it; ContactsModal renders it. */
interface ContactPeekStore {
  contactId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useContactPeekStore = create<ContactPeekStore>((set) => ({
  contactId: null,
  open: (contactId) => set({ contactId }),
  close: () => set({ contactId: null }),
}));
