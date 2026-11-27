// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildContactCommands, filterCommands, type ContactCommandContext } from '../src/lib/commands/contactCommands';
import { resolveContactShortcut, isTypingTarget } from '../src/lib/commands/contactShortcuts';
import { adjacentContactId, recordPosition } from '../src/lib/contacts/recordNavigation';
import { parseContactLink, buildContactLink, withContactParams } from '../src/lib/contacts/deepLink';
import { buildDuplicateContact, copyEmail } from '../src/lib/contacts/duplicateContact';
import { LOCKED_TAB_IDS, defaultTabLayout, normalizeTabLayout, resolveVisibleTabs, tabLayoutReducer } from '../src/lib/tabs/tabLayout';
import {
  softDeleteInState, restoreInState, destroyInState, excludeDeleted, applyContactRealtime, normalizeContactRow,
} from '../src/lib/contacts/softDelete';
import { contactExportContent, contactExportFilename } from '../src/lib/contacts/exportContact';
import { findDuplicateGroups } from '../src/lib/merge/findDuplicates';
import type { Contact } from '../src/types/contact';

const mk = (over: Partial<Contact> = {}): Contact => ({
  id: 'a', firstName: 'Jane', lastName: 'Doe', name: 'Jane Doe', email: 'jane@x.com', title: 'CEO', company: 'Acme',
  sources: ['Email'], interestLevel: 'hot', status: 'lead', tags: ['vip'], customFields: { plan: 'pro' },
  isFavorite: true, aiScore: 80, createdAt: '2024-01-01', updatedAt: '2024-01-02', ...over,
} as Contact);

const ctx = (over: Partial<ContactCommandContext> = {}): ContactCommandContext => ({
  isDeleted: false, isFavorite: false, canPrev: true, canNext: true,
  tabs: [{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }, { id: 'emails', label: 'Emails' }],
  activeTab: 'overview', ...over,
});

describe('command registry', () => {
  it('lists record actions and a "Go to" command per non-active tab', () => {
    const ids = buildContactCommands(ctx()).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['edit', 'favorite', 'duplicate', 'merge', 'delete', 'export-csv', 'export-json', 'copy-link', 'prev', 'next', 'tab:activity', 'tab:emails']));
    expect(ids).not.toContain('tab:overview');
    expect(ids).not.toContain('restore');
  });
  it('offers restore / delete permanently (not delete, edit, duplicate) for deleted records', () => {
    const ids = buildContactCommands(ctx({ isDeleted: true })).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['restore', 'destroy']));
    expect(ids).not.toContain('delete');
    expect(ids).not.toContain('edit');
    expect(ids).not.toContain('duplicate');
  });
  it('hides prev/next at the ends and flips the favorite label', () => {
    const cmds = buildContactCommands(ctx({ canPrev: false, canNext: false, isFavorite: true }));
    expect(cmds.find((c) => c.id === 'prev')).toBeUndefined();
    expect(cmds.find((c) => c.id === 'next')).toBeUndefined();
    expect(cmds.find((c) => c.id === 'favorite')!.title).toBe('Remove from favorites');
  });
  it('ranks title prefix above keyword matches and drops non-matches', () => {
    const cmds = buildContactCommands(ctx());
    const r = filterCommands(cmds, 'exp');
    expect(r.slice(0, 2).map((c) => c.id)).toEqual(['export-csv', 'export-json']);
    expect(filterCommands(cmds, 'zzzz')).toEqual([]);
    // keyword match ("trash" is a keyword of delete)
    expect(filterCommands(cmds, 'trash').map((c) => c.id)).toContain('delete');
    // multiple tokens must all match
    expect(filterCommands(cmds, 'go emails').map((c) => c.id)).toEqual(['tab:emails']);
    expect(filterCommands(cmds, '  ').length).toBe(cmds.length);
  });
});

describe('shortcuts', () => {
  const key = (k: string, extra = {}) => ({ key: k, ...extra });
  it('maps keys', () => {
    expect(resolveContactShortcut(key('k', { ctrlKey: true }), null)).toEqual({ type: 'palette' });
    expect(resolveContactShortcut(key('K', { metaKey: true }), null)).toEqual({ type: 'palette' });
    expect(resolveContactShortcut(key('j'), null)).toEqual({ type: 'next' });
    expect(resolveContactShortcut(key('k'), null)).toEqual({ type: 'prev' });
    expect(resolveContactShortcut(key('e'), null)).toEqual({ type: 'edit' });
    expect(resolveContactShortcut(key('f'), null)).toEqual({ type: 'favorite' });
    expect(resolveContactShortcut(key('3'), null)).toEqual({ type: 'tab', index: 2 });
    expect(resolveContactShortcut(key('?', { shiftKey: true }), null)).toEqual({ type: 'help' });
    expect(resolveContactShortcut(key('0'), null)).toBeNull();
    expect(resolveContactShortcut(key('j', { ctrlKey: true }), null)).toBeNull();
  });
  it('does not fire single keys while typing but still allows Ctrl+K', () => {
    const input = { tagName: 'INPUT', type: 'text' };
    expect(resolveContactShortcut(key('j'), input)).toBeNull();
    expect(resolveContactShortcut(key('?', { shiftKey: true }), input)).toBeNull();
    expect(resolveContactShortcut(key('k', { ctrlKey: true }), input)).toEqual({ type: 'palette' });
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false);
  });
});

describe('record navigation', () => {
  const ids = ['a', 'b', 'c'];
  it('walks the list without wrapping', () => {
    expect(adjacentContactId(ids, 'b', 'next')).toBe('c');
    expect(adjacentContactId(ids, 'b', 'prev')).toBe('a');
    expect(adjacentContactId(ids, 'a', 'prev')).toBeNull();
    expect(adjacentContactId(ids, 'c', 'next')).toBeNull();
    expect(adjacentContactId(ids, 'zzz', 'next')).toBeNull();
    expect(adjacentContactId([], 'a', 'next')).toBeNull();
  });
  it('reports the position', () => {
    expect(recordPosition(ids, 'b')).toEqual({ index: 2, total: 3 });
    expect(recordPosition(ids, 'x')).toBeNull();
  });
});

describe('deep link', () => {
  it('parses contact and tab', () => {
    expect(parseContactLink('?contact=abc&tab=activity')).toEqual({ contactId: 'abc', tab: 'activity' });
    expect(parseContactLink('?contact=abc')).toEqual({ contactId: 'abc', tab: null });
    expect(parseContactLink('?tab=activity')).toEqual({ contactId: null, tab: null });
    expect(parseContactLink('')).toEqual({ contactId: null, tab: null });
  });
  it('builds the shareable link', () => {
    expect(buildContactLink({ origin: 'https://app.test', pathname: '/crm' }, 'a b', 'journey')).toBe('https://app.test/crm?contact=a%20b&tab=journey');
    expect(buildContactLink({ origin: 'https://app.test', pathname: '/' }, 'x')).toBe('https://app.test/?contact=x');
  });
  it('round-trips and keeps unrelated params', () => {
    const search = withContactParams('?foo=1', 'id-1', 'email');
    expect(search).toBe('?foo=1&contact=id-1&tab=email');
    expect(parseContactLink(search)).toEqual({ contactId: 'id-1', tab: 'email' });
    expect(withContactParams(search, null)).toBe('?foo=1');
    expect(withContactParams('?contact=a&tab=b', null)).toBe('');
  });
});

describe('duplicate contact', () => {
  it('copies tags / custom fields but not identity, history or favorite state', () => {
    const src = mk({ activityLog: [{ id: 'x' } as any], position: 3, deletedAt: null });
    const copy = buildDuplicateContact(src) as any;
    expect(copy.name).toBe('Jane Doe (copy)');
    expect(copy.lastName).toBe('Doe (copy)');
    expect(copy.firstName).toBe('Jane');
    expect(copy.tags).toEqual(['vip']);
    expect(copy.tags).not.toBe(src.tags);
    expect(copy.customFields).toEqual({ plan: 'pro' });
    expect(copy.id).toBeUndefined();
    expect(copy.createdAt).toBeUndefined();
    expect(copy.updatedAt).toBeUndefined();
    expect(copy.activityLog).toBeUndefined();
    expect(copy.position).toBeUndefined();
    expect(copy.aiScore).toBeUndefined();
    expect(copy.isFavorite).toBe(false);
    expect(copy.company).toBe('Acme');
  });
  it('gives the copy a unique email', () => {
    expect(copyEmail('jane@x.com')).toBe('jane+copy@x.com');
    expect(copyEmail('jane@x.com', ['JANE+copy@x.com'])).toBe('jane+copy2@x.com');
    expect(copyEmail('')).toBe('');
    expect(copyEmail('nomail')).toBe('nomail');
  });
});

describe('tab layout reducer', () => {
  const ids = ['overview', 'journey', 'analytics', 'activity'];
  it('hides and shows optional tabs but never locked ones', () => {
    let l = defaultTabLayout(ids);
    l = tabLayoutReducer(l, { type: 'toggle', id: 'journey' }, ids);
    expect(l.hidden).toEqual(['journey']);
    l = tabLayoutReducer(l, { type: 'toggle', id: 'overview' }, ids);
    l = tabLayoutReducer(l, { type: 'toggle', id: 'activity' }, ids);
    expect(l.hidden).toEqual(['journey']);
    expect(LOCKED_TAB_IDS).toEqual(expect.arrayContaining(['overview', 'activity']));
    l = tabLayoutReducer(l, { type: 'toggle', id: 'journey' }, ids);
    expect(l.hidden).toEqual([]);
  });
  it('moves tabs within bounds and resets', () => {
    let l = defaultTabLayout(ids);
    l = tabLayoutReducer(l, { type: 'move', id: 'analytics', direction: -1 }, ids);
    expect(l.order).toEqual(['overview', 'analytics', 'journey', 'activity']);
    expect(tabLayoutReducer(l, { type: 'move', id: 'overview', direction: -1 }, ids)).toEqual(l);
    expect(tabLayoutReducer(l, { type: 'move', id: 'activity', direction: 1 }, ids)).toEqual(l);
    expect(tabLayoutReducer(l, { type: 'reset' }, ids)).toEqual(defaultTabLayout(ids));
  });
  it('normalizes stale saved layouts (unknown ids dropped, new tabs appended, locked tabs shown)', () => {
    const n = normalizeTabLayout({ order: ['gone', 'journey', 'overview'], hidden: ['gone', 'activity', 'analytics'] }, ids);
    expect(n.order).toEqual(['journey', 'overview', 'analytics', 'activity']);
    expect(n.hidden).toEqual(['analytics']);
  });
  it('resolves visible tabs in order', () => {
    const tabs = ids.map((id) => ({ id }));
    const l = tabLayoutReducer(tabLayoutReducer(defaultTabLayout(ids), { type: 'toggle', id: 'journey' }, ids), { type: 'move', id: 'analytics', direction: -1 }, ids);
    expect(resolveVisibleTabs(tabs, l).map((t) => t.id)).toEqual(['overview', 'analytics', 'activity']);
  });
});

describe('soft delete reducers', () => {
  const state = () => ({ contacts: [mk({ id: '1' }), mk({ id: '2', email: 'b@x.com' })], trashed: [] as Contact[] });
  it('moves to trash, restores, and destroys', () => {
    const t = softDeleteInState(state(), '1', '2025-01-01T00:00:00Z');
    expect(t.contacts.map((c) => c.id)).toEqual(['2']);
    expect(t.trashed[0]).toMatchObject({ id: '1', deletedAt: '2025-01-01T00:00:00Z' });
    const r = restoreInState(t, '1');
    expect(r.trashed).toEqual([]);
    expect(r.contacts.map((c) => c.id)).toEqual(['1', '2']);
    expect(r.contacts[0]!.deletedAt).toBeNull();
    const d = destroyInState(t, '1');
    expect(d.trashed).toEqual([]);
    expect(d.contacts.map((c) => c.id)).toEqual(['2']);
  });
  it('ignores unknown ids', () => {
    const s = state();
    expect(softDeleteInState(s, 'nope', 'x')).toBe(s);
    expect(restoreInState(s, 'nope')).toBe(s);
  });
  it('excludes deleted rows and normalizes snake_case rows', () => {
    expect(excludeDeleted([mk({ id: '1', deletedAt: 'x' }), mk({ id: '2' })]).map((c) => c.id)).toEqual(['2']);
    expect(normalizeContactRow({ id: '1', deleted_at: 'z' })).toEqual({ id: '1', deletedAt: 'z' });
    expect(normalizeContactRow({ id: '1' })).toEqual({ id: '1' });
  });
  it('routes realtime rows by deleted_at', () => {
    const s = state();
    const deleted = applyContactRealtime(s, 'UPDATE', { id: '1', deleted_at: 't' } as any, null);
    expect(deleted.contacts.map((c) => c.id)).toEqual(['2']);
    expect(deleted.trashed[0]).toMatchObject({ id: '1', deletedAt: 't', name: 'Jane Doe' });
    const back = applyContactRealtime(deleted, 'UPDATE', { id: '1', deleted_at: null } as any, null);
    expect(back.trashed).toEqual([]);
    expect(back.contacts.map((c) => c.id)).toContain('1');
    const inserted = applyContactRealtime(s, 'INSERT', mk({ id: '3' }), null);
    expect(inserted.contacts[0]!.id).toBe('3');
    expect(applyContactRealtime(deleted, 'DELETE', null, { id: '1' }).trashed).toEqual([]);
    const patched = applyContactRealtime(s, 'UPDATE', { id: '2', title: 'CTO' }, null);
    expect(patched.contacts.find((c) => c.id === '2')!.title).toBe('CTO');
  });
  it('deleted contacts are not offered as duplicates', () => {
    const a = mk({ id: '1' });
    const b = mk({ id: '2', deletedAt: 'x' });
    expect(findDuplicateGroups([a, b])).toEqual([]);
    expect(findDuplicateGroups([a, mk({ id: '3' })]).length).toBe(1);
  });
});

describe('export record', () => {
  it('builds csv (injection-safe) and json', () => {
    const c = mk({ name: '=cmd|calc', email: 'a@x.com' });
    const csv = contactExportContent(c, 'csv');
    expect(csv.mime).toContain('text/csv');
    const dataLine = csv.content.split('\n')[1]!;
    expect(dataLine).not.toMatch(/(^|,)=cmd/);
    expect(JSON.parse(contactExportContent(c, 'json').content).id).toBe('a');
    expect(contactExportFilename(mk(), 'csv')).toBe('jane-doe.csv');
  });
});
