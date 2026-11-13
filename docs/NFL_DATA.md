# Using NFL tracking data to check the sim

The sim should look like NFL football because every part is built right, not
because numbers were tuned to match. NFL tracking data is how we check the
parts. This guide covers the data we have, the one command that compares the
sim with it, and the rules for using the comparison.

## The idea in one paragraph

We measure the same mechanisms in NFL tracking and in sim replays, **with the
same code**. Both are converted to one play format (positions every 0.1 s,
x = yards past the line in the offense's direction), and one metric module
(`scripts/mechanics/metrics.py`) measures both. Shared definitions remove one
avoidable source of disagreement. Event annotation, inferred contacts, the
available tracking window and the roster/call mix can still differ. The
metrics are mechanisms, not final outcomes: handoff timing, how far blocked
linemen get driven, what contact does to a ball carrier, tackle speed and
angle, pass protection, route separation, the ball in the air, top speeds.

Four NFL seasons are measured: 2022 is the reference (every play, all 22
players, with PFF labels), and 2017, 2021 and 2023 are shown beside it so you
can see whether a number is stable across seasons before trusting it.

For legality, use [the NFL rules contract and coverage register](NFL_RULES.md).
Tracking proximity, interposition, duration or synthesized film facing cannot
certify holding, blindside/head contact or a legal catch. Match the rule edition
to the question: 2022 motion evidence is not automatic 2026 legal precedent.
Keep decisive native facts and unsupported branches explicit in the existing
review, without an extra query or full-game requirement.

For body rotation versus travel-direction change, use the separate
[versioned turning measurement contract](reviews/turning-measurements.md).
Its elapsed-time, eligibility and excursion-sensitivity rules qualify what a
turning observation can establish; historical yaw reports retain their definitions.

## Commands

For routine football investigations, start with the
[NFL evidence agent plan](reviews/nfl-agent-evidence-plan.md): reuse a relevant
saved NFL comparison, inspect the native cause, and test the smallest correction
with the same reference and opposing control. It maps existing operators to
owners and identifies the data-host handoff. It proposes a practical loop,
not a new mandatory benchmark or permission to activate experimental behavior.

The commands below build archives/reference tables or collect a broad sim
sample. They are **not required per investigation or patch**. Reuse existing
converted rows and query where the verified data already lives; return the
small result and its provenance rather than downloading another archive.

For a small complete run-sequence comparison, use the
[fixed-identity run mechanism guide](reviews/run-mechanism-reference.md).
It follows useful blocker geometry through runner arrival, lateral movement,
second-level access, pursuit and contact while preserving stored velocity,
missing samples, early defensive wins and known endings. Its bounded NFL query
uses the existing 12-run selection; source-specific contact/load evidence stays
separate. Check the access receipt before assuming a host-local raw path exists.

```sh
npm run nfl:fetch                 # download + checksum + extract the archives (one-time, ~12 GB)
npm run mech:nfl                  # re-measure all four NFL seasons (only when metrics.py changes; ~10 min)
npm run mech:sim                  # record 8 sim games (seed 101) and measure them (~3 min)
npm run mech:report               # sim vs NFL table -> out/mechanics/report.md
```

You do **not** need the raw data to run `mech:sim` and `mech:report`: the NFL
side is committed as aggregates in `data/reviews/mechanics/nfl-bdb*.json`.
After changing only `metrics.py`, re-measure the saved plays in seconds:
`python3 -I scripts/mechanics/measure.py out/mechanics/nfl-plays.jsonl.gz data/reviews/mechanics/nfl-bdb2022.json --provenance-from data/reviews/mechanics/nfl-bdb2022.json`.
Options: `node --import tsx scripts/mechanics/sim-export.ts --seed 7 --games 16`
for a bigger or different sample.

## Reading the report

Each row shows the NFL and sim median, 25th/75th and 90th percentiles. **Shift**
is how far the sim's median is from the NFL's, in units of the NFL's normal
spread (interquartile range). **Tail** is the same for the 90th percentile. The
worse of the two gives the flag: `ok` (< 0.25), `check` (< 0.75), `off`.
The report has sections for movement, runs, contact and tackling, pass
blocks (PFF-labeled pairs), pass protection and rush, routes and catches, the
ball in the air, and yards after contact by entry speed and tackle angle. It
then splits key metrics by run concept (inside zone, outside zone, gap/pull,
man/duo, draw), by box count, and by man versus zone coverage, because
averages can hide opposite problems.

`data/reviews/mechanics/report-baseline.md` (and `sim-baseline.json`) is the
report at the commit that added this system, so you can see what moved.

## Rules

1. **A flag is a place to look, not a number to hit.** When a metric is off,
   watch or trace plays where it happens, find the wrong mechanism (a bad read,
   a bad request, or physics that did not deliver what was asked), and fix
   that. Never change a force, rating or timer just to move the metric.
2. **Check the side effects.** Reuse the relevant NFL reference and compatible
   saved sim evidence before and after a change; inspect an opposing control
   and material adverse cases. Use a broader report only for a named unresolved
   transfer question under [TESTING_COSTS](TESTING_COSTS.md). Moving metrics
   toward NFL does not by itself establish an improvement, and a worse gain
   does not by itself establish a regression.
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

## Current findings

Read the [latest pursuit work](reviews/pursuit-coverage.md) first. It adopts the
acquired-intercept repair, reports matched transfer and full-game tradeoffs,
and keeps the failed seed202 box-count guard visible. The
[baseline comparison](reviews/nfl-gap-review.md) and its
[compact receipt](../data/reviews/current/nfl-gap-review.json). They replace the
older two-cohort table here and distinguish native outcomes from tracking
proxies. Catch-to-pursuit and first effective contact are the strongest leads;
early route separation is already small. The recent trench controller improved the
drive distribution, while ordinary gap/pull runs remain weak. Do not carry
older numbers forward as current evidence.

Two measurement repairs matter: admit a live subframe contact based on its
recording/whistle window, and follow the actual catcher rather than the throw's
intended target. `sim-export.ts` now records both. `outcomes.py` can recover
actual recipients in older common packets from their paired native sidecars.
Without that sidecar, legacy catch measurements remain limited. NFL adapters
keep their official receiver fallback and integer-frame admission; the current
repair does not require pretending those aggregates were reprocessed.

The baseline passed all twelve guards. The latest pursuit cohort's box-count
exception is reported above; thresholds remain unchanged.
Passing a guard does not prove a good decision, actual grip or correct force.
Generated teams, call mix and sparse subgroups still need matched comparisons.

## The data we have

| Dataset | Season | What it covers | Use it for |
|---|---|---|---|
| Big Data Bowl 2025 (`bdb2025-2022`) | 2022, weeks 1-9 | Every play, all 22 players, 10 Hz, plus PFF run concepts, coverages and pass-block assignments | **The reference season** (`nfl_bdb2025.py`) |
| Big Data Bowl 2019 (`bdb2019-2017`) | 2017, weeks 1-6 | All 22 players, 91 games; carrier and target inferred from the ball | Second season for everything (`nfl_bdb2019.py`) |
| Big Data Bowl 2023 (`bdb2023-2021`) | 2021, weeks 1-8 | Dropbacks to just after the throw, PFF pass-block pairs | Pass protection, rush, early routes (`nfl_bdb2023.py`) |
| Big Data Bowl 2026 (`bdb2026-2023`) | 2023, 18 weeks | Pass plays: coverage players to the throw, target and nearby defenders until the ball lands | Ball in the air, by man/zone (`nfl_bdb2026.py`) |
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
   labels tackles and missed tackles for the same 2022 games: real missed-
   tackle rates by approach angle, instead of the broken-contact proxy.
   **Blocked by source withdrawal:** authenticated listing on 2026-10-12 returns
   only a README saying the host removed the dataset. The supplied public
   notebook sources still work; no tracking or labels were downloaded. See the
   [research checks](reviews/loaded-grip-refinement.md#research-supplied-during-this-diagnosis).
2. **Matched situations.** Split by down and distance and field position, as
   the rushing benchmark does for outcomes.
3. **Route breaks.** Speed lost and time to re-accelerate at a route break,
   using PFF route labels (`routeRan`) in 2022.
4. **Individual movement.** BDB 2027 combine drills and game paths for the
   same players, to check how ratings map to acceleration and top speed.

## Limits

- Positions only: tracking has no forces, so physics is checked through the
  motion it produces.
- "Engaged" means a box defender within 1.5 yd of an offensive lineman, the
  same proxy on both sides. PFF labels blocks only on dropbacks, so labeled
  block pairs cover pass protection; the run-side drive metric uses proximity.
- Event timing differs slightly: NFL events are annotated by people, sim
  events come from the engine.
- The sim uses generated rosters and its own play calling. Sim EDGE players
  count as DL, while NFL 3-4 outside linebackers count as LB; box metrics use
  alignment, not labels, so they are unaffected.
- Positions are quantized to 0.1 yd on both sides (as the sim records them),
  so derived accelerations carry the same noise. Peak deceleration still
  differs between tracking generations (2017 OL 3.4 vs 2022 2.5 yd/s²), so
  read acceleration gaps with that spread in mind.
- 2017 has no player labels (carrier and target are inferred), 2021 stops
  just after the throw, and 2023 tracks only some players after the throw;
  each season feeds only the metrics it supports. "Air time" in 2023 runs to
  where the ball lands, in 2022 to the annotated arrival.
- The first tackler is approximated by the defender nearest the carrier at
  first contact; "broke contact" is a tracking proxy, not a missed-tackle label.
