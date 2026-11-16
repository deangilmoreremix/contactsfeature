/**
 * Tolerant parser for a JSON document that is still being streamed.
 * parsePartialJson('{"a":[1,2,{"b":"hel') -> { a: [1, 2, { b: 'hel' }] }
 * Returns undefined while nothing usable has arrived yet. Never throws.
 * (Identical copy of netlify/functions/_stream/partialJson.js — tests/streaming-core.test.ts keeps them in sync.)
 */
export function completePartialJson(input: unknown): string {
  const s = String(input || '');
  const stack: string[] = []; // '{' | '['
  let inString = false;
  let escaped = false;
  let out = '';

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    out += c;
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }

  // Cut a dangling escape or unfinished \uXXXX inside an open string.
  if (inString) {
    if (escaped) out = out.slice(0, -1);
    out = out.replace(/\\u[0-9a-fA-F]{0,3}$/, '');
    out += '"';
  }

  // Remove a trailing incomplete token that cannot be closed into valid JSON.
  out = out.replace(/[\s,]+$/, '');
  // dangling `"key":` or `"key"` (no value yet) inside an object
  out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, '');
  if (stack[stack.length - 1] === '{') out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*$/, (m: string, off: number) => {
    // only strip when this string is a KEY (i.e. preceded by { or ,), not a value
    const before = out.slice(0, off).replace(/\s+$/, '');
    return m.trimStart().startsWith(',') || before.endsWith('{') || off === 0 ? '' : m;
  });
  out = out.replace(/[\s,]+$/, '');
  // incomplete literals / numbers: true -> keep valid prefixes only
  out = out.replace(/(?:^|[:,\[\s])(?:t(?:r(?:ue?)?)?|f(?:a(?:l(?:se?)?)?)?|n(?:u(?:ll?)?)?)$/, (m: string) => m.slice(0, 1) === 't' || m.slice(0, 1) === 'f' || m.slice(0, 1) === 'n' ? '' : m.slice(0, 1));
  out = out.replace(/[-+.eE]$/, '');
  out = out.replace(/[\s,]+$/, '');
  out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, '');
  out = out.replace(/[\s,]+$/, '');

  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === '{' ? '}' : ']';
  return out;
}

export function parsePartialJson(input: unknown): unknown {
  const s = String(input || '').trim();
  if (!s) return undefined;
  try { return JSON.parse(s); } catch (_) { /* fall through */ }
  try { return JSON.parse(completePartialJson(s)); } catch (_) { return undefined; }
}


