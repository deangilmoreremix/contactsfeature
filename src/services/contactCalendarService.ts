/**
 * Calendar for one contact via the calendar-list / calendar-schedule Netlify functions (owner-checked
 * server side). The contact is only reported as notified when the user's email provider accepted the mail.
 */
import { isSupabaseConfigured } from '../lib/supabase';
import { sdrAuthHeaders } from './sdrClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const canUseContactCalendar = (contactId: string | undefined): boolean =>
  isSupabaseConfigured && !!contactId && UUID_RE.test(contactId);

export interface ContactCalendarEvent {
  id: string;
  contact_id: string | null;
  title: string | null;
  scheduled_for: string;
  duration_minutes: number | null;
  status: string | null;
  location: string | null;
  meeting_url: string | null;
  notes: string | null;
}

export interface TimeSuggestion { start: string; end: string }

export interface NotifyOutcome { notified: boolean; reason?: string }

export interface ScheduleInput {
  contactId: string;
  title?: string;
  scheduledFor: string; // ISO
  durationMinutes: number;
  location?: string;
  meetingUrl?: string;
  notify?: boolean;
}

async function post<T>(fn: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: 'POST',
    headers: await sdrAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
  return json as T;
}

const endMs = (e: ContactCalendarEvent) => new Date(e.scheduled_for).getTime() + (e.duration_minutes ?? 30) * 60000;
const isCancelled = (e: ContactCalendarEvent) => /^cancel+ed$/i.test(e.status ?? '');

/** Upcoming = not cancelled and not yet over (soonest first); past = everything else (newest first). */
export function splitEvents(events: readonly ContactCalendarEvent[], now: number = Date.now()) {
  const upcoming = events.filter((e) => !isCancelled(e) && endMs(e) >= now)
    .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const past = events.filter((e) => isCancelled(e) || endMs(e) < now)
    .sort((a, b) => b.scheduled_for.localeCompare(a.scheduled_for));
  return { upcoming, past };
}

export const contactCalendarService = {
  /** Events for the contact (past 180 days to next 180 days) plus suggested free times when asked. */
  async list(contactId: string, opts: { durationMinutes?: number; suggestions?: boolean } = {}) {
    const now = Date.now();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const r = await post<{ events: ContactCalendarEvent[]; suggestions?: TimeSuggestion[] }>('calendar-list', {
      contactId,
      from: new Date(now - 180 * 86400000).toISOString(),
      to: new Date(now + 180 * 86400000).toISOString(),
      ...(opts.suggestions === false ? {} : {
        availability: {
          count: 4,
          durationMinutes: opts.durationMinutes ?? 30,
          timeZone,
          from: new Date(now).toISOString(),
          to: new Date(now + 14 * 86400000).toISOString(),
          minNoticeMinutes: 60,
        },
      }),
    });
    return { events: r.events || [], suggestions: r.suggestions ?? [] };
  },

  schedule: (i: ScheduleInput) =>
    post<{ event: ContactCalendarEvent } & NotifyOutcome>('calendar-schedule', {
      action: 'create',
      contactId: i.contactId,
      scheduledFor: i.scheduledFor,
      durationMinutes: i.durationMinutes,
      ...(i.title ? { title: i.title } : {}),
      ...(i.location ? { location: i.location } : {}),
      ...(i.meetingUrl ? { meetingUrl: i.meetingUrl } : {}),
      notify: i.notify !== false,
    }),

  reschedule: (eventId: string, scheduledFor: string, notify = true) =>
    post<{ event: ContactCalendarEvent } & NotifyOutcome>('calendar-schedule', { action: 'reschedule', eventId, scheduledFor, notify }),

  cancel: (eventId: string, notify = true) =>
    post<{ event: ContactCalendarEvent } & NotifyOutcome>('calendar-schedule', { action: 'cancel', eventId, notify }),
};

/** "2026-11-20T15:00:00Z" -> value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Human sentence for the notification result. Never claims a notification that did not happen. */
export function describeNotify(o: NotifyOutcome, who: string, verb: string): string {
  return o.notified
    ? `${verb}. ${who} was notified by email.`
    : `${verb}, but ${who} was NOT notified${o.reason ? `: ${o.reason}` : ''}.`;
}
