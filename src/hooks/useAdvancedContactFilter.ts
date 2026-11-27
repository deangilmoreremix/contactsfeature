import { useMemo } from 'react';
import type { Contact } from '../types/contact';
import { useContactFilterStore } from '../store/contactFilterStore';
import { filterContacts } from '../lib/filters/filterContacts';
import { useContactFilterFields } from './useContactFilterFields';

/** Applies the advanced AND/OR filter state to a list of contacts. */
export function useAdvancedContactFilter(contacts: Contact[]) {
  const recordFilters = useContactFilterStore((s) => s.recordFilters);
  const recordFilterGroups = useContactFilterStore((s) => s.recordFilterGroups);
  const fields = useContactFilterFields();

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
