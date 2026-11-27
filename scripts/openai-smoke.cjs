#!/usr/bin/env node
/**
 * Live smoke test: one tiny call per OpenAI endpoint we depend on, through netlify/functions/_responses.js.
 * Needs OPENAI_API_KEY. Usage:  OPENAI_API_KEY=sk-... node scripts/openai-smoke.cjs [--images] [--batch]
 *   --images  also runs the image_generation tool (costs a little)
 *   --batch   also creates + immediately cancels a Batch API job
 *   --tasks   instead of the endpoint checks: run EVERY ai-task (netlify/functions/_tasks) in SSE mode through ai-task's handler ->
 *             runDual -> streamResponse against the REAL client (needs OPENAI_API_KEY; DB rows come from an in-memory stub), count
 *             delta/partial events and require a final `result`. Prints pass/fail per task id.
 *   --tasks --dry   same plumbing against a FAKE client (no key, no network); proves the script and every task's load/finalize.
 */
const args = new Set(process.argv.slice(2));

if (args.has('--tasks')) {
  runTasks(args.has('--dry')).then((code) => process.exit(code), (e) => { console.error(e); process.exit(1); });
  return;
}

const r = require('../netlify/functions/_responses.js');

const results = [];

async function step(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name} (${Date.now() - t0}ms)${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`✗ ${name}: ${(err && err.message) || err}`);
  }
}

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    process.exit(2);
  }

  await step('responses.create (fast role)', async () => {
    const x = await r.createResponse({ role: 'fast', input: 'Reply with the single word: pong', maxOutputTokens: 50, store: false });
    if (!/pong/i.test(x.text)) throw new Error(`unexpected text: ${x.text}`);
    return x.text.trim();
  });

  await step('responses.create structured output', async () => {
    const x = await r.createResponse({ role: 'fast', input: 'Return ok=true', schema: { type: 'object', properties: { ok: { type: 'boolean' } } }, maxOutputTokens: 100, store: false });
    if (!x.json || x.json.ok !== true) throw new Error('schema result missing');
  });

  await step('responses.input_tokens.count', async () => `${await r.countInputTokens({ role: 'fast', input: 'hello world' })} tokens`);

  await step('moderations', async () => {
    const m = await r.moderate('Have a great day!');
    if (m.flagged) throw new Error('benign text flagged');
  });

  await step('embeddings', async () => `${(await r.embed(['hello']))[0].length} dims`);

  await step('background response + retrieve + cancel', async () => {
    const x = await r.createResponse({ role: 'fast', input: 'Write a haiku about CRMs', background: true, maxOutputTokens: 200 });
    const got = await r.retrieveResponse(x.id);
    try { await r.cancelResponse(x.id); } catch (_) { /* may already be done */ }
    return `${x.id} -> ${got.status}`;
  });

  await step('conversations create/delete', async () => {
    const c = await r.createConversation({ metadata: { smoke: 'true' } });
    const x = await r.createResponse({ role: 'fast', input: 'Remember the number 7', conversationId: c.id, maxOutputTokens: 50, store: true });
    await r.deleteConversation(c.id);
    return `${c.id}, reply ${x.id}`;
  });

  await step('realtime client_secrets', async () => {
    const s = await r.createRealtimeSecret({ instructions: 'smoke test', expiresAfterSeconds: 60 });
    if (!s.value || !String(s.value).startsWith('ek_')) throw new Error('no ephemeral key returned');
    return `${s.model}, expires ${s.expiresAt}`;
  });

  await step('files upload/delete', async () => {
    const { toFile } = require('openai');
    const f = await r.uploadFile(await toFile(Buffer.from('hello'), 'smoke.txt'), 'user_data');
    await r.deleteFile(f.id);
    return f.id;
  });

  if (args.has('--batch')) {
    await step('batches create + cancel', async () => {
      const b = await r.createBatch('/v1/responses', [{ customId: 'smoke-1', body: r.buildParams({ role: 'fast', input: 'hi', maxOutputTokens: 20, store: false }) }]);
      const c = await r.cancelBatch(b.id);
      return `${b.id} -> ${c.status}`;
    });
  }

  if (args.has('--images')) {
    await step('responses image_generation (background)', async () => {
      const x = await r.createResponse({ role: 'default', input: 'A small blue square on white', tools: [{ type: 'image_generation', quality: 'low', size: '1024x1024' }], background: true });
      return x.id;
    });
  }

  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();

// ---------------------------------------------------------------------------------------------------------------------------
// --tasks mode
// ---------------------------------------------------------------------------------------------------------------------------
async function runTasks(dry) {
  const path = require('path');
  if (!dry && !process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set (use --tasks --dry to run against a fake client)');
    return 2;
  }
  // ai-task is wrapped in @netlify/functions `stream`, which needs the Lambda streaming global; no-op outside Lambda.
  globalThis.awslambda = globalThis.awslambda || { streamifyResponse: (f) => f, HttpResponseStream: { from: (x) => x } };
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'dry-run';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'x';

  const A = '11111111-1111-4111-8111-111111111111';
  const B = '33333333-3333-4333-8333-333333333333';
  const DEAL = '55555555-5555-4555-8555-555555555555';
  const now = Date.now();
  const rows = {
    contacts: [
      { id: A, user_id: 'smoke', name: 'Ada Lovelace', email: 'ada@acme.io', company: 'Acme', title: 'CTO', status: 'lead' },
      { id: B, user_id: 'smoke', name: 'Bob Stone', email: 'bob@acme.io', company: 'Acme', title: 'VP Eng', status: 'lead' },
    ],
    emails: [{ id: 'e1', subject: 'Intro', contact_id: A, user_id: 'smoke', is_inbound: false, created_at: '2026-01-02T10:00:00Z' }],
    contact_timeline: [{ id: 't1', contact_id: A, user_id: 'smoke', activity_type: 'note', description: 'Met at conference', created_at: '2026-01-01T09:00:00Z' }],
    deals: [{ id: DEAL, user_id: 'smoke', contact_id: A, title: 'Acme rollout', stage: 'proposal', value: 40000, created_at: '2026-01-01T00:00:00Z' }],
    calendar_events: [{ id: 'ev1', user_id: 'smoke', title: 'Demo', scheduled_for: new Date(now + 5 * 24 * 3600000).toISOString(), duration_minutes: 30, status: 'confirmed', contact_id: A }],
  };
  const fakeSupabase = () => ({
    from: (table) => {
      let data = [...(rows[table] || [])];
      const q = {
        select: () => q, order: () => q, limit: () => q, is: () => q,
        eq: (k, v) => { data = data.filter((x) => x[k] === v); return q; },
        gte: (k, v) => { data = data.filter((x) => String(x[k]) >= String(v)); return q; },
        lte: (k, v) => { data = data.filter((x) => String(x[k]) <= String(v)); return q; },
        maybeSingle: async () => ({ data: data[0] || null, error: null }),
        then: (res) => res({ data, error: null }),
      };
      return q;
    },
  });
  const sc = path.resolve(__dirname, '../netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: fakeSupabase(), getUserClient: () => fakeSupabase() } };

  const { tasks } = require('../netlify/functions/_tasks');
  const { createHandler } = require('../netlify/functions/ai-task.js');

  // Minimal params per task id. A task with no entry here FAILS, so new tasks must be added to this table.
  const msgs = [
    { content: 'Hi, what does the pro plan cost?', timestamp: '2026-01-01T10:00:00Z', sender: 'lead' },
    { content: 'It is $49 per month.', timestamp: '2026-01-01T10:30:00Z', sender: 'rep' },
  ];
  const PARAMS = {
    'smart-score': { contactId: A },
    'smart-qualify': { contactIds: [A, B] },
    'smart-categorize': { contactIds: [A, B] },
    'smart-bulk': { contactIds: [A, B], operation: 'score' },
    'ai-reasoning': { data: { id: A, name: 'Ada Lovelace' }, reasoningType: 'next_action' },
    'instant-response': { message: 'What does it cost?', contactId: A },
    'contact-card-ai': { contactId: A, cardType: 'sales' },
    'contact-detail-ai': { contactId: A, detailType: 'professional' },
    'conversation-analysis': { conversationData: { messages: msgs, participants: ['lead', 'rep'] }, analysisType: 'comprehensive' },
    'personalized-messages': { contactId: A },
    'predictive-analytics': { data: { revenue: [{ value: 1 }, { value: 2 }, { value: 3 }] }, predictionType: 'sales', timeFrame: '30days' },
    'meeting-optimizer': { meetingData: { participants: [{ id: 'p1', name: 'Ada', role: 'decision-maker' }, { id: 'p2', name: 'Bob' }], duration: 30, timeZone: 'UTC', objectives: ['Agree scope'], topic: 'Kickoff' }, optimizationType: 'comprehensive' },
    'relationship-insights': { contactId: A, insightType: 'comprehensive' },
    'deal-analysis': { dealId: DEAL, analysisType: 'comprehensive' },
    'feature-analysis': { productUrl: 'https://example.com', competitorResearch: false, marketAnalysis: false },
    'timeline-generator': { contactId: A, entityType: 'contact', options: {} },
    'automation-ai': { trigger: 'contact_created', data: { id: A, email: 'ada@acme.io' }, rules: { sendWelcomeEmail: true } },
  };

  /** Smallest value that satisfies a (strict) JSON schema; used as the fake model's answer in --dry. */
  function sample(sc, key) {
    if (!sc || typeof sc !== 'object') return null;
    if (sc.const !== undefined) return sc.const;
    if (Array.isArray(sc.enum)) return sc.enum[0];
    if (Array.isArray(sc.anyOf)) return sample(sc.anyOf.find((x) => x.type !== 'null') || sc.anyOf[0], key);
    const type = Array.isArray(sc.type) ? sc.type.find((t) => t !== 'null') || 'null' : sc.type;
    switch (type) {
      case 'object': {
        const out = {};
        for (const [k, v] of Object.entries(sc.properties || {})) out[k] = sample(v, k);
        return out;
      }
      case 'array': return [sample(sc.items, key)];
      case 'string': return 'sample';
      case 'integer': return Math.max(1, Math.ceil(sc.minimum || 0));
      case 'number': return Math.max(1, sc.minimum || 0);
      case 'boolean': return true;
      default: return null;
    }
  }

  const fakeClient = (task) => {
    const text = JSON.stringify(sample(task.schema));
    return {
      createResponse: async () => ({ text, usage: { input_tokens: 10, output_tokens: 5 } }),
      streamResponse: async function* () {
        yield { type: 'status', phase: 'started', label: 'Thinking…' };
        for (let i = 0; i < text.length; i += 25) yield { type: 'delta', text: text.slice(i, i + 25) };
        yield { type: 'partial', json: {} };
        yield { type: 'done', id: 'resp_smoke', text, usage: { input_tokens: 10, output_tokens: 5 } };
      },
    };
  };

  const user = { id: 'smoke' };
  const ids = Object.keys(tasks);
  console.log(`${dry ? 'DRY (fake client)' : 'LIVE (OpenAI)'}: ${ids.length} tasks in netlify/functions/_tasks\n`);
  let failed = 0;
  for (const id of ids) {
    const t0 = Date.now();
    try {
      const params = PARAMS[id];
      if (!params) throw new Error('no smoke params in scripts/openai-smoke.cjs PARAMS table');
      const handle = createHandler({
        responses: dry ? fakeClient(tasks[id]) : undefined,
        underRateLimit: async () => true,
        withinTokenBudget: async () => ({ ok: true }),
        logUsage: async () => {},
        checkOutbound: async () => ({ ok: true }),
      });
      const res = await handle({ body: JSON.stringify({ task: id, params, stream: true }), headers: { accept: 'text/event-stream' } }, user);
      if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}: ${typeof res.body === 'string' ? res.body.slice(0, 200) : ''}`);
      let wire = '';
      for await (const c of res.body) wire += c.toString();
      const events = [];
      for (const line of wire.split('\n')) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try { events.push(JSON.parse(line.slice(6))); } catch { /* ignore partial line */ }
      }
      const count = (type) => events.filter((e) => e.type === type).length;
      const err = events.find((e) => e.type === 'error');
      if (err) throw new Error(`error event: ${err.message}`);
      const result = events.find((e) => e.type === 'result');
      if (!result) throw new Error('no final `result` event');
      if (!result.data || result.data.success !== true || result.data.task !== id) throw new Error('result event is not the task envelope');
      const live = count('delta') + count('partial');
      if (live < 1) throw new Error('no delta/partial events streamed');
      console.log(`PASS ${id} (${Date.now() - t0}ms) delta=${count('delta')} partial=${count('partial')} status=${count('status')} result=1`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${id}: ${(e && e.message) || e}`);
    }
  }
  console.log(`\n${ids.length - failed}/${ids.length} tasks passed`);
  return failed ? 1 : 0;
}
