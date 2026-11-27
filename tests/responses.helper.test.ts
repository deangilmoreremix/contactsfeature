// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const r = require('../netlify/functions/_responses.js');

describe('_responses helper', () => {
  it('maps roles to GPT-6 ids with reasoning effort', () => {
    expect(r.resolveModel('thinking')).toEqual({ model: 'gpt-6-astra', effort: 'high' });
    expect(r.resolveModel('fast')).toEqual({ model: 'gpt-6-luna', effort: 'none' });
    expect(r.resolveModel('gpt-6.1-terra').model).toBe('gpt-6.1-terra');
  });

  it('never sends temperature to reasoning efforts, only to effort none', () => {
    const reasoning = r.buildParams({ role: 'thinking', input: 'hi', temperature: 0.7 });
    expect(reasoning.temperature).toBeUndefined();
    expect(reasoning.reasoning).toEqual({ effort: 'high' });
    const fast = r.buildParams({ role: 'fast', input: 'hi', temperature: 0.7 });
    expect(fast.temperature).toBe(0.7);
  });

  it('uses Responses field names, not chat.completions ones', () => {
    const p = r.buildParams({ role: 'default', instructions: 'sys', input: 'u', maxOutputTokens: 500 });
    expect(p.max_output_tokens).toBe(500);
    expect(p.instructions).toBe('sys');
    expect(p).not.toHaveProperty('max_tokens');
    expect(p).not.toHaveProperty('messages');
  });

  it('builds strict json_schema text.format', () => {
    const p = r.buildParams({
      role: 'default', input: 'x', schemaName: 'score result',
      schema: { type: 'object', properties: { score: { type: 'number' }, tags: { type: 'array', items: { type: 'object', properties: { a: { type: 'string' } } } } } },
    });
    expect(p.text.format.type).toBe('json_schema');
    expect(p.text.format.strict).toBe(true);
    expect(p.text.format.name).toBe('score_result');
    expect(p.text.format.schema.additionalProperties).toBe(false);
    expect(p.text.format.schema.required).toEqual(['score', 'tags']);
    expect(p.text.format.schema.properties.tags.items.additionalProperties).toBe(false);
  });

  it('requests web_search sources automatically', () => {
    const p = r.buildParams({ role: 'thinking', input: 'x', tools: [{ type: 'web_search' }] });
    expect(p.include).toContain('web_search_call.action.sources');
  });

  it('extracts text past reasoning items, plus citations and sources', () => {
    const response = {
      output: [
        { type: 'reasoning', summary: [] },
        { type: 'web_search_call', action: { type: 'search', sources: [{ url: 'https://a.com', title: 'A' }] } },
        { type: 'message', content: [{ type: 'output_text', text: '{"ok":true}', annotations: [{ type: 'url_citation', url: 'https://b.com', title: 'B' }] }] },
      ],
    };
    expect(r.extractText(response)).toBe('{"ok":true}');
    const { citations, sources } = r.extractCitations(response);
    expect(citations).toEqual([{ url: 'https://b.com', title: 'B' }]);
    expect(sources).toEqual([{ url: 'https://a.com', title: 'A' }]);
  });

  it('parses JSON from fenced or prose-wrapped output', () => {
    expect(r.parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(r.parseJson('Here you go: {"a":2} thanks')).toEqual({ a: 2 });
    expect(r.parseJson('nope')).toBeNull();
  });

  it('createResponse returns parsed json and retries on 429', async () => {
    const create = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate'), { status: 429 }))
      .mockResolvedValueOnce({ id: 'resp_1', status: 'completed', output_text: '{"score":80}', output: [], usage: { total_tokens: 5 } });
    const res = await r.createResponse({
      client: { responses: { create } }, role: 'fast', input: 'x',
      schema: { type: 'object', properties: { score: { type: 'number' } } },
      retry: { retries: 2, baseDelayMs: 1 },
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(res.json).toEqual({ score: 80 });
  });

  it('streamResponse yields deltas then done', async () => {
    async function* events() {
      yield { type: 'response.output_text.delta', delta: 'Hel' };
      yield { type: 'response.output_text.delta', delta: 'lo' };
      yield { type: 'response.completed', response: { id: 'r2', output: [], usage: null } };
    }
    const client = { responses: { create: vi.fn().mockResolvedValue(events()) } };
    const out: any[] = [];
    for await (const e of r.streamResponse({ client, role: 'fast', input: 'x' })) out.push(e);
    expect(out.map((e) => e.type)).toEqual(['delta', 'delta', 'done']);
    expect(out[2].text).toBe('Hello');
  });
});
