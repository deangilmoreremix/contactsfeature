import { test, expect } from '@playwright/test';

test.describe('Contact Card AI Features - 30 Second Walkthrough', () => {
  test('demonstrate AI scoring, insights, and tools on contact cards', async ({ page }) => {
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

    // Wait for contacts to load
    await page.waitForSelector('.contact-card', { state: 'visible' });

    // Start recording - focus on first contact card
    const firstCard = page.locator('[data-testid="contact-card"]').first();
    await firstCard.hover();

    // Wait for AI elements to appear on hover
    await page.waitForTimeout(1000);

    // Demonstrate AI Analysis button click with visible interaction
    const aiButton = firstCard.locator('[data-testid="ai-analyze-button"]');
    if (await aiButton.isVisible({ timeout: 2000 })) {
      // Move mouse to button to show hover effect
      await aiButton.hover();
      await page.waitForTimeout(500);

      // Click the button
      await aiButton.click();

      // Wait for AI analysis to complete (mock data should be fast)
      await page.waitForTimeout(3000);

      // Show AI score appearing with visual feedback
      const aiScore = firstCard.locator('[data-testid="ai-score-display"]');
      if (await aiScore.isVisible({ timeout: 2000 })) {
        await aiScore.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
      }
    }

    // Demonstrate AI Insights section
    const insightsSection = firstCard.locator('[data-testid="ai-insights-section"]');
    if (await insightsSection.isVisible({ timeout: 2000 })) {
      await insightsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Demonstrate AI Tools toolbar
    const aiToolsSection = firstCard.locator('[data-testid="ai-tools-section"]');
    if (await aiToolsSection.isVisible({ timeout: 2000 })) {
      await aiToolsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // Click Lead Score button
      const leadScoreBtn = page.locator('[data-testid="lead-scoring-button"]');
      if (await leadScoreBtn.isVisible({ timeout: 1000 })) {
        await leadScoreBtn.click();
        await page.waitForTimeout(2000);
      }

      // Click Email AI button
      const emailAiBtn = page.locator('[data-testid="email-personalization-button"]');
      if (await emailAiBtn.isVisible({ timeout: 1000 })) {
        await emailAiBtn.click();
        await page.waitForTimeout(2000);
      }

      // Click Enrich button
      const enrichBtn = page.locator('[data-testid="contact-enrichment-button"]');
      if (await enrichBtn.isVisible({ timeout: 1000 })) {
        await enrichBtn.click();
        await page.waitForTimeout(2000);
      }

      // Click Insights button
      const insightsBtn = page.locator('[data-testid="business-intelligence-button"]');
      if (await insightsBtn.isVisible({ timeout: 1000 })) {
        await insightsBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Demonstrate interest level visualization
    const interestDots = firstCard.locator('.w-1\\.5').first();
    if (await interestDots.isVisible()) {
      await interestDots.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Demonstrate source tags
    const sourceTags = firstCard.locator('.px-2.py-1.rounded-md').first();
    if (await sourceTags.isVisible()) {
      await sourceTags.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Demonstrate more actions dropdown
    const moreActionsBtn = firstCard.locator('[data-testid="more-actions-button"]');
    if (await moreActionsBtn.isVisible({ timeout: 1000 })) {
      await moreActionsBtn.click();
      await page.waitForTimeout(1000);
    }

    // Final hover to show all interactive elements
    await firstCard.hover();
    await page.waitForTimeout(3000);
  });
});