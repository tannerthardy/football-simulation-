# The run-game reference stack

One combination of experimental flags that Run Game, Defense, Flex and Coverage all measure against. Before this, each agent tested on its own mix (the FLAT_PRESS / ZONE_RUN back-and-forth on 2026-11-09 came from two different flag sets), and no list of anyone's stack existed in the repository.

- **The stack:** [`config/reference-stack.json`](../config/reference-stack.json), id `run-ref-17`. `run-ref-2` (2026-11-09) is `run-ref-1` with `ZONE_PAIR` off; the Results tables below are `run-ref-1`. Every flag the source reads as `=== '1'` is listed as `on`, `off` or `retired`; `npm run ref` fails if the file and `src` disagree.
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

## Whose teams the measurements are (2026-11-10)

Every diagnostic game was "Ironmen" (IRN) against "Comets" (COM). A team's alignment style (`alignStyle`) is seeded from its abbreviation and `ALIGN_HABIT`'s personal habits from player ids, so the same two defences' habits repeated in every game whatever the seed: safety depth −1.33 yd (IRN) and −0.68 (COM), corner depth −0.47 and +0.65, receiver room 0.11 and 1.22, line width −0.033 and −0.07, passing strength 0.41 and 0.49, A-gap 0.72 and 0.84. Both play shallow safeties. NFL teams differ like this (team medians sd 0.85), so the habit is realistic; sampling the same two was not.

Rules + Coaching #527 gives diagnostic games per-seed team identities (`withIdentity(team, salt)`: ids salted, rosters, ratings and coaching unchanged) in the pass-panel capture, `sim-export` and the scorecard league.

- **The fixed 1,321-run set is not recaptured.** It is still IRN against COM with those habits (`capture-runs --sample-league` is opt-in, off). Paired flag-on / flag-off reads on it are unaffected; any absolute comparison with the NFL that depends on alignment depth is a two-team sample.
- Effect of league sampling (16 games, seeds 101–116, run-ref-16): measured shell 0/1/2-high 18 / 51 / 32% → 12 / 48 / 40% (NFL 9 / 45 / 47); one-high deepest defender 12.1 → 13.6 yd (14.4); cushion at the throw +6.6 → +7.2 (+8.9).
- **Yards after catch did not move:** 8.83 → 9.25 a catch (NFL 5.00), first contact on 77 → 78% of catches. The excess is not the two teams' safeties.
- Still open after the fix: on called two-high coverages the second safety is about 2.4 yd shallow (9.2 against 11.6), from the calls, not habits.

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
