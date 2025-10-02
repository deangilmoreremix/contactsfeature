import { test, expect } from '@playwright/test';

test.describe('AI Web Research & Enrichment - 30 Second Walkthrough', () => {
  test('demonstrate AI web research, enrichment, and citation features', async ({ page }) => {
    // Navigate to contacts page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Handle welcome experience modal if present
    const skipWelcomeBtn = page.locator('button').filter({ hasText: 'Skip welcome experience' }).first();
    if (await skipWelcomeBtn.isVisible({ timeout: 5000 })) {
      await skipWelcomeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for contacts modal to load
    await page.waitForSelector('text=Contacts', { state: 'visible' });

    // Wait for contacts to load and click first contact
    await page.waitForSelector('.contact-card', { state: 'visible' });
    await page.locator('.contact-card').first().click();

    // Wait for contact detail modal to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Demonstrate AI Web Research button
    const webResearchBtn = page.locator('[title="AI Web Research"]').first();
    if (await webResearchBtn.isVisible()) {
      await webResearchBtn.click();

      // Wait for research overlay to appear
      await page.waitForTimeout(2000);

      // Show research progress (mock data should be fast)
      await page.waitForTimeout(5000);

      // Show research results/citations
      await page.waitForTimeout(2000);
    }

    // Demonstrate AI Auto-Enrich button
    const autoEnrichBtn = page.locator('text=AI Auto-Enrich').first();
    if (await autoEnrichBtn.isVisible()) {
      await autoEnrichBtn.click();

      // Wait for enrichment process
      await page.waitForTimeout(4000);

      // Show enrichment results
      await page.waitForTimeout(2000);
    }

    // Show enhanced contact data
    const enhancedBadge = page.locator('text=Enhanced with AI').first();
    if (await enhancedBadge.isVisible()) {
      await enhancedBadge.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Demonstrate individual AI tools
    const enrichBtn = page.locator('text=Enrich').first();
    if (await enrichBtn.isVisible()) {
      await enrichBtn.click();
      await page.waitForTimeout(3000);
    }

    // Show research status overlay if visible
    const researchOverlay = page.locator('.research-status-overlay').first();
    if (await researchOverlay.isVisible()) {
      await page.waitForTimeout(2000);
    }

    // Demonstrate AI Analysis button
    const aiAnalysisBtn = page.locator('[title="AI Analysis"]').first();
    if (await aiAnalysisBtn.isVisible()) {
      await aiAnalysisBtn.click();

      // Wait for analysis completion
      await page.waitForTimeout(4000);

      // Show updated AI score
      await page.waitForTimeout(2000);
    }

    // Show final enhanced contact with all AI features
    const aiScore = page.locator('.h-7.w-7.rounded-full').first();
    if (await aiScore.isVisible()) {
      await aiScore.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Final view of AI-enhanced contact
    await page.waitForTimeout(3000);
  });
});