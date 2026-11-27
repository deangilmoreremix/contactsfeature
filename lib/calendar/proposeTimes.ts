import { supabase } from "../core/supabaseClient";
import { proposeTimes as pickSlots } from "./availability";

/**
 * Proposes meeting times from the user's real free slots (business hours, existing
 * calendar_events respected). Deterministic: no AI guessing and no random data.
 */
export async function proposeTimes(
  userId: string,
  opts: { from?: string; to?: string; count?: number; timeZone?: string; durationMinutes?: number } = {}
) {
  const from = opts.from ? new Date(opts.from) : new Date();
  const to = opts.to ? new Date(opts.to) : new Date(from.getTime() + 14 * 86400000);
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, scheduled_for, duration_minutes, status")
    .eq("user_id", userId)
    .gte("scheduled_for", new Date(from.getTime() - 86400000).toISOString())
    .lte("scheduled_for", to.toISOString());
  if (error) throw error;
  return pickSlots(data || [], { ...opts, from: from.toISOString(), to: to.toISOString() });
}
