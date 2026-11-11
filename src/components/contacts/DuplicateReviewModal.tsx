import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import type { Contact } from '../../types/contact';
import type { DuplicateGroup, DuplicateReason } from '../../lib/merge/findDuplicates';
import { MAX_MERGE_RECORDS } from '../../lib/merge/mergeContacts';

const REASON_LABELS: Record<DuplicateReason, string> = {
  email: 'Same email',
  phone: 'Same phone',
  name_company: 'Same name & company',
};

const DISMISS_KEY = 'smartcrm.dismissedDuplicateGroups';

export const duplicateGroupKey = (g: DuplicateGroup) => g.contacts.map((c) => c.id).sort().join('|');

export function readDismissedDuplicateGroups(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

interface DuplicateReviewModalProps {
  groups: DuplicateGroup[];
  onClose: () => void;
  onMerge: (contacts: Contact[]) => void;
  onDismiss: (group: DuplicateGroup) => void;
}

export function DuplicateReviewModal({ groups, onClose, onMerge, onDismiss }: DuplicateReviewModalProps) {
  const [expanded, setExpanded] = useState<string | null>(groups[0] ? groups[0].id : null);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Copy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review duplicates</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {groups.length === 0 ? 'No likely duplicates found.' : `${groups.length} group${groups.length === 1 ? '' : 's'} of likely duplicates`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {groups.map((group) => {
            const open = expanded === group.id;
            const tooMany = group.contacts.length > MAX_MERGE_RECORDS;
            return (
              <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : group.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {group.contacts.map((c) => c.name).slice(0, 3).join(', ')}
                    {group.contacts.length > 3 ? ` +${group.contacts.length - 3}` : ''}
                  </span>
                  <span className="flex gap-1.5">
                    {group.reasons.map((r) => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {REASON_LABELS[r]}
                      </span>
                    ))}
                  </span>
                </button>
                {open && (
                  <div className="px-4 pb-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.contacts.map((c) => (
                        <div key={c.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm">
                          <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                          <p className="text-gray-600 dark:text-gray-400 truncate">{c.email || '—'}</p>
                          <p className="text-gray-600 dark:text-gray-400">{c.phone || '—'}</p>
                          <p className="text-gray-600 dark:text-gray-400">{[c.title, c.company].filter(Boolean).join(' · ') || '—'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <ModernButton variant="outline" size="sm" onClick={() => onDismiss(group)}>Not duplicates</ModernButton>
                      <ModernButton variant="primary" size="sm" disabled={tooMany} onClick={() => onMerge(group.contacts)}>
                        {tooMany ? `Too many to merge at once (max ${MAX_MERGE_RECORDS})` : 'Review & merge'}
                      </ModernButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
