// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

vi.mock('../src/lib/supabase', () => ({ supabase: {} }));
const require = createRequire(import.meta.url);
const T = require('../netlify/functions/_messaging/tracking.js');

const ID = '123e4567-e89b-12d3-a456-426614174000';

describe('tracking helpers', () => {
  it('validates uuids and http(s) urls', () => {
    expect(T.isUuid(ID)).toBe(true);
    expect(T.isUuid('abc')).toBe(false);
    expect(T.isUuid(`${ID}' OR 1=1`)).toBe(false);
    expect(T.isHttpUrl('https://example.com/a?b=1')).toBe(true);
    expect(T.isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(T.isHttpUrl('data:text/html,hi')).toBe(false);
    expect(T.isHttpUrl('//evil.com')).toBe(false);
  });

  it('flags bots and missing user agents', () => {
    expect(T.isLikelyBot('')).toBe(true);
    expect(T.isLikelyBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(T.isLikelyBot('Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605')).toBe(false);
  });

  it('injects the pixel and rewrites http(s) links only', () => {
    const html = '<html><body><a href="https://acme.com/x?a=1&amp;b=2">go</a> <a href="mailto:a@b.co">m</a> <a href="https://acme.com/unsubscribe">u</a></body></html>';
    const out = T.injectTracking(html, { emailId: ID, baseUrl: 'https://crm.example.com/' });
    expect(out).toContain(`https://crm.example.com/.netlify/functions/track-click?e=${ID}&amp;u=${encodeURIComponent('https://acme.com/x?a=1&b=2')}`);
    expect(out).toContain('href="mailto:a@b.co"');
    expect(out).toContain('href="https://acme.com/unsubscribe"');
    expect(out).toContain(`track-open?id=${ID}`);
    expect(out.indexOf('track-open')).toBeLessThan(out.indexOf('</body>'));
  });

  it('is a no-op without base url, valid id or html', () => {
    expect(T.injectTracking('<p>x</p>', { emailId: ID })).toBe('<p>x</p>');
    expect(T.injectTracking('<p>x</p>', { emailId: 'nope', baseUrl: 'https://a.b' })).toBe('<p>x</p>');
    expect(T.injectTracking(null, { emailId: ID, baseUrl: 'https://a.b' })).toBe(null);
  });

  it('does not double-track and appends pixel when there is no body tag', () => {
    const once = T.injectTracking('<a href="https://acme.com">x</a>', { emailId: ID, baseUrl: 'https://crm.example.com' });
    const twice = T.injectTracking(once, { emailId: ID, baseUrl: 'https://crm.example.com' });
    expect(twice.match(/track-click/g)?.length).toBe(1);
    expect(once.endsWith('/>')).toBe(true);
  });
});

describe('track-click / track-open handlers', () => {
  it('rejects non-http targets and redirects valid ones', async () => {
    const updates: string[] = [];
    const chain: any = { update: () => chain, eq: () => chain, is: () => { updates.push('u'); return Promise.resolve({}); } };
    require.cache[require.resolve('../netlify/functions/_supabaseClient.js')] = { exports: { supabase: { from: () => chain } } } as any;
    delete require.cache[require.resolve('../netlify/functions/track-click.js')];
    delete require.cache[require.resolve('../netlify/functions/track-open.js')];
    const click = require('../netlify/functions/track-click.js').handler;
    const open = require('../netlify/functions/track-open.js').handler;
    const ua = { 'user-agent': 'Mozilla/5.0 Safari' };
    expect((await click({ httpMethod: 'GET', queryStringParameters: { e: ID, u: 'javascript:alert(1)' }, headers: ua })).statusCode).toBe(400);
    const ok = await click({ httpMethod: 'GET', queryStringParameters: { e: ID, u: 'https://acme.com/p' }, headers: ua });
    expect(ok.statusCode).toBe(302);
    expect(ok.headers.Location).toBe('https://acme.com/p');
    const gif = await open({ httpMethod: 'GET', queryStringParameters: { id: ID }, headers: ua });
    expect(gif.headers['Content-Type']).toBe('image/gif');
    expect(Buffer.from(gif.body, 'base64').subarray(0, 3).toString()).toBe('GIF');
    const before = updates.length;
    await open({ httpMethod: 'GET', queryStringParameters: { id: ID }, headers: { 'user-agent': 'Googlebot' } });
    expect(updates.length).toBe(before); // bots are not counted
    await open({ httpMethod: 'GET', queryStringParameters: { id: 'not-a-uuid' }, headers: ua });
    expect(updates.length).toBe(before);
  });
});

describe('email metrics', () => {
  it('computes rates from emails rows and treats a click as an open', async () => {
    const { computeMetrics, bestSendWindow } = await import('../src/services/emailTrackingService');
    const t = (o: any) => ({ id: 'x', contactId: null, subject: 's', status: 'sent', sentAt: new Date('2026-01-05T10:00:00'), openedAt: null, clickedAt: null, repliedAt: null, ...o });
    const m = computeMetrics([
      t({ openedAt: new Date() }),
      t({ clickedAt: new Date() }),
      t({ repliedAt: new Date('2026-01-05T12:00:00'), openedAt: new Date() }),
      t({}),
      t({ status: 'failed', sentAt: null }),
    ] as any);
    expect(m.totalSent).toBe(4);
    expect(m.totalOpened).toBe(3);
    expect(m.totalClicked).toBe(1);
    expect(m.openRate).toBe(75);
    expect(m.totalFailed).toBe(1);
    expect(m.averageResponseTime).toBeCloseTo(2);
    expect(computeMetrics([]).averageResponseTime).toBeNull();
    expect(bestSendWindow([t({ openedAt: new Date() })] as any)).toBeNull();
  });

  it('converts wall-clock time in a timezone to UTC', async () => {
    const { zonedTimeToUtc } = await import('../src/utils/zonedTime');
    expect(zonedTimeToUtc('2026-07-01', '09:30', 'America/New_York').toISOString()).toBe('2026-07-01T13:30:00.000Z');
    expect(zonedTimeToUtc('2026-01-15', '09:30', 'America/New_York').toISOString()).toBe('2026-01-15T14:30:00.000Z');
    expect(zonedTimeToUtc('2026-07-01', '09:00', 'Asia/Tokyo').toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });
});
