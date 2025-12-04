import { callOpenAI, ToolDefinition } from "../core/callOpenAI";
import { logger } from "../core/logger";
import { AutopilotContext } from "./state";
import { AUTOPILOT_EVENTS } from "./events";
import { logAutopilotEvent, updateAutopilotState } from "./helpers";
import { applyMood } from "../mood/applyMood";
import { determineMood } from "../mood/determineMood";
import { buildMemoryPrompt } from "../memory/memoryPrompt";

const sdrTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an outbound email to the prospect",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_activity",
      description: "Save an SDR activity to SmartCRM",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          activity: { type: "object" }
        },
        required: ["contact_id", "activity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_contact_status",
      description: "Update the contact status in SmartCRM",
      parameters: {
        type: "object",
        properties: {
          cid: { type: "string" },
          new_status: { type: "string" }
        },
        required: ["cid", "new_status"]
      }
    }
  }
];

export async function handleNewLead(contactId: string, ctx: AutopilotContext) {
  const { contact, deal, memory } = ctx;

  const mood = determineMood(contact, deal);
  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);

  const basePrompt = `
You are an SDR for SmartCRM. Your job is to send the **first outbound message** to this new lead.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Use a short, clear, benefit-driven email that aims to start a conversation – NOT to hard-close.
${memoryBlock}
  `;

  const finalPrompt = applyMood(basePrompt, mood);

  await logAutopilotEvent(contactId, "new", AUTOPILOT_EVENTS.NEW_LEAD, {
    mood
  });

  const res = await callOpenAI(finalPrompt, {
    tools: sdrTools,
    systemPrompt:
      "You are SmartCRM SDR Autopilot. Always call tools instead of outputting direct plain text emails."
  });

  logger.info("New lead SDR autopilot result", { contactId, res });

  await updateAutopilotState(contactId, "sdr_outreach");

  return res;
}

export async function handleEngagedLead(contactId: string, ctx: AutopilotContext) {
  const { contact, deal, memory } = ctx;

  const mood = determineMood(contact, deal);
  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);

  const basePrompt = `
You are an SDR following up with an engaged lead.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Task:
- Reference the last message or interaction.
- Move them closer to a clear YES/NO about a meeting or call.
${memoryBlock}
  `;

  const finalPrompt = applyMood(basePrompt, mood);

  await logAutopilotEvent(
    contactId,
    "engaged",
    AUTOPILOT_EVENTS.FOLLOWUP_REQUIRED,
    { mood }
  );

  const res = await callOpenAI(finalPrompt, {
    tools: sdrTools,
    systemPrompt:
      "You are SmartCRM SDR Autopilot. Use tools (send_email, save_activity, update_contact_status)."
  });

  return res;
}

export async function handleAwaitingNextStep(
  contactId: string,
  ctx: AutopilotContext
) {
  const { contact, deal, memory } = ctx;

  const mood = determineMood(contact, deal);
  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);

  const basePrompt = `
You are following up on a deal that is **awaiting next step**.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Goal:
- Clarify the next step.
- Remove confusion.
- Keep momentum without being pushy.
${memoryBlock}
  `;

  const finalPrompt = applyMood(basePrompt, mood);

  await logAutopilotEvent(
    contactId,
    "awaiting_next_step",
    AUTOPILOT_EVENTS.FOLLOWUP_REQUIRED,
    { mood }
  );

  const res = await callOpenAI(finalPrompt, {
    tools: sdrTools,
    systemPrompt:
      "You are SmartCRM SDR Autopilot. Use tools instead of raw email text."
  });

  return res;
}
