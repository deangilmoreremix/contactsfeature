// @vitest-environment node
/**
 * Communication optimization: the real Netlify function (netlify/functions/communication-optimization.js) run through its handler.
 * The real ./_auth, ./_ownership, ./_stream/dual and shaping logic execute; only ./_supabaseClient (in-memory fake)
 * and the OpenAI helpers (`createResponse`) are stubbed, following tests/function-auth.test.ts.
 * Auth / foreign-contact (404) behaviour is covered in tests/function-auth.test.ts.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
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
const fnDir = path.resolve(__dirname, '../../netlify/functions');

const OWN = '11111111-1111-4111-8111-111111111111';

const inserted: Record<string, any[]> = {};

/** Minimal supabase fake: the caller owns contact OWN; inserts are recorded per table. */
function fakeSupabase() {
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    const rows = () => (table === 'contacts' ? [{ id: OWN, user_id: 'u1' }] : []).filter((r: any) => filters.every(([k, v]) => r[k] === v));
    const q: any = {
      select: () => q,
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
      insert: (row: any) => { (inserted[table] ||= []).push(row); return q; },
      maybeSingle: async () => ({ data: rows()[0] || null, error: null }),
      then: (res: any, rej: any) => Promise.resolve({ data: rows(), error: null }).then(res, rej),
    };
    return q;
  };
  return { from };
}

const createResponse = vi.fn();
const streamResponse = vi.fn();

beforeAll(() => {
  process.env['OPENAI_API_KEY'] = 'test';
  process.env['SUPABASE_URL'] = 'http://localhost:54321';
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'x';
  const sc = path.join(fnDir, '_supabaseClient.js');
  require.cache[sc] = {
    id: sc, filename: sc, loaded: true,
    exports: {
      supabase: fakeSupabase(),
      getUserClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) }, ...fakeSupabase() }),
    },
  } as any;
  // Patch the OpenAI helpers BEFORE the handler (and _stream/dual) is first required.
  const responses = require(path.join(fnDir, '_responses.js'));
  responses.createResponse = createResponse;
  responses.streamResponse = streamResponse;
});

beforeEach(() => {
  for (const k of Object.keys(inserted)) delete inserted[k];
  createResponse.mockReset();
  streamResponse.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const handler = () => require(path.join(fnDir, 'communication-optimization.js')).handler;
const post = (body: unknown, method = 'POST') => ({ httpMethod: method, headers: { authorization: 'Bearer good' }, body: JSON.stringify(body) });
/** The model's reply (the structured-output JSON text). */
const modelReplies = (reply: unknown) => createResponse.mockResolvedValue({ text: typeof reply === 'string' ? reply : JSON.stringify(reply), usage: null, citations: [] });

const contact = { id: OWN, name: 'John Doe', title: 'CTO', company: 'Tech Corp' };
const fullReply = {
  optimalTiming: { bestDay: 'Wednesday', bestTime: '09:30', timezone: 'America/New_York' },
  communicationStyle: { tone: 'direct', frequency: 'biweekly', approach: 'data-driven' },
  channelPreferences: { primary: 'phone', secondary: 'email', avoid: ['sms'] },
  engagementPatterns: { peakHours: ['9-10'], responseTime: '4h', preferences: ['short emails'] },
  recommendations: ['Call before noon', 'Send a one-page summary'],
  nextSteps: ['Book a call', 'Send case study', 'Quarterly review'],
};

describe('communication-optimization function', () => {
  it('returns the model analysis with the optimization type, and stores the strategy', async () => {
    modelReplies(fullReply);

    const res = await handler()(post({ contact, optimizationType: 'timing', aiProvider: 'openai' }));

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload).toMatchObject({ success: true, provider: 'openai' });
    expect(payload.data).toMatchObject({ ...fullReply, optimizationType: 'timing' });
    expect(typeof payload.data.analyzed).toBe('string');

    expect(inserted['communication_optimizations']).toEqual([
      expect.objectContaining({
        contact_id: OWN,
        optimization_type: 'timing',
        optimal_timing: fullReply.optimalTiming,
        communication_style: fullReply.communicationStyle,
        channel_preferences: fullReply.channelPreferences,
        recommendations: fullReply.recommendations,
        ai_provider: 'openai',
      }),
    ]);
  });

  it('asks the model for structured output with the contact, timeframe and interaction history in the prompt', async () => {
    modelReplies(fullReply);
    const interactionHistory = [{ type: 'email', date: '2025-01-02', outcome: 'replied' }];

    await handler()(post({ contact, interactionHistory, timeframe: '90d' }));

    const opts = createResponse.mock.calls[0]![0];
    expect(opts).toMatchObject({ model: 'default', effort: 'low', schemaName: 'communication_optimization', store: false });
    expect(opts.schema.required).toEqual(['optimalTiming', 'communicationStyle', 'channelPreferences', 'engagementPatterns', 'recommendations', 'nextSteps']);
    expect(opts.input).toContain('John Doe (CTO at Tech Corp)');
    expect(opts.input).toContain('Timeframe: 90d');
    expect(opts.input).toContain(JSON.stringify(interactionHistory));
  });

  it('defaults to a 30-day timeframe, no history and a comprehensive optimization', async () => {
    modelReplies(fullReply);

    const res = await handler()(post({ contact }));

    const opts = createResponse.mock.calls[0]![0];
    expect(opts.input).toContain('Timeframe: 30d');
    expect(opts.input).toContain('Interaction History: []');
    expect(JSON.parse(res.body).data.optimizationType).toBe('comprehensive');
    expect(inserted['communication_optimizations']![0]).toMatchObject({ optimization_type: 'comprehensive' });
  });

  it('fills in sensible defaults for anything the model left out', async () => {
    modelReplies({});

    const res = await handler()(post({ contact }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toMatchObject({
      optimalTiming: { bestDay: 'Tuesday', bestTime: '10:00', timezone: 'UTC' },
      communicationStyle: { tone: 'professional', frequency: 'weekly', approach: 'consultative' },
      channelPreferences: { primary: 'email', secondary: 'phone', avoid: [] },
      engagementPatterns: { peakHours: ['9-11', '14-16'], responseTime: '24h', preferences: [] },
      recommendations: [],
      nextSteps: [],
    });
    expect(inserted['communication_optimizations']![0]).toMatchObject({
      optimal_timing: { bestDay: 'Tuesday', bestTime: '10:00', timezone: 'UTC' },
      recommendations: [],
    });
  });

  it('keeps what the model returned and only defaults the missing parts', async () => {
    modelReplies({ optimalTiming: fullReply.optimalTiming, recommendations: ['Only this'] });

    const res = await handler()(post({ contact }));

    expect(JSON.parse(res.body).data).toMatchObject({
      optimalTiming: fullReply.optimalTiming,
      recommendations: ['Only this'],
      communicationStyle: { tone: 'professional', frequency: 'weekly', approach: 'consultative' },
    });
  });

  it('answers 500 and stores nothing when the model reply is not valid JSON', async () => {
    modelReplies('definitely not json');

    const res = await handler()(post({ contact }));

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toMatchObject({ success: false, error: 'Communication optimization failed' });
    expect(inserted['communication_optimizations']).toBeUndefined();
  });

  it('answers 500 when the model call fails', async () => {
    createResponse.mockRejectedValue(new Error('upstream down'));

    const res = await handler()(post({ contact }));

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toMatchObject({ success: false, details: 'upstream down' });
    expect(inserted['communication_optimizations']).toBeUndefined();
  });

  it('rejects non-POST requests with 405 without calling the model', async () => {
    const res = await handler()(post({ contact }, 'GET'));

    expect(res.statusCode).toBe(405);
    expect(createResponse).not.toHaveBeenCalled();
  });
});
