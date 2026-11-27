// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  classifyActivity, classifyJourneyEvent, countByKind, availableKinds, filterByKinds,
  toggleKind, pruneSelection, parseStoredKinds,
} from '../src/lib/timeline/filterEvents';
import { groupEventsByMonth } from '../src/lib/timeline/contactDiff';

describe('timeline filter', () => {
  it('classifies activities', () => {
    expect(classifyActivity('email_sent')).toBe('email');
    expect(classifyActivity('merged')).toBe('merge');
    expect(classifyActivity('enriched')).toBe('enrichment');
    expect(classifyActivity('custom_field_updated')).toBe('field_change');
    expect(classifyActivity('attachment_added')).toBe('file');
    expect(classifyActivity('something_new')).toBe('other');
  });

  it('classifies journey events by type then channel', () => {
    expect(classifyJourneyEvent({ type: 'file_upload' })).toBe('file');
    expect(classifyJourneyEvent({ type: 'interaction', metadata: { channel: 'Phone' } })).toBe('call');
    expect(classifyJourneyEvent({ type: 'interaction', metadata: { channel: 'email' } })).toBe('email');
    expect(classifyJourneyEvent({ type: 'interaction', title: 'Zoom demo' })).toBe('meeting');
    expect(classifyJourneyEvent({ type: 'interaction' })).toBe('other');
    expect(classifyJourneyEvent({ type: 'status_change', metadata: { channel: 'email' } })).toBe('status');
  });

  const items = [
    { k: 'email' as const }, { k: 'email' as const }, { k: 'call' as const }, { k: 'merge' as const },
  ];
  const get = (i: { k: any }) => i.k;

  it('counts and lists available kinds in display order', () => {
    const counts = countByKind(items, get);
    expect(counts).toEqual({ email: 2, call: 1, merge: 1 });
    expect(availableKinds(counts)).toEqual(['email', 'call', 'merge']);
  });

  it('empty selection is All; otherwise multi-select', () => {
    expect(filterByKinds(items, [], get)).toHaveLength(4);
    expect(filterByKinds(items, ['email'], get)).toHaveLength(2);
    expect(filterByKinds(items, ['email', 'merge'], get)).toHaveLength(3);
    expect(filterByKinds(items, ['note'], get)).toHaveLength(0);
  });

  it('toggles and prunes', () => {
    expect(toggleKind([], 'email')).toEqual(['email']);
    expect(toggleKind(['email', 'call'], 'email')).toEqual(['call']);
    expect(pruneSelection(['email', 'note'], { email: 3 })).toEqual(['email']);
  });

  it('parses stored selections defensively', () => {
    expect(parseStoredKinds(null)).toEqual([]);
    expect(parseStoredKinds('not json')).toEqual([]);
    expect(parseStoredKinds('{"a":1}')).toEqual([]);
    expect(parseStoredKinds('["email","bogus",3]')).toEqual(['email']);
  });

  it('keeps month grouping intact after filtering', () => {
    const ev = [
      { createdAt: '2026-11-02T10:00:00Z', k: 'email' },
      { createdAt: '2026-10-20T10:00:00Z', k: 'call' },
      { createdAt: '2026-10-05T10:00:00Z', k: 'email' },
    ];
    const filtered = filterByKinds(ev, ['email'], (e) => e.k as any);
    const groups = groupEventsByMonth(filtered);
    expect(groups.map((g) => [g.key, g.events.length])).toEqual([['2026-11', 1], ['2026-10', 1]]);
  });
});
