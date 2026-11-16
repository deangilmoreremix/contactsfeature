// @vitest-environment node
/**
 * Dual-mode contract for the converted AI functions (docs/STREAMING.md):
 *   - JSON mode returns the same payload as before;
 *   - stream mode (Accept: text/event-stream) emits status/delta (+ partial) events, then
 *     `{type:'result', data}` equal to the JSON payload, then `done`, then `[DONE]`;
 *   - DB writes happen exactly once per request in either mode.
 * `_supabaseClient`, `_auth`, `_responses`, `_gtmPrompts`, `@supabase/supabase-js`, `@netlify/functions`
 * and `@openai/agents` are stubbed in the require cache (pattern: tests/calendar-list-contact.test.ts).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const fnDir = path.resolve(__dirname, '../netlify/functions');
const CID = '11111111-1111-4111-8111-111111111111';
const DID = '22222222-2222-4222-8222-222222222222';

process.env.OPENAI_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

type Write = { table: string; op: string; row: any };
let writes: Write[] = [];
let requests: any[] = [];
let nextText = '';
let tables: Record<string, any[]> = {};
let failStream = false;

function makeQuery(table: string) {
  const filters: Array<[string, unknown]> = [];
  const rows = () => (tables[table] || []).filter((r) => filters.every(([k, v]) => r[k] === v));
  const q: any = {
    select: () => q,
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: () => q, order: () => q, limit: () => q, gte: () => q, lte: () => q,
    insert: (row: any) => { writes.push({ table, op: 'insert', row }); return q; },
    update: (row: any) => { writes.push({ table, op: 'update', row }); return q; },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (res: any, rej: any) => Promise.resolve({ data: rows(), error: null }).then(res, rej),
  };
  return q;
}

// Fake Responses helpers: JSON mode returns nextText; stream mode chunks it into status/delta/partial/done.
async function fakeCreateResponse(opts: any) {
  requests.push({ mode: 'json', opts });
  return { id: 'resp_1', status: 'completed', text: nextText, json: null, citations: [], usage: null };
}
async function* fakeStreamResponse(opts: any) {
  requests.push({ mode: 'stream', opts });
  yield { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_1' };
  if (failStream) { yield { type: 'error', message: 'boom' }; return; }
  const parts = [nextText.slice(0, 7), nextText.slice(7, 20), nextText.slice(20)].filter(Boolean);
  let acc = '';
  for (const p of parts) {
    acc += p;
    yield { type: 'delta', text: p };
  }
  if (opts.schema) yield { type: 'partial', json: { _so_far: acc.length } };
  yield { type: 'done', id: 'resp_1', text: acc, usage: null, citations: [], json: null };
}

// Fake Agents SDK: `run(agent, input, {stream:true})` returns an async-iterable StreamedRunResult look-alike.
function fakeAgentsSdk() {
  const out = () => JSON.parse(nextText);
  return {
    Agent: class { constructor(public cfg: any) { Object.assign(this, cfg); } },
    tool: (t: any) => ({ type: 'function', ...t }),
    webSearchTool: () => ({ type: 'hosted_tool', name: 'web_search' }),
    setDefaultOpenAIKey: () => {}, setOpenAIAPI: () => {}, setTracingDisabled: () => {},
    run: async (_agent: any, _input: string, opts: any) => {
      requests.push({ mode: opts.stream ? 'stream' : 'json', opts });
      const final = out();
      if (!opts.stream) return { finalOutput: final, lastResponseId: 'resp_9', state: { usage: { inputTokens: 3, outputTokens: 4 } } };
      const json = JSON.stringify(final);
      const events = [
        { type: 'raw_model_stream_event', data: { type: 'response_started' } },
        { type: 'run_item_stream_event', name: 'tool_called', item: { rawItem: { type: 'function_call', name: 'get_contact_context' } } },
        { type: 'run_item_stream_event', name: 'tool_called', item: { rawItem: { type: 'hosted_tool_call', name: 'web_search_call' } } },
        { type: 'raw_model_stream_event', data: { type: 'response_started' } },
        { type: 'raw_model_stream_event', data: { type: 'output_text_delta', delta: json.slice(0, 12) } },
        { type: 'raw_model_stream_event', data: { type: 'output_text_delta', delta: json.slice(12) } },
      ];
      return {
        finalOutput: final,
        lastResponseId: 'resp_9',
        state: { usage: { inputTokens: 3, outputTokens: 4 } },
        completed: Promise.resolve(),
        error: undefined,
        async *[Symbol.asyncIterator]() { for (const e of events) yield e; },
      };
    },
  };
}

function setStub(name: string, exports: any) {
  const id = require.resolve(name.endsWith('.js') ? path.join(fnDir, name) : name);
  require.cache[id] = { id, filename: id, loaded: true, exports } as any;
}

function load(file: string) {
  const stubs = [
    '_supabaseClient.js', '_auth.js', '_responses.js', '_gtmPrompts.js', '_fetchWithRetry.js', '_validation.js', '_sdrPreferences.js',
    '_stream/dual.js', '_stream/helpers.js', '_stream/sse.js', '_stream/partialJson.js', '_conversations.js',
    '_agents/factory.js', '_agents/handler.js', '_agents/definitions.js', '_logger.js',
  ];
  // Drop previously loaded copies of the modules under test (their stubs are re-installed below).
  for (const m of [file, ...stubs.filter((s) => /^_(stream|agents|fetch|valid|sdr|conv|logger)/.test(s))]) {
    try { delete require.cache[require.resolve(path.join(fnDir, m))]; } catch { /* not loaded yet */ }
  }
  const supabase = { from: makeQuery };
  setStub('@netlify/functions', { stream: (h: any) => h });
  setStub('@supabase/supabase-js', { createClient: () => supabase });
  setStub('@openai/agents', fakeAgentsSdk());
  setStub('_supabaseClient.js', { supabase, getUserClient: () => supabase });
  setStub('_gtmPrompts.js', { getGTMPrompt: async () => null, getGTMPromptsByTag: async () => [] });
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  setStub('_auth.js', {
    CORS_HEADERS: CORS,
    errorResponse: (statusCode: number, message: string) => ({ statusCode, headers: CORS, body: JSON.stringify({ error: message }) }),
    authenticateRequest: async () => ({ user: { id: 'u1' }, error: null }),
    withAuth: (h: any) => async (event: any) => (event.httpMethod === 'POST' ? h(event, { id: 'u1' }) : { statusCode: 405, headers: CORS, body: '{}' }),
  });
  const real = require(path.join(fnDir, '_responses.js')); // loaded once for its pure helpers (strictify, resolveModel)
  setStub('_responses.js', {
    ...real,
    createResponse: fakeCreateResponse,
    streamResponse: fakeStreamResponse,
    resolveModel: () => ({ model: 'gpt-6-test', effort: 'low' }),
    allowedModelIds: () => new Set(['gpt-6-test']),
  });
  return require(path.join(fnDir, file)).handler as (e: any) => Promise<{ statusCode: number; headers: any; body: any }>;
}

async function readBody(body: any): Promise<string> {
  if (typeof body === 'string') return body;
  let s = '';
  for await (const chunk of body) s += chunk.toString();
  return s;
}

function parseSse(raw: string) {
  const events: any[] = [];
  let done = false;
  for (const block of raw.split('\n\n')) {
    const line = block.split('\n').find((l) => l.startsWith('data: '));
    if (!line) continue;
    const payload = line.slice(6);
    if (payload === '[DONE]') { done = true; continue; }
    events.push(JSON.parse(payload));
  }
  return { events, done };
}

const VOLATILE = new Set(['generated', 'timestamp', 'executedAt', 'generatedAt', 'analyzed']);
function normalize(v: any): any {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !VOLATILE.has(k)).map(([k, x]) => [k, normalize(x)]));
  return v;
}

const contact = { id: CID, user_id: 'u1', name: 'Ann Lee', firstname: 'Ann', lastname: 'Lee', email: 'ann@x.io', company: 'Acme', title: 'CTO', industry: 'saas' };

type Case = { name: string; file: string; body: any; text: any; auth?: boolean; writes: number; expectPartialOption?: boolean; extra?: (events: any[], json: any) => void };

const cases: Case[] = [
  {
    name: 'legacy callOpenAI family: cold-call-sdr',
    file: 'cold-call-sdr.js',
    body: { contactId: CID },
    text: { opening: 'Hi Ann', valueProposition: 'We help', discoveryQuestions: ['Q1'], objections: [{ objection: 'price', response: 'ROI' }], close: 'Book 15?', voicemail: 'Call me' },
    writes: 0, expectPartialOption: true,
    extra: (_e, json) => expect(json).toMatchObject({ contactId: CID, opening: 'Hi Ann', gtmPromptUsed: false }),
  },
  {
    name: 'legacy callOpenAI + DB writes in finalize: run-agent',
    file: 'run-agent.js',
    body: { contactId: CID },
    text: { subject: 'Hello', body: 'Body', next_action: 'follow_up' },
    writes: 1, // emails draft (no autopilot_state row exists)
    extra: (_e, json) => expect(json).toMatchObject({ contactId: CID, step: 1, subject: 'Hello', isComplete: false }),
  },
  {
    name: 'free-text legacy function: generate-with-prompt',
    file: 'generate-with-prompt.js',
    body: { prompt: 'Write a haiku', contactId: CID },
    text: 'Plain text answer that is not JSON at all.',
    writes: 1, // prompt_generation_logs
    extra: (_e, json) => expect(json.content).toBe('Plain text answer that is not JSON at all.'),
  },
  {
    name: 'SDR cold-email-sdr (old token/complete protocol replaced)',
    file: 'cold-email-sdr.js',
    body: { contactId: CID },
    text: { subject: 'Quick question', body: 'Hi Ann, would a short call help?' },
    writes: 0, expectPartialOption: true,
    extra: (_e, json) => expect(json).toMatchObject({ contactId: CID, subject: 'Quick question', sent: false, gtmPromptUsed: false }),
  },
  {
    name: 'email-composer',
    file: 'email-composer.js',
    body: { contact: { id: CID }, type: 'introduction', tone: 'friendly' },
    text: { subject: 'Hello Ann', body: 'Nice to meet you' },
    writes: 1, expectPartialOption: true,
    extra: (_e, json) => expect(json).toMatchObject({ success: true, provider: 'openai', data: { subject: 'Hello Ann', tone: 'friendly', type: 'introduction' } }),
  },
  {
    name: 'ai-insights',
    file: 'ai-insights.js',
    body: { contact: { id: CID }, insightTypes: ['risk'] },
    text: { insights: [{ type: 'risk', title: 'Going quiet', description: 'd', confidence: 70, impact: 'high', actionable: true, suggestedActions: ['call'], dataPoints: ['no reply'] }] },
    writes: 1, expectPartialOption: true,
    extra: (_e, json) => expect(json.data.insights).toHaveLength(1),
  },
  {
    name: 'responsesFetch-style function: adaptive-playbook',
    file: 'adaptive-playbook.js',
    auth: false,
    body: { contact: { id: 'c1', name: 'Ann', company: 'Acme', title: 'CTO' }, currentStage: 'prospect', businessGoals: ['grow'], automationType: 'comprehensive', playbookType: 'comprehensive', aiProvider: 'openai' },
    text: { strategy: { name: 'S', description: 'd', confidence: 0.8, rationale: 'r' }, phases: [], riskMitigation: [], successIndicators: [], competitivePositioning: { strengths: [], weaknesses: [], differentiation: [], winThemes: [] } },
    writes: 1, expectPartialOption: true,
    extra: (_e, json) => expect(json).toMatchObject({ success: true, provider: 'openai', data: { strategy: { name: 'S' }, currentStage: 'prospect' } }),
  },
  {
    name: 'run-ae-agent (unauthenticated legacy handler, free text)',
    file: 'run-ae-agent.js',
    auth: false,
    body: { contactId: CID },
    text: 'Plan: 1) send recap 2) book demo',
    writes: 2, // agent_runs + contacts update
    extra: (_e, json) => expect(json).toMatchObject({ success: true, contactId: CID, response: 'Plan: 1) send recap 2) book demo' }),
  },
  {
    name: 'Agents-SDK handler: linkedin-sdr',
    file: 'linkedin-sdr.js',
    body: { contactId: CID },
    text: { connectionNote: 'Hi Ann', followUpMessage: 'Thanks for connecting', talkingPoints: ['a', 'b'] },
    writes: 0,
    extra: (events, json) => {
      expect(json).toMatchObject({ contactId: CID, agent: 'linkedin-sdr', connectionNote: 'Hi Ann', model: 'gpt-6-test' });
      if (!events.length) return; // JSON mode: no events
      expect(events.some((e) => e.type === 'status' && e.label === 'Running get_contact_context…')).toBe(true);
      expect(events.some((e) => e.type === 'status' && e.label === 'Searching the web…')).toBe(true);
      const partial = events.filter((e) => e.type === 'partial');
      expect(partial.length).toBeGreaterThan(0);
      expect(partial.some((p: any) => 'connectionNote' in p.json)).toBe(true);
    },
  },
  {
    name: 'Agents-SDK handler with web search: event-based-sdr',
    file: 'event-based-sdr.js',
    body: { contactId: CID, goal: 'book a call' },
    text: { trigger: 'Raised Series A', eventSources: ['https://a.io'], subject: 's', body: 'b' },
    writes: 0,
  },
];

beforeEach(() => {
  writes = []; requests = []; nextText = ''; failStream = false;
  tables = { contacts: [contact], deals: [], activities: [], agent_threads: [] };
});

function req(c: Case, accept?: boolean, extraBody: any = {}) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer t', ...(accept ? { accept: 'text/event-stream' } : {}) },
    queryStringParameters: null,
    body: JSON.stringify({ ...c.body, ...extraBody }),
  };
}

describe('dual-mode AI functions: JSON mode unchanged, stream mode result === JSON payload', () => {
  for (const c of cases) {
    it(c.name, async () => {
      nextText = typeof c.text === 'string' ? c.text : JSON.stringify(c.text);
      const handler = load(c.file);

      // JSON mode
      const jsonRes = await handler(req(c));
      expect(jsonRes.statusCode).toBe(200);
      const jsonPayload = JSON.parse(await readBody(jsonRes.body));
      const jsonWrites = writes.length;
      expect(jsonWrites).toBe(c.writes);
      expect(requests.every((r) => r.mode === 'json')).toBe(true);
      if (c.expectPartialOption) expect(requests[0].opts.schema).toBeTruthy(); // structured output so `partial` events can fill progressively
      c.extra?.([], jsonPayload);

      // Stream mode
      writes = []; requests = [];
      const res = await handler(req(c, true));
      expect(res.statusCode).toBe(200);
      expect(String(res.headers['Content-Type'])).toMatch(/text\/event-stream/);
      const { events, done } = parseSse(await readBody(res.body));
      const types = events.map((e) => e.type);

      expect(done).toBe(true);
      expect(types).toContain('status');
      expect(types).toContain('delta');
      expect(types.filter((t) => t === 'result')).toHaveLength(1);
      expect(types.filter((t) => t === 'done')).toHaveLength(1);
      expect(types.includes('error')).toBe(false);
      // order: status/delta come before the result, `done` closes the stream
      expect(types.indexOf('result')).toBeGreaterThan(types.indexOf('delta'));
      expect(types.indexOf('status')).toBeLessThan(types.indexOf('result'));
      expect(types[types.length - 1]).toBe('done');
      expect(normalize(events.find((e) => e.type === 'result').data)).toEqual(normalize(jsonPayload));
      // the DB write happens once, in stream mode too
      expect(writes.length).toBe(c.writes);
      expect(requests.every((r) => r.mode === 'stream')).toBe(true);
      c.extra?.(events, events.find((e) => e.type === 'result').data);
    });
  }

  it('body.stream:true and ?stream=true also select SSE', async () => {
    const c = cases[3];
    nextText = JSON.stringify(c.text);
    const handler = load(c.file);
    const viaBody = parseSse(await readBody((await handler(req(c, false, { stream: true }))).body));
    expect(viaBody.events.map((e) => e.type)).toContain('result');
    const viaQuery = parseSse(await readBody((await handler({ ...req(c), queryStringParameters: { stream: 'true' } })).body));
    expect(viaQuery.events.map((e) => e.type)).toContain('result');
  });

  it('validation and ownership still short-circuit before streaming starts', async () => {
    const handler = load('cold-email-sdr.js');
    nextText = '{}';
    const missing = await handler({ ...req(cases[3], true), body: JSON.stringify({}) });
    expect(missing.statusCode).toBe(400);
    tables.contacts = [{ ...contact, user_id: 'someone-else' }];
    const notOwned = await handler(req(cases[3], true));
    expect(notOwned.statusCode).toBe(404);
    expect(requests).toHaveLength(0);
    expect(writes).toHaveLength(0);
  });

  it('Agents-SDK stream mode honours conversationId ownership', async () => {
    const handler = load('linkedin-sdr.js');
    nextText = JSON.stringify(cases[8].text);
    const res = await handler(req(cases[8], true, { conversationId: 'conv_not_mine_123' }));
    expect(res.statusCode).toBe(404);
    expect(requests).toHaveLength(0);
    tables.agent_threads = [{ id: 't1', thread_id: 'conv_mine_1234', lead_id: CID }];
    const ok = await handler(req(cases[8], true, { conversationId: 'conv_mine_1234' }));
    const { events } = parseSse(await readBody(ok.body));
    expect(events.find((e) => e.type === 'result').data.conversationId).toBe('conv_mine_1234');
    expect(requests[0].opts).toMatchObject({ stream: true, conversationId: 'conv_mine_1234' });
  });

  it('stream mode reports a failing model as an error event and writes nothing', async () => {
    const handler = load('email-composer.js');
    nextText = JSON.stringify({ subject: 's', body: 'b' });
    failStream = true;
    const res = await handler(req(cases[4], true));
    const { events, done } = parseSse(await readBody(res.body));
    expect(done).toBe(true);
    expect(events.map((e) => e.type)).toEqual(['status', 'error']);
    expect(writes).toHaveLength(0);
  });
});
