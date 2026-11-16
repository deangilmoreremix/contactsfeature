import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useContactStore } from '../../hooks/useContactStore';
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  onCustomFieldsChanged,
  reorderCustomFields,
  updateCustomField,
  type CustomFieldDef,
} from '../../services/customFieldService';
import { FIELD_TYPES, type CustomFieldType } from '../../lib/fields/fieldTypeRegistry';
import {
  OPTION_COLORS,
  addOption,
  moveDefinition,
  moveOption,
  pruneRemovedOption,
  removeOption,
  renameCustomFieldKey,
  updateOption,
  validateFieldLabel,
  validateOptions,
  withColors,
  type EditableOption,
} from '../../lib/fields/fieldDefinitionEdit';

const controlClass =
  'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';
const primaryBtn = 'inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50';
const ghostBtn = 'inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg';
const dangerBtn = 'inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap bg-red-600 text-white rounded-lg hover:bg-red-700';
const iconBtn = 'p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed';

const hasOptions = (t: CustomFieldType) => FIELD_TYPES.find((x) => x.type === t)?.hasOptions === true;

/** Option editor for one select / multi-select field (label, colour, order, add, remove). */
function OptionsEditor({ def, onDone }: { def: CustomFieldDef; onDone: () => void }) {
  const contacts = useContactStore((s) => s.contacts);
  const updateContact = useContactStore((s) => s.updateContact);
  const [options, setOptions] = useState<EditableOption[]>(() => withColors(def.options));
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errors = validateOptions(options);

  const save = async () => {
    if (Object.keys(errors).length) return;
    setBusy(true);
    setError(null);
    try {
      const removed = def.options.filter((o) => !options.some((n) => n.value === o.value)).map((o) => o.value);
      await updateCustomField(def, { options });
      // Contacts that used a removed option lose that value.
      for (const value of removed) {
        for (const c of contacts) {
          const current = c.customFields?.[def.label];
          const next = pruneRemovedOption(current, value);
          if (next !== current) await updateContact(c.id, { customFields: { ...(c.customFields ?? {}), [def.label]: next as never } });
        }
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the options');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2" data-testid="options-editor">
      <ul className="space-y-2">
        {options.map((o, i) => (
          <li key={o.value} className="flex items-center gap-2">
            <select
              aria-label={`Colour for ${o.label || o.value}`}
              value={o.color}
              onChange={(e) => setOptions((prev) => updateOption(prev, o.value, { color: e.target.value }))}
              className={`${controlClass} w-28`}
              style={{ borderLeft: `6px solid ${o.color}` }}
            >
              {OPTION_COLORS.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
            <input
              className={`${controlClass} flex-1 min-w-0`}
              aria-label={`Option ${i + 1} label`}
              value={o.label}
              onChange={(e) => setOptions((prev) => updateOption(prev, o.value, { label: e.target.value }))}
            />
            <button type="button" className={iconBtn} disabled={i === 0} aria-label={`Move option ${o.label} up`} onClick={() => setOptions((p) => moveOption(p, o.value, -1))}><ArrowUp className="w-4 h-4" /></button>
            <button type="button" className={iconBtn} disabled={i === options.length - 1} aria-label={`Move option ${o.label} down`} onClick={() => setOptions((p) => moveOption(p, o.value, 1))}><ArrowDown className="w-4 h-4" /></button>
            <button type="button" className={`${iconBtn} hover:!text-red-600`} aria-label={`Remove option ${o.label}`} onClick={() => setOptions((p) => removeOption(p, o.value))}><X className="w-4 h-4" /></button>
            {errors[o.value] && <span className="text-xs text-red-600 dark:text-red-400">{errors[o.value]}</span>}
          </li>
        ))}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); if (newLabel.trim()) { setOptions((p) => addOption(p, newLabel)); setNewLabel(''); } }}
      >
        <input className={`${controlClass} flex-1 min-w-0`} placeholder="New option" aria-label="New option label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <button type="submit" disabled={!newLabel.trim()} className={ghostBtn}><Plus className="w-4 h-4 mr-1" /> Add option</button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={primaryBtn} disabled={busy || Object.keys(errors).length > 0} onClick={() => void save()}>Save options</button>
        <button type="button" className={ghostBtn} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

/**
 * Settings panel to add, rename, reorder and delete custom field definitions and to edit the options
 * (label + colour) of select fields. Standalone: mount it anywhere inside Settings.
 */
export function CustomFieldManager() {
  const contacts = useContactStore((s) => s.contacts);
  const updateContact = useContactStore((s) => s.updateContact);
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomFieldType>('text');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [editingOptions, setEditingOptions] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setDefs(await listCustomFields());
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    return onCustomFieldsChanged(() => { void reload(); });
  }, [reload]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
  };

  const move = (id: string, delta: number) =>
    run(async () => {
      const next = moveDefinition(defs, id, delta);
      setDefs(next);
      await reorderCustomFields(next);
    });

  const rename = (def: CustomFieldDef) =>
    run(async () => {
      const label = renameText.trim();
      if (label === def.label) { setRenaming(null); return; }
      const problem = validateFieldLabel(label, defs, def.id);
      if (problem) throw new Error(problem);
      await updateCustomField(def, { label });
      // Values are stored on contacts by field name, so move them to the new name.
      for (const c of contacts) {
        const next = renameCustomFieldKey(c.customFields as Record<string, unknown> | undefined, def.label, label);
        if (next) await updateContact(c.id, { customFields: next as never });
      }
      setRenaming(null);
    });

  const remove = (def: CustomFieldDef) =>
    run(async () => {
      await deleteCustomField(def);
      setConfirmDelete(null);
    });

  const create = () =>
    run(async () => {
      const problem = validateFieldLabel(newLabel, defs);
      if (problem) throw new Error(problem);
      await createCustomField({ label: newLabel, fieldType: newType, options: [] });
      setNewLabel(''); setNewType('text'); setAdding(false);
    });

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Custom fields</h4>
        <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium whitespace-nowrap shrink-0 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add field
        </button>
      </div>

      {adding && (
        <form className="flex flex-wrap items-center gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <input className={controlClass} placeholder="Field name" aria-label="New field name" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <select className={controlClass} aria-label="New field type" value={newType} onChange={(e) => setNewType(e.target.value as CustomFieldType)}>
            {FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
          <button type="submit" disabled={!newLabel.trim()} className={primaryBtn}>Create</button>
        </form>
      )}

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : defs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No custom fields yet. Add one to track extra details on every contact.</p>
      ) : (
        <ul data-testid="custom-field-list">
          {defs.map((def, i) => (
            <li key={def.id} className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0" data-testid="custom-field-row">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {renaming === def.id ? (
                    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void rename(def); }}>
                      <input className={`${controlClass} flex-1 min-w-0`} aria-label={`Rename ${def.label}`} value={renameText} onChange={(e) => setRenameText(e.target.value)} autoFocus />
                      <button type="submit" className={primaryBtn}>Save</button>
                      <button type="button" className={ghostBtn} onClick={() => { setRenaming(null); setError(null); }}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{def.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{FIELD_TYPES.find((t) => t.type === def.fieldType)?.label ?? def.fieldType}</p>
                    </>
                  )}
                </div>
                {renaming !== def.id && confirmDelete !== def.id && (
                  <span className="flex items-center gap-1">
                    <button type="button" className={iconBtn} disabled={i === 0} aria-label={`Move ${def.label} up`} onClick={() => void move(def.id, -1)}><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" className={iconBtn} disabled={i === defs.length - 1} aria-label={`Move ${def.label} down`} onClick={() => void move(def.id, 1)}><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" className={`${iconBtn} hover:!text-blue-600`} aria-label={`Rename ${def.label}`} onClick={() => { setRenaming(def.id); setRenameText(def.label); setError(null); }}><Pencil className="w-4 h-4" /></button>
                    <button type="button" className={`${iconBtn} hover:!text-red-600`} aria-label={`Delete field ${def.label}`} onClick={() => setConfirmDelete(def.id)}><Trash2 className="w-4 h-4" /></button>
                  </span>
                )}
              </div>

              {hasOptions(def.fieldType) && renaming !== def.id && (
                editingOptions === def.id ? (
                  <OptionsEditor def={def} onDone={() => setEditingOptions(null)} />
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {def.options.map((o) => (
                      <span key={o.value} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color ?? '#6B7280' }} />
                        {o.label}
                      </span>
                    ))}
                    <button type="button" onClick={() => setEditingOptions(def.id)} className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline">
                      {def.options.length ? 'Edit options' : 'Add options'}
                    </button>
                  </div>
                )
              )}

              {confirmDelete === def.id && (
                <div role="alertdialog" aria-label={`Delete ${def.label}`} className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Delete “{def.label}”? The field disappears from every contact and from filters, views and imports.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button type="button" className={dangerBtn} onClick={() => void remove(def)}>Delete field</button>
                    <button type="button" className={ghostBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
