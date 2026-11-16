/**
 * Netlify Function: send an SMS through the user's own provider (Twilio).
 * POST { to, message, from?, contactId?, automationId? }
 * Credentials live encrypted in messaging_providers; nothing is simulated — without a provider
 * the call fails with 412 NO_PROVIDER.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { sendSms } = require('./_messaging');

const E164 = /^\+[1-9]\d{6,14}$/;
const MAX_PER_MINUTE = 30;

exports.handler = withAuth(async (event, user) => {
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON'); }
  const { to, message, from, contactId, automationId } = b;

  if (!to || !message) return errorResponse(400, 'Phone number and message are required');
  if (!E164.test(String(to))) return errorResponse(400, 'Phone number must be in E.164 format, e.g. +14155550123');
  if (String(message).length > 1600) return errorResponse(400, 'Message is too long (max 1600 characters)');

  if (contactId) {
    const { data: c } = await supabase.from('contacts').select('id').eq('id', contactId).eq('user_id', user.id).maybeSingle();
    if (!c) return errorResponse(404, 'Contact not found');
  }

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase.from('sms_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  if ((count || 0) >= MAX_PER_MINUTE) return errorResponse(429, 'Rate limit exceeded');

  const base = { user_id: user.id, contact_id: contactId || null, to_number: to, message, automation_id: automationId || null };
  try {
    const r = await sendSms(user.id, { to, body: message, from });
    await supabase.from('sms_events').insert({ ...base, provider: r.provider, message_sid: r.messageId, status: 'sent' });
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, messageSid: r.messageId, provider: r.provider, to }) };
  } catch (err) {
    await supabase.from('sms_events').insert({ ...base, status: 'failed', error_message: err.message });
    const noProvider = err.code === 'NO_PROVIDER';
    return { statusCode: noProvider ? 412 : 502, headers: CORS_HEADERS, body: JSON.stringify({ success: false, code: err.code || 'SEND_FAILED', error: err.message }) };
  }
});
