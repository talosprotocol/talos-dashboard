import { test, expect } from '@playwright/test';

const authDisabled = process.env.TALOS_AUTH_REQUIRED !== 'true';

test.describe('Dashboard Core E2E Tests', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/login');
    if (authDisabled) {
      await expect(page).toHaveURL(/.*console/);
      return;
    }

    await expect(page).toHaveTitle(/Talos Protocol/);
    await expect(page.locator('h1')).toContainText(/Security Console/i);
  });

  test('should show setup options', async ({ page }) => {
    test.skip(authDisabled, 'login is disabled by default');

    await page.goto('/login');
    const setupButton = page.getByRole('button', { name: /Setup Admin Access/i });
    if (await setupButton.isVisible()) {
        await setupButton.click();
        await expect(page.locator('h1')).toContainText(/Initial Setup/i);
    }
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/console');
    await expect(page).toHaveURL(authDisabled ? /.*console/ : /.*login/);
  });
});
