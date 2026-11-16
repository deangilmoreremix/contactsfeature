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
import { CONTROLS, PRIMITIVES, THEME_SUBSET, UNMOUNTED } from './helpers/aiSweepControls';
import { uiConsumers } from './helpers/aiSweepReach';
import { AI_ENDPOINTS, DRIP_PORT, SHOTS, analyse, appendLine, clickAndSample, drainLog, gotoTab, openApp, settle, type Row } from './helpers/aiSweepRun';

let server: http.Server;
const rows: Row[] = []; // at most the row of the test that is running (persisted in afterEach)
const ONLY = process.env.AI_SWEEP_ONLY ? new RegExp(process.env.AI_SWEEP_ONLY) : null;

test.beforeAll(async () => { server = await startAiSweepDrip(DRIP_PORT); });
test.afterAll(async () => { await new Promise((r) => server.close(r)); });
test.afterEach(() => { const r = rows.pop(); if (r) appendLine('row', r); });

/** Requests that are not generative AI output (kick off a background pipeline / read state): not required to stream. */
const NON_GENERATIVE = new Set([
  'sdr-autopilot',      // starts/pauses the background autopilot pipeline (its generated mail is delivered by the pipeline, not shown here)
  'get-autopilot-status',
  'analytics-manager',  // CRUD for stored analytics rows; the function makes no model call
]);

for (const c of CONTROLS) {
  if (ONLY && !ONLY.test(c.id)) continue;
  test(c.id, async ({ page }) => {
    const row: Row = { id: c.id, group: c.group, tab: c.tab, status: 'FAIL', reason: '', endpoints: [], streamed: null, violations: 0, output: 'n/a', snapshots: [], firstOutputMs: null, streamMs: null, ui: '', productBug: false, requests: [], openRequests: 0 };
    rows.push(row);
    const fail = (why: string) => { row.reason = why; throw new Error(why); };
    const skip = (why: string) => { row.status = 'SKIPPED'; row.reason = why; test.skip(true, why); };
    if (c.skip) { skip(c.skip); return; }

    await openApp(page, 'light', c.tab !== 'list');
    await settle(page);
    await drainLog();

    let res;
    if (c.trigger === 'open') {
      // the tab itself starts the AI run: sample from the tab click
      res = await clickAndSample(page, async () => { await gotoTab(page, c.tab); });
    } else {
      await gotoTab(page, c.tab);
      await settle(page);
      // anything the tab started on its own must stream too
      const openLog = await drainLog();
      row.openRequests = openLog.length;
      for (const e of openLog) if (!NON_GENERATIVE.has(e.endpoint)) expect(e.wantsStream, `on tab open: ${e.endpoint} accept="${e.accept}"`).toBe(true);
      if (c.before) await c.before(page);
      const target = c.find(page);
      if (!(await target.count())) {
        if (c.absentReason) { skip(c.absentReason); return; }
        await page.screenshot({ path: `${SHOTS}/ai-sweep-${c.id}-notfound.png` }).catch(() => undefined);
        fail('control not found on screen');
      }
      await target.scrollIntoViewIfNeeded().catch(() => undefined);
      for (const f of c.fill ?? []) await f.find(page).fill(f.value);
      if (await target.isDisabled().catch(() => false)) { await page.screenshot({ path: `${SHOTS}/ai-sweep-${c.id}-disabled.png` }).catch(() => undefined); skip('button is disabled'); return; }
      if (c.popup) {
        await page.context().route('https://**/*', (r) => (r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort()));
        const [pop] = await Promise.all([page.waitForEvent('popup', { timeout: 5000 }), target.click({ force: true })]);
        const url = pop.url();
        await pop.close();
        skip(`opens an external site in a new tab (${url.replace(/^about:blank$/, 'window.open')}); not an in-app AI request`);
        return;
      }
      res = await clickAndSample(page, () => target.click({ force: true }), (c.then ?? []).map((t) => async () => { await t(page).click({ force: true }); }));
    }
    await page.screenshot({ path: `${SHOTS}/ai-sweep-${c.id}.png` }).catch(() => undefined);

    const a = analyse(res);
    const asserted = res.log.filter((e) => !NON_GENERATIVE.has(e.endpoint));
    const violations = await page.evaluate(() => (window as unknown as { __streamViolations?: unknown[] }).__streamViolations ?? null);
    const guardRequests = await page.evaluate(() => (window as unknown as { __streamRequests?: unknown[] }).__streamRequests?.length ?? -1);
    row.endpoints = [...new Set(res.log.map((e) => e.endpoint))];
    row.requests = res.log.map((e) => ({ endpoint: e.endpoint, accept: e.accept, bodyStream: e.bodyStream, queryStream: e.queryStream, listedInGuard: AI_ENDPOINTS.has(e.endpoint) }));
    row.output = a.output; row.snapshots = [...new Set(a.newChars)].slice(0, 12); row.firstOutputMs = a.firstOutputMs; row.streamMs = a.streamMs; row.ui = a.uiMessage;
    row.violations = Array.isArray(violations) ? violations.length : -1;
    row.streamed = asserted.length ? asserted.every((e) => e.wantsStream) : null;

    expect(violations, 'streamGuard must be installed (production build with VITE_STREAM_GUARD=1)').not.toBeNull();
    expect(violations, `STREAM_VIOLATIONS: ${JSON.stringify(violations)}`).toEqual([]);
    if (!asserted.length) { skip(c.noRequestReason ?? `NO AI request was made (unexplained); UI said: "${a.uiMessage}"`); if (!c.noRequestReason) row.status = 'FAIL'; if (!c.noRequestReason) throw new Error(row.reason); return; }
    if (asserted.some((e) => AI_ENDPOINTS.has(e.endpoint))) expect(guardRequests, 'the runtime guard saw the requests').toBeGreaterThan(0);
    const allowedPlain = new Set(c.nonStreaming?.endpoints ?? []);
    const plain = asserted.filter((e) => !e.wantsStream);
    if (plain.length && plain.every((e) => allowedPlain.has(e.endpoint))) { skip(`documented non-streaming: ${c.nonStreaming!.reason}`); return; }
    for (const e of asserted) {
      row.productBug = !e.wantsStream;
      expect(e.wantsStream, `${e.endpoint}${AI_ENDPOINTS.has(e.endpoint) ? '' : ' (streamGuard does not police this endpoint: not in aiEndpoints.json or exempt)'} accept="${e.accept}" bodyStream=${e.bodyStream}`).toBe(true);
    }
    if (c.expected.length) expect(row.endpoints, 'expected endpoint').toEqual(expect.arrayContaining(c.expected));
    if (c.inline) expect(a.output, `inline output must trickle in: newChars=${a.newChars.slice(0, 40)}`).toBe('inline-grew');
    else if (a.output === 'inline-jump') { row.productBug = true; expect(a.output, `output appeared in one jump: ${a.newChars.slice(0, 40)}`).toBe('inline-grew'); }
    row.status = 'PASS';
  });
}

test('completeness: every mounted UI consumer of an AI endpoint is covered; unmounted ones are listed, not counted', async () => {
  const consumers = uiConsumers();
  const covered = new Set(CONTROLS.flatMap((c) => c.covers ?? []));
  const unmounted = consumers.filter((c) => !c.mounted);
  const uncovered = consumers.filter((c) => c.mounted && !covered.has(c.name) && !PRIMITIVES.has(c.name));
  const unlisted = unmounted.filter((c) => !UNMOUNTED.some((u) => u.name === c.name) && !/^(SavedImagesGallery)$/.test(c.name));
  appendLine('extra', UNMOUNTED.map((u) => ({ ...u, confirmedUnmounted: unmounted.some((c) => c.name === u.name) })), 'unmountedConsumers');
  appendLine('extra', uncovered.map((c) => c.file), 'mountedConsumersWithoutControl');
  for (const u of UNMOUNTED) expect(unmounted.some((c) => c.name === u.name), `${u.name} is listed as unmounted but is imported from the app now: add a control for it`).toBe(true);
  expect(uncovered.map((c) => c.file), 'mounted UI files that consume an AI endpoint but have no control in aiSweepControls.ts').toEqual([]);
  expect(unlisted.map((c) => c.file), 'unmounted AI consumers missing from UNMOUNTED').toEqual([]);
});

/** Light + dark pass for a subset: a screenshot while the answer is still arriving and one after it finished. */
for (const theme of ['light', 'dark'] as const) {
  for (const id of THEME_SUBSET) {
    if (ONLY && !ONLY.test(`theme.${theme}.${id}`)) continue;
    test(`theme.${theme}.${id}`, async ({ page }) => {
      const c = CONTROLS.find((x) => x.id === id)!;
      await openApp(page, theme, true);
      await settle(page);
      await drainLog();
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDark, 'theme applied').toBe(theme === 'dark');
      const shot = (name: string) => `${SHOTS}/ai-sweep-theme-${theme}-${id}-${name}.png`;
      if (c.trigger === 'open') await gotoTab(page, c.tab);
      else {
        await gotoTab(page, c.tab);
        await settle(page);
        await drainLog();
        if (c.before) await c.before(page);
        for (const f of c.fill ?? []) await f.find(page).fill(f.value);
        await c.find(page).click({ force: true });
      }
      const t0 = Date.now();
      while (Date.now() - t0 < 6000 && !(await (await fetch(`http://127.0.0.1:${DRIP_PORT}/__log?peek=1`)).json() as unknown[]).length) await page.waitForTimeout(80);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: shot('mid') });
      await settle(page);
      await page.screenshot({ path: shot('done') });
      appendLine('extra', [shot('mid'), shot('done')], `themeShots.${theme}.${id}`);
    });
  }
}
