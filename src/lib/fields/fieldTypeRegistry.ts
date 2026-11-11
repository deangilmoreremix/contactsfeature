/**
 * Custom field types: how each type is labelled, formatted, validated and parsed from text.
 * The type list follows Twenty's field metadata types (FieldMetadataType, MIT) for the types we support.
 */
export type CustomFieldType =
  | 'text' | 'number' | 'currency' | 'rating' | 'boolean' | 'date' | 'datetime'
  | 'select' | 'multiselect' | 'url' | 'email' | 'phone';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldTypeMeta {
  type: CustomFieldType;
  label: string;
  hasOptions?: boolean;
}

export const FIELD_TYPES: FieldTypeMeta[] = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'currency', label: 'Currency' },
  { type: 'rating', label: 'Rating (1-5)' },
  { type: 'boolean', label: 'Yes / No' },
  { type: 'date', label: 'Date' },
  { type: 'datetime', label: 'Date & time' },
  { type: 'select', label: 'Select', hasOptions: true },
  { type: 'multiselect', label: 'Multi-select', hasOptions: true },
  { type: 'url', label: 'Link' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Phone' },
];

export interface FieldSettings {
  currency?: string;
  decimals?: number;
}

/** Options may be stored as plain strings or {value,label} objects. */
export function normalizeOptions(options: unknown): FieldOption[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o) => (typeof o === 'string' ? { value: o, label: o } : o && typeof o === 'object' ? { value: String((o as FieldOption).value), label: String((o as FieldOption).label ?? (o as FieldOption).value) } : null))
    .filter((o): o is FieldOption => !!o && o.value !== '');
}

export const isEmptyFieldValue = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

export function formatFieldValue(type: CustomFieldType, value: unknown, settings: FieldSettings = {}): string {
  if (isEmptyFieldValue(value)) return '';
  switch (type) {
    case 'boolean':
      return value === true || value === 'true' ? 'Yes' : 'No';
    case 'number':
      return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : String(value);
    case 'currency': {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: settings.currency || 'USD',
          minimumFractionDigits: settings.decimals ?? 0,
          maximumFractionDigits: settings.decimals ?? 2,
        }).format(n);
      } catch {
        return String(n);
      }
    }
    case 'rating': {
      const n = Math.max(0, Math.min(5, Math.round(Number(value))));
      return Number.isFinite(n) ? '★'.repeat(n) + '☆'.repeat(5 - n) : String(value);
    }
    case 'date': {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    case 'datetime': {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    case 'multiselect':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
}

/** Convert text typed in an input into the stored value for a field type. Returns null for "empty". */
export function coerceFieldValue(type: CustomFieldType, raw: string | string[] | boolean | null): unknown {
  if (raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0)) return null;
  switch (type) {
    case 'number':
    case 'currency': {
      const n = Number(String(raw).replace(/[,\s$€£]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    case 'rating': {
      const n = Math.round(Number(raw));
      return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : null;
    }
    case 'boolean':
      return raw === true || raw === 'true';
    case 'multiselect':
      return Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    default:
      return String(raw).trim();
  }
}

export function validateFieldValue(type: CustomFieldType, value: unknown): string | null {
  if (isEmptyFieldValue(value)) return null;
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) ? null : 'Enter a valid email address';
    case 'url':
      return /^https?:\/\/\S+$/i.test(String(value)) ? null : 'Enter a link starting with http:// or https://';
    case 'phone':
      return /^[+\d][\d\s().-]{5,}$/.test(String(value)) ? null : 'Enter a valid phone number';
    case 'number':
    case 'currency':
      return Number.isFinite(Number(value)) ? null : 'Enter a number';
    case 'date':
    case 'datetime':
      return Number.isNaN(new Date(String(value)).getTime()) ? 'Enter a valid date' : null;
    default:
      return null;
  }
}
