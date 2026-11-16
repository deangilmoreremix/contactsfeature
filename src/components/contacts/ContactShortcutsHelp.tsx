import React, { useEffect, useRef } from 'react';
import { Keyboard } from 'lucide-react';
import { CONTACT_SHORTCUT_LIST } from '../../lib/commands/contactShortcuts';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';

interface ContactShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export const ContactShortcutsHelp: React.FC<ContactShortcutsHelpProps> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useOverlayEscape(open, onClose);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="contact-shortcuts-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 id="contact-shortcuts-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        </div>
        <ul className="mb-4 divide-y divide-gray-200 dark:divide-gray-700">
          {CONTACT_SHORTCUT_LIST.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              <span>{s.label}</span>
              <span className="flex items-center gap-1 shrink-0">
                {s.keys.map((k, i) => (
                  <kbd key={`${k}-${i}`} className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200">{k}</kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">Single-key shortcuts are ignored while you type in a field.</p>
        <div className="flex">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex-1 h-10 px-4 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
