import { test } from '@playwright/test';
import { startAiSweepDrip } from './helpers/aiSweepDrip';
test('recon', async ({ page }) => {
  const s = await startAiSweepDrip(5312);
  await page.goto('/');
  await page.waitForTimeout(2500);
  const skip = page.locator('button').filter({ hasText: 'Skip welcome experience' }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.locator('h3').nth(1).click({ force: true });
  await page.waitForSelector('[data-testid="overview-tab"]');
  for (const t of ['overview','sales-intelligence','email','sdr-agents','communication','agents','ai-insights','playbooks','analytics','automation']) {
    await page.locator(`[data-testid="${t}-tab"]`).click({ force: true });
    await page.waitForTimeout(1500);
    const bs = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="overview-tab"]')!.closest('div[class*="flex"]')!.parentElement!.parentElement!;
      return [...root.querySelectorAll('button, [role=button], [role=tab]')].filter((e: any) => !e.closest('nav') && e.offsetParent).map((e: any) => (e.disabled ? '[D]' : '') + (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + (e.dataset.testid ? `{${e.dataset.testid}}` : ''));
    });
    console.log('=== ' + t + ': ' + bs.join(' ; '));
  }
  s.close();
});
