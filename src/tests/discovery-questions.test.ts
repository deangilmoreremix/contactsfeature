// @vitest-environment node
/**
 * Discovery questions: the real Netlify function (netlify/functions/discovery-questions.js) run through its handler.
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

const handler = () => require(path.join(fnDir, 'discovery-questions.js')).handler;
const post = (body: unknown, method = 'POST') => ({ httpMethod: method, headers: { authorization: 'Bearer good' }, body: JSON.stringify(body) });
/** The model's reply (the structured-output JSON text). */
const modelReplies = (reply: unknown) => createResponse.mockResolvedValue({ text: typeof reply === 'string' ? reply : JSON.stringify(reply), usage: null, citations: [] });

const contact = { id: OWN, name: 'John Doe', title: 'CTO', company: 'Tech Corp', industry: 'Technology' };
const questions = [
  { category: 'Current Situation & Pain Points', question: 'How do you track leads today?', rationale: 'Find the manual steps', priority: 'high' },
  { category: 'Budget & Resources', question: 'Is budget allocated for this?', rationale: 'Qualify spend', priority: 'medium' },
];

describe('discovery-questions function', () => {
  it('returns the questions the model produced, with the request context, and stores them', async () => {
    modelReplies({ questions });
    const meetingContext = { type: 'demo', duration: 45, objective: 'Validate the integration needs' };

    const res = await handler()(post({ contact, meetingContext, questionType: 'technical', aiProvider: 'openai' }));

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload).toMatchObject({ success: true, provider: 'openai' });
    expect(payload.data).toMatchObject({ questions, questionType: 'technical', meetingContext });
    expect(typeof payload.data.generated).toBe('string');

    expect(inserted['discovery_questions']).toEqual([
      expect.objectContaining({ contact_id: OWN, question_type: 'technical', questions, meeting_context: meetingContext, ai_provider: 'openai' }),
    ]);
  });

  it('asks the model for structured output with the contact and meeting details in the prompt', async () => {
    modelReplies({ questions });

    await handler()(post({ contact, meetingContext: { type: 'demo', duration: 45, objective: 'Validate the integration needs' }, questionType: 'technical' }));

    expect(createResponse).toHaveBeenCalledTimes(1);
    const opts = createResponse.mock.calls[0]![0];
    expect(opts).toMatchObject({ model: 'default', effort: 'low', schemaName: 'discovery_questions', store: false });
    expect(opts.schema.required).toEqual(['questions']);
    expect(opts.input).toContain('Generate technical discovery questions');
    expect(opts.input).toContain('John Doe (CTO at Tech Corp)');
    expect(opts.input).toContain('Industry: Technology');
    expect(opts.input).toContain('Meeting Type: demo');
    expect(opts.input).toContain('Duration: 45 minutes');
    expect(opts.input).toContain('Objective: Validate the integration needs');
  });

  it('falls back to a 30-minute discovery meeting, a comprehensive question set and openai when nothing is specified', async () => {
    modelReplies({ questions });

    const res = await handler()(post({ contact: { id: OWN, name: 'John Doe', title: 'CTO', company: 'Tech Corp' } }));

    const opts = createResponse.mock.calls[0]![0];
    expect(opts.input).toContain('Generate comprehensive discovery questions');
    expect(opts.input).toContain('Industry: Not specified');
    expect(opts.input).toContain('Meeting Type: discovery');
    expect(opts.input).toContain('Duration: 30 minutes');
    expect(opts.input).toContain('Objective: Understand needs and qualify opportunity');
    expect(JSON.parse(res.body)).toMatchObject({ provider: 'openai', data: { questionType: 'comprehensive' } });
    expect(inserted['discovery_questions']![0]).toMatchObject({ question_type: 'comprehensive', ai_provider: 'openai' });
  });

  it('returns an empty list when the model reply has no questions', async () => {
    modelReplies({});

    const res = await handler()(post({ contact }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.questions).toEqual([]);
  });

  it('answers 500 and stores nothing when the model reply is not valid JSON', async () => {
    modelReplies('not json at all');

    const res = await handler()(post({ contact }));

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toMatchObject({ success: false, error: 'Discovery questions generation failed' });
    expect(inserted['discovery_questions']).toBeUndefined();
  });

  it('answers 500 when the model call fails', async () => {
    createResponse.mockRejectedValue(new Error('upstream down'));

    const res = await handler()(post({ contact }));

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toMatchObject({ success: false, details: 'upstream down' });
    expect(inserted['discovery_questions']).toBeUndefined();
  });

  it('rejects non-POST requests with 405 without calling the model', async () => {
    const res = await handler()(post({ contact }, 'GET'));

    expect(res.statusCode).toBe(405);
    expect(createResponse).not.toHaveBeenCalled();
  });
});
