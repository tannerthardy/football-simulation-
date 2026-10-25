# Big Data Bowl 2027 data review

Downloaded and inspected 2026-10-08 using `kagglehub` 1.0.2 and the supplied
cloud environment secret. Source:
[nfl-big-data-bowl-2027](https://www.kaggle.com/competitions/nfl-big-data-bowl-2027).
No credential value was printed or added to the repository.

## Snapshot and scope

Nine CSV files total **2,306,804,135 bytes**. KaggleHub's internal zero-byte
completion marker is excluded from the
[file manifest](../../../data/sources/kaggle-bdb2027-files.json), which contains a
SHA-256 fingerprint for each dataset file. Raw data is in ignored
`data/raw/kaggle/nfl-big-data-bowl-2027/nfl-big-data-bowl-2027/`.

The dataset links **510 players** to combine measurements, combine trajectories,
game labels and career outcomes. Draft years are 2023 (160), 2024 (177), and
2025 (173). Combine position groups are DB (122), OL (121), DL (118), WR (107),
and TE (42). There is no QB or RB combine group; these are not representative
measurements of every NFL position. A few recorded NFL positions differ from
the combine grouping.

`games.csv` lists **1,002 games**, 334 per season in 2023–2025: 816 regular-season,
147 preseason and 39 postseason records. The metadata's coverage must not be
confused with complete tracking of all players in those games.

All 510 player IDs join to both `combine_results.csv` and
`player_career_successes.csv`. The player-play file has **314,197 rows**,
**497 players**, **1,001 games**, and **114,954 distinct game/play keys**.
There are no duplicate player-play keys or missing player/game metadata joins.
The 13 cohort players without these player-play rows should remain explicit
when modeling opportunity or development, rather than being dropped silently.

## Combine-to-game modeling opportunity

`combine_results.csv` supplies height, weight, hand size, arm length, wingspan,
10-yard split, 40 time, vertical, broad jump, three-cone, shuttle, bench and
NGS scores. All players have the listed body measurements, but drills are
substantially incomplete:

| Measurement | Missing records out of 510 |
|---|---:|
| 10-yard split | 85 |
| 40 time | 86 |
| Vertical | 72 |
| Broad jump | 87 |
| Three-cone | 330 |
| Short shuttle | 309 |
| Bench repetitions | 318 |

Do not turn missing values into zero ability. Participation and missingness
may be selective. Fit uncertain priors and retain uncertainty for unobserved
measurements.

`combine_tracking.csv` contains **463,189 rows**, **6,310 event IDs**, and all
510 players. It includes 431,094 player rows and 32,095 ball rows. Drill types
include the 40, three-cone, shuttle, and position skill drills: WR, TE, DB,
DL/LB and OL, including pull/fold-block tasks. Row counts are not independent
athletic samples; repeated attempts and frames require grouped weighting.

These data can help calibrate sprint acceleration, deceleration, turning,
directional transitions and task execution, then compare each athlete with his
observed game movement. Keep combine maximal effort, game role/effort, and
technique separate. A contact force or mental trait is not directly observed
by a drill trajectory or bench result.

## Game tracking is selected-player tracking

The three game tracking files are named for seasons 2023, 2024 and 2025.
The inspected **2023** file contains **3,665,443 rows**, **31,690 plays**, and
**156 distinct player IDs**, all from the cohort. Whole-play participant
counts range from **one to six**, with most plays having one or two selected
players. No ball/missing-ID rows were present in that file.

The [tracking audit](../../../data/reviews/2026-10-08/bdb2027-game-tracking-audit.json)
records those counts and events. Events include snap, throw, arrival, catch,
handoff, first contact and tackle, so selected individuals can be studied
through multiple phases. Event labels do not supply untracked opponent or
ball coordinates. The 2024/2025 trajectory files have been downloaded and
fingerprinted, but their trajectories were not audited here.

Consequently, use this source for the selected player's motion, role, and
labels. Do not infer nearest-defender distance, complete blocking geometry,
pocket shape, tackle opportunities or all-22 interactions from it alone.
Join overlapping full-player sources only after verifying game/play/player
identity, timestamp alignment, observation windows and source provenance.
Keep overlapping samples from different archives out of separate training
and validation partitions.

## Player-play and career labels

The labels include alignment/formation, route/coverage responsibility, motion,
catch/rush/YAC, separation/cushion, pressure allowed, pressure timing, get-off,
sacks, tackles, and fumbles. These support controlled role/phase and execution
analyses after reading the authoritative definitions. Do not equate a supplied
probability/expected-value label with direct measured physical truth.

Of the player-play rows, 301,707 have a non-nullified flag and 12,490 a nullified
flag. Those are **player-row counts**, not independent play counts or an
official penalty rate. Aggregate at the appropriate level before deriving a
game/play metric. The new summary reports label availability without claiming
calibrated league rates.

Career labels include offense/defense/special-teams snaps, active/started games,
All-Pro and Pro Bowl outcomes. Older draft classes have had more opportunity
to accumulate totals. Establish the observation cutoff and censoring before
using them for scouting/development evaluation; roster opportunity, injuries,
position and team context also affect those outcomes. Career success cannot
be used as information available at draft time or leaked into gameplay decisions.

## Integration with the realism plan

Add a high-priority physical-profile study to the
[implementation plan](../plans/REALISM_PLAN.md): join combine and game observations
for the same athlete, model missingness, fit role/phase effort separately from
capability, and validate on held-out players/draft classes. Use position drills
to check the assumptions behind cutting, backpedal/turning and puller movement.

Use the pressure/coverage labels to evaluate individual execution and
responsibility alongside full-player data. Use career outcomes later for
uncertain scouting and development models with explicit exposure/horizon controls.
The selected cohort cannot by itself establish league-wide movement or full-game
outcome targets.

## Reproduction

The [downloader](../../../scripts/data/download_kaggle.py) requires `KAGGLE_API_TOKEN`
in the execution environment and writes a snapshot manifest. The
[summary extractor](../../../scripts/data/bdb2027.py) uses Python's standard library:

```sh
python3 scripts/data/bdb2027.py data/raw/kaggle/nfl-big-data-bowl-2027/nfl-big-data-bowl-2027 out/bdb2027-summary.json
```

It streams the player-play and combine tracking files. Game trajectory metrics
are not part of that extractor. The committed
[summary](../../../data/bdb2027-summary.json) describes cohort/label/drill coverage,
not model fitting or a claim of NFL fidelity.
