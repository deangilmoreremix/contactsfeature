/**
 * vCard 3.0 (RFC 2426 / 6350 style) export for contacts. Pure: returns text with CRLF line endings,
 * text values escaped (backslash, comma, semicolon, newline) and every line folded at 75 octets.
 */
import type { Contact } from '../../types/contact';

const CRLF = '\r\n';
const encoder = new TextEncoder();

/** Escapes a TEXT value; control characters other than newlines are dropped. */
export function escapeVcardText(value: unknown): string {
  const s = typeof value === 'string' ? value : value == null ? '' : String(value);
  return s
    .replace(/\r\n|\r/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Folds a content line so no physical line exceeds 75 octets (continuations start with one space). Never splits a code point. */
export function foldVcardLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
      limit = 74; // the leading space of a continuation line counts toward the 75
    }
    current += ch;
    bytes += size;
  }
  if (current) parts.push(current);
  return parts.join(`${CRLF} `);
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** http(s) URLs only; anything else (javascript:, data:, relative, malformed) is dropped. */
export function safeVcardUrl(raw: unknown): string | null {
  if (!nonEmpty(raw)) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

const EMAIL_TYPES: Record<string, string> = { work: 'WORK', personal: 'HOME', home: 'HOME' };
const PHONE_TYPES: Record<string, string> = { work: 'WORK', mobile: 'CELL', home: 'HOME' };

function typeParam(base: string, map: Record<string, string>, label: string | undefined): string {
  const t = map[(label ?? '').trim().toLowerCase()];
  return t ? `${base};TYPE=${t}` : base;
}

function splitName(c: Pick<Contact, 'name' | 'firstName' | 'lastName'>): { family: string; given: string } {
  if (nonEmpty(c.firstName) || nonEmpty(c.lastName)) return { family: (c.lastName ?? '').trim(), given: (c.firstName ?? '').trim() };
  const parts = (c.name ?? '').trim().split(/\s+/).filter(Boolean);
  return { given: parts[0] ?? '', family: parts.slice(1).join(' ') };
}

/** Content lines (unfolded, unterminated) of one VCARD. */
export function contactToVcardLines(c: Contact): string[] {
  const { family, given } = splitName(c);
  const fn = (c.name ?? '').trim() || `${given} ${family}`.trim() || (c.email ?? '').trim() || 'Unnamed contact';
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVcardText(fn)}`, `N:${escapeVcardText(family)};${escapeVcardText(given)};;;`];

  if (nonEmpty(c.email)) lines.push(`EMAIL;TYPE=INTERNET,PREF:${escapeVcardText(c.email.trim())}`);
  for (const e of c.additionalEmails ?? []) {
    if (nonEmpty(e?.value)) {
      const t = EMAIL_TYPES[(e.label ?? '').trim().toLowerCase()];
      lines.push(`EMAIL;TYPE=INTERNET${t ? `,${t}` : ''}:${escapeVcardText(e.value.trim())}`);
    }
  }
  if (nonEmpty(c.phone)) lines.push(`TEL;TYPE=PREF:${escapeVcardText(c.phone.trim())}`);
  for (const p of c.additionalPhones ?? []) {
    if (nonEmpty(p?.value)) lines.push(`${typeParam('TEL', PHONE_TYPES, p.label)}:${escapeVcardText(p.value.trim())}`);
  }
  if (nonEmpty(c.company)) lines.push(`ORG:${escapeVcardText(c.company.trim())}`);
  if (nonEmpty(c.title)) lines.push(`TITLE:${escapeVcardText(c.title.trim())}`);

  const a = c.address;
  if (a && [a.street, a.city, a.state, a.postalCode, a.country].some(nonEmpty)) {
    // ADR = PO box; extended; street; locality; region; postal code; country
    lines.push(`ADR;TYPE=WORK:;;${[a.street, a.city, a.state, a.postalCode, a.country].map((v) => escapeVcardText((v ?? '').trim())).join(';')}`);
  }
  for (const l of c.links ?? []) {
    const url = safeVcardUrl(l?.url);
    if (url) lines.push(`URL:${url}`);
  }
  if (nonEmpty(c.notes)) lines.push(`NOTE:${escapeVcardText(c.notes)}`);
  if (nonEmpty(c.id)) lines.push(`UID:${escapeVcardText(c.id)}`);
  lines.push('END:VCARD');
  return lines;
}

/** One or many contacts as a single .vcf document (CRLF line endings, folded, trailing CRLF). */
export function contactsToVcard(contacts: readonly Contact[]): string {
  const out: string[] = [];
  for (const c of contacts) for (const line of contactToVcardLines(c)) out.push(foldVcardLine(line));
  return out.length ? out.join(CRLF) + CRLF : '';
}

export function vcardFilename(contacts: readonly Pick<Contact, 'name'>[]): string {
  if (contacts.length !== 1) return 'contacts.vcf';
  const slug = (contacts[0]!.name || 'contact').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'contact';
  return `${slug}.vcf`;
}
