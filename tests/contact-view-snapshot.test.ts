// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { EMPTY_SNAPSHOT, rowToSnapshot, snapshotKey, snapshotToRow } from '../src/lib/views/contactViewSnapshot';

describe('contact view snapshot', () => {
  const snap = {
    ...EMPTY_SNAPSHOT,
    viewType: 'kanban' as const,
    quickFilters: { interest: 'hot', status: 'lead' },
    sort: { by: 'score', order: 'desc' as const },
    groupBy: 'company',
    recordFilters: [{ id: 'f1', fieldMetadataId: 'status', operand: 'IS', value: '["lead"]' } as any],
    recordFilterGroups: [{ id: 'g1', logicalOperator: 'AND' } as any],
  };

  it('round-trips through the view_presets row shape', () => {
    const row = snapshotToRow('Hot leads', snap);
    expect(row.object_type).toBe('contacts');
    expect(row.sorts).toEqual([{ field: 'score', direction: 'desc' }]);
    expect(rowToSnapshot(row)).toEqual(snap);
  });

  it('tolerates old rows missing the new columns', () => {
    const s = rowToSnapshot({ filters: [], sorts: [], name: 'old' });
    expect(s.viewType).toBe('list');
    expect(s.quickFilters).toEqual({ interest: 'all', status: 'all' });
  });

  it('detects unsaved changes independent of array order', () => {
    const a = { ...snap, recordFilters: [{ id: 'b' } as any, { id: 'a' } as any] };
    const b = { ...snap, recordFilters: [{ id: 'a' } as any, { id: 'b' } as any] };
    expect(snapshotKey(a)).toBe(snapshotKey(b));
    expect(snapshotKey(a)).not.toBe(snapshotKey({ ...a, groupBy: null }));
  });
});

describe('contact view snapshot: multi-sort and table options', () => {
  it('stores "then by" sorts in the sorts array and reads old single-sort rows', () => {
    const snap = { ...EMPTY_SNAPSHOT, sort: { by: 'company', order: 'asc' as const }, thenBy: [{ field: 'score', direction: 'desc' as const }] };
    const row = snapshotToRow('x', snap);
    expect(row.sorts).toEqual([{ field: 'company', direction: 'asc' }, { field: 'score', direction: 'desc' }]);
    expect(rowToSnapshot(row)).toEqual(snap);
    const old = rowToSnapshot({ sorts: [{ field: 'score', direction: 'desc' }] });
    expect(old.sort).toEqual({ by: 'score', order: 'desc' });
    expect(old.thenBy).toBeUndefined();
  });
  it('round-trips table options inside quick_filters without leaking into quickFilters', () => {
    const table = { density: 'compact' as const, freezeFirstColumn: true, showTotals: true, aggregates: { aiScore: 'avg' as const } };
    const row = snapshotToRow('x', { ...EMPTY_SNAPSHOT, table });
    expect((row.quick_filters as any)._table).toEqual(table);
    const back = rowToSnapshot(row);
    expect(back.table).toEqual(table);
    expect(back.quickFilters).toEqual({ interest: 'all', status: 'all' });
  });
  it('default table options add nothing to the row and do not make a view look changed', () => {
    const row = snapshotToRow('x', { ...EMPTY_SNAPSHOT, table: { density: 'comfortable', aggregates: { aiScore: 'none' } } });
    expect(row.quick_filters).toEqual({ interest: 'all', status: 'all' });
    expect(snapshotKey({ ...EMPTY_SNAPSHOT, table: { showTotals: false } })).toBe(snapshotKey(EMPTY_SNAPSHOT));
    expect(snapshotKey({ ...EMPTY_SNAPSHOT, table: { showTotals: true } })).not.toBe(snapshotKey(EMPTY_SNAPSHOT));
    expect(snapshotKey({ ...EMPTY_SNAPSHOT, thenBy: [] })).toBe(snapshotKey(EMPTY_SNAPSHOT));
  });
});
