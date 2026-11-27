/**
 * Emails for one contact: reads the `emails` table (RLS: owner only), sends or schedules through the
 * user's own provider via messagingProviderService, and cancels still-queued rows.
 * Nothing is simulated: without a provider the send fails with code NO_PROVIDER.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { messagingProviderService } from './messagingProviderService';
import { textToHtml } from './emailSchedulerService';
import type { ContactEmail } from '../lib/emails/threadEmails';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the contact can have stored emails (real backend + a database-backed contact). */
export const canLoadContactEmails = (contactId: string | undefined): boolean =>
  isSupabaseConfigured && !!contactId && UUID_RE.test(contactId);

const COLS =
  'id,contact_id,from_email,to_email,subject,body_text,body_html,status,is_inbound,thread_id,scheduled_for,sent_at,opened_at,clicked_at,replied_at,error_message,created_at';

type Row = {
  id: string; contact_id: string | null; from_email: string | null; to_email: string | null; subject: string | null;
  body_text: string | null; body_html: string | null; status: string | null; is_inbound: boolean | null;
  thread_id: string | null; scheduled_for: string | null; sent_at: string | null; opened_at: string | null;
  clicked_at: string | null; replied_at: string | null; error_message: string | null; created_at: string;
};

const toEmail = (r: Row): ContactEmail => ({
  id: r.id,
  contactId: r.contact_id,
  fromEmail: r.from_email,
  toEmail: r.to_email,
  subject: r.subject ?? '',
  bodyText: r.body_text,
  bodyHtml: r.body_html,
  status: r.status ?? 'draft',
  isInbound: !!r.is_inbound,
  threadId: r.thread_id,
  scheduledFor: r.scheduled_for,
  sentAt: r.sent_at,
  openedAt: r.opened_at,
  clickedAt: r.clicked_at,
  repliedAt: r.replied_at,
  errorMessage: r.error_message,
  createdAt: r.created_at,
});

export const isNoProviderError = (e: unknown): boolean => (e as { code?: string } | null)?.code === 'NO_PROVIDER';

export interface ComposeInput {
  contactId: string;
  to: string;
  subject: string;
  body: string;
  /** Future time to schedule; omit to send now. */
  scheduledFor?: Date;
}

export interface ComposeResult {
  id?: string;
  queued: boolean;
  scheduledFor?: Date;
  provider?: string;
}

export const contactEmailService = {
  async list(contactId: string): Promise<ContactEmail[]> {
    if (!canLoadContactEmails(contactId)) return [];
    const { data, error } = await supabase
      .from('emails')
      .select(COLS)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as Row[]).map(toEmail);
  },

  /** Send now or schedule. Throws (with `code`, e.g. NO_PROVIDER) when the provider layer refuses. */
  async compose(input: ComposeInput): Promise<ComposeResult> {
    const to = input.to.trim();
    if (!to) throw new Error('This contact has no email address');
    if (!input.subject.trim()) throw new Error('Add a subject');
    if (!input.body.trim()) throw new Error('Write a message');
    if (input.scheduledFor && input.scheduledFor.getTime() <= Date.now() + 60_000) {
      throw new Error('Scheduled time must be at least a minute in the future');
    }
    const r = await messagingProviderService.sendEmail({
      to,
      subject: input.subject.trim(),
      body_text: input.body,
      body_html: textToHtml(input.body),
      contact_id: input.contactId,
      ...(input.scheduledFor ? { scheduled_for: input.scheduledFor.toISOString() } : {}),
    });
    if (!r.success) throw new Error('The email was not accepted by your provider');
    if (input.scheduledFor && !r.queued) throw new Error('The email could not be scheduled');
    return {
      queued: !!r.queued,
      ...(r.id ? { id: r.id } : {}),
      ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
      ...(r.provider ? { provider: r.provider } : {}),
    };
  },

  /** Delete a still-queued/draft row (owner only via RLS). False means it was already sent or picked up. */
  async cancel(emailId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('emails')
      .delete()
      .eq('id', emailId)
      .in('status', ['queued', 'draft'])
      .select('id');
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  },
};
