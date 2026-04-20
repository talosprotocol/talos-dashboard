import { test, expect } from '@playwright/test';

test.describe('Dashboard System Services Verification', () => {

  test('Should render the dev login screen and verify logo bypass', async ({ page }) => {
    await page.goto('/login');
    // Switch to dev login mode
    await page.click('button:has-text("Dev Login (Email/Password)")');
    // Verify Dev Login exists
    await expect(page.locator('h1')).toContainText(/Dev Login/i);
    
    // Attempt dev login
    await page.fill('input[type="email"]', 'admin@talos.security');
    await page.fill('input[type="password"]', 'talos_secure_start');
    await page.click('button:has-text("Sign In")');

    // Should route to the console
    await page.waitForURL('/console');
    await expect(page.getByText('Mission Control')).toBeVisible();
  });

  test('Should verify Chat Service connects properly', async ({ page }) => {
    // Assuming cookie persists or dev login
    await page.goto('/login');
    // Switch to dev login mode if needed
    const devLoginButton = page.locator('button:has-text("Dev Login (Email/Password)")');
    if (await devLoginButton.isVisible()) {
        await devLoginButton.click();
    }
    await page.fill('input[type="email"]', 'admin@talos.security');
    await page.fill('input[type="password"]', 'talos_secure_start');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/console');

    // Navigate to Chat
    await page.goto('/examples/chat');
    
    // Ensure no Error: TALOS_UNAVAILABLE renders
    await expect(page.getByText('TALOS_UNAVAILABLE')).toBeHidden();

    // Verify Chat prompt
    await page.fill('input[placeholder="Type a message..."]', 'System Check');
    await page.click('button:has-text("Send")');

    // Secure chat response should show up eventually
    await expect(page.locator('.max-w-\\[80\\%\\]').last()).toBeVisible({ timeout: 10000 });
  });
});
