# The run-game reference stack

One combination of experimental flags that Run Game, Defense, Flex and Coverage all measure against. Before this, each agent tested on its own mix (the FLAT_PRESS / ZONE_RUN back-and-forth on 2026-11-09 came from two different flag sets), and no list of anyone's stack existed in the repository.

- **The stack:** [`config/reference-stack.json`](../config/reference-stack.json), id `engine-66`. From `engine-27` the stack is named `engine-N`, continuing the count: `engine-27` follows `run-ref-26`, and `run-ref-1` to `run-ref-26` keep their names in the record (the stack began as the run-game reference and has been the whole engine's default since `run-ref-4`). `run-ref-2` (2026-11-09) is `run-ref-1` with `ZONE_PAIR` off; the Results tables below are `run-ref-1`. Every flag the source reads as `=== '1'` is listed as `on`, `off` or `retired`; `npm run ref` fails if the file and `src` disagree.
- **The code:** `run/G3-oz-backfield` a749beb7 + `defense/G2-stance-tell` a0cb0789 (#411) + `defense/G2-lb-start` (#416, with #409) + `claude/quirky-franklin-9lbwbp` (#417, with #415) + develop 6676dfc2.
- **Since 2026-11-09 the stack is the engine's default.** The flags listed `on` are read as on unless set to `0`; a bare command in a clean shell and `npm run ref -- <command>` run the same engine. `npm run ref -- --off -- <command>` runs the legacy engine (every listed flag off). `test/reference-stack.test.ts` fails if the file and the code defaults ever disagree. See "Promotion" below.

## Promotion to default (2026-11-09)

The stack was published on 2026-11-09 as a reference only, because the first combination undershot the NFL. Since then `ZONE_PAIR` came out, three run-blocking fixes and the contact-to-whistle work went in, and the old defaults drifted further from football (`ONE_ARM_HOLD` and the other default-on merges landed on an engine with none of the run-game or run-defense work). The quick scorecard (6 games an arm, same games; [full report](reviews/2026-11-09-scorecard-legacy-vs-run-ref-4.md)) made the case:

| Per team-game or as marked | Legacy defaults | run-ref-4 | NFL band |
|---|---|---|---|
| Points | 52.9 | 41.3 | 21-23.5 |
| Total yards | 632 | 470 | 320-345 |
| Rush yards a carry | 7.95 | 3.61 | 3.70-4.83 |
| 10+ yd runs | 21.1% | 7.0% | 7.6-12.9% |
| Run stuff rate | 11.2% | 14.1% | 15.9-23.5% |
| Missed + broken tackles a play | 0.41 | 0.32 | 0.11-0.16 (unsourced) |
| 3rd-down conversion | 43.8% | 28.0% | 37-41% |
| Sack rate | 9.6% | 12.4% | 4.6-9.4% |
| INT rate | 3.5% | 4.2% | 1.5-3.2% |
| Yards an attempt | 12.15 | 11.37 | 6.35-7.89 |
| YAC a reception | 13.33 | 11.91 | 4.53-5.91 |

What was done:
- The 90 `on` flags are read as `!== '0'` in `src` (95 sites). No other code changed. Checked on the 1,321-run set: the stack arm, the legacy arm (`--off`) and a bare run with an empty environment give the same per-play results as before the change, the bare run now matching the stack.
- **The test suites still run on the legacy engine.** `vitest.config.ts` pins every promoted flag to `0` for all four tiers, so no recorded case moved and nothing was re-recorded. `TEST_ENGINE_DEFAULTS=1 npm test` runs them on the real defaults: 173 core tests in 61 files then fail because they pin legacy behaviour (most in `responsibility-ledger` 16, `combo-transfer` 15, `support-work-off` 9, `support-escape-objective` 9, `man-run-continuity` 8, `runner-side-recovery` 7, `combo-attention` 7). Each lane re-records its files and removes flags from the pin as it goes; a new test should be written for the real defaults (stub the pin off for the flags it needs).
- **Since 2026-11-14 most of the core suite runs on the real engine.** `test/engine-pin.json` splits the core files: `defaults` run with no flag pinned, `pinned` still run with every promoted flag at `0`. The pinned list may only shrink (`test/engine-pin-manifest.test.ts`): a file leaves it when it passes on the defaults, and a new test file is a defaults file. `node --import tsx scripts/diag/pin-bisect.ts` names, per pinned file, the flags it needs pinned, so a lane can see what blocks deleting a flag and its legacy path; `TEST_PIN_FLAGS=A,B` pins only those flags.
- `config/baseline.json` is unchanged: it remains the historical profile, with these flags at `0`.

What the promotion does not fix, in order of size at the game level:
1. **The pass game is the largest remaining error:** 11.4 yards an attempt and 11.9 yards after the catch a reception (NFL 6.35-7.89 and 4.53-5.91), 20% of attempts completed for 20+. This is G3 and G1 in the open field, and it is now bigger than anything left in the run game.
2. **Sacks rose** to 12.4% of dropbacks (from 9.6%; NFL 4.6-9.4%). Part is the QB's throwing motion meeting an early-collapsing pocket (#408, G5); Coverage is measuring it with #424.
3. **Third downs** convert 28% (NFL 37-41%), which goes with sacks and a run game now slightly under the band.
4. **Outside zone** is still about a yard short (see the current-state table).

## Current state (run-ref-4 @ develop 0e09c4dc, 2026-11-09)

From `npm run ref:report`; full output in [reviews/run-ref-4-report.md](reviews/run-ref-4-report.md). 1,321 fixed runs, yards capped at 20.

| | Legacy (all flags off; the default until the promotion) | Reference (now the default) | NFL 2022 |
|---|---|---|---|
| All runs, yd | 5.19 | 3.56 | |
| Outside zone yd; runs <= 0 | 4.69; 11% | 2.73; 23% | 3.50; 19% |
| Inside zone yd; runs <= 0 | 4.40; 15% | 4.46; 14% | 3.73; 14% |
| Gap runs yd | 5.42 | 3.74 | 4.08 (counter) |
| 10+ yd runs | 16.7% | 7.8% | 9% |
| Broken / missed tackles a run | 0.30 / 0.27 | 0.17 / 0.23 | |
| OZ first contact by a blocked DL | 46% | 53% | 33% |
| OZ yards when the first hitter is blocked | 3.98 | 1.86 | 3.39 |
| IZ yards when the first hitter is blocked | 2.82 | 4.16 | 3.58 |
| Carrier gain after a front-on hit at -1..0 / 0..1 / 1..3 yd | 0.71 / 1.02 / 1.17 | 0.92 / 0.92 / 0.78 | 2.16 / 2.51 / 2.59 |
| Second / third defender arrives | 66% / 34% | 70% / 41% | 80% / 43% |
| DL depth at 2.0 s | +0.43 | +0.73 | +0.70 |
| IZ / OZ line stepping one way by 0.6 s | 82% / 100% | 94% / 97% | 78% / 97% |
| OZ OL lateral speed at 0.5 s (yd/s) | 1.60 | 1.85 | 2.25 |
| Backside end depth at 1.5 s, OZ | +0.09 | -0.47 | -0.70 |
| Gun handoff time, by concept (s) | 0.9-1.4 | 1.10 all | 1.0-1.1 |

Two things this table says:
- **The legacy defaults were the outlier.** With every experimental flag off the engine runs for 5.19 yd a carry with 16.7% of runs going 10+; the reference is at 3.56 and 7.8%. That is why the stack was promoted to default the same day.
- **Outside zone's missing yard has a signature.** A blocked defensive lineman makes first contact on 53% of outside-zone runs (NFL 33%), and those runs gain 1.86 yd (NFL 3.39). The back is running into engaged linemen on a line that does not move its men (Run Game's flat line and missing climbs).

## Use it

```sh
npm run ref -- <command>                      # the reference stack (= the code defaults), with ambient flags reset
npm run ref -- --flag ZONE_RUN=0 -- <command> # the stack with one change: say so when you report
npm run ref -- --off -- <command>             # the legacy engine: every listed flag off
npm run ref -- --list
```

`ref` sets every listed flag explicitly, so nothing leaks in from the shell. Report a measurement as "run-ref-1 @ commit" plus any `--flag` changes. A new flag must be added to the stack file (as `off`) in the commit that adds it.

The standard report, which every lane should quote:

```sh
npm run ref:report                                   # all flags off vs the reference: yards, tackles, eight operators with the NFL beside them
npm run ref:report -- --flag GAP_CLIMB=0             # adds a "candidate" arm (the stack with that change), paired against the reference
npm run ref:report -- --skip-operators               # yards and tackles only
```

It takes about 7 minutes (4 with `--skip-operators`) and writes `out/ref/report.md`. The play set is fixed: `runSet` in the stack file names the commit that captured it (1b5415de) and a digest of its play list; if `out/matched-restage` does not hold that set, the command rebuilds it from that commit in a temporary worktree. NFL numbers come from `scripts/diag/run-operators/nfl-2022.txt`, so no raw data is needed. Quote the first line of the report (stack id and commit) with any number.

A capture's bytes are not its identity: the same game can save a setup to different bytes on another run (shared references in the serialized stream; 1 in 16 under load for seed 13) while restoring to an equal setup that replays identically. Compare play ids and calls, never file hashes.

Operators one at a time: [`scripts/diag/run-operators/README.md`](../scripts/diag/run-operators/README.md), with `npm run -s ref --` in place of `baseline:run`.

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
| **Off: not reviewed here** | `DEEP_NO_FORCE` `MIDDLE_NO_FORCE` `DL_FIGHT` `DL_HANDS` `GAZE` `HAND_FIGHT` `HAND_MOTOR` `IN_STRIDE_CATCH` `PASS_SINK` `PULL_CUE` `PULL_PLAN` `REACH_CONTACT` `READ_RISK_TRACE` `RUN_CONTACT_TRACK` `RUN_HANDS` `RUN_READ` `RUN_READ_TURN` `TACKLE_TOUCH` | Older or other-lane flags with no evidence in FLAGS.md. Note: `REACH_TECHNIQUE`'s hand steering and `RUN_HANDS` act only with `HAND_MOTOR`, which is off |

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

## run-ref-3: `REACH_CLOSE`, `BACKER_TAKEON`, `MUG_PRESSURES` on (2026-11-09)

`run-ref-3` is `run-ref-2` plus three flags their owners recommended, each checked on the 1,321-run set (develop 3eb8f57c with #401 and Run Game 74b8350e merged):

| Flag | Owner's evidence | Paired yd on the 1,321-run set |
|---|---|---|
| `REACH_CLOSE` (Run Game) | The flat outside-zone line is the controller: free OZ linemen asked for 0.0 yd/s upfield from 0.5 to 2.0 s. With the flag, OZ OL upfield at 2.0 s +0.1 -> +0.3 uncovered, +0.3 -> +0.4 covered (NFL +1.1 / +0.9); climber's lead over the carrier at the backer OZ 0.4 -> 0.7 s (NFL 0.9) | all +0.07 (SE 0.07); OZ +0.06 (0.21), IZ +0.29 (0.24) |
| `BACKER_TAKEON` (Defense) | Correctness: backers knocked down by a climber's first collision 114 -> 56 on 400 matched snaps; untouched snaps identical | all +0.00 (SE 0.04) |
| `MUG_PRESSURES` (Defense) | Nickel 3rd-and-long double mug 1 -> 4% (NFL 8%); rush mix matched 2022 mug dropbacks. A call flag: not exercised by the matched set | not measurable here |

All three together: +0.06 (SE 0.08); runs <= 0 21.2 -> 20.2%; no replay errors. On `run-ref-3`: OZ 2.53 yd under 20 with 26% <= 0 (NFL 3.50, 19%); IZ 3.74 with 16% <= 0 (NFL 3.73, 14%); 10+ runs 6.2% (NFL 9%). Inside zone is now at the NFL; outside zone is still a yard short.

Other decisions from Defense's report:
- `LB_RUN_THROUGH` and `EDGE_WIDTH` stay off and should be deleted: on a same-operator comparison (373 OZ snaps vs NFL 1,555) neither moves its own measure (backers at or behind the line by 2.0 s 0.4% with or without the flag, NFL 8.8%; play-side edge outside his man at 1.0 s 37 -> 35%, NFL 61%). Both NFL gaps are real and are logged as gaps. **Deleted** (code, registry and stack entries) in Defense's removal PR.
- `ATTACK_LANDMARK` (#401) is merged, off, and stays off in the stack: yards neutral, OZ runs <= 0 22.6 -> 26.7%.
- `DL_GAMES` stays off: the offense's blocking does not answer line movement yet.
- Call flags on the stack move front and mug shares toward 2022 (nickel early bear 0 -> 7%, NFL 6%; nickel short-yardage bear 0 -> 13%, NFL 12%; base vs heavy short-yardage bear 100 -> 35%, NFL 24%). Left: nickel 3rd-long double mug, no interior DL on passing downs, Tite/Mint in base, heavy fronts in short yardage.
- #402 (`LB_FLOW_STEP`) is superseded by `LB_GUARD_STEP` + `LB_READ_STEP` and closed.
- Outside zone's reach pace (1.85 vs 2.25 yd/s at 0.5 s) is the body's acceleration from the stance, not the request (3.45 yd/s from 0.5 s): with Flex, to re-check on stretch starts.

## Contact to whistle merged: #412, #418, #410 (2026-11-09)

Flex's #428 brings `ONE_ARM_HOLD` (#412, default on), the grasp-timing fix (#418) and `RELEASE_REDECIDE` (#410, default on) onto develop; the write-up is `docs/reviews/contact-to-whistle.md`. `HELD_SWING` stays off (it moves away from the NFL on both target measures). #418 makes the retired `WRAP_FOOT` inert. The stack id stays `run-ref-3`: these are code defaults, not stack flags, so **numbers on `run-ref-3` before and after develop 0b6b95b2 differ; quote the commit.**

Independent check, 1,321 matched runs on `run-ref-3`, develop 0b6b95b2 vs with #428:

| | Before | With #428 | NFL |
|---|---|---|---|
| All runs, yd under 20 | 3.02 | 3.56 (paired +0.54, SE 0.07) | |
| Outside zone yd; runs <= 0 | 2.53; 26% | 2.79; 22% | 3.50; 19% |
| Inside zone yd; runs <= 0 | 3.74; 16% | 4.35; 13% | 3.73; 14% |
| Gap runs yd | 3.20 | 3.71 | 4.08 (counter) |
| 10+ yd runs | 6.2% | 7.8% | 9% |
| Broken tackles a run | 0.067 | 0.154 | |
| Missed + broken a run | 0.29 | 0.39 | 0.11-0.16 a play (G1; source unverified) |

Flex's table (1,328 runs, run-ref-2): front-on gain after first contact 0.43 / 0.60 / 1.03 -> 0.65 / 0.86 / 1.09 yd (NFL 2.2-2.6), second defender 60 -> 65% (NFL 80%), yards after contact 1.58 -> 2.20.

What to take from it:
- Outside zone, gap runs and the long-run rate move toward the NFL; inside zone moves 0.6 yd above it.
- **Broken tackles a run more than double.** That was #412's stated open risk and it is G1's headline measure moving the wrong way. The mechanism (a grab from inside a block holds with one arm) is the reason, and `ONE_ARM_HOLD=0` restores the old hold. It is merged on the owner's evidence under PLAN's rule that a worse statistic is logged, not a veto; Tanner can reverse it with that switch.
- Neither target gap closes: front-on gain and the second defender are upstream of the bond (front-on momentum exchange, pursuit arrival TKL-2, the whiff roll TKL-7). That is Flex's next item.

## run-ref-4: `GAP_CLIMB` on; #408 and #430 merged (2026-11-09)

- **`GAP_CLIMB` (Run Game 01712d3b), on.** Only a double-team release ever made a first-level lineman climb. A free zone lineman whose man is beaten to his backside now climbs to the nearest second-level man no lineman is nearer to. Run Game, 544 zone runs, linemen 1.5 yd past the line by 2.0 s: OZ backside guard 18 -> 26% (NFL 36-37%), OZ backside tackle 2 -> 7% (NFL 16-26%), IZ backside tackle 26 -> 41% (NFL 15-39%). On the 1,321-run set: paired +0.03 (SE 0.04); OZ +0.01 (0.10), IZ +0.19 (0.16). Partial: the centre (6-10% vs NFL 26-36%) and covered guards still climb only through the double-team release, which is Run Game's next item.
- **#430 (Defense):** `LB_RUN_THROUGH` and `EDGE_WIDTH` are deleted from the code and the stack.
- **#408 (Coverage, default on):** the QB's throwing motion (load and delivery, about 0.4 s, NFL 0.4-0.5), combined with #420's route reads in the receiver forecast. Four full games of saved snaps at code defaults, before vs after: pass plays 8.94 -> 8.19 yd a play (NFL band 6.35-7.89), incompletions 124 -> 149 of 392; runs unchanged within noise. Coverage's own check (732 dropbacks, before #424): sacks 40 -> 63, completions 406 -> 354, time to throw 2.62 -> 2.89 s. The later release meets a pocket that collapses early (G5); that exposure is logged there, not held against the motion. #424's protection read is on develop too and the two have not been measured together by Coverage.
- Outside zone's reach pace: Flex's lone-body bench shows the body can make the NFL's 2.25 yd/s at 0.5 s; the remaining 0.2 yd is at the centre and backside in the snap / first-step stage, which is Run Game's. A burst request was tried and dropped (OZ -0.38).

On `run-ref-4` at this commit (1,321 runs): all 3.56 yd under 20, runs <= 0 15.6%, 10+ runs 7.8% (NFL 9%); OZ 2.73 with 23% <= 0 (NFL 3.50, 19%); IZ 4.46 with 14% <= 0 (NFL 3.73, 14%); gap 3.74 (NFL counter 4.08).

## Pass panel, the broken-tackle rise explained, #405 (2026-11-09)

**Coverage's pass panel** (`run-ref-1` at develop 8696d32a, 732 dropbacks an arm, same snaps; before #408, #424 and #428). No flag needs to come out of the stack on pass evidence.

| Arm | yd / play | Completions | Sacks | INT | Time to throw | Reference minus arm (yd) |
|---|---|---|---|---|---|---|
| reference | 9.46 | 406 | 40 | 35 | 2.63 | |
| all off | 9.54 | 420 | 53 | 21 | 2.50 | -0.08 ± 0.61 |
| minus `GUN_SNAP` | 9.99 | 426 | 43 | 34 | 2.59 | -0.53 ± 0.48 |
| minus `TIGHT_OFF` | 9.19 | 400 | 40 | 37 | 2.62 | +0.27 ± 0.17 |
| minus `SLOT_LEV` | 9.40 | 405 | 40 | 36 | 2.63 | +0.06 ± 0.08 |
| minus `ALIGN_HABIT` | 9.33 | 408 | 38 | 38 | 2.62 | +0.13 ± 0.40 |
| minus `RUN_CONFIRM` | 9.35 | 404 | 39 | 35 | 2.63 | +0.10 ± 0.09 |
| minus `LB_READ_STEP` | 9.65 | 409 | 39 | 34 | 2.63 | -0.20 ± 0.16 |
| minus Defense's 22 | 9.56 | 411 | 45 | 32 | 2.61 | -0.11 ± 0.46 |
| minus Run Game's 60 | 10.10 | 420 | 46 | 26 | 2.52 | -0.65 ± 0.59 |

The stack as a whole is neutral on pass yards and lowers sacks (53 -> 40). **Interceptions rise with the stack** (21 -> 35 on 732, about 2 SE): not the six named flags, mostly not Defense's set, and it returns to 26 without Run Game's set. Logged for G4; Coverage will narrow it within Run Game's flags after measuring #408 with #424.

**The broken-tackle rise from `ONE_ARM_HOLD` is the mechanism working, not a bug** (Flex, `run-ref-3` at 6c0bd5c0, 1,328 runs; `docs/reviews/contact-to-whistle.md`, probe `scripts/diag/tackle-finish/one-arm-grabs.mts`). Broken tackles a run 0.063 -> 0.166; misses unchanged (0.242 -> 0.247). The rise is block-origin breaks, 9 -> 134, every one a one-armed grab and 124 of them by a man still engaged with his blocker. Of 663 one-armed grabs, 359 hold to the tackle, 170 become a two-arm wrap once off the block, and 134 (20%) break when the peak load reaches the grip's capacity (no dice). Before #412 the same grab became a two-arm wrap from inside a block and ended the run. Two consequences: the sim's "broken tackle" count now includes arm grabs that NFL charting would call a miss or not chart, so missed + broken a run is not comparable with G1's band until the counter separates engaged grabs; and the open question is whether 20% is the right breaking share, which needs a tracking reference (yards after a blocked defender's first contact), not a capacity change.

**#405 `FLOW_INTERCEPT`** (Defense) is merged, off, and off in the stack: on `run-ref-3` paired -0.02 yd (SE 0.09), OZ box-defender lateral at 1.5 s 2.16 -> 2.28 (NFL 3.40). Kept as a parked mechanism.

**PHY-3** (Flex, #432; corrected the same day): facing caps directional top speed (shuffle and backpedal factors) but not the start force, by design (tracked NFL pullers). A lone OL body reaches the NFL OZ line's 0.5 s speed once the request is larger, so the OZ deficit is not the body's capacity. In `docs/KNOWN_PROBLEMS.md`, bench `scripts/diag/lateral-start-bench.mts`.

## run-ref-5: `OWNER_KEEPS` on; what the lanes found (2026-11-10)

`run-ref-5` is `run-ref-4` plus `OWNER_KEEPS` (Run Game). Since the promotion, turning a flag on in the stack means it is read as on unless set to `0`. Full report: [reviews/run-ref-5-report.md](reviews/run-ref-5-report.md).

- **`OWNER_KEEPS`.** On stretch plays the helper of a double runs the track and seldom joins, and an unjoined double had no release at all: 76 of 239 outside-zone doubles never released. Now, when the owner has the man alone and securely, the helper climbs on the existing overtake read. `npm run ref:report`, run by Run Game and again here with the same result: outside zone 2.73 -> 3.13 yd under 20 (paired +0.40, SE 0.14; NFL 3.50), runs <= 0 23 -> 22%, 10+ runs all 7.8 -> 8.8% (NFL 9%); inside zone unchanged; duo and toss +0.72 (SE 0.26). Who the back meets has not moved yet (first contact by a blocked DL 53 -> 52%, NFL 33%).
- **#437 (Defense), merged off:** `BACKER_CREEP` and `OFFBALL_TIMING`. Box backers moving at the snap 5 -> 23% (NFL 46%), speed at 0.2 s 0.00 -> 0.47 (0.81), yards neutral. Waiting on a `ref:report` run before going on.
- **#435 (Flex):** broken tackles from engaged one-arm grabs are counted apart; `ref:report` prints them. On the reference 0.105 of the 0.177 broken tackles a run are engaged-grab breaks, leaving missed + broken on open tackles at about 0.30 a run. Also fixes a one-arm membership that was never cleared, and withdraws PHY-3 (facing does cap directional top speed; only the start force is facing-free, by design).
- **QB throwing motion (#408), Coverage's finding against its own PR:** with #424 in, #408 still adds 2-3 points of sack rate, and time to throw goes to a median 2.80-2.85 s (NFL about 2.5). It is not the motion's length (0.4 s, NFL 0.4-0.5) but when the QB starts it: readiness timing and pumps. Coverage is fixing that first.
- **`MUG_PRESSURES` with `PRO_READ`:** sim and fire-zone pressures now free a rusher (Mug Sim 0 -> 13, Mug Fire 0 -> 19 of 96), as designed. The offense has no answer yet: protection calls (G9) are queued with Coverage.
- **Scramble discipline:** a zone backer reads run on a QB scrambling 5 yd behind the line; he should hold coverage until the QB crosses it. Logged under COV.
- **Front-on contact:** Tanner chose effective mass at first contact; the plan is [reviews/2026-11-10-effective-mass-plan.md](reviews/2026-11-10-effective-mass-plan.md) and Flex has started its Phase 0.

## run-ref-6: `BACKER_CREEP` and `OFFBALL_TIMING` on; split-back shares (2026-11-10)

Full report: [reviews/run-ref-6-report.md](reviews/run-ref-6-report.md).

- **`BACKER_CREEP`, `OFFBALL_TIMING` (Defense #437), on.** Box backers creep before the snap and off-ball defenders time the count. Outside-zone box backers moving at the snap 5 -> 23% (NFL 46%), speed at 0.2 s 0.00 -> 0.47 yd/s (0.81), depth at 1.0 s 4.10 -> 3.91 (3.56). Defense's `ref:report` candidate run: all runs -0.01 (SE 0.10).
- **#440 (Rules + Coaching):** split-back gun sets take their 2022 share of each personnel group's runs under `RUN_FORM_PAIR` (11: 1.2%, 12: 1.4%, 21: 6.3%); before, the two 11-personnel split sets took about a third of 11 gun runs. Twelve default games: split-back gun 2.0% of snaps (2022: 1.8%).
- **Interceptions are not a stack effect (Coverage).** On 1,464 dropbacks an arm the reference has 45 and all-off 54; the earlier 21 -> 35 was noise on about 30 events. G4's gap is the absolute rate, with or without the stack. Interception differences under 10 need 1,500+ dropbacks an arm.
- `ref:report` now prints duo and toss as their own rows.
- `test/integration/game-record.test.ts` seed 21 timed out at 60 s in two full `test:all` runs (three workers) and passes alone; its limit is now 180 s.

Run game on `run-ref-6` at this commit (1,321 fixed runs, yards under 20):

| | Legacy | run-ref-6 | NFL 2022 |
|---|---|---|---|
| All runs yd; <= 0; 10+ | 5.19; 11%; 16.7% | 3.76; 16%; 9.3% | 10+: 9% |
| Outside zone yd; <= 0 | 4.69; 11% | 3.07; 22% | 3.50; 19% |
| Inside zone yd; <= 0 | 4.40; 15% | 4.60; 15% | 3.73; 14% |
| Gap runs yd | 5.42 | 3.95 | 4.08 (counter) |
| Duo yd; <= 0 | 6.13; 6% | 3.18; 18% | |
| Missed / broken a run (engaged-grab breaks) | 0.272 / 0.302 (0.158) | 0.241 / 0.175 (0.116) | |

Next for the run game: see run-ref-7 below. (An earlier version of this paragraph said the outside-zone back was far too narrow. Run Game withdrew that: the widths were measured from his own start. Against the play-side tackle his median crossing is close to the NFL's.)

## run-ref-7: `THROW_REACT` on; outside zone's edge (2026-11-10)

- **`THROW_REACT` (Coverage #442), on.** The QB's late release was not the throwing motion: he starts it at the same time with or without #408 (median 2.35 s), and his release came 0.95 s after the receiver's break (NFL about 0.3 s before it). The cause was his own completion estimate, which let defenders break on the ball before it was out; the engine lets nobody break until the release. The flag makes his estimate match the engine. Coverage's panel (732 dropbacks): sacks 69 -> 48 (9.4 -> 6.6%), time to throw median 2.80 -> 2.65 s, completions 352 -> 383. Checked here on the quick scorecard, six games an arm ([report](reviews/2026-11-10-scorecard-throw-react.md)):

| Per team-game or as marked | run-ref-6 | with `THROW_REACT` | NFL band |
|---|---|---|---|
| Sack rate | 12.1% | 8.7% | 4.6-9.4% |
| Time to throw (s) | 2.94 | 2.77 | 2.7-2.9 (unsourced) |
| 3rd-down conversion | 32.9% | 37.7% | 37-41% |
| Yards an attempt | 10.55 | 10.26 | 6.35-7.89 |
| YAC a reception | 10.53 | 9.02 | 4.53-5.91 |
| INT rate | 5.5% | 4.7% | 1.5-3.2% |
| Points | 33.8 | 33.4 | 21-23.5 |

  Only time to throw is resolved by six games; the rest agree in direction with the panel. Points a team-game were 52.9 on the legacy engine and 41.3 on run-ref-4.
- **What is left of the QB's pessimism is the defense's doing:** defenders he expects to beat the ball are a median 12.4 yd from it when it arrives, because defenders do not close during the ball's flight (COV-1: 0.12 yd against the NFL's 0.65). The same behaviour is the first suspect for YAC, which is Coverage's next item.
- **Outside zone: it is the defensive edge (Run Game, corrected).** Where the back crosses the line is close to the NFL at the median, but the spread of lanes is not: he bounces 6+ yd outside the tackle on 8% of gun runs (NFL 28%) and crosses within 3 yd of the tackle on 45% (NFL 34%). The edge defender steps inside and stays level (lateral at 1.0 / 1.5 s -0.32 / +0.41 yd against the NFL's +0.69 / +1.75; depth -0.16 / -0.23 against -0.28 / -0.81), which fills the window where the back meets a blocked lineman and takes away the bounce. `STRETCH_TRACK` re-tested: it costs outside zone 0.39 yd (SE 0.21) by pressing wider into the same edge; it stays off. Defense has the edge; Run Game re-checks the back's read on their candidate.

## Front-on contact: the NFL course (Flex, effective-mass Phase 0, 2026-11-10)

`frontcourse.py` is in `npm run ref:report` (full output for run-ref-7: [reviews/run-ref-7-report.md](reviews/run-ref-7-report.md)); the write-up is [reviews/effective-mass.md](reviews/effective-mass.md). Front-on first contacts at 3-5 yd/s, speed along the runner's approach (yd/s), NFL pads against sim:

| | 0 | +0.1 | +0.2 | +0.3 | +0.5 | +1.0 s |
|---|---|---|---|---|---|---|
| NFL runner (n 312) | 4.00 | 3.74 | 3.42 | 3.12 | 2.48 | 1.31 |
| Sim runner (n 123, run-ref-4) | 4.52 | 3.21 | 1.82 | 1.76 | 1.27 | 1.22 |
| NFL hitter | 0.29 | 0.33 | 0.52 | 0.62 | 0.92 | 0.89 |
| Sim hitter | -0.14 | 0.47 | 1.30 | 1.04 | 0.77 | 0.51 |

- **The gap is in the first exchange.** The sim runner loses 2.7 yd/s within 0.2 s; the NFL runner loses about 0.3 yd/s each tenth, steadily, for a second. The plan's alternative (that the courses match early and separate later) is ruled out; effective mass at first contact is the right target, as Tanner chose.
- The NFL hitter is carried back steadily (about a third of the NFL gain is his displacement); the sim's is knocked back in one impulse and then stops.
- NFL bodies do not stay stuck: separation closes to torso distance (0.49 yd at +0.2 s) and reopens (0.92 by +1.0 s). The sim's stays at 0.52 for the whole second.
- Contact geometry is not the cause: median offset from the runner's path at closest approach is 0.31 yd in the NFL and 0.24 in the sim.
- Reading caution: time zero is first proximity (centres within 1.0 yd). NFL pairs are 0.87 yd apart then and reach torso distance at about +0.2 s; sim pairs start at 0.76 and reach it by +0.1 s. Compared from torso contact, the conclusion is the same (NFL -0.3 yd/s a tenth; sim -1.4 in the first tenth), but the bench target should be set from torso contact, not from time zero.

## Effective mass, Gate 1: the two-part body fails on paper; `EDGE_REACH` merged off (2026-11-10)

- **Gate 1 (Flex, [reviews/effective-mass.md](reviews/effective-mass.md)).** A two-link body (upper body on a sourced trunk spring over pelvis and legs) keeps 41-46% of the runner's pad speed 0.1 s after contact; today's point mass keeps 38-39%; the NFL keeps 94%. Softening the contact from 9 Hz to 1.5 Hz gives 44%. Articulation moves momentum around inside the body; it does not change how much the pads exchange. Flex stopped under the plan's two-attempt rule.
- **What the NFL course implies:** the runner is slowed by about 255 N on average over the first 0.3 s (the sim needs about 800 N; the model's contact peaks near 22 kN against measured tackle peaks of 1.7-3.4 kN), and the centres stay about 0.5 yd apart while he moves 2.5-3 yd/s faster than the hitter. NFL bodies are passing shoulder to shoulder, not colliding chest to chest.
- **Flex's re-diagnosis:** every sim body is an isotropic disc for torso contact (about 0.27 yd for a back, 0.36 for a lineman); a real torso is about 0.27 yd half-wide but 0.15 half-deep. Proposed second attempt: an oriented torso shape from anthropometry. **Waiting on Tanner.**
- **Integration's question before that is built:** for two bodies square to each other the oriented shape has about the same lateral extent as the disc and a contact normal more along the path, so it helps mainly when a body is turned. Two no-code checks are with Flex: the hitter's and runner's facing at contact from tracking orientation (NFL against sim), and a bench of the disc, the oriented shape with facing fixed, and the oriented shape free to yaw.
- **`EDGE_REACH` (Defense #446), merged off.** The play-side edge had no answer to a reach block and fell through to his pass-rush lane, stepping inside. With the flag he steps flat outside with the reach: edge flow at 1.0 / 1.5 s -0.32 / +0.41 -> +0.42 / +0.92 yd (NFL +0.69 / +1.75). `ref:report` candidate: outside zone +0.25 (SE 0.24), inside zone -0.41 (0.20), all +0.11 (0.10). Off until Run Game re-checks the back's read against it.
- **YAC (Coverage):** of the sim's 9.8 yd after the catch (NFL 5.3), about 4.5 yd comes from the 16% of catches with a missed dive, a missed tackle or a broken tackle. Coverage takes the pre-contact attempt decision in the open field behind an off flag; Flex keeps the contact physics.

## run-ref-8: `EDGE_REACH` on; where the collision work stands (2026-11-10)

Full report: [reviews/run-ref-8-report.md](reviews/run-ref-8-report.md).

- **`EDGE_REACH` (Defense), on,** on Defense's and Run Game's joint recommendation after Run Game's lane check (570 zone runs): edge flow at 1.0 / 1.5 s -0.32 / +0.39 -> +0.41 / +0.93 yd (NFL +0.69 / +1.75); outside-zone runs <= 0 22 -> 18% (NFL 19%); gain when a blocked hitter makes first contact 1.96 -> 2.53 yd (NFL 3.39). Still open: he widens on inside zone too (+0.23 vs +0.01) and does not get upfield enough (depth at 1.5 s -0.20 vs -0.81). The gun back's bounce share falls further (14 -> 7%, NFL 28%): that is the back's read, which almost never cuts back or bounces; Run Game is diagnosing it. `STRETCH_TRACK` re-tested on top and is settled off.

| `npm run ref:report`, 1,321 fixed runs, yd under 20 | Legacy | run-ref-8 | NFL 2022 |
|---|---|---|---|
| All runs yd; <= 0; 10+ | 5.19; 11%; 16.7% | 3.80; 15%; 8.6% | 10+: 9% |
| Outside zone yd; <= 0 | 4.69; 11% | 3.18; 18% | 3.50; 19% |
| Inside zone yd; <= 0 | 4.40; 15% | 4.35; 15% | 3.73; 14% |
| Gap runs yd | 5.42 | 4.05 | 4.08 (counter) |
| Duo yd; <= 0 | 6.13; 6% | 3.23; 18% | |
| OZ yards when the first hitter is blocked | 3.98 | 2.53 | 3.39 |

- **Front-on contact (Flex, [reviews/effective-mass.md](reviews/effective-mass.md)); no engine code yet, waiting on Tanner.** After the two-part body failed, the benches show: an oriented shape alone exchanges more than today's disc; bodies free to yaw under an offset hit keep 62-68% of speed; the first-touch force is 18-25 kN in every variant against measured tackle peaks of 1.7-3.4 kN, and a compliant outer layer over the stiff core brings it to 3.8-6.9 kN. The runner already delivers his whole leg-strength budget in contact but spends it steering: the push into a felt load gets 0.02-0.10 of his traction limit while the hitter pushes back along the axis at 0.43. With his strength used along the path, yaw and the compliant layer give 83% speed kept in the first tenth (NFL 92%) at 4.4 kN. Proposed sequence, each behind its own flag: (1) the compliant layer, (2) yaw under offset hits, (3) push into a felt load takes priority over steering within the strength budget, (4) an oriented shape only if tracking shows NFL hitters are side-on at contact.
- **Linebacker read (Defense), measurement:** NFL box backers separate run from pass by 0.4 s (0.5 yd/s split), ours by 0.6 s, and ours bite harder on play action (downhill at 1.0 s 1.94 yd/s against the NFL's 1.15; we read run on 95% of play action and recover at 1.10 s). `PREREAD_FLOW` was built, measured too small and reverted. Next: `READ_LEAN`, an unsure backer leaning with his own run evidence and easing back on the pass picture after a fake.

## `READ_LEAN` merged off; the collision sequence as it stands (2026-11-10)

- **`READ_LEAN` (Defense #451), off.** An unsure box backer leans downhill with his own run evidence, and after a run read the pass picture (the QB's depth after the fake, high hats) pulls him back before a full change of mind. Run / dropback split 0.6 -> 0.5 s (NFL 0.4); play-action downhill at 1.0 s 1.94 -> 1.49 yd/s (NFL 1.15); `ref:report` candidate on run-ref-8: all +0.01 (SE 0.07). Open risk: backers may over-drop on dropbacks (downhill at 1.0 s -0.69 vs NFL -0.25). Waiting on Coverage's operators before it goes on.
- **Front-on contact, corrected (Flex).** The lean-priority rule proposed as step 3 is withdrawn: on the line and for the runner, each man's force already lands near the change he asks for; a priority rule would have turned a pass rusher's force onto the blocker's axis. What takes the runner's drive is the lateral load of an off-centre hit: at his strength cap he spends about 60% of his force holding his line against it. NFL bodies turn instead: hitters go from 43 degrees off square at torso distance to 64 at +0.3 s; the sim's go from 37 to 41, and sim pairs stay locked at touching distance. Production torso contacts carry no moment (`handContact: 'center'`), so an off-centre hit cannot turn anyone; an experimental `'patch'` contact mode that applies impulses at the contact point already exists. Sequence waiting on Tanner: (1) a compliant contact law for the first-touch force (18-25 kN against 1.7-3.4 measured), (2) contact yaw, first trial the existing patch mode, (3) an oriented shape only if (2) needs it, (4) the runner's facing into contact (NFL runners are 18-31 degrees off their path at contact, ours 2-8), Run Game, after (2).

## run-ref-9: `HANDS_CHEST` on (2026-11-10)

Flex #455. A block's hands now push between the closest points of the two men's shoulder lines (half-span 0.12 yd, the anthropometric chest half-width) and no longer between body centres, so a block cannot spin a pair about a point. This is the second attempt at the over-rotation `CONTACT_PATCH` exposed; `CONTACT_PATCH` and `CONTACT_LAYER` stay off.

| Check | run-ref-8 | `HANDS_CHEST` on | NFL 2022 |
|---|---|---|---|
| Zone solo block, pair rotation (trench2) | 60° | 56° | 43° |
| DL depth at 2.0 s (trench2) | +0.76 yd | +0.69 yd | +0.70 yd |
| Solo DL driven back | 8% | 12% | 16% |
| 1,321 fixed runs, yd under 20 | 3.80 | 3.85 (paired +0.04, SE 0.12) | |
| Runs for 0 or less | 15.1% | 13.9% | |
| Broken / missed tackles a run | 0.178 / 0.241 | 0.167 / 0.229 | |
| 16-game scorecard: points a team-game | 36.9 | 36.5 (90% −4.8 to +4.2) | 21–23.5 |
| Rush yards a carry | 4.70 | 4.59 | 3.7–4.83 |
| Yards an attempt | 9.88 | 10.08 (−0.68 to +1.09) | 6.35–7.89 |
| Sack rate | 7.4% | 7.7% | 4.6–9.4% |
| Missed + broken tackles a play | 0.31 | 0.28 (−0.06 to +0.00) | |
| Yards before contact (runs) | 0.57 | 1.01 (moved) | |
| OL backpedaling facing own backfield, events per 100 plays | 90.4 | 78.2 (moved) | |
| Blocker on a man out of the play, events per 100 runs | 108 | 123 (moved) | |

- **Why on.** The line gates move toward the NFL or hold, no whole-game key statistic resolves, and Coverage's pressure grid (960 snaps: sacks 62 to 56, paired pass yards +0.68, SE 0.32) is not repeated in whole games (sack rate 7.4% to 7.7%).
- **Logged, not explained.** Blockers staying on a man who is out of the play rise 108 to 123 per 100 runs: a hands row that no longer spins the pair may also be harder to come off. Run Game owns the release decision; Flex owns the grip.
- **Still open.** Pair rotation is 56° against the NFL's 43°; Flex's next bench is the hands grip's tangential limit against arm strength.
- By concept (candidate against run-ref-8, paired): OZ −0.07, IZ −0.19, gap +0.23, duo +0.49 (SE 0.38), none resolved.

## After run-ref-9: the runner–tackler lock, and what is merged off (2026-11-10)

No stack change. Everything in this section is off.

- **The lock is the grasp law (Flex).** At a front-on first contact the runner asks for 2.6–3.0 yd/s across the tackler and gets 0.7–1.1; replaying 154 game contacts on the bench with the game's requests reproduces it, and removing the grasp releases it. It is not the mix of blocked and free tacklers (69% blocked in both the sim and the NFL), not the tackler's request, and not the approach offset (0.30 yd against the NFL's 0.31).
- **`GRASP_PATCH` (#462), off, held.** Every grasp acts at the grip point, so a held pair turns. Zone runs: slip at +0.1 s 0.49 to 1.46 (NFL 2.69), gain after contact 1.44 to 2.34 yd (NFL 2.84), trench unchanged. 16-game paired card ([reviews/2026-11-10-grasp-patch-scorecard.md](reviews/2026-11-10-grasp-patch-scorecard.md)): run stuffs 15.1% to 9.6% (moved), YAC 8.91 to 10.06 (moved), missed + broken a play 0.28 to 0.33 (moved), fumbles lost a team-game 0.53 to 1.00 (moved), points 36.5 to 41.0 (not resolved). Held for two explanations (fumbles, missed + broken) and to go on with the tackle's finish, not alone. With `CONTACT_LAYER` too: rush 5.50, stuffs 7.2%, 10+ runs 14.0%.
- **The finish that is missing, on develop today.** 364 holds on the fixed runs last 0.3 s or more while the carrier averages 4 yd/s or more. 70% are a holder running alongside who never plants (tackler decision: Defense, all positions). 30% are towed holders with no way to hang their weight on an upper-body hold (physics: Flex).
- **`HANDS_FRICTION`, `GRASP_ARMS` (#459), off, research.** Friction on pressing hands overshoots the line (solo rotation 27° against the NFL's 43°). A grip-break mechanism is parked in [PARKED.md](PARKED.md).
- **`BLOCK_RELEASE` (Run Game), off.** A blocker leaves a man who has left the play for a free defender at the runner. Time wasted 0.594 to 0.544 s a run; yards flat; gap runs −0.12 (SE 0.06), unexplained.
- **`UNDER_DEPTH` (Coverage #458), off.** Underneath droppers take the depth of the deepest route they see: hook depth at 2.0 s 8.7 to 5.8 yd (NFL 6.4). Alone it gives up 6–9 points a team-game because nothing closes on the ball in flight (COV-1, next); promote the two together.
- **`TKL_WHIFF` (Coverage #448), off.** The pre-contact attempt decision. YAC 10.47 to 11.55 and sacks 12.1% to 9.0% on today's lock; needs a pocket exception and the approach before it can go on.
- **`READ_LEAN`.** Coverage's three-seed cards and a 732-dropback panel (+0.13 ± 0.13 yd a pass play) do not repeat the scoring rise on my two cards. One more 16-game card on a third seed decides.

## run-ref-10: `READ_LEAN` on (2026-11-10)

Defense #451 and #453. An unsure box backer leans downhill with his own run evidence, and after a run read the pass pulls him back out. It was held off because two of my cards showed scoring up (seed 7 +8.8, seed 11 +4.6 points a team-game). Coverage showed that was whole-game drift: six-game cards on seeds 11 and 13 went the other way and a paired 732-dropback panel gave +0.13 ± 0.13 yd a pass play. A third 16-game card (seed 13, [reviews/2026-11-10-read-lean-scorecard.md](reviews/2026-11-10-read-lean-scorecard.md)) agrees:

| 16 games, seed 13 | Off | `READ_LEAN` | 90% interval |
|---|---|---|---|
| Points a team-game | 41.25 | 41.41 | −4.47 to +5.09 |
| Yards an attempt | 10.63 | 10.46 | −0.90 to +0.70 |
| YAC a reception | 8.78 | 8.59 | −1.01 to +0.58 |
| Rush yards a carry | 4.40 | 4.80 | −0.04 to +0.85 |
| Missed + broken tackles a play | 0.31 | 0.29 | moved |
| Missed tackles by LB a play | 0.05 | 0.04 | moved |

The rush row is the one to watch: not resolved, but its interval sits mostly above zero. The fixed-run report for run-ref-10 is in [reviews/run-ref-10-report.md](reviews/run-ref-10-report.md).

## run-ref-11: the tackle package on (2026-11-10)

`GRASP_PATCH`, `HIP_BRACE` and `HOLD_FINISH` are on by default; `CONTACT_LAYER` stays off. The record below is in the order it happened, including a false start. Four flags make up the package: `GRASP_PATCH` (Flex #462), `HIP_BRACE` (Flex #465), `HOLD_FINISH` (Defense #469) and `CONTACT_LAYER` (Flex #455).

- **`HOLD_FINISH` (decision).** A holder beside or behind the runner plants against the runner's travel, committing in proportion to his grip and only while the grip holds; while it slips he keeps his feet moving. Upper grips get a real height, from the shoulder line down to the waist.
- **`HIP_BRACE` (physics).** A hold above the runner's hips is braced by his hip-extension torque, from the same budget as his leg drive; only the excess pitches him. No new constant.

Two measurements disagree, and that is why nothing is on.

| Fixed 1,321 runs, against run-ref-10 | Paired yards a run (SE) | Stuffs | Broken a run |
|---|---|---|---|
| `HOLD_FINISH` | −0.06 (0.03) | 14.4% | 0.160 |
| `HOLD_FINISH` + `HIP_BRACE` (the finish) | −0.57 (0.04) | 17.4% | 0.117 |
| `HIP_BRACE` + `GRASP_PATCH`, default heights | −0.16 (0.05) | 13.2% | 0.132 |
| those + `CONTACT_LAYER` | +0.01 (0.11) | 11.7% | 0.144 |

| 16 whole games, paired, seed 11 ([card](reviews/2026-11-10-tackle-package-scorecard.md)) | run-ref-10 | Finish | + `GRASP_PATCH` | + `CONTACT_LAYER` too |
|---|---|---|---|---|
| Points a team-game | 34.8 | 34.5 | 39.3, moved | 35.6 |
| Rush yards a carry | 3.77 | 4.34 | 4.26 | 4.25 |
| Run stuff rate (NFL 15.9–23.5%) | 14.9% | 16.9% | 8.9%, moved | 9.0%, moved |
| Yards an attempt | 9.69 | 10.05 | 10.36, moved | 9.44 |
| Missed + broken tackles a play | 0.28 | 0.25, moved | 0.28 | 0.26 |
| Fumbles lost a team-game | 0.78 | 0.34, moved | 0.75 | 0.69 |

- **The finish alone is not a coherent step.** The whole-game card looked clean and I began to turn it on. Defense's fixed-run arms stopped that: on identical plays the finish costs 0.57 yd a run (OZ −0.38, IZ −0.66, gap −0.63), which would put every concept under the NFL's, and Flex's contact course for `HIP_BRACE` alone had gain after contact at 1.14 yd and contact to end at 0.7 s against the NFL's 2.84 yd and 1.5 s. The card's +0.57 rush yards was whole-game drift. Today's grasp pins the runner where he is hit; adding a finish to a pinned runner stops him twice.
- **The package is the unit.** `GRASP_PATCH` frees the pair to turn (too many yards alone, +0.49); the finish ends the hold (too few alone, −0.57); together the fixed runs land near today's yards with a contact course closer to the NFL's.
- **What held the package, resolved.** "Whole games lose twice the stuffs the fixed runs do" compared different arms. Like for like (finish against package) the drop is 4.7 points on the fixed runs and 5.1 in 16 whole games; my card's 8.0 was about 1.7 SE high.

**The run side is settled (Flex, same operators on NFL 2022 zone runs, n 2,984, and the fixed set's 570 zone runs; Defense's real grip heights).**

| | NFL | run-ref-10 | Finish | Package |
|---|---|---|---|---|
| Fixed 1,321 runs, paired yards a run (SE) | | | −0.57 (0.04) | −0.05 (0.05) |
| Broken tackles a run | | 0.168 | 0.117 | 0.142 |
| Stuff rate, zone runs | 16.8% | 17.2% | 21.6% | 15.1% |
| First contact behind the line | 42.5% | 47.5% | 47.9% | 46.5% |
| of which 0–1 yd behind | 19.1% | 27.9% | 28.1% | 27.4% |
| Stuffed after contact deeper than 1 yd | 52.7% | 50.9% | 64.6% | 46.8% |
| Stuffed after contact 0–1 yd behind | 16.3% | 25.2% | 31.2% | 20.5% |
| Gain after front-on contact | 2.84 yd | 1.28 | 1.13 | 1.85 |
| Contact to end | 1.50 s | 0.80 | 0.70 | 1.00 |
| Slip at +0.3 s | 1.25 yd/s | 0.15 | 0.09 | 1.15 |
| Turn by +0.3 s | 80° | 7° | 6° | 36° |

- run-ref-10 matched the NFL's backfield stop rate by cancelling errors: it under-stops deep hits and over-stops shallow ones. The package is the closest arm at both depths; the finish alone over-stops at both.
- The package's lower overall stuff rate comes from shallow backfield contact being too common in every arm (27–28% of runs against 19%), where the NFL also stops the runner less often. That excess is blocking and penetration: Run Game and Defense.
- The contact course moves toward the NFL on every row and is still short on gain, duration and turn.

**The pass side (Coverage, 732 dropbacks, paired, against run-ref-10).**

| | Yards a pass play, paired | YAC mean | Broken a reception | Sacks |
|---|---|---|---|---|
| run-ref-10 | 9.58 | 9.37 | 0.131 | 31 |
| `GRASP_PATCH` alone | +0.59 ± 0.22 | 10.38 | 0.212 | 29 |
| Package | −0.00 ± 0.20 | 9.32 | 0.141 | 30 |
| Package + `CONTACT_LAYER` | +0.24 ± 0.42 | 9.27 | 0.147 | 37 |

- The package is neutral on passes and sacks that finished still finish (of 200 plays with the QB held: 31 sacked before, 30 after). The whole-game card's pass rise does not appear in a paired design.
- `GRASP_PATCH` alone raises pass yards entirely after the catch, mostly holds from behind slipping (broken holds from behind 33 to 52); the finish cancels it (38).
- `CONTACT_LAYER` reshuffles pass protection (12 sacks lost, 18 new). It stays off until it has a pass-protection read of its own.

**Why the package goes on.** Paired designs are flat on runs (−0.05 ± 0.05 yd a run) and on passes (0.00 ± 0.20 yd a play); broken tackles fall on runs (0.168 to 0.142); it is the closest arm to the NFL after a backfield hit at both depths; and every row of the front-on contact course moves toward the NFL. It changes how a tackle happens without changing how many yards a play gains. Logged, not fixed: the course is still short of the NFL's (gain after contact 1.85 against 2.84 yd, turn 36° against 80°), the tackler over-rotates mildly (51° against 41° at +0.5 s), and the grasp welds the grip point from its first tick at 12–17% of capacity (Flex is benching a friction-limited tangential row). The fixed-run report for run-ref-11 is in [reviews/run-ref-11-report.md](reviews/run-ref-11-report.md).

**How a flag is cleared from here.** A 16-game card's yards rows are too noisy to clear or hold a change that a paired design resolves. A flag goes on when the paired fixed runs and the paired pass panel agree with the mechanism evidence; the card is read for bugs and for rows the paired sets cannot see.



## run-ref-12: `GRIP_REACH` on (2026-11-10)

Coverage #477. Where a tackler grips now follows from his situation: free and square, a chest-to-waist wrap; from behind, waist to legs; off a block, an arm or waist hook. Before, the leg-share draw was clamped at 0, and 17–23% of holds piled up there, which `HOLD_FINISH`'s height table then placed at the shoulder line. The means, ranges and spreads of the new draw are chosen, not sourced.

| | run-ref-11 | `GRIP_REACH` |
|---|---|---|
| Fixed 1,321 runs, paired yards a run (SE) | | −0.03 (0.03) |
| Stuffs; broken / missed a run | 12.7%; 0.142 / 0.234 | 11.4%; 0.142 / 0.241 |
| Holds at leg share under 0.10 | 845 | 0 |
| Unfinished holds | 271 | 280 |
| 732 dropbacks, paired yards a pass play | | −0.07 ± 0.08 |
| Broken a reception; sacks | 0.141; 30 | 0.132; 30 |

Flat on both paired designs, and it removes an artefact. Logged: draws −0.29 yd (SE 0.13, n 85).

## run-ref-13: `LEAN_PITCH` + `PASS_ANCHOR` on (2026-11-10)

Flex #496 (`LEAN_PITCH`) and Coverage #501 (`PASS_ANCHOR`). A committed lean is now the body's centre of mass held ahead of planted feet, which can only pitch as fast as an unopposed fall; and a pass set asks for an anchor (lean to the felt load and no further) instead of a drive. Before, a blocker's lean followed the load instantly and dropped him when the load sagged: an offensive lineman fell on 75% of dropbacks (NFL about 1–3% by the same operator), and blockers fell 580 times in 1,321 runs.

| | run-ref-12 | run-ref-13 |
|---|---|---|
| Fixed 1,321 runs, paired yards a run (SE) | | +0.24 (0.12) |
| By concept, paired | | IZ +0.62 (0.31), OZ +0.33 (0.23), gap +0.03, duo +0.01, toss +1.04 (1.01), draw −0.27 (0.58) |
| All runs; stuffs; 10+; 20+ | 3.73; 11.4%; 6.7%; 1.8% | 3.97; 11.7%; 8.0%; 2.7% |
| Broken / missed a run | 0.142 / 0.241 | 0.147 / 0.239 |
| Blocker falls; defender falls (Flex, `LEAN_PITCH` alone) | 580; 906 | 361; 709 |
| Zone DL driven back 0.5 yd or more (NFL 17%) | 8% | 12% |
| A second defender arrives (NFL 80%) | 69% | 75% |
| Dropbacks with an OL fall (`LEAN_PITCH` alone 19.0%) | 75% | 10.9% |
| 732 dropbacks, paired yards a pass play (off → both) | | +0.24 ± 0.39 |
| Sacks; pressure, 732 panel | 30; 50.8% | 23; 36.6% |

The run gain comes through held blocks, not through tackling: missed and broken are flat, blocker falls drop by a third, and pursuit improves. Rush moves keep their value; the wins a rusher loses are the ones over a blocker who had fallen. Coverage dropped the walked-back exception from the anchor (15.6% falls against 10.9%, same pocket).

The 16-game card ([scorecard](reviews/2026-11-10-lean-anchor-scorecard.md); fixed-run report in [run-ref-13-report](reviews/run-ref-13-report.md)) was read for bugs and shows none: sack rate 6.4 → 5.0%, scrambles 2.5 → 4.1%, time to throw 2.74 → 2.84 s, linemen backpedalling facing their own backfield and blockers on a man out of the play both down. It also shows offence rising further above the NFL (points a team-game 36.1 → 40.3, rush yards a carry 4.19 → 4.80, third downs 33.8 → 42.0%). That is recorded, not tuned against: the blockers were falling for a wrong reason, and the scoring excess belongs to the open pass-coverage, pressure-response and run-fit gaps below.

One test changed: `test/contact-layer.test.ts`'s `HANDS_CHEST` twist case pushes for 30 ticks instead of 20, because the lean now builds more slowly (off-centre twist at 20 ticks 10° / 5°, at 30 ticks 35° / 5°).

Open with this stack: pressure 43% in live games against the NFL's 28% (tackles kicking 1.4 yd too deep by request; free rushers; a QB who stands still under pressure; the in-the-grasp rule ending sacks in 0.25 s); 149 run-block lean-release falls (C/G driving at about 1.25× the load) and 165 TE impact falls; 451 defender impact falls (take-on technique, Defense).

## run-ref-14: the pass set on (2026-11-10)

Coverage's `WR_SNAP`, `QB_RHYTHM`, `PRESS_MIRROR` and `PRESS_RELEASE`. Receivers react to the snap they see instead of leaving on the count (outside-receiver start 0.50 s, the NFL's figure on the same operator; off, 0.40 s and a yard ahead by 1.0 s). The quarterback throws on the rhythm of his drop. A pressing corner mirrors the release and the receiver works a release against him: press slows the receiver by 0.33 yd at 1.0 s against the NFL's 0.37, lateral release 0.15 yd against 0.14.

| | run-ref-13 | run-ref-14 |
|---|---|---|
| 732 dropbacks, paired yards a pass play | | −0.56 ± 0.46 |
| Yards a pass play; completions; sacks; pressure | 9.74; 407; 23; 36.6% | 9.18; 423; 21; 33.9% |
| Set without `WR_SNAP` | | 9.59; 400; 15; 31.8% |
| Set without `QB_RHYTHM` | | 8.82; 415; 28; 38.8% |
| Set without `PRESS_MIRROR` (`PRESS_RELEASE` inert) | | 9.55; 429; 17; 34.0% |
| Set without `PRESS_RELEASE` | | 9.26; 423; 19; 33.9% |
| Fixed 1,321 runs, paired yards a run (SE) | | −0.13 (0.09) |
| All runs; stuffs; broken / missed a run | 3.97; 11.7%; 0.147 / 0.239 | 3.84; 11.9%; 0.132 / 0.251 |

None of the four is carried by the others. On runs the set is within noise except toss (−1.99, SE 0.89, n 55): receivers who react to the snap reach their perimeter blocks later. Logged for Run Game, not tuned.

Coverage's 16-game card (seed 7) was read for bugs and shows none. It moves sack rate 4.8 → 3.0% (NFL 4.6–9.4%), third-down conversion 44.2 → 51.0% (37–41%), aDOT 9.35 → 8.87, scrambles 4.5 → 3.3%; points are unchanged (43.5, 43.6). Those are recorded as open, not tuned against: a realistic mechanism goes on, and the scoring gap is ours to find.

Where the scoring gap sits with this stack (run-ref-13 card): yards after catch 9.3 a reception (NFL 4.5–5.9), completions of 20+ on 17.3% of attempts (6.7–11.1%), missed + broken tackles 0.25 a play (0.11–0.16), 62% of 20-yard runs reaching 40 (25–35%). Coverage is decomposing yards after catch by catch depth and defenders over the top; Defense is diagnosing run-down, open-field tackling, rally and deep-defender depth.

## run-ref-15: `GRASP_ARM_MOMENT` + `GRASP_JEOPARDY` on (2026-11-10)

**`GRASP_ARM_MOMENT`** (Flex #508). A grasp's hands were welded to the holder's torso, so the grip load of a runner crossing him turned his whole body through a 0.6–0.8 yd lever: +164° of grasp moment on side holds in the first 0.5 s, with his gait spending 106° fighting it. The yaw moment a grasp passes into the holder's torso is now bounded by his arm force across the chest half-span; the rest is reported as arm swing (`StepReport.armSwingYaw`) and not applied. Linear transfer is unchanged.

| | run-ref-14 | `GRASP_ARM_MOMENT` | NFL |
|---|---|---|---|
| Holder turn in 0.5 s, side / behind / front (on run-ref-13) | 79 / 46 / 64° | 57 / 41 / 53° | 34 / 27 / 44° |
| Fixed 1,321 runs, paired yards a run (SE) | | −0.12 (0.03) | |
| All runs; stuffs; broken / missed a run | 3.84; 11.9%; 0.132 / 0.251 | 3.72; 11.4%; 0.111 / 0.245 | |
| 732 dropbacks, paired yards a pass play | | −0.15 ± 0.05 | |
| YAC a reception; broken / missed a reception | 7.35; 0.123 / 0.099 | 7.22; 0.111 / 0.097 | |

The 16-game card ([scorecard](reviews/2026-11-10-arm-moment-qb-feel-scorecard.md), arm `gam`; fixed-run report in [run-ref-15-report](reviews/run-ref-15-report.md)) was read for bugs and shows none: total yards a team-game 517 → 478, yards an attempt 9.87 → 9.15, missed + broken a play 0.27 → 0.24, third downs 48.7 → 39.4%. About half the remaining side/behind turn is spin the holder brings in from his approach (Defense's `HOLD_FACING`, on its branch).

**`GRASP_JEOPARDY`** (Rules + Coaching #512). The in-the-grasp whistle fired on any pocket quarterback held 0.25 s at grip 0.6, still upright: 14 of 16 traced sacks. It now needs a tackler's control of 0.6 and the quarterback's support falling; otherwise he is ruled like any runner. No new duration.

| | run-ref-14 | `GRASP_JEOPARDY` | NFL |
|---|---|---|---|
| 1 yd → sack, p50 (780 paired dropbacks) | 0.10 s | 0.75 s | 1.1 s |
| QB travel in that time | 0.07 yd | 0.45 yd | 2.51 yd |
| Sacks; ending upright / falling | 38; 35 / 3 | 35; 12 / 23 | |
| Yards a dropback, paired | | +0.09 ± 0.06 | |
| 16-game card: sack rate; throws while held; escapes | 4.4%; 158; 7 | 3.7%; 173; 4 | 4.6–9.4% |

Left open by it: a held quarterback barely moves, throws while held are common, escapes are rare, and upright sacks remain under the stopped-progress rule.

Two tests changed with this stack. `test/run-hand-control.test.ts` leaves the new `armSwingYaw` report field out of its historical hash (it is 0 there; the recorded hashes reproduce, so the physics is unchanged with no grasp). The same card's `qbf` arm is why `QB_FEEL` is not on: scrambles 3.1 → 0.4%.

Merged with this stack and still off, each one read from promotion: `BACKSIDE_SWAP` + `KEEPER_HIP` (Run Game #511: the uncovered backside tackle on outside zone within 1.0 yd of the guard's man by 1.2 s 3 → 19%, NFL 22%; known cost, the backside backer touched by anyone 21 → 16%, NFL 46%).

## run-ref-16: `BACKSIDE_SWAP` + `KEEPER_HIP` + `RECEIVER_DEPTH` on (2026-11-10)

Three small corrections that put players where tracking has them. None is carried by a yardage gain.

**`BACKSIDE_SWAP` + `KEEPER_HIP`** (Run Game #511). On outside zone the uncovered backside tackle was installed as a solo cutoff on a wide end and held to a flat track, so he touched nobody on 76% of runs. With the swap (stretch only) he joins the double on the backside guard's man, and as a double's keeper he closes to depth on the man's backside hip instead of racing beside him.

| Outside zone, uncovered backside tackle | NFL | off | on |
|---|---|---|---|
| Within 1.0 yd of the guard's man by 1.2 s / 1.5 s | 22% / 33% | 3% / 7% | 19% / 26% |
| First touch: the inside man / nobody | 35% / 30% | 15% / 76% | 30% / 60% |
| Backside end's tackles (381 runs); in the backfield | | 14; 3 | 12; 2 |
| Backside backer touched by anyone | 46% | 21% | 16% |
| Fixed 1,321 runs on run-ref-15, paired yards a run (SE) | | | +0.01 (0.06); OZ +0.04 (0.21); other concepts identical |

Known cost, recorded: the backside backer is reached less often (21 → 16%), because the guard now climbs from a double. The parked run-game notes (`docs/reviews/run-game-parked.md`) carry the next question: outside-zone doubles physically form a third (play side) and a tenth (backside) as often as the NFL's.

**`RECEIVER_DEPTH`** (Rules + Coaching #514). On-line receivers and attached tight ends stand at the tracked depth from the ball (0.74 and 0.83 yd with no defender in front), and a receiver who sees a defender within 2 yd in front before the snap backs off 0.23 yd. The NFL side of the operator measured from an integer yard line; it now measures from the tracked ball.

| Depth off the ball, p50 | NFL | off | on |
|---|---|---|---|
| WR #1 / WR #2 / TE | 0.82 / 1.02 / 0.96 | 0.60 / 1.20 / 1.19 | 0.74 / 1.20 / 1.06 |
| Fixed 1,321 runs on run-ref-14, paired yards a run | | | +0.17 ± 0.10 (IZ +0.44, duo +0.37): the tight end stands 0.36 yd shallower |

The snap assessment is identical across all 24 formations. The personal depth habit is parked.

## run-ref-17: `FIT_TE_GAP` + `FIT_BLITZ_SLIDE` on (2026-11-10)

Rules + Coaching #519, the first step of the old run-fit port (#396 and #398's slide). Every technique outside the tackle was filed under the D gap, so with a tight end attached the C gap between tackle and tight end had no owner. `techniqueGap` now takes the tight end into account, the Over's Sam is named D, and a 6 on a tight end still rushes outside him (`rushGap`). With `FIT_BLITZ_SLIDE` a called blitzer takes his gap and the displaced lineman slides to the nearest open one.

| Gap accounting, 24,216 alignments | off | `FIT_TE_GAP` |
|---|---|---|
| Strong C holes | 6,379 | 4,040 |
| Ace 11 against the 4-3 Over, strong C unowned | 114 of 144 | 0 of 144 |
| Unowned gaps; duplicates; fully sound | 36,917; 5,699; 2,082 | 36,264; 5,046; 2,332 |
| Fixed 1,321 runs on run-ref-15, paired yards a run | | `FIT_TE_GAP` +0.05 ± 0.05; `FIT_BLITZ_SLIDE` +0.01 ± 0.04 |

On for gap soundness, not yards. The rest of the port (`FIT_END_FORCE`, `FIT_BOX_BUBBLE`, the formation spec) is parked with the run game.

## engine-66: `RELEASE_BELIEF`, `ENGAGE_FELT`, `SCREEN_CALL`, `CLOUD_KILL` and `STALK_CLOSE` on (2026-11-14)

**`RELEASE_BELIEF` (Defense, #738 `c6113748`).** Every defender's "the ball is out" comes from his own belief (the passer's arm as he sees it, or the ball seen), not the true air state. A defender who keyed the arm had been handed the ball's whole true path at the release with no delay (worth about 19 breakups and 3 interceptions in 8 games). In its place a zone defender with his eyes on the passer reads the passer's shoulders through the tracking channel, chooses at the delivery, and breaks to the receiver they point at (within 25 deg, one choice per belief, his read error by anticipation); a man defender stays on his man. The break goes to the right receiver about 57% of the time across three seeds: of the wrong ones, most have another receiver within 10 deg of the target, then the passer's own shoulders off the target, then the rated read error. A first build left a 0.3 s gap between "his flight has landed" and the catch carry, which put the nearest defender on a stale line (never reached 0.20 to 0.30 of short completions); with one test for both it is 0.22 / 0.26 against 0.18 to 0.20 before and the NFL's 0.20. Known residue: first move 0.5 s after release against 0.4 (NFL 0.4). **Remaining cheat, named:** once a defender has seen the ball, `acquireFlight` still gives him its true path; Coverage's `BALL_EST` replaces it (a defense-only bit is being built).

**`ENGAGE_FELT` (Flex, patch from `claude/quirky-franklin-9lbwbp` `ca67eff3`).** An engaged man reads the man he is engaged with by touch at the hands' delay (0.06 s) while his hands carry load, and by sight at his sight delay when they do not, in place of the opponent's true position: facing for every engaged role, the ride trigger, the run blocker's seal and reach reads, the rusher's aims off the blocker's body, the run defender's touch reads. A first build stepped the picture back in time each time the hands' load crossed zero (about 0.5 times an engaged second); the delay now ages continuously from the last loaded tick, and the same picture serves `REP_SEEN`'s and `RUN_FEEL`'s reads, which had the step already. Outcome geometry (past and out of reach, the block lost behind his shoulders) stays on the World's bodies; the review lists what was kept true and why.

**`SCREEN_CALL`, `CLOUD_KILL`, `STALK_CLOSE` (Rules+Coaching, #730 `036551cc`).** Six screens and the screen RPO were defined and never called; they are called (about 6 to 7% of attempts; NFL screens 8.5% of dropbacks), killed to the quick game against a cloud corner, and the perimeter blocker closes his man under control to a breakdown on the line to the catch and strikes the catch-side half, from his own picture. Screen defender who sheds and reaches the catcher within a second: 0.36 without `STALK_CLOSE`, 0.15 with it (NFL screens 0.13). **Stated weakness:** the block's hold is half the NFL's (engaged 0.4 s against 0.8; held half a second or more on 46% against 74%), so screens gain little against Cover 3 (the nickel wins through about 60%); that is the hands work. The RPO is thrown about 58% against the NFL's 30% (call mix, for the refit).

Checks. Fresh run set 3.92 (engine-65 3.80; `ENGAGE_FELT`'s lane read was +0.10, SE 0.10); missed + broken open 0.293 (0.271; broken 0.094 to 0.119, which Flex traced in the lane to free tacklers the felt picture is never read for, within its counts' noise). Card against engine-65, 16 games a side, seeds 11 / 23 / 31 (`out/e75-card-*`):

| arm | completion | yards / attempt | YAC / reception | sack rate | aDOT |
|---|---|---|---|---|---|
| `RELEASE_BELIEF` | -1.7 / -0.4 / +3.5 (moved) | -0.46 / +0.30 / +1.52 (moved) | -0.11 / +0.72 / +1.41 (moved) | -0.9 / -1.2 / +0.9 | +0.02 / +0.05 / -0.03 |
| `ENGAGE_FELT` | -4.0 (moved) / -2.7 (moved) / +0.8 | -0.87 (moved) / -0.61 / +0.47 | -0.26 / -0.45 / +0.60 | +0.0 / -0.7 / +0.2 | +0.14 / +0.32 / -0.27 |
| screens (three flags) | -2.4 / -2.9 (moved) / +2.0 | -0.79 (moved) / -0.66 / +0.28 | +0.07 / +0.11 / +0.38 | -0.1 / -0.3 / +0.5 | -0.32 (moved) / -0.30 / -0.36 (moved) |

What agrees across seeds: the screens lower aDOT by about 0.3. Nothing else agrees; seed 31 is up in every arm. The two honesty changes land on the information rule.

Suite on the flipped stack: the known research pair, and one fixture moved by `ENGAGE_FELT`, restated before merge: `hold-facing`'s pinned scene (seed 1922, `DT_W`) no longer has the hold in either arm, and is re-pinned to seed 1921 `DT_S` from a scan of seeds 1900 to 1989 on the test's own premise (Defense `95c22940`; off 206 deg, on 36 deg).

## engine-65: `QB_KEY_MAN`, `PLAN_KEYS_2`, `TRUNK_TWIST`, `VERTICAL_SET`, `CROSS_FLAT` and `CUT_WALL` on (2026-11-14)

**`QB_KEY_MAN` (QB lane, `claude/exciting-cori-hc8l4u` `e4f83660`).** A key read is taken on the concept's named defender and follows what that man does (his movement), not the position of whoever stands nearest the line between the two routes (the read landed on the named man on 39% of key reads before, 98% with it).

**`PLAN_KEYS_2` (Rules+Coaching, #737 `12258a29`).** Six more coached keys: slant_flat, stick (trips; the danger is the Mike inside the stick), fade_flat, double_slants, and quick_outs and hitch_out under the taught family rule for a two-receiver quick combination (read the front-side flat defender and throw away from him, cued on the set). trips_stick and seam_slant stay pure progressions (no source). Carded only together with `QB_KEY_MAN`: without it a keyed plan reads the nearest body.

**`TRUNK_TWIST` (Tools/Physics, #744 `3bd1b543`).** The shoulders turn up to 55 deg off the hips (360 deg/s; `TRUNK_RANGE_DEG`, `TRUNK_RATE_DEG` are the stated handles) and the gait and its speed cap read the hips. A receiver looking the ball in keeps his path. Deep targets, 24 games: speed lost in the last 0.5 s before arrival 0.91 off, 0.64 on (NFL turned receivers about 0.6); hips off the path at arrival 92 deg to 25. `CATCH_SPEED`'s "tracking a ball he is not facing" term had used the line of run as his facing and now reads the shoulders when he has a twist. Matched restage: 0 of 94 run plays change.

**`VERTICAL_SET` (Flex, patch from `claude/quirky-franklin-9lbwbp` `b3f5fef4`).** The tackle's kick gives ground vertically, no wider than the set line from his alignment, leading only the rusher's inward motion. Lane read, default to on (NFL): the rusher's first contact lands wide 26/27% to 54/50% (49%); the tackle's outward speed at contact against a wide rusher +0.75..+1.00 to 0.00 yd/s (0.00); inside share of edge wins 72/60% to 54/41% (47%); edge win 10/8% to 9/8% (13%). World fall events on linemen 5.8 to 5.2 per 100 dropbacks; an earlier rise in a fall proxy was linemen who stop and hold.

**`CROSS_FLAT` (Rules+Coaching, #746 `95b7aef2`).** The shallow's route points were a 2.5 yd vertical stem then a diagonal climbing to 5 yd across the field; it now releases flat to 2.5 to 3 yd and runs flat, as taught. Mesh keeps its own pair (`shallow_high` at the linebackers' toes and a `mesh_under` a yard beneath). Shallow class in zone, depth at 2.0 / 2.5 / 3.0 s: 3.5 / 4.5 / 4.9 to 3.0 / 3.5 / 3.4 (NFL 2.2 / 2.9 / 3.1).

**`CUT_WALL` (Coverage, #743, `coverage/C14-cut-wall-flat` `563ecfac`).** A zone or match defender does not carry a shallow crosser man to man: he walls from his own area at his current depth and plays his zone once the crosser is through (MEG, MUSH, the rat and pure man calls keep their carry). Parked alone after two attempts (the old shallow climbed onto the hooks' line whatever they did) and un-parked on `CROSS_FLAT`: nearest defender to the drag at 2.5 / 3.0 s 3.7 / 3.2 with `CROSS_FLAT` alone, 4.2 / 4.7 with the wall (NFL 4.3 / 4.1).

Merged off: the restructured `QB_KEY_THROW` (he stays on the key's answer through its break and throws it only when it passes his price), `BALL_EST` and `BALL_EST_TAU_SD` (Coverage; a dependency of the QB lane's deep-belief read).

Checks. Fresh run set 3.80 (engine-64 3.80); missed + broken open 0.271. Two cards, 16 games a side, seeds 11 / 23 / 31.

First card, against engine-64 (`out/e72-card-*`):

| arm | yards / attempt | completion | time to throw (s) | sack rate |
|---|---|---|---|---|
| `QB_KEY_MAN` | +0.37 / -0.14 / -0.32 | -0.5 / -0.2 / -1.1 | -0.01 / +0.06 (moved) / -0.01 | +1.5 (moved) / -0.6 / -0.9 |
| + `PLAN_KEYS_2` | -0.27 / -0.14 / -0.39 | -0.6 / -1.7 / -1.1 | +0.01 / +0.08 (moved) / +0.02 | +0.6 / -1.4 (moved) / -0.0 |
| `CONCEPT_DROPS` | -0.54 / -0.65 / -0.54 | -1.2 / -0.7 / -0.5 | +0.05 (moved) / +0.09 (moved) / +0.02 | +1.3 / -0.3 / -0.0 |

Second card, against the candidate with the two key flags on (`out/e73-card-*`):

| arm | completion | yards / attempt | YAC / reception | sack rate |
|---|---|---|---|---|
| `TRUNK_TWIST` | +0.7 / +3.5 (moved) / +3.7 (moved) | +0.80 (moved) / +0.37 / +0.76 | +1.07 (moved) / +0.08 / +0.33 | +0.2 / +1.7 / +0.5 |
| `VERTICAL_SET` | +1.1 / +3.1 (moved) / +1.0 | +0.49 / -0.35 / -0.05 | +0.60 / -0.98 (moved) / -0.00 | +0.6 / +0.7 / -0.3 |
| `CROSS_FLAT` | -2.2 / +1.4 / +0.2 | +0.17 / -0.38 / +0.64 (moved) | +0.37 / -0.72 / +0.75 | -0.1 / +0.4 / -0.8 |
| `CROSS_FLAT` + `CUT_WALL` | +1.4 / -0.2 / +0.2 | +0.54 / -0.76 / +0.62 | +0.59 / -1.13 (moved) / +0.87 (moved) | +1.1 / +0.7 / -0.5 |

What agrees across seeds: `TRUNK_TWIST` raises completion (about 3.5 points on two seeds) and yards per attempt on all three. Tools expected completion inside noise, so the size is to be attributed after the fact (by family and air yards, and how much is the catch term reading the shoulders). Nothing else agrees. Yards per attempt was already above the NFL range and this raises it.

**Held: `CONCEPT_DROPS`.** Yards per attempt fell about half a yard on all three seeds against an expectation of flat. The QB lane's paired staging (the same plays off and on, 192 a concept) found three things under one flag: dagger and y_cross changed without being marked, because the deeper set had been wired as the meaning of their existing drop (yards a play 6.28 to 3.28); four_verts and verts_hitch on the gun three-step gain 1.7 yards a play with no more sacks; and on the ten marked five-step concepts the throws are better (+0.6 yards an attempt) while sacks rise from 9.3% to 13.9% of plays. The flag is to be split; who gets the extra sacks and whether protection's launch point moves with the called drop are open.

Suite on the flipped stack: the known research pair; `film-pack-determinism` and `concept-menu` on their timeouts inside the full suite; and three fixtures moved by the new defaults, restated before merge. `punch-strike`'s isolating case pins `VERTICAL_SET` off (Flex `6e7f519c`: the tackle's set changes the scene beside the guard). `pursuit-commit`'s staged throws are re-recorded on this engine (Defense `e98d8222`: under `TRUNK_TWIST` the catches under the old throws changed; the off premise still rests on one defender). `man-trail-carry`'s scenes are re-found by the premise alone (Defense, same commit: under `CROSS_FLAT` the old mesh scenes lost their trailing man at the catch).

## engine-64: `OUTLET_LAST`, `PLAN_KEYS` and `OPEN_FIELD` on (2026-11-14)

**`OUTLET_LAST` and `PLAN_KEYS` (Rules+Coaching, #733 `e9ea51ca`).** The read plans put the back's outlet last, as the progressions are taught, and take their key defenders from the plan table (#732). The plan was reading the back second, which was half of the flat excess measured at engine-63. Lane read, off → on: back targets 28.4 → 12.5% of targets, FLAT 35.0 → 25.7% (NFL 14.1), air yards 5.90 → 7.45.

**`OPEN_FIELD` (Defense, #735 `8d1b8fc4`).** The nearest defenders to a free runner give ground with him and close laterally instead of driving at him and being passed (engine-63's after-catch finding). Lane read: catches gaining more than 10 after the catch 0.20 → 0.13 and 0.17 → 0.12; the two nearest defenders stop him 0.29 → 0.37 (NFL 0.43); fresh run set +0.04; third-and-1 unchanged.

Merged off: `CONCEPT_DROPS` (#733; drops by concept, carded next with `dropSpec('five')`), `HEAD` with its neck range (Tools, #720 `b742770d`), and Tools' diagnostics (#731 `d5ad052b`).

Checks. Candidate `0964510fb`. Fresh run set 3.80 (engine-63 3.72); missed + broken open 0.271. Cards, 16 games a side, four arms (`out/e71-card-*`), seeds 11 / 23 / 31:

| arm | aDOT | time to throw (s) | YAC / reception | missed + broken / play | yards / attempt | completion |
|---|---|---|---|---|---|---|
| plan | +1.50 / +1.20 / +1.31 (all moved) | +0.05 / +0.08 / +0.07 (all moved) | −0.65 / −0.23 / −0.86 | −0.00 / −0.01 / −0.02 | −0.43 / +0.60 / +0.05 | −6.2 (moved) / −1.8 / −2.0 |
| field | +0.05 / −0.17 / +0.15 | +0.01 / +0.01 / −0.01 | +0.26 / −1.08 (moved) / −1.16 (moved) | +0.01 / −0.05 (moved) / −0.06 (moved) | +0.17 / −1.14 (moved) / −0.17 | +0.3 / −2.8 (moved) / +4.8 (moved) |
| both | +1.01 / +1.13 / +1.28 (all moved) | +0.10 (moved) / +0.03 / +0.08 (moved) | −0.83 / −0.65 / −0.71 | −0.03 / −0.04 / −0.06 (all moved) | −0.13 / +0.03 / +0.53 | −1.5 / −3.5 / +0.6 |

What agrees across seeds: the plan arm throws about 1.2 to 1.5 yd deeper and 0.05 to 0.08 s later, with completion down on all three (one resolved); together the candidate's YAC is 0.65 to 0.83 lower and failed tackles fall on every seed. `OPEN_FIELD` alone does nothing on seed 11 and moves YAC and failed tackles on the other two; its completion row moves in opposite directions on 23 and 31, so it is not read. Yards per attempt, sacks, interceptions and points do not agree. aDOT 6.6 to 6.8 is still under the 7.5 to 8.5 band and YAC 6.4 to 6.7 still over 4.5 to 5.9. One row with no mechanism: punt return average +3.84 (moved) on seed 11's candidate arm, +0.74 and −0.11 on the others and +0.34 / +0.19 / +0.04 in the field arm alone; left as seed noise, to be watched at engine-65.

Suite: 4 failures on the first pass. Two are the known research pair. `film-pack-determinism` timed out at 240 s beside the rest of the suite and passes alone (191 s). `acc-radius`'s four-verts case moved with `OUTLET_LAST`: on two plays where the first vertical is not there he now comes back to a vertical at 4.15 and 4.45 s instead of dumping to the back at 2.9 s (7 verticals of 10, was 5); "none after 3.5 s" is restated as at least five on time. `ACC_RADIUS` stays held.

## engine-63: the quarterback's honesty, line of sight and the tackle-bond roll (2026-11-14)

Eleven switches on: `QB_HONEST_FEEL`, `QB_BELIEVED_DEF`, `QB_SEEN_MAN`, `QB_SEEN_OUT`, `QB_SEEN_REC`, `TRACK_FEEL` (QB lane, `17da2caa`); `QB_RELOOK` (QB lane); `SIGHT_CARRIER`, `SIGHT_COVER`, `SIGHT_RECOG` (Rules+Coaching, #716 / #718 / #719 at `078c5a0d`); `ROLL_AXIS` (Defense, #726 `d63a92a4`).

**The quarterback's side of the information rule.** He feels the rush from what he has perceived (through the tracking channel for a rusher in sight), prices defenders where he believes them to be, and reads the man on a receiver, the out-breaking defender and the receiver himself from his own pictures. `QB_RELOOK`: when his reads run out he no longer gets a look round the whole field at a lowered bar; he goes back through them one look at a time at his own bar (staged: off he throws to an unlooked-at man on the tick the reads end; on the throw waits until the progression has come back to that man). Cards against engine-62, three seeds: the honesty arm yards per attempt −0.35 / −0.36 / −0.34, completion −2.2 / +1.0 / −2.7 (the last moved); nothing else agrees. With `QB_RELOOK` nothing agrees across seeds.

**Line of sight.** `see()` looked through bodies on 11% of reads. The carrier's reads of defenders, coverage defenders' reads and the recognition keys (linemen, quarterback depth, the back at the mesh, the give, the keyed receiver) now need light to reach the eyes past the bodies between, by height and posture (`sight.ts`, engine-61's plumbing), no dice. Lane reads: linebackers commit about 0.05 s later on runs and are still right on every one; on draws the share reading run at the handoff falls 45.8 → 29.2%; the fresh run set is inside its floor for each. Card arm: nothing agrees across seeds.

**`ROLL_AXIS`.** A secure wrap's roll took its axis from the runner's velocity above 0.3 yd/s and from the attack direction below it; a runner walked at about that speed had his direction swung by each tick's roll, so the holder's request flipped every tick (11 reversed re-aims on one play). The axis is continuous in his velocity. Fresh run set −0.01 (SE 0.01); the dither stage reads 0.0099 /s.

**Held: `QB_GATHER`, `QB_EYES`, `QB_GATHER_THROW`.** Carded as an arm on top: time to throw +0.09 / +0.12 / +0.08, sack rate +0.6 / +2.8 / +1.6, scrambles +1.4 / +1.6 / +0.9 points. They wait on the out-of-pocket phase: of dropbacks still holding at 3.0 s, 43% get out of the pocket in the NFL and 14 to 17% of ours (QB lane, `QB_BREAK` and `QB_RELOOK` on).

Checks. Fresh run set 3.72 (engine-62 3.75); missed + broken open 0.270. Fixtures restated before merge: `rush-arm-balance`'s long-arm case as a paired search (Flex; on the old scene the man now falls on a club instead, another class); `read-plan`'s defender-key case held on the seeds that read cleanly (QB lane: on one seed the keyed defender is a linebacker sitting on the threshold, moved 0.2 yd by the sight flags; the key landing on the nearest defender to the stretch and not the named one is a known defect, in the key-read work); `acc-radius`'s four-verts case restated as a comparison with the off arm (the panel's open seam is walled by `APEX_LEVERAGE`; `ACC_RADIUS` stays held and will be replaced by a belief fitted to receivers without the ball-path oracle).

**What the day's measurements found, recorded here because they set the next builds** (same operator on BDB 2025 and on the engine unless noted):
- *After the catch.* First contact matches the NFL (class shares, speed lost on a failed tackle). The gap is the stop of a free runner: the two nearest defenders get him 43% of the time in the NFL and 25% in ours while running slower than ours; they are about a yard deeper at the catch, give ground with him and close laterally, where ours drive at him and are passed within half a second. Movement was benched and cleared twice (turn at speed; acceleration when moving). `OPEN_FIELD` (Defense, candidate) is the build.
- *Late throws.* NFL completion falls with release time (79% under 2.0 s to 51% past 4.0 s) because late throws are deep (median 11.5 to 13.3 yd) and on the move; coverage does not tighten. Ours stays at 65 to 71% because the late throw is a 4 yd sit-down from a set platform. He prices a downfield man at a median 0.23 against a bar of 0.55.
- *Targets by route.* FLAT 34.9% of targets against 14.1%; CROSS 4.9% against 11.8%. Half of the flat excess is the plan reading the back second (`OUTLET_LAST`, candidate); crossers are covered more tightly than the NFL's (man 1.2 to 1.3 yd against 1.8 to 1.9 at 2.5 to 3.0 s; zone 2.3 against 3.4) and his price on them is calibrated.
- *The receiver without the ball-path oracle.* Open misses are one defect seen three ways: after his first look nothing keeps the ball in view (it leaves his eyes in the last 0.5 s on 57% of open targets). The NFL deep receiver opens to the passer at about the release and slows 7.5 → 6.4 yd/s doing it.
- *Turned running.* Receivers, tight ends and backs with shoulders 70 to 130 deg off their path are 1.8 to 3.0 yd/s slow against tracking (cleaned of flipped orientation); one `facing` carries shoulders and gait. A bounded trunk twist is in prototype (Tools/Physics). Defensive backs are not slow.
- *The edge.* The tackle's set was sliding out with the rusher (`VERTICAL_SET`, candidate, puts set, landing and speed on the NFL). What then holds the rusher at the hip is a rolled value: `control`, set by a rolled punch exchange and rolled move outcomes, scales the blocker's physical press, and separates held reps from won ones completely. With the roll out of the hands (`CONTROL_HANDS`, candidate, not yet football: interior pressure 3% against 10%) the remaining term is a man carried across a load bracing it as if planted (`BRACE_GAIT`, candidate).
- *Screens.* Six screens and the RPO are defined and never called (`SCREEN_CALL`, candidate). The defense is in NFL positions at the catch on its existing rules; the stalk block and the free runner are what fail.

## engine-62: `RUSH_BULL` on and `APEX_LEVERAGE` at 7 (2026-11-14)

**`RUSH_BULL` (Flex, `claude/quirky-franklin-9lbwbp` `8c58f7c5`).** The bull rush is the rusher's drive (push through the chest to the quarterback at 0.55 vmax, pad level) against the blocker's anchor, resolved by the World. The rated roll, the won bull's scripted strike, the lost move's blocker punch and stall, and both control swings are removed together; the pass rep's control no longer drifts toward the better hands rating. It is the first of the rating rolls engine-60 measured (92% of about 6,500 rolls lost, a move attempt worth less than none) to be rebuilt as a force.

**`APEX_LEVERAGE` = 7 (Coverage, #702 `64934823`).** The quarters and Cover 6 apex walls No. 2 level, not 0.8 yd inside (1); once the back commits as a flat threat to his side he stops leading No. 2, widens and holds about 9 yd over the back he sees, never coming up to make it (2); the quarters Mike widens to the hook on a flat declaration (4). Lane read, off → 7 (NFL): apex depth at 2.5 s with a flat back 7.9 to 8.5 → 6.0 to 6.7 (6.2). The cushion and margins are measured stand-ins, not coached. Open (COV-11): he gets level with No. 2, not 2 yd outside. Merged onto engine-61 here; in `Wall` the feed-forward and `INFO_HONEST`'s seen-quarterback facing are kept together (Coverage confirmed).

Checks. Candidate `164f4d14` carded; fixtures then restated. Fresh run set 3.75 (engine-61 3.73); missed + broken open 0.266. Cards, 16 games a side, four arms (`out/e67-card-*`), seeds 11 / 23 / 31:

| arm | sack rate | yards / attempt | YAC / reception |
|---|---|---|---|
| bull | +1.5 (moved) / −0.8 / +1.5 (moved) | +0.51 / −0.06 / −0.63 | +0.59 / +0.21 / −1.16 (moved) |
| apex | +1.1 (moved) / −0.0 / −0.3 | +0.01 / −0.38 / +0.11 | +0.33 / −0.76 / −0.71 |
| both | +0.9 / −2.2 (moved) / +0.1 | −0.38 / −0.19 / −0.35 | −0.09 / −0.13 / −0.43 |

Nothing agrees across seeds in either arm. Suite: five fixtures moved with the new defaults and were restated before merge. Flex `7c8c590a`: `rush-lean-bound`'s two "no longer goes down" cases became one paired search (re-found at cover1 roster 2 seed 2), and the swum-past-his-press case is dropped because no such fall occurs in 288 scenes with the bull as a force; `punch-strike`'s isolating case pins `RUSH_BULL` off and its propped fall is a search with a floor. Defense's `pursuit-commit` case moved because the throw moved; it now stages develop's recorded throws through the test-only `stagedThrow` hook (start, receiver, aim and flight time; it suppresses an earlier pump, stated in its comment), as do `man-trail-carry` and `arrival-lead`, so a quarterback timing change no longer breaks a defensive scene.

Also in this merge, no engine change: Tools' scorecard rows (#724: rush yards capped at 20 and beyond 20, scramble yards, a run-situation mix section; numeric flags in `ref` and `ref:report`, with `INFO_HONEST` and `APEX_LEVERAGE` registered), and Rules+Coaching's `release-evidence.ts` (#725, no consumer; for presented possession).

**The card's rush row** (Tools, 48 games an arm on the engine-61 candidate, recorded in `docs/VALIDATION.md`): the defensive honesty arm read 4.12 → 4.25 uncapped and 3.61 → 3.75 capped, breakaway counts flat and the run mix unchanged; a 16-game card is about ±0.45 uncapped on that row, so engine-61's +0.5 on three seeds was inside the spread. One cell moved: runs of 0 yd or less 11.6 → 9.6%.

## engine-61: the honesty batch: `HONEST_READS`, `INFO_HONEST` (63), `HONEST_TACKLE`, `RCV_SEEN`, `TRACK_PURSUIT`, `TRACK_TACKLE` and `PURSUIT_SPOT` on (2026-11-14)

Seven switches that replace reads of true state with what the player perceives, from the information-leak sweep (`docs/reviews/2026-11-13-information-leak-sweep.md`). They land together because they are the same rule and their fixtures overlap. Heads: Defense `9fab1505` and `2f7f3fec`, Coverage `fa086ced`, Rules+Coaching `f7a88774` and `0391caa8`, #717 `5654d0a9`, Flex's fixtures `6d11eab2` and `7e6c8bb4`.

**Defensive reads (`HONEST_READS`, `INFO_HONEST=63`, `HONEST_TACKLE`; Defense and Coverage).** A blitzer peels, a pursuer plays the ball and a coverage player opens only on a throw or holder he has seen; deep help, man carries, zone lanes, facing and eyes read his own picture; the tackler reaches for the carrier as he sees him and reads closing, separating and behind from the seen motion. Reach, grip and contact stay physics. `HONEST_TACKLE` is not yet honest about identity: a defender still cannot tackle a body he wrongly believes has the ball (the presented-possession work, #713). Cards, 16 games a side, five arms (`out/e65-card-*`), this arm against engine-60, seeds 11 / 23 / 31: yards per attempt +0.56 (moved) / +0.55 / +1.46 (moved); YAC per reception +0.70 / +0.68 / +1.84 (moved); 20+ yd completions +1.4 / +2.6 (moved) / +3.1 (moved) points. This is the cost of the oracle leaving: defenders who knew the true release and the true carrier were closing early. YAC was already above the NFL band (4.53 to 5.91) and is further above it now; the repair is the defender's side of the ball in the air and after the catch (`BALL_EST` for a defender looking at the ball, `HEAD`, the sight flags), not the oracle. The card rush row rose about 0.5 in this arm while the paired run set moved +0.02 to +0.04: the card row is uncapped designed runs on diverged games and a handful of 50 to 90 yd runs decide it (Tools; the capped and beyond-20 rows are on `claude/scorecard-rush-rows`). On three other seeds with all six on, Tools read 4.27 → 3.93 uncapped and 3.72 → 3.48 capped.

**`RCV_SEEN` (Rules+Coaching).** Receivers' and convoy blockers' reads of defenders (down, taken, where to fit) and the turn to block for the catcher come from what they see. Lane read: YAC 6.68 → 5.70 on its fixture. Card arm: nothing agrees across seeds.

**`TRACK_PURSUIT` and `TRACK_TACKLE` (Rules+Coaching; perception channels step 1a and 1a').** Pursuit's aim and the last yards of a tackle read the carrier through the tracking channel (0.12 s, only for a target in sight) instead of a scaled recognition delay with focus and stress stacked on it. This is the first piece of the three-channel perception model (#691): tracking is fast, recognition is slow, anticipation can be wrong. Card arm: YAC −0.09 / −0.41 / −0.28, none resolved.

**`PURSUIT_SPOT` (Defense, #717).** With a tracked picture whose velocity is corrected every tick, `PURSUIT_COMMIT`'s held meeting moment turned each correction into a shift of the aim point (request turn at 3 to 8 yd 11.2 → 16.3 deg/s). The pursuer now commits to the spot, released on a cut, on losing reach, on an earlier meeting by a margin, or when near: 3 to 8 yd 11.2 → 8.1 deg/s, 0 to 3 yd 51.5 → 34.0. Cards against the rest of the batch (`out/e66-card-*`, six seeds): YAC +0.56 / +0.44 / +1.01 (moved) on 11 / 23 / 31 and +0.07 / +0.32 / +0.07 on 7 / 8 / 9; yards per attempt +0.97 (moved) / +0.35 / +0.41 / +0.54 / +0.12 / −0.39; missed + broken nets to zero. Held for a trace before merging. Defense's matched completions (689 pairs with the same catch tick, catcher and position 0.2 s later; every non-play-action concept and screen, four coverages): paired YAC +0.17 (SE 0.22), trimmed at 20 yd −0.05 (0.08), the difference being 13 breakaway swings (7 up, 6 down); catch to first contact p50 / p75 0.80 / 1.25 s in both arms. None of the three suspects showed: no defender holds a spot on the catcher at the catch (0 of 2,067), releases after the catch are frequent, and the first spot's picture error is the tracker's and equal in both arms. Landed as not reproduced on matched plays; the card sign (six of six positive, about +0.4 pooled) is recorded, and play-action and boundary snaps are the part of the panel still to add.

Checks. Candidate `255f5c16`: full suite 4456 pass with only the two known research failures, after Flex's `rush-lean-bound` earned-fall case became a search with a floor (the pinned scene moved with every defaults change). Fresh run set 3.73 (engine-60 3.79); missed + broken open 0.305 → 0.265.

## engine-60: `THROW_HOLD`, `POCKET_REACH`, `REP_SEEN` and `RUSH_LEAN_BOUND` on (2026-11-14)

All four are Flex's (`claude/quirky-franklin-9lbwbp` at `1b76a93f`).

**`THROW_HOLD` and `POCKET_REACH`: the finish.** The pass-rep report had located the missing sacks after contact: sacked given contact 53% in the NFL against 14 to 26%, with arrivals matching; 93% of our post-contact throws were already in a windup nothing could interrupt, and 42% of the time the contact defender was on a tackle cooldown, having "missed" at lunge range by a rated roll (`rng.chance(pMiss)`). `THROW_HOLD`: the load on the passer's body during the delivery (a grasp's upper-body hold or the contact load, over his arm force) disturbs the release continuously and stops the arm at 1; it replaces `THROW_BODY`'s rolled pin. `POCKET_REACH`: a tackle on a pocket quarterback misses by reach geometry (the tackler's momentum toward his delayed picture, the quarterback cutting away if he sees him), not by the roll; this removes the `seesIt` true-bearing read with it. Lane read, 16 games a seed, off → on (NFL): sacked given contact 18 / 17 → 30 / 30% (53); after first contact sacked 19 / 15 → 27 / 27% (47), threw 72 / 76 → 65 / 62% (30), escaped 9 / 9 → 7 / 11% (22). Arrivals unchanged in every arm (within 2 yd 21 to 22%, first contact 12 to 14%). The thrown-after-contact bucket: completion 46 → 37% and 63 → 39%, air yards unchanged, no added interceptions. `throwDisturb` was 0 on all 194 clean throws checked. The whole change is where the windup was under way at contact (sacked 1/36 → 8/38); not yet in the windup he was already sacked 72 to 73%. Owed separately: the fumble on a hit before the hand comes forward. The rest of the gap is the quarterback's (throws leaving 0.05 s after contact; escapes), with `throwDisturb`, `throwPull` and `qbHold` exposed for it.

**`REP_SEEN`.** Four information reads inside the pass rep: the rusher aims at and faces the quarterback he sees; he reads his leverage and the blocker's overset from his own picture; the blocker sets and rides against the called launch point and the man as he has him; the blocker's sight delay follows his own hands being off. Near neutral on two seeds. The OL-fall drift it showed (3.9 → 4.5, 3.8 → 5.0 per 100) was traced: 23 against 24 falls over two 8-game windows, 0 of 47 with a blocker's hand off; inside the window spread.

**`RUSH_LEAN_BOUND`.** A rusher leaning on his man commits no more lean than his base can recover from, as a protector does under `ANCHOR_BASE`. DL falls 7.7 / 9.6 → 3.9 / 4.6 per 100 drop-backs (NFL about 1, by the same proxy, eye-checked that down means down); interior propped falls 20 → 1; OL falls 4.5 / 3.1 → 3.7 / 2.5. A rusher who stays up bats more balls at the line (deflections 38 → 48, 44 → 50). Still open: about 2 edge falls per 100, driven over backward after an honest collision. Two attempts at a forward brace (`RUSH_PAD_LEVEL`) and two at an oriented base (`BASE_ORIENT`) made falls worse and are parked: an equal-area ellipse loses more on its short axis than it saves on its long one. `POSTURE_FORCE` had nothing to act on: the engine's posture 1 is 62 to 87° of knee flexion, already at the force optimum.

Checks. Candidate `a5c9f35c` (with the QB lane's `installedPlan` fix `bfd2e201`: an unregistered formation now has no installed plan instead of a throw): full suite 4451 pass with only the two known research failures. Fixtures moved by the new defaults were restated before the head was sent (`punch-strike`, `rush-arm-balance`, `rush-lean-bound` re-found on this stack; `pursuit-commit`'s jump rate asserted at 3 to 8 yd, Defense `1bf06d2b`). Fresh run set 3.79, identical to engine-59's; missed + broken 0.305. Cards, 16 games a side, four arms (`out/e64-card-*`), sack rate:

| seed | reference | finish pair | lean bound | all four |
|---|---|---|---|---|
| 11 | 3.9% | 5.5% (moved) | 3.4% | 4.8% |
| 23 | 3.3% | 5.4% (moved) | 3.1% | 4.8% (moved) |
| 31 | 3.5% | 4.8% (moved) | 2.9% | 3.6% |

The finish pair moves sacks on every seed, into the bottom of the band (4.61 to 9.36). With the lean bound alone sacks are a little lower on all three, inside the interval each time, and the four together land below the finish pair alone; the bound takes some push off a leaning rusher as well as his falls. Rush yards a carry rose in the lean-bound arm on two seeds (one moved) on diverged games, with the paired run set unchanged. Nothing else agrees across seeds.

**The rating rolls** (Flex, `rep-rolls.mts`, 8 games on this stack, 6,506 move rolls): only 11% of sheds follow a won roll; 89% are bodies alone. About 92% of rolls are lost, and each lost roll scripts a stall, a blocker strike and a control swing, so that a move attempt gains the rusher less than not trying (edge 0.09 yd over 0.5 s after a lost roll, 0.46 after a won one, 0.12 with no move). A rated penalty on effort; the moves are being rebuilt as forces, bull first (`RUSH_BULL`, candidate).

## engine-59: `PASS_SET_SEEN`, `QB_BODY_SEEN`, `RUSH_PROMISE` and `WAIT_REACHED` on (2026-11-14)

The first removals under the owner's rule of 2026-11-13: every information cheat found is removed and given an honest replacement. The count of what remains is the leak sweep (`docs/reviews/2026-11-13-information-leak-sweep.md`, 60 active decision reads at engine-57) and, once it lands, the guard's allowlist (#699).

**`PASS_SET_SEEN`** (Flex, `2f45ebee`). The pre-contact pass set (set point, kick, mirror, cut-off, overset fear) and protection's assignment costs read the rusher's true position and velocity. They now read each blocker's own picture (`sim.see`). The lane's read, two seeds, off → on (NFL): edge pressure from in front of the tackle 10.3 / 10.1 → 2.6 / 3.8% of drop-backs (3.0); edge inside 4.7 / 4.6 → 8.1 / 6.5% (6.4); interior 4.9 / 6.1 → 8.6 / 8.5% (9.8); a rusher free 44 / 43 → 37 / 33% (38). The edge-in-front class was an oracle tackle sitting exactly on the rusher's path. Left: edge past-outside 0.4 to 0.5% (3.8), pressured 25 to 26% (32.9), contact given 2 yd 47 to 51% (35). The propped fall is not removed by it: 7 OL falls in 864 staged scenes on against 9 off, and games 3.5 / 4.3 against 4.0 / 3.7 per 100 drop-backs.

**`QB_BODY_SEEN`** (Rules+Coaching #692, `3c823989`). The quarterback's arm phase, head direction and carry posture are recorded on his body and read through perception; defenders no longer read the tick his motion began (`sim.windupAt`) or take his eyes from his hips. With it the pump bites as a real load does: defenders see the motion with their own delay, so about four times as many plant on a pump (1.0 against 0.26 a pump); each restarts 0.2 s after he sees the ball come down. Completion on pump plays 55 → 51% over four seed sets, within noise. A doubling of pooled post-catch pursuit turn on the `pursuit-commit` staged set was traced by both lanes to two long breakaways (3,384 of 5,017 off-arm ticks) that end in tackles with the head read on; without those two plays turn p50 is 29.6 / 30.6 / 28.8 °/s off / on / arm only, and `PURSUIT_COMMIT`'s gain holds at matched range. Open, not a gate: commit-on meeting-bearing jumps at 0 to 3 yd 19 → 32% (n 247).

**`RUSH_PROMISE`** (Defense #690, `088d8084`). `mike_a`, `will_b` and `nickel_edge` in Cover 3 promise five rushers, so fronts that would make them six (two underneath, no hook) send the call elsewhere; Penny's walked-up backer is counted as the rusher he is. Accidental six-rush Cover 3 installs 60 → 0. In games the removed calls are about 0.9 a game (1.0% of pass snaps), so no card movement is expected. A designed three-deep, two-under pressure is parked as `MAX_ZONE_6`.

**`WAIT_REACHED`** (Defense #704 + #708, `dae0ddb1`). A tackler waited for a better shot whenever his 0.3 s forecast put the best wrap at its last sample, every tick, so against a runner as fast as he is he never reached (the receding horizon; `man-trail-carry` s5 first wrapped at 3.55 s where 2.95 s was available). He now waits only for a wrap quality the forecast attains inside the lookahead. The first version judged it on distance and dropped fast closures that had a form tackle 0.1 to 0.3 s ahead (290 of 521 dropped waits); Rules+Coaching's review caught it and #708 judges it on the shot. Paired fresh run set, rule off vs on: +0.01 (SE 0.01), every family within ±0.03, 6% of plays change, missed + broken 0.305 vs 0.304. Opportunity to contact p50 0.20 → 0.15 s; keeps his feet 92.2 → 89.7%; first contact a miss 21/381 → 29/374, not distinguishable from noise at this n.

Merged off for the lanes to build on: the `track()` entry point (#691, `PERCEIVE_TRACK`; identical to `see()` when off) and the seen-contact record (#693). Note for #691: as merged, `track()` has only its latency and no line-of-sight or in-view test; Rules+Coaching found it and is fixing it in the entry point before any tracking group is turned on.

Checks. First candidate `5531e189`: eight fixture failures beside the two known research ones, each traced before landing: `punch-strike` ×3 and `rush-arm-balance` (scenes moved by `PASS_SET_SEEN`; isolating cases pin it off, and a real propped fall and a real dropped bull were re-found on this stack: Flex `9bf9c064`); `hot-look` ×2 (the 14-play panel sat on the 0.45 s alarm threshold and `PASS_SET_SEEN` took 12 of its alarms; the test now asks the hot decision directly, QB lane `e598e741`); `pursuit-commit` (premise, #704); `man-trail-carry` (the `WAIT_REACHED` defect above, a real one). Final tree `dae0ddb1`: full suite 4442 pass with only the two known research failures. Fresh run set 3.80 / 3.81; missed + broken 0.304 to 0.305 a run. Cards, 16 games a side.

`PASS_SET_SEEN` alone, then all three first flags (`out/e61-card-*`):

| seed | sack rate, set alone | sack rate, all three | yards an attempt, all three | completion, all three | INT, all three |
|---|---|---|---|---|---|
| 11 | 3.0 → 4.0% | 3.0 → 3.8% | 7.60 → 8.10 | 64.3 → 67.6% (moved) | 1.2 → 1.7% (moved) |
| 23 | 2.0 → 3.3% (moved) | 2.0 → 3.7% (moved) | 8.19 → 7.91 | 67.2 → 65.9% | 1.8 → 1.0% (moved) |
| 31 | 2.4 → 3.5% (moved) | 2.4 → 3.2% | 8.46 → 7.77 | 67.5 → 66.3% | 1.5 → 2.4% |

Sacks rise about a point on every seed with the pass set honest; nothing else agrees across seeds. `WAIT_REACHED` 0 → 1 on the final tree (`out/e63-card-*`): sack rate 3.8 → 3.9, 3.7 → 3.3, 3.2 → 3.5%; yards an attempt 8.10 → 7.81, 7.91 → 7.25 (moved), 7.77 → 7.48; rush yards a carry 3.96 → 4.32, 3.77 → 3.95, 3.98 → 4.14 on diverged games, against +0.01 paired.

**What the quarterback does not feel** (QB lane, seed 101 × 4, `PASS_SET_SEEN` off → on): alarmed drop-backs 3.4 → 2.4% while a defender within 1 yd with the ball in his hand goes 3.1 → 7.3% and sacks 0.8 → 3.0%. More of the pressure that arrives is pressure he does not see coming; `TRACK_FEEL` (#703) and the blind-side work are the follow-ups.

## engine-58: `PUNCH_STRIKE`, `ANCHOR_BASE` and `PURSUIT_COMMIT` on (2026-11-13)

**`PUNCH_STRIKE` and `ANCHOR_BASE`** (Flex, `claude/quirky-franklin-9lbwbp` at `cbed1224`). Pass protectors fell about 30 times per 100 drop-backs (NFL about 1 to 5 by the same fall proxy) from a propped lean: a blocker resting his weight on the rusher goes down when the rusher moves. engine-54's `PUNCH` made it worse: its standing `PRESS_INTO` drive doubled lineman falls, a mechanism regression that I landed without measuring falls. `PUNCH_STRIKE` makes the press a strike that is taken back; `ANCHOR_BASE` bounds the lean a protector commits to what his base can recover from (`Intent.leanCap = k m w0^2 critDev`, `k = 1.05 - 0.55 x technique`) and sinks him under a heavy press. Lane read, two seeds: OL falls 18.4 / 13.0 with `PUNCH_STRIKE` alone → 3.9 / 3.5 per 100 with both; by technique third, bottom 1.4% and top 0.7% of reps. Falls are reduced, not removed: `test/punch-strike.test.ts` now carries a native play on this stack (roster 3, four verts vs Cover 2, seed 3) where a poor technician leans to 0.89 of the press and goes down when his man rips through.

**`PURSUIT_COMMIT`** (Defense #666, `c32f9d20`): a pursuer keeps a chosen meeting point until the picture changes by a margin. My earlier cards (`out/e57-*`) showed rush yards a carry up on two of three seeds; Defense's paired read on the fresh run set is +0.00 (SE 0.05), missed + broken 0.306 → 0.307 a run, and at close-range cuts 289 vs 285 tackles. After-catch record (16 games, not paired): YAC mean 6.76 → 6.98, open catches 5.6 → 7.0% (about 1.3 SE). It steadies the request; it does not change who is in front of a wide catch.

Checks. Candidate `bd94a26d`: full suite 4419 pass; four new failures beside the two known research ones, all fixtures moved by the new defaults and fixed before landing: `test/punch-strike.test.ts` (two cases now pin `ANCHOR_BASE` and `PURSUIT_COMMIT` off to isolate the strike; Flex `6677e9e1`) and `test/hot-look.test.ts` (`PUNCH_STRIKE` takes alarmed snaps from 8 to 5 of the old nine because the rush no longer arrives before the throw on four of them; re-surveyed to a 14-play panel, QB lane `44b169db`). Fresh run set 3.80 (3.81; placebo +0.02 ± 0.09): no run effect. Cards, 16 games a side, five arms (`out/e60-card-*`); reference → all three on:

| seed | sack rate | yards an attempt | completion | 20+ yd completions | YAC | rush yards a carry | missed + broken a play | points a team-game |
|---|---|---|---|---|---|---|---|---|
| 11 | 3.0 → 3.0% | 8.26 → 7.60 | 66.3 → 64.3% | 11.0 → 9.7% | 6.83 → 6.39 | 4.59 → 4.37 | 0.21 → 0.21 | 28.3 → 28.5 |
| 23 | 3.0 → 2.0% (moved) | 7.60 → 8.19 | 67.5 → 67.2% | 9.6 → 10.3% | 6.45 → 6.55 | 3.89 → 3.71 | 0.22 → 0.23 | 26.2 → 30.8 |
| 31 | 2.4 → 2.4% | 7.75 → 8.46 | 66.0 → 67.5% | 9.9 → 12.8% (moved) | 6.53 → 7.34 | 3.89 → 3.61 | 0.22 → 0.22 | 26.3 → 27.7 |

Nothing agrees across the seeds. The sack move on seed 23 is in the combined arm only (strike alone 2.4%, strike + anchor 2.9%, pursuit alone 3.3%). Sacks stay near 3% against 4.61 to 9.36.

**Where the sacks are** (Flex, `scripts/diag/pass-operators/pass-rep-report.py` and `finish.py`, same code on BDB 2025 and ours). A rusher within 2 yd before the ball is out: NFL 27.6%, ours 25 to 27.5%. Contact given 2 yd: 35% vs 25 to 37%. Sacked given contact: 53% vs 14 to 26%. After first contact the NFL quarterback is sacked 47%, throws 30% (0.3 s later), escapes 22%; ours 22 to 24 / 64 to 72 (0.05 to 0.10 s later) / 6 to 14. 93% of our post-contact throws were already in the windup, which nothing can interrupt; not yet in the windup he is sacked 69%. The repair is contact acting on the throw (Flex) and what he chooses when the hit is coming (QB lane).

**Inferred come-off counts are a partial sample.** Scored against PFF's `pressureAllowedAsBlocker` on BDB 2025, "came off his own blocker and reached 2 yd" has recall 24% and precision 70%; the rusher operator against `wasInitialPassRusher` has recall 79%, precision 97%. Every come-off count compared with the NFL in the engine-54 to engine-56 sections, and the statement that come-offs were on the NFL's count and timing after `ANCHOR_BASE`, is a lower-bound sample, not a rate.

Also merged: Tools #685 (the BDB 2027 archive fetches from the registered Drive copy) and the sim-export fumble and change-of-possession events (`claude/sim-export-ball-security` `8f5b14b3`).

## engine-57: `CARRY_READ` on: the man corner stays on top of a vertical (2026-11-13)

**`CARRY_READ`** (Coverage #676, `56b6da06`; built in Defense's `CUSHION_BREAK` code). A man corner carrying a vertical route sat on the receiver's hip instead of on top of him. The lane's read, off → on (NFL): corner on top of a vertical 17 to 25 → 27 to 40% (54); the hitch still completes at 3.5 yd of cushion and 71% caught (3.2 yd, 68%); completion on medium flights 67 → 61% (58). It closes about a third of the on-top gap and is a stand-in for the corner's read of the stem; that debt stays with Coverage.

Checks. Candidate `2e66174d`: full suite 4412 pass with only the two known research failures. Fresh run set 3.81 (3.80, placebo ± 0.03): no run effect. Cards, 16 games a side, `CARRY_READ` 0 → 1:

| seed | completion | 20+ yd completions an attempt | aDOT | INT | YAC | sack rate | points a team-game |
|---|---|---|---|---|---|---|---|
| 11 | 65.4 → 66.3% | 11.2 → 11.0% | 5.78 → 5.97 | 1.6 → 1.4% | 6.85 → 6.83 | 3.1 → 3.0% | 28.8 → 28.3 |
| 23 | 66.7 → 67.5% | 10.4 → 9.6% | 5.81 → 5.35 (moved) | 1.9 → 2.1% | 6.30 → 6.45 | 3.0 → 3.0% | 24.8 → 26.2 |
| 31 | 66.0 → 66.0% | 10.1 → 9.9% | 5.29 → 5.61 (moved) | 1.4 → 1.6% | 6.72 → 6.53 | 2.8 → 2.4% | 24.8 → 26.3 |

Nothing moves at the game level (the two aDOT moves disagree in sign); 20+ yd completions fall on all three seeds, inside the interval each time. It lands on the corner's position, not on a game number.

**Held beside it: `ACC_RADIUS` and `BACK_CHECKDOWN`** (rules/qb-gather, #669). Carded with `CARRY_READ` as a set of three (`out/e58-*`): points 25 to 29 → 35 to 38 a team-game, aDOT 5.8 → 11.2, 9.2 to 9.7 yards an attempt, 20+ yd completions 14 to 16%. Rules+Coaching's deep-window read on that tree (370 deep targets, BDB 2025 GO + POST) says why: separation at the throw matches the NFL (p50 1.90 vs 1.80 yd), but completion is flat near 50% across separation (NFL 29% under 1 yd → 52% at 5+), interceptions under 2 yd are 0 to 1% (4 to 5%), and completion does not fall with flight time (NFL halves past 1.8 s). A covered deep ball costs nothing, so a quarterback who throws deep more prints points. The two flags wait on the catch point of a covered ball (Coverage). On that tree `acc-radius` fails because `CARRY_READ` holds a seam a beat longer (re-record its ceiling when `ACC_RADIUS` is carded) and `hot-look` "off" moves with `ACC_RADIUS`.

**`PURSUIT_COMMIT` cleared for the next engine** (Defense #666). My cards (`out/e57-*`) showed rush yards a carry up on two of three seeds; on the fresh run set, paired, it is +0.00 (SE 0.05) with missed + broken 0.306 → 0.307 a run, and at close-range cuts 289 vs 285 tackles with 1 vs 0 missed. The card rise was diverged games, not the mechanism.

## engine-56: `PASS_RIDE` on: the block becomes a ride (2026-11-13)

**`PASS_RIDE`** (Flex, branch head `8a945396` + the World clone fix `61812f1f`). A ride already existed for every blocker within reach; its request was the defect: the man's velocity less 1 yd/s toward the quarterback, facing him, so the blocker fell behind by design (guards rode at 1.9 yd/s against a rusher's 3.4 and the rep ended 3 yd from the quarterback). Now one rule for every pass blocker: once the man has won his hip the blocker runs with him on his quarterback side, hips open, matching his velocity and pushing through the hands, and stays riding until the man is clearly back in front (a margin on stop and ride). The rep still ends beyond his arm, so keeping up is the body's; a grip from behind is the holding detector's. The tackles' ride is the same path and changes too (1.3 → 1.8 yd/s; guards 1.9 → 2.9).

The lane's reads on the hands set, two seeds, off → on (NFL): interior rushers engaged then free 3.6 / 3.1 → 2.4 / 2.7% of drop-backs (2.2); time free before the pressure 0.4 → 0.2 to 0.3 s (0.1); interior free at pressure 73 / 59 → 53 / 57% (46); pressure from in front of the tackle 40 / 37 → 34 / 34% of pressures (9). It does not repair the pass rush: sacks stay near 3% (NFL 4.61 to 9.36). The lane's NFL comparison shows why: ridden rushers' speed and path already match, but NFL pairs close to the body (0.73 yd against our 0.81) and 26% of rushers who come off a ride then reach the quarterback against our 53%; in ours the bodies never touch (torso contact on 0% of ridden ticks) because the hands joint is a strut of full arm's length. `HAND_SITE` (the joint's working length following where the hand is on the man) is building. In the tree, off: `RUSH_HANDS` (hand state, club and long-arm as forces on the hand, the rusher's keys, two hands, move recovery; sacks into the band but interior pressure about 1.6 times the NFL's) and its `RUSH_ONE_HAND` attempt on the branch.

Checks. Candidate `fa93a2ac`: full suite 4405 pass, with three new failures in `test/research/continued-recovery-world.test.ts` beside its two known ones (`RUSH_HANDS` had put a WeakMap on the World, which broke cloning a World; fixed in `61812f1f` with a clone test). Final tree: full suite 4409 pass with only the two known research failures. Fixed run set 3.60 (3.59). Cards, 16 games a side, 0 → 1 (seeds 23 and 31 re-run after a container restart):

| seed | sack rate | yards an attempt | completion | YAC | rush yards a carry | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 2.7 → 3.1% | 7.91 → 7.98 | 65.8 → 65.4% | 6.80 → 6.85 | 4.37 → 4.16 | 28.6 → 28.8 |
| 23 | 3.0 → 3.0% | 7.83 → 7.79 | 65.2 → 66.7% | 6.82 → 6.30 | 4.02 → 3.55 | 27.9 → 24.8 |
| 31 | 2.6 → 2.8% | 8.29 → 7.49 (moved) | 66.3 → 66.0% | 7.27 → 6.72 | 4.25 → 4.18 | 26.2 → 24.8 |

Nothing agrees across the seeds at the game level; it lands on the interior rows.

**The fixed run set is a used benchmark** (Defense #677, merged here: `ref:report --placebo N`, `--placebo-size`, `--set fresh`, and `runSetFresh` in the stack file). A placebo arm that nudges one body by 0.05 yd and changes no mechanism diverges 77 to 95% of plays, as a real change does, and on the fixed set loses 0.10 ± 0.11 yd a run (inside zone 0.14 ± 0.15); on a fresh set captured from engine-55 with new seeds the bias is 0.00 ± 0.03. The default engine is the survivor of many promotions read on those plays, so its yards there are partly luck that any divergence regresses. Read run-set deltas for changes that diverge most plays against the placebo mean and spread, not zero; the engine averages 3.80 on the fresh set against 3.59 on the old. The hands set's run cost quoted under engine-54 (3.86 → 3.59) is about 1.5 spreads past the bias and is being re-read on the fresh set. `SPACING_SMOOTH` (parked): all runs −0.22, not distinguishable; inside zone −0.68, real on the old set, being re-read on the fresh one.

## engine-55: `CURL_FLAT_BACK` on: the curl-flat defender widens to a back in his flat (2026-11-13)

**`CURL_FLAT_BACK`** (Coverage #667). The curl-flat defender's expansion to the flat existed only for No. 2 and was switched off when a back released fast to his side, so he played the threat nearest his curl landmark and a back in the flat lost to a curl every time (on 42 of 44 wide catches with nobody in front he was present, about 10 yd inside the catcher). Now he sinks to his curl window and widens toward a back in his flat by what the quarterback shows him (his seen eyes, with his delay): most when the eyes are on the flat, hanging when they are on a receiver in his curl window, moderately once the back has crossed his face; a back already settled wide counts as well as one still releasing. He breaks on the throw. The widening weights are estimates and recorded as stand-in debt. A first version that ran to the back as he showed, and one that widened by a fixed fraction, were dropped: the second opened the throw behind him (80% against the NFL's 69%).

The lane's reads, paired on one tree (NFL): the back's wide-flat YAC a catch, median 13.0 → 6.8 and 11.2 → 8.4 across two runs (5.0); completion on throws behind him 68 → 66% and 72 → 64% (69). **Not this rule's, and recorded as open:** wide back catches with nobody in front stay at 42 to 48% (12) after three looks; they are the calls with no curl-flat player to that side (the Cover 2 family, stubbie, book: the corner beaten to the edge or the flat defender sinking under No. 1) and late check-downs thrown 0.8 s after the NFL's.

Checks on the candidate (`9a6b3d2b`): full suite 4394 pass with only the two known research failures; fixed run set 3.59, unchanged. Cards, 16 games a side, 0 → 1:

| seed | yards an attempt | completion | INT | YAC | sack rate | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 8.06 → 7.91 | 67.1 → 65.8% | 1.6 → 1.6% | 6.40 → 6.80 | 2.5 → 2.7% | 29.4 → 28.6 |
| 23 | 7.78 → 7.83 | 66.9 → 65.2% | 1.6 → 2.3% | 6.32 → 6.82 | 2.4 → 3.0% | 28.0 → 27.9 |
| 31 | 8.29 → 8.29 | 64.5 → 66.3% | 1.4 → 1.4% | 7.58 → 7.27 | 2.4 → 2.6% | 30.0 → 26.2 |

Nothing moved outside its range. It lands as the coached rule; the whole-game YAC does not see it because the back's flat with this defender present is a small share of catches.

**With it:** Defense's findings record (#673, docs and diagnostic scripts only): pursuit lead, arrival speed and the finish match the NFL in aggregate; safety lead is role; the corners' within-role lead trait tracks nothing measurable; acceleration and redirect are not player traits in our motion; the tackling rating slows the approach with no NFL support (left as is, parked); the run-specific grip frame for `OPEN_HANDS`.

**Not landed: the commitment candidate** (`PURSUIT_COMMIT`, `CARRIER_COMMIT`, `SPACING_SMOOTH`, `PURSUIT_SPACING_SMOOTH`; `b7f14572`, kept as `held/e55-commit`). Three fixtures that pass on develop failed with the four on. `tackle-set` and `hold-facing` fail only with `SPACING_SMOOTH` on, and by scene divergence, not through the mechanisms they test (corrected 2026-11-13; an earlier version of this note blamed the flag for reaching engaged bodies, which Defense's tick trace refuted). In `tackle-set` the tackle's own decision honours his floor in both arms; the depth read after spacing is the long-standing teammate limit when his guard is driven back into him, at full gate weight, in a scene the off arm never produces. Exempting engaged bodies from spacing was tried and set aside: it exposed the set controller asking outward past its own set line, which spacing had been hiding (logged as PRO-7 and PRO-8). In `hold-facing` the reproducer's back makes a different cut and a different tackle makes the hold. Flex restates `tackle-set` on the decided command and re-pins `hold-facing`. `PURSUIT_COMMIT` re-measured on engine-54 still acts: paired on its test's 16 fixed passes the pursuer's request heading turns 13.2 → 8.4°/s, and the test asserts that (corrected 2026-11-13: the dither-guard figure first cited here, 0.369 → 0.288, was 35 against 37 events over more moving time, about one standard error, and is not claimed). Cards on two seeds agreed on nothing for any of the four; fixed run set 3.59 → 3.48 with all four on, unattributed.

## engine-54: the blocker's hands (`PAST_ALONG_PATH`, `OPEN_HANDS`, `PUNCH`), landed with a stated cost (2026-11-13)

**The set** (Flex #520 at `a1e611ce`). `PAST_ALONG_PATH`: a rusher has beaten his blocker when he is past him along his own path and the blocker is no longer between him and where he is going, in place of a fixed line. `OPEN_HANDS`: open hands, a legal inside grip and a hold are different contacts with different limits. `PUNCH`: a blocker's hands work to where he feels the man and extend to lockout; with it the quarterback's `BLOCK_SEEN` contact read measures the blocker's arm from the body surfaces, so a locked-out block no longer reads as a free rusher (`ba4b9866`). Everything else on that branch is in the tree off (`RUSH_INTENT`, `TACKLE_SET`, `TACKLE_BRAKE`, `TACKLE_RESET`, `TACKLE_ANCHOR`, `EDGE_ARC`, `EXTEND`, `HANG_GRIP`, `HOLD_CALL`). `dropSpec` moves to `src/sim/called-drop.ts`; `PA_DROP` is read there as well.

**What it costs, and why it lands anyway.** Held at engine-52 because the sack rate fell on four of four seeds against the lane's first read, which had compared a different engine and seeds with the NFL and had no off arm. The lane's reconcile on the candidate agrees with the cards: pressure 36 → 31% of drop-backs (its operator) and later (by 2.5 s 16.4 → 13.1%), conversion per pressure unchanged at 12 to 13%. Leave-one-out: `PUNCH` takes about 4.5 points of pressure; in the rep the rusher makes the same moves at the same success (15% edge, 17% interior) and is held 0.2 to 0.4 yd farther off by an arm at lockout. `PAST_ALONG_PATH` takes about a point of sacks at about two standard errors, not localised to a class (rushers who reach the hip finish at 8.1 / 4.3% against the NFL's 9.0%); `OPEN_HANDS` adds about 0.6. The hands are inside physics. What is missing is the rusher's answer to an extended arm: move success is still a rating roll with no term for the blocker's extension (a recorded model-rule breach). The rule is to repair the missing mechanism, not to hold back the technique, so the set is on and the rush is the debt: `RUSH_HANDS` (Flex, building: moves as forces on a one-degree-of-freedom hand, fit continuous in extension, swipe/club and long-arm first), then the untouched tackle's stop and inside help.

**Until `RUSH_HANDS` lands, every pass-game measurement is taken behind a pass rush at about half the NFL's sack rate.** Lanes should read time to throw, scrambles and completion with that in mind.

Checks. On the first candidate (`7e207f9b`, develop engine-51): full suite clean but for `test/hot-look.test.ts`, whose engine-45 panel of alarmed rushes no longer alarmed (4 of 11); Rules + Coaching re-surveyed the panel on the set (#665, 9 of 96 plays) and verified the alarm itself is unchanged (it fires whenever his pressure read says so; rushers close without alarm 5 against 7). On the stacked candidate (`1855940c`, engine-53 tree + the set): full suite 4388 pass with the two known research failures and the `catch-choice` fixture restated in engine-53; fixed run set 3.86 → 3.59 a carry. On the final tree: typecheck, registry tests, `hot-look` and `catch-choice` pass. Set cards, 16 games a side, the three flags 0 → 1 together:

| tree, seed | sack rate | completion | yards an attempt | rush yards a carry | YAC | points a team-game |
|---|---|---|---|---|---|---|
| engine-51, 11 | 4.9 → 3.8% | 65.1 → 67.3% | 8.76 → 9.10 | 4.47 → 4.17 | 7.32 → 7.13 | 30.1 → 34.0 |
| engine-51, 23 | 4.5 → 3.8% | 62.5 → 66.2% (moved) | 8.38 → 8.20 | 4.05 → 3.98 | 6.67 → 6.36 | 30.6 → 29.7 |
| engine-51, 31 | 4.0 → 3.0% (moved) | 63.3 → 63.0% | 8.15 → 8.66 | 4.38 → 3.74 (moved) | 6.69 → 7.31 | 27.4 → 28.4 |
| engine-51, 47 | 3.4 → 2.5% | 65.0 → 67.3% | 8.87 → 8.73 | 4.42 → 4.29 | 7.04 → 6.59 | 30.5 → 31.8 |
| engine-53, 11 | 3.4 → 2.5% | 63.9 → 67.1% (moved) | 7.81 → 8.06 | 4.41 → 3.81 (moved) | 7.17 → 6.40 | 26.6 → 29.4 |
| engine-53, 23 | 4.6 → 2.4% (moved) | 66.0 → 66.9% | 7.85 → 7.78 | 4.04 → 3.77 | 6.86 → 6.32 | 26.2 → 28.0 |

Per flag on engine-51 (others on, seeds 11 / 23): `PAST_ALONG_PATH` completion +4.8 / +3.2 (both moved), sacks −0.5 / +0.8; `OPEN_HANDS` completion +4.0 / +4.1 (both moved), scrambles 1.8 → 3.1% (moved, seed 11); `PUNCH` sacks −0.3 / −0.3. Where the engine stands: sacks about 2.5% (NFL 4.61 to 9.36), yards an attempt 7.8 to 8.1, completion 67%, fixed run set 3.59.

## engine-53: `BACK_PATHS` on: the back's routes drawn and paced from tracking (2026-11-13)

**`BACK_PATHS`** (Rules + Coaching #661). The back's release paths redrawn from route-labelled tracking, and a route can carry a pace (`RouteDef.pace`, a fraction of top speed between its points, still adjusted by his route running); only the back's flat uses it, at 0.55. The flat is coached as run under control and timed to the drop. Before, the back was at the right depth but widened at about 6 yd/s against the NFL back's steady 4.2. Checked at equal time after the snap against NFL `routeRan` FLAT (n 916): within 0.4 yd in depth and 1 yd in width through 3.0 s; the ball arrives 12.1 yd from the sideline (11.7). An earlier version of this claim used a proxy that selected on width and was withdrawn by the lane.

Checks on the candidate (`5ea96305`): full suite 4364 pass apart from the two known research failures and `test/catch-choice.test.ts`, which Coverage restated: on 4 of its 8 forced go balls the quarterback now pulls the ball down and checks to the back, and the fixture counted the first thrown receiver. It is now a paired panel (four verticals against four shells, 16 seeds, only balls that go to the forced go, each play against itself across arms); the mechanism holds on both stacks (11 pairs, 7 choosing later, all 7 faster). Fixed run set 3.86 a carry. Cards, 16 games a side, 0 → 1:

| seed | yards an attempt | aDOT | time to throw | completion | INT | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 8.74 → 7.81 (moved) | 6.53 → 5.65 (moved) | 2.76 → 2.71 (moved) | 63.2 → 63.9% | 1.8 → 1.8% | 30.4 → 26.6 (moved) |
| 23 | 8.32 → 7.85 | 6.85 → 5.59 (moved) | 2.80 → 2.71 (moved) | 64.9 → 66.0% | 1.8 → 2.2% | 27.7 → 26.2 |
| 31 | 8.13 → 7.90 | 6.66 → 5.49 (moved) | 2.79 → 2.73 (moved) | 64.0 → 66.3% | 0.8 → 2.6% (moved) | 28.6 → 30.0 |

Yards an attempt fall on all three seeds to the top of the NFL's band. aDOT falls a yard, further under the NFL's: the back's flat is caught behind the line as the NFL's is, and it is 18% of our targets against the NFL's 7.9% (backs take 32% of targets against 20%). That share is the read compiler placing a check-release back third in the progression (#669, `BACK_CHECKDOWN`, drafted; it waits on the deep-window belief re-read because it turns check-downs into scrambles). The interception rise on seed 31 is from an off arm of 0.8%.

## engine-52: `SAFETY_DEPTH` on: deep safeties stay over the top (2026-11-13)

**`SAFETY_DEPTH`** (Coverage #663). Two halves of one coached rule, "deeper than the deepest". First, a deep or quarter-field zone landmark is never shallower than the safety's alignment: a quarter of our safeties were installed with a landmark 1.3 to 1.5 yd under where they lined up and walked down to it in the first second (91 to 95% of the safeties who came downhill had one; 1 to 2% of the rest did; none believed run). Second, the landmark is a floor, not a stop: he stays deeper than the deepest route he sees in his band by a cushion taken from the NFL medians (scaled by his speed and play recognition; the scaling is an estimate and recorded as stand-in debt), a route that stops climbing no longer pulls him deeper, and facing the quarterback he asks for no more than his own pedal before opening to run. Calls that send a safety down (robber, buzz, invert) are unchanged.

The lane's measurement, same operator on NFL tracking and ours, off → on (NFL): stepping downhill in the first second 22 → 10% (12), Cover 4 30 → 5% (6); depth at the throw 15.8 → 17.6 yd (18.3); depth over the deepest route 6.2 → 8.4 (8.5); Cover 2 / 3 / 4 depth 17.0 / 15.6 / 13.9 → 18.9 / 17.4 / 16.4 (20.4 / 18.0 / 16.5). Not moved, and recorded as the outside defenders' item: 20+ yd catches with nobody deeper 40 → 36% (15).

Checks on the candidate (`38412c98`): full suite 4364 pass with only the two known research failures; fixed run set 3.87 a carry (3.84). Cards, 16 games a side, 0 → 1:

| seed | yards an attempt | completion | INT | 20+ completions an attempt | YAC | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 8.76 → 8.74 | 65.1 → 63.2% | 1.7 → 1.8% | 12.7 → 12.4% | 7.32 → 7.66 | 30.1 → 30.4 |
| 23 | 8.38 → 8.32 | 62.5 → 64.9% | 2.4 → 1.8% | 11.4 → 11.0% | 6.67 → 6.26 | 30.6 → 27.7 |
| 31 | 8.15 → 8.13 | 63.3 → 64.0% | 1.0 → 0.8% | 11.4 → 10.5% | 6.69 → 6.51 | 27.4 → 28.6 |

Nothing moved outside its range on any seed. It lands as the safety playing his rule; the scoreboard does not see it because the deep ball was not where the excess yards are.

**Held out: Flex's edge set** (`PAST_ALONG_PATH` + `OPEN_HANDS` + `PUNCH`, candidate `7e207f9b`, kept as `held/e52-setA`). Carded together 0 → 1 on four seeds, the sack rate fell on every one: 4.9 → 3.8, 4.5 → 3.8, 4.0 → 3.0, 3.4 → 2.5% (pooled 4.2 → 3.3; NFL band 4.61 to 9.36), completion +2 to +4 points on three, fixed run set 3.84 → 3.62. The lane's earlier "the set lands on the NFL's sacks" compared a different engine and seeds with the NFL and had no off arm; its reconcile on the candidate agrees with the cards: pressures fall 36 → 31% and come later, conversion per pressure unchanged at 12 to 13%, the loss mostly interior and inside-edge pressures. Held until the lane attributes the fall by flag and says whether it is an honest consequence of better hands or a defect.

## engine-51: play action as a call (`PA_DROP`, `PA_CALL`); `DROP_BELIEF` released (2026-11-13)

**`PA_DROP`** (Rules + Coaching #656). The play-action drop by alignment, depth against time taken from tracking the way the ordinary drops were, in place of one shared fake-then-drop. Read in `qb.ts` and `assign.ts`.

**`PA_CALL`** (Rules + Coaching #660). Play action is a tag the caller puts on a pass at the NFL's situational rates rather than a rare standalone call: it was 4% of our drop-backs against 25.4%. The lane measured the tag's premium in range before it was called more often (gun +2.0 yd against the NFL's +1.5, under center +2.4 against +2.25) and stated its cost up front: about +0.3 to +0.6 yards a play on an engine already high in yards an attempt. It lands because the call is the sport's and the premium is the NFL's size; the excess it adds to is the zone YAC and target-distribution gap, which is not this flag's. Open and recorded in GAPS: the line still pass-sets its feet under the fake (52% of backside ends read pass by 0.3 s), the protections are not yet typed (boot and naked stay parked), and the defense does not yet respond to a caller's tendencies.

**`DROP_BELIEF`** (Rules + Coaching #651, held at engine-50). Released: over the lane's eight seeds the interception rise that held it was noise. Lesson kept: at 16 games the interception rate swings more than a point between unpaired games, so a hold on it needs eight seeds or a paired panel.

**With them:** the fumble beyond the plane (#657; a carrier in bounds by his support who loses the ball outside the boundary plane no longer aborts the game), and the belief tables' call-type fallback removed (Defense, `defense/C9-belief-no-calltype`).

Checks on the candidate (`a89fced4`): full suite 4358 pass with only the two known research failures; fixed run set 3.84 a carry, unchanged. Cards, 16 games a side, each flag 0 → 1 with the others on:

| flag, seed | yards an attempt | completion | INT | 20+ completions an attempt | time to throw | points a team-game |
|---|---|---|---|---|---|---|
| `PA_CALL`, 11 | 8.31 → 8.76 | 65.1 → 65.1% | 1.2 → 1.7% | 10.5 → 12.7% (moved) | 2.72 → 2.77 (moved) | 28.2 → 30.1 |
| `PA_CALL`, 23 | 8.22 → 8.38 | 67.1 → 62.5% (moved) | 1.9 → 2.4% | 10.7 → 11.4% | 2.77 → 2.77 | 29.8 → 30.6 |
| `PA_DROP`, 11 | 8.73 → 8.76 | 63.8 → 65.1% | 1.9 → 1.7% | 11.1 → 12.7% | 2.87 → 2.77 (moved) | 31.6 → 30.1 |
| `PA_DROP`, 23 | 7.63 → 8.38 (moved) | 63.9 → 62.5% | 2.1 → 2.4% | 9.6 → 11.4% | 2.86 → 2.77 (moved) | 27.7 → 30.6 |
| `DROP_BELIEF`, 11 | 8.40 → 8.76 | 65.1 → 65.1% | 2.1 → 1.7% | 10.3 → 12.7% (moved) | 2.75 → 2.77 | 33.3 → 30.1 |
| `DROP_BELIEF`, 23 | 8.73 → 8.38 | 64.9 → 62.5% | 1.8 → 2.4% | 13.1 → 11.4% (moved) | 2.76 → 2.77 | 31.6 → 30.6 |

`PA_CALL` reads as stated: +0.2 to +0.5 yards an attempt, more deep completions, and fewer plays a game. `PA_DROP` shortens the time to throw by 0.1 s on both seeds (with `PA_CALL` on, a quarter of drop-backs take it). `DROP_BELIEF` agrees on nothing between seeds. Where the engine stands after it: yards an attempt 8.4–8.8 (NFL 6.35–7.89), YAC 6.7–7.3 (4.53–5.91), completion 62.5–65.1%, sacks 4.5–4.9%, interceptions 1.7–2.4%, points 30.

## engine-50: `SHOULDER_READ` on as the underneath plant; the dither guard (2026-11-12)

**`SHOULDER_READ`** (Coverage #652; the flag's earlier eyes lean is replaced, with Defense's agreement). An underneath zone defender keyed the quarterback's windup correctly (facing him 86–97% of the time, his reaction about 0.18 s) but `sawThrow` could not act until the ball was in the air, so the cue was ready about 0.2 s before the release and thrown away; at the release about half of these defenders were still dropping, and the 0.25–0.35 s to their break was the time to stop and reverse. Now, when his read of the windup matures, his drop stops (no velocity away from the line) while his lateral and downhill zone play continue. A first attempt, a full stop squared to the quarterback, cancelled his movement toward threats and was reverted. Coverage, seeds 11 / 23: hook break p50 0.50 → 0.35–0.40 s, curl / flat 0.40 → 0.30–0.35 s; breaking at the release 10–13 → 10–16%; wrong plants per pump 0.07–0.12; no added re-aiming. It does not close the NFL gap (32–41% breaking at the release), which is direction before the release: NFL underneath defenders facing the quarterback close on the eventual catcher over the last 0.5 s even when he has not broken (+1.10 yd/s; ours +0.11), starting before a windup could be read, and our quarterback's eyes reach his target only with his motion (on him 20% at −0.5 s, 83% at −0.3 s). That is a quarterback item (Rules + Coaching). Parked from the same work: `WINDUP_READ` (reading the direction of the windup; first read on the right receiver 20–27%, two attempts) and an earlier head-turn cue for trailing man defenders (not supported: the NFL trailer's closing begins no earlier than ours).

**The dither guard** (Defense #653): `test/dither-budget.test.ts`, 135 fixed plays, reversed re-aims over 20° a second by controller and by post-decision stage against a budget of the recorded value × 1.10 plus a statistical slack, ratcheted down by any change that lowers it; and the model rule "commit to a decision" in CLAUDE.md. It measures requests, never outcomes. Recorded on engine-49.

**Held out: `DROP_BELIEF`** (Rules + Coaching #651; his believed drop rate 0.05 → the observed 0.08). In the tree, off. Cards 0 → 1: seed 11 points 25.4 → 29.0 (moved), INT 1.6 → 2.4% (moved); seed 23 completion 65.7 → 62.9% (moved), INT 1.9 → 1.5%. With the lane's four seeds the interception rate rises on five of six (pooled about +0.6 points, p ≈ 0.06) while the paired panel is flat; the extra picks are on intermediate throws that cleared his bar. Not explained, so not landed.

Checks on the candidate (`19ec65f6`, both flags on): full suite 4349 pass with only the two known research failures. On the final tree (`DROP_BELIEF` off, the guard merged): core suite 4085 of 4085; a first run of it showed three 60 s timeouts under machine load, which passed alone and did not recur. Fixed run set unchanged (3.84). Paired league scorecards for `SHOULDER_READ`, 16 games an arm:

| seed | yards an attempt | completion | sack rate | YAC | points a team-game |
|---|---|---|---|---|---|
| 11 | 8.29 → 8.65 | 64.0 → 64.8% | 4.6 → 5.8% (moved) | 6.92 → 7.01 | 27.3 → 29.0 |
| 23 | 8.42 → 8.17 | 65.3 → 62.9% | 6.0 → 4.5% | 6.62 → 7.00 | 26.8 → 28.3 |

Nothing agrees between the seeds; it lands as the use of a cue he already had.

Found by these cards: a scorecard with `FREE_BOUND` on aborted on "Loose-ball boundary contact lacks its actual outward crossing" (a carrier in bounds by his support holding the ball beyond the plane, fumbling; fixed by Rules + Coaching in #657, next tree). On the seed that completed, `FREE_BOUND` still takes sacks 5.8 → 3.0%; held.

## engine-49: `PURSUIT_FIELD` on, a pursuer of a seen carrier is not held in the field; `IN_STRIDE_CATCH` retired (2026-11-12)

**`PURSUIT_FIELD`** (Defense #649). Coverage behaviours call `pursueIfLive` themselves, so a zone or man defender chasing a ball carrier kept his coverage kind and his pursuit request went through `containCoverage`, the rule that keeps a coverage drop in the field. It zeroed his velocity toward the sideline whenever he could not stop before it on half his lateral traction (5–8 yd from the line at pursuit speed), his lateral speed decayed, the check passed, the request returned, and it repeated. Traced on short zone catches with the nearest underneath defender 4+ yd away: about half of all pursuit re-aims over 20° were containment's output exactly (331 of 331 on one seed), 60–67% of re-aims were undone within 0.3 s, and only 14–16% followed a new cue. Now a chase of a seen holder, and `CATCH_CARRY`'s drive on the catcher, are left alone; a drop is still contained. Defense, 2 × 16 games: re-aims 2.3 → 1.1–1.3 a second, undone within 0.3 s 59–65 → 37–43%, containment's share 45–55 → 0–5%; first defender within 1 yd by +2.0 s 36 → 41% (NFL 69); YAC in that population 11.33 → 10.16. On runs it rarely applies (a pursuer was contained on 2.0% of fixed-set runs).

Not repaired by it, recorded: the first defender still runs at the catcher (24 → 26° off the line to him; NFL 32–47° and leading), and the remaining re-aims come from contact technique (dive / lunge, 34–42%) and mode switches around close-gather (33–36%). The engine-wide audit behind this (63% of re-aims are the decision itself, spacing 14% of re-aims and 22% of reversed ones, containment 3% and 8%; 14–27% follow a new cue) set a model rule, "commit to a decision", and a suite guard on reversed re-aims (#653, next tree).

**`IN_STRIDE_CATCH` retired** (Coverage #647): superseded by `CATCH_CHOICE`. Its code path, test, FLAGS row and both config entries are removed; the retirement first failed `baseline-runner` because the baseline profile still listed the flag, corrected here.

Checks on the candidate (`10781b12`): full suite 4347 pass with only the two known research failures. Fixed run set 3.86 → 3.84. Paired league scorecards, 16 games an arm:

| seed | YAC | yards an attempt | completion | INT rate | rush yards a carry | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 6.92 → 6.67 | 8.20 → 8.52 | 63.3 → 65.2% | 2.0 → 1.5% | 4.77 → 4.42 | 31.8 → 29.0 |
| 23 | 6.81 → 6.21 | 8.13 → 8.09 | 63.5 → 66.0% | 1.4 → 2.3% (moved) | 4.23 → 4.20 | 26.7 → 29.2 |

YAC falls on both seeds (neither resolved); the interception move on seed 23 is opposite in sign to seed 11. It lands as the repair of a rule applied to the wrong task.

## engine-48: `INT_BELIEF` on, his interception risk combines as a probability and weighs the catch point (2026-11-12)

Rules + Coaching #644, calibrated on the engine-47 flags. His interception belief had the right total and a compressed ranking: on 2,639 natural league throws, throws he rated under 0.5% were picked 0.88% of the time and those over 5%, 3.83%. Two causes. His path term summed every nearby defender's risk (capped only at 1), so it exploded in the tail; and his catch-point terms expected about 13 picks where 32 happened (58% of picks are at the catch point). Now defenders combine as 1 − Π(1 − p), the path term is weighted 0.2 (an in-flight touch that ends in a pick a fraction of the time) and the catch-point term 1.75, fitted on seeds 101 / 201 and checked on 301 / 401 (the halves disagree on the level, 15 against 31 picks, and agree that the catch point is worth 7–9 times the path); scaled by his knowledge with two-sided error.

Reliability on natural throws with it on (32 games), believed / observed by his band: 0.15 / 0.45%, 1.17 / 1.56%, 3.16 / 3.10%, 6.36 / 5.07%. Lane read, 32 games an arm: sacks 131 → 121, yards a play 8.05 → 8.23, picks 46 → 49.

Withdrawn evidence, recorded so it is not quoted again: an earlier table said he passes up throws that complete 53% for 8.7 yd. That probe forced throws his window then pulled down at the plant, so it measured the rest of the play. Committed declines (reads he looked at and passed) complete about 0.3 and are picked about 10%: he is right to decline them and overstates how bad they are. A facing split of the pick fraction (in front of a defender facing him against behind an underneath defender) was tested and not supported. His earlier beliefs were re-read on engine-47 and need no refit (defended 0.14 / 0.14; off target at urgency 0.5–1, 0.25 / 0.27); drops are believed 0.05 against 0.08 observed, a one-constant follow-up.

Checks on the candidate (`e5d5e81e`): full suite 4347 pass; besides the two known research failures, the `read-plan` covered-first-read fixture failed on a real change at the margin (an aggressive passer's rhythm gate is risk ≤ 6.04%; the covered #1 was priced 7.07% off and 5.88% on, so on one more seed of sixteen he throws it). Restated over seeds 1–16 as shares (he moves on in at least 12, #1 thrown at most 5 times). Fixed run set 3.87 → 3.86. Paired league scorecards, 16 games an arm:

| seed | yards an attempt | completion | sack rate | INT rate | YAC | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 8.65 → 8.20 | 64.3 → 63.3% | 5.4 → 4.3% | 1.7 → 2.0% | 7.00 → 6.92 | 31.3 → 31.8 |
| 23 | 7.93 → 8.13 | 63.9 → 63.5% | 5.3 → 5.3% | 2.0 → 1.4% | 6.13 → 6.81 | 27.7 → 26.7 |

Nothing resolved on either seed. It lands on the reliability table.

`FREE_BOUND` on top, 16 games an arm: sack rate 4.3 → 2.5% (moved) and 5.3 → 2.1% (moved); points 31.8 → 34.3 and 26.7 → 32.9 (moved). Still held.

## engine-47: `CATCH_CARRY`, `HANDS_CUE`, `CATCH_SPEED` and `CATCH_CHOICE` on (2026-11-12)

Four changes at and after the catch, from two lanes, read together because each is what the others' costs depend on.

**`CATCH_CARRY`** (Defense #642). Between the ball being secured and a defender's own picture showing who has it (0.15–0.35 s), a defender who was driving on the catch fell back to his coverage job: his request swung about 100° off his velocity and his speed toward the catcher fell 3.5 → 2.0 → 1.4 yd/s as the catcher started to move. Now a defender driving on the catch, or whose flight read named the catch opportunity, keeps driving on that receiver as he last saw him until his own picture ends it (a drop, or the ball back in the air). A branch that gave the drive from `ball.securing`, ahead of his picture, is removed. Defense, 2 × 16 games on engine-45: settled catches reached within 1.0 s 57 / 60 → 66 / 64%, YAC 6.5 / 5.2 → 4.9 / 4.9. Stated limit: a trailing man defender at top speed cannot close on a faster crosser whatever he knows.

**`HANDS_CUE`** (Coverage #639). About a quarter of trailing man defenders never acquired the ball's flight and their only other cue (the receiver looking back over his shoulder) fired on 2 of 62 catches. While a receiver tracks a ball to him his hands come up a lead before it arrives (0.55 − 0.35 × route running s; a stand-in, since hands are not in tracking, bounded by the NFL trailer's break timing), a state a trailer within 3 yd reads with his usual delay; his running is untouched. Trailers recognising the throw by the catch 48 / 62 → 56 / 60.

**`CATCH_SPEED`** (Coverage #640). The NFL catch gets harder with the receiver's speed on a ball he is not facing; ours was flat (the old step acted only above 6.5 yd/s from behind). A continuous term, K × speed × angle × air time × (0.7 + 0.6 × (1 − ball tracking)), K 0.37 from the with-room cells, balls across his line weighted 0.46 of from-behind (the NFL's pooled ratio). Both constants are fitted to measured slopes and recorded as stand-ins for a physical hands model. Coverage, pooled 2 × 16: with room at speed, short 93 → 87% (NFL 88), deep 89 → 80% (72); defender within 2 yd, short 73 → 65% (57), deep 65 → 53% (52). Residue: deep balls across his line stay easy.

**`CATCH_CHOICE`** (Coverage #640). `TrackBall` played the earliest reachable point on the ball's path and paced to arrive on time, so the receiver braked and took the ball early and high whether or not a defender could play the catch point (on forced go balls he could reach the aim in stride 96% of the time and met the ball 1.6 yd short of it). Now he plays the latest point on the reachable segment that the two nearest defenders, as he sees them, cannot reach before the ball, with one judgment error a throw by ball tracking. Agreed table (Coverage and Rules + Coaching, natural deep throws 15+ yd, caught, untouched): met against his held-from-release spot p50 −1.85 → −0.59 yd (NFL −0.47), short by more than 1 yd 77 → 40% (39), past 3 → 16% (24). The natural deep throw is not short; there is no throw-side placement item. Supersedes the held `IN_STRIDE_CATCH`, which is to be retired.

Checks on the candidate (`f97b93b8`): full suite 4346 pass; besides the two known research failures, the man-trail carry fixture failed on one case with all four flags on and was restated by its lanes. Fixed run set 3.88 → 3.87. Paired league scorecards, 16 games an arm, one flag at a time with the other three on:

| flag, seed | yards an attempt | YAC | completion | points a team-game |
|---|---|---|---|---|
| `CATCH_CARRY`, 11 | 8.78 → 8.65 | 7.90 → 7.00 (moved) | 62.7 → 64.3% | 29.7 → 31.3 |
| `CATCH_CARRY`, 23 | 8.82 → 7.93 (moved) | 7.17 → 6.13 | 65.6 → 63.9% | 32.1 → 27.7 (moved) |
| `CATCH_SPEED`, 11 | 9.23 → 8.65 (moved) | 7.54 → 7.00 | 67.5 → 64.3% (moved) | 34.8 → 31.3 |
| `CATCH_SPEED`, 23 | 9.35 → 7.93 (moved) | 7.51 → 6.13 (moved) | 68.2 → 63.9% (moved) | 29.9 → 27.7 |
| `CATCH_CHOICE`, 11 | 8.64 → 8.65 | 7.38 → 7.00 | 64.2 → 64.3% | 30.3 → 31.3 |
| `CATCH_CHOICE`, 23 | 8.61 → 7.93 (moved) | 6.99 → 6.13 (moved) | 66.4 → 63.9% | 30.3 → 27.7 |
| `HANDS_CUE`, 11 | 9.26 → 8.65 (moved) | 7.97 → 7.00 (moved) | 65.1 → 64.3% | 30.1 → 31.3 |
| `HANDS_CUE`, 23 | 8.32 → 7.93 (moved) | 6.89 → 6.13 (moved) | 64.7 → 63.9% | 28.2 → 27.7 |

No flag has a resolved adverse row. Sack and interception rates do not move for any of them. With all four on: yards an attempt 8.65 / 7.93, YAC 7.00 / 6.13, completion 64.3 / 63.9%, points 31.3 / 27.7 a team-game on seeds 11 / 23. `CATCH_CHOICE`, feared as an offensive gain, is neutral to favourable with the other three on.

Interceptions, read from these pooled seeds and not from any one arm: 1.7 / 2.0%. A lane read showing picks falling with `CATCH_CARRY` was game divergence (identical forced throws show no change in any pass outcome). Tipped-ball picks: about 30% of picks come through the receiver, as in the NFL (31%); ours are more often short pop-ups beside him, a small noted item.

## engine-46: `ACC_BELIEF` on, he prices the throw he will actually release (2026-11-12)

Rules + Coaching #638. Under heavy urgency (0.5–1) the quarterback believed he would be off target 0.22 of the time; the release's own sigma implied 0.41 and 0.34 was observed. He decided on the urgency he felt at the decision (0.56) and released under 0.99, with a flick on 21%. His accuracy belief now uses the rush's urgency at the release (not scaled by pocket presence, which stays on his bar) and anticipates a flick when his own picture of the nearest rusher's time to contact, less the windup, is under 0.15 s; the priced urgency is off both ways by (1 − know) × 0.25 × judgment.

Rules + Coaching, 16 league games an arm on engine-45: off target at urgency 0.5–1, predicted / observed 0.23 / 0.37 → 0.25 / 0.31; with a free rusher at 2 yd he throws 64 → 60% (NFL 57), is sacked 23 → 20% (25), scrambles 10 → 14% (17). The game totals swing within noise by base; the calibration row and the paired panel (165 plays change, interceptions 34 → 34) agree on every base. A smaller high-urgency gap remains (0.25 against 0.31).

Checks on the candidate (`1b13d1d0`): full suite 4335 pass; besides the two known research failures, the `hot-look` panel's "off" case failed because with `ACC_BELIEF` on he no longer makes the two hot throws more than 60° from his eyes (one no longer clears his bar, one goes to a man 10° off); restated to "outside his clear look" (over 30°) in #641. Fixed run set unchanged (3.88). Paired league scorecards, 16 games an arm:

| seed | points a team-game | yards an attempt | completion | sack rate | INT rate |
|---|---|---|---|---|---|
| 11 | 35.4 → 31.9 | 9.42 → 8.80 | 66.0 → 64.7% | 4.5 → 5.4% | 1.5 → 2.3% |
| 23 | 30.5 → 26.9 (moved) | 8.63 → 8.22 | 66.2 → 64.4% | 5.3 → 5.0% | 1.6 → 2.4% |

Points fall about 3.5 and yards an attempt 0.4–0.6 on both seeds; interceptions rise 0.8 on both (neither resolved alone). The interception side is the next item in the same lane: his interception belief has the right total and a flat-to-inverted ranking (throws he rates under 0.5% risk are picked 1.2% of the time; those he rates over 5%, 1.1%).

`FREE_BOUND` on top, 16 games an arm: seed 11 sack rate 5.4 → 2.1% (moved), points 31.9 → 37.9 (moved); seed 23 sack rate 5.0 → 2.4% (moved), INT 2.4 → 1.4% (moved), points 26.9 → 29.7. Still held: it halves sacks on both seeds. What it lacks is the no-throw branch (`EXTEND`) and a pass rush whose free rushers arrive as the NFL's do (the edge work in Flex's lane).

## engine-45: `RELEASE_SEEN` on, a receiver releases around whoever he sees (2026-11-12)

Coverage #633. `RouteRunner.handleRelease` released around a defender only when the defense's own alignment said that defender was pressing him as his man: the receiver read the defense's private assignment. Against anyone else close at the line he ran his route through the body. Now the "tight over me" judgment and the defender's position come from his own (delayed) picture, and he releases around whoever is in his path at the line; reading the corner's shade and his route side is unchanged. It lands as the repair of a model-rule breach.

Coverage, 8 games, seed 11, off → on (NFL): stalled at the line 10 → 7% (3); with a lineman nearest 31 → 12% (5); off-ball tight receivers stalled 21 → 13% (5); pressed time to 5 yd within 0.1 s on every route. What remains is alignment, measured and routed: our off-ball wings sit 0.7 yd off the line (NFL 1.4; Rules + Coaching's formation queue) and against a wing with no attached end our widest lineman sets +1.5 to +2.3 yd outside the tackle (NFL +0.6; Defense, `WING_EDGE`, in work). In-line tight ends were never the gap (stalled 4–5% against the NFL's 15%). Parked from the same work, with write-ups on their branches: the press punch (`PRESS_JAM`: every punch landed whatever the skill, because the release never clears the corner's reach) and exempting the press release from the get-off (#629: the get-off against press already sits at the NFL's 1.5 yd/s).

Checks on the candidate (`ae311d19`): full suite 4333 pass; besides the two known research failures, three single-play quarterback fixtures moved again (`hot-look` ×2, `def-belief` off). Rules + Coaching replaced them with mechanism assertions over small named panels (#636), so a timing change elsewhere no longer breaks them. Fixed run set unchanged (3.88). Paired league scorecards, 16 games an arm:

| seed | yards an attempt | completion | sack rate | INT rate | YAC | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 9.10 → 9.42 | 65.7 → 66.0% | 5.4 → 4.5% | 1.6 → 1.5% | 7.66 → 8.02 | 33.4 → 35.4 |
| 23 | 8.99 → 8.63 | 67.2 → 66.2% | 4.3 → 5.3% | 1.8 → 1.6% | 7.36 → 7.19 | 28.4 → 30.5 |

Nothing resolved on either seed; yards and sacks disagree in sign.

## engine-44: `OPEN_CARRY` and `FORECAST_HOLD` on (2026-11-12)

**`OPEN_CARRY`** (Defense #628, second attempt). An underneath defender carrying a receiver inside a zone call ran as a man-coverage job, and a man defender never got the quarterback's throwing motion as a key however square he was. Under the flag an underneath match job (no deep responsibility) inside a zone call faces by the open-to rule with a side-on cap from his own picture of deep help, and keeps zone eyes, so whether he sees the motion is his facing. Attempt 1 (facing only) moved the eyes and not the break. Defense, 16 games × seeds 101 / 201 on engine-41: facing the quarterback at release − 0.3 s, linebackers 5–10 yd 69 → 85% (NFL 94); keyed the throwing motion, of those still on a man at the throw, 2 → 78%; distance to his man when no throw comes 2.9 → 3.3 yd at +2.0 s; yards a dropback 9.22 → 8.63. Known costs: crossers against zone completed 65 → 71% (for fewer yards), slower breaks under the catch point and on flights over 1.0 s, short-catch YAC flat.

**`FORECAST_HOLD`** (Rules + Coaching #630). The quarterback pumped on 14% of dropbacks, mostly because his forecast of the receiver flipped between his decision and the plant: a receiver more than a body radius (0.4 yd) off the drawn path was dropped to straight-line motion for the whole flight (22 of 30 traced pumps; the decision's forecast missed by 1.2 yd, the one he pumped on by 4.5). Now a receiver running along his route within the measured drift (p90 by phase: 1.2 yd on the stem, 1.6 after the break, 1.5 with no break) is still on it, carried from the nearest path point with his offset; stopped, cutting across, or farther off falls back as before. Rules + Coaching, 16 league games: pumps 13.7 → 7.0%; 160 newly attempted throws on the paired panel complete 0.49 with 9 interceptions against 0.37 and 6 on the same plays off. Known gap it exposes: with an accurate receiver forecast the window still misses a deep safety driving on a shallower crossing point (the restated `def-belief` fixture's old play), taken into the window work.

Checks on the candidate (`d3f4ecb6`): full suite 4333 pass; besides the two known research failures, the `def-belief` "on" fixture's play moved under `FORECAST_HOLD` and was restated by its lane (#634). Fixed run set unchanged (3.88). Paired league scorecards, 16 games an arm, one flag at a time with the other on:

| flag, seed | yards an attempt | completion | sack rate | INT rate | YAC | time to throw | points a team-game |
|---|---|---|---|---|---|---|---|
| `OPEN_CARRY`, 11 | 9.37 → 9.10 | 64.5 → 65.7% | 3.9 → 5.4% (moved) | 2.1 → 1.6% | 8.41 → 7.66 (moved) | 2.72 → 2.75 | 32.9 → 33.4 |
| `OPEN_CARRY`, 23 | 9.14 → 8.99 | 67.4 → 67.2% | 3.6 → 4.3% | 1.7 → 1.8% | 7.78 → 7.36 | 2.72 → 2.75 | 31.1 → 28.4 |
| `FORECAST_HOLD`, 11 | 8.16 → 9.10 | 64.1 → 65.7% | 4.5 → 5.4% | 1.7 → 1.6% | 6.75 → 7.66 | 2.81 → 2.75 (moved) | 29.5 → 33.4 |
| `FORECAST_HOLD`, 23 | 8.31 → 8.99 (moved) | 66.0 → 67.2% | 4.8 → 4.3% | 1.5 → 1.8% | 7.07 → 7.36 | 2.76 → 2.75 | 26.9 → 28.4 |

`OPEN_CARRY` lowers yards an attempt and YAC and raises sacks on both seeds. `FORECAST_HOLD` raises yards an attempt by 0.7–0.9 on both (he throws what he used to pump away); interceptions do not rise on both seeds. It lands as the repair of a self-inconsistency in his forecast, with the offense it frees recorded as a cost against the defense's open short-catch gap.

Held flags, read on this tree by Coverage (seeds 11 / 23, 8 games): `IN_STRIDE_CATCH` still adds 1.5–3.6 yd an attempt against zone underneath and does not move tight deep balls toward the NFL; stays held. Its replacement in work is the receiver's choice of catch point (`CATCH_CHOICE`).

## engine-43: `DEF_BELIEF` on, the window prices the defender it was missing (2026-11-12)

Rules + Coaching #625. Each factor of the quarterback's window was set against how throws actually failed: over 1,055 throws he predicted 0.08 defended and 0.19 were. Two causes. Since engine-39 a won catch sits in the hands for the securing window and a defender arriving then still gets a try at it, which the window counted as beaten; and a defender within 4 yd of the target closes partly with the receiver's motion, where the window kept him on his course. His belief now carries both (the man on the target moves partly with him, 0.5; the catch must survive a defender arriving within 0.3 s, dislodged 0.5 scaled by the receiver's hands and contested-catch skill), right on average and spread both ways by (1 − know), know from decision-making and experience. These are his beliefs about our defense and catch model: re-read them when `CATCH_SECURE`, `SHOULDER_READ`, the match carry (`OPEN_CARRY`) or the dislodge law change.

Rules + Coaching, 16 league games an arm with `LINE_START` on: P accepted / completion 0.70 / 0.63 → 0.66 / 0.63; defended predicted / observed 0.08 / 0.17 → 0.15 / 0.18. Paired panel (1,536 plays): 638 change, interceptions 33 → 30, sacks 71 → 94.

Checks on the candidate (`a4d29054`): full suite 4325 pass; besides the two known research failures, the `hot-look` "on" fixture's play moved under the new window and was restated by its lane. Fixed run set 3.88 → 3.90 mean under 20. Paired league scorecards, 16 games an arm:

| seed | completion | sack rate | INT rate | time to throw | yards an attempt | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 61.0 → 63.9% | 4.6 → 5.4% | 2.0 → 2.0% | 2.68 → 2.79 (moved) | 8.64 → 8.27 | 29.3 → 26.8 |
| 23 | 63.1 → 67.4% (moved) | 3.4 → 5.1% (moved) | 2.9 → 1.4% (moved) | 2.70 → 2.81 (moved) | 8.97 → 9.10 | 31.9 → 33.4 |

Both seeds: he holds the ball a tenth longer, completes more of what he throws and is sacked more (the sack rate enters the NFL team band, 4.6–9.4%, for the first time). Known cost and next work: more plays end with no throw he accepts, and that branch today is only evade or sack (`EXTEND`, Flex, built, off). Separately found and in work: he pumps on 14% of dropbacks because his receiver forecast flips from the installed route to straight-line motion when the receiver is more than a body radius off the drawn path.

`FREE_BOUND` on top, seed 11: sack rate 5.4 → 2.5% (moved), points 26.8 → 34.7 (moved), pass TD 6.4 → 8.2% (moved), YAC 7.13 → 7.86 (moved). Still held: with a free rusher at 2 yd he throws 73–78% against the NFL's 57%.

## engine-42: `LINE_START` on, a receiver's first steps are a get-off (2026-11-12)

Coverage #624 (part A of the release work; part B, the press jam and release move, follows under its own flag). Until he declares his stem (his first step and his observation delay on the defender) a receiver pushes with a chosen share of his start force, 0.4 + 0.03 × the depth of his first break (to 10 yd), ± 0.05 for a defender well off or in his face, + 0.15 × (route running − 0.5), range 0.3–0.85; into a break he slows on his cutting ability rather than 0.8 of his braking. The quarterback's forecast and expected break time use the same get-off. `MoveCommand.drive` is the interface (default 1, physics unchanged for every other caller).

Debt, stated: the drive share is a fitted stand-in, adjusted twice against the NFL speed table and not to be adjusted again. What it stands in for is the controller valuing lateral authority while he reads (a full forward push spends the whole friction ellipse); that is what replaces it.

Coverage, speed at 0.5 s, off → on (NFL): go 2.5 → 1.8 (1.7), post / corner 2.5 → 1.8 (2.0), in 2.5 → 1.8 (1.8), out 2.3 → 1.5 (1.8), hitch 2.2 → 1.5 (1.7), slant 2.2 → 1.2 (1.5), cross 2.3 → 1.3 (1.8), flat 2.3 → 1.4 (1.3); the go at 0.8 / 1.0 s 3.4 / 4.3 (3.4 / 4.4). Early-breaking routes now run a little slow. Pressed go against man: level with the corner 1.6 → 1.9 s (2.2), depth at 3.0 s 13.8 → 12.5 (11.6).

Checks on the candidate (`41b9a6a5`): full suite 4321 pass; besides the two known research failures, three scenario fixtures failed because their plays moved under the new route timing (`hot-look` ×2, the `read-plan` key case). Rules + Coaching traced and restated them (#626): the hot-look play is re-found; the read-plan flat still goes on rhythm on five seeds (2.15 s, as before), and on seed 2 a one-tick swing in the window pumps the throw (2.75 s), which is a quarterback sensitivity recorded for its own trace, not a get-off defect. Fixed run set unchanged (3.88). Paired league scorecards, 16 games an arm:

| seed | yards an attempt | completion | sack rate | INT rate | YAC | time to throw | points a team-game |
|---|---|---|---|---|---|---|---|
| 11 | 8.30 → 8.64 | 61.2 → 61.0% | 3.7 → 4.6% | 2.7 → 2.0% | 6.88 → 7.26 | 2.68 → 2.68 | 32.1 → 29.3 |
| 23 | 9.02 → 8.97 | 62.4 → 63.1% | 4.0 → 3.4% | 2.0 → 2.9% (moved) | 7.55 → 7.84 | 2.69 → 2.70 | 33.5 → 31.9 |

Nothing agrees between the seeds except points a little lower (neither resolved) and YAC a little higher (neither resolved). It lands on the direct measurement, not on the cards.

## engine-41: `HOT_LOOK` on, a hot throw costs the look (2026-11-12)

Rules + Coaching #610 (it replaces the unlanded `HOT_PLAN`, whose plan-answer rule fired on none of 1,536 panel plays). Under an alarm the quarterback chose the best throw over every receiver on the tick of the alarm, wherever his eyes were, and released after only the windup (0.30–0.40 s, no tail; four in five such throws went to a receiver other than the one he was reading). Now the hot target is chosen from his pictures: one in his clear look is thrown after the windup; anyone else needs his eyes there first (a head turn at 400°/s, assumed, then a glance of 0.15 + 0.2 × (1 − decision-making) + 0.1 × (1 − awareness) s), and is judged again on the fresh picture; if it has gone he chooses again or has no throw. It also fixes a gaze defect (his eyes stayed on the verticals after the pressure jump moved his read to the back) and carries the `noThrow` seam that the evade / throw-away / sack behaviour (`EXTEND`, Flex, built, off) enters through.

Rules + Coaching, 16 league games an arm, two seeds: alarm → release p50 / p75 / p90 0.40 / 0.40 / 0.55 → 0.45 / 0.70 / 1.20 s (NFL p75 1.10 with a free rusher at 2 yd); no throw in time on 20 of 68 alarmed plays. Paired panel (the same 1,536 plays): interceptions 35 off, 34 gaze fix alone, 35 look alone, 34 both; no play gains one from either part.

Checks on the candidate (`5bd6ac0a`, on engine-40 plus the blind-defender correction): full suite 4322 pass with the two known research failures; fixed run set unchanged (3.88 mean under 20). Paired league scorecards, 16 games an arm:

| seed | yards an attempt | time to throw | sack rate | INT rate | completion | points a team-game |
|---|---|---|---|---|---|---|
| 11 | 8.87 → 8.30 (moved) | 2.63 → 2.68 (moved) | 3.1 → 3.7% | 1.9 → 2.7% | 62.9 → 61.2% | 33.0 → 32.1 |
| 23 | 9.33 → 9.02 | 2.66 → 2.69 | 3.5 → 4.0% | 2.2 → 2.0% | 63.7 → 62.4% | 31.8 → 33.5 |

Yards an attempt and completion fall and sacks rise half a point on both seeds; interceptions and points disagree between seeds.

`FREE_BOUND` on top of it, seed 11 (`HOT_LOOK` on in both arms): sack rate 3.7 → 1.5% (moved), yards an attempt 8.30 → 9.56 (moved), YAC 6.88 → 8.46 (moved), time to throw 2.68 → 2.60 (moved). Better than the 0.9% it gave on engine-36, and still held: the larger share of throws with a free rusher near never touch the alarm (ordinary reads on a belief about 0.13 too optimistic), which is the window's defender model, in work.

## engine-40: `ARRIVE_LEAD` on, and a touchdown is checked before the tackle step (2026-11-12)

- **`ARRIVE_LEAD`** (Defense #615). An underneath zone defender who cannot beat the ball to the catch drives to the catcher's upfield shoulder (the catch point offset toward the defense's goal by his body, the catcher's body and his reach, about 1.6 yd), not at the catch point. NFL tracking: the nearest defender's line of travel at a short catch crosses 1.4–1.7 yd upfield of the catcher in every group; ours crossed at 0.3–0.5. Defense, engine-37, two seeds × 16 games: the crossing point on catchers moving across 0.3 → 1.1 yd (NFL 1.9), toward 0.2 → 1.6 (1.7), away −0.1 → 0.9 (1.4); catch to first contact 2.8 → 1.6 yd; short-catch YAC 7.67 → 7.27, all of it upfield yards, no cutback opened. Zone only; man shows the same gap (1.5 against 0.4) and is a later decision. `SHOULDER_READ` (a zone defender leaning toward the receiver the quarterback's shoulders point at from the windup) rides along off: its effect was inside noise, its cost side does not exist until the quarterback can pump or look a defender off, and 26–45% of the defenders it needs are not facing the quarterback.
- **Rules correction, no flag** (Rules + Coaching #612). The touchdown check ran after the tackle step in the same tick, so a player who gained possession in the end zone and was stripped in that tick was not ruled to have scored; one such play then reached an unsupported end-zone recovery ruling and threw. The check now runs first (possession in the attacked end zone is a touchdown at once), and the restricted-recovery path resolves to the nearest supported ruling with a recorded limitation instead of throwing. Any play with a same-tick goal-line crossing and tackle now resolves differently.

Checks on the candidate (`7974ecb4`, on engine-39): full suite 4317 pass with the two known research failures (this run covers the rules correction's changed outputs); fixed run set unchanged (3.88 mean under 20). Paired league scorecards, 16 games an arm, `ARRIVE_LEAD` 0 against 1:

| seed | YAC a reception | 20+ completions an attempt | yards an attempt | INT rate | completion | sack rate | points a team-game |
|---|---|---|---|---|---|---|---|
| 11 | 9.07 → 7.26 (moved) | 16.8 → 14.0% (moved) | 9.99 → 9.18 | 2.1 → 1.3% (moved) | 60.1 → 64.7% (moved) | 4.4 → 3.7% | 37.9 → 35.8 |
| 23 | 8.10 → 7.65 | 15.2 → 14.4% | 9.59 → 9.09 | 2.1 → 1.7% | 63.8 → 62.5% | 2.7 → 3.7% (moved) | 38.6 → 35.6 |

YAC, long completions, yards an attempt and points fall on both seeds. Completion and sacks disagree between seeds; interceptions fall on both (a defender driving to the shoulder is not playing the ball).

Recorded miss, not landed: `FRONT_ANGLE` (a defender with the runner in front forecasting the runner's upfield line) made every pass-side measure worse (yards a dropback 9.29 → 10.55): the forecast sent him to a point ten yards downfield. Most "outrun wide" plays are geometry at the catch (the defender 1.4–2.1 yd deeper and about 5 yd wide), which is where underneath defenders are and what they are looking at when the ball is thrown.

Correction after engine-40, no flag (Coverage #617): a defender facing away from the ball was given a flat 12% pass breakup whenever it passed within arm's reach of his centre. He can now only be hit by it: a ball whose path crosses his body comes off it and is recorded as a deflection off his body, not a play on the ball. Per 100 targets (two seeds × 8 games, engine-38): PBU 13.9 → 11.6, deflections 3.5 → 4.4; completion and yards an attempt within noise. Full suite on develop + #617: 4320 pass with the two known research failures.

## engine-39: the catch contest on: `CATCH_HANDS`, `LOOK_ONCE`, `CATCH_SECURE`, `DRIVE_CATCH` (2026-11-12)

Coverage #590 (C14 in [GAPS](GAPS.md): completion barely depended on how open the receiver was). Built at engine-30 and parked until defenders arrived in phase, which `CUSHION_BREAK` (engine-36) gave them.

- **`CATCH_HANDS`**: the catch is a contest of both players' hands. A defender within reach of the receiver's arm (shoulder to ball) with his own hand to the ball, seeing it, plays it; the receiver no longer has first claim.
- **`LOOK_ONCE`**: whether a defender finds the ball is settled once per look, not re-rolled every tick.
- **`CATCH_SECURE`**: a won catch opens a securing window whose length comes from the receiver (hands, the difficulty of the catch); the ball is pinned to his hands and each defender arriving in the window gets one resolution from what he delivers, a hand to the ball or a hit; a dislodged ball is live.
- **`DRIVE_CATCH`**: once the ball is in the receiver's hands, a defender who has found it drives at the man, not at the ball's old path.

Coverage, engine-36. Forced outside go at about 41 yd (268 throws paired to the release), completion by the nearest defender at arrival, off → on (NFL go balls 15+ yd): under 1 yd 0.39 → 0.17 (0.16); 1–2 yd 0.50 → 0.52 (0.28); 2–3 yd 0.61 → 0.65 (0.37); 3+ yd 0.59 → 0.60 (0.49). Against Cover 1 0.67 → 0.51. Securing windows with a defender's try: 32 of 149, 15 knocked loose (6 of 244 before the hip-turn work). Games, completion by openness at the release (NFL): tight 58 → 53% (28); mid 64 → 53% (53); open 73 → 71% (76).

Watch: mid-openness passes defended 18 → 28% (NFL 15%). `scripts/diag/risk/mid-pbu.ts` shows the added ones are `CATCH_HANDS` / `CATCH_SECURE` hand plays by the nearest defender 0.4–0.9 yd from the target with the ball within his reach on 16 of 17; `LOOK_ONCE` adds none. Part of the gap is the NFL's narrower label.

Checks on the candidate (`34d4d38c`, on engine-38): full suite 4311 pass with the two known research failures; fixed run set unchanged (3.88 mean under 20). Paired league scorecards, 16 games an arm, all four `0` against all four `1`:

| seed | completion | INT rate | 3rd-down conversion | punts a team-game | yards an attempt | YAC a reception | sack rate | points a team-game |
|---|---|---|---|---|---|---|---|---|
| 11 | 65.6 → 60.1% (moved) | 3.0 → 2.1% (moved) | 41.4 → 34.8% (moved) | 3.97 → 5.28 (moved) | 9.72 → 9.99 | 7.86 → 9.07 (moved) | 3.0 → 4.4% (moved) | 36.6 → 37.9 |
| 23 | 68.2 → 63.8% (moved) | 2.6 → 2.1% | 40.4 → 36.4% | 4.69 → 5.00 | 10.01 → 9.59 | 7.79 → 8.10 | 4.0 → 2.7% (moved) | 34.5 → 38.6 |

Completion falls four to five points on both seeds, into the NFL band (60.59–68.09%), with third downs and punts following. Points do not fall (neither seed resolved): yards an attempt hold because the completions that remain are the open ones, which is also why YAC a reception rises (a composition effect: the contested short catches that used to count are now incompletions). The two seeds disagree on sacks. Holding calls rose on seed 11 (1.16 → 1.69 a team-game).

Measurement note (Coverage, 2026-11-12): from engine-39 the `catch` event fires at the end of the securing window, so `pass_arrived` in sim exports was late by 0.12–0.45 s on catches and not on misses. Rows that sampled the ball or players at arrival on our side with `CATCH_SECURE` on are biased and should not be quoted: catchpoint's on-target and arrival-distance rows, every `trail.py` reading before the fix (including first contact "0.1–0.2 s"; corrected 0.3 s), the first `placement.py` table, and the go-ball game table's on arm. The forced-go table and the openness table above are unaffected. Fixed by a `secure` event at the start of the window (#621). Corrected: completion by the ball's offset from the receiver's centre, all throws, NFL 74 / 53 / 20% at 0–0.5 / 0.5–1 / 1–1.5 yd, ours 75 / 59 / 28%; tight throws about 20 points above the NFL at every offset (62 / 45 / 24 against 42 / 22 / 2); trailing defender at 1–2 yd, on target, 67 against 52%.

Still open at the catch: the trailing defender at 1–2 yd changes nothing (0.50 → 0.52 against 0.28), because he can only play a ball that reaches his own envelope, not the receiver's hands ("play the hands", in work); and tight throws overall still complete about twice as often as the NFL's.

## engine-38: `BLOCK_SEEN` and `RELEASE_THROUGH` on (2026-11-12)

- **`BLOCK_SEEN`** (Flex #520). The quarterback's sense of a blocked rusher comes from what he sees, not from the block's private win score: a rusher is held only by an offensive body he sees within arm's length of him and on his path; a rusher in contact with a blocker who is not on his path (ridden from beside, or driving the blocker back) is paced at the closing speed the quarterback sees, with no fresh sprint credited. Estimate minus the rusher's real arrival, median, off → on (8 games): through a blocker on his path +1.39 → +0.43 s; ridden beside a blocker +0.45 → +0.39 s; free +0.39 → +0.30 s; no rush type reads early. The same kind of repair as `SEEN_EYES` (engine-30).
- **`RELEASE_THROUGH`** (Coverage #608). After a press release the route steered the receiver back across the corner to a stem point he had already passed, and the two slowed each other to a stop: pressed outside go against man, depth at 3.0 s 6.7 yd at 2.8 yd/s (NFL 11.6 at 7.3). Stem points under 1.5 yd ahead that lie back across his release side are now skipped, and the release side survives a later jam. Pressed go or fade against man stalled at 3.0 s: 60 → 6%; depth at 3.0 s 13.8 yd; identical to 1.5 s. A pressed seam keeps its landmark; a wide-released go stays 2–4 yd wide.

Checks on the candidate (`ed1f5b79`, on engine-37): full suite 4311 pass with the two known research failures; fixed run set unchanged (3.87 mean under 20). Paired league scorecards, 16 games an arm, one flag at a time with the other on; no row resolved on either flag on either seed:

| flag, seed | points a team-game | completion | yards an attempt | sack rate | INT rate | time to throw |
|---|---|---|---|---|---|---|
| `BLOCK_SEEN`, 11 | 39.6 → 36.6 | 63.9 → 65.6% | 9.87 → 9.72 | 3.6 → 3.0% | 2.3 → 3.0% | 2.67 → 2.64 |
| `BLOCK_SEEN`, 23 | 36.8 → 34.5 | 67.8 → 68.2% | 10.12 → 10.01 | 3.3 → 4.0% | 2.5 → 2.6% | 2.67 → 2.69 |
| `RELEASE_THROUGH`, 11 | 37.1 → 36.6 | 63.2 → 65.6% | 9.44 → 9.72 | 3.3 → 3.0% | 3.6 → 3.0% | 2.68 → 2.64 |
| `RELEASE_THROUGH`, 23 | 37.4 → 34.5 | 66.8 → 68.2% | 9.89 → 10.01 | 3.9 → 4.0% | 2.1 → 2.6% | 2.67 → 2.69 |

Known and open after `RELEASE_THROUGH`: the release against press is too easy (level with the corner at 1.5 s against the NFL's 2.2; the jam lands on 1–3% of pressed receivers and holds one or two ticks; every receiver leaves the line at 2.2–2.5 yd/s at 0.5 s against 1.3–2.0), so the freed go ends about 1.5 yd past where an NFL receiver is; and the quarterback throws the running go on 4–6% of four-verticals attempts against Cover 1 (NFL 62%), which is the deep-shot decision in the risk work.

## engine-37: `BACK_FRONT` on, the back is read with the front side (2026-11-12)

Rules + Coaching #605, a follow-up inside `READ_PLAN`. In a pure progression the back is read with the start side at his window, before the quarterback's eyes cross the field, as the playbook sheets list him (a reset to the back after the front side's two or three reads) and as NFL tracking shows (on dropbacks without two go routes where the back runs a route he gets 22.1% of targets at a median 2.60 s, the same time as other throws on those plays).

Rules + Coaching, paired forced-concept panel on engine-35, 1,536 plays an arm: back share on non-vertical concepts 9.8% at 3.40 s → 24.0% at 2.80 s; sacks 74 → 61; INT 37 → 33; yards a play 9.46 → 9.30 (a checkdown taken on time replaces some longer throws). 16 league-sampled games: back share 16.3% at 2.85 s → 23.0% at 2.70 s; back out, open and never read 25.3 → 18.2% of dropbacks; sacks a dropback 1.8 → 1.9%.

Checks on the candidate (`0fc0c534`, on engine-36, run together with `FREE_BOUND`): full suite 4306 pass with the two known research failures; fixed run set unchanged (3.88 mean under 20). Paired league scorecards, 16 games an arm, `BACK_FRONT` 0 against 1 with `FREE_BOUND` on in both arms:

| seed | yards an attempt | pass TD rate | INT rate | YAC a reception | time to throw | sack rate | points a team-game |
|---|---|---|---|---|---|---|---|
| 11 | 9.36 → 9.89 | 8.5 → 8.1% | 2.2 → 2.9% (moved) | 7.51 → 8.43 (moved) | 2.61 → 2.55 (moved) | 1.5 → 0.9% (moved) | 37.9 → 36.7 |
| 23 | 10.24 → 9.41 (moved) | 9.6 → 7.9% (moved) | 2.7 → 2.5% | 8.11 → 7.66 | 2.60 → 2.59 | 1.1 → 0.8% | 38.1 → 34.5 |

The two seeds disagree on yards, YAC and interceptions; points fall on both. Those cards were not run with `FREE_BOUND` off, the configuration promoted here; the lane's engine-35 reads above are that configuration.

**`FREE_BOUND` held** (Flex; the quarterback's felt time for an unblocked rusher within 3 yd is bounded by how soon that man could hit him). Same run, `FREE_BOUND` 0 against 1 with `BACK_FRONT` on: sack rate 4.2 → 0.9% and 3.5 → 0.8% (both moved), time to throw 2.70 → 2.55 and 2.71 → 2.59 s (both moved), completion and yards an attempt not resolved. The perception is right, but a sack rate under one percent says nothing else in the engine produces sacks: the rush wins late and a pressured throw costs too little. Held until that is diagnosed. `BLOCK_SEEN` (the same lane's blocked-rusher perception) is also still off.

## engine-36: `CUSHION_BREAK` on, deep zone defenders carry a vertical instead of turning and running (2026-11-12)

Defense #585 (C17, and most of C9 for deep players in [GAPS](GAPS.md)). Zone deep defenders opened their hips and ran on 51–84% of dropbacks before the throw (NFL 8–10%), at a cushion NFL defenders hold, and the turn latched. In zone calls only (pure man keeps its trigger):

- **The turn** fires when the cushion is about to be gone given the time his own body needs to flip from how he is facing now (the open-to-run turn his body achieves, not his standing pivot rate). With deep help behind him he may let the receiver draw level; with none he keeps a roof. The help split came from tracking.
- **The carry** before that: he gives ground at the speed his cushion budget needs, need = receiver speed − √(2 · a · (cushion − threshold)), the slowest he may go and still be matched when the cushion runs out, with a his own acceleration; and he opens his hips only as far as that speed requires on his facing curve (which `PEDAL_CAP`, engine-33, made fall all the way to the backpedal). He comes back toward square when the receiver throttles.
- **Leverage**: he carries off the receiver's line by both body radii plus 0.7 of an arm on his leverage side (about 1.15 yd for a corner), wider with help as the receiver comes level, so a closing receiver runs past his shoulder, not through him.

Defense, two seeds × 16 league-sampled games on engine-34, off → on (NFL): turned before the throw, help / no help, Cover 3 53 / 61 → 40 / 40%, Cover 4 84 / 84 → 30 / 29%, Cover 6 81 / 67 → 40 / 43% (8–10); zone deep completion when the receiver is faster 29.5 → 42.5% (52.6); deep completion 45.1 → 49.2% (49.3, same operator); deep share 7.4 → 6.9% (7.5); over the catch point, speed toward it 0.4 s after the throw −0.23 → +0.58 yd/s (+1.19); YAC trimmed 5.89 / 5.70 → 5.19 / 5.06 (5.03); zone contact before the throw 20.0 → 20.1% (9.1).

Checks on the candidate (`9c4b0716`, on engine-35): full suite 4290 pass with the two known research failures; fixed run set unchanged (3.88 mean under 20). Paired league scorecards, 16 games an arm:

| seed | points a team-game | completion | yards an attempt | pass TD rate | YAC a reception | 20+ completions an attempt | INT rate |
|---|---|---|---|---|---|---|---|
| 11 | 39.3 → 33.0 (moved) | 65.9 → 62.4% (moved) | 10.41 → 9.49 (moved) | 9.5 → 7.6% (moved) | 8.63 → 8.18 | 17.8 → 16.1% | 2.0 → 2.3% |
| 23 | 40.8 → 37.9 | 68.5 → 67.3% | 10.59 → 9.99 | 10.0 → 9.5% | 8.52 → 8.08 | 17.3 → 16.0% | 2.6 → 2.9% |

The same direction on every pass row on both seeds; the first promotion since engine-30 that takes scoring down by coverage rather than by the offense.

What still turns: the no-help defender at 2.5–2.75 s (33–51%). His cushion runs out about half a second sooner than an NFL defender's: he steps toward the receiver before the stem shows (`CUSHION_NEED`'s squeeze, right for a short release and wrong for a deep player; a budget fix and a pre-release repair are built and parked on the lane branch because they give back some YAC until the underneath defenders arrive), and our receivers accelerate off the line at 5.0 yd/s² against 4.0. Pure man also over-turns (64–70% against 19–22%), untouched here.

## engine-35: `READ_PLAN` on, the quarterback runs a compiled read plan (2026-11-12)

Rules + Coaching #592, from the owner's [read-compiler design](research/2026-11-11-qb-read-compiler-design.md). Each called play is compiled into one read plan from its route geometry and timing: pure progression by default; a key read off one defender where a high-low is live on rhythm (corner-flat, curl-flat, sail, smash, dagger and drive as clear-and-void); a triangle read; an alert glance; quick game starting on the breaking route, not the settling one; one side finished before the other; the back placed in the order by his window and side, first when he is the earliest answer; and on verticals one look that lasts until every vertical is 12 yd deep plus his processing time, then the back if nothing is winning. The quarterback executes the plan from what he sees of the key defender in his own delayed picture; pressure still takes his eyes to the outlet. Checked against 187 reads paraphrased from the playbook library ([Phase 0](reviews/2026-11-11-read-compiler-phase0.md), [Phase 1](reviews/2026-11-11-read-compiler-phase1.md)).

Forced-concept panel, paired, 1,536 plays an arm, `BACK_RELEASE` on: sacks 74 → 68, INT 45 → 43, yards a play 9.67 → 9.96. The sheets' intended answer: dagger against Cover 2 .33 → .58, sail against Cover 3 .50 → .91, curl-flat against Cover 3 .75 → 1.00. Four verticals (1,600 plays an arm, NFL 3+ go routes in brackets): to a seam .420 → .449 (.109), to an outside go .073 → .102 (.327), to the back .503 → .446 (.322).

It also removes a defect of engine-34: with the back released, the old rhythm outlet ("the last read") could be a deep backside route, because the back sits inside the hand-written order.

Checks on the candidate (`077e8c9c`, on engine-34): full suite 4284 pass with the two known research failures; fixed run set unchanged (3.92 mean under 20). Paired league scorecards, 16 games an arm:

| seed | INT rate | sack rate | time to throw | scramble rate | completion | yards an attempt | points a team-game |
|---|---|---|---|---|---|---|---|
| 11 | 3.3 → 2.0% (moved) | 3.5 → 3.4% | 2.72 → 2.67 (moved) | 1.5 → 2.8% (moved) | 64.3 → 65.9% | 10.24 → 10.41 | 37.1 → 39.3 |
| 23 | 2.6 → 2.6% | 3.9 → 3.1% | 2.70 → 2.69 | 2.6 → 1.6% | 67.7 → 68.5% | 10.47 → 10.59 | 35.8 → 40.8 (moved) |

Known and accepted: the back is out, open and unread on about a quarter of dropbacks; no second key or triangle yet for flood, comebacks and pa_post_dig (about half the keyed interceptions looked at were picks by an unread defender); the corner against Cover 2 is rarely thrown (the half safety and the slot corner's stem, outside the flag); the outside go is rarely thrown (the release against press, and a completion bar that cannot take a contested deep shot: the risk work); hot answers wait on the quarterback seeing a free rusher (`BLOCK_SEEN`, `FREE_BOUND`, in candidacy).

## engine-34: `ROUTE_CRAFT` and `BACK_RELEASE` on (2026-11-12)

- **`ROUTE_CRAFT`** (Coverage #599). A receiver who sees a defender in his lane ahead (his perceived picture, 0.25–0.45 s out by route running) works to a shoulder: toward his next break, else the defender's open shoulder; radii plus 0.15–0.4 yd wide by route running; he eases 2–6% through it; landmark and timing kept; leaning into the defender stays allowed. 16 games an arm, unpaired, engine-31: goes around a defender in his lane within 5 yd of the line 22–24 → 45–46% (NFL 52); bodies touching there 36–40 → 22–24% (11); contact before the throw 5+ yd downfield 31–33 → 27–29% (13). Not moved: bending around a retreating defender downfield (5–10% against 24), and the defender closing into the receiver in man.
- **`BACK_RELEASE`** (Run Game, read by Rules + Coaching on engine-32). The check-release back leaves by the protection count and his own read, into the flat on his side or an angle. It was held at run-ref-26 because the quarterback then threw to him early less often; `FORECAST_BREAK` (engine-32) removed the cause. 16 league-sampled games: release p50 2.40 → 1.65 s (NFL 1.60); releases after 2.0 s 43 → 13% of dropbacks; free first pressures 7.8 → 9.6%. His share of attempts does not move (12.5 → 12.4%): he is now out and open at 2.6 s and never read on 26% of dropbacks, which is the read's to fix (`READ_PLAN`, in work).

Checks on the candidate (`b4cb3d9d`, on engine-33): full suite 4275 pass; the two known research failures, plus two fixtures that assumed the old defaults and are corrected here (`test/back-release.test.ts` now sets the off arm to `0` explicitly; `test/forecast-break.test.ts` runs on the live stack, and with the back released two of its six seeds go to W2 instead of the flat, so it now asks for the flat on at least four). Fixed run set unchanged (3.92 mean under 20). Paired league scorecards, 16 games an arm, one flag at a time with the other on:

| flag, seed | sack rate | time to throw | INT rate | YAC a reception | separation at the catch | points a team-game |
|---|---|---|---|---|---|---|
| `ROUTE_CRAFT`, 11 | 2.4 → 3.5% (moved) | 2.67 → 2.72 (moved) | 2.0 → 3.3% (moved) | 8.59 → 8.45 | 3.78 → 3.53 (moved) | 38.7 → 37.1 |
| `ROUTE_CRAFT`, 23 | 2.7 → 3.9% (moved) | 2.66 → 2.70 (moved) | 2.6 → 2.6% | 7.90 → 8.19 | 3.64 → 3.81 (moved) | 40.3 → 35.8 (moved) |
| `BACK_RELEASE`, 11 | 3.7 → 3.5% | 2.76 → 2.72 | 2.8 → 3.3% | 7.81 → 8.45 | 3.47 → 3.53 | 37.7 → 37.1 |
| `BACK_RELEASE`, 23 | 3.0 → 3.9% | 2.75 → 2.70 (moved) | 2.9 → 2.6% | 7.40 → 8.19 | 3.46 → 3.81 (moved) | 39.6 → 35.8 |

`ROUTE_CRAFT`: sacks rise about a point on both seeds, toward the NFL band (4.61–9.36%), with the throw 0.04–0.05 s later: receivers work around a body at the release and ease through it. `BACK_RELEASE`: the throw 0.04–0.05 s sooner; YAC up 0.6–0.8 on both seeds (neither resolved), consistent with more balls to a back in space.

## engine-33: `PEDAL_CAP` on, the backpedal is the slowest way to go backward (2026-11-12)

Defense #597. A physics repair found while building the deep defender's carry (C17). The facing cap fell from forward to side-on and then rose again to the backpedal (CB 0.63 side-on, 0.75 backpedal), so a defender never needed the angles between square and turned. NFL tracking (BDB 2025, defensive backs and linebackers before the throw, p95 speed by the angle between body and travel, as a share of the player's own top speed in the sample) falls all the way: CB .97 / .90 / .82 / .74 / .65 / .59 / .56 from forward to backpedal. For CB, S and LB the backpedal cap is now his side-on cap times the position's tracked ratio (CB 0.76, S 0.84, LB 0.79), spread ±0.06 by coverage skill and always below side-on: a CB pedals at about 4.9 yd/s (was 7.3; NFL p95 about 4.5). The ratio is used because the NFL shares are of pre-throw speed, not true top speed, and a within-group ratio cancels that. Forward, side-on and offensive players are unchanged. The NFL figures are speeds players chose; the shape is the evidence and the level is estimated.

Checks (`8bb6e506` on engine-32): full suite 4274 pass with the two known research failures. Fixed run set, stack against stack + `PEDAL_CAP=1`, 1,321 runs paired: mean under 20 3.88 → 3.92 (paired +0.05, SE 0.05), 10+ 7.3 → 7.8%, missed 0.253 → 0.260, broken 0.120 → 0.131 a run; no family beyond its SE. Offensive-line pass-set depth and speed identical (Defense). Paired league scorecards, 16 games an arm:

| seed | pass TD rate | yards an attempt | INT rate | YAC a reception | sack rate |
|---|---|---|---|---|---|
| 11 | 7.9 → 9.0% (moved) | 9.87 → 9.92 | 2.0 → 2.9% | 7.62 → 7.27 | 2.5 → 3.0% |
| 23 | 9.4 → 8.6% | 10.49 → 9.79 (moved) | 2.3 → 2.5% | 7.39 → 6.68 | 2.4 → 3.1% |

The two seeds point opposite ways on scoring; read as divergence. Alone it changes coverage little, because the old turn rule opens the hips early anyway; it is the base the progressive opening in `CUSHION_BREAK` needs. Linebacker drop depth barely moves (3.50 → 3.45 yd at 1.5 s against the NFL's 2.31): our drops are too deep for another reason, logged.

## engine-32: `FORECAST_BREAK` on, the quarterback expects a flat to break when it does (2026-11-12)

Rules + Coaching #593, found during read-compiler Phase 1. The quarterback's forecast of a route's break took the slowest waypoint on its path; for a flat or a swing that is the turn upfield at the sideline that the path adds past the installed route, so he expected the route to break about 6 s after the snap and never treated it as ready. Continuation points are now marked and skipped. Expected break, from his own forecasts: flat 6.20 → 0.95 s, swing 5.20 → 1.60 s; no other installed route changes. [Review](reviews/2026-11-11-forecast-break.md).

Forced-concept panel (1,536 plays an arm, engine-30): on the 13 concepts carrying a flat or swing, their share of attempts 5.1 → 21.1%, the back's 15.8 → 10.9%, sacks 14 → 9, INT 16 → 18.

Checks on the candidate (`00d297dc`, on engine-31): full suite 4270 pass with the two known research failures; fixed run set unchanged (3.88 mean under 20). Paired league scorecards, 16 games an arm:

| seed | sack rate | INT rate | time to throw | scramble rate | plays a team-game | pass rate | yards an attempt | points a team-game |
|---|---|---|---|---|---|---|---|---|
| 11 | 3.7 → 2.7% (moved) | 3.1 → 2.5% | 2.76 → 2.70 (moved) | 2.5 → 1.8% | 65.9 → 68.4 (moved) | 68.0 → 70.9% (moved) | 9.43 → 9.89 | 37.0 → 40.9 |
| 23 | 3.9 → 2.7% | 3.2 → 2.2% (moved) | 2.74 → 2.69 (moved) | 2.6 → 1.1% (moved) | 62.8 → 65.5 (moved) | 66.3 → 68.9% (moved) | 10.12 → 10.20 | 34.4 → 39.1 |

Known cost, accepted: the offense gains again (total yards +46 to +66 a team-game; points up about four on both seeds, neither resolved), with sacks already below the NFL band falling further. The quarterback now has a quick answer he should always have had; what is missing is on the other side (zone defenders arriving at the catch, C9/C17) and in the flat throw's lead (#567). More plays and a higher pass rate follow from quicker throws and fewer sacks and scrambles; not separately diagnosed.

## engine-31: `CATCH_POINT` and `OFFICIATE` on (2026-11-11)

Coverage #590. Two repairs from the completion-by-openness work (C14 in [GAPS](GAPS.md)).

- **`CATCH_POINT`.** The catch was judged on the first tick the ball entered the receiver's reach, while it was still coming to him (median 1.38 yd from his centre on completions), so an open, on-target ball carried nearly the full stretch penalty. A tracking receiver now waits for the ball's closest approach. Paired panel (about 750 throws): nobody within 3 yd 69 → 81% complete (NFL 81%, on target, at arrival); open 69 → 77% (76%); hard-catch misses on open balls 25 → 3%.
- **`OFFICIATE`.** An illegal-contact flag needs contact that changed the receiver's motion: the speed change the contact gave him, summed per defender–receiver pair over the play; no flag below 0.3 yd/s, rising to a seen rate of 0.6 at 1.8 yd/s; one threshold per pair per play; contact let go is recorded as uncalled. Estimated, and deliberately not fitted down to the NFL flag rate, because we still produce about 2.5 times the NFL's downfield contact.

Checks on the candidate (`157e3a54`): full suite 4268 pass with the two known research failures; fixed run set unchanged (all runs 3.89 mean under 20, missed 0.253, broken 0.120 a run). Paired league scorecards, 16 games an arm, both flags `0` against both `1`:

| seed | completion | yards an attempt | INT rate | sack rate | points a team-game | illegal contact a team-game |
|---|---|---|---|---|---|---|
| 11 | 59.6 → 64.1% (moved) | 8.92 → 9.43 | 2.4 → 3.1% | 3.9 → 3.7% | 35.5 → 37.0 | 1.44 → 0.16 (moved) |
| 23 | 62.5 → 68.2% (moved) | 9.15 → 10.12 (moved) | 2.7 → 3.2% | 2.3 → 3.9% (moved) | 35.2 → 34.4 | 1.22 → 0.19 (moved) |

`OFFICIATE` alone on seed 11 (`CATCH_POINT` on in both arms): illegal contact 0.91 → 0.16 a team-game, accepted penalties 4.97 → 4.25; no pass row resolved.

Known cost, accepted: completion rises about five points and yards an attempt about 0.5–1.0, further above the NFL band (6.35–7.89). The open end of the openness slope is now right and the tight end is not: tight and mid throws still complete far too often because defenders arrive slower and less often in phase than NFL defenders (C9, C17; `CUSHION_BREAK` in work). The seed-23 sack move did not appear on seed 11. `CATCH_HANDS`, `LOOK_ONCE` and `CATCH_SECURE` ride along off; their read waits for defenders who arrive.

## engine-30: `SEEN_EYES` on, zone defenders read the quarterback they can see (2026-11-11)

Defense #562. Five places in zone coverage steered a defender by `sim.qbEyes`, the quarterback's internal read target: the exact receiver, instantly, whether or not the defender could see him. A zone defender now needs the quarterback within 100° of his own facing, and reads the receiver nearest the quarterback's perceived facing in his own delayed picture (within 20°, 12° past 20 yd); otherwise he has no read.

| 16 league-sampled games an arm (`leagueSample`, seeds 101–116, engine-27), unpaired | off | on | NFL |
|---|---|---|---|
| Zone linebacker over the catcher slow at the release, Cover 3 / Cover 4 | 34 / 37% | 19 / 21% | 8 / 10% |
| YAC trimmed: all / against zone | 5.80 / 6.66 | 5.40 / 6.20 | |
| Untouched to +10 | 12.6% | 11.3% | |
| Deep (20+) completion; yards an attempt | 39.3%; 13.9 | 38.4%; 13.8 | |

On because it removes information the defender should not have; the outcomes move the right way as a consequence. `JUDGE_SEEN_BALL` (help decisions from the ball the defender has seen, not the true ball state) rides along off: it is honest and reads worse (yards a dropback 9.24 → 9.99) because deep seats with no rule keep reading and commit downhill before they see the throw; it goes on with that rule (C4 in [GAPS](GAPS.md)).

Checks on the candidate (`b3f07bb1`): full suite 4252 pass with the two known research failures; fixed run set unchanged in kind (all runs 3.87 mean under 20, missed 0.252, broken 0.119 a run). Paired league scorecards, 16 games an arm, `SEEN_EYES=0` against `=1`:

| seed | points a team-game | pass TD rate | sack rate | 3rd-down | YAC a reception |
|---|---|---|---|---|---|
| 11 | 32.7 → 35.5 (not resolved) | 7.4 → 8.2% | 3.3 → 3.9% | 38.4 → 40.3% | 7.34 → 7.31 |
| 23 | 30.8 → 35.2 (moved) | 7.1 → 8.5% (moved) | 3.5 → 2.3% (moved) | 38.4 → 45.5% (moved) | 7.26 → 6.99 |
| 37 | 34.8 → 34.4 | 8.6 → 8.2% | 2.8 → 3.3% | 42.3 → 42.5% | 7.92 → 7.52 |

Seed 23's scoring rise did not replicate on 37 and its sack row reverses on the other two seeds; pooled pass TD rate is 7.7 → 8.3% of 3,900 attempts an arm. Read as game divergence, with a possible small real cost of defenders no longer being handed the read. YAC falls on all three.

## engine-29: `CONCEPT_MENU` on, fifteen drop-back concepts (2026-11-11)

Rules + Coaching #582. Counted from the NFL's own route labels, one of our 17 pass concepts ran 54% of NFL formation sides on drop-back passes and both sides of 22% of dropbacks; the back only blocked, checked, swung or ran a flat, and our third receiver in trips ran only a hook, seam, flat or shallow. Fifteen concepts are added so that each strong pair is a common NFL pair we lacked and each third receiver a common trips side: double slants, fade-flat, hitch-post, double outs, hitch-out, seam-slant, hitch-cross, post-cross, corner-out, corner-flat, trips hitch-flat, trips sail, seam-hitch, trips outs and verticals-hitch, with the back on angle, out or wheel routes. Screens are left out on purpose. Each concept has a hand-written progression and a plain-text note of the coached read; the quarterback uses the progression. `CALL_MIX` weights them from its route-class table.

| Two 16-game league-sampled, coach-sampled sets an arm, unpaired, against NFL drop-backs (no play action or screens) | off | on | NFL |
|---|---|---|---|
| Playbook coverage: sides / both sides / exact | 54.2 / 21.7 / 5.1% | 66.4 / 38.5 / 8.6% | |
| Targets: quick under 10 yd | 27.5% | 37.8% | 39.6% |
| Targets: breaking 10–19 yd | 27.0% | 20.5% | 12.2% |
| Targets: outs / ins / slants | 9.6 / 13.0 / 5.8% | 15.7 / 6.8 / 7.8% | 16.6 / 7.6 / 7.8% |
| Targets: angle | 0 | 1.3% | 4.8% |
| Yards an attempt; completion | 9.65; 59.0% | 8.93; 59.6% | |

Integration's cards (16 games each, seeds 11 and 23, unpaired arms): time to throw 2.83 → 2.77 and 2.80 → 2.72 s (resolved on both); completion 55.9 → 59.2% (resolved) and 58.9 → 60.4%; yards an attempt 8.39 → 8.98 and 8.79 → 8.91; INT 3.0 → 2.5% and 3.1 → 1.9% (resolved); sacks 3.7 → 3.3% and 3.7 → 3.5%; YAC unchanged. Fixed runs unchanged.

On for what offences run, and the target mix moves toward the NFL's as a consequence. Thirteen of the fifteen throw mostly to their first two reads. Fade-flat and corner-flat do not (34 of 102 and 46 of 112): a deep-over-flat high-low needs a keyed read, which the quarterback does not have ([read-plan compiler design](research/2026-11-11-qb-read-compiler-design.md)). Still missing after the menu, 0.5–0.8% of sides each: in+post, cross+in, out+corner, out+flat, in+out, out+in, in+flat, post+go. Found and not fixed: a slot running a post into a man nickel standing in his lane stalls about 0.8 s. Detail: [concept menu](reviews/2026-11-11-concept-menu.md), [playbook coverage](reviews/2026-11-11-playbook-coverage.md).

## engine-28: `PRO_CALL` on, a protection call at the line (2026-11-11)

Rules + Coaching #552. There was no pre-snap protection call: the line declared only defenders on the line, walked-up linebackers were found after the snap, and whether a back stayed in was fixed by the concept. The offence now counts the box before the snap, declares walked-up threats inside the tackles, slides to them, and keeps a check-release back in when declared threats exceed the protectors. Linemen take the down linemen and the back takes the declared linebacker (the matching is type-aware; an earlier version matched by lateral position alone and put backs on defensive ends). A declared threat is treated as a rusher on his first committed downhill step and released when he is seen leaving. The back's own scan, taking a free rusher after the snap, is unchanged. A blitz disguised from depth is not declared.

| Off → on, same games both arms, 16 league-sampled games a set | 101–116 | 201–216 | 301–316 |
|---|---|---|---|
| Free blitzing linebackers (truth trace) | 59 → 16 | 58 → 19 | 51 → 21 |
| Free defensive linemen | 97 → 120 | 92 → 103 | 152 → 165 |
| Free first pressure, even numbers | 21.8 → 11.8% | 20.0 → 15.2% | 21.6 → 19.9% |
| Free first pressure, +1 or more | 50.0 → 18.2% | 42.9 → 16.7% | 39.3 → 17.9% |
| Any pressure | 27.8 → 25.8% | 31.6 → 27.7% | 36.0 → 35.7% |
| Back on a down lineman by the call at the snap | 12 → 6 | 16 → 17 | 13 → 14 |

Free defensive linemen rise on all three sets (+23, +11, +13); two of three are inside the ±15 fixed in advance, and per 100 dropbacks the rise is about +1. It is recorded as a cost, not explained: the single-block loss rate per down lineman is flat, and the remaining rise is in linemen left unblocked. Interior linemen free untouched and past the line: 0.14 → 0.14 per 100 on the third set (NFL 0.09).

Integration's cards (16 games each, seeds 11, 23 and 37, unpaired arms; the first two shown): sacks 4.8 → 3.7% (resolved) and 4.1 → 3.7%; scrambles 1.6 → 2.9% (resolved) and 2.5 → 2.7%; YAC a reception 6.90 → 7.28 and 6.35 → 7.34 (resolved); time to throw 2.80 → 2.83 and 2.74 → 2.80 s (resolved); completion 59.3 → 55.9% and 60.4 → 58.9%; yards an attempt 8.85 → 8.39 and 8.71 → 8.79. Fewer free blitzers means fewer sacks and a little more time, which moves sacks further from the NFL's rate while the quarterback still does not move in the pocket; that is the quarterback's gap, not this call's. A third card (seed 37) reverses the YAC move (8.22 → 7.61) with sacks again lower (3.9 → 3.5%), so the YAC change is read as the arms diverging; sacks fall on all three. Fixed runs unchanged (3.82, broken 0.123, missed 0.259).

Two operator repairs came out of this work: 25 of 34 NFL "interior rusher free untouched" plays were under-center snaps (the nose tackle is within 2 yd of the quarterback before he has left the centre), and the shared first-pressure operator carries the same effect, inflating the NFL reference (27.8% any, 10.2% free) by about 1.2 points; the operator fix is pending. `BACK_RELEASE` stays off: with this call on it uses `backsIn` in place of its own stand-in count, and it goes on with the quarterback's short-throw repair. Three earlier attempts (a separate big-on-big pass; a held-lineman release rule; help with vision) are written up in the flag row and [the protection review](reviews/2026-11-11-protection.md).

## engine-27: `CUSHION_NEED` on, man defenders squeeze their cushion (2026-11-11)

Defense #554. Before his hips open, a man defender kept his alignment cushion, scheduled down only by the receiver's depth, so a linebacker in man on a back releasing short pedalled from 4–5 yd instead of coming down. He now keeps only the cushion his receiver's observed upfield threat requires (1.8 yd, plus the closing speed over his flip time, plus the burst the receiver still has toward his top speed); a receiver climbing straight up the field still gets the full cushion.

| 16 league-sampled games an arm (`leagueSample`, seeds 101–116, run-ref-24), unpaired | off | on | NFL |
|---|---|---|---|
| Cover 1 linebacker over the catcher at the release: speed / toward / slow | 2.2 / −0.1 / 29% | 2.8 / +2.0 / 4% | 5.1 / +2.1 / 11% |
| YAC trimmed | 5.34 | 5.05 | |
| Untouched to +10: all / Cover 1 | 11.4 / 11.9% | 12.6 / 8.0% | |
| Deep completion | 42.9% (n 98) | 32.9% (n 85) | |

Integration's checks: two league cards (16 games each, seeds 11 and 23, unpaired arms) resolve nothing either way (yards an attempt +0.48 / +0.08, YAC a reception +0.25 / −0.28, INT and sacks flat). The fixed 1,321 runs, paired on identical plays, move: missed tackles a run 0.234 → 0.259 in every concept, outside-zone runs of 10+ 4.1 → 6.3%, yards a run 3.78 → 3.81. Defense's trace of those plays: tackle attempts 1,318 → 1,349; the defenders the squeeze acted on (187 play-defender pairs, the same in both arms) attempt 115 → 194 tackles at 0.12 → 0.15 missed an attempt (not established); only 2 of their 194 attempts came after their own man had engaged them; about half the raw rise is defensive linemen, who never run this code, missing more on a runner whose path changed. The added misses are 3–10 yd past the line. Read as more second-level involvement at about the same miss rate. Not audited: leverage at those attempts.

What it does not reach: zone-call linebackers over the catcher still sit at the release (Cover 3 2.3 yd/s, +0.2 toward, 31% slow against the NFL's 3.5, +1.4, 8%); they run zone techniques, not man, and are Defense's next build. An earlier version that squeezed corners on wide receivers was dropped. `SET_SQUEEZE` (the deep zone corner spending his cushion when the quarterback sets) is a written miss on its branch: the corner has no cushion to spend.

## run-ref-26: `CATCH_EYES` no longer carries a line back toward the passer (2026-11-11)

Run Game #528, an unflagged correction to `CATCH_EYES` (on since run-ref-18). For one reaction time after the catch the receiver carries the line he caught the ball on. A receiver coming back to the ball (comebacks, curls, the now screen) therefore kept running toward his own passer; he now plants and turns upfield, the same first move as a man who caught it standing. No flag: `CATCH_EYES=0` still restores the behaviour before run-ref-18. With it come `test/catch-eyes.test.ts` and the trace asked for at run-ref-18: 14 of the 1,321 fixed runs are pre-snap audibles to a pass (All Hitch / Slant-Flat); pitches and handoffs never take the catch path, which is why that stack moved the fixed runs at all.

`BACK_RELEASE` lands off in the same merge because the protection call (`PRO_CALL`, Rules + Coaching) needs its interface: a back installed as a check-release counts the box before the snap, runs a flat or angle from the snap when he is not needed, and otherwise checks and leaves 0.55 s plus his reaction time after nobody comes. On 16 league-sampled games the released back is open at the throw 11.6 → 24.9% (NFL 36.4) and wide of the box 33 → 71% (84), but he is still not thrown to early (targets before 2.0 s 3.3 → 0.7%, NFL 18.9) until the quarterback's estimate of short, wide throws is repaired, and free first pressure rises 10.5 → 11.8 per 100. Detail: [back release](reviews/back-release.md), [screen lab](reviews/screen-lab.md).

## run-ref-25: `THROW_BODY` on (2026-11-11)

Flex. Once the windup had started, a quarterback's throw came out as a clean delivery whatever was holding him: with a rusher within 1 yd before release he threw 70% of the time (NFL 30%), and throws made under a hold of 0.73 completed 47% at 8.5 yd an attempt. A hold now acts on the throw through what it holds (interference = the hold × the share of the grasp that is not on the legs): in the load it can pin the arm, so the throw is abandoned; a throw that leaves under a hold is an arm throw to that degree, with the flick's existing speed and accuracy costs.

| 16 league-sampled games an arm (`leagueSample`, run-ref-24), unpaired | seed 201 off → on | seed 301 off → on | NFL |
|---|---|---|---|
| Rusher at 1 yd before release: throw / sack / scramble | 75 / 21 / 4 → 65 / 30 / 6 | 72 / 23 / 5 → 63 / 33 / 4 | 30 / 47 / 23 |
| Throws after contact: complete; yd an attempt | 40%; 6.3 → 38%; 6.3 | 48%; 7.1 → 42%; 5.5 | 33%; 4.5 |
| Clean throws: complete; yd an attempt | 62%; 9.9 → 62%; 11.2 | 61%; 8.6 → 63%; 8.8 | 62%; 7.2 |

IRN v COM, 16 games (`scripts/diag/effective-mass/sack-hold.mts`): sacks 3.8 → 5.6% (NFL 6.3); a hold before the windup ends in a sack 82 → 94%; delivery-phase throws under a hold 41% / 4.9 → 32% / 3.6. Seed 201's YAC rose 8.01 → 10.09 and seed 301's fell 6.34 → 5.89: the arms diverge from the first held throw, and the flag acts only on a held passer.

Integration's cards on run-ref-24 (16 games each, seeds 11 / 23 / 37, unpaired arms): sacks 3.9 → 4.6%, 3.3 → 5.0% and 2.7 → 3.6% of dropbacks (pooled 3.3 → 4.4%). Yards an attempt 7.71 → 8.64 (resolved on that card), 9.16 → 8.85 and 9.38 → 9.82; 20+ yd completions 9.7 → 12.6%, 14.2 → 14.0% and 14.4 → 16.6%: no consistent direction, read as the arms diverging. Fixed runs unchanged (3.79, broken 0.125, missed 0.234).

What it does not fix: the throw still comes out 63–65% of the time against 30%, because rushers reach our quarterback mid-throw (his felt time to contact uses the block's private win score, a model-rule violation, next on Flex's list) and because he almost never escapes (scramble 4–6% against 23%). The ball is never knocked loose yet; `passerLoss` (Rule 8-1-1) is in `ball-rules.ts`, uncalled. `PICTURE_AGE`, the timing attempt that aged the quarterback's picture, is a written miss and stays off (it suppressed rhythm throws 57%). Detail: [tackle forms](reviews/2026-11-10-tackle-forms.md).

## run-ref-24: `COVER_LONG` on (2026-11-11)

Rules + Coaching #543. The defensive caller's early-down tilt (Cover 3 ×1.12, Cover 1 ×0.82, Cover 0 ×0.75, Cover 2 man ×0.5) applied to every 1st and 2nd down, so 2nd and 10 was called like 1st and 10. NFL defences call 2nd and long almost like 3rd and long: an offence off schedule is passing, and the coordinator knows it from down and distance. The tilt is no longer applied on 2nd and 7+; no new weights.

| 32 coach-sampled league games an arm (seeds 101–116, 201–216, run-ref-21 + `leagueSample`), unpaired | off | on | NFL |
|---|---|---|---|
| Cover 3 / Cover 1 on 2nd & 7+ | 40.0 / 14.6% | 36.4 / 17.2% | 29.7 / 18.1% |
| Cover 3 / Cover 1, all | 36.1 / 17.3% | 34.6 / 19.1% | about 33.6 / 22.3% |
| Yards a dropback; completion; sacks; INT | 9.49 ± 0.24; 62.6%; 2.1%; 3.9% | 9.34 ± 0.24; 62.8%; 1.7%; 3.8% | |
| YAC median / trimmed / mean | 4.5 / 5.55 / 7.86 ± 0.29 | 4.2 / 5.45 / 7.69 ± 0.29 | |

On for what defences call; outcomes are within noise and 1st-down calls are identical by test. The remaining Cover 3 excess on 2nd and long sits in the base shares and the coaching trees. The evidence is the lane's card; no separate scorecard was run for this stack.

Two findings from the same report ([coverage mix](reviews/2026-11-11-cover-mix.md)): most of the earlier coverage-mix gap was the coach sample (diagnostic games had four coordinators and no pressure-man or quarters tree; repaired by `leagueSample`, #546), and the passing excess lives after the catch against zone: YAC a reception against Cover 3 8.42 against the NFL's 5.47, against Cover 1 5.86 against 5.65. The mix is not forced toward man.

## run-ref-23: the drag-down binding on (2026-11-11)

Flex, `HIP_STRENGTH`, `HELD_SWING`, `SWING_STRIP`, `SWING_FLEXION` and `LEGS_HELD`, all five together (the last three are inert without `HELD_SWING`; the subset without `SWING_FLEXION` and `LEGS_HELD` binds the stride instantly and must not be used). A held leg's swing is compared with the hip's flexion capacity, which scales with functional strength; a swing that cannot be made binds the legs actually held for that stride. A hold on the legs now costs the runner his stride by strength and grip, and no longer either nothing or everything.

| Catches, made / missed / broken / other (16 league-sampled games an arm, seed 201, run-ref-19; same first-contact operator) | off | on | NFL |
|---|---|---|---|
| All | 63 / 0 / 24 / 13 | 69 / 1 / 20 / 11 | 62 / 4 / 20 / 14 |
| Class 0 | 53 / 1 / 42 | 53 / 0 / 43 | 58 / 5 / 35 |
| Class 1 | 49 / 0 / 47 | 67 / 0 / 31 | 60 / 6 / 29 |
| Class 2+ | 66 / 0 / 24 | 66 / 0 / 25 | 64 / 3 / 22 |

YAC median / trimmed / mean: 4.00 / 5.52 / 8.23 ± 0.47 → 3.40 / 5.23 / 8.19 ± 0.50. Fixed runs, paired: −0.04 yd (SE 0.02) on run-ref-17; the stack table is in this PR.

A held promotion, then released. Three integration cards on run-ref-20 lineups (seeds 11, 23, 37; unpaired) showed pass TDs 7.6% → 8.9% of attempts pooled (about 2.2 SE) at the same yardage. Flex's trace on run-ref-21 (seeds 11 and 23, `scripts/diag/effective-mass/td-hold.mts`) does not reproduce it: TDs a completion 9.2 → 8.6% and 12.8 → 11.4%; three near-goal held TDs read tick by tick never engage the binding (one shoestring miss, two upright waist wraps). Yards after the first hold inside the 10 rise about 0.3 yd (1.3 SE), consistent with `HIP_STRENGTH` letting a strong runner's hips resist a pull. No bug found in the mechanism.

Integration's card on this stack's base (run-ref-22, 16 games, seed 11, unpaired arms): yards an attempt 9.24 → 8.28, YAC a reception 7.57 → 6.81 and pass TDs 8.2 → 6.4% of attempts, all resolved; completion 60.1 → 57.4%, sacks 3.1 → 4.1%, points 34.7 → 30.4 a team-game and yards a carry 4.63 → 4.62 not resolved. Fixed runs on this stack: all 3.79, broken 0.125, missed 0.234 a run.

What it does not fix: the last-man solo tackle on this base (class 0 on catches stays 53 / 43 against 58 / 35), the connect (missed 1% against 4%), an upright waist wrap from behind that never commits its weight, and a head-on wrap driven back about 4 yd against the NFL's 2.3. Detail: [tackle forms](reviews/2026-11-10-tackle-forms.md).

## run-ref-22: `DEFLECT_BALL` on (2026-11-11)

Coverage #544. Whenever a receiver failed to catch, the ball deflected off him at 20% of its speed with a small pop, whether or not he had touched it, and a defender nearby then caught the hanging ball 10–40% of the time. Only the "catchable" misses logged a drop, so the rest read as clean picks: 17 of 21 short interceptions on the league-sampled panel came off the receiver (3.8% of short throws against the NFL's 0.4%). Now whether he touched the ball is decided from where it was in his catch window; untouched, it keeps its flight (an overthrow can still be picked behind him); a square bobble pops up and dies; a glancing touch keeps going low; and a defender catches a tipped ball only within his hands' reach and seeing it. Every miss logs an event.

| League-sampled panel (capture 7/11, run-ref-20 lineups), paired | off | on | NFL |
|---|---|---|---|
| INT per 100 throws: all / 0–10 / 10–20 yd | 5.0 / 4.8 / 6.2 | 2.5 / 2.4 / 3.6 | about 2.3 / 1.1 / 4.9 |
| INTs off the receiver | 18 of 34 | 5 of 17 | about 15% of INTs |
| Completion; yards a pass play | 61.5% | 60.9%; −0.12 ± 0.09 | |
| YAC median | 4.56 | 4.57 | |

Coverage's 16-game card: INT 3.6% → 2.1% (resolved); completion, yards an attempt, sacks and YAC not resolved. Integration's card on run-ref-21 lineups (16 games, seed 11, unpaired arms): INT 4.4% (55/1250) → 2.5% (32/1277), resolved; 20+ yd completions 14.3 → 12.5% an attempt, resolved; completion 59.8 → 60.1%, yards an attempt 9.06 → 9.24, sacks 3.1 → 3.1%, points 31.1 → 34.7 a team-game (not resolved; fewer drives end in a pick). The touch and pop constants are chosen, not sourced, and were not adjusted toward the interception rate.

Open: short interceptions are still about twice the NFL's (2.4 against 1.1) and 10–20 yd is a little under. The first attempt at this problem (`CATCH_CONTEST`, the first defender's possession window) is a written miss on Coverage's branch.

## run-ref-21: `DB_SLOTS` on (2026-11-11)

Rules + Coaching #539. `pickDefense` filled the nickel and dime backs before the safeties, so a safety usually took the nickel and a linebacker often took strong safety: on league-sampled games a linebacker held SS on 43% of nickel, 93% of dime and 44% of 3-4 base snaps. Both safeties are now placed first, from safeties, then corners, a linebacker only as a last resort; the nickel and dime follow on the existing suitability, so a big nickel is still possible. Substitutions go through the same function.

| 32 league-sampled games an arm (seeds 101–116, 201–216, run-ref-20), unpaired | off | on |
|---|---|---|
| SS held by an LB: nickel / dime / 3-4 base | 43 / 93 / 44% | 0 / 0 / 0 |
| Yards a dropback; completion; sacks; INT | 9.47 ± 0.25; 62.7%; 2.6%; 3.7% | 9.68 ± 0.25; 63.6%; 1.9%; 4.6% |
| YAC median / trimmed / mean | 4.4 / 5.63 / 7.73 ± 0.29 | 4.5 / 5.41 / 8.07 ± 0.31 |
| Deep completion; 20+ plays | 52.8% (n 216); 14.9% | 58.3% (n 206); 15.8% |
| Yards a run against nickel | 4.50 ± 0.23 | 4.63 ± 0.28 |

On because a linebacker playing a deep half is a lineup bug, not for a number: every outcome row moves within its noise. The fixed run set carries its saved personnel, so its table is unchanged. Detail: [the DB_SLOTS review](reviews/2026-11-11-db-slots.md).

Measurement consequence, repaired in #540: operators that found deep defenders by roster position under-counted safeties. Counted by slot, the shell mix is about 11/42/47 against the NFL's 9/45/47 and the two-high second safety is 11.7–12.4 yd against 12.2, with the flag off too. The shell-mix and second-safety-depth gaps recorded earlier were that operator and are closed.

## run-ref-20: `CALL_MIX` on (2026-11-11)

Rules + Coaching #531. The offensive caller weighted its 17 pass concepts about evenly, with no shaping by route depth or by down and distance beyond quick game, dropback and play-action. Each concept's weight is now multiplied by a preference for the route classes it runs at this down and distance (`config/call-mix.json`, fitted on NFL routes run with break depth from tracking, not on targets: fitting to targets pushed four-verticals ×4 on third and short through its checkdowns).

| 32 league-sampled games an arm (seeds 101–116, 201–216, run-ref-17), unpaired | off | on | NFL |
|---|---|---|---|
| Routes run: breaking 10–19 yd / quick | 17.6 / 22.7% | 15.6 / 24.9% | 13.1 / 26.7% |
| Targets: breaking 10–19 yd | 26.4% | 24.2% | 11.5% |
| Yards an attempt; completion; sacks; INT | 10.28; 62.0%; 2.4%; 4.1% | 10.22; 62.6%; 2.3%; 3.4% | |
| YAC median / trimmed / mean | 5.0 / 6.15 / 8.30 ± 0.29 | 5.1 / 6.37 / 8.72 ± 0.30 | |

On for what offences call, not for yards: nothing else resolves. The evidence is Rules + Coaching's 32-game arms; no separate scorecard was run for this stack.

What it does not reach: the call is the small part of the target-mix gap. Breaking routes stay over-thrown through the quarterback's choice at the throw (read order puts them first; the flat, even read first, is rarely judged open — `FLAT_FIRST`, a written result on branch `rules/flat-first`), and screens and angle routes (13.7% of NFL targets) are not in the call pool until Run Game finishes them. The table has no slot for them yet.

## run-ref-19: `HOLD_FACING` on (2026-11-11)

Defense #532, on top of `GRASP_ARM_MOMENT`. A tackler holding a runner who is going past him re-aimed his chest at the runner every tick, a pirouette the grasp's own moment never asks for. He now asks to keep the facing he has; the runner turns him through the hold and the contacts as far as the World's yaw response gives.

| Holder's turn at +0.5 / +1.0 s (fixed 1,321 runs) | off | on | NFL |
|---|---|---|---|
| Side | 87 / 98° | 29 / 50° | 34 / 76° |
| Behind | 90 / 99° | 48 / 73° | 27 / 64° |
| Front | 58 / 95° | 48 / 63° | 44 / 89° |

| Outcomes, paired on the fixed runs | off | on |
|---|---|---|
| Yards a run | | −0.02 (SE 0.02) |
| Broken / missed a run; unfinished holds | 0.121 / 0.233; 276 | 0.126 / 0.233; 264 |
| Made / broken by approach: front; side; behind | 70.4 / 7.6; 49.7 / 22.3; 67.9 / 17.9% | 71.2 / 7.7; 50.1 / 22.5; 64.8 / 19.3% |

With the default on, the fixed runs read 3.80, stuffs 10.4%, broken 0.123, missed 0.233. The league-sampled 16-game card ([scorecard](reviews/2026-11-11-hold-facing-scorecard.md), seed 11) shows no bugs and nothing football-relevant resolved: yards an attempt 8.80 both arms, YAC 7.04 and 7.07, rush yards a carry 4.44 and 4.31, missed + broken a play 0.24 and 0.23. On for the tackler's body doing what tacklers' bodies do; it does not change who makes the tackle.

Open with it: front holds turn less than the NFL by +1.0 s (63° against 89°).

## run-ref-18: `CATCH_EYES` on (2026-11-11)

Run Game. A receiver's eyes are on the ball until it is in his hands. Before, the ball carrier's first lane read fired one tick after the catch from a complete, fresh picture of every defender: 0.1 s after the catch his request was 46° off his travel (p50; p75 93°). Now, for one reaction time after the catch (0.14–0.42 s, from his recognition), he carries the line he caught it on, or turns upfield if he caught it nearly standing; his first lane read comes after that. Nothing caps the cut.

| | off | on | NFL |
|---|---|---|---|
| Heading change in 0.5 s after the catch, p50 / p75 (8 games, IRN/COM) | 22 / 37° | 13 / 20° | 14 / 25° |
| First man at hands range on a catch: catcher runs on | 26% | 20% | 10% |
| Panel, 399 receptions an arm (IRN/COM capture): YAC median | 5.45 | 4.59 | |
| YAC trimmed mean (30+ yd removed) | 6.42 | 5.37 (−1.05 ± 0.45, unpaired) | |
| YAC mean | 8.80 ± 0.63 | 7.97 ± 0.65 | |
| Yards to first contact, p50; catch → first contact, p50 | 2.13; 0.90 s | 1.57; 0.80 s | 0.60 s |
| 16-game card, league-sampled, seed 11: yards an attempt | 9.59 | 8.80 (90% range −1.47 to −0.09) | 6.35–7.89 |
| Card: YAC a reception; total yards a team-game | 8.05; 494 | 7.04; 458 | 4.53–5.91; 320–345 |

The card ([scorecard](reviews/2026-11-11-catch-eyes-scorecard.md)) was read for bugs and shows none; completion, sack and interception rates and missed + broken tackles are unresolved. With the flag on the fixed 1,321 runs read 3.82 (run-ref-17: 3.83), broken 0.118 (0.121). The flag acts only where the engine records a catch (`possess(…, 'catch')`), so some plays in the run set contain one; the movement is in outside zone (3.13 → 3.09) and gap (4.09 → 4.07), toss is unchanged, and which plays they are has not been traced.

Open with it: upfield speed 0.5 s after the catch moves away from the NFL (2.05 → 1.65 yd/s against 2.30), because crossers keep their line for the window; the body side of the catch (securing the ball, turning from the catch posture) is not modelled; no test covers the flag yet (requested from Run Game).

Measurement notes from this round. Coverage's panel YAC mean moves by about ±0.8 by chance whenever a change re-rolls the plays, from a handful of 30+ yd catch-and-runs, so yards after catch are reported as median, trimmed mean and mean ± SE with diverged arms treated as unpaired. On the league-sampled panel, completion in tight coverage at 10–20 yd matches the NFL (0–1 yd 28% against 26%); the 48% read on the two-team panel was those rosters.

## Whose teams the measurements are (2026-11-10)

Every diagnostic game was "Ironmen" (IRN) against "Comets" (COM). A team's alignment style (`alignStyle`) is seeded from its abbreviation and `ALIGN_HABIT`'s personal habits from player ids, so the same two defences' habits repeated in every game whatever the seed: safety depth −1.33 yd (IRN) and −0.68 (COM), corner depth −0.47 and +0.65, receiver room 0.11 and 1.22, line width −0.033 and −0.07, passing strength 0.41 and 0.49, A-gap 0.72 and 0.84. Both play shallow safeties. NFL teams differ like this (team medians sd 0.85), so the habit is realistic; sampling the same two was not.

Rules + Coaching #527 gives diagnostic games per-seed team identities (`withIdentity(team, salt)`: ids salted, rosters, ratings and coaching unchanged) in the pass-panel capture, `sim-export` and the scorecard league.

- **The fixed 1,321-run set is not recaptured.** It is still IRN against COM with those habits (`capture-runs --sample-league` is opt-in, off). Paired flag-on / flag-off reads on it are unaffected; any absolute comparison with the NFL that depends on alignment depth is a two-team sample.
- Effect of league sampling (16 games, seeds 101–116, run-ref-16): measured shell 0/1/2-high 18 / 51 / 32% → 12 / 48 / 40% (NFL 9 / 45 / 47); one-high deepest defender 12.1 → 13.6 yd (14.4); cushion at the throw +6.6 → +7.2 (+8.9).
- **Yards after catch did not move:** 8.83 → 9.25 a catch (NFL 5.00), first contact on 77 → 78% of catches. The excess is not the two teams' safeties.
- Still open after the fix: on called two-high coverages the second safety is about 2.4 yd shallow (9.2 against 11.6), from the calls, not habits.

**The tracking catch event is late (found 2026-11-11, Defense).** In BDB 2022 the `catch` event (`pass_outcome_caught`) is tagged a median 0.30 s after `pass_arrived`; the sim's catch is the arrival. NFL yards after catch measured from that event start about 0.3 yd of running late. From arrival, NFL YAC is 3.9 median / 5.03 trimmed (30+ yd removed) / 5.45 mean, 10+ on 17.7% and 20+ on 3.6% of catches (5,105 catches); from the catch event it read 3.2 / 4.62 / 4.99, 15.3%, 3.2%. `scripts/diag/defense-yards/yards.py`, `catchwin.py` and `catchwho.py` now start the NFL catch at `pass_arrived` where present. NFL YAC figures quoted in this file and in `docs/reviews` before this date use the catch event unless they say otherwise, so those gaps are overstated by about half a yard in the mean; the tail (10+, 20+, untouched to +10) is where the excess is. Ball flight by air distance does not differ between the sim and the NFL once both are measured to arrival (0.80 s on the catch-window population). The scorecard's own YAC band (4.53–5.91) comes from nflverse team-season means of the official yards after catch, a different source, and has not been re-derived here.

Standing check since this and the yard-line depth error: a table that states a gap against the NFL names the sim population (teams, seeds, games) and confirms both sides measure from the same reference.

## Pruned after run-ref-16 (2026-11-10)

Seventeen off-by-default flags were deleted from `src`, the stack file, the baseline and [FLAGS](FLAGS.md): their owners named no next step that needs them on develop. Behaviour is unchanged (the fixed-run report is identical before and after). Each is recoverable from git history at `f6fe9bf7`; the sections above and `docs/reviews/` keep their results. Tables earlier in this file that list them as off are the record of that date.

| Flag | Why it went |
|---|---|
| `BLOCK_RELEASE` | No next step; yards flat |
| `ZONE_PAIR` | Caused the inside-zone line step; off since run-ref-2 |
| `STRETCH_TRACK` | Retested −0.39 / −0.29; the back's path was not the gap |
| `GUN_STRETCH_T` | Do-not-enable; built on a mixed reference |
| `MESH_NFL` | Superseded by the later mesh work |
| `BACKSIDE_SHOOT` | Waited on a push contest that never landed |
| `DEEP_NO_FORCE`, `MIDDLE_NO_FORCE` | Expired at review 2; the force question is with the parked run-fit port |
| `CONTACT_PATCH` | Superseded by `GRASP_PATCH` / `HANDS_CHEST` |
| `GRASP_ARMS` | Parked grip-break idea |
| `GRASP_SLIDE`, `GRASP_CLOSURE` | Benched; did not help |
| `WRAP_TWO_POINT` | Rejected; it passes the turn to the runner |
| `ENGAGED_REACH` | Superseded by `BLOCKED_REACH` / `ONE_ARM_HOLD` |
| `HANDS_FRICTION` | Cut pass-protection corner sheds 342 → 217 but over-stiffens the run trench; no lane needs it |
| `THROW_HORIZON`, `UNDER_DEPTH` | No next step |

Removed with them: `test/deep-no-force.test.ts`, `test/throw-horizon.test.ts`, `test/under-depth.test.ts`, the `CONTACT_PATCH` case of `test/contact-layer.test.ts`, and the flag-only diagnostics `scripts/diag/_shootcut.mts` and `scripts/diag/effective-mass/{reach,slide,wrap}-bench.mts`.

## After run-ref-12: the first second, and what is merged off (2026-11-10)

Everything in this section is off.

- **Who moves when at the snap.** Measured by displacement from the snap spot (a 0.3 yd/s onset threshold is the jitter floor on NFL tracking and must not be used), the offensive line is level with the NFL by 0.5 s, the defensive line trails by 0.15–0.2 s, and outside receivers started with the line where NFL receivers start about 0.25 s later.
- **`DL_SNAP_TIME` (Defense, not yet merged).** Down linemen time the count more often and more tightly: interior rushers 0.24 to 0.39 yd by 0.5 s (NFL 0.51), no extra offside on 2,000 snaps.
- **`OL_ON_COUNT`, `REACH_HANDS` (Run Game).** The line's dead snap tick removed, and a level reach blocker handed to the fit. Together OZ interior DL blocked at 1.0 s goes 71% to 76% (NFL 93%), yards neutral, and `OL_ON_COUNT` puts IZ and counter ahead of the NFL at 0.5 s. Held.
- **`WR_SNAP` (Coverage #485).** A receiver split more than 4 yd starts on the ball he sees. Depth by time lands near the NFL's, but sacks rise 30 to 42 on the paired panel; held for the QB's timing.
- **`ENGAGED_REACH` (Flex #484).** An engaged defender's reach from his free shoulder and the blocker's control. It reaches less, not more, and stays off: most blocked men 1–2 yd from the runner are out of reach by anatomy.
- **`GRASP_SLIDE`, `GRASP_CLOSURE` (Flex #475).** A friction-limited grasp. Releasing the weld moves early slip only 1.24 to 1.34 yd/s and moves stuffs and tackler rotation away from the NFL.
- **`CONTACT_LAYER`.** Moves early slip and turn toward the NFL (1.24 to 1.62 yd/s; 36° to 49°) but makes backfield hits stop the runner less and pressure about 0.02 s earlier. Waits for the DL's start to be settled.
- **First contact is squeezed toward the line.** Contact deeper than 2 yd behind the line is 2.3% of our zone runs against the NFL's 11.7%; contact 0–1 yd behind is 27% against 19%, all of it on outside zone (33% against 19%), where 29% of interior DL have no blocker within 1.2 yd at 1.0 s against 7%. The interior DL also aligns 0.90 yd off the ball against 0.71.
- **The second man.** Free defenders rally like the NFL's. Blocked defenders beside the runner reach him less often (26% against 46% from within 2 yd), but the NFL's also stay blocked and close no faster (+0.29 against +0.24 yd/s). A mechanism for coming off a block ([plan](reviews/2026-11-10-blocked-defender-plan.md), piece 2) is not approved and now waits on a per-man check.

## What to do next

Ordered by how much each unblocks. Every measurement below is taken on `npm run ref` and reported with the stack id.

1. **Contact to whistle (Flex, Run Game).** The largest gap, and the reference widens it: a carrier gains 0.6-0.7 yd after a front-on first hit (NFL 2.2-2.6) and a second defender arrives on 62% of contacts (NFL 80%). Three open PRs all touch it and have never been measured together: `ONE_ARM_HOLD` (#412), `HELD_SWING` (#414, merged off) and the grasp-timing fix (#418). #418 removes the same recovery coupling that the retired `WRAP_FOOT` loosened, and `WRAP_FOOT`'s recorded result was adverse (backfield stops 26 -> 20%, NFL 53%), so #418 needs that table rerun on the reference before it merges. One owner, one table: hitterback, pile and stuffbin for off / each / all three.
2. **Inside zone's line step (Run Game).** In the reference 48% of inside-zone lines are stepping one way by 0.6 s; with all flags off it is 83%, NFL 78%. Find which of the zone-track flags does it (`ZONE_ARMS`, `IZ_FLAT`, `LINE_STEP`, `DOUBLE_TRACK` are the candidates) with one-flag removals.
3. **The second level (Run Game, with Defense).** Re-measured on `run-ref-2`: the linebacker reads no longer cost zone yards (1,321 runs, read removed: `RUN_CONFIRM` OZ -0.06 (SE 0.14), IZ +0.00 (0.17), gap +0.28 (0.17); `LB_LINE_FLOW` OZ -0.37 (0.15), IZ +0.08 (0.23)). The cost on `run-ref-1` came through `ZONE_PAIR`'s backward line step. Leave the reads alone. Run Game's measurement (544 zone runs under `npm run ref`): the first lineman reaches a box backer at 2.00 s on IZ and 2.25 s on OZ (NFL 1.40 / 1.60). Two parts: (a) Defense: box backers stand 0.2-0.3 yd deep and come downhill about 0.4 s late (depth at 1.0 s 4.2 vs NFL 3.4; OZ lateral 0.8 vs 1.6 yd); (b) Run Game, the larger part: the zone line never gets vertical (OZ linemen forward at 2.0 s +0.1 to +0.3 yd vs NFL +0.9 to +1.1; 1.5 yd past the line before contact 7-14% vs 42-43%). Run Game is tracing request against achieved for uncovered OZ linemen, which also answers item 4.
4. **Outside zone's edge (Run Game, Defense).** Outside zone is 1.1 yd short and stopped for no gain on 23% (NFL 19%). OL lateral pace at 0.5 s is 1.65 yd/s (NFL 2.25); the reach is still slow. This is `REACH_CARRY`'s open item (loaded acceleration in World, Flex).
5. **Measure the two unmeasured flags or drop them (Defense).** `LB_RUN_THROUGH` and `EDGE_WIDTH` need a same-operator NFL number to go on.
6. **Play-calling flags (Defense, Run Game).** Capture a second matched set under `npm run ref` so `RUN_FORM_PAIR`, `MUG_CALLS`, `NICKEL_FRONTS` and `SHORT_BASE` are exercised, then check formation and front shares against the 2022 shares in their rows.
7. **Pass side (Coverage, QB).** Run Coverage's panel on the reference: `GUN_SNAP` delays every gun drop by about 0.2 s, and `TIGHT_OFF`, `SLOT_LEV`, `ALIGN_HABIT`, `RUN_CONFIRM` and `LB_READ_STEP` all move pass defenders. The four-game check here is too small to clear them.
8. **Re-record the tests on the promoted engine.** The stack is the default; the suites are still pinned to the legacy engine in `vitest.config.ts`. Each lane re-records its files (the list is under Promotion above), removes flags from the pin, and deletes the off paths of flags nobody runs at `0` any more, starting with the retired ones.

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
