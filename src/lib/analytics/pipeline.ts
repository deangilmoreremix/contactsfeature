/**
 * Pure pipeline analytics over rows of the `deals` table.
 * No I/O and no randomness: every number is derived from the deals passed in.
 */

export interface PipelineDeal {
  id: string;
  stage: string | null;
  value: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
}

export type StageKind = 'open' | 'won' | 'lost';

/**
 * Win probability assumed per stage when computing weighted pipeline value.
 * These are fixed planning assumptions (not learned), and the UI labels them as such.
 */
export const STAGE_PROBABILITY: Record<string, number> = {
  lead: 0.1,
  prospect: 0.1,
  new: 0.1,
  contacted: 0.15,
  qualified: 0.25,
  discovery: 0.25,
  meeting: 0.35,
  demo: 0.4,
  proposal: 0.5,
  negotiation: 0.75,
  contract: 0.85,
  won: 1,
  lost: 0,
};

const DEFAULT_OPEN_PROBABILITY = 0.1;
const DAY_MS = 86_400_000;

export function normalizeStage(stage: string | null | undefined): { key: string; kind: StageKind } {
  const key = String(stage ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_') || 'lead';
  if (/(^|_)lost($|_)/.test(key) || key === 'closed_lost') return { key: 'lost', kind: 'lost' };
  if (/(^|_)won($|_)/.test(key) || key === 'closed_won' || key === 'customer') return { key: 'won', kind: 'won' };
  return { key: key.replace(/^closed_/, ''), kind: 'open' };
}

export function dealValue(deal: Pick<PipelineDeal, 'value'>): number {
  const n = typeof deal.value === 'string' ? parseFloat(deal.value) : deal.value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

export function stageProbability(stage: string | null | undefined): number {
  const { key, kind } = normalizeStage(stage);
  if (kind === 'won') return 1;
  if (kind === 'lost') return 0;
  return STAGE_PROBABILITY[key] ?? DEFAULT_OPEN_PROBABILITY;
}

function toTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** When a deal closed: explicit closed_at, else last update (only meaningful for won/lost deals). */
export function closedTime(deal: PipelineDeal): number | null {
  return toTime(deal.closed_at) ?? toTime(deal.updated_at);
}

/** Days from creation to close for a closed deal, or null if the dates are missing/inconsistent. */
export function cycleDays(deal: PipelineDeal): number | null {
  const start = toTime(deal.created_at);
  const end = closedTime(deal);
  if (start === null || end === null || end < start) return null;
  return (end - start) / DAY_MS;
}

export interface StageSummary {
  stage: string;
  kind: StageKind;
  count: number;
  value: number;
  weightedValue: number;
}

export interface PipelineAnalytics {
  totalDeals: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
  openValue: number;
  weightedValue: number;
  wonValue: number;
  lostValue: number;
  averageOpenDealSize: number | null;
  /** won / (won + lost), 0..1; null when nothing has closed yet. */
  winRate: number | null;
  /** Mean days from creation to close over won deals with usable dates; null if none. */
  avgCycleDays: number | null;
  stages: StageSummary[];
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

export function computePipelineAnalytics(deals: PipelineDeal[]): PipelineAnalytics {
  const byStage = new Map<string, StageSummary>();
  let openCount = 0, wonCount = 0, lostCount = 0;
  let openValue = 0, weightedValue = 0, wonValue = 0, lostValue = 0;
  const cycles: number[] = [];

  for (const deal of deals) {
    const { key, kind } = normalizeStage(deal.stage);
    const value = dealValue(deal);
    const weighted = value * stageProbability(deal.stage);
    const entry = byStage.get(key) ?? { stage: key, kind, count: 0, value: 0, weightedValue: 0 };
    entry.count += 1;
    entry.value += value;
    entry.weightedValue += weighted;
    byStage.set(key, entry);

    if (kind === 'open') {
      openCount += 1; openValue += value; weightedValue += weighted;
    } else if (kind === 'won') {
      wonCount += 1; wonValue += value;
      const c = cycleDays(deal);
      if (c !== null) cycles.push(c);
    } else {
      lostCount += 1; lostValue += value;
    }
  }

  const closed = wonCount + lostCount;
  const rank = (s: StageSummary) => {
    if (s.kind === 'won') return 1000;
    if (s.kind === 'lost') return 1001;
    const keys = Object.keys(STAGE_PROBABILITY);
    const i = keys.indexOf(s.stage);
    return i === -1 ? 500 : i;
  };

  return {
    totalDeals: deals.length,
    openCount, wonCount, lostCount,
    openValue: round(openValue),
    weightedValue: round(weightedValue),
    wonValue: round(wonValue),
    lostValue: round(lostValue),
    averageOpenDealSize: openCount ? round(openValue / openCount) : null,
    winRate: closed ? round(wonCount / closed, 4) : null,
    avgCycleDays: cycles.length ? round(cycles.reduce((a, b) => a + b, 0) / cycles.length, 1) : null,
    stages: [...byStage.values()]
      .map((s) => ({ ...s, value: round(s.value), weightedValue: round(s.weightedValue) }))
      .sort((a, b) => rank(a) - rank(b)),
  };
}

/** Won revenue per calendar month (UTC, "YYYY-MM") for the last `months` months ending at `now`, oldest first. */
export function wonRevenueByMonth(deals: PipelineDeal[], months: number, now: Date = new Date()) {
  const out: Array<{ month: string; revenue: number; deals: number }> = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    index.set(month, out.length);
    out.push({ month, revenue: 0, deals: 0 });
  }
  for (const deal of deals) {
    if (normalizeStage(deal.stage).kind !== 'won') continue;
    const t = closedTime(deal);
    if (t === null) continue;
    const d = new Date(t);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const i = index.get(month);
    const bucket = i === undefined ? undefined : out[i];
    if (bucket) { bucket.revenue = round(bucket.revenue + dealValue(deal)); bucket.deals += 1; }
  }
  return out;
}

/** Days a deal has sat unchanged (since updated_at), or null if unknown. */
export function daysSinceUpdate(deal: PipelineDeal, now: Date = new Date()): number | null {
  const t = toTime(deal.updated_at) ?? toTime(deal.created_at);
  return t === null ? null : Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}
