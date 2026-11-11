import { create } from 'zustand';

/** UI state shared by the Contacts views that is captured by saved views. */
interface ContactViewStore {
  /** Field id to group contacts by (Table/List), null = no grouping. */
  groupBy: string | null;
  setGroupBy: (field: string | null) => void;
  /** Id of the saved view currently applied (null = none / unsaved). */
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => void;
}

export const useContactViewStore = create<ContactViewStore>((set) => ({
  groupBy: null,
  setGroupBy: (groupBy) => set({ groupBy }),
  activePresetId: null,
  setActivePresetId: (activePresetId) => set({ activePresetId }),
}));
