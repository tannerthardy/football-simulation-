# Solved support component evidence

These reports cover standalone research components; production `World` does
not select them. Read the [current review](../../../../docs/reviews/solved-ground-and-leg-support.md)
for readiness and the ranked integration work.

Canonical engine source SHA256:
`45441b0fc60f6005908501fdbf8dc129e088aec97b959935d9cf3b1c301cbabe`.
All three diagnostics used Node **22.23.3**, and source/script hashes matched
before and after each run. Hashes are embedded in the reports. Later source
changes do not turn these historical results into evidence for the new source.

- [Vertical support summary](vertical-support-summary.json): nine ordinary
  scenarios × three resolutions; three expected power-budget rejections;
  eight series scenarios × three resolutions; 2,000 seeded repeated ticks;
  hidden interior ground-release and joint-stop fixtures. Independent work,
  momentum, per-segment force and positive-work reconstruction accompanies
  the solver's ledger. Accepted bulk trajectories are omitted; failed inputs
  and analytic fixtures are retained. The raw output hash is embedded.
- [Independent lift reference](vertical-separation-reference.json): eight
  interval partitions against a closed-form separation/flight solution, plus
  two hidden interior separation cases. All ten accept with zero independent
  violations. Coarse trajectory error remains visible.
- [Rigid attachment stress](material-rigid-stress.json): 6,384 accepted
  translated/mirrored trials and 6,000 expected atomic numerical rejections.
  Work is reconstructed from actual point displacement and known impulses.
  The bound certifies a unique standalone angular root, not time accuracy.

The original diagnostic field `maxIndependentLedgerFailure` names the worst
residual sample, not a failed assertion. Ordinary energy residuals are around
1e-12; momentum residuals reach about 5.5e-11. The explicit accepted-contract
violation arrays in the series/random panels are empty. The random panel's
largest independent residuals are 4.15e-10 for energy and 1.07e-9 for momentum.
Its force/power ratios are not evidence of capacity saturation; explicit
scaling, hard-stop and power-rejection cases cover those separate boundaries.

Run from repository root with the pinned Node installation, or an equivalent
Node 22 installation. Raw reports stay under ignored `out/`:

```sh
node --import tsx scripts/diag/vertical-support.ts out/solved-support/vertical.json
node --import tsx scripts/diag/vertical-separation-reference.ts out/solved-support/reference.json
node --import tsx scripts/diag/material-rigid-stress.ts out/solved-support/rigid.json
node node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1
python3 -m unittest discover -s test -p 'test_*.py'
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
```

Verification at this source: **390 TypeScript tests, 22 Python tests,
typecheck and build pass**. These checks do not validate gait, horizontal
traction, finite soles, pitch/roll recovery, live grips or production falls.
There is no physics-capacity fitting or new full-game cohort in this increment.
The [biomechanics shape priors](../../biomechanics-support/README.md) constrain
model geometry and mass assignments; they do not measure NFL strength or turf
traction.
