import { useState } from 'react';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useContactNotes } from '../../../hooks/useContactActivity';
import type { ContactNote } from '../../../services/contactTasksService';

const controlClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

export function NotesSection({ contactId }: { contactId: string }) {
  const { notes, error, add, update, remove } = useContactNotes(contactId);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = (note: ContactNote) =>
    run(async () => {
      if (editText.trim() && editText.trim() !== note.body) await update(note, { body: editText.trim() });
      setEditingId(null);
    });

  return (
    <GlassCard className="p-5">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notes</h4>

      <form
        className="space-y-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          void run(async () => {
            await add(draft);
            setDraft('');
          });
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Write a note…"
          aria-label="New note"
          className={controlClass}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Add note
        </button>
      </form>

      {(error || actionError) && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{actionError ?? error}</p>}

      {notes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className={controlClass} aria-label="Edit note" autoFocus />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => saveEdit(note)} className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap cursor-text"
                    onDoubleClick={() => { setEditingId(note.id); setEditText(note.body); }}
                    title="Double-click to edit"
                  >
                    {note.body}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(note.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => run(() => update(note, { pinned: !note.pinned }))}
                        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                        className={`p-1 ${note.pinned ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                      >
                        {note.pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => run(() => remove(note))}
                        aria-label="Delete note"
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
