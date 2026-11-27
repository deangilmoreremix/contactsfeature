import { useCallback, useEffect, useState } from 'react';
import { contactNotes, contactTasks, type ContactNote, type ContactTask, type TaskType } from '../services/contactTasksService';
import { logger } from '../services/logger.service';

const sortTasks = (a: ContactTask, b: ContactTask) => {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
  return ad - bd || a.createdAt.localeCompare(b.createdAt);
};

export function useContactTasks(contactId: string) {
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTasks((await contactTasks.list(contactId)).sort(sortTasks));
    } catch (e) {
      logger.error('Failed to load tasks', e instanceof Error ? e : new Error(String(e)));
      setError(e instanceof Error ? e.message : 'Could not load tasks');
    }
  }, [contactId]);

  useEffect(() => { void load(); }, [load]);

  const add = async (input: { title: string; taskType: TaskType; dueAt: string | null }) => {
    const created = await contactTasks.create(contactId, {
      title: input.title.trim(),
      description: null,
      taskType: input.taskType,
      status: 'open',
      dueAt: input.dueAt,
      completedAt: null,
    });
    setTasks((prev) => [...prev, created].sort(sortTasks));
  };

  const toggle = async (task: ContactTask) => {
    const done = task.status !== 'done';
    const updated = await contactTasks.update(task, { status: done ? 'done' : 'open', completedAt: done ? new Date().toISOString() : null });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)).sort(sortTasks));
  };

  const remove = async (task: ContactTask) => {
    await contactTasks.remove(task);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  return { tasks, error, add, toggle, remove, reload: load };
}

export function useContactNotes(contactId: string) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sortNotes = (list: ContactNote[]) =>
    [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

  const load = useCallback(async () => {
    try {
      setError(null);
      setNotes(sortNotes(await contactNotes.list(contactId)));
    } catch (e) {
      logger.error('Failed to load notes', e instanceof Error ? e : new Error(String(e)));
      setError(e instanceof Error ? e.message : 'Could not load notes');
    }
  }, [contactId]);

  useEffect(() => { void load(); }, [load]);

  const add = async (body: string) => {
    const created = await contactNotes.create(contactId, { body: body.trim(), pinned: false });
    setNotes((prev) => sortNotes([...prev, created]));
  };
  const update = async (note: ContactNote, patch: Partial<Pick<ContactNote, 'body' | 'pinned'>>) => {
    const updated = await contactNotes.update(note, patch);
    setNotes((prev) => sortNotes(prev.map((n) => (n.id === note.id ? updated : n))));
  };
  const remove = async (note: ContactNote) => {
    await contactNotes.remove(note);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  return { notes, error, add, update, remove, reload: load };
}

/** All tasks across contacts (calendar). */
export function useAllContactTasks() {
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  useEffect(() => {
    let alive = true;
    void contactTasks.listAll().then((t) => { if (alive) setTasks(t); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return { tasks, setTasks };
}
