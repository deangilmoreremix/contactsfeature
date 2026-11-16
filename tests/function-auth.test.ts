// @vitest-environment node
/**
 * Auth/ownership regression tests for the functions fixed in the auth audit:
 *  adaptive-playbook, communication-optimization, discovery-questions, lead-nurturing, email-analyzer, run-ae-agent,
 *  get-autopilot-status (401 without/with a bad token, 404 for another user's contact, own contact reaches the logic),
 *  process-email-queue + autopilot-batch (caller-scoped), the scheduled functions (not publicly triggerable) and
 *  inbound-email-webhook (fails closed without a valid signature / secret).
 * The real ./_auth runs; only ./_supabaseClient and the OpenAI helpers are faked.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import crypto from 'crypto';
import path from 'path';

// Collecting shim for @netlify/functions stream(): resolves to { ...metadata, body } like a plain Lambda result (JSON mode).
(globalThis as any).awslambda = {
  streamifyResponse: (f: any) => async (event: unknown) => {
    const chunks: string[] = [];
    const rs: any = { meta: null, write: (c: unknown) => { chunks.push(String(c)); return true; }, end: () => {} };
    await f(event, rs, {});
    return { ...rs.meta, body: chunks.join('') };
  },
  HttpResponseStream: { from: (rs: any, meta: unknown) => { rs.meta = meta; return rs; } },
};
const require = createRequire(import.meta.url);

const C_OWN = '11111111-1111-4111-8111-111111111111';
const C_OTHER = '22222222-2222-4222-8222-222222222222';

const rows: Record<string, any[]> = {};
const inserted: Record<string, any[]> = {};
const eqLog: Array<[string, string, unknown]> = [];
function reset() {
  rows.contacts = [
    { id: C_OWN, user_id: 'u1', name: 'Ada Lovelace', email: 'ada@acme.io', company: 'Acme', title: 'CTO', lead_status: 'lead' },
    { id: C_OTHER, user_id: 'u2', name: 'Secret Person', email: 'secret@x.io', company: 'SecretCo', title: 'CEO', lead_status: 'lead' },
  ];
  rows.deals = [];
  rows.agent_memory = [];
  rows.contact_agent_settings = [];
  rows.autopilot_state = [];
  rows.agent_runs = [];
  rows.emails = [];
  for (const k of Object.keys(inserted)) delete inserted[k];
  eqLog.length = 0;
}

/** Chainable fake of the supabase query builder: honours .eq(), records inserts. */
function fakeSupabase() {
  const from = (table: string) => {
    let data = [...(rows[table] || [])];
    const q: any = {
      select: () => q, order: () => q, limit: () => q, is: () => q, not: () => q, or: () => q, lt: () => q, lte: () => q, gte: () => q,
      in: (k: string, v: any[]) => { data = data.filter((r) => v.includes(r[k])); return q; },
      eq: (k: string, v: any) => { eqLog.push([table, k, v]); data = data.filter((r) => r[k] === v); return q; },
      insert: (row: any) => { (inserted[table] ||= []).push(row); return q; },
      update: () => q, upsert: () => q, delete: () => q,
      maybeSingle: async () => ({ data: data[0] || null, error: null }),
      then: (res: any, rej: any) => Promise.resolve({ data, error: null }).then(res, rej),
      catch: () => q,
    };
    return q;
  };
  return { from };
}

const TOKENS: Record<string, { id: string } | null> = { 'Bearer good': { id: 'u1' }, 'Bearer bad': null };
const fakeUserClient = (header: string) => ({
  auth: { getUser: async () => (TOKENS[header] ? { data: { user: TOKENS[header] }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } }) },
  ...fakeSupabase(),
});

const createResponse = vi.fn();
const streamResponse = vi.fn();

const H = (name: string) => require(`../netlify/functions/${name}.js`).handler;
const post = (body: unknown, token: string | null = 'good', extra: Record<string, string> = {}) => ({
  httpMethod: 'POST',
  headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra },
  body: JSON.stringify(body),
});

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  const sc = path.resolve('netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: fakeSupabase(), getUserClient: (h: string) => fakeUserClient(h) } } as any;
  // Patch the OpenAI helpers BEFORE any handler (and _stream/dual) is first required.
  const responses = require('../netlify/functions/_responses.js');
  responses.createResponse = createResponse;
  responses.streamResponse = streamResponse;
});
beforeEach(() => {
  reset();
  createResponse.mockReset().mockResolvedValue({ text: '{}', usage: { input_tokens: 1, output_tokens: 1 }, citations: [] });
  streamResponse.mockReset();
});

const contactBody = (id: string) => ({ id, name: 'Someone', company: 'Co', title: 'VP' });

/** Functions with the same shape: POST { contact: {id,...}, ... } -> JSON payload after one model call. */
const CONTACT_OBJECT_FUNCTIONS: Array<[string, Record<string, unknown>]> = [
  ['adaptive-playbook', {}],
  ['communication-optimization', {}],
  ['discovery-questions', {}],
  ['lead-nurturing', {}],
];

describe.each(CONTACT_OBJECT_FUNCTIONS)('%s', (name, extra) => {
  const body = (id: string) => ({ contact: contactBody(id), ...extra });

  it('401 without a token and with an invalid token (no model call)', async () => {
    expect((await H(name)(post(body(C_OWN), null))).statusCode).toBe(401);
    expect((await H(name)(post(body(C_OWN), 'bad'))).statusCode).toBe(401);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('404 for another user\'s contact: no model call, nothing written', async () => {
    const res = await H(name)(post(body(C_OTHER)));
    expect(res.statusCode).toBe(404);
    expect(createResponse).not.toHaveBeenCalled();
    expect(Object.keys(inserted)).toHaveLength(0);
  });

  it('own contact reaches the handler logic and persists with the service client', async () => {
    const res = await H(name)(post(body(C_OWN)));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(Object.values(inserted).flat()[0]).toMatchObject({ contact_id: C_OWN });
  });

  it('non-UUID contact id is a 404, not a database error', async () => {
    expect((await H(name)(post({ contact: contactBody('not-a-uuid'), ...extra }))).statusCode).toBe(404);
  });
});

describe('email-analyzer', () => {
  const content = { subject: 'Hello', body: 'Body text' };

  it('401 without / with an invalid token', async () => {
    expect((await H('email-analyzer')(post({ content }, null))).statusCode).toBe(401);
    expect((await H('email-analyzer')(post({ content }, 'bad'))).statusCode).toBe(401);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('404 when the recipient is another user\'s contact', async () => {
    const res = await H('email-analyzer')(post({ content, recipient: { id: C_OTHER, name: 'X' } }));
    expect(res.statusCode).toBe(404);
    expect(createResponse).not.toHaveBeenCalled();
    expect(inserted.email_analyses).toBeUndefined();
  });

  it('own recipient: analysed and stored; no recipient: analysed, nothing stored', async () => {
    const own = await H('email-analyzer')(post({ content, recipient: { id: C_OWN, name: 'Ada' } }));
    expect(own.statusCode).toBe(200);
    expect(inserted.email_analyses?.[0]).toMatchObject({ contact_id: C_OWN });
    reset();
    const none = await H('email-analyzer')(post({ content }));
    expect(none.statusCode).toBe(200);
    expect(inserted.email_analyses).toBeUndefined();
  });
});

describe('run-ae-agent', () => {
  it('401 without / with an invalid token (no model call, no DB read)', async () => {
    expect((await H('run-ae-agent')(post({ contactId: C_OWN }, null))).statusCode).toBe(401);
    expect((await H('run-ae-agent')(post({ contactId: C_OWN }, 'bad'))).statusCode).toBe(401);
    expect(createResponse).not.toHaveBeenCalled();
    expect(eqLog).toHaveLength(0);
  });

  it('404 for another user\'s contact: no model call, no run logged, no contact update', async () => {
    const res = await H('run-ae-agent')(post({ contactId: C_OTHER }));
    expect(res.statusCode).toBe(404);
    expect(createResponse).not.toHaveBeenCalled();
    expect(inserted.agent_runs).toBeUndefined();
  });

  it('400 for a malformed contact id', async () => {
    expect((await H('run-ae-agent')(post({ contactId: 'nope' }))).statusCode).toBe(400);
  });

  it('own contact: runs the agent, logs against the caller, scopes the update to the caller', async () => {
    createResponse.mockResolvedValue({ text: 'Plan: follow up Tuesday.', usage: null, citations: [] });
    const res = await H('run-ae-agent')(post({ contactId: C_OWN }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ success: true, contactId: C_OWN });
    expect(inserted.agent_runs?.[0]).toMatchObject({ contact_id: C_OWN, user_id: 'u1', status: 'completed' });
    expect(eqLog).toContainEqual(['contacts', 'user_id', 'u1']);
  });
});

describe('get-autopilot-status', () => {
  it('401 without / with an invalid token', async () => {
    expect((await H('get-autopilot-status')(post({ contactId: C_OWN }, null))).statusCode).toBe(401);
    expect((await H('get-autopilot-status')(post({ contactId: C_OWN }, 'bad'))).statusCode).toBe(401);
    expect(eqLog).toHaveLength(0);
  });

  it('404 for another user\'s contact and never touches the child tables', async () => {
    const res = await H('get-autopilot-status')(post({ contactId: C_OTHER }));
    expect(res.statusCode).toBe(404);
    expect(eqLog.filter(([t]) => t !== 'contacts')).toHaveLength(0);
  });

  it('own contact returns the status payload', async () => {
    const res = await H('get-autopilot-status')(post({ contactId: C_OWN }));
    expect(res.statusCode).toBe(200);
    const out = JSON.parse(res.body);
    expect(out.contact).toMatchObject({ id: C_OWN, name: 'Ada Lovelace' });
    expect(out.settings.status).toBe('inactive');
  });
});

describe('caller-scoped batch triggers', () => {
  it('process-email-queue only reads the caller\'s queue', async () => {
    const res = await H('process-email-queue')(post({}));
    expect(res.statusCode).toBe(200);
    expect(eqLog).toContainEqual(['emails', 'user_id', 'u1']);
    expect((await H('process-email-queue')(post({}, null))).statusCode).toBe(401);
  });

  it('autopilot-batch only reads the caller\'s due states', async () => {
    const res = await H('autopilot-batch')(post({}));
    expect(res.statusCode).toBe(200);
    expect(eqLog).toContainEqual(['autopilot_state', 'user_id', 'u1']);
  });
});

describe('scheduled functions are not publicly triggerable', () => {
  const SCHEDULED = ['sequence-advance-scheduled', 'autopilot-scheduled', 'ai-batch-poll', 'process-email-queue-scheduled'];
  const prev = process.env.CRON_SECRET;
  beforeEach(() => { process.env.CRON_SECRET = 's3cret'; });

  it.each(SCHEDULED)('%s: anonymous / wrong-secret HTTP calls get 401, Netlify scheduler and the secret pass', async (name) => {
    const h = H(name);
    expect((await h({ httpMethod: 'POST', headers: {}, body: '' })).statusCode).toBe(401);
    expect((await h({ httpMethod: 'GET', headers: { 'user-agent': 'curl/8' } })).statusCode).toBe(401);
    expect((await h({ httpMethod: 'POST', headers: { 'x-cron-secret': 'wrong' } })).statusCode).toBe(401);
    expect((await h({ httpMethod: 'POST', headers: { 'user-agent': 'Netlify Clockwork' }, body: '{"next_run":"x"}' })).statusCode).not.toBe(401);
    expect((await h({ httpMethod: 'POST', headers: { authorization: 'Bearer s3cret' } })).statusCode).not.toBe(401);
  });

  it('without CRON_SECRET only the Netlify scheduler is accepted', async () => {
    delete process.env.CRON_SECRET;
    const h = H('sequence-advance-scheduled');
    expect((await h({ httpMethod: 'POST', headers: { 'x-cron-secret': 'anything' } })).statusCode).toBe(401);
    expect((await h({ httpMethod: 'POST', headers: { 'user-agent': 'Netlify Clockwork' } })).statusCode).not.toBe(401);
    if (prev !== undefined) process.env.CRON_SECRET = prev;
  });
});

describe('inbound-email-webhook fails closed', () => {
  const payload = { from: 'nobody@nowhere.io', subject: 'Re: hi', text: 'hello' };
  const raw = JSON.stringify(payload);
  const hmac = (secret: string, data: string) => crypto.createHmac('sha256', secret).update(data).digest('hex');
  const call = (headers: Record<string, string>, body: string = raw, query?: Record<string, string>) =>
    H('inbound-email-webhook')({ httpMethod: 'POST', headers, body, queryStringParameters: query });

  beforeEach(() => { delete process.env.INBOUND_EMAIL_WEBHOOK_SECRET; delete process.env.MAILGUN_WEBHOOK_SECRET; });

  it('503 when no secret is configured (never open by default)', async () => {
    expect((await call({})).statusCode).toBe(503);
  });

  it('401 for missing / wrong proof; nothing is read or written', async () => {
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = 'whsec';
    expect((await call({})).statusCode).toBe(401);
    expect((await call({ 'x-webhook-signature': hmac('other', raw) })).statusCode).toBe(401);
    expect((await call({ 'x-webhook-secret': 'nope' })).statusCode).toBe(401);
    expect((await call({}, raw, { token: 'nope' })).statusCode).toBe(401);
    expect(eqLog).toHaveLength(0);
    expect(Object.keys(inserted)).toHaveLength(0);
  });

  it('accepts a valid HMAC, shared secret, basic-auth password or token and then runs the handler', async () => {
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = 'whsec';
    const basic = 'Basic ' + Buffer.from('user:whsec').toString('base64');
    for (const res of [
      await call({ 'X-Webhook-Signature': `sha256=${hmac('whsec', raw)}` }),
      await call({ 'x-webhook-secret': 'whsec' }),
      await call({ authorization: basic }),
      await call({}, raw, { token: 'whsec' }),
    ]) {
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ processed: false, reason: 'Contact not found' });
    }
  });

  it('verifies the Mailgun signature (and rejects stale / forged ones)', async () => {
    process.env.MAILGUN_WEBHOOK_SECRET = 'mgkey';
    const ts = String(Math.floor(Date.now() / 1000));
    const good = JSON.stringify({ ...payload, signature: { timestamp: ts, token: 'tok', signature: hmac('mgkey', `${ts}tok`) } });
    expect((await call({}, good)).statusCode).toBe(200);
    const forged = JSON.stringify({ ...payload, signature: { timestamp: ts, token: 'tok', signature: hmac('evil', `${ts}tok`) } });
    expect((await call({}, forged)).statusCode).toBe(401);
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const stale = JSON.stringify({ ...payload, signature: { timestamp: old, token: 'tok', signature: hmac('mgkey', `${old}tok`) } });
    expect((await call({}, stale)).statusCode).toBe(401);
  });
});
