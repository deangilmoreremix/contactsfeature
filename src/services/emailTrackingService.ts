/**
 * Email Tracking Service
 *
 * Engagement data comes from the `emails` table: `opened_at` / `clicked_at` are written by the
 * track-open / track-click functions (pixel + link rewrite applied when the email is sent),
 * `replied_at` by inbound handling and `status` by the sender. Nothing is kept in memory.
 * Open tracking is inherently approximate (image blocking, proxy prefetch), so counts are lower bounds.
 */
import { supabase } from '../lib/supabase';

export interface TrackedEmail {
  id: string;
  contactId: string | null;
  subject: string;
  status: string;
  sentAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  repliedAt: Date | null;
}

export interface EmailMetrics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalFailed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  /** Hours from send to reply, averaged over replied emails; null when nothing was replied to. */
  averageResponseTime: number | null;
}

type Row = {
  id: string; contact_id: string | null; subject: string | null; status: string; sent_at: string | null;
  opened_at: string | null; clicked_at: string | null; replied_at: string | null;
};

const d = (v: string | null) => (v ? new Date(v) : null);
const toTracked = (r: Row): TrackedEmail => ({
  id: r.id, contactId: r.contact_id, subject: r.subject || '(no subject)', status: r.status,
  sentAt: d(r.sent_at), openedAt: d(r.opened_at), clickedAt: d(r.clicked_at), repliedAt: d(r.replied_at),
});

/** Pure: metrics from tracked emails (only status 'sent' emails count as delivered sends). */
export function computeMetrics(emails: TrackedEmail[]): EmailMetrics {
  const sent = emails.filter((e) => e.status === 'sent' && e.sentAt);
  const pct = (n: number) => (sent.length ? (n / sent.length) * 100 : 0);
  const opened = sent.filter((e) => e.openedAt || e.clickedAt).length; // a click implies an open
  const clicked = sent.filter((e) => e.clickedAt).length;
  const replied = sent.filter((e) => e.repliedAt);
  const waits = replied.map((e) => (e.repliedAt!.getTime() - e.sentAt!.getTime()) / 3600_000).filter((h) => h >= 0);
  return {
    totalSent: sent.length,
    totalOpened: opened,
    totalClicked: clicked,
    totalReplied: replied.length,
    totalFailed: emails.filter((e) => e.status === 'failed').length,
    openRate: pct(opened),
    clickRate: pct(clicked),
    replyRate: pct(replied.length),
    averageResponseTime: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
  };
}

/** Pure: best send hour/weekday by open count, or null when there are too few opens to say. */
export function bestSendWindow(emails: TrackedEmail[], minOpens = 5): { hour: number; day: number } | null {
  const opened = emails.filter((e) => e.sentAt && (e.openedAt || e.clickedAt));
  if (opened.length < minOpens) return null;
  const hours = new Array(24).fill(0); const days = new Array(7).fill(0);
  for (const e of opened) { hours[e.sentAt!.getHours()]++; days[e.sentAt!.getDay()]++; }
  return { hour: hours.indexOf(Math.max(...hours)), day: days.indexOf(Math.max(...days)) };
}

const COLS = 'id,contact_id,subject,status,sent_at,opened_at,clicked_at,replied_at';

class EmailTrackingService {
  private static instance: EmailTrackingService;
  static getInstance(): EmailTrackingService {
    if (!EmailTrackingService.instance) EmailTrackingService.instance = new EmailTrackingService();
    return EmailTrackingService.instance;
  }

  /** Outbound emails (sent / failed) for a contact, newest first. */
  async getEmailsForContact(contactId: string, since?: Date, limit = 500): Promise<TrackedEmail[]> {
    let q = supabase.from('emails').select(COLS).eq('contact_id', contactId).eq('is_inbound', false).in('status', ['sent', 'failed'])
      .order('sent_at', { ascending: false, nullsFirst: false }).limit(limit);
    if (since) q = q.gte('created_at', since.toISOString());
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as Row[]).map(toTracked);
  }

  async getOverallEmails(since?: Date, limit = 2000): Promise<TrackedEmail[]> {
    let q = supabase.from('emails').select(COLS).eq('is_inbound', false).in('status', ['sent', 'failed']).order('sent_at', { ascending: false, nullsFirst: false }).limit(limit);
    if (since) q = q.gte('created_at', since.toISOString());
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as Row[]).map(toTracked);
  }

  async getMetricsForContact(contactId: string, since?: Date): Promise<EmailMetrics> {
    return computeMetrics(await this.getEmailsForContact(contactId, since));
  }

  async getOverallMetrics(since?: Date): Promise<EmailMetrics> {
    return computeMetrics(await this.getOverallEmails(since));
  }
}

export const emailTrackingService = EmailTrackingService.getInstance();
