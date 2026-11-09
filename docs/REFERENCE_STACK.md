# The run-game reference stack

One combination of experimental flags that Run Game, Defense, Flex and Coverage all measure against. Before this, each agent tested on its own mix (the FLAT_PRESS / ZONE_RUN back-and-forth on 2026-11-09 came from two different flag sets), and no list of anyone's stack existed in the repository.

- **The stack:** [`config/reference-stack.json`](../config/reference-stack.json), id `run-ref-2`. `run-ref-2` (2026-11-09) is `run-ref-1` with `ZONE_PAIR` off; the Results tables below are `run-ref-1`. Every flag the source reads as `=== '1'` is listed as `on`, `off` or `retired`; `npm run ref` fails if the file and `src` disagree.
- **The code:** `run/G3-oz-backfield` a749beb7 + `defense/G2-stance-tell` a0cb0789 (#411) + `defense/G2-lb-start` (#416, with #409) + `claude/quirky-franklin-9lbwbp` (#417, with #415) + develop 6676dfc2.
- **Code defaults are unchanged.** `on` here means "on in the reference", not "default in the engine". The combined stack is not ready to become the default: together the flags take run yards below the NFL (see Results).

## Use it

```sh
npm run ref -- <command>                      # the reference stack
npm run ref -- --flag ZONE_RUN=0 -- <command> # the stack with one change: say so when you report
npm run ref -- --off -- <command>             # every experimental flag at its code default
npm run ref -- --list
```

`ref` sets every listed flag explicitly, so nothing leaks in from the shell. Report a measurement as "run-ref-1 @ commit" plus any `--flag` changes. A new flag must be added to the stack file (as `off`) in the commit that adds it.

The matched run set and paired comparison:

```sh
for s in 7 9 11 13 15 17 19 21 23 25 27 29; do node --import tsx scripts/diag/edge/capture-runs.ts $s --label $s-run; done   # 1,321 runs, code defaults
npm run -s ref -- --off -- node --import tsx scripts/diag/ref-replay.mts off
npm run -s ref -- node --import tsx scripts/diag/ref-replay.mts ref
python3 -I scripts/diag/ref-compare.py off ref
```

One arm takes about 5 CPU-minutes. Operators: [`scripts/diag/run-operators/README.md`](../scripts/diag/run-operators/README.md), with `npm run -s ref --` in place of `baseline:run`.

## Decisions

Rule used: a flag is **on** when its own row in [FLAGS.md](FLAGS.md) (or its PR) shows a measured move toward the NFL or a correctness fix, and its author did not hold it. Run Game's flags depend on each other and were measured with "all other flags on", so they were judged as a set (alone, the set lands near the NFL; see Results). **Off** means kept, still experimental. **Retired** means do not enable; `ref` refuses it, and the code path can be deleted at the next cleanup.

| Decision | Flags | Why |
|---|---|---|
| **On: Run Game (60)** | `ENGAGED_TECHNIQUE` `ENGAGED_DEFENDER` `REACH_TECHNIQUE` `REACH_RACE` `REACH_CARRY` `REACH_FLAT` `IZ_FLAT` `CUTOFF_RACE` `BACKSIDE_COMBO` `DOUBLE_HANDOFF` `DOUBLE_FLOW` `DOUBLE_OVERTAKE` `DOUBLE_TRACK` `RELEASE_QUICK` `RELEASE_INTERCEPT` `CLIMB_PREP` `CLIMB_SQUARE` `CLIMB_BASE` `CLIMB_RIP` `CLIMB_SLIDE` `CLIMB_PATH` `CLIMB_RUNNER_SIDE` `BLOCKER_NEXT` `L2_BREAKDOWN` `LEVEL2_TIME` `LINE_STEP` `FEET_SETTLE` `ANCHOR_GRADE` `ZONE_GAP` `ZONE_ARMS` `ZONE_SCOOP` `ZONE_ONBALL` `ZONE_MUG` `ZONE_WINGS` `WING_CALL` `WING_WORK` `NO_CROSS` `FB_PLAYSIDE` `TE_OFF` `RB_STEER` `RB_COMMIT` `RB_HELD` `HELD_SIDE` `RB_FLOW` `RB_TEMPO` `RB_GATHER` `OZ_HIP_READ` `BACKFIELD_DEPTH` `STRETCH_OFFSET` `IZ_OFFSET` `COUNTER_OFFSET` `COUNTER_C` `IZ_GUN_A` `MESH_TEMPO` `MESH_GUN_SIDE` `GUN_MESH` `GUN_MESH_GO` `GUN_SNAP` `DRAW_NFL` `RUN_FORM_PAIR` | Run Game's working stack. Alone on the matched set: OZ 3.22, IZ 4.27 yd under 20 (NFL 3.50 / 3.73). `GUN_SNAP` also delays pass drops; checked on four full games below |
| **On: Defense (22)** | `ZONE_RUN` `FLAT_PRESS` `KEY_REACT` `KEY_PACE` `KEY_DEPTH` `STANCE_TELL` `TOUCH_READ` `SHED_ROUTE` `LB_LINE_FLOW` `LB_GUARD_STEP` `RUN_CONFIRM` `LB_READ_STEP` `BLITZ_CREEP` `RUN_BLITZ` `END_CHASE` `DB_SLOWPLAY` `TIGHT_OFF` `SLOT_LEV` `ALIGN_HABIT` `MUG_CALLS` `NICKEL_FRONTS` `SHORT_BASE` | Each row has a same-operator NFL comparison that moves toward the NFL, or is a correctness fix. **`ZONE_RUN` and `FLAT_PRESS` are both on**: with `ZONE_RUN` on, `FLAT_PRESS` is inert (Defense's own note), and it repairs the path anyone takes with `--flag ZONE_RUN=0`. That ends the either/or |
| **On: Flex (4)** | `RUN_HAND_MOVE` `SHED_PAST` `SHED_PAST_GATE` `LEG_ALLOMETRY` | Shed trio: blocked-hitter stops 25 -> 39% (NFL 43%). `LEG_ALLOMETRY`: fitted on 6,745 combine athletes; removing it from the stack changes paired yards +0.06 (SE 0.07), so it costs nothing here. Tanner and Primary still own its promotion to default |
| **Off: held by the author** | `ZONE_PAIR` `STRETCH_TRACK` `CARRIER_BRACE` `MESH_NFL` `RACE_LEAN` `BACKSIDE_SHOOT` `SINK_LEAD` `SAM_ON_TE` `DEF_STANCE` | `ZONE_PAIR` (run-ref-1 had it on; Run Game, 2026-11-09): it caused the reference's slow inside-zone line step. An uncovered lineman paired with whichever covered neighbor's man was nearer, often the backside one, so he stepped away from the play. Full stack with `ZONE_PAIR=0` (546 matched zone runs, linestep.py): IZ line stepping one way by 0.6 s 56 -> 93% (NFL 78%), OL lateral at 0.5 s 1.20 -> 1.35 yd/s (NFL 1.30); OZ 84 -> 95% (NFL 97%), 1.65 -> 1.85 (NFL 2.25); paired yards OZ +0.10 (SE 0.26), IZ +0.24 (0.36); IZ runs <= 0 7 -> 17% (NFL 14%). The installed rule (pair with the play-side neighbor) keeps every zone lineman's first step to the play. `STRETCH_TRACK`: "not for promotion", under-center cost unexplained. `CARRIER_BRACE`: moves whole runs further above the NFL. `MESH_NFL`: superseded for the gun by `GUN_MESH`; its under-center half belongs to mesh-model step 2. `RACE_LEAN`: trades DL depth for drive-backs, "no single press gives both". `BACKSIDE_SHOOT`: waits on the push contest. `SINK_LEAD`: "not the lever". `SAM_ON_TE`: a call option, not an NFL correction. `DEF_STANCE`: assumed costs, not fitted |
| **Off: no measurement in the row** | `LB_RUN_THROUGH` `EDGE_WIDTH` | Neither row has a number. In the stack `LB_RUN_THROUGH` costs 0.20 yd a run (SE 0.04) with nothing to say it is right. Measure against the NFL first |
| **Retired** | `GUN_STRETCH_T` `WRAP_FOOT` | `GUN_STRETCH_T`: built on a mixed reference, "do not enable". `WRAP_FOOT`: adverse result recorded (backfield stops 26 -> 20% vs NFL 53%) |
| **Off: not reviewed here** | `DEEP_NO_FORCE` `DL_FIGHT` `DL_HANDS` `GAZE` `HAND_FIGHT` `HAND_MOTOR` `IN_STRIDE_CATCH` `PASS_SINK` `PULL_CUE` `PULL_PLAN` `REACH_CONTACT` `READ_RISK_TRACE` `RUN_CONTACT_TRACK` `RUN_HANDS` `RUN_READ` `RUN_READ_TURN` `TACKLE_TOUCH` | Older or other-lane flags with no evidence in FLAGS.md. Note: `REACH_TECHNIQUE`'s hand steering and `RUN_HANDS` act only with `HAND_MOTOR`, which is off |

Not on this branch, so not in the stack: `ONE_ARM_HOLD` (#412), `HELD_SWING` (#414), `RELEASE_REDECIDE` (#410), `DL_GAMES` (#407).

## Results (run-ref-1, 2026-11-09)

Matched run set: 12 run-only games, 1,321 runs, captured at code defaults; every arm replays the same snaps. Yards capped at 20 for means. NFL: 2022 tracking, weeks 1-9, same operators.

| | n | All flags off | Run Game only | Defense + Flex only | **Reference** | NFL |
|---|---|---|---|---|---|---|
| Outside zone, yd under 20 | 395 | 4.00 | 3.22 | 2.19 | **2.40** | 3.50 |
| Outside zone, runs <= 0 | | 12% | 15% | 39% | **23%** | 19% |
| Inside zone, yd under 20 | 215 | 3.35 | 4.27 | 4.43 | **3.51** | 3.73 |
| Inside zone, runs <= 0 | | 20% | 8% | 17% | **7%** | |
| Gap runs, yd under 20 | 445 | 4.56 | 3.91 | 4.04 | **3.18** | 4.08 (counter) |
| All runs, yd under 20 | 1,321 | 4.17 | 3.68 | 3.38 | **2.95** | |
| All runs, 10+ yd | | 12.9% | 8.3% | 9.8% | **5.1%** | 9% |

Paired, reference vs all off: -1.23 yd (SE 0.18). No replay threw an error in any arm.

**The combination nobody had run is short of the NFL.** Run Game's set alone is close. Defense's set alone, against the old offense, stops 39% of outside zone for no gain (Defense said to promote the two together; this is why). Together, outside zone is a yard short and long runs are half the NFL rate.

**No single flag causes it.** Removing one group or flag from the draft stack (paired yards, all runs):

| Removed | Paired yd (SE) | Note |
|---|---|---|
| LB group (`LB_LINE_FLOW` `LB_GUARD_STEP` `LB_RUN_THROUGH` `RUN_CONFIRM` `LB_READ_STEP`) | +0.46 (0.10) | OZ +0.66, IZ +0.82 |
| `RUN_CONFIRM` | +0.30 (0.08) | |
| `LB_RUN_THROUGH` | +0.20 (0.04) | now off |
| `LB_LINE_FLOW` | +0.17 (0.06) | IZ +0.64 |
| `LB_GUARD_STEP` / `LB_READ_STEP` | +0.01 / +0.06 | |
| Shed trio (`RUN_HAND_MOVE` `SHED_PAST` `SHED_PAST_GATE`) | +0.37 (0.09) | `SHED_PAST_GATE` alone removed: -0.15 (0.03), so the gate helps |
| DL group (`ZONE_RUN` `KEY_*` `STANCE_TELL` `FLAT_PRESS` `TOUCH_READ` `SHED_ROUTE`) | +0.08 (0.11) | OZ runs <= 0 25 -> 20% |
| `ZONE_RUN` / `KEY_PACE` | +0.03 / +0.11 | |
| Edge and blitz (`BLITZ_CREEP` `RUN_BLITZ` `END_CHASE` `EDGE_WIDTH`) | +0.01 (0.11) | |
| Alignment and calls (`TIGHT_OFF` `SLOT_LEV` `ALIGN_HABIT` `MUG_CALLS` `NICKEL_FRONTS` `SHORT_BASE` `DB_SLOWPLAY`) | +0.05 (0.11) | OZ +0.32 |
| `LEG_ALLOMETRY` | +0.06 (0.07) | |

**Where the yards go (operators, zone runs).** The defense now arrives about as it should; the carrier gains too little after the hit.

| Operator | All off | Reference | NFL |
|---|---|---|---|
| hitblk OZ: yards when the first hitter is blocked / shed / free | 2.30 / 3.54 / 6.08 | 1.41 / 2.03 / 3.73 | 3.39 / 3.12 / 5.77 |
| hitblk IZ: blocked / shed / free | 1.83 / 4.43 / 5.06 | 2.85 / 3.87 / 4.01 | 3.58 / 3.14 / 5.49 |
| hitterback: carrier gain after a front-on first contact at -1..0 / 0..1 / 1..3 yd | 0.62 / 0.82 / 1.15 | 0.56 / 0.63 / 0.71 | 2.16 / 2.51 / 2.59 |
| pile: carrier forward speed with 1 / 2 defenders on him (yd/s) | 2.13 / 0.94 | 1.70 / 0.72 | 2.75 / 1.50 |
| pile: 2nd / 3rd defender arrives | 57% / 22% | 62% / 30% | 80% / 43% |
| trench2: DL depth at 2.0 s; driven back >= 0.5 yd from the snap | +0.44; 6% | +0.45; 10% | +0.70; 14% |
| bsend OZ: backside end depth at 1.5 s | +0.08 | -0.47 | -0.70 |
| linestep IZ: line stepping one way by 0.6 s | 83% | 48% | 78% |
| linestep OZ: median OL lateral speed at 0.5 s (yd/s) | 1.60 | 1.65 | 2.25 |
| mesh, gun: handoff time by concept (s) | 0.9-1.4 | 1.10 all | 1.0-1.1 |
| mesh, gun IZ / OZ: back speed at the exchange (yd/s) | 3.53 / 3.53 | 4.20 / 4.91 | 3.83 / 4.74 |

Next questions this raises, for the owners:
- **After contact** is the largest gap and the reference makes it worse, not better (Flex, Run Game: contact to whistle; `ONE_ARM_HOLD` and `HELD_SWING` are not in this stack).
- **Inside zone's line step got slower** in the reference (48% by 0.6 s; all off 83%, NFL 78%). Run Game: which of the zone-track flags does this.
- **The linebacker reads cost the most yards** and each matches the NFL on its own timing operator. They are right to keep; the offense's second-level answer is what is missing.

## Merged after run-ref-1 (2026-11-09)

#411 (later commits), #417 (later commits), #400, #346, #324, #420, #414, #407, #406, #421 and #403 are on develop. The stack id is unchanged: the new off-by-default flags (`HELD_SWING`, `DL_GAMES`, `BACKER_TAKEON`, `MUG_PRESSURES`) are listed `off`. On the matched run set the reference moved -0.05 yd a run (SE 0.04) and all-flags-off -0.13 (SE 0.08); no replay errors. `npm run test:all`: 4,121 of 4,123, the same two research failures as develop.

## run-ref-2: `ZONE_PAIR` off (2026-11-09)

Run Game traced the slow inside-zone line step to `ZONE_PAIR`: an uncovered lineman paired with whichever covered neighbour's man was nearer, often the backside one, and stepped away from the play. Checked independently on the 1,321-run set (develop 8696d32a, `run-ref-1` vs `run-ref-2`):

| | run-ref-1 | run-ref-2 | NFL |
|---|---|---|---|
| IZ line stepping one way by 0.6 s | 48% | 93% | 78% |
| IZ / OZ median OL lateral speed at 0.5 s (yd/s) | 1.05 / 1.65 | 1.35 / 1.85 | 1.30 / 2.25 |
| OZ line stepping one way by 0.6 s | 87% | 97% | 97% |
| IZ yd under 20; runs <= 0 | 3.52; 7% | 3.16; 22% | 3.73; 14% |
| OZ yd under 20; runs <= 0 | 2.47; 24% | 2.56; 28% | 3.50; 19% |
| All runs, paired yd | | -0.09 (SE 0.09) | |

The line now steps as it should. Stops for no gain rise past the NFL on both zone concepts (inside zone was far too low before); that goes with the after-contact and second-level items below, not back onto `ZONE_PAIR`.

## What to do next

Ordered by how much each unblocks. Every measurement below is taken on `npm run ref` and reported with the stack id.

1. **Contact to whistle (Flex, Run Game).** The largest gap, and the reference widens it: a carrier gains 0.6-0.7 yd after a front-on first hit (NFL 2.2-2.6) and a second defender arrives on 62% of contacts (NFL 80%). Three open PRs all touch it and have never been measured together: `ONE_ARM_HOLD` (#412), `HELD_SWING` (#414, merged off) and the grasp-timing fix (#418). #418 removes the same recovery coupling that the retired `WRAP_FOOT` loosened, and `WRAP_FOOT`'s recorded result was adverse (backfield stops 26 -> 20%, NFL 53%), so #418 needs that table rerun on the reference before it merges. One owner, one table: hitterback, pile and stuffbin for off / each / all three.
2. **Inside zone's line step (Run Game).** In the reference 48% of inside-zone lines are stepping one way by 0.6 s; with all flags off it is 83%, NFL 78%. Find which of the zone-track flags does it (`ZONE_ARMS`, `IZ_FLAT`, `LINE_STEP`, `DOUBLE_TRACK` are the candidates) with one-flag removals.
3. **The second level (Run Game, with Defense).** Re-measured on `run-ref-2`: the linebacker reads no longer cost zone yards (1,321 runs, read removed: `RUN_CONFIRM` OZ -0.06 (SE 0.14), IZ +0.00 (0.17), gap +0.28 (0.17); `LB_LINE_FLOW` OZ -0.37 (0.15), IZ +0.08 (0.23)). The cost on `run-ref-1` came through `ZONE_PAIR`'s backward line step. Leave the reads alone. Run Game's measurement (544 zone runs under `npm run ref`): the first lineman reaches a box backer at 2.00 s on IZ and 2.25 s on OZ (NFL 1.40 / 1.60). Two parts: (a) Defense: box backers stand 0.2-0.3 yd deep and come downhill about 0.4 s late (depth at 1.0 s 4.2 vs NFL 3.4; OZ lateral 0.8 vs 1.6 yd); (b) Run Game, the larger part: the zone line never gets vertical (OZ linemen forward at 2.0 s +0.1 to +0.3 yd vs NFL +0.9 to +1.1; 1.5 yd past the line before contact 7-14% vs 42-43%). Run Game is tracing request against achieved for uncovered OZ linemen, which also answers item 4.
4. **Outside zone's edge (Run Game, Defense).** Outside zone is 1.1 yd short and stopped for no gain on 23% (NFL 19%). OL lateral pace at 0.5 s is 1.65 yd/s (NFL 2.25); the reach is still slow. This is `REACH_CARRY`'s open item (loaded acceleration in World, Flex).
5. **Measure the two unmeasured flags or drop them (Defense).** `LB_RUN_THROUGH` and `EDGE_WIDTH` need a same-operator NFL number to go on.
6. **Play-calling flags (Defense, Run Game).** Capture a second matched set under `npm run ref` so `RUN_FORM_PAIR`, `MUG_CALLS`, `NICKEL_FRONTS` and `SHORT_BASE` are exercised, then check formation and front shares against the 2022 shares in their rows.
7. **Pass side (Coverage, QB).** Run Coverage's panel on the reference: `GUN_SNAP` delays every gun drop by about 0.2 s, and `TIGHT_OFF`, `SLOT_LEV`, `ALIGN_HABIT`, `RUN_CONFIRM` and `LB_READ_STEP` all move pass defenders. The four-game check here is too small to clear them.
8. **Promotion.** When items 1-4 bring the reference near the NFL without a known wrong mechanism, flip the `on` flags to default in one PR, re-pin the 178 tests listed under Checks with their owners, delete the off paths of the retired flags, and bump the stack id.

Open PRs that were not merged in this pass, and why:

| PR | Why it waits |
|---|---|
| #408 QB throwing motion | Conflicts with #420 in `receiver-forecast.ts` (break timing vs option-route answers in the same class) and both re-record the same pinned catch scene. QB and Coverage need to combine them |
| #418 grasp force timing | See item 1 |
| #412 `ONE_ARM_HOLD`, #410 `RELEASE_REDECIDE` | Default-on; #412's own note leaves the doubled broken-tackle rate for Tanner to judge. Measure in item 1 |
| #419 coverage spacing, #401 / #402 / #405 Defense | Default behaviour changes that conflict with the merged Defense code and re-pin the same ledger cases. #402 overlaps `LB_GUARD_STEP` / `LB_READ_STEP` |
| #396-#399 run fits and formation spec | A four-PR stack on older bases; conflicts in formations and pinned cases |
| #335, #322, #295 | October branches with conflicts; port what is still wanted |
| #309, #369, #321 | Marked hold or not for merge by their authors |

## Checks

Node 22.23.3, 2026-11-09, on the merged code.

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run build` | clean |
| `npm run test:all`, code defaults | 4,052 of 4,054 pass. The 2 failures (`test/research/continued-recovery-world.test.ts`, frontal tackle, both sides) fail the same way on develop 6676dfc2 and on each source branch |
| `npm run test:data` | 298 pass |
| Matched run set, every arm (about 25,000 replays) | no errors thrown |
| Four full games (565 snaps), all off vs reference | no errors; pass plays 9.06 -> 9.36 yd a play, incompletions 123 -> 119 of 392. With `GUN_SNAP` removed from the reference: 8.63. The later gun drop does not hurt the pass game on this sample; it is small, so Coverage should confirm on its own panel |
| `npm run ref -- npm test` (core tests on the reference) | 3,607 of 3,787 pass; 178 fail in 55 files. These tests pin default-flag behaviour (22 in `responsibility-ledger`, 9 each in `support-work-off` and `support-escape-objective`, 8 in `man-run-continuity`, ...). The 8 TypeErrors among them are test lookups of a recorded witness that no longer occurs, none inside `src`. This list is the re-pin work that promoting the stack to default would cost |

Two tests were re-pinned for the merge itself (code defaults): `line-read` (the late backside box now shows on I twins seed 7, not the I-pro pair) and `responsibility-ledger` M7-P051 (first contact 1.85 s with develop's wing width).

Merge note: `LB_GUARD_STEP` (#411) and `LB_READ_STEP` (#416) both act on the unsure box backer. The guard step wins when the guards show one; otherwise the read step.

Limits of this pass:
- The matched set is captured at code defaults, so the play-calling flags (`RUN_FORM_PAIR`, `MUG_CALLS`, `NICKEL_FRONTS`, `SHORT_BASE`) change nothing in it. They were exercised only in the test suite run. Capture under `npm run ref --` to measure them.
- Group and single-flag removals were run on the draft stack (`LB_RUN_THROUGH` and `EDGE_WIDTH` still on); the Results table is the final stack.
- No scorecard or full-season run was made.
