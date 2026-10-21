# NFL data, evidence and film

**Start with [Using NFL tracking data to check the sim](../docs/NFL_DATA.md).**
`npm run nfl:fetch` downloads, checksums and extracts the supplied archives;
`npm run mech:sim && npm run mech:report` compares sim mechanisms with 2022
all-22 tracking using one shared metric module. Aggregates are in
[reviews/mechanics/](reviews/mechanics/).

Use real data to test mechanisms in comparable situations. Outcome averages
can reveal a concern; they cannot tell us which controller or physical law is
wrong. [Validation](../docs/VALIDATION.md) explains the layers and reserved exam.

The [current NFL comparison](../docs/reviews/nfl-gap-review.md) includes two
native roster cohorts, clean 2022–23 outcomes, limited context standardization
and corrected actual-catcher/contact measurements. Its compact receipt is
[here](reviews/current/nfl-gap-review.json). Reproduction commands use the
existing tracking exporter plus `scripts/mechanics/nfl-outcomes.py` and
`outcomes.py`; raw inputs, sidecars and full reports stay ignored.

## Inputs we have studied

| Data | Useful evidence | Limits |
| --- | --- | --- |
| 2017 tracking / BDB2019 | Player paths and movement | Historical seasons; much tracking remains unused. |
| BDB2023 | 2021 pass protection and scouting labels | Eight weeks; labels and movement are different evidence. |
| BDB2025 | 2022 routes, fronts, concepts, boxes, contact and tracking | Nine-week sample; observation is not a randomized trial. |
| BDB2027 | Combine measurements/drills and selected same-player game movement | Missing roles and unknown effort/contact; no grip measurements. |
| nflverse/nflfastR + FTN, 2022–25 | Situational rushing outcomes, roster joins and charted context | All studied already; descriptive reference, not blind validation. |
| Small biomechanics studies | Support/recovery hypotheses and physical priors | Not NFL tackle or grip calibration. Anatomical work is paused. |

Raw provider data stays in ignored `data/raw/`. Respect its source terms and
retain attribution. Shared manifests, extractors and compact reference tables
remain tracked. A private repository does not automatically grant teammates
access to Drive or permission to redistribute provider data.

Existing tools: `scripts/data/bdb2023.py`, `bdb2027.py`,
`bdb2027_movement.py`, `movement_task_fixtures.py`, `bdb2025_contact.py`,
`bdb2025_pocket_push.py`, `rushing_benchmark.py` and
`run_concept_situation_benchmark.py`. Read their CLI help and the corresponding
packet README for exact input definitions. The
[historical catalog](archive/catalog-2026-10-11.md) preserves detailed acquisition
and reproduction commands without making them the onboarding path.

Public rushing inputs can be restored and byte-verified without credentials:

```sh
python3 scripts/data/fetch_rushing_reference.py --manifest data/reviews/nflverse/input-manifest.json --out data/raw/nflverse
```

Kaggle downloads use `scripts/data/download_kaggle.py`. Competition access and
terms must be satisfied by the downloader. Use environment secrets; never
commit tokens or paste them into reports.

## Generated evidence is archived, not lost

Large replay pages, films, trace arrays and test logs were removed from the
current checkout. Exact bytes remain in git at immutable commit
`663193dfe7fe362d4f59072ef136437f881f1086`. No history was rewritten.
[The catalog](archive/generated-artifacts.json) records paths, sizes and hashes.
Restore only what you need; local git objects work without network access:

```sh
python3 scripts/restore-evidence.py --list --prefix viewer/
python3 scripts/restore-evidence.py viewer/rushing-benchmark-review.zip
python3 scripts/restore-evidence.py --prefix data/reviews/rushing-benchmark/
```

Restoration defaults to `out/evidence-archive/` with original relative paths.
The helper can fetch from authenticated GitHub when history is unavailable.
Use `--destination .` explicitly if a historical tool needs its original path.
Never interpret a saved report as a fresh current-engine run. Historical source
verifiers belong with their original source commit, not modified handoff docs.

For a ready film library, restore `viewer/rushing-benchmark-review.zip`, unzip
it, and open its HTML. It contains guided native runs and the complete clean-run
library. These guided clips are selected witnesses, **not** a random sample.
Film references need the version, game seed, play ID and timestamp.
You can also [download that pinned ZIP](https://github.com/tannerthardy/football-simulation-/raw/663193dfe7fe362d4f59072ef136437f881f1086/viewer/rushing-benchmark-review.zip)
while signed in to GitHub with repository access.

## Future output

Write generated evidence to ignored `out/`. Commit the script, cohort/input
definitions and a compact result with adverse cases and source pins. Reuse an
existing baseline rather than copying it. Keep large traces and films as local
output or named CI/release artifacts with hashes and retention stated; if they
must be shared, publish them outside the source tree. Do not force-add ignored
generated files. Existing history still occupies disk; shrinking that history
would require a separate owner-approved migration.

The current random play audit is [here](reviews/current/random-play-review.json).
It uses saved native light frames and records what was observable, not invented
mental states. Small reference extracts remain under `data/reviews/`; the old
packet receipts may need archived files to be materialized before verification.

The [current run-coaching receipt](reviews/current/run-coaching.json) links the
puller, force-approach, combination, contact/movement and sustained-displacement
reviews. Selected native policy comparisons reproduce the original prefix and
initial state; they are not paired whole changed games. The new A/B film is local
ignored output at `out/run-coaching/film/index.html`, with a standalone combined
HTML and `rushing-policy-review.zip`. It has 20 clips, including unchanged and
worse-result controls, and labels the exact policy intervention. Review these
mechanisms rather than ranking candidates by their gains. The old pinned ZIP
above remains a different, historical film.

The latest [combination receipt](reviews/current/run-combination-security.json)
uses paired complete-engine runs on fixed ordinary setups. The small shared
collector now records independent helper control and the existing departure cue:

```sh
node --import tsx scripts/diag/combo-attention-witness.ts out/combos.json.gz --ordinary
node --import tsx scripts/diag/combo-attention-witness.ts out/combos-supplemental.json.gz
node --import tsx scripts/diag/run-concept-process.ts out/run-controls.json --runs duo,oz_strong,counter,power --fronts over,under --seeds 3 --seconds 4 --verify
```

Both native commands verify plain-run execution and RNG internally. The receipt
pins the baseline commit, source and tools for paired reproduction. Recorded
initial projections are not complete hidden-state hashes; the four-second
process panel is censored and has no OL request trace. New review film at
`out/run-solidify/film/inside-zone-combo-review.html` contains all eight IZ input pairs, not
just successful runs. Its ZIP and generated traces remain ignored output.

The [OL leverage receipt](reviews/current/ol-leverage-review.json) records the
solo-drive recovery repair and the independent hand angular-law failure. The
existing native collector now also records actual acquisition attempts against
the pictures already consumed; it adds no observation or decision. Reproduce
current ordinary inputs with the first `--ordinary` command above. For the
paired pre-repair engine, without changing this checkout:

```sh
mkdir -p out/run-drive-fit/baseline-source/scripts/diag
git archive 8119f08 src scripts/source-version.ts | tar -x -C out/run-drive-fit/baseline-source
cp scripts/diag/combo-attention-witness.ts out/run-drive-fit/baseline-source/scripts/diag/
(cd out/run-drive-fit/baseline-source && node --import tsx scripts/diag/combo-attention-witness.ts ../baseline.json.gz --ordinary)
```

The new law oracle is separate from football outcomes and solver refinement:

```sh
node --import tsx scripts/diag/hand-angular-law.ts out/hand-angular.json --assert-law
```

That assertion currently fails under tangential restraint with no ground
reaction. Normal force/travel, linear momentum and energy controls pass.
Reports and failed-law evidence stay under ignored `out/`; the receipt pins
their source and measurement definitions. Do not describe this oracle as passed
because the normal controls or the production test suite passed.

`python3 scripts/data/run_displacement.py --help` describes the inputs for the
small 1/2/3-second run-line displacement pilot: BDB2025 week-one CSVs and eight
source-pinned native game recordings. Its exact command and equality checks are
in [the receipt](reviews/current/run-displacement.json). The same rounded
position operator is applied to both sources; nearby blockers do not establish
contact, a double team or its force.

The [support-install receipt](reviews/current/run-support-install.json) covers
called force ownership, conditional inside fits and pressure/exchange controls.
The fixed collector checks all 24 runs against unrecorded execution and RNG:

```sh
node --import tsx scripts/diag/run-support-install.ts out/run-support-install/candidate.json
```

To reproduce its pre-change counterpart without changing this checkout:

```sh
mkdir -p out/run-support-install/baseline-source/scripts/diag
git archive 5cbb8e4 src scripts/source-version.ts | tar -x -C out/run-support-install/baseline-source
cp scripts/diag/run-support-install.ts out/run-support-install/baseline-source/scripts/diag/
(cd out/run-support-install/baseline-source && node --import tsx scripts/diag/run-support-install.ts ../baseline.json)
```

Compare fixture/profile/initial-body pins before comparing jobs, requested
motion, achieved bodies and events. Collector timestamps and cost vary, so a
rerun is not expected to reproduce the entire report's byte hash. Live reps stop
at four seconds; these are mechanism controls, not rushing-efficiency samples.
