// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const fnDir = path.resolve(__dirname, '../netlify/functions');
const CID = '11111111-1111-4111-8111-111111111111';

type Call = { table: string; filters: Array<[string, unknown]> };
let calls: Call[] = [];
let tables: Record<string, any[]> = {};

function makeQuery(table: string) {
  const call: Call = { table, filters: [] };
  calls.push(call);
  const q: any = {
    select: () => q,
    eq: (k: string, v: unknown) => { call.filters.push([k, v]); return q; },
    in: () => q, gte: () => q, lte: () => q, order: () => q, limit: () => q,
    maybeSingle: async () => {
      const rows = (tables[table] || []).filter((r) => call.filters.every(([k, v]) => r[k] === v));
      return { data: rows[0] ?? null, error: null };
    },
    then: (res: any) => {
      const rows = (tables[table] || []).filter((r) => call.filters.every(([k, v]) => r[k] === v));
      return Promise.resolve({ data: rows, error: null }).then(res);
    },
  };
  return q;
}

function load() {
  const set = (name: string, exports: any) => {
    const id = require.resolve(path.join(fnDir, name));
    require.cache[id] = { id, filename: id, loaded: true, exports } as any;
  };
  set('_supabaseClient.js', { supabase: { from: makeQuery } });
  set('_auth.js', {
    CORS_HEADERS: {},
    errorResponse: (statusCode: number, message: string) => ({ statusCode, headers: {}, body: JSON.stringify({ error: message }) }),
    authenticateRequest: async () => ({ user: { id: 'u1' }, error: null }),
  });
  const id = require.resolve(path.join(fnDir, 'calendar-list.js'));
  delete require.cache[id];
  return require(id).handler as (e: any) => Promise<{ statusCode: number; body: string }>;
}

describe('calendar-list contactId filter', () => {
  beforeEach(() => {
    calls = [];
    tables = {
      contacts: [{ id: CID, user_id: 'u1', name: 'Ann', email: 'a@x.io' }],
      calendar_events: [
        { id: 'e1', user_id: 'u1', contact_id: CID, scheduled_for: '2026-11-20T10:00:00Z', status: 'scheduled' },
        { id: 'e2', user_id: 'u1', contact_id: 'other', scheduled_for: '2026-11-20T11:00:00Z', status: 'scheduled' },
      ],
    };
  });

  it('rejects a malformed contactId', async () => {
    const r = await load()({ httpMethod: 'POST', body: JSON.stringify({ contactId: 'nope' }) });
    expect(r.statusCode).toBe(400);
  });

  it('404s when the contact is not owned by the caller', async () => {
    const r = await load()({ httpMethod: 'POST', body: JSON.stringify({ contactId: '22222222-2222-4222-8222-222222222222' }) });
    expect(r.statusCode).toBe(404);
    expect(calls.some((c) => c.table === 'calendar_events')).toBe(false);
  });

  it('owner-checks the contact and filters events by it', async () => {
    const r = await load()({ httpMethod: 'POST', body: JSON.stringify({ contactId: CID }) });
    expect(r.statusCode).toBe(200);
    const own = calls.find((c) => c.table === 'contacts')!;
    expect(own.filters).toContainEqual(['user_id', 'u1']);
    const ev = calls.find((c) => c.table === 'calendar_events')!;
    expect(ev.filters).toContainEqual(['contact_id', CID]);
    expect(ev.filters).toContainEqual(['user_id', 'u1']);
    expect(JSON.parse(r.body).events.map((e: any) => e.id)).toEqual(['e1']);
  });

  it('suggestions use all of the user events, not only the contact', async () => {
    const r = await load()({
      httpMethod: 'POST',
      body: JSON.stringify({
        contactId: CID,
        availability: { count: 2, durationMinutes: 30, from: '2026-11-19T00:00:00Z', to: '2026-11-24T00:00:00Z' },
      }),
    });
    expect(r.statusCode).toBe(200);
    const evCalls = calls.filter((c) => c.table === 'calendar_events');
    expect(evCalls).toHaveLength(2);
    expect(evCalls[1]!.filters.find(([k]) => k === 'contact_id')).toBeUndefined();
    expect(Array.isArray(JSON.parse(r.body).suggestions)).toBe(true);
  });
});
