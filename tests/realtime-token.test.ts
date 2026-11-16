// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  interpretRealtimeEvent, applyTranscriptAction, parseToolArgs, executeRealtimeTool,
  isTokenExpired, reconnectDelay, describeVoiceError, REALTIME_TOOLS,
} from '../src/services/realtimeVoice';

const require = createRequire(import.meta.url);
const fnDir = path.resolve(__dirname, '../netlify/functions');
process.env.OPENAI_API_KEY = 'test';

function stub(name: string, exports: any) {
  const id = require.resolve(path.join(fnDir, name));
  require.cache[id] = { id, filename: id, loaded: true, exports } as any;
}

let rows = 0;
function loadHandler() {
  const q: any = { select: () => q, eq: () => q, gte: () => q, insert: async () => ({ error: null }), then: (r: any) => Promise.resolve({ count: rows, error: null }).then(r) };
  stub('_supabaseClient.js', { supabase: { from: () => q }, getUserClient: () => ({}) });
  stub('_auth.js', {
    CORS_HEADERS: {},
    errorResponse: (statusCode: number, message: string) => ({ statusCode, headers: {}, body: JSON.stringify({ error: message }) }),
    withAuth: (h: any) => async (e: any) => h(e, { id: 'u1' }),
  });
  for (const n of ['_aiProxy.js', 'realtime-token.js']) delete require.cache[require.resolve(path.join(fnDir, n))];
  return require(path.join(fnDir, 'realtime-token.js'));
}

describe('realtime-token validation', () => {
  const { _internals: t } = loadHandler();

  it('defaults role and normalises tools to allow-listed definitions', () => {
    const { value, error } = t.validateTokenRequest({ tools: ['get_contact', 'get_contact', 'add_note'] });
    expect(error).toBeUndefined();
    expect(value.role).toBe('default');
    expect(value.tools.map((x: any) => x.name)).toEqual(['get_contact', 'add_note']);
    expect(value.tools[0].type).toBe('function');
  });

  it('rejects bad role, voice, long instructions and unknown tools', () => {
    expect(t.validateTokenRequest({ role: 'pro' }).error).toMatch(/role/);
    expect(t.validateTokenRequest({ voice: 'robot' }).error).toMatch(/voice/);
    expect(t.validateTokenRequest({ instructions: 'x'.repeat(4001) }).error).toMatch(/4000/);
    expect(t.validateTokenRequest({ tools: ['delete_everything'] }).error).toMatch(/not allowed/);
    expect(t.validateTokenRequest({ tools: [{ type: 'mcp' }] }).error).toMatch(/not allowed/);
    expect(t.validateTokenRequest('x').error).toBeTruthy();
  });

  it('accepts exactly 4000 chars and every allow-listed tool matches the browser list', () => {
    expect(t.validateTokenRequest({ instructions: 'x'.repeat(4000) }).error).toBeUndefined();
    expect([...t.ALLOWED_TOOLS].sort()).toEqual([...REALTIME_TOOLS].sort());
  });

  it('mint returns only value/expiresAt/model and honours the rate limit', async () => {
    const createSecret = vi.fn().mockResolvedValue({ value: 'ek_1', expiresAt: 1900000000, model: 'gpt-realtime-2.1', extra: 'nope' });
    const ok = await t.mint({ id: 'u1' }, { role: 'mini', tools: ['create_task'] }, { createSecret, underLimit: async () => true, logUsage: async () => {} });
    expect(ok.statusCode).toBe(200);
    expect(JSON.parse(ok.body)).toEqual({ value: 'ek_1', expiresAt: 1900000000, model: 'gpt-realtime-2.1' });
    expect(createSecret.mock.calls[0][0]).toMatchObject({ role: 'mini', expiresAfterSeconds: 600 });
    expect(createSecret.mock.calls[0][0].tools[0].name).toBe('create_task');

    const limited = await t.mint({ id: 'u1' }, {}, { createSecret, underLimit: async () => false, logUsage: async () => {} });
    expect(limited.statusCode).toBe(429);
    const bad = await t.mint({ id: 'u1' }, { role: 'x' }, { createSecret });
    expect(bad.statusCode).toBe(400);
  });

  it('maps provider failure to 502 without leaking details', async () => {
    const r = await t.mint({ id: 'u1' }, {}, { createSecret: async () => { throw new Error('sk-secret boom'); }, underLimit: async () => true, logUsage: async () => {} });
    expect(r.statusCode).toBe(502);
    expect(r.body).not.toContain('sk-secret');
  });
});

describe('realtime-token handler (stubbed auth + db)', () => {
  beforeEach(() => { rows = 0; });
  it('rate limits through ai_usage_log and rejects invalid JSON', async () => {
    const { handler } = loadHandler();
    expect((await handler({ httpMethod: 'POST', body: '{' })).statusCode).toBe(400);
    rows = 100;
    expect((await handler({ httpMethod: 'POST', body: '{}' })).statusCode).toBe(429);
  });
});

describe('realtime event interpretation + transcript reducer', () => {
  it('interprets known events and ignores the rest', () => {
    expect(interpretRealtimeEvent({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'i1', transcript: ' hi ' }))
      .toEqual({ kind: 'user_transcript', itemId: 'i1', text: 'hi' });
    expect(interpretRealtimeEvent({ type: 'response.output_item.done', item: { type: 'function_call', call_id: 'c1', name: 'get_contact', arguments: '{"contactId":"x"}' } }))
      .toEqual({ kind: 'function_call', callId: 'c1', name: 'get_contact', args: '{"contactId":"x"}' });
    expect(interpretRealtimeEvent({ type: 'response.output_item.done', item: { type: 'message' } }).kind).toBe('ignore');
    expect(interpretRealtimeEvent({ type: 'error', error: { code: 'x', message: 'bad' } })).toEqual({ kind: 'error', code: 'x', message: 'bad' });
    expect(interpretRealtimeEvent(null).kind).toBe('ignore');
  });

  it('accumulates assistant deltas, finalises on done and dedupes user transcripts', () => {
    const now = () => '2026-01-01T00:00:00Z';
    let h = applyTranscriptAction([], { kind: 'assistant_delta', itemId: 'a', text: 'Hel' }, now);
    h = applyTranscriptAction(h, { kind: 'assistant_delta', itemId: 'a', text: 'lo' }, now);
    expect(h[0]).toMatchObject({ content: 'Hello', partial: true });
    h = applyTranscriptAction(h, { kind: 'assistant_done', itemId: 'a', text: 'Hello there' }, now);
    expect(h[0]).toMatchObject({ content: 'Hello there', partial: false });
    h = applyTranscriptAction(h, { kind: 'user_transcript', itemId: 'u', text: 'ok' }, now);
    const again = applyTranscriptAction(h, { kind: 'user_transcript', itemId: 'u', text: 'ok' }, now);
    expect(again).toHaveLength(2);
  });
});

describe('realtime tool execution', () => {
  const CID = '11111111-1111-4111-8111-111111111111';
  function makeDeps(contactExists = true) {
    const inserted: Record<string, any[]> = {};
    const db = {
      from: (table: string) => {
        const q: any = {
          select: () => q, eq: () => q,
          maybeSingle: async () => ({ data: table === 'contacts' ? (contactExists ? { id: CID, name: 'Ann', email: 'a@x.io', secret_col: 'x' } : null) : { id: 'new1' }, error: null }),
          insert: (row: any) => { (inserted[table] ||= []).push(row); return q; },
        };
        return q;
      },
    };
    const post = vi.fn().mockResolvedValue({ event: { id: 'e1', scheduled_for: '2026-12-01T10:00:00.000Z' }, notified: false, reason: 'no provider' });
    return { deps: { userId: 'u1', db, post }, inserted, post };
  }

  it('get_contact returns only whitelisted fields; unknown contact errors', async () => {
    const { deps } = makeDeps();
    const r: any = await executeRealtimeTool('get_contact', { contactId: CID }, deps);
    expect(r).toEqual({ id: CID, name: 'Ann', email: 'a@x.io' });
    await expect(executeRealtimeTool('get_contact', { contactId: CID }, makeDeps(false).deps)).rejects.toThrow('Contact not found');
    await expect(executeRealtimeTool('get_contact', { contactId: 'nope' }, deps)).rejects.toThrow('valid contact id');
  });

  it('add_note / create_task insert scoped rows and validate input', async () => {
    const { deps, inserted } = makeDeps();
    await executeRealtimeTool('add_note', { contactId: CID, content: 'called' }, deps);
    expect(inserted.notes[0]).toMatchObject({ contact_id: CID, content: 'called', created_by: 'u1' });
    await executeRealtimeTool('create_task', { contactId: CID, title: 'Follow up', priority: 'bogus', dueDate: '2026-12-01' }, deps);
    expect(inserted.tasks[0]).toMatchObject({ title: 'Follow up', priority: 'medium', status: 'open' });
    await expect(executeRealtimeTool('create_task', { contactId: CID, title: 'x', dueDate: 'zzz' }, deps)).rejects.toThrow('dueDate');
    await expect(executeRealtimeTool('add_note', { contactId: CID, content: ' ' }, deps)).rejects.toThrow('content');
  });

  it('schedule_meeting goes through our calendar-schedule function and reports notify truthfully', async () => {
    const { deps, post } = makeDeps();
    const r: any = await executeRealtimeTool('schedule_meeting', { contactId: CID, scheduledFor: '2026-12-01T10:00:00Z', durationMinutes: 45 }, deps);
    expect(post).toHaveBeenCalledWith('calendar-schedule', expect.objectContaining({ contactId: CID, durationMinutes: 45 }));
    expect(r).toMatchObject({ ok: true, eventId: 'e1', contactNotified: false, notifyNote: 'no provider' });
  });

  it('rejects tools outside the allow-list', async () => {
    await expect(executeRealtimeTool('delete_contact', {}, makeDeps().deps)).rejects.toThrow('Tool not available');
  });
});

describe('connection policy helpers', () => {
  it('parses tool args defensively', () => {
    expect(parseToolArgs('{"a":1}')).toEqual({ a: 1 });
    expect(parseToolArgs('nope')).toEqual({});
    expect(parseToolArgs('[1]')).toEqual({});
  });
  it('detects expiry with skew and backs off', () => {
    expect(isTokenExpired(1000, 995_000)).toBe(true);
    expect(isTokenExpired(1000, 500_000)).toBe(false);
    expect(isTokenExpired(null)).toBe(false);
    expect([0, 1, 2, 10].map(reconnectDelay)).toEqual([1000, 2000, 4000, 15000]);
  });
  it('explains microphone errors', () => {
    expect(describeVoiceError({ name: 'NotAllowedError' })).toMatch(/denied/);
    expect(describeVoiceError({ name: 'NotFoundError' })).toMatch(/No microphone/);
  });
});
