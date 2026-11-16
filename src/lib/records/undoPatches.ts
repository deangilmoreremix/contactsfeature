import type { Contact } from '../../types/contact';

/** Previous values of `keys` for each id, used to build an undo for inline / bulk edits. */
export function capturePrevious(
  contacts: readonly Contact[],
  ids: readonly string[],
  keys: readonly (keyof Contact)[]
): Array<{ id: string; previous: Partial<Contact> }> {
  const byId = new Map(contacts.map((c) => [c.id, c] as const));
  const out: Array<{ id: string; previous: Partial<Contact> }> = [];
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) continue;
    const previous: Record<string, unknown> = {};
    for (const k of keys) previous[k as string] = c[k];
    out.push({ id, previous: previous as Partial<Contact> });
  }
  return out;
}
