import { executeTool } from "./mcpExecutor";
import { logger } from "./logger";

/**
 * Maps OpenAI tool / function names → MCP tool calls
 */
export async function openaiFunctionRouter(fnName: string, args: any): Promise<any> {
  logger.info("Routing OpenAI tool call", { fnName, args });

  switch (fnName) {
    //
    // SMARTCRM CORE TOOLS
    //
    case "save_activity":
      return executeTool("SmartCRMTools", "save_activity", args);

    case "update_contact_status":
      return executeTool("SmartCRMTools", "update_contact_status", args);

    case "write_score":
      return executeTool("SmartCRMTools", "write_score", args);

    //
    // EMAIL / AGENTMAIL TOOLS
    //
    case "send_email":
      return executeTool("AgentMail", "send_message", args);

    case "reply_email":
      return executeTool("AgentMail", "reply_to_message", args);

    //
    // CALENDAR TOOLS
    //
    case "schedule_meeting":
      return executeTool("CalendarTools", "schedule_meeting", args);

    case "cancel_meeting":
      return executeTool("CalendarTools", "cancel_meeting", args);

    case "reschedule_meeting":
      return executeTool("CalendarTools", "reschedule_meeting", args);

    //
    // VOICE & VIDEO TOOLS
    //
    case "send_voice_message":
      return executeTool("VoiceAgent", "send_voice_message", args);

    case "create_video":
      return executeTool("VideoAgent", "create_video", args);

    //
    // ANALYTICS / HEATMAP
    //
    case "compute_deal_risk":
      return executeTool("Analytics", "compute_deal_risk", args);

    //
    // AUTOPILOT
    //
    case "trigger_autopilot":
      return executeTool("Agents", "autopilot", args);

    default:
      logger.warn("Unknown OpenAI function routed", { fnName, args });
      throw new Error(`Unknown OpenAI function: ${fnName}`);
  }
}
