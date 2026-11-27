import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useContactStore } from '../../../hooks/useContactStore';
import { createCustomField, deleteCustomField, listCustomFields, onCustomFieldsChanged, type CustomFieldDef } from '../../../services/customFieldService';
import {
  coerceFieldValue,
  FIELD_TYPES,
  formatFieldValue,
  isEmptyFieldValue,
  validateFieldValue,
  type CustomFieldType,
} from '../../../lib/fields/fieldTypeRegistry';
import type { Contact } from '../../../types/contact';

const controlClass =
  'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

type Stored = Record<string, unknown>;

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: CustomFieldDef;
  value: unknown;
  onChange: (raw: string | string[] | boolean | null) => void;
}) {
  const t = def.fieldType;
  if (t === 'boolean') {
    return (
      <select className={controlClass} value={value === true ? 'true' : value === false ? 'false' : ''} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}>
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (t === 'select') {
    return (
      <select className={controlClass} value={String(value ?? '')} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">—</option>
        {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (t === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {def.options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                on
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  if (t === 'rating') {
    const n = Number(value) || 0;
    return (
      <div className="flex gap-1" role="radiogroup" aria-label={def.label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => onChange(i === n ? null : String(i))} aria-label={`${i} stars`} className={`text-lg ${i <= n ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}>
            ★
          </button>
        ))}
      </div>
    );
  }
  const inputType = t === 'date' ? 'date' : t === 'datetime' ? 'datetime-local' : t === 'number' || t === 'currency' ? 'number' : t === 'email' ? 'email' : t === 'url' ? 'url' : t === 'phone' ? 'tel' : 'text';
  const display = t === 'datetime' && value ? String(value).slice(0, 16) : t === 'date' && value ? String(value).slice(0, 10) : String(value ?? '');
  return (
    <input
      type={inputType}
      className={controlClass}
      value={display}
      onChange={(e) => onChange(e.target.value)}
      aria-label={def.label}
    />
  );
}

export function CustomFieldsSection({ contact: contactProp }: { contact: Contact }) {
  const updateContact = useContactStore((s) => s.updateContact);
  // The detail view holds a snapshot; read the live copy so saved values show immediately.
  const contact = useContactStore((s) => s.contacts.find((c) => c.id === contactProp.id)) ?? contactProp;
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | string[] | boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomFieldType>('text');
  const [newOptions, setNewOptions] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => void listCustomFields().then((d) => { if (alive) setDefs(d); });
    load();
    const off = onCustomFieldsChanged(load);
    return () => { alive = false; off(); };
  }, []);

  const values = (contact.customFields ?? {}) as Stored;

  const save = async (def: CustomFieldDef, raw: string | string[] | boolean | null) => {
    const value = coerceFieldValue(def.fieldType, raw);
    const problem = validateFieldValue(def.fieldType, value);
    if (problem) { setError(problem); return; }
    setError(null);
    const next: Stored = { ...values };
    if (value === null) delete next[def.label];
    else next[def.label] = value;
    try {
      await updateContact(contact.id, { customFields: next } as never);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    }
  };

  const hasOptions = FIELD_TYPES.find((t) => t.type === newType)?.hasOptions;

  return (
    <GlassCard className="p-5 md:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Custom fields</h4>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium whitespace-nowrap shrink-0 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add field
        </button>
      </div>

      {adding && (
        <form
          className="flex flex-wrap items-center gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              try {
                await createCustomField({
                  label: newLabel,
                  fieldType: newType,
                  options: hasOptions ? newOptions.split(',').map((o) => o.trim()).filter(Boolean) : [],
                });
                setNewLabel(''); setNewOptions(''); setNewType('text'); setAdding(false); setError(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not create the field');
              }
            })();
          }}
        >
          <input className={controlClass} placeholder="Field name" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} aria-label="New field name" />
          <select className={controlClass} value={newType} onChange={(e) => setNewType(e.target.value as CustomFieldType)} aria-label="New field type">
            {FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
          {hasOptions && <input className={controlClass} placeholder="Options, comma separated" value={newOptions} onChange={(e) => setNewOptions(e.target.value)} aria-label="Field options" />}
          <button type="submit" disabled={!newLabel.trim()} className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Create</button>
        </form>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}

      {defs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No custom fields yet. Add one (for example “Region” or “Renewal date”) to track extra details on every contact.
        </p>
      ) : (
        <ul>
          {defs.map((def) => {
            const stored = values[def.label];
            const isEditing = editing === def.id;
            return (
              <li key={def.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <span className="w-40 flex-shrink-0 text-sm text-gray-600 dark:text-gray-400 pt-2">{def.label}</span>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => { e.preventDefault(); void save(def, draft); }}
                    >
                      <FieldInput def={def} value={draft} onChange={setDraft} />
                      <button type="submit" className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                      <button type="button" onClick={() => { setEditing(null); setError(null); }} className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                    </form>
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-gray-100 pt-2 break-words">
                      {isEmptyFieldValue(stored) ? <span className="text-gray-400 dark:text-gray-500">—</span> : formatFieldValue(def.fieldType, stored, def.settings)}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <span className="flex items-center gap-1 pt-1.5">
                    <button type="button" onClick={() => { setEditing(def.id); setDraft((stored as never) ?? null); setError(null); }} aria-label={`Edit ${def.label}`} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => void deleteCustomField(def)} aria-label={`Delete field ${def.label}`} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
