// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { filterContacts, toIsoDate } from '../src/lib/filters/filterContacts';
import { buildContactFilterFields } from '../src/lib/filters/contactFilterFields';
import { ViewFilterOperand } from '../src/vendor/twenty-shared/types/ViewFilterOperand';
import { RecordFilterGroupLogicalOperator } from '../src/vendor/twenty-shared/types/RecordFilterGroupLogicalOperator';

const mk = (o: Record<string, unknown>): any => ({
  id: String(o['id']), name: String(o['name']), email: '', company: '', title: '', status: 'lead',
  interestLevel: 'low', tags: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', ...o,
});

const contacts = [
  mk({ id: '1', name: 'Ada Lovelace', company: 'Acme', status: 'customer', interestLevel: 'hot', aiScore: 90, tags: ['vip', 'saas'], lastConnected: '2024-05-01' }),
  mk({ id: '2', name: 'Bob Stone', company: 'Globex', status: 'lead', interestLevel: 'cold', aiScore: 20, tags: ['saas'], lastConnected: '2023-01-01 at 2:30 pm' }),
  mk({ id: '3', name: 'Cy Young', company: '', status: 'prospect', interestLevel: 'hot', aiScore: 55, tags: [] }),
];
const fields = buildContactFilterFields([{ id: 'abc', label: 'Region', fieldType: 'select', options: ['EU', 'US'] }]);
const F = (id: string, fieldMetadataId: string, operand: ViewFilterOperand, value: unknown, extra: Record<string, unknown> = {}): any => ({
  id, fieldMetadataId, operand, value: typeof value === 'string' ? value : JSON.stringify(value), ...extra,
});
const ids = (r: any[]) => r.map((c) => c.id);

describe('filterContacts (vendored MIT engine + our matcher)', () => {
  it('simple text contains', () => {
    const r = filterContacts(contacts, { recordFilters: [F('f1', 'name', ViewFilterOperand.CONTAINS, 'ada')], recordFilterGroups: [] }, fields);
    expect(ids(r)).toEqual(['1']);
  });

  it('select IS with multiple values and number >=', () => {
    const r = filterContacts(contacts, {
      recordFilters: [
        F('f1', 'interestLevel', ViewFilterOperand.IS, ['hot']),
        F('f2', 'aiScore', ViewFilterOperand.GREATER_THAN_OR_EQUAL, '60'),
      ],
      recordFilterGroups: [],
    }, fields);
    expect(ids(r)).toEqual(['1']);
  });

  it('nested groups: (status=lead OR status=prospect) AND tag contains saas OR empty company', () => {
    const state = {
      recordFilterGroups: [
        { id: 'root', logicalOperator: RecordFilterGroupLogicalOperator.OR },
        { id: 'g1', parentRecordFilterGroupId: 'root', logicalOperator: RecordFilterGroupLogicalOperator.AND, positionInRecordFilterGroup: 0 },
      ],
      recordFilters: [
        F('a', 'status', ViewFilterOperand.IS, ['lead', 'prospect'], { recordFilterGroupId: 'g1', positionInRecordFilterGroup: 0 }),
        F('b', 'tags', ViewFilterOperand.CONTAINS, ['saas'], { recordFilterGroupId: 'g1', positionInRecordFilterGroup: 1 }),
        F('c', 'company', ViewFilterOperand.IS_EMPTY, '', { recordFilterGroupId: 'root', positionInRecordFilterGroup: 1 }),
      ],
    } as any;
    const r = filterContacts(contacts, state, fields);
    expect(ids(r).sort()).toEqual(['2', '3']);
  });

  it('multi-select empty / not-contains', () => {
    const empty = filterContacts(contacts, { recordFilters: [F('f', 'tags', ViewFilterOperand.IS_EMPTY, '')], recordFilterGroups: [] }, fields);
    expect(ids(empty)).toEqual(['3']);
    const not = filterContacts(contacts, { recordFilters: [F('f', 'tags', ViewFilterOperand.DOES_NOT_CONTAIN, ['vip'])], recordFilterGroups: [] }, fields);
    expect(ids(not).sort()).toEqual(['2', '3']);
  });

  it('date filter handles non-ISO lastConnected', () => {
    expect(toIsoDate('2023-01-01 at 2:30 pm')).toMatch(/^2023-01-01/);
    const r = filterContacts(contacts, { recordFilters: [F('f', 'lastConnected', ViewFilterOperand.IS_BEFORE, '2024-01-01T00:00:00.000Z')], recordFilterGroups: [] }, fields);
    expect(ids(r)).toEqual(['2']);
  });

  it('empty filter returns everything', () => {
    expect(filterContacts(contacts, { recordFilters: [], recordFilterGroups: [] }, fields)).toHaveLength(3);
  });
});
