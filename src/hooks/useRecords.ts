import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger.service';

export type SortDirection = 'asc' | 'desc';
export type FilterOperator = 
  | 'equals' | 'notEquals' | 'contains' | 'notContains'
  | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan'
  | 'between' | 'isNull' | 'isNotNull' | 'in';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: 'AND' | 'OR';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
}

export interface UseRecordsQueryParams<T> {
  tableName: string;
  select?: string;
  filters?: FilterConfig[];
  filterLogic?: 'AND' | 'OR';
  sorts?: SortConfig[];
  pagination?: { page: number; pageSize: number };
  searchQuery?: string;
  searchFields?: (keyof T)[];
  enabled?: boolean;
}

export interface UseRecordsQueryResult<T> {
  records: T[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  pagination: PaginationState;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

function applyFilters(query: any, filters: FilterConfig[], logic: 'AND' | 'OR' = 'AND') {
  if (!filters || filters.length === 0) return query;

  filters.forEach((filter, index) => {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'equals':
        query = query.eq(field, value);
        break;
      case 'notEquals':
        query = query.neq(field, value);
        break;
      case 'contains':
        query = query.ilike(field, `%${value}%`);
        break;
      case 'notContains':
        query = query.not(field, 'ilike', `%${value}%`);
        break;
      case 'startsWith':
        query = query.ilike(field, `${value}%`);
        break;
      case 'endsWith':
        query = query.ilike(field, `%${value}`);
        break;
      case 'greaterThan':
        query = query.gt(field, value);
        break;
      case 'lessThan':
        query = query.lt(field, value);
        break;
      case 'between':
        query = query.gte(field, value[0]).lte(field, value[1]);
        break;
      case 'isNull':
        query = query.is(field, null);
        break;
      case 'isNotNull':
        query = query.not(field, 'is', null);
        break;
      case 'in':
        query = query.in(field, Array.isArray(value) ? value : [value]);
        break;
    }
  });

  return query;
}

function applySorts(query: any, sorts: SortConfig[] = []) {
  if (!sorts || sorts.length === 0) return query;
  
  sorts.forEach(sort => {
    query = sort.direction === 'asc' 
      ? query.order(sort.field, { ascending: true })
      : query.order(sort.field, { ascending: false });
  });
  
  return query;
}

function applySearch(query: any, searchQuery: string, searchFields: (keyof any)[] = []) {
  if (!searchQuery || searchFields.length === 0) return query;
  
  const orConditions = searchFields
    .map(field => `${field}.ilike.%${searchQuery}%`)
    .join(',');
  
  return query.or(orConditions);
}

export function useFindManyRecords<T>({
  tableName,
  select = '*',
  filters,
  filterLogic,
  sorts,
  pagination,
  searchQuery,
  searchFields,
  enabled = true
}: UseRecordsQueryParams<T>): UseRecordsQueryResult<T> {
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    page: pagination?.page || 0,
    pageSize: pagination?.pageSize || 20,
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchRecords = useCallback(async () => {
    if (!enabled) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(tableName)
        .select(select, { count: 'exact' });

      if (filters && filters.length > 0) {
        query = applyFilters(query, filters, filterLogic);
      }

      if (searchQuery && searchFields && searchFields.length > 0) {
        query = applySearch(query, searchQuery, searchFields);
      }

      if (sorts && sorts.length > 0) {
        query = applySorts(query, sorts);
      }

      const pageSize = pagination?.pageSize || 20;
      const page = pagination?.page || 0;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (abortControllerRef.current?.signal.aborted) return;

      if (fetchError) throw fetchError;

      if (isMountedRef.current) {
        setRecords(data || []);
        setTotalCount(count || 0);
        setPaginationState({
          page,
          pageSize,
          hasNextPage: (count || 0) > (page + 1) * pageSize,
          hasPreviousPage: page > 0,
          totalCount: count || 0
        });
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return;
      
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to fetch ${tableName}`, error);
      
      if (isMountedRef.current) {
        setError(error);
        setRecords([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [tableName, select, filters, filterLogic, sorts, pagination, searchQuery, searchFields, enabled, logger]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchRecords();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRecords]);

  const refetch = useCallback(async () => {
    await fetchRecords();
  }, [fetchRecords]);

  const fetchMore = useCallback(async () => {
    if (!paginationState.hasNextPage || loading) return;
    
    const newPagination = {
      ...pagination,
      page: (pagination?.page || 0) + 1
    };
    
    setPaginationState(prev => ({
      ...prev,
      page: prev.page + 1
    }));
    
    // Trigger refetch with new pagination
    // The effect will pick it up via pagination dependency
  }, [paginationState.hasNextPage, loading, pagination]);

  return {
    records,
    loading,
    error,
    totalCount,
    pagination: paginationState,
    refetch,
    fetchMore,
    hasNextPage: paginationState.hasNextPage,
    hasPreviousPage: paginationState.hasPreviousPage
  };
}

export function useFindOneRecord<T>({
  tableName,
  id,
  select = '*',
  enabled = true
}: {
  tableName: string;
  id: string;
  select?: string;
  enabled?: boolean;
}): {
  record: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [record, setRecord] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchRecord = useCallback(async () => {
    if (!enabled || !id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select(select)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (isMountedRef.current) {
        setRecord(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setRecord(null);
        logger.error(`Failed to fetch ${tableName} by id`, error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [tableName, id, select, enabled, logger]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchRecord();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchRecord]);

  const refetch = useCallback(async () => {
    await fetchRecord();
  }, [fetchRecord]);

  return { record, loading, error, refetch };
}

export function useCreateOneRecord<T>({
  tableName,
  onSuccess,
  onError
}: {
  tableName: string;
  onSuccess?: (record: T) => void;
  onError?: (error: Error) => void;
}): {
  createRecord: (data: Partial<T>) => Promise<T>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const createRecord = useCallback(async (data: Partial<T>): Promise<T> => {
    if (loading) return Promise.reject(new Error('Operation in progress'));

    setLoading(true);

    try {
      const { data: result, error: createError } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();

      if (createError) throw createError;

      const record = result as T;

      if (isMountedRef.current && onSuccess) {
        onSuccess(record);
      }

      logger.info(`Created record in ${tableName}`, { id: (record as any).id });

      return record;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to create record in ${tableName}`, error);

      if (isMountedRef.current && onError) {
        onError(error);
      }

      throw error;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [tableName, onSuccess, onError, logger]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { createRecord, loading };
}

export function useUpdateOneRecord<T>({
  tableName,
  onSuccess,
  onError
}: {
  tableName: string;
  onSuccess?: (record: T) => void;
  onError?: (error: Error) => void;
}): {
  updateRecord: (id: string, data: Partial<T>) => Promise<T | null>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const updateRecord = useCallback(async (id: string, data: Partial<T>): Promise<T | null> => {
    setLoading(true);

    try {
      const { data: result, error: updateError } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const record = result as T;

      if (isMountedRef.current && onSuccess) {
        onSuccess(record);
      }

      logger.info(`Updated record in ${tableName}`, { id });

      return record;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to update record in ${tableName}`, { id, error });

      if (isMountedRef.current && onError) {
        onError(error);
      }

      throw error;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [tableName, onSuccess, onError, logger]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { updateRecord, loading };
}

export function useDeleteOneRecord({
  tableName,
  onSuccess,
  onError
}: {
  tableName: string;
  onSuccess?: (id: string) => void;
  onError?: (error: Error) => void;
}): {
  deleteRecord: (id: string) => Promise<void>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    setLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      if (isMountedRef.current && onSuccess) {
        onSuccess(id);
      }

      logger.info(`Deleted record from ${tableName}`, { id });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to delete record from ${tableName}`, { id, error });
      
      if (isMountedRef.current && onError) {
        onError(error);
      }
      
      throw error;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [tableName, onSuccess, onError, logger]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { deleteRecord, loading };
}

export function useDeleteManyRecords({
  tableName,
  onSuccess,
  onError
}: {
  tableName: string;
  onSuccess?: (count: number) => void;
  onError?: (error: Error) => void;
}): {
  deleteManyRecords: (ids: string[]) => Promise<number>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);

  const deleteManyRecords = useCallback(async (ids: string[]): Promise<number> => {
    if (ids.length === 0) return 0;
    
    setLoading(true);

    try {
      const { error, count } = await supabase
        .from(tableName)
        .delete()
        .in('id', ids);

      if (error) throw error;

      const deletedCount = count || ids.length;

      if (onSuccess) {
        onSuccess(deletedCount);
      }

      logger.info(`Deleted ${deletedCount} records from ${tableName}`);
      
      return deletedCount;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to delete records from ${tableName}`, error);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tableName, onSuccess, onError, logger]);

  return { deleteManyRecords, loading };
}
