// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { groupContacts, getGroupableFields, NO_VALUE_KEY } from '../src/lib/groups/groupContacts';
import { buildContactFilterFields } from '../src/lib/filters/contactFilterFields';

const fields = buildContactFilterFields([{ id: 'r', label: 'Region', fieldType: 'select', options: ['EU', 'US'] }]);
const by = (name: string) => fields.find((f) => f.name === name)!;
const c = (o: any): any => ({ id: o.id, name: o.id, ...o });

describe('groupContacts', () => {
  const contacts = [
    c({ id: '1', status: 'lead', company: 'Acme', tags: ['vip', 'saas'] }),
    c({ id: '2', status: 'customer', company: 'acme ', tags: ['saas'] }),
    c({ id: '3', status: 'lead', company: '', tags: [] }),
    c({ id: '4', status: 'prospect', company: 'Zed', customFields: { Region: 'EU' } }),
  ];

  it('orders select groups by option order and keeps input order inside groups', () => {
    const g = groupContacts(contacts, by('status'));
    expect(g.map((x) => x.key)).toEqual(['lead', 'prospect', 'customer']);
    expect(g[0]!.contacts.map((x) => x.id)).toEqual(['1', '3']);
    expect(g[0]!.label).toBe('Lead');
  });

  it('puts empty values in a trailing "No value" group', () => {
    const g = groupContacts(contacts, by('company'));
    expect(g.at(-1)!.key).toBe(NO_VALUE_KEY);
    expect(g.at(-1)!.label).toBe('No value');
  });

  it('multi-select contacts appear in every tag group', () => {
    const g = groupContacts(contacts, by('tags'));
    const saas = g.find((x) => x.key === 'saas')!;
    expect(saas.contacts.map((x) => x.id)).toEqual(['1', '2']);
    expect(g.find((x) => x.key === 'vip')!.contacts).toHaveLength(1);
  });

  it('groups by select custom fields and only offers sensible fields', () => {
    const g = groupContacts(contacts, fields.find((f) => f.source === 'custom')!);
    expect(g.find((x) => x.key === 'EU')!.contacts.map((x) => x.id)).toEqual(['4']);
    const names = getGroupableFields(fields).map((f) => f.name);
    expect(names).toContain('status');
    expect(names).toContain('custom:r');
    expect(names).not.toContain('email');
    expect(names).not.toContain('aiScore');
  });
});
