import { supabase } from '../lib/supabase';
import type { CustomFieldType, FieldOption, FieldSettings } from '../lib/fields/fieldTypeRegistry';
import { normalizeOptions } from '../lib/fields/fieldTypeRegistry';

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

const fromRow = (r: any): CustomFieldDef => ({
  id: r.id,
  label: r.label,
  fieldType: (r.field_type ?? r.fieldType) as CustomFieldType,
  options: normalizeOptions(r.options),
  settings: (r.settings ?? {}) as FieldSettings,
  displayOrder: r.display_order ?? 0,
});

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
    if (!user) return local;
    const { data, error } = await supabase.from('custom_field_definitions').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (error) throw error;
    return [...(data ?? []).map(fromRow), ...local];
  } catch {
    return local;
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
