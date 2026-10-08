# Roadmap and status

This tracks what is built, how close the output is to real football, and
what comes next. The design these phases implement is in
[DESIGN.md](DESIGN.md).

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
| Big Data Bowl 2026 (2023 season, all pass plays) | Coverage mix by situation, outcomes by coverage / route / depth, time to throw, separation at throw and arrival, closing in flight, ball flight times, skill-player speed and acceleration | `scripts/data/bdb2026.ts` |
| Big Data Bowl 2025 (2022 season wk 1–9, every play, all 22) | Run outcomes by concept, handoff and time to LOS, yards before contact, pressure rate and timing, rush counts, pressure allowed per blocker, pocket depth, line and run-play kinematics, situational tendencies | `scripts/data/bdb2025.ts` |
| Big Data Bowl 2019 public release (2017 season) | One game of full tracking, 91 games of play-level data | `scripts/data/bdb2017.ts` |
| nflverse Next Gen Stats and combine | League separation/cushion/time-to-throw averages; measurable distributions by position | (ad hoc) |

`scripts/kinematics-compare.ts` measures simulated games exactly the way the
tracking was measured and prints them side by side.

## Calibration status

16 games (`npm run calibrate -- 16 7`). Movement now tracks the real data
closely: per-play top speeds and accelerations by position, QB drop depth,
ball flight times by distance and handoff timing are all within a few percent
of the tracking. Outcomes still aren't there:

| Metric | Sim | NFL | |
|---|---|---|---|
| Points / team-game | 35.4 | 21–23.5 | high |
| Yards / attempt | 9.0 | 6.8–7.2 | high |
| Completion % | 66.9% | 63–66% | ~ok |
| Sack rate | 8.3% | 6–7.5% | high |
| INT rate | 3.8% | 2–2.5% | high |
| Time to throw | 2.48 s | 2.6–2.75 s | low |
| Pressure rate | 23% | 33% | low |
| Scramble rate | 5.0% | 4% | ok |
| Rush yards / carry | 2.95–4.2 (varies by build) | 4.48 | low |
| Run stuff rate | 39% | 18% | high |
| Separation at arrival (all targets) | 3.85 | 3.04 | high |
| Tight-window throws | 4.8% | 13–17% | low |
| QB reads coverage family right | 73% | — | |
| Missed + broken tackles / play | 0.17 | 0.11–0.16 | ~ok |
| Pass rate | 76% | 56–62% | high |

## Known gaps, in priority order

1. **Run game.** Averages are close on good builds, but outcomes are bimodal:
   too many stuffs from unblocked or quickly shed linemen (reach blocks on
   3-techniques, backside pursuit on counter), not enough 2–5 yard runs.
   Backs don't cut back off a lost reach yet.
2. **Passing efficiency.** Zone defenders still give too much room at the
   catch (3.9 vs 3.0 yd), and QBs almost never throw into tight windows, so
   the throws that are made are too open; INTs come from misreads instead.
3. **Pressure timing.** Pressure is rarer than real but arrives earlier when
   it comes (2.1 s vs 2.7 s): some rushers still get free too fast.
4. **Play calling.** Pass rate is inflated; situational tendencies by down,
   distance and field zone are now measured from 2022–23 data but not yet
   used by the coordinators.
5. **Route nuance.** Releases vs press, stemming to leverage, coverage
   adjustments (seam bend vs single-high) are still simple.
6. **Missing concepts.** Screens, RPOs, stunts and twists, OPI/DPI.
