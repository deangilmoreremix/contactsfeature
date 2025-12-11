Identify and fix any production readiness issues	Pending
8	Test build and deployment readiness	Pending// netlify/functions/_aiClients.js
const OpenAI = require("openai");
const { AgentMail } = require("agentmail");
const { AgentMailToolkit } = require("agentmail-toolkit");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const agentmail = new AgentMail({
  apiKey: process.env.AGENTMAIL_API_KEY,
});

const toolkit = new AgentMailToolkit(agentmail);

/**
 * Build the SmartCRM SDR Agent with AgentMail tools attached.
 */
function buildSdrAgent({ agentId, personaId, sequenceLength, step, contact }) {
  const instructions = `You are an AI SDR for SmartCRM called "${agentId}".
Your job is to send step ${step} of a ${sequenceLength}-day outbound campaign.

AGENT PROFILE:
- Type: ${agentId}
- Persona: ${personaId || "friendly"}
- Speak in a natural, human, conversational tone.
- Do NOT sound like a robot.
- Focus on: ${contact?.company || "their business"} and how SmartCRM helps them close more deals.

Rules:
- Keep emails short, clear, and focused on getting a reply.
- Suggest a next step (reply, call, or demo) but don't be pushy.
- Respect quiet hours (don't schedule emails for the user's night time if provided).
- DO NOT invent facts about SmartCRM that aren't true. Focus on CRM, AI automations, AI SDR, and pipeline intelligence.`;

  // Note: Using OpenAI's standard API instead of Agents SDK for now
  // The toolkit provides AgentMail tools that can be used with function calling
  const tools = toolkit.get_tools();

  return {
    instructions,
    tools,
    agentId,
    personaId,
    contact
  };
}

/**
 * SmartCRM AE Demo Agent
 * - Takes over after a positive reply
 * - Goal: move them to a booked meeting / clear next step
 * - Still uses AgentMail tools, but tone is more consultative.
 */
function buildAeAgent({ aeId, personaId, productName, contact }) {
  const instructions = `
You are an AI Account Executive (AE) for a product called "${productName || "SmartCRM"}".
Your job is to handle interested leads and move them toward a meeting, demo, or clear next step.

Persona:
- AE Persona: ${personaId || "trusted_advisor"}
- Tone: Expert, calm, confident, helpful.
- You sound like a real human AE: you listen, clarify, and propose clear next steps.

Rules:
- Acknowledge their interest or question.
- Keep replies concise and specific (no fluffy generic AI tone).
- If they seem ready, propose a clear meeting time-window or send a scheduling link (if provided by the user).
- If they have questions, answer them clearly step-by-step.
- Do NOT invent features. Focus on CRM, AI automations, AI SDR, pipeline intelligence, and analytics.
- When appropriate, use AgentMail tools to reply in the existing thread, not start a brand-new email thread.
`;

  const tools = toolkit.get_tools();

  const agent = new Agent({
    name: `SmartCRM AE - ${aeId || "ae_demo_agent"}`,
    instructions,
    tools,
    model: "gpt-4.1-mini",
  });

  const runner = new Runner({
    client: openai,
    agents: [agent],
  });

  return { agent, runner };
}

module.exports = {
  openai,
  agentmail,
  toolkit,
  buildSdrAgent,
  buildAeAgent,
};