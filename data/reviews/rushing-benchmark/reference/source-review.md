# Completed-season NFL rushing inputs: acquisition and scope

The current benchmark can use four complete regular seasons, 2022–2025. The
2022/23 PBP and season rosters, plus FTN 2022, were verified against the existing
pinned manifest without downloading them again. The additive acquisition
manifest pins new 2024/25 PBP and rosters and optional FTN 2023–2025. The
incomplete 2026 season is excluded.

## Verified coverage

| Input | Rows | Coverage | Published digest |
| --- | ---: | --- | --- |
| PBP 2024, gzip | 49,492 | 272 REG games, 13 POST games, 18 regular weeks, 32 teams | SHA-256 verified |
| PBP 2025, gzip | 48,771 | 272 REG games, 13 POST games, 18 regular weeks, 32 teams | SHA-256 verified |
| Season roster 2024, gzip | 3,216 | 32 teams, only season 2024 | None; published byte size and local SHA pinned |
| Season roster 2025, gzip | 3,137 | 32 teams, only season 2025 | SHA-256 verified |
| FTN charting 2023 | 48,225 | 285 game IDs, only season 2023 | None; published byte size and local SHA pinned |
| FTN charting 2024 | 48,031 | 285 game IDs, only season 2024 | SHA-256 verified |
| FTN charting 2025 | 47,316 | 285 game IDs, only season 2025 | SHA-256 verified |

Both PBP files have 372 columns and contain all required rushing, player ID,
field position, down/distance, game state, result, and EPA fields. Rosters have
36 columns; FTN has 29. No duplicate game/play key appears in either new PBP
file or the three new FTN files. The benchmark must still select REG explicitly:
the raw files include postseason. FTN must be joined to the filtered PBP by
game ID and numeric play ID; a 285-game chart does not by itself guarantee that
every eligible rushing play has a chart row or a usable label.

Raw files remain ignored in `data/raw/rushing-benchmark/`. The manifest contains
the permanent public release URL, release asset ID and update time, byte size,
local SHA, optional publisher digest, UTC acquisition time, selected final HTTP
headers, schema, and coverage audit. Ephemeral public signed redirect query
strings are intentionally omitted. No Kaggle data or credentials were fetched.

## Primary provenance and definitions

- [nflreadr PBP loader](https://github.com/nflverse/nflreadr/blob/main/R/load_pbp.R)
  explicitly returns the complete nflfastR dataset, published in the
  [nflverse PBP release](https://github.com/nflverse/nflverse-data/releases/tag/pbp).
- [nflfastR builder](https://github.com/nflverse/nflfastR/blob/master/R/build_nflfastR_pbp.R)
  documents scraping, cleaning, expected-points/expected-pass/YAC enrichment,
  and player-ID decoding. The
  [scraper documentation](https://github.com/nflverse/nflfastR/blob/master/R/top-level_scraper.R)
  describes NFL play-by-play and original fields. This is parsed football
  record data plus statistical models; EPA is a model-derived quantity, not a
  directly measured physical effect.
- [PBP field dictionary](https://nflreadr.nflverse.com/articles/dictionary_pbp.html)
  defines down, distance, field position, game time, score, rushing result, and
  EPA. `run_location` is reported left/middle/right, and `run_gap` is reported
  end/tackle/guard. These fields do not identify Inside Zone, Outside Zone,
  Power, Duo, or a defensive front.
- [Roster dictionary](https://nflreadr.nflverse.com/articles/dictionary_rosters.html)
  defines the NFL.com primary position and warns that depth-chart position is
  not always accurate. Season rosters are not per-snap personnel. A stable
  position join must surface missing and conflicting IDs, especially traded
  players and unusual ball carriers, instead of dropping them silently.
- [FTN loader and attribution](https://github.com/nflverse/nflreadr/blob/main/R/load_ftn_charting.R)
  and [field dictionary](https://nflreadr.nflverse.com/articles/dictionary_ftn_charting.html)
  describe manually charted data. `n_defense_box` is the count at the snap;
  `qb_location` is under center/shotgun/pistol; `is_motion` includes movement
  before **or** at the snap. It does not isolate motion already carrying
  momentum at the snap. Sneak, RPO and trick-play labels are available.

Source pages and loader snapshots were saved with local receipts under this
ignored acquisition directory. The older `nflfastr.com` builder URL was blocked
by the network proxy (403); the official GitHub function source above provides
the same primary provenance without affecting acquisition.

## Measurement limits that matter for engine development

PBP supports outcomes and situation-matched rushing distributions: success by
explicit down-distance rule, conversion, stuffs/negative gains, ten/twenty-plus
explosives, yardage quantiles, and tail contribution. EPA-positive success can
be reported separately; it should not replace mechanical or down-distance
success, and it cannot be computed for the engine from yardage alone without
using an equivalent expected-points model and turnover/clock handling.

PBP alone cannot measure yards before contact, approach speed, pursuit angle,
step timing, pad leverage, displacement or support recovery. Tracking and BDB
scouting remain the mechanism references for those questions. A mismatch in
rushing YPC is not proof of a shared-force or collision defect.

FTN adds conditional context, not named scheme/front truth. Box count zero
appears frequently across the raw all-play chart and should not be interpreted
as a useful zero-defender rushing cohort without validating the live-run join.
Do not rename a six-man box a 4-2 front or a reported left-end run Outside Zone.
Quarterback-designed runs, positively charted sneaks, scrambles, kneels,
penalty/no-play rows, fumbles/laterals and two-point attempts require explicit
cohorts and separate attrition counts.

Use 2022/23 to establish the reference and reserve 2024/25 as a temporal
holdout. Keep team-season variation and team/game sampling visible rather than
turning a pooled mean into a single mandatory rating target. For sparse cases
such as third-and-27 runs, publish counts and uncertain ranges, then fall back
to a broader predeclared comparison rather than calibrating to a few lucky
plays. Even strong situation matching describes teams' selected plays and
rosters, not the causal effect of changing a scheme in an otherwise fixed play.

## Attribution

FTN-derived charting sections and aggregates: **FTN Data via nflverse**,
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Retain this attribution and the license on derived FTN tables. Keep FTN
annotations distinguishable from NFL/nflfastR/nflverse PBP and roster sections;
the FTN license statement does not relabel all PBP or project code as FTN.
