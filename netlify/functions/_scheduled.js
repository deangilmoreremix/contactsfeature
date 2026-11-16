/**
 * Guard for scheduled functions (netlify.toml `schedule = ...`). They must never be a public trigger for
 * cross-user work. Accepts: Netlify's scheduler (User-Agent "Netlify Clockwork"), a request carrying
 * CRON_SECRET (header `x-cron-secret` or `Authorization: Bearer`), or an internal invocation with no HTTP
 * headers at all (never the case for a request from the internet). Everything else gets 401.
 * Defence in depth: Netlify does not route public HTTP to scheduled functions in production.
 */
const crypto = require('crypto');

function safeEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function isScheduledInvocation(event) {
  if (!event || !event.headers) return true;
  const h = {};
  for (const [k, v] of Object.entries(event.headers)) h[k.toLowerCase()] = v;
  if (/netlify clockwork/i.test(h['user-agent'] || '')) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = h['x-cron-secret'] || (/^Bearer (.+)$/.exec(h.authorization || '') || [])[1];
  return Boolean(given) && safeEqual(given, secret);
}

function scheduledOnly(handler) {
  return async (event, context) => {
    if (!isScheduledInvocation(event)) {
      return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    return handler(event, context);
  };
}

module.exports = { scheduledOnly, isScheduledInvocation };
