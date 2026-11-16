/**
 * Contact CSV export. Escaping and CSV-injection protection come from the vendored MIT
 * twenty-shared helpers (formatValueForCSV / sanitizeValueForCSVExport): values that start with
 * =, +, -, @ (etc.) are prefixed with a zero-width joiner so spreadsheets never evaluate them.
 */
import type { Contact } from '../types/contact';
import { formatValueForCSV } from '../vendor/twenty-shared/utils/csv/formatValueForCSV';
import { normalizeAddress, normalizeEmailEntries, normalizeLinkEntries, normalizePhoneEntries, serializeLabeled } from '../lib/fields/compositeFields';
import { sanitizeValueForCSVExport } from '../vendor/twenty-shared/utils/csv/sanitizeValueForCSVExport';

export const DEFAULT_CONTACT_EXPORT_COLUMNS = [
  'id', 'firstName', 'lastName', 'email', 'phone', 'title',
  'company', 'industry', 'interestLevel', 'status', 'aiScore',
] as const;

/** Optional columns for the composite fields ("Label|value; Label|value"; address as JSON). */
export const COMPOSITE_EXPORT_COLUMNS = ['additionalEmails', 'additionalPhones', 'links', 'address'] as const;

function compositeCell(column: string, value: unknown): string | null {
  switch (column) {
    case 'additionalEmails': return serializeLabeled(normalizeEmailEntries(value));
    case 'additionalPhones': return serializeLabeled(normalizePhoneEntries(value));
    case 'links': return serializeLabeled(normalizeLinkEntries(value));
    case 'address': {
      const a = normalizeAddress(value);
      return Object.keys(a).length ? JSON.stringify(a) : '';
    }
    default: return null;
  }
}

function cell(value: unknown, column = ''): string {
  const composite = compositeCell(column, value);
  // Composite text still goes through the injection guard (a label like "=cmd" is neutralized).
  if (composite !== null) return formatValueForCSV(composite ? sanitizeValueForCSVExport(composite) : '');
  if (value == null) return '';
  // Arrays/objects (tags, socialProfiles...) are exported as JSON; scalars are sanitized first.
  const prepared = typeof value === 'object' ? JSON.stringify(value) : sanitizeValueForCSVExport(value);
  return formatValueForCSV(prepared);
}

export function contactsToCsv(
  contacts: Contact[],
  columns: readonly string[] = DEFAULT_CONTACT_EXPORT_COLUMNS
): string {
  const header = columns.map((c) => formatValueForCSV(c)).join(',');
  const rows = contacts.map((contact) =>
    columns.map((c) => cell((contact as unknown as Record<string, unknown>)[c], c)).join(',')
  );
  return [header, ...rows].join('\n');
}

export function contactsToCsvBlob(contacts: Contact[], columns?: readonly string[]): Blob {
  return new Blob([contactsToCsv(contacts, columns)], { type: 'text/csv;charset=utf-8' });
}
