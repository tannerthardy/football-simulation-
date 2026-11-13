# Roadmap and status

This tracks what is built, how close the output is to real football, and
what comes next. The design these phases implement is in
[DESIGN.md](DESIGN.md).

The implementation program is in [REALISM_PLAN.md](REALISM_PLAN.md), with
proposed contracts, modeling work packages, validation gates, and a first
implementation backlog. The [engine review](../reviews/2026-10-08-engine-review.md)
records reproduced defects and measurement limitations. “Done” below means a
component exists; it does not establish full empirical validation.

The [run blocking and decision update](../reviews/run-blocking-and-decision-update.md)
records the changes after `2c825eb`: dynamic attention and commitment, observed
stance/facing, secured combination exchanges, complete zone ownership, lead
pacing and carrier shoulder turning. Its two-roster paired matrix shows mixed
results. Outside zone and power regressions and excessive inside-zone gains
remain review/calibration blockers.

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
[data/README.md](../../../data/archive/catalog-2026-10-11.md) for source provenance and analysis scope.

## Calibration status

The current run-game mechanisms and evidence are in
[run-game-coordination.md](../reviews/run-game-coordination.md). Power/Counter
execution improves in controlled scenarios, but zone explosiveness, roster/front
variation and pass-protection regressions keep the development PR draft.


Latest check (`claude/engine-priorities`, 32 games, `npm run calibrate -- 32 7`),
after the protection, pocket, clock and contact work in
[error-budget-and-protection.md](../reviews/error-budget-and-protection.md):
points 36.8 per team-game, 13.8 drives per team-game (NFL 10.5), 2.54 points
per drive (NFL 2.00), 66 scrimmage plays per team-game, rush yards per carry
4.8, run stuffs 17%, 10+ yard runs 10.8%, 3rd-down conversion 41%, punts 4.4,
sack rate 4.9%, yards per attempt 9.7, YAC per reception 6.6, separation at the
catch 4.2 yd. Run carriers and receivers now take NFL-like time and yards after
first contact. The error budget's largest component by far is yards per
completion (+0.72 points per drive of a +0.82 gap): coverage is too loose.

Before reading this table, see [EVALUATION_ENVIRONMENT.md](EVALUATION_ENVIRONMENT.md):
league aggregates mix engine execution with play-calling and roster selection.
The plan's baseline measurements found trap and counter on 27% of simulated
runs versus 8.5% in the NFL; these are historical calling measurements.

Historical snapshot at `2c825eb`, before the run blocking/decision update:
64 games over eight independently generated leagues
(`npm run calibrate -- 64 7`), official plays only — plays wiped out by an
accepted foul are excluded, and a catch or run that ends in a lost fumble is
credited to the fumble spot. Rules and accounting defects from the review are
fixed (see `test/game-rules.test.ts`); cohort mismatches still limit some
comparisons. The ranges mix generic harness targets with dataset
measurements; the realism plan replaces them with explicit versioned cohorts
before further outcome tuning.

| Metric | Sim | NFL | |
|---|---|---|---|
| Points / team-game | 35.7 (30.7–43.8 by league) | 21–23.5 | high |
| Yards / attempt | 9.3 | 6.8–7.2 | high |
| Completion % | 66.8% | 63–66% | ~ok |
| Sack rate | 10.9% (6.0–15.0% by league) | 6–7.5% | high, roster-sensitive |
| INT rate | 3.9% | 2–2.5% | high |
| Time to throw | 2.46 s | 2.6–2.75 s | low |
| Pressure rate | 25% | ~33% PFF labels | definitions differ |
| Scramble rate | 4.2% | 4% | ok |
| Rush yards / carry | 4.66 (3.84–5.58 by league) | 4.48 | ~ok |
| Run stuff rate | 41% | 18% | high |
| 10+ yard runs | 13.9% | 10–12% | high |
| 3rd-down conversion | 34.0% | 37–41% | low |
| Separation during target catch contests | 3.91 | 3.04 selected arrival cohort | cohorts differ |
| Tight-window catch-contest sample | 4.9% | 13–17% all-throw harness range | cohorts differ |
| QB reads coverage family right | 66% | — | |
| Missed + broken tackles / play | 0.18 | 0.11–0.16 | high |
| Pass rate | 73% | 56–62% | high |

League-to-league spread is large: the same engine gives 3.84 yards per carry
with one set of generated rosters and 5.58 with another, and sack rates from
6.0% to 15.0%. Real teams vary far less, so the trench model amplifies talent
gaps; one league is not a reliable calibration sample.

## Known gaps, in priority order

1. **Measurement.** The reproduced down, penalty, fumble, clock and
   overtime defects are fixed with scenario tests, and official statistics
   come from the accepted play only. Still to do: align cohorts before
   tuning, record separation for all attempts, distinct pressure metrics,
   and rule paths not yet modeled (pass interference, fouls on returns,
   loose balls through the end zone).
2. **Run game.** Yards per carry, stuffs and 10+ yard runs are now in or near
   the NFL range: tackles take NFL-like time and yards after first contact
   (graded grasp, balance, forward progress). Backs still reach first contact
   too soon (1.0 s after the handoff vs. 1.6 s). Earlier notes: defenders
   now read run from cues and keep their gaps instead of chasing the carrier
   from a fixed read time, which brought the
   average in range, but outcomes are bimodal: 41% stuffs (unblocked or
   quickly shed linemen — reach blocks on 3-techniques) and too many 10+
   yard runs, not enough 2–5 yard runs. The new carrier reads teammate
   obstruction and can abandon a closed design, but reach/cutback geometry
   and pull-to-fit timing still need validation. See the paired update for
   current scheme-level regressions. Play-action protection gives up too many sacks.
3. **Passing efficiency.** High YPA, aDOT, TD and INT rates require coordinated
   protection, coverage and QB-policy work. Validate separation/tight-window
   cohorts before changing defender speed or catch probabilities.
4. **Coverage rules.** Zone defenders play spot drop ("country" zone) or
   pattern-match per call, by coach tendency (`scripts/zone-style-lab.ts`
   compares them concept by concept). Named match rules and checks — Cover 3
   Rip/Liz, quarters MOD/MEG and two-read, trips Poach, banjo — aren't built
   yet, so Flood beats match Cover 3 more than spot drop (the curl-flat
   "sink" rule is missing). Several deep concepts gain too much against both
   techniques (Flood vs Cover 2, Dagger vs Cover 4).
5. **Pressure timing.** Edge rushers are now blocked (cut-off sets, declared
   protection) and pressure arrives on NFL timing (p10/p50 1.8/2.4 s vs.
   1.9/2.7 s), but rushers who win arrive free instead of lingering on a
   blocker, so sacks per pressure stay high. Slides, back scans, hot answers
   and 4i inside priority are not built.
6. **Play calling.** Pass rate is inflated; situational tendencies by down,
   distance and field zone are now measured from 2022–23 data but not yet
   used by the coordinators.
7. **Route nuance.** Releases vs press, stemming to leverage, coverage
   adjustments (seam bend vs single-high) are still simple.
8. **Missing concepts.** Screens, RPOs, stunts and twists, OPI/DPI.
