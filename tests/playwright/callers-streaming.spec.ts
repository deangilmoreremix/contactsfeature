/**
 * Direct UI callers must show their AI answer WHILE it is produced. Every assertion samples the DOM and requires growth
 * over >= 3 snapshots; light + dark screenshots go to $SHOTS (default /tmp).
 *   npx playwright test -c tests/playwright/callers.config.ts
 */
import { test, expect, type Page } from '@playwright/test';
import type http from 'node:http';
import { startDripCallers } from './helpers/dripCallers';

const DRIP_PORT = Number(process.env.CALLERS_DRIP_PORT || 5291);
const SHOTS = process.env.SHOTS || '/tmp';

let server: http.Server;
test.beforeAll(async () => { server = await startDripCallers(DRIP_PORT); });
test.afterAll(async () => { await new Promise((r) => server.close(r)); });

async function open(page: Page, c: string, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'test-token', refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: now + 86400,
      user: { id: 'user-1', aud: 'authenticated', email: 'me@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }));
  });
  await page.goto(`/tests/playwright/harness/callers.html?c=${c}&theme=${theme}`);
}

async function samples(read: () => Promise<number>, page: Page, ms = 6000): Promise<number[]> {
  const seen: number[] = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await read();
    if (v >= 0 && seen[seen.length - 1] !== v) seen.push(v);
    await page.waitForTimeout(60);
  }
  return seen;
}
const grows = (xs: number[]) => xs.length >= 3 && xs.every((v, i) => i === 0 || v >= xs[i - 1]!) && xs[xs.length - 1]! > xs[0]!;
const textLen = (page: Page, sel = '#root') => () => page.evaluate((s) => { const el = document.querySelector(s); return el ? (el.textContent || '').length : -1; }, sel);
/** length of the live text (the <pre> inside the StreamingOutput aria-live card), -1 while there is none */
const liveLen = (page: Page) => textLen(page, '[aria-live="polite"] pre');

test('SDRPersonaSelector: draft types in live under Run SDR, Stop aborts, banner only after completion', async ({ page }) => {
  await open(page, 'sdr');
  await page.getByRole('button', { name: 'Run SDR' }).first().click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  const lens = await samples(liveLen(page), page, 4500);
  expect(grows(lens), `live card text over time: ${lens}`).toBe(true);
  await expect(page.getByText('SDR Campaign Executed')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0);

  // Stop: nothing is reported as executed
  await open(page, 'sdr');
  await page.getByRole('button', { name: 'Run SDR' }).first().click();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(page.getByText('SDR Campaign Executed')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run SDR' }).first()).toBeEnabled();
});

test('AutopilotControlPanel: run-agent output streams live, status refreshes after', async ({ page }) => {
  await open(page, 'autopilot');
  await page.getByPlaceholder('Enter contact UUID / ID').fill('demo-1');
  await page.getByRole('button', { name: 'Load Autopilot Status' }).click();
  await expect(page.getByRole('button', { name: 'Run SDR Step Now' })).toBeVisible();
  await page.getByRole('button', { name: 'Run SDR Step Now' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  const lens = await samples(liveLen(page), page, 4000);
  expect(grows(lens), `live card text over time: ${lens}`).toBe(true);
  await expect(page.getByText('SDR step run: step 2 executed.').or(page.getByText(/Mock autopilot status loaded/))).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0);
});

test('GTMPromptHub: generated content appears word by word via the Netlify function', async ({ page }) => {
  await open(page, 'gtm');
  await page.getByRole('button', { name: 'Generate Content' }).first().click();
  await page.getByRole('button', { name: /Cold Opener Prompt/ }).click();
  await page.getByRole('button', { name: 'Generate Content' }).last().click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  const lens = await samples(liveLen(page), page, 4500);
  expect(grows(lens), `live card text over time: ${lens}`).toBe(true);
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/Three ideas for Acme Corp/)).toBeVisible();
});

test('useEmailAI: compose, analyze and personalize all stream through the hook live state', async ({ page }) => {
  await open(page, 'emailai');
  for (const [button, final] of [['Compose email', 'Following up on our call'], ['Analyze email', 'qualityScore'], ['Personalize message', 'Series B']] as const) {
    await page.getByRole('button', { name: button }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
    const lens = await samples(liveLen(page), page, 3800);
    expect(grows(lens), `${button}: live text over time ${lens}`).toBe(true);
    await expect(page.getByTestId('email-final')).toContainText(final, { timeout: 8000 });
    await expect(page.getByTestId('email-final')).not.toContainText('ERROR');
  }
});

test('AISalesIntelligencePanel: lead-nurturing strategy streams in, then the status cards fill', async ({ page }) => {
  await open(page, 'nurture');
  await page.getByRole('button', { name: /Analyze/ }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  const lens = await samples(liveLen(page), page, 3800);
  expect(grows(lens), `live text over time ${lens}`).toBe(true);
  await page.getByRole('button', { name: 'Nurture', exact: true }).click();
  await expect(page.getByText('2/5 completed')).toBeVisible({ timeout: 8000 });
});

test('FeatureAnalysisStudio: ai-task feature-analysis streams live, final tabs render', async ({ page }) => {
  await open(page, 'feature');
  await page.getByPlaceholder(/Enter product website URL/).fill('https://acme.example');
  await page.getByRole('button', { name: /Analyze/ }).click();
  await expect(page.getByText('Searching the web…').first()).toBeVisible({ timeout: 5000 });
  const lens = await samples(liveLen(page), page, 4500);
  expect(grows(lens), `live text over time ${lens}`).toBe(true);
  await expect(page.getByText(/Acme CRM/).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0);
});

test('SDRButtonGroup (executeDealAi): edge execute-deal-ai text streams under the buttons, modal opens after', async ({ page }) => {
  await open(page, 'deal');
  await page.getByRole('button', { name: /FOLLOW UP/ }).first().click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  const lens = await samples(liveLen(page), page, 3800);
  expect(grows(lens), `live text over time ${lens}`).toBe(true);
  await expect(page.getByText('Sequence data not available')).toBeVisible({ timeout: 8000 });
});

for (const theme of ['light', 'dark'] as const) {
  test(`screenshots (${theme}): live states`, async ({ page }) => {
    await open(page, 'sdr', theme);
    await page.getByRole('button', { name: 'Run SDR' }).first().click();
    await expect(page.getByText(/Quick idea for Acme Corp/).first()).toBeVisible({ timeout: 6000 });
    await page.screenshot({ path: `${SHOTS}/callers-sdr-live-${theme}.png`, fullPage: true });

    await open(page, 'gtm', theme);
    await page.getByRole('button', { name: 'Generate Content' }).first().click();
    await page.getByRole('button', { name: /Cold Opener Prompt/ }).click();
    await page.getByRole('button', { name: 'Generate Content' }).last().click();
    await expect(page.getByText(/Subject: Three ideas/)).toBeVisible({ timeout: 6000 });
    await page.screenshot({ path: `${SHOTS}/callers-gtm-live-${theme}.png`, fullPage: true });

    await open(page, 'autopilot', theme);
    await page.getByPlaceholder('Enter contact UUID / ID').fill('demo-1');
    await page.getByRole('button', { name: 'Load Autopilot Status' }).click();
    await page.getByRole('button', { name: 'Run SDR Step Now' }).click();
    await expect(page.getByText(/Step two drafted/)).toBeVisible({ timeout: 4000 });
    await page.screenshot({ path: `${SHOTS}/callers-autopilot-live-${theme}.png`, fullPage: true });

    await open(page, 'emailai', theme);
    await page.getByRole('button', { name: 'Compose email' }).click();
    await expect(page.getByText(/Following up on our call/).first()).toBeVisible({ timeout: 6000 });
    await page.screenshot({ path: `${SHOTS}/callers-emailai-live-${theme}.png`, fullPage: true });
  });
}
