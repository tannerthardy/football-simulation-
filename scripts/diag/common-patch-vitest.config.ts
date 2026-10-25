import { defineConfig } from 'vitest/config';

// Promotion witnesses, intentionally failing under the experimental law.
// Run explicitly with --config; the default projects retain every assertion.
export default defineConfig({ test: {
  include: ['test/zone-helper-check.test.ts', 'test/run-hand-control.test.ts',
    'test/helper-fit.test.ts', 'test/scenario-pack.test.ts'],
  setupFiles: ['scripts/diag/common-patch-test.setup.ts'],
  testTimeout: 60000,
} });
