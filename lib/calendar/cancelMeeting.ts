import { supabase } from "../core/supabaseClient";

export async function cancelMeeting(eventId: string, userId?: string) {
  let q = supabase.from("calendar_events").update({ status: "cancelled" }).eq("id", eventId);
  if (userId) q = q.eq("user_id", userId);
  const { error } = await q;
  if (error) throw error;
  return { success: true };
}
