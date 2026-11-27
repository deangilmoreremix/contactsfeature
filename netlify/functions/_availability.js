/**
 * Pure availability logic (no I/O, no randomness). Computes free meeting slots inside business
 * hours from the user's existing calendar_events. Shared by calendar-list / calendar-schedule and
 * re-exported to lib/calendar.
 */
const MIN = 60000;

/** Offset (minutes) of `timeZone` from UTC at the given instant. */
function tzOffsetMinutes(date, timeZone) {
  if (!timeZone || timeZone === 'UTC') return 0;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / MIN);
}

/** Convert a wall-clock time in `timeZone` to a UTC Date. */
function zonedToUtc(y, m, d, hour, minute, timeZone) {
  const guess = Date.UTC(y, m, d, hour, minute);
  let t = guess - tzOffsetMinutes(new Date(guess), timeZone) * MIN;
  t = guess - tzOffsetMinutes(new Date(t), timeZone) * MIN;
  return new Date(t);
}

function localYMD(date, timeZone) {
  const off = tzOffsetMinutes(date, timeZone);
  const l = new Date(date.getTime() + off * MIN);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate() };
}

/** Normalise events ({scheduled_for, duration_minutes?, status?}) to busy [start,end) ms intervals. */
function toBusy(events, defaultDuration = 30) {
  return (events || [])
    .filter((e) => e && e.scheduled_for && !['cancelled', 'canceled'].includes(String(e.status || '').toLowerCase()))
    .map((e) => {
      const start = new Date(e.scheduled_for).getTime();
      const dur = Number(e.duration_minutes) > 0 ? Number(e.duration_minutes) : defaultDuration;
      return { start, end: start + dur * MIN };
    })
    .filter((b) => Number.isFinite(b.start));
}

/**
 * @param {Array} events existing calendar events
 * @param {object} o { from, to, timeZone, workStartHour, workEndHour, workDays, durationMinutes,
 *                     slotMinutes, bufferMinutes, minNoticeMinutes, limit }
 * @returns {Array<{start:string,end:string}>} ISO slots, chronological
 */
function computeFreeSlots(events, o = {}) {
  const from = o.from ? new Date(o.from) : new Date();
  if (Number.isNaN(from.getTime())) throw new Error('Invalid from date');
  const to = o.to ? new Date(o.to) : new Date(from.getTime() + 14 * 86400000);
  const tz = o.timeZone || 'UTC';
  const startH = o.workStartHour ?? 9;
  const endH = o.workEndHour ?? 17;
  const workDays = o.workDays || [1, 2, 3, 4, 5];
  const duration = o.durationMinutes || 30;
  const step = o.slotMinutes || duration;
  const buffer = o.bufferMinutes || 0;
  const earliest = from.getTime() + (o.minNoticeMinutes || 0) * MIN;
  const limit = o.limit || 200;
  const busy = toBusy(events);
  const slots = [];

  const first = localYMD(from, tz);
  for (let i = 0; i < 400 && slots.length < limit; i++) {
    const dayAnchor = new Date(Date.UTC(first.y, first.m, first.d + i, 12));
    const y = dayAnchor.getUTCFullYear(), m = dayAnchor.getUTCMonth(), d = dayAnchor.getUTCDate();
    const dow = dayAnchor.getUTCDay();
    const winStart = zonedToUtc(y, m, d, Math.floor(startH), Math.round((startH % 1) * 60), tz).getTime();
    const winEnd = zonedToUtc(y, m, d, Math.floor(endH), Math.round((endH % 1) * 60), tz).getTime();
    if (winStart > to.getTime()) break;
    if (!workDays.includes(dow)) continue;
    for (let s = winStart; s + duration * MIN <= winEnd && slots.length < limit; s += step * MIN) {
      const e = s + duration * MIN;
      if (s < earliest || e > to.getTime()) continue;
      if (busy.some((b) => s < b.end + buffer * MIN && e + buffer * MIN > b.start)) continue;
      slots.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
    }
  }
  return slots;
}

/** True when [start, start+duration) collides with an existing non-cancelled event (optionally ignoring one id). */
function hasConflict(events, startIso, durationMinutes = 30, ignoreId) {
  const s = new Date(startIso).getTime();
  const e = s + durationMinutes * MIN;
  return toBusy((events || []).filter((x) => !ignoreId || x.id !== ignoreId)).some((b) => s < b.end && e > b.start);
}

/** Pick `count` proposals spread across different days (round-robin), chronological. */
function proposeTimes(events, o = {}) {
  const count = o.count || 3;
  const slots = computeFreeSlots(events, { ...o, limit: o.limit || 400 });
  const tz = o.timeZone || 'UTC';
  const byDay = new Map();
  for (const s of slots) {
    const k = JSON.stringify(localYMD(new Date(s.start), tz));
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(s);
  }
  const picked = [];
  const lists = [...byDay.values()];
  for (let round = 0; picked.length < count && lists.some((l) => l.length); round++) {
    for (const l of lists) {
      if (picked.length >= count) break;
      // spread within a day: first round earliest-ish (10am-ish middle), later rounds next
      const idx = Math.min(l.length - 1, Math.floor(l.length / 2) + round);
      if (l[idx]) { picked.push(l[idx]); l.splice(idx, 1); }
    }
  }
  return picked.sort((a, b) => a.start.localeCompare(b.start));
}

module.exports = { computeFreeSlots, proposeTimes, hasConflict, toBusy, tzOffsetMinutes, zonedToUtc };
