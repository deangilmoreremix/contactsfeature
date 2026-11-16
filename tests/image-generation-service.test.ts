import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));

import { generateImages, type VariantUpdate } from '../src/services/imageGenerationService';

const enc = new TextEncoder();
const sseResponse = (events: unknown[], status = 200) => {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const e of events) c.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      c.enqueue(enc.encode('data: [DONE]\n\n'));
      c.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } });
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('generateImages (stream first, polling fallback)', () => {
  it('reports live previews per variant, then the final image', async () => {
    const f = vi.fn(async (_url: string, init: RequestInit) => {
      const v = JSON.parse(String(init.body)).variant;
      return sseResponse([
        { type: 'status', phase: 'started', label: 'Thinking…', id: `resp_${v}` },
        { type: 'image', index: 0, b64: `P0v${v}`, partial: true },
        { type: 'image', index: 1, b64: `P1v${v}`, partial: true },
        { type: 'result', data: { image: { b64_json: `FINALv${v}`, mime_type: 'image/png' }, model: 'img' } },
        { type: 'done', id: `resp_${v}`, text: '' },
      ]);
    });
    vi.stubGlobal('fetch', f);
    const updates: VariantUpdate[] = [];
    const r = await generateImages({ prompt: 'fox', n: 2, onVariant: (u) => updates.push(u) });
    expect(f.mock.calls.every((c) => String(c[0]).endsWith('/generate-image-stream'))).toBe(true);
    expect(r.images).toEqual(['data:image/png;base64,FINALv0', 'data:image/png;base64,FINALv1']);
    const v0 = updates.filter((u) => u.index === 0).map((u) => `${u.status}:${u.image?.split(',')[1] ?? ''}`);
    expect(v0.filter((s) => s.startsWith('preview'))).toEqual(['preview:P0v0', 'preview:P1v0']);
    expect(v0[v0.length - 1]).toBe('done:FINALv0');
    expect(r.failed).toBe(0);
  });

  it('falls back to polling the job the stream already started', async () => {
    const f = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/generate-image-stream')) {
        return sseResponse([{ type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_abc' }, { type: 'error', message: 'connection lost' }]);
      }
      if (url.endsWith('/generate-image-status')) {
        expect(JSON.parse(String(init.body))).toEqual({ responseIds: ['resp_abc'] });
        return json({ jobs: [{ responseId: 'resp_abc', status: 'completed', images: [{ b64_json: 'POLLED', mime_type: 'image/png' }] }] });
      }
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal('fetch', f);
    const p = generateImages({ prompt: 'fox', n: 1 });
    await vi.advanceTimersByTimeAsync(3000);
    const r = await p;
    expect(r.images).toEqual(['data:image/png;base64,POLLED']);
    expect(f.mock.calls.some((c) => String(c[0]).endsWith('/generate-image'))).toBe(false); // no duplicate job started
  });

  it('starts a fresh background job when the stream failed before an id was known', async () => {
    const f = vi.fn(async (url: string) => {
      if (url.endsWith('/generate-image-stream')) return json({ error: 'boom' }, 500);
      if (url.endsWith('/generate-image')) return json({ jobs: [{ responseId: 'resp_new' }], model: 'img' });
      return json({ jobs: [{ responseId: 'resp_new', status: 'completed', images: [{ b64_json: 'NEW' }] }] });
    });
    vi.stubGlobal('fetch', f);
    const p = generateImages({ prompt: 'fox', n: 1 });
    await vi.advanceTimersByTimeAsync(3000);
    expect((await p).images).toEqual(['data:image/png;base64,NEW']);
  });
});
