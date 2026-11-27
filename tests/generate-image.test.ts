// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';
const { createHandler } = require('../netlify/functions/generate-image.js');
const models = require('../src/config/models.json');

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

let seq = 0;
function fakeClient() {
  return {
    images: {
      generate: vi.fn(),
      edit: vi.fn(async () => ({ data: [{ b64_json: 'EDIT' }] })),
    },
    responses: {
      create: vi.fn(async () => ({ id: `resp_job${++seq}`, status: 'queued' })),
    },
  };
}
const call = (handler: any, body: unknown) =>
  handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }, { id: 'u1' });

describe('generate-image function', () => {
  it('starts one background image_generation job per variant and returns immediately', async () => {
    const client = fakeClient();
    const res = await call(createHandler({ client }), { prompt: 'a red fox', n: 3, size: '1536x1024', quality: 'high', outputFormat: 'webp' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.jobs).toHaveLength(3);
    expect(body.jobs[0].responseId).toMatch(/^resp_/);
    expect(body.images).toBeUndefined();
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(client.responses.create).toHaveBeenCalledTimes(3);
    const params = client.responses.create.mock.calls[0][0];
    expect(params.background).toBe(true);
    expect(params.store).toBe(true);
    expect(params.input).toBe('a red fox');
    expect(params.metadata.user_id).toBe('u1');
    expect(params.tools).toEqual([{ type: 'image_generation', model: models.image.default, quality: 'high', size: '1536x1024', output_format: 'webp' }]);
    expect(params.tool_choice).toEqual({ type: 'image_generation' });
    expect(params.max_tokens).toBeUndefined();
    expect(client.images.generate).not.toHaveBeenCalled();
  });

  it('uses the fast image model when requested', async () => {
    const client = fakeClient();
    await call(createHandler({ client }), { prompt: 'x', fast: true });
    expect(client.responses.create.mock.calls[0][0].tools[0].model).toBe(models.image.fast);
  });

  it('keeps the variants that started when one start call fails', async () => {
    const client = fakeClient();
    client.responses.create
      .mockResolvedValueOnce({ id: 'resp_ok1', status: 'queued' })
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 401 }));
    const res = await call(createHandler({ client }), { prompt: 'x', n: 2 });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).jobs).toEqual([{ responseId: 'resp_ok1' }]);
  });

  it('uses the edit endpoint for reference images', async () => {
    const client = fakeClient();
    const toFile = vi.fn(async (buf: Buffer, name: string) => ({ name, size: buf.length }));
    const res = await call(createHandler({ client, toFile }), { prompt: 'restyle', referenceImages: [PNG] });
    expect(res.statusCode).toBe(200);
    expect(client.images.edit).toHaveBeenCalledOnce();
    expect(client.images.generate).not.toHaveBeenCalled();
    expect(client.responses.create).not.toHaveBeenCalled();
    expect(JSON.parse(res.body).images[0].b64_json).toBe('EDIT');
  });

  it.each([
    [{}, 'prompt'],
    [{ prompt: 'x'.repeat(4001) }, 'prompt'],
    [{ prompt: 'x', size: '99x99' }, 'size'],
    [{ prompt: 'x', quality: 'ultra' }, 'quality'],
    [{ prompt: 'x', n: 9 }, 'n'],
    [{ prompt: 'x', referenceImages: ['http://evil/x.png'] }, 'referenceImages'],
  ])('rejects invalid input %#', async (body, field) => {
    const client = fakeClient();
    const res = await call(createHandler({ client }), body);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain(field);
    expect(client.responses.create).not.toHaveBeenCalled();
  });

  it('returns 502 without leaking upstream details', async () => {
    const client = { responses: { create: vi.fn(async () => { throw Object.assign(new Error('secret key sk-123'), { status: 500 }); }) } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call(createHandler({ client }), { prompt: 'x' });
    expect(res.statusCode).toBe(502);
    expect(res.body).not.toContain('sk-123');
  });
});
