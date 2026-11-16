/** Turn partial structured JSON into readable lines for the live preview (before the final layout renders). */

const humanize = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function lines(v: unknown, indent: string, out: string[]): void {
  if (v == null || v === '') return;
  if (Array.isArray(v)) {
    for (const item of v) {
      if (item && typeof item === 'object') {
        const sub: string[] = [];
        lines(item, indent + '  ', sub);
        if (sub.length) out.push(`${indent}- ${sub[0]!.trimStart()}`, ...sub.slice(1));
      } else if (item != null && item !== '') out.push(`${indent}- ${String(item)}`);
    }
    return;
  }
  if (typeof v === 'object') {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val == null || val === '') continue;
      if (typeof val === 'object') {
        const sub: string[] = [];
        lines(val, indent + '  ', sub);
        if (sub.length) out.push(`${indent}${humanize(k)}:`, ...sub);
      } else out.push(`${indent}${humanize(k)}: ${String(val)}`);
    }
    return;
  }
  out.push(`${indent}${String(v)}`);
}

export function previewText(partial: unknown): string {
  const out: string[] = [];
  lines(partial, '', out);
  return out.join('\n');
}

/** Readable live text: formatted partial JSON when present, else raw streamed text that is not JSON being built. */
export function liveDisplay(partial: unknown, text: string): string {
  if (partial !== undefined && partial !== null) return previewText(partial);
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[') ? '' : text;
}
