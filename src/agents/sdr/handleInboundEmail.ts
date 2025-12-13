/**
 * AgentMail Inbound Email Handler
 * Processes incoming emails and resumes SDR Autopilot campaigns
 */

import { supabase } from "../../lib/supabase";
import { resumeSdrAutopilot } from "./runSdrAutopilot";

export interface AgentMailWebhookPayload {
  id: string;
  from: string;
  to: string;
  subject: string;
  body_html: string;
  body_text?: string;
  timestamp: string;
  mailbox_key: string;
  thread_id?: string;
  attachments?: any[];
}

export interface WebhookResponse {
  ok: boolean;
  processed?: boolean;
  lead_id?: string;
  autopilot_resumed?: boolean;
  error?: string;
}

/**
 * Main webhook handler for AgentMail inbound emails
 */
export async function handleInboundEmail(payload: AgentMailWebhookPayload): Promise<WebhookResponse> {
  try {
    console.log('Processing inbound email:', {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      mailbox_key: payload.mailbox_key
    });

    // Step 1: Find the lead by email address
    const leadId = await findLeadByEmail(payload.from);
    if (!leadId) {
      console.log('No lead found for email:', payload.from);
      return {
        ok: true,
        processed: false,
        error: 'No matching lead found'
      };
    }

    // Step 2: Check if this lead has an active SDR Autopilot
    const autopilotState = await checkAutopilotStatus(leadId);
    if (!autopilotState || autopilotState.status !== 'active') {
      console.log('No active SDR Autopilot for lead:', leadId);
      // Still log the email for reference
      await logInboundEmail(payload, leadId);
      return {
        ok: true,
        processed: true,
        lead_id: leadId,
        autopilot_resumed: false
      };
    }

    // Step 3: Log the inbound email
    await logInboundEmail(payload, leadId);

    // Step 4: Prepare email content for SDR agent
    const emailContext = formatEmailForAgent(payload);

    // Step 5: Resume SDR Autopilot with the new email
    const result = await resumeSdrAutopilot(
      leadId,
      emailContext,
      payload.mailbox_key
    );

    console.log('SDR Autopilot resumed for lead:', leadId, {
      completed: result.completed,
      error: result.error
    });

    return {
      ok: true,
      processed: true,
      lead_id: leadId,
      autopilot_resumed: result.completed
    };

  } catch (error) {
    console.error('Error handling inbound email:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Find lead by email address
 */
async function findLeadByEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error finding lead by email:', error);
    return null;
  }
}

/**
 * Check if lead has active SDR Autopilot
 */
async function checkAutopilotStatus(leadId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('autopilot_state')
      .select('state_json, status')
      .eq('lead_id', leadId)
      .eq('agent_type', 'sdr_autopilot')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...data.state_json,
      status: data.status
    };
  } catch (error) {
    console.error('Error checking autopilot status:', error);
    return null;
  }
}

/**
 * Log inbound email to CRM
 */
async function logInboundEmail(payload: AgentMailWebhookPayload, leadId: string): Promise<void> {
  try {
    await supabase
      .from('emails')
      .insert({
        contact_id: leadId,
        from_email: payload.from,
        to_email: payload.to,
        subject: payload.subject,
        body_html: payload.body_html,
        body_text: payload.body_text,
        received_at: payload.timestamp,
        direction: 'inbound',
        mailbox_key: payload.mailbox_key,
        thread_id: payload.thread_id,
        status: 'received',
        source: 'agentmail_webhook'
      });
  } catch (error) {
    console.error('Error logging inbound email:', error);
    // Don't throw - we don't want email logging to break the webhook
  }
}

/**
 * Format email content for SDR agent processing
 */
function formatEmailForAgent(payload: AgentMailWebhookPayload): string {
  const emailContent = `
New inbound email from lead:

From: ${payload.from}
To: ${payload.to}
Subject: ${payload.subject}
Received: ${payload.timestamp}
Mailbox: ${payload.mailbox_key}

Email Body:
${payload.body_text || extractTextFromHtml(payload.body_html)}

${payload.attachments && payload.attachments.length > 0 ?
  `Attachments: ${payload.attachments.map(att => att.filename).join(', ')}` :
  ''
}

Please analyze this email and decide the appropriate next action for the SDR campaign.
Consider:
- Is this a positive response, objection, or question?
- Should we reply, schedule a meeting, update pipeline, or adjust the campaign?
- What tone and messaging should we use in any response?
- Are there any follow-up actions needed?
`.trim();

  return emailContent;
}

/**
 * Extract plain text from HTML (basic implementation)
 */
function extractTextFromHtml(html: string): string {
  // Basic HTML to text conversion
  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Express.js route handler for AgentMail webhook
 * Usage: POST /api/webhooks/agentmail/inbound
 */
export async function agentMailWebhookHandler(req: any, res: any) {
  try {
    const payload: AgentMailWebhookPayload = req.body;

    // Validate required fields
    if (!payload.from || !payload.to || !payload.subject) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: from, to, subject'
      });
    }

    // Process the email
    const result = await handleInboundEmail(payload);

    // Return appropriate HTTP status
    if (result.ok) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Netlify Function handler
 * Usage: POST /.netlify/functions/agentmail-inbound
 */
export async function netlifyAgentMailHandler(event: any) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const payload: AgentMailWebhookPayload = JSON.parse(event.body);

    // Validate required fields
    if (!payload.from || !payload.to || !payload.subject) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: 'Missing required fields: from, to, subject'
        })
      };
    }

    // Process the email
    const result = await handleInboundEmail(payload);

    return {
      statusCode: result.ok ? 200 : 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Netlify function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error'
      })
    };
  }
}