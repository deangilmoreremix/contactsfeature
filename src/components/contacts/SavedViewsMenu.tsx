import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useContactViews } from '../../hooks/useContactViews';
import { useContactViewStore } from '../../store/contactViewStore';
import { ContactViewSnapshot, snapshotKey } from '../../lib/views/contactViewSnapshot';

interface SavedViewsMenuProps {
  /** Current configuration of the Contacts screen. */
  snapshot: ContactViewSnapshot;
  /** Apply a saved configuration to the Contacts screen. */
  onApply: (snapshot: ContactViewSnapshot) => void;
}

/** Dropdown for saving / applying personal Contacts views. Styled like the other filter-bar buttons. */
export function SavedViewsMenu({ snapshot, onApply }: SavedViewsMenuProps) {
  const { views, create, update, remove, error } = useContactViews();
  const activeId = useContactViewStore((s) => s.activePresetId);
  const setActiveId = useContactViewStore((s) => s.setActivePresetId);
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const active = views.find((v) => v.id === activeId) ?? null;
  const currentKey = useMemo(() => snapshotKey(snapshot), [snapshot]);
  const dirty = !!active && snapshotKey(active.snapshot) !== currentKey;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Saved views"
      >
        <Bookmark className="w-4 h-4" />
        <span>{active ? active.name : 'Views'}</span>
        {dirty && <span className="w-2 h-2 rounded-full bg-orange-500" title="Unsaved changes" />}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
          {views.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {error ? 'Sign in to use saved views.' : 'No saved views yet.'}
            </p>
          )}
          {views.map((v) => (
            <div
              key={v.id}
              className={`group flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg ${
                v.id === activeId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <button
                className="flex-1 text-left truncate"
                onClick={() => { setActiveId(v.id); onApply(v.snapshot); setOpen(false); }}
              >
                {v.name}
              </button>
              <button
                aria-label={`Delete view ${v.name}`}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => run(async () => { await remove(v.id); if (v.id === activeId) setActiveId(null); })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
            {dirty && active && (
              <button
                disabled={busy}
                onClick={() => run(async () => { await update(active.id, snapshot); setMessage('View updated'); })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <Check className="w-4 h-4" /> Update “{active.name}”
              </button>
            )}
            {naming ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = name.trim();
                  if (!trimmed) return;
                  void run(async () => {
                    const saved = await create(trimmed, snapshot);
                    setActiveId(saved.id);
                    setNaming(false);
                    setName('');
                    setOpen(false);
                  });
                }}
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="View name"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button type="submit" disabled={busy || !name.trim()} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  Save
                </button>
              </form>
            ) : (
              <button
                onClick={() => setNaming(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <Plus className="w-4 h-4" /> Save current view
              </button>
            )}
            {active && (
              <button
                onClick={() => { setActiveId(null); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Detach from “{active.name}”
              </button>
            )}
            {message && <p className="px-3 text-xs text-gray-600 dark:text-gray-400">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
