// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { classifyDiff, computeContactDiff, describeDiff, groupEventsByMonth } from '../src/lib/timeline/contactDiff';

const c = (o: any): any => ({ id: '1', name: 'Ada', createdAt: 'x', updatedAt: 'y', ...o });

describe('contact diff', () => {
  it('lists changed fields with before/after and ignores bookkeeping', () => {
    const d = computeContactDiff(c({ company: 'Acme', tags: ['a'], updatedAt: '1', nextSendDate: '2026-01-01' }), c({ company: 'Globex', tags: ['a'], updatedAt: '2', nextSendDate: '2026-02-01' }));
    expect(d).toEqual({ company: { before: 'Acme', after: 'Globex' } });
  });

  it('treats empty string/null/undefined as the same', () => {
    expect(computeContactDiff(c({ phone: '' }), c({ phone: undefined }))).toEqual({});
    expect(computeContactDiff(c({}), c({ phone: '555' }))).toEqual({ phone: { before: null, after: '555' } });
  });

  it('classifies and describes', () => {
    expect(classifyDiff({ status: { before: 'lead', after: 'customer' } })).toBe('status_changed');
    expect(classifyDiff({ aiScore: { before: 1, after: 2 } })).toBe('score_calculated');
    expect(classifyDiff({ title: { before: null, after: 'CTO' }, company: { before: 'a', after: 'b' } })).toBe('updated');
    expect(describeDiff({ status: { before: 'lead', after: 'customer' } })).toBe('Status: lead → customer');
    expect(describeDiff({ a: { before: 1, after: 2 }, b: { before: 1, after: 2 }, c: { before: 1, after: 2 }, d: { before: 1, after: 2 } })).toBe('Updated A, B, C and 1 more');
  });

  it('groups events by month, newest first', () => {
    const g = groupEventsByMonth([
      { createdAt: '2026-10-05T10:00:00Z', n: 1 },
      { createdAt: '2026-11-20T10:00:00Z', n: 2 },
      { createdAt: '2026-11-02T10:00:00Z', n: 3 },
    ]);
    expect(g.map((x) => x.key)).toEqual(['2026-11', '2026-10']);
    expect(g[0]!.events.map((e) => e.n)).toEqual([2, 3]);
    expect(g[0]!.label).toBe('November 2026');
  });
});
