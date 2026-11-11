/**
 * Field-level merge of 2-9 contact records into one.
 * Priority rules follow Twenty's merge ("priority record wins, else first non-empty; unions for
 * multi-value fields"; AGPL, reimplemented). Mirrors the SQL function merge_contacts.
 */
import type { Contact } from '../../types/contact';

export const MAX_MERGE_RECORDS = 9;

/** Fields never merged (identity/bookkeeping). */
const SKIP = new Set(['id', 'createdAt', 'updatedAt', 'position', 'activityLog']);
const UNION_ARRAYS = new Set(['tags', 'sources']);
const MERGE_OBJECTS = new Set(['socialProfiles', 'customFields']);
const CONCAT_TEXT = new Set(['notes']);
const OR_BOOLEANS = new Set(['isFavorite']);

export const isEmptyValue = (v: unknown): boolean =>
  v == null ||
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

export interface MergeResult {
  merged: Contact;
  /** Which record each merged field value came from. */
  sources: Record<string, string>;
  /** Fields where records disagree (both non-empty and different) – worth showing in the UI. */
  conflicts: string[];
}

/**
 * @param records  winner first, then the others in priority order
 * @param overrides  field -> record id whose value to use instead of the automatic rule
 */
export function mergeContactRecords(records: Contact[], overrides: Record<string, string> = {}): MergeResult {
  if (records.length < 2) throw new Error('Select at least 2 contacts to merge');
  if (records.length > MAX_MERGE_RECORDS) throw new Error(`You can merge at most ${MAX_MERGE_RECORDS} contacts at once`);
  const [winner, ...others] = records as [Contact, ...Contact[]];
  const out: Record<string, unknown> = { ...winner };
  const sources: Record<string, string> = {};
  const conflicts: string[] = [];
  const get = (c: Contact, k: string) => (c as unknown as Record<string, unknown>)[k];
  const byId = new Map(records.map((r) => [r.id, r]));

  const keys = new Set<string>();
  records.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));

  for (const key of keys) {
    if (SKIP.has(key)) continue;
    const forced = overrides[key] ? byId.get(overrides[key]) : undefined;
    if (forced) {
      out[key] = get(forced, key);
      sources[key] = forced.id;
      continue;
    }

    const values = records.map((r) => ({ id: r.id, v: get(r, key) }));
    const nonEmpty = values.filter((x) => !isEmptyValue(x.v));
    if (nonEmpty.length === 0) continue;

    if (UNION_ARRAYS.has(key)) {
      out[key] = Array.from(new Set(nonEmpty.flatMap((x) => x.v as unknown[])));
      sources[key] = nonEmpty[0]!.id;
    } else if (MERGE_OBJECTS.has(key)) {
      // winner keys take priority; others fill gaps
      out[key] = [...nonEmpty].reverse().reduce((acc, x) => ({ ...acc, ...(x.v as object) }), {});
      sources[key] = nonEmpty[0]!.id;
    } else if (CONCAT_TEXT.has(key)) {
      const distinct = Array.from(new Set(nonEmpty.map((x) => String(x.v).trim()).filter(Boolean)));
      out[key] = distinct.join('\n\n');
      sources[key] = nonEmpty[0]!.id;
    } else if (OR_BOOLEANS.has(key)) {
      out[key] = nonEmpty.some((x) => x.v === true);
      sources[key] = nonEmpty[0]!.id;
    } else {
      out[key] = nonEmpty[0]!.v;
      sources[key] = nonEmpty[0]!.id;
      const distinct = new Set(nonEmpty.map((x) => JSON.stringify(x.v)));
      if (distinct.size > 1) conflicts.push(key);
    }
  }
  // Keep derived name consistent with the merged first/last name.
  if (out['firstName'] || out['lastName']) {
    out['name'] = `${out['firstName'] ?? ''} ${out['lastName'] ?? ''}`.trim() || out['name'];
  }
  out['id'] = winner.id;
  out['updatedAt'] = new Date().toISOString();
  void others;
  return { merged: out as unknown as Contact, sources, conflicts };
}

/** Only the fields that actually change on the winner (what gets written). */
export function mergePatch(winner: Contact, merged: Contact): Partial<Contact> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (SKIP.has(k)) continue;
    if (JSON.stringify((winner as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v)) patch[k] = v;
  }
  return patch as Partial<Contact>;
}
