import { callOpenAI, ToolDefinition } from "../core/callOpenAI";
import { logger } from "../core/logger";
import { AutopilotContext } from "./state";
import { AUTOPILOT_EVENTS } from "./events";
import { logAutopilotEvent, updateAutopilotState } from "./helpers";
import { applyMood } from "../mood/applyMood";
import { determineMood } from "../mood/determineMood";
import { buildMemoryPrompt } from "../memory/memoryPrompt";

const aeTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send AE follow-up email",
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
      name: "schedule_meeting",
      description: "Schedule a meeting in SmartCRM Calendar",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          datetime: { type: "string" }
        },
        required: ["contact_id", "datetime"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_activity",
      description: "Save an AE activity to SmartCRM",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          activity: { type: "object" }
        },
        required: ["contact_id", "activity"]
      }
    }
  }
];

export async function handleInterested(contactId: string, ctx: AutopilotContext) {
  const { contact, deal, memory } = ctx;

  const mood = determineMood(contact, deal);
  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);

  const basePrompt = `
You are the AE (Account Executive).

The lead is **interested**. Your job:
- Clarify key value props.
- Suggest specific times for a demo or strategy call.
- Keep it concise and clear.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

${memoryBlock}
  `;

  const finalPrompt = applyMood(basePrompt, mood);

  await logAutopilotEvent(contactId, "interested", AUTOPILOT_EVENTS.INTEREST, {
    mood
  });

  const res = await callOpenAI(finalPrompt, {
    tools: aeTools,
    systemPrompt:
      "You are SmartCRM AE Autopilot. Use tools (schedule_meeting, send_email, save_activity)."
  });

  // After AE outreach, state moves to meeting_scheduled or awaiting_next_step.
  await updateAutopilotState(contactId, "meeting_scheduled");

  return res;
}

export async function handleMeetingScheduled(
  contactId: string,
  ctx: AutopilotContext
) {
  const { contact, deal, memory } = ctx;

  const mood = determineMood(contact, deal);
  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);

  const basePrompt = `
You are the AE preparing a pre-meeting confirmation and expectation-setting email.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Goal:
- Confirm the meeting.
- Set expectations.
- Ask 1–2 key questions to make the meeting more productive.
${memoryBlock}
  `;

  const finalPrompt = applyMood(basePrompt, mood);

  await logAutopilotEvent(
    contactId,
    "meeting_scheduled",
    AUTOPILOT_EVENTS.MEETING_BOOKED,
    { mood }
  );

  const res = await callOpenAI(finalPrompt, {
    tools: aeTools,
    systemPrompt:
      "You are SmartCRM AE Autopilot. Use send_email + save_activity to prepare meeting."
  });

  // After confirmation, we wait for next step.
  await updateAutopilotState(contactId, "awaiting_next_step");

  return res;
}
