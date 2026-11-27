// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { DEFAULT_KANBAN_CARD_CONFIG, sanitizeKanbanCardConfig, toggleCollapsed, visibleColumns } from '../src/lib/kanban/cardConfig';

describe('kanban card config', () => {
  it('defaults reproduce the existing card (everything on except the new last-connected line)', () => {
    expect(DEFAULT_KANBAN_CARD_CONFIG).toEqual({
      fields: { email: true, phone: true, company: true, aiScore: true, tags: true, lastConnected: false },
      hideEmptyColumns: false,
      collapsedColumns: [],
    });
    expect(sanitizeKanbanCardConfig(undefined)).toEqual(DEFAULT_KANBAN_CARD_CONFIG);
    expect(sanitizeKanbanCardConfig({})).toEqual(DEFAULT_KANBAN_CARD_CONFIG);
  });
  it('merges stored values over defaults and ignores junk', () => {
    const c = sanitizeKanbanCardConfig({ fields: { phone: false, tags: 'no', nope: true }, hideEmptyColumns: true, collapsedColumns: ['a', 3, 'a'] });
    expect(c.fields).toEqual({ email: true, phone: false, company: true, aiScore: true, tags: true, lastConnected: false });
    expect(c.hideEmptyColumns).toBe(true);
    expect(c.collapsedColumns).toEqual(['a']);
    expect(sanitizeKanbanCardConfig('x')).toEqual(DEFAULT_KANBAN_CARD_CONFIG);
  });
  it('does not mutate the defaults', () => {
    const c = sanitizeKanbanCardConfig({ fields: { email: false } });
    c.fields.email = true;
    expect(DEFAULT_KANBAN_CARD_CONFIG.fields.email).toBe(true);
    c.collapsedColumns.push('x');
    expect(DEFAULT_KANBAN_CARD_CONFIG.collapsedColumns).toEqual([]);
  });
  it('toggles collapsed columns', () => {
    const a = toggleCollapsed(DEFAULT_KANBAN_CARD_CONFIG, 'lead');
    expect(a.collapsedColumns).toEqual(['lead']);
    expect(toggleCollapsed(a, 'lead').collapsedColumns).toEqual([]);
  });
  it('hides empty columns unless off or dragging', () => {
    const cols = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const count = (id: string) => (id === 'b' ? 0 : 2);
    expect(visibleColumns(cols, count, DEFAULT_KANBAN_CARD_CONFIG, false)).toBe(cols);
    const on = { ...DEFAULT_KANBAN_CARD_CONFIG, hideEmptyColumns: true };
    expect(visibleColumns(cols, count, on, false).map((c) => c.id)).toEqual(['a', 'c']);
    expect(visibleColumns(cols, count, on, true)).toBe(cols);
    expect(visibleColumns([], count, on, false)).toEqual([]);
  });
});
