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

## Calibration against NFL baselines

20 games, seed 7 (`npm run calibrate -- 20 7`). Targets are approximate
recent league averages.

| Metric | Sim | Target | |
|---|---|---|---|
| Points / team-game | 49.7 | 21–23.5 | high |
| Scrimmage plays / team-game | 76.9 | 61–65 | high |
| Completion % | 65.9% | 63–66% | ok |
| Yards / attempt | 10.9 | 6.8–7.2 | high |
| Sack rate | 9.7% | 6–7.5% | high |
| INT rate | 3.4% | 2–2.5% | high |
| 20+ yd completions / att | 17.7% | 7–9% | high |
| aDOT | 10.0 | 7.5–8.5 | high |
| YAC / reception | 8.6 | 4.8–5.6 | high |
| Time to throw | 1.97 s | 2.7–2.9 s | low |
| Pressure rate | 32% | 28–36% | ok |
| Scramble rate | 0.2% | 3–5% | low |
| Rush yards / carry | 3.05 | 4.1–4.5 | low |
| Run stuff rate | 31.7% | 16–20% | high |
| Pass rate | 78% | 56–62% | high |
| 3rd-down conversion | 35.7% | 37–41% | low |
| FG % | 90% | 83–87% | high |
| Missed tackles / play | 0.21 | 0.1–0.2 | high |

Honest reading: the pieces behave plausibly in isolation (trench win rates,
open-field tackle success, separation by route and coverage), but the
passing game is too efficient as a whole and the run game too weak, and the
coordinators then lean into passing, which compounds it.

## Known gaps, in priority order

1. **Passing efficiency.** Two-high coverages leave the 10–19 yd windows too
   open (separation 6.5–8 yd vs. Cover 2/4/6); deep completion rate is ~67%
   against an NFL ~38%; YAC after catches in space is still long-tailed.
2. **Time to throw.** Too fast (1.97 s). Stems run at full effort and the QB's
   first read is too often open on rhythm.
3. **Run game.** Too many stuffs, too few yards before contact; zone
   track/cut decisions and second-level blocking need work.
4. **Play calling.** Pass rate is inflated by the in-game learning bandit
   rewarding the overpowered passing game; this should settle once passing is
   fixed, but needs a prior toward balance.
5. **Scrambles.** QBs almost never scramble; the scramble trigger needs lanes
   that open as rushers widen.
6. **Missing concepts.** Screens (no behind-the-line throws today), RPOs,
   stunts and twists, OPI/DPI, roughing.
7. **Awareness layer.** Field-of-view limits and attention (which threats a
   player is actually looking at) exist only partially, via perception lag
   and pursuit; a full attention model is designed but not built.
