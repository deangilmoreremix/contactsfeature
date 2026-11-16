/**
 * Static completeness check for the AI controls sweep: finds every UI file (src/components, src/pages) that consumes
 * an AI endpoint (aiEndpoints.json names + the streaming client helpers) and whether it is imported (transitively,
 * including lazy import()) from the app entry. Unmounted consumers cannot be clicked, mounted ones must be covered
 * by a control in aiSweepControls.ts (`covers`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { AI_ENDPOINTS } from './aiSweepRun';

const SRC = path.join(process.cwd(), 'src');
const EXTS = ['.tsx', '.ts', '/index.tsx', '/index.ts'];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'tests' && e.name !== '__tests__') walk(p, out); } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXTS) if (fs.existsSync(base + e)) return base + e;
  return null;
}

export function mountedFiles(): Set<string> {
  const seen = new Set<string>();
  const queue = ['main.tsx', 'bootstrap.tsx', 'App.tsx'].map((f) => path.join(SRC, f)).filter((f) => fs.existsSync(f));
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const src = fs.readFileSync(f, 'utf8');
    const re = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) { const r = resolveImport(f, m[1]!); if (r && !seen.has(r)) queue.push(r); }
  }
  return seen;
}

const HELPERS = /(useAIStream|useLiveCall|useFunctionStream|streamFunction|services\/aiClient|aiJson|aiStream|useEmailAI|liveFunction|functionStream)/;
export interface Consumer { file: string; name: string; mounted: boolean }
export function uiConsumers(): Consumer[] {
  const mounted = mountedFiles();
  const names = [...AI_ENDPOINTS].map((e) => new RegExp(`['"\`/]${e}['"\`?]`));
  const files = [...walk(path.join(SRC, 'components')), ...walk(path.join(SRC, 'pages'))];
  const out: Consumer[] = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (!HELPERS.test(src) && !names.some((r) => r.test(src))) continue;
    out.push({ file: path.relative(process.cwd(), f), name: path.basename(f).replace(/\.tsx?$/, ''), mounted: mounted.has(f) });
  }
  return out;
}
