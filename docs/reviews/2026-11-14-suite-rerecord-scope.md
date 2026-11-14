# Suite re-record scope: lifting the legacy-engine pin (2026-11-14)

Scoping only; nothing in the suites or the engine changed. Asked by Integration: the information-rule removals
cannot delete their flag and old path because `vitest.config.ts` runs every suite with the promoted flags pinned to `0`, so the fixtures
execute the branches being removed. Develop `b9cd3628` (engine-58), Node 22.22.0 in this container (`.nvmrc` says 22.23.3).

## What was run

| Run | Command | Result |
|---|---|---|
| Control (pinned, as shipped) | `npx vitest run --project core` | 4,161 tests in 474 files: 4,158 pass, 3 fail. The 3 are `baseline-runner.test.ts`, the Node-version check (22.22.0 vs 22.23.3), not the engine. 527 s. |
| Pin lifted | `TEST_ENGINE_DEFAULTS=1 npx vitest run --project core` | 392 fail (3 of them the same Node check, so **389 fail only when the pin is lifted**) in 139 files; 7 skipped; 334 files pass untouched. 575 s. |

Not run: the workflows (4 files), integration (10 files) and research (20 files) projects. They carry the same pin; run them the same way when scheduling.
Raw output: `out/suite-scope/` (ignored). The promoted set is `config/reference-stack.json`: 174 flags `on` (pinned to `0`), 57 `off`, 1 retired.

## (1) Who depends on the pin

By static reading of the 504 test files (a file "stubs flags" when it names at least one promoted flag; "engine" when it imports the sim, game, team, physics world or lab):

| Kind | Files | What it means |
|---|---|---|
| Names a promoted flag | 79 | Already states its own flag; unaffected by the pin for that flag |
| Runs the engine, names none | 337 | Its result depends on the pin without saying so |
| No engine (physics maths, IO, tools) | 88 | Not affected |

The pin matters for the 337. Of the 474 core files, **334 already pass on the real defaults** and 139 do not (389 assertions of 4,161, 9.4%).

## (2) What fails, and why

Bucketed by assertion kind first (a heuristic over the failure message, not a diagnosis): value or shape differs 70 files (162 assertions), a recorded number moved 64 files (100), an exception 5 files
(37), premise-absent comparisons (a value that should be positive or non-empty is not) are inside the first two. The per-file list is at the end. Reading samples of each gives these causes, which no number bucket can separate:

- **Fixture API drift (stub too thin).** `press-contact.test.ts`, 15 tests: a hand-built `sim` has no `see`, and `RouteRunner.getOff` (`receiver.ts:242`) now calls it under a promoted flag. The fixture must provide the perception call.
- **A real defect candidate.** `schematic-stress` (5), `prethrow-opi` (4) and `cov7-abandonment` (2): `sampleRoutes` (`read-compiler/features.ts:29`) throws `Cannot read properties of undefined (reading 'personnel')` because `FORMATION_BY_ID[formationId]` is undefined. The QB path calls `installedPlan(concept, sim.offCall.formation.id)` (`qb.ts:423`) and the compiler assumes a registered formation. A custom formation (lab scenes, these fixtures) crashes where it should fall back to no installed plan. Not a fixture problem: `installedPlan` should return null for an unknown formation.
- **Premise changed by design.** `chase-arrival.test.ts`: a fresh and a tired defender now command the same chase velocity (1.959 against 1.959), so "the tired one commands less" is false. That is the requested-versus-achieved rule (the body, not the request, carries the fatigue). The lane restates the premise as achieved velocity, not as a smaller request.
- **Staged scene whose premise no longer occurs.** `back-man-run-fit` (12: the man defender's x velocity is -2.4 where the scene expects it positive), `combo-attention` (18: -25.6 against greater than 0), `dl-games` (7: two defenders own a gap where the scene allows one). These need the owning lane to say whether the new behaviour is right.
- **Recorded numbers that moved** (64 files): about a third are float-equality or tolerance edges; the rest are real changes in the quantity.

Only one cluster (11 tests) looks like an engine defect from this pass. **Nothing in the other 128 files has been confirmed as a defect or as correct**; that is what the lane restatement decides.

## (3) Plan that does not lose coverage

**Stage 0, flip what already passes (Tools, a small change).** Two vitest projects over the same file list: `core` (pinned) for the 139 files that need it, and `core-defaults` (no pin) for the 334 that pass on the real defaults, from a checked-in manifest `test/engine-defaults.json` that a script regenerates from a run. A test fails if the manifest loses a file or a pinned file is added. This puts **70% of the core suite on the real engine at once, with no number changed**, and the pin can only shrink.
Check it against Integration's example: the QB lane's pass fixtures that do not fail on defaults move off the legacy path immediately, so `held()`'s legacy branch loses those callers on day one.

**Stage 1, find which flags each failing file needs pinned (Tools, a script).** For each of the 139 files, delta-debug the flag list (run the file with half the promoted flags lifted, narrow to the minimal set that breaks it). The 139 files take 761 s of test time summed over one run, and a single culprit takes about 8 runs, so a full pass is about 3 CPU-hours, under an hour on four cores. Output: per file, the flags that must stay pinned, and per flag, the files blocking its deletion. That is the actual unblock list for each removal.

**Stage 2, each lane restates its own fixtures.** The lane that owns the flag and the file reads each failing test, states the football premise, and either rewrites the scene to occur on the real engine, changes the assertion to the achieved quantity, or records the new behaviour with a reason in the commit. No bulk number re-record. A file moves from the pinned project to the defaults project when it passes. Proposed lanes by file name (a keyword guess; 43 files have none and need an owner):

| Lane | Files | Failing assertions |
|---|---|---|
| Run Game | 22 | 84 |
| Flex | 21 | 78 |
| Coverage | 20 | 74 |
| Rules+Coaching | 18 | 45 |
| Defense | 8 | 26 |
| QB | 7 | 16 |
| unassigned | 43 | 66 |

**Stage 3, retire the pin.** When the pinned project is empty, delete `legacyEngine` and the `TEST_ENGINE_DEFAULTS` switch.

## (4) What the guard test and the baseline runner need

- **Guard test (#699):** nothing depends on vitest; it scans source. Each flag removal lowers the rows of the reads it deletes; the exact-count rule makes the same change update the allowlist, which is the intended cost. The scan cannot see flags, so reads that sit only behind a flag at a non-default value count as live. An optional `dormant` class (reads reachable only with a promoted flag at `0`) would let the allowlist show which rows vanish when the legacy path goes. Not needed to start.
- **Baseline runner:** `config/baseline.json` (310 flags, 78 of them not in the reference stack) is checked by `checkFlags` in `scripts/baseline.mjs` and `test/baseline-runner.test.ts` ("requires new runtime flags to be registered"). That check fails on a stale entry as well as a missing one, so **deleting a flag's code also needs its entry deleted from `config/baseline.json` and `config/reference-stack.json`** (`test/reference-stack.test.ts` enforces the second) **and `docs/FLAGS.md`**. Cheapest fix: let `checkFlags` fail only on missing flags, so the historical profile may be a superset and removals do not touch it. The baseline runner is already marked historical in `docs/BASELINE.md`.
- The 3 failing baseline-runner tests need Node 22.23.3; run the suites on it when scheduling so they stop being noise.

## (5) Rough size

- Stage 0: one small change plus a manifest script and test; half a day. Result: 334 of 474 core files on the real engine.
- Stage 1: one script, a few hours to write; about an hour of wall time to run.
- Stage 2: 139 files, 389 assertions. At 10 to 40 minutes a file once the lane has the flag list (the median failing file runs 1.2 s, the slowest 95 s) that is about 25 to 90 lane-hours in total, spread over the lanes in the table; the first deliverable per lane is the flag list from Stage 1.
- Stage 3: a few lines.
- One engine hardening that is outside the suites: `installedPlan` for an unknown formation.

## Failing files when the pin is lifted

| File | Failing | Dominant kind | Proposed lane |
|---|---|---|---|
| combo-attention.test.ts | 18 | number | Run Game |
| combo-transfer.test.ts | 15 | value/shape | Run Game |
| press-contact.test.ts | 15 | exception | Coverage |
| responsibility-ledger.test.ts | 15 | value/shape | Flex |
| back-man-run-fit.test.ts | 12 | number | Coverage |
| support-escape-objective.test.ts | 9 | number | Flex |
| support-work-off.test.ts | 9 | value/shape | Flex |
| hand-force-point.test.ts | 8 | number | Flex |
| man-run-continuity.test.ts | 8 | value/shape | Coverage |
| tackle-support-choice.test.ts | 8 | number | Defense |
| dl-games.test.ts | 7 | number | Defense |
| run-base.test.ts | 7 | number | Run Game |
| runner-side-recovery.test.ts | 7 | exception | Run Game |
| acquired-qb-continuation.test.ts | 6 | value/shape | QB |
| contact-holding-rules.test.ts | 6 | value/shape | Rules+Coaching |
| coverage-flat-responsibility.test.ts | 6 | number | Coverage |
| gun-split-backs.test.ts | 6 | value/shape | unassigned |
| pass-hip-ride.test.ts | 6 | value/shape | Flex |
| schematic-stress.test.ts | 6 | exception | Rules+Coaching |
| fit-te-gap-slide.test.ts | 5 | value/shape | Defense |
| hand-comoving.test.ts | 5 | number | Flex |
| prethrow-opi.test.ts | 5 | exception | QB |
| receiver-option-information.test.ts | 5 | value/shape | Rules+Coaching |
| support-contact-frame.test.ts | 5 | number | Flex |
| catch-hands.test.ts | 4 | number | Coverage |
| concept-menu.test.ts | 4 | number | Rules+Coaching |
| hand-angular-transfer.test.ts | 4 | number | Flex |
| incidental-catch-readiness.test.ts | 4 | value/shape | Coverage |
| long-yardage-run.test.ts | 4 | number | unassigned |
| pass-contact-rules.test.ts | 4 | number | Rules+Coaching |
| run-contact-workoff-interaction.test.ts | 4 | number | Run Game |
| support-receiver-holder.test.ts | 4 | value/shape | Rules+Coaching |
| zone-helper-check.test.ts | 4 | number | Coverage |
| climb-access.test.ts | 3 | value/shape | Run Game |
| helper-fit.test.ts | 3 | value/shape | unassigned |
| pass-cutoff-approach.test.ts | 3 | value/shape | Flex |
| planned-climb-fit.test.ts | 3 | value/shape | Run Game |
| run-contact-flow.test.ts | 3 | value/shape | Run Game |
| run-execution.test.ts | 3 | value/shape | Run Game |
| shotgun-exchange.test.ts | 3 | value/shape | unassigned |
| zone-runoff-work.test.ts | 3 | number | Coverage |
| back-release.test.ts | 2 | value/shape | Run Game |
| carrier-decision-cadence.test.ts | 2 | value/shape | Run Game |
| catch-caller-interval.test.ts | 2 | value/shape | Coverage |
| chase-arrival.test.ts | 2 | number | Defense |
| cov7-abandonment.test.ts | 2 | exception | Rules+Coaching |
| cushion-break.test.ts | 2 | number | Coverage |
| defensive-call-integrity.test.ts | 2 | value/shape | unassigned |
| draw-presentation.test.ts | 2 | number | unassigned |
| hook-stem-continuity.test.ts | 2 | value/shape | unassigned |
| lb-flow-intercept.test.ts | 2 | number | unassigned |
| lb-guard-step.test.ts | 2 | number | unassigned |
| man-cushion-compression.test.ts | 2 | value/shape | Coverage |
| overtake-climb.test.ts | 2 | number | Run Game |
| pass-installation.test.ts | 2 | value/shape | Flex |
| perimeter-run-play.test.ts | 2 | value/shape | Run Game |
| possession-awareness.test.ts | 2 | value/shape | Coverage |
| press-front-stance.test.ts | 2 | value/shape | Coverage |
| receiver-native-motion.test.ts | 2 | value/shape | Rules+Coaching |
| receiver-run-eligibility.test.ts | 2 | value/shape | Rules+Coaching |
| redirect-phase-contract.test.ts | 2 | value/shape | unassigned |
| redirect-protection.test.ts | 2 | value/shape | Flex |
| run-combo-retarget.test.ts | 2 | value/shape | Run Game |
| run-contact-track.test.ts | 2 | number | Run Game |
| run-hand-control.test.ts | 2 | value/shape | Run Game |
| run-pace-gather.test.ts | 2 | number | Run Game |
| short-package.test.ts | 2 | value/shape | unassigned |
| shoulders-set.test.ts | 2 | number | unassigned |
| team-contact-rules.test.ts | 2 | number | Rules+Coaching |
| tip-away.test.ts | 2 | value/shape | unassigned |
| world-physics.test.ts | 2 | number | unassigned |
| wrap-binding.test.ts | 2 | number | unassigned |
| zone-backer-count.test.ts | 2 | value/shape | Coverage |
| backer-read-step.test.ts | 1 | value/shape | Defense |
| backer-takeon.test.ts | 1 | number | Defense |
| block-seen.test.ts | 1 | number | Flex |
| bounded-attachment-world.test.ts | 1 | number | unassigned |
| call-mix.test.ts | 1 | value/shape | unassigned |
| climb-reread-passed.test.ts | 1 | number | Run Game |
| combination-ownership.test.ts | 1 | value/shape | Run Game |
| combo-strike-access.test.ts | 1 | number | Run Game |
| command-trace.test.ts | 1 | value/shape | unassigned |
| contact-motion.test.ts | 1 | value/shape | Rules+Coaching |
| cover3-cover2-rules.test.ts | 1 | value/shape | Rules+Coaching |
| cover6-half-side.test.ts | 1 | number | unassigned |
| coverage-judgment.test.ts | 1 | number | Coverage |
| coverage-mechanics.test.ts | 1 | number | Coverage |
| coverage-rules.test.ts | 1 | value/shape | Rules+Coaching |
| db-slots.test.ts | 1 | value/shape | unassigned |
| deep-coverage-leverage.test.ts | 1 | number | Coverage |
| directional-brace.test.ts | 1 | value/shape | unassigned |
| dl-attack-landmark.test.ts | 1 | number | Defense |
| dl-flatten.test.ts | 1 | number | Coverage |
| draw-read.test.ts | 1 | number | unassigned |
| edge-contain-flow.test.ts | 1 | number | unassigned |
| fangio-tree.test.ts | 1 | value/shape | unassigned |
| finish-check.test.ts | 1 | value/shape | unassigned |
| flat-press.test.ts | 1 | number | Coverage |
| front-menu.test.ts | 1 | value/shape | unassigned |
| gap-match.test.ts | 1 | value/shape | Run Game |
| grasp-angular-transfer.test.ts | 1 | number | unassigned |
| grasp-jeopardy.test.ts | 1 | value/shape | unassigned |
| hand-force-integration.test.ts | 1 | number | Flex |
| held-recovery.test.ts | 1 | number | unassigned |
| held-stride.test.ts | 1 | number | unassigned |
| hold-sink.test.ts | 1 | number | Flex |
| kick-braking.test.ts | 1 | number | unassigned |
| lb-start.test.ts | 1 | number | unassigned |
| line-read.test.ts | 1 | number | unassigned |
| lineup-order.test.ts | 1 | value/shape | unassigned |
| motion-contact.test.ts | 1 | value/shape | Rules+Coaching |
| native-pass-foul-game.test.ts | 1 | value/shape | Flex |
| ol-align.test.ts | 1 | number | unassigned |
| open-hands.test.ts | 1 | number | Flex |
| pad-leverage.test.ts | 1 | number | Flex |
| pass-anchor.test.ts | 1 | number | Flex |
| pass-contact.test.ts | 1 | number | Flex |
| presnap-alignment-contract.test.ts | 1 | value/shape | unassigned |
| presnap-coverage-checks.test.ts | 1 | value/shape | Coverage |
| pro-call.test.ts | 1 | value/shape | Flex |
| projected-cap.test.ts | 1 | value/shape | unassigned |
| protection.test.ts | 1 | value/shape | Flex |
| qb-feel.test.ts | 1 | number | QB |
| qb-interception-estimate.test.ts | 1 | number | QB |
| qb-rusher-recording.test.ts | 1 | value/shape | QB |
| qb-scramble-lane.test.ts | 1 | value/shape | QB |
| quarters-trips-rules.test.ts | 1 | number | Rules+Coaching |
| read-compiler.test.ts | 1 | value/shape | Rules+Coaching |
| read-lean.test.ts | 1 | number | unassigned |
| receiver-route-effort.test.ts | 1 | value/shape | Rules+Coaching |
| release-seen.test.ts | 1 | value/shape | Run Game |
| route-craft.test.ts | 1 | number | Rules+Coaching |
| scenario-pack.test.ts | 1 | value/shape | unassigned |
| shed-pursue.test.ts | 1 | value/shape | Defense |
| shotgun-rb-alignment.test.ts | 1 | number | unassigned |
| situation-depth.test.ts | 1 | number | unassigned |
| snap-count.test.ts | 1 | value/shape | unassigned |
| throw-body.test.ts | 1 | value/shape | QB |
| traffic-turning.test.ts | 1 | value/shape | unassigned |
