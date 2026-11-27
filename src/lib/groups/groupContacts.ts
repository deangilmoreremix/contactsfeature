/**
 * Group contacts by a field (company, status, tags, select custom fields...).
 * Inspired by Twenty's record-group (AGPL) – reimplemented for in-memory Contact lists.
 */
import type { Contact } from '../../types/contact';
import { FieldMetadataType } from '../../vendor/twenty-shared/types/FieldMetadataType';
import type { ContactFilterField } from '../filters/contactFilterFields';
import { getContactFieldValue } from '../filters/filterContacts';

export interface ContactGroup {
  /** Stable key (option value, or '' for "No value"). */
  key: string;
  label: string;
  contacts: Contact[];
}

export const NO_VALUE_KEY = '';

/** Fields that make sense as groupings. */
export function getGroupableFields(fields: ContactFilterField[]): ContactFilterField[] {
  const builtIn = new Set(['status', 'interestLevel', 'company', 'industry', 'title', 'tags', 'sources', 'isFavorite']);
  return fields.filter((f) => {
    if (f.source === 'custom') {
      return f.type === FieldMetadataType.SELECT || f.type === FieldMetadataType.MULTI_SELECT || f.type === FieldMetadataType.BOOLEAN;
    }
    return builtIn.has(f.name);
  });
}

const labelFor = (field: ContactFilterField, key: string): string => {
  if (key === NO_VALUE_KEY) return 'No value';
  if (field.type === FieldMetadataType.BOOLEAN) return key === 'true' ? 'Yes' : 'No';
  const option = field.options?.find((o) => o.value === key);
  if (option) return option.label;
  return key.charAt(0).toUpperCase() + key.slice(1);
};

/** Values a contact belongs to for this field (multi-select fields yield several). */
export function groupKeysFor(contact: Contact, field: ContactFilterField): string[] {
  const raw = getContactFieldValue(contact, field);
  if (field.type === FieldMetadataType.BOOLEAN) return [raw ? 'true' : 'false'];
  if (Array.isArray(raw)) {
    const keys = raw.map((v) => String(v).trim()).filter(Boolean);
    return keys.length ? keys : [NO_VALUE_KEY];
  }
  if (raw == null || String(raw).trim() === '') return [NO_VALUE_KEY];
  return [String(raw).trim()];
}

/**
 * Split contacts into groups. Order inside a group follows the input order (so the current sort is kept).
 * Groups follow the field's option order when it has options, otherwise alphabetical; "No value" is last.
 */
export function groupContacts(contacts: Contact[], field: ContactFilterField): ContactGroup[] {
  const map = new Map<string, Contact[]>();
  for (const contact of contacts) {
    for (const key of groupKeysFor(contact, field)) {
      const list = map.get(key);
      if (list) list.push(contact);
      else map.set(key, [contact]);
    }
  }
  const optionOrder = new Map((field.options ?? []).map((o, i) => [o.value, i]));
  const keys = [...map.keys()].sort((a, b) => {
    if (a === NO_VALUE_KEY) return 1;
    if (b === NO_VALUE_KEY) return -1;
    const ai = optionOrder.get(a);
    const bi = optionOrder.get(b);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
  return keys.map((key) => ({ key, label: labelFor(field, key), contacts: map.get(key) ?? [] }));
}
