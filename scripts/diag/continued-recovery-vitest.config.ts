import {defineConfig}from 'vitest/config';
export default defineConfig({test:{
  include:['test/zone-helper-check.test.ts','test/run-hand-control.test.ts','test/helper-fit.test.ts','test/scenario-pack.test.ts'],
  setupFiles:['scripts/diag/continued-recovery-test.setup.ts'],testTimeout:60000,
}});
