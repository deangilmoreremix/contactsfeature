#!/usr/bin/env node
/**
 * Streaming gate (called by scripts/check-stack.sh).
 * Every user-facing AI answer must stream (docs/STREAMING.md). In user-facing files these calls are violations:
 *   - aiRespond(req) / aiJson(req)            -> no handlers argument (use aiStream, or pass handlers)
 *   - callOpenAI(..)  createResponse(..)  responsesFetch(..)   -> non-streaming server calls
 * "User-facing" = src/components/**, src/hooks/**, and every netlify/functions/<name>.js handler (not `_helpers`).
 * Files are exempt only when listed in scripts/streaming-allowlist.txt (intentionally non-streaming pipelines).
 * Dual-mode handlers use runDual / streamResponse and need no exemption.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN = [
  { dir: 'src/components', exts: ['.ts', '.tsx'] },
  { dir: 'src/hooks', exts: ['.ts', '.tsx'] },
  { dir: 'netlify/functions', exts: ['.js'], flat: true, skip: (f) => path.basename(f).startsWith('_') },
];
const SKIP_PARTS = ['node_modules', '__tests__'];
const SKIP_FILE = /\.(test|spec)\.[tj]sx?$/;
const CALLS = /\b(aiRespond|aiJson|callOpenAI|createResponse|responsesFetch)\s*\(/g;
const HANDLER_CALLS = new Set(['aiRespond', 'aiJson']);

function readAllowlist() {
  const file = path.join(ROOT, 'scripts/streaming-allowlist.txt');
  const set = new Set();
  const pending = new Set();
  if (!fs.existsSync(file)) return { set, pending };
  let inPending = false;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (/^#\s*PENDING/i.test(line)) inPending = true;
    if (!line || line.startsWith('#')) continue;
    const p = line.split('#')[0].trim();
    if (!p) continue;
    set.add(p);
    if (inPending) pending.add(p);
  }
  return { set, pending };
}

/** True when `pattern` (a path, a dir ending in /, or a glob with *) matches the repo-relative file. */
function matches(pattern, rel) {
  if (pattern.endsWith('/')) return rel.startsWith(pattern);
  if (pattern.includes('*')) {
    const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
    return re.test(rel);
  }
  return pattern === rel;
}

function walk(dir, flat, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!flat && !SKIP_PARTS.includes(e.name)) walk(full, flat, out);
    } else out.push(full);
  }
}

/** Number of top-level arguments of the call whose '(' is at index `open` (strings/templates/comments aware). */
function argCount(src, open) {
  let depth = 0, args = 0, sawToken = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      sawToken = true;
      const q = c;
      for (i++; i < src.length && src[i] !== q; i++) {
        if (src[i] === '\\') i++;
        else if (q === '`' && src[i] === '$' && src[i + 1] === '{') { // skip ${ ... }
          let d = 0;
          for (i += 1; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
        }
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); if (i < 0) return args; i++; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; if (depth > 1) sawToken = true; continue; }
    if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0) return sawToken ? args + 1 : 0;
      continue;
    }
    if (depth === 1) {
      if (c === ',') { if (sawToken) args++; sawToken = false; } else if (!/\s/.test(c)) sawToken = true;
    } else if (depth > 1) sawToken = true;
  }
  return args;
}

function scanFile(abs) {
  const src = fs.readFileSync(abs, 'utf8');
  const hits = [];
  CALLS.lastIndex = 0;
  let m;
  while ((m = CALLS.exec(src))) {
    const name = m[1];
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const lineText = src.slice(lineStart, src.indexOf('\n', m.index) < 0 ? src.length : src.indexOf('\n', m.index));
    const before = src.slice(lineStart, m.index);
    if (/^\s*(\/\/|\*|\/\*)/.test(lineText)) continue;                       // comment line
    if (/\b(function\*?|async)\s+$/.test(before) || /\bfunction\s*\*?\s*$/.test(before)) continue; // definition
    if (/^\s*(export\s+)?(async\s+)?(get|set)?\s*$/.test(before) && /\{\s*$/.test(lineText)) continue; // method definition
    if (HANDLER_CALLS.has(name)) {
      const open = m.index + m[0].length - 1;
      if (argCount(src, open) >= 2) continue; // handlers passed
    }
    hits.push({ line: src.slice(0, m.index).split('\n').length, name });
  }
  return hits;
}

function main() {
  const { set: allow, pending } = readAllowlist();
  const violations = [];
  const used = new Set();
  const stale = [];
  const files = [];
  for (const s of SCAN) {
    const all = [];
    walk(path.join(ROOT, s.dir), !!s.flat, all);
    for (const f of all) {
      if (!s.exts.includes(path.extname(f)) || SKIP_FILE.test(f) || (s.skip && s.skip(f))) continue;
      files.push(path.relative(ROOT, f).split(path.sep).join('/'));
    }
  }
  for (const rel of files) {
    const hits = scanFile(path.join(ROOT, rel));
    if (!hits.length) continue;
    const pat = [...allow].find((p) => matches(p, rel));
    if (pat) { used.add(pat); continue; }
    violations.push({ rel, hits });
  }
  for (const p of allow) {
    if (!used.has(p) && !files.some((f) => matches(p, f)) && !p.endsWith('/') && !p.includes('*') && !fs.existsSync(path.join(ROOT, p))) stale.push(p);
  }
  if (process.argv.includes('--list-pending')) {
    for (const v of violations) console.log(v.rel);
    return 0;
  }
  if (violations.length) {
    console.log('✗ streaming: non-streaming AI calls in user-facing files (stream them, or add to scripts/streaming-allowlist.txt with a reason)');
    for (const v of violations.slice(0, 40)) console.log(`  ${v.rel}:${v.hits.map((h) => `${h.line}(${h.name})`).join(',')}`);
    return 1;
  }
  const pend = [...pending].filter((p) => used.has(p));
  console.log(`✓ streaming gate (${files.length} user-facing files scanned, ${used.size} allowlisted${pend.length ? `, ${pend.length} PENDING conversion` : ''})`);
  if (stale.length) console.log(`  note: allowlist entries that no longer exist: ${stale.join(', ')}`);
  if (pend.length) console.log(`  pending (remove from allowlist when converted): ${pend.join(', ')}`);
  return 0;
}

process.exit(main());
