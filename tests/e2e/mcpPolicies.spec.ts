import { test, expect } from '@playwright/test';

const authDisabled = process.env.TALOS_AUTH_REQUIRED !== 'true';

test.describe('Dashboard MCP Policies E2E', () => {
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

  test('should navigate to MCP Policies and verify elements', async ({ page }) => {
    // Navigate to MCP Policies
    await page.goto('/mcp/policies');
    
    // Verify page header
    await expect(page.locator('h1')).toContainText(/MCP Policies/i, { timeout: 20000 });
    
    // Check for the New Policy button
    const newPolicyButton = page.getByRole('button', { name: /New Policy/i });
    await expect(newPolicyButton).toBeVisible();
    
    // Click New Policy button to open modal
    await newPolicyButton.click();
    
    // Verify modal elements are present
    // The policy form inputs should be visible
    const idInput = page.getByPlaceholder('e.g. engineering-full');
    await expect(idInput).toBeVisible();
    
    // Test form interaction
    await idInput.fill('playwright-test-policy');
    
    const teamInput = page.getByPlaceholder('e.g. engineering', { exact: true });
    await teamInput.fill('qa-team');
    
    const serverInput = page.getByPlaceholder('filesystem, memory, slack');
    await serverInput.fill('playwright-server');
    
    // Click cancel to close modal without saving to avoid polluting mock data
    const cancelButton = page.locator('button', { hasText: 'Cancel' });
    await cancelButton.click();
    
    // Modal should be closed
    await expect(idInput).not.toBeVisible();
  });
});
