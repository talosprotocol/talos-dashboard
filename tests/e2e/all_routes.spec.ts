import { test, expect, type Page } from '@playwright/test';

const ROUTES_TO_TEST = [
  { path: '/console', expectedText: 'Mission Control' },
  { path: '/audit', expectedText: 'Audit' },
  { path: '/status', expectedText: 'Infrastructure Health' },
  { path: '/settings', expectedText: 'Settings' },
  { path: '/mcp/servers', expectedText: 'MCP' },
  { path: '/mcp/policies', expectedText: 'MCP Policies' },
  { path: '/admin/rbac', expectedText: 'RBAC' },
  { path: '/admin/secrets', expectedText: 'Secrets' },
  { path: '/llm/upstreams', expectedText: 'Upstreams' },
  { path: '/llm/models', expectedText: 'Model' },
  { path: '/agent', expectedText: 'Agent' },
  { path: '/api-workbench', expectedText: 'API Workbench' },
];

function isAuthDisabled() {
  if (process.env.TALOS_AUTH_REQUIRED !== undefined) {
    return process.env.TALOS_AUTH_REQUIRED !== 'true';
  }
  if (process.env.TALOS_DISABLE_LOGIN !== undefined) {
    return process.env.TALOS_DISABLE_LOGIN === 'true';
  }
  if (process.env.NEXT_PUBLIC_DISABLE_LOGIN !== undefined) {
    return process.env.NEXT_PUBLIC_DISABLE_LOGIN === 'true';
  }
  return true;
}

async function devLogin(page: Page) {
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

test.describe('Dashboard Comprehensive Route Tests', () => {
  test.beforeEach(async ({ page }) => {
    if (isAuthDisabled()) {
        await page.goto('/console');
    } else {
        await devLogin(page);
    }
  });

  for (const route of ROUTES_TO_TEST) {
    test(`should navigate to ${route.path} and load successfully`, async ({ page }) => {
      await page.goto(route.path);
      
      // We expect either an h1 or a distinct header containing the expected text
      // We use a broad locator that searches the whole body text or specific headings
      const bodyText = page.locator('body');
      await expect(bodyText).toContainText(route.expectedText, { ignoreCase: true });
      
      // Check that there are no obvious crash error boundaries
      await expect(page.getByText('Application Error')).not.toBeVisible();
      await expect(page.getByText('Something went wrong')).not.toBeVisible();
    });
  }
});
