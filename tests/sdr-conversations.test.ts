// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const fnDir = path.resolve(__dirname, '../netlify/functions');
process.env.OPENAI_API_KEY = 'test';
const LEAD = '11111111-1111-4111-8111-111111111111';
const REAL = 'conv_68a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f607';

let tables: Record<string, any[]> = {};
function makeDb() {
  return {
    from: (table: string) => {
      const filters: Array<[string, any]> = [];
      let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
      let patch: any; let ins: any; let inCol: [string, any[]] | null = null; let lt: [string, string] | null = null;
      const rows = () => (tables[table] || []).filter((r) => filters.every(([k, v]) => r[k] === v)
        && (!inCol || inCol[1].includes(r[inCol[0]])) && (!lt || r[lt[0]] < lt[1]));
      const run = () => {
        if (op === 'insert') { (tables[table] ||= []).push({ id: `id${Math.random()}`, ...ins }); return { data: null, error: null }; }
        if (op === 'update') { rows().forEach((r) => Object.assign(r, patch)); return { data: null, error: null }; }
        if (op === 'delete') { const del = new Set(rows()); tables[table] = (tables[table] || []).filter((r) => !del.has(r)); return { data: null, error: null }; }
        return { data: rows().map((r) => ({ ...r })), error: null };
      };
      const q: any = {
        select: () => q, eq: (k: string, v: any) => { filters.push([k, v]); return q; },
        in: (k: string, v: any[]) => { inCol = [k, v]; return q; }, lt: (k: string, v: string) => { lt = [k, v]; return q; },
        insert: (r: any) => { op = 'insert'; ins = r; return q; }, update: (p: any) => { op = 'update'; patch = p; return q; },
        delete: () => { op = 'delete'; return q; },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        then: (res: any) => Promise.resolve(run()).then(res),
      };
      return q;
    },
  };
}
function stub(name: string, exports: any) {
  const id = require.resolve(path.join(fnDir, name));
  require.cache[id] = { id, filename: id, loaded: true, exports } as any;
}
function load() {
  stub('_supabaseClient.js', { supabase: makeDb(), getUserClient: () => ({}) });
  stub('_auth.js', {
    CORS_HEADERS: {},
    errorResponse: (statusCode: number, message: string) => ({ statusCode, headers: {}, body: JSON.stringify({ error: message }) }),
    withAuth: (h: any) => async (e: any) => h(e, { id: 'u1' }),
  });
  for (const n of ['_conversations.js', 'manage-sdr-thread.js', '_aiProxy.js']) delete require.cache[require.resolve(path.join(fnDir, n))];
  return {
    thread: require(path.join(fnDir, 'manage-sdr-thread.js')),
    conv: require(path.join(fnDir, '_conversations.js')),
    proxy: require(path.join(fnDir, '_aiProxy.js')),
  };
}

beforeEach(() => { tables = { contacts: [{ id: LEAD, user_id: 'u1' }, { id: 'other-lead', user_id: 'u2' }], agent_threads: [] }; });

describe('manage-sdr-thread (Conversations API)', () => {
  it('creates a real conversation and stores its id; reuses it on the next call', async () => {
    const { thread } = load();
    const createConversation = vi.fn().mockResolvedValue({ id: REAL });
    const id1 = await thread._internals.getOrCreateThread('u1', LEAD, { createConversation });
    const id2 = await thread._internals.getOrCreateThread('u1', LEAD, { createConversation });
    expect(id1).toBe(REAL);
    expect(id2).toBe(REAL);
    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(createConversation.mock.calls[0][0].metadata).toMatchObject({ user_id: 'u1', lead_id: LEAD });
    expect(tables.agent_threads[0].thread_id).toBe(REAL);
  });

  it('replaces a legacy local conv_<uuid> key with a real conversation', async () => {
    const { thread } = load();
    tables.agent_threads.push({ id: 't1', lead_id: LEAD, agent_type: 'sdr_autopilot', thread_id: 'conv_3f2504e0-4f89-41d3-9a0c-0305e82c3301', updated_at: 'x' });
    const id = await thread._internals.getOrCreateThread('u1', LEAD, { createConversation: async () => ({ id: REAL }) });
    expect(id).toBe(REAL);
    expect(tables.agent_threads).toHaveLength(1);
    expect(tables.agent_threads[0].thread_id).toBe(REAL);
  });

  it('cleanup deletes remote conversations and rows for the caller only; keeps rows whose delete failed', async () => {
    const { thread } = load();
    const old = '2020-01-01T00:00:00.000Z';
    tables.agent_threads = [
      { id: 'a', lead_id: LEAD, agent_type: 'sdr_autopilot', thread_id: REAL, updated_at: old },
      { id: 'b', lead_id: LEAD, agent_type: 'sdr_autopilot', thread_id: 'conv_bad0000000', updated_at: old },
      { id: 'c', lead_id: 'other-lead', agent_type: 'sdr_autopilot', thread_id: 'conv_other00000', updated_at: old },
    ];
    const del = vi.fn(async (id: string) => { if (id === 'conv_bad0000000') throw new Error('x'); return true; });
    const n = await thread._internals.cleanupOldThreads('u1', 30, { deleteConversation: del });
    expect(n).toBe(1);
    expect(del).toHaveBeenCalledWith(REAL);
    expect(tables.agent_threads.map((r) => r.id).sort()).toEqual(['b', 'c']);
  });

  it('handler validates lead ownership and action', async () => {
    const { thread } = load();
    const call = (b: any) => thread.handler({ httpMethod: 'POST', body: JSON.stringify(b) });
    expect((await call({ action: 'getOrCreate', leadId: 'x' })).statusCode).toBe(400);
    expect((await call({ action: 'getOrCreate', leadId: '22222222-2222-4222-8222-222222222222' })).statusCode).toBe(404);
    expect((await call({ action: 'nope' })).statusCode).toBe(400);
  });
});

describe('conversationId plumbing', () => {
  it('ownership helpers only accept the owner\'s thread', async () => {
    const { conv } = load();
    tables.agent_threads.push({ id: 't', lead_id: LEAD, thread_id: REAL });
    tables.agent_threads.push({ id: 't2', lead_id: 'other-lead', thread_id: 'conv_otherthread1' });
    expect(await conv.userOwnsConversation('u1', REAL)).toBe(true);
    expect(await conv.userOwnsConversation('u1', 'conv_otherthread1')).toBe(false);
    expect(await conv.userOwnsConversation('u2', REAL)).toBe(false);
    expect(await conv.userOwnsConversation('u1', 'resp_123')).toBe(false);
    expect(await conv.conversationBelongsToLead(LEAD, REAL)).toBe(true);
    expect(await conv.conversationBelongsToLead('other-lead', REAL)).toBe(false);
  });

  it('buildOptions forwards a valid conversationId, drops previousResponseId, rejects junk', () => {
    const { proxy } = load();
    const ok = proxy.buildOptions({ input: 'hi', conversationId: REAL, previousResponseId: 'resp_1' });
    expect(ok.options).toMatchObject({ conversationId: REAL, previousResponseId: undefined, store: true });
    expect(proxy.buildOptions({ input: 'hi', conversationId: 'resp_1' }).error).toMatch(/conv_/);
    expect(proxy.buildOptions({ input: 'hi' }).options.conversationId).toBeUndefined();
    const { buildParams } = require(path.join(fnDir, '_responses.js'));
    expect(buildParams(ok.options).conversation).toBe(REAL);
  });

  it('SDR run options pass conversationId (else previousResponseId) to the Agents SDK', async () => {
    const factory = require(path.join(fnDir, '_agents/factory.js'));
    expect(factory.buildRunOptions({ conversationId: REAL, previousResponseId: 'resp_1' })).toEqual({ maxTurns: 8, conversationId: REAL });
    expect(factory.buildRunOptions({ previousResponseId: 'resp_1' })).toEqual({ maxTurns: 8, previousResponseId: 'resp_1' });
    const runFn = vi.fn().mockResolvedValue({ finalOutput: { ok: 1 }, lastResponseId: 'resp_9', state: {} });
    const out = await factory.runSdrAgent('linkedin-sdr', { runFn, supabase: null, userId: 'u1', contact: { id: 'c', name: 'Ann' }, conversationId: REAL });
    expect(runFn.mock.calls[0][2]).toEqual({ maxTurns: 8, conversationId: REAL });
    expect(out).toMatchObject({ conversationId: REAL, lastResponseId: 'resp_9' });
  });
});
