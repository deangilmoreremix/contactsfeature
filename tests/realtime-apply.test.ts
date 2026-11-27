// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { applyRowChange } from '../src/lib/realtimeApply';

type R = { id: string; v?: number; keep?: string };
describe('applyRowChange', () => {
  const rows: R[] = [{ id: 'a', v: 1, keep: 'x' }, { id: 'b', v: 2 }];
  it('inserts new rows at the top and is idempotent for known ids', () => {
    expect(applyRowChange(rows, 'INSERT', { id: 'c', v: 3 }, null)[0].id).toBe('c');
    const again = applyRowChange(rows, 'INSERT', { id: 'a', v: 9 }, null);
    expect(again).toHaveLength(2);
    expect(again[0]).toEqual({ id: 'a', v: 9, keep: 'x' });
  });
  it('merges updates without losing fields', () => {
    const out = applyRowChange(rows, 'UPDATE', { id: 'a', v: 5 }, null);
    expect(out[0]).toEqual({ id: 'a', v: 5, keep: 'x' });
    expect(rows[0].v).toBe(1); // input not mutated
  });
  it('deletes by old id and ignores malformed events', () => {
    expect(applyRowChange(rows, 'DELETE', null, { id: 'a' }).map((r) => r.id)).toEqual(['b']);
    expect(applyRowChange(rows, 'DELETE', null, {})).toBe(rows);
    expect(applyRowChange(rows, 'UPDATE', null, null)).toBe(rows);
  });
});
