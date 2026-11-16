/**
 * Pure data builders for the Dashboard's pinnable charts. No React, no I/O.
 */
import type { Contact } from '../../types/contact';

export interface ChartDatum {
  name: string;
  value: number;
  color: string;
}

export type ChartId = 'status' | 'source' | 'interest' | 'aiScore' | 'createdPerWeek' | 'dealsByStage';

export interface ChartDealLike {
  stage?: string | null;
  value?: number | string | null;
}

export const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B', '#06B6D4', '#EC4899'];

export interface PinnableChart {
  id: ChartId;
  title: string;
  kind: 'bar' | 'pie' | 'line';
  /** Needs the deal list (hidden from the menu when deals are not available). */
  needsDeals?: boolean;
}

export const PINNABLE_CHARTS: PinnableChart[] = [
  { id: 'status', title: 'Contacts by status', kind: 'pie' },
  { id: 'source', title: 'Contacts by source', kind: 'bar' },
  { id: 'interest', title: 'Contacts by interest level', kind: 'bar' },
  { id: 'aiScore', title: 'AI score distribution', kind: 'bar' },
  { id: 'createdPerWeek', title: 'Contacts created per week', kind: 'line' },
  { id: 'dealsByStage', title: 'Deals by stage', kind: 'bar', needsDeals: true },
];

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const byValueThenName = (a: ChartDatum, b: ChartDatum) => b.value - a.value || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
const paint = (rows: Array<{ name: string; value: number }>): ChartDatum[] =>
  rows.map((r, i) => ({ ...r, color: CHART_COLORS[i % CHART_COLORS.length] as string }));

/** Count by a fixed key order (unknown keys follow, biggest first). Zero-count fixed keys are kept. */
function countInOrder(values: string[], order: string[]): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const known = order.map((k) => ({ name: titleCase(k), value: counts.get(k) ?? 0 }));
  const extra = [...counts.entries()]
    .filter(([k]) => !order.includes(k))
    .map(([k, value]) => ({ name: titleCase(k), value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return paint([...known, ...extra]);
}

export const STATUS_ORDER = ['lead', 'prospect', 'customer', 'churned'];
export const INTEREST_ORDER = ['hot', 'medium', 'low', 'cold'];

export function buildStatusChart(contacts: Contact[]): ChartDatum[] {
  const data = countInOrder(contacts.map((c) => String(c.status || 'unknown').toLowerCase()), STATUS_ORDER);
  // Fixed statuses always show (matches the existing Status Distribution card); extras only when present.
  return data;
}

export function buildInterestChart(contacts: Contact[]): ChartDatum[] {
  return countInOrder(contacts.map((c) => String(c.interestLevel || 'unknown').toLowerCase()), INTEREST_ORDER);
}

/**
 * Contacts per source (a contact with several sources counts once in each). Biggest first, ties by name,
 * contacts with no source under "Unknown". Beyond `limit` rows the rest are merged into "Other".
 */
export function buildSourceChart(contacts: Contact[], limit = 8): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const c of contacts) {
    const sources = Array.from(new Set((c.sources ?? []).map((s) => String(s).trim()).filter(Boolean)));
    for (const s of sources.length ? sources : ['Unknown']) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const rows = [...counts.entries()].map(([name, value]) => ({ name, value, color: '' })).sort(byValueThenName);
  const kept = rows.length > limit ? rows.slice(0, limit - 1) : rows;
  const rest = rows.length > limit ? rows.slice(limit - 1) : [];
  const out = kept.map(({ name, value }) => ({ name, value }));
  if (rest.length) out.push({ name: 'Other', value: rest.reduce((n, r) => n + r.value, 0) });
  return paint(out);
}

export const SCORE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: '0-19', min: 0, max: 19 },
  { label: '20-39', min: 20, max: 39 },
  { label: '40-59', min: 40, max: 59 },
  { label: '60-79', min: 60, max: 79 },
  { label: '80-100', min: 80, max: 100 },
];

/** Index of the bucket for a score (edges: 19/20, 39/40, 59/60, 79/80; values are clamped to 0..100). -1 = unscored. */
export function scoreBucketIndex(score: unknown): number {
  if (typeof score !== 'number' || !Number.isFinite(score)) return -1;
  const s = Math.min(100, Math.max(0, score));
  const i = SCORE_BUCKETS.findIndex((b) => s >= b.min && s < b.max + 1);
  return i === -1 ? SCORE_BUCKETS.length - 1 : i;
}

/** AI score histogram. Contacts without a score are shown as "Unscored" only when there are some. */
export function buildAiScoreChart(contacts: Contact[]): ChartDatum[] {
  const counts = SCORE_BUCKETS.map(() => 0);
  let unscored = 0;
  for (const c of contacts) {
    const i = scoreBucketIndex(c.aiScore);
    if (i === -1) unscored += 1;
    else counts[i] = (counts[i] ?? 0) + 1;
  }
  const rows = SCORE_BUCKETS.map((b, i) => ({ name: b.label, value: counts[i] ?? 0 }));
  if (unscored) rows.push({ name: 'Unscored', value: unscored });
  return paint(rows);
}

const DAY = 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week containing `t`. */
export function weekStartUtc(t: number): number {
  const d = new Date(t);
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return dayStart - sinceMonday * DAY;
}

/**
 * Contacts created per week for the `weeks` weeks ending with the week containing `now` (weeks start on
 * Monday, UTC). Always returns `weeks` points, oldest first; contacts outside the window or with an
 * invalid date are ignored.
 */
export function buildCreatedPerWeekChart(contacts: Contact[], now: Date | number = Date.now(), weeks = 8): ChartDatum[] {
  const nowT = typeof now === 'number' ? now : now.getTime();
  const last = weekStartUtc(nowT);
  const first = last - (weeks - 1) * 7 * DAY;
  const counts = new Array<number>(weeks).fill(0);
  for (const c of contacts) {
    const t = new Date(c.createdAt).getTime();
    if (!Number.isFinite(t)) continue;
    const start = weekStartUtc(t);
    if (start < first || start > last) continue;
    const i = Math.round((start - first) / (7 * DAY));
    counts[i] = (counts[i] ?? 0) + 1;
  }
  return counts.map((value, i) => ({
    name: new Date(first + i * 7 * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    value,
    color: CHART_COLORS[0] as string,
  }));
}

/** Deals per stage (count), biggest first, ties by name. Deals without a stage count as "No stage". */
export function buildDealsByStageChart(deals: ChartDealLike[]): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const d of deals) {
    const stage = String(d.stage ?? '').trim() || 'No stage';
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return paint(
    [...counts.entries()]
      .map(([stage, value]) => ({ name: titleCase(stage.replace(/_/g, ' ')), value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
  );
}

export function buildChartData(id: ChartId, contacts: Contact[], deals: ChartDealLike[] = [], now: Date | number = Date.now()): ChartDatum[] {
  switch (id) {
    case 'status': return buildStatusChart(contacts);
    case 'source': return buildSourceChart(contacts);
    case 'interest': return buildInterestChart(contacts);
    case 'aiScore': return buildAiScoreChart(contacts);
    case 'createdPerWeek': return buildCreatedPerWeekChart(contacts, now);
    case 'dealsByStage': return buildDealsByStageChart(deals);
  }
}

// ---- Pinned charts (per user, localStorage) -------------------------------------------------------

const KEY_PREFIX = 'smartcrm.dashboard_pinned_charts';
const VALID_IDS = new Set<string>(PINNABLE_CHARTS.map((c) => c.id));

export const pinnedChartsKey = (userId: string | null | undefined) => `${KEY_PREFIX}.${userId || 'anon'}`;

/** Keep only known chart ids, once each, in order. */
export function sanitizePinned(value: unknown): ChartId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: ChartId[] = [];
  for (const v of value) {
    if (typeof v === 'string' && VALID_IDS.has(v) && !seen.has(v)) { seen.add(v); out.push(v as ChartId); }
  }
  return out;
}

export function loadPinnedCharts(userId: string | null | undefined, storage: Pick<Storage, 'getItem'> | null = safeStorage()): ChartId[] {
  try {
    const raw = storage?.getItem(pinnedChartsKey(userId));
    return raw ? sanitizePinned(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function savePinnedCharts(userId: string | null | undefined, ids: ChartId[], storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(pinnedChartsKey(userId), JSON.stringify(sanitizePinned(ids)));
  } catch { /* storage unavailable */ }
}

export function togglePinned(ids: ChartId[], id: ChartId): ChartId[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
