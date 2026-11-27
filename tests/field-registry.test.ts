// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { coerceFieldValue, formatFieldValue, normalizeOptions, validateFieldValue } from '../src/lib/fields/fieldTypeRegistry';

describe('field type registry', () => {
  it('formats values per type', () => {
    expect(formatFieldValue('boolean', true)).toBe('Yes');
    expect(formatFieldValue('boolean', 'false')).toBe('No');
    expect(formatFieldValue('rating', 3)).toBe('★★★☆☆');
    expect(formatFieldValue('currency', 1234.5, { currency: 'USD', decimals: 2 })).toMatch(/\$1,234\.50/);
    expect(formatFieldValue('multiselect', ['a', 'b'])).toBe('a, b');
    expect(formatFieldValue('text', null)).toBe('');
  });

  it('coerces typed text into stored values', () => {
    expect(coerceFieldValue('number', '1,200')).toBe(1200);
    expect(coerceFieldValue('currency', '$99.5')).toBe(99.5);
    expect(coerceFieldValue('rating', '9')).toBe(5);
    expect(coerceFieldValue('boolean', 'true')).toBe(true);
    expect(coerceFieldValue('multiselect', 'a, b ,')).toEqual(['a', 'b']);
    expect(coerceFieldValue('text', '  hi ')).toBe('hi');
    expect(coerceFieldValue('number', '')).toBeNull();
    expect(coerceFieldValue('number', 'abc')).toBeNull();
  });

  it('validates', () => {
    expect(validateFieldValue('email', 'nope')).not.toBeNull();
    expect(validateFieldValue('email', 'a@b.co')).toBeNull();
    expect(validateFieldValue('url', 'ftp://x')).not.toBeNull();
    expect(validateFieldValue('url', 'https://x.io')).toBeNull();
    expect(validateFieldValue('text', '')).toBeNull();
  });

  it('normalizes string and object options', () => {
    expect(normalizeOptions(['EU', { value: 'US', label: 'United States' }, ''])).toEqual([
      { value: 'EU', label: 'EU' }, { value: 'US', label: 'United States' },
    ]);
  });
});
