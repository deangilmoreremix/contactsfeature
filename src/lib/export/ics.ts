/**
 * iCalendar (RFC 5545) export for a contact's calendar events. Pure: CRLF line endings, escaped
 * TEXT values, 75-octet folding, UTC DTSTART/DTEND/DTSTAMP.
 */
import { foldVcardLine } from './vcard';

export interface IcsEvent {
  id: string;
  title: string;
  /** ISO string or Date. */
  start: string | Date;
  durationMinutes?: number | null | undefined;
  location?: string | null | undefined;
  description?: string | null | undefined;
  url?: string | null | undefined;
  /** e.g. 'cancelled' maps to STATUS:CANCELLED. */
  status?: string | null | undefined;
}

/** Shape returned by contactCalendarService (scheduled meetings). */
export interface ServiceCalendarEventLike {
  id: string;
  title: string | null;
  scheduled_for: string;
  duration_minutes: number | null;
  status: string | null;
  location: string | null;
  meeting_url: string | null;
  notes: string | null;
}

export function serviceEventsToIcsEvents(events: readonly ServiceCalendarEventLike[]): IcsEvent[] {
  return events.map((e) => ({
    id: e.id, title: e.title || 'Meeting', start: e.scheduled_for, durationMinutes: e.duration_minutes,
    location: e.location, description: e.notes, url: e.meeting_url, status: e.status,
  }));
}

const CRLF = '\r\n';

export function escapeIcsText(value: unknown): string {
  const s = typeof value === 'string' ? value : value == null ? '' : String(value);
  return s
    .replace(/\r\n|\r/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** 2026-11-20T15:00:00Z -> 20261120T150000Z */
export function formatIcsUtc(d: Date): string {
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

const DEFAULT_MINUTES = 30;

export function eventsToIcs(
  events: readonly IcsEvent[],
  opts: { calendarName?: string; now?: Date } = {},
): string {
  const now = opts.now ?? new Date();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SmartCRM//Contact Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  if (opts.calendarName) lines.push(`X-WR-CALNAME:${escapeIcsText(opts.calendarName)}`);
  for (const e of events) {
    const start = e.start instanceof Date ? e.start : new Date(e.start);
    if (Number.isNaN(start.getTime())) continue;
    const minutes = typeof e.durationMinutes === 'number' && e.durationMinutes > 0 ? e.durationMinutes : DEFAULT_MINUTES;
    const end = new Date(start.getTime() + minutes * 60_000);
    lines.push('BEGIN:VEVENT', `UID:${escapeIcsText(e.id)}@smartcrm`, `DTSTAMP:${formatIcsUtc(now)}`, `DTSTART:${formatIcsUtc(start)}`, `DTEND:${formatIcsUtc(end)}`, `SUMMARY:${escapeIcsText(e.title || 'Event')}`);
    if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    if (e.url && /^https?:\/\//i.test(e.url)) {
      try { lines.push(`URL:${new URL(e.url).href}`); } catch { /* malformed: skip */ }
    }
    if ((e.status ?? '').toLowerCase().startsWith('cancel')) lines.push('STATUS:CANCELLED');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldVcardLine).join(CRLF) + CRLF;
}

export function icsFilename(contact: { name?: string }): string {
  const slug = (contact.name || 'contact').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'contact';
  return `${slug}-calendar.ics`;
}
