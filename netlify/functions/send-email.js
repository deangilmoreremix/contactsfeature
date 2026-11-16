/**
 * Netlify Function: send (or schedule) an email through the user's own provider.
 * POST { to, subject, body_html?, body_text?, contact_id?, scheduled_for?, from_name?, from_email? }
 *  - scheduled_for in the future  -> stored as status 'queued' and sent by process-email-queue-scheduled
 *  - otherwise                    -> sent immediately
 * Never reports success unless a provider accepted the message.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { sendEmail } = require('./_messaging');
const { injectTracking } = require('./_messaging/tracking');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON'); }
  const { to, subject, body_html, body_text, contact_id, scheduled_for, from_name, from_email } = body;

  if (!to || !EMAIL_RE.test(to)) return errorResponse(400, 'A valid "to" address is required');
  if (!subject || !(body_html || body_text)) return errorResponse(400, 'subject and a body are required');

  if (contact_id) {
    const { data: c } = await supabase.from('contacts').select('id').eq('id', contact_id).eq('user_id', user.id).maybeSingle();
    if (!c) return errorResponse(404, 'Contact not found');
  }

  const isScheduled = scheduled_for && new Date(scheduled_for).getTime() > Date.now() + 30_000;
  const row = {
    user_id: user.id, contact_id: contact_id || null, to_email: to, from_email: from_email || null,
    subject, body_html: body_html || null, body_text: body_text || null, is_inbound: false,
    status: isScheduled ? 'queued' : 'sending', scheduled_for: isScheduled ? new Date(scheduled_for).toISOString() : null,
  };
  const { data: saved, error: insErr } = await supabase.from('emails').insert(row).select('id').maybeSingle();
  if (insErr) return errorResponse(500, `Could not record email: ${insErr.message}`);

  if (isScheduled) {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, queued: true, id: saved.id, scheduled_for: row.scheduled_for }) };
  }

  try {
    const r = await sendEmail(user.id, { to, subject, html: injectTracking(body_html, { emailId: saved.id, baseUrl: process.env.URL }), text: body_text, fromEmail: from_email, fromName: from_name });
    const sentAt = new Date().toISOString();
    await supabase.from('emails').update({ status: 'sent', sent_at: sentAt, message_id: r.messageId || null, provider: r.provider, updated_at: sentAt }).eq('id', saved.id);
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, id: saved.id, message_id: r.messageId, sent_at: sentAt, provider: r.provider }) };
  } catch (err) {
    await supabase.from('emails').update({ status: err.code === 'NO_PROVIDER' ? 'draft' : 'failed', error_message: err.message, updated_at: new Date().toISOString() }).eq('id', saved.id);
    return { statusCode: err.code === 'NO_PROVIDER' ? 412 : 502, headers: CORS_HEADERS, body: JSON.stringify({ success: false, code: err.code || 'SEND_FAILED', error: err.message }) };
  }
});
