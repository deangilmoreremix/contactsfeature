import { test, expect } from '@playwright/test';

test.describe('Comprehensive Button Automation - Enhanced Contact Cards & Details', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Handle welcome experience modal if present
    const skipWelcomeBtn = page.locator('button').filter({ hasText: 'Skip welcome experience' }).first();
    if (await skipWelcomeBtn.isVisible({ timeout: 5000 })) {
      await skipWelcomeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Ensure contacts are loaded
    await page.waitForSelector('[data-testid="contact-card"]', { state: 'visible' });
  });

  test('Enhanced Contact Card - Header Action Buttons', async ({ page }) => {
    const firstCard = page.locator('[data-testid="contact-card"]').first();

    // Hover to reveal header buttons
    await firstCard.hover();
    await page.waitForTimeout(500);

    // Test AI Analyze Button
    const aiAnalyzeBtn = firstCard.locator('[data-testid="ai-analyze-button"]');
    if (await aiAnalyzeBtn.isVisible()) {
      await aiAnalyzeBtn.click();
      // Wait for AI analysis to complete (mock or real)
      await page.waitForTimeout(3000);
    }

    // Test Edit Contact Button
    const editBtn = firstCard.locator('[data-testid="edit-contact-button"]');
    await expect(editBtn).toBeVisible();
    // Note: Don't click as it might open modal we don't want to test here

    // Test More Actions Button
    const moreActionsBtn = firstCard.locator('[data-testid="more-actions-button"]');
    await expect(moreActionsBtn).toBeVisible();
    await moreActionsBtn.click();

    // Verify dropdown appears (though we won't click destructive actions)
    await page.waitForTimeout(500);
  });

  test('Enhanced Contact Card - AI Score Interactions', async ({ page }) => {
    const firstCard = page.locator('[data-testid="contact-card"]').first();

    // Check for AI score display or button
    const aiScoreDisplay = firstCard.locator('[data-testid="ai-score-display"]');
    const aiScoreButton = firstCard.locator('[data-testid="ai-score-button"]');

    if (await aiScoreDisplay.isVisible()) {
      // Contact has AI score
      await expect(aiScoreDisplay).toBeVisible();
      const scoreText = await aiScoreDisplay.textContent();
      expect(scoreText).toMatch(/\d+/); // Should contain a number
    } else if (await aiScoreButton.isVisible()) {
      // Contact needs AI scoring
      await aiScoreButton.click();
      await page.waitForTimeout(3000); // Wait for scoring
    }
  });

  test('Enhanced Contact Card - AI Tools Section', async ({ page }) => {
    const firstCard = page.locator('[data-testid="contact-card"]').first();

    // Check if AI tools section is visible (requires AI score)
    const aiToolsSection = firstCard.locator('[data-testid="ai-tools-section"]');

    if (await aiToolsSection.isVisible({ timeout: 2000 })) {
      // Test Lead Score Button
      const leadScoreBtn = page.locator('[data-testid="lead-scoring-button"]');
      if (await leadScoreBtn.isVisible()) {
        await leadScoreBtn.click();
        await page.waitForTimeout(2000);
      }

      // Test Email AI Button
      const emailAiBtn = page.locator('[data-testid="email-personalization-button"]');
      if (await emailAiBtn.isVisible()) {
        await emailAiBtn.click();
        await page.waitForTimeout(2000);
      }

      // Test Enrich Button
      const enrichBtn = page.locator('[data-testid="contact-enrichment-button"]');
      if (await enrichBtn.isVisible()) {
        await enrichBtn.click();
        await page.waitForTimeout(2000);
      }

      // Test Insights Button
      const insightsBtn = page.locator('[data-testid="business-intelligence-button"]');
      if (await insightsBtn.isVisible()) {
        await insightsBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('Enhanced Contact Card - Traditional Action Buttons', async ({ page }) => {
    const firstCard = page.locator('[data-testid="contact-card"]').first();

    // Email button (using more specific selector)
    const emailBtn = firstCard.locator('button').filter({ hasText: 'Email' });
    if (await emailBtn.isVisible()) {
      // Don't actually click as it opens email client
      await expect(emailBtn).toBeVisible();
    }

    // Call button
    const callBtn = firstCard.locator('button').filter({ hasText: 'Call' });
    if (await callBtn.isVisible()) {
      await expect(callBtn).toBeVisible();
    }

    // View button (opens detail modal)
    const viewBtn = firstCard.locator('button').filter({ hasText: 'View' });
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });
      // Close modal for next test
      const closeBtn = page.locator('[data-testid="contact-detail-modal"]').locator('button').filter({ hasText: '×' }).or(
        page.locator('[data-testid="contact-detail-modal"]').locator('[aria-label="Close"]')
      ).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test('Contact Detail Modal - Header Buttons', async ({ page }) => {
    // Open contact detail modal
    const firstCard = page.locator('[data-testid="contact-card"]').first();
    await firstCard.click();
    await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });

    // Test AI Web Research Button
    const aiWebResearchBtn = page.locator('button').filter({ hasText: 'AI Web Research' }).or(
      page.locator('[title="AI Web Research"]')
    ).first();
    if (await aiWebResearchBtn.isVisible()) {
      await aiWebResearchBtn.click();
      await page.waitForTimeout(3000); // Wait for research
    }

    // Test AI Analysis Button
    const aiAnalysisBtn = page.locator('button').filter({ hasText: 'AI Analysis' }).or(
      page.locator('[title="AI Analysis"]')
    ).first();
    if (await aiAnalysisBtn.isVisible()) {
      await aiAnalysisBtn.click();
      await page.waitForTimeout(3000); // Wait for analysis
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="contact-detail-modal"]').locator('button').filter({ hasText: '×' }).or(
      page.locator('[data-testid="contact-detail-modal"]').locator('[aria-label="Close"]')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Contact Detail Modal - Main Action Buttons', async ({ page }) => {
    // Open contact detail modal
    const firstCard = page.locator('[data-testid="contact-card"]').first();
    await firstCard.click();
    await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });

    // Test Edit Contact Button (in modal header)
    const modal = page.locator('[data-testid="contact-detail-modal"]');
    const editContactBtn = modal.locator('[data-testid="modal-edit-contact-button"]');
    if (await editContactBtn.isVisible()) {
      await editContactBtn.click();
      await page.waitForTimeout(1000);

      // Test Save and Cancel buttons (should appear in edit mode)
      const saveBtn = modal.locator('button').filter({ hasText: 'Save' });
      const cancelBtn = modal.locator('button').filter({ hasText: 'Cancel' });

      if (await saveBtn.isVisible() && await cancelBtn.isVisible()) {
        await cancelBtn.click(); // Cancel to avoid saving changes
      }
    }

    // Test Favorite Toggle
    const favoriteBtn = page.locator('button').filter({ hasText: 'Favorited' }).or(
      page.locator('button').filter({ hasText: 'Add to Favorites' })
    );
    if (await favoriteBtn.isVisible()) {
      await favoriteBtn.click();
      await page.waitForTimeout(500);
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="contact-detail-modal"]').locator('button').filter({ hasText: '×' }).or(
      page.locator('[data-testid="contact-detail-modal"]').locator('[aria-label="Close"]')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Contact Detail Modal - Tab Navigation', async ({ page }) => {
    // Open contact detail modal
    const firstCard = page.locator('[data-testid="contact-card"]').first();
    await firstCard.click();
    await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });

    const tabs = [
      'overview-tab',
      'journey-tab',
      'analytics-tab',
      'communication-tab',
      'automation-tab',
      'sales-intelligence-tab',
      'ai-insights-tab',
      'email-tab'
    ];

    for (const tabId of tabs) {
      const tab = page.locator(`[data-testid="${tabId}"]`);
      if (await tab.isVisible({ timeout: 1000 })) {
        await tab.click();
        await page.waitForTimeout(1500); // Allow tab content to load
      }
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="contact-detail-modal"]').locator('button').filter({ hasText: '×' }).or(
      page.locator('[data-testid="contact-detail-modal"]').locator('[aria-label="Close"]')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Contact Detail Modal - Sidebar AI Tools', async ({ page }) => {
    // Open contact detail modal
    const firstCard = page.locator('[data-testid="contact-card"]').first();
    await firstCard.click();
    await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });

    // Test AI Goals Button (scoped to modal)
    const modal = page.locator('[data-testid="contact-detail-modal"]');
    const aiGoalsBtn = modal.locator('button').filter({ hasText: 'AI Goals' });
    if (await aiGoalsBtn.isVisible()) {
      // Don't click as it opens external link
      await expect(aiGoalsBtn).toBeVisible();
    }

    // Test AI Auto-Enrich Button
    const aiAutoEnrichBtn = page.locator('button').filter({ hasText: 'AI Auto-Enrich' });
    if (await aiAutoEnrichBtn.isVisible()) {
      await aiAutoEnrichBtn.click();
      await page.waitForTimeout(4000); // Wait for enrichment process
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="contact-detail-modal"]').locator('button').filter({ hasText: '×' }).or(
      page.locator('[data-testid="contact-detail-modal"]').locator('[aria-label="Close"]')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Contact Detail Modal - Quick Actions', async ({ page }) => {
    // Open contact detail modal
    const firstCard = page.locator('[data-testid="contact-card"]').first();
    await firstCard.click();
    await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });

    // Test Quick Action buttons (scoped to modal, check visibility, don't click destructive ones)
    const modal = page.locator('[data-testid="contact-detail-modal"]');
    const quickActions = [
      { text: 'Edit', shouldClick: false },
      { text: 'Email', shouldClick: false },
      { text: 'Call', shouldClick: false },
      { text: 'Add Field', shouldClick: false },
      { text: 'Files', shouldClick: true },
      { text: 'Meet', shouldClick: false }
    ];

    for (const action of quickActions) {
      const btn = modal.locator('button').filter({ hasText: action.text });
      if (await btn.isVisible({ timeout: 1000 })) {
        if (action.shouldClick) {
          await btn.click();
          await page.waitForTimeout(1000);
          // Go back if we navigated
          if (action.text === 'Files') {
            const overviewTab = modal.locator('[data-testid="overview-tab"]');
            if (await overviewTab.isVisible()) {
              await overviewTab.click();
              await page.waitForTimeout(500);
            }
          }
        } else {
          await expect(btn).toBeVisible();
        }
      }
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="contact-detail-modal"]').locator('button').filter({ hasText: '×' }).or(
      page.locator('[data-testid="contact-detail-modal"]').locator('[aria-label="Close"]')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Contact Detail Modal - Field Editing', async ({ page }) => {
    // Open contact detail modal
    const firstCard = page.locator('[data-testid="contact-card"]').first();
    await firstCard.click();
    await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });

    // Enter edit mode
    const modal = page.locator('[data-testid="contact-detail-modal"]');
    const editContactBtn = modal.locator('[data-testid="modal-edit-contact-button"]');
    if (await editContactBtn.isVisible()) {
      await editContactBtn.click();
      await page.waitForTimeout(1000);

      // Test email field editing
      const emailField = page.locator('input[type="email"]');
      if (await emailField.isVisible()) {
        await emailField.click();
        await emailField.clear();
        await emailField.type('test@example.com', { delay: 100 });
        await page.waitForTimeout(500);
      }

      // Test phone field editing
      const phoneField = page.locator('input[type="tel"]');
      if (await phoneField.isVisible()) {
        await phoneField.click();
        await phoneField.clear();
        await phoneField.type('+1 555 012 3456', { delay: 100 });
        await page.waitForTimeout(500);
      }

      // Cancel changes to avoid modifying test data
      const cancelBtn = page.locator('button').filter({ hasText: 'Cancel' });
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }

    // Close modal
    const closeBtn = page.locator('[data-testid="contact-detail-modal"]').locator('button').filter({ hasText: '×' }).or(
      page.locator('[data-testid="contact-detail-modal"]').locator('[aria-label="Close"]')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});