/** Single-record export (CSV reuses the injection-safe contactCsv helpers). */
import type { Contact } from '../../types/contact';
import { contactsToCsv } from '../../utils/contactCsv';

export const SINGLE_CONTACT_EXPORT_COLUMNS = [
  'id', 'firstName', 'lastName', 'name', 'email', 'phone', 'title', 'company', 'industry',
  'sources', 'interestLevel', 'status', 'aiScore', 'tags', 'notes', 'customFields', 'createdAt', 'updatedAt',
] as const;

export type ContactExportFormat = 'csv' | 'json';

export function contactExportFilename(contact: Pick<Contact, 'name' | 'id'>, format: ContactExportFormat): string {
  const slug = (contact.name || 'contact').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'contact';
  return `${slug}.${format}`;
}

export function contactExportContent(contact: Contact, format: ContactExportFormat): { content: string; mime: string } {
  if (format === 'json') return { content: JSON.stringify(contact, null, 2), mime: 'application/json;charset=utf-8' };
  return { content: contactsToCsv([contact], SINGLE_CONTACT_EXPORT_COLUMNS), mime: 'text/csv;charset=utf-8' };
}

/** Browser download of one contact. */
export function downloadContact(contact: Contact, format: ContactExportFormat): void {
  const { content, mime } = contactExportContent(contact, format);
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = contactExportFilename(contact, format);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
