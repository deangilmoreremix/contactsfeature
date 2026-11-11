// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { contactTasks, contactNotes } from '../src/services/contactTasksService';

beforeEach(() => localStorage.clear());

describe('local contact records (demo/offline contacts)', () => {
  it('creates, lists, updates and removes tasks scoped to a contact', async () => {
    const t = await contactTasks.create('demo-1', { title: 'Call back', description: null, taskType: 'call', status: 'open', dueAt: '2026-12-01T10:00:00.000Z', completedAt: null });
    await contactTasks.create('demo-2', { title: 'Other', description: null, taskType: 'todo', status: 'open', dueAt: null, completedAt: null });
    expect((await contactTasks.list('demo-1')).map((x) => x.title)).toEqual(['Call back']);
    const done = await contactTasks.update(t, { status: 'done', completedAt: 'now' });
    expect(done.status).toBe('done');
    expect((await contactTasks.list('demo-1'))[0]!.status).toBe('done');
    await contactTasks.remove(t);
    expect(await contactTasks.list('demo-1')).toEqual([]);
    expect(await contactTasks.list('demo-2')).toHaveLength(1);
  });

  it('notes keep body and pinned state', async () => {
    const n = await contactNotes.create('demo-1', { body: 'Met at expo', pinned: false });
    const pinned = await contactNotes.update(n, { pinned: true });
    expect(pinned.pinned).toBe(true);
    expect((await contactNotes.list('demo-1'))[0]!.body).toBe('Met at expo');
  });
});
