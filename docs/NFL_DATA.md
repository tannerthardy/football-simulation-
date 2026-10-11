# Using NFL tracking data to check the sim

The sim should look like NFL football because every part is built right, not
because numbers were tuned to match. NFL tracking data is how we check the
parts. This guide covers the data we have, the one command that compares the
sim with it, and the rules for using the comparison.

## The idea in one paragraph

We measure the same mechanisms in NFL tracking and in sim replays, **with the
same code**. Both are converted to one play format (positions every 0.1 s,
x = yards past the line in the offense's direction), and one metric module
(`scripts/mechanics/metrics.py`) measures both. So a gap between sim and NFL
can only come from the football, never from two different definitions. The
metrics are mechanisms, not final outcomes: handoff timing, how far blocked
linemen get driven, yards before and after contact, top speeds, how close the
rush gets to the QB, separation when the ball arrives.

## Commands

```sh
npm run nfl:fetch                 # download + checksum + extract the archives (one-time, ~10 GB)
npm run mech:nfl                  # re-measure NFL plays (only when metrics.py changes; ~4 min)
npm run mech:sim                  # record 8 sim games (seed 101) and measure them (~3 min)
npm run mech:report               # sim vs NFL table -> out/mechanics/report.md
```

You do **not** need the raw data to run `mech:sim` and `mech:report`: the NFL
side is committed as aggregates in `data/reviews/mechanics/nfl-bdb2022.json`.
Options: `node --import tsx scripts/mechanics/sim-export.ts --seed 7 --games 16`
for a bigger or different sample.

## Reading the report

Each row shows the NFL and sim median, 25th/75th and 90th percentiles. **Shift**
is how far the sim's median is from the NFL's, in units of the NFL's normal
spread (interquartile range). **Tail** is the same for the 90th percentile. The
worse of the two gives the flag: `ok` (< 0.25), `check` (< 0.75), `off`.
The second table repeats the key run metrics per run concept family
(inside zone, outside zone, gap/pull, man/duo, draw), because averages over
all runs can hide opposite problems.

`data/reviews/mechanics/report-baseline.md` (and `sim-baseline.json`) is the
report at the commit that added this system, so you can see what moved.

## Rules

1. **A flag is a place to look, not a number to hit.** When a metric is off,
   watch or trace plays where it happens, find the wrong mechanism (a bad read,
   a bad request, or physics that did not deliver what was asked), and fix
   that. Never change a force, rating or timer just to move the metric.
2. **Check the side effects.** Run the full report before and after a change.
   A fix that moves one metric toward the NFL and two others away is not done.
3. **The guard only protects what already matches.**
   `data/reviews/mechanics/guard.json` lists metrics that already match for an
   understood reason; `mech:report` fails if one of them goes `off`. Add a
   metric when it matches and you know why. Never add one to lock in a wrong value.
4. **Outcomes are the final exam.** Game scores, yards per carry, completion
   rate and explosive-play rates are not targets here. They are checked
   separately (the rushing benchmark, `scripts/calibrate.ts`) and should come
   out right on their own when the mechanisms do.
5. **Add a metric once, for both sides.** Write it in `metrics.py`, add a small
   test in `test/test_mechanics_metrics.py`, re-run `mech:nfl` and commit the
   new aggregate JSON.

## What the first report shows (three 8-game samples)

Matching: handoff timing, yards before contact, top speeds of backs, tight ends
and receivers, linebacker/QB/TE acceleration.

Biggest gaps, each a mechanism to investigate:

| Area | NFL | Sim | Likely question |
|---|---|---|---|
| All runs: furthest engaged DL driven back at 3 s (90th pct) | 2.5 yd | 4.1-4.4 yd | Why don't defenders re-anchor once a blocker wins? (Inside zone median 1.6-3.1 yd vs 1.1.) |
| Outside zone run yards (median / 90th pct) | 3 / 10 | 4.4-5.6 / 15-21 | What breaks on the edge? |
| Gap/pull run yards and yards after contact (medians) | 3 / 2.5 | 0.4-0.8 / 0.9-1.2 | Why do power/counter/trap die at the line? |
| Engaged box defenders at 1 s (median, negative = penetrating) | -0.6 yd | -0.3 yd | Is DL get-off too passive? Rusher speed at 0.5 s is also low. |
| Deceleration peaks (QB, OL, WR, RB), medians | 2.5-3.6 yd/s² | 3.7-5.6 yd/s² | Do players stop too abruptly (QB at the end of the drop, OL, cuts)? |
| QB depth at throw (25th-75th pct) | 6.1-8.3 yd | 7.2-7.9 yd | Most QBs drop to the same depth. |
| Pressure within 2 yd before the throw | 30% | 19-27% | The rush rarely gets home. |

Ranges cover seeds 101 and 202 at commit 0f90363 and seed 101 at the commit
that added this guide. Generated teams and small samples move medians
(the inside-zone drive median differs by 1.5 yd between seeds), so confirm a
gap with a second seed before acting on it.

## The data we have

| Dataset | Season | What it covers | Use it for |
|---|---|---|---|
| Big Data Bowl 2025 (`bdb2025-2022`) | 2022, weeks 1-9 | Every play, all 22 players, 10 Hz, plus PFF run concepts, coverages and per-player block assignments | **The main mechanism reference** (this report) |
| Big Data Bowl 2026 (`bdb2026-2023`) | 2023, 18 weeks | Selected pass plays, selected players | Routes, separation, ball in the air |
| Big Data Bowl 2023 (`bdb2023-2021`) | 2021, weeks 1-8 | Pass plays with PFF pass-blocking labels | Pass protection and pressure |
| Big Data Bowl 2019 (`bdb2019-2017`) | 2017, weeks 1-6 | All 22 players, 91 games | A second, older season to confirm findings |
| Big Data Bowl 2027 (Kaggle) | 2023-2025 | Combine drills and selected game trajectories for draft prospects | Individual movement abilities |
| nflverse play-by-play | 2022-2023 | Every play's outcome and situation | Outcome distributions (the final exam) |

`npm run nfl:fetch -- --list` shows the downloadable archives;
`npm run nfl:fetch -- bdb2025-2022` fetches one. Archives are checked against
`data/sources.json` before extraction. Raw data stays in ignored `data/raw/`;
only aggregates go in Git. Kaggle sets need `KAGGLE_API_TOKEN` in the cloud
environment's secrets (it is read at session start) and use
`scripts/data/download_kaggle.py`. See [the data guide](../data/README.md) for
licensing and provenance.

## Worth adding next

1. **Tackling labels.** Big Data Bowl 2024 (Kaggle `nfl-big-data-bowl-2024`)
   has tackles and missed tackles for the same 2022 games. With them we can
   measure tackle success by approach angle and speed, and how far carriers
   drag tacklers: direct checks of the tackle physics.
2. **Block assignments.** BDB 2025's `player_play.csv` names who each blocker
   blocked. Using real pairs instead of "nearest lineman" would sharpen the
   drive-block metrics and allow block duration and win rates.
3. **Matched situations.** Split metrics by down/distance and box count, as
   the rushing benchmark does for outcomes.
4. **Pass rush and routes.** Time for a rusher to get within 2 yd of the QB;
   route break sharpness (speed lost at the break) from BDB 2026.

## Limits

- Positions only: tracking has no forces, so physics is checked through the
  motion it produces.
- "Engaged" means a box defender within 1.5 yd of an offensive lineman, the
  same proxy on both sides.
- Event timing differs slightly: NFL events are annotated by people, sim
  events come from the engine.
- The sim uses generated rosters and its own play calling. Sim EDGE players
  count as DL, while NFL 3-4 outside linebackers count as LB; box metrics use
  alignment, not labels, so they are unaffected.
- Positions are quantized to 0.1 yd on both sides (as the sim records them),
  so derived accelerations carry the same noise.
