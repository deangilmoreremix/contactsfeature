import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import type { OutboundAgent } from '../types/outbound-agents';

export type AgentContext = {
  type: "contact" | "deal" | "both";
  contact: any;
  deals: any[];
};

export type AgentReply = {
  shouldReply: boolean;
  subject?: string;
  body?: string;
};

export type RunAgentArgs = {
  systemPrompt: string;
  inboxEmail: string;
  message: {
    from: string;
    subject: string;
    text: string;
    message_id: string;
  };
  context: AgentContext;
};

export async function runOutboundAgent({
  systemPrompt,
  message,
  context,
}: RunAgentArgs): Promise<AgentReply> {
  try {
    const result = await streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `
Incoming message from: ${message.from}
Subject: ${message.subject}
Body: ${message.text}

Context: ${JSON.stringify(context, null, 2)}

Please respond appropriately based on your role and the context provided.
If you should reply, provide a clear, concise response.
If you should not reply, indicate that you should not respond.
          `.trim(),
        }
      ],
    });

    const response = await result.text;

    const shouldReply = !response.toLowerCase().includes('do not reply') &&
                       !response.toLowerCase().includes('no response') &&
                       response.length > 10;

    if (shouldReply) {
      return {
        shouldReply: true,
        body: response.trim(),
      };
    }

    return { shouldReply: false };
  } catch (error) {
    console.error('Error running outbound agent:', error);
    return { shouldReply: false };
  }
}

export async function getOutboundAgent(key: string): Promise<OutboundAgent | null> {
  return null;
}
