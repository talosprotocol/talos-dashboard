import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/submodules/**',
      '**/.next/**',
      '**/tests/e2e/**',
      '**/*.spec.ts', // Exclude Playwright specs
    ],
    globals: true,
    environment: 'node',
  },
});
