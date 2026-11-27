// @vitest-environment node
/**
 * Server side of the live panels: streamed contact enrichment (background + resume + ai_jobs bookkeeping) and the
 * dual-mode deal-health / sales-forecasting functions (JSON mode unchanged, SSE mode fills in field by field).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
(globalThis as any).awslambda ||= { streamifyResponse: (f: unknown) => f, HttpResponseStream: { from: (s: unknown) => s } };
process.env.OPENAI_API_KEY = 'test';
const fnDir = path.resolve(__dirname, '../netlify/functions');
const real = require(path.join(fnDir, '_responses.js'));

function stub(name: string, exports: any) {
  const id = require.resolve(path.join(fnDir, name));
  require.cache[id] = { id, filename: id, loaded: true, exports } as any;
}
function unload(...names: string[]) {
  for (const n of names) delete require.cache[require.resolve(path.join(fnDir, n))];
}
async function collect(readable: any): Promise<string> {
  let out = '';
  for await (const chunk of readable) out += chunk.toString();
  return out;
}
function frames(sse: string): any[] {
  return sse.split('\n\n').map((f) => f.split('\n').find((l) => l.startsWith('data:'))).filter((l): l is string => !!l && !l.includes('[DONE]')).map((l) => JSON.parse(l.slice(5)));
}

let calls: { create: any[]; stream: any[]; createJob: any[]; completeJob: any[]; inserts: any[]; upserts: any[] };
let streamEvents: any[];
let createResult: any;

function loadFns() {
  calls = { create: [], stream: [], createJob: [], completeJob: [], inserts: [], upserts: [] };
  const db = {
    from: (table: string) => {
      const q: any = {
        select: () => q, eq: () => q, in: () => q,
        maybeSingle: async () => ({ data: table === 'deals' ? { id: '11111111-1111-1111-1111-111111111111', title: 'Acme', stage: 'proposal', value: 5000, created_at: '2026-01-01', updated_at: '2026-02-01' } : table === 'contacts' ? { id: 'c1', title: '', company: 'Acme' } : null, error: null }),
        insert: async (row: any) => { calls.inserts.push({ table, row }); return { error: null }; },
        upsert: async (row: any) => { calls.upserts.push({ table, row }); return { error: null }; },
        then: (res: any) => Promise.resolve({ data: [], error: null }).then(res),
      };
      return q;
    },
  };
  stub('_supabaseClient.js', { supabase: db, getUserClient: () => db });
  stub('_auth.js', { CORS_HEADERS: {}, errorResponse: (s: number, m: string) => ({ statusCode: s, headers: {}, body: JSON.stringify({ error: m }) }), withAuth: (h: any) => async (e: any) => h(e, { id: 'u1' }), authenticateRequest: async () => ({ user: { id: 'u1' } }) });
  stub('_responses.js', {
    ...real,
    createResponse: async (o: any) => { calls.create.push(o); return createResult; },
    streamResponse: async function* (o: any) { calls.stream.push(o); for (const e of streamEvents) yield e; },
    retrieveResponse: async (id: string) => ({ id, status: 'completed', metadata: { user_id: 'u1', contact_id: '', deal_id: '' }, json: null, text: '', citations: [], sources: [], response: {} }),
  });
  stub('_aiJobs.js', {
    createJob: async (_db: any, j: any) => { calls.createJob.push(j); return { response_id: j.responseId, user_id: 'u1', status: 'in_progress', result: j.context ? { context: j.context } : null }; },
    getJob: async (_db: any, _u: string, id: string) => ({ response_id: id, user_id: 'u1', status: 'in_progress', result: calls.createJob[0]?.context ? { context: calls.createJob[0].context } : null }),
    completeJob: async (_db: any, job: any, run: any) => { calls.completeJob.push({ job, run }); return { job, changed: true }; },
    resolveJob: async () => null, isTerminal: () => false,
  });
  unload('contact-enrich.js', 'deal-health-analysis.js', 'sales-forecasting.js', '_stream/backgroundJob.js', '_stream/dual.js', '_dealHealth.js');
  return {
    enrich: require(path.join(fnDir, 'contact-enrich.js')),
    health: require(path.join(fnDir, 'deal-health-analysis.js')),
    forecast: require(path.join(fnDir, 'sales-forecasting.js')),
  };
}

const HEALTH_JSON = { healthScore: 72, riskLevel: 'medium', indicators: [{ name: 'Momentum', score: 60, status: 'warning', rationale: 'Updated 30 days ago' }], risks: [], recommendations: ['Send a recap'], nextActions: [], dataGaps: [] };
const healthStream = () => [
  { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_h1', seq: 0 },
  { type: 'delta', text: '{"healthScore":72', seq: 1 },
  { type: 'partial', json: { healthScore: 72 }, seq: 2 },
  { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', recommendations: ['Send a recap'] }, seq: 3 },
  { type: 'done', id: 'resp_h1', text: JSON.stringify(HEALTH_JSON), usage: null, citations: [], json: HEALTH_JSON, seq: 4 },
];

beforeEach(() => { streamEvents = []; createResult = { id: 'resp_h1', status: 'queued', text: JSON.stringify(HEALTH_JSON), json: HEALTH_JSON }; });

describe('contact-enrich streamed run', () => {
  const ENRICH = { matched: true, confidence: 90, profile: { jobTitle: 'VP Sales', company: 'Acme', industry: 'SaaS' }, company: { name: 'Acme' }, recentNews: [], talkingPoints: [], evidence: [], warnings: [] };
  const events = () => [
    { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_e1', seq: 0 },
    { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…', seq: 1 },
    { type: 'partial', json: { matched: true }, seq: 2 },
    { type: 'done', id: 'resp_e1', text: JSON.stringify(ENRICH), usage: null, citations: [{ url: 'https://acme.com', title: 'Acme' }], json: ENRICH, seq: 3 },
  ];

  it('streams status + findings, creates the ai_jobs row, then a result identical to the status payload', async () => {
    const { enrich } = loadFns();
    streamEvents = events();
    const out: any[] = [];
    for await (const ev of enrich._internals.enrichmentEvents({ user: { id: 'u1' }, contact: { id: 'c1', name: 'Ada', company: '' }, persisted: true, fallbackContact: { title: '' } })) out.push(ev);
    expect(out.map((e) => e.type)).toEqual(['status', 'status', 'partial', 'result', 'done']);
    expect(calls.stream[0]).toMatchObject({ background: true, toolChoice: 'required' });
    expect(calls.createJob).toHaveLength(1);
    expect(calls.createJob[0]).toMatchObject({ userId: 'u1', kind: 'contact_enrichment', responseId: 'resp_e1', status: 'in_progress' });
    expect(calls.completeJob).toHaveLength(1);
    const result = out.find((e) => e.type === 'result').data;
    expect(result).toMatchObject({ status: 'completed', persisted: false });
    expect(result.suggestedUpdates).toMatchObject({ title: 'VP Sales', industry: 'SaaS' });
  });

  it('resume re-attaches with starting_after and does not create a second job', async () => {
    const { enrich } = loadFns();
    streamEvents = [events()[3]];
    const out: any[] = [];
    for await (const ev of enrich._internals.enrichmentEvents({ user: { id: 'u1' }, fallbackContact: {}, resume: { responseId: 'resp_e1', startingAfter: 2 } })) out.push(ev);
    expect(calls.stream[0].resume).toEqual({ responseId: 'resp_e1', startingAfter: 2 });
    expect(calls.createJob).toHaveLength(0);
    expect(out.map((e) => e.type)).toEqual(['result', 'done']);
  });

  it('a failed model result becomes an error event, never a half-applied result', async () => {
    const { enrich } = loadFns();
    streamEvents = [{ type: 'status', phase: 'started', label: 'x', id: 'resp_e2' }, { type: 'done', id: 'resp_e2', text: '', usage: null, citations: [], json: null }];
    const out: any[] = [];
    for await (const ev of enrich._internals.enrichmentEvents({ user: { id: 'u1' }, contact: { id: 'c1' }, persisted: false })) out.push(ev);
    expect(out.map((e) => e.type)).toContain('error');
    expect(out.find((e) => e.type === 'result')).toBeUndefined();
  });
});

describe('deal-health-analysis dual mode', () => {
  const req = (body: any, headers: any = {}) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer t', ...headers }, body: JSON.stringify(body) });
  const DEAL = '11111111-1111-1111-1111-111111111111';

  it('JSON mode is unchanged: { success, data, facts } and the analysis row is stored', async () => {
    const { health } = loadFns();
    const res = await health.rawHandler(req({ dealId: DEAL }));
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ success: true, data: { healthScore: 72, riskLevel: 'medium' } });
    expect(body.facts.title).toBe('Acme');
    expect(calls.inserts.find((i) => i.table === 'deal_health_analyses').row).toMatchObject({ health_score: 72 });
  });

  it('stream mode: score/risk/recommendations arrive as partial events, then the same payload as a result event', async () => {
    const { health } = loadFns();
    streamEvents = healthStream();
    const res = await health.rawHandler(req({ dealId: DEAL, stream: true }));
    expect(res.headers['Content-Type']).toMatch(/event-stream/);
    const evs = frames(await collect(res.body));
    expect(evs.map((e) => e.type)).toEqual(['status', 'delta', 'partial', 'partial', 'result', 'done']);
    expect(evs.find((e) => e.type === 'result').data).toMatchObject({ success: true, data: { healthScore: 72 } });
    expect(calls.inserts.some((i) => i.table === 'deal_health_analyses')).toBe(true);
  });

  it('background + stream: ai_jobs row with the deal context is created and completed', async () => {
    const { health } = loadFns();
    streamEvents = healthStream();
    const res = await health.rawHandler(req({ dealId: DEAL, background: true, stream: true }));
    const evs = frames(await collect(res.body));
    expect(evs.find((e) => e.type === 'result').data.data.healthScore).toBe(72);
    expect(calls.createJob[0]).toMatchObject({ kind: 'deal_health', responseId: 'resp_h1', context: { dealId: DEAL } });
    expect(calls.completeJob).toHaveLength(1);
    // the ai_jobs onComplete hook stores the row for this path: the handler must not insert a second one
    expect(calls.inserts.filter((i) => i.table === 'deal_health_analyses')).toHaveLength(0);
  });

  it('background without stream keeps the old start protocol', async () => {
    const { health } = loadFns();
    const res = await health.rawHandler(req({ dealId: DEAL, background: true }));
    expect(JSON.parse(res.body)).toMatchObject({ success: true, background: true, responseId: 'resp_h1' });
    expect(calls.create[0].background).toBe(true);
  });
});

describe('sales-forecasting dual mode', () => {
  const FORECAST = { projectedWonNext90Days: { low: 1, expected: 2, high: 3 }, confidence: 'low', insights: ['a'], risks: [], recommendedActions: [], caveats: [] };
  const deals = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `d${i}`, stage: i % 2 ? 'won' : 'lost', value: 100 }));
  const req = (body: any) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify(body) });

  it('too little data: answers with plain JSON even when a stream was requested', async () => {
    const { forecast } = loadFns();
    const res = await forecast.rawHandler(req({ deals: deals(1), stream: true }));
    expect(res.body).toEqual(expect.any(String));
    expect(JSON.parse(res.body).data.reason).toMatch(/closed/);
  });

  it('stream mode returns partial forecast events and a result with { stats, forecast }', async () => {
    const { forecast } = loadFns();
    streamEvents = [
      { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_f1' },
      { type: 'partial', json: { projectedWonNext90Days: { low: 1 } } },
      { type: 'done', id: 'resp_f1', text: JSON.stringify(FORECAST), usage: null, citations: [], json: FORECAST },
    ];
    // deals are re-read from the DB (fake returns []), so send none and rely on the supplied rows
    const res = await forecast.rawHandler(req({ deals: deals(6).map(({ id, ...d }) => d), stream: true }));
    const evs = frames(await collect(res.body));
    expect(evs.map((e) => e.type)).toEqual(['status', 'partial', 'result', 'done']);
    expect(evs.find((e) => e.type === 'result').data.data.forecast.projectedWonNext90Days.expected).toBe(2);
  });
});
