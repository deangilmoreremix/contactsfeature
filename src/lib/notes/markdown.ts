/**
 * Safe, tiny Markdown subset for contact notes: **bold**, *italic*, "- " bullet lists and
 * [text](link) links. Everything else is plain text.
 *
 * Safety model: the parser produces a typed tree of text / bold / italic / link nodes; it never
 * emits raw HTML. React renders the tree (text nodes are escaped by React), and `noteToHtml`
 * escapes every text node and attribute. Links are limited to http, https and mailto.
 */

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'link'; href: string; children: InlineNode[] };

export type NoteBlock =
  | { type: 'text'; children: InlineNode[] }
  | { type: 'list'; items: InlineNode[][] };

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** Returns the normalised href when the url is an absolute http(s)/mailto link, else null. */
export function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (!/^(https?:\/\/|mailto:)/i.test(url)) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s<>"'`\\]/.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    if (parsed.protocol !== 'mailto:' && !parsed.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

// Order matters: bold before italic so "**x**" is not read as two italics.
const INLINE =
  /\*\*([^\s*](?:[^*]*[^\s*])?)\*\*|\*([^\s*](?:[^*]*[^\s*])?)\*|\[([^\][\n]+)\]\(([^)\s]+)\)/;

const MAX_DEPTH = 4;

function parseInline(text: string, depth = 0): InlineNode[] {
  const nodes: InlineNode[] = [];
  let rest = text;
  const pushText = (t: string) => {
    if (!t) return;
    const last = nodes[nodes.length - 1];
    if (last && last.type === 'text') last.text += t;
    else nodes.push({ type: 'text', text: t });
  };
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) { pushText(rest); break; }
    pushText(rest.slice(0, m.index));
    const [whole, bold, italic, label, url] = m;
    if (bold !== undefined) {
      nodes.push(depth < MAX_DEPTH ? { type: 'bold', children: parseInline(bold, depth + 1) } : { type: 'text', text: bold });
    } else if (italic !== undefined) {
      nodes.push(depth < MAX_DEPTH ? { type: 'italic', children: parseInline(italic, depth + 1) } : { type: 'text', text: italic });
    } else {
      const href = safeHref(url ?? '');
      // Unsafe link: keep the whole source as inert text.
      if (href && label !== undefined) nodes.push({ type: 'link', href, children: [{ type: 'text', text: label }] });
      else pushText(whole);
    }
    rest = rest.slice(m.index + whole.length);
  }
  return nodes;
}

const BULLET = /^[ \t]{0,3}[-*][ \t]+(.*)$/;

/** Split a note into text blocks and bullet lists. Line breaks inside text blocks are kept as "\n". */
export function parseNote(source: string): NoteBlock[] {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: NoteBlock[] = [];
  let textLines: string[] = [];
  let items: InlineNode[][] = [];
  const flushText = () => {
    if (textLines.length) blocks.push({ type: 'text', children: parseInline(textLines.join('\n')) });
    textLines = [];
  };
  const flushList = () => {
    if (items.length) blocks.push({ type: 'list', items });
    items = [];
  };
  for (const line of lines) {
    const m = BULLET.exec(line);
    if (m) {
      flushText();
      items.push(parseInline(m[1] ?? ''));
    } else {
      flushList();
      textLines.push(line);
    }
  }
  flushText();
  flushList();
  return blocks;
}

/** True when the note uses any formatting. Notes without any must render exactly as plain text. */
export function hasMarkdown(source: string): boolean {
  return parseNote(source).some(
    (b) => b.type === 'list' || b.children.some((n) => n.type !== 'text')
  );
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const inlineToHtml = (nodes: InlineNode[]): string =>
  nodes
    .map((n) => {
      switch (n.type) {
        case 'text': return escapeHtml(n.text);
        case 'bold': return `<strong>${inlineToHtml(n.children)}</strong>`;
        case 'italic': return `<em>${inlineToHtml(n.children)}</em>`;
        case 'link': return `<a href="${escapeHtml(n.href)}" target="_blank" rel="noopener noreferrer nofollow">${inlineToHtml(n.children)}</a>`;
      }
    })
    .join('');

/** HTML string of a parsed note (every text and attribute escaped). The UI renders the tree with React instead. */
export function noteToHtml(source: string): string {
  return parseNote(source)
    .map((b) => (b.type === 'list'
      ? `<ul>${b.items.map((i) => `<li>${inlineToHtml(i)}</li>`).join('')}</ul>`
      : `<p>${inlineToHtml(b.children)}</p>`))
    .join('');
}
