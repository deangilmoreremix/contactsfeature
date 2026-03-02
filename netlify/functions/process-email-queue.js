const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

async function sendEmailViaProvider(email, contact) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SDR_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@smartcrm.app';
  const fromName = process.env.SDR_FROM_NAME || 'SmartCRM';

  if (resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [email.to_email],
        subject: email.subject,
        html: email.body_html,
        text: email.body_text
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errBody}`);
    }

    const result = await response.json();
    return { provider: 'resend', messageId: result.id };
  }

  if (sendgridKey) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to_email }] }],
        from: { email: fromEmail, name: fromName },
        subject: email.subject,
        content: [
          { type: 'text/plain', value: email.body_text || email.body_html },
          { type: 'text/html', value: email.body_html || email.body_text }
        ]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errBody}`);
    }

    const messageId = response.headers.get('x-message-id') || '';
    return { provider: 'sendgrid', messageId };
  }

  await supabase.from('emails').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    message_id: `local-${Date.now()}`,
    updated_at: new Date().toISOString()
  }).eq('id', email.id);

  return { provider: 'local', messageId: `local-${email.id}`, note: 'No email provider configured. Email marked as sent locally.' };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

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
        headers: corsHeaders,
        body: JSON.stringify({ processed: 0, message: 'No emails in queue' })
      };
    }

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const email of queuedEmails) {
      try {
        await supabase.from('emails').update({
          send_attempts: (email.send_attempts || 0) + 1,
          updated_at: new Date().toISOString()
        }).eq('id', email.id);

        const sendResult = await sendEmailViaProvider(email, email.contacts);

        await supabase.from('emails').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: sendResult.messageId || null,
          error_message: null,
          updated_at: new Date().toISOString()
        }).eq('id', email.id);

        if (email.autopilot_state_id) {
          await supabase.from('autopilot_state').update({
            last_email_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', email.autopilot_state_id);
        }

        await supabase.from('agent_logs').insert({
          contact_id: email.contact_id,
          user_id: email.user_id,
          agent_type: 'email_processor',
          level: 'info',
          message: `Email sent via ${sendResult.provider}: "${email.subject}"`,
          autopilot_state_id: email.autopilot_state_id
        }).catch(() => {});

        results.push({ emailId: email.id, success: true, provider: sendResult.provider });
        sent++;
      } catch (err) {
        const attempts = (email.send_attempts || 0) + 1;
        const newStatus = attempts >= MAX_RETRIES ? 'failed' : 'queued';

        await supabase.from('emails').update({
          status: newStatus,
          error_message: err.message,
          updated_at: new Date().toISOString()
        }).eq('id', email.id);

        await supabase.from('agent_logs').insert({
          contact_id: email.contact_id,
          user_id: email.user_id,
          agent_type: 'email_processor',
          level: 'error',
          message: `Email send failed (attempt ${attempts}/${MAX_RETRIES}): ${err.message}`,
          autopilot_state_id: email.autopilot_state_id
        }).catch(() => {});

        results.push({ emailId: email.id, success: false, error: err.message, retriesLeft: MAX_RETRIES - attempts });
        failed++;
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ sent, failed, total: queuedEmails.length, results })
    };
  } catch (err) {
    console.error('[process-email-queue] error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Email queue processing failed', details: err.message })
    };
  }
};
