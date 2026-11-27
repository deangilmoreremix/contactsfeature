// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readRecentContacts, recordRecentContact, recentContactsKey, normalizeRecents, RECENT_CONTACTS_LIMIT } from '../src/lib/records/recentContacts';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m };
};

describe('recentContacts', () => {
  it('records most recent first and dedupes by id', () => {
    const s = mem();
    recordRecentContact('u1', { id: 'a', name: 'A' }, 1, s);
    recordRecentContact('u1', { id: 'b', name: 'B' }, 2, s);
    const list = recordRecentContact('u1', { id: 'a', name: 'A2' }, 3, s);
    expect(list.map((r) => r.id)).toEqual(['a', 'b']);
    expect(list[0]!.name).toBe('A2');
    expect(readRecentContacts('u1', s)).toEqual(list);
  });
  it('keeps only the last 10', () => {
    const s = mem();
    for (let i = 0; i < 15; i++) recordRecentContact('u', { id: `c${i}`, name: `C${i}` }, i, s);
    const list = readRecentContacts('u', s);
    expect(list).toHaveLength(RECENT_CONTACTS_LIMIT);
    expect(list[0]!.id).toBe('c14');
    expect(list.at(-1)!.id).toBe('c5');
  });
  it('is per user', () => {
    const s = mem();
    recordRecentContact('u1', { id: 'a', name: 'A' }, 1, s);
    expect(readRecentContacts('u2', s)).toEqual([]);
    expect(recentContactsKey(undefined)).toContain('anon');
  });
  it('survives corrupt and throwing storage', () => {
    const s = mem();
    s.m.set(recentContactsKey('u'), '{not json');
    expect(readRecentContacts('u', s)).toEqual([]);
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('y'); } };
    expect(readRecentContacts('u', bad)).toEqual([]);
    expect(recordRecentContact('u', { id: 'a', name: 'A' }, 1, bad).map((r) => r.id)).toEqual(['a']);
    expect(readRecentContacts('u', null)).toEqual([]);
    expect(normalizeRecents([null, 5, { id: '' }, { id: 'x', name: 3, at: 'z' }])).toEqual([{ id: 'x', name: '', at: 0 }]);
  });
});

import { buildContactCommands, filterCommands } from '../src/lib/commands/contactCommands';
describe('palette recent section', () => {
  const base = { isDeleted: false, isFavorite: false, canPrev: false, canNext: false, tabs: [] };
  it('adds Recent commands only when provided and exposes vCard/ics exports', () => {
    expect(buildContactCommands(base).some((c) => c.section === 'Recent')).toBe(false);
    const cmds = buildContactCommands({ ...base, recent: [{ id: 'x1', name: 'Grace Hopper', company: 'Navy' }] });
    expect(cmds.find((c) => c.id === 'recent:x1')!.section).toBe('Recent');
    expect(filterCommands(cmds, 'grace').map((c) => c.id)).toContain('recent:x1');
    expect(cmds.map((c) => c.id)).toEqual(expect.arrayContaining(['export-vcard', 'export-ics']));
  });
});
