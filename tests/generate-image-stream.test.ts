// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
(globalThis as any).awslambda ||= { streamifyResponse: (f: unknown) => f, HttpResponseStream: { from: (s: unknown) => s } };
process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';
const { createHandler } = require('../netlify/functions/generate-image-stream.js');
const { streamResponse, createStreamMapper } = require('../netlify/functions/_responses.js');

const sse = (r: any) => (async () => { let w = ''; for await (const c of r.body) w += c.toString(); return w; })();
const call = (h: any, body: unknown) => h({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) }, { id: 'u1' });
const parse = (w: string) => [...w.matchAll(/^data: (.*)$/gm)].map((m) => m[1]).filter((d) => d !== '[DONE]').map((d) => JSON.parse(d));

async function* fakeEvents() {
  yield { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_abc', seq: 1 };
  yield { type: 'image', index: 0, b64: 'P0', partial: true, seq: 2 };
  yield { type: 'image', index: 1, b64: 'P1', partial: true, seq: 3 };
  yield { type: 'image', index: 0, b64: 'FINAL', partial: false, seq: 4 };
  yield { type: 'done', id: 'resp_abc', text: '', usage: null, citations: [], json: null, seq: 5 };
}

describe('generate-image-stream', () => {
  it('forces the image_generation tool with partial_images and streams previews, final image and result', async () => {
    const spy = vi.fn(() => fakeEvents());
    const res = await call(createHandler({ streamResponse: spy }), { prompt: 'a fox', size: '1536x1024', quality: 'high', outputFormat: 'webp', partialImages: 3, variant: 2 });
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('text/event-stream');
    const opts = spy.mock.calls[0][0] as any;
    expect(opts.tools[0]).toMatchObject({ type: 'image_generation', quality: 'high', size: '1536x1024', output_format: 'webp', partial_images: 3 });
    expect(opts.toolChoice).toEqual({ type: 'image_generation' });
    expect(opts.metadata).toMatchObject({ user_id: 'u1', purpose: 'image_generation', variant: '2' });
    const evs = parse(await sse(res));
    expect(evs.map((e) => e.type)).toEqual(['status', 'image', 'image', 'image', 'result', 'done']);
    expect(evs.filter((e) => e.type === 'image').map((e) => e.partial)).toEqual([true, true, false]);
    const result = evs.find((e) => e.type === 'result');
    expect(result.data.image).toEqual({ b64_json: 'FINAL', mime_type: 'image/webp' });
    expect(result.data.responseId).toBe('resp_abc');
  });

  it('reports an error when the stream ends without an image', async () => {
    const res = await call(createHandler({ streamResponse: async function* () { yield { type: 'done', id: 'r', text: '' }; } }), { prompt: 'x' });
    const evs = parse(await sse(res));
    expect(evs[evs.length - 1]).toMatchObject({ type: 'error' });
  });

  it('validates input before streaming', async () => {
    const h = createHandler({ streamResponse: vi.fn() });
    expect((await call(h, {})).statusCode).toBe(400);
    expect((await call(h, { prompt: 'x', size: '1x1' })).statusCode).toBe(400);
    expect((await call(h, { prompt: 'x', partialImages: 9 })).statusCode).toBe(400);
    expect((await call(h, { prompt: 'x', referenceImages: [] })).statusCode).toBe(400);
  });

  it('maps real Responses events (partial + output_item.done) through streamResponse', async () => {
    const client = {
      responses: {
        create: vi.fn(async () => (async function* () {
          yield { type: 'response.created', sequence_number: 0, response: { id: 'resp_z' } };
          yield { type: 'response.image_generation_call.partial_image', sequence_number: 1, partial_image_index: 0, partial_image_b64: 'A' };
          yield { type: 'response.output_item.done', sequence_number: 2, output_index: 0, item: { type: 'image_generation_call', result: 'FULL' } };
          yield { type: 'response.completed', sequence_number: 3, response: { id: 'resp_z', output: [] } };
        })()),
      },
    };
    const out: any[] = [];
    for await (const e of streamResponse({ client, input: 'x', tools: [{ type: 'image_generation' }] })) out.push(e);
    expect(out.filter((e) => e.type === 'image')).toEqual([
      { type: 'image', index: 0, b64: 'A', partial: true, seq: 1 },
      { type: 'image', index: 0, b64: 'FULL', partial: false, seq: 2 },
    ]);
    expect(createStreamMapper).toBeTypeOf('function');
  });
});
