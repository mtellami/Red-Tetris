import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['{client,server}/tests/**/*.test.ts', 'game/*.test.ts'],
    coverage: {
      include: ['{client,server}/src/**/*.{ts,tsx}', 'game/*.ts'],
      thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
    },
  },
});
