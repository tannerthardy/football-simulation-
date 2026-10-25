# Final 8-game rushing tail and native Duo witness

Frozen production source: `8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`. No production code was changed for this audit. The read-only harness repeats the existing `scripts/calibrate.ts 8 7 2` game, league, roster and seed selection and copies existing play logs and pre-run input metadata. All 997 official scrimmage plays map to their native input. All 328 official runs finish naturally. The 78 nullified runs are retained in the raw packet and excluded from official outcomes.

The prior plain calibration and observed rerun agree to every printed precision checked: 41.88 points/team-game, 7.27 YPC, 17.38% stuffs, 15.24% runs of 10+ yards, 1.49 YBC and 10.61 passing YAC. This is an aggregate neutrality check for all eight games, not a duplicate full eight-game endpoint/RNG test. The narrower Game 2 replay below does establish exact complete game-log and target-result neutrality.

## The broad guard is still adverse

The final source's YPC is higher than the prior coverage-only phase's 5.12 and the immutable baseline's 6.95. The fixed ordinary 160-run panel improves to 2.53 YPC, with no 20+ runs, but those inputs do not represent the dynamic full-game call and roster mix. Do not tune the physics or a gain multiplier to reconcile those aggregate means.

The final full-game distribution is dominated by a long tail:

| Official run band | Runs | Mean yards |
| --- | ---: | ---: |
| Below 10 yards | 278 | 2.48 |
| 10–19.99 yards | 28 | 14.11 |
| 20–39.99 yards | 7 | 34.32 |
| 40+ yards | 15 | 70.81 |

The median run is 2.60 yards. Fifteen 40+ runs account for 1,062.2 of 2,386.03 rushing yards (44.5%). The ten largest runs account for 32.6% of all rushing yards; the remaining 318 average 5.06. Excluding the twenty largest leaves 3.69. This is more than one unlucky outlier, but it is not uniformly dominant run blocking either.

Thirteen of fifteen 40+ runs contain at least one missed/broken tackle. The two largest have no recorded first contact, miss or broken tackle: a 90.6-yard Duo (Game 2, P100) and an 83.3-yard Trap (Game 6, P27). These are especially useful approach/assignment witnesses because they do not require interpreting grip strength or balance after contact. Recorded YBC exists for 324/328 runs, with a 0.60-yard median and 1.49-yard mean; absence of contact must not be filled with zero.

The tails are concentrated in a generated roster and matchup mix. League 0 averages 8.68 YPC with twelve 40+ runs; league 1 averages 5.61 with three. League 0's PIL-RB1 runs 84 times for 12.61 YPC and nine 40+ gains. COM-RB1 runs 78 times for 5.72 YPC and three 40+ gains. These are separate generated leagues: repeated team/player names across leagues must not be treated as the same profiles. The raw packet stores initial leagues and per-game roster hashes, and every before/after roster hash agrees.

| Concept | Runs | Mean yards | 20+ gains | 40+ gains |
| --- | ---: | ---: | ---: | ---: |
| Inside zone | 54 | 8.62 | 4 | 3 |
| Outside zone | 50 | 11.03 | 5 | 3 |
| Wide zone | 43 | 10.52 | 4 | 3 |
| Duo | 32 | 8.00 | 2 | 2 |
| Trap | 39 | 8.21 | 4 | 3 |
| Power | 45 | 1.95 | 1 | 0 |
| Counter | 32 | 2.28 | 0 | 0 |
| Split zone | 6 | 12.47 | 1 | 1 |
| Draw | 17 | 5.33 | 1 | 0 |
| Toss | 10 | 1.45 | 0 | 0 |

All four lost-fumble flags are explicitly retained: G1/P53 (2.05 yd), G3/P61 (16.96), G7/P117 (4.95) and G7/P175 (15.83, defensive touchdown). There are 23 touchdown text flags on run logs, but only 22 offensive touchdowns; the defensive return must not inflate offensive rushing TDs. The data does not censor natural long runs or their endpoint gains.

## Exact first-controller reproduction

Reproduce Game 2 with game seed `3627243488`, snap seed `3438958840`, initial league 0 rosters from `games-final-tail-audit.json.gz`. The selected play is Gun Trey (TE attached) — Duo against 4-3 Over Cover 1 Off + Nickel Edge (shows Cover 2), dime personnel, 3rd-and-13 at own 9.4. It ends in a 90.6-yard touchdown at 13.45 s. The native witness copies only already requested QB/RB pictures, actual movement commands and actual World step/contact reports. Its **complete score, log and quarterScores hash matches** the first exact-game rerun, and its raw target gain/outcome/duration/turnover match exactly.

LB_M is assigned to the RB in man coverage. It owns an installed **B-gap, +y insertion** contract, with attack technique and spill/stack policy. The handoff is at 1.05 s and the LB commits to a run belief at 1.25 s. This belief is not a possession observation: `Recognition` adds a handoff cue after a personal delay based on the global handoff flag, and the recorded personal picture has no possession channel. Body facing also does not establish eye direction.

`ManCoverage.update` only executes the fit before the RB is past LOS if the defender both believes run **and sees his assigned receiver blocking**. Its assigned receiver is the ball carrier, so that blocking gate stays false. Off-man tracking still maintains an advancing receiver cushion:

| Time | LB requested x velocity | LB x | RB actual x | LB's acquired RB x / x velocity |
| --- | ---: | ---: | ---: | --- |
| 1.25 s | −4.82 | 24.13 | 15.17 | 15.00 / +0.63 |
| 1.60 s | **+0.51** | 23.49 | 16.30 | 16.23 / +3.23 |
| 2.00 s | **+5.29** | 23.24 | 18.07 | 17.97 / +4.27 |
| 2.25 s | **+7.20** | 23.39 | 19.22 | 19.30 / +4.90 |
| 2.30 s | −2.04 | 23.44 | 19.45 | **19.47 > LOS 19.40** / +4.56 |

The first positive downfield request after the run read is at 1.60 s; the LB is retreating ahead of its downhill running assignment. At 2.30 s the acquired carrier first clears the LOS, enabling live pursuit. This is a concrete transition/gate problem to reproduce next, rather than evidence for a stronger defender or a general pursuit oracle. Before a crease declares, the installed insertion job keeps a landmark around LOS+1.5; subsequently observed carrier motion can permit attacking the declared crease. A repair should preserve mistaken reads and real block interference, and should use the defender's own motion/mesh evidence rather than the hidden offensive concept or instant confirmed possession.

Actual contact is absent. Across all 269 observed World steps there is no RB body-contact report, non-null first-contact position or wrap/hit/missed/broken tackle event. The closest sampled defender center distance is 1.54 yd for a DT still engaged with a guard. The free LB's closest approach is 2.47 yd at 2.90 s; the nickel reaches 1.89 yd at 4.05 s. There is no contact load on the runner to diagnose. FS remains read=`pass`, follows a receiver initially, and later pursues once the RB is seen past LOS; that is another future recognition/transition witness, not an extra controller change made during this audit.

No counterfactual repair was tested. This selected witness does not prove that its touchdown should be prevented or establish a bust rate. Legitimate player speed differences, blocks, imperfect reads and runner cuts must remain winning controls. The conclusion is narrower: one long untouched native run contains a demonstrable assignment-to-fit transition worth fixing before increasing physics detail.

## Receipts and limits

- `games-final-tail-receipt.json` pins source, tools, raw packets, summary outputs, logs and original plain calibration receipts.
- `games-final-tail-audit.json.gz` includes complete game logs and initial league rosters; `games-final-tail-summary.json` includes exact concept/front/coverage/formation/runner grouping, tails and adverse outcomes.
- `game2-duo-tail-witness.json.gz` includes actual native commands, acquired pictures and World contacts; `game2-duo-tail-summary.json` extracts the first command, cue and contact witnesses.
- Starting inputs are matched, but full-game calls/populations diverge across production phases. No aligned-snap causal explanation for v4→final can be obtained from the aggregate logs, and this audit did not rerun every phase.
- The small generated cohort establishes controlled evidence for the next repair, not NFL prevalence or a general physical capability ceiling. The archived calibration wall times are not matched performance benchmarks.
