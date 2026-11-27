// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { useTableViewSettings, DEFAULT_TABLE_SORTS } from '../src/store/tableViewSettingsStore';
import { capturePrevious } from '../src/lib/records/undoPatches';

beforeEach(() => useTableViewSettings.getState().applyConfig(undefined));

describe('table view settings', () => {
  it('defaults reproduce today\'s table (empty config)', () => {
    const s = useTableViewSettings.getState();
    expect(s.density).toBe('comfortable');
    expect(s.freezeFirstColumn).toBe(false);
    expect(s.showTotals).toBe(false);
    expect(s.sorts).toEqual(DEFAULT_TABLE_SORTS);
    expect(s.toConfig()).toEqual({});
  });
  it('round-trips through a saved-view config, omitting defaults', () => {
    const s = useTableViewSettings.getState();
    s.setDensity('compact');
    s.setShowTotals(true);
    s.setAggregate('aiScore', 'avg');
    s.setAggregate('email', 'none');
    s.setSorts([{ field: 'company', direction: 'desc' }]);
    const cfg = useTableViewSettings.getState().toConfig();
    expect(cfg).toEqual({ density: 'compact', showTotals: true, aggregates: { aiScore: 'avg' }, sorts: [{ field: 'company', direction: 'desc' }] });
    useTableViewSettings.getState().applyConfig(undefined);
    expect(useTableViewSettings.getState().toConfig()).toEqual({});
    useTableViewSettings.getState().applyConfig(cfg);
    expect(useTableViewSettings.getState().toConfig()).toEqual(cfg);
  });
  it('ignores an invalid density', () => {
    useTableViewSettings.getState().applyConfig({ density: 'huge' as any });
    expect(useTableViewSettings.getState().density).toBe('comfortable');
  });
});

describe('capturePrevious (undo for inline / bulk edits)', () => {
  it('captures the old values of the touched fields only, skipping unknown ids', () => {
    const contacts = [{ id: '1', status: 'lead', title: 'CEO' }, { id: '2', status: 'active' }] as any[];
    expect(capturePrevious(contacts, ['1', '2', 'x'], ['status'])).toEqual([
      { id: '1', previous: { status: 'lead' } },
      { id: '2', previous: { status: 'active' } },
    ]);
    expect(capturePrevious(contacts, ['2'], ['title'])).toEqual([{ id: '2', previous: { title: undefined } }]);
  });
});
