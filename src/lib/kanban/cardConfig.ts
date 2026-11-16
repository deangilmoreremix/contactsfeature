/**
 * Kanban card options: which fields a card shows, hide-empty-columns and collapsed columns.
 * Defaults reproduce the board exactly as it looked before these options existed.
 * (Local type: src/types/view.ts is not touched; the value is stored on the kanban config row's
 * optional `card_config` JSON column, with a localStorage copy as the fallback.)
 */
export type KanbanCardField = 'email' | 'phone' | 'company' | 'aiScore' | 'tags' | 'lastConnected';

export interface KanbanCardConfig {
  fields: Record<KanbanCardField, boolean>;
  hideEmptyColumns: boolean;
  collapsedColumns: string[];
}

export const KANBAN_CARD_FIELDS: Array<{ id: KanbanCardField; label: string }> = [
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'company', label: 'Company' },
  { id: 'aiScore', label: 'AI score' },
  { id: 'tags', label: 'Tags' },
  { id: 'lastConnected', label: 'Last connected' },
];

export const DEFAULT_KANBAN_CARD_CONFIG: KanbanCardConfig = {
  fields: { email: true, phone: true, company: true, aiScore: true, tags: true, lastConnected: false },
  hideEmptyColumns: false,
  collapsedColumns: [],
};

/** Merge unknown stored JSON over the defaults, ignoring anything of the wrong shape. */
export function sanitizeKanbanCardConfig(raw: unknown): KanbanCardConfig {
  const base = DEFAULT_KANBAN_CARD_CONFIG;
  const out: KanbanCardConfig = { fields: { ...base.fields }, hideEmptyColumns: base.hideEmptyColumns, collapsedColumns: [] };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  if (r['fields'] && typeof r['fields'] === 'object') {
    const f = r['fields'] as Record<string, unknown>;
    for (const { id } of KANBAN_CARD_FIELDS) if (typeof f[id] === 'boolean') out.fields[id] = f[id] as boolean;
  }
  if (typeof r['hideEmptyColumns'] === 'boolean') out.hideEmptyColumns = r['hideEmptyColumns'];
  if (Array.isArray(r['collapsedColumns'])) {
    out.collapsedColumns = Array.from(new Set(r['collapsedColumns'].filter((v): v is string => typeof v === 'string')));
  }
  return out;
}

export function toggleCollapsed(config: KanbanCardConfig, columnId: string): KanbanCardConfig {
  const has = config.collapsedColumns.includes(columnId);
  return { ...config, collapsedColumns: has ? config.collapsedColumns.filter((c) => c !== columnId) : [...config.collapsedColumns, columnId] };
}

/**
 * Columns to draw. Empty columns are dropped when `hideEmptyColumns` is on, except while a card is being
 * dragged (so it can still be dropped into them).
 */
export function visibleColumns<T extends { id: string }>(
  columns: T[],
  countFor: (columnId: string) => number,
  config: KanbanCardConfig,
  dragging: boolean
): T[] {
  if (!config.hideEmptyColumns || dragging) return columns;
  return columns.filter((c) => countFor(c.id) > 0);
}

const LOCAL_KEY = 'smartcrm.kanban_card_config';

export function readLocalKanbanCardConfig(): KanbanCardConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? sanitizeKanbanCardConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeLocalKanbanCardConfig(config: KanbanCardConfig): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(config)); } catch { /* unavailable */ }
}
