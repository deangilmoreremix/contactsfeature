// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildContactEvents, getMonthGrid, groupEventsByDay, moveToDay, dayKey } from '../src/lib/calendar/contactEvents';
import { buildContactFilterFields } from '../src/lib/filters/contactFilterFields';

const c = (o: any): any => ({ id: o.id, name: o.id, createdAt: '2026-11-03T10:00:00Z', ...o });

describe('calendar events', () => {
  it('builds events from real dates and ignores missing/invalid ones', () => {
    const events = buildContactEvents([
      c({ id: 'a', lastConnected: '2026-11-05 at 2:30 pm', nextSendDate: '2026-11-20T09:00:00Z' }),
      c({ id: 'b', lastConnected: 'not a date' }),
    ]);
    const by = (id: string) => events.filter((e) => e.contact.id === id).map((e) => e.field).sort();
    expect(by('a')).toEqual(['createdAt', 'lastConnected', 'nextSendDate']);
    expect(by('b')).toEqual(['createdAt']);
    expect(events.find((e) => e.field === 'nextSendDate')!.editable).toBe(true);
    expect(events.find((e) => e.field === 'lastConnected')!.editable).toBe(false);
  });

  it('includes custom date fields', () => {
    const fields = buildContactFilterFields([{ id: 'x', label: 'Renewal', fieldType: 'date' }]).filter((f) => f.source === 'custom');
    const events = buildContactEvents([c({ id: 'a', customFields: { Renewal: '2026-12-01' } })], fields);
    expect(events.find((e) => e.field === 'custom:x')!.title).toContain('Renewal');
  });

  it('month grid is full weeks with real adjacent-month days', () => {
    const grid = getMonthGrid(2026, 10); // November 2026 starts on Sunday
    expect(grid.length % 7).toBe(0);
    expect(grid[0]!.date.getDate()).toBe(1);
    expect(grid.filter((x) => x.inMonth)).toHaveLength(30);
    const feb = getMonthGrid(2026, 1, 1); // Monday-first
    expect(feb[0]!.date.getDay()).toBe(1);
    expect(feb[0]!.inMonth).toBe(false);
  });

  it('groups by local day and moves a date keeping its time', () => {
    const events = buildContactEvents([c({ id: 'a', nextSendDate: '2026-11-20T09:30:00' })]);
    const byDay = groupEventsByDay(events);
    expect(byDay.get(dayKey(new Date('2026-11-20T09:30:00')))!.some((e) => e.field === 'nextSendDate')).toBe(true);
    const moved = new Date(moveToDay(new Date('2026-11-20T09:30:00'), new Date(2026, 10, 25)));
    expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([25, 9, 30]);
  });
});
