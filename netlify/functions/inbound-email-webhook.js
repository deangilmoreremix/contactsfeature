const { supabase } = require('./_supabaseClient');
const { CORS_HEADERS, errorResponse } = require('./_auth');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('inbound-email-webhook');

async function findContactByEmail(fromEmail) {
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', fromEmail)
    .maybeSingle();
  return data;
}

async function generateAutoReply(contact, inboundSubject, inboundBody, autopilotState) {
  const contactName = contact.firstname || contact.name || 'there';

  const { data: sentEmails } = await supabase
    .from('emails')
    .select('subject, body_text')
    .eq('contact_id', contact.id)
    .eq('is_inbound', false)
    .order('created_at', { ascending: false })
    .limit(3);

  const previousContext = sentEmails && sentEmails.length > 0
    ? `Previous emails sent:\n${sentEmails.map(e => `Subject: ${e.subject}\nBody: ${e.body_text}`).join('\n---\n')}`
    : 'No previous emails found.';

  const prompt = `A prospect has replied to our SDR outreach. Generate an appropriate follow-up response.

Contact: ${contactName} at ${contact.company || 'unknown company'}
Their reply subject: ${inboundSubject}
Their reply body: ${inboundBody}

${previousContext}

Rules:
- Acknowledge their reply specifically
- If they expressed interest, suggest a meeting time
- If they had a question, answer it helpfully
- If they want to unsubscribe/stop, be gracious and confirm
- Keep it concise and natural
- Do NOT be pushy

Return JSON with "subject" and "body" fields.`;

  try {
    const content = await callOpenAI(
      [
        { role: 'system', content: 'You are a skilled SDR handling inbound replies. Be helpful, concise, and human. Return valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.6, maxTokens: 800 }
    );

    return parseJSONResponse(content, null);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  log.setCorrelationId(generateCorrelationId());

  try {
    const body = JSON.parse(event.body || '{}');
    const { from, to, subject, text, html, messageId, inReplyTo } = body;

    if (!from) {
      return errorResponse(400, 'from email is required');
    }

    const fromEmail = typeof from === 'string' ? from : (from.email || from.address || from);
    const contact = await findContactByEmail(fromEmail);

    if (!contact) {
      await supabase.from('agent_logs').insert({
        agent_type: 'inbound_webhook',
        level: 'warn',
        message: `Inbound email from unknown contact`,
        metadata: { subject },
      }).catch(() => {});

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ processed: false, reason: 'Contact not found' }),
      };
    }

    await supabase.from('emails').insert({
      contact_id: contact.id,
      from_email: fromEmail,
      to_email: typeof to === 'string' ? to : (to?.email || to?.address || ''),
      subject: subject || '(no subject)',
      body_html: html || text || '',
      body_text: text || '',
      status: 'received',
      message_id: messageId || null,
      thread_id: inReplyTo || null,
      is_inbound: true,
      user_id: contact.user_id || null,
    });

    const { data: autopilotState } = await supabase
      .from('autopilot_state')
      .select('*')
      .eq('lead_id', contact.id)
      .eq('agent_type', 'sdr_autopilot')
      .eq('status', 'active')
      .maybeSingle();

    if (autopilotState) {
      await supabase.from('autopilot_state').update({
        last_reply_at: new Date().toISOString(),
        state_json: {
          ...autopilotState.state_json,
          last_reply_subject: subject,
          last_reply_preview: (text || '').substring(0, 200),
        },
        updated_at: new Date().toISOString(),
      }).eq('id', autopilotState.id);

      await supabase.from('autopilot_logs').insert({
        contact_id: contact.id,
        state: autopilotState.current_stage || 'sdr_outreach',
        event: 'REPLY_RECEIVED',
        details: { subject, preview: (text || '').substring(0, 200) },
      }).catch(() => {});

      const bodyLower = (text || '').toLowerCase();
      const isUnsubscribe = bodyLower.includes('unsubscribe') ||
        bodyLower.includes('stop emailing') ||
        bodyLower.includes('remove me') ||
        bodyLower.includes('opt out');

      if (isUnsubscribe) {
        await supabase.from('autopilot_state').update({
          status: 'stopped',
          state_json: { ...autopilotState.state_json, stopped_reason: 'unsubscribe_request' },
          updated_at: new Date().toISOString(),
        }).eq('id', autopilotState.id);

        await supabase.from('agent_logs').insert({
          contact_id: contact.id,
          user_id: autopilotState.user_id,
          agent_type: 'inbound_webhook',
          level: 'info',
          message: 'Autopilot stopped: contact requested to unsubscribe',
          autopilot_state_id: autopilotState.id,
        }).catch(() => {});

        log.info('Contact unsubscribed', { contactId: contact.id });

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ processed: true, action: 'unsubscribed', contactId: contact.id }),
        };
      }

      const isPositive = bodyLower.includes('interested') ||
        bodyLower.includes('tell me more') ||
        bodyLower.includes('schedule') ||
        bodyLower.includes('meeting') ||
        bodyLower.includes('demo') ||
        bodyLower.includes('call');

      if (isPositive) {
        await supabase.from('contacts').update({
          interestlevel: 'hot',
          status: 'prospect',
          updatedat: new Date().toISOString(),
        }).eq('id', contact.id);

        await supabase.from('autopilot_state').update({
          current_stage: 'meeting_requested',
          state_json: { ...autopilotState.state_json, interest_detected: true },
          updated_at: new Date().toISOString(),
        }).eq('id', autopilotState.id);
      }

      const { data: agentSettings } = await supabase
        .from('contact_agent_settings')
        .select('followup_mode')
        .eq('contact_id', contact.id)
        .maybeSingle();

      const autoReplyMode = agentSettings?.followup_mode || 'manual';

      if (autoReplyMode !== 'manual') {
        const autoReply = await generateAutoReply(contact, subject, text, autopilotState);

        if (autoReply) {
          await supabase.from('emails').insert({
            contact_id: contact.id,
            to_email: fromEmail,
            subject: autoReply.subject,
            body_html: autoReply.body,
            body_text: autoReply.body,
            status: 'queued',
            agent_type: 'auto_reply',
            autopilot_state_id: autopilotState.id,
            is_inbound: false,
            user_id: autopilotState.user_id || contact.user_id || null,
          });

          log.info('Auto-reply queued', { contactId: contact.id });
        }
      }
    }

    log.info('Inbound email processed', { contactId: contact.id, autopilotActive: !!autopilotState });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        processed: true,
        contactId: contact.id,
        autopilotActive: !!autopilotState,
      }),
    };
  } catch (err) {
    log.error('Failed to process inbound email', { error: err.message });
    return errorResponse(500, 'Failed to process inbound email');
  }
};
