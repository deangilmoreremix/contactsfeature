/**
 * Pure helpers for the composite contact fields (Twenty-style record fields):
 *   - email    = primary address (stays in Contact.email), extras in Contact.additionalEmails
 *   - phone    = primary number  (stays in Contact.phone), extras in Contact.additionalPhones
 *   - links    = labelled http(s) URLs
 *   - address  = street / city / state / postalCode / country
 *
 * Nothing here touches React, storage or the network, so it is shared by the sidebar UI, the
 * API layer (row mapping), CSV import/export, filters, duplicate detection and merging.
 * Implemented from scratch; only the concept of composite fields comes from Twenty.
 */

export interface LabeledValue {
  label: string;
  value: string;
}

export interface LabeledLink {
  label: string;
  url: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export const ADDRESS_KEYS = ['street', 'city', 'state', 'postalCode', 'country'] as const;
export type AddressKey = (typeof ADDRESS_KEYS)[number];

export const MAX_EXTRA_ENTRIES = 20;
export const MAX_LABEL_LENGTH = 40;
export const MAX_ADDRESS_PART_LENGTH = 200;
export const MAX_URL_LENGTH = 2048;
export const MAX_TITLE_LENGTH = 200;

export const EMAIL_LABELS = ['Work', 'Personal', 'Other'] as const;
export const PHONE_LABELS = ['Work', 'Mobile', 'Home', 'Other'] as const;
export const LINK_LABELS = ['Website', 'LinkedIn', 'X', 'GitHub', 'Custom'] as const;

export const DEFAULT_EMAIL_LABEL = 'Other';
export const DEFAULT_PHONE_LABEL = 'Other';
export const DEFAULT_LINK_LABEL = 'Website';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = <T,>(error: string): Result<T> => ({ ok: false, error });

/* ------------------------------------------------------------------------------------------ */
/* Scalar validation                                                                           */
/* ------------------------------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export const normalizeEmailValue = (v: unknown): string => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export function validateEmailValue(v: unknown): string | null {
  const s = normalizeEmailValue(v);
  if (!s) return 'Enter an email address';
  if (s.length > 254) return 'Email address is too long';
  if (!EMAIL_RE.test(s)) return 'Enter a valid email address';
  return null;
}

/** Digits (plus a leading +) only, used for comparing/deduplicating numbers. */
export const phoneDigits = (v: unknown): string => (typeof v === 'string' ? v.replace(/\D/g, '') : '');

const PHONE_RE = /^\+?[\d\s().-]+$/;

export function validatePhoneValue(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return 'Enter a phone number';
  if (s.length > 30) return 'Phone number is too long';
  if (!PHONE_RE.test(s) || s.lastIndexOf('+') > 0) return 'Use digits, spaces and an optional leading +';
  const digits = phoneDigits(s).length;
  if (digits < 5) return 'Phone number is too short';
  if (digits > 15) return 'Phone number is too long';
  return null;
}

export const normalizePhoneValue = (v: unknown): string =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';

/**
 * Validate and normalize a link. Only http and https are accepted: javascript:, data:, file:, mailto:
 * etc. are rejected. A bare host such as "example.com/x" gets https:// prepended.
 */
export function normalizeUrl(input: unknown): Result<string> {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return fail('Enter a web address');
  if (raw.length > MAX_URL_LENGTH) return fail('Web address is too long');
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return fail('Web address cannot contain spaces');
  let candidate = raw;
  if (!/^https?:\/\//i.test(raw)) {
    // "example.com:8080/x" is a host:port, anything else with a scheme (javascript:, data:, ...) is rejected.
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^/:]+:\d+(\/|$)/.test(raw);
    if (hasScheme || raw.startsWith('//')) return fail('Only http and https links are allowed');
    candidate = `https://${raw}`;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return fail('Enter a valid web address');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fail('Only http and https links are allowed');
  if (url.username || url.password) return fail('Web address cannot contain credentials');
  if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
    return fail('Enter a valid web address');
  }
  return ok(url.toString());
}

export const isSafeHttpUrl = (u: unknown): boolean => normalizeUrl(u).ok;

/** Comparable form of a URL (host lower-cased, no trailing slash / fragment, no leading www.). */
export function urlKey(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = url.pathname.replace(/\/+$/, '');
    return `${host}${path}${url.search}`;
  } catch {
    return u.trim().toLowerCase();
  }
}

/** Best-effort label for a URL (used as the default when adding a link). */
export function suggestLinkLabel(u: string): string {
  let host = '';
  try {
    host = new URL(u).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return DEFAULT_LINK_LABEL;
  }
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) return 'LinkedIn';
  if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com')) return 'X';
  if (host === 'github.com' || host.endsWith('.github.com')) return 'GitHub';
  return DEFAULT_LINK_LABEL;
}

export function validateTitle(v: unknown): Result<string> {
  const s = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  if (!s) return fail('Name cannot be empty');
  if (s.length > MAX_TITLE_LENGTH) return fail(`Name must be ${MAX_TITLE_LENGTH} characters or fewer`);
  return ok(s);
}

/* ------------------------------------------------------------------------------------------ */
/* Tolerant normalizers (stored/imported data -> clean arrays)                                 */
/* ------------------------------------------------------------------------------------------ */

const cleanLabel = (l: unknown, fallback: string): string => {
  const s = typeof l === 'string' ? l.trim().replace(/\s+/g, ' ').slice(0, MAX_LABEL_LENGTH) : '';
  return s || fallback;
};

function toArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Drop malformed / invalid / duplicate email entries. Never throws. */
export function normalizeEmailEntries(raw: unknown, exclude: unknown[] = []): LabeledValue[] {
  const seen = new Set(exclude.map(normalizeEmailValue).filter(Boolean));
  const out: LabeledValue[] = [];
  for (const item of toArray(raw)) {
    const o = typeof item === 'string' ? { value: item } : asObject(item);
    if (!o) continue;
    const value = normalizeEmailValue(o['value'] ?? o['email'] ?? o['address']);
    if (!value || validateEmailValue(value) || seen.has(value)) continue;
    seen.add(value);
    out.push({ label: cleanLabel(o['label'], DEFAULT_EMAIL_LABEL), value });
    if (out.length >= MAX_EXTRA_ENTRIES) break;
  }
  return out;
}

export function normalizePhoneEntries(raw: unknown, exclude: unknown[] = []): LabeledValue[] {
  const seen = new Set(exclude.map(phoneDigits).filter(Boolean));
  const out: LabeledValue[] = [];
  for (const item of toArray(raw)) {
    const o = typeof item === 'string' ? { value: item } : asObject(item);
    if (!o) continue;
    const value = normalizePhoneValue(o['value'] ?? o['phone'] ?? o['number']);
    const key = phoneDigits(value);
    if (!value || validatePhoneValue(value) || seen.has(key)) continue;
    seen.add(key);
    out.push({ label: cleanLabel(o['label'], DEFAULT_PHONE_LABEL), value });
    if (out.length >= MAX_EXTRA_ENTRIES) break;
  }
  return out;
}

export function normalizeLinkEntries(raw: unknown): LabeledLink[] {
  const seen = new Set<string>();
  const out: LabeledLink[] = [];
  for (const item of toArray(raw)) {
    const o = typeof item === 'string' ? { url: item } : asObject(item);
    if (!o) continue;
    const n = normalizeUrl(o['url'] ?? o['value'] ?? o['href']);
    if (!n.ok) continue;
    const key = urlKey(n.value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: cleanLabel(o['label'], suggestLinkLabel(n.value)), url: n.value });
    if (out.length >= MAX_EXTRA_ENTRIES) break;
  }
  return out;
}

export function normalizeAddress(raw: unknown): Address {
  let o = asObject(raw);
  if (!o && typeof raw === 'string' && raw.trim().startsWith('{')) {
    try { o = asObject(JSON.parse(raw)); } catch { o = null; }
  }
  const out: Address = {};
  if (!o) return out;
  for (const k of ADDRESS_KEYS) {
    const v = o[k];
    if (typeof v !== 'string') continue;
    const s = v.trim().replace(/\s+/g, ' ').slice(0, MAX_ADDRESS_PART_LENGTH);
    if (s) out[k] = s;
  }
  return out;
}

export const isEmptyAddress = (a: unknown): boolean => Object.keys(normalizeAddress(a)).length === 0;

export function validateAddress(a: Address): string | null {
  for (const k of ADDRESS_KEYS) {
    const v = a[k];
    if (typeof v === 'string' && v.trim().length > MAX_ADDRESS_PART_LENGTH) {
      return `Each address line must be ${MAX_ADDRESS_PART_LENGTH} characters or fewer`;
    }
  }
  return null;
}

/** "123 Main St, Austin, TX 78701, USA" – skips empty parts. */
export function formatAddressLines(a: Address): string[] {
  const n = normalizeAddress(a);
  const lines: string[] = [];
  if (n.street) lines.push(n.street);
  const region = [n.state, n.postalCode].filter(Boolean).join(' ');
  const cityLine = [n.city, region].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (n.country) lines.push(n.country);
  return lines;
}

export const formatAddressOneLine = (a: Address): string => formatAddressLines(a).join(', ');

/** Plain Google Maps search link (no embeds, no scripts). Returns null for an empty address. */
export function mapsSearchUrl(a: Address): string | null {
  const q = formatAddressOneLine(a);
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/* ------------------------------------------------------------------------------------------ */
/* Add / remove / make primary                                                                 */
/* ------------------------------------------------------------------------------------------ */

export interface EmailState {
  email: string;
  additionalEmails: LabeledValue[];
}

export interface PhoneState {
  phone: string;
  additionalPhones: LabeledValue[];
}

export function addEmail(state: EmailState, entry: { label?: string; value: string }): Result<EmailState> {
  const problem = validateEmailValue(entry.value);
  if (problem) return fail(problem);
  const value = normalizeEmailValue(entry.value);
  if (value === normalizeEmailValue(state.email)) return fail('That is already the primary email');
  if (state.additionalEmails.some((e) => normalizeEmailValue(e.value) === value)) return fail('That email is already added');
  if (state.additionalEmails.length >= MAX_EXTRA_ENTRIES) return fail(`You can add up to ${MAX_EXTRA_ENTRIES} extra emails`);
  return ok({
    email: state.email,
    additionalEmails: [...state.additionalEmails, { label: cleanLabel(entry.label, DEFAULT_EMAIL_LABEL), value }],
  });
}

export function removeEmail(state: EmailState, value: string): EmailState {
  const v = normalizeEmailValue(value);
  return { email: state.email, additionalEmails: state.additionalEmails.filter((e) => normalizeEmailValue(e.value) !== v) };
}

/** Promote an extra email to primary; the old primary becomes an extra (label "Other"). */
export function makePrimaryEmail(state: EmailState, value: string): EmailState {
  const v = normalizeEmailValue(value);
  const target = state.additionalEmails.find((e) => normalizeEmailValue(e.value) === v);
  if (!target) return state;
  const rest = state.additionalEmails.filter((e) => e !== target);
  const old = normalizeEmailValue(state.email);
  return {
    email: target.value,
    additionalEmails: old && !validateEmailValue(old) ? [{ label: DEFAULT_EMAIL_LABEL, value: old }, ...rest] : rest,
  };
}

export function updateEmailLabel(state: EmailState, value: string, label: string): EmailState {
  const v = normalizeEmailValue(value);
  return {
    email: state.email,
    additionalEmails: state.additionalEmails.map((e) =>
      normalizeEmailValue(e.value) === v ? { ...e, label: cleanLabel(label, DEFAULT_EMAIL_LABEL) } : e
    ),
  };
}

/** Change the address of an existing extra email (keeps its position and label). */
export function editEmail(state: EmailState, oldValue: string, newValue: string): Result<EmailState> {
  const problem = validateEmailValue(newValue);
  if (problem) return fail(problem);
  const o = normalizeEmailValue(oldValue);
  const n = normalizeEmailValue(newValue);
  if (n !== o) {
    if (n === normalizeEmailValue(state.email)) return fail('That is already the primary email');
    if (state.additionalEmails.some((e) => normalizeEmailValue(e.value) === n)) return fail('That email is already added');
  }
  return ok({
    email: state.email,
    additionalEmails: state.additionalEmails.map((e) => (normalizeEmailValue(e.value) === o ? { ...e, value: n } : e)),
  });
}

export function editPhone(state: PhoneState, oldValue: string, newValue: string): Result<PhoneState> {
  const problem = validatePhoneValue(newValue);
  if (problem) return fail(problem);
  const o = phoneDigits(oldValue);
  const value = normalizePhoneValue(newValue);
  const n = phoneDigits(value);
  if (n !== o) {
    if (n === phoneDigits(state.phone)) return fail('That is already the primary phone');
    if (state.additionalPhones.some((p) => phoneDigits(p.value) === n)) return fail('That number is already added');
  }
  return ok({
    phone: state.phone,
    additionalPhones: state.additionalPhones.map((p) => (phoneDigits(p.value) === o ? { ...p, value } : p)),
  });
}

export function updateLinkLabel(links: LabeledLink[], url: string, label: string): LabeledLink[] {
  const key = urlKey(url);
  return links.map((l) => (urlKey(l.url) === key ? { ...l, label: cleanLabel(label, suggestLinkLabel(l.url)) } : l));
}

export function addPhone(state: PhoneState, entry: { label?: string; value: string }): Result<PhoneState> {
  const problem = validatePhoneValue(entry.value);
  if (problem) return fail(problem);
  const value = normalizePhoneValue(entry.value);
  const key = phoneDigits(value);
  if (key === phoneDigits(state.phone)) return fail('That is already the primary phone');
  if (state.additionalPhones.some((p) => phoneDigits(p.value) === key)) return fail('That number is already added');
  if (state.additionalPhones.length >= MAX_EXTRA_ENTRIES) return fail(`You can add up to ${MAX_EXTRA_ENTRIES} extra phones`);
  return ok({
    phone: state.phone,
    additionalPhones: [...state.additionalPhones, { label: cleanLabel(entry.label, DEFAULT_PHONE_LABEL), value }],
  });
}

export function removePhone(state: PhoneState, value: string): PhoneState {
  const key = phoneDigits(value);
  return { phone: state.phone, additionalPhones: state.additionalPhones.filter((p) => phoneDigits(p.value) !== key) };
}

export function makePrimaryPhone(state: PhoneState, value: string): PhoneState {
  const key = phoneDigits(value);
  const target = state.additionalPhones.find((p) => phoneDigits(p.value) === key);
  if (!target) return state;
  const rest = state.additionalPhones.filter((p) => p !== target);
  const old = normalizePhoneValue(state.phone);
  return {
    phone: target.value,
    additionalPhones: old && !validatePhoneValue(old) ? [{ label: DEFAULT_PHONE_LABEL, value: old }, ...rest] : rest,
  };
}

export function updatePhoneLabel(state: PhoneState, value: string, label: string): PhoneState {
  const key = phoneDigits(value);
  return {
    phone: state.phone,
    additionalPhones: state.additionalPhones.map((p) =>
      phoneDigits(p.value) === key ? { ...p, label: cleanLabel(label, DEFAULT_PHONE_LABEL) } : p
    ),
  };
}

export function addLink(links: LabeledLink[], entry: { label?: string; url: string }): Result<LabeledLink[]> {
  const n = normalizeUrl(entry.url);
  if (!n.ok) return fail(n.error);
  const key = urlKey(n.value);
  if (links.some((l) => urlKey(l.url) === key)) return fail('That link is already added');
  if (links.length >= MAX_EXTRA_ENTRIES) return fail(`You can add up to ${MAX_EXTRA_ENTRIES} links`);
  return ok([...links, { label: cleanLabel(entry.label, suggestLinkLabel(n.value)), url: n.value }]);
}

export function removeLink(links: LabeledLink[], url: string): LabeledLink[] {
  const key = urlKey(url);
  return links.filter((l) => urlKey(l.url) !== key);
}

/* ------------------------------------------------------------------------------------------ */
/* Union / merge / lookup helpers                                                              */
/* ------------------------------------------------------------------------------------------ */

/** All addresses of a contact, primary first, lower-cased and de-duplicated. */
export function allEmails(c: { email?: unknown; additionalEmails?: unknown }): string[] {
  const primary = normalizeEmailValue(c.email);
  const extras = toArray(c.additionalEmails)
    .map((e) => (typeof e === 'string' ? e : asObject(e)?.['value']))
    .map(normalizeEmailValue)
    .filter(Boolean);
  return Array.from(new Set([primary, ...extras].filter(Boolean)));
}

/** All numbers of a contact (as typed), primary first, de-duplicated by digits. */
export function allPhones(c: { phone?: unknown; additionalPhones?: unknown }): string[] {
  const list = [
    typeof c.phone === 'string' ? c.phone.trim() : '',
    ...toArray(c.additionalPhones).map((p) => (typeof p === 'string' ? p : String(asObject(p)?.['value'] ?? '')).trim()),
  ].filter(Boolean);
  const seen = new Set<string>();
  return list.filter((p) => {
    const k = phoneDigits(p);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Union of extra emails from several records, excluding the kept primary. First label wins. */
export function unionEmails(lists: unknown[], primary: unknown, extraPrimaries: unknown[] = []): LabeledValue[] {
  const out: LabeledValue[] = [];
  const seen = new Set([normalizeEmailValue(primary)].filter(Boolean));
  const push = (e: LabeledValue) => {
    if (seen.has(e.value)) return;
    seen.add(e.value);
    out.push(e);
  };
  lists.forEach((l) => normalizeEmailEntries(l).forEach(push));
  // Primaries of merged-away records are kept as extras so no address is lost.
  extraPrimaries.forEach((p) => {
    const v = normalizeEmailValue(p);
    if (v && !validateEmailValue(v)) push({ label: DEFAULT_EMAIL_LABEL, value: v });
  });
  return out.slice(0, MAX_EXTRA_ENTRIES);
}

export function unionPhones(lists: unknown[], primary: unknown, extraPrimaries: unknown[] = []): LabeledValue[] {
  const out: LabeledValue[] = [];
  const seen = new Set([phoneDigits(primary)].filter(Boolean));
  const push = (e: LabeledValue) => {
    const k = phoneDigits(e.value);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(e);
  };
  lists.forEach((l) => normalizePhoneEntries(l).forEach(push));
  extraPrimaries.forEach((p) => {
    const v = normalizePhoneValue(p);
    if (v && !validatePhoneValue(v)) push({ label: DEFAULT_PHONE_LABEL, value: v });
  });
  return out.slice(0, MAX_EXTRA_ENTRIES);
}

export function unionLinks(lists: unknown[]): LabeledLink[] {
  const out: LabeledLink[] = [];
  const seen = new Set<string>();
  lists.forEach((l) =>
    normalizeLinkEntries(l).forEach((e) => {
      const k = urlKey(e.url);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(e);
    })
  );
  return out.slice(0, MAX_EXTRA_ENTRIES);
}

/** First non-empty address wins as a whole (mixing parts of different addresses would be wrong). */
export function pickAddress(addresses: unknown[]): Address {
  for (const a of addresses) {
    const n = normalizeAddress(a);
    if (Object.keys(n).length) return n;
  }
  return {};
}

/* ------------------------------------------------------------------------------------------ */
/* Database row mapping (camelCase <-> snake_case jsonb columns)                               */
/* ------------------------------------------------------------------------------------------ */

const ROW_KEYS: Array<[camel: string, snake: string]> = [
  ['additionalEmails', 'additional_emails'],
  ['additionalPhones', 'additional_phones'],
  ['links', 'links'],
  ['address', 'address'],
];

/** Rename composite keys of an outgoing payload to their column names (other keys untouched). */
export function compositeToRow<T extends Record<string, any>>(payload: T): Record<string, any> {
  const out: Record<string, any> = { ...payload };
  for (const [camel, snake] of ROW_KEYS) {
    if (!(camel in out)) continue;
    const v = out[camel];
    delete out[camel];
    if (camel === 'address') out[snake] = normalizeAddress(v);
    else if (camel === 'links') out[snake] = normalizeLinkEntries(v);
    else if (camel === 'additionalEmails') out[snake] = normalizeEmailEntries(v, [out['email']]);
    else out[snake] = normalizePhoneEntries(v, [out['phone']]);
  }
  return out;
}

/** Add camelCase composite keys to a row read from the database (when its columns are present). */
export function compositeFromRow<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const out: Record<string, any> = { ...row };
  for (const [camel, snake] of ROW_KEYS) {
    if (!(snake in out) || camel === snake) continue;
    out[camel] = out[snake];
    delete out[snake];
  }
  if ('additionalEmails' in out) out['additionalEmails'] = normalizeEmailEntries(out['additionalEmails']);
  if ('additionalPhones' in out) out['additionalPhones'] = normalizePhoneEntries(out['additionalPhones']);
  if ('links' in out) out['links'] = normalizeLinkEntries(out['links']);
  if ('address' in out) out['address'] = normalizeAddress(out['address']);
  return out as T;
}

/* ------------------------------------------------------------------------------------------ */
/* CSV cells                                                                                   */
/* ------------------------------------------------------------------------------------------ */

/** "Work|a@x.com; Other|b@x.com" – readable in a spreadsheet, JSON arrays are accepted on import. */
export function serializeLabeled(entries: Array<{ label: string; value?: string; url?: string }>): string {
  return entries
    .map((e) => `${e.label.replace(/[;|]/g, ' ')}|${(e.value ?? e.url ?? '').replace(/;/g, '%3B')}`)
    .join('; ');
}

export interface ParsedCell<T> {
  entries: T[];
  /** Raw entries that were dropped because they were invalid. */
  invalid: string[];
}

function splitCell(cell: string): Array<{ label?: string; value: string }> | unknown[] {
  const s = cell.trim();
  if (!s) return [];
  if (s.startsWith('[')) return toArray(s);
  return s
    .split(/;/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf('|');
      return i > 0 ? { label: p.slice(0, i), value: p.slice(i + 1).trim().replace(/%3B/gi, ';') } : { value: p.replace(/%3B/gi, ';') };
    });
}

const rawText = (item: unknown): string =>
  typeof item === 'string' ? item : String(asObject(item)?.['value'] ?? asObject(item)?.['url'] ?? asObject(item)?.['email'] ?? '');

export function parseEmailCell(cell: string): ParsedCell<LabeledValue> {
  const items = splitCell(cell);
  const entries = normalizeEmailEntries(items);
  const kept = new Set(entries.map((e) => e.value));
  return { entries, invalid: items.map(rawText).filter((t) => t && !kept.has(normalizeEmailValue(t)) && validateEmailValue(t)) };
}

export function parsePhoneCell(cell: string): ParsedCell<LabeledValue> {
  const items = splitCell(cell);
  const entries = normalizePhoneEntries(items);
  return { entries, invalid: items.map(rawText).filter((t) => t && validatePhoneValue(t)) };
}

export function parseLinkCell(cell: string): ParsedCell<LabeledLink> {
  const items = splitCell(cell);
  const entries = normalizeLinkEntries(items);
  return { entries, invalid: items.map(rawText).filter((t) => t && !normalizeUrl(t).ok) };
}
