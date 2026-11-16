import { useState, useRef, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useDebounce } from './useDebounce';
import { sdrAuthHeaders } from '../services/sdrClient';

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
  minQueryLength = 2,
  mode = 'fuzzy',
  getId
}: {
  items: T[];
  options: SmartSearchOptions<T>;
  searchQuery: string;
  minQueryLength?: number;
  /** 'semantic' ranks by embedding similarity via the semantic-search function; Fuse.js stays the fallback. */
  mode?: 'fuzzy' | 'semantic';
  /** Required for semantic mode: maps an item to its contact id. */
  getId?: (item: T) => string;
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

  const [semanticHits, setSemanticHits] = useState<{ id: string; score: number }[] | null>(null);
  const [semanticError, setSemanticError] = useState<string | null>(null);

  useEffect(() => {
    const q = debouncedQuery?.trim() ?? '';
    if (mode !== 'semantic' || !getId || q.length < minQueryLength) {
      setSemanticHits(null);
      setSemanticError(null);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/semantic-search', {
          method: 'POST',
          headers: await sdrAuthHeaders(),
          body: JSON.stringify({ query: q })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `Semantic search failed (${res.status})`);
        if (cancelled) return;
        setSemanticHits((json.results || []).map((r: { contact: { id: string }; score: number }) => ({ id: r.contact.id, score: r.score })));
        setSemanticError(null);
      } catch (e) {
        if (cancelled) return;
        setSemanticHits(null); // fall back to Fuse.js
        setSemanticError(e instanceof Error ? e.message : 'Semantic search failed');
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, debouncedQuery, minQueryLength, getId]);

  const fuzzyResults: SearchResult<T>[] = useMemo(() => {
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

  const semanticResults: SearchResult<T>[] | null = useMemo(() => {
    if (!semanticHits || !getId) return null;
    const byId = new Map(items.map((it) => [getId(it), it]));
    return semanticHits.flatMap((h) => {
      const item = byId.get(h.id);
      // Fuse-style score: lower is better, so invert similarity.
      return item ? [{ item, score: 1 - h.score }] : [];
    });
  }, [semanticHits, items, getId]);

  const results: SearchResult<T>[] = semanticResults ?? fuzzyResults;

  const highlightedIndices = useMemo(() => {
    if (!results[0]?.matches) return undefined;
    return results[0].matches.find(m => m.key === options.keys[0]?.name)?.indices ?? undefined;
  }, [results, options.keys]);

  return {
    results,
    isSearching,
    activeMode: (semanticResults ? 'semantic' : 'fuzzy') as 'semantic' | 'fuzzy',
    semanticError,
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
