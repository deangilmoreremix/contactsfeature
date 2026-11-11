import { useMemo, useState } from 'react';
import { Check, GitMerge, X } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import type { Contact } from '../../types/contact';
import { isEmptyValue, mergeContactRecords } from '../../lib/merge/mergeContacts';
import { mergeContacts } from '../../services/contactMergeService';

interface MergeContactsModalProps {
  contacts: Contact[];
  onClose: () => void;
  onMerged: () => void;
}

const FIELDS: Array<{ key: keyof Contact; label: string }> = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'title', label: 'Title' },
  { key: 'company', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'status', label: 'Status' },
  { key: 'interestLevel', label: 'Interest' },
  { key: 'aiScore', label: 'AI score' },
  { key: 'tags', label: 'Tags' },
  { key: 'sources', label: 'Sources' },
  { key: 'notes', label: 'Notes' },
];

const show = (v: unknown): string => {
  if (isEmptyValue(v)) return '—';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
};

/** Completeness score: contact with the most filled fields is the default record to keep. */
const completeness = (c: Contact) => FIELDS.filter((f) => !isEmptyValue(c[f.key])).length;

export function MergeContactsModal({ contacts, onClose, onMerged }: MergeContactsModalProps) {
  const [winnerId, setWinnerId] = useState(
    () => [...contacts].sort((a, b) => completeness(b) - completeness(a))[0]!.id
  );
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(
    () => [contacts.find((c) => c.id === winnerId)!, ...contacts.filter((c) => c.id !== winnerId)],
    [contacts, winnerId]
  );
  const preview = useMemo(() => mergeContactRecords(ordered, overrides), [ordered, overrides]);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await mergeContacts({ contacts, winnerId, overrides });
      onMerged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed');
      setBusy(false);
    }
  };

  const mergedRecord = preview.merged as unknown as Record<string, unknown>;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <GitMerge className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Merge {contacts.length} contacts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose the contact to keep, then click a value to use it instead.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 w-28" />
                {contacts.map((c) => (
                  <th key={c.id} className="p-2 text-left align-bottom">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white font-semibold">
                      <input
                        type="radio"
                        name="merge-winner"
                        checked={winnerId === c.id}
                        onChange={() => { setWinnerId(c.id); setOverrides({}); }}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{c.name}</span>
                      {winnerId === c.id && <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Keep</span>}
                    </label>
                  </th>
                ))}
                <th className="p-2 text-left text-gray-900 dark:text-white font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(({ key, label }) => {
                const source = preview.sources[key as string];
                const conflict = preview.conflicts.includes(key as string);
                return (
                  <tr key={key as string} className="border-t border-gray-200 dark:border-gray-700 align-top">
                    <td className="p-2 text-gray-600 dark:text-gray-400">
                      {label}
                      {conflict && <span className="ml-1 text-orange-500" title="Records disagree">•</span>}
                    </td>
                    {contacts.map((c) => {
                      const chosen = source === c.id;
                      return (
                        <td key={c.id} className="p-1">
                          <button
                            type="button"
                            onClick={() => setOverrides((o) => ({ ...o, [key as string]: c.id }))}
                            className={`w-full text-left px-2 py-1.5 rounded-md border transition-colors ${
                              chosen
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className="line-clamp-2 break-words">{show(c[key])}</span>
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-2 text-gray-900 dark:text-white font-medium">
                      <span className="line-clamp-2 break-words">{show(mergedRecord[key as string])}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Tags and sources are combined and notes are joined. Activity, files, deals and custom fields of the other contacts are moved to the kept contact.
            The other {contacts.length - 1} contact(s) are removed.
          </p>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <ModernButton size="toolbar" variant="outline" onClick={onClose} disabled={busy}>Cancel</ModernButton>
          <ModernButton size="toolbar" variant="primary" onClick={run} loading={busy} disabled={busy}>
            <Check className="w-4 h-4" />
            Merge {contacts.length} contacts
          </ModernButton>
        </div>
      </div>
    </div>
  );
}
