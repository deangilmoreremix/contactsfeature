/** Pure helpers for the contact Emails tab: status derivation, thread grouping, safe plain-text bodies. */

export type EmailChipStatus =
  | 'draft' | 'queued' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'opened' | 'clicked' | 'replied' | 'received';

export interface ContactEmail {
  id: string;
  contactId: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  status: string;
  isInbound: boolean;
  threadId: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface EmailThread {
  key: string;
  subject: string;
  emails: ContactEmail[]; // newest first
  latestAt: string;
  count: number;
}

/** When the message "happened": sent time, else scheduled time, else created time. */
export function emailTime(e: ContactEmail): string {
  return e.sentAt || e.scheduledFor || e.createdAt;
}

/** Most meaningful state for one chip: failure and engagement win over plain "sent". */
export function deriveStatus(e: ContactEmail, now: number = Date.now()): EmailChipStatus {
  if (e.isInbound) return 'received';
  if (e.status === 'failed') return 'failed';
  if (e.repliedAt) return 'replied';
  if (e.clickedAt) return 'clicked';
  if (e.openedAt) return 'opened';
  if (e.status === 'queued') {
    return e.scheduledFor && new Date(e.scheduledFor).getTime() > now ? 'scheduled' : 'queued';
  }
  if (e.status === 'sending' || e.status === 'sent' || e.status === 'draft') return e.status;
  return 'draft';
}

/** Queued/draft rows can still be cancelled (the DB policy only allows deleting those). */
export const isCancellable = (e: ContactEmail): boolean =>
  !e.isInbound && (e.status === 'queued' || e.status === 'draft');

const PREFIX = /^\s*((re|fwd?|aw|sv)\s*:\s*)+/i;

export function normalizeSubject(subject: string | null | undefined): string {
  return (subject ?? '').replace(PREFIX, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Group by provider thread id when present, otherwise by subject without Re:/Fwd: prefixes. */
export function threadKey(e: Pick<ContactEmail, 'threadId' | 'subject'>): string {
  if (e.threadId) return `t:${e.threadId}`;
  return `s:${normalizeSubject(e.subject)}`;
}

/** Threads newest-first; messages inside a thread newest-first too. */
export function threadEmails(emails: readonly ContactEmail[]): EmailThread[] {
  const map = new Map<string, EmailThread>();
  for (const e of emails) {
    const key = threadKey(e);
    let t = map.get(key);
    if (!t) {
      t = { key, subject: '', emails: [], latestAt: '', count: 0 };
      map.set(key, t);
    }
    t.emails.push(e);
  }
  const byTimeDesc = (a: ContactEmail, b: ContactEmail) => emailTime(b).localeCompare(emailTime(a));
  const threads = [...map.values()];
  for (const t of threads) {
    t.emails.sort(byTimeDesc);
    t.count = t.emails.length;
    t.latestAt = emailTime(t.emails[0]!);
    // Show the original subject (earliest message), without reply prefixes.
    const oldest = t.emails[t.emails.length - 1]!;
    t.subject = (oldest.subject || '').replace(PREFIX, '').trim() || '(no subject)';
  }
  return threads.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * Convert an HTML email body to plain text. The result is only ever rendered as text
 * (React escapes it), so no HTML is injected anywhere.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g: string) => {
      if (g[0] === '#') {
        const code = g[1]?.toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[g.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function bodyAsText(e: Pick<ContactEmail, 'bodyText' | 'bodyHtml'>): string {
  if (e.bodyText && e.bodyText.trim()) return e.bodyText.trim();
  if (e.bodyHtml && e.bodyHtml.trim()) return htmlToText(e.bodyHtml);
  return '';
}
