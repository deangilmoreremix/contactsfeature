/**
 * Email Scheduling Service
 *
 * Scheduled sends are persisted in the `emails` table through the `send-email` Netlify function
 * (`scheduled_for`) and delivered by the 5-minute scheduled processor with the user's own provider.
 * Status (queued / sending / sent / failed / draft) is read from the table; nothing lives in memory.
 * Cancelling deletes the still-queued row (RLS: owner only, queued/draft rows only).
 */
import { supabase } from '../lib/supabase';
import { messagingProviderService } from './messagingProviderService';

export type ScheduledEmailStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'draft';

export interface ScheduledEmail {
  id: string;
  to: string;
  subject: string;
  scheduledFor: Date | null;
  contactId: string | null;
  status: ScheduledEmailStatus;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface ScheduleEmailInput {
  to: string;
  subject: string;
  body: string;
  scheduledFor: Date;
  contactId: string;
  // Accepted for API compatibility with callers; the queue is FIFO so priority is not persisted.
  template?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const textToHtml = (text: string) =>
  text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');

type EmailRow = {
  id: string; to_email: string | null; subject: string | null; scheduled_for: string | null; contact_id: string | null;
  status: string; sent_at: string | null; opened_at: string | null; clicked_at: string | null; error_message: string | null; created_at: string;
};

const toScheduled = (r: EmailRow): ScheduledEmail => ({
  id: r.id,
  to: r.to_email || '',
  subject: r.subject || '',
  scheduledFor: r.scheduled_for ? new Date(r.scheduled_for) : null,
  contactId: r.contact_id,
  status: (['queued', 'sending', 'sent', 'failed', 'draft'].includes(r.status) ? r.status : 'draft') as ScheduledEmailStatus,
  ...(r.sent_at ? { sentAt: new Date(r.sent_at) } : {}),
  ...(r.opened_at ? { openedAt: new Date(r.opened_at) } : {}),
  ...(r.clicked_at ? { clickedAt: new Date(r.clicked_at) } : {}),
  ...(r.error_message ? { error: r.error_message } : {}),
  createdAt: new Date(r.created_at),
});

const COLS = 'id,to_email,subject,scheduled_for,contact_id,status,sent_at,opened_at,clicked_at,error_message,created_at';

class EmailSchedulerService {
  private static instance: EmailSchedulerService;

  static getInstance(): EmailSchedulerService {
    if (!EmailSchedulerService.instance) EmailSchedulerService.instance = new EmailSchedulerService();
    return EmailSchedulerService.instance;
  }

  /** Persist a scheduled send. Throws if it could not be stored (never pretends success). */
  async scheduleEmail(input: ScheduleEmailInput): Promise<{ id: string; scheduledFor: Date }> {
    if (input.scheduledFor.getTime() <= Date.now() + 60_000) throw new Error('Scheduled time must be at least a minute in the future');
    const r = await messagingProviderService.sendEmail({
      to: input.to,
      subject: input.subject,
      body_text: input.body,
      body_html: textToHtml(input.body),
      contact_id: input.contactId,
      scheduled_for: input.scheduledFor.toISOString(),
    });
    if (!r.success || !r.queued || !r.id) throw new Error('The email could not be scheduled');
    return { id: r.id, scheduledFor: input.scheduledFor };
  }

  /** Send immediately through the user's provider; resolves with the stored email id. */
  async sendNow(input: { to: string; subject: string; body: string; contactId?: string }): Promise<{ id?: string; provider?: string }> {
    const r = await messagingProviderService.sendEmail({
      to: input.to,
      subject: input.subject,
      body_text: input.body,
      body_html: textToHtml(input.body),
      ...(input.contactId ? { contact_id: input.contactId } : {}),
    });
    if (!r.success) throw new Error('The email was not accepted by your provider');
    return { ...(r.id ? { id: r.id } : {}), ...(r.provider ? { provider: r.provider } : {}) };
  }

  /** Scheduled emails (queued, failed or already delivered) for the signed-in user. */
  async getScheduledEmails(contactId?: string): Promise<ScheduledEmail[]> {
    let q = supabase.from('emails').select(COLS).eq('is_inbound', false).not('scheduled_for', 'is', null).order('scheduled_for', { ascending: true }).limit(200);
    if (contactId) q = q.eq('contact_id', contactId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as EmailRow[]).map(toScheduled);
  }

  async getUpcomingEmails(hours: number = 24): Promise<ScheduledEmail[]> {
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    const { data, error } = await supabase.from('emails').select(COLS).eq('status', 'queued').lte('scheduled_for', until).order('scheduled_for', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as EmailRow[]).map(toScheduled);
  }

  /** Cancel = delete the queued row. Returns false when it was no longer queued (already sending/sent). */
  async cancelScheduledEmail(emailId: string): Promise<boolean> {
    const { data, error } = await supabase.from('emails').delete().eq('id', emailId).eq('status', 'queued').select('id');
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }
}

export const emailSchedulerService = EmailSchedulerService.getInstance();
