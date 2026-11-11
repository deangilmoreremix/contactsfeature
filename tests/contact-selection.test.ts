// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { getIdsBetween, useContactSelectionStore } from '../src/store/contactSelectionStore';

const order = ['a', 'b', 'c', 'd', 'e'];
beforeEach(() => useContactSelectionStore.getState().clear());

describe('contact selection store', () => {
  it('getIdsBetween is inclusive and direction-agnostic', () => {
    expect(getIdsBetween(order, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(getIdsBetween(order, 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(getIdsBetween(order, 'b', 'zz')).toEqual([]);
  });

  it('toggles single ids and tracks the anchor', () => {
    const s = useContactSelectionStore.getState();
    s.toggle('b', order);
    expect([...useContactSelectionStore.getState().selected]).toEqual(['b']);
    useContactSelectionStore.getState().toggle('b', order);
    expect(useContactSelectionStore.getState().selected.size).toBe(0);
  });

  it('shift-click selects a range from the anchor', () => {
    const st = () => useContactSelectionStore.getState();
    st().toggle('b', order);
    st().toggle('d', order, { shift: true });
    expect([...st().selected].sort()).toEqual(['b', 'c', 'd']);
  });

  it('selectAll / clear / functional setMany', () => {
    const st = () => useContactSelectionStore.getState();
    st().selectAll(order);
    expect(st().selected.size).toBe(5);
    st().setMany((prev) => prev.filter((x) => x !== 'a'));
    expect(st().selected.has('a')).toBe(false);
    st().clear();
    expect(st().selected.size).toBe(0);
  });
});
