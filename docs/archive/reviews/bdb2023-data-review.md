# Big Data Bowl 2023 data review

Inspected 2026-10-08. The supplied
[Drive file](https://drive.google.com/file/d/1hVJ-AJh1tpc0fvCvgcEksmOK3RKyPm16/view)
is `nfl-big-data-bowl-2023.zip`, the 2023 competition's **2021-season** dataset.
It complements the 2022 labels and selected 2023 trajectories already cataloged.

## Contents and checks

The archive is 180,535,422 bytes compressed and 965,072,781 bytes uncompressed.
It contains `games.csv`, `plays.csv`, `players.csv`, `pffScoutingData.csv`, and
eight tracking files named `week1.csv` through `week8.csv`, with no enclosing
directory. All members were extracted locally and read with ZIP CRC validation.
Raw CSVs remain outside the checkout.

- **122 games**, all from 2021, covering weeks 1–8.
- **8,557 selected pass/dropback plays** and **1,679 player metadata records**.
- **188,254 scouting rows**: exactly 22 distinct players on every labelled play.
- No duplicate play keys or duplicate player-play rows, and no scouting rows
  without matching play/player metadata.
- **46,526 labelled blocker-opponent references**; 46,524 resolve to another
  player in the same play. Flag the two unresolved references before fitting.
  Of the resolved opponents, 46,095 have `Pass Rush` roles and 429 have
  `Coverage` roles. Preserve these cases rather than assuming every referenced
  defender is an initial rusher.

The [label summary](../../../data/bdb2023-summary.json) is reproducible with:

```sh
python3 scripts/data/bdb2023.py data/raw/bdb2023 out/bdb2023-summary.json
```

The extractor uses Python 3's standard library and reads all four metadata
tables. It does not derive metrics from tracking. Its summary explicitly records
zero tracking rows analyzed. Its input can include all eight tracking files;
their filenames are recorded for provenance.

The separately inspected week-1 tracking file contains **1,118,122 rows across
1,175 plays**. Every whole play contains 22 distinct players and the football,
with two non-football team identifiers. This is a whole-play check, not proof
that each frame has every measurement.

## The useful addition: protection labels

The scouting table supplies:

| Fields | What they can help evaluate |
|---|---|
| `pff_role`, `pff_positionLinedUp` | Initial pass/rush/block/route/coverage responsibilities and alignment |
| `pff_nflIdBlockedPlayer` | The blocker's labelled opposing player, joined within game and play |
| `pff_blockType`, `pff_backFieldBlock` | Different blocking tasks and backfield protection responsibilities |
| `pff_beatenByDefender` | A labelled blocker loss, distinct from the QB subsequently being pressured |
| `pff_hit`, `pff_hurry`, `pff_sack` | Defensive disruption outcome labels |
| `pff_hitAllowed`, `pff_hurryAllowed`, `pff_sackAllowed` | Disruption attributed to blocking responsibility |

Block-type codes are preserved literally, including `PP`, `PA`, `PT`, `CH`,
`CL`, `SW`, and others. Their meanings must be checked against the authoritative
data dictionary before assigning engine behaviors. In particular, the presence
of a blocking label does not always imply the player's initial role is
`Pass Block`; a route player can have a blocking task.

All included plays have scouting roles. Four initial rushers occur on 6,011
plays (70.25%); five on 1,689 (19.74%). A play has a defensive disruption label
if any player has a PFF hit, hurry, or sack flag. That occurs on **3,216 plays
(37.58%)**. Conditional rates are 35.05% with four initial rushers and 46.71%
with five. These are descriptive cohort statistics, not causal effects of
adding a rusher, and they are not equivalent to the engine's geometric pressure
flag or a standardized win-by-2.5-seconds metric.

The plays table also identifies coverage, play action, personnel, and fouls.
There are **2,038 play-action plays** (23.82% of this selected cohort).
Those labels can help diagnose whether the engine's protection and defensive
recognition respond differently to play action. They do not justify a flat
play-action completion bonus.

## Tracking cutoff and comparison limits

Tracking is primarily suited to the protection interval. In the week-1 check,
1,063 plays have a `pass_forward` or `autoevent_passforward` event. The median
number of frames from the earliest release event to the end is **five**, and
the maximum is also five—about 0.5 seconds at 10 Hz. Most downfield outcomes
are outside this observed window. Sack and scramble plays need their own
endpoints and observation conditions.

This makes the data useful for all-player positioning at release, pocket shape,
blocker/rusher movement, initial contact, and the early response to the throw.
It is not a complete trajectory benchmark for ball arrival, YAC, tackling,
or deep defenders closing throughout a long flight. Continue using the 2022
all-player data for longer play sequences and match the selected-player cohort
when using 2023-season BDB 2026 output.

All label rows, including foul rows, are retained in this summary. The plays
table contains pre-penalty and final results, but does not supply the same
explicit nullified-play flag as the 2025 archive. Therefore, the included
completion and pressure percentages should not be treated as official league
targets without penalty reconciliation. Foul fields also show pass interference,
defensive holding, and intentional grounding; they can guide rules coverage,
but this pass-play selection is not a denominator for all-game penalty rates.

## Recommended engine use

1. Join scouting, players, plays, and tracking by game/play/player. Filter the
   two invalid blocking references and retain ambiguous coverage-opponent cases
   in a separate analysis cohort.
2. Audit protection assignment against the labelled opposing player, split by
   alignment, block code, formation, play action, and rush count. Use this to
   investigate the weak-side free-rusher issue from the prior engine review.
3. Estimate blocker contact timing, lateral movement, pocket displacement, and
   sustained engagement from trajectories. Pair those measures with beaten and
   disruption labels. Verify label attribution before turning proximity into
   a claimed physical contact.
4. Evaluate block losses separately from pressure and sacks. Fit a timed process
   with release censoring rather than equating every lost block to a sack.
5. Validate on held-out games and weeks. Keep 2021 distinct from 2022 and 2023
   and retain role/alignment differences when mapping to engine positions.

This source strengthens the protection work recommended in the
[engine review](2026-10-08-engine-review.md); it does not change the priority of
fixing rules/statistical accounting and aligning measurement definitions first.
No engine parameters were tuned from this archive.

## Provenance

[sources.json](../../../data/sources.json) records the source URL, season, archive
size, checksum, local layout, and analysis scope. The small
[archive manifest](../../../data/reviews/2026-10-08/bdb2023-archive-manifest.json)
and [tracking audit](../../../data/reviews/2026-10-08/bdb2023-tracking-audit.json)
travel with the repository. The shared access arrangements described in
[data/README.md](../../../data/archive/catalog-2026-10-11.md) also apply to this source.

```text
SHA-256: 129ad4fc656919ffb13fcc6f7670d15040add6c60a655e5dd9aa269e1aea72b3
```
