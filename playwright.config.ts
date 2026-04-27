import { defineConfig, devices } from '@playwright/test';

const authRequired = process.env.TALOS_AUTH_REQUIRED ?? 'false';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- -p 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      TALOS_AUTH_REQUIRED: authRequired,
      DATA_SOURCE_MODE: 'MOCK',
      NEXT_PUBLIC_TALOS_DATA_MODE: 'MOCK',
      NEXT_PUBLIC_API_URL: 'http://localhost:8001',
      TALOS_GATEWAY_URL: 'http://localhost:8001',
      TALOS_AUDIT_URL: 'http://localhost:8002',
      TALOS_CONFIGURATION_URL: 'http://localhost:8003',
    },
  },
});
