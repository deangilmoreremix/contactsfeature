/**
 * Live AI output: the panels must fill in WHILE the answer is produced (not after).
 * Endpoints are served by a dripping SSE server (events 150-300 ms apart); every assertion samples the DOM over time
 * and requires growth over >= 3 snapshots. Light + dark screenshots are written to $SHOTS (default /tmp).
 *   npx playwright test -c tests/playwright/streaming.config.ts
 */
import { test, expect, type Page } from '@playwright/test';
import type http from 'node:http';
import { startDripServer } from './helpers/dripServer';

const DRIP_PORT = Number(process.env.DRIP_PORT || 5290);
const SHOTS = process.env.SHOTS || '/tmp';
const DEAL = { id: '11111111-1111-1111-1111-111111111111', user_id: 'user-1', contact_id: '22222222-2222-2222-2222-222222222222', title: 'Acme expansion', stage: 'proposal', value: 12000, risk_score: null, objection_level: null, stage_stagnation: null, days_since_reply: null, expected_close_date: null, closed_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' };
const CLOSED = Array.from({ length: 6 }, (_, i) => ({ ...DEAL, id: `33333333-3333-3333-3333-33333333333${i}`, contact_id: null, stage: i % 2 ? 'won' : 'lost', title: `Closed ${i}`, closed_at: '2026-02-01T00:00:00Z' }));

let server: http.Server;
test.beforeAll(async () => { server = await startDripServer(DRIP_PORT); });
test.afterAll(async () => { await new Promise((r) => server.close(r)); });

async function setup(page: Page, c: string, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'test-token', refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: now + 86400,
      user: { id: 'user-1', aud: 'authenticated', email: 'me@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }));
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const url = route.request().url();
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/*' }, body: JSON.stringify(data) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (url.includes('/auth/v1/user')) return json({ id: 'user-1', email: 'me@example.com' });
    if (url.includes('/rest/v1/deals')) return json(c === 'forecast' ? [DEAL, ...CLOSED] : [DEAL]);
    if (url.includes('/rest/v1/agent_metadata')) return json({ id: 'ai-ae-agent', name: 'AI AE Agent' });
    return json([]);
  });
  await page.goto(`/tests/playwright/harness/streaming.html?c=${c}&theme=${theme}`);
}

/** Sample `read()` every 60 ms for up to `ms` and return the distinct values in order of appearance. */
async function samples(page: Page, read: () => Promise<number>, ms = 6000): Promise<number[]> {
  const seen: number[] = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await read();
    if (v >= 0 && seen[seen.length - 1] !== v) seen.push(v); // -1: element not present (yet / any more)
    await page.waitForTimeout(60);
  }
  return seen;
}
const grows = (xs: number[]) => xs.length >= 3 && xs.every((v, i) => i === 0 || v >= xs[i - 1]!) && xs[xs.length - 1]! > xs[0]!;

test('AI Insights: status chip while searching, then insight cards appear one by one', async ({ page }) => {
  await setup(page, 'insights');
  // status chip ("Searching the web…") is visible before any insight card exists
  await expect(page.getByText('Searching the web…').first()).toBeVisible({ timeout: 8000 });
  const cards = page.getByText(/^Insight (Alpha|Beta|Gamma)/);
  const counts = await samples(page, () => cards.count(), 7000);
  expect(grows(counts), `insight card counts over time: ${counts}`).toBe(true);
  expect(counts[counts.length - 1]).toBe(3);
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0); // chip + Stop are gone when done
});

test('Deal health: score, indicators and recommendations fill in live; status chip and Stop while running', async ({ page }) => {
  await setup(page, 'health');
  await page.getByRole('button', { name: 'Run Health Analysis' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  const size = () => page.locator('main, #root').first().evaluate((el) => (el.textContent || '').length);
  const lens = await samples(page, size, 4500);
  expect(grows(lens), `panel text length over time: ${lens}`).toBe(true);
  await expect(page.getByText('72/100')).toBeVisible();
  await expect(page.getByText('Momentum Alpha')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy report' })).toBeVisible(); // only once the final result exists
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0);
});

test('Deal health: Stop aborts the run and keeps the panel usable', async ({ page }) => {
  await setup(page, 'health');
  await page.getByRole('button', { name: 'Run Health Analysis' }).click();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0);
  await expect(page.getByText('Copy report')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('Sales forecast: range, insights and actions appear while the model writes them', async ({ page }) => {
  await setup(page, 'forecast');
  await page.getByRole('button', { name: 'Generate AI forecast' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  const size = () => page.locator('#root').evaluate((el) => (el.textContent || '').length);
  const lens = await samples(page, size, 3500);
  expect(grows(lens), `forecast text length over time: ${lens}`).toBe(true);
  await expect(page.getByText('Follow up on open proposals')).toBeVisible();
});

test('Contact enrichment: status chip first, findings and sources fill in, then citations and the empty-field fill', async ({ page }) => {
  await setup(page, 'enrich');
  await page.getByTitle('AI Web Research').click();
  const live = page.getByTestId('enrich-live');
  await expect(live.getByText('Searching the web…').first()).toBeVisible({ timeout: 6000 });
  const size = () => page.evaluate(() => { const el = document.querySelector('[data-testid="enrich-live"]'); return el ? (el.textContent || '').length : -1; });
  const lens = await samples(page, size, 4500);
  expect(grows(lens), `live enrichment card text over time: ${lens}`).toBe(true);
  // final: findings card with citations, live card gone
  await expect(page.getByText('Web research', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Acme team page' })).toBeVisible();
  await expect(page.getByTestId('enrich-live')).toHaveCount(0);
});

for (const theme of ['light', 'dark'] as const) {
  test(`screenshots (${theme}): finished states`, async ({ page }) => {
    await setup(page, 'health', theme);
    await page.getByRole('button', { name: 'Run Health Analysis' }).click();
    await expect(page.getByRole('button', { name: 'Copy report' })).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: `${SHOTS}/health-${theme}.png`, fullPage: true });

    await page.goto(`/tests/playwright/harness/streaming.html?c=insights&theme=${theme}`);
    await expect(page.getByText(/^Insight Gamma/)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/insights-${theme}.png`, fullPage: true });

    await page.goto(`/tests/playwright/harness/streaming.html?c=enrich&theme=${theme}`);
    await page.getByTitle('AI Web Research').click();
    await expect(page.getByTestId('enrich-live').getByText('Series B funding closes new budget')).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: `${SHOTS}/enrich-live-${theme}.png`, fullPage: true });
    await expect(page.getByText('Web research', { exact: true })).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: `${SHOTS}/enrich-done-${theme}.png`, fullPage: true });
  });
}
