// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { hasMarkdown, noteToHtml, parseNote, safeHref } from '../src/lib/notes/markdown';
import { applyNoteFormat } from '../src/lib/notes/formatting';

describe('plain notes stay plain', () => {
  it.each([
    'Called, will follow up Tuesday.',
    'Line one\nLine two\n\nLine four',
    'Costs 5 * 3 * 2 = 30',
    'snake_case_name and a_b',
    'Visit https://example.com today',
    'a - b - c',
    '<b>not bold</b>',
    '',
  ])('%j has no markdown', (text) => {
    expect(hasMarkdown(text)).toBe(false);
  });
});

describe('formatting', () => {
  it('renders bold, italic, links and lists', () => {
    expect(noteToHtml('**hi** and *there*')).toBe('<p><strong>hi</strong> and <em>there</em></p>');
    expect(noteToHtml('[Acme](https://acme.io/a?b=1&c=2)')).toBe('<p><a href="https://acme.io/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer nofollow">Acme</a></p>');
    expect(noteToHtml('Todo:\n- one\n- *two*\n* three')).toBe('<p>Todo:</p><ul><li>one</li><li><em>two</em></li><li>three</li></ul>');
  });
  it('allows mailto links', () => {
    expect(noteToHtml('[me](mailto:a@b.co)')).toContain('href="mailto:a@b.co"');
  });
  it('nests bold around italic', () => {
    expect(noteToHtml('**a *b* c**')).toBe('<p><strong>a <em>b</em> c</strong></p>');
  });
});

describe('XSS', () => {
  const payloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '**<img src=x onerror=alert(1)>**',
    '- <svg onload=alert(1)>',
    '[x](javascript:alert(1))',
    '[x](JaVaScRiPt:alert(1))',
    '[x]( javascript:alert(1))',
    '[x](java\tscript:alert(1))',
    '[x](data:text/html;base64,PHNjcmlwdD4=)',
    '[x](vbscript:msgbox(1))',
    '[x](//evil.com)',
    '[x](/relative)',
    '[x](https://a.com" onclick="alert(1))',
    '[<img src=x onerror=alert(1)>](https://ok.com)',
    '[x](https://a.com/\u0000)',
  ];
  it.each(payloads)('%j produces no live markup', (p) => {
    const html = noteToHtml(p);
    // Escaped text never contains "<", so every "<" starts one of our own tags, and each must be exactly whitelisted.
    const tags = html.match(/<[^>]*>/g) ?? [];
    expect((html.match(/</g) ?? []).length).toBe(tags.length);
    const allowed = /^(<\/?(p|ul|li|strong|em)>|<\/a>|<a href="(https?:\/\/|mailto:)[^"<>]*" target="_blank" rel="noopener noreferrer nofollow">)$/i;
    for (const t of tags) expect(t).toMatch(allowed);
  });
  it('escapes angle brackets and quotes in text', () => {
    expect(noteToHtml('<script>alert("x")</script>')).toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>');
  });
  it('keeps an unsafe link as inert text', () => {
    const [block] = parseNote('[x](javascript:alert(1))');
    expect(block).toEqual({ type: 'text', children: [{ type: 'text', text: '[x](javascript:alert(1))' }] });
  });
  it('safeHref whitelist', () => {
    expect(safeHref('https://a.com')).toBe('https://a.com');
    expect(safeHref('HTTP://a.com')).toBe('HTTP://a.com');
    for (const bad of ['javascript:alert(1)', 'ftp://a.com', 'https://', 'https://a.com/ b', "https://a.com/'", 'tel:123', '']) expect(safeHref(bad)).toBeNull();
  });
});

describe('toolbar edits', () => {
  it('wraps a selection in bold / italic and toggles it off', () => {
    const r = applyNoteFormat('hello world', 6, 11, 'bold');
    expect(r).toEqual({ text: 'hello **world**', selectionStart: 8, selectionEnd: 13 });
    expect(applyNoteFormat(r.text, 6, 15, 'bold').text).toBe('hello world');
    expect(applyNoteFormat('a b', 0, 1, 'italic').text).toBe('*a* b');
  });
  it('inserts a placeholder with an empty selection', () => {
    const r = applyNoteFormat('', 0, 0, 'bold');
    expect(r.text).toBe('**bold text**');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('bold text');
  });
  it('toggles bullets on whole lines', () => {
    const on = applyNoteFormat('a\nb\nc', 2, 5, 'bullet');
    expect(on.text).toBe('a\n- b\n- c');
    expect(applyNoteFormat(on.text, 2, on.text.length, 'bullet').text).toBe('a\nb\nc');
  });
  it('keeps a caret after the bullet marker when nothing is selected', () => {
    const r = applyNoteFormat('a\n', 2, 2, 'bullet');
    expect(r).toEqual({ text: 'a\n- ', selectionStart: 4, selectionEnd: 4 });
  });
  it('inserts a link and selects the url', () => {
    const r = applyNoteFormat('see Acme now', 4, 8, 'link');
    expect(r.text).toBe('see [Acme](https://) now');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('https://');
  });
  it('clamps a bad selection', () => {
    expect(applyNoteFormat('abc', 10, 20, 'bold').text).toBe('abc**bold text**');
  });
});

describe('bold edge cases', () => {
  it('two bold spans on one line stay separate', () => {
    expect(noteToHtml('**a** and **b**')).toBe('<p><strong>a</strong> and <strong>b</strong></p>');
  });
});
