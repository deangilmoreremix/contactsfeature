// @vitest-environment node
/**
 * semantic-search must index and find contacts beyond the first 2,000 (PR review: a fixed `limit(2000)` meant contacts past it
 * were never indexed and their matches were dropped by the `byId` filter).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

(globalThis as any).awslambda = undefined;
const require = createRequire(import.meta.url);

const N = 2500;
const pad = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const contacts = Array.from({ length: N }, (_, i) => ({ id: pad(i), user_id: 'u1', name: `Person ${i}`, company: `Co ${i}`, deleted_at: null }));
const upserts: any[][] = [];
const embedCalls: string[][] = [];
const rangeLog: Array<[number, number]> = [];

function fakeSupabase() {
  const from = (table: string) => {
    let data: any[] = table === 'contacts' ? [...contacts] : [];
    let rangeFrom = 0; let rangeTo = Infinity;
    const q: any = {
      select: () => q, is: () => q,
      eq: (k: string, v: unknown) => { data = data.filter((r) => r[k] === v); return q; },
      in: (k: string, v: unknown[]) => { data = data.filter((r) => v.includes(r[k])); return q; },
      order: () => { data = [...data].sort((a, b) => String(a.id).localeCompare(String(b.id))); return q; },
      range: (f: number, t: number) => { rangeFrom = f; rangeTo = t; rangeLog.push([f, t]); return q; },
      upsert: (rows: any[]) => { upserts.push(rows); return Promise.resolve({ error: null }); },
      then: (res: any, rej: any) => Promise.resolve({ data: data.slice(rangeFrom, rangeTo === Infinity ? undefined : rangeTo + 1), error: null }).then(res, rej),
    };
    return q;
  };
  return { from };
}

const MATCH_ID = pad(2400); // far past the old 2,000 cut-off
beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test';
  const sc = path.resolve('netlify/functions/_supabaseClient.js');
  const userClient = { auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) }, rpc: async () => ({ data: [{ contact_id: MATCH_ID, similarity: 0.9 }], error: null }) };
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: fakeSupabase(), getUserClient: () => userClient } } as any;
  const responses = require('../netlify/functions/_responses.js');
  responses.embed = async (texts: string[]) => { embedCalls.push(texts); return texts.map(() => [0.1, 0.2]); };
});

describe('semantic-search with a large contact base', () => {
  it('scans every page, indexes a batch, reports what is pending and returns matches beyond the first 2,000', async () => {
    const { handler } = require('../netlify/functions/semantic-search.js');
    const res = await handler({ httpMethod: 'POST', headers: { authorization: 'Bearer good' }, body: JSON.stringify({ query: 'person' }) });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // all 2,500 contacts were seen (3 pages of up to 1,000), not just the first 2,000
    expect(Math.max(...rangeLog.filter(([f]) => f >= 0).map(([f]) => f))).toBeGreaterThanOrEqual(2000);
    expect(body.embedded).toBe(64);
    expect(body.pending).toBe(N - 64);
    expect(body.truncated).toBeUndefined();
    // the match at index 2400 comes back even though it was not part of the indexing batch
    expect(body.results).toHaveLength(1);
    expect(body.results[0].contact.id).toBe(MATCH_ID);
    expect(body.results[0].score).toBe(0.9);
  });
});
