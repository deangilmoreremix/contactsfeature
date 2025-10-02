import { test, expect } from '@playwright/test';

test.describe('Communication & Email Features - 30 Second Walkthrough', () => {
  test('demonstrate email composition, communication hub, and messaging tools', async ({ page }) => {
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

    // Navigate to Email tab
    const emailTab = page.locator('text=Email').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(2000);
    }

    // Demonstrate email composition with visible typing
    const subjectInput = page.locator('input[placeholder*="subject"]').first();
    if (await subjectInput.isVisible()) {
      // Click and type subject character by character for visibility
      await subjectInput.click();
      await page.waitForTimeout(500);
      await subjectInput.type('Follow-up on our discussion', { delay: 100 });
      await page.waitForTimeout(1000);
    }

    const bodyTextarea = page.locator('textarea').first();
    if (await bodyTextarea.isVisible()) {
      // Click and type email body with realistic typing delays
      await bodyTextarea.click();
      await page.waitForTimeout(500);
      await bodyTextarea.type('Hi there,', { delay: 150 });
      await page.waitForTimeout(300);
      await bodyTextarea.type('\n\nI wanted to follow up on our conversation about your needs.', { delay: 80 });
      await page.waitForTimeout(500);
      await bodyTextarea.type(' Based on what you shared, I think our solution would be perfect for your team.', { delay: 80 });
      await page.waitForTimeout(500);
      await bodyTextarea.type('\n\nWhen would be a good time to schedule a demo?', { delay: 100 });
      await page.waitForTimeout(500);
      await bodyTextarea.type('\n\nBest regards,', { delay: 120 });
      await page.waitForTimeout(300);
      await bodyTextarea.type('\nSales Team', { delay: 100 });
      await page.waitForTimeout(1500);
    }

    // Show email preview or composition interface
    await page.waitForTimeout(2000);

    // Navigate to Communication tab
    const commTab = page.locator('text=Communication').first();
    if (await commTab.isVisible()) {
      await commTab.click();
      await page.waitForTimeout(2000);
    }

    // Demonstrate communication hub features
    await page.waitForTimeout(2000);

    // Go back to overview to show quick email action
    const overviewTab = page.locator('text=Overview').first();
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(1000);
    }

    // Demonstrate quick email button in header
    const emailBtn = page.locator('text=Email').first();
    if (await emailBtn.isVisible()) {
      await emailBtn.click();
      await page.waitForTimeout(2000);
    }

    // Demonstrate call button
    const callBtn = page.locator('text=Call').first();
    if (await callBtn.isVisible()) {
      await callBtn.click();
      await page.waitForTimeout(2000);
    }

    // Show social communication platforms
    const socialPlatforms = page.locator('.p-2.rounded-lg').first();
    if (await socialPlatforms.isVisible()) {
      await socialPlatforms.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Demonstrate WhatsApp/LinkedIn/Twitter integration
    const whatsappBtn = page.locator('[title*="WhatsApp"]').first();
    if (await whatsappBtn.isVisible()) {
      await whatsappBtn.click();
      await page.waitForTimeout(2000);
    }

    // Final view of communication options
    await page.waitForTimeout(3000);
  });
});