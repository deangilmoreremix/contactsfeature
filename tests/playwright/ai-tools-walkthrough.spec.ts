import { test, expect } from '@playwright/test';

test.describe('AI Tools Walkthrough', () => {
  test('AI Email Composer walkthrough', async ({ page }) => {
    console.log('Starting AI Email Composer walkthrough');
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');
    console.log('Page loaded with app=true param');

    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 60000 });
    console.log('Contact cards are visible');

    // Open contact detail view
    await page.locator('.contact-card').first().click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Go to Email tab
    console.log('Clicking on Email tab...');
    const emailTab = page.locator('text=Email');
    if (await emailTab.isVisible()) {
      await emailTab.click();
      console.log('Clicked Email tab');
    } else {
      console.log('Email tab not visible');
    }

    // Wait for email composer to load
    await page.waitForTimeout(1000);
    console.log('Waited for email composer to load');

    // Interact with email composer - fill subject
    console.log('Looking for subject input...');
    const subjectInput = page.locator('input[placeholder*="subject"]').first();
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Follow-up on our last conversation');
      console.log('Filled subject input');
    } else {
      console.log('Subject input not visible');
    }

    // Fill email body
    console.log('Looking for body textarea...');
    const bodyTextarea = page.locator('textarea').first();
    if (await bodyTextarea.isVisible()) {
      await bodyTextarea.fill('Hi [Contact Name],\n\nI wanted to follow up on our discussion about...');
      console.log('Filled body textarea');
    } else {
      console.log('Body textarea not visible');
    }

    // Take screenshot of composed email
    await page.screenshot({
      path: 'screenshots/ai-email-composer-active.png',
      fullPage: true
    });
  });

  test('Smart Search & Filtering walkthrough', async ({ page }) => {
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible', timeout: 30000 });

    // Look for search input
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('john');
      await page.waitForTimeout(500); // Wait for search results
    }

    // Take screenshot of search results
    await page.screenshot({
      path: 'screenshots/smart-search-results.png',
      fullPage: true
    });

    // Try filtering
    const filterButton = page.locator('button').filter({ hasText: /filter/i }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
    }

    // Take screenshot of filtered results
    await page.screenshot({
      path: 'screenshots/smart-filtering-active.png',
      fullPage: true
    });
  });

  test('AI Contact Scoring walkthrough', async ({ page }) => {
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible', timeout: 30000 });

    // Open contact detail view
    console.log('Waiting for contact cards...');
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 60000 });
    console.log('Contact cards are visible');
    const contactCards = page.locator('.contact-card');
    const count = await contactCards.count();
    console.log(`Found ${count} contact cards`);
    if (count > 0) {
      await contactCards.first().click();
      console.log('Clicked on first contact card');
      await page.waitForSelector('.contact-detail-modal', { state: 'visible' });
      console.log('Contact detail modal is visible');
    } else {
      console.log('No contact cards found');
      return;
    }

    // Go to Overview tab (should show scoring)
    await page.click('text=Overview');

    // Look for scoring elements
    const scoreElement = page.locator('.score, .scoring, [data-score]').first();
    if (await scoreElement.isVisible()) {
      // Take screenshot of scoring display
      await page.screenshot({
        path: 'screenshots/ai-contact-scoring-display.png',
        fullPage: false,
        clip: await scoreElement.boundingBox() || { x: 0, y: 0, width: 400, height: 200 }
      });
    }

    // Take full screenshot of overview with scoring
    await page.screenshot({
      path: 'screenshots/contact-overview-with-scoring.png',
      fullPage: true
    });
  });

  test('AI Insights & Analytics walkthrough', async ({ page }) => {
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible', timeout: 30000 });

    // Open contact detail view
    console.log('Checking for contact cards...');
    const contactCards = page.locator('.contact-card');
    const contactCount = await contactCards.count();
    console.log(`Found ${contactCount} contact cards`);
    if (contactCount > 0) {
      await contactCards.first().click();
      console.log('Clicked on first contact card');
      await page.waitForSelector('.contact-detail-modal', { state: 'visible' });
      console.log('Contact detail modal is visible');
    } else {
      console.log('No contact cards found, cannot proceed with walkthrough');
      return;
    }

    // Go to Analytics tab
    await page.click('text=Analytics');

    // Wait for analytics to load
    await page.waitForTimeout(1000);

    // Take screenshot of analytics dashboard
    await page.screenshot({
      path: 'screenshots/ai-insights-analytics.png',
      fullPage: true
    });
  });

  test('Communication Hub walkthrough', async ({ page }) => {
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible', timeout: 30000 });

    // Open contact detail view
    await page.locator('.contact-card').first().click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Go to Communication Hub tab
    await page.click('text=Communication Hub');

    // Wait for communication hub to load
    await page.waitForTimeout(1000);

    // Take screenshot of communication hub
    await page.screenshot({
      path: 'screenshots/communication-hub-active.png',
      fullPage: true
    });
  });

  test('AI Automation Workflows walkthrough', async ({ page }) => {
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible', timeout: 30000 });

    // Open contact detail view
    await page.locator('.contact-card').first().click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Go to Automation tab
    await page.click('text=Automation');

    // Wait for automation panel to load
    await page.waitForTimeout(1000);

    // Take screenshot of automation workflows
    await page.screenshot({
      path: 'screenshots/ai-automation-workflows.png',
      fullPage: true
    });
  });

  test('Sales Intelligence walkthrough', async ({ page }) => {
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible', timeout: 30000 });

    // Open contact detail view
    await page.locator('.contact-card').first().click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Go to Sales Intelligence tab
    await page.click('text=Sales Intelligence');

    // Wait for sales intelligence to load
    await page.waitForTimeout(1000);

    // Take screenshot of sales intelligence panel
    await page.screenshot({
      path: 'screenshots/sales-intelligence-panel.png',
      fullPage: true
    });
  });

  test('Customizable AI Toolbar walkthrough', async ({ page }) => {
    await page.goto('/?app=true');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-guidance="main-app"]', { state: 'visible', timeout: 30000 });

    // Look for AI toolbar buttons
    const aiButtons = page.locator('.ai-button, .ai-tool, [data-ai-tool]');
    if (await aiButtons.first().isVisible()) {
      // Take screenshot of AI toolbar
      await page.screenshot({
        path: 'screenshots/customizable-ai-toolbar.png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 300 }
      });
    }
  });
});