import { test, expect } from '@playwright/test';

test.describe('Full Demo Walkthrough', () => {
  test('complete user journey from contacts module to advanced features', async ({ page }) => {
    // Start on contacts module (default view)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Skip welcome experience if present
    const skipButton = page.locator('button[aria-label="Skip welcome experience"]').first();
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    // Wait for contacts modal to load
    await page.waitForSelector('text=Contacts', { state: 'visible' });

    // Take initial contacts interface screenshot
    await page.screenshot({
      path: 'walkthrough/01-contacts-interface.png',
      fullPage: true
    });

    // Open first contact detail view
    await page.locator('.contact-card').first().click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Screenshot overview tab
    await page.screenshot({
      path: 'walkthrough/02-contact-overview.png',
      fullPage: true
    });

    // Navigate through all tabs
    const tabs = ['Journey Timeline', 'Analytics', 'Communication Hub', 'Automation', 'Sales Intelligence', 'AI Insights', 'Email'];

    for (let i = 0; i < tabs.length; i++) {
      await page.click(`text=${tabs[i]}`);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `walkthrough/0${3 + i}-contact-${tabs[i].toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      });
    }

    // Demonstrate AI Email Composer in action
    await page.click('text=Email');
    await page.waitForTimeout(500);

    // Fill in email details
    const subjectInput = page.locator('input[placeholder*="subject"]').first();
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Product Demo Follow-up');
    }

    const bodyTextarea = page.locator('textarea').first();
    if (await bodyTextarea.isVisible()) {
      await bodyTextarea.fill('Hi there,\n\nThank you for your interest in our AI-powered contact management platform. I\'d like to schedule a personalized demo to show you how our advanced AI features can transform your sales process.\n\nWhen would be a good time for us to connect?\n\nBest regards,\nSales Team');
    }

    await page.screenshot({
      path: 'walkthrough/10-ai-email-composed.png',
      fullPage: true
    });

    // Close contact detail and demonstrate search
    await page.click('text=×'); // Close contact detail modal
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('manager');
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'walkthrough/11-search-results.png',
        fullPage: true
      });
    }

    // Demonstrate filtering
    const filterButton = page.locator('button').filter({ hasText: /filter/i }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'walkthrough/12-filter-options.png',
        fullPage: true
      });
    }

    // Final comprehensive screenshot
    await page.screenshot({
      path: 'walkthrough/13-complete-contacts-demo.png',
      fullPage: true
    });
  });

  test('contacts module feature exploration', async ({ page }) => {
    // Start on contacts module (default view)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Skip welcome experience if present
    const skipButton = page.locator('button[aria-label="Skip welcome experience"]').first();
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    // Wait for contacts modal to load
    await page.waitForSelector('text=Contacts', { state: 'visible' });

    // Take initial screenshot
    await page.screenshot({
      path: 'walkthrough/contacts-initial.png',
      fullPage: true
    });

    // Test search functionality
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('john');
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'walkthrough/contacts-search.png',
        fullPage: true
      });
    }

    // Test filter functionality
    const filterBtn = page.locator('button').filter({ hasText: /filter/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'walkthrough/contacts-filter.png',
        fullPage: true
      });
    }

    // Test sort functionality
    const sortSelect = page.locator('select').first();
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('score-desc');
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'walkthrough/contacts-sort.png',
        fullPage: true
      });
    }

    // Final contacts overview
    await page.screenshot({
      path: 'walkthrough/contacts-complete.png',
      fullPage: true
    });
  });
});