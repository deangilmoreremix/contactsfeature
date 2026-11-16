import { supabase } from "../core/supabaseClient";
import { sendEmail } from "../messaging/sendEmail";
import { logger } from "../core/logger";

/**
 * Schedules a meeting for a contact at given ISO datetime.
 * - Creates a calendar_event row in Supabase
 * - Sends a confirmation email through the user's own provider
 */
export async function scheduleMeeting(contactId: string, datetime: string) {
  const { data: contact, error: cErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (cErr || !contact?.email) {
    logger.error("Calendar: contact not found or missing email", { contactId, cErr });
    throw new Error("Contact not found or missing email");
  }

  const { data: event, error: eErr } = await supabase
    .from("calendar_events")
    .insert({
      contact_id: contactId,
      datetime,
      status: "scheduled"
    })
    .select("*")
    .single();

  if (eErr) {
    logger.error("Calendar: failed to insert event", { eErr });
    throw eErr;
  }

  // Email confirmation (user's configured provider)
  await sendEmail({
    contactId,
    to: contact.email,
    subject: "Your meeting is scheduled 📅",
    text: `
Hi ${contact.name || ""},

Your meeting has been scheduled for:

${new Date(datetime).toLocaleString()}

If this time doesn't work, just reply to this email and we'll reschedule.

Best,
SmartCRM Calendar AI
    `.trim()
  });

  return event;
}
