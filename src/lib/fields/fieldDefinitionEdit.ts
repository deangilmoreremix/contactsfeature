/**
 * Pure logic behind the custom-field editor: validation, reordering, select-option editing and
 * the (de)serialisation of option labels/colours. No React, no I/O.
 *
 * Storage model (no schema change): `custom_field_definitions.options` keeps the plain option VALUES
 * (what contacts store); the editable label and colour of each option live in
 * `settings.optionMeta[value]`. Renaming an option therefore never touches contact data.
 * Contacts store field values keyed by the field LABEL, so renaming a field also has to re-key the
 * values on contacts (see `renameCustomFieldKey`).
 */
import type { FieldOption, FieldSettings } from './fieldTypeRegistry';

export const OPTION_COLORS: Array<{ name: string; value: string }> = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gray', value: '#6B7280' },
];

export const MAX_LABEL_LENGTH = 60;

const norm = (s: string) => s.trim().toLowerCase();

/** Error text for a field name, or null when it is fine. `selfId` is excluded from the duplicate check. */
export function validateFieldLabel(label: string, existing: Array<{ id: string; label: string }>, selfId?: string): string | null {
  const t = label.trim();
  if (!t) return 'Give the field a name';
  if (t.length > MAX_LABEL_LENGTH) return `Keep the name under ${MAX_LABEL_LENGTH + 1} characters`;
  if (existing.some((d) => d.id !== selfId && norm(d.label) === norm(t))) return 'A field with that name already exists';
  return null;
}

/** Move the item at `from` to position `to` (clamped). Returns a new array; out-of-range `from` is a no-op copy. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const out = [...items];
  if (from < 0 || from >= out.length) return out;
  const target = Math.max(0, Math.min(out.length - 1, to));
  const [item] = out.splice(from, 1);
  out.splice(target, 0, item as T);
  return out;
}

export interface OrderedDef { id: string; displayOrder: number }

/** Definitions with contiguous displayOrder 0..n-1 following the array order. */
export function renumber<T extends OrderedDef>(defs: readonly T[]): T[] {
  return defs.map((d, i) => (d.displayOrder === i ? d : { ...d, displayOrder: i }));
}

/** Reorder by moving the definition `id` by `delta` places (-1 up, +1 down); returns only if something changed. */
export function moveDefinition<T extends OrderedDef>(defs: readonly T[], id: string, delta: number): T[] {
  const from = defs.findIndex((d) => d.id === id);
  if (from === -1) return [...defs];
  return renumber(moveItem(defs, from, from + delta));
}

/** Stable display sort (displayOrder, then original position). */
export function sortByDisplayOrder<T extends OrderedDef>(defs: readonly T[]): T[] {
  return defs
    .map((d, i) => ({ d, i }))
    .sort((a, b) => a.d.displayOrder - b.d.displayOrder || a.i - b.i)
    .map((x) => x.d);
}

// ---- select options -------------------------------------------------------------------------------

export interface EditableOption extends FieldOption { color: string }

/** Value for a new option: the label, made unique among existing values. */
export function uniqueOptionValue(label: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map(norm));
  const base = label.trim();
  if (!used.has(norm(base))) return base;
  let n = 2;
  while (used.has(norm(`${base} ${n}`))) n += 1;
  return `${base} ${n}`;
}

export function nextColor(options: readonly { color?: string }[]): string {
  const used = new Set(options.map((o) => o.color));
  return (OPTION_COLORS.find((c) => !used.has(c.value)) ?? OPTION_COLORS[options.length % OPTION_COLORS.length])!.value;
}

export function addOption(options: readonly EditableOption[], label: string, color?: string): EditableOption[] {
  const t = label.trim();
  if (!t) return [...options];
  return [...options, { value: uniqueOptionValue(t, options.map((o) => o.value)), label: t, color: color ?? nextColor(options) }];
}

export function updateOption(options: readonly EditableOption[], value: string, patch: { label?: string; color?: string }): EditableOption[] {
  return options.map((o) => (o.value === value ? { ...o, ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.color !== undefined ? { color: patch.color } : {}) } : o));
}

export function removeOption(options: readonly EditableOption[], value: string): EditableOption[] {
  return options.filter((o) => o.value !== value);
}

export function moveOption(options: readonly EditableOption[], value: string, delta: number): EditableOption[] {
  const from = options.findIndex((o) => o.value === value);
  return from === -1 ? [...options] : moveItem(options, from, from + delta);
}

/** Problems with an option list (empty / duplicate labels), keyed by option value. */
export function validateOptions(options: readonly FieldOption[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const o of options) {
    const key = norm(o.label);
    if (!key) { errors[o.value] = 'Give the option a label'; continue; }
    const first = seen.get(key);
    if (first !== undefined) errors[o.value] = 'Two options have the same label';
    else seen.set(key, o.value);
  }
  return errors;
}

/** Give each option a colour (palette order) when it has none. */
export function withColors(options: readonly FieldOption[]): EditableOption[] {
  const out: EditableOption[] = [];
  for (const o of options) out.push({ ...o, color: o.color ?? nextColor(out) });
  return out;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Split options into what is stored in `options` (values) and `settings.optionMeta` (labels, colours). */
export function serializeOptions(options: readonly FieldOption[], settings: FieldSettings = {}): { values: string[]; settings: FieldSettings } {
  const optionMeta: NonNullable<FieldSettings['optionMeta']> = {};
  for (const o of options) {
    const meta: { label?: string; color?: string } = {};
    const label = o.label.trim();
    if (label && label !== o.value) meta.label = label;
    if (o.color && HEX.test(o.color)) meta.color = o.color;
    if (meta.label !== undefined || meta.color !== undefined) optionMeta[o.value] = meta;
  }
  const next: FieldSettings = { ...settings };
  if (Object.keys(optionMeta).length) next.optionMeta = optionMeta;
  else delete next.optionMeta;
  return { values: options.map((o) => o.value), settings: next };
}

/** Inverse of `serializeOptions`: apply labels/colours from settings onto the stored option values. */
export function applyOptionMeta(options: readonly FieldOption[], settings: FieldSettings | null | undefined): FieldOption[] {
  const meta = settings?.optionMeta;
  if (!meta) return [...options];
  return options.map((o) => {
    const m = meta[o.value];
    if (!m) return o;
    return { ...o, ...(m.label ? { label: m.label } : {}), ...(m.color && HEX.test(m.color) ? { color: m.color } : {}) };
  });
}

// ---- renaming a field ------------------------------------------------------------------------------

/**
 * Re-key a contact's custom field values when a field is renamed (values are stored by label).
 * Returns the new object (original key order kept), or null when the contact has no value to move
 * or the new key is already in use.
 */
export function renameCustomFieldKey(
  customFields: Record<string, unknown> | null | undefined,
  oldLabel: string,
  newLabel: string
): Record<string, unknown> | null {
  if (!customFields || oldLabel === newLabel) return null;
  if (!Object.prototype.hasOwnProperty.call(customFields, oldLabel)) return null;
  if (Object.prototype.hasOwnProperty.call(customFields, newLabel)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(customFields)) out[k === oldLabel ? newLabel : k] = v;
  return out;
}

/** Drop select values that are no longer valid options (used after removing an option). */
export function pruneRemovedOption(value: unknown, removed: string): unknown {
  if (Array.isArray(value)) {
    const next = value.filter((v) => v !== removed);
    return next.length === value.length ? value : next.length ? next : null;
  }
  return value === removed ? null : value;
}
