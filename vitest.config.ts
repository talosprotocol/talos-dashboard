import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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
