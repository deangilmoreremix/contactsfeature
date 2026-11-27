// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { findDuplicatesOf, pairKey, readDismissedPairs, dismissPair, dismissedKey } from '../src/lib/merge/duplicateHint';

const c = (o: any): any => ({ name: o.id, email: '', company: '', ...o });
const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m };
};

describe('findDuplicatesOf', () => {
  const me = c({ id: '1', name: 'Ada Lovelace', email: 'Ada@Acme.com', company: 'Acme', phone: '+1 (555) 123-4567' });
  it('finds direct matches by email, phone and name+company with reasons', () => {
    const res = findDuplicatesOf(me, [
      me,
      c({ id: '2', email: ' ada@acme.com ' }),
      c({ id: '3', phone: '555-123-4567' }),
      c({ id: '4', name: 'ada lovelace', company: 'ACME' }),
      c({ id: '5', name: 'Bob', email: 'bob@x.com' }),
    ]);
    expect(res.map((r) => r.contact.id).sort()).toEqual(['2', '3', '4']);
    expect(res.find((r) => r.contact.id === '2')!.reasons).toEqual(['email']);
    expect(res.find((r) => r.contact.id === '3')!.reasons).toEqual(['phone']);
    expect(res.find((r) => r.contact.id === '4')!.reasons).toEqual(['name_company']);
  });
  it('does not include transitive-only matches, trashed contacts, or hint for trashed contact', () => {
    const a = c({ id: 'a', email: 'a@x.com' });
    const b = c({ id: 'b', email: 'a@x.com', phone: '5551234567' });
    const d = c({ id: 'd', phone: '5551234567' });
    expect(findDuplicatesOf(a, [a, b, d]).map((r) => r.contact.id)).toEqual(['b']);
    expect(findDuplicatesOf(me, [c({ id: '9', email: 'ada@acme.com', deletedAt: 'x' })])).toEqual([]);
    expect(findDuplicatesOf({ ...me, deletedAt: 'x' }, [c({ id: '9', email: 'ada@acme.com' })])).toEqual([]);
  });
  it('is empty when nothing matches', () => {
    expect(findDuplicatesOf(me, [me, c({ id: '2', email: 'z@z.com' })])).toEqual([]);
  });
});

describe('dismissed pairs', () => {
  it('pair key is order independent and dismissal is remembered per user', () => {
    expect(pairKey('b', 'a')).toBe(pairKey('a', 'b'));
    const s = mem();
    dismissPair('u1', 'b', 'a', s);
    expect(readDismissedPairs('u1', s).has(pairKey('a', 'b'))).toBe(true);
    expect(readDismissedPairs('u1', s).has(pairKey('a', 'c'))).toBe(false);
    expect(readDismissedPairs('u2', s).size).toBe(0);
  });
  it('tolerates corrupt or throwing storage', () => {
    const s = mem();
    s.m.set(dismissedKey('u'), 'oops');
    expect(readDismissedPairs('u', s).size).toBe(0);
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('y'); } };
    expect(readDismissedPairs('u', bad).size).toBe(0);
    expect(dismissPair('u', 'a', 'b', bad).has('a|b')).toBe(true);
  });
});
