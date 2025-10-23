import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Contact Cards AI Walkthrough - 30 Second Demo', () => {
  test('exercise contact card AI features and capture screenshots', async ({ page }) => {
    // Prepare screenshot directory (Playwright will save screenshots from explicit calls)
    const outDir = path.join('screenshots', 'walkthroughs', 'contact-card-ai');

    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Close welcome modal if it appears
    const skipWelcomeBtn = page.locator('button').filter({ hasText: 'Skip welcome experience' }).first();
    if (await skipWelcomeBtn.isVisible({ timeout: 5000 })) {
      await skipWelcomeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Ensure contacts are visible
    await page.waitForSelector('text=Contacts', { state: 'visible' });
    await page.waitForSelector('.contact-card', { state: 'visible' });

    // Click first contact card to open detail
    const firstCard = page.locator('.contact-card').first();
    await firstCard.click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });
    await page.screenshot({ path: path.join(outDir, '01-contact-open.png'), fullPage: false });

    // Demonstrate AI Web Research
    const webResearchBtn = page.locator('[title="AI Web Research"]').first();
    if (await webResearchBtn.isVisible()) {
      await webResearchBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, '02-ai-web-research-open.png') });
      // wait for (mock) research to finish
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(outDir, '03-ai-web-research-results.png') });
    }

    // Demonstrate AI Auto-Enrich
    const autoEnrichBtn = page.locator('text=AI Auto-Enrich').first();
    if (await autoEnrichBtn.isVisible()) {
      await autoEnrichBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(outDir, '04-ai-auto-enrich.png') });
    }

    // Demonstrate Enrich tool
    const enrichBtn = page.locator('text=Enrich').first();
    if (await enrichBtn.isVisible()) {
      await enrichBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(outDir, '05-enrich-tool.png') });
    }

    // Demonstrate AI Analysis / Scoring
    const aiAnalysisBtn = page.locator('[title="AI Analysis"]').first();
    if (await aiAnalysisBtn.isVisible()) {
      await aiAnalysisBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(outDir, '06-ai-analysis.png') });
    }

    // Capture final enhanced badge / score
    const enhancedBadge = page.locator('text=Enhanced with AI').first();
    if (await enhancedBadge.isVisible()) {
      await enhancedBadge.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, '07-enhanced-badge.png') });
    }

    // Small pause to ensure all artifacts are written
    await page.waitForTimeout(1000);
  });
});
