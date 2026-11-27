import React, { useEffect, useState } from 'react';
import { ExternalLink, Link as LinkIcon, Plus, X } from 'lucide-react';
import { ModernButton } from '../../ui/ModernButton';
import {
  LINK_LABELS, addLink, normalizeUrl, removeLink, suggestLinkLabel, type LabeledLink,
} from '../../../lib/fields/compositeFields';
import { errorClass, iconButtonClass, inputClass, labelClass, linkClass, mutedLabelClass, panelClass, selectClass } from './fieldStyles';

interface LinksFieldProps {
  links: LabeledLink[] | undefined;
  /** Contact Info block is in edit mode. */
  editing: boolean;
  onChange: (next: LabeledLink[]) => Promise<void>;
}

const hostOf = (url: string) => {
  try { return new URL(url).host.replace(/^www\./, '') + (new URL(url).pathname.length > 1 ? new URL(url).pathname.replace(/\/$/, '') : ''); } catch { return url; }
};

/** Labelled web links (http/https only). Renders nothing for a contact with no links unless editing. */
export const LinksField: React.FC<LinksFieldProps> = ({ links, editing, onChange }) => {
  const list = links ?? [];
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState<string>(LINK_LABELS[0]);
  const [custom, setCustom] = useState('');
  const [labelTouched, setLabelTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing && !adding) setError(null);
  }, [editing, adding]);

  if (list.length === 0 && !editing && !adding) return null;

  const reset = () => { setAdding(false); setUrl(''); setLabel(LINK_LABELS[0]); setCustom(''); setLabelTouched(false); setError(null); };

  const save = async (next: LabeledLink[]): Promise<boolean> => {
    setBusy(true);
    try { await onChange(next); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); return false; } finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = label === 'Custom' ? custom.trim() : label;
    if (label === 'Custom' && !chosen) { setError('Enter a label for the link'); return; }
    const r = addLink(list, { label: chosen, url });
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    if (await save(r.value)) reset();
  };

  return (
    <div className="group flex items-start justify-between" data-testid="links-row">
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <LinkIcon className="w-3 h-3 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={labelClass}>Links</p>
          {list.length > 0 && (
            <ul className="space-y-1 mt-0.5">
              {list.map((l) => (
                <li key={l.url} className="flex items-center gap-1 min-w-0" data-testid="link-item">
                  <span className={mutedLabelClass}>{l.label}</span>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className={linkClass} title={l.url}>{hostOf(l.url)}</a>
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(removeLink(list, l.url))}
                    className={`${iconButtonClass} ${editing ? 'inline-flex' : 'hidden group-hover:inline-flex focus:inline-flex'}`}
                    title="Remove link"
                    aria-label={`Remove ${l.url}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {list.length === 0 && !adding && <p className="text-sm text-gray-500 dark:text-gray-400">No links</p>}

          {adding && (
            <form onSubmit={(e) => void submit(e)} className={panelClass} data-testid="add-link-form">
              <div className="flex gap-2 mb-2">
                <select
                  value={label}
                  onChange={(e) => { setLabel(e.target.value); setLabelTouched(true); }}
                  className={`${selectClass} w-24 flex-shrink-0`}
                  aria-label="Link label"
                >
                  {LINK_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {label === 'Custom' && (
                  <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Label" maxLength={40} className={`${inputClass} min-w-0`} aria-label="Custom link label" />
                )}
              </div>
              <input
                autoFocus
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (!labelTouched) {
                    const n = normalizeUrl(e.target.value);
                    if (n.ok) setLabel(suggestLinkLabel(n.value));
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); reset(); } }}
                placeholder="https://example.com"
                className={`${inputClass} mb-2`}
                aria-label="Link URL"
              />
              <div className="flex gap-2">
                <ModernButton type="submit" size="toolbar" variant="primary" disabled={busy || !url.trim()}>Add</ModernButton>
                <ModernButton size="toolbar" variant="outline" onClick={reset}>Cancel</ModernButton>
              </div>
            </form>
          )}
          {error && <p className={errorClass} role="alert">{error}</p>}
        </div>
      </div>
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${iconButtonClass} ${editing ? 'inline-flex' : 'hidden group-hover:inline-flex focus:inline-flex'}`}
          title="Add link"
          aria-label="Add link"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
