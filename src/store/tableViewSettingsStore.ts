import { create } from 'zustand';
import type { TableViewConfig, ViewSortConfig, ViewDensity } from '../types/view';
import type { AggregateOp } from '../lib/records/aggregates';

/**
 * Table-only display options (density, frozen first column, totals footer, header sorts).
 * Remembered per browser (like the column preferences) and captured/restored by saved view presets.
 * Defaults reproduce the original Table look exactly.
 */
export const DEFAULT_TABLE_SORTS: ViewSortConfig[] = [{ field: 'name', direction: 'asc' }];

const STORAGE_KEY = 'smartcrm.tableView.settings';

interface TableViewSettingsState {
  density: ViewDensity['type'];
  freezeFirstColumn: boolean;
  showTotals: boolean;
  aggregates: Record<string, AggregateOp>;
  sorts: ViewSortConfig[];
  setDensity: (d: ViewDensity['type']) => void;
  setFreezeFirstColumn: (v: boolean) => void;
  setShowTotals: (v: boolean) => void;
  setAggregate: (columnId: string, op: AggregateOp) => void;
  setSorts: (s: ViewSortConfig[]) => void;
  /** Config for a saved view (defaults omitted). */
  toConfig: () => TableViewConfig;
  /** Restore from a saved view; undefined resets to the default look. */
  applyConfig: (c: TableViewConfig | undefined) => void;
}

const isSameSorts = (a: ViewSortConfig[], b: ViewSortConfig[]) =>
  a.length === b.length && a.every((s, i) => s.field === b[i]!.field && s.direction === b[i]!.direction);

type Persisted = Pick<TableViewSettingsState, 'density' | 'freezeFirstColumn' | 'showTotals' | 'aggregates' | 'sorts'>;

const DEFAULTS: Persisted = {
  density: 'comfortable',
  freezeFirstColumn: false,
  showTotals: false,
  aggregates: {},
  sorts: DEFAULT_TABLE_SORTS,
};

const DENSITIES: ViewDensity['type'][] = ['compact', 'comfortable', 'spacious'];

function fromConfig(c: TableViewConfig | undefined): Persisted {
  return {
    density: c?.density && DENSITIES.includes(c.density) ? c.density : DEFAULTS.density,
    freezeFirstColumn: !!c?.freezeFirstColumn,
    showTotals: !!c?.showTotals,
    aggregates: { ...(c?.aggregates ?? {}) },
    sorts: c?.sorts && c.sorts.length ? c.sorts : DEFAULT_TABLE_SORTS,
  };
}

function load(): Persisted {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? fromConfig(JSON.parse(raw) as TableViewConfig) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export const useTableViewSettings = create<TableViewSettingsState>((set, get) => ({
  ...load(),
  setDensity: (density) => set({ density }),
  setFreezeFirstColumn: (freezeFirstColumn) => set({ freezeFirstColumn }),
  setShowTotals: (showTotals) => set({ showTotals }),
  setAggregate: (columnId, op) => set((s) => ({ aggregates: { ...s.aggregates, [columnId]: op } })),
  setSorts: (sorts) => set({ sorts }),
  toConfig: () => {
    const s = get();
    const out: TableViewConfig = {};
    if (s.density !== 'comfortable') out.density = s.density;
    if (s.freezeFirstColumn) out.freezeFirstColumn = true;
    if (s.showTotals) out.showTotals = true;
    const aggs = Object.fromEntries(Object.entries(s.aggregates).filter(([, op]) => op !== 'none'));
    if (Object.keys(aggs).length) out.aggregates = aggs;
    if (!isSameSorts(s.sorts, DEFAULT_TABLE_SORTS)) out.sorts = s.sorts;
    return out;
  },
  applyConfig: (c) => set(fromConfig(c)),
}));

// Remember the options per browser.
useTableViewSettings.subscribe((s) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(s.toConfig()));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
});
