import { useMemo } from 'react';
import type { Contact } from '../types/contact';
import { useContactFilterStore } from '../store/contactFilterStore';
import { buildContactFilterFields } from '../lib/filters/contactFilterFields';
import { filterContacts } from '../lib/filters/filterContacts';
import { useCustomFieldDefinitions } from './useCustomFields';

/** Applies the advanced AND/OR filter state to a list of contacts. */
export function useAdvancedContactFilter(contacts: Contact[]) {
  const recordFilters = useContactFilterStore((s) => s.recordFilters);
  const recordFilterGroups = useContactFilterStore((s) => s.recordFilterGroups);
  const { fields: defs } = useCustomFieldDefinitions();

  const fields = useMemo(
    () =>
      buildContactFilterFields(
        // Rows come straight from Supabase (snake_case) – accept both shapes.
        (defs as any[])
          .filter((d) => (d.isActive ?? d.is_active) !== false)
          .map((d) => ({ id: d.id, label: d.label, fieldType: d.fieldType ?? d.field_type, options: d.options }))
      ),
    [defs]
  );

  const filtered = useMemo(() => {
    try {
      return filterContacts(contacts, { recordFilters, recordFilterGroups }, fields);
    } catch (error) {
      // A half-edited filter (e.g. unparsable value) must never blank the whole list.
      console.warn('Advanced filter could not be applied', error);
      return contacts;
    }
  }, [contacts, recordFilters, recordFilterGroups, fields]);

  return { filtered, fields, activeCount: recordFilters.length };
}
