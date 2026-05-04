import { test, expect } from '@playwright/test';

const authDisabled = process.env.TALOS_AUTH_REQUIRED !== 'true';

test.describe('Dashboard Functional UI Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    if (authDisabled) {
      await page.goto('/console');
      return;
    }

    // Perform Dev Login before each functional test
    await page.goto('/login');
    // Try to find the dev login switch button, sometimes it's an alternate mode
    const devLoginBtn = page.locator('button', { hasText: 'Dev Login (Email/Password)' });
    if (await devLoginBtn.isVisible()) {
        await devLoginBtn.click();
    }
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.locator('input[type="email"]').fill('admin@talos.security');
    await page.locator('input[type="password"]').fill('talos_secure_start');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/console', { timeout: 10000 });
  });

  test('should navigate through main sections and verify data visualization', async ({ page }) => {
    // Check Mission Control visibility
    await page.waitForSelector('text=Mission Control', { timeout: 30000 });
    await expect(page.getByText('Mission Control')).toBeVisible();

    await expect(page.getByText('Total Requests')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Auth Success')).toBeVisible();

    // Navigate to Audit Log
    await page.goto('/audit');
    await expect(page.locator('h1')).toContainText(/Audit/i, { timeout: 20000 });
    
    // Check for audit entries
    const auditEntries = page.locator('table tr, .divide-y > div');
    // Give it a moment to fetch audit logs
    await page.waitForTimeout(1000);
    const count = await auditEntries.count();
    console.log(`Audit entries found: ${count}`);
  });

  test('should check metrics and system status visualization', async ({ page }) => {
    await page.goto('/status');
    // The page has "Infrastructure Health"
    await expect(page.locator('h1')).toContainText(/Infrastructure Health/i);

    // Look for status indicators
    const healthIndicators = page.locator('.bg-indigo-500, .bg-emerald-500');
    expect(await healthIndicators.count()).toBeGreaterThan(0);
  });

  test('should verify settings and profile accessibility', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Dashboard Settings')).toBeVisible({ timeout: 30000 });
    
    // Check for configuration forms in settings
    const formElements = page.locator('input, select, button');
    expect(await formElements.count()).toBeGreaterThanOrEqual(1);
  });
});
