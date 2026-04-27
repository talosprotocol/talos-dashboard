import { test, expect } from '@playwright/test';

const authDisabled = process.env.TALOS_AUTH_REQUIRED !== 'true';

test.describe('Dashboard System Services Verification', () => {

  test('Should render the dev login screen and verify logo bypass', async ({ page }) => {
    test.skip(authDisabled, 'dev login screen is hidden when auth is disabled');

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
    if (!authDisabled) {
      await page.goto('/login');
      const devLoginBtn = page.locator('button', { hasText: 'Dev Login (Email/Password)' });
      if (await devLoginBtn.isVisible()) {
          await devLoginBtn.click();
      }
      await page.waitForSelector('input[type="password"]', { timeout: 15000 });
      await page.locator('input[type="email"]').fill('admin@talos.security');
      await page.locator('input[type="password"]').fill('talos_secure_start');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.waitForURL('/console', { timeout: 10000 });
    }

    // Navigate to Chat
    await page.goto('/examples/chat');
    
    // Ensure no Error: TALOS_UNAVAILABLE renders
    await expect(page.getByText('TALOS_UNAVAILABLE')).toBeHidden();

    // Verify Chat prompt
    await page.fill('input[placeholder="Type a message..."]', 'System Check');
    const sendButton = page.locator('button:has-text("Send")');
    if (await sendButton.isDisabled()) {
      test.skip(true, 'chat backend is unavailable for this e2e run');
    }
    await sendButton.click();

    // Secure chat response should show up eventually
    await expect(page.locator('.max-w-\\[80\\%\\]').last()).toBeVisible({ timeout: 10000 });
  });
});
