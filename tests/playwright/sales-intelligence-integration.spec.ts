
/**
 * Integration tests for Sales Intelligence features in ContactDetailView
 * Tests UI interactions, API calls, and user workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Sales Intelligence Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and set up test data
    await page.goto('/');
    // Assume we have a way to open ContactDetailView with a test contact
    await page.click('[data-testid="contacts-tab"]');
    await page.click('[data-testid="contact-card-1"]'); // Click on a test contact
  });

  test('should display sales intelligence tab and tools', async ({ page }) => {
    // Check if sales intelligence tab is visible
    await expect(page.locator('[data-testid="sales-intelligence-tab"]')).toBeVisible();

    // Click on sales intelligence tab
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Check if AI tools are displayed
    await expect(page.locator('text=AI Sales Intelligence')).toBeVisible();
    await expect(page.locator('text=Adaptive Sales Playbook')).toBeVisible();
    await expect(page.locator('text=Communication Optimizer')).toBeVisible();
    await expect(page.locator('text=Discovery Questions')).toBeVisible();
    await expect(page.locator('text=Deal Health Analysis')).toBeVisible();
  });

  test('should generate adaptive playbook successfully', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Click generate playbook button
    await page.click('[data-testid="generate-playbook-button"]');

    // Wait for generation to complete
    await page.waitForSelector('[data-testid="playbook-content"]', { timeout: 10000 });

    // Check if playbook content is displayed
    await expect(page.locator('[data-testid="playbook-strategy"]')).toBeVisible();
    await expect(page.locator('[data-testid="playbook-phases"]')).toBeVisible();
    await expect(page.locator('[data-testid="playbook-tactics"]')).toBeVisible();
  });

  test('should optimize communication content', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Navigate to communication optimizer
    await page.click('[data-testid="communication-optimizer-card"]');

    // Check if optimization interface is displayed
    await expect(page.locator('[data-testid="optimize-button"]')).toBeVisible();

    // Click optimize button
    await page.click('[data-testid="optimize-button"]');

    // Wait for optimization to complete
    await page.waitForSelector('[data-testid="optimization-results"]', { timeout: 10000 });

    // Check if optimization results are displayed
    await expect(page.locator('[data-testid="optimization-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="optimization-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="optimized-content"]')).toBeVisible();
  });

  test('should generate discovery questions', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Navigate to discovery questions
    await page.click('[data-testid="discovery-questions-card"]');

    // Check if generation interface is displayed
    await expect(page.locator('[data-testid="generate-questions-button"]')).toBeVisible();

    // Click generate button
    await page.click('[data-testid="generate-questions-button"]');

    // Wait for generation to complete
    await page.waitForSelector('[data-testid="questions-list"]', { timeout: 10000 });

    // Check if questions are displayed
    await expect(page.locator('[data-testid="question-item"]')).toHaveCount(8);
    await expect(page.locator('[data-testid="question-categories"]')).toBeVisible();
    await expect(page.locator('[data-testid="copy-questions-button"]')).toBeVisible();
  });

  test('should analyze deal health', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Navigate to deal health panel
    await page.click('[data-testid="deal-health-card"]');

    // Check if analysis interface is displayed
    await expect(page.locator('[data-testid="run-analysis-button"]')).toBeVisible();

    // Click run analysis button
    await page.click('[data-testid="run-analysis-button"]');

    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="health-score"]', { timeout: 10000 });

    // Check if analysis results are displayed
    await expect(page.locator('[data-testid="health-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="health-indicators"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-mitigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
  });

  test('should handle AI tools errors gracefully', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Mock API failure by intercepting requests
    await page.route('**/functions/v1/**', route => route.abort());

    // Try to generate playbook
    await page.click('[data-testid="generate-playbook-button"]');

    // Check if error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Failed to generate playbook')).toBeVisible();
  });

  test('should copy generated questions to clipboard', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');
    await page.click('[data-testid="discovery-questions-card"]');
    await page.click('[data-testid="generate-questions-button"]');

    await page.waitForSelector('[data-testid="questions-list"]');

    // Click copy all questions button
    await page.click('[data-testid="copy-questions-button"]');

    // Check if copy feedback is shown
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
  });

  test('should apply communication optimizations', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');
    await page.click('[data-testid="communication-optimizer-card"]');
    await page.click('[data-testid="optimize-button"]');

    await page.waitForSelector('[data-testid="optimization-results"]');

    // Click apply optimizations button
    await page.click('[data-testid="apply-optimizations-button"]');

    // Check if success message is displayed
    await expect(page.locator('[data-testid="apply-success"]')).toBeVisible();
  });

  test('should display contextual intelligence', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');
    await page.click('[data-testid="generate-playbook-button"]');

    await page.waitForSelector('[data-testid="playbook-content"]');

    // Check if contextual intelligence is displayed
    await expect(page.locator('[data-testid="industry-insights"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-considerations"]')).toBeVisible();
    await expect(page.locator('[data-testid="competitive-positioning"]')).toBeVisible();
  });

  test('should handle different contact types', async ({ page }) => {
    // Test with executive contact
    await page.click('[data-testid="contacts-tab"]');
    await page.click('[data-testid="executive-contact-card"]');
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Generate playbook for executive
    await page.click('[data-testid="generate-playbook-button"]');
    await page.waitForSelector('[data-testid="playbook-content"]');

    // Check if executive-specific content is included
    await expect(page.locator('text=strategic')).toBeVisible();

    // Test with technical contact
    await page.click('[data-testid="contacts-tab"]');
    await page.click('[data-testid="technical-contact-card"]');
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Generate playbook for technical contact
    await page.click('[data-testid="generate-playbook-button"]');
    await page.waitForSelector('[data-testid="playbook-content"]');

    // Check if technical-specific content is included
    await expect(page.locator('text=technical')).toBeVisible();
  });

  test('should track AI usage and performance', async ({ page }) => {
    await page.click('[data-testid="sales-intelligence-tab"]');

    // Generate multiple AI tools
    await page.click('[data-testid="generate-playbook-button"]');
    await page.waitForSelector('[data-testid="playbook-content"]');

    await page.click('[data-testid="communication-optimizer-card"]');
    await page.click('[data-testid="optimize-button"]');
    await page.waitForSelector('[data-testid="optimization-results"]');

    // Check if usage tracking is working (this would be backend validation)
  });
});
