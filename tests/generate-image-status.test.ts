// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';
const { createHandler, extractImageResults } = require('../netlify/functions/generate-image-status.js');

const meta = (user = 'u1') => ({ user_id: user, purpose: 'image_generation', output_format: 'png' });
const done = (b64: string, user = 'u1') => ({
  id: 'x', status: 'completed', metadata: meta(user),
  output: [{ type: 'reasoning' }, { type: 'image_generation_call', status: 'completed', result: b64 }],
});

function client(map: Record<string, any>) {
  return { responses: { retrieve: vi.fn(async (id: string) => { if (!map[id]) throw Object.assign(new Error('nf'), { status: 404 }); return { id, ...map[id] }; }) } };
}
const call = (c: any, body: unknown, user = 'u1') =>
  createHandler({ client: c })({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }, { id: user });

describe('generate-image-status function', () => {
  it('returns base64 images for completed jobs and states for others', async () => {
    const c = client({
      resp_a: done('AAA'),
      resp_b: { status: 'in_progress', metadata: meta(), output: [] },
      resp_c: { status: 'failed', error: { message: 'content policy' }, metadata: meta(), output: [] },
      resp_d: { status: 'completed', metadata: meta(), output: [{ type: 'message' }] },
    });
    const res = await call(c, { responseIds: ['resp_a', 'resp_b', 'resp_c', 'resp_d'] });
    expect(res.statusCode).toBe(200);
    const { jobs } = JSON.parse(res.body);
    expect(jobs[0]).toEqual({ responseId: 'resp_a', status: 'completed', images: [{ b64_json: 'AAA', mime_type: 'image/png' }] });
    expect(jobs[1]).toEqual({ responseId: 'resp_b', status: 'in_progress' });
    expect(jobs[2]).toMatchObject({ status: 'failed', error: 'content policy' });
    expect(jobs[3]).toMatchObject({ status: 'failed' });
  });

  it("never exposes another user's job", async () => {
    const c = client({ resp_x: done('SECRET', 'other-user') });
    const res = await call(c, { responseIds: ['resp_x'] });
    const body = res.body;
    expect(JSON.parse(body).jobs[0]).toEqual({ responseId: 'resp_x', status: 'failed', error: 'Image job not found' });
    expect(body).not.toContain('SECRET');
  });

  it('refuses responses that were not created by image generation', async () => {
    const c = client({ resp_y: { ...done('Z'), metadata: { user_id: 'u1', purpose: 'contact_enrichment' } } });
    const res = await call(c, { responseIds: ['resp_y'] });
    expect(JSON.parse(res.body).jobs[0].status).toBe('failed');
  });

  it('treats missing ids as not found and transient errors as still running', async () => {
    const c = client({});
    expect(JSON.parse((await call(c, { responseIds: ['resp_zz'] })).body).jobs[0].error).toBe('Image job not found');
    const flaky = { responses: { retrieve: vi.fn(async () => { throw Object.assign(new Error('net'), { status: 500 }); }) } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(JSON.parse((await call(flaky, { responseIds: ['resp_zz'] })).body).jobs[0]).toMatchObject({ status: 'in_progress', transient: true });
  });

  it('defers completed jobs past the payload budget to a later poll', async () => {
    const big = 'A'.repeat(3 * 1024 * 1024);
    const c = client({ resp_1: done(big), resp_2: done(big) });
    const { jobs } = JSON.parse((await call(c, { responseIds: ['resp_1', 'resp_2'] })).body);
    expect(jobs[0].status).toBe('completed');
    expect(jobs[1].status).toBe('in_progress');
  });

  it.each([
    [{}], [{ responseIds: [] }], [{ responseIds: ['nope'] }], [{ responseIds: 'resp_a' }],
    [{ responseIds: ['resp_1', 'resp_2', 'resp_3', 'resp_4', 'resp_5'] }],
  ])('rejects invalid input %#', async (body) => {
    const res = await call(client({}), body);
    expect(res.statusCode).toBe(400);
  });

  it('extractImageResults skips non-image items', () => {
    expect(extractImageResults({ output: [{ type: 'image_generation_call', result: 'Q', output_format: 'webp' }, { type: 'image_generation_call', result: null }] }))
      .toEqual([{ b64: 'Q', format: 'webp' }]);
  });
});
