/** Pure reducer for Supabase Realtime postgres_changes events over a list of rows keyed by `id`. */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export function applyRowChange<T extends { id: string }>(
  rows: T[],
  eventType: RealtimeEventType,
  newRow: Partial<T> | null | undefined,
  oldRow: Partial<T> | null | undefined,
): T[] {
  if (eventType === 'DELETE') {
    const id = oldRow?.id;
    return id ? rows.filter((r) => r.id !== id) : rows;
  }
  if (!newRow || !newRow.id) return rows;
  const id = newRow.id;
  const i = rows.findIndex((r) => r.id === id);
  if (i === -1) return eventType === 'INSERT' || eventType === 'UPDATE' ? [newRow as T, ...rows] : rows;
  const next = rows.slice();
  next[i] = { ...rows[i], ...newRow } as T;
  return next;
}
