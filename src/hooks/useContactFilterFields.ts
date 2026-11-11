import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildContactFilterFields, type CustomFieldDefinitionLike } from '../lib/filters/contactFilterFields';

/** Custom field definitions are loaded once per page load and shared by all views. */
let cache: CustomFieldDefinitionLike[] | null = null;
let inflight: Promise<CustomFieldDefinitionLike[]> | null = null;
const listeners = new Set<(defs: CustomFieldDefinitionLike[]) => void>();

async function loadDefinitions(): Promise<CustomFieldDefinitionLike[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase
          .from('custom_field_definitions')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((d: any) => ({
          id: d.id,
          label: d.label,
          fieldType: d.field_type ?? d.fieldType,
          options: d.options,
        }));
      } catch {
        return [];
      }
    })().then((defs) => {
      cache = defs;
      listeners.forEach((l) => l(defs));
      return defs;
    });
  }
  return inflight;
}

/** Built-in + custom contact fields, in the shape the filter/group engines expect. */
export function useContactFilterFields() {
  const [defs, setDefs] = useState<CustomFieldDefinitionLike[]>(cache ?? []);
  useEffect(() => {
    listeners.add(setDefs);
    void loadDefinitions().then(setDefs);
    return () => { listeners.delete(setDefs); };
  }, []);
  return useMemo(() => buildContactFilterFields(defs), [defs]);
}

/** Test helper / manual refresh after custom fields change. */
export function resetContactFilterFieldsCache() {
  cache = null;
  inflight = null;
}
