import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('supabase/functions/_shared/openai.ts model map', () => {
  const root = resolve(__dirname, '..');
  const models = JSON.parse(readFileSync(resolve(root, 'src/config/models.json'), 'utf8'));
  const source = readFileSync(resolve(root, 'supabase/functions/_shared/openai.ts'), 'utf8');

  const block = source.match(/MODEL_ROLES[^=]*=\s*\{([\s\S]*?)\n\};/);

  it('declares a MODEL_ROLES map', () => {
    expect(block).not.toBeNull();
  });

  it('matches role -> model/effort in src/config/models.json', () => {
    const entries = [...(block?.[1] ?? '').matchAll(/(\w+):\s*\{\s*model:\s*"([^"]+)",\s*effort:\s*"([^"]+)"\s*\}/g)];
    const map = Object.fromEntries(entries.map((m) => [m[1], { model: m[2], effort: m[3] }]));
    expect(Object.keys(map).sort()).toEqual(Object.keys(models.text).sort());
    for (const role of Object.keys(models.text)) {
      expect(map[role]).toEqual(models.text[role]);
    }
  });

  it('uses the Responses API only', () => {
    expect(source).toContain('/v1/responses');
    expect(source).not.toMatch(/chat\/completions|max_tokens/);
  });
});

// ---------------------------------------------------------------- streaming parity (Deno mapper vs Node mapper)
const nodeRequire = createRequire(import.meta.url);
const nodeResp = nodeRequire('../netlify/functions/_responses.js');
const nodePartial = nodeRequire('../netlify/functions/_stream/partialJson.js');

const DOC = JSON.stringify({ subject: 'Hi "there"', body: 'Line one\nLine two \u00e9', tags: ['a', 'b'], score: -12.5e1, ok: true, none: null, nested: { k: 'v' } });
const chunks = DOC.match(/[\s\S]{1,7}/g) as string[];
const base = (seq: number) => ({ sequence_number: seq });
const FIXTURE: any[] = [
  { type: 'response.created', ...base(0), response: { id: 'resp_1' } },
  { type: 'response.in_progress', ...base(1), response: { id: 'resp_1' } },
  { type: 'response.output_item.added', ...base(2), item: { type: 'reasoning' } },
  { type: 'response.reasoning_summary_text.delta', ...base(3), delta: 'Considering…' },
  { type: 'response.output_item.added', ...base(4), item: { type: 'function_call', name: 'get_contact' } },
  { type: 'response.web_search_call.in_progress', ...base(5) },
  { type: 'response.web_search_call.searching', ...base(6) },
  { type: 'response.web_search_call.completed', ...base(7) },
  { type: 'response.file_search_call.searching', ...base(8) },
  { type: 'response.image_generation_call.generating', ...base(9) },
  { type: 'response.image_generation_call.partial_image', ...base(10), partial_image_index: 1, partial_image_b64: 'AAAA' },
  { type: 'response.output_item.done', ...base(11), output_index: 2, item: { type: 'image_generation_call', result: 'FINALB64' } },
  { type: 'response.output_item.done', ...base(12), output_index: 0, item: { type: 'message' } },
  ...chunks.map((delta, i) => ({ type: 'response.output_text.delta', ...base(20 + i), delta })),
  { type: 'response.unknown.event', ...base(90) },
  {
    type: 'response.completed', ...base(100),
    response: {
      id: 'resp_1', usage: { input_tokens: 3, output_tokens: 9 },
      output: [{ type: 'message', content: [{ type: 'output_text', text: DOC, annotations: [{ type: 'url_citation', url: 'https://a.test', title: 'A' }, { type: 'url_citation', url: 'https://a.test' }] }] }],
    },
  },
];
const INCOMPLETE = { type: 'response.incomplete', sequence_number: 5, response: { id: 'r', incomplete_details: { reason: 'max_output_tokens' }, output_text: '{"a":' } };
const FAILED = { type: 'response.failed', sequence_number: 6, response: { error: { message: 'boom' } } };
const ERR = { type: 'error', message: 'bad' };
const NO_SEQ = { type: 'response.output_text.delta', delta: 'x' };

describe('streaming parity: Deno mapper == Node mapper', () => {
  it('produces identical events for the recorded fixtures (with and without schema / reasoning summaries)', async () => {
    const deno = await import('../supabase/functions/_shared/streaming.ts');
    for (const opts of [{}, { schema: { type: 'object' } }, { schema: { type: 'object' }, reasoningSummary: true }]) {
      for (const events of [FIXTURE, [INCOMPLETE], [FAILED], [ERR], [NO_SEQ]]) {
        const a = nodeResp.createStreamMapper(opts);
        const b = deno.createStreamMapper(opts);
        const outA = events.flatMap((e: any) => a.map(e));
        const outB = events.flatMap((e: any) => b.map(e));
        expect(outB).toEqual(outA);
        expect(b.text).toBe(a.text);
      }
    }
    // sanity: the fixture really exercises every event type
    const m = deno.createStreamMapper({ schema: {}, reasoningSummary: true });
    const types = new Set(FIXTURE.flatMap((e) => m.map(e)).map((e: any) => e.type));
    for (const t of ['status', 'partial', 'delta', 'reasoning', 'image', 'done']) expect(types.has(t)).toBe(true);
  });

  it('tolerant partial JSON matches the Node implementation for every prefix', async () => {
    const deno = await import('../supabase/functions/_shared/streaming.ts');
    for (let i = 0; i <= DOC.length; i++) {
      const prefix = DOC.slice(0, i);
      expect(deno.parsePartialJson(prefix)).toEqual(nodePartial.parsePartialJson(prefix));
      expect(deno.completePartialJson(prefix)).toBe(nodePartial.completePartialJson(prefix));
    }
  });
});

describe('Deno streamResponse / respondDual over a mocked OpenAI SSE', () => {
  const sseBody = (events: unknown[]) => new Response(
    events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join(''),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );
  const setup = (fetchImpl: any) => {
    (globalThis as any).Deno = { env: { get: (k: string) => (k === 'OPENAI_API_KEY' ? 'sk-test' : undefined) } };
    vi.stubGlobal('fetch', fetchImpl);
  };

  it('streams mapped events, sends stream:true and never max_tokens', async () => {
    const f = vi.fn(async () => sseBody(FIXTURE));
    setup(f);
    const { streamResponse } = await import('../supabase/functions/_shared/openai.ts');
    const out: any[] = [];
    for await (const e of streamResponse({ input: 'hi', schema: { type: 'object', properties: { subject: { type: 'string' } } } })) out.push(e);
    const sent = JSON.parse((f.mock.calls[0] as any)[1].body);
    expect(sent.stream).toBe(true);
    expect(sent.max_tokens).toBeUndefined();
    expect(sent.store).toBe(false);
    const nodeOut = (() => { const m = nodeResp.createStreamMapper({ schema: {} }); return FIXTURE.flatMap((e) => m.map(e)); })();
    expect(out.map((e) => e.type)).toEqual(nodeOut.map((e: any) => e.type));
    expect(out[out.length - 1]).toMatchObject({ type: 'done', id: 'resp_1', json: JSON.parse(DOC) });
    vi.unstubAllGlobals();
  });

  it('turns HTTP failures into a terminal error event', async () => {
    setup(vi.fn(async () => new Response('nope', { status: 401 })));
    const { streamResponse } = await import('../supabase/functions/_shared/openai.ts');
    const out: any[] = [];
    for await (const e of streamResponse({ input: 'hi' })) out.push(e);
    expect(out).toEqual([{ type: 'error', message: expect.stringContaining('401') }]);
    vi.unstubAllGlobals();
  });

  it('respondDual: JSON by default, SSE with result before done on Accept / body.stream', async () => {
    const { respondDual } = await import('../supabase/functions/_shared/openai.ts');
    const finalize = (r: any) => ({ subject: r.json?.subject ?? null, n: r.text.length });
    const headers = { 'Access-Control-Allow-Origin': '*' };
    const jsonResp = { id: 'resp_2', output: [{ type: 'message', content: [{ type: 'output_text', text: DOC }] }] };
    setup(vi.fn(async (_u: string, init: any) => (JSON.parse(init.body).stream ? sseBody(FIXTURE) : new Response(JSON.stringify(jsonResp), { status: 200 }))));
    const options = { input: 'x', schema: { type: 'object', properties: { subject: { type: 'string' } } } };

    const plain = await respondDual({ req: new Request('http://x/fn', { method: 'POST' }), options, finalize, headers });
    expect(plain.headers.get('Content-Type')).toBe('application/json');
    expect(await plain.json()).toEqual({ subject: 'Hi "there"', n: DOC.length });

    for (const [req, body] of [
      [new Request('http://x/fn', { method: 'POST', headers: { Accept: 'text/event-stream' } }), {}],
      [new Request('http://x/fn', { method: 'POST' }), { stream: true }],
      [new Request('http://x/fn?stream=true', { method: 'POST' }), {}],
    ] as const) {
      const res = await respondDual({ req, body, options, finalize, headers });
      expect(res.headers.get('Content-Type')).toContain('text/event-stream');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      const wire = await res.text();
      const evs = [...wire.matchAll(/^data: (.*)$/gm)].map((m) => m[1]).filter((d) => d !== '[DONE]').map((d) => JSON.parse(d));
      const types = evs.map((e) => e.type);
      expect(types.indexOf('result')).toBeGreaterThan(-1);
      expect(types.indexOf('result')).toBe(types.indexOf('done') - 1);
      expect(evs.find((e) => e.type === 'result').data).toEqual({ subject: 'Hi "there"', n: DOC.length });
      expect(wire.endsWith('data: [DONE]\n\n')).toBe(true);
    }
    vi.unstubAllGlobals();
  });

  it('respondDual: finalize failure in SSE mode becomes an error event, not a thrown exception', async () => {
    const { respondDual } = await import('../supabase/functions/_shared/openai.ts');
    setup(vi.fn(async () => sseBody(FIXTURE)));
    const res = await respondDual({
      req: new Request('http://x/fn', { method: 'POST', headers: { Accept: 'text/event-stream' } }), options: { input: 'x' },
      finalize: () => { throw new Error('bad result'); }, headers: {},
    });
    const wire = await res.text();
    expect(wire).toContain('"type":"error","message":"bad result"');
    expect(wire).not.toContain('"type":"result"');
    vi.unstubAllGlobals();
  });

  it('respondDualTask: several respond() calls share one stream; status forwarded, result then done; JSON mode unchanged', async () => {
    const { respondDualTask, respond } = await import('../supabase/functions/_shared/openai.ts');
    const jsonResp = { id: 'resp_3', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"a":1}' }] }] };
    setup(vi.fn(async (_u: string, init: any) => (JSON.parse(init.body).stream ? sseBody(FIXTURE) : new Response(JSON.stringify(jsonResp), { status: 200 }))));
    const run = async () => {
      const [x, y] = await Promise.all([respond({ input: 'a' }, { forward: 'status' }), respond({ input: 'b' }, { forward: 'status' })]);
      return { n: [x.text.length, y.text.length] };
    };
    const plain = await respondDualTask({ req: new Request('http://x/fn', { method: 'POST' }), headers: {}, run });
    expect(await plain.json()).toEqual({ n: [7, 7] });

    const res = await respondDualTask({ req: new Request('http://x/fn', { method: 'POST', headers: { Accept: 'text/event-stream' } }), headers: {}, run });
    const wire = await res.text();
    const evs = [...wire.matchAll(/^data: (.*)$/gm)].map((m) => m[1]).filter((d) => d !== '[DONE]').map((d) => JSON.parse(d));
    const types = evs.map((e) => e.type);
    expect(types.filter((t) => t === 'delta' || t === 'partial')).toEqual([]);
    expect(types).toContain('status');
    expect(types.slice(-2)).toEqual(['result', 'done']);
    expect(evs.find((e) => e.type === 'result').data).toEqual({ n: [DOC.length, DOC.length] });

    const bad = await respondDualTask({ req: new Request('http://x/fn', { method: 'POST', headers: { Accept: 'text/event-stream' } }), headers: {}, run: async () => { throw new Error('nope'); } });
    expect(await bad.text()).toContain('"type":"error","message":"nope"');
    vi.unstubAllGlobals();
  });
});
