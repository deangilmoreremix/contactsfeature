// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { computeFreeSlots, proposeTimes, hasConflict } = require('../netlify/functions/_availability.js');

// Mon 2026-11-16 08:00Z
const base = { from: '2026-11-16T08:00:00Z', to: '2026-11-18T00:00:00Z', durationMinutes: 60 };

describe('availability', () => {
  it('only offers slots inside business hours on workdays', () => {
    const slots = computeFreeSlots([], { ...base, from: '2026-11-14T08:00:00Z', to: '2026-11-17T00:00:00Z' }); // Sat start
    expect(slots[0].start).toBe('2026-11-16T09:00:00.000Z');
    expect(slots.at(-1).end).toBe('2026-11-16T17:00:00.000Z');
    expect(slots).toHaveLength(8);
  });

  it('skips existing events and ignores cancelled ones', () => {
    const events = [
      { scheduled_for: '2026-11-16T10:00:00Z', duration_minutes: 90, status: 'scheduled' },
      { scheduled_for: '2026-11-16T14:00:00Z', duration_minutes: 60, status: 'cancelled' },
    ];
    const starts = computeFreeSlots(events, base).map((s: any) => s.start);
    expect(starts).not.toContain('2026-11-16T10:00:00.000Z');
    expect(starts).not.toContain('2026-11-16T11:00:00.000Z');
    expect(starts).toContain('2026-11-16T12:00:00.000Z');
    expect(starts).toContain('2026-11-16T14:00:00.000Z');
  });

  it('honours time zones and notice', () => {
    const slots = computeFreeSlots([], { ...base, timeZone: 'America/New_York', to: '2026-11-17T00:00:00Z' });
    expect(slots[0].start).toBe('2026-11-16T14:00:00.000Z'); // 09:00 EST
    const late = computeFreeSlots([], { ...base, minNoticeMinutes: 150 });
    expect(late[0].start).toBe('2026-11-16T11:00:00.000Z');
  });

  it('is deterministic and proposes across days', () => {
    const a = proposeTimes([], { from: '2026-11-16T08:00:00Z', to: '2026-11-20T00:00:00Z', count: 3 });
    const b = proposeTimes([], { from: '2026-11-16T08:00:00Z', to: '2026-11-20T00:00:00Z', count: 3 });
    expect(a).toEqual(b);
    expect(new Set(a.map((s: any) => s.start.slice(0, 10))).size).toBe(3);
  });

  it('detects conflicts and can ignore the event being moved', () => {
    const ev = [{ id: 'x', scheduled_for: '2026-11-16T10:00:00Z', duration_minutes: 30, status: 'scheduled' }];
    expect(hasConflict(ev, '2026-11-16T10:15:00Z', 30)).toBe(true);
    expect(hasConflict(ev, '2026-11-16T10:30:00Z', 30)).toBe(false);
    expect(hasConflict(ev, '2026-11-16T10:15:00Z', 30, 'x')).toBe(false);
  });
});
