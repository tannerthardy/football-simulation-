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
