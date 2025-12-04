import { getContactAndDeal, logAutopilotEvent } from "./helpers";
import { loadAgentMemory } from "../memory/loadMemory";
import { AutopilotContext, AutopilotState } from "./state";
import { handleNewLead, handleEngagedLead, handleAwaitingNextStep } from "./sdrHandlers";
import { handleInterested, handleMeetingScheduled } from "./aeHandlers";
import { runPipelineAI } from "./pipelineAI";
import { logger } from "../core/logger";

/**
 * Main Autopilot entry.
 *
 * This should be called by:
 *  - Netlify cron (daily sweep)
 *  - Webhooks (e.g. AgentMail reply)
 *  - Manual trigger (button in UI)
 */
export async function runAutopilot(contactId: string) {
  const { contact, deal } = await getContactAndDeal(contactId);
  const memory = await loadAgentMemory(contactId);

  const ctx: AutopilotContext = {
    contact,
    deal,
    memory
  };

  const state = (contact.autopilot_state || "new") as AutopilotState;

  logger.info("Running Autopilot", { contactId, state });

  switch (state) {
    case "new":
      return handleNewLead(contactId, ctx);

    case "sdr_outreach":
    case "engaged":
      return handleEngagedLead(contactId, ctx);

    case "interested":
      return handleInterested(contactId, ctx);

    case "meeting_scheduled":
      await handleMeetingScheduled(contactId, ctx);
      return runPipelineAI(ctx);

    case "awaiting_next_step":
      return handleAwaitingNextStep(contactId, ctx);

    case "closed_won":
    case "closed_lost":
      await logAutopilotEvent(contactId, state, "AUTOPILOT_STOP", {
        reason: "Deal already closed."
      });
      return { status: "stopped", state };

    default:
      logger.warn("Unknown autopilot state", { state, contactId });
      return null;
  }
}
