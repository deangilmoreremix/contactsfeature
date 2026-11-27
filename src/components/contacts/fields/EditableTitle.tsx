import React, { useEffect, useRef, useState } from 'react';
import { validateTitle } from '../../../lib/fields/compositeFields';

interface EditableTitleProps {
  value: string;
  /** Persist the new (trimmed, validated) title. Rejecting keeps the editor open with the error. */
  onSave: (next: string) => Promise<void> | void;
  /** Same classes as the static heading it replaces. */
  className?: string;
}

/** Click-to-edit record title: Enter saves, Esc cancels, blur saves. Non-empty, max 200 characters. */
export const EditableTitle: React.FC<EditableTitleProps> = ({ value, onSave, className = '' }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const finished = useRef(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const start = () => { finished.current = false; setDraft(value); setError(null); setEditing(true); };
  const cancel = () => { finished.current = true; setEditing(false); setError(null); setDraft(value); };

  const commit = async () => {
    if (finished.current) return;
    const r = validateTitle(draft);
    if (!r.ok) { setError(r.error); return; }
    finished.current = true;
    if (r.value === value.trim()) { setEditing(false); setError(null); return; }
    try {
      await onSave(r.value);
      setEditing(false);
      setError(null);
    } catch (e) {
      finished.current = false;
      setError(e instanceof Error ? e.message : 'Could not save the name');
    }
  };

  if (!editing) {
    return (
      <h3
        className={`${className} cursor-text rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        role="button"
        tabIndex={0}
        title="Click to edit name"
        onClick={start}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } }}
        data-testid="editable-title"
      >
        {value}
      </h3>
    );
  }

  return (
    <div className="mb-2">
      <input
        autoFocus
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(null); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
        }}
        onBlur={() => void commit()}
        aria-label="Contact name"
        aria-invalid={error ? true : undefined}
        className="w-full text-xl font-bold text-center leading-tight text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="editable-title-input"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">{error}</p>}
    </div>
  );
};
