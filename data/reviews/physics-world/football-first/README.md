# Football-first support review: live-World evidence

Read [the current cost-benefit recommendation](../../../../docs/reviews/physics-cost-benefit-and-development-philosophy.md)
first; the [previous two-slot design](../../../../docs/reviews/football-first-physics-simplification.md)
remains a fallback. The owner paused further 3D expansion. This is an observational comparison
of existing `World` support modes, **not an implementation or validation of the
recommended two-foot model**.

The committed [summary](summary.json) pins engine source, runtime, scripts,
exact commands and output identities. All runs are sequential on Node 22.23.3
at engine source SHA-256
`150d8ed430ec7321c9927cf967eb35824a01c721661e479edd18ec7813c07ff5`
(`7cda8ef`). The new runner is observational; it does not change engine source,
controllers, capabilities or RNG. Source identity is checked before and after.

## What was compared

- Existing `hand-convergence.ts`: nine seed/power fixtures at six resolutions
  and twelve ordinary frontal-tackle guards per model. Native 12 subdivisions
  are compared with 192. Controls run at 20 Hz; the finest result is a numerical
  reference, not NFL truth.
- Existing `shared-capabilities.ts`: five tasks (anchor, double-drive, shed,
  absorb and jam), four common profile variants, two mirrors and three
  resolutions: 120 cases per model. Native 12 subdivisions are compared with
  48. This is a mechanical capability panel, not full technique validation.
- Existing `scenario-pack.ts`: 63 real-technique scenarios per model, including
  crossing approaches, redirects, seals, squeezes, releases and sideways hits.
- Existing `virtual-foot-support.ts`: 54 controlled stationary-start recovery
  cases across support modes, capacities, duplicate holds and resolutions.
  Bodies are free to move. A separate direct-state-reset drift probe is
  explicitly synthetic; it is not a repeated physical-hit experiment.

`legacy` is the product default. `virtual-foot` is selected for the first three
diagnostics through the existing explicit preload
`scripts/diag/enable-virtual-foot.ts`. That preload changes only the diagnostic
World selector before its first step; it is not imported by the product. The
recovery diagnostic selects both modes explicitly and uses no preload. Source
SHA alone does not identify a selected support mode.

The runner validates fixture grids and reconstructs matched-row differences.
It fails on a failed subprocess, source drift or missing/invalid output. Known
physical regressions remain measurements; they are not suppressed or converted
into a passing readiness result.

All seven subprocesses completed. The review increment also passes the full
project typecheck and build. Engine source is unchanged; the full test suite
was not rerun for these documentation and observational-runner changes.

## Findings and limits

The virtual-foot experiment removes native hand fall disagreements (3/9 to
0/9), but worst hand closest-distance disagreement stays 0.822 yd. Its five-task
mean position difference worsens from 0.030 to 0.129 yd, and worst difference
from 0.069 to 1.323 yd, concentrated in strong/heavy press-jam cases. Ordinary
frontal tackles remain successful. Momentum/work checks do not establish
correct football outcomes or calibrated contact magnitudes.

The controlled recovery panel distinguishes actual transmitted grip force
from geometric recovery restriction. Its duplicated rows guard shared force
capacity. The synthetic drift probe illustrates missing finite support, not
the frequency of that drift in games. The earlier
[live telemetry and model-switch evidence](../virtual-foot/README.md) remains
separately source-pinned.

Wall times are descriptive single runs. They are not a paired repeated
22-player performance benchmark. No new full-game calibration, replay library,
NFL fitting, anatomical calibration or universal two-foot generalization is
claimed. The preceding source checkpoint passed 476 TypeScript and 22 Python
tests, typecheck and build; those historical suite results are not a newly run
suite for this review.

## Reproduce

From the repository root, with the pinned Node 22 runtime and installed lockfile
dependencies:

```sh
node --import tsx scripts/diag/football-support-review.ts out/football-support-review
```

The runner writes raw reports/logs and `summary.json` under the ignored output
directory. It executes all existing diagnostics in sequence and records exact
commands. Keep expensive game guards and the full suite separate from this
bounded panel. `node_modules` must be present; consult `.nvmrc` and the prepared
cloud environment for the pinned runtime.

Read [PHYSICS_DEVELOPMENT.md](../../../../docs/PHYSICS_DEVELOPMENT.md) for the
renewed implementation order. Next is a narrow support experiment inside actual
World with bounded effective support/recovery, followed by shared capability/real-technique transfer, normal movement,
localized convergence and before/after film. A new unused physics backend or a
more complete 3D contact lifecycle is not the next gate.
