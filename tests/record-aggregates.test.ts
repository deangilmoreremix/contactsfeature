// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { AGGREGATE_OPS, computeAggregate, formatAggregate, isEmptyCell, normalizeAggregateOp } from '../src/lib/records/aggregates';

describe('table aggregates', () => {
  const nums = [10, 20, null, undefined, 30, ''];
  it('counts, empties and percent empty', () => {
    expect(computeAggregate('count', nums, 'number')).toBe(6);
    expect(computeAggregate('countEmpty', nums, 'number')).toBe(3);
    expect(computeAggregate('percentEmpty', nums, 'number')).toBe(50);
    expect(computeAggregate('percentEmpty', [], 'number')).toBe(0);
  });
  it('sum / avg / min / max ignore empty cells; 0 is a value', () => {
    expect(computeAggregate('sum', nums, 'number')).toBe(60);
    expect(computeAggregate('avg', nums, 'number')).toBe(20);
    expect(computeAggregate('min', [5, 0, 9], 'number')).toBe(0);
    expect(computeAggregate('max', nums, 'number')).toBe(30);
    expect(computeAggregate('sum', [null], 'number')).toBe(0);
    expect(computeAggregate('avg', [null], 'number')).toBeNull();
    expect(computeAggregate('max', [], 'number')).toBeNull();
  });
  it('dates: earliest / latest as ISO, unparseable ignored', () => {
    const d = ['2024-03-01', 'not a date', '2023-12-25T10:00:00Z', null];
    expect(computeAggregate('min', d, 'date')).toBe('2023-12-25T10:00:00.000Z');
    expect(computeAggregate('max', d, 'date')).toBe('2024-03-01T00:00:00.000Z');
    expect(computeAggregate('sum', d, 'date')).toBeNull();
  });
  it('text: unique is case/space-insensitive; arrays (tags) compare as sets', () => {
    expect(computeAggregate('countUnique', ['Lead', 'lead ', 'Customer', '', null], 'text')).toBe(2);
    expect(computeAggregate('countUnique', [['a', 'b'], ['B', 'a'], ['c'], []], 'text')).toBe(2);
    expect(computeAggregate('countEmpty', [[], ['x']], 'text')).toBe(1);
    expect(computeAggregate('sum', ['a'], 'text')).toBeNull();
  });
  it('none computes nothing and formats to an empty string', () => {
    expect(computeAggregate('none', [1], 'number')).toBeNull();
    expect(formatAggregate('none', null)).toBe('');
  });
  it('formats results', () => {
    expect(formatAggregate('percentEmpty', 33.333)).toBe('33.3%');
    expect(formatAggregate('avg', 20.456)).toBe('20.46');
    expect(formatAggregate('min', '2023-12-25T10:00:00.000Z')).toBe('2023-12-25');
    expect(formatAggregate('max', null)).toBe('-');
  });
  it('offers ops per kind and drops invalid saved choices', () => {
    expect(AGGREGATE_OPS.text).not.toContain('sum');
    expect(AGGREGATE_OPS.number).toContain('avg');
    expect(normalizeAggregateOp('sum', 'text')).toBe('none');
    expect(normalizeAggregateOp('sum', 'number')).toBe('sum');
    expect(normalizeAggregateOp(undefined, 'date')).toBe('none');
  });
  it('isEmptyCell', () => {
    expect([null, undefined, '', '  ', NaN, []].every(isEmptyCell)).toBe(true);
    expect([0, 'a', false, ['x']].some(isEmptyCell)).toBe(false);
  });
});
