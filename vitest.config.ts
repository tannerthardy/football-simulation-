import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          include: ['test/**/*.test.ts'],
          exclude: ['test/integration/**', 'test/research/**'],
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
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
