import { executeTool } from "./mcpExecutor";
import { supabase } from "./supabaseClient";
import { logger } from "./logger";

async function queueEmail(args: any): Promise<any> {
  const { error } = await supabase.from("emails").insert({
    contact_id: args.contact_id || args.lead_id,
    to_email: args.to,
    subject: args.subject,
    body_html: args.body_html || args.body,
    body_text: args.body_text || args.body,
    status: "queued",
    agent_type: args.agent_type || "sdr",
    is_inbound: false,
    user_id: args.user_id || null,
  });

  if (error) {
    logger.error("Failed to queue email", { error, args });
    throw new Error(`Failed to queue email: ${error.message}`);
  }

  return { success: true, queued: true, to: args.to, subject: args.subject };
}

export async function openaiFunctionRouter(fnName: string, args: any): Promise<any> {
  logger.info("Routing OpenAI tool call", { fnName, args });

  switch (fnName) {
    case "save_activity":
      return executeTool("SmartCRMTools", "save_activity", args);

    case "update_contact_status":
      return executeTool("SmartCRMTools", "update_contact_status", args);

    case "write_score":
      return executeTool("SmartCRMTools", "write_score", args);

    case "send_email":
    case "reply_email":
    case "send_sdr_email":
      return queueEmail(args);

    case "schedule_meeting":
      return executeTool("CalendarTools", "schedule_meeting", args);

    case "cancel_meeting":
      return executeTool("CalendarTools", "cancel_meeting", args);

    case "reschedule_meeting":
      return executeTool("CalendarTools", "reschedule_meeting", args);

    case "send_voice_message":
      return executeTool("VoiceAgent", "send_voice_message", args);

    case "create_video":
      return executeTool("VideoAgent", "create_video", args);

    case "compute_deal_risk":
      return executeTool("Analytics", "compute_deal_risk", args);

    case "trigger_autopilot":
      return executeTool("Agents", "autopilot", args);

    default:
      logger.warn("Unknown OpenAI function routed", { fnName, args });
      throw new Error(`Unknown OpenAI function: ${fnName}`);
  }
}
