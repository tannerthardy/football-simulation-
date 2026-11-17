# Core tests on the engine-67 defaults (Tools, 2026-11-15, develop 0f5f7645)

One process per core test file (`TEST_ENGINE_DEFAULTS=1 npx vitest run --project core FILE`), so memory is released between files: a single `vitest run` (3, 2 and 1 workers) was OOM-killed.
Raw results: `2026-11-15-pin-defaults-engine67.jsonl` (530 files). 174 fail on the defaults (excluding the two branch-only test files that do not exist on develop), against the 150 in the engine-61 manifest.

* Still failing, already in the manifest: 146 (their pins stand until a re-bisect).
* Passing now, in the manifest: 4: climb-reread-passed.test.ts, dl-flatten.test.ts, edge-contain-flow.test.ts, prethrow-opi.test.ts. Their pin lines can be dropped.
* Newly failing, not in the manifest and not infrastructure: 25 (not bisected yet; the bisect is hours of CPU):

  * `test/apex-leverage.test.ts` (1 failed tests)
  * `test/arrival-lead.test.ts` (1 failed tests)
  * `test/back-front.test.ts` (1 failed tests)
  * `test/catch-carry.test.ts` (1 failed tests)
  * `test/catch-phase-control.test.ts` (2 failed tests)
  * `test/combo-climb-coupled.test.ts` (1 failed tests)
  * `test/concept-menu.test.ts` (4 failed tests)
  * `test/coverage-run-support.test.ts` (2 failed tests)
  * `test/cut-wall.test.ts` (1 failed tests)
  * `test/man-throw-recognition.test.ts` (1 failed tests)
  * `test/outlet-last.test.ts` (1 failed tests)
  * `test/qb-installed-box-count.test.ts` (2 failed tests)
  * `test/quarter-flat-force-support.test.ts` (1 failed tests)
  * `test/quarters-flat-wheel.test.ts` (1 failed tests)
  * `test/rat-coverage.test.ts` (1 failed tests)
  * `test/release-cushion.test.ts` (2 failed tests)
  * `test/release-evidence.test.ts` (1 failed tests)
  * `test/responsibility-ledger.test.ts` (17 failed tests)
  * `test/screen-install.test.ts` (1 failed tests)
  * `test/seal-hold.test.ts` (1 failed tests)
  * `test/seam-delivery.test.ts` (1 failed tests)
  * `test/stretch-closure.test.ts` (7 failed tests)
  * `test/stretch-normal-follow.test.ts` (12 failed tests)
  * `test/throw-sight.test.ts` (1 failed tests)
  * `test/zone-track.test.ts` (1 failed tests)

Infrastructure, not football (a manifest line would be wrong for these):

* `test/baseline-runner.test.ts`: Node 22.22.0 here, .nvmrc pins 22.23.3
* `test/visible-help.test.ts`: worker heap out of memory (2 of 13 tests ran)
* `test/cov7-abandonment.test.ts`: killed for memory (rc 137)
* `test/pursuit-arrival.test.ts`: a 60 s hook timeout under defaults
