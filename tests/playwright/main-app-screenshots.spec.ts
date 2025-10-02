import { test, expect } from '@playwright/test';

test.describe('Main App Screenshots', () => {
  test('capture main contacts interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The app starts with ContactsModal open
    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible' });

    // Take screenshot of main contacts interface
    await page.screenshot({
      path: 'screenshots/main-contacts-interface.png',
      fullPage: true
    });
  });

  test('capture contact detail view - overview tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Ensure Overview tab is active
    await page.click('text=Overview');

    // Take screenshot of overview tab
    await page.screenshot({
      path: 'screenshots/contact-detail-overview.png',
      fullPage: true
    });
  });

  test('capture contact detail view - journey timeline tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Click on Journey Timeline tab
    await page.click('text=Journey Timeline');

    // Wait for timeline to load
    await page.waitForTimeout(1000);

    // Take screenshot of journey timeline
    await page.screenshot({
      path: 'screenshots/contact-journey-timeline.png',
      fullPage: true
    });
  });

  test('capture contact detail view - analytics tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Click on Analytics tab
    await page.click('text=Analytics');

    // Wait for analytics to load
    await page.waitForTimeout(1000);

    // Take screenshot of analytics
    await page.screenshot({
      path: 'screenshots/contact-analytics.png',
      fullPage: true
    });
  });

  test('capture contact detail view - communication hub tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Click on Communication Hub tab
    await page.click('text=Communication Hub');

    // Wait for communication hub to load
    await page.waitForTimeout(1000);

    // Take screenshot of communication hub
    await page.screenshot({
      path: 'screenshots/contact-communication-hub.png',
      fullPage: true
    });
  });

  test('capture contact detail view - automation tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Click on Automation tab
    await page.click('text=Automation');

    // Wait for automation panel to load
    await page.waitForTimeout(1000);

    // Take screenshot of automation
    await page.screenshot({
      path: 'screenshots/contact-automation.png',
      fullPage: true
    });
  });

  test('capture contact detail view - sales intelligence tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Click on Sales Intelligence tab
    await page.click('text=Sales Intelligence');

    // Wait for sales intelligence to load
    await page.waitForTimeout(1000);

    // Take screenshot of sales intelligence
    await page.screenshot({
      path: 'screenshots/contact-sales-intelligence.png',
      fullPage: true
    });
  });

  test('capture contact detail view - AI insights tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Click on AI Insights tab
    await page.click('text=AI Insights');

    // Wait for AI insights to load
    await page.waitForTimeout(1000);

    // Take screenshot of AI insights
    await page.screenshot({
      path: 'screenshots/contact-ai-insights.png',
      fullPage: true
    });
  });

  test('capture contact detail view - email tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a contact card to open detail view
    await page.locator('.contact-card').first().click();

    // Wait for detail view to open
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Click on Email tab
    await page.click('text=Email');

    // Wait for email panel to load
    await page.waitForTimeout(1000);

    // Take screenshot of email panel
    await page.screenshot({
      path: 'screenshots/contact-email-panel.png',
      fullPage: true
    });
  });

  test('capture customizable AI toolbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for AI toolbar - it might be in the contact detail view or main interface
    // Take screenshot of the area where AI toolbar appears
    await page.screenshot({
      path: 'screenshots/ai-toolbar.png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 400, height: 200 }
    });
  });
});