import { supabase } from "../core/supabaseClient";
import { executeTool } from "../core/mcpExecutor";

export async function rescheduleMeeting(eventId: string, newDatetime: string) {
  await supabase
    .from("calendar_events")
    .update({ scheduled_for: newDatetime })
    .eq("id", eventId);

  await executeTool("AgentMail.send_message", {
    subject: "Your meeting has been rescheduled",
    body: `New meeting time: ${newDatetime}`
  });

  return { success: true };
}
