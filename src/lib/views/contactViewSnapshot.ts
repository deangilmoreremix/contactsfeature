/**
 * A saved Contacts view = everything needed to restore the screen's configuration.
 * Inspired by Twenty's View / ViewFilter / ViewFilterGroup / ViewSort model (AGPL) –
 * reimplemented here as one JSON-friendly snapshot stored in `view_presets`.
 */
import type { TableViewConfig, ViewSortConfig, ViewType } from '../../types/view';
import type { RecordFilter, RecordFilterGroup } from '../filters/filterContacts';

export interface ContactViewSnapshot {
  viewType: ViewType;
  quickFilters: { interest: string; status: string };
  /** Primary sort (kept for saved views that only know one sort). */
  sort: { by: string; order: 'asc' | 'desc' };
  /** Secondary sorts ("Then by..."); absent / empty = single sort. */
  thenBy?: ViewSortConfig[];
  /** Table display options; absent = defaults. */
  table?: TableViewConfig;
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
  const { table, thenBy, ...rest } = s;
  return JSON.stringify({
    ...rest,
    ...(thenBy && thenBy.length ? { thenBy } : {}),
    ...(isDefaultTableConfig(table) ? {} : { table }),
    recordFilters: byId(s.recordFilters).map((f) => ({ ...f })),
    recordFilterGroups: byId(s.recordFilterGroups).map((g) => ({ ...g })),
  });
}

/** Key inside the quick_filters JSON that carries Table options (avoids a schema change). */
const TABLE_KEY = '_table';

/** True when a table config only holds default values (nothing worth saving). */
export function isDefaultTableConfig(t: TableViewConfig | undefined): boolean {
  if (!t) return true;
  return (
    (!t.density || t.density === 'comfortable') &&
    !t.freezeFirstColumn &&
    !t.showTotals &&
    !Object.values(t.aggregates ?? {}).some((op) => op !== 'none') &&
    !(t.sorts && t.sorts.length > 0)
  );
}

/** Row <-> snapshot mapping for the view_presets table. */
export function snapshotToRow(name: string, s: ContactViewSnapshot) {
  const table = isDefaultTableConfig(s.table) ? null : s.table;
  return {
    name,
    object_type: 'contacts',
    view_type: s.viewType,
    quick_filters: table ? { ...s.quickFilters, [TABLE_KEY]: table } : s.quickFilters,
    filters: s.recordFilters,
    filter_groups: s.recordFilterGroups,
    sorts: [{ field: s.sort.by, direction: s.sort.order }, ...(s.thenBy ?? [])],
    group_by: s.groupBy,
    visibility: 'personal',
  };
}

export function rowToSnapshot(row: Record<string, any>): ContactViewSnapshot {
  const sorts: ViewSortConfig[] = Array.isArray(row['sorts'])
    ? row['sorts'].filter((x: any) => x && typeof x.field === 'string' && (x.direction === 'asc' || x.direction === 'desc'))
    : [];
  const sort = sorts[0] ?? null;
  const { [TABLE_KEY]: table, ...quick } = (row['quick_filters'] ?? {}) as Record<string, any>;
  return {
    viewType: (row['view_type'] as ViewType) || 'list',
    quickFilters: { ...EMPTY_SNAPSHOT.quickFilters, ...quick },
    sort: sort ? { by: sort.field, order: sort.direction } : EMPTY_SNAPSHOT.sort,
    ...(sorts.length > 1 ? { thenBy: sorts.slice(1) } : {}),
    ...(table && !isDefaultTableConfig(table) ? { table: table as TableViewConfig } : {}),
    recordFilters: row['filters'] ?? [],
    recordFilterGroups: row['filter_groups'] ?? [],
    groupBy: row['group_by'] ?? null,
  };
}
