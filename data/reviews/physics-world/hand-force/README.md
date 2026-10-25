# Sustained hand-force evidence

Read [the numerical diagnosis and limits](../../../../docs/reviews/hand-force-integration.md),
[the separate boundary repair](../../../../docs/reviews/carrier-boundary-control.md),
[the OL ownership audit](../../../../docs/reviews/ol-path-audit.md), and
[the football stress-test catalogue](../../../../docs/FOOTBALL_STRESS_TEST_PLAN.md).

Parent commit: `c02a3b94ef0a0d6d689c7cb4feda43d3276e13ff`.
Final engine content SHA-256:
`bf3da801c3f8ad3b9729d6e808665bb6f67f9e59c0dbdb0262316267307cf631`.

`World.handIntegration` defaults to `centered`. Explicit `end` preserves the old
hand travel rule. The nine-fixture refinement panels and the 144-run comparison
use **one final source with two explicitly selected modes**, while retaining
the same current controller repairs. Code equality alone is not mode equality.
Old diagnostic schemas omit preloads from their generated command field; the
manifest records the declared actual invocations and preload hashes. Targeted
traces record the mode and actual arguments directly.

## Retained observations

- `comparison.json`, `panel-end.json`, `panel-centered.json`: nine redirect
  fixtures at six resolutions and twelve frontal tackle guards. Native maximum
  closest-distance error falls from .82204 to .18168 yd; mean .20947 to .06167.
  Native fall/corner disagreements remain zero. Individual errors can worsen;
  identical saturated fixture rows are not independent observations.
- Eight `*.trace.json.gz` files: compact retained end/centered 12/192 traces,
  both with live controls and with the same frozen old-native command list.
  Excerpts preserve every controller tick, complete first physics tick, common
  native boundaries and transition neighborhoods. Each records the full raw
  file checksum and explicit retention rule. Full ignored raw files are not
  claimed present in this folder. The shared-input error falls .42782 to .06055
  yd. Exact observational neutrality and historical-option preservation are
  checked separately.
- `end-runs-compact.json.gz` / `centered-runs-compact.json.gz` and
  `run-comparison.json.gz`: 144 actual 11v11 inputs per mode, three roster pairs,
  six run concepts, Over/Under, mirrored calls and two reused seeds. Seven
  observation/recording controls per mode. These are **pre-penalty** results,
  not official game averages or NFL targets.
- `parent-to-current-runs.json.gz`: separately labelled original parent versus
  the combined current engine, including both controller fixes. It is not a
  one-change hand-force comparison. Original parent raw measurements remain in
  the earlier bounded-attachment evidence folder.
- `current-tackles.json.gz` / `tackle-comparison.json.gz`: all 64 ordinary tackle
  encounter signatures match the parent's production panel, including eight
  faster-runner escape negatives and the separate crossing witnesses. The
  physical channel changed here is hand contact, not ordinary grasp tackling.
- `current-ol.json.gz`: current combined-source four-fixture assignment/contact
  trace, with exact unobserved controls. The isolated ownership-before/after
  recordings remain in the separate OL evidence folder; their gains are not
  silently relabelled as current results.
- Test/type/build/Python logs preserve executed checks. `tests.log` retains the
  first concurrent run: all 593 collected assertions passed, but Vitest reported
  one worker RPC timeout, so its command exited nonzero. The final quiet run has
  its own log and result; no assertions or suites were disabled.
- `end-games9.json.gz` / `centered-games9.json.gz`: two measured games per mode,
  initially matched game seeds and one roster pair. Warm games are excluded.
  All four finish with zero physical timeouts, lower-bound releases or support
  motor-work excess. Momentum/work residuals stay below `1.1e-11` / `5.8e-11`.
  Later play calls and random draws diverge; this is a guard, not a causal
  game-stat estimate. Timings were not collected under isolated benchmark
  conditions and must not be used to claim a speed change.
- `verification-manifest.json` pins the retained files, current tools and
  actual mode-selecting invocations. The clean final suite passes 599 tests in
  59 files; 22 Python tests, typecheck and final build pass. Historical recording
  script hashes stay historical; the current script hash does not replace them.

| Same-source 144-run guard | End velocity | Centered |
| --- | ---: | ---: |
| Mean pre-penalty gain | 1.797 yd | 1.930 yd |
| Median gain | 1.06 yd | .95 yd |
| Stuffs / 10+ gains | 29 / 4 | 33 / 4 |
| Missed attempts / broken holds | 12 / 11 | 10 / 10 |
| Physical timeouts / lower-bound releases | 0 / 0 | 0 / 0 |

The larger stuff count is retained, not corrected with force fitting. These
matched inputs test transfer and exposed behavior, not rushing-rate realism.
Momentum/work residuals remain below `6e-12` / `4e-11` in both panels, with zero
support motor-work excess. A small game guard is separate from causal local
evidence: physical changes alter later calls, draws, fatigue and game history.

## Reproduce from the repository root

Use the pinned Node 22.23.3 toolchain and installed dependencies. Keep sources
frozen while collecting measurements. Ordinary panels retain controller rate,
rosters and inputs; only the explicitly labelled mechanical probes vary physics
subdivision. No skills, forces, outcome rolls or NFL averages are fitted.

```sh
node --import tsx scripts/diag/hand-divergence.ts out/hands/end --hand-integration=end
node --import tsx scripts/diag/hand-divergence.ts out/hands/centered --hand-integration=centered
node --import tsx scripts/diag/hand-divergence.ts out/hands/shared-end --hand-integration=end --controller-input=out/hands/end/redirect-12.json.gz
node --import tsx scripts/diag/hand-divergence.ts out/hands/shared-centered --hand-integration=centered --controller-input=out/hands/end/redirect-12.json.gz
node --import tsx --import ./scripts/diag/disable-centered-hands.ts scripts/diag/hand-convergence.ts out/hands/panel-end.json
node --import tsx --import ./scripts/diag/enable-centered-hands.ts scripts/diag/hand-convergence.ts out/hands/panel-centered.json
node --import tsx --import ./scripts/diag/disable-centered-hands.ts scripts/diag/run-contact-review.ts out/hands/end-runs.json
node --import tsx scripts/diag/run-contact-review.ts out/hands/centered-runs.json
python3 scripts/diag/compare-run-contact.py out/hands/end-runs-compact.json out/hands/centered-runs-compact.json out/hands/run-comparison.json
node --import tsx scripts/diag/tackle-timing-review.ts out/hands/current-tackles.json.gz
node --import tsx scripts/diag/ol-path-audit.mts out/hands/current-ol.json.gz
node --import tsx scripts/diag/motion-contact-review.ts out/motion-contact
node --import tsx scripts/diag/long-yardage-run.ts out/long-yardage-run/panel.json
node --expose-gc --import tsx --import ./scripts/diag/disable-centered-hands.ts scripts/diag/held-recovery-football.ts out/hands/end-games9.json 9 --games-only
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/hands/centered-games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

Run the complete suite without concurrent heavy simulation or benchmarking.
The motion tool tests an initialized slice-block inspection window, not a
legal offensive motion/defensive adjustment sequence. The long-yardage tool
audits an existing dropped-edge package with stock 12-yard safety depth, not
a complete NFL prevent install. Their own raw metadata, constraints and
offline films stay with their evidence folders.

Continuous force quadrature is improved here; nonlinear contact transitions,
grasp integration, empirical support/force magnitudes and football controllers
still limit readiness. Full anatomical foot expansion is not justified by this
repair. Next use retained difficult football approaches to diagnose the first
physical or control failure, with ordinary controls beside them.
