/**
 * A saved Contacts view = everything needed to restore the screen's configuration.
 * Inspired by Twenty's View / ViewFilter / ViewFilterGroup / ViewSort model (AGPL) –
 * reimplemented here as one JSON-friendly snapshot stored in `view_presets`.
 */
import type { ViewType } from '../../types/view';
import type { RecordFilter, RecordFilterGroup } from '../filters/filterContacts';

export interface ContactViewSnapshot {
  viewType: ViewType;
  quickFilters: { interest: string; status: string };
  sort: { by: string; order: 'asc' | 'desc' };
  recordFilters: RecordFilter[];
  recordFilterGroups: RecordFilterGroup[];
  groupBy: string | null;
}

export const EMPTY_SNAPSHOT: ContactViewSnapshot = {
  viewType: 'list',
  quickFilters: { interest: 'all', status: 'all' },
  sort: { by: 'name', order: 'asc' },
  recordFilters: [],
  recordFilterGroups: [],
  groupBy: null,
};

/** Stable JSON (sorted by filter position) used to detect unsaved changes. */
export function snapshotKey(s: ContactViewSnapshot): string {
  const byId = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
  return JSON.stringify({
    ...s,
    recordFilters: byId(s.recordFilters).map((f) => ({ ...f })),
    recordFilterGroups: byId(s.recordFilterGroups).map((g) => ({ ...g })),
  });
}

/** Row <-> snapshot mapping for the view_presets table. */
export function snapshotToRow(name: string, s: ContactViewSnapshot) {
  return {
    name,
    object_type: 'contacts',
    view_type: s.viewType,
    quick_filters: s.quickFilters,
    filters: s.recordFilters,
    filter_groups: s.recordFilterGroups,
    sorts: [{ field: s.sort.by, direction: s.sort.order }],
    group_by: s.groupBy,
    visibility: 'personal',
  };
}

export function rowToSnapshot(row: Record<string, any>): ContactViewSnapshot {
  const sort = Array.isArray(row['sorts']) && row['sorts'][0] ? row['sorts'][0] : null;
  return {
    viewType: (row['view_type'] as ViewType) || 'list',
    quickFilters: { ...EMPTY_SNAPSHOT.quickFilters, ...(row['quick_filters'] ?? {}) },
    sort: sort ? { by: sort.field, order: sort.direction } : EMPTY_SNAPSHOT.sort,
    recordFilters: row['filters'] ?? [],
    recordFilterGroups: row['filter_groups'] ?? [],
    groupBy: row['group_by'] ?? null,
  };
}
