/** Sampling + analysis helpers for the AI controls sweep (see tests/playwright/ai-sweep.spec.ts). */
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import type { DripLogEntry } from './aiSweepDrip';
import path from 'node:path';

export const AI_ENDPOINTS = new Set<string>((JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/streaming/aiEndpoints.json'), 'utf8')) as { endpoints: string[] }).endpoints);
export const DRIP_PORT = Number(process.env.AI_SWEEP_DRIP_PORT || 5312);
export const REPORT_PATH = process.env.AI_SWEEP_REPORT || '/tmp/claude-0/-home-user-contactsfeature/d6437847-acb2-53c6-93db-7d5401eb9b08/scratchpad/ai-sweep-report.json';
export const SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user-contactsfeature/d6437847-acb2-53c6-93db-7d5401eb9b08/scratchpad';

export type Status = 'PASS' | 'FAIL' | 'SKIPPED';
export interface Row {
  id: string; group: string; tab: string; status: Status; reason: string;
  endpoints: string[]; streamed: boolean | null; violations: number;
  output: 'inline-grew' | 'inline-jump' | 'none' | 'n/a'; snapshots: number[]; firstOutputMs: number | null; streamMs: number | null;
  ui: string; productBug: boolean;
  requests: Array<{ endpoint: string; accept: string; bodyStream: boolean; queryStream: boolean; listedInGuard: boolean }>;
  openRequests: number;
}

export async function openApp(page: Page, theme: 'light' | 'dark' = 'light', openContact = true) {
  await page.addInitScript((t) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'test-token', refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: now + 86400,
      user: { id: 'user-1', aud: 'authenticated', email: 'me@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }));
    try { localStorage.setItem('theme', t); localStorage.setItem('darkMode', t === 'dark' ? 'true' : 'false'); } catch { /* ignore */ }
  }, theme);
  await page.goto('/');
  await page.waitForSelector('h3', { timeout: 20_000 });
  const skip = page.locator('button').filter({ hasText: 'Skip welcome experience' }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.waitForTimeout(600);
  const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if ((theme === 'dark') !== dark) {
    const toggle = page.getByRole('button', { name: /Switch to (light|dark) mode/ }).first();
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
  }
  if (!openContact) return;
  await page.locator('h3').nth(1).click({ force: true });
  await page.waitForSelector('[data-testid="overview-tab"]', { timeout: 15_000 });
}

export async function gotoTab(page: Page, tab: string) {
  if (tab === 'sidebar' || tab === 'list' || tab === 'overview') return;
  await page.locator(`[data-testid="${tab}-tab"]`).click({ force: true });
  await page.waitForTimeout(900);
}

const peek = async (): Promise<DripLogEntry[]> => (await (await fetch(`http://127.0.0.1:${DRIP_PORT}/__log?peek=1`)).json()) as DripLogEntry[];
export const drainLog = async (): Promise<DripLogEntry[]> => (await (await fetch(`http://127.0.0.1:${DRIP_PORT}/__log`)).json()) as DripLogEntry[];

/** Wait until no AI stream is in flight and nothing new started for `quietMs` (auto-run on tab open, background loads). */
export async function settle(page: Page, quietMs = 1200, maxMs = 25_000) {
  const end = Date.now() + maxMs;
  let last = Date.now();
  let n = -1;
  while (Date.now() < end) {
    const log = await peek();
    if (log.length !== n || log.some((e) => e.endedAt === null)) { n = log.length; last = Date.now(); }
    if (Date.now() - last > quietMs) return;
    await page.waitForTimeout(100);
  }
}

export interface Sample { t: number; text: string }
export interface SampleResult { samples: Sample[]; log: DripLogEntry[]; clickAt: number }

/** Click, then sample document.body.innerText every ~70 ms until every AI stream has ended (+1.2 s), 4 s with no request, or 40 s. */
export async function clickAndSample(page: Page, click: () => Promise<void>, followUps: Array<() => Promise<void>> = []): Promise<SampleResult> {
  await drainLog();
  const samples: Sample[] = [];
  const snap = async () => { samples.push({ t: Date.now(), text: await page.evaluate(() => document.body.innerText) }); };
  await snap();
  const clickAt = Date.now();
  await click();
  let followed = 0;
  let lastActivity = Date.now();
  let sawRequest = false;
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    await snap();
    const log = await peek();
    if (log.length) sawRequest = true;
    const inflight = log.some((e) => e.endedAt === null);
    if (inflight) lastActivity = Date.now();
    if (!sawRequest && followed < followUps.length && Date.now() - clickAt > 900 * (followed + 1)) { await followUps[followed++]!(); }
    if (sawRequest && followed < followUps.length && !inflight) { await followUps[followed++]!(); sawRequest = false; lastActivity = Date.now(); continue; }
    if (sawRequest && !inflight && Date.now() - lastActivity > 1200) break;
    if (!sawRequest && followed >= followUps.length && Date.now() - clickAt > 4000) break;
    await page.waitForTimeout(60);
  }
  await snap();
  return { samples, log: await drainLog(), clickAt };
}

const lines = (t: string) => new Set(t.split('\n').map((l) => l.trim()).filter(Boolean));

export interface Analysis {
  newChars: number[]; // chars of text that was not on the page when the first request arrived, per snapshot
  firstOutputMs: number | null; streamMs: number | null;
  output: Row['output']; distinct: number;
  uiMessage: string;
}

/** What appeared on the page AFTER the first AI request arrived, and whether it trickled in while the stream was open. */
export function analyse(res: SampleResult): Analysis {
  const reqs = res.log;
  const first = reqs.length ? Math.min(...reqs.map((r) => r.at)) : null;
  const last = reqs.length ? Math.max(...reqs.map((r) => r.endedAt ?? r.at)) : null;
  // baseline: the page 140 ms after the request reached the server (the first SSE event is >= 150 ms later), so what
  // the click rendered synchronously (a modal, a layout, a spinner) is not counted as streamed output
  const base = first === null ? res.samples[0]!.text : (res.samples.filter((s) => s.t <= first + 140).pop() ?? res.samples[0]!).text;
  const baseLines = lines(base);
  const after = first === null ? res.samples : res.samples.filter((s) => s.t >= first + 100);
  const newChars = after.map((s) => [...lines(s.text)].filter((l) => !baseLines.has(l)).join('\n').length);
  const distinct = new Set(newChars).size;
  const final = after.length ? [...lines(after[after.length - 1]!.text)].filter((l) => !baseLines.has(l)) : [];
  const finalLen = newChars[newChars.length - 1] ?? 0;
  const firstOut = after.find((_s, i) => newChars[i]! >= 20);
  let output: Row['output'] = 'none';
  if (finalLen >= 60) {
    // grew = >= 3 distinct increasing snapshots, and the first visible output was on screen before the stream ended
    const inc = newChars.filter((v, i) => i === 0 || v > Math.max(...newChars.slice(0, i)));
    const early = firstOut && last !== null ? firstOut.t < last - 250 : false;
    output = inc.length >= 3 && early ? 'inline-grew' : 'inline-jump';
  }
  const msg = final.find((l) => /sign in|not configured|failed|error|unavailable|unable|could not|no data|select/i.test(l)) || final[0] || '';
  return { newChars, firstOutputMs: firstOut && first !== null ? firstOut.t - first : null, streamMs: first !== null && last !== null ? last - first : null, output, distinct, uiMessage: msg.slice(0, 140) };
}

/** Rows are persisted per test (Playwright restarts the worker after a failure, so memory is not enough). */
const ROWS_FILE = () => `${REPORT_PATH}.ndjson`;
export function resetRows() { fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true }); fs.writeFileSync(ROWS_FILE(), ''); }
export function appendLine(kind: 'row' | 'extra', value: unknown, key?: string) { fs.appendFileSync(ROWS_FILE(), JSON.stringify({ kind, key, value }) + '\n'); }

/** Called once from globalTeardown: builds the JSON report + prints the table from the persisted rows. */
export function finalizeReport() {
  if (!fs.existsSync(ROWS_FILE())) return;
  const byId = new Map<string, Row>();
  const extra: Record<string, unknown> = {};
  for (const line of fs.readFileSync(ROWS_FILE(), 'utf8').split('\n').filter(Boolean)) {
    const e = JSON.parse(line) as { kind: string; key?: string; value: unknown };
    if (e.kind === 'row') byId.set((e.value as Row).id, e.value as Row); else extra[e.key!] = e.value;
  }
  const rows = [...byId.values()];
  const unlisted = new Map<string, Set<string>>();
  for (const r of rows) for (const q of r.requests) if (!q.listedInGuard) (unlisted.get(q.endpoint) ?? unlisted.set(q.endpoint, new Set()).get(q.endpoint)!).add(r.id);
  const hit = new Set(rows.flatMap((r) => r.endpoints));
  const count = (st: Status) => rows.filter((r) => r.status === st).length;
  fs.writeFileSync(REPORT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totals: { controls: rows.length, passed: count('PASS'), skipped: count('SKIPPED'), failed: count('FAIL') },
    rows,
    endpointsNotInGuardList: Object.fromEntries([...unlisted].map(([k, v]) => [k, [...v]])),
    guardEndpointsNeverReachedByAControl: [...AI_ENDPOINTS].filter((e) => !hit.has(e)),
    ...extra,
  }, null, 2));
  printTable(rows);
  console.log(`\nAI controls sweep: ${rows.length} controls, ${count('PASS')} passed, ${count('SKIPPED')} skipped, ${count('FAIL')} failed. Report: ${REPORT_PATH}`);
}

export function printTable(rows: Row[]) {
  const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));
  const out = ['', pad('STATUS', 8) + pad('CONTROL', 36) + pad('ENDPOINTS', 34) + pad('OUTPUT', 12) + 'NOTES'];
  for (const r of rows) out.push(pad(r.status, 8) + pad(r.id, 36) + pad(r.endpoints.join(',') || '-', 34) + pad(r.output, 12) + r.reason);
  console.log(out.join('\n'));
}
