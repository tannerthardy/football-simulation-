import { defineConfig } from 'vitest/config';
// Same unchanged 52 promotion witnesses as common-patch; candidate alone.
export default defineConfig({ test: {
  include: ['test/zone-helper-check.test.ts', 'test/run-hand-control.test.ts',
    'test/helper-fit.test.ts', 'test/scenario-pack.test.ts'],
  setupFiles: ['scripts/diag/grip-timing-test.setup.ts'], testTimeout: 60000,
} });
