// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { autoMatchColumns, BASE_IMPORT_TARGETS, flagImportDuplicates, parseCsvText, rowsToContacts } from '../src/lib/import/columnMapping';

describe('parseCsvText', () => {
  it('handles quotes, escaped quotes, commas and newlines inside fields and CRLF', () => {
    const rows = parseCsvText('a,b,c\r\n"Smith, John","He said ""hi""","line1\nline2"\r\nx,y,z\r\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['Smith, John', 'He said "hi"', 'line1\nline2'],
      ['x', 'y', 'z'],
    ]);
  });
  it('strips BOM and skips blank lines', () => {
    expect(parseCsvText('﻿a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('autoMatchColumns', () => {
  it('matches exact, aliased and fuzzy headers, each target once', () => {
    const m = autoMatchColumns(['First Name', 'surname', 'E-mail Address', 'Organisation', 'Job Titel', 'Favourite colour'], BASE_IMPORT_TARGETS);
    expect(m[0]).toBe('firstName');
    expect(m[1]).toBe('lastName');
    expect(m[2]).toBe('email');
    expect(m[3]).toBe('company');
    expect(m[4]).toBe('title'); // typo handled by fuzzy match
    expect(m[5]).toBe(''); // unknown column ignored
  });

  it('does not map two columns to the same field', () => {
    const m = autoMatchColumns(['email', 'Email'], BASE_IMPORT_TARGETS);
    expect(Object.values(m).filter((v) => v === 'email')).toHaveLength(1);
  });
});

describe('rowsToContacts', () => {
  const headers = ['firstName', 'lastName', 'email', 'tags', 'Region'];
  const mapping = { 0: 'firstName', 1: 'lastName', 2: 'email', 3: 'tags', 4: 'custom:Region' };

  it('fixes the old importer bug: camelCase headers validate', () => {
    const [ok] = rowsToContacts([['Ada', 'Lovelace', 'ADA@Acme.com', 'vip; saas', 'EU']], mapping);
    expect(ok!.errors).toEqual([]);
    expect(ok!.contact).toMatchObject({ firstName: 'Ada', email: 'ada@acme.com', name: 'Ada Lovelace', tags: ['vip', 'saas'], customFields: { Region: 'EU' }, status: 'lead' });
    void headers;
  });

  it('reports row-level errors with file row numbers and splits full names', () => {
    const rows = rowsToContacts([['', '', 'nope', '', ''], ['Bob', 'S', 'b@x.com', '', '']], mapping);
    expect(rows[0]!.rowNumber).toBe(2);
    expect(rows[0]!.errors).toEqual(expect.arrayContaining(['First name is required', 'Invalid email format']));
    const full = rowsToContacts([['Ada Mae Lovelace', 'a@b.co']], { 0: 'name', 1: 'email' }, 5);
    expect(full[0]!.contact).toMatchObject({ firstName: 'Ada', lastName: 'Mae Lovelace' });
    expect(full[0]!.rowNumber).toBe(5);
  });

  it('removes the export zero-width joiner so exported files re-import cleanly', () => {
    const [r] = rowsToContacts([['‍=Ada', 'L', 'a@b.co']], { 0: 'firstName', 1: 'lastName', 2: 'email' });
    expect(r!.contact['firstName']).toBe('=Ada');
  });
});

describe('flagImportDuplicates', () => {
  it('flags rows matching existing contacts and repeated rows in the file', () => {
    const existing: any[] = [{ id: 'e1', name: 'Ada Lovelace', email: 'ada@acme.com', company: 'Acme' }];
    const rows = rowsToContacts([
      ['Ada', 'L', 'ada@acme.com'],
      ['Bob', 'S', 'bob@x.com'],
      ['Bobby', 'S', 'BOB@x.com'],
    ], { 0: 'firstName', 1: 'lastName', 2: 'email' });
    const flags = flagImportDuplicates(rows, existing);
    expect(flags).toEqual([
      { rowNumber: 2, kind: 'existing', matchName: 'Ada Lovelace' },
      { rowNumber: 4, kind: 'file', matchName: 'Bob S' },
    ]);
  });
});
