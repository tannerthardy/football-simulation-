# Reviewed nflverse references

`reference.json` was extracted from the eight files pinned in
`input-manifest.json`. Raw files live under ignored `data/raw/nflverse/`.
Complete 2022–2023 REG PBP contributes 66,782 clean scrimmage plays, 64
team-seasons and 407 situation cells (190 have fewer than 40 calling plays).
Read each metric's actual denominator; even a larger calling cell may have
few throws or runs. Player/team-season repetition is not independent sampling.

Reproduce with Python 3.11+ and the standard library:

```sh
python3 scripts/nflverse-reference.py --download --out out/nflverse-reference.json
python3 -m unittest discover -s test -p test_nflverse_reference.py
```

The download command obtains public nflverse release CSVs and verifies sizes
and published SHA-256 digests where supplied. The local manifest pins all file
hashes. Omit `--download` to reproduce from the verified cached snapshot offline.
Upstream corrections can change a newly downloaded result; retain the old
manifest before replacing reviewed aggregates. No Kaggle credentials are used.

Data dictionaries/access functions were checked in nflreadr commit
`23f915a5be30415aeaa0c5c80cd23b2c69cda122` (`load_pbp`, `load_rosters`,
`load_players`, `load_combine`, `load_snap_counts`, `load_ftn_charting`).
The script itself is fingerprinted in the report.

Outcome definitions exclude accepted penalties; calling cohorts retain live
penalized plays. Nullified rows, kneels, spikes, postseason and special teams
are excluded. Sacks/scrambles are dropbacks; sacks are not throws. Designed runs
exclude scrambles. Yards-based 40/60/100 success and model-derived EPA-positive
success are separately named. Team-season percentiles describe observed
variation, not confidence intervals or acceptance thresholds. Score-state
associations do not establish a causal psychological effect.

**FTN attribution and license:** FTN Data via nflverse.
The `ftnCharting` aggregate section is derived from FTN charting under
[CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Source: [nflverse FTN charting release](https://github.com/nflverse/nflverse-data/releases/tag/ftn_charting).
Changes: exact game/play join, REG/clean-play filtering, mutually exclusive
final-outcome categories and aggregate label rates. Charting labels can overlap;
a completion or interception takes priority over a drop annotation. Catchability
and interception-worthiness are judgments, not direct measurements of cognition
or throw mechanics. Our script's code license does not replace the data's terms.

Other sections retain their release provenance (NFL/nflfastR PBP, roster/ID
records, PFR-derived combine/snap counts). They should not be described as FTN
tracking or as licensed by the downloader's code license.

The anonymous 2022 KC/PHI profile seeds are measured height/mass pairs matched
to actual REG participation. They cover 53/57 and 56/56 participating roster
identities, respectively, and 98.48%/100% of scrimmage player-snaps. Exact GSIS
crosswalks restore absent PFR IDs; mismatches are never guessed from names.
Unknown drill results remain missing. Historical combine performance is not
current strength, balance, intelligence or technique. The two strong selected
teams are benchmarks for distinct composition and calling patterns, not a
typical population. No generator or policy has been changed.

The [physics/data handoff](../../../docs/reviews/nfl-reference-and-support-integration.md)
sets comparison goals, limitations and the next work. Physics remains NOT READY.

## Game-layer reference (M1)

`game-layer.json` adds 2022 and 2023 regular-season field goals, extra points,
punts, kickoffs, fourth-down decisions, two-point tries, accepted penalties,
drive outcomes, turnovers, spikes, kneels and timeout usage. It changes no
simulation settings or scorecard bands. Every table/cell states `n`; rates
are fractions, not percentages, and unavailable denominators remain `null`.
Season tables include equal-weight team-season p10/p50/p90; the top-level
ranges pool the eligible team-seasons. These describe variation, not confidence
intervals, fitted targets or independent samples of plays.

Reproduce from the repository root with Python 3.11+ and the standard library:

```sh
python3 scripts/data/nflverse_game_layer.py --download --out out/game-layer.json
cmp out/game-layer.json data/reviews/nflverse/game-layer.json
python3 -m unittest discover -s test -p 'test_nflverse*.py'
```

`game-layer-input-manifest.json` pins the two release assets, byte sizes and
SHA256 values, also embedded in the summary. The extractor fingerprints itself,
the penalty parser and reused download helper. Downloads reuse verified cached
files and write a separate `game-layer-download-manifest.json` under ignored
`data/raw/nflverse/`, preserving the original eight-file download manifest.
Omit `--download` for an offline rerun from that verified snapshot. A future
upstream correction requires a new reviewed reference; it must not silently
replace these historical pins. No roster, charting or tracking download is
needed for M1.

Important counting choices are embedded in the JSON:

- Observed games: **271/272**, or **542/544 team-games**. The cancelled 2022
  BUF–CIN game is absent; its two teams have 16 games, not 17.
- FG distance bins are inclusive integer yards. Punt gross/net averages
  exclude blocked punts. Derived net is gross minus return yards minus 20
  for a touchback; it is not a penalty-adjusted official punter ledger.
  **Punt return involvement** uses a returner identity after excluding fair
  catches, touchbacks, downed/OOB and blocked punts. It includes zero-yard
  attempts and muffs, so the keys explicitly name this proxy rather than
  claiming certified official credited-return statistics. Onside kicks require
  an explicit narrative label, not merely a short kick. Kickoff `posteam` is
  the receiving team; the kicking team is `defteam`. The seasons have different
  kickoff fair-catch rules, and both predate the 2024 dynamic kickoff. These
  historical tables are not automatically compatible with 2026 rules.
- Fourth downs use regulation only, more than 120 seconds left in the half,
  and exclude Q4 leads/deficits of 17+ as garbage time, plus kneels, spikes
  and no-play rows. The requested grid omits midfield and overlaps the 20:
  midfield belongs to `own30-49`, while the 20 belongs to `opp34-20` and this
  decision-grid `redZone` is inside the 20. All 25 cells remain present.
  These are observed choices, not optimal policies.
- Two-point tries use the scoring team's margin after the TD and before the
  try. Completed tries with a later foul enforced between downs still count,
  even when the provider labels the row `no_play`. Margin cells retain TD
  denominators as well as attempts/successes, including outside/unknown rows.
- Penalties count accepted enforced clauses in the final narrative after a
  replay reversal. The singular `penalty_type` column cannot represent every
  accepted foul. Declined, offsetting and superseded calls are excluded;
  unresolved clauses/attribution are audited. `delayOfGame` combines offensive
  and defensive labels. The pinned inputs have **3032/3107 accepted events**
  and zero unresolved clauses, not merely 3031/3104 flagged rows.
- Drives group by game, `fixed_drive` **and possession owner**; one upstream
  2023 fixed drive merges two possessions. Kneel/spike drives count, kickoff-only
  groups do not. Points per drive counts the owner's offensive points, with
  its tries; defensive/ST return points and safeties do not inflate it. Drive
  red-zone exposure separately means a preplay snap at or inside the 20;
  long TDs without such a snap are not trips.
- Turnovers retain the provider's interception/lost-fumble **row-flag** scope,
  rather than reconstructing every possession change in a play. Fumble flags
  use known fumbler/recovery teams, so a punt muff is charged to the return
  team. Two rows explicitly contain fumbles lost by both teams: one league
  row flag is retained, attribution stays unknown, and the affected team-season
  rates are excluded from quantiles. This is not a complete multi-turnover
  ledger; it must not be passed off as one.
- Charged timeout inventory used is three minus the terminal known remaining
  inventory in each regulation half, with zero-use halves included. Named-team
  timeout annotations are separate because refunds/uncharged fourth timeouts
  make their counts larger than charged usage. Overtime is excluded.

**Attribution and license:** NFL/nflfastR play-by-play via nflverse-data,
whose [upstream data license is CC BY 4.0](https://github.com/nflverse/nflverse-data/blob/master/LICENSE.md).
This newly filtered and aggregated game-layer table is distributed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with the
source attribution and changes recorded in its `license` and `definitions`
fields. M1 uses no FTN charting; the earlier FTN attribution above applies to
that separate charting section, not these PBP-derived counts. Code licensing
does not replace data attribution.
