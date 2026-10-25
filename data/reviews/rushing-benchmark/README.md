# Rushing benchmark and native-engine evidence

Read the [full review](../../../docs/reviews/rushing-benchmark-and-next-priorities.md)
first. This packet supplies situation-specific NFL references and tests whether
an engine change improves believable football. It does not fit strength, speed
or final yards to a league-wide mean.

The promoted production change records the actual QB ID at his existing
scramble transition. All physical execution and outcomes remain compatible.
The quarter-speed traffic gather is **withheld**, despite valid local previews,
because it breaks retained Split Zone and PA finishes and worsens the broader
game guard. Prototype code in `spacing/` is evidence, not active engine code.

## What is in the packet

| Directory | Contents |
| --- | --- |
| `reference/` | Four complete regular seasons, 2022–2025: 52,113 clean designed runs, 3,883 observed scrambles and 1,087 completed games. Explicit operators, source and query pins, missingness, distributions, joint situations, team-season variation, game-cluster intervals and retrospective temporal replication. |
| `concepts/` | All nine BDB2025 weeks from 2022: 6,223 provider-designed runs, 6,103 non-sneaks, 136 games, exact primary concepts and separate overlapping modifiers. Concept/situation cells, clustered uncertainty and provider/penalty caveats. |
| `engine/` | Historical baseline601, current3cb and withheldQuarter8d27 reports, plus the latest productionRecording8f8cf report. Native context/roster adapter, matched NFL expectations, continuous/rounded sensitivity, comparability sidecar and unchanged-aggregate proof. |
| `validation/` | Fresh eight-game index, 1,149-snap recording compatibility, 96 passing controls, fixed 162-run/96-pass experiment guards, source receipts and final test/typecheck/build logs. |
| `spacing/` | Failed quarter-speed hypothesis: local mirrored/stop/rear controls, source patch, selected six-tail proof, full adverse Split Zone traces and first-fork diagnosis. |
| `tools/` | Exact collectors, reducers and read-only comparisons/diagnoses. The historical adapter bytes are retained separately as a gzip file. |

The latest production clean RB/FB cohort has 302 runs: 6.26 yd mean, 31.8%
success and thirteen 40-yard gains. Its observed NFL context mixture expects
4.68 yd, 41.1% success and about 1.90 such gains. These eight generated-roster
games are descriptive diagnostics, not a representative NFL sample. The new
recording source has identical designed-run aggregates to historical 3cb.

Success here means 40/60/100% of positive yards to go on first/second/third-fourth
down; 45/60/100 and positive EPA are separate sensitivities. Explosiveness means
inclusive 10/15/20/30/40-yard tails. Field-eligible denominators are separate.
Short TDs, possession losses, penalties, missing labels, scrambles and sacks are
not silently folded together. Unsupported joint cells back off explicitly,
retaining carrier/action type and recording which context information was lost.

The newest QB IDs make a classification mismatch visible: native committed
escapes can remain rushes when tackled behind the line, whereas NFL scramble
labels exclude failed escapes recorded as sacks. Read
[`productionRecording8f8cf-comparability.json`](engine/productionRecording8f8cf-comparability.json)
before interpreting that comparison. Negative native escapes stay in the report;
their gap is not evidence that physical force is wrong.

## Reproduce the NFL outcomes reference

Run from the repository root with Python 3. The fetcher uses standard-library
HTTPS and the exact twelve public inputs listed in the combined manifest.
Existing files must match their declared size/SHA; mismatches stop rather than
being overwritten. Raw inputs remain in ignored `data/raw/`.

```bash
mkdir -p out/rushing-reference
python3 scripts/data/fetch_rushing_reference.py \
  --manifest data/reviews/rushing-benchmark/reference/input-manifest.json \
  --out data/raw/rushing-benchmark-four-seasons
python3 scripts/data/rushing_benchmark.py --seasons 2022 2023 2024 2025 \
  --plan-only out/rushing-reference/query.json
python3 scripts/data/rushing_benchmark.py --seasons 2022 2023 2024 2025 \
  --input-dir data/raw/rushing-benchmark-four-seasons \
  --manifest data/reviews/rushing-benchmark/reference/input-manifest.json \
  --query-receipt out/rushing-reference/query.json \
  --out out/rushing-reference/nfl.json
```

The frozen main module SHA is
`0b5d645953c303fcb5804643a2829de83418c135952c25c122f69bb28a4df238`.
Defaults are 250 deterministic, season-stratified whole-game bootstrap draws,
seed 20261011, with minimum 100 known metric observations and 20 exposed games.
Rare/zero tails remain cautioned; support is checked per metric, not just per
cell. The query must be saved before collection. Exact bytes, source timing,
provider lineage and source-dictionary receipts accompany the published result.
New declarations or recorded provenance paths may produce different report
bytes; unchanged input bytes retain their fingerprints.
The 2024/25 comparison is retrospective replication, not a blinded holdout.

If upstream release bytes change, use a deliberately reviewed new manifest
and query instead of silently relaxing these pins. `--verify-only` verifies a
local input directory without downloading.

## Reproduce the concept reference

Use an authorized local copy of BDB2025 containing the exact `plays.csv`,
`games.csv`, `players.csv` and `player_play.csv` pins in the concept manifest.
This analysis needs the metadata, not another pass over all tracking frames.

```bash
python3 scripts/data/run_concept_situation_benchmark.py \
  --plan-only out/rushing-reference/concept-query.json
python3 scripts/data/run_concept_situation_benchmark.py \
  --directory /path/to/authorized/bdb2025 \
  --query-receipt out/rushing-reference/concept-query.json \
  --out out/rushing-reference/concepts.json \
  --markdown out/rushing-reference/concepts.md
```

The [concept review](concepts/README.md) explains its 1,500 game-block draws,
thin cells, exact-primary labels and pre-penalty sensitivity. MAN is not a
verified Duo label; Outside Zone does not separately identify Wide Zone/Toss.
Observed listed-position composition is not charted personnel or a named front.
Motion positives and fully known negatives are separate from missing/incomplete
eleven-player observations. Selection differences prevent causal scheme rankings.

## Reproduce the latest saved-index comparison

This adapter reads native saved outcomes and rosters; it does not run decisions
or physics. The frozen index and NFL gzip are already committed. Declare before
executing, and preserve the comparability sidecar alongside the resulting report.

```bash
python3 scripts/data/engine_rushing_benchmark.py \
  --index data/reviews/rushing-benchmark/validation/recording-games-index.json.gz \
  --nfl-report data/reviews/rushing-benchmark/reference/nfl-benchmark.json.gz \
  --expected-source 8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d \
  --expected-collector 7aae5bb1bc756efef52ab6bd9abc380e564bf5a2d59596d74629ab1ca66edc35 \
  --label productionRecording8f8cf \
  --plan-only out/rushing-reference/engine-query.json
python3 scripts/data/engine_rushing_benchmark.py \
  --index data/reviews/rushing-benchmark/validation/recording-games-index.json.gz \
  --nfl-report data/reviews/rushing-benchmark/reference/nfl-benchmark.json.gz \
  --expected-source 8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d \
  --expected-collector 7aae5bb1bc756efef52ab6bd9abc380e564bf5a2d59596d74629ab1ca66edc35 \
  --label productionRecording8f8cf \
  --query-receipt out/rushing-reference/engine-query.json \
  --out out/rushing-reference/engine.json
```

To generate a fresh eight-game index from the source-pinned production checkout:

```bash
npx tsx data/reviews/rushing-benchmark/tools/collect-recording-games.ts \
  . out/rushing-reference/games \
  8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d
```

The collector uses the preceding packet's pinned `common.ts`, ordinary Game
hooks and seed7/two generated leagues. The source hash covers all `src` files,
lexically sorted, hashing each relative name, NUL, file bytes, NUL. No extra
vision/RNG decisions are introduced. The compatibility projection removes only
the new scramble `stats.rusher`; the actual raw result remains fully recorded.

```bash
python3 data/reviews/rushing-benchmark/tools/compare-recording-games.py \
  data/reviews/alley-support-and-tail-audit/games/candidate-index.json.gz \
  data/reviews/rushing-benchmark/validation/recording-games-index.json.gz \
  out/rushing-reference/recording-compatibility.json
python3 data/reviews/rushing-benchmark/tools/compare-recording-passing.py \
  data/reviews/alley-support-and-tail-audit/passing/final.json.gz \
  data/reviews/rushing-benchmark/validation/recording-passes.json.gz \
  out/rushing-reference/passing-compatibility.json
```

## Retain the failed movement experiment

The quarter-gather source is
`8d27d085b6e469115435aeae79835c571f0e124f330c8ff856a55532a5e77006`.
To reconstruct it, archive commit `c436cef` into a separate ignored directory
and apply `spacing/quarter-gather.patch` **there**. That parent has source
`3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f`.
Keep the production checkout unchanged. For local controls, install the two
`prototype-*.test.ts` files under the archive's `test/`, removing the prototype
filename prefix and preserving the original spacing-yield controls. Candidate
29/29 pass; parent 27 pass with two expected native gather failures.

The full adverse Split Zone traces reproduce the existing 162-run panel's
`CT-R1-split_zone-under-L-S11` input/result and observer/plain parity. Their
first fork is RB movement at 2.15 seconds, after 43 identical physical steps.
The v2 saved-body diagnosis verifies a feasible quarter gather through observed
LG traffic. Later tackle choices differ; an extended assist displacing a better
body-wrap opportunity is a hypothesis, not yet a proved bad decision under the
assistant's consumed cue. Ordinary assists and legitimate grip slips are
required opposing controls before any repair.

`tools/adverse-run-commands.ts` inherits a generic six-tail usage comment but
actually selects only that one Split Zone case. The six-tail collector's mutable
`job` metadata alias is explicitly omitted by its prefix comparison; original
physical commands/bodies and consumed cues remain retained. The single adverse
collector clones jobs/zones, and its full-prefix proof has no such alias. Only
the v2 LG diagnosis is published. Raw six-tail duplicates remain ignored;
the selected proof, reducer, collector and input/source receipts are committed.

The experiment's near-matched ordinary success and capped mean coexist with
21 forty-yard gains against 1.80 expected. It demonstrates why ordinary
success, physical feasibility, tails and normal passing controls must all gate
promotion together. Eight-game later calls diverge after earlier outcomes;
their scoring difference is a regression guard rather than a paired causal
effect estimate.

## Checks and data lineage

Final checks: **1,108 TypeScript tests, 118 Python tests, typecheck and build**.
The full logs and native compatibility receipts are in `validation/`.
The top-level `artifact-manifest.json` identifies the exact published bytes;
sub-manifests preserve original execution paths and receipt hashes. Moving an
unchanged report here does not rewrite its historical provenance.

```bash
python3 data/reviews/rushing-benchmark/tools/verify-packet.py
python3 data/reviews/rushing-benchmark/tools/verify-packet.py --verify-source
```

The second command additionally requires the exact producing engine, tools,
tests and review files. Later branch changes may legitimately fail that stricter
check while the historical packet's own byte verification continues to pass.

Public outcome/roster inputs retain their nflverse/nflfastR lineage. FTN chart
aggregates are derived from **FTN Data via nflverse**, provided under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); preserve that
attribution and share-alike license for those derivatives. This does not
relicense the project or other source families. BDB aggregates preserve separate
Kaggle/NFL provenance; this packet does not redistribute their raw competition
files or grant new raw-data access rights.

No external research or credentials are needed to read the committed benchmark.
Additional contact/timing extraction should use the tracking already available;
new downloads and more anatomy are not prerequisites for the next native
Counter, run-fit and tackle-finish diagnoses.
