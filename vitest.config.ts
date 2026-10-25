import { defineConfig } from 'vitest/config';

// Keep expensive native scenarios out of the everyday loop without moving or
// rewriting their assertions. Every entry is excluded from core and included
// in integration exactly once; see docs/TESTING_COSTS.md for measured costs.
const integrationTests = [
  'test/integration/**/*.test.ts',
  'test/hands-bunch.test.ts',
];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          include: ['test/**/*.test.ts'],
          exclude: [...integrationTests, 'test/research/**'],
          // Avoid a fresh process for each small file while retaining module
          // and environment isolation for tests that exercise different flags.
          pool: 'threads',
          isolate: true,
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'integration',
          include: integrationTests,
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'research',
          include: ['test/research/**/*.test.ts'],
          testTimeout: 60000,
        },
      },
    ],
  },
});
