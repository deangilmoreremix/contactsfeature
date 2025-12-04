import { supabase } from "../core/supabaseClient";

export async function cancelMeeting(eventId: string) {
  await supabase
    .from("calendar_events")
    .update({ status: "cancelled" })
    .eq("id", eventId);

  return { success: true };
}
