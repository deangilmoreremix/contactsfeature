const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { fetchWithTimeout } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('process-email-queue');

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

async function sendEmailViaProvider(email) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SDR_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@smartcrm.app';
  const fromName = process.env.SDR_FROM_NAME || 'SmartCRM';

  if (resendKey) {
    const response = await fetchWithTimeout(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [email.to_email],
          subject: email.subject,
          html: email.body_html,
          text: email.body_text,
        }),
      },
      15000
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Resend API error: ${response.status}`);
    }

    const result = await response.json();
    return { provider: 'resend', messageId: result.id };
  }

  if (sendgridKey) {
    const response = await fetchWithTimeout(
      'https://api.sendgrid.com/v3/mail/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: email.to_email }] }],
          from: { email: fromEmail, name: fromName },
          subject: email.subject,
          content: [
            { type: 'text/plain', value: email.body_text || email.body_html },
            { type: 'text/html', value: email.body_html || email.body_text },
          ],
        }),
      },
      15000
    );

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.status}`);
    }

    const messageId = response.headers.get('x-message-id') || '';
    return { provider: 'sendgrid', messageId };
  }

  await supabase.from('emails').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    message_id: `local-${Date.now()}`,
    updated_at: new Date().toISOString(),
  }).eq('id', email.id);

  return { provider: 'local', messageId: `local-${email.id}` };
}

exports.handler = withAuth(async (event, user) => {
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
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ processed: 0, message: 'No emails in queue' }),
      };
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
        const newStatus = attempts >= MAX_RETRIES ? 'failed' : 'queued';

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

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ sent, failed, total: queuedEmails.length, results }),
    };
  } catch (err) {
    log.error('Email queue processing failed', { error: err.message });
    return errorResponse(500, 'Email queue processing failed');
  }
});
