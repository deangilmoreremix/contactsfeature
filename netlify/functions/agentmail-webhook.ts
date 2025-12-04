import type { Handler } from '@netlify/functions';
import { AgentMailClient } from "agentmail";
import { createClient } from "@supabase/supabase-js";
import type { OutboundAgent } from "../../src/types/outbound-agents";
import { runOutboundAgent, type AgentContext } from "../../src/lib/outboundAgent";

const agentmail = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const payload = JSON.parse(event.body || '{}');
  const eventType = payload.type || payload.event_type;

  // Ignore outgoing messages to avoid loops
  if (eventType === "message.sent") {
    return {
      statusCode: 200,
      body: 'OK'
    };
  }

  const message = payload.message ?? {};
  const inboxId: string | undefined = message.inbox_id;
  const fromField: string = message.from_ || message.from || "";
  const subject: string = message.subject || "(no subject)";
  const text: string = message.text || message.body || "";

  if (!inboxId || !fromField) {
    return {
      statusCode: 200,
      body: 'OK'
    };
  }

  // Clean sender email
  const senderEmail = extractEmail(fromField);

  // 1) Find agent by inbox_email
  const { data: agent, error } = await supabase
    .from("outbound_agents")
    .select("*")
    .eq("inbox_email", inboxId)
    .eq("enabled", true)
    .maybeSingle<OutboundAgent>();

  if (!agent || error) {
    // No agent configured for this inbox; ignore gracefully
    return {
      statusCode: 200,
      body: 'OK'
    };
  }

  // 2) Build context (contact + deals)
  const context = await buildSmartCRMContext(agent, senderEmail);

  // 3) Dispatch to specific agent logic
  const reply = await dispatchOutboundAgent({
    agent,
    senderEmail,
    subject,
    text,
    rawMessage: message,
    context,
  });

  // 4) Optional: send reply via AgentMail if agent decided to respond
  if (reply?.shouldReply && reply.body) {
    await agentmail.inboxes.messages.reply(inboxId, message.message_id, {
      to: senderEmail,
      text: reply.body
    });
  }

  // 5) (Optional) log + update CRM (status, tags, deals, etc.)
  // TODO: Add CRM update logic here

  return {
    statusCode: 200,
    body: 'OK'
  };
};

function extractEmail(fromField: string): string {
  if (fromField.includes("<") && fromField.includes(">")) {
    return fromField.split("<")[1].split(">")[0].trim();
  }
  return fromField.trim();
}

async function buildSmartCRMContext(agent: OutboundAgent, email: string): Promise<AgentContext> {
  // Find or create contact by email
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  const { data: deals } =
    contact && (agent.target_type === "deal" || agent.target_type === "both")
      ? await supabase
          .from("deals")
          .select("*")
          .eq("contact_id", contact.id)
      : { data: [] };

  const contextType: "contact" | "deal" | "both" =
    agent.target_type === "deal"
      ? "deal"
      : agent.target_type === "contact"
      ? "contact"
      : "both";

  return { type: contextType, contact, deals: deals || [] };
}

type DispatchArgs = {
  agent: OutboundAgent;
  senderEmail: string;
  subject: string;
  text: string;
  rawMessage: any;
  context: any;
};

type AgentReply = {
  shouldReply: boolean;
  subject?: string;
  body?: string;
};

async function dispatchOutboundAgent(args: DispatchArgs): Promise<AgentReply> {
  const { agent } = args;

  switch (agent.key) {
    case "authority_outreach":
      return handleAuthorityOutreachAgent(args);
    case "high_ticket_closer":
      return handleHighTicketCloserAgent(args);
    case "nurture_followup":
      return handleNurtureFollowupAgent(args);
    case "partnership_connector":
      return handlePartnershipConnectorAgent(args);
    case "newsletter_growth":
      return handleNewsletterGrowthAgent(args);
    case "reviews_ugc":
      return handleReviewsUGCAgent(args);
    case "reactivation_agent":
      return handleReactivationAgent(args);
    case "product_recommender":
      return handleProductRecommenderAgent(args);
    case "cart_recovery":
      return handleCartRecoveryAgent(args);
    case "launch_promo":
      return handleLaunchPromoAgent(args);
    default:
      return { shouldReply: false };
  }
}

// Agent handler implementations using AI SDK
async function handleAuthorityOutreachAgent(args: DispatchArgs): Promise<AgentReply> {
  const { agent, senderEmail, subject, text, context } = args;

  return await runOutboundAgent({
    systemPrompt: agent.system_prompt || '',
    inboxEmail: agent.inbox_email,
    message: {
      from: senderEmail,
      subject,
      text,
      message_id: args.rawMessage.message_id
    },
    context
  });
}

async function handleHighTicketCloserAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handleNurtureFollowupAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handlePartnershipConnectorAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handleNewsletterGrowthAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handleReviewsUGCAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handleReactivationAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handleProductRecommenderAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handleCartRecoveryAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}

async function handleLaunchPromoAgent(args: DispatchArgs): Promise<AgentReply> {
  // TODO: Implement with AI SDK
  return { shouldReply: false };
}