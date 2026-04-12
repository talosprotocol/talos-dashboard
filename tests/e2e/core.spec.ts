import { test, expect } from '@playwright/test';

test.describe('Dashboard Core E2E Tests', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Talos Protocol/);
    await expect(page.locator('h1')).toContainText(/Security Console/i);
  });

  test('should show setup options', async ({ page }) => {
    await page.goto('/login');
    const setupButton = page.getByRole('button', { name: /Setup Admin Access/i });
    if (await setupButton.isVisible()) {
        await setupButton.click();
        await expect(page.locator('h1')).toContainText(/Initial Setup/i);
    }
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/console');
    await expect(page).toHaveURL(/.*login/);
  });
});
