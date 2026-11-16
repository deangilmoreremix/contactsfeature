import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Edit, Star, X } from 'lucide-react';
import { ModernButton } from '../../ui/ModernButton';
import type { LabeledValue } from '../../../lib/fields/compositeFields';
import { errorClass, iconButtonClass, inputClass, linkClass, mutedLabelClass, panelClass, selectClass } from './fieldStyles';

/** Returns an error message to show, or null when the change was accepted and saved. */
export type FieldResult = Promise<string | null>;

interface ValueListViewProps {
  kind: 'email' | 'phone';
  entries: LabeledValue[];
  labels: readonly string[];
  defaultLabel: string;
  /** Contact Info block is in edit mode: row actions are always visible. */
  editing: boolean;
  adding: boolean;
  onCancelAdd: () => void;
  hrefFor: (value: string) => string;
  onAdd: (entry: LabeledValue) => FieldResult;
  onRemove: (value: string) => FieldResult;
  onMakePrimary: (value: string) => FieldResult;
  onEdit: (oldValue: string, newValue: string) => FieldResult;
  onLabel: (value: string, label: string) => FieldResult;
}

const noun = (kind: 'email' | 'phone') => (kind === 'email' ? 'email' : 'phone');

/**
 * Shared view for extra emails / phones. It renders only the extra entries (the primary value keeps
 * its original row), so a contact without extras renders nothing here.
 */
export const ValueListView: React.FC<ValueListViewProps> = ({
  kind, entries, labels, defaultLabel, editing, adding, onCancelAdd, hrefFor, onAdd, onRemove, onMakePrimary, onEdit, onLabel,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [newLabel, setNewLabel] = useState(defaultLabel);
  const [newValue, setNewValue] = useState('');
  const [busy, setBusy] = useState(false);
  const skipBlur = useRef(false);

  useEffect(() => {
    if (!adding) { setNewValue(''); setNewLabel(defaultLabel); }
  }, [adding, defaultLabel]);
  useEffect(() => {
    if (!copied) return undefined;
    const t = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  const run = async (fn: () => FieldResult): Promise<boolean> => {
    setBusy(true);
    try {
      const problem = await fn();
      setError(problem);
      return problem === null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setError('Could not copy to the clipboard');
    }
  };

  const commitEdit = async () => {
    if (editingValue === null) return;
    const old = editingValue;
    if (editDraft.trim() === old) { setEditingValue(null); setError(null); return; }
    if (await run(() => onEdit(old, editDraft))) setEditingValue(null);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (await run(() => onAdd({ label: newLabel, value: newValue }))) onCancelAdd();
  };

  const revealed = editing ? 'inline-flex' : 'hidden group-hover/extra:inline-flex group-focus-within/extra:inline-flex';

  return (
    <>
      {entries.length > 0 && (
        <ul className="mt-1 space-y-1" data-testid={`extra-${kind}-list`}>
          {entries.map((entry) => (
            <li key={entry.value} className="group/extra flex items-center gap-1 min-w-0" data-testid={`extra-${kind}-row`}>
              {editing ? (
                <select
                  value={labels.includes(entry.label) ? entry.label : '__custom'}
                  onChange={(e) => void run(() => onLabel(entry.value, e.target.value))}
                  className={`${selectClass} text-xs py-0.5 px-1 w-20 flex-shrink-0`}
                  aria-label={`Label for ${entry.value}`}
                >
                  {!labels.includes(entry.label) && <option value="__custom" disabled>{entry.label}</option>}
                  {labels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              ) : (
                <span className={mutedLabelClass}>{entry.label}</span>
              )}
              {editingValue === entry.value ? (
                <input
                  autoFocus
                  type={kind === 'email' ? 'email' : 'tel'}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); skipBlur.current = true; void commitEdit(); }
                    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); skipBlur.current = true; setEditingValue(null); setError(null); }
                  }}
                  onBlur={() => { if (skipBlur.current) { skipBlur.current = false; return; } void commitEdit(); }}
                  className={`${inputClass} min-w-0`}
                  aria-label={`Edit ${noun(kind)}`}
                />
              ) : (
                <a href={hrefFor(entry.value)} className={linkClass} title={entry.value}>{entry.value}</a>
              )}
              <button
                type="button"
                onClick={() => void copy(entry.value)}
                className={iconButtonClass}
                title={`Copy ${noun(kind)}`}
                aria-label={`Copy ${entry.value}`}
              >
                {copied === entry.value ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => { setEditingValue(entry.value); setEditDraft(entry.value); setError(null); }}
                className={`${iconButtonClass} ${revealed}`}
                title={`Edit ${noun(kind)}`}
                aria-label={`Edit ${entry.value}`}
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => onMakePrimary(entry.value))}
                className={`${iconButtonClass} ${revealed}`}
                title="Make primary"
                aria-label={`Make ${entry.value} primary`}
              >
                <Star className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => onRemove(entry.value))}
                className={`${iconButtonClass} ${revealed}`}
                title="Remove"
                aria-label={`Remove ${entry.value}`}
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form noValidate onSubmit={(e) => void submitAdd(e)} className={panelClass} data-testid={`add-${kind}-form`}>
          <div className="flex gap-2 mb-2">
            <select value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className={`${selectClass} w-24 flex-shrink-0`} aria-label={`${noun(kind)} label`}>
              {labels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input
              autoFocus
              type={kind === 'email' ? 'email' : 'tel'}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancelAdd(); } }}
              placeholder={kind === 'email' ? 'name@example.com' : '+1 555 0123'}
              className={`${inputClass} min-w-0`}
              aria-label={`New ${noun(kind)}`}
            />
          </div>
          <div className="flex gap-2">
            <ModernButton type="submit" size="toolbar" variant="primary" disabled={busy || !newValue.trim()}>Add</ModernButton>
            <ModernButton size="toolbar" variant="outline" onClick={onCancelAdd}>Cancel</ModernButton>
          </div>
        </form>
      )}

      {error && <p className={errorClass} role="alert">{error}</p>}
    </>
  );
};
