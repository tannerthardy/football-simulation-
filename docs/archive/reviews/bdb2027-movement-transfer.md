# NFL movement: combine capacity versus game execution

The BDB2027 movement extraction now processes **all downloaded combine drills
and all three game seasons**, rather than relying on a selected-player 2023
audit. It is descriptive evidence for the physics/control foundation. **No
parameters were fitted and no held-out accuracy is claimed.** The next physics
priorities are in [the current handoff](held-foot-and-movement-readiness.md).

## Cohort and provenance

`scripts/data/bdb2027_movement.py` fingerprints the six input CSVs against the
downloaded snapshot, then derives player motion from positions. The reviewed
output is `data/reviews/physics-world/nfl-movement/bdb2027-movement.json`;
its manifest pins the extractor, dependencies and source files. Raw tracking
stays under ignored `data/raw/` and is not redistributed in Git.

| Game season | Rows read | Retained player-play trajectories | Retained players |
|---|---:|---:|---:|
| 2023 | 3,665,443 | 29,678 | 156 |
| 2024 | 7,827,944 | 60,859 | 318 |
| 2025 | 11,160,903 | 86,170 | 448 |

Total: **22,654,290 game rows read, 176,707 retained trajectories**. Players
overlap across seasons; do not sum player counts. All 463,189 combine rows
were read; balls were excluded. All 6,310 player drill trajectories across
56 drill labels were retained. Game exclusions are enumerated by season in
the JSON, including nullification, absent pass labels, missing snap/release,
missing joins and short/gapped/outlier trajectories.

Game windows require a non-nullified pass-result label, a snap and release.
They end at the earliest release, labelled first contact or three seconds
after snap. This selected draft cohort is **not all-22**, does not represent
RB/QB combine profiles and does not give complete opponent/contact geometry.
Runs and sacks without release are excluded. Unlabelled blocks/hits remain
possible; the window is not guaranteed contact-free. Existing 2022 run and
2023 pre-throw reference summaries remain distinct cohorts.

Position paths are resampled to 10 Hz. Speed uses a central 0.2 s difference;
acceleration differentiates a 0.5 s smoothed speed, trimming derivative edges.
Acceleration/braking peaks are nonnegative demand magnitudes. A turn requires
at least 60 degrees of velocity-direction change over 0.5 s, entry speed
at least 1.5 yd/s and exit speed at least 1 yd/s. The strongest eligible turn
per trajectory is retained. This detects path turns, **not foot plants**.
Reported cohort medians first aggregate within athlete, avoiding domination
by repeated attempts. Derived lateral acceleration is curvature, not measured
ground force or maximum turf friction. Gross screens reject peak speed over
15 yd/s or peak acceleration over 30 yd/s²; these are tracking-quality screens,
not NFL physical bands.

## What we can use now

**407 players** have both an observed combine forty peak and an eligible game
pre-throw speed distribution. Median ratios of game p90 trajectory peak speed
to observed combine forty peak speed:

| Combine group | Median ratio |
|---|---:|
| WR | 0.738 |
| TE | 0.692 |
| DB | 0.577 |
| DL | 0.459 |
| OL | 0.403 |

These ratios reflect role and effort as well as capacity: an OL setting inside
a three-second window is not attempting a forty. They must **not** become
uniform top-speed multipliers. The combine peak is also an observed sampled
maximum, not the asymptotic maximum in the body's acceleration equation.
Compare draft-year/position/aligned-role tables and sample counts before
interpreting differences as physical ability.

The drills offer task-specific anchors. OL long-pull-right turns retain about
**82.5%** of entry speed in the athlete-median eligible windows (65 players).
Short shuttle and three-cone reversals retain about **14.1%** and **22.0%**
(169 and 159 players). A curved pull and a hard reversal demand different
speed planning; authentic football movement should not plant to a stop at every
waypoint. These are examples of distinct task geometry, not demonstrated
accuracy of our current puller model.

Fold-block-right and deep/short-pull-left have only eight and three players
with qualifying 60-degree turn windows; backpedal/90-degree-break has one.
That is a detector/window limitation. Do not conclude those drills lack
foot plants or use those tiny samples to fit universal turning capacity.
Different combine drills have different observed lengths and start speeds.

## Integration progress and remaining work

The matched world panel is now built: **888 paths / 420 athletes, 3,552 paired
trials**, with 2025 athletes reserved separately. It covers forty, shuttle,
three cone, OL long pull right and backpedal/90-degree-break path geometry.
The [current handoff](held-foot-and-movement-readiness.md) explains its known-path
controller, unobserved facing/contact, missing-measurement proxies and findings.
Raw trajectories stay ignored; aggregates and reproducible commands are in
`data/reviews/physics-world/held-foot-and-movement-tasks/` and `data/README.md`.
This is a feasibility diagnostic, with no fitting or held-out accuracy claim.

1. **Extend matched movement probes on the existing body.** Generate the forty,
   short-shuttle, three-cone, long-pull and fold paths through ordinary movement
   intents. Pair fixed bodies with different control skill. Compare the same
   resampling, smoothing, speed-conditioned turn windows and trial lengths.
   The first panel is complete; fold, observed-facing and loaded reps remain.
   Keep distinct cohorts for free locomotion and loaded contact. Tracking does
   not tell us hand force, friction capacity or exactly when a foot plants.
2. **Separate the capacity envelope from requested effort.** Measured forty
   and split times constrain free sprint behavior. Football role/cues choose
   desired pace, braking and body orientation. Contact then changes motion
   through the world. A slower observed OL curve should not reduce the OL's
   maximum physical capacity by 60%.
3. **Use player-grouped development and holdout cohorts.** Keep every attempt
   and game season for a player on the same side of a split. Reserve a draft
   cohort and report position/role denominators; check distribution shift.
   Predeclare filtering/metrics before fitting. Current per-draft tables are
   descriptive and do not establish held-out prediction.
4. **Expand the older all-22 anchors when available locally.** BDB2023's
   eight weeks and BDB2025's nine weeks should provide formation/contact,
   run/pocket and loaded-motion comparisons with player alignment and explicit
   event definitions. Those raw archives are not present in this workspace;
   their earlier limited summaries remain labelled accurately. The catalog
   and existing extractors let collaborators reproduce/extend them without
   treating metadata coverage as full tracking utilization.

This integration feeds the owner's ordered work: active force/work accounting,
the specific hand-fight convergence failure, initial run contact and achievable
tackle approach. NFL paths can constrain movement and timing; they cannot
alone validate muscular work, grip forces, rotational energy or contact height.
Use physical contracts and appropriate contact measurements for those claims.

## Reproduce

Python 3.11+; the measured environment used numpy 2.3.5 and pandas 2.2.3.
Install the pinned optional analysis dependencies in a local virtual environment:

```sh
python3 -m venv .venv-movement
.venv-movement/bin/python -m pip install -r scripts/data/requirements-movement.txt
.venv-movement/bin/python scripts/data/bdb2027_movement.py data/raw/kaggle/nfl-big-data-bowl-2027/nfl-big-data-bowl-2027 out/bdb2027-movement.json
.venv-movement/bin/python -m unittest discover -s test -p test_bdb2027_movement.py
```

The chunked reader retains a trajectory across chunk boundaries and rejects
non-contiguous duplicate keys instead of silently splitting a player-play.
Three small synthetic measurement checks cover units/resampling, nonnegative
acceleration/braking demand and athlete weighting. They validate the extractor's
math; they do not validate the tracking provider or our engine's realism.
