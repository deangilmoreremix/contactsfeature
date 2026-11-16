// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('messaging credentials crypto', () => {
  beforeEach(() => {
    process.env.MESSAGING_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  it('round-trips and never stores plaintext', () => {
    const { encryptJson, decryptJson } = require('../netlify/functions/_messaging/crypto.js');
    const payload = encryptJson({ apiKey: 'sk_live_secret' });
    expect(payload.startsWith('v1:')).toBe(true);
    expect(payload).not.toContain('sk_live_secret');
    expect(decryptJson(payload)).toEqual({ apiKey: 'sk_live_secret' });
  });

  it('rejects tampered payloads and a missing key', () => {
    const { encryptJson, decryptJson } = require('../netlify/functions/_messaging/crypto.js');
    const p = encryptJson({ a: 1 });
    const tampered = p.slice(0, -4) + 'AAAA';
    expect(() => decryptJson(tampered)).toThrow();
    delete process.env.MESSAGING_ENCRYPTION_KEY;
    expect(() => encryptJson({ a: 1 })).toThrow(/MESSAGING_ENCRYPTION_KEY/);
  });

  it('masks secrets', () => {
    const { mask } = require('../netlify/functions/_messaging/crypto.js');
    expect(mask('sk_live_abcdef1234')).toMatch(/\*+1234$/);
    expect(mask('abc')).toBe('****');
  });
});

describe('provider adapters', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const msg = { to: 'a@b.co', fromEmail: 'me@x.io', fromName: 'Me', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };

  it('resend: posts bearer auth + body and returns the id', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'r_1' }) });
    globalThis.fetch = f as any;
    const { email } = require('../netlify/functions/_messaging/adapters.js');
    const r = await email.resend({ apiKey: 'k' }, msg);
    expect(r.messageId).toBe('r_1');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer k');
    expect(JSON.parse(init.body)).toMatchObject({ to: ['a@b.co'], subject: 'Hi', from: 'Me <me@x.io>' });
  });

  it('mailgun: uses domain + eu region and basic auth', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: '<m1>' }) });
    globalThis.fetch = f as any;
    const { email } = require('../netlify/functions/_messaging/adapters.js');
    await email.mailgun({ apiKey: 'k', domain: 'mg.x.io', region: 'eu' }, msg);
    expect(f.mock.calls[0][0]).toBe('https://api.eu.mailgun.net/v3/mg.x.io/messages');
    expect(f.mock.calls[0][1].headers.Authorization).toBe(`Basic ${Buffer.from('api:k').toString('base64')}`);
  });

  it('twilio: form-encodes To/From/Body', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sid: 'SM1' }) });
    globalThis.fetch = f as any;
    const { sms } = require('../netlify/functions/_messaging/adapters.js');
    const r = await sms.twilio({ accountSid: 'AC1', authToken: 't' }, { to: '+14155550123', from: '+14155550999', body: 'yo' });
    expect(r.messageId).toBe('SM1');
    expect(f.mock.calls[0][0]).toContain('/Accounts/AC1/Messages.json');
    expect(new URLSearchParams(f.mock.calls[0][1].body).get('Body')).toBe('yo');
  });

  it('surfaces provider errors instead of swallowing them', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'bad key' }) as any;
    const { email } = require('../netlify/functions/_messaging/adapters.js');
    await expect(email.sendgrid({ apiKey: 'x' }, msg)).rejects.toThrow(/SendGrid error 401/);
  });

  it('every provider declares its required credential fields', () => {
    const { CREDENTIAL_FIELDS, EMAIL_PROVIDERS, SMS_PROVIDERS } = require('../netlify/functions/_messaging/adapters.js');
    for (const p of [...EMAIL_PROVIDERS, ...SMS_PROVIDERS]) expect(CREDENTIAL_FIELDS[p].length).toBeGreaterThan(0);
  });
});
