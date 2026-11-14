import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Keep expensive native scenarios out of the everyday loop without moving or
// rewriting their assertions. Every entry is excluded from core and included
// in integration exactly once; see docs/TESTING_COSTS.md for measured costs.
const integrationTests = [
  'test/integration/**/*.test.ts',
  'test/hands-bunch.test.ts',
];

// These exercise complete capture/replay/CLI workflows, including native play
// prefixes and temporary Git worktrees. Keep their assertions in test:all,
// without starting those workflows for an ordinary engine unit-test run.
const workflowTests = [
  'test/film-pairs.test.ts',
  'test/film-pack-inputs.test.ts',
  'test/saved-game-play.test.ts',
  'test/play-lab.test.ts',
];

// The engine's defaults were promoted to the reference stack on 2026-11-09
// (docs/REFERENCE_STACK.md). The suites below were recorded on the engine
// before that, so they run with every promoted flag pinned to 0: the same
// engine they were written against. A test that should exercise the current
// defaults stubs the flags it needs, or the whole run can use them with
// TEST_ENGINE_DEFAULTS=1 (173 core tests then need re-recording; the list is
// in docs/REFERENCE_STACK.md). Remove a flag from this pin when its tests are
// re-recorded.
const stackFlags: Record<string, string> = JSON.parse(readFileSync(new URL('./config/reference-stack.json', import.meta.url), 'utf8')).flags;
const promoted = Object.entries(stackFlags).filter(([, v]) => v === 'on').map(([k]) => k);
// TEST_PIN_FLAGS=A,B pins only those flags (for scripts/diag/pin-bisect.ts); empty pins none.
const pinOnly = process.env.TEST_PIN_FLAGS;
const legacyEngine = process.env.TEST_ENGINE_DEFAULTS === '1' ? {}
  : Object.fromEntries((pinOnly === undefined ? promoted : pinOnly.split(',').filter(Boolean)).map(k => [k, '0']));

// Core files split in two (test/engine-pin.json): `defaults` run on the real engine, `pinned` still on the
// legacy one. A file may move from pinned to defaults when it passes there; a new file is a defaults file.
const enginePin: { pinned: string[]; defaults: string[] } = JSON.parse(readFileSync(new URL('./test/engine-pin.json', import.meta.url), 'utf8'));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core-defaults',
          include: enginePin.defaults,
          // The real engine: no promoted flag pinned.
          env: process.env.TEST_PIN_FLAGS === undefined ? {} : legacyEngine,
          pool: 'threads',
          isolate: true,
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'core',
          include: enginePin.pinned,
          exclude: [...integrationTests, ...workflowTests, 'test/research/**'],
          // Avoid a fresh process for each small file while retaining module
          // and environment isolation for tests that exercise different flags.
          env: legacyEngine,
          pool: 'threads',
          isolate: true,
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'workflows',
          include: workflowTests,
          env: legacyEngine,
          pool: 'threads',
          isolate: true,
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'integration',
          include: integrationTests,
          env: legacyEngine,
          pool: 'threads',
          isolate: true,
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'research',
          include: ['test/research/**/*.test.ts'],
          env: legacyEngine,
          pool: 'threads',
          isolate: true,
          testTimeout: 60000,
        },
      },
    ],
  },
});
