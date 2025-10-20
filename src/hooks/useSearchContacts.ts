import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { useContactStore } from './useContactStore';
import { Contact } from '../types';

/**
 * Custom hook for debounced contact search
 * @param initialQuery - Initial search query
 * @param debounceDelay - Delay in milliseconds (default: 300ms)
 * @returns Search state and functions
 */
export function useSearchContacts(initialQuery = '', debounceDelay = 300) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceDelay);
  const { searchContacts, contacts, isLoading, error: storeError } = useContactStore();

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        setError(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        await searchContacts(debouncedQuery);
        // Results will be updated via the store
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchContacts]);

  // Update local results when store contacts change
  useEffect(() => {
    if (query.trim()) {
      setSearchResults(contacts);
    }
  }, [contacts, query]);

  // Update error state when store error changes
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return {
    query,
    debouncedQuery,
    searchResults,
    isSearching: isSearching || isLoading,
    error,
    updateQuery,
    clearSearch,
    hasResults: searchResults.length > 0,
    resultCount: searchResults.length
  };
}