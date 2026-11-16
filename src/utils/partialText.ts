/** Turn a (partial) structured AI result into readable text while it streams in (used by the panel endpoints). */
// Partial AI output is untyped by nature; callers read fields defensively through asStr / asArr.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = any;

export const asObj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
export const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const asStr = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** "Title\n- a\n- b" (empty string when there are no items). */
export function bullets(title: string, items: unknown): string {
  const list = asArr(items).map(asStr).filter(Boolean);
  return list.length ? `${title}\n${list.map((i) => `- ${i}`).join('\n')}` : '';
}

export const joinSections = (parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join('\n\n');

/** Pretty text for one memory brief, partial or complete. */
export function briefText(partial: unknown): string {
  const b = asObj(partial);
  return joinSections([asStr(b.summary), bullets('Key facts', b.key_facts), bullets('Preferences', b.preferences), bullets('Avoid', b.avoid)]);
}
