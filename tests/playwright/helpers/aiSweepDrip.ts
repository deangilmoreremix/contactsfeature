/**
 * Dripping SSE server for the AI controls sweep. Every /.netlify/functions/<fn> request (proxied by `vite preview`)
 * gets a real, slowly delivered SSE stream (status / delta / partial / result / done, 150-300 ms apart, per
 * docs/STREAMING.md). It also keeps a request log (Accept header, parsed body.stream, query) so the spec can assert
 * what each control actually asked for, and GET /__log returns + clears it.
 */
import http from 'node:http';

type Ev = Record<string, unknown>;
export interface DripLogEntry { endpoint: string; method: string; accept: string; bodyStream: boolean; queryStream: boolean; wantsStream: boolean; bodyKeys: string[]; task?: string; at: number; scripted: boolean }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TEXT = 'Here is a concrete, personalised answer that arrives piece by piece so the person can read it while the model is still working. It references the contact, the company and the next best step.';
const EMAIL_BODY = 'Hi Brooklyn, I noticed ACME Retail is expanding its operations team this quarter and thought a short ramp-up playbook could help your new managers get productive faster. Worth a quick chat this week?';

function chunks(text: string, n = 3): Ev[] {
  const w = text.split(' ');
  const out: Ev[] = [];
  for (let i = 0; i < w.length; i += n) out.push({ type: 'delta', text: w.slice(i, i + n).join(' ') + (i + n < w.length ? ' ' : '') });
  return out;
}
const started = (id: string): Ev => ({ type: 'status', phase: 'started', label: 'Thinking…', id });
const done = (id: string, text: string, json: unknown = null): Ev => ({ type: 'done', id, text, usage: null, citations: [], json });

/** partial objects that grow field by field, then result + done */
function growing(obj: Record<string, unknown>, result: unknown, id: string): Ev[] {
  const evs: Ev[] = [started(id)];
  const acc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.length > 40) {
      acc[k] = v.slice(0, Math.floor(v.length / 3)); evs.push({ type: 'partial', json: { ...acc } });
      acc[k] = v.slice(0, Math.floor((v.length * 2) / 3)); evs.push({ type: 'partial', json: { ...acc } });
    }
    acc[k] = v; evs.push({ type: 'partial', json: { ...acc } });
  }
  evs.push({ type: 'result', data: result }, done(id, JSON.stringify(obj), obj));
  return evs;
}

/** text answer: status, deltas, result, done */
function texty(id: string, text: string, result: unknown): Ev[] {
  return [started(id), { type: 'status', phase: 'working', label: 'Writing…' }, ...chunks(text), { type: 'result', data: result }, done(id, text)];
}

const COLD = { contactId: 'c1', subject: 'Quick idea for ACME Retail', body: EMAIL_BODY, sent: false };
const INSIGHTS = [
  { type: 'opportunity', title: 'Expansion window at ACME Retail', description: 'ACME posted three new operations roles this quarter.', confidence: 82, impact: 'high', category: 'Growth', actionable: true, suggestedActions: ['Reference the hiring plan'], dataPoints: [] },
  { type: 'risk', title: 'Budget freeze rumour', description: 'A recent article mentions delayed purchasing.', confidence: 64, impact: 'medium', category: 'Risk', actionable: false, suggestedActions: [], dataPoints: [] },
  { type: 'recommendation', title: 'Multi-thread the deal', description: 'Only one contact is engaged at ACME.', confidence: 77, impact: 'medium', category: 'Strategy', actionable: true, suggestedActions: ['Ask for an intro to RevOps'], dataPoints: [] },
];
const HEALTH = {
  healthScore: 72, riskLevel: 'medium',
  indicators: [{ name: 'Momentum', score: 64, status: 'warning', rationale: 'Last update 30 days ago.' }, { name: 'Engagement', score: 81, status: 'good', rationale: 'Replied within two days.' }],
  risks: [], recommendations: ['Send a short recap email today', 'Book a stakeholder call this week'], nextActions: [{ action: 'Share the ROI one-pager', priority: 'high', timeline: 'This week' }], dataGaps: ['Budget owner unknown'],
};
const ENRICH = {
  matched: true, confidence: 91, summary: 'Brooklyn Simmons is Retail Operations Manager at ACME Retail, a mid-size retailer.',
  profile: { jobTitle: 'Retail Operations Manager', company: 'ACME Retail', industry: 'Retail', location: null, bio: null, website: 'https://acme.example', linkedinUrl: null, twitterUrl: null, instagramUrl: null, facebookUrl: null, businessPhone: null },
  company: { name: 'ACME Retail', website: 'https://acme.example', description: null, industry: 'Retail', sizeEstimate: null, headquarters: null },
  recentNews: [{ headline: 'ACME Retail opens 12 stores', url: 'https://news.example.com/acme', date: null }],
  talkingPoints: ['Store expansion needs ops tooling', 'Hiring three managers'],
  evidence: [{ field: 'jobTitle', value: 'Retail Operations Manager', sourceUrl: 'https://acme.example/team' }], warnings: [],
};
const EMAIL = { subject: 'Following up on our call', body: EMAIL_BODY, purpose: 'follow_up', tone: 'professional', model: 'gpt-test' };
const ANALYSIS = { metrics: { wordCount: 30 }, toneAnalysis: {}, dominantTone: 'professional', qualityScore: 81, responseLikelihood: 64, improvements: [], assessment: 'Clear and concise with one strong call to action.', confidence: 80, model: 'gpt-test', analyzedAt: new Date().toISOString() };

type Script = (body: any, url: URL) => Ev[];
const SCRIPTS: Record<string, Script> = {
  'cold-email-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'follow-up-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'objection-handler-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'reactivation-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'win-back-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'discovery-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'email-composer': () => growing({ subject: EMAIL.subject, body: EMAIL.body }, EMAIL, 'r_ec'),
  'email-analyzer': () => growing({ assessment: ANALYSIS.assessment, qualityScore: 81 }, ANALYSIS, 'r_ea'),
  'deal-health-analysis': () => [started('r_h'), { type: 'partial', json: { healthScore: 72 } }, { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', indicators: [HEALTH.indicators[0]] } },
    { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', indicators: HEALTH.indicators, recommendations: [HEALTH.recommendations[0]] } }, { type: 'partial', json: HEALTH },
    { type: 'result', data: { success: true, data: HEALTH, facts: {}, analyzedAt: new Date().toISOString() } }, done('r_h', JSON.stringify(HEALTH), HEALTH)],
  'contact-enrich': () => {
    const d = { status: 'completed', persisted: false, result: ENRICH, citations: [{ url: 'https://acme.example/team', title: 'Team page' }], sources: [], suggestedUpdates: { title: 'Retail Operations Manager', industry: 'Retail' } };
    return [started('r_e'), { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' },
      { type: 'partial', json: { matched: true, confidence: 91, summary: 'Brooklyn Simmons is Retail Operations Manager' } },
      { type: 'partial', json: { ...ENRICH, talkingPoints: [ENRICH.talkingPoints[0]] } }, { type: 'partial', json: ENRICH },
      { type: 'result', data: d }, done('r_e', JSON.stringify(ENRICH), ENRICH)];
  },
  'sales-forecasting': () => {
    const F = { projectedWonNext90Days: { low: 40000, expected: 65000, high: 90000 }, confidence: 'medium', insights: ['Win rate is steady', 'Two proposals close soon'], risks: [], recommendedActions: ['Follow up on open proposals'], caveats: ['Few closed deals'] };
    return [started('r_f'), { type: 'partial', json: { projectedWonNext90Days: { low: 40000 } } }, { type: 'partial', json: F }, { type: 'result', data: { success: true, data: { stats: {}, forecast: F, reason: null } } }, done('r_f', JSON.stringify(F), F)];
  },
  'lead-nurturing': () => {
    const N = { nurtureSequence: [{ week: 1, theme: 'Welcome' }, { week: 2, theme: 'Case study' }], contentCalendar: [{ date: '2026-12-01', content: 'Intro email', channel: 'email', purpose: 'awareness' }], engagementTriggers: ['opened email'], successMetrics: ['reply rate'], personalizationStrategy: 'Lead with hiring news and the ramp-up playbook for new managers' };
    return growing(N, { success: true, data: N }, 'r_ln');
  },
  'generate-with-prompt': () => texty('r_gtm', TEXT, { content: TEXT }),
  'run-agent': () => texty('r_ra', TEXT, { success: true, step: 2 }),
};

export function startAiSweepDrip(port: number): Promise<http.Server & { log: DripLogEntry[] }> {
  const log: DripLogEntry[] = [];
  const gap = () => sleep(150 + Math.random() * 150);

  async function play(res: http.ServerResponse, events: Ev[]) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    let seq = 0;
    let closed = false;
    res.on('close', () => { closed = true; });
    for (const e of events) {
      await gap();
      if (closed) return;
      res.write(`id: ${seq}\ndata: ${JSON.stringify({ ...e, seq })}\n\n`);
      seq += 1;
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); res.end(); return; }
    const u = new URL(req.url || '/', 'http://x');
    if (u.pathname === '/__log') {
      const out = log.splice(0, log.length);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(out));
      return;
    }
    let raw = '';
    for await (const c of req) raw += c;
    let body: any = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* ignore */ }
    const endpoint = u.pathname.split('/').pop() || '';
    const accept = String(req.headers['accept'] || '');
    const bodyStream = body?.stream === true;
    const queryStream = u.searchParams.get('stream') === 'true';
    const script = SCRIPTS[endpoint];
    log.push({ endpoint, method: req.method || '', accept, bodyStream, queryStream, wantsStream: /text\/event-stream/i.test(accept) || bodyStream || queryStream, bodyKeys: Object.keys(body || {}), task: body?.task, at: Date.now(), scripted: !!script });
    const id = `r_${endpoint}`;
    if (script) return play(res, script(body, u));
    // generic: streams for any endpoint without a dedicated script
    const obj = { text: TEXT, summary: TEXT };
    return play(res, [...texty(id, TEXT, { success: true, data: obj, content: TEXT, text: TEXT }).slice(0, -1), { type: 'partial', json: obj }, done(id, TEXT, obj)]);
  });
  const s = server as http.Server & { log: DripLogEntry[] };
  s.log = log;
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(s)));
}
