/**
 * Client for the user's own email / SMS providers (Resend, SendGrid, Postmark, Mailgun, Twilio).
 * All credential handling happens server-side (netlify/functions/messaging-providers.js);
 * the browser only ever sees masked values.
 */
import { supabase } from '../lib/supabase';

export type MessagingChannel = 'email' | 'sms';
export type ProviderId = 'resend' | 'sendgrid' | 'postmark' | 'mailgun' | 'twilio';

export interface MessagingProvider {
  id: string;
  channel: MessagingChannel;
  provider: ProviderId;
  display_name: string | null;
  from_address: string;
  from_name: string | null;
  credentials_hint: Record<string, string>;
  is_default: boolean;
  status: 'active' | 'disabled';
  last_tested_at: string | null;
  last_test_ok: boolean | null;
}

export interface ProviderCatalog {
  email: ProviderId[];
  sms: ProviderId[];
  fields: Record<ProviderId, string[]>;
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  resend: 'Resend',
  sendgrid: 'SendGrid',
  postmark: 'Postmark',
  mailgun: 'Mailgun',
  twilio: 'Twilio',
};

export const FIELD_LABELS: Record<string, string> = {
  apiKey: 'API key',
  domain: 'Sending domain',
  region: 'Region (us or eu)',
  accountSid: 'Account SID',
  authToken: 'Auth token',
};

async function call<T>(fn: string, payload: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in first');
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`) as Error & { code?: string };
    err.code = json.code;
    throw err;
  }
  return json as T;
}

export const messagingProviderService = {
  list: () => call<{ providers: MessagingProvider[]; supported: ProviderCatalog }>('messaging-providers', { action: 'list' }),

  save: (input: {
    provider: ProviderId;
    credentials: Record<string, string>;
    from_address: string;
    from_name?: string;
    display_name?: string;
    make_default?: boolean;
  }) => call<{ provider: MessagingProvider }>('messaging-providers', { action: 'save', ...input }),

  setDefault: (id: string) => call<{ success: boolean }>('messaging-providers', { action: 'set_default', id }),
  remove: (id: string) => call<{ success: boolean }>('messaging-providers', { action: 'delete', id }),
  test: (id: string, to: string) =>
    call<{ success: boolean; message_id?: string; error?: string }>('messaging-providers', { action: 'test', id, to }),

  /** Send an email through the user's default provider (or schedule it). */
  sendEmail: (input: {
    to: string;
    subject: string;
    body_html?: string;
    body_text?: string;
    contact_id?: string;
    scheduled_for?: string;
  }) =>
    call<{ success: boolean; queued?: boolean; id?: string; message_id?: string; provider?: string }>('send-email', input),

  sendSms: (input: { to: string; message: string; from?: string; contactId?: string }) =>
    call<{ success: boolean; messageSid?: string; provider?: string }>('send-sms', input),
};
