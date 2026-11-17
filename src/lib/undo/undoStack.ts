/**
 * Undo stack for reversible record actions (delete to Trash, restore, inline edits, bulk updates).
 * Pure module-level store so any component can push an entry and the single <UndoToast/> shows it.
 * Inspired by Twenty's "Undo" snackbar (AGPL) - reimplemented.
 */
export interface UndoEntry {
  id: number;
  /** Message shown in the toast, e.g. "Moved Ann Lee to Trash". */
  label: string;
  /** Reverses the action. May be async; a rejection is reported to the caller of runUndo. */
  undo: () => void | Promise<void>;
  createdAt: number;
}

type Listener = (current: UndoEntry | null) => void;

const MAX_ENTRIES = 20;
let entries: UndoEntry[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  const current = entries[entries.length - 1] ?? null;
  listeners.forEach((l) => l(current));
}

/** Records an undoable action; the newest entry is the one the toast offers. */
export function pushUndo(label: string, undo: UndoEntry['undo'], now: number = Date.now()): UndoEntry {
  const entry: UndoEntry = { id: ++seq, label, undo, createdAt: now };
  entries = [...entries, entry].slice(-MAX_ENTRIES);
  emit();
  return entry;
}

export function currentUndo(): UndoEntry | null {
  return entries[entries.length - 1] ?? null;
}

/** Removes an entry without running it (toast timed out or was dismissed). */
export function dismissUndo(id: number): void {
  const next = entries.filter((e) => e.id !== id);
  if (next.length !== entries.length) { entries = next; emit(); }
}

/** Runs and removes the newest entry (or a specific one). Returns false if nothing to undo. */
export async function runUndo(id?: number): Promise<boolean> {
  const entry = id === undefined ? currentUndo() : entries.find((e) => e.id === id) ?? null;
  if (!entry) return false;
  entries = entries.filter((e) => e.id !== entry.id);
  emit();
  await entry.undo();
  return true;
}

export function subscribeUndo(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentUndo());
  return () => { listeners.delete(listener); };
}

/** Test helper. */
export function resetUndo(): void { entries = []; seq = 0; listeners.clear(); }
