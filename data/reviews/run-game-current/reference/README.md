# NFL rushing reference evidence

This packet contains **data-only conditional observations**. The separate
[engine packet](../engine/README.md) owns simulation comparisons; neither its
balanced calls/fronts nor generated bodies are an NFL usage mixture. Read
[the reference interpretation](../../../../docs/reviews/run-reference-current.md)
and [current diagnosis](../../../../docs/reviews/run-game-current-diagnosis.md)
before comparing final yards or contacts.

| File | What it preserves |
| --- | --- |
| `pbp-report.json.gz` | 2022/2023 full regular-season designed-run and scramble distributions, all conditional cells, exact denominators and source pins. |
| `pbp-query-plan.json` | Query and tool/helper bytes frozen before this collector's first outcome run; this is descriptive work on previously inspected data. |
| `pbp-tests.log` | Ten measurement/operator tests. |
| `pbp-verification.json` | Independent raw-loop main/team-season counts plus all-cell partition and rate checks. |
| `collection-receipt.json` | Collection dates and tool/query identities derived from the actual reports; the PBP receipt is not a reconstructed terminal log. |
| `bdb-labels.json.gz` | Separate BDB2025 nine-week 2022 concept/modifier metadata study; provider labels remain intact. |
| `bdb-query-plan.json` | Frozen query after descriptive source audit and before the new metadata collection, with that limitation stated explicitly. |
| `bdb-tests.log`, `bdb-collection.log` | Metadata operator tests and actual collection log. |
| `bdb-verification.json` | Independent raw Decimal primary-label/yard-operator checks and all-aggregate partition/rate invariants. |
| `contact-operator-audit.json` | Exact old complete-case contact cohort with separate LOS and ball/carrier coordinate operators; not a new all-contact estimate. |
| `contact-operator-probe.py`, `contact-operator-probe.log` | Exact probe bytes and execution log; the receipt preserves its original ignored execution path. |
| `manifest.json` | Source/tool/test and all packet file identities; old inputs/aggregates remain unchanged. |

PBP outcomes require `penalty=false` and finite whole-play gain, exclude
kneels/spikes/two-point attempts, and retain touchdowns/fumbles. Designed runs
exclude scrambles. Scrambles exclude sacks; their distribution must not be
used as the outcome distribution of all attempted QB escapes. Success means
40/60/100 yards-based success, separately named from gain-distance conversion,
recorded first down/TD, possession retained and model-derived positive EPA.
Field-eligible explosive rates have a different denominator from all-run rates.
Every zero-observation rate remains missing rather than zero.

BDB non-nullified metadata rows can retain recorded penalty yards. Its main
`yardsGained` and `prePenaltyYardsGained` operators have separate values and
denominators. Its nine-week concept mix is not the PBP full-season population.
Primary `MAN` is not verified Duo; secondary `SPLIT`, `READ OPTION`, `LEAD` or
`PITCH` tags are annotated modifiers, not fully validated engine installations.
Overlapping modifier margins are not disjoint concepts. Front proxies remain
in the older tracking packet; no true front, hand force or blocking success
is invented from these metadata.

The PBP report includes exact roster-ID listed-position groups, 2022 FTN
sneak/motion/RPO and box-count strata, team-season variation and thin cells.
Roster position is not snap role. Box counts are annotated presentation, not
Over/Under/Odd/Tite/Bear or called rush/drop counts. There is no local 2023
FTN snapshot. Context and team variation are descriptive, not causal effects,
confidence intervals or mandatory generated-roster limits.

## Reproduce offline

Python 3.12.14 and the standard library suffice. No raw download or engine
runtime is required. The default PBP cache is ignored `data/raw/nflverse/`;
the available BDB cache is `/workspace/review-aids/bdb2025/big-data-bowl-data`.
Paths can differ in another environment: the pinned content identities matter.
The one-off contact probe uses those original absolute paths. Its published
copy retains identical bytes; another environment must supply equivalent paths
or retain a new receipt for a path-adjusted probe. The local `aid-1.zip` also
lists all nine tracking-week members; weeks beyond two were not streamed in
this study and must be verified before future extraction.

```sh
python3 -m unittest discover -s test -p test_run_outcome_context.py
python3 scripts/data/run_outcome_context.py \
  --plan-only out/run-reference-current/pbp-query-plan.json
python3 scripts/data/run_outcome_context.py \
  --query-receipt out/run-reference-current/pbp-query-plan.json \
  --out out/run-reference-current/pbp-report.json

python3 -m unittest discover -s test -p test_bdb_run_outcome_context.py
python3 scripts/data/bdb_run_outcome_context.py \
  --plan-only out/run-reference-current/bdb-query-plan.json
python3 scripts/data/bdb_run_outcome_context.py \
  --directory /workspace/review-aids/bdb2025/big-data-bowl-data \
  --query-receipt out/run-reference-current/bdb-query-plan.json \
  --out out/run-reference-current/bdb-labels.json
```

Fresh receipts and collections carry fresh timestamps; aggregate metric values
should agree on the same pinned source and operator bytes. Compressed reports
contain only aggregates and provenance. Raw tracking, source player rows,
credentials and copied source documents are not published.

**FTN attribution:** FTN Data via nflverse. FTN-derived charting strata and
conditional aggregates are under
[CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Changes:
exact game/play joins, explicit selection/penalty filters, roster-position
and situational grouping, and aggregation. Other PBP/roster sections retain
their NFL/nflfastR/nflverse provenance. Big Data Bowl source access/reuse
remains governed by the competition terms; publication of these derived
references does not grant access to raw files.
