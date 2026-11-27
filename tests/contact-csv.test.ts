// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { contactsToCsv } from '../src/utils/contactCsv';

const c = (o: Record<string, unknown>): any => ({ id: '1', firstName: 'A', lastName: 'B', ...o });

describe('contactsToCsv', () => {
  it('quotes commas, quotes and newlines', () => {
    const csv = contactsToCsv([c({ company: 'Acme, Inc', title: 'He said "hi"', phone: 'a\nb' })], ['company', 'title', 'phone']);
    expect(csv.split('\n')[0]).toBe('company,title,phone');
    expect(csv).toContain('"Acme, Inc"');
    expect(csv).toContain('"He said ""hi"""');
  });

  it('neutralises spreadsheet formula injection', () => {
    const csv = contactsToCsv([c({ company: '=HYPERLINK("http://evil")', title: '+1', email: '@x' })], ['company', 'title', 'email']);
    const row = csv.split('\n').slice(1).join('\n');
    expect(row.startsWith('"‍=HYPERLINK')).toBe(true);
    expect(row).toContain('‍+1');
    expect(row).toContain('‍@x');
  });

  it('exports arrays as JSON and handles empty values', () => {
    const csv = contactsToCsv([c({ tags: ['a', 'b'], phone: undefined })], ['tags', 'phone']);
    expect(csv.split('\n')[1]).toBe('"[""a"",""b""]",');
  });
});
