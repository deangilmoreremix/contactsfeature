// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import { parsePartialJson as parseTs } from '../src/lib/streaming/partialJson';
import { readSse, applyEvent, newOutcome } from '../src/lib/streaming/streamClient';

const require = createRequire(import.meta.url);
process.env.OPENAI_API_KEY = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-test';
const { parsePartialJson: parseJs } = require('../netlify/functions/_stream/partialJson.js');
const { createStreamMapper, streamResponse } = require('../netlify/functions/_responses.js');
const { frame, toSseReadable } = require('../netlify/functions/_stream/sse.js');
const { runDual } = require('../netlify/functions/_stream/dual.js');

const corpus = [
  '{"a":[1,2,{"b":"hel', '{"subject":"Hi","body":"Dear Ad', '{"k":', '{"k":"v","x"', '{"k":tr', '{"n":12.', '[1,2,',
  '{"a":"line\\', '', '{"a":{"b":[{"c":1},{"c"', '{"a":"x\\u00', '{"done":true}', '{"list":["a","b","c', '{"t":"quote \\" inside', '  {"z":1}  ',
];

describe('partial JSON parser', () => {
  it('server and browser copies agree on every case', () => {
    for (const c of corpus) expect(parseTs(c)).toEqual(parseJs(c));
  });
  it('fills objects progressively and never throws', () => {
    expect(parseJs('{"a":[1,2,{"b":"hel')).toEqual({ a: [1, 2, { b: 'hel' }] });
    expect(parseJs('{"k":"v","x"')).toEqual({ k: 'v' });
    expect(parseJs('{"list":["a","b","c')).toEqual({ list: ['a', 'b', 'c'] });
    expect(parseJs('')).toBeUndefined();
    for (let i = 0; i < 40; i++) expect(() => parseJs('{"a":"b\\"c","d":[1,{"e":null}]}'.slice(0, i))).not.toThrow();
  });
  it('every prefix of a document parses to a prefix-consistent value', () => {
    const doc = JSON.stringify({ subject: 'Hello', body: 'Line one\nLine two', tags: ['x', 'y'], n: 3.5, ok: true });
    let last = '';
    for (let i = 1; i <= doc.length; i++) {
      const v = parseJs(doc.slice(0, i));
      if (v && typeof v === 'object' && 'body' in v) {
        expect(doc.includes(JSON.stringify((v as any).body).slice(1, -1))).toBe(true);
        last = (v as any).body;
      }
    }
    expect(last).toBe('Line one\nLine two');
  });
});

describe('Responses stream mapper', () => {
  const run = (events: any[], opts: any = {}) => {
    const m = createStreamMapper(opts);
    return events.flatMap((e) => m.map(e));
  };

  it('text answer: started status, deltas, done with citations', () => {
    const out = run([
      { type: 'response.created', sequence_number: 0, response: { id: 'resp_1' } },
      { type: 'response.output_text.delta', sequence_number: 1, delta: 'Hel' },
      { type: 'response.output_text.delta', sequence_number: 2, delta: 'lo' },
      { type: 'response.completed', sequence_number: 3, response: { id: 'resp_1', usage: { input_tokens: 5, output_tokens: 2 }, output: [{ type: 'message', content: [{ type: 'output_text', text: 'Hello', annotations: [{ type: 'url_citation', url: 'https://a.io', title: 'A' }] }] }] } },
    ]);
    expect(out.map((e: any) => e.type)).toEqual(['status', 'delta', 'delta', 'done']);
    expect(out[0]).toMatchObject({ phase: 'started', id: 'resp_1', seq: 0 });
    expect(out[3]).toMatchObject({ text: 'Hello', id: 'resp_1', citations: [{ url: 'https://a.io' }], seq: 3 });
  });

  it('web search progress becomes readable status lines', () => {
    const out = run([
      { type: 'response.web_search_call.in_progress', sequence_number: 4 },
      { type: 'response.web_search_call.searching', sequence_number: 5 },
      { type: 'response.web_search_call.completed', sequence_number: 6 },
    ]);
    expect(out.map((e: any) => e.label)).toEqual(['Starting web search…', 'Searching the web…', 'Finished searching the web']);
    expect(out[1]).toMatchObject({ tool: 'web_search', phase: 'searching' });
  });

  it('structured output emits growing partial objects only when they change', () => {
    const out = run([
      { type: 'response.output_text.delta', delta: '{"subject":"Hi' },
      { type: 'response.output_text.delta', delta: ' there","body":"Dear' },
      { type: 'response.output_text.delta', delta: '"' },
      { type: 'response.output_text.delta', delta: '}' },
      { type: 'response.completed', response: { id: 'r', output: [] } },
    ], { schema: { type: 'object' } });
    const partials = out.filter((e: any) => e.type === 'partial').map((e: any) => e.json);
    expect(partials[0]).toEqual({ subject: 'Hi' });
    expect(partials[partials.length - 1]).toEqual({ subject: 'Hi there', body: 'Dear' });
    expect(out[out.length - 1]).toMatchObject({ type: 'done', json: { subject: 'Hi there', body: 'Dear' } });
  });

  it('function calls, reasoning summaries (opt-in), image partials, failures', () => {
    expect(run([{ type: 'response.output_item.added', item: { type: 'function_call', name: 'get_contact' } }])[0]).toMatchObject({ tool: 'get_contact', label: 'Running get_contact…' });
    expect(run([{ type: 'response.reasoning_summary_text.delta', delta: 'x' }])).toEqual([]);
    expect(run([{ type: 'response.reasoning_summary_text.delta', delta: 'x' }], { reasoningSummary: true })).toEqual([{ type: 'reasoning', text: 'x' }]);
    expect(run([{ type: 'response.image_generation_call.partial_image', partial_image_index: 1, partial_image_b64: 'AAA' }])[0]).toMatchObject({ type: 'image', index: 1, partial: true });
    expect(run([{ type: 'response.failed', response: { error: { message: 'boom' } } }])[0]).toEqual({ type: 'error', message: 'boom' });
    expect(run([{ type: 'response.incomplete', response: { id: 'r', incomplete_details: { reason: 'max_output_tokens' }, output: [] } }])[0]).toMatchObject({ type: 'done', incomplete: 'max_output_tokens' });
  });
});

describe('streamResponse (fake client)', () => {
  const fakeStream = (events: any[]) => ({ [Symbol.asyncIterator]: async function* () { for (const e of events) yield e; } });

  it('streams a created response and stops at the terminal event', async () => {
    const create = vi.fn().mockResolvedValue(fakeStream([
      { type: 'response.output_text.delta', delta: 'A' },
      { type: 'response.completed', response: { id: 'r', output: [] } },
      { type: 'response.output_text.delta', delta: 'NEVER' },
    ]));
    const got: any[] = [];
    for await (const e of streamResponse({ client: { responses: { create } }, role: 'fast', input: 'hi' })) got.push(e);
    expect(got.map((e) => e.type)).toEqual(['delta', 'done']);
    expect(create.mock.calls[0][0]).toMatchObject({ stream: true });
  });

  it('requests reasoning summaries only when asked, and resumes with starting_after', async () => {
    const create = vi.fn().mockResolvedValue(fakeStream([{ type: 'response.completed', response: { id: 'r', output: [] } }]));
    for await (const _ of streamResponse({ client: { responses: { create } }, role: 'thinking', input: 'x', reasoningSummary: true })) { /* drain */ }
    expect(create.mock.calls[0][0].reasoning).toMatchObject({ summary: 'auto' });

    const retrieve = vi.fn().mockResolvedValue(fakeStream([{ type: 'response.output_text.delta', sequence_number: 11, delta: 'z' }, { type: 'response.completed', sequence_number: 12, response: { id: 'resp_9', output: [] } }]));
    const got: any[] = [];
    for await (const e of streamResponse({ client: { responses: { retrieve } }, resume: { responseId: 'resp_9', startingAfter: 10 } })) got.push(e);
    expect(retrieve).toHaveBeenCalledWith('resp_9', { stream: true, starting_after: 10 });
    expect(got[0]).toMatchObject({ type: 'delta', text: 'z', seq: 11 });
  });

  it('turns a thrown error into an error event', async () => {
    const create = vi.fn().mockRejectedValue(new Error('network down'));
    const got: any[] = [];
    for await (const e of streamResponse({ client: { responses: { create } }, role: 'fast', input: 'x' })) got.push(e);
    expect(got).toEqual([{ type: 'error', message: 'network down' }]);
  });
});

describe('SSE framing + reader', () => {
  it('frames events with ids and the reader reassembles them across chunk boundaries', async () => {
    expect(frame({ type: 'delta', text: 'a', seq: 7 })).toBe('id: 7\ndata: {"type":"delta","text":"a","seq":7}\n\n');
    const readable = toSseReadable((async function* () { yield { type: 'delta', text: 'hi', seq: 1 }; yield { type: 'done', text: 'hi', seq: 2 }; })(), { heartbeatMs: 0 });
    const chunks: Buffer[] = [];
    for await (const c of readable) chunks.push(c as Buffer);
    const wire = Buffer.concat(chunks).toString();
    expect(wire.endsWith('data: [DONE]\n\n')).toBe(true);

    // split the wire at an awkward place and feed it through the browser reader
    const mid = Math.floor(wire.length / 2);
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(enc.encode(': ping\n\n' + wire.slice(0, mid))); c.enqueue(enc.encode(wire.slice(mid))); c.close(); } });
    const o = newOutcome();
    await readSse(body, (data, id) => {
      if (data === '[DONE]') return;
      const ev = JSON.parse(data);
      if (id !== null && ev.seq === undefined) ev.seq = id;
      applyEvent(ev, {}, o);
    });
    expect(o.text).toBe('hi');
    expect(o.done).toMatchObject({ type: 'done' });
    expect(o.lastSeq).toBe(2);
  });

  it('error mid-stream surfaces as an error event and still terminates with [DONE]', async () => {
    const readable = toSseReadable((async function* () { yield { type: 'delta', text: 'a' }; throw new Error('x'); })(), { heartbeatMs: 0 });
    let wire = '';
    for await (const c of readable) wire += c.toString();
    expect(wire).toContain('"type":"error"');
    expect(wire.endsWith('data: [DONE]\n\n')).toBe(true);
  });
});

describe('runDual (JSON vs stream)', () => {
  const deps = {
    createResponse: vi.fn().mockResolvedValue({ text: '{"subject":"S"}' }),
    streamResponse: async function* () {
      yield { type: 'delta', text: '{"subject":"S"}' };
      yield { type: 'done', text: '{"subject":"S"}', id: 'r' };
    },
  };
  const finalize = (text: string) => ({ subject: JSON.parse(text).subject, sent: false });

  it('returns plain JSON by default', async () => {
    const res = await runDual({ event: { headers: {} }, body: {}, options: { input: 'x' }, finalize, deps });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ subject: 'S', sent: false });
  });

  it('streams (result event before done) when asked via Accept, body.stream or ?stream', async () => {
    for (const [event, body] of [[{ headers: { accept: 'text/event-stream' } }, {}], [{ headers: {} }, { stream: true }], [{ headers: {}, queryStringParameters: { stream: 'true' } }, {}]] as any[]) {
      const res = await runDual({ event, body, options: { input: 'x' }, finalize, deps });
      expect(res.headers['Content-Type']).toContain('text/event-stream');
      let wire = '';
      for await (const c of res.body) wire += c.toString();
      const types = [...wire.matchAll(/"type":"(\w+)"/g)].map((m) => m[1]);
      expect(types).toEqual(['delta', 'result', 'done']);
      expect(wire).toContain('"data":{"subject":"S","sent":false}');
    }
  });
});
