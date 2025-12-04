import type { Handler } from '@netlify/functions';
import { AgentMailClient } from 'agentmail';
import { runOutboundAgent } from '../../src/agents/runOutboundAgent';
import { getContactAgentSettings } from '../../src/server/contactAgentSettings';
import { OUTBOUND_PERSONAS } from '../../src/agents/personas';

const agentmailClient = new AgentMailClient({
  apiKey: process.env.AGENTMAIL_API_KEY!,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    const eventType = payload.type || payload.event_type;
    if (!eventType) {
      return { statusCode: 200, body: 'No event type' };
    }

    // Avoid loops
    if (eventType === 'message.sent') {
      return { statusCode: 200, body: 'Ignoring sent messages' };
    }

    const message = payload.message || {};
    const inboxId: string | undefined = message.inbox_id;
    const fromField: string = message.from_ || message.from || '';
    const subject: string = message.subject || '(no subject)';
    const textBody: string = message.text || message.body || '';
    const threadId: string | undefined = message.thread_id;
    const messageId: string | undefined = message.message_id;

    if (!inboxId || !fromField) {
      return { statusCode: 200, body: 'Missing core fields' };
    }

    // Extract just the email from "Name <email@domain.com>"
    const senderEmail = fromField.includes('<')
      ? fromField.split('<')[1].split('>')[0].trim()
      : fromField.trim();

    // Look up contact by email to get agent settings
    // For now, we'll need to query contacts table - this is a simplified version
    // In production, you'd want to create a helper function for this
    const contactQuery = `
      SELECT id, name, email FROM contacts WHERE email = $1 LIMIT 1
    `;
    // Note: In a real implementation, you'd use the Supabase client here
    // For now, we'll assume we have the contact info or create a placeholder

    // For this demo, we'll use a placeholder contact - in real implementation
    // you'd query the contacts table by email
    const mockContact = {
      id: 'placeholder-contact-id',
      name: 'Unknown Contact',
      email: senderEmail
    };

    // Get agent settings for this contact
    const settings = await getContactAgentSettings(mockContact.id);

    // Fall back to default persona if none is set
    const personaId = settings?.persona_id || 'founder-b2b';

    // Only proceed if agent is enabled for this contact
    if (!settings?.is_enabled) {
      console.log('Agent not enabled for contact:', mockContact.id);
      return { statusCode: 200, body: 'Agent not enabled for this contact' };
    }

    const result = await runOutboundAgent({
      personaId,
      inboxEmail: inboxId,
      message: {
        from: senderEmail,
        subject,
        body: textBody,
        threadId,
        messageId,
      },
      context: {
        contactId: mockContact.id,
        contactName: mockContact.name,
        contactEmail: mockContact.email,
      },
    });

    // If you want to listen to tool calls / logs, you can consume the stream here.
    // For now we just trigger and return 200.
    console.log('Outbound agent triggered for', senderEmail);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err: any) {
    console.error('AgentMail webhook error', err);
    return {
      statusCode: 200, // still 200 so AgentMail doesn't keep retrying
      body: 'Error handled',
    };
  }
};