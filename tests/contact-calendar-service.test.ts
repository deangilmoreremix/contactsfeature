// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { splitEvents, describeNotify, type ContactCalendarEvent } from '../src/services/contactCalendarService';

const ev = (id: string, at: string, o: Partial<ContactCalendarEvent> = {}): ContactCalendarEvent => ({
  id, contact_id: 'c', title: null, scheduled_for: at, duration_minutes: 30, status: 'scheduled',
  location: null, meeting_url: null, notes: null, ...o,
});

describe('contact calendar helpers', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  it('splits upcoming and past, cancelled goes to past', () => {
    const { upcoming, past } = splitEvents([
      ev('a', '2026-11-20T10:00:00Z'), ev('b', '2026-11-18T10:00:00Z'), ev('c', '2026-11-10T10:00:00Z'),
      ev('d', '2026-11-25T10:00:00Z', { status: 'cancelled' }), ev('e', '2026-11-16T11:45:00Z'),
    ], now);
    expect(upcoming.map((e) => e.id)).toEqual(['e', 'b', 'a']); // e is still in progress (11:45 + 30m)
    expect(past.map((e) => e.id)).toEqual(['d', 'c']);
  });
  it('never claims notification without it', () => {
    expect(describeNotify({ notified: true }, 'Ann', 'Meeting scheduled')).toBe('Meeting scheduled. Ann was notified by email.');
    expect(describeNotify({ notified: false, reason: 'Contact has no email address' }, 'Ann', 'Meeting scheduled'))
      .toBe('Meeting scheduled, but Ann was NOT notified: Contact has no email address.');
  });
});
