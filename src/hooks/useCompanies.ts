import { useEffect, useMemo } from 'react';
import type { Contact } from '../types/contact';
import { useContactStore } from './useContactStore';
import { useDealStore } from '../store/useDealStore';
import { buildCompanies, findCompany, type Company } from '../lib/groups/companies';

/**
 * Companies derived from contacts (and, when the deal store is loaded, their open deals).
 * Pass `contacts` to derive from a filtered list; omit it to use every contact in the store.
 * Deals are not fetched here (pass `{ loadDeals: true }` to trigger a one-off fetch).
 */
export function useCompanies(contacts?: Contact[], options: { loadDeals?: boolean } = {}) {
  const storeContacts = useContactStore((s) => s.contacts);
  const deals = useDealStore((s) => s.deals);
  const loaded = useDealStore((s) => s.loaded);
  const fetchDeals = useDealStore((s) => s.fetchDeals);
  const source = contacts ?? storeContacts;

  useEffect(() => {
    if (options.loadDeals && !loaded) void fetchDeals();
  }, [options.loadDeals, loaded, fetchDeals]);

  const companies = useMemo(() => buildCompanies(source, deals), [source, deals]);
  return {
    companies,
    findByName: (name: string | null | undefined): Company | undefined => findCompany(companies, name),
  };
}
