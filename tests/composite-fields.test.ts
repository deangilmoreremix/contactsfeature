// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  addEmail, addLink, addPhone, allEmails, allPhones, compositeFromRow, compositeToRow, editEmail, editPhone,
  formatAddressLines, isEmptyAddress, makePrimaryEmail, makePrimaryPhone, mapsSearchUrl, normalizeAddress,
  normalizeEmailEntries, normalizeLinkEntries, normalizePhoneEntries, normalizeUrl, parseEmailCell, parseLinkCell,
  parsePhoneCell, pickAddress, removeEmail, removeLink, removePhone, serializeLabeled, suggestLinkLabel,
  unionEmails, unionLinks, unionPhones, validateEmailValue, validatePhoneValue, validateTitle, urlKey,
  type EmailState, type PhoneState,
} from '../src/lib/fields/compositeFields';

const unwrap = <T,>(r: { ok: boolean; value?: T; error?: string }): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value as T;
};

describe('email validation + normalization', () => {
  it('accepts normal addresses and rejects junk', () => {
    expect(validateEmailValue('a@b.co')).toBeNull();
    expect(validateEmailValue(' A@B.COM ')).toBeNull();
    for (const bad of ['', 'nope', 'a@b', 'a b@c.com', '<x>@y.com', 'a@b@c.com']) expect(validateEmailValue(bad)).not.toBeNull();
  });
  it('normalizeEmailEntries lower-cases, dedupes, drops invalid and the excluded primary', () => {
    const out = normalizeEmailEntries(
      [{ label: 'Work', value: 'A@B.com' }, { label: 'x', value: 'a@b.com' }, { value: 'bad' }, null, 5, 'raw@x.io', { label: '', value: 'p@x.io' }],
      ['P@x.io']
    );
    expect(out).toEqual([{ label: 'Work', value: 'a@b.com' }, { label: 'Other', value: 'raw@x.io' }]);
  });
  it('is tolerant of non-arrays and JSON strings', () => {
    expect(normalizeEmailEntries(undefined)).toEqual([]);
    expect(normalizeEmailEntries({})).toEqual([]);
    expect(normalizeEmailEntries('[{"label":"Work","value":"a@b.com"}]')).toEqual([{ label: 'Work', value: 'a@b.com' }]);
    expect(normalizeEmailEntries('[broken')).toEqual([]);
  });
  it('caps the list size and label length', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ label: 'L'.repeat(100), value: `u${i}@x.io` }));
    const out = normalizeEmailEntries(many);
    expect(out).toHaveLength(20);
    expect(out[0]!.label).toHaveLength(40);
  });
});

describe('email add / remove / make primary / edit', () => {
  const base: EmailState = { email: 'main@x.io', additionalEmails: [] };
  it('adds with a label and validates', () => {
    const s = unwrap(addEmail(base, { label: 'Work', value: ' W@X.io ' }));
    expect(s).toEqual({ email: 'main@x.io', additionalEmails: [{ label: 'Work', value: 'w@x.io' }] });
    expect(addEmail(base, { value: 'bad' }).ok).toBe(false);
  });
  it('rejects the primary and duplicates', () => {
    expect(addEmail(base, { value: 'MAIN@x.io' })).toMatchObject({ ok: false });
    const s = unwrap(addEmail(base, { value: 'w@x.io' }));
    expect(addEmail(s, { value: 'W@x.io' })).toMatchObject({ ok: false });
  });
  it('defaults the label to Other and enforces the maximum', () => {
    expect(unwrap(addEmail(base, { value: 'a@x.io' })).additionalEmails[0]!.label).toBe('Other');
    const full: EmailState = { email: 'm@x.io', additionalEmails: Array.from({ length: 20 }, (_, i) => ({ label: 'Other', value: `u${i}@x.io` })) };
    expect(addEmail(full, { value: 'new@x.io' })).toMatchObject({ ok: false });
  });
  it('removes', () => {
    const s = unwrap(addEmail(base, { label: 'Work', value: 'w@x.io' }));
    expect(removeEmail(s, 'W@X.io').additionalEmails).toEqual([]);
    expect(removeEmail(s, 'zzz@x.io')).toEqual(s);
  });
  it('make primary swaps the old primary into the extras (first)', () => {
    let s = unwrap(addEmail(base, { label: 'Work', value: 'w@x.io' }));
    s = unwrap(addEmail(s, { label: 'Personal', value: 'p@x.io' }));
    const next = makePrimaryEmail(s, 'p@x.io');
    expect(next.email).toBe('p@x.io');
    expect(next.additionalEmails.map((e) => e.value)).toEqual(['main@x.io', 'w@x.io']);
    // round trip keeps the same set of addresses
    expect(allEmails(next).sort()).toEqual(allEmails(s).sort());
  });
  it('make primary on an unknown value is a no-op; empty old primary is not kept', () => {
    const s = unwrap(addEmail(base, { value: 'w@x.io' }));
    expect(makePrimaryEmail(s, 'nope@x.io')).toEqual(s);
    const empty = makePrimaryEmail({ email: '', additionalEmails: s.additionalEmails }, 'w@x.io');
    expect(empty).toEqual({ email: 'w@x.io', additionalEmails: [] });
  });
  it('edit validates and rejects collisions', () => {
    const s = unwrap(addEmail(unwrap(addEmail(base, { value: 'a@x.io' })), { value: 'b@x.io' }));
    expect(unwrap(editEmail(s, 'a@x.io', 'c@x.io')).additionalEmails.map((e) => e.value)).toEqual(['c@x.io', 'b@x.io']);
    expect(editEmail(s, 'a@x.io', 'b@x.io').ok).toBe(false);
    expect(editEmail(s, 'a@x.io', 'main@x.io').ok).toBe(false);
    expect(editEmail(s, 'a@x.io', 'oops').ok).toBe(false);
    expect(editEmail(s, 'a@x.io', 'A@x.io').ok).toBe(true);
  });
});

describe('phones', () => {
  const base: PhoneState = { phone: '+1 555 123 4567', additionalPhones: [] };
  it('validates loosely', () => {
    for (const ok of ['+1 (555) 123-4567', '555.123.4567', '+442071234567', '12345']) expect(validatePhoneValue(ok)).toBeNull();
    for (const bad of ['', 'abc', '12', '555-CALL-NOW', '1+2345678', '+'.padEnd(5, '1') + '1'.repeat(20)]) expect(validatePhoneValue(bad)).not.toBeNull();
  });
  it('normalizes, dedupes by digits and excludes the primary', () => {
    const out = normalizePhoneEntries(
      [{ label: 'Mobile', value: '555  222   3333' }, { value: '(555) 222-3333' }, { value: 'x' }, { value: '+1 555 123 4567' }],
      ['+15551234567']
    );
    expect(out).toEqual([{ label: 'Mobile', value: '555 222 3333' }]);
  });
  it('add rejects primary-duplicates and duplicates by digits', () => {
    expect(addPhone(base, { value: '1-555-123-4567' })).toMatchObject({ ok: false });
    const s = unwrap(addPhone(base, { label: 'Work', value: '555 000 1111' }));
    expect(addPhone(s, { value: '(555) 000-1111' })).toMatchObject({ ok: false });
    expect(s.additionalPhones[0]).toEqual({ label: 'Work', value: '555 000 1111' });
  });
  it('remove / make primary / edit', () => {
    const s = unwrap(addPhone(base, { label: 'Mobile', value: '555 000 1111' }));
    expect(removePhone(s, '5550001111').additionalPhones).toEqual([]);
    const m = makePrimaryPhone(s, '555 000 1111');
    expect(m.phone).toBe('555 000 1111');
    expect(m.additionalPhones).toEqual([{ label: 'Other', value: '+1 555 123 4567' }]);
    expect(unwrap(editPhone(s, '555 000 1111', '555 000 2222')).additionalPhones[0]!.value).toBe('555 000 2222');
    expect(editPhone(s, '555 000 1111', 'bad').ok).toBe(false);
  });
});

describe('links', () => {
  it('accepts http(s) and prefixes bare hosts', () => {
    expect(normalizeUrl('https://example.com/a?b=1')).toEqual({ ok: true, value: 'https://example.com/a?b=1' });
    expect(normalizeUrl('http://example.com')).toMatchObject({ ok: true });
    expect(normalizeUrl('example.com/x')).toEqual({ ok: true, value: 'https://example.com/x' });
    expect(normalizeUrl('example.com:8080/x')).toMatchObject({ ok: true });
    expect(normalizeUrl('linkedin.com/in/someone')).toMatchObject({ ok: true });
  });
  it('rejects dangerous or malformed urls', () => {
    for (const bad of [
      'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'file:///etc/passwd',
      'mailto:a@b.com', 'tel:+155', 'ftp://example.com', '//evil.com', 'https://', 'http://nodot', 'https://user:pw@example.com',
      'https://exa mple.com', '', '   ', 'java\nscript:alert(1)', 'https://example.com/' + 'a'.repeat(2100),
    ]) {
      expect(normalizeUrl(bad).ok, bad).toBe(false);
    }
  });
  it('allows localhost', () => expect(normalizeUrl('http://localhost:3000')).toMatchObject({ ok: true }));
  it('suggests a label from the host', () => {
    expect(suggestLinkLabel('https://www.linkedin.com/in/a')).toBe('LinkedIn');
    expect(suggestLinkLabel('https://x.com/a')).toBe('X');
    expect(suggestLinkLabel('https://twitter.com/a')).toBe('X');
    expect(suggestLinkLabel('https://github.com/a')).toBe('GitHub');
    expect(suggestLinkLabel('https://acme.com')).toBe('Website');
  });
  it('add / remove / duplicate detection ignore www and trailing slash', () => {
    const l = unwrap(addLink([], { url: 'github.com/octocat' }));
    expect(l).toEqual([{ label: 'GitHub', url: 'https://github.com/octocat' }]);
    expect(addLink(l, { url: 'https://www.github.com/octocat/' }).ok).toBe(false);
    expect(addLink(l, { url: 'javascript:alert(1)' }).ok).toBe(false);
    expect(removeLink(l, 'https://GitHub.com/octocat/')).toEqual([]);
    expect(urlKey('https://www.a.com/x/')).toBe(urlKey('http://a.com/x'));
  });
  it('normalizeLinkEntries drops unsafe stored entries', () => {
    expect(normalizeLinkEntries([{ label: 'Bad', url: 'javascript:alert(1)' }, { label: 'Ok', url: 'https://ok.com' }, 'nope'])).toEqual([
      { label: 'Ok', url: 'https://ok.com/' },
    ]);
  });
});

describe('address', () => {
  it('normalizes and trims, drops unknown keys and non-strings', () => {
    expect(normalizeAddress({ street: '  1  Main St ', city: 'Austin', zip: '1', country: 5 })).toEqual({ street: '1 Main St', city: 'Austin' });
    expect(normalizeAddress(null)).toEqual({});
    expect(normalizeAddress('{"city":"Rome"}')).toEqual({ city: 'Rome' });
    expect(normalizeAddress([1])).toEqual({});
    expect(isEmptyAddress({ city: '   ' })).toBe(true);
  });
  it('caps part length', () => expect(normalizeAddress({ street: 'x'.repeat(500) }).street).toHaveLength(200));
  it('formats compact lines and a plain https maps link', () => {
    const a = { street: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'USA' };
    expect(formatAddressLines(a)).toEqual(['1 Main St', 'Austin, TX 78701', 'USA']);
    const url = mapsSearchUrl(a)!;
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    expect(decodeURIComponent(url.split('query=')[1]!)).toBe('1 Main St, Austin, TX 78701, USA');
    expect(mapsSearchUrl({})).toBeNull();
  });
  it('maps url escapes injection characters', () => {
    const url = mapsSearchUrl({ street: '"><script>&x=1', city: 'A' })!;
    expect(url).not.toMatch(/[<>"]/);
    expect(new URL(url).searchParams.get('query')).toBe('"><script>&x=1, A');
  });
  it('pickAddress takes the first non-empty address whole', () => {
    expect(pickAddress([{}, { city: 'Rome' }, { city: 'Paris', country: 'FR' }])).toEqual({ city: 'Rome' });
    expect(pickAddress([undefined, null])).toEqual({});
  });
});

describe('title validation', () => {
  it('trims, collapses whitespace, rejects empty and >200', () => {
    expect(validateTitle('  Ada   Lovelace ')).toEqual({ ok: true, value: 'Ada Lovelace' });
    expect(validateTitle('   ').ok).toBe(false);
    expect(validateTitle(undefined).ok).toBe(false);
    expect(validateTitle('a'.repeat(200)).ok).toBe(true);
    expect(validateTitle('a'.repeat(201)).ok).toBe(false);
  });
});

describe('lookup + union helpers', () => {
  it('allEmails / allPhones include primary first and dedupe', () => {
    expect(allEmails({ email: 'A@x.io', additionalEmails: [{ label: 'a', value: 'a@x.io' }, { label: 'b', value: 'B@x.io' }] })).toEqual(['a@x.io', 'b@x.io']);
    expect(allEmails({})).toEqual([]);
    expect(allPhones({ phone: '555 123 4567', additionalPhones: [{ label: 'a', value: '(555) 123-4567' }, { label: 'b', value: '555 999 0000' }] })).toEqual(['555 123 4567', '555 999 0000']);
  });
  it('unions never duplicate the primary and keep merged-away primaries', () => {
    const out = unionEmails([[{ label: 'Work', value: 'w@x.io' }], [{ label: 'Other', value: 'W@x.io' }, { label: 'P', value: 'p@x.io' }]], 'p@x.io', ['loser@x.io']);
    expect(out.map((e) => e.value)).toEqual(['w@x.io', 'loser@x.io']);
    expect(out[0]!.label).toBe('Work');
    expect(unionPhones([[{ label: 'm', value: '555 000 1111' }]], '5550001111', ['555 222 3333']).map((p) => p.value)).toEqual(['555 222 3333']);
    expect(unionLinks([[{ label: 'a', url: 'https://a.com' }], [{ label: 'b', url: 'http://www.a.com/' }, { label: 'c', url: 'https://c.com' }]]).map((l) => l.url)).toEqual(['https://a.com/', 'https://c.com/']);
  });
});

describe('row mapping', () => {
  it('maps camel -> snake with normalization and leaves other keys alone', () => {
    const row = compositeToRow({
      firstName: 'A', email: 'p@x.io',
      additionalEmails: [{ label: 'W', value: 'w@x.io' }, { label: 'dup', value: 'p@x.io' }],
      additionalPhones: [{ label: 'M', value: '555 000 1111' }],
      links: [{ label: 'bad', url: 'javascript:1' }, { label: 'ok', url: 'https://ok.com' }],
      address: { city: ' Rome ' },
    });
    expect(row).toEqual({
      firstName: 'A', email: 'p@x.io',
      additional_emails: [{ label: 'W', value: 'w@x.io' }],
      additional_phones: [{ label: 'M', value: '555 000 1111' }],
      links: [{ label: 'ok', url: 'https://ok.com/' }],
      address: { city: 'Rome' },
    });
  });
  it('omits composite columns that were not sent', () => expect(compositeToRow({ status: 'lead' })).toEqual({ status: 'lead' }));
  it('maps snake -> camel and tolerates bad stored values', () => {
    const c = compositeFromRow({ id: '1', additional_emails: [{ label: 'W', value: 'w@x.io' }], additional_phones: null, links: 'oops', address: [] });
    expect(c).toEqual({ id: '1', additionalEmails: [{ label: 'W', value: 'w@x.io' }], additionalPhones: [], links: [], address: {} });
    expect(compositeFromRow({ id: '2' })).toEqual({ id: '2' });
  });
});

describe('CSV cells', () => {
  it('serialize/parse round trip', () => {
    const emails = [{ label: 'Work', value: 'w@x.io' }, { label: 'Personal', value: 'p@x.io' }];
    const cell = serializeLabeled(emails);
    expect(cell).toBe('Work|w@x.io; Personal|p@x.io');
    expect(parseEmailCell(cell)).toEqual({ entries: emails, invalid: [] });
    const links = [{ label: 'GitHub', url: 'https://github.com/a?x=1;y=2' }];
    expect(parseLinkCell(serializeLabeled(links)).entries).toEqual([{ label: 'GitHub', url: 'https://github.com/a?x=1;y=2' }]);
  });
  it('accepts bare values, JSON and reports invalid entries', () => {
    expect(parseEmailCell('a@x.io; nope; B@x.io').entries.map((e) => e.value)).toEqual(['a@x.io', 'b@x.io']);
    expect(parseEmailCell('a@x.io; nope').invalid).toEqual(['nope']);
    expect(parseEmailCell('[{"label":"W","value":"a@x.io"}]').entries).toEqual([{ label: 'W', value: 'a@x.io' }]);
    expect(parsePhoneCell('Mobile|555 000 1111; abc').invalid).toEqual(['abc']);
    expect(parseLinkCell('Evil|javascript:alert(1); https://ok.com')).toMatchObject({ invalid: ['javascript:alert(1)'] });
    expect(parseLinkCell('').entries).toEqual([]);
  });
});

/* ---------------------------- integration with the rest of the app ---------------------------- */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validationService } from '../src/services/validation.service';
import { findDuplicateGroups } from '../src/lib/merge/findDuplicates';
import { mergeContactRecords } from '../src/lib/merge/mergeContacts';
import { contactsToCsv, COMPOSITE_EXPORT_COLUMNS, DEFAULT_CONTACT_EXPORT_COLUMNS } from '../src/utils/contactCsv';
import { rowsToContacts, parseCsvText, autoMatchColumns, BASE_IMPORT_TARGETS } from '../src/lib/import/columnMapping';
import { filterContacts } from '../src/lib/filters/filterContacts';
import { BASE_CONTACT_FILTER_FIELDS } from '../src/lib/filters/contactFilterFields';
import { describeDiff, computeContactDiff } from '../src/lib/timeline/contactDiff';
import type { Contact } from '../src/types/contact';
import { ViewFilterOperand } from '../src/vendor/twenty-shared/types/ViewFilterOperand';

const mk = (o: Partial<Contact> & { id: string }): Contact =>
  ({ firstName: 'A', lastName: 'B', name: 'A B', email: '', title: '', company: '', avatarSrc: '', sources: [], interestLevel: 'low', status: 'lead', createdAt: '', updatedAt: '', ...o }) as Contact;

describe('sanitizePartialContact keeps composite fields', () => {
  it('passes them through (normalized) and does not add them when absent', () => {
    expect(Object.keys(validationService.sanitizePartialContact({ status: 'lead' }))).toEqual(['status']);
    const out = validationService.sanitizePartialContact({
      email: 'p@x.io',
      additionalEmails: [{ label: 'W', value: 'W@x.io' }, { label: 'x', value: 'bad' }],
      additionalPhones: [{ label: 'M', value: '555 000 1111' }],
      links: [{ label: 'L', url: 'https://l.com' }, { label: 'evil', url: 'javascript:alert(1)' }],
      address: { city: ' Rome ', street: '' },
    });
    expect(out.additionalEmails).toEqual([{ label: 'W', value: 'w@x.io' }]);
    expect(out.additionalPhones).toEqual([{ label: 'M', value: '555 000 1111' }]);
    expect(out.links).toEqual([{ label: 'L', url: 'https://l.com/' }]);
    expect(out.address).toEqual({ city: 'Rome' });
  });
  it('sanitizeContact keeps them too', () => {
    const out = validationService.sanitizeContact({ firstName: 'A', email: 'a@x.io', links: [{ label: 'L', url: 'https://l.com' }], address: { city: 'X' } });
    expect(out.links).toHaveLength(1);
    expect(out.address).toEqual({ city: 'X' });
    expect('additionalEmails' in out).toBe(false);
  });
});

describe('duplicates', () => {
  it('matches on additional emails / phones', () => {
    const a = mk({ id: 'a', name: 'A1', email: 'a@x.io', additionalEmails: [{ label: 'W', value: 'shared@x.io' }] });
    const b = mk({ id: 'b', name: 'B1', email: 'b@x.io', additionalEmails: [{ label: 'W', value: 'SHARED@x.io' }] });
    const c = mk({ id: 'c', name: 'C1', email: 'c@x.io', phone: '555 111 2222' });
    const d = mk({ id: 'd', name: 'D1', email: 'd@x.io', additionalPhones: [{ label: 'M', value: '(555) 111-2222' }] });
    const e = mk({ id: 'e', name: 'E1', email: 'e@x.io' });
    const groups = findDuplicateGroups([a, b, c, d, e]);
    expect(groups.map((g) => g.contacts.map((x) => x.id).sort())).toEqual(expect.arrayContaining([['a', 'b'], ['c', 'd']]));
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.contacts.some((x) => x.id === 'a'))!.reasons).toEqual(['email']);
  });
  it('a contact with an extra equal to its own primary is not its own duplicate', () => {
    expect(findDuplicateGroups([mk({ id: 'a', email: 'a@x.io', additionalEmails: [{ label: 'W', value: 'a@x.io' }] })])).toEqual([]);
  });
});

describe('merge', () => {
  it('unions extras, keeps losing primaries, prefers a non-empty address', () => {
    const w = mk({ id: 'w', email: 'w@x.io', phone: '555 000 0001', additionalEmails: [{ label: 'Work', value: 'e1@x.io' }], links: [{ label: 'Website', url: 'https://a.com/' }] });
    const l = mk({
      id: 'l', email: 'l@x.io', phone: '555 000 0002',
      additionalEmails: [{ label: 'Personal', value: 'e2@x.io' }, { label: 'x', value: 'E1@x.io' }],
      additionalPhones: [{ label: 'Mobile', value: '555 000 0003' }],
      links: [{ label: 'Site', url: 'https://www.a.com' }, { label: 'GitHub', url: 'https://github.com/z' }],
      address: { city: 'Rome' },
    });
    const { merged, conflicts } = mergeContactRecords([w, l]);
    expect(merged.email).toBe('w@x.io');
    expect(merged.additionalEmails!.map((e) => e.value)).toEqual(['e1@x.io', 'e2@x.io', 'l@x.io']);
    expect(merged.additionalPhones!.map((p) => p.value)).toEqual(['555 000 0003', '555 000 0002']);
    expect(merged.links!.map((x) => x.url)).toEqual(['https://a.com/', 'https://github.com/z']);
    expect(merged.address).toEqual({ city: 'Rome' });
    expect(conflicts).not.toContain('address');
  });
  it('winner address wins when both have one; flags a conflict', () => {
    const { merged, conflicts } = mergeContactRecords([mk({ id: 'w', address: { city: 'A' } }), mk({ id: 'l', address: { city: 'B' } })]);
    expect(merged.address).toEqual({ city: 'A' });
    expect(conflicts).toContain('address');
  });
  it('leaves contacts without composite data untouched (no empty composite keys added)', () => {
    const { merged } = mergeContactRecords([mk({ id: 'w' }), mk({ id: 'l' })]);
    expect('additionalEmails' in merged).toBe(false);
    expect('links' in merged).toBe(false);
    expect('address' in merged).toBe(false);
  });
  it('honours overrides', () => {
    const w = mk({ id: 'w', address: { city: 'A' } });
    const l = mk({ id: 'l', address: { city: 'B' } });
    expect(mergeContactRecords([w, l], { address: 'l' }).merged.address).toEqual({ city: 'B' });
  });
});

describe('CSV export', () => {
  it('default columns are unchanged', () => expect(DEFAULT_CONTACT_EXPORT_COLUMNS).not.toContain('links'));
  it('exports composite columns readable and injection-safe', () => {
    const c = mk({
      id: '1', email: 'a@x.io',
      additionalEmails: [{ label: '=cmd', value: 'b@x.io' }],
      links: [{ label: 'Site', url: 'https://a.com/' }],
      address: { city: 'Rome', street: '=1+1' },
    });
    const csv = contactsToCsv([c], COMPOSITE_EXPORT_COLUMNS);
    const [header, row] = csv.split('\n');
    expect(header).toBe('additionalEmails,additionalPhones,links,address');
    expect(row!.startsWith('"‍=cmd|b@x.io"') || row!.startsWith('‍=cmd|b@x.io')).toBe(true);
    expect(row).toContain('Site|https://a.com/');
    expect(row).toContain('Rome');
  });
  it('empty composites export as empty cells', () => expect(contactsToCsv([mk({ id: '1' })], COMPOSITE_EXPORT_COLUMNS).split('\n')[1]).toBe(',,,'));
});

describe('CSV import', () => {
  it('maps composite columns, validates entries and round-trips an export', () => {
    const c = mk({
      id: '1', firstName: 'Ada', lastName: 'L', name: 'Ada L', email: 'ada@x.io', phone: '555 000 0001',
      additionalEmails: [{ label: 'Work', value: 'w@x.io' }], additionalPhones: [{ label: 'Mobile', value: '555 000 0002' }],
      links: [{ label: 'GitHub', url: 'https://github.com/ada' }], address: { street: '1 Main', city: 'Austin', state: 'TX', postalCode: '78701', country: 'USA' },
    });
    const csv = contactsToCsv([c], ['firstName', 'lastName', 'email', 'additionalEmails', 'additionalPhones', 'links', 'address']);
    const [headers, ...rows] = parseCsvText(csv) as [string[], ...string[][]];
    const mapping = autoMatchColumns(headers, BASE_IMPORT_TARGETS);
    expect(Object.values(mapping)).toEqual(expect.arrayContaining(['additionalEmails', 'additionalPhones', 'links']));
    const [imported] = rowsToContacts(rows, { ...mapping, [headers.indexOf('address')]: 'address' });
    expect(imported!.errors).toEqual([]);
    expect(imported!.contact['additionalEmails']).toEqual(c.additionalEmails);
    expect(imported!.contact['additionalPhones']).toEqual(c.additionalPhones);
    expect(imported!.contact['links']).toEqual([{ label: 'GitHub', url: 'https://github.com/ada' }]);
    expect(imported!.contact['address']).toEqual(c.address);
  });
  it('maps separate address columns and flags invalid entries', () => {
    const headers = ['First name', 'Last name', 'Email', 'Street', 'City', 'Country', 'Links'];
    const mapping = autoMatchColumns(headers, BASE_IMPORT_TARGETS);
    expect(mapping[3]).toBe('address.street');
    expect(mapping[4]).toBe('address.city');
    const [r] = rowsToContacts([['A', 'B', 'a@x.io', '1 Main', 'Rome', 'IT', 'javascript:alert(1); https://ok.com']], mapping);
    expect(r!.contact['address']).toEqual({ street: '1 Main', city: 'Rome', country: 'IT' });
    expect(r!.contact['links']).toEqual([{ label: 'Website', url: 'https://ok.com/' }]);
    expect(r!.errors.some((e) => e.includes('Invalid link'))).toBe(true);
  });
});

describe('filters', () => {
  const field = (n: string) => BASE_CONTACT_FILTER_FIELDS.find((f) => f.name === n)!;
  const contacts = [
    mk({ id: 'a', email: 'a@x.io', additionalEmails: [{ label: 'W', value: 'hidden@corp.com' }], address: { city: 'Rome', country: 'Italy' } }),
    mk({ id: 'b', email: 'b@x.io', phone: '555 1', additionalPhones: [{ label: 'M', value: '555 777 8888' }] }),
  ];
  const f = (name: string, value: string) =>
    filterContacts(contacts, { recordFilters: [{ id: '1', fieldMetadataId: name, value, operand: ViewFilterOperand.CONTAINS } as never], recordFilterGroups: [] }, BASE_CONTACT_FILTER_FIELDS).map((c) => c.id);
  it('exposes the new fields', () => ['anyEmail', 'anyPhone', 'city', 'country'].forEach((n) => expect(field(n)).toBeTruthy()));
  it('matches any email / phone / city / country', () => {
    expect(f('anyEmail', 'corp.com')).toEqual(['a']);
    expect(f('anyPhone', '777')).toEqual(['b']);
    expect(f('city', 'rom')).toEqual(['a']);
    expect(f('country', 'ital')).toEqual(['a']);
  });
});

describe('timeline diff text for composite values', () => {
  it('reads like text, not [object Object]', () => {
    const before = mk({ id: '1' });
    const after = mk({ id: '1', additionalEmails: [{ label: 'W', value: 'w@x.io' }] });
    expect(describeDiff(computeContactDiff(before, after))).toBe('Additional emails: empty → w@x.io');
    expect(describeDiff(computeContactDiff(before, mk({ id: '1', address: { city: 'Rome', country: 'IT' } })))).toBe('Address: empty → Rome, IT');
  });
});

describe('migration 20260401001400', () => {
  it('adds the columns with defaults and CHECK constraints, and is re-runnable', async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    const sql = readFileSync(resolve(__dirname, '../supabase/migrations/20260401001400_contact_composite_fields.sql'), 'utf8');
    const db = new PGlite();
    await db.exec(`CREATE TABLE contacts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
      INSERT INTO contacts (email) VALUES ('a@x.io');`);
    await db.exec(sql);
    await db.exec(sql); // idempotent
    const r = await db.query<{ additional_emails: unknown; address: unknown; links: unknown }>('SELECT additional_emails, additional_phones, links, address FROM contacts');
    expect(r.rows[0]).toEqual({ additional_emails: [], additional_phones: [], links: [], address: {} });
    await expect(db.exec(`UPDATE contacts SET links = '{}'::jsonb`)).rejects.toThrow();
    await expect(db.exec(`UPDATE contacts SET address = '[]'::jsonb`)).rejects.toThrow();
    await expect(db.exec(`UPDATE contacts SET additional_emails = 'null'::jsonb`)).rejects.toThrow();
    await db.exec(`UPDATE contacts SET additional_emails = '[{"label":"W","value":"w@x.io"}]'::jsonb, address = '{"city":"Rome"}'::jsonb`);
  }, 60000);
});
