import { createContactCollection, type BaseRecord } from '../lib/records/contactRecords';

export type TaskType = 'todo' | 'call' | 'email' | 'meeting' | 'note';

export interface ContactTask extends BaseRecord {
  title: string;
  description?: string | null;
  taskType: TaskType;
  status: 'open' | 'done';
  dueAt: string | null;
  completedAt: string | null;
}

export const contactTasks = createContactCollection<ContactTask>({
  table: 'contact_tasks',
  localKey: 'smartcrm.contact_tasks',
  fromRow: (r) => ({
    id: r['id'],
    contactId: r['contact_id'],
    title: r['title'],
    description: r['description'] ?? null,
    taskType: r['task_type'],
    status: r['status'],
    dueAt: r['due_at'] ?? null,
    completedAt: r['completed_at'] ?? null,
    createdAt: r['created_at'],
    updatedAt: r['updated_at'],
  }),
  toRow: (t) => ({
    ...(t.title !== undefined ? { title: t.title } : {}),
    ...(t.description !== undefined ? { description: t.description } : {}),
    ...(t.taskType !== undefined ? { task_type: t.taskType } : {}),
    ...(t.status !== undefined ? { status: t.status } : {}),
    ...(t.dueAt !== undefined ? { due_at: t.dueAt } : {}),
    ...(t.completedAt !== undefined ? { completed_at: t.completedAt } : {}),
  }),
});

export interface ContactNote extends BaseRecord {
  body: string;
  pinned: boolean;
}

export const contactNotes = createContactCollection<ContactNote>({
  table: 'contact_notes',
  localKey: 'smartcrm.contact_notes',
  fromRow: (r) => ({
    id: r['id'],
    contactId: r['contact_id'],
    body: r['body'],
    pinned: !!r['pinned'],
    createdAt: r['created_at'],
    updatedAt: r['updated_at'],
  }),
  toRow: (n) => ({
    ...(n.body !== undefined ? { body: n.body } : {}),
    ...(n.pinned !== undefined ? { pinned: n.pinned } : {}),
  }),
});
