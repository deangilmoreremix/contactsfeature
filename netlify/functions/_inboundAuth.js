/**
 * Authenticity check for the inbound-email webhook (no user session exists on this path).
 * Fails CLOSED: with no secret configured the endpoint refuses everything.
 *
 * Accepted (any one):
 *  - Generic HMAC:   `X-Webhook-Signature: [sha256=]<hex hmac-sha256(raw body)>` keyed with INBOUND_EMAIL_WEBHOOK_SECRET
 *  - Shared secret:  `X-Webhook-Secret: <secret>`, HTTP Basic auth password (Postmark-style), or `?token=<secret>`
 *                    — all compared in constant time against INBOUND_EMAIL_WEBHOOK_SECRET
 *  - Mailgun:        body.signature { timestamp, token, signature } = hex hmac-sha256(timestamp + token) keyed with
 *                    MAILGUN_WEBHOOK_SECRET (timestamp within 5 minutes)
 */
const crypto = require('crypto');

const MAX_SKEW_SECONDS = 300;

function safeEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function lowerHeaders(headers) {
  const h = {};
  for (const [k, v] of Object.entries(headers || {})) h[k.toLowerCase()] = v;
  return h;
}

function rawBody(event) {
  const b = event.body || '';
  return event.isBase64Encoded ? Buffer.from(b, 'base64').toString('utf8') : b;
}

function hmacHex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/** Returns { ok, status, reason }. 503 = not configured, 401 = bad/missing proof. */
function verifyInboundEmail(event, parsedBody, env = process.env) {
  const generic = env.INBOUND_EMAIL_WEBHOOK_SECRET;
  const mailgun = env.MAILGUN_WEBHOOK_SECRET;
  if (!generic && !mailgun) return { ok: false, status: 503, reason: 'Inbound webhook is not configured' };

  const h = lowerHeaders(event.headers);

  if (generic) {
    const sig = String(h['x-webhook-signature'] || '').replace(/^sha256=/i, '');
    if (sig && safeEqual(sig, hmacHex(generic, rawBody(event)))) return { ok: true };

    const shared = h['x-webhook-secret'];
    if (shared && safeEqual(shared, generic)) return { ok: true };

    const basic = /^Basic (.+)$/i.exec(h.authorization || '');
    if (basic) {
      const decoded = Buffer.from(basic[1], 'base64').toString('utf8');
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (password && safeEqual(password, generic)) return { ok: true };
    }

    const token = event.queryStringParameters && event.queryStringParameters.token;
    if (token && safeEqual(token, generic)) return { ok: true };
  }

  if (mailgun && parsedBody && parsedBody.signature && typeof parsedBody.signature === 'object') {
    const { timestamp, token, signature } = parsedBody.signature;
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (timestamp && token && signature && Number.isFinite(age) && age <= MAX_SKEW_SECONDS
      && safeEqual(signature, hmacHex(mailgun, `${timestamp}${token}`))) return { ok: true };
  }

  return { ok: false, status: 401, reason: 'Invalid webhook signature' };
}

module.exports = { verifyInboundEmail };
