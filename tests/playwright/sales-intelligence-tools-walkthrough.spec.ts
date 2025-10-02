import { test, expect } from '@playwright/test';

test.describe('Sales Intelligence Tools - 30 Second Walkthrough', () => {
  test('demonstrate AI sales intelligence and playbook features', async ({ page }) => {
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

    // Navigate to Sales Intelligence tab
    const salesTab = page.locator('text=Sales Intelligence').first();
    if (await salesTab.isVisible()) {
      await salesTab.click();
      await page.waitForTimeout(2000);
    }

    // Show AI Sales Intelligence hero section
    const heroSection = page.locator('text=AI Sales Intelligence').first();
    if (await heroSection.isVisible()) {
      await heroSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Demonstrate Adaptive Playbook Generator
    const playbookCard = page.locator('text=Adaptive Playbook Generator').first();
    if (await playbookCard.isVisible()) {
      await playbookCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // Click generate button if available
      const generateBtn = playbookCard.locator('button').filter({ hasText: /generate/i }).first();
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // Demonstrate Communication Optimizer
    const commOptimizerCard = page.locator('text=Communication Optimizer').first();
    if (await commOptimizerCard.isVisible()) {
      await commOptimizerCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // Click optimize button if available
      const optimizeBtn = commOptimizerCard.locator('button').filter({ hasText: /optimize/i }).first();
      if (await optimizeBtn.isVisible()) {
        await optimizeBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // Demonstrate Discovery Questions Generator
    const questionsCard = page.locator('text=Discovery Questions Generator').first();
    if (await questionsCard.isVisible()) {
      await questionsCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // Click generate questions button if available
      const questionsBtn = questionsCard.locator('button').filter({ hasText: /generate|questions/i }).first();
      if (await questionsBtn.isVisible()) {
        await questionsBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // Demonstrate Deal Health Panel
    const dealHealthCard = page.locator('text=Deal Health Panel').first();
    if (await dealHealthCard.isVisible()) {
      await dealHealthCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // Click analyze button if available
      const analyzeBtn = dealHealthCard.locator('button').filter({ hasText: /analyze|run/i }).first();
      if (await analyzeBtn.isVisible()) {
        await analyzeBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // Navigate to AI Insights tab to show related features
    const aiInsightsTab = page.locator('text=AI Insights').first();
    if (await aiInsightsTab.isVisible()) {
      await aiInsightsTab.click();
      await page.waitForTimeout(2000);
    }

    // Show AI insights content
    await page.waitForTimeout(2000);

    // Final overview of all sales intelligence tools
    await page.waitForTimeout(3000);
  });
});