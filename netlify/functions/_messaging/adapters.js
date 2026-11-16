/**
 * Provider adapters. Every adapter takes (credentials, message) and returns { messageId }.
 * Throws on failure. Network calls go to the provider the USER configured (bring-your-own).
 */
const { fetchWithTimeout } = require('../_fetchWithRetry');

const EMAIL_PROVIDERS = ['resend', 'sendgrid', 'postmark', 'mailgun'];
const SMS_PROVIDERS = ['twilio'];

const fmtFrom = (m) => (m.fromName ? `${m.fromName} <${m.fromEmail}>` : m.fromEmail);

async function failIfNotOk(res, name) {
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  throw new Error(`${name} error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
}

const email = {
  async resend(c, m) {
    const res = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fmtFrom(m), to: [m.to], subject: m.subject, html: m.html, text: m.text }),
    }, 15000);
    await failIfNotOk(res, 'Resend');
    return { messageId: (await res.json()).id };
  },
  async sendgrid(c, m) {
    const res = await fetchWithTimeout('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: m.to }] }],
        from: { email: m.fromEmail, name: m.fromName },
        subject: m.subject,
        content: [
          { type: 'text/plain', value: m.text || m.html || '' },
          { type: 'text/html', value: m.html || m.text || '' },
        ],
      }),
    }, 15000);
    await failIfNotOk(res, 'SendGrid');
    return { messageId: res.headers.get('x-message-id') || '' };
  },
  async postmark(c, m) {
    const res = await fetchWithTimeout('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': c.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ From: fmtFrom(m), To: m.to, Subject: m.subject, HtmlBody: m.html, TextBody: m.text }),
    }, 15000);
    await failIfNotOk(res, 'Postmark');
    return { messageId: (await res.json()).MessageID };
  },
  async mailgun(c, m) {
    const base = c.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
    const form = new URLSearchParams({ from: fmtFrom(m), to: m.to, subject: m.subject });
    if (m.html) form.set('html', m.html);
    if (m.text) form.set('text', m.text);
    const res = await fetchWithTimeout(`${base}/v3/${encodeURIComponent(c.domain)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${c.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    }, 15000);
    await failIfNotOk(res, 'Mailgun');
    return { messageId: (await res.json()).id };
  },
};

const sms = {
  async twilio(c, m) {
    const res = await fetchWithTimeout(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${c.accountSid}:${c.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: m.to, From: m.from, Body: m.body }).toString(),
      },
      15000
    );
    await failIfNotOk(res, 'Twilio');
    return { messageId: (await res.json()).sid };
  },
};

/** Required credential fields per provider (used for validation and the settings UI). */
const CREDENTIAL_FIELDS = {
  resend: ['apiKey'],
  sendgrid: ['apiKey'],
  postmark: ['apiKey'],
  mailgun: ['apiKey', 'domain'],
  twilio: ['accountSid', 'authToken'],
};

module.exports = { email, sms, EMAIL_PROVIDERS, SMS_PROVIDERS, CREDENTIAL_FIELDS };
