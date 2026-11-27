/**
 * useFindManyRecords: OR filter logic, safe search filters, and fetchMore paging
 * (found by PR review: fetchMore was a no-op, `logic` was ignored, the search string was spliced into .or() unescaped).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const calls: Array<[string, unknown[]]> = [];
let total = 45;

vi.mock('../lib/supabase', () => {
  const chain: any = new Proxy({}, {
    get(_t, name: string) {
      if (name === 'then') return (res: any) => res({ data: [{ id: 'r' }], error: null, count: total });
      return (...args: unknown[]) => { calls.push([name, args]); return chain; };
    },
  });
  return { supabase: { from: (t: string) => { calls.push(['from', [t]]); return chain; } } };
});

import { useFindManyRecords } from '../hooks/useRecords';

beforeEach(() => { calls.length = 0; total = 45; });
const last = (name: string) => [...calls].reverse().find(([n]) => n === name);

describe('useFindManyRecords', () => {
  it('applies OR logic through a single .or() condition list', async () => {
    renderHook(() => useFindManyRecords<any>({
      tableName: 'contacts',
      filters: [{ field: 'status', operator: 'equals', value: 'lead' }, { field: 'company', operator: 'contains', value: 'Acme' }],
      filterLogic: 'OR',
    }));
    await waitFor(() => expect(last('or')).toBeDefined());
    expect(last('or')![1][0]).toBe('status.eq."lead",company.ilike."%Acme%"');
    expect(calls.some(([n]) => n === 'eq')).toBe(false);
  });

  it('keeps AND logic as chained filters', async () => {
    renderHook(() => useFindManyRecords<any>({ tableName: 'contacts', filters: [{ field: 'status', operator: 'equals', value: 'lead' }] }));
    await waitFor(() => expect(last('eq')).toEqual(['eq', ['status', 'lead']]));
  });

  it('cannot be broken out of by search text', async () => {
    renderHook(() => useFindManyRecords<any>({ tableName: 'contacts', searchQuery: 'x%,id.eq.1)"', searchFields: ['name', 'email'] }));
    await waitFor(() => expect(last('or')).toBeDefined());
    const expr = String(last('or')![1][0]);
    // the whole user text lives inside one double-quoted value per field; quotes are stripped so it cannot close the value
    expect(expr).toBe('name.ilike."%x%,id.eq.1)%",email.ilike."%x%,id.eq.1)%"');
    expect(expr.split('"').length - 1).toBe(4);
  });

  it('fetchMore requests the next page', async () => {
    const pagination = { page: 0, pageSize: 20 }; // stable identity: the hook re-queries when the object changes
    const { result } = renderHook(() => useFindManyRecords<any>({ tableName: 'contacts', pagination }));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(last('range')![1]).toEqual([0, 19]);
    await act(async () => { await result.current.fetchMore(); });
    await waitFor(() => expect(last('range')![1]).toEqual([20, 39]));
    expect(result.current.pagination.page).toBe(1);
  });
});
