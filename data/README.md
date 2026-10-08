# Shared NFL data

The engine's small calibration summaries are committed in this directory.
Every collaborator who clones the private repository receives those summaries,
the extractors under `scripts/data/`, the source catalog in
[sources.json](sources.json), and the
[engine review](../docs/reviews/2026-10-08-engine-review.md).

Give teammates access through the private repository's collaborator or team
settings. These new files become available in their checkouts after this change
is pushed and they pull it. Files kept only in one cloud workspace do not travel
with a Git clone.

Raw data belongs in `data/raw/`, which is ignored by Git. A private repository
controls who can read its contents; it does not confer permission to redistribute
someone else's dataset. Do not treat a publicly accessible CSV as an open data
license.

## Sources and useful coverage

| Source | Actual season / coverage | Existing extractor | Local input directory |
|---|---|---|---|
| [ryurko/Big-Data-Bowl](https://github.com/ryurko/Big-Data-Bowl), also supplied as a Drive ZIP | 2019 competition; 2017 season weeks 1–6, 91 tracking games | `scripts/data/bdb2017.ts` | `data/raw/bdb2019/Data/` |
| Supplied Big Data Bowl 2023 archive | 2021 season weeks 1–8; selected pass/dropback plays, PFF protection labels, tracking through shortly after release | `scripts/data/bdb2023.py` (labels only) | `data/raw/bdb2023/` |
| Supplied Big Data Bowl 2025 archive | 2022 season weeks 1–9; all-player tracking plus play/player assignment labels | `scripts/data/bdb2025.ts` | `data/raw/bdb2025/big-data-bowl-data/` |
| Supplied Big Data Bowl 2026 analytics archive | 2023 season, 18 weeks of selected pass-play/player trajectories | `scripts/data/bdb2026.ts` | `data/raw/bdb2026/114239_nfl_competition_files_published_analytics_final/` |
| Kaggle Big Data Bowl 2027 | 510-player draft cohort 2023–2025; combine drills, selected game trajectories 2023–2025, player-play/career labels | `scripts/data/bdb2027.py` (labels and combine coverage) | `data/raw/kaggle/nfl-big-data-bowl-2027/nfl-big-data-bowl-2027/` |

The ryurko revision is pinned to
[`0dac66ce81e5fd22ca48f35ea6a637c523dda12b`](https://github.com/ryurko/Big-Data-Bowl/commit/0dac66ce81e5fd22ca48f35ea6a637c523dda12b).
Its 94 CSV files total 2,472,751,570 bytes (about 2.47 GB), including
91 tracking files. [The file manifest](sources/ryurko-bdb2019-files.json)
records each path, byte size, Git blob SHA-1, and pinned download URL.
A Git blob ID is not an ordinary file SHA-1 or SHA-256 checksum; use
`git hash-object FILE` when comparing a local file to this manifest.

**Current limitation:** `bdb2017.ts` reads only
`tracking_gameId_2017090700.csv`. It reads the full games/plays/players tables,
but fetching additional tracking games does not make that extractor analyze
them. Extend its file selection and record the analyzed game IDs before treating
the resulting tracking summary as a 91-game benchmark. More games can improve
validation of movement, contact, pressure, and matchup variation. Keep this
older season separate from 2022/2023 cohorts and account for schema differences.

The supplied `Big-Data-Bowl-master.zip` is an exact snapshot of this source:
all 94 CSV contents and byte sizes match the pinned manifest, and its ZIP
comment identifies the same commit. Running the existing extractor on the
archive's metadata and one selected tracking game reproduced the committed
2017 summary exactly as a JSON object. See the
[archive verification review](../docs/reviews/bdb2019-archive-review.md).
Treat the ZIP and GitHub downloads as alternate access routes to the same
dataset, rather than separate calibration samples.

The prior review regenerated the 2025 summary with tracking weeks 1 and 2 and
all play/player labels. It regenerated the 2026 summary with all 18 weeks.
The 2026 data is not full all-22 tracking; see the review's selected-defender
comparison finding before using it to tune separation.

The new 2023 competition archive covers **2021**, rather than the 2023 season.
Its [label summary](bdb2023-summary.json) covers all 8,557 plays and 188,254
scouting rows. The [dataset review](../docs/reviews/bdb2023-data-review.md)
explains its blocking labels and the tracking cutoff. The summary extractor uses
Python 3's standard library; the engine itself still uses Node 22.

## Access for collaborators

For raw files, use one of these routes once the dataset's terms permit the
intended access and use:

1. **Upstream access:** each collaborator obtains data from the original source
   under the applicable terms. The pinned URLs and manifest keep the public
   source reproducible.
2. **Shared Drive:** grant the intended team access to the supplied files
   and their parent folder. Access to the private GitHub repository does not
   grant Google Drive access. The original file URLs and archive SHA-256 values
   are in `sources.json`.
3. **Approved private storage:** if redistribution is permitted, use a private
   object-storage bucket or private GitHub Release for archive snapshots. Give
   the same collaborators access. Record the storage location, version, and
   checksum in the catalog. No shared mirror or Release has been created here.

GitHub ordinary Git files have a 100 MiB limit. All four supplied ZIPs exceed it;
the public tracking collection is also too large for a convenient normal Git
checkout. Git LFS is an alternative with storage/bandwidth quotas, but separate
archive storage keeps routine checkouts small. GitHub Release assets support
files below 2 GiB, so each of the four current ZIPs fits as a separate asset.
Private Release downloads require authenticated repository access. Storage
choices still need to satisfy the dataset's terms.

The upstream [README's Official rules section](https://github.com/ryurko/Big-Data-Bowl/blob/0dac66ce81e5fd22ca48f35ea6a637c523dda12b/README.md#official-rules)
states that NGS data is Sponsor-owned, limits use to the contest unless
expressly permitted otherwise in writing, and restricts archiving and granting
others access. Its [FAQ](https://github.com/ryurko/Big-Data-Bowl/blob/0dac66ce81e5fd22ca48f35ea6a637c523dda12b/faqs.md)
allows sharing findings, which is not a general redistribution license for raw
data. Verify current NFL permission for simulation-engine use and team sharing;
verify the separate terms for the newer competition archives as well.

## Reproducing the committed summaries

Use Node 22 and install the repository dependencies with `npm ci`. Obtain
authorized local copies and use the directories listed above. The 2017
extractor requires `games.csv`, `plays.csv`, `players.csv`, and the one tracking
file named above. For example, each file's pinned URL is available in the
manifest; downloading the entire 2.47 GB collection is unnecessary to reproduce
the current one-game tracking summary.

The supplied `Big-Data-Bowl-master.zip` contains an enclosing
`Big-Data-Bowl-master/` directory. After extracting locally, place its `Data/`
folder at `data/raw/bdb2019/Data/`, or pass the extracted `Data/` path directly
to `bdb2017.ts`. Its checksum and Drive URL are recorded under the existing
2017 source entry in the catalog.

Extract the two ZIPs into `data/raw/bdb2025/` and `data/raw/bdb2026/`, retaining
their archive directory names. Extract `nfl-big-data-bowl-2023.zip` into
`data/raw/bdb2023/`; its CSV files are at the archive root. Run from the
repository root:

```sh
npx tsx scripts/data/bdb2017.ts data/raw/bdb2019/Data out/bdb2017-summary.json
python3 scripts/data/bdb2023.py data/raw/bdb2023 out/bdb2023-summary.json
npx tsx scripts/data/bdb2025.ts data/raw/bdb2025/big-data-bowl-data out/bdb2025-summary.json
python3 -I scripts/data/bdb2025_tendencies.py data/raw/bdb2025/big-data-bowl-data out/bdb2025-tendencies.json
npx tsx scripts/data/bdb2026.ts data/raw/bdb2026/114239_nfl_competition_files_published_analytics_final out/bdb2026-summary.json
```

`bdb2025_tendencies.py` uses only the play and player-play tables: team
personnel, defensive personnel against each offensive group, run-concept
shares, usage-versus-efficiency selection and team spreads. Compare it with the
simulation's `npx tsx scripts/tendencies.ts` (see
[EVALUATION_ENVIRONMENT.md](../docs/EVALUATION_ENVIRONMENT.md)).

The 2025 extractor analyzes every `tracking_week_N.csv` present. To reproduce
the reviewed two-week tracking summary, supply only weeks 1 and 2 in that input
directory, alongside the full metadata tables. An input containing all nine
weeks intentionally produces a different tracking summary. Preserve the
cohort in the catalog when updating committed targets.

Write exploratory results to ignored `out/`, compare them with the committed
summaries, and review cohort changes before updating `data/bdb*-summary.json`.
For the downloaded ZIPs, compare `sha256sum FILE` (or `shasum -a 256 FILE` on
macOS) to the values in `sources.json` before extracting.

Cloud environments need outbound access to the chosen sources. Public GitHub
URLs use `github.com`, `api.github.com`, and `raw.githubusercontent.com`;
Drive downloads may also use `drive.usercontent.google.com`. Store access
tokens in per-user credentials or environment secrets, outside the repository.

## Review evidence

[reviews/2026-10-08/](reviews/2026-10-08/) contains the prior review's small
audit JSON files and diagnostic logs. They are measurements of the reviewed
commit, not raw NFL trajectories or newly fitted engine parameters.
The ten-case reproduction result is included; its session-specific private-class
instrumentation is not a portable regression test suite.

The 2023 archive manifest and week-1 tracking audit are also included in that
directory. The tracking audit establishes whole-play participant coverage and
release cutoff; it does not establish completeness at every individual frame.
The 2019 ZIP manifest and verification record confirm all CSVs match the pinned
GitHub source; only one tracking game was used to regenerate that summary.

## Kaggle competition download

`nfl-big-data-bowl-2027` was downloaded successfully with the cloud secret.
Its nine CSVs total 2,306,804,135 bytes. The [dataset review](../docs/reviews/bdb2027-data-review.md)
records the verified cohort, joins, missing measurements and tracking limits.
The credential must be available in the execution environment; setting it on
a separate personal computer does not automatically provide it to a cloud task.

After adding `KAGGLE_API_TOKEN` as an environment secret, use Python 3.10+:

```sh
python3 -m venv .venv-kaggle
.venv-kaggle/bin/python -m pip install -r scripts/data/requirements-kaggle.txt
.venv-kaggle/bin/python scripts/data/download_kaggle.py nfl-big-data-bowl-2027
```

The helper calls `kagglehub.competition_download`, stores files in ignored
`data/raw/kaggle/`, and writes a per-file SHA-256 manifest to ignored
`out/kaggle/`. It does not put credentials in the repository or change account
settings/competition terms. Inspect the actual data and retain a reviewed
manifest/source entry before using it for calibration.

The verified [download manifest](sources/kaggle-bdb2027-files.json) fingerprints
this snapshot; the helper excludes KaggleHub's internal completion marker.
The [summary](bdb2027-summary.json) can be regenerated with:

```sh
python3 scripts/data/bdb2027.py data/raw/kaggle/nfl-big-data-bowl-2027/nfl-big-data-bowl-2027 out/bdb2027-summary.json
```

The summary counts all metadata, player-play labels and combine drill tracking.
It does not derive metrics from game trajectories. A separate audit of
`game_tracking_2023.csv` is included with the review evidence.

## Run-game coordination evidence

See [the follow-up review](../docs/reviews/run-game-coordination.md) and
`data/reviews/run-game-coordination/`. The paired run and development matrices
include per-cell results and source hashes. The NFL tracking reference analyzes
1,394 designed runs from BDB 2025 weeks 1–2, with explicit metric-specific counts,
censoring and ambiguous front-geometry proxies. It does not provide labeled
Duo, wide-zone, split-zone, fit or run-block-assignment truth.

```sh
python3 scripts/data/run-game-reference.py /path/to/bdb2025/big-data-bowl-data out/nfl-run-reference.json --weeks 1 2
npm run test:data
```

The separate all-week tendency summary reproduces the `3c00ca0` extractor;
its sneak/personnel restrictions differ from the tracking cohort. Mix adjustment
is an approximate sensitivity check. Raw data and secrets remain outside Git.

## Error budget, clock and contact evidence

See [the review](../docs/reviews/error-budget-and-protection.md) and
`data/reviews/error-budget/`. The `nfl-*.json` files are aggregates from the
2022 Big Data Bowl 2025 plays (weeks 1–9) and tracking (weeks 1–2): outcome
tables by down, distance and field zone; drive structure; pressure and the
pocket; QB drop depth; game clock between snaps; live time and what happens
after first contact. They contain no game, play or player identifiers and let
the error budget and anatomy scripts run without raw data. The `before-*` and
`after-*` logs are the 32-game calibration, drive structure and budget runs
the review quotes; `sim-outcomes-48-seed7.json` is the simulation's outcome
table for the final budget.

```sh
# NFL references (raw data required)
python3 -I scripts/data/bdb2025_outcomes.py /path/to/bdb2025 out/nfl-outcomes.json
python3 -I scripts/data/bdb2025_drives.py /path/to/bdb2025 out/nfl-drives.json
python3 -I scripts/data/bdb2025_pocket.py /path/to/bdb2025 out/nfl-pocket.json
python3 -I scripts/data/bdb2025_qbdrop.py /path/to/bdb2025 out/nfl-qbdrop.json
python3 -I scripts/data/bdb2025_clock.py /path/to/bdb2025 out/nfl-clock.json
python3 -I scripts/data/bdb2025_contact.py /path/to/bdb2025 out/nfl-contact.json
# Simulation side (no raw data needed)
node --import tsx scripts/error-budget.ts drives 32 7 4
node --import tsx scripts/error-budget.ts collect 48 7 6 out/sim-outcomes.json
node --import tsx scripts/error-budget.ts budget data/reviews/error-budget/nfl-outcomes.json out/sim-outcomes.json 20000
node --import tsx scripts/clock-anatomy.ts 32 7 4
node --import tsx scripts/contact-anatomy.ts 16 7 2
node --import tsx scripts/sack-anatomy.ts 16 7 2
node --import tsx scripts/tackle-lab.ts 40
```

## Coverage and contact-choice evidence

The latest [protection/goal-line follow-up](../docs/reviews/red-zone-pocket-and-film-ids.md)
and `reviews/red-zone-pocket/` include paired source hashes, the original
flagged clips, a 32-game guard, 16-game pressure anatomy, and controlled
contact/field-spacing matrices. The calibration's QB-sensed-pressure flag
has no NFL target; use `sack-anatomy.ts` for the 10 Hz two-yard tracking proxy.
The live contact observer uses 20 Hz and excludes downed defenders, so its
rates are a separate series. Forced holds and blocker movement have no
independently measured NFL target yet.

```sh
node --import tsx scripts/pocket-motion-lab.ts 24 out/pocket-motion.json
node --import tsx scripts/red-zone-coverage-lab.ts 8 out/red-zone-coverage.json
node --import tsx scripts/dropback-motion-anatomy.ts 16 7 2 out/dropback-motion.json
```

For paired runs, copy those measurement scripts and `scripts/source-version.ts`
unchanged into an archive of the comparison revision and run from its root
with the same dependencies. The manifest records script and source hashes.

Read [the follow-up](../docs/reviews/coverage-anticipation-and-contact-choices.md)
and `reviews/coverage-anticipation/`. The NFL reference is 2022 weeks 1–2:
target-to-nearest-defender center distance at release, arrival and completed
catch, requiring all eleven defenders. Coverage and route aggregates contain
different observational samples. Arrival includes off-target passes and is
not the engine's catch-contest sample.

```sh
python3 -I scripts/data/bdb2025_coverage.py /path/to/bdb2025 out/nfl-coverage.json --weeks 1 2
node --import tsx scripts/coverage-lab.ts 4 out/coverage.json
node --import tsx scripts/sideline-lab.ts 20 out/sideline.json
```

The coverage matrix holds rosters, requested calls, front and situation fixed
with paired seeds (2,592 plays). Catch, release and catch-contest distances
have separate denominators. The sideline matrix is an isolated carrier/pursuer
anatomy (4,800 plays), not a target for NFL exit frequency. Successive coverage
variants are cumulative changes; they are not independent ablations.
The compact paired-play results, predetermined traces, game guard/anatomy
logs, outcome tables, budgets and source/script hashes travel with a Git clone.
Use the error-budget commands above for game checks. For revision comparisons,
run the same measurement scripts against each source revision; record hashes
and do not edit source while a measurement is running.

