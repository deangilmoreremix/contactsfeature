/**
 * Advanced (nested AND/OR) contact filter state. Shape matches the vendored twenty-shared
 * RecordFilter / RecordFilterGroup types: a flat adjacency list with a single root group.
 */
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { RecordFilterGroupLogicalOperator } from '../vendor/twenty-shared/types/RecordFilterGroupLogicalOperator';
import { ViewFilterOperand } from '../vendor/twenty-shared/types/ViewFilterOperand';
import type { RecordFilter, RecordFilterGroup } from '../lib/filters/filterContacts';

export interface ContactFilterSnapshot {
  recordFilters: RecordFilter[];
  recordFilterGroups: RecordFilterGroup[];
}

interface ContactFilterStore extends ContactFilterSnapshot {
  addFilter: (fieldMetadataId: string, operand: ViewFilterOperand, groupId?: string) => string;
  updateFilter: (id: string, patch: Partial<RecordFilter>) => void;
  removeFilter: (id: string) => void;
  addGroup: (parentGroupId?: string) => string;
  removeGroup: (id: string) => void;
  setGroupOperator: (id: string, op: RecordFilterGroupLogicalOperator) => void;
  clear: () => void;
  replace: (snapshot: ContactFilterSnapshot) => void;
}

const nextPosition = (s: ContactFilterSnapshot, groupId: string) =>
  Math.max(
    -1,
    ...s.recordFilters.filter((f) => f.recordFilterGroupId === groupId).map((f) => f.positionInRecordFilterGroup ?? 0),
    ...s.recordFilterGroups.filter((g) => g.parentRecordFilterGroupId === groupId).map((g) => g.positionInRecordFilterGroup ?? 0)
  ) + 1;

const rootOf = (s: ContactFilterSnapshot) => s.recordFilterGroups.find((g) => !g.parentRecordFilterGroupId);

const descendantGroupIds = (groups: RecordFilterGroup[], id: string): string[] => {
  const kids = groups.filter((g) => g.parentRecordFilterGroupId === id).map((g) => g.id);
  return [id, ...kids.flatMap((k) => descendantGroupIds(groups, k))];
};

/** Remove groups that ended up with no filters/children (never the root while it has content). */
const pruneEmpty = (s: ContactFilterSnapshot): ContactFilterSnapshot => {
  let groups = s.recordFilterGroups;
  let changed = true;
  while (changed) {
    changed = false;
    const used = new Set<string>([
      ...s.recordFilters.map((f) => f.recordFilterGroupId ?? ''),
      ...groups.map((g) => g.parentRecordFilterGroupId ?? ''),
    ]);
    const next = groups.filter((g) => used.has(g.id));
    if (next.length !== groups.length) {
      groups = next;
      changed = true;
    }
  }
  return { recordFilters: s.recordFilters, recordFilterGroups: groups };
};

export const useContactFilterStore = create<ContactFilterStore>((set, get) => ({
  recordFilters: [],
  recordFilterGroups: [],

  addFilter: (fieldMetadataId, operand, groupId) => {
    const state = get();
    let groups = state.recordFilterGroups;
    let targetGroup = groupId ?? rootOf(state)?.id;
    if (!targetGroup) {
      targetGroup = uuid();
      groups = [...groups, { id: targetGroup, logicalOperator: RecordFilterGroupLogicalOperator.AND }];
    }
    const id = uuid();
    set({
      recordFilterGroups: groups,
      recordFilters: [
        ...state.recordFilters,
        {
          id,
          fieldMetadataId,
          operand,
          value: '',
          recordFilterGroupId: targetGroup,
          positionInRecordFilterGroup: nextPosition({ ...state, recordFilterGroups: groups }, targetGroup),
        } as RecordFilter,
      ],
    });
    return id;
  },

  updateFilter: (id, patch) =>
    set((s) => ({ recordFilters: s.recordFilters.map((f) => (f.id === id ? ({ ...f, ...patch } as RecordFilter) : f)) })),

  removeFilter: (id) =>
    set((s) => pruneEmpty({ ...s, recordFilters: s.recordFilters.filter((f) => f.id !== id) })),

  addGroup: (parentGroupId) => {
    const state = get();
    let groups = state.recordFilterGroups;
    let parent = parentGroupId ?? rootOf(state)?.id;
    if (!parent) {
      parent = uuid();
      groups = [...groups, { id: parent, logicalOperator: RecordFilterGroupLogicalOperator.AND }];
    }
    const id = uuid();
    set({
      recordFilterGroups: [
        ...groups,
        {
          id,
          parentRecordFilterGroupId: parent,
          logicalOperator: RecordFilterGroupLogicalOperator.OR,
          positionInRecordFilterGroup: nextPosition({ ...state, recordFilterGroups: groups }, parent),
        },
      ],
    });
    return id;
  },

  removeGroup: (id) =>
    set((s) => {
      const ids = new Set(descendantGroupIds(s.recordFilterGroups, id));
      return pruneEmpty({
        recordFilters: s.recordFilters.filter((f) => !ids.has(f.recordFilterGroupId ?? '')),
        recordFilterGroups: s.recordFilterGroups.filter((g) => !ids.has(g.id)),
      });
    }),

  setGroupOperator: (id, op) =>
    set((s) => ({ recordFilterGroups: s.recordFilterGroups.map((g) => (g.id === id ? { ...g, logicalOperator: op } : g)) })),

  clear: () => set({ recordFilters: [], recordFilterGroups: [] }),

  replace: (snapshot) => set({ recordFilters: snapshot.recordFilters, recordFilterGroups: snapshot.recordFilterGroups }),
}));
