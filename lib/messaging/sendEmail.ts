import { supabase } from "../core/supabaseClient";

export interface SendEmailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  contactId?: string;
  scheduledFor?: string;
}

export interface SendEmailResult {
  success: boolean;
  queued?: boolean;
  code?: string;
  error?: string;
  id?: string;
  messageId?: string;
}

const FUNCTION_URL = "/.netlify/functions/send-email";

/**
 * Send (or schedule) an email through the signed-in user's own provider
 * (Settings → Email & SMS providers). Never pretends to send: returns success=false with
 * code NO_PROVIDER when no provider is configured.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { success: false, code: "UNAUTHENTICATED", error: "Not signed in" };

  const base = typeof window === "undefined" ? process.env.URL || "" : "";
  const res = await fetch(`${base}${FUNCTION_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      to: input.to,
      subject: input.subject,
      body_text: input.text,
      body_html: input.html,
      contact_id: input.contactId,
      scheduled_for: input.scheduledFor,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return {
    success: Boolean(json.success),
    queued: json.queued,
    code: json.code,
    error: json.error,
    id: json.id,
    messageId: json.message_id,
  };
}

/** Look the contact's address up and email them. */
export async function sendEmailToContact(
  contactId: string,
  subject: string,
  text: string
): Promise<SendEmailResult> {
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("id,email")
    .eq("id", contactId)
    .maybeSingle();
  if (error || !contact?.email) {
    return { success: false, code: "NO_RECIPIENT", error: "Contact has no email address" };
  }
  return sendEmail({ to: contact.email, subject, text, contactId });
}
