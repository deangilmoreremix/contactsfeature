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

function fakeClient() {
  return {
    images: {
      generate: vi.fn(async () => ({ data: [{ b64_json: 'AAA' }, { b64_json: 'BBB' }] })),
      edit: vi.fn(async () => ({ data: [{ b64_json: 'EDIT' }] })),
    },
  };
}
const call = (handler: any, body: unknown) =>
  handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }, { id: 'u1' });

describe('generate-image function', () => {
  it('generates base64 images with the default model', async () => {
    const client = fakeClient();
    const res = await call(createHandler({ client }), { prompt: 'a red fox', n: 2, size: '1536x1024', quality: 'high' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.images.map((i: any) => i.b64_json)).toEqual(['AAA', 'BBB']);
    expect(body.images[0].mime_type).toBe('image/png');
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(client.images.generate).toHaveBeenCalledWith(expect.objectContaining({
      model: models.image.default, prompt: 'a red fox', n: 2, size: '1536x1024', quality: 'high',
    }));
  });

  it('uses the fast model when requested', async () => {
    const client = fakeClient();
    await call(createHandler({ client }), { prompt: 'x', fast: true });
    expect(client.images.generate.mock.calls[0][0].model).toBe(models.image.fast);
  });

  it('uses the edit endpoint for reference images', async () => {
    const client = fakeClient();
    const toFile = vi.fn(async (buf: Buffer, name: string) => ({ name, size: buf.length }));
    const res = await call(createHandler({ client, toFile }), { prompt: 'restyle', referenceImages: [PNG] });
    expect(res.statusCode).toBe(200);
    expect(client.images.edit).toHaveBeenCalledOnce();
    expect(client.images.generate).not.toHaveBeenCalled();
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
    expect(client.images.generate).not.toHaveBeenCalled();
  });

  it('returns 502 without leaking upstream details', async () => {
    const client = { images: { generate: vi.fn(async () => { throw Object.assign(new Error('secret key sk-123'), { status: 500 }); }) } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call(createHandler({ client }), { prompt: 'x' });
    expect(res.statusCode).toBe(502);
    expect(res.body).not.toContain('sk-123');
  });
});
