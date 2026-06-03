import { useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { useDebounce } from './useDebounce';

export interface SearchableField<T> {
  name: string;
  weight?: number;
  getValue: (item: T) => string | number | undefined;
}

export interface SmartSearchOptions<T> {
  keys: SearchableField<T>[];
  threshold?: number;
  includeScore?: boolean;
  minMatchCharLength?: number;
  ignoreLocation?: boolean;
}

export interface SearchResult<T> {
  item: T;
  score?: number;
  matches?: Fuse.FuseResultMatch<T>['matches'];
}

export function useSmartSearch<T>({
  items,
  options,
  searchQuery,
  minQueryLength = 2
}: {
  items: T[];
  options: SmartSearchOptions<T>;
  searchQuery: string;
  minQueryLength?: number;
}) {
  const fuseRef = useRef<Fuse<T> | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 200);

  const fuse = useMemo(() => {
    if (!items || items.length === 0) return null;

    return new Fuse<T>(items, {
      keys: options.keys.map(key => ({
        name: key.name,
        weight: key.weight ?? 1,
        getFn: (item: T) => String(key.getValue(item) ?? '')
      })),
      threshold: options.threshold ?? 0.35,
      includeScore: options.includeScore ?? true,
      minMatchCharLength: options.minMatchCharLength ?? 2,
      ignoreLocation: options.ignoreLocation ?? true,
      useExtendedSearch: false
    });
  }, [items, options]);

  const results: SearchResult<T>[] = useMemo(() => {
    if (!fuse || !debouncedQuery || debouncedQuery.trim().length < minQueryLength) {
      return [];
    }

    setIsSearching(true);
    try {
      const fuseResults = fuse.search(debouncedQuery.trim());
      return fuseResults.map(result => ({
        item: result.item,
        score: result.score,
        matches: result.matches?.map(m => ({
          indices: m.indices,
          key: m.key,
          value: m.value
        }))
      }));
    } finally {
      setIsSearching(false);
    }
  }, [fuse, debouncedQuery, minQueryLength]);

  const highlightedIndices = useMemo(() => {
    if (!results[0]?.matches) return undefined;
    return results[0].matches.find(m => m.key === options.keys[0]?.name)?.indices ?? undefined;
  }, [results, options.keys]);

  return {
    results,
    isSearching,
    totalResults: results.length,
    hasExactMatch: results[0]?.score !== undefined ? results[0].score! < 0.1 : false,
    highlightedIndices
  };
}

export function useContactSearch() {
  return {
    searchOptions: {
      keys: [
        { name: 'name', weight: 0.35 },
        { name: 'email', weight: 0.2 },
        { name: 'company', weight: 0.2 },
        { name: 'title', weight: 0.15 },
        { name: 'industry', weight: 0.05 },
        { name: 'notes', weight: 0.03 },
        { name: 'tags', weight: 0.02 }
      ]
    }
  };
}
