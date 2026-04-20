import { test, expect } from '@playwright/test';

test.describe('Dashboard Functional UI Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Perform Dev Login before each functional test
    await page.goto('/login');
    const devLoginButton = page.locator('button:has-text("Dev Login (Email/Password)")');
    if (await devLoginButton.isVisible()) {
      await devLoginButton.click();
    }
    await page.fill('input[type="email"]', 'admin@talos.security');
    await page.fill('input[type="password"]', 'talos_secure_start');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/console', { timeout: 10000 });
  });

  test('should navigate through main sections and verify data visualization', async ({ page }) => {
    // Check Mission Control visibility
    await expect(page.getByText('Mission Control')).toBeVisible();

    // Wait for stats to load (pulse animation indicates loading)
    await page.waitForSelector('.grid-cols-6', { timeout: 15000 });

    // Verify presence of summary stats/cards - looking for labels like "Total Requests"
    await expect(page.getByText('Total Requests')).toBeVisible();
    await expect(page.getByText('Auth Success')).toBeVisible();

    // Navigate to Audit Log
    await page.goto('/audit');
    await expect(page.locator('h1')).toContainText(/Audit/i);
    
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
    await expect(page.locator('h1')).toContainText(/Settings/i);
    
    // Check for configuration forms in settings
    const formElements = page.locator('input, select, button');
    expect(await formElements.count()).toBeGreaterThanOrEqual(1);
  });
});
