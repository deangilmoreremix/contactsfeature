import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contact } from '../types/contact';
import { logger } from '../services/logger.service';

export interface RecordPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contact: Contact) => void;
  title?: string;
  filterFn?: (contact: Contact) => boolean;
}

export function RecordPicker({ isOpen, onClose, onSelect, title = 'Select Contact', filterFn }: RecordPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useState(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  });

  const search = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      let dbQuery = supabase
        .from('contacts')
        .select('*')
        .or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,company.ilike.%${trimmed}%,title.ilike.%${trimmed}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data, error } = await dbQuery;
      if (error) throw error;
      const filtered = (data || []).filter(filterFn ? filterFn : () => true);
      setResults(filtered as Contact[]);
    } catch (error) {
      logger.error('Record picker search failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search contacts..."
            className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoFocus
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {loading && <div className="p-4 text-center text-gray-500">Searching...</div>}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-center text-gray-500">No contacts found</div>
          )}
          {results.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onSelect(contact)}
              className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              <img
                src={contact.avatarSrc}
                alt={contact.name}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
                }}
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{contact.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{contact.title} at {contact.company}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
