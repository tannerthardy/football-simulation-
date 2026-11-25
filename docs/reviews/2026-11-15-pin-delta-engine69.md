# Core tests on the engine-69 defaults, and the bisect of the new failures (Tools, 2026-11-15, develop 1538db2d)

Method as in the engine-67 note: one process per core test file (`TEST_PIN_FLAGS= npx vitest run --project core --project core-defaults FILE`, nothing pinned), because a single `vitest run` is OOM-killed. Raw results: `2026-11-15-pin-defaults-engine69.jsonl` (537 files). Bisect: `scripts/diag/pin-bisect.ts` on this branch merged with develop; the minimal pinned set per file is in `2026-11-15-pin-bisect-engine69.json` (227 promoted flags).

181 files fail on the defaults, against the 150 in the engine-61 manifest.

* Passing now, in the manifest, so their pin lines can go: climb-reread-passed, dl-flatten, edge-contain-flow, fangio-tree, prethrow-opi.
* Failing now, not in the manifest: 36. Two are infrastructure (`baseline-runner`: Node 22.22.0 here, `.nvmrc` 22.23.3; `visible-help`: worker heap out of memory) and one exists only on this branch (`engine-pin-manifest`). `cov7-abandonment` was killed for memory (rc 137) and is not counted.
* Three files that failed on an earlier engine-68 run pass on engine-69 with nothing pinned: arrival-lead, qb-rhythm, stalk-close. (That earlier run was on a worktree that did not yet have the engine-69 merges; it is not used.)

## Minimal pinned flags per new failing file

| Flag pinned alone | Files |
|---|---|
| RELEASE_BELIEF | catch-carry, catch-phase-control, man-throw-recognition, quarter-flat-force-support, quarters-flat-wheel, rat-coverage, release-cushion, seam-delivery, throw-sight; with ALIGN_HABIT: coverage-run-support; with QB_BELIEVED_DEF: release-evidence |
| DIR_CAP | gait-facing-contract, movement-preview, pedal-cap, qb-gather-throw, trunk-twist |
| ENGAGE_FELT + ENGAGE_TRUNK | stretch-closure, stretch-normal-follow |
| LINE_START, ROUTE_CRAFT, WR_SNAP | apex-leverage |
| WR_SNAP | declared-break |
| LEAN_PITCH + OPEN_HANDS | run-anchor |
| CHEST_SHOULDERS | chest-shoulders |
| ENGAGED_TECHNIQUE | combo-climb-coupled |
| CUT_WALL | cut-wall |
| PLAN_KEYS_2 | outlet-last |
| QB_SEEN_MAN | qb-installed-box-count |
| ROUTE_FILLET | route-effort |
| DECLARED_BREAK | screen-declare |
| CLOUD_KILL | screen-install |
| SIGHT_COVER | zone-track |
| 14 flags (LB_GUARD_STEP, LB_LINE_FLOW, LB_READ_STEP, LEAN_PITCH, LEGS_HELD, LEG_ALLOMETRY, LEVEL2_TIME, LINE_START, LINE_STEP, LOOK_ONCE, LOOSE_SEEN, MESH_GUN_SIDE, MESH_TEMPO, MUG_CALLS) | grasp-jeopardy |

RELEASE_BELIEF alone blocks 11 of the 36. Re-recording those eleven files is the largest single step toward dropping a pin.

## Not resolved by the bisect

* `concept-menu` (4 failed tests): after more than 200 probes the smallest passing set found still had 104 of the 227 flags pinned. It needs the legacy engine wholesale; flag-by-flag attribution does not apply. Re-record the file.
* `responsibility-ledger` (17 failed tests): passes only with 211 of 227 pinned. Same conclusion.
* Both are owed to Flex.

The DIR_CAP pins are the tests recorded on the legacy speed cap; they assert the old cap values, not behaviour DIR_CAP breaks.
