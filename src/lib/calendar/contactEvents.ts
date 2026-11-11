/**
 * Calendar events derived from real contact dates (replaces the old random mock events).
 * The month grid idea follows Twenty's record-calendar (AGPL); implemented here on native Date.
 */
import type { Contact } from '../../types/contact';
import { toIsoDate } from '../filters/filterContacts';
import type { ContactFilterField } from '../filters/contactFilterFields';
import { getContactFieldValue } from '../filters/filterContacts';
import { FieldMetadataType } from '../../vendor/twenty-shared/types/FieldMetadataType';

export type CalendarEventType = 'email' | 'call' | 'meeting' | 'note';

export interface ContactCalendarEvent {
  id: string;
  contact: Contact;
  type: CalendarEventType;
  date: Date;
  title: string;
  /** Source date field: 'lastConnected' | 'nextSendDate' | 'createdAt' | 'custom:<id>'. */
  field: string;
  /** Can be rescheduled by dragging (future/planned dates only). */
  editable: boolean;
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const parse = (value: unknown): Date | null => {
  const iso = toIsoDate(value);
  return iso ? new Date(iso) : null;
};

/** Build events from lastConnected, nextSendDate, createdAt and custom date fields. */
export function buildContactEvents(contacts: Contact[], customDateFields: ContactFilterField[] = []): ContactCalendarEvent[] {
  const events: ContactCalendarEvent[] = [];
  for (const contact of contacts) {
    const last = parse(contact.lastConnected);
    if (last) events.push({ id: `${contact.id}:last`, contact, type: 'email', date: last, title: `Last contact with ${contact.name}`, field: 'lastConnected', editable: false });

    const next = parse(contact.nextSendDate);
    if (next) events.push({ id: `${contact.id}:next`, contact, type: 'meeting', date: next, title: `Follow-up with ${contact.name}`, field: 'nextSendDate', editable: true });

    const created = parse(contact.createdAt);
    if (created) events.push({ id: `${contact.id}:created`, contact, type: 'note', date: created, title: `${contact.name} added`, field: 'createdAt', editable: false });

    for (const field of customDateFields) {
      const d = parse(getContactFieldValue(contact, field));
      if (d) events.push({ id: `${contact.id}:${field.id}`, contact, type: 'note', date: d, title: `${field.label}: ${contact.name}`, field: field.id, editable: true });
    }
  }
  return events;
}

export function groupEventsByDay(events: ContactCalendarEvent[]): Map<string, ContactCalendarEvent[]> {
  const map = new Map<string, ContactCalendarEvent[]>();
  for (const e of events) {
    const k = dayKey(e.date);
    const list = map.get(k);
    if (list) list.push(e);
    else map.set(k, [e]);
  }
  return map;
}

export interface MonthCell {
  date: Date;
  inMonth: boolean;
}

/** Month grid with leading/trailing days of the adjacent months (always full weeks). */
export function getMonthGrid(year: number, month: number, weekStartsOn = 0): MonthCell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(year, month, i - lead + 1);
    return { date, inMonth: date.getMonth() === month };
  });
}

/** Move a stored date to another day, keeping its time of day. Returns an ISO string. */
export function moveToDay(original: Date, targetDay: Date): string {
  const d = new Date(original);
  d.setFullYear(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate());
  return d.toISOString();
}

export const customDateFields = (fields: ContactFilterField[]) =>
  fields.filter((f) => f.source === 'custom' && (f.type === FieldMetadataType.DATE || f.type === FieldMetadataType.DATE_TIME));
