import { useMemo, useState } from 'react';
import type { Contact } from '../types/contact';
import { useContactViewStore } from '../store/contactViewStore';
import { useContactFilterFields } from './useContactFilterFields';
import { groupContacts, type ContactGroup } from '../lib/groups/groupContacts';

/** Grouping for List/Table. Returns null while no group-by field is selected. */
export function useContactGroups(contacts: Contact[]) {
  const groupBy = useContactViewStore((s) => s.groupBy);
  const fields = useContactFilterFields();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups: ContactGroup[] | null = useMemo(() => {
    if (!groupBy) return null;
    const field = fields.find((f) => f.id === groupBy);
    return field ? groupContacts(contacts, field) : null;
  }, [groupBy, fields, contacts]);

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return { groups, isCollapsed: (key: string) => collapsed.has(key), toggle };
}
