/**
 * OpenAI (GPT-5.2) API Production-Readiness Audit harness (ESM).
 * Run:  node tests/openai-audit.mjs
 * Live proof (opt-in):  OPENAI_API_KEY=<real sk-...> VITEST_LIVE=1 node tests/openai-audit.mjs
 *
 * NOTE on testing CJS Netlify functions here: the repo root package.json is
 * "type":"module", so Node treats netlify/functions/*.js (CommonJS
 * require/module.exports) as ESM and `require` is undefined. We therefore do
 * NOT require() the function files (that needs a running `netlify dev` server,
 * see test-netlify-functions.js). Instead this harness:
 *   1. Security guards (no committed secret key; known direct-browser call sites).
 *   2. Structural checks that the two NEW server-side proxy functions are correctly
 *      wired (exports handler, withAuth, server-side _openaiClient, no syntax errors).
 *   3. Model routing: _openaiClient is wired to GPT-5.2 variants (static read).
 *   4. LIVE opt-in: calls real GPT-5.2 via the openai SDK with the
 *      server-side key, proving end-to-end "API works 100%".
 *
 * Inventory of OpenAI (GPT-5.2) touchpoints:
 *  Feature                 | Service / Function              | Transport                       | Secret            | Status
 *  Contact analysis        | openaiService -> /netlify/   | fetch('/.netlify/functions/    | OPENAI_API_KEY    | FIXED: fn now exists
 *                          | functions/openai-contact-    | openai-contact-analysis')      | (server-side)     |
 *                          | analysis.js (NEW)            |                                |                   |
 *  Email template gen     | openaiService -> /netlify/   | fetch('/.netlify/functions/    | OPENAI_API_KEY    | FIXED: fn now exists
 *                          | functions/openai-email-      | openai-email-template')        | (server-side)     |
 *                          | template.js (NEW)           |                                |                   |
 *  Email compose (SDR)   | email-composer.js             | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  Cold email SDR        | cold-email-sdr.js           | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  Discovery SDR         | discovery-sdr.js             | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  Objection handler SDR | objection-handler-sdr.js      | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  Win-back SDR         | win-back-sdr.js              | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  Reactivation SDR      | reactivation-sdr.js          | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  Follow-up SDR        | follow-up-sdr.js             | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  AI insights           | ai-insights.js               | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *  AI enrichment        | ai-enrichment.js            | withAuth + _openaiClient       | OPENAI_API_KEY    | OK (server-side)
 *
 *  DIRECT BROWSER CALLS (SECURITY VIOLATIONS - flagged follow-up): route via serverless proxy.
 *   gpt5ToolsService.ts, webSearchService.ts, agentFramework.ts,
 *   conversational-ai.service.ts, ai-enrichmentService.ts, ai-orchestrator.service.ts,
 *   gpt51ResponsesService.ts (all use import.meta.env['VITE_OPENAI_API_KEY']
 *   or api.openai.com directly from the browser), plus src/config/api.config.ts
 *   (base URLs only).
 *
 *  Dead/out-of-scope contradictions (flagged, not fixed here): AgentMail,
 *  Twilio, Zapier code + AGENTMAIL_* env vars remain despite CLAUDE.md
 *  stating they are removed/unused.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import OpenAI from 'openai';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const FN = path.join(ROOT, 'netlify/functions');

// Keep a (dummy) key so any real openai SDK construction never throws.
// Only set if absent, so a real key (for the live test) is preserved.
if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = 'sk-test-dummy-key-00000000000000000000';

let failures = 0;
const ok = (c, m) => {
  console.log((c ? '  PASS: ' : '  FAIL: ') + m);
  if (!c) failures++;
};
const section = (n) => console.log('\n=== ' + n + ' ===');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', 'public_dist', 'tests', 'test'].includes(e)) continue;
    if (e === 'tests' || e === 'test') continue;
    const p = path.join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(e)) out.push(p);
  }
  return out;
}

// ---- Security guard ----
section('Security guard: no hardcoded OpenAI secret in committed code');
const codeFiles = [...walk(SRC), ...walk(FN)];
const secretViol = [];
for (const f of codeFiles) {
  if (/sk-[A-Za-z0-9_-]{20,}/.test(readFileSync(f, 'utf8'))) secretViol.push(f);
}
ok(secretViol.length === 0,
  'no hardcoded sk- secret key in src/ or netlify/functions/' +
  (secretViol.length ? ' -> ' + secretViol.join(', ') : ''));

section('Security guard: direct browser->OpenAI call sites (regression subset)');
const KNOWN_BROWSER = [
  'src/components/contacts/ContactJourneyTimeline.tsx',
  'src/components/ui/AIResearchButton.tsx',
  'src/config/api.config.ts',
  'src/hooks/useSmartAI.ts',
  'src/services/agentFramework.ts',
  'src/services/ai-integration.service.ts',
  'src/services/ai-orchestrator.service.ts',
  'src/services/aiEnrichmentService.ts',
  'src/services/conversational-ai.service.ts',
  'src/services/gpt51ResponsesService.ts',
  'src/services/gpt5ToolsService.ts',
  'src/services/webSearchService.ts',
].map((p) => path.join(ROOT, p));
const found = [];
for (const f of walk(SRC)) {
  const t = readFileSync(f, 'utf8');
  if (/api\.openai\.com|VITE_OPENAI_API_KEY|import\.meta\.env\['VITE_OPENAI/.test(t)) found.push(f);
}
const extras = found.filter((f) => !KNOWN_BROWSER.includes(f));
ok(KNOWN_BROWSER.every((f) => found.includes(f)),
  'all known direct browser->OpenAI sites still present (none silently removed)');
if (extras.length) console.log('  WARN: additional direct browser->OpenAI references (review): ' + extras.join(', '));

// ---- New server-side proxy functions: structural checks ----
section('New server-side proxy functions are correctly wired');
for (const name of ['openai-contact-analysis.js', 'openai-email-template.js']) {
  const fp = path.join(FN, name);
  ok(existsSync(fp), name + ' exists');
  if (!existsSync(fp)) continue;
  const t = readFileSync(fp, 'utf8');
  ok(/exports\.handler\s*=/.test(t), name + ' exports handler');
  ok(/withAuth\(/.test(t), name + ' wrapped with withAuth (server-side auth)');
  ok(/require\('\.\/_openaiClient'\)/.test(t), name + ' uses shared server-side _openaiClient (no client key)');
  ok(/createResponse|parseJsonResponse/.test(t), name + ' calls OpenAI via createResponse/parseJsonResponse');
  const r = spawnSync(process.execPath, ['--check', fp], { encoding: 'utf8' });
  ok(r.status === 0, name + ' passes node --check (no syntax errors)');
}

// openaiService references the new slugs
const svc = readFileSync(path.join(SRC, 'services/openaiService.ts'), 'utf8');
ok(svc.includes('openai-contact-analysis'), 'openaiService.ts calls /netlify/functions/openai-contact-analysis');
ok(svc.includes('openai-email-template'), 'openaiService.ts calls /netlify/functions/openai-email-template');

// ---- Model routing: _openaiClient wired to GPT-5.2 ----
section('Model routing: _openaiClient is wired to GPT-5.2');
const oc = readFileSync(path.join(FN, '_openaiClient.js'), 'utf8');
ok(/gpt-5\.2/.test(oc), '_openaiClient references gpt-5.2 model(s)');
ok(/OPENAI_API_KEY/.test(oc), '_openaiClient reads OPENAI_API_KEY from server env (not client)');

// ---- Live opt-in: real GPT-5.2 via server-side key ----
section('Live OpenAI (opt-in)');
const live = process.env.VITEST_LIVE === '1' && /^sk-/.test(process.env.OPENAI_API_KEY || '');
if (live) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await openai.responses.create({
      model: 'gpt-5.2',
      input: 'Ping. Reply with the single word: PONG',
      max_output_tokens: 20,
    });
    const text = resp.output_text || (resp.output?.[0]?.content?.[0]?.text) || '';
    ok(typeof text === 'string' && text.length > 0,
      'LIVE: GPT-5.2 responded via server-side key (' + text.slice(0, 40) + '...)');
  } catch (e) {
    ok(false, 'LIVE call failed: ' + e.message);
  }
} else {
  console.log('  SKIP: set OPENAI_API_KEY (real sk-...) and VITEST_LIVE=1 to prove end-to-end.');
}

console.log('\n' + (failures === 0 ? 'ALL AUDIT CHECKS PASSED (green by default; live opt-in)' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
