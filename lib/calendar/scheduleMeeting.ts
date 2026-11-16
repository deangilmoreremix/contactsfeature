import { supabase } from "../core/supabaseClient";
import { sendEmailToContact } from "../messaging/sendEmail";

export async function scheduleMeeting(contactId: string, datetime: string) {
  const { error } = await supabase.from("calendar_events").insert({
    contact_id: contactId,
    scheduled_for: datetime,
    status: "scheduled"
  });

  if (error) throw error;

  const notified = await sendEmailToContact(
    contactId,
    "Your meeting is confirmed",
    `Your meeting is scheduled for ${datetime}.`
  );

  return { success: true, notified: notified.success, notifyError: notified.error };
}
