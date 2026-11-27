// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { orderColumnContacts, planColumnDrop } from '../src/lib/kanban/columnOrder';

const col = (...ps: Array<[string, number?]>) => ps.map(([id, position]) => ({ id, position }));

describe('kanban column order', () => {
  it('keeps list order when nothing has a position, sorts when some do', () => {
    const none = col(['a'], ['b'], ['c']);
    expect(orderColumnContacts(none)).toBe(none);
    expect(orderColumnContacts(col(['a', 3], ['b'], ['c', 1])).map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  it('inserts between two cards at the midpoint (one write)', () => {
    expect(planColumnDrop(col(['a', 1], ['b', 2], ['c', 3]), 'x', 'c')).toEqual([{ id: 'x', position: 2.5 }]);
  });

  it('inserts at start and end', () => {
    expect(planColumnDrop(col(['a', 1], ['b', 2]), 'x', 'a')).toEqual([{ id: 'x', position: 0 }]);
    expect(planColumnDrop(col(['a', 1], ['b', 2]), 'x', null)).toEqual([{ id: 'x', position: 3 }]);
  });

  it('empty column gets position 1; moving within a column ignores the moved card', () => {
    expect(planColumnDrop([], 'x', null)).toEqual([{ id: 'x', position: 1 }]);
    expect(planColumnDrop(col(['a', 1], ['b', 2], ['c', 3]), 'a', null)).toEqual([{ id: 'a', position: 4 }]);
  });

  it('renumbers the whole column when cards have no positions yet', () => {
    const patches = planColumnDrop(col(['a'], ['b'], ['c']), 'x', 'b');
    expect(patches).toEqual([
      { id: 'a', position: 1 },
      { id: 'x', position: 2 },
      { id: 'b', position: 3 },
      { id: 'c', position: 4 },
    ]);
  });

  it('renumbers when float precision runs out (unchanged cards are not rewritten)', () => {
    const patches = planColumnDrop(col(['a', 1], ['b', 1 + 1e-9]), 'x', 'b');
    expect(patches).toEqual([
      { id: 'x', position: 2 },
      { id: 'b', position: 3 },
    ]);
  });
});

describe('kanban self-drop', () => {
  it('dropping before the card itself keeps its place', () => {
    const patches = planColumnDrop(col(['a', 1], ['b', 2], ['c', 3]), 'b', 'b');
    expect(patches).toEqual([{ id: 'b', position: 2 }]);
  });
});
