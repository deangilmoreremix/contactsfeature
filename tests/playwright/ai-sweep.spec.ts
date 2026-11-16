/**
 * AI controls sweep: every UI AI control must stream.
 *   npx playwright test -c tests/playwright/ai-sweep.config.ts            (builds the app, serves the production build)
 *   AI_SWEEP_ONLY='sdr\.' npx playwright test -c tests/playwright/ai-sweep.config.ts   (subset)
 * For each control in helpers/aiSweepControls.ts: click it against a real dripping SSE server, then assert
 *  (a) every AI request asked for a stream (Accept: text/event-stream or body.stream / ?stream=true),
 *  (b) window.__streamViolations (streamGuard) stays empty,
 *  (c) when output appears on screen it trickles in across >= 3 snapshots while the stream is still open.
 * Controls that cannot produce output here are recorded SKIPPED (with the reason); a skip is never a pass.
 * A JSON report + a table are written at the end ($AI_SWEEP_REPORT).
 */
import { test, expect } from '@playwright/test';
import type http from 'node:http';
import { startAiSweepDrip } from './helpers/aiSweepDrip';
import { CONTROLS } from './helpers/aiSweepControls';
import { AI_ENDPOINTS, ALSO_STREAMING, DRIP_PORT, analyse, clickAndSample, gotoTab, openApp, printTable, writeReport, type Row } from './helpers/aiSweepRun';

let server: http.Server;
const rows: Row[] = [];
const ONLY = process.env.AI_SWEEP_ONLY ? new RegExp(process.env.AI_SWEEP_ONLY) : null;

test.beforeAll(async () => { server = await startAiSweepDrip(DRIP_PORT); });
test.afterAll(async () => {
  await new Promise((r) => server.close(r));
  if (!ONLY) writeReport(rows, {});
  printTable(rows);
});
test.describe.configure({ mode: 'serial' });

for (const c of CONTROLS) {
  if (ONLY && !ONLY.test(c.id)) continue;
  test(c.id, async ({ page }) => {
    const row: Row = { id: c.id, group: c.group, tab: c.tab, status: 'FAIL', reason: '', endpoints: [], streamed: null, violations: 0, output: 'n/a', snapshots: [], firstOutputMs: null, streamMs: null, ui: '', productBug: false };
    rows.push(row);
    await openApp(page, 'light', c.tab !== 'list');
    await gotoTab(page, c.tab);
    if (c.before) await c.before(page);
    const target = c.find(page);
    if (!(await target.count())) { row.reason = 'control not found on screen'; throw new Error(row.reason); }
    await target.scrollIntoViewIfNeeded().catch(() => undefined);
    if (await target.isDisabled().catch(() => false)) { row.status = 'SKIPPED'; row.reason = 'button is disabled'; test.skip(true, row.reason); return; }
    for (const f of c.fill ?? []) await f.find(page).fill(f.value);

    const res = await clickAndSample(page, () => target.click({ force: true }), (c.then ?? []).map((t) => async () => { await t(page).click({ force: true }); }));
    const a = analyse(res);
    const asserted = res.log.filter((e) => AI_ENDPOINTS.has(e.endpoint) || ALSO_STREAMING.has(e.endpoint) || c.expected.includes(e.endpoint));
    const violations = await page.evaluate(() => (window as unknown as { __streamViolations?: unknown[] }).__streamViolations ?? null);
    const guardRequests = await page.evaluate(() => (window as unknown as { __streamRequests?: unknown[] }).__streamRequests?.length ?? -1);
    row.endpoints = [...new Set(res.log.map((e) => e.endpoint))];
    row.output = a.output; row.snapshots = [...new Set(a.newChars)].slice(0, 12); row.firstOutputMs = a.firstOutputMs; row.streamMs = a.streamMs; row.ui = a.uiMessage;
    row.violations = Array.isArray(violations) ? violations.length : -1;
    row.streamed = asserted.length ? asserted.every((e) => e.wantsStream) : null;

    expect(violations, 'streamGuard must be installed (production build with VITE_STREAM_GUARD=1)').not.toBeNull();
    expect(violations, `STREAM_VIOLATIONS: ${JSON.stringify(violations)}`).toEqual([]);
    if (!asserted.length) {
      row.status = 'SKIPPED'; row.reason = `no AI request made; UI said: "${a.uiMessage}"`;
      test.skip(true, row.reason); return;
    }
    expect(guardRequests, 'guard saw the requests').toBeGreaterThan(0);
    for (const e of asserted) expect(e.wantsStream, `${e.endpoint} accept="${e.accept}" bodyStream=${e.bodyStream}`).toBe(true);
    if (c.expected.length) expect(row.endpoints, 'expected endpoint').toEqual(expect.arrayContaining(c.expected));
    if (c.inline) expect(a.output, `inline output must trickle in: newChars=${a.newChars.slice(0, 40)}`).toBe('inline-grew');
    else if (a.output === 'inline-jump') expect(a.output, `output appeared in one jump: ${a.newChars.slice(0, 40)}`).toBe('inline-grew');
    row.status = 'PASS';
  });
}
