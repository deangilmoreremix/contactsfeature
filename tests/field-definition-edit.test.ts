// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  addOption, applyOptionMeta, moveDefinition, moveItem, moveOption, nextColor, pruneRemovedOption, removeOption,
  renameCustomFieldKey, renumber, serializeOptions, sortByDisplayOrder, uniqueOptionValue, updateOption,
  validateFieldLabel, validateOptions, withColors, OPTION_COLORS,
} from '../src/lib/fields/fieldDefinitionEdit';

const d = (id: string, displayOrder: number, label = id) => ({ id, label, displayOrder });

describe('validateFieldLabel', () => {
  const existing = [d('a', 0, 'Region'), d('b', 1, 'Renewal')];
  it('requires a name', () => expect(validateFieldLabel('  ', existing)).toBe('Give the field a name'));
  it('rejects duplicates case-insensitively but not itself', () => {
    expect(validateFieldLabel('region', existing)).toMatch(/already exists/);
    expect(validateFieldLabel(' REGION ', existing, 'a')).toBeNull();
    expect(validateFieldLabel('Segment', existing)).toBeNull();
  });
  it('limits length', () => expect(validateFieldLabel('x'.repeat(61), [])).toMatch(/under/));
});

describe('reordering', () => {
  it('moveItem clamps and copies', () => {
    const src = [1, 2, 3];
    expect(moveItem(src, 0, 2)).toEqual([2, 3, 1]);
    expect(moveItem(src, 2, 99)).toEqual([1, 2, 3]);
    expect(moveItem(src, 1, -5)).toEqual([2, 1, 3]);
    expect(moveItem(src, 7, 0)).toEqual([1, 2, 3]);
    expect(src).toEqual([1, 2, 3]);
  });
  it('moveDefinition renumbers contiguously', () => {
    const defs = [d('a', 5), d('b', 9), d('c', 12)];
    expect(moveDefinition(defs, 'c', -1).map((x) => [x.id, x.displayOrder])).toEqual([['a', 0], ['c', 1], ['b', 2]]);
    expect(moveDefinition(defs, 'a', -1).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(moveDefinition(defs, 'zzz', 1)).toHaveLength(3);
  });
  it('renumber keeps already-correct objects and sort is stable', () => {
    const defs = [d('a', 0), d('b', 0), d('c', 1)];
    expect(sortByDisplayOrder(defs).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(renumber(defs)[0]).toBe(defs[0]);
    expect(renumber(defs).map((x) => x.displayOrder)).toEqual([0, 1, 2]);
  });
});

describe('option editing', () => {
  it('adds with unique values and cycling colours', () => {
    let o = addOption([], 'EU');
    o = addOption(o, 'eu');
    o = addOption(o, '  ');
    expect(o.map((x) => x.value)).toEqual(['EU', 'eu 2']);
    expect(o[0]!.color).toBe(OPTION_COLORS[0]!.value);
    expect(o[1]!.color).toBe(OPTION_COLORS[1]!.value);
    expect(uniqueOptionValue('A', ['a', 'A 2'])).toBe('A 3');
  });
  it('relabels without changing the stored value, recolours, moves, removes', () => {
    let o = withColors([{ value: 'eu', label: 'eu' }, { value: 'us', label: 'us' }, { value: 'apac', label: 'apac' }]);
    o = updateOption(o, 'eu', { label: 'Europe', color: '#EF4444' });
    expect(o[0]).toEqual({ value: 'eu', label: 'Europe', color: '#EF4444' });
    o = moveOption(o, 'apac', -1);
    expect(o.map((x) => x.value)).toEqual(['eu', 'apac', 'us']);
    expect(removeOption(o, 'apac').map((x) => x.value)).toEqual(['eu', 'us']);
    expect(nextColor([])).toBe(OPTION_COLORS[0]!.value);
    expect(nextColor(OPTION_COLORS.map((c) => ({ color: c.value })))).toBe(OPTION_COLORS[0]!.value);
  });
  it('validates empty and duplicate labels', () => {
    expect(validateOptions([{ value: 'a', label: 'A' }, { value: 'b', label: ' a ' }, { value: 'c', label: '' }])).toEqual({ b: 'Two options have the same label', c: 'Give the option a label' });
    expect(validateOptions([])).toEqual({});
  });
});

describe('option (de)serialisation', () => {
  it('round-trips labels and colours through settings.optionMeta', () => {
    const opts = [{ value: 'eu', label: 'Europe', color: '#3B82F6' }, { value: 'us', label: 'us' }];
    const { values, settings } = serializeOptions(opts, { currency: 'EUR' });
    expect(values).toEqual(['eu', 'us']);
    expect(settings).toEqual({ currency: 'EUR', optionMeta: { eu: { label: 'Europe', color: '#3B82F6' } } });
    expect(applyOptionMeta([{ value: 'eu', label: 'eu' }, { value: 'us', label: 'us' }], settings)).toEqual([
      { value: 'eu', label: 'Europe', color: '#3B82F6' }, { value: 'us', label: 'us' },
    ]);
  });
  it('drops meta when nothing is custom and ignores bad colours', () => {
    expect(serializeOptions([{ value: 'a', label: 'a' }], { optionMeta: { gone: { label: 'x' } } }).settings).toEqual({});
    expect(serializeOptions([{ value: 'a', label: 'a', color: 'red' }]).settings).toEqual({});
    expect(applyOptionMeta([{ value: 'a', label: 'a' }], { optionMeta: { a: { color: 'javascript:1' } } })).toEqual([{ value: 'a', label: 'a' }]);
    expect(applyOptionMeta([{ value: 'a', label: 'a' }], null)).toEqual([{ value: 'a', label: 'a' }]);
  });
});

describe('renaming a field re-keys contact values', () => {
  it('moves the value, keeps order', () => {
    expect(renameCustomFieldKey({ A: 1, Region: 'EU', Z: 3 }, 'Region', 'Area')).toEqual({ A: 1, Area: 'EU', Z: 3 });
    expect(Object.keys(renameCustomFieldKey({ A: 1, Region: 'EU', Z: 3 }, 'Region', 'Area')!)).toEqual(['A', 'Area', 'Z']);
  });
  it('returns null when there is nothing to do or it would collide', () => {
    expect(renameCustomFieldKey({ A: 1 }, 'Region', 'Area')).toBeNull();
    expect(renameCustomFieldKey({ Region: 1, Area: 2 }, 'Region', 'Area')).toBeNull();
    expect(renameCustomFieldKey(undefined, 'a', 'b')).toBeNull();
    expect(renameCustomFieldKey({ a: 1 }, 'a', 'a')).toBeNull();
  });
  it('keeps falsy values', () => {
    expect(renameCustomFieldKey({ n: 0 }, 'n', 'm')).toEqual({ m: 0 });
  });
});

describe('pruneRemovedOption', () => {
  it('clears single and multi values', () => {
    expect(pruneRemovedOption('eu', 'eu')).toBeNull();
    expect(pruneRemovedOption('us', 'eu')).toBe('us');
    expect(pruneRemovedOption(['eu', 'us'], 'eu')).toEqual(['us']);
    expect(pruneRemovedOption(['eu'], 'eu')).toBeNull();
    const same = ['us'];
    expect(pruneRemovedOption(same, 'eu')).toBe(same);
  });
});
