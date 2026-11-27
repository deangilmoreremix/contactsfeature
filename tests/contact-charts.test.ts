// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildAiScoreChart, buildChartData, buildCreatedPerWeekChart, buildDealsByStageChart, buildInterestChart,
  buildSourceChart, buildStatusChart, loadPinnedCharts, sanitizePinned, savePinnedCharts, scoreBucketIndex,
  togglePinned, weekStartUtc,
} from '../src/lib/analytics/contactCharts';

const c = (o: any): any => ({ id: 'x', createdAt: '2026-01-01T00:00:00Z', ...o });
const vals = (d: { name: string; value: number }[]) => d.map((x) => [x.name, x.value]);

describe('status / interest', () => {
  it('empty data keeps the fixed categories at zero', () => {
    expect(vals(buildStatusChart([]))).toEqual([['Lead', 0], ['Prospect', 0], ['Customer', 0], ['Churned', 0]]);
    expect(vals(buildInterestChart([]))).toEqual([['Hot', 0], ['Medium', 0], ['Low', 0], ['Cold', 0]]);
  });
  it('counts and appends other statuses', () => {
    const d = buildStatusChart([c({ status: 'lead' }), c({ status: 'lead' }), c({ status: 'active' }), c({ status: 'pending' }), c({ status: 'pending' }), c({})]);
    expect(vals(d)).toEqual([['Lead', 2], ['Prospect', 0], ['Customer', 0], ['Churned', 0], ['Pending', 2], ['Active', 1], ['Unknown', 1]]);
  });
});

describe('sources', () => {
  it('counts each source once per contact, ties by name, empty as Unknown', () => {
    const d = buildSourceChart([c({ sources: ['Web', 'Web', 'Email'] }), c({ sources: ['Email'] }), c({ sources: [] }), c({})]);
    expect(vals(d)).toEqual([['Email', 2], ['Unknown', 2], ['Web', 1]]);
  });
  it('merges the tail into Other', () => {
    const contacts = ['a', 'b', 'c', 'd', 'e'].map((s, i) => c({ sources: Array(5 - i).fill(0).map(() => s).slice(0, 1) }));
    const d = buildSourceChart(contacts, 3);
    expect(d).toHaveLength(3);
    expect(d[2]).toMatchObject({ name: 'Other', value: 3 });
  });
  it('empty', () => expect(buildSourceChart([])).toEqual([]));
});

describe('AI score buckets', () => {
  it('edges', () => {
    expect([0, 19, 20, 39, 40, 59, 60, 79, 80, 100, 101, -5].map(scoreBucketIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 0]);
    expect([undefined, null, NaN, '80', Infinity].map(scoreBucketIndex)).toEqual([-1, -1, -1, -1, -1]);
  });
  it('histogram with unscored only when present', () => {
    expect(vals(buildAiScoreChart([]))).toEqual([['0-19', 0], ['20-39', 0], ['40-59', 0], ['60-79', 0], ['80-100', 0]]);
    const d = buildAiScoreChart([c({ aiScore: 19 }), c({ aiScore: 20 }), c({ aiScore: 100 }), c({})]);
    expect(vals(d)).toEqual([['0-19', 1], ['20-39', 1], ['40-59', 0], ['60-79', 0], ['80-100', 1], ['Unscored', 1]]);
  });
});

describe('created per week', () => {
  const now = Date.UTC(2026, 2, 18, 12); // Wed 18 Mar 2026
  it('weeks start on Monday (UTC)', () => {
    expect(new Date(weekStartUtc(now)).toISOString()).toBe('2026-03-16T00:00:00.000Z');
    expect(new Date(weekStartUtc(Date.UTC(2026, 2, 15, 23, 59))).toISOString()).toBe('2026-03-09T00:00:00.000Z'); // Sunday
    expect(new Date(weekStartUtc(Date.UTC(2026, 2, 16, 0, 0))).toISOString()).toBe('2026-03-16T00:00:00.000Z'); // Monday 00:00
  });
  it('always returns N points, zeros when empty', () => {
    const d = buildCreatedPerWeekChart([], now, 4);
    expect(d.map((x) => x.value)).toEqual([0, 0, 0, 0]);
    expect(d.map((x) => x.name)).toEqual(['Feb 23', 'Mar 2', 'Mar 9', 'Mar 16']);
  });
  it('buckets edges and ignores out-of-window / invalid dates', () => {
    const d = buildCreatedPerWeekChart([
      c({ createdAt: '2026-03-16T00:00:00Z' }), // this week, first instant
      c({ createdAt: '2026-03-15T23:59:59Z' }), // last week, last instant
      c({ createdAt: '2026-02-23T00:00:00Z' }), // oldest included
      c({ createdAt: '2026-02-22T23:59:59Z' }), // just outside
      c({ createdAt: '2026-03-30T00:00:00Z' }), // future
      c({ createdAt: 'garbage' }),
    ], now, 4);
    expect(d.map((x) => x.value)).toEqual([1, 0, 1, 1]);
  });
});

describe('deals by stage', () => {
  it('counts, ties by name, labels', () => {
    const d = buildDealsByStageChart([{ stage: 'proposal' }, { stage: 'negotiation' }, { stage: 'proposal' }, { stage: 'closed_won' }, { stage: '' }, {}]);
    expect(vals(d)).toEqual([['No stage', 2], ['Proposal', 2], ['Closed won', 1], ['Negotiation', 1]]);
  });
  it('empty', () => expect(buildDealsByStageChart([])).toEqual([]));
  it('dispatches by id', () => {
    expect(buildChartData('dealsByStage', [], [{ stage: 'a' }])).toHaveLength(1);
    expect(buildChartData('status', [])).toHaveLength(4);
  });
});

describe('pinned chart persistence', () => {
  const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
  it('round-trips per user and drops junk', () => {
    const s = store();
    savePinnedCharts('u1', ['status', 'aiScore', 'status' as any, 'bogus' as any], s);
    expect(loadPinnedCharts('u1', s)).toEqual(['status', 'aiScore']);
    expect(loadPinnedCharts('u2', s)).toEqual([]);
  });
  it('survives corrupt JSON and missing / throwing storage', () => {
    const s = store(); s.setItem('smartcrm.dashboard_pinned_charts.anon', '{nope');
    expect(loadPinnedCharts(null, s)).toEqual([]);
    expect(loadPinnedCharts('u', null)).toEqual([]);
    expect(() => savePinnedCharts('u', ['status'], { setItem: () => { throw new Error('quota'); } })).not.toThrow();
    expect(loadPinnedCharts('u', { getItem: () => { throw new Error('blocked'); } })).toEqual([]);
  });
  it('toggle and sanitize', () => {
    expect(togglePinned(['status'], 'source')).toEqual(['status', 'source']);
    expect(togglePinned(['status', 'source'], 'status')).toEqual(['source']);
    expect(sanitizePinned('x')).toEqual([]);
  });
});
