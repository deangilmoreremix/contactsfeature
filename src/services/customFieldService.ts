import { supabase } from '../lib/supabase';
import type { CustomFieldType, FieldOption, FieldSettings } from '../lib/fields/fieldTypeRegistry';
import { normalizeOptions } from '../lib/fields/fieldTypeRegistry';
import { applyOptionMeta, serializeOptions, sortByDisplayOrder, validateFieldLabel } from '../lib/fields/fieldDefinitionEdit';

export interface CustomFieldDef {
  id: string;
  label: string;
  fieldType: CustomFieldType;
  options: FieldOption[];
  settings: FieldSettings;
  displayOrder: number;
}

const LOCAL_KEY = 'smartcrm.custom_field_definitions';
const readLocal = (): CustomFieldDef[] => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
};
const writeLocal = (defs: CustomFieldDef[]) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(defs)); } catch { /* unavailable */ }
};

const fromRow = (r: any): CustomFieldDef => {
  const settings = (r.settings ?? {}) as FieldSettings;
  return {
    id: r.id,
    label: r.label,
    fieldType: (r.field_type ?? r.fieldType) as CustomFieldType,
    // Stored values + the editable labels/colours kept in settings.optionMeta.
    options: applyOptionMeta(normalizeOptions(r.options), settings),
    settings,
    displayOrder: r.display_order ?? 0,
  };
};

let listeners: Array<() => void> = [];
export const onCustomFieldsChanged = (fn: () => void) => {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
};
const notify = () => listeners.forEach((l) => l());

/** Definitions: the signed-in user's database rows plus any local (offline) ones. */
export async function listCustomFields(): Promise<CustomFieldDef[]> {
  const local = readLocal();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return sortByDisplayOrder(local);
    const { data, error } = await supabase.from('custom_field_definitions').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (error) throw error;
    return sortByDisplayOrder([...(data ?? []).map(fromRow), ...local]);
  } catch {
    return sortByDisplayOrder(local);
  }
}

export async function createCustomField(input: {
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  settings?: FieldSettings;
}): Promise<CustomFieldDef> {
  const label = input.label.trim();
  if (!label) throw new Error('Give the field a name');
  const existing = await listCustomFields();
  if (existing.some((d) => d.label.toLowerCase() === label.toLowerCase())) throw new Error('A field with that name already exists');
  const options = normalizeOptions(input.options ?? []);

  let user: { id: string } | null = null;
  try { user = (await supabase.auth.getUser()).data.user; } catch { user = null; }

  if (user) {
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        user_id: user.id,
        name: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label,
        field_type: input.fieldType,
        options: options.length ? options.map((o) => o.value) : null,
        settings: input.settings ?? {},
        display_order: existing.length,
      } as never)
      .select()
      .maybeSingle();
    if (error || !data) throw error ?? new Error('Could not create the field');
    notify();
    return fromRow(data);
  }

  const def: CustomFieldDef = {
    id: `local-${Date.now()}`,
    label,
    fieldType: input.fieldType,
    options,
    settings: input.settings ?? {},
    displayOrder: existing.length,
  };
  writeLocal([...readLocal(), def]);
  notify();
  return def;
}

export async function deleteCustomField(def: CustomFieldDef): Promise<void> {
  if (def.id.startsWith('local-')) {
    writeLocal(readLocal().filter((d) => d.id !== def.id));
  } else {
    const { error } = await supabase.from('custom_field_definitions').update({ is_active: false } as never).eq('id', def.id);
    if (error) throw error;
  }
  notify();
}

/** Rename a field and/or change its options (labels, colours, order) and settings. Values are never rewritten here. */
export async function updateCustomField(
  def: CustomFieldDef,
  patch: { label?: string; options?: FieldOption[]; settings?: FieldSettings }
): Promise<CustomFieldDef> {
  const label = patch.label !== undefined ? patch.label.trim() : def.label;
  if (patch.label !== undefined) {
    const problem = validateFieldLabel(label, await listCustomFields(), def.id);
    if (problem) throw new Error(problem);
  }
  const options = patch.options ?? def.options;
  const base = serializeOptions(options, patch.settings ?? def.settings);
  const next: CustomFieldDef = { ...def, label, options, settings: base.settings };

  if (def.id.startsWith('local-')) {
    // Local definitions keep full option objects.
    writeLocal(readLocal().map((d) => (d.id === def.id ? next : d)));
  } else {
    const { error } = await supabase
      .from('custom_field_definitions')
      .update({
        label,
        options: base.values.length ? base.values : null,
        settings: base.settings,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', def.id);
    if (error) throw error;
  }
  notify();
  return next;
}

/** Persist a new order: `ordered` is the full list in the wanted order (displayOrder 0..n-1). */
export async function reorderCustomFields(ordered: CustomFieldDef[]): Promise<void> {
  const withOrder = ordered.map((d, i) => ({ ...d, displayOrder: i }));
  const localById = new Map(withOrder.filter((d) => d.id.startsWith('local-')).map((d) => [d.id, d]));
  if (localById.size) writeLocal(readLocal().map((d) => localById.get(d.id) ?? d));
  const remote = withOrder.filter((d) => !d.id.startsWith('local-'));
  const results = await Promise.all(
    remote.map((d) => supabase.from('custom_field_definitions').update({ display_order: d.displayOrder } as never).eq('id', d.id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  notify();
}
