// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

(globalThis as any).awslambda ||= { streamifyResponse: (f: unknown) => f, HttpResponseStream: { from: (s: unknown) => s } };
const require = createRequire(import.meta.url);

const MINE = 'conv_mine_abcdef123456';
const THEIRS = 'conv_theirs_abcdef123456';
const CONTACT = '11111111-1111-4111-8111-111111111111';
const OTHER_CONTACT = '22222222-2222-4222-8222-222222222222';
const rows: Record<string, any[]> = {
  contacts: [
    { id: CONTACT, user_id: 'u1', name: 'Ada Lovelace', company: 'Acme' },
    { id: OTHER_CONTACT, user_id: 'someone-else', name: 'Secret Person' },
  ],
};
const owners: Record<string, string> = { [MINE]: 'u1', [THEIRS]: 'someone-else' };

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  const from = (table: string) => {
    let data = [...(rows[table] || [])];
    const q: any = { select: () => q, is: () => q, eq: (k: string, v: any) => { data = data.filter((r) => r[k] === v); return q; }, maybeSingle: async () => ({ data: data[0] || null, error: null }) };
    return q;
  };
  const sc = path.resolve('netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: { from }, getUserClient: () => ({ from }) } } as any;
});

const reply = 'Follow up with Ada on Tuesday.';
const makeDeps = () => ({
  createConversation: vi.fn().mockResolvedValue({ id: 'conv_new_abcdef123456' }),
  ownsConversation: vi.fn(async (uid: string, id: string) => owners[id] === uid),
  responses: {
    createResponse: vi.fn().mockResolvedValue({ text: reply, usage: { input_tokens: 4, output_tokens: 6 } }),
    streamResponse: vi.fn(async function* () {
      yield { type: 'status', phase: 'started', label: 'Thinking…' };
      yield { type: 'delta', text: 'Follow up ' };
      yield { type: 'delta', text: 'with Ada on Tuesday.' };
      yield { type: 'done', id: 'resp_1', text: reply, usage: { input_tokens: 4, output_tokens: 6 } };
    }),
  },
  underRateLimit: async () => true, withinTokenBudget: async () => ({ ok: true }), logUsage: vi.fn().mockResolvedValue(undefined),
});
const ev = (body: any, accept = '') => ({ body: JSON.stringify(body), headers: accept ? { accept } : {} });
async function frames(res: any) {
  let out = '';
  for await (const c of res.body) out += c.toString();
  return out.split('\n').filter((l) => l.startsWith('data: ') && !l.includes('[DONE]')).map((l) => JSON.parse(l.slice(6)));
}

describe('chat (streaming CRM assistant over the Conversations API)', () => {
  const user = { id: 'u1' };
  const handler = (d = makeDeps()) => ({ d, h: require('../netlify/functions/chat.js').createHandler(d) });

  it("action 'start' creates a conversation stamped with the caller as owner", async () => {
    const { d, h } = handler();
    const res = await h(ev({ action: 'start' }), user);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ conversationId: 'conv_new_abcdef123456' });
    expect(d.createConversation).toHaveBeenCalledWith({ metadata: { owner: 'u1', kind: 'chat' } });
  });

  it('stream mode: status and text deltas arrive live, then result (old streaming-chat contract) and done', async () => {
    const { d, h } = handler();
    const res = await h(ev({ message: 'What should I do next?', conversationId: MINE, stream: true }, 'text/event-stream'), user);
    expect(res.headers['Content-Type']).toContain('text/event-stream');
    const f = await frames(res);
    expect(f.map((e) => e.type)).toEqual(['status', 'delta', 'delta', 'result', 'done']);
    expect(f.filter((e) => e.type === 'delta').map((e) => e.text).join('')).toBe(reply);
    expect(f[3].data).toMatchObject({ content: reply, suggestions: [], actions: [], conversationId: MINE, metadata: { responseType: 'text' } });
    const sent = d.responses.streamResponse.mock.calls[0][0];
    expect(sent).toMatchObject({ conversationId: MINE, input: 'What should I do next?', role: 'default', store: true });
    expect(sent.schema).toBeUndefined(); // free text, not JSON
    expect(d.logUsage).toHaveBeenCalledWith('u1', 'chat', expect.anything(), { input_tokens: 4, output_tokens: 6 }, 'ok');
  });

  it('JSON mode returns the same payload', async () => {
    const { h } = handler();
    const res = await h(ev({ message: 'hi', conversationId: MINE }), user);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ content: reply, conversationId: MINE });
  });

  it("a conversation owned by someone else (or unknown) is a 404 and never reaches the model", async () => {
    const { d, h } = handler();
    expect((await h(ev({ message: 'hi', conversationId: THEIRS }), user)).statusCode).toBe(404);
    expect((await h(ev({ message: 'hi', conversationId: 'conv_unknown_abcdef1234' }), user)).statusCode).toBe(404);
    expect(d.responses.createResponse).not.toHaveBeenCalled();
    expect(d.responses.streamResponse).not.toHaveBeenCalled();
  });

  it('validates input: message required, conversationId required and well-formed, contact must be the caller\'s', async () => {
    const { d, h } = handler();
    expect((await h(ev({ conversationId: MINE }), user)).statusCode).toBe(400);
    expect((await h(ev({ message: 'hi' }), user)).statusCode).toBe(400);
    expect((await h(ev({ message: 'hi', conversationId: 'not-a-conversation' }), user)).statusCode).toBe(400);
    expect((await h(ev({ message: 'hi', conversationId: MINE, context: { contactId: OTHER_CONTACT } }), user)).statusCode).toBe(404);
    expect((await h({ body: '{', headers: {} }, user)).statusCode).toBe(400);
    expect(d.responses.createResponse).not.toHaveBeenCalled();
    const ok = await h(ev({ message: 'hi', conversationId: MINE, context: { contactId: CONTACT } }), user);
    expect(ok.statusCode).toBe(200);
    expect(d.responses.createResponse.mock.calls[0][0].instructions).toContain('Ada Lovelace');
  });

  it('rate limit short-circuits before anything else', async () => {
    const { d, h } = handler({ ...makeDeps(), underRateLimit: async () => false });
    expect((await h(ev({ action: 'start' }), user)).statusCode).toBe(429);
    expect(d.createConversation).not.toHaveBeenCalled();
  });
});
