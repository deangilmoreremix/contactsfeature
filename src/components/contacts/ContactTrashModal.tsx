import React, { useEffect, useState } from 'react';
import { ArchiveRestore, RotateCcw, Trash2, X } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import { TOOLBAR_ICON_BTN } from './toolbarStyles';
import { DestroyContactDialog } from './ContactDeleteDialogs';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';
import { useContactStore } from '../../hooks/useContactStore';
import type { Contact } from '../../types/contact';

interface ContactTrashModalProps {
  onClose: () => void;
  /** Open a deleted contact in the detail view (read-only; it can be restored from there). */
  onOpen?: (contact: Contact) => void;
}

const formatDeleted = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** Deleted contacts: restore, or delete permanently (typed confirmation). */
export const ContactTrashModal: React.FC<ContactTrashModalProps> = ({ onClose, onOpen }) => {
  const trashed = useContactStore((s) => s.trashedContacts);
  const loadTrash = useContactStore((s) => s.loadTrash);
  const restoreContact = useContactStore((s) => s.restoreContact);
  const destroyContact = useContactStore((s) => s.destroyContact);
  const [destroyTarget, setDestroyTarget] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useOverlayEscape(!destroyTarget, onClose);
  useEffect(() => { void loadTrash(); }, [loadTrash]);

  const restore = async (c: Contact) => {
    setBusyId(c.id);
    setError(null);
    try { await restoreContact(c.id); } catch (e) { setError(e instanceof Error ? e.message : 'Could not restore the contact'); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div role="dialog" aria-modal="true" aria-labelledby="contact-trash-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ArchiveRestore className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 id="contact-trash-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deleted Contacts</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{trashed.length} in Trash</p>
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

          {error && <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

          {trashed.length === 0 ? (
            <p className="py-10 text-center text-gray-600 dark:text-gray-400">Trash is empty</p>
          ) : (
            <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
              {trashed.map((c) => (
                <li key={c.id} data-testid="trash-row" className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => onOpen?.(c)}
                    disabled={!onOpen}
                    className="min-w-0 text-left flex-1 basis-48"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name || `${c.firstName} ${c.lastName}`}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {[c.email, c.company].filter(Boolean).join(' • ')}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Deleted {formatDeleted(c.deletedAt)}</div>
                  </button>
                  <div className="flex items-center gap-2">
                    <ModernButton size="toolbar" variant="outline" onClick={() => void restore(c)} disabled={busyId === c.id}>
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore</span>
                    </ModernButton>
                    <ModernButton
                      size="toolbar"
                      variant="outline"
                      onClick={() => setDestroyTarget(c)}
                      className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-800/40"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete permanently</span>
                    </ModernButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {destroyTarget && (
        <DestroyContactDialog
          name={destroyTarget.name || destroyTarget.email}
          onClose={() => setDestroyTarget(null)}
          onConfirm={async () => {
            try { await destroyContact(destroyTarget.id); setDestroyTarget(null); }
            catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the contact'); setDestroyTarget(null); }
          }}
        />
      )}
    </>
  );
};
