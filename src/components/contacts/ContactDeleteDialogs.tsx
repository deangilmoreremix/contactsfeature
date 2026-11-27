import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';

const RED_BTN = 'flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700';

interface DialogShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const DialogShell: React.FC<DialogShellProps> = ({ title, onClose, children }) => {
  useOverlayEscape(true, onClose);
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
};

/** Soft delete confirmation: the contact moves to Trash and can be restored. */
export const DeleteContactDialog: React.FC<{ name: string; onConfirm: () => Promise<void> | void; onClose: () => void }> = ({ name, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); }, []);
  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <DialogShell title="Delete Contact" onClose={onClose}>
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        <strong>{name}</strong> will be moved to Trash. You can restore it any time from <em>Deleted</em> in the contacts toolbar.
      </p>
      <div className="flex space-x-3">
        <button
          ref={cancelRef}
          type="button"
          onClick={onClose}
          disabled={busy}
          className="flex-1 h-10 px-4 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          Cancel
        </button>
        <ModernButton size="toolbar" variant="primary" onClick={confirm} disabled={busy} className={RED_BTN}>
          {busy ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>) : 'Delete'}
        </ModernButton>
      </div>
    </DialogShell>
  );
};

/** Permanent delete: requires typing DELETE (same pattern as the Clear Data modal). */
export const DestroyContactDialog: React.FC<{ name: string; onConfirm: () => Promise<void> | void; onClose: () => void }> = ({ name, onConfirm, onClose }) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const confirm = async () => {
    if (typed !== 'DELETE') return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <DialogShell title="Delete Permanently" onClose={onClose}>
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        This will permanently delete <strong>{name}</strong>. This cannot be undone.
      </p>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-red-700 dark:text-red-300">DELETE</span> to confirm:
        </label>
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void confirm(); }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Type DELETE to confirm"
          disabled={busy}
        />
      </div>
      <div className="flex space-x-3">
        <ModernButton size="toolbar" variant="outline" onClick={onClose} disabled={busy} className="flex-1">Cancel</ModernButton>
        <ModernButton size="toolbar" variant="primary" onClick={confirm} disabled={typed !== 'DELETE' || busy} className={RED_BTN}>
          {busy ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>) : 'Delete Permanently'}
        </ModernButton>
      </div>
    </DialogShell>
  );
};
