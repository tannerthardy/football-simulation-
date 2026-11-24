# Develop red tests: triage (Tools/Physics, 2026-11-23, develop 0226f0d3)

For Integration. Container Node 22.23.5 (the pin is 22.23.3). Full core suite on plain develop: 71 failing tests in 32 core files (plus `film-pairs` and `research/continued-recovery-world`, other tiers, both Node-pin or not isolated). The QB lane reports 68 in 32 files; the difference is the Node patch version and run order, not the set.

## In short

1. **22 of the 32 are a known ledger, not new.** `docs/reviews/2026-11-16-pin-delta-engine72.md` (Tools, develop e9023c6f) lists "still failing and owed to their lanes (27)", unchanged from the engine-71 note, and 22 of the files below are on it. They fail on the real engine (the `core-defaults` project) because their fixtures were recorded on the legacy engine and the lanes have not re-recorded them. They run red since #821 (engine-73) split the suite, before which every core test ran on the legacy pin.
2. **9 are new since that ledger and went red unseen**, from four landings: #851 (rules/stem-work, STEM_WORK on, engine-91) 5 files, #834 (rules/coverage-landing) 1, #840 (rules/half-key) 1, #845 (coverage/C14-settle-corner) 1, and visible-help (red at #821). A landing's own tests and the registry tests were verified, not the whole suite. For 7 of these 9 turning the promoted flag off (the stack flag off and the env var 0, because those tests stub the reference stack themselves) makes the file pass: STEM_WORK (acc-radius, qb-key-man, quick-hitch, arrival-lead, qb-rhythm), HALF_KEY (qb-peek-clock), RCV_KNOWS (pursuit-commit).
3. **1 is environmental:** baseline-runner (Node 22.23.5 against `.nvmrc` 22.23.3).
4. **qb-receiver-forecast** (the QB lane's item): a fixture the SIGHT_PURE promotion made wrong, see its row.

Pass/fail by class, not by the size of the assertion: none of these is a measurement of football. "Class" is my reading of the failing assertion and the flag that clears it; "real regression" needs the owning lane to say the test's contract still holds, which I could not judge from outside. The numeric ones near a threshold (qb-rhythm 3.4 vs 3.35, quick-hitch 5.216 vs 5.2, qb-key-man 0.857 vs 0.857) read as re-records; the structural ones (qb-peek-clock never reaching the end of the peek, qb-stick 3 pumps vs 4, pursuit-commit 10.4 vs 5.1) need their owner to look first.

## Method

- Failing set: `npm test` files on develop 0226f0d3 (the core projects; the QB lane's list reproduced).
- First bad merge: for each file, a binary search over develop's first-parent merges from #821 (6f1136ae8, where the suite split into `core` pinned and `core-defaults` real-engine) to head, running the single file in its own project. "#821" means it is red at the first commit where it ran on the real engine, so the bisect cannot go earlier; for those the engine-72 ledger and the flag are the evidence. For three files the merge was bisected inside its branch.
- Flag: `scripts/diag/pin-bisect.ts` (the minimum promoted flags that, pinned to 0, make the file pass), and for files that stub the reference stack in-file (acc-radius, qb-key-man, quick-hitch, qb-peek-clock, pursuit-commit) the stack flag set to `off` and the env var to 0, which pin-bisect cannot see ("fails even fully pinned" there is the in-file stub overriding the pin, not an environment fault).

## Table

| file | cases | first bad | flag that clears it (lane, engine promoted) | first failing assertion | class | owner |
|---|---|---|---|---|---|---|
| acc-radius | 1 | #851 rules/stem-work | STEM_WORK=0 clears it (stack flag off + env 0) | expected 4 to be greater than or equal to 6 | NEW since the ledger | Rules |
| apex-leverage | 2 | #821 (the split); on the engine-72 ledger | LINE_START (receivers, e42), WR_SNAP (receivers, e?) | expected 0.42353810267313285 to be less than 0.25516029458139117 | LEDGER (fixture not re-recorded) | the flag's lane |
| arrival-lead | 1 | #851 rules/stem-work | STEM_WORK=0 clears it (and pinning LINE_START) | expected 4 to be greater than 5 | NEW since the ledger | Rules |
| baseline-runner | 3 | n/a (Node 22.23.5 vs 22.23.3) | n/a | Error: Command failed: /opt/node22/bin/node /home/user/wt-census/scripts/baselin | ENV (Node pin) | n/a |
| catch-carry | 1 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66) | TypeError: Cannot read properties of undefined (reading 'pos') | LEDGER (fixture not re-recorded) | the flag's lane |
| catch-phase-control | 2 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66) | expected 8 to be less than 0 | LEDGER (fixture not re-recorded) | the flag's lane |
| chest-shoulders | 1 | #821 (the split); on the engine-72 ledger | CHEST_SHOULDERS (physics, e68) | expected -0.08608273090794274 to be -0.03546242479936075 // Object.is equa | LEDGER (fixture not re-recorded) | Tools/Physics (CHEST_SHOULDERS) |
| combo-climb-coupled | 1 | #821 (the split); on the engine-72 ledger | ENGAGE_FELT (perception / protection / run bloc, e66), ENGAGE_TRUNK (protection / run blocking, e68) | FAIL  /core-defaults/ test/combo-climb-coupled.test.ts > earned combination-to-c | LEDGER (fixture not re-recorded) | Trenches |
| coverage-run-support | 3 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66), SIGHT_COVER (coverage, e63) | expected false to be true // Object.is equality | LEDGER (fixture not re-recorded) | the flag's lane |
| cut-wall | 1 | #821 (the split); on the engine-72 ledger | CUT_WALL (coverage / zone match, e65) | expected [ 35.5, 23.583333333333332, …(30578) ] to deeply equal [ 35.5, 23 | LEDGER (fixture not re-recorded) | Coverage |
| man-throw-recognition | 1 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66) | expected false to be true // Object.is equality | LEDGER (fixture not re-recorded) | the flag's lane |
| outlet-last | 1 | #821 (the split); on the engine-72 ledger | PLAN_KEYS_2 (QB, e65), PLAN_ROLES (QB, e70), QB_RHYTHM_THROW (quarterback, e83) | expected 'defender_key' not to be 'defender_key' // Object.is equality | LEDGER (fixture not re-recorded) | the flag's lane |
| pursuit-commit | 1 | #834 rules/coverage-landing, inside it 1a44ee56f (merge of develop engine-79 RCV_KNOWS into the landing) | RCV_KNOWS=0 clears it; the 10 landing flags off do not | expected 10.437598911605619 to be less than 5.133443192367849 | NEW since the ledger | Rules (landing) / Defense (RCV_KNOWS) |
| qb-installed-box-count | 2 | #821 (the split); on the engine-72 ledger | QB_SEEN_MAN (quarterback, e63) | expected "normal" to be called 22 times, but got 24 times | LEDGER (fixture not re-recorded) | the flag's lane |
| qb-key-man | 1 | #851 rules/stem-work | STEM_WORK=0 clears it | expected 0.8571428571428571 to be greater than 0.8571428571428571 | NEW since the ledger | Rules |
| qb-peek-clock | 1 | #840 rules/half-key | HALF_KEY=0 clears it | TypeError: Cannot read properties of null (reading 't') | NEW since the ledger | Rules |
| qb-receiver-forecast | 1 | #821 (the split); on the engine-72 ledger | SIGHT_PURE (all sight-gated pictures, e72); also ROUTE_FILLET in the engine-72 note | expected 'set' to be 'windup' | LEDGER (fixture made wrong by SIGHT_PURE) | QB |
| qb-rhythm | 1 | #851 rules/stem-work | STEM_WORK=0 clears it (and pinning SIGHT_COVER) | expected 3.4 to be less than or equal to 3.35 | NEW since the ledger | Rules |
| qb-seen-out | 2 | #821 (the split); on the engine-72 ledger | BACK_RELEASE (pass protection / routes, e34), BLITZ_CREEP (defense, e?), QB_CALL_ROUTES (quarterback, e73), QB_TICK_PICTURE (quarterback, e70) | expected 0 to be greater than or equal to 2 | LEDGER (fixture not re-recorded) | the flag's lane |
| qb-stick | 1 | #845 coverage/C14-settle-corner, inside it 8c4fb29d7 (merge of develop into the branch) | FLAT_SINK=0 alone does not clear it; fails on the branch merge of develop, so an interaction | expected 3 to be 4 // Object.is equality | NEW since the ledger | Coverage |
| quarter-flat-force-support | 1 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66) | expected false to be true // Object.is equality | LEDGER (fixture not re-recorded) | the flag's lane |
| quick-hitch | 1 | #851 rules/stem-work | STEM_WORK=0 clears it | expected 5.215914332172751 to be less than or equal to 5.2 | NEW since the ledger | Rules |
| rat-coverage | 2 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66), SIGHT_COVER (coverage, e63) | expected 'man:Y' to be 'zone:hole' // Object.is equality | LEDGER (fixture not re-recorded) | the flag's lane |
| release-evidence | 2 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66) | expected [] to deeply equal [ 'motion', 'through', 'pulled' ] | LEDGER (fixture not re-recorded) | the flag's lane |
| run-anchor | 1 | #821 (the split); on the engine-72 ledger | ENGAGE_TRUNK (protection / run blocking, e68) | expected 0.3376105105133931 to be less than 0.2643741931176919 | LEDGER (fixture not re-recorded) | Trenches |
| screen-declare | 1 | #821 (the split); on the engine-72 ledger | DECLARED_BREAK (QB, e68) | expected 1.8 to be less than 1.3 | LEDGER (fixture not re-recorded) | the flag's lane |
| screen-install | 1 | #821 (the split); on the engine-72 ledger | CLOUD_KILL (QB, e66) | expected 'run' to be 'pass' // Object.is equality | LEDGER (fixture not re-recorded) | the flag's lane |
| stretch-closure | 4 | #821 (the split); on the engine-72 ledger | ENGAGE_FELT (perception / protection / run bloc, e66), ENGAGE_TRUNK (protection / run blocking, e68) | FAIL  /core-defaults/ test/stretch-closure.test.ts > stretch connection footwork | LEDGER (fixture not re-recorded) | Trenches |
| stretch-normal-follow | 10 | #821 (the split); on the engine-72 ledger | ENGAGE_FELT (perception / protection / run bloc, e66), ENGAGE_TRUNK (protection / run blocking, e68) | FAIL  /core-defaults/ test/stretch-normal-follow.test.ts > stretch connection fo | LEDGER (fixture not re-recorded) | Trenches |
| throw-sight | 2 | #821 (the split); on the engine-72 ledger | RELEASE_BELIEF (defense, e66), SIGHT_COVER (coverage, e63) | expected false to be true // Object.is equality | LEDGER (fixture not re-recorded) | the flag's lane |
| visible-help | 8 | #821 (engine-73), not in the engine-72 ledger (which lists it as passing) | pinning SIGHT_COVER clears it (pin-bisect); inside #821 not bisected | expected false to be true // Object.is equality | NEW since the ledger | QB / Coverage |
| zone-track | 1 | #821 (the split); on the engine-72 ledger | SIGHT_COVER (coverage, e63) | expected [] to have a length of 1 but got +0 | LEDGER (fixture not re-recorded) | the flag's lane |

## Notes per file

- **qb-receiver-forecast:** the fixture parks every defender at (15, 26), 25 yd behind the quarterback and out of his view. Under SIGHT_PURE (playsim.ts `sightedPure`) a man not in sight on any recorded tick is held at his alignment, so the QB sees the window as blocked: pOpen 0.89 x pClear 0.15 x pAcc 0.83 x hands 0.92 = P 0.10 against need 0.54, intRisk 0.072 against 0.047. Defenders parked in view and off the path (x = los + 25, y = 50) pass all 9 tests with SIGHT_PURE on and no engine change. Not evidence about live release timing.
- **qb-peek-clock:** `TypeError ... reading 't'` is the test's own `off!` (the `on` arm never records `triDone`): with HALF_KEY on the staged four_verts vs cover2_match play (seed 2, flipped) no longer reaches the end of the vertical peek inside 400 ticks while the QB carries the ball. HALF_KEY=0 restores it. Not diagnosed further (a changed outcome of a staged play, which the owner should look at).
- **pursuit-commit:** first bad is the merge of develop's RCV_KNOWS (engine-79) into the #834 coverage landing (1a44ee56f); RCV_KNOWS=0 clears it. Its failing quantity (the bearing to the planned meeting jumps 10.4 vs 5.1) is a dither-style row.
- **qb-stick:** arrives with 8c4fb29d7, the merge of develop into settle-corner, not with FLAT_SINK alone (FLAT_SINK=0 does not clear it): an interaction of the branch with develop.
- **visible-help:** the engine-72 note says it was failing from worker memory (infrastructure) and then passing; it is red now on 8 cases and the pin-bisect culprit is SIGHT_COVER (engine-63). Not bisected inside #821.
- **chest-shoulders and cut-wall** are tests of a promoted flag's off path (CHEST_SHOULDERS, CUT_WALL): they belong in the pinned list or need rewriting for the on path.
- **film-pairs** ("Use supported Node22.23.3") and **research/continued-recovery-world** are outside the core tier; the first is the Node pin.

## What this does and does not say

- It does not say any landing broke football. It says the suite is red on develop in 32 files, that 22 were red and ledgered before, and that four landings (#834, #840, #845, #851) added 8 more that nobody saw because landings verified registry tests and their own tests, not the whole suite.
- Re-recording is the owners'. The cheapest check that would have caught the new 8: run `npm test` on the landing merge and diff the failing set against the ledger. The pin-bisect and the per-file first-parent scan are in `scripts/diag/pin-bisect.ts` and the method above.
