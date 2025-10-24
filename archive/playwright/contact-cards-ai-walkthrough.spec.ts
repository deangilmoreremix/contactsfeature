import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Contact Cards AI Walkthrough', () => {
  test('exercise AI features on a contact card and take screenshots', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss welcome if present
    const skipWelcomeBtn = page.locator('button').filter({ hasText: 'Skip welcome experience' }).first();
    if (await skipWelcomeBtn.isVisible({ timeout: 5000 })) {
      await skipWelcomeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for contact cards
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 10000 });

    // Ensure screenshot directory exists
    const shotsDir = path.join(process.cwd(), 'screenshots', 'contact-cards-ai');
    try { fs.mkdirSync(shotsDir, { recursive: true }); } catch (e) { /* ignore */ }

    const firstCard = page.locator('.contact-card').first();
    await firstCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${shotsDir}/01-contacts-list.png` });

    // Open first contact
    await firstCard.click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible', timeout: 8000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${shotsDir}/02-contact-detail.png` });

    // Try to open AI tools panel (try several possible labels)
    const aiButtons = [ 'AI Tools', 'AI', 'Enrich', 'Analyze', 'Tools' ];
    for (const label of aiButtons) {
      const btn = page.locator('button').filter({ hasText: label }).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${shotsDir}/03-ai-panel-${label.replace(/\s+/g, '-')}.png` });
        break;
      }
    }

    // Try to run an 'Enrich' or 'Score' action
    const actionLabels = [ 'Enrich', 'Enrich contact', 'Score', 'Run analysis', 'Analyze' ];
    for (const label of actionLabels) {
      const btn = page.locator('button').filter({ hasText: label }).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        // Allow time for AI to run / UI to update
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${shotsDir}/04-action-${label.replace(/\s+/g, '-')}.png` });
        break;
      }
    }

    // Capture final state
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${shotsDir}/05-final.png` });
  });
});
