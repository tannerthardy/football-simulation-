import {defineConfig} from 'vitest/config';
// Same affected contract files as the old patch screen; new ground-isolated
// host, current accepted controllers. This is an explicit diagnostic only.
export default defineConfig({test:{
  include:['test/zone-helper-check.test.ts','test/run-hand-control.test.ts','test/helper-fit.test.ts','test/scenario-pack.test.ts'],
  setupFiles:['scripts/diag/contact-law-current-test.setup.ts'],testTimeout:60000,
}});
