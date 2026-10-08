# Roadmap and status

This tracks what is built, how close the output is to real football, and
what comes next. The design these phases implement is in
[DESIGN.md](DESIGN.md).

The implementation program is in [REALISM_PLAN.md](REALISM_PLAN.md), with
proposed contracts, modeling work packages, validation gates, and a first
implementation backlog. The [engine review](reviews/2026-10-08-engine-review.md)
records reproduced defects and measurement limitations. “Done” below means a
component exists; it does not establish full empirical validation.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0. Foundations | Seeded forkable RNG, vectors, field geometry, units | Done |
| 1. Player model | Measurables → physical profile (sprint curve, braking, cutting, turn rate, reach, reaction), ratings, archetypes, roles and role suitability | Done |
| 2. Physics core | Traction-ellipse movement, time-to-reach and intercept, 3D ball flight with drag, throw solver | Done, unit-tested |
| 3. Playbook | Personnel groupings, 17 formations, route tree, 17 pass concepts, 10 run concepts, 6 fronts, 8 coverages, 6 pressures, defensive alignment that adapts to formation strength | Done |
| 4. Play simulation | Perception lag, QB reads and throw windows, route running, man/zone coverage, catch contests, ball-carrier vision, trench model, pursuit and tackling, fumbles | Built; calibration in progress |
| 5. Game layer | Drives, clock, timeouts, two-minute warning, overtime, special teams (physics kicks, 2025 kickoff), 4th-down and 2-point decisions, pre-snap penalties and holding, fatigue and rotation, coordinators with in-game learning, box score | Built; calibration in progress |
| 6. Replay viewer | All-22 top-down playback of a recorded game | Done (`npm run replay`) |
| 7. League | 32 teams, rosters and depth charts, contracts and cap, draft and scouting, development and aging, injuries, season and playoffs | Not started |
| 8. Manager UI | Team management, scouting, game planning, in-game coaching | Not started |

## Data sources

Calibration targets come from real tracking and play data; only aggregates
are committed (`data/*.json`), never the raw files.

| Source | What it gives | Extractor |
|---|---|---|
| Big Data Bowl 2026 (2023 season, supplementary pass labels and selected player trajectories) | Coverage mix and route/depth outcomes; prethrow motion and selected postthrow movement. Separation/closing require matched player subsets | `scripts/data/bdb2026.ts` |
| Big Data Bowl 2023 (2021 season wk 1–8) | Protection roles, blocker opponents, block codes, beaten-blocker and hit/hurry/sack labels; tracking extends shortly beyond release | `scripts/data/bdb2023.py` (labels only) |
| Big Data Bowl 2027 (draft and game seasons 2023–2025) | Linked combine results/drill tracking, selected-player game motion and labels, career outcomes for a 510-player cohort | `scripts/data/bdb2027.py` (metadata/labels/combine coverage) |
| Big Data Bowl 2025 (2022 season wk 1–9, every play, all 22) | Run outcomes by concept, handoff and time to LOS, yards before contact, pressure rate and timing, rush counts, pressure allowed per blocker, pocket depth, line and run-play kinematics, situational tendencies | `scripts/data/bdb2025.ts` |
| Big Data Bowl 2019 public release (2017 season) | 91 tracking games available; current summary analyzes one tracking game and all play-level metadata | `scripts/data/bdb2017.ts` |
| nflverse Next Gen Stats and combine | League separation/cushion/time-to-throw averages; measurable distributions by position | (ad hoc) |

`scripts/kinematics-compare.ts` prints exploratory comparisons. Player selection,
position grouping, smoothing, recorded precision, endpoints and censoring must
be aligned before these become validated tuning targets. See
[data/README.md](../data/README.md) for source provenance and analysis scope.

## Calibration status

Snapshot: 32 games over four independently generated leagues
(`npm run calibrate -- 32 7`), official plays only — plays wiped out by an
accepted foul are excluded, and a catch or run that ends in a lost fumble is
credited to the fumble spot. Rules and accounting defects from the review are
fixed (see `test/game-rules.test.ts`); cohort mismatches still limit some
comparisons. The ranges mix generic harness targets with dataset
measurements; the realism plan replaces them with explicit versioned cohorts
before further outcome tuning.

| Metric | Sim | NFL | |
|---|---|---|---|
| Points / team-game | 33.9 | 21–23.5 | high |
| Yards / attempt | 9.5 | 6.8–7.2 | high |
| Completion % | 67.1% | 63–66% | ~ok |
| Sack rate | 11.0% (6.7–15.7% by league) | 6–7.5% | high, roster-sensitive |
| INT rate | 3.8% | 2–2.5% | high |
| Time to throw | 2.41 s | 2.6–2.75 s | low |
| Pressure rate | 29% | ~33% PFF labels | definitions differ |
| Scramble rate | 4.2% | 4% | ok |
| Rush yards / carry | 3.28 (2.35–4.03 by league) | 4.48 | low |
| Run stuff rate | 32% | 18% | high |
| 3rd-down conversion | 34.7% | 37–41% | low |
| Separation during target catch contests | 3.76 | 3.04 selected arrival cohort | cohorts differ |
| Tight-window catch-contest sample | 4.0% | 13–17% all-throw harness range | cohorts differ |
| QB reads coverage family right | 69% | — | |
| Missed + broken tackles / play | 0.16 | 0.11–0.16 | ~ok |
| Pass rate | 75% | 56–62% | high |

League-to-league spread is large: the same engine gives a 6.7% sack rate
with one set of generated rosters and 15.7% with another. Real team sack
rates vary far less, so the trench model amplifies talent gaps; one league is
not a reliable calibration sample.

## Known gaps, in priority order

1. **Measurement.** The reproduced down, penalty, fumble, clock and
   overtime defects are fixed with scenario tests, and official statistics
   come from the accepted play only. Still to do: align cohorts before
   tuning, record separation for all attempts, distinct pressure metrics,
   and rule paths not yet modeled (pass interference, fouls on returns,
   loose balls through the end zone).
2. **Run game.** Outcomes are bimodal:
   too many stuffs from unblocked or quickly shed linemen (reach blocks on
   3-techniques, backside pursuit on counter), not enough 2–5 yard runs.
   Backs don't cut back off a lost reach yet.
3. **Passing efficiency.** High YPA, aDOT, TD and INT rates require coordinated
   protection, coverage and QB-policy work. Validate separation/tight-window
   cohorts before changing defender speed or catch probabilities.
4. **Pressure timing.** In the reviewed geometric-proximity diagnostic, fewer
   pressure events occur but their median arrival is earlier. Diagnose missed
   assignments and release censoring before changing global rush capability.
5. **Play calling.** Pass rate is inflated; situational tendencies by down,
   distance and field zone are now measured from 2022–23 data but not yet
   used by the coordinators.
6. **Route nuance.** Releases vs press, stemming to leverage, coverage
   adjustments (seam bend vs single-high) are still simple.
7. **Missing concepts.** Screens, RPOs, stunts and twists, OPI/DPI.
