// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildCompanies, companyTimeline, findCompany, normalizeCompany, contactLastActivity } from '../src/lib/groups/companies';

const c = (o: any): any => ({ name: o.id, email: `${o.id}@x.io`, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o });

describe('normalizeCompany', () => {
  it('ignores case, punctuation, accents and legal suffixes', () => {
    expect(normalizeCompany('Acme, Inc.')).toBe('acme');
    expect(normalizeCompany('  ACME inc ')).toBe('acme');
    expect(normalizeCompany('Café Münch GmbH')).toBe('cafe munch');
    expect(normalizeCompany('Johnson & Johnson')).toBe('johnson and johnson');
  });
  it('returns empty for missing names and keeps suffix-only names', () => {
    expect(normalizeCompany(undefined)).toBe('');
    expect(normalizeCompany('   ')).toBe('');
    expect(normalizeCompany('Co')).toBe('co');
  });
});

describe('buildCompanies', () => {
  const contacts = [
    c({ id: '1', company: 'Acme Inc', aiScore: 80, lastConnected: '2026-03-01T00:00:00Z' }),
    c({ id: '2', company: 'acme', aiScore: 60, updatedAt: '2026-02-01T00:00:00Z' }),
    c({ id: '3', company: 'Acme Inc', aiScore: 0 }),
    c({ id: '4', company: 'Zed' }),
    c({ id: '5', company: '' }),
    c({ id: '6' }),
  ];

  it('groups by normalised name, drops people without a company, sorts by size', () => {
    const out = buildCompanies(contacts);
    expect(out.map((x) => [x.key, x.count])).toEqual([['acme', 3], ['zed', 1]]);
  });

  it('uses the most common spelling and averages only real scores', () => {
    const acme = buildCompanies(contacts)[0]!;
    expect(acme.name).toBe('Acme Inc');
    expect(acme.avgAiScore).toBe(70);
    expect(buildCompanies(contacts)[1]!.avgAiScore).toBeNull();
  });

  it('picks the latest activity', () => {
    expect(buildCompanies(contacts)[0]!.lastActivity).toBe('2026-03-01T00:00:00Z');
  });

  it('breaks size ties alphabetically', () => {
    const out = buildCompanies([c({ id: 'a', company: 'Beta' }), c({ id: 'b', company: 'alpha' })]);
    expect(out.map((x) => x.name)).toEqual(['alpha', 'Beta']);
  });

  it('handles an empty list', () => {
    expect(buildCompanies([])).toEqual([]);
  });

  it('attaches open deals of the people only', () => {
    const deals = [
      { id: 'd1', contact_id: '1', title: 'A', stage: 'proposal', value: '1000' },
      { id: 'd2', contact_id: '2', title: 'B', stage: 'closed_won', value: 500 },
      { id: 'd3', contact_id: '3', title: 'C', stage: 'negotiation', value: 250, closed_at: '2026-02-02' },
      { id: 'd4', contact_id: '4', title: 'D', stage: 'lead', value: 'oops' },
      { id: 'd5', contact_id: null, stage: 'lead', value: 1 },
    ];
    const out = buildCompanies(contacts, deals);
    expect(out[0]!.openDeals.map((d) => d.id)).toEqual(['d1']);
    expect(out[0]!.openDealValue).toBe(1000);
    expect(out[1]!.openDeals[0]).toMatchObject({ id: 'd4', value: 0 });
  });
});

describe('helpers', () => {
  it('findCompany matches loosely', () => {
    const list = buildCompanies([c({ id: '1', company: 'Acme Inc' })]);
    expect(findCompany(list, 'ACME')?.name).toBe('Acme Inc');
    expect(findCompany(list, '')).toBeUndefined();
  });
  it('contactLastActivity ignores invalid dates', () => {
    expect(contactLastActivity({ lastConnected: 'nope', updatedAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' })).toBe('2026-01-02T00:00:00Z');
  });
  it('companyTimeline is newest first and limited', () => {
    const [acme] = buildCompanies([
      c({ id: '1', company: 'Acme', lastConnected: '2026-03-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' }),
      c({ id: '2', company: 'Acme', createdAt: '2026-01-05T00:00:00Z', updatedAt: '2026-01-05T00:00:00Z' }),
    ]);
    const t = companyTimeline(acme!, 3);
    expect(t).toHaveLength(3);
    expect(t[0]).toMatchObject({ contactId: '1', kind: 'connected' });
    expect(t.map((e) => e.at)).toEqual([...t.map((e) => e.at)].sort().reverse());
  });
});
