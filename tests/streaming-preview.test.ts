// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { previewText, liveDisplay } from '../src/lib/streaming/previewText';
import { pickLive, isReadableText } from '../src/components/sdr/sdrLive';

describe('previewText', () => {
  it('formats partial objects progressively', () => {
    expect(previewText({ subject: 'Hi' })).toBe('Subject: Hi');
    expect(previewText({ subject: 'Hi', body: 'Dear Ad' })).toBe('Subject: Hi\nBody: Dear Ad');
    expect(previewText({ questions: [{ question: 'Why?', category: 'need' }, { question: 'Wh' }] }))
      .toBe('Questions:\n  - Question: Why?\n    Category: need\n  - Question: Wh');
    expect(previewText(undefined)).toBe('');
    expect(previewText({ tips: ['a', 'b'], empty: '' })).toBe('Tips:\n  - a\n  - b');
  });
  it('liveDisplay prefers partial and hides raw JSON text', () => {
    expect(liveDisplay({ a: 'x' }, '{"a":"x')).toBe('A: x');
    expect(liveDisplay(undefined, '{"a":')).toBe('');
    expect(liveDisplay(undefined, 'Hello there')).toBe('Hello there');
  });
});

describe('sdrLive', () => {
  it('pickLive uses the final result, else a non-empty partial', () => {
    expect(pickLive({ a: 1 }, { a: 0 })).toEqual({ a: 1 });
    expect(pickLive(null, { subject: 'S' })).toEqual({ subject: 'S' });
    expect(pickLive(null, {})).toBeNull();
    expect(pickLive(null, undefined)).toBeNull();
    expect(pickLive(null, ['x'])).toBeNull();
  });
  it('isReadableText ignores JSON in progress', () => {
    expect(isReadableText('{"a"')).toBe(false);
    expect(isReadableText('Dear Ann')).toBe(true);
    expect(isReadableText('')).toBe(false);
  });
});
