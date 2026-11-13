# Teammate turning evidence

Read the [repair review](../../../../docs/reviews/traffic-turning-and-football-handbook.md)
and [handbook](../../../../docs/football-handbook/README.md).

Baseline is commit `7ce3559`, canonical engine source
`dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843`.
Final candidate source is
`0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2`.
The preliminary forecast source `0cc15b15…` used a looser near-distance gate.
It is a controller prototype, not a different physical model.

The final run collector is unchanged. Its published baseline is reused by
reference from [installed-cutoff](../../physics-world/position-technique/installed-cutoff/).
The new packet contains candidate native runs, both source-labelled small pass
panels, comparisons, a first-invalid-instruction witness and final check logs.
The [manifest](manifest.json) pins files/tools/modules and source distinctions.
Intermediate collector command/output paths in archived records are historical;
manifest aliases identify their published location.

## Reproduce the comparisons

From repository root with Node22 and dependencies installed:

```sh
node --import tsx scripts/diag/combo-transfer-review.ts \
  out/football-handbook/traffic-turning/candidate.json.gz
python3 scripts/diag/compare-traffic-turning.py \
  out/football-handbook/traffic-turning/candidate.json.gz \
  0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2 \
  out/football-handbook/traffic-turning/comparison.json
node --import tsx scripts/diag/qb-cue-review.ts \
  out/football-handbook/traffic-turning/pass-candidate
python3 scripts/diag/compare-traffic-turning-passes.py \
  data/reviews/football-handbook/traffic-turning/pass-baseline.json.gz \
  out/football-handbook/traffic-turning/pass-candidate/raw.json.gz \
  0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2 \
  out/football-handbook/traffic-turning/pass-comparison.json
npm test -- --maxWorkers=1
npm run test:data
npm run typecheck
npm run build
node --import tsx scripts/diag/traffic-turning-bound.ts \
  out/football-handbook/traffic-turning/ballistic-bound.json
```

The run collector also writes a full film companion in `out/`; it is omitted
from this packet to avoid duplicating seven MB of browsing data. The retained
candidate native report contains all fixed runs, not just improved plays.
Published baseline and candidate raw files can be passed directly to the new
comparators; output records preserve the paths used in each invocation.

The witness tool takes `--engine`, `--output` and `--expected-source` values.
Use an isolated checkout of `7ce3559` for the baseline; do not modify
the active source during collectors. The first-instruction tool takes the two
witness packets and checks their source/initial/observer controls before
replaying the two original commands. Its CLI is documented in the tool.

[Forecast-screening equivalence](forecast-screening-equivalence.json) retains
all 186 matched execution signatures from the preliminary/final candidates.
[The ballistic-bound probe](ballistic-bound.json) pins its roster, tools,
sources and 954 forecast/35,304 certified-clear-picture checks. Those bounds
concern the nominal circle and constant-velocity peer model. They do not
guarantee clearance against a peer's unknown future motion or all shoulder
footprints.

## What this does and does not establish

The 160 ordinary balanced runs, two supplements and 24 passes are fixed
mechanism controls. All source-matched initial bodies/profiles and observer
controls are checked. Recorded work/force limits concern the actual sampled
actors/ticks. They do not establish every-player contact prevalence or
calibrate human grip/strength. One baseline passing endpoint remains censored.

All adverse whole-play outcomes remain in the comparisons. The largest adverse
run avoids a real RB/RG impact and loses yards; it is retained because physical
coherence and gained yards are different questions. Small game scores remain
descriptive warnings, not NFL trends. Collector runtime is affected by recording
and host load; the conservative screening reduces needed forecasts without
proving a universal speedup percentage.

The [separate orientation packet](../orientation/) comes from real selected
NFL trajectories, not these simulated plays. Its tool/filters/raw provenance
and semantic limitations are independent. Never pool those cohorts as if
they measured one population.
