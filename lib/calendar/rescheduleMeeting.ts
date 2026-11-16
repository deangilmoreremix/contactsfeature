import { supabase } from "../core/supabaseClient";
import { sendEmail } from "../messaging/sendEmail";

export async function rescheduleMeeting(eventId: string, newDatetime: string) {
  const { data: event } = await supabase
    .from("calendar_events")
    .update({ scheduled_for: newDatetime })
    .eq("id", eventId)
    .select("contact_id")
    .maybeSingle();

  let notified = false;
  if (event?.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email")
      .eq("id", event.contact_id)
      .maybeSingle();
    if (contact?.email) {
      const r = await sendEmail({
        to: contact.email,
        contactId: event.contact_id,
        subject: "Your meeting has been rescheduled",
        text: `New meeting time: ${newDatetime}`,
      });
      notified = r.success;
    }
  }

  return { success: true, notified };
}
