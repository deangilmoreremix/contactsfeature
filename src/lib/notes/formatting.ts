/** Textarea edits behind the notes formatting toolbar (pure: text + selection in, text + selection out). */
export type NoteFormat = 'bold' | 'italic' | 'bullet' | 'link';

export interface TextEdit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

function wrap(text: string, start: number, end: number, mark: string): TextEdit {
  const selected = text.slice(start, end);
  // Toggle off when the selection is already wrapped.
  if (selected.length >= mark.length * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
    const inner = selected.slice(mark.length, selected.length - mark.length);
    return { text: text.slice(0, start) + inner + text.slice(end), selectionStart: start, selectionEnd: start + inner.length };
  }
  if (start === end) {
    const placeholder = mark === '**' ? 'bold text' : 'italic text';
    return {
      text: text.slice(0, start) + mark + placeholder + mark + text.slice(end),
      selectionStart: start + mark.length,
      selectionEnd: start + mark.length + placeholder.length,
    };
  }
  return {
    text: text.slice(0, start) + mark + selected + mark + text.slice(end),
    selectionStart: start + mark.length,
    selectionEnd: end + mark.length,
  };
}

function bullet(text: string, start: number, end: number): TextEdit {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const allBullets = lines.every((l) => /^- /.test(l));
  const next = lines.map((l) => (allBullets ? l.replace(/^- /, '') : /^- /.test(l) ? l : `- ${l}`)).join('\n');
  return {
    text: text.slice(0, lineStart) + next + text.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + next.length,
  };
}

function link(text: string, start: number, end: number): TextEdit {
  const selected = text.slice(start, end);
  const label = selected || 'link text';
  const insert = `[${label}](https://)`;
  // Select the "https://" placeholder so the url can be typed straight away.
  const urlStart = start + label.length + 3;
  return {
    text: text.slice(0, start) + insert + text.slice(end),
    selectionStart: urlStart,
    selectionEnd: urlStart + 'https://'.length,
  };
}

export function applyNoteFormat(text: string, selectionStart: number, selectionEnd: number, format: NoteFormat): TextEdit {
  const start = Math.max(0, Math.min(selectionStart, selectionEnd, text.length));
  const end = Math.min(text.length, Math.max(selectionStart, selectionEnd));
  switch (format) {
    case 'bold': return wrap(text, start, end, '**');
    case 'italic': return wrap(text, start, end, '*');
    case 'bullet': return bullet(text, start, end);
    case 'link': return link(text, start, end);
  }
}
