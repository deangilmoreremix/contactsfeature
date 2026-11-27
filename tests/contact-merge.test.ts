// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { findDuplicateGroups } from '../src/lib/merge/findDuplicates';
import { mergeContactRecords, mergePatch, MAX_MERGE_RECORDS } from '../src/lib/merge/mergeContacts';

const c = (o: any): any => ({ name: o.id, email: '', company: '', ...o });

describe('findDuplicateGroups', () => {
  it('groups by normalized email, phone and name+company, transitively', () => {
    const groups = findDuplicateGroups([
      c({ id: '1', name: 'Ada Lovelace', email: 'Ada@Acme.com', company: 'Acme', phone: '+1 (555) 123-4567' }),
      c({ id: '2', name: 'A. Lovelace', email: ' ada@acme.com ' }),
      c({ id: '3', name: 'Ada L', phone: '555-123-4567' }),
      c({ id: '4', name: 'Bob', email: 'bob@x.com' }),
      c({ id: '5', name: 'Ada Lovelace', company: 'ACME' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.contacts.map((x) => x.id).sort()).toEqual(['1', '2', '3', '5']);
    expect(groups[0]!.reasons.sort()).toEqual(['email', 'name_company', 'phone']);
  });

  it('ignores short phones and empty values; returns nothing when unique', () => {
    expect(findDuplicateGroups([c({ id: '1', phone: '123' }), c({ id: '2', phone: '123' }), c({ id: '3' }), c({ id: '4' })])).toEqual([]);
  });
});

describe('mergeContactRecords', () => {
  const a = c({ id: 'a', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@acme.com', company: '', tags: ['vip'], sources: ['web'], notes: 'Met at expo', isFavorite: false, socialProfiles: { linkedin: 'li-a' }, aiScore: 80 });
  const b = c({ id: 'b', firstName: 'Ada', lastName: 'L', email: 'ada@other.com', company: 'Acme', title: 'CTO', tags: ['saas', 'vip'], sources: ['import'], notes: 'Intro call', isFavorite: true, socialProfiles: { linkedin: 'li-b', twitter: 'tw-b' }, aiScore: 40 });

  it('winner wins, empty fields are filled, arrays union, objects merge with winner priority', () => {
    const { merged, conflicts } = mergeContactRecords([a, b]);
    expect(merged.id).toBe('a');
    expect(merged.email).toBe('ada@acme.com');
    expect(merged.company).toBe('Acme');
    expect(merged.title).toBe('CTO');
    expect(merged.tags).toEqual(['vip', 'saas']);
    expect(merged.sources).toEqual(['web', 'import']);
    expect(merged.socialProfiles).toEqual({ linkedin: 'li-a', twitter: 'tw-b' });
    expect(merged.isFavorite).toBe(true);
    expect(merged.notes).toBe('Met at expo\n\nIntro call');
    expect(merged.aiScore).toBe(80);
    expect(conflicts).toEqual(expect.arrayContaining(['email', 'lastName']));
  });

  it('honours per-field overrides, even to an empty value', () => {
    const { merged } = mergeContactRecords([a, b], { email: 'b', company: 'a' });
    expect(merged.email).toBe('ada@other.com');
    expect(merged.company).toBe('');
  });

  it('patch only lists changed fields; validates record count', () => {
    const { merged } = mergeContactRecords([a, b]);
    const patch = mergePatch(a, merged);
    expect(Object.keys(patch)).toEqual(expect.arrayContaining(['company', 'title', 'tags']));
    expect(patch).not.toHaveProperty('email');
    expect(() => mergeContactRecords([a])).toThrow();
    expect(() => mergeContactRecords(Array.from({ length: MAX_MERGE_RECORDS + 1 }, (_, i) => c({ id: String(i) })))).toThrow();
  });
});
