import { supabase } from "../core/supabaseClient";
import { executeTool } from "../core/mcpExecutor";

export async function scheduleMeeting(contactId: string, datetime: string) {
  const { error } = await supabase.from("calendar_events").insert({
    contact_id: contactId,
    scheduled_for: datetime,
    status: "scheduled"
  });

  if (error) throw error;

  await executeTool("AgentMail.send_message", {
    to: contactId,
    subject: "Your meeting is confirmed",
    body: `Your meeting is scheduled for ${datetime}.`
  });

  return { success: true };
}
