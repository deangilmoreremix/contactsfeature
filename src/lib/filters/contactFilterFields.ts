/**
 * Field metadata for contact filtering. Describes our `Contact` shape (and custom fields)
 * in the form the vendored MIT filter engine (src/vendor/twenty-shared) expects.
 */
import { FieldMetadataType } from '../../vendor/twenty-shared/types/FieldMetadataType';
import type { FieldShared } from '../../vendor/twenty-shared/utils/filter/turnRecordFilterIntoGqlOperationFilter';

export interface ContactFilterField extends FieldShared {
  /** Where the value lives on a Contact (property name, or custom field id). */
  source: 'property' | 'custom';
  /** Allowed values for SELECT / MULTI_SELECT fields (drives the value picker). */
  options?: { value: string; label: string }[];
}

const STATUS_OPTIONS = ['lead', 'prospect', 'customer', 'churned', 'active', 'pending', 'inactive'];
const INTEREST_OPTIONS = ['hot', 'medium', 'low', 'cold'];

const opts = (values: string[]) =>
  values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

const field = (
  name: string,
  label: string,
  type: FieldMetadataType,
  options?: string[]
): ContactFilterField => ({
  id: name,
  name,
  label,
  type,
  source: 'property',
  ...(options ? { options: opts(options) } : {}),
});

/** Built-in contact fields that can be filtered. Field id === property name. */
export const BASE_CONTACT_FILTER_FIELDS: ContactFilterField[] = [
  field('name', 'Name', FieldMetadataType.TEXT),
  field('email', 'Email', FieldMetadataType.TEXT),
  field('phone', 'Phone', FieldMetadataType.TEXT),
  field('company', 'Company', FieldMetadataType.TEXT),
  field('title', 'Title', FieldMetadataType.TEXT),
  field('industry', 'Industry', FieldMetadataType.TEXT),
  field('notes', 'Notes', FieldMetadataType.TEXT),
  field('status', 'Status', FieldMetadataType.SELECT, STATUS_OPTIONS),
  field('interestLevel', 'Interest', FieldMetadataType.SELECT, INTEREST_OPTIONS),
  field('aiScore', 'AI Score', FieldMetadataType.NUMBER),
  field('tags', 'Tags', FieldMetadataType.MULTI_SELECT),
  field('sources', 'Sources', FieldMetadataType.MULTI_SELECT),
  field('isFavorite', 'Favorite', FieldMetadataType.BOOLEAN),
  field('lastConnected', 'Last contact', FieldMetadataType.DATE_TIME),
  field('createdAt', 'Created', FieldMetadataType.DATE_TIME),
  field('updatedAt', 'Updated', FieldMetadataType.DATE_TIME),
];

export interface CustomFieldDefinitionLike {
  id: string;
  label: string;
  fieldType: string;
  options?: string[] | { value: string; label?: string }[] | undefined;
}

const CUSTOM_TYPE_MAP: Record<string, FieldMetadataType> = {
  text: FieldMetadataType.TEXT,
  url: FieldMetadataType.TEXT,
  email: FieldMetadataType.TEXT,
  phone: FieldMetadataType.TEXT,
  number: FieldMetadataType.NUMBER,
  currency: FieldMetadataType.NUMBER,
  boolean: FieldMetadataType.BOOLEAN,
  date: FieldMetadataType.DATE,
  datetime: FieldMetadataType.DATE_TIME,
  select: FieldMetadataType.SELECT,
  multiselect: FieldMetadataType.MULTI_SELECT,
  rating: FieldMetadataType.RATING,
};

/** Add custom-field definitions (from useCustomFieldDefinitions) as filterable fields. */
export function buildContactFilterFields(
  customDefinitions: CustomFieldDefinitionLike[] = []
): ContactFilterField[] {
  const custom: ContactFilterField[] = customDefinitions
    .filter((d) => CUSTOM_TYPE_MAP[d.fieldType])
    .map((d) => {
      const options = (d.options ?? []).map((o) =>
        typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }
      );
      return {
        id: `custom:${d.id}`,
        name: `custom:${d.id}`,
        label: d.label,
        type: CUSTOM_TYPE_MAP[d.fieldType] as FieldMetadataType,
        source: 'custom' as const,
        ...(options.length ? { options } : {}),
      };
    });
  return [...BASE_CONTACT_FILTER_FIELDS, ...custom];
}
