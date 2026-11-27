// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { contactsToVcard, escapeVcardText, foldVcardLine, safeVcardUrl, vcardFilename } from '../src/lib/export/vcard';
import { eventsToIcs, escapeIcsText, formatIcsUtc, serviceEventsToIcsEvents, icsFilename } from '../src/lib/export/ics';

const c = (o: any): any => ({ id: 'id1', name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com', company: '', title: '', ...o });
const bytes = (s: string) => new TextEncoder().encode(s).length;

describe('vcard', () => {
  it('escapes , ; \\ and newlines', () => {
    expect(escapeVcardText('a,b;c\\d\r\ne\nf')).toBe('a\\,b\;c\\\\d\\ne\\nf');
  });
  it('builds a 3.0 card with all fields and CRLF', () => {
    const out = contactsToVcard([c({
      phone: '+1 555 0100', company: 'Acme, Inc', title: 'CTO', notes: 'Line1\nLine2',
      additionalEmails: [{ label: 'Work', value: 'w@x.com' }, { label: 'Other', value: 'o@x.com' }],
      additionalPhones: [{ label: 'Mobile', value: '+1 555 0101' }],
      address: { street: '1 Main St; Apt 2', city: 'Town', state: 'CA', postalCode: '90210', country: 'USA' },
      links: [{ label: 'Website', url: 'https://acme.com/a' }, { label: 'x', url: 'javascript:alert(1)' }, { label: 'y', url: 'data:text/html,hi' }, { label: 'z', url: 'ftp://h/x' }],
    })]);
    expect(out.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(out.endsWith('END:VCARD\r\n')).toBe(true);
    expect(out.replace(/\r\n/g, '').includes('\n')).toBe(false);
    for (const line of [
      'FN:Ada Lovelace', 'N:Lovelace;Ada;;;', 'EMAIL;TYPE=INTERNET,PREF:ada@x.com',
      'EMAIL;TYPE=INTERNET,WORK:w@x.com', 'EMAIL;TYPE=INTERNET:o@x.com', 'TEL;TYPE=PREF:+1 555 0100',
      'TEL;TYPE=CELL:+1 555 0101', 'ORG:Acme\\, Inc', 'TITLE:CTO', 'ADR;TYPE=WORK:;;1 Main St\; Apt 2;Town;CA;90210;USA',
      'URL:https://acme.com/a', 'NOTE:Line1\\nLine2', 'UID:id1',
    ]) expect(out.split('\r\n')).toContain(line);
    expect(out).not.toMatch(/javascript|data:|ftp:/);
  });
  it('multiple contacts and empty input', () => {
    const out = contactsToVcard([c({ id: '1' }), c({ id: '2', name: 'Bob' })]);
    expect(out.match(/BEGIN:VCARD/g)).toHaveLength(2);
    expect(contactsToVcard([])).toBe('');
  });
  it('falls back to splitting the name when first/last are empty', () => {
    const out = contactsToVcard([c({ firstName: '', lastName: '', name: 'Grace Brewster Hopper' })]);
    expect(out).toContain('N:Brewster Hopper;Grace;;;');
  });
  it('injection-ish values cannot create extra properties', () => {
    const out = contactsToVcard([c({ name: 'Eve\r\nEND:VCARD\r\nBEGIN:VCARD', notes: 'x\r\nTEL:666', company: '=cmd|calc' })]);
    const lines = out.split('\r\n');
    expect(lines.filter((l) => l === 'END:VCARD')).toHaveLength(1);
    expect(lines.some((l) => l.startsWith('TEL:'))).toBe(false);
    expect(lines.filter((l) => l === 'BEGIN:VCARD')).toHaveLength(1);
  });
  it('folds at 75 octets without splitting multibyte characters, and unfolds losslessly', () => {
    const note = 'é'.repeat(100) + '日本語'.repeat(30) + '😀'.repeat(20);
    const out = contactsToVcard([c({ notes: note })]);
    const physical = out.split('\r\n').filter(Boolean);
    for (const l of physical) expect(bytes(l)).toBeLessThanOrEqual(75);
    expect(physical.some((l) => l.startsWith(' '))).toBe(true);
    const unfolded = out.replace(/\r\n /g, '');
    expect(unfolded).toContain(`NOTE:${note}`);
    expect(foldVcardLine('short')).toBe('short');
    expect(foldVcardLine('a'.repeat(75))).toBe('a'.repeat(75));
    expect(foldVcardLine('a'.repeat(76)).split('\r\n')).toEqual(['a'.repeat(75), ' a']);
  });
  it('urls and filenames', () => {
    expect(safeVcardUrl('https://a.com/x y')).toBe('https://a.com/x%20y');
    expect(safeVcardUrl('//a.com')).toBeNull();
    expect(vcardFilename([{ name: 'Ada Lovelace' }])).toBe('ada-lovelace.vcf');
    expect(vcardFilename([{ name: 'a' }, { name: 'b' }])).toBe('contacts.vcf');
  });
});

describe('ics', () => {
  const now = new Date('2026-11-16T10:00:00Z');
  it('formats UTC timestamps', () => {
    expect(formatIcsUtc(new Date('2026-11-20T15:05:09Z'))).toBe('20261120T150509Z');
  });
  it('builds a VCALENDAR with UTC start/end, uid, CRLF and escaping', () => {
    const out = eventsToIcs([
      { id: 'e1', title: 'Intro, call; v2', start: '2026-11-20T15:00:00+01:00', durationMinutes: 45, location: 'Room\n1', description: 'a\\b', url: 'https://meet.example/x' },
      { id: 'e2', title: 'Cancelled', start: new Date('2026-12-01T09:00:00Z'), status: 'cancelled' },
      { id: 'bad', title: 'x', start: 'not a date' },
    ], { now, calendarName: 'Ada - SmartCRM' });
    const lines = out.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(out.endsWith('\r\n')).toBe(true);
    expect(lines).toContain('UID:e1@smartcrm');
    expect(lines).toContain('DTSTAMP:20261116T100000Z');
    expect(lines).toContain('DTSTART:20261120T140000Z');
    expect(lines).toContain('DTEND:20261120T144500Z');
    expect(lines).toContain('SUMMARY:Intro\\, call\; v2');
    expect(lines).toContain('LOCATION:Room\\n1');
    expect(lines).toContain('DESCRIPTION:a\\\\b');
    expect(lines).toContain('URL:https://meet.example/x');
    expect(lines).toContain('STATUS:CANCELLED');
    expect(lines).toContain('DTEND:20261201T093000Z'); // default 30 min
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(out.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });
  it('folds long lines at 75 octets and neutralises injected lines', () => {
    const out = eventsToIcs([{ id: 'e', title: 'T\r\nEND:VEVENT\r\nBEGIN:VEVENT ' + 'é'.repeat(80), start: '2026-11-20T15:00:00Z' }], { now });
    for (const l of out.split('\r\n')) expect(bytes(l)).toBeLessThanOrEqual(75);
    expect(out.split('\r\n').filter((l) => l === 'END:VEVENT')).toHaveLength(1);
    expect(escapeIcsText('a,b;c')).toBe('a\\,b\;c');
  });
  it('maps service events and names the file', () => {
    const [e] = serviceEventsToIcsEvents([{ id: 'x', title: null, scheduled_for: '2026-11-20T15:00:00Z', duration_minutes: 60, status: 'scheduled', location: null, meeting_url: null, notes: null }]);
    expect(e!.title).toBe('Meeting');
    expect(icsFilename({ name: 'Ada L' })).toBe('ada-l-calendar.ics');
    expect(eventsToIcs([], { now })).toContain('BEGIN:VCALENDAR');
  });
});
