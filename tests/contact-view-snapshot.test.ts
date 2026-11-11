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
