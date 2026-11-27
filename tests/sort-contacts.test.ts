// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nextSorts, sortContacts, toSortList } from '../src/lib/views/sortContacts';

const c = (id: string, o: Record<string, unknown> = {}) =>
  ({ id, name: id, company: '', status: 'lead', updatedAt: '2024-01-01T00:00:00Z', aiScore: 0, ...o } as any);
const ids = (list: any[]) => list.map((x) => x.id);

describe('sortContacts', () => {
  it('sorts text case-insensitively', () => {
    const l = [c('b', { name: 'bob' }), c('a', { name: 'Alice' }), c('d', { name: 'dave' }), c('c', { name: 'Carol' })];
    expect(ids(sortContacts(l, [{ field: 'name', direction: 'asc' }]))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(sortContacts(l, [{ field: 'name', direction: 'desc' }]))).toEqual(['d', 'c', 'b', 'a']);
  });
  it('breaks ties with the next sort in list order', () => {
    const l = [
      c('1', { company: 'Acme', aiScore: 10 }),
      c('2', { company: 'acme', aiScore: 90 }),
      c('3', { company: 'Beta', aiScore: 50 }),
      c('4', { company: 'ACME', aiScore: 50 }),
    ];
    const sorted = sortContacts(l, [{ field: 'company', direction: 'asc' }, { field: 'score', direction: 'desc' }]);
    expect(ids(sorted)).toEqual(['2', '4', '1', '3']);
  });
  it('is stable for equal rows and does not mutate the input', () => {
    const l = [c('x', { company: 'A' }), c('y', { company: 'A' }), c('z', { company: 'A' })];
    const copy = [...l];
    expect(ids(sortContacts(l, [{ field: 'company', direction: 'desc' }]))).toEqual(['x', 'y', 'z']);
    expect(l).toEqual(copy);
  });
  it('puts empty values last in both directions', () => {
    const l = [c('n1', { email: undefined }), c('a', { email: 'a@x.io' }), c('n2', { email: '' }), c('b', { email: 'B@x.io' })];
    expect(ids(sortContacts(l, [{ field: 'email', direction: 'asc' }]))).toEqual(['a', 'b', 'n1', 'n2']);
    expect(ids(sortContacts(l, [{ field: 'email', direction: 'desc' }]))).toEqual(['b', 'a', 'n1', 'n2']);
  });
  it('sorts numbers numerically and dates chronologically', () => {
    const nums = [c('9', { aiScore: 9 }), c('10', { aiScore: 10 }), c('2', { aiScore: 2 })];
    expect(ids(sortContacts(nums, [{ field: 'score', direction: 'asc' }]))).toEqual(['2', '9', '10']);
    const dates = [
      c('mid', { updatedAt: '2024-06-01T00:00:00Z' }),
      c('new', { updatedAt: '2025-01-01T00:00:00Z' }),
      c('bad', { updatedAt: 'nope' }),
      c('old', { updatedAt: '2023-02-01T00:00:00Z' }),
    ];
    expect(ids(sortContacts(dates, [{ field: 'updated', direction: 'desc' }]))).toEqual(['new', 'mid', 'old', 'bad']);
    expect(ids(sortContacts(dates, [{ field: 'updated', direction: 'asc' }]))).toEqual(['old', 'mid', 'new', 'bad']);
  });
  it('keeps the legacy behaviour for empty company (sorts as the smallest text)', () => {
    const l = [c('b', { company: 'Beta' }), c('e', { company: '' })];
    expect(ids(sortContacts(l, [{ field: 'company', direction: 'asc' }]))).toEqual(['e', 'b']);
  });
  it('ignores unknown fields', () => {
    const l = [c('b'), c('a')];
    expect(ids(sortContacts(l, [{ field: 'nope', direction: 'asc' }]))).toEqual(['b', 'a']);
  });
  it('supports custom field maps', () => {
    const l = [{ id: 1, v: 'x' }, { id: 2, v: 'a' }];
    expect(sortContacts(l, [{ field: 'v', direction: 'asc' }], { v: { kind: 'text', get: (r: any) => r.v } }).map((r) => r.id)).toEqual([2, 1]);
  });
});

describe('sort list helpers', () => {
  it('header click toggles one sort; shift+click adds and toggles secondary sorts', () => {
    const base = [{ field: 'name', direction: 'asc' as const }];
    expect(nextSorts(base, 'name')).toEqual([{ field: 'name', direction: 'desc' }]);
    expect(nextSorts(base, 'email')).toEqual([{ field: 'email', direction: 'asc' }]);
    const two = nextSorts(base, 'email', { additive: true });
    expect(two).toEqual([{ field: 'name', direction: 'asc' }, { field: 'email', direction: 'asc' }]);
    expect(nextSorts(two, 'email', { additive: true })[1]).toEqual({ field: 'email', direction: 'desc' });
    expect(nextSorts(two, 'name')).toEqual([{ field: 'name', direction: 'desc' }]);
  });
  it('converts the legacy single sort and drops a duplicate field', () => {
    expect(toSortList({ by: 'name', order: 'desc' })).toEqual([{ field: 'name', direction: 'desc' }]);
    expect(toSortList({ by: 'name', order: 'asc' }, [{ field: 'name', direction: 'desc' }, { field: 'company', direction: 'asc' }])).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'company', direction: 'asc' },
    ]);
  });
});
