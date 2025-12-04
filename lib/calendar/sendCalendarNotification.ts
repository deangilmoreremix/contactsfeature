import { executeTool } from "../core/mcpExecutor";

export async function sendCalendarNotification(contactId: string, message: string) {
  return await executeTool("AgentMail.send_message", {
    to: contactId,
    subject: "Meeting Update",
    body: message
  });
}
