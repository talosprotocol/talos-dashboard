import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Tests', () => {
  test('should load and redirect to console', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /console or /login
    await expect(page).toHaveURL(/.*(console|login)/);
  });

  test('should have Talos Protocol in title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Talos Protocol/i);
  });
});
