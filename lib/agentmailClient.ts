import { AgentMailClient, AgentMail, AgentMailError, logging } from "agentmail";

const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY! });

export const agentmailClient = client;

export async function createInbox(params: AgentMail.CreateInboxRequest): Promise<AgentMail.Inbox> {
  try {
    return await client.inboxes.create(params);
  } catch (error) {
    if (error instanceof AgentMailError) {
      logging.error('Failed to create inbox:', error);
    }
    throw error;
  }
}

export async function createWebhook(params: AgentMail.CreateWebhookRequest): Promise<AgentMail.Webhook> {
  try {
    return await client.webhooks.create(params);
  } catch (error) {
    if (error instanceof AgentMailError) {
      logging.error('Failed to create webhook:', error);
    }
    throw error;
  }
}

export async function replyToMessage({ inboxId, messageId, to, text }: { inboxId: string; messageId: string; to: string; text: string }) {
  try {
    return await client.inboxes.messages.reply(inboxId, messageId, { to, text });
  } catch (error) {
    if (error instanceof AgentMailError) {
      logging.error('Failed to reply to message:', error);
    }
    throw error;
  }
}
