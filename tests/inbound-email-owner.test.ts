// @vitest-environment node
/** inbound-email-webhook: recipient -> owning user first, then the sender is matched only among THAT user's contacts. */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const SHARED = 'prospect@shared.io';

const rows: Record<string, any[]> = {};
const inserted: Record<string, any[]> = {};

function reset() {
  rows.messaging_providers = [
    { user_id: 'u1', channel: 'email', from_address: 'Sales@Alpha.com' },
    { user_id: 'u2', channel: 'email', from_address: 'hello@beta.com' },
    { user_id: 'u1', channel: 'sms', from_address: '+15550001' },
    { user_id: 'u1', channel: 'email', from_address: 'dup@both.com' },
    { user_id: 'u2', channel: 'email', from_address: 'dup@both.com' },
  ];
  rows.contacts = [
    { id: 'c-u1', user_id: 'u1', email: SHARED, name: 'Prospect (u1)' },
    { id: 'c-u2', user_id: 'u2', email: SHARED, name: 'Prospect (u2)' },
    { id: 'c-only-u2', user_id: 'u2', email: 'beta-only@x.io', name: 'Beta Only' },
  ];
  rows.autopilot_state = [];
  rows.contact_agent_settings = [];
  rows.emails = [];
  for (const k of Object.keys(inserted)) delete inserted[k];
}

function fakeSupabase() {
  return {
    from: (table: string) => {
      let data = [...(rows[table] || [])];
      const q: any = {
        select: () => q, order: () => q, limit: () => q, is: () => q, not: () => q,
        in: (k: string, v: any[]) => { data = data.filter((r) => v.includes(r[k])); return q; },
        or: (expr: string) => {
          const pats = [...expr.matchAll(/(\w+)\.ilike\."([^"]*)"/g)].map((m) => ({ k: m[1], v: m[2].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[_%]/g, '.') }));
          data = data.filter((r) => pats.some((p) => new RegExp(`^${p.v}$`).test(String(r[p.k] || '').toLowerCase())));
          return q;
        },
        eq: (k: string, v: any) => { data = data.filter((r) => r[k] === v); return q; },
        insert: (row: any) => { (inserted[table] ||= []).push(row); return q; },
        update: () => q, upsert: () => q, delete: () => q,
        maybeSingle: async () => ({ data: data[0] || null, error: null }),
        then: (res: any, rej: any) => Promise.resolve({ data, error: null }).then(res, rej),
        catch: () => q,
      };
      return q;
    },
  };
}

beforeAll(() => {
  process.env.INBOUND_EMAIL_WEBHOOK_SECRET = 'whsec';
  const sc = path.resolve('netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: fakeSupabase() } } as any;
});
beforeEach(reset);

const send = (payload: Record<string, unknown>) =>
  require('../netlify/functions/inbound-email-webhook.js').handler({
    httpMethod: 'POST', headers: { 'x-webhook-secret': 'whsec' }, body: JSON.stringify({ subject: 'Re: hi', text: 'thanks', ...payload }),
  });

describe('inbound-email-webhook ownership', () => {
  it('links the sender to the contact of the user who owns the recipient address (two users share a sender)', async () => {
    const r1 = await send({ from: SHARED, to: 'sales@alpha.com' });
    expect(JSON.parse(r1.body)).toMatchObject({ processed: true, contactId: 'c-u1' });
    const r2 = await send({ from: SHARED, to: 'Beta Hello <HELLO@beta.com>' });
    expect(JSON.parse(r2.body)).toMatchObject({ processed: true, contactId: 'c-u2' });
    expect(inserted.emails.map((e) => [e.contact_id, e.user_id])).toEqual([['c-u1', 'u1'], ['c-u2', 'u2']]);
  });

  it('handles "Name <addr>" senders, recipient arrays and case differences', async () => {
    const r = await send({ from: 'Prospect <Prospect@Shared.io>', to: [{ email: 'x@y.com' }, 'sales@alpha.com'] });
    expect(JSON.parse(r.body)).toMatchObject({ processed: true, contactId: 'c-u1' });
  });

  it('never matches a sender who is only a contact of a DIFFERENT user: stored unlinked under the recipient owner', async () => {
    const r = await send({ from: 'beta-only@x.io', to: 'sales@alpha.com' });
    expect(JSON.parse(r.body)).toMatchObject({ processed: false, stored: true, recipientResolved: true });
    expect(inserted.emails).toHaveLength(1);
    expect(inserted.emails[0]).toMatchObject({ contact_id: null, user_id: 'u1', is_inbound: true, from_email: 'beta-only@x.io' });
  });

  it('unknown or ambiguous recipient (or none) -> never guesses a user; stored fully unlinked', async () => {
    for (const to of ['nobody@nowhere.io', 'dup@both.com', undefined]) {
      for (const k of Object.keys(inserted)) delete inserted[k];
      const r = await send({ from: SHARED, to });
      expect(JSON.parse(r.body)).toMatchObject({ processed: false, stored: true, recipientResolved: false });
      expect(inserted.emails[0]).toMatchObject({ contact_id: null, user_id: null });
    }
  });

  it('an sms provider address does not resolve an owner', async () => {
    const r = await send({ from: SHARED, to: '+15550001' });
    expect(JSON.parse(r.body).recipientResolved).toBe(false);
  });
});
