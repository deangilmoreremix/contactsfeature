/** Convert a wall-clock date/time in an IANA timezone to the real instant (pure, Intl based). */
function offsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ts));
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(ts / 1000) * 1000;
}

/** zonedTimeToUtc('2026-07-01', '09:30', 'America/New_York') -> Date for 13:30Z. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!, 0);
  let ts = wall - offsetMs(wall, timeZone);
  ts = wall - offsetMs(ts, timeZone); // second pass handles DST boundaries
  return new Date(ts);
}
