/** Previous / next record navigation over the ordered ids of the list currently shown. No wrap-around. */
export function adjacentContactId(ids: readonly string[], currentId: string, direction: 'prev' | 'next'): string | null {
  const i = ids.indexOf(currentId);
  if (i === -1) return null;
  return ids[direction === 'next' ? i + 1 : i - 1] ?? null;
}

export function recordPosition(ids: readonly string[], currentId: string): { index: number; total: number } | null {
  const i = ids.indexOf(currentId);
  return i === -1 ? null : { index: i + 1, total: ids.length };
}

export const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, i) => id === b[i]);
