import { test, expect } from '@playwright/test';

test.describe('Contact Detail Overview - 30 Second Walkthrough', () => {
  test('demonstrate contact detail tabs, editing, and social profiles', async ({ page }) => {
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
    await page.waitForSelector('[data-testid="contact-card"]', { state: 'visible' });
    await page.locator('[data-testid="contact-card"]').first().click();

    // Wait for contact detail modal to open
    await page.waitForSelector('[data-testid="contact-detail-modal"]', { state: 'visible' });

    // Show profile header with AI score and enhancement indicators
    await page.waitForTimeout(2000);

    // Navigate through tabs with longer pauses
    const tabMappings = {
      'Journey': 'journey-tab',
      'Analytics': 'analytics-tab',
      'Communication': 'communication-tab',
      'Automation': 'automation-tab',
      'Sales Intelligence': 'sales-intelligence-tab',
      'AI Insights': 'ai-insights-tab',
      'Email': 'email-tab'
    };

    for (const [tabName, tabId] of Object.entries(tabMappings)) {
      const tab = page.locator(`[data-testid="${tabId}"]`);
      if (await tab.isVisible({ timeout: 1000 })) {
        await tab.click();
        await page.waitForTimeout(1500); // Allow tab content to load
      }
    }

    // Go back to Overview tab
    const overviewTab = page.locator('[data-testid="overview-tab"]');
    if (await overviewTab.isVisible({ timeout: 1000 })) {
      await overviewTab.click();
      await page.waitForTimeout(500);
    }

    // Demonstrate inline editing - click edit button
    const editBtn = page.locator('[data-testid="edit-contact-button"]');
    if (await editBtn.isVisible({ timeout: 1000 })) {
      await editBtn.hover();
      await page.waitForTimeout(500);
      await editBtn.click();
      await page.waitForTimeout(1500);

      // Show editable fields with visible typing
      const emailField = page.locator('input[type="email"]').first();
      if (await emailField.isVisible()) {
        await emailField.click();
        await page.waitForTimeout(500);
        // Clear and type new email
        await emailField.clear();
        await emailField.type('new.contact@company.com', { delay: 100 });
        await page.waitForTimeout(1500);
      }

      // Edit phone number
      const phoneField = page.locator('input[type="tel"]').first();
      if (await phoneField.isVisible()) {
        await phoneField.click();
        await page.waitForTimeout(500);
        await phoneField.clear();
        await phoneField.type('+1 555 012 3456', { delay: 120 });
        await page.waitForTimeout(1500);
      }

      // Show social profiles section
      const socialsSection = page.locator('text=Social Profiles').first();
      if (await socialsSection.isVisible()) {
        await socialsSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2000);
      }

      // Demonstrate adding social profile
      const addSocialBtn = page.locator('text=Add LinkedIn').first();
      if (await addSocialBtn.isVisible()) {
        await addSocialBtn.click();
        await page.waitForTimeout(2000);
      }

      // Show custom fields section
      const customFieldsSection = page.locator('text=Custom Fields').first();
      if (await customFieldsSection.isVisible()) {
        await customFieldsSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2000);
      }

      // Demonstrate adding custom field
      const addFieldBtn = page.locator('text=Add Field').first();
      if (await addFieldBtn.isVisible()) {
        await addFieldBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Show interest level editing
    const interestLevel = page.locator('text=Interest Level').first();
    if (await interestLevel.isVisible()) {
      await interestLevel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Show sources management
    const sourcesSection = page.locator('text=Lead Information').first();
    if (await sourcesSection.isVisible()) {
      await sourcesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Final view of complete contact detail
    await page.waitForTimeout(3000);
  });
});
