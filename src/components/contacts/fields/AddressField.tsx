import React, { useEffect, useState } from 'react';
import { Edit, ExternalLink, MapPin } from 'lucide-react';
import { ModernButton } from '../../ui/ModernButton';
import {
  formatAddressLines, isEmptyAddress, mapsSearchUrl, normalizeAddress, validateAddress, MAX_ADDRESS_PART_LENGTH,
  type Address,
} from '../../../lib/fields/compositeFields';
import { errorClass, iconButtonClass, inputClass, labelClass, panelClass } from './fieldStyles';

interface AddressFieldProps {
  address: Address | undefined;
  /** Contact Info block is in edit mode. */
  editing: boolean;
  onChange: (next: Address) => Promise<void>;
}

/** Compact address block with an edit form. Renders nothing for a contact without one unless editing. */
export const AddressField: React.FC<AddressFieldProps> = ({ address, editing, onChange }) => {
  const current = normalizeAddress(address);
  const empty = isEmptyAddress(current);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Address>(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) setDraft(normalizeAddress(address)); }, [address, open]);

  if (empty && !editing && !open) return null;

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const close = () => { setOpen(false); setError(null); setDraft(current); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = normalizeAddress(draft);
    const problem = validateAddress(next);
    if (problem) { setError(problem); return; }
    setBusy(true);
    try { await onChange(next); setOpen(false); setError(null); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save'); } finally { setBusy(false); }
  };

  const lines = formatAddressLines(current);
  const maps = mapsSearchUrl(current);
  const part = { maxLength: MAX_ADDRESS_PART_LENGTH, className: inputClass } as const;

  return (
    <div className="group flex items-start justify-between" data-testid="address-row">
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPin className="w-3 h-3 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={labelClass}>Address</p>
          {!open && (empty ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Not provided</p>
          ) : (
            <>
              <address className="not-italic text-sm font-medium text-gray-900 dark:text-white leading-tight break-words" data-testid="address-text">
                {lines.map((l) => <span key={l} className="block">{l}</span>)}
              </address>
              {maps && (
                <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-300 hover:underline">
                  Open in maps <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </>
          ))}
          {open && (
            <form
              onSubmit={(e) => void submit(e)}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}
              className={panelClass}
              data-testid="address-form"
            >
              <input {...part} autoFocus value={draft.street ?? ''} onChange={set('street')} placeholder="Street" aria-label="Street" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input {...part} value={draft.city ?? ''} onChange={set('city')} placeholder="City" aria-label="City" />
                <input {...part} value={draft.state ?? ''} onChange={set('state')} placeholder="State" aria-label="State" />
                <input {...part} value={draft.postalCode ?? ''} onChange={set('postalCode')} placeholder="Postal code" aria-label="Postal code" />
                <input {...part} value={draft.country ?? ''} onChange={set('country')} placeholder="Country" aria-label="Country" />
              </div>
              {error && <p className={errorClass} role="alert">{error}</p>}
              <div className="flex gap-2 mt-2">
                <ModernButton type="submit" size="toolbar" variant="primary" disabled={busy}>Save</ModernButton>
                <ModernButton size="toolbar" variant="outline" onClick={close}>Cancel</ModernButton>
              </div>
            </form>
          )}
        </div>
      </div>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${iconButtonClass} ${editing ? 'inline-flex' : 'hidden group-hover:inline-flex focus:inline-flex'}`}
          title="Edit address"
          aria-label="Edit address"
        >
          <Edit className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
