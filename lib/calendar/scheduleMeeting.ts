import { supabase } from "../core/supabaseClient";
import { sendEmailToContact } from "../messaging/sendEmail";

/**
 * Canonical calendar_events schema: id, user_id, contact_id, title, scheduled_for,
 * duration_minutes, status, location, meeting_url, notes. (`datetime` never existed.)
 * Prefer the calendar-schedule Netlify function (ownership-checked); this helper is for callers
 * that already hold an authenticated client session.
 */
export async function scheduleMeeting(contactId: string, scheduledFor: string, opts: { userId?: string; title?: string; durationMinutes?: number } = {}) {
  const { data: event, error } = await supabase
    .from("calendar_events")
    .insert({
      contact_id: contactId,
      user_id: opts.userId,
      title: opts.title || "Meeting",
      scheduled_for: scheduledFor,
      duration_minutes: opts.durationMinutes || 30,
      status: "scheduled",
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;

  const notified = await sendEmailToContact(
    contactId,
    "Your meeting is confirmed",
    `Your meeting is scheduled for ${new Date(scheduledFor).toUTCString()}.`
  );
  return { success: true, event, notified: notified.success, notifyError: notified.error };
}
