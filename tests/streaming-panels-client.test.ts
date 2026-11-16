// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } } }));

import { streamFunction } from '../src/services/liveFunction';
import {
  healthFromPartial, forecastFromPartial, predictionsFromPartial, insightsFromPartial, recommendationsFromPartial,
  suggestionsFromPartial, enrichmentPreview, enrichmentSources,
} from '../src/lib/streaming/previews';

const enc = new TextEncoder();
const sse = (events: any[], withDone = true) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      events.forEach((e, i) => c.enqueue(enc.encode(`id: ${i}\ndata: ${JSON.stringify({ ...e, seq: i })}\n\n`)));
      if (withDone) c.enqueue(enc.encode('data: [DONE]\n\n'));
      c.close();
    },
  });
const sseResponse = (events: any[], withDone = true) => new Response(sse(events, withDone), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

afterEach(() => vi.unstubAllGlobals());

describe('previews: partial JSON -> view models', () => {
  it('health: score and risk stay null until written, indicators show as soon as named', () => {
    expect(healthFromPartial(undefined)).toMatchObject({ healthScore: null, riskLevel: null, indicators: [] });
    const v = healthFromPartial({ healthScore: 71.6, indicators: [{ name: 'Momentum' }, {}], recommendations: ['a', 5, ''] });
    expect(v.healthScore).toBe(72);
    expect(v.indicators).toEqual([{ name: 'Momentum', score: 0, status: 'warning', rationale: '' }]);
    expect(v.recommendations).toEqual(['a']);
  });
  it('forecast: range numbers null until present', () => {
    expect(forecastFromPartial({ projectedWonNext90Days: { low: 10 }, insights: ['x'] })).toMatchObject({ projected: { low: 10, expected: null, high: null }, insights: ['x'], confidence: null });
  });
  it('predictions / insights / recommendations / suggestions: a card appears once its first key is written', () => {
    expect(predictionsFromPartial({ predictions: [{ predictionType: 'conversion', value: 42 }, {}] })).toHaveLength(1);
    expect(insightsFromPartial({ insights: [{ title: 'T', impact: 'bogus' }, { description: 'no title yet' }] })).toMatchObject([{ title: 'T', impact: 'medium', category: 'General', type: 'recommendation' }]);
    expect(recommendationsFromPartial({ recommendations: [{ title: 'Call', urgency: 'immediate' }] })[0]).toMatchObject({ title: 'Call', urgency: 'immediate', effort: 'medium' });
    expect(suggestionsFromPartial({ suggestions: [{ title: 'Rule', type: 'merge_rules' }] })[0]).toMatchObject({ title: 'Rule', type: 'merge_rules', priority: 'medium' });
  });
  it('enrichment: preview text and live sources (http only, unique)', () => {
    const p = { summary: 'Ada leads sales.', profile: { jobTitle: 'VP', company: 'Acme' }, talkingPoints: ['Hiring'], evidence: [{ field: 'jobTitle', sourceUrl: 'https://acme.com/team' }, { field: 'x', sourceUrl: 'javascript:1' }, { field: 'y', sourceUrl: 'https://acme.com/team' }], recentNews: [{ headline: 'Raises', url: 'https://news.io/a' }] };
    expect(enrichmentPreview(p)).toBe('Ada leads sales.\nVP at Acme\n• Hiring');
    expect(enrichmentSources(p).map((s) => s.url)).toEqual(['https://acme.com/team', 'https://news.io/a']);
    expect(enrichmentSources({ evidence: [{ sourceUrl: 'https://half' }] })).toHaveLength(1);
    expect(enrichmentPreview(null)).toBe('');
  });
});

describe('streamFunction', () => {
  it('fires status/partial then resolves with the result event; sends auth + stream flag', async () => {
    const fetchMock = vi.fn(async () => sseResponse([
      { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_1' },
      { type: 'partial', json: { healthScore: 10 } },
      { type: 'partial', json: { healthScore: 10, riskLevel: 'low' } },
      { type: 'result', data: { success: true, data: { healthScore: 10 } } },
      { type: 'done', id: 'resp_1', text: '{}', citations: [{ url: 'https://a.io' }], json: {} },
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const partials: unknown[] = []; const labels: string[] = [];
    const out = await streamFunction<{ data: { healthScore: number } }>('/.netlify/functions/deal-health-analysis', { dealId: 'x' }, { onPartial: (p) => partials.push(p), onStatus: (l) => labels.push(l) });
    expect(partials).toHaveLength(2);
    expect(labels).toEqual(['Thinking…']);
    expect(out.result?.data.healthScore).toBe(10);
    expect(out.citations).toEqual([{ url: 'https://a.io' }]);
    const init = (fetchMock.mock.calls[0] as any)[1];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', Accept: 'text/event-stream' });
    expect(JSON.parse(init.body)).toMatchObject({ dealId: 'x', stream: true });
  });

  it('a plain JSON reply (function short-circuited or not dual-mode) resolves the same way', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { forecast: null, reason: 'not enough' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const onResult = vi.fn();
    const out = await streamFunction<any>('/f', {}, { onResult });
    expect(out.result.data.reason).toBe('not enough');
    expect(onResult).toHaveBeenCalledOnce();
  });

  it('HTTP errors and error events reject with the server message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Deal not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })));
    await expect(streamFunction('/f', {})).rejects.toThrow('Deal not found');
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse([{ type: 'error', message: 'boom' }])));
    await expect(streamFunction('/f', {})).rejects.toThrow('boom');
  });

  it('background: a cut-off stream is re-attached with resume { responseId, startingAfter }', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(sseResponse([{ type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_9' }, { type: 'status', phase: 'searching', label: 'Searching the web…' }], false))
      .mockResolvedValueOnce(sseResponse([{ type: 'result', data: { status: 'completed', result: { matched: true } } }, { type: 'done', id: 'resp_9', text: '', json: null }]));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    const p = streamFunction<any>('/.netlify/functions/contact-enrich', { action: 'start', background: true });
    await vi.runAllTimersAsync();
    const out = await p;
    vi.useRealTimers();
    expect(out.result.status).toBe('completed');
    const second = JSON.parse((fetchMock.mock.calls[1] as any)[1].body);
    expect(second.resume).toEqual({ responseId: 'resp_9', startingAfter: 1 });
  });
});
