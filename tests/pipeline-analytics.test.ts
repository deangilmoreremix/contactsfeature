// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  computePipelineAnalytics, normalizeStage, stageProbability, wonRevenueByMonth, cycleDays, dealValue,
} from '../src/lib/analytics/pipeline';

const d = (id: string, stage: string, value: number | string | null, created: string, updated: string, closed?: string) =>
  ({ id, stage, value, created_at: created, updated_at: updated, closed_at: closed ?? null });

describe('normalizeStage', () => {
  it('classifies won/lost/open', () => {
    expect(normalizeStage('Closed Won').kind).toBe('won');
    expect(normalizeStage('closed_lost').kind).toBe('lost');
    expect(normalizeStage('Negotiation')).toEqual({ key: 'negotiation', kind: 'open' });
    expect(normalizeStage(null).key).toBe('lead');
  });
  it('gives stage probabilities', () => {
    expect(stageProbability('won')).toBe(1);
    expect(stageProbability('lost')).toBe(0);
    expect(stageProbability('proposal')).toBe(0.5);
    expect(stageProbability('weird_custom')).toBe(0.1);
  });
});

describe('computePipelineAnalytics', () => {
  it('returns honest empties for no deals', () => {
    const a = computePipelineAnalytics([]);
    expect(a.totalDeals).toBe(0);
    expect(a.winRate).toBeNull();
    expect(a.avgCycleDays).toBeNull();
    expect(a.averageOpenDealSize).toBeNull();
    expect(a.stages).toEqual([]);
  });

  it('computes counts, weighted value, win rate and cycle', () => {
    const deals = [
      d('1', 'lead', 1000, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
      d('2', 'proposal', '2000', '2026-01-01T00:00:00Z', '2026-01-05T00:00:00Z'),
      d('3', 'negotiation', 4000, '2026-01-01T00:00:00Z', '2026-01-05T00:00:00Z'),
      d('4', 'won', 5000, '2026-01-01T00:00:00Z', '2026-01-20T00:00:00Z', '2026-01-11T00:00:00Z'),
      d('5', 'won', 3000, '2026-02-01T00:00:00Z', '2026-02-21T00:00:00Z'),
      d('6', 'lost', 9999, '2026-01-01T00:00:00Z', '2026-01-09T00:00:00Z'),
    ];
    const a = computePipelineAnalytics(deals);
    expect(a.openCount).toBe(3);
    expect(a.openValue).toBe(7000);
    expect(a.weightedValue).toBe(100 + 1000 + 3000);
    expect(a.wonValue).toBe(8000);
    expect(a.winRate).toBeCloseTo(2 / 3, 3);
    expect(a.avgCycleDays).toBe(15); // (10 + 20) / 2
    expect(a.stages.map((s) => s.stage)).toEqual(['lead', 'proposal', 'negotiation', 'won', 'lost']);
    expect(a.stages.find((s) => s.stage === 'proposal')?.count).toBe(1);
  });

  it('ignores invalid values and inconsistent dates', () => {
    expect(dealValue({ value: 'abc' })).toBe(0);
    expect(dealValue({ value: -5 })).toBe(0);
    expect(cycleDays(d('x', 'won', 1, '2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z'))).toBeNull();
    const a = computePipelineAnalytics([d('x', 'won', 1, '2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z')]);
    expect(a.avgCycleDays).toBeNull();
    expect(a.winRate).toBe(1);
  });
});

describe('wonRevenueByMonth', () => {
  it('buckets won deals by close month', () => {
    const now = new Date('2026-03-15T00:00:00Z');
    const out = wonRevenueByMonth([
      d('1', 'won', 100, '2026-01-01T00:00:00Z', '2026-01-10T00:00:00Z'),
      d('2', 'won', 50, '2026-01-01T00:00:00Z', '2026-03-02T00:00:00Z'),
      d('3', 'lead', 999, '2026-01-01T00:00:00Z', '2026-03-02T00:00:00Z'),
      d('4', 'won', 7, '2024-01-01T00:00:00Z', '2024-01-10T00:00:00Z'),
    ], 3, now);
    expect(out.map((m) => m.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(out.map((m) => m.revenue)).toEqual([100, 0, 50]);
  });
});
