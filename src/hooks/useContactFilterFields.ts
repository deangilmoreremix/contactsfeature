import { useEffect, useMemo, useState } from 'react';
import { listCustomFields, onCustomFieldsChanged } from '../services/customFieldService';
import { buildContactFilterFields, type CustomFieldDefinitionLike } from '../lib/filters/contactFilterFields';

/** Custom field definitions are loaded once per page load and shared by all views. */
let cache: CustomFieldDefinitionLike[] | null = null;
let inflight: Promise<CustomFieldDefinitionLike[]> | null = null;
const listeners = new Set<(defs: CustomFieldDefinitionLike[]) => void>();

async function loadDefinitions(): Promise<CustomFieldDefinitionLike[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = listCustomFields()
      .then((defs) =>
        defs.map((d) => ({ id: d.id, label: d.label, fieldType: d.fieldType, options: d.options }))
      )
      .catch(() => [] as CustomFieldDefinitionLike[])
      .then((defs) => {
        cache = defs;
        listeners.forEach((l) => l(defs));
        return defs;
      });
  }
  return inflight;
}

// When definitions are created/removed, reload them for every subscribed view.
onCustomFieldsChanged(() => {
  cache = null;
  inflight = null;
  void loadDefinitions();
});

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
