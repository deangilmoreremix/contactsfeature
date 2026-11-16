// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.OPENAI_API_KEY = 'test';
const b = require('../netlify/functions/_batch.js');

const contacts = [
  { id: 'c1', name: 'Ada Lovelace', email: 'ada@acme.io', company: 'Acme' },
  { id: 'c2' }, // nothing to work with
  { id: 'c3', firstname: 'Bob', lastname: 'Stone', title: 'CTO', notes: 'met at expo', tags: ['vip'] },
];

describe('batch request builders', () => {
  it('enrich: Responses bodies with web_search + strict schema; skips contacts without clues', () => {
    const { endpoint, requests, skipped } = b.buildRequests('enrich', contacts, 'u1');
    expect(endpoint).toBe('/v1/responses');
    expect(requests.map((r: any) => r.customId)).toEqual(['c1', 'c3']);
    expect(skipped).toEqual([{ id: 'c2', reason: 'needs a name, email or company' }]);
    const body = requests[0].body;
    expect(body.model).toMatch(/^gpt-6/);
    expect(body.tools).toEqual([{ type: 'web_search', search_context_size: 'low' }]);
    expect(body.tool_choice).toBe('required');
    expect(body.text.format.strict).toBe(true);
    expect(body.metadata).toEqual({ user_id: 'u1', contact_id: 'c1' });
    expect(body.temperature).toBeUndefined(); // reasoning model: no sampling params
    expect(body.input).toContain('ada@acme.io (domain: acme.io)');
  });

  it('embed: /v1/embeddings bodies with content hash, skipping empty contacts', () => {
    const { endpoint, requests, skipped } = b.buildRequests('embed', contacts, 'u1');
    expect(endpoint).toBe('/v1/embeddings');
    expect(requests.map((r: any) => r.customId)).toEqual(['c1', 'c3']);
    expect(requests[1].body.input).toContain('met at expo');
    expect(requests[0].hash).toMatch(/^[0-9a-f]{64}$/);
    expect(skipped[0].id).toBe('c2');
  });

  it('rejects unknown kinds', () => {
    expect(() => b.buildRequests('score', contacts, 'u1')).toThrow(/Unknown batch kind/);
  });
});

describe('enrichment fills', () => {
  it('fills only empty fields and only for confident matches', () => {
    const r = { matched: true, confidence: 80, jobTitle: 'VP', company: 'Other', industry: 'SaaS', businessPhone: '+1' };
    expect(b.enrichmentFills(r, { title: '', company: 'Acme' })).toEqual({ title: 'VP', industry: 'SaaS', phone: '+1' });
    expect(b.enrichmentFills({ ...r, confidence: 59 }, {})).toEqual({});
    expect(b.enrichmentFills({ ...r, matched: false }, {})).toEqual({});
  });
});

describe('applyResults', () => {
  const mkSupabase = () => {
    const calls: any[] = [];
    const table = (name: string) => ({
      update: (v: any) => ({ eq: () => ({ eq: async () => { calls.push([name, 'update', v]); return { error: null }; } }) }),
      upsert: async (v: any) => { calls.push([name, 'upsert', v]); return { error: null }; },
    });
    return { client: { from: table }, calls };
  };

  it('enrich: updates empty fields, stores the enrichment, counts failures', async () => {
    const { client, calls } = mkSupabase();
    const text = JSON.stringify({ matched: true, confidence: 90, jobTitle: 'CTO', company: null, industry: null, businessPhone: null, evidence: ['https://acme.io/team'] });
    const body = { id: 'resp_1', model: 'gpt-6-astra', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] };
    const res = await b.applyResults('enrich', [
      { customId: 'c1', ok: true, body },
      { customId: 'c3', ok: false, body: null },
      { customId: 'nope', ok: true, body },
    ], { supabase: client, userId: 'u1', contactsById: new Map([['c1', { id: 'c1', title: '' }], ['c3', { id: 'c3' }]]) });
    expect(res).toMatchObject({ applied: 1, failed: 2, fills: { c1: { title: 'CTO' } } });
    expect(calls.find((c) => c[0] === 'contacts')[2]).toEqual({ title: 'CTO' });
    expect(calls.find((c) => c[0] === 'contact_enrichments')[2]).toMatchObject({ contact_id: 'c1', applied_fields: ['title'], confidence: 90 });
  });

  it('embed: upserts the vector with its hash', async () => {
    const { client, calls } = mkSupabase();
    const res = await b.applyResults('embed', [{ customId: 'c1', ok: true, body: { data: [{ embedding: [0.1, 0.2] }] } }],
      { supabase: client, userId: 'u1', contactsById: new Map([['c1', { id: 'c1', name: 'Ada' }]]), hashes: { c1: 'h1' } });
    expect(res.applied).toBe(1);
    expect(calls[0][2]).toMatchObject({ contact_id: 'c1', embedding: '[0.1,0.2]', content_hash: 'h1' });
  });
});
