import React, { useMemo, useState } from 'react';
import { GitMerge, Search, X } from 'lucide-react';
import type { Contact } from '../../types/contact';
import { findDuplicateGroups, type DuplicateReason } from '../../lib/merge/findDuplicates';
import { TOOLBAR_ICON_BTN } from './toolbarStyles';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';

interface ContactMergePickerProps {
  contact: Contact;
  contacts: Contact[];
  onPick: (other: Contact) => void;
  onClose: () => void;
}

const REASON_LABEL: Record<DuplicateReason, string> = { email: 'Same email', phone: 'Same phone', name_company: 'Same name & company' };

/** Step 1 of "Merge with…": choose the contact to merge into this one (likely duplicates first). */
export const ContactMergePicker: React.FC<ContactMergePickerProps> = ({ contact, contacts, onPick, onClose }) => {
  const [query, setQuery] = useState('');
  useOverlayEscape(true, onClose);

  const likely = useMemo(() => {
    const group = findDuplicateGroups(contacts).find((g) => g.contacts.some((c) => c.id === contact.id));
    return group ? { others: group.contacts.filter((c) => c.id !== contact.id), reasons: group.reasons } : { others: [], reasons: [] as DuplicateReason[] };
  }, [contacts, contact.id]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return contacts
      .filter((c) => c.id !== contact.id && !c.deletedAt)
      .filter((c) => [c.name, c.email, c.company].some((v) => (v ?? '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [contacts, contact.id, query]);

  const row = (c: Contact, hint?: string) => (
    <li key={c.id}>
      <button
        type="button"
        onClick={() => onPick(c)}
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{[c.email, c.company].filter(Boolean).join(' • ')}</div>
        {hint && <div className="text-xs text-blue-700 dark:text-blue-300">{hint}</div>}
      </button>
    </li>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="contact-merge-picker-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <GitMerge className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 id="contact-merge-picker-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Merge with…</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{contact.name} stays as the primary record</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`${TOOLBAR_ICON_BTN} text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-4 h-4" />
          <input
            autoFocus
            type="text"
            placeholder="Search another contact..."
            aria-label="Search another contact"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-10 pr-4 text-sm w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {query.trim() ? (
            searchResults.length ? <ul>{searchResults.map((c) => row(c))}</ul>
              : <p className="py-6 text-center text-sm text-gray-600 dark:text-gray-400">No matching contacts</p>
          ) : likely.others.length ? (
            <>
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Likely duplicates</div>
              <ul>{likely.others.map((c) => row(c, likely.reasons.map((r) => REASON_LABEL[r]).join(', ')))}</ul>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-gray-600 dark:text-gray-400">No likely duplicates found. Search to pick any contact.</p>
          )}
        </div>
      </div>
    </div>
  );
};
