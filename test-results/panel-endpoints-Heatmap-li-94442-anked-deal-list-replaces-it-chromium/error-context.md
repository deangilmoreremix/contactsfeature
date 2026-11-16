# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel-endpoints.spec.ts >> Heatmap (light): reasoning streams in, then the ranked deal list replaces it
- Location: tests/playwright/panel-endpoints.spec.ts:80:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.textContent: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('pre').filter({ hasText: /rescue this week/ }).first()

```

# Test source

```ts
  1  | /**
  2  |  * Panels backed by the new endpoints must fill in WHILE the answer is produced: Skills (text), Memory (brief) and
  3  |  * Heatmap (deal list). A dripping SSE server answers (events 150-300 ms apart); each assertion samples the DOM over
  4  |  * time and needs growth over >= 3 snapshots. Light + dark screenshots go to $SHOTS (default /tmp).
  5  |  *   npx playwright test -c tests/playwright/panels.config.ts
  6  |  */
  7  | import { test, expect, type Page } from '@playwright/test';
  8  | import type http from 'node:http';
  9  | import { startDripPanels } from './helpers/dripPanels';
  10 | 
  11 | const DRIP_PORT = Number(process.env.PANELS_DRIP_PORT || 5491);
  12 | const SHOTS = process.env.SHOTS || '/tmp';
  13 | const CONTACT = '22222222-2222-2222-2222-222222222222';
  14 | 
  15 | let server: http.Server;
  16 | test.beforeAll(async () => { server = await startDripPanels(DRIP_PORT); });
  17 | test.afterAll(async () => { await new Promise((r) => server.close(r)); });
  18 | 
  19 | async function setup(page: Page, c: string, theme: 'light' | 'dark' = 'light') {
  20 |   await page.addInitScript(() => {
  21 |     const now = Math.floor(Date.now() / 1000);
  22 |     localStorage.setItem('sb-127-auth-token', JSON.stringify({
  23 |       access_token: 'test-token', refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: now + 86400,
  24 |       user: { id: 'user-1', aud: 'authenticated', email: 'me@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  25 |     }));
  26 |   });
  27 |   await page.route('http://127.0.0.1:54321/**', async (route) => {
  28 |     const json = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
  29 |     if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  30 |     if (route.request().url().includes('/auth/v1/user')) return json({ id: 'user-1', email: 'me@example.com' });
  31 |     return json([]);
  32 |   });
  33 |   await page.goto(`/tests/playwright/harness/panels.html?c=${c}&theme=${theme}`);
  34 | }
  35 | 
  36 | async function samples(page: Page, read: () => Promise<number>, ms = 7000): Promise<number[]> {
  37 |   const seen: number[] = [];
  38 |   const end = Date.now() + ms;
  39 |   while (Date.now() < end) {
  40 |     const v = await read();
  41 |     if (v >= 0 && seen[seen.length - 1] !== v) seen.push(v);
  42 |     await page.waitForTimeout(60);
  43 |   }
  44 |   return seen;
  45 | }
  46 | /** >= 3 distinct snapshots, never shrinking while streaming (the last sample may differ: the live box is swapped for the final one). */
  47 | const grows = (all: number[]) => {
  48 |   const xs = all.length > 1 && all[all.length - 1]! < all[all.length - 2]! ? all.slice(0, -1) : all;
  49 |   return xs.length >= 3 && xs.every((v, i) => i === 0 || v >= xs[i - 1]!) && xs[xs.length - 1]! > xs[0]!;
  50 | };
  51 | 
  52 | for (const theme of ['light', 'dark'] as const) {
  53 |   test(`Skills (${theme}): reply types in word by word, then the final result stays`, async ({ page }) => {
  54 |     await setup(page, 'skills', theme);
  55 |     await page.getByRole('combobox').selectOption('budget_objection');
  56 |     await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
  57 |     await page.getByRole('button', { name: 'Run Skill' }).click();
  58 |     await expect(page.getByText('Thinking…').first()).toBeVisible({ timeout: 5000 });
  59 |     const out = page.locator('pre').filter({ hasText: /Thanks for being upfront|^Thanks/ });
  60 |     const lens = await samples(page, async () => (await out.count()) ? ((await out.first().textContent()) || '').length : -1, 7000);
  61 |     expect(grows(lens), `reply length over time: ${lens}`).toBe(true);
  62 |     await expect(page.getByText('Let us run a four week pilot', { exact: false }).first()).toBeVisible();
  63 |     await expect(page.getByText(/ran for contact/)).toBeVisible();
  64 |     await page.screenshot({ path: `${SHOTS}/panel-skills-${theme}.png`, fullPage: true });
  65 |   });
  66 | 
  67 |   test(`Memory (${theme}): AI brief grows while it is written, then the three layers appear`, async ({ page }) => {
  68 |     await setup(page, 'memory', theme);
  69 |     await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
  70 |     await page.getByRole('button', { name: 'View Memory' }).click();
  71 |     const brief = page.locator('pre').filter({ hasText: /^Ada prefers/ });
  72 |     const lens = await samples(page, async () => (await brief.count()) ? ((await brief.first().textContent()) || '').length : -1, 7000);
  73 |     expect(grows(lens), `brief length over time: ${lens}`).toBe(true);
  74 |     await expect(page.getByText('Sent pricing').first()).toBeVisible();
  75 |     await expect(page.getByText('Short-Term')).toBeVisible();
  76 |     await expect(page.getByText('What the agents remember')).toBeVisible();
  77 |     await page.screenshot({ path: `${SHOTS}/panel-memory-${theme}.png`, fullPage: true });
  78 |   });
  79 | 
  80 |   test(`Heatmap (${theme}): reasoning streams in, then the ranked deal list replaces it`, async ({ page }) => {
  81 |     await setup(page, 'heatmap', theme);
  82 |     await page.getByRole('button', { name: 'Assess Open Deals' }).click();
  83 |     const live = page.locator('pre').filter({ hasText: /rescue this week/ });
> 84 |     const lens = await samples(page, async () => (await live.count()) ? ((await live.first().textContent()) || '').length : -1, 8000);
     |                                                                                              ^ Error: locator.textContent: Test timeout of 60000ms exceeded.
  85 |     expect(grows(lens), `streamed reasoning length over time: ${lens}`).toBe(true);
  86 |     await expect(page.getByText('Acme expansion · 78/100')).toBeVisible();
  87 |     await expect(page.getByText('Next: Send the order form.')).toBeVisible();
  88 |     await page.screenshot({ path: `${SHOTS}/panel-heatmap-${theme}.png`, fullPage: true });
  89 |   });
  90 | }
  91 | 
```