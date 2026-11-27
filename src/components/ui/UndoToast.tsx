import React, { useEffect, useState } from 'react';
import { currentUndo, dismissUndo, runUndo, subscribeUndo, UndoEntry } from '../../lib/undo/undoStack';

const VISIBLE_MS = 6000;

/** Single snackbar for the undo stack; same pill styling as the contact detail status toast. */
export const UndoToast: React.FC = () => {
  const [entry, setEntry] = useState<UndoEntry | null>(currentUndo());
  const [failed, setFailed] = useState(false);

  useEffect(() => subscribeUndo((e) => { setEntry(e); setFailed(false); }), []);

  useEffect(() => {
    if (!entry) return;
    const t = setTimeout(() => dismissUndo(entry.id), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [entry]);

  if (!entry) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="undo-toast"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[85] h-10 pl-4 pr-1 inline-flex items-center gap-3 rounded-lg text-sm font-medium shadow-lg ${
        failed ? 'bg-red-600 text-white' : 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
      }`}
    >
      <span>{failed ? 'Could not undo' : entry.label}</span>
      {!failed && (
        <button
          type="button"
          data-testid="undo-button"
          onClick={() => { void runUndo(entry.id).catch(() => setFailed(true)); }}
          className="h-8 px-3 rounded-md text-sm font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Undo
        </button>
      )}
    </div>
  );
};
