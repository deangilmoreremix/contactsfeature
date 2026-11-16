const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { sendEmail } = require('./_messaging');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('process-email-queue');

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

async function sendEmailViaProvider(email) {
  // Uses the owning user's own provider; throws NO_PROVIDER when none is configured so the
  // email is never marked as sent without actually being delivered.
  const result = await sendEmail(email.user_id, {
    to: email.to_email,
    subject: email.subject,
    html: email.body_html,
    text: email.body_text,
    fromEmail: email.from_email || undefined,
  });
  return { provider: result.provider, messageId: result.messageId };
}

async function processQueue() {
  log.setCorrelationId(generateCorrelationId());

  try {
    const now = new Date().toISOString();

    const { data: queuedEmails, error: queueError } = await supabase
      .from('emails')
      .select('*, contacts!emails_contact_id_fkey(firstname, name, email, company)')
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .lt('send_attempts', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queueError) {
      throw new Error(`Failed to query email queue: ${queueError.message}`);
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      return { processed: 0, sent: 0, failed: 0, total: 0, results: [], message: 'No emails in queue' };
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const email of queuedEmails) {
      try {
        await supabase.from('emails').update({
          send_attempts: (email.send_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', email.id);

        const sendResult = await sendEmailViaProvider(email);

        await supabase.from('emails').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: sendResult.messageId || null,
          error_message: null,
          updated_at: new Date().toISOString(),
        }).eq('id', email.id);

        if (email.autopilot_state_id) {
          await supabase.from('autopilot_state').update({
            last_email_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', email.autopilot_state_id);
        }

        await supabase.from('agent_logs').insert({
          contact_id: email.contact_id,
          user_id: email.user_id,
          agent_type: 'email_processor',
          level: 'info',
          message: `Email sent via ${sendResult.provider}`,
          autopilot_state_id: email.autopilot_state_id,
        }).catch(() => {});

        results.push({ emailId: email.id, success: true, provider: sendResult.provider });
        sent++;
      } catch (err) {
        const attempts = (email.send_attempts || 0) + 1;
        // Without a configured provider nothing can ever succeed: park as draft instead of retrying.
        const newStatus = err.code === 'NO_PROVIDER' ? 'draft' : attempts >= MAX_RETRIES ? 'failed' : 'queued';

        await supabase.from('emails').update({
          status: newStatus,
          error_message: err.message,
          updated_at: new Date().toISOString(),
        }).eq('id', email.id);

        await supabase.from('agent_logs').insert({
          contact_id: email.contact_id,
          user_id: email.user_id,
          agent_type: 'email_processor',
          level: 'error',
          message: `Email send failed (attempt ${attempts}/${MAX_RETRIES})`,
          autopilot_state_id: email.autopilot_state_id,
        }).catch(() => {});

        results.push({ emailId: email.id, success: false, retriesLeft: MAX_RETRIES - attempts });
        failed++;
      }
    }

    log.info('Email queue processed', { sent, failed, total: queuedEmails.length });

    return { sent, failed, total: queuedEmails.length, results };
  } catch (err) {
    log.error('Email queue processing failed', { error: err.message });
    throw err;
  }
}

// Manual trigger (authenticated). Scheduled runs use process-email-queue-scheduled.js.
exports.handler = withAuth(async () => {
  try {
    const out = await processQueue();
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(out) };
  } catch {
    return errorResponse(500, 'Email queue processing failed');
  }
});
exports.processQueue = processQueue;
