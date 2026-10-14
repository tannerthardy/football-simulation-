# Grip refinement must converge its persistent state

The experimental slow solver could report convergence while its grip share and
common-foot displacement missed the declared accuracy limits. This candidate
repairs that acceptance gap on the retained mechanical witnesses. It does not
make the solver practical for production.

Code/checks are pinned at **`dac7a5732a9cf85098b6a77f9f3c198653574db9`** on
`codex/grip-state-convergence`, from preserved PR #7
`62f1f0e344c84e6501bb15257519f367eda9d58d`. Candidate runtime hash is
`f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12`.
Comparison baseline remains **`4ded6b6`**. The original corrected slow reference
`8e36cce` and PR #7 remain unchanged at their pins. Keeper-law PR #14, the nine
historical patch failures and the .24-yard support-history investigation stay
separate.

## Which paths change

`resolved` and `fast` share the same error estimator; both now use the stronger
acceptance check. They remain explicitly selected experimental World options.
Ordinary `midpoint`, center contact and the zero/tiny-load bypass keep their
existing paths. No new flag, capacity, recovery rule or controller is added.
The existing `.3`-second sliding constant is moved into a shared module so the
physical law and numerical bound read the same value. World's physical operator
is otherwise byte-identical after normalizing precisely that extraction.

The check now compares:

- Actual `legs`, effective recovery coupling and stored attachment share.
- Raw common-foot offset and its lifecycle state, rather than only the grasp
  point that partial coupling can make appear converged.
- Material/reference coordinates, hold length and attachment/graph topology.
- The existing body motion, grasp point, work and discrete grip-state checks.

Leg/share tolerance is **`1e-6`**, and foot/material/hold tolerance **`5e-7 yd`**,
matching the published bounded-reference requirements. Existing body/work
tolerances and the **16,384-piece maximum** are unchanged. Nonfinite comparison
results fail closed.

## Why adding endpoint fields was insufficient

The first endpoint-only candidate still falsely accepted the acquired witness
at 512 pieces. At 128, 256 and 512 pieces, the two grids quantize the slip
transition to the same accumulated sliding duration. Their final legs agree
within floating-point noise while both differ from the independent reference
by **`1.36e-5`**. A second plateau at 1024–4096 retains a `2.44e-6` share error.
Taking another dyadic sample or checking the final slipping flag alone does not
resolve this aliasing.

Scratch solves now record observed slip transitions within the issued interval.
For each grip, a transition contributes uncertainty from the existing slide
law, `(1-legs) * (1-exp(-width/.3))`. The bound uses the larger adjacent piece
width and lower preceding/current legs; a short piece following a long one
cannot erase the earlier timing uncertainty. Contributions accumulate per grip,
then the estimator checks the largest grip uncertainty against `1e-6`.

The first force sample establishes the phase for the newly issued plan. The
old interval's slipping flag is not assumed to describe a changed command.
Tracking lives in a scratch-only WeakMap; it adds no physical state, effort,
force, work or controller observations. The finer candidate's uncertainty joins
the existing coarse/fine error before either mode accepts it. Fast fallback
uses this same check.

This is a bound on **observed** phase changes, alongside numerical refinement.
It is not a general proof that arbitrary short, unobserved phase reversals or
support-history changes cannot occur. That remaining applicability limit must
stay visible before broader integration.

## Matched before/after evidence

Reuse the five checked cases in
[grip-bounded-reference.json](../../config/grip-bounded-reference.json): acquired
angled mirrors, force-free frontal control and displaced-material mirrors.
The literal input/reference bytes and original checkpoint checksums are
unchanged. Independent fine references are reused; no new football inputs or
reference recollection were needed.

The collector imports the original estimator byte-for-byte from `62f1f0e` and
executes it against the same physical operator and prescribed support as the
candidate. Thus the before comparison is reproducible on this branch, without
switching branches or changing a law. Its output remains explicitly adverse.

| Case | Original accepted pieces | Original legs / foot error | New pieces, both modes | New legs / foot error |
| --- | ---: | --- | ---: | --- |
| Acquired angle, each mirror | 256 | `1.36045e-5` / `5.31022e-7 yd` | 16,384 | `3.48833e-7` / `6.45582e-9 yd` |
| Displaced material, each mirror | 512 | `1.28732e-5` / `3.75490e-7 yd` | 16,384 | `3.26726e-7` / `1.13039e-8 yd` |
| Force-free frontal | 1 | 0 / 0 | 1 | 0 / 0 |

Both new modes pass every published mechanical comparison on all five cases.
The greatest normalized actual error is `.348833`; estimated accepted error is
at most `.697664`. Loaded cases reach the existing maximum **and satisfy** the
criteria, so `limited=0`. This is distinct from an exhausted unresolved result.
The frontal body's tiny `1.86e-10 yd` difference from its accumulated fine
reference remains within the unchanged requirements; body travel is identical
between original/new frontal executions.

An initial large fast material discrepancy was a diagnostic pointer error:
fast commit replaces the private attachment record while preserving body/foot
identity. The collector now queries the live attachment after commit. No
attachment-law fix was needed for that measurement error.

## Correctness coverage and retained failures

**25 focused checks pass**, with typecheck, on the final revision:

- Fourteen new acceptance contracts: hidden foot/material/share/hold errors,
  lifecycle and nonfinite rejection, analytic aliased phase clock, per-grip
  budgets, unequal sample widths, unresolved cap and fast fallback.
- Four preserved physical-time effort contracts.
- Seven selected existing controls for moving off-axis graphs, shared
  normal/tangent budgets, mirrored multiple-contact trial commits, unequal
  external partitions and unchanged zero/tiny/center paths.

The targeted name filter skips eight other preserved assertions; it removes or
changes none. The clock-only tests isolate refinement policy with an analytic
answer; they are not football or contact-law simulations. Existing World
controls separately check motion/work/budgets and shared attachment identity.

The longer synthetic phase clock still cannot meet its uncertainty limit at
16,384 pieces. It now reports **`limited=1`**, rather than a false pass. The
bounded fast-search fallback retains the same acceptance contract and commits
physical time/effort once. No tolerance, subdivision ceiling or existing test
expectation was relaxed to recover an ending.

The old nine patch-gate failures remain documented under PR #7; they were not
rerun or assigned a common cause. No native tackle outcome or .24-yard history
repair is claimed here. No full suite, games or broader football panel were
run; the integration owner retains the exact combined candidate's verification.

## Cost and recommendation

Seven serial repetitions plus one warmup per case/mode on the same AMD EPYC
9V74 machine, Node 22.23.3; no observers/profilers, preparation outside the clock.
With seven samples, reported p95 equals observed maximum. These are **isolated
4.167-millisecond physical intervals**, not complete ticks or game runtimes.

| Case | Original resolved median / p95=max | Stricter resolved | Stricter fast |
| --- | ---: | ---: | ---: |
| Acquired angle | 33.43 / 52.14 ms | 1,063.02 / 1,188.48 ms | 710.77 / 767.40 ms |
| Displaced material | 36.08 / 66.59 ms | 1,091.34 / 1,191.99 ms | 722.26 / 776.73 ms |
| Force-free frontal | 1.373 / 3.275 ms | 1.480 / 1.953 ms | 1.637 / 1.992 ms |

The loaded original rows fail accuracy, so their lower cost is not an
accuracy-matched performance result. The stricter modes are far above the
prior provisional isolated-interval median **2 ms / tail 5 ms** budget. Frontal
median cost also increases modestly despite retaining its single interval.
All recorded launcher work, including development failures and rechecks after
the unequal-piece correction, totals **173.47 s**.

Use the new criterion as a **reviewable diagnostic acceptance correction**;
do not promote the full timing package or broaden production integration.
The single best next step is to localize/integrate grip phase changes without
repeatedly advancing the whole World, and require that efficient candidate to
pass these same share/foot/motion/work gates. More uniform subdivisions have
now exposed their actual cost; they are not the production solution.

## Reproduction

[Receipt](../../data/reviews/current/grip-state-convergence.json) pins source,
settings, reference/operator hashes, all adverse rows, raw packets, exact
commands and costs. The 14 local tests need no ignored packets. The matched
mechanical collector requires the preserved `out/grip-timing` checkpoints and
manifest used by PR #7; its helper verifies their checksums before execution.
Raw development/benchmark output remains under ignored
`out/grip-state-convergence/`.

```sh
npm run baseline:run -- --candidate --receipt out/grip-state-convergence/final-unit-check.json -- npx vitest run --project core test/grip-state-convergence.test.ts test/grip-effort.test.ts
npm run baseline:run -- --candidate --receipt out/grip-state-convergence/final-transfer-check.json -- npx vitest run --project core test/grip-fast.test.ts test/grip-timing.test.ts -t 'zero.*tiny|multiple-contact|moving off-axis|unequal external'
npm run baseline:run -- --candidate --receipt out/grip-state-convergence/publish-typecheck.json -- npm run typecheck
npm run baseline:run -- --candidate --receipt out/grip-state-convergence/publish-accuracy-check.json -- node --import tsx scripts/diag/physics/grip-state-convergence.ts --output=out/grip-state-convergence/publish-accuracy.json
npm run baseline:run -- --candidate --receipt out/grip-state-convergence/publish-benchmark-check.json -- node --import tsx scripts/diag/physics/grip-state-convergence.ts --benchmark --output=out/grip-state-convergence/publish-benchmark.json
```

Run the benchmark serially after other correctness jobs finish. `--grid` reuses
these same inputs to expose the retained dyadic plateaus and runs no snaps.
