// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: any = { contacts: [], updateContact: vi.fn(), deleteContact: vi.fn(), restoreContact: vi.fn() };
vi.mock('../src/hooks/useContactStore', () => ({ useContactStore: { getState: () => state } }));

import { bulkAddTagsWithUndo, bulkTrashWithUndo, bulkUpdateWithUndo } from '../src/hooks/useBulkActions';
import { currentUndo, resetUndo, runUndo } from '../src/lib/undo/undoStack';

beforeEach(() => {
  resetUndo();
  state.contacts = [
    { id: 'a', status: 'lead', tags: ['x'] },
    { id: 'b', status: 'active', tags: [] },
  ];
  state.updateContact = vi.fn().mockResolvedValue({});
  state.deleteContact = vi.fn().mockResolvedValue(undefined);
  state.restoreContact = vi.fn().mockResolvedValue(undefined);
});

describe('bulk actions offer Undo', () => {
  it('bulk update restores each contact\'s previous value', async () => {
    expect(await bulkUpdateWithUndo(['a', 'b'], { status: 'customer' })).toEqual({ ok: 2, failed: 0 });
    expect(currentUndo()?.label).toBe('Updated status on 2 contacts');
    state.updateContact.mockClear();
    await runUndo();
    expect(state.updateContact).toHaveBeenCalledWith('a', { status: 'lead' });
    expect(state.updateContact).toHaveBeenCalledWith('b', { status: 'active' });
  });
  it('only restores contacts that were saved', async () => {
    state.updateContact = vi.fn().mockImplementation((id: string) => (id === 'b' ? Promise.reject(new Error('x')) : Promise.resolve({})));
    expect(await bulkUpdateWithUndo(['a', 'b'], { status: 'customer' })).toEqual({ ok: 1, failed: 1 });
    state.updateContact.mockClear();
    await runUndo();
    expect(state.updateContact).toHaveBeenCalledTimes(1);
    expect(state.updateContact).toHaveBeenCalledWith('a', { status: 'lead' });
  });
  it('add tags restores the previous tag lists', async () => {
    await bulkAddTagsWithUndo(state.contacts, ['new']);
    expect(state.updateContact).toHaveBeenCalledWith('a', { tags: ['x', 'new'] });
    state.updateContact.mockClear();
    await runUndo();
    expect(state.updateContact).toHaveBeenCalledWith('a', { tags: ['x'] });
    expect(state.updateContact).toHaveBeenCalledWith('b', { tags: [] });
  });
  it('trash then undo restores the trashed contacts', async () => {
    state.deleteContact = vi.fn().mockImplementation((id: string) => (id === 'zz' ? Promise.reject(new Error('no')) : Promise.resolve()));
    expect(await bulkTrashWithUndo(['a', 'b', 'zz'])).toEqual({ ok: 2, failed: 1 });
    expect(currentUndo()?.label).toBe('Moved 2 contacts to Trash');
    await runUndo();
    expect(state.restoreContact.mock.calls.map((c: any[]) => c[0])).toEqual(['a', 'b']);
  });
  it('pushes no undo when nothing succeeded', async () => {
    state.deleteContact = vi.fn().mockRejectedValue(new Error('no'));
    await bulkTrashWithUndo(['a']);
    expect(currentUndo()).toBeNull();
  });
});
