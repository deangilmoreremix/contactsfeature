import { test, expect } from '@playwright/test';

test.describe('Quick Actions & Management - 30 Second Walkthrough', () => {
  test('demonstrate contact management, editing, and quick actions', async ({ page }) => {
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

    // Demonstrate contact card selection
    const firstCard = page.locator('.contact-card').first();
    const checkbox = firstCard.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(1500);
    }

    // Demonstrate more actions dropdown on card
    const moreActionsBtn = firstCard.locator('[title="More actions"]').first();
    if (await moreActionsBtn.isVisible()) {
      await moreActionsBtn.click();
      await page.waitForTimeout(2000);

      // Show dropdown options
      await page.waitForTimeout(2000);
    }

    // Click on contact card to open detail view
    await firstCard.click();
    await page.waitForSelector('.contact-detail-modal', { state: 'visible' });

    // Demonstrate favorite toggle
    const favoriteBtn = page.locator('text=Add to Favorites').first();
    if (await favoriteBtn.isVisible()) {
      await favoriteBtn.click();
      await page.waitForTimeout(1500);
    }

    // Demonstrate edit mode toggle
    const editContactBtn = page.locator('text=Edit Contact').first();
    if (await editContactBtn.isVisible()) {
      await editContactBtn.click();
      await page.waitForTimeout(2000);
    }

    // Demonstrate inline field editing
    const firstEditableField = page.locator('input[type="text"]').first();
    if (await firstEditableField.isVisible()) {
      await firstEditableField.click();
      await page.waitForTimeout(1500);
    }

    // Demonstrate avatar upload
    const avatarUpload = page.locator('input[type="file"]').first();
    if (await avatarUpload.isVisible()) {
      // Just show the upload interface
      await page.waitForTimeout(2000);
    }

    // Demonstrate interest level editing
    const interestEditBtn = page.locator('[title="Edit"]').first();
    if (await interestEditBtn.isVisible()) {
      await interestEditBtn.click();
      await page.waitForTimeout(2000);
    }

    // Demonstrate source management
    const addSourceBtn = page.locator('text=Add source').first();
    if (await addSourceBtn.isVisible()) {
      await addSourceBtn.click();
      await page.waitForTimeout(2000);
    }

    // Demonstrate custom field addition
    const addFieldBtn = page.locator('text=Add Field').first();
    if (await addFieldBtn.isVisible()) {
      await addFieldBtn.click();
      await page.waitForTimeout(2000);
    }

    // Demonstrate quick action buttons
    const quickActions = page.locator('.p-3.flex.flex-col.items-center').first();
    if (await quickActions.isVisible()) {
      await quickActions.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Demonstrate calendar integration
    const meetBtn = page.locator('text=Meet').first();
    if (await meetBtn.isVisible()) {
      await meetBtn.click();
      await page.waitForTimeout(2000);
    }

    // Show final management interface
    await page.waitForTimeout(3000);
  });
});
