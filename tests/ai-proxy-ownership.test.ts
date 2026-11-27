// @vitest-environment node
/**
 * previousResponseId ownership (PR review, P1): the proxy shares one OpenAI key, so a caller must only be able to continue
 * a stored response THEY created through the proxy. Stored responses are stamped with metadata.user_id; anything else is a 404.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

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

const OWN = 'resp_ownedbyu1abcdef';
const FOREIGN = 'resp_ownedbyu2abcdef';
const NOMETA = 'resp_legacynometadata';
const responseOwners: Record<string, any> = { [OWN]: { user_id: 'u1' }, [FOREIGN]: { user_id: 'u2' }, [NOMETA]: {} };

const createResponse = vi.fn();
const retrieveResponse = vi.fn(async (id: string) => {
  if (!(id in responseOwners)) throw new Error('not found');
  return { id, metadata: responseOwners[id] };
});

const fakeFrom = () => {
  const q: any = { select: () => q, eq: () => q, gte: () => q, insert: () => Promise.resolve({ error: null }), then: (res: any) => Promise.resolve({ count: 0, data: [], error: null }).then(res) };
  return q;
};
const userClient = (header: string) => ({
  auth: { getUser: async () => (header === 'Bearer good' ? { data: { user: { id: 'u1' } }, error: null } : { data: { user: null }, error: { message: 'bad' } }) },
  from: fakeFrom,
});

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  const sc = path.resolve('netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: { from: fakeFrom }, getUserClient: (h: string) => userClient(h) } } as any;
  const responses = require('../netlify/functions/_responses.js');
  responses.createResponse = createResponse;
  responses.retrieveResponse = retrieveResponse;
});
beforeEach(() => {
  createResponse.mockReset().mockResolvedValue({ id: 'resp_new0000000000', status: 'completed', text: 'ok', json: null, citations: [], usage: { input_tokens: 1, output_tokens: 1 } });
  retrieveResponse.mockClear();
});

const post = (body: unknown) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer good' }, body: JSON.stringify(body) });

describe('userOwnsResponse', () => {
  it('accepts only responses stamped with the caller', async () => {
    const { userOwnsResponse } = require('../netlify/functions/_aiProxy.js'); // required lazily: stubs are installed in beforeAll
    expect(await userOwnsResponse('u1', OWN)).toBe(true);
    expect(await userOwnsResponse('u1', FOREIGN)).toBe(false);
    expect(await userOwnsResponse('u1', NOMETA)).toBe(false);          // created before ownership stamping: not usable
    expect(await userOwnsResponse('u1', 'resp_doesnotexist123')).toBe(false); // retrieval fails
    expect(await userOwnsResponse('u1', 'not-a-response-id')).toBe(false);
    expect(await userOwnsResponse('u1', undefined as any)).toBe(false);
  });
});

describe('ai-respond previousResponseId', () => {
  const handler = () => require('../netlify/functions/ai-respond.js').handler;

  it('404s on another user\'s response and never calls the model', async () => {
    const res = await handler()(post({ role: 'fast', input: 'continue', previousResponseId: FOREIGN }));
    expect(res.statusCode).toBe(404);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('404s on a malformed id without touching OpenAI', async () => {
    const res = await handler()(post({ role: 'fast', input: 'x', previousResponseId: '../etc/passwd' }));
    expect(res.statusCode).toBe(404);
    expect(retrieveResponse).not.toHaveBeenCalled();
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('continues the caller\'s own response and stamps the new stored response with its owner', async () => {
    const res = await handler()(post({ role: 'fast', input: 'continue', previousResponseId: OWN }));
    expect(res.statusCode).toBe(200);
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(createResponse.mock.calls[0][0]).toMatchObject({ previousResponseId: OWN, user: 'u1', metadata: { user_id: 'u1', purpose: 'ai_respond' } });
  });

  it('does not require ownership data for plain, unstored calls', async () => {
    const res = await handler()(post({ role: 'fast', input: 'hello' }));
    expect(res.statusCode).toBe(200);
    expect(retrieveResponse).not.toHaveBeenCalled();
    expect(createResponse.mock.calls[0][0].metadata).toBeUndefined();
  });
});

describe('ai-stream previousResponseId', () => {
  it('404s on another user\'s response before streaming anything', async () => {
    const res = await require('../netlify/functions/ai-stream.js').handler({
      httpMethod: 'POST', headers: { authorization: 'Bearer good' }, body: JSON.stringify({ role: 'fast', input: 'x', previousResponseId: FOREIGN }),
    });
    expect(res.statusCode).toBe(404);
    expect(String(res.body)).toContain('Previous response not found');
  });
});
