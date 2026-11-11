/**
 * Card ordering inside Kanban columns.
 *
 * Cards carry a numeric `position`; a card dropped between two others gets the midpoint of their
 * positions (fractional indexing), so one drop writes one row. Same idea as Twenty's board
 * (AGPL) – implemented from scratch here. When positions are missing or run out of float
 * precision the whole column is renumbered 1..n.
 */
import type { Contact } from '../../types/contact';

export interface PositionedRef {
  id: string;
  position?: number | undefined;
}

export interface PositionPatch {
  id: string;
  position: number;
}

const MIN_GAP = 1e-6;
const hasPosition = (c: PositionedRef): c is PositionedRef & { position: number } =>
  typeof c.position === 'number' && Number.isFinite(c.position);

/** Display order for a column: by position when any card has one (unpositioned last), else unchanged. */
export function orderColumnContacts<T extends PositionedRef>(contacts: T[]): T[] {
  if (!contacts.some(hasPosition)) return contacts;
  return contacts
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ap = hasPosition(a.c) ? a.c.position : Number.POSITIVE_INFINITY;
      const bp = hasPosition(b.c) ? b.c.position : Number.POSITIVE_INFINITY;
      return ap === bp ? a.i - b.i : ap - bp;
    })
    .map((x) => x.c);
}

/**
 * Which cards need a new position when `movedId` is dropped before `beforeId` (null = at the end)?
 * `column` is the target column in display order (it may or may not already contain the moved card).
 */
export function planColumnDrop(column: PositionedRef[], movedId: string, beforeId: string | null): PositionPatch[] {
  // Dropping "before" the dragged card itself means: keep it where it is relative to the next card.
  if (beforeId === movedId) {
    const at = column.findIndex((c) => c.id === movedId);
    beforeId = column.slice(at + 1).find((c) => c.id !== movedId)?.id ?? null;
  }
  const rest = column.filter((c) => c.id !== movedId);
  const idx = beforeId ? rest.findIndex((c) => c.id === beforeId) : -1;
  const insertAt = idx >= 0 ? idx : rest.length;

  if (rest.every(hasPosition)) {
    const sorted = [...rest].sort((a, b) => a.position! - b.position!);
    const prev = sorted[insertAt - 1]?.position;
    const next = sorted[insertAt]?.position;
    let position: number;
    if (sorted.length === 0) position = 1;
    else if (prev === undefined) position = (next as number) - 1;
    else if (next === undefined) position = prev + 1;
    else position = (prev + next) / 2;
    const roomLeft = prev === undefined || next === undefined || next - prev > MIN_GAP * 2;
    if (roomLeft) return [{ id: movedId, position }];
  }

  // Renumber the whole column in display order (also seeds positions for never-ordered columns).
  const ordered = [...rest.slice(0, insertAt), { id: movedId } as PositionedRef, ...rest.slice(insertAt)];
  const patches: PositionPatch[] = [];
  ordered.forEach((c, i) => {
    const position = i + 1;
    if (c.id === movedId || c.position !== position) patches.push({ id: c.id, position });
  });
  return patches;
}

/** Patch that moves a contact into a column for the field the board is grouped by. */
export function columnFieldPatch(
  contact: Contact,
  field: { id: string; name: string; label: string; source: 'property' | 'custom' },
  columnValue: string
): Partial<Contact> {
  if (field.source === 'custom') {
    return { customFields: { ...(contact.customFields ?? {}), [field.label]: columnValue } } as Partial<Contact>;
  }
  return { [field.name]: columnValue } as Partial<Contact>;
}
