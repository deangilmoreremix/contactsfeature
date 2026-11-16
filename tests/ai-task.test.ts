// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

(globalThis as any).awslambda ||= { streamifyResponse: (f: unknown) => f, HttpResponseStream: { from: (s: unknown) => s } };
const require = createRequire(import.meta.url);

const CONTACT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const rows: Record<string, any[]> = {
  contacts: [{ id: CONTACT_ID, user_id: 'u1', name: 'Ada Lovelace', email: 'ada@acme.io', company: 'Acme', title: 'CTO', status: 'lead' }],
  emails: [{ subject: 'Hi', contact_id: CONTACT_ID, user_id: 'u1' }],
  contact_timeline: [],
};

/** Chainable fake of the supabase query builder that honours .eq() filters. */
function fakeSupabase() {
  const from = (table: string) => {
    let data = [...(rows[table] || [])];
    const q: any = {
      select: () => q, order: () => q, limit: () => q, is: () => q,
      eq: (k: string, v: any) => { data = data.filter((r) => r[k] === v); return q; },
      maybeSingle: async () => ({ data: data[0] || null, error: null }),
      then: (res: any) => res({ data, error: null }),
    };
    return q;
  };
  return { from };
}

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  const sc = path.resolve('netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: fakeSupabase(), getUserClient: () => fakeSupabase() } } as any;
});

const text = JSON.stringify({ score: 82, factors: [{ factor: 'email_quality', score: 90, weight: 0.5, evidence: 'work email' }], reasoning: 'Strong fit.' });
const responses = {
  createResponse: vi.fn().mockResolvedValue({ text, usage: { input_tokens: 10, output_tokens: 5 } }),
  streamResponse: async function* () {
    yield { type: 'status', phase: 'started', label: 'Thinking…' };
    yield { type: 'delta', text: text.slice(0, 20) };
    yield { type: 'partial', json: { score: 82 } };
    yield { type: 'done', id: 'resp_1', text, usage: { input_tokens: 10, output_tokens: 5 } };
  },
};
const deps = () => ({
  responses, underRateLimit: async () => true, withinTokenBudget: async () => ({ ok: true }),
  logUsage: vi.fn().mockResolvedValue(undefined), checkOutbound: vi.fn().mockResolvedValue({ ok: true }),
});
const ev = (body: any, accept = '') => ({ body: JSON.stringify(body), headers: accept ? { accept } : {} });

async function wire(res: any) {
  let out = '';
  for await (const c of res.body) out += c.toString();
  return out;
}

describe('ai-task gateway', () => {
  const user = { id: 'u1' };

  it('JSON mode: runs the task for the caller and keeps the legacy contract', async () => {
    const d = deps();
    const { createHandler } = require('../netlify/functions/ai-task.js');
    const res = await createHandler(d)(ev({ task: 'smart-score', params: { contactId: CONTACT_ID } }), user);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ success: true, task: 'smart-score', data: { score: 82, grade: 'B' } });
    const sent = responses.createResponse.mock.calls[0][0];
    expect(sent.schema).toBeTruthy();
    expect(sent.input).toContain('Ada Lovelace');
    expect(sent.role).toBe('fast');
    expect(d.logUsage).toHaveBeenCalledWith('u1', 'ai-task:smart-score', expect.anything(), { input_tokens: 10, output_tokens: 5 }, 'ok');
  });

  it('stream mode: status/delta/partial then result equal to the JSON payload, then done', async () => {
    const { createHandler } = require('../netlify/functions/ai-task.js');
    const res = await createHandler(deps())(ev({ task: 'smart-score', params: { contactId: CONTACT_ID }, stream: true }, 'text/event-stream'), user);
    expect(res.headers['Content-Type']).toContain('text/event-stream');
    const w = await wire(res);
    expect([...w.matchAll(/"type":"(\w+)"/g)].map((m) => m[1]).slice(0, 5)).toEqual(['status', 'delta', 'partial', 'result', 'done']);
    expect(w).toContain('"grade":"B"');
  });

  it("never loads another user's contact (404) and rejects unknown tasks (400) / bad JSON", async () => {
    const { createHandler } = require('../netlify/functions/ai-task.js');
    const h = createHandler(deps());
    rows.contacts.push({ id: OTHER_ID, user_id: 'someone-else', name: 'Secret' });
    const foreign = await h(ev({ task: 'smart-score', params: { contactId: OTHER_ID } }), user);
    expect(foreign.statusCode).toBe(404);
    expect(JSON.stringify(responses.createResponse.mock.calls)).not.toContain('Secret');
    expect((await h(ev({ task: 'nope' }), user)).statusCode).toBe(400);
    expect((await h({ body: '{', headers: {} }, user)).statusCode).toBe(400);
  });

  it('moderates outbound-copy tasks: flagged -> 422 CONTENT_FLAGGED', async () => {
    const { createHandler } = require('../netlify/functions/ai-task.js');
    const d = deps();
    d.checkOutbound = vi.fn().mockResolvedValue({ ok: false, categories: ['harassment'] });
    const msg = JSON.stringify({ subject: 's', message: 'bad', personalizationNotes: [] });
    const res = await createHandler({ ...d, responses: { ...responses, createResponse: vi.fn().mockResolvedValue({ text: msg }) } })(ev({ task: 'personalized-messages', params: { contactId: CONTACT_ID } }), user);
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body)).toMatchObject({ code: 'CONTENT_FLAGGED', categories: ['harassment'] });
  });

  it('rate limit and token budget short-circuit before any model call', async () => {
    const { createHandler } = require('../netlify/functions/ai-task.js');
    responses.createResponse.mockClear();
    expect((await createHandler({ ...deps(), underRateLimit: async () => false })(ev({ task: 'smart-score', params: { contactId: CONTACT_ID } }), user)).statusCode).toBe(429);
    expect((await createHandler({ ...deps(), withinTokenBudget: async () => ({ ok: false, tokens: 999999 }) })(ev({ task: 'smart-score', params: { contactId: CONTACT_ID } }), user)).statusCode).toBe(413);
    expect(responses.createResponse).not.toHaveBeenCalled();
  });
});
