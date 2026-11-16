/**
 * A tiny SSE server that DRIPS events (150-300 ms apart) the way the real Netlify functions do, so Playwright can
 * assert that the DOM grows while the answer is produced (page.route cannot stream a body).
 * The Vite harness proxies /.netlify/functions/* here.
 */
import http from 'node:http';

type Ev = Record<string, unknown>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const INSIGHTS = [
  { type: 'opportunity', title: 'Insight Alpha: expansion window', description: 'Acme posted three new sales roles this quarter.', confidence: 82, impact: 'high', category: 'Growth', actionable: true, suggestedActions: ['Reference the hiring plan in your next email'], dataPoints: [] },
  { type: 'risk', title: 'Insight Beta: budget freeze rumour', description: 'A recent article mentions delayed purchasing.', confidence: 64, impact: 'medium', category: 'Risk', actionable: false, suggestedActions: [], dataPoints: [] },
  { type: 'recommendation', title: 'Insight Gamma: multi-thread the deal', description: 'Only one contact is engaged at Acme.', confidence: 77, impact: 'medium', category: 'Strategy', actionable: true, suggestedActions: ['Ask for an intro to RevOps'], dataPoints: [] },
];
const HEALTH = {
  healthScore: 72, riskLevel: 'medium',
  indicators: [
    { name: 'Momentum Alpha', score: 64, status: 'warning', rationale: 'Last update 30 days ago.' },
    { name: 'Engagement Beta', score: 81, status: 'good', rationale: 'Replied within two days.' },
  ],
  risks: [], recommendations: ['Send a short recap email today', 'Book a stakeholder call this week'],
  nextActions: [{ action: 'Share the ROI one-pager', priority: 'high', timeline: 'This week' }], dataGaps: ['Budget owner unknown'],
};
const ENRICH = {
  matched: true, confidence: 91, summary: 'Ada Lovelace is VP of Sales at Acme Corp, a B2B software company.',
  profile: { jobTitle: 'VP of Sales', company: 'Acme Corp', industry: 'Software', location: null, bio: null, website: 'https://acme.com', linkedinUrl: null, twitterUrl: null, instagramUrl: null, facebookUrl: null, businessPhone: null },
  company: { name: 'Acme Corp', website: 'https://acme.com', description: null, industry: 'Software', sizeEstimate: null, headquarters: null },
  recentNews: [{ headline: 'Acme raises Series B', url: 'https://news.example.com/acme-series-b', date: null }],
  talkingPoints: ['Series B funding closes new budget', 'Hiring three account executives'],
  evidence: [{ field: 'jobTitle', value: 'VP of Sales', sourceUrl: 'https://acme.com/team' }, { field: 'industry', value: 'Software', sourceUrl: 'https://news.example.com/acme-series-b' }],
  warnings: [],
};
const FORECAST = { projectedWonNext90Days: { low: 40000, expected: 65000, high: 90000 }, confidence: 'medium', insights: ['Win rate is steady', 'Two proposals close soon'], risks: [], recommendedActions: ['Follow up on open proposals'], caveats: ['Few closed deals'] };

export interface DripOptions { gapMs?: [number, number] }

export function startDripServer(port: number, opts: DripOptions = {}): Promise<http.Server> {
  const [lo, hi] = opts.gapMs ?? [150, 300];
  const gap = () => sleep(lo + Math.random() * (hi - lo));

  async function play(res: http.ServerResponse, events: Ev[], seqStart = 0) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    let seq = seqStart;
    for (const e of events) {
      await gap();
      res.write(`id: ${seq}\ndata: ${JSON.stringify({ ...e, seq })}\n\n`);
      seq += 1;
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  const growing = (key: string, items: Record<string, unknown>[]) => {
    const evs: Ev[] = [];
    const done: Record<string, unknown>[] = [];
    for (const item of items) {
      evs.push({ type: 'partial', json: { [key]: [...done, { type: item.type, title: item.title }] } });
      evs.push({ type: 'partial', json: { [key]: [...done, { type: item.type, title: item.title, description: item.description, impact: item.impact, category: item.category }] } });
      done.push(item);
      evs.push({ type: 'partial', json: { [key]: [...done] } });
    }
    return evs;
  };

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); res.end(); return; }
    let raw = '';
    for await (const c of req) raw += c;
    let body: any = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* ignore */ }
    const url = req.url || '';

    if (url.includes('/ai-stream')) {
      if (body.schema) {
        const text = JSON.stringify({ insights: INSIGHTS });
        return play(res, [
          { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_ins' },
          ...growing('insights', INSIGHTS),
          { type: 'done', id: 'resp_ins', text, usage: null, citations: [], json: { insights: INSIGHTS } },
        ]);
      }
      return play(res, [
        { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_web' },
        { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' },
        { type: 'delta', text: 'Acme Corp is hiring ' },
        { type: 'delta', text: 'sales roles and raised funding.' },
        { type: 'done', id: 'resp_web', text: 'Acme Corp is hiring sales roles and raised funding.', usage: null, citations: [{ url: 'https://acme.com/news', title: 'Acme news' }], json: null },
      ]);
    }

    if (url.includes('/deal-health-analysis')) {
      return play(res, [
        { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_h' },
        { type: 'partial', json: { healthScore: 72 } },
        { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', indicators: [{ name: 'Momentum Alpha' }] } },
        { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', indicators: [HEALTH.indicators[0]] } },
        { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', indicators: HEALTH.indicators, recommendations: [HEALTH.recommendations[0]] } },
        { type: 'partial', json: { ...HEALTH, nextActions: [], dataGaps: [] } },
        { type: 'result', data: { success: true, data: HEALTH, facts: {}, analyzedAt: new Date().toISOString() } },
        { type: 'done', id: 'resp_h', text: JSON.stringify(HEALTH), usage: null, citations: [], json: HEALTH },
      ]);
    }

    if (url.includes('/sales-forecasting')) {
      return play(res, [
        { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_f' },
        { type: 'partial', json: { projectedWonNext90Days: { low: 40000 } } },
        { type: 'partial', json: { projectedWonNext90Days: FORECAST.projectedWonNext90Days, confidence: 'medium', insights: ['Win rate is steady'] } },
        { type: 'partial', json: FORECAST },
        { type: 'result', data: { success: true, data: { stats: {}, forecast: FORECAST, reason: null } } },
        { type: 'done', id: 'resp_f', text: JSON.stringify(FORECAST), usage: null, citations: [], json: FORECAST },
      ]);
    }

    if (url.includes('/contact-enrich')) {
      const done = { status: 'completed', persisted: false, result: ENRICH, citations: [{ url: 'https://acme.com/team', title: 'Acme team page' }, { url: 'https://news.example.com/acme-series-b', title: 'Acme raises Series B' }], sources: [], suggestedUpdates: { title: 'VP of Sales', industry: 'Software' } };
      return play(res, [
        { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_e' },
        { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' },
        { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' },
        { type: 'partial', json: { matched: true, confidence: 91, summary: 'Ada Lovelace is VP of Sales' } },
        { type: 'partial', json: { matched: true, confidence: 91, summary: ENRICH.summary, profile: { jobTitle: 'VP of Sales', company: 'Acme Corp' }, evidence: [ENRICH.evidence[0]] } },
        { type: 'partial', json: { ...ENRICH, talkingPoints: [ENRICH.talkingPoints[0]], evidence: ENRICH.evidence } },
        { type: 'partial', json: ENRICH },
        { type: 'result', data: done },
        { type: 'done', id: 'resp_e', text: JSON.stringify(ENRICH), usage: null, citations: done.citations, json: ENRICH },
      ]);
    }

    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: `no drip script for ${url}` }));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
