# Situational schematic reference

Read the [pilot review](../../../../docs/reviews/schematic-data-context-pilot.md).
This is an offline, data-only descriptive study, not an engine accuracy check,
fitted policy or target for physical outcomes.

`query-plan.json` declares the query and collector before the measured run.
`report.json.gz` contains all 666 joint cells, margins, score/clock rows,
common-support comparisons, team-season variation, exclusions and source pins.
`manifest.json` fingerprints the published bytes, scripts and unchanged original
acquisition manifest. Logs retain the actual eight operator-test results and
collection completion.

Both PBP seasons and the 2022 FTN file were already present locally and matched
the [existing snapshot](../../nflverse/input-manifest.json). No source data was
downloaded or copied into this packet. Missing 2023 FTN is explicitly absent,
not a zero rate. Live penalty rows remain in observed calling/motion denominators;
depth, screen and gains require a known false penalty flag. Named-target depth
requires an actual throw, receiver ID and finite air yards.

```sh
python3 -m unittest discover -s test -p test_schematic_context_audit.py
python3 scripts/data/schematic_context_audit.py \
  --plan-only out/schematic-context/query-plan.json
python3 scripts/data/schematic_context_audit.py \
  --query-receipt out/schematic-context/query-plan.json \
  --out out/schematic-context/report.json
```

Run from the repository root. Requires Python's standard library and the pinned
local inputs under `data/raw/nflverse/`. A new receipt/report has new timestamps;
reproduce metrics on the same query/input/helper/collector bytes. Keep the saved
receipt for the original measured run. A source/definition change must be
explicitly declared before collecting a new phase.

**FTN attribution:** FTN Data via nflverse. Derived FTN charting aggregates are
under **CC-BY-SA 4.0**. Changes: exact PBP/chart joins, declared cohorts and
penalty/missing-value filters, conditional aggregation and common-cell score
standardization. PBP fields retain NFL/nflfastR lineage. Charting and score-state
associations do not establish player thoughts, causal psychology or contact
physics.
