// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ID = '123e4567-e89b-12d3-a456-426614174000';
const OTHER = '223e4567-e89b-12d3-a456-426614174000';
const UA = { 'user-agent': 'Mozilla/5.0 Safari' };

let emails: any[] = [];
let updates: Array<{ table: string; patch: any; id?: unknown }> = [];
let dbError = false;

function fakeSupabase() {
  return {
    from: (table: string) => {
      let data = [...emails];
      let patch: any = null;
      let id: unknown;
      const q: any = {
        select: () => q,
        update: (p: any) => { patch = p; return q; },
        eq: (k: string, v: any) => { if (k === 'id') id = v; data = data.filter((r) => r[k] === v); return q; },
        is: () => { updates.push({ table, patch, id }); return Promise.resolve({}); },
        maybeSingle: async () => (dbError ? { data: null, error: { message: 'boom' } } : { data: data[0] || null, error: null }),
      };
      return q;
    },
  };
}

function click(query: Record<string, string>, headers = UA) {
  const sc = require.resolve('../netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: fakeSupabase() } } as any;
  delete require.cache[require.resolve('../netlify/functions/track-click.js')];
  return require('../netlify/functions/track-click.js').handler({ httpMethod: 'GET', queryStringParameters: query, headers });
}

beforeEach(() => {
  dbError = false;
  updates = [];
  emails = [
    { id: ID, is_inbound: false, body_html: '<p><a href="https://acme.com/p?a=1&amp;b=2">x</a> and https://plain.example.org/z.</p>', body_text: 'see https://text.example.com/t, ok' },
    { id: OTHER, is_inbound: false, body_html: '<a href="https://other.example/o">o</a>', body_text: null },
  ];
});

describe('track-click only redirects to URLs from the email body', () => {
  it('redirects to an href in the stored html (entity-decoded) and records click + open', async () => {
    const r = await click({ e: ID, u: 'https://acme.com/p?a=1&b=2' });
    expect(r.statusCode).toBe(302);
    expect(r.headers.Location).toBe('https://acme.com/p?a=1&b=2');
    expect(updates.map((u) => Object.keys(u.patch)[0]).sort()).toEqual(['clicked_at', 'opened_at']);
  });

  it('accepts bare URLs in html or text bodies (trailing punctuation ignored)', async () => {
    expect((await click({ e: ID, u: 'https://plain.example.org/z' })).statusCode).toBe(302);
    expect((await click({ e: ID, u: 'https://text.example.com/t' })).statusCode).toBe(302);
  });

  it('400 for a URL not in the body, even if it is another email\'s URL; nothing recorded', async () => {
    expect((await click({ e: ID, u: 'https://evil.example/phish' })).statusCode).toBe(400);
    expect((await click({ e: ID, u: 'https://other.example/o' })).statusCode).toBe(400);
    expect((await click({ e: ID, u: 'https://acme.com/p' })).statusCode).toBe(400); // prefix/different query is not a match
    expect(updates).toHaveLength(0);
  });

  it('400 for unknown or invalid email id, and for non-http targets', async () => {
    expect((await click({ e: '323e4567-e89b-12d3-a456-426614174000', u: 'https://acme.com/p?a=1&b=2' })).statusCode).toBe(400);
    expect((await click({ e: 'nope', u: 'https://acme.com/p?a=1&b=2' })).statusCode).toBe(400);
    expect((await click({ u: 'https://acme.com/p?a=1&b=2' })).statusCode).toBe(400);
    expect((await click({ e: ID, u: 'javascript:alert(1)' })).statusCode).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it('bots still get the (valid) redirect but are not counted; a lookup failure never redirects', async () => {
    const r = await click({ e: ID, u: 'https://plain.example.org/z' }, { 'user-agent': 'Googlebot' });
    expect(r.statusCode).toBe(302);
    expect(updates).toHaveLength(0);
    dbError = true;
    expect((await click({ e: ID, u: 'https://plain.example.org/z' })).statusCode).toBe(503);
  });
});
