# Core tests on the engine-71 defaults, and the manifest refresh (Tools, 2026-11-16, develop e90c204c)

Method as in the engine-69 note: one process per core test file (`TEST_PIN_FLAGS= npx vitest run --project core --project core-defaults FILE`, nothing pinned), two workers, 542 files, 1.0 h of test time. Raw results: `2026-11-16-pin-defaults-engine71.jsonl` (file, exit code, seconds, failed tests). The four newly failing files bisected with `scripts/diag/pin-bisect.ts`: `2026-11-16-pin-bisect-engine71.json`.

178 files fail on the defaults (181 on engine-69, 150 in the engine-61 manifest).

* **Leave the pinned set** (they pass with nothing pinned): climb-reread-passed, dl-flatten, edge-contain-flow, fangio-tree, prethrow-opi (the five from the engine-69 note) and release-seen. `test/engine-pin.json` is regenerated: 147 pinned, 396 on the real engine (48 files that were in neither list, new since engine-61, are now defaults files; seven of them are new since engine-67). `test/engine-pin-manifest.test.ts` passes. The five `DIR_CAP` files (gait-facing-contract, movement-preview, pedal-cap, qb-gather-throw, trunk-twist) pass on the defaults since #791's re-records, with nothing to pin.
* **Newly passing against engine-69:** declared-break and the five `DIR_CAP` files, plus release-seen.
* **Newly failing against engine-69 (4)**, each with the one flag that, pinned alone, makes it pass: compile-picture (`LINE_START`), pursuit-field (`LINE_START`), qb-receiver-forecast (`ROUTE_FILLET`), qb-seen-out (`QB_TICK_PICTURE`). The other 27 files that fail and are not in the pinned set are the engine-69 note's, with the flags it names (RELEASE_BELIEF alone clears nine; the others are single-flag or small-set pins); the whole-file re-records of concept-menu and responsibility-ledger are still owed to Flex.
* **Infrastructure, not football:** `baseline-runner` fails here on Node 22.22.0 against `.nvmrc` 22.23.3; `visible-help` ran out of worker memory in the first run; `cov7-abandonment` was killed for memory (exit 137) as before, so its result is unknown; `engine-pin-manifest` failed in the per-file run only because the manifest it reads was the old one (it passes on the regenerated manifest).
* `film-pairs-worktrees` is in the film tier, not run.

This is the state the manifest now describes; it changes no football and no test body. A file may leave the pinned set when it passes, never join it; a file that fails on the defaults and is not pinned is a re-record owed to its lane, not a pin.
