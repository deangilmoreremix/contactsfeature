import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contact } from '../types/contact';
import { logger } from '../services/logger.service';

export interface ContactPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contact: Contact) => void;
  filterFn?: (contact: Contact) => boolean;
}

export function useContactPicker({ isOpen, onClose, onSelect, filterFn }: ContactPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedId(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,company.ilike.%${trimmed}%,title.ilike.%${trimmed}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const filtered = (data || []).filter(filterFn ? filterFn : () => true);
      setResults(filtered as Contact[]);
    } catch (error) {
      logger.error('Contact picker search failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, [query, filterFn, logger]);

  const handleSelect = (contact: Contact) => {
    setSelectedId(contact.id);
    onSelect(contact);
    onClose();
  };

  return {
    query,
    setQuery,
    results,
    loading,
    selectedId,
    inputRef,
    search,
    handleSelect
  };
}
