// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const fnDir = path.resolve(__dirname, '../netlify/functions');
const { moderate } = require(path.join(fnDir, '_responses.js'));

function fakeClient(impl: (input: any) => any) {
  return { moderations: { create: async ({ input }: any) => impl(input) } };
}
const flaggedIf = (needle: string) => (input: any) => ({
  results: (Array.isArray(input) ? input : [input]).map((t: string) => ({
    flagged: t.includes(needle),
    categories: { harassment: t.includes(needle), violence: false },
  })),
});

describe('moderate()', () => {
  it('keeps the legacy shape for a single string', async () => {
    const r = await moderate('hello', { client: fakeClient(flaggedIf('bad')) });
    expect(r.flagged).toBe(false);
    expect(r.categories).toEqual({ harassment: false, violence: false });
  });
  it('accepts arrays and ORs categories', async () => {
    const r = await moderate(['fine', 'bad one'], { client: fakeClient(flaggedIf('bad')) });
    expect(r.flagged).toBe(true);
    expect(r.categories.harassment).toBe(true);
    expect(r.results).toHaveLength(2);
  });
});

describe('checkOutbound()', () => {
  const { checkOutbound } = require(path.join(fnDir, '_moderation.js'));
  it('skips empty text', async () => {
    expect(await checkOutbound({ texts: ['', null], client: fakeClient(() => { throw new Error('no'); }) })).toEqual({ ok: true });
  });
  it('blocks flagged content with categories', async () => {
    const r = await checkOutbound({ texts: ['s', '<p>bad</p>'], userId: 'u', endpoint: 't', client: fakeClient(flaggedIf('bad')) });
    expect(r).toEqual({ ok: false, categories: ['harassment'] });
  });
  it('fails open when the moderation call errors', async () => {
    const r = await checkOutbound({ texts: ['x'], client: fakeClient(() => { throw new Error('boom'); }) });
    expect(r).toEqual({ ok: true });
  });
});

// ---- handler level ----
let sent: any[] = [];
let modFlag = true;
let emailRows: any[] = [];

function stub(name: string, exports: any) {
  const id = require.resolve(path.join(fnDir, name));
  require.cache[id] = { id, filename: id, loaded: true, exports } as any;
}
function loadHandler(file: string, extra: Record<string, any> = {}) {
  const q: any = {
    select: () => q, eq: () => q, gte: () => q, insert: (r: any) => { emailRows.push(r); return q; },
    update: () => q, maybeSingle: async () => ({ data: { id: 'e1' }, error: null }),
    then: (res: any) => Promise.resolve({ data: [], count: 0, error: null }).then(res),
  };
  stub('_supabaseClient.js', { supabase: { from: () => q } });
  stub('_auth.js', {
    CORS_HEADERS: {},
    errorResponse: (statusCode: number, message: string) => ({ statusCode, headers: {}, body: JSON.stringify({ error: message }) }),
    withAuth: (fn: any) => (e: any) => fn(e, { id: 'u1' }),
  });
  stub('_messaging/index.js', {
    sendEmail: async (...a: any[]) => { sent.push(a); return { provider: 'resend', messageId: 'm1' }; },
    sendSms: async (...a: any[]) => { sent.push(a); return { provider: 'twilio', messageId: 's1' }; },
  });
  stub('_responses.js', {
    moderate: async (input: any) => {
      const arr = Array.isArray(input) ? input : [input];
      const flagged = modFlag && arr.some((t: string) => t.includes('idiot'));
      return { flagged, categories: { harassment: flagged }, results: [] };
    },
    ...extra,
  });
  const id = require.resolve(path.join(fnDir, file));
  delete require.cache[id];
  delete require.cache[require.resolve(path.join(fnDir, '_moderation.js'))];
  return require(id).handler as (e: any) => Promise<{ statusCode: number; body: string }>;
}

describe('handlers block flagged content', () => {
  beforeEach(() => { sent = []; emailRows = []; modFlag = true; });

  it('send-email returns 422 CONTENT_FLAGGED and never sends or stores', async () => {
    const h = loadHandler('send-email.js');
    const r = await h({ httpMethod: 'POST', body: JSON.stringify({ to: 'a@x.io', subject: 'Hi', body_text: 'you idiot' }) });
    const b = JSON.parse(r.body);
    expect(r.statusCode).toBe(422);
    expect(b).toMatchObject({ success: false, code: 'CONTENT_FLAGGED', categories: ['harassment'] });
    expect(b.error).toContain('blocked by content moderation: harassment');
    expect(sent).toHaveLength(0);
    expect(emailRows).toHaveLength(0);
  });

  it('send-email sends clean content', async () => {
    const h = loadHandler('send-email.js');
    const r = await h({ httpMethod: 'POST', body: JSON.stringify({ to: 'a@x.io', subject: 'Hi', body_text: 'nice to meet you' }) });
    expect(r.statusCode).toBe(200);
    expect(sent).toHaveLength(1);
  });

  it('send-sms returns 422 for flagged messages', async () => {
    const h = loadHandler('send-sms.js');
    const r = await h({ httpMethod: 'POST', body: JSON.stringify({ to: '+14155550123', message: 'idiot' }) });
    expect(r.statusCode).toBe(422);
    expect(JSON.parse(r.body).code).toBe('CONTENT_FLAGGED');
    expect(sent).toHaveLength(0);
  });
});
