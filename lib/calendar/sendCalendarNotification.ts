import { sendEmailToContact } from "../messaging/sendEmail";

export async function sendCalendarNotification(contactId: string, message: string) {
  return await sendEmailToContact(contactId, "Meeting Update", message);
}
