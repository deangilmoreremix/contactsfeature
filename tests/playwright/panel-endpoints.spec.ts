/**
 * Panels backed by the new endpoints must fill in WHILE the answer is produced: Skills (text), Memory (brief),
 * Heatmap (deal list), Mood (rationale + opener), Playbooks, Video (script + storyboard) and Voice (script). A dripping SSE server answers (events 150-300 ms apart); each assertion samples the DOM over
 * time and needs growth over >= 3 snapshots. Light + dark screenshots go to $SHOTS (default /tmp).
 *   npx playwright test -c tests/playwright/panels.config.ts
 */
import { test, expect, type Page } from '@playwright/test';
import type http from 'node:http';
import { startDripPanels } from './helpers/dripPanels';

const DRIP_PORT = Number(process.env.PANELS_DRIP_PORT || 5491);
const SHOTS = process.env.SHOTS || '/tmp';
const CONTACT = '22222222-2222-2222-2222-222222222222';

let server: http.Server;
test.beforeAll(async () => { server = await startDripPanels(DRIP_PORT); });
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
    const json = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (route.request().url().includes('/auth/v1/user')) return json({ id: 'user-1', email: 'me@example.com' });
    return json([]);
  });
  await page.goto(`/tests/playwright/harness/panels.html?c=${c}&theme=${theme}`);
}

/** length of the first matching element's text, -1 when absent (the live box is removed when the run ends: never wait on it) */
const lenOf = (loc: ReturnType<Page['locator']>) => async () => {
  const t = await loc.first().textContent({ timeout: 250 }).catch(() => null);
  return t === null ? -1 : t.length;
};

async function samples(page: Page, read: () => Promise<number>, ms = 7000): Promise<number[]> {
  const seen: number[] = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await read();
    if (v >= 0 && seen[seen.length - 1] !== v) seen.push(v);
    await page.waitForTimeout(60);
  }
  return seen;
}
/** >= 3 distinct snapshots, never shrinking while streaming (the last sample may differ: the live box is swapped for the final one). */
const grows = (all: number[]) => {
  const xs = all.length > 1 && all[all.length - 1]! < all[all.length - 2]! ? all.slice(0, -1) : all;
  return xs.length >= 3 && xs.every((v, i) => i === 0 || v >= xs[i - 1]!) && xs[xs.length - 1]! > xs[0]!;
};

for (const theme of ['light', 'dark'] as const) {
  test(`Skills (${theme}): reply types in word by word, then the final result stays`, async ({ page }) => {
    await setup(page, 'skills', theme);
    await page.getByRole('combobox').selectOption('budget_objection');
    await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
    await page.getByRole('button', { name: 'Run Skill' }).click();
    await expect(page.getByText('Thinking…').first()).toBeVisible({ timeout: 5000 });
    const out = page.locator('pre').filter({ hasText: /Thanks for being upfront|^Thanks/ });
    const lens = await samples(page, lenOf(out), 7000);
    expect(grows(lens), `reply length over time: ${lens}`).toBe(true);
    await expect(page.getByText('Let us run a four week pilot', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/ran for contact/)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/panel-skills-${theme}.png`, fullPage: true });
  });

  test(`Memory (${theme}): AI brief grows while it is written, then the three layers appear`, async ({ page }) => {
    await setup(page, 'memory', theme);
    await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
    await page.getByRole('button', { name: 'View Memory' }).click();
    const brief = page.locator('pre').filter({ hasText: /^Ada prefers/ });
    const lens = await samples(page, lenOf(brief), 7000);
    expect(grows(lens), `brief length over time: ${lens}`).toBe(true);
    await expect(page.getByText('Sent pricing').first()).toBeVisible();
    await expect(page.getByText('Short-Term')).toBeVisible();
    await expect(page.getByText('What the agents remember')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/panel-memory-${theme}.png`, fullPage: true });
  });

  test(`Heatmap (${theme}): reasoning streams in, then the ranked deal list replaces it`, async ({ page }) => {
    await setup(page, 'heatmap', theme);
    await page.getByRole('button', { name: 'Assess Open Deals' }).click();
    const live = page.locator('pre').filter({ hasText: /rescue this week/ });
    const lens = await samples(page, lenOf(live), 8000);
    expect(grows(lens), `streamed reasoning length over time: ${lens}`).toBe(true);
    await expect(page.getByText('Acme expansion · 78/100')).toBeVisible();
    await expect(page.getByText('Next: Send the order form.')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/panel-heatmap-${theme}.png`, fullPage: true });
  });

  test(`Mood (${theme}): rationale and opener type in, then the mood card replaces them`, async ({ page }) => {
    await setup(page, 'mood', theme);
    await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
    await page.getByRole('button', { name: 'Preview Mood' }).click();
    const live = page.locator('pre').filter({ hasText: /^Ada has gone quiet/ });
    const lens = await samples(page, lenOf(live), 8000);
    expect(grows(lens), `streamed mood text length over time: ${lens}`).toBe(true);
    await expect(page.getByText('⚡ Urgent')).toBeVisible();
    await expect(page.getByText('Deal risk is high and the proposal has been open')).toBeVisible();
    await expect(page.getByText('Could we take ten minutes on Thursday')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/panel-mood-${theme}.png`, fullPage: true });
  });

  test(`Playbooks (${theme}): summary and scripts stream in, then the playbook lists replace them`, async ({ page }) => {
    await setup(page, 'playbooks', theme);
    await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
    await page.getByRole('button', { name: 'Generate Playbooks' }).click();
    const live = page.locator('pre').filter({ hasText: /^Deals like this are won/ });
    const lens = await samples(page, lenOf(live), 9000);
    expect(grows(lens), `streamed playbook length over time: ${lens}`).toBe(true);
    await expect(page.getByText('Top Scripts')).toBeVisible();
    await expect(page.getByText('Pilot opener')).toBeVisible();
    await expect(page.getByText('Start with one team and measure the time saved', { exact: false })).toBeVisible();
    await expect(page.getByText('Based on 4 won and 2 lost deals.')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/panel-playbooks-${theme}.png`, fullPage: true });
  });

  test(`Video (${theme}): title, script and storyboard stream in, then the result stays`, async ({ page }) => {
    await setup(page, 'video', theme);
    await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
    await page.getByPlaceholder('https://your-landing-page.com/offer').fill('https://acme.example/offer');
    await page.getByRole('button', { name: 'Generate Script & Storyboard' }).click();
    const live = page.locator('pre').filter({ hasText: /^Two minute demo for Ada/ });
    const lens = await samples(page, lenOf(live), 9000);
    expect(grows(lens), `streamed script length over time: ${lens}`).toBe(true);
    await expect(page.getByText('Rendering is not available')).toBeVisible();
    await expect(page.getByText('Hi Ada, this is a short walkthrough', { exact: false })).toBeVisible();
    await expect(page.getByText('Pilot setup form with the start date', { exact: false })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/panel-video-${theme}.png`, fullPage: true });
  });

  test(`Voice (${theme}): voice script types in, then the result stays`, async ({ page }) => {
    await setup(page, 'voice', theme);
    await page.getByPlaceholder('Enter contact UUID').fill(CONTACT);
    await page.getByPlaceholder(/Hi \{\{name\}\}/).fill('Pilot follow-up voicemail for Ada');
    await page.getByRole('button', { name: 'Generate Voice Message' }).click();
    const live = page.locator('pre').filter({ hasText: /^Hi Ada, it is Sam/ });
    const lens = await samples(page, lenOf(live), 8000);
    expect(grows(lens), `streamed voice script length over time: ${lens}`).toBe(true);
    await expect(page.getByText('call me back this week', { exact: false })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/panel-voice-${theme}.png`, fullPage: true });
  });
}
