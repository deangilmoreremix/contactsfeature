// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const fnDir = path.resolve(__dirname, '../netlify/functions');
process.env.OPENAI_API_KEY = 'test';
const SECRET_BYTES = crypto.randomBytes(24);
process.env.OPENAI_WEBHOOK_SECRET = `whsec_${SECRET_BYTES.toString('base64')}`;

let jobs: Record<string, any> = {};
let inserts: Array<{ table: string; row: any }> = [];

function makeDb() {
  return {
    from: (table: string) => {
      const filters: Array<[string, any]> = [];
      let patch: any = null;
      let statusIn: string[] | null = null;
      let mode: 'select' | 'update' = 'select';
      const match = () => Object.values(jobs).filter((r: any) => filters.every(([k, v]) => r[k] === v) && (!statusIn || statusIn.includes(r.status)));
      const q: any = {
        select: () => q,
        eq: (k: string, v: any) => { filters.push([k, v]); return q; },
        in: (_k: string, v: string[]) => { statusIn = v; return q; },
        update: (p: any) => { patch = p; mode = 'update'; return q; },
        insert: async (row: any) => { inserts.push({ table, row }); return { error: null }; },
        maybeSingle: async () => ({ data: match()[0] ?? null, error: null }),
        then: (res: any) => {
          const rows = match();
          if (mode === 'update') rows.forEach((r: any) => Object.assign(r, patch));
          return Promise.resolve({ data: rows.map((r: any) => ({ ...r })), error: null }).then(res);
        },
      };
      return q;
    },
  };
}

function sign(body: string, opts: { id?: string; ts?: number; key?: Buffer } = {}) {
  const id = opts.id || 'msg_1';
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', opts.key || SECRET_BYTES).update(`${id}.${ts}.${body}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${sig}` };
}

function stub(name: string, exports: any) {
  const id = require.resolve(path.join(fnDir, name));
  require.cache[id] = { id, filename: id, loaded: true, exports } as any;
}

function load() {
  stub('_supabaseClient.js', { supabase: makeDb(), getUserClient: () => ({}) });
  for (const n of ['_aiJobs.js', 'openai-webhook.js']) delete require.cache[require.resolve(path.join(fnDir, n))];
  return { hook: require(path.join(fnDir, 'openai-webhook.js')), jobsLib: require(path.join(fnDir, '_aiJobs.js')) };
}

const evt = (type: string, id = 'resp_abc') => JSON.stringify({ id: 'evt_1', object: 'event', created_at: 1, type, data: { id } });

describe('openai-webhook', () => {
  beforeEach(() => {
    jobs = { resp_abc: { id: 'j1', user_id: 'u1', kind: 'contact_enrichment', response_id: 'resp_abc', status: 'queued', result: null, error: null } };
    inserts = [];
  });

  it('rejects a bad signature, a missing signature and a stale timestamp with 400', async () => {
    const { hook } = load();
    const body = evt('response.completed');
    expect((await hook.handler({ httpMethod: 'POST', body, headers: sign(body, { key: Buffer.from('wrong') }) })).statusCode).toBe(400);
    expect((await hook.handler({ httpMethod: 'POST', body, headers: {} })).statusCode).toBe(400);
    expect((await hook.handler({ httpMethod: 'POST', body, headers: sign(body, { ts: Math.floor(Date.now() / 1000) - 3600 }) })).statusCode).toBe(400);
    expect((await hook.handler({ httpMethod: 'POST', body: body + ' ', headers: sign(body) })).statusCode).toBe(400); // tampered body
    expect(jobs.resp_abc.status).toBe('queued');
  });

  it('verifies against the raw body, including base64-encoded bodies, and completes the job', async () => {
    const { hook } = load();
    const retrieve = vi.fn().mockResolvedValue({ id: 'resp_abc', status: 'completed', json: { matched: true }, text: '{}', citations: [{ url: 'https://x.io' }], sources: [], metadata: { user_id: 'u1' }, response: { model: 'm' } });
    const body = evt('response.completed');
    const event = { httpMethod: 'POST', body: Buffer.from(body).toString('base64'), isBase64Encoded: true, headers: sign(body) };
    const res = await hook._internals.handleWebhook(event, { retrieve });
    expect(res.statusCode).toBe(200);
    expect(jobs.resp_abc).toMatchObject({ status: 'completed', result: { json: { matched: true }, model: 'm' } });
    expect(jobs.resp_abc.completed_at).toBeTruthy();
  });

  it('is idempotent: a redelivery does not retrieve or rewrite', async () => {
    const { hook } = load();
    const retrieve = vi.fn().mockResolvedValue({ id: 'resp_abc', status: 'completed', json: { a: 1 }, citations: [], sources: [], metadata: {}, response: {} });
    const body = evt('response.completed');
    const event = { httpMethod: 'POST', body, headers: sign(body) };
    await hook._internals.handleWebhook(event, { retrieve });
    const first = JSON.stringify(jobs.resp_abc);
    const again = await hook._internals.handleWebhook(event, { retrieve });
    expect(JSON.parse(again.body)).toMatchObject({ duplicate: true });
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jobs.resp_abc)).toBe(first);
  });

  it('records failed / cancelled / incomplete runs with an error message', async () => {
    const { hook } = load();
    for (const [type, status] of [['response.failed', 'failed'], ['response.cancelled', 'cancelled'], ['response.incomplete', 'incomplete']] as const) {
      jobs.resp_abc.status = 'in_progress'; jobs.resp_abc.error = null;
      const retrieve = vi.fn().mockResolvedValue({ id: 'resp_abc', status, json: null, citations: [], sources: [], error: status === 'failed' ? { message: 'boom' } : null, metadata: {}, response: {} });
      const body = evt(type);
      await hook._internals.handleWebhook({ httpMethod: 'POST', body, headers: sign(body) }, { retrieve });
      expect(jobs.resp_abc.status).toBe(status);
      expect(jobs.resp_abc.error).toBe(status === 'failed' ? 'boom' : `Run ${status}`);
    }
  });

  it('acknowledges unknown responses and unrelated events without touching jobs', async () => {
    const { hook } = load();
    const retrieve = vi.fn();
    const other = evt('response.completed', 'resp_other');
    expect(JSON.parse((await hook._internals.handleWebhook({ httpMethod: 'POST', body: other, headers: sign(other) }, { retrieve })).body).ignored).toBe(true);
    const batch = evt('batch.completed');
    expect((await hook._internals.handleWebhook({ httpMethod: 'POST', body: batch, headers: sign(batch) }, { retrieve })).statusCode).toBe(200);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('returns 500 (so OpenAI retries) when retrieval fails, leaving the job open', async () => {
    const { hook } = load();
    const body = evt('response.completed');
    const res = await hook._internals.handleWebhook({ httpMethod: 'POST', body, headers: sign(body) }, { retrieve: async () => { throw new Error('net'); } });
    expect(res.statusCode).toBe(500);
    expect(jobs.resp_abc.status).toBe('queued');
  });

  it('rejects non-POST', async () => {
    const { hook } = load();
    expect((await hook.handler({ httpMethod: 'GET', headers: {} })).statusCode).toBe(405);
  });
});

describe('ai_jobs completion hooks', () => {
  it('deal_health stores the normalised analysis once and writes deal_health_analyses', async () => {
    const { jobsLib } = load();
    jobs = { resp_d: { id: 'j2', user_id: 'u1', kind: 'deal_health', response_id: 'resp_d', status: 'in_progress', result: { context: { dealId: 'd1', facts: {} } } } };
    inserts = [];
    const run = { status: 'completed', json: { healthScore: 140, riskLevel: 'low', indicators: [], risks: [], recommendations: [], nextActions: [], dataGaps: [] }, citations: [], sources: [], metadata: {}, response: {} };
    const db = makeDb();
    const a = await jobsLib.completeJob(db, jobs.resp_d, run);
    expect(a.changed).toBe(true);
    expect(jobs.resp_d.result.health.healthScore).toBe(100);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ table: 'deal_health_analyses', row: { deal_id: 'd1', user_id: 'u1', health_score: 100 } });
    const b = await jobsLib.completeJob(db, { ...jobs.resp_d, status: 'in_progress' }, run); // stale copy: conditional update loses
    expect(b.changed).toBe(false);
    expect(inserts).toHaveLength(1);
  });

  it('fails a structured kind when the model returned no JSON', async () => {
    const { jobsLib } = load();
    jobs = { resp_f: { id: 'j3', user_id: 'u1', kind: 'sales_forecast', response_id: 'resp_f', status: 'queued', result: { context: { stats: {} } } } };
    await jobsLib.completeJob(makeDb(), jobs.resp_f, { status: 'completed', json: null, text: '', citations: [], sources: [], metadata: {}, response: {} });
    expect(jobs.resp_f).toMatchObject({ status: 'failed', error: 'Model returned no structured result' });
  });
});

describe('status endpoints prefer the ai_jobs row', () => {
  it('contact-enrich status returns the webhook-completed result without calling OpenAI', async () => {
    jobs = { resp_e: { id: 'j9', user_id: 'u1', kind: 'contact_enrichment', response_id: 'resp_e', status: 'completed',
      result: { json: { matched: true, confidence: 90, profile: { jobTitle: 'CTO' }, company: {} }, citations: [], sources: [], metadata: {}, model: 'm' } } };
    stub('_supabaseClient.js', { supabase: makeDb(), getUserClient: () => ({}) });
    stub('_auth.js', { CORS_HEADERS: {}, errorResponse: (s: number, m: string) => ({ statusCode: s, headers: {}, body: JSON.stringify({ error: m }) }), withAuth: (h: any) => async (e: any) => h(e, { id: 'u1' }) });
    const retrieve = vi.fn(async () => { throw new Error('should not poll'); });
    const resp = require(path.join(fnDir, '_responses.js'));
    const orig = resp.retrieveResponse; resp.retrieveResponse = retrieve;
    for (const n of ['_aiJobs.js', 'contact-enrich.js']) delete require.cache[require.resolve(path.join(fnDir, n))];
    try {
      const { handler } = require(path.join(fnDir, 'contact-enrich.js'));
      const res = await handler({ httpMethod: 'POST', body: JSON.stringify({ action: 'status', responseId: 'resp_e', contact: { title: '' } }) });
      const out = JSON.parse(res.body);
      expect(out.status).toBe('completed');
      expect(out.suggestedUpdates.title).toBe('CTO');
      expect(retrieve).not.toHaveBeenCalled();
    } finally { resp.retrieveResponse = orig; }
  });
});
