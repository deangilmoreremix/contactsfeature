/**
 * Nested AND/OR contact filtering.
 *
 *   RecordFilter[] + RecordFilterGroup[]
 *     -> computeRecordGqlOperationFilter   (vendored MIT twenty-shared, unchanged)
 *     -> matchesGqlFilter                  (this file: in-memory evaluation on Contact objects,
 *                                           using the vendored MIT isMatching*Filter helpers)
 *
 * The record walker is our own implementation (Twenty's equivalent lives in AGPL front-end code).
 */
import type { Contact } from '../../types/contact';
import { computeRecordGqlOperationFilter } from '../../vendor/twenty-shared/utils/filter/computeRecordGqlOperationFilter';
import type {
  RecordFilter,
  RecordFilterGroup,
} from '../../vendor/twenty-shared/utils/filter/turnRecordFilterGroupIntoGqlOperationFilter';
import type { RecordGqlOperationFilter } from '../../vendor/twenty-shared/types/RecordGqlOperationFilter';
import { getFilterTypeFromFieldType } from '../../vendor/twenty-shared/utils/filter/utils/getFilterTypeFromFieldType';
import { isMatchingStringFilter } from '../../vendor/twenty-shared/utils/filter/utils/isMatchingStringFilter';
import { isMatchingFloatFilter } from '../../vendor/twenty-shared/utils/filter/utils/isMatchingFloatFilter';
import { isMatchingDateFilter } from '../../vendor/twenty-shared/utils/filter/utils/isMatchingDateFilter';
import { isMatchingBooleanFilter } from '../../vendor/twenty-shared/utils/filter/utils/isMatchingBooleanFilter';
import { isMatchingSelectFilter } from '../../vendor/twenty-shared/utils/filter/utils/isMatchingSelectFilter';
import { isMatchingMultiSelectFilter } from '../../vendor/twenty-shared/utils/filter/utils/isMatchingMultiSelectFilter';
import { isMatchingArrayFilter } from '../../vendor/twenty-shared/utils/filter/utils/isMatchingArrayFilter';
import type { ContactFilterField } from './contactFilterFields';

export type { RecordFilter, RecordFilterGroup };

type Anyish = Record<string, any>;

/** Contact.lastConnected is sometimes "YYYY-MM-DD at h:mm pm" – make it parseable. */
export function toIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const str = String(value).replace(/\s+at\s+/i, ' ');
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function getContactFieldValue(contact: Contact, field: ContactFilterField): unknown {
  if (field.source === 'custom') {
    const cf = (contact as Anyish).customFields ?? {};
    const id = field.id.replace(/^custom:/, '');
    return cf[field.label] ?? cf[id] ?? null;
  }
  return (contact as Anyish)[field.name];
}

const isEmptyValue = (v: unknown) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

function matchLeaf(filter: Anyish, value: unknown, field: ContactFilterField): boolean {
  // Generic null handling first (works for every field type).
  if (filter['is'] === 'NULL') return isEmptyValue(value);
  if (filter['is'] === 'NOT_NULL') return !isEmptyValue(value);
  if (filter['isEmptyArray'] === true) return Array.isArray(value) ? value.length === 0 : isEmptyValue(value);

  const type = getFilterTypeFromFieldType(field.type);
  switch (type) {
    case 'TEXT':
      return value == null ? false : isMatchingStringFilter({ stringFilter: filter, value: String(value) });
    case 'NUMBER':
    case 'RATING': {
      const n = typeof value === 'number' ? value : value == null || value === '' ? NaN : Number(value);
      return Number.isNaN(n) ? false : isMatchingFloatFilter({ floatFilter: filter, value: n });
    }
    case 'DATE':
    case 'DATE_TIME': {
      const iso = toIsoDate(value);
      return iso === null ? false : isMatchingDateFilter({ dateFilter: filter, value: iso });
    }
    case 'BOOLEAN':
      return isMatchingBooleanFilter({ booleanFilter: filter, value: Boolean(value) });
    case 'SELECT':
      return value == null ? false : isMatchingSelectFilter({ selectFilter: filter, value: String(value) });
    case 'MULTI_SELECT':
      return isMatchingMultiSelectFilter({
        multiSelectFilter: filter,
        value: Array.isArray(value) ? value.map(String) : value == null ? null : [String(value)],
      });
    case 'ARRAY':
      return isMatchingArrayFilter({
        arrayFilter: filter,
        value: Array.isArray(value) ? value.map(String) : null,
      });
    default:
      return false;
  }
}

/** Evaluate a GQL-style filter object against a contact. Unknown fields never match. */
export function matchesGqlFilter(
  filter: RecordGqlOperationFilter | Anyish | undefined,
  contact: Contact,
  fieldsByName: Map<string, ContactFilterField>
): boolean {
  if (!filter) return true;
  const entries = Object.entries(filter as Anyish);
  if (entries.length === 0) return true;
  return entries.every(([key, cond]) => {
    if (key === 'and') return (cond as Anyish[]).every((c) => matchesGqlFilter(c, contact, fieldsByName));
    if (key === 'or') return (cond as Anyish[]).some((c) => matchesGqlFilter(c, contact, fieldsByName));
    if (key === 'not') return !matchesGqlFilter(cond, contact, fieldsByName);
    const field = fieldsByName.get(key);
    if (!field) return false;
    return matchLeaf(cond as Anyish, getContactFieldValue(contact, field), field);
  });
}

export interface ContactFilterState {
  recordFilters: RecordFilter[];
  recordFilterGroups: RecordFilterGroup[];
}

/** Compile filter state to a GQL-style filter object (also reusable for Supabase translation). */
export function compileContactFilter(state: ContactFilterState, fields: ContactFilterField[]): RecordGqlOperationFilter {
  return computeRecordGqlOperationFilter({
    fieldMetadataItems: fields,
    recordFilters: state.recordFilters,
    recordFilterGroups: state.recordFilterGroups,
    filterValueDependencies: {},
  });
}

export function filterContacts(
  contacts: Contact[],
  state: ContactFilterState,
  fields: ContactFilterField[]
): Contact[] {
  if (state.recordFilters.length === 0) return contacts;
  const gql = compileContactFilter(state, fields);
  const byName = new Map(fields.map((f) => [f.name, f]));
  return contacts.filter((c) => matchesGqlFilter(gql, c, byName));
}
