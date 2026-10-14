# Capped passive-grip work correction

The displaced witness's remaining work error comes from the capped phase's
explicit quadrature, before the viscous tail. A bounded Gauss correction closes
that accounting without changing the force, physical limits or recovery law.
Keep this diagnostic: it is ready for a further mechanical composition test,
not production integration or full-patch promotion.

Tested code/harness: `5ec25414b6dfd5b5acedd2467898a5c3f49a23b1`, from
[PR #19](https://github.com/tannerthardy/football-simulation-/pull/19)
`7e64731`. Comparison baseline remains `4ded6b6`; runtime source remains
`f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12`.
[Receipt](../../data/reviews/current/grip-cap-work.json) records exact flags,
inputs/reference hashes, method settings, raw receipts and measurement cost.
No `src/`, capacity, recovery, runtime default, RB flag or test expectation
changed. Original adaptive/eliminated modes reproduce their complete previous
results exactly on all five inputs. Corrected slow references and earlier
experimental branches remain preserved.

## Cause and bounded correction

The cap holds tangent force magnitude at the existing capacity while its
direction, moment arms and lower attachment change. RK4 independently
approximates velocity, geometry and power, but does not preserve quadratic body
energy exactly. Its motion error can be small while work is inconsistent.

The new explicit diagnostic mode, `boundedGripInterval(input, 'capped')`, uses
the existing two-stage Gauss operator during this phase. Tangent force is still
the prescribed `-sign(initialSlip) * capacity`. Solve the original linear
slipping-clock stages, then iterate moving geometry as before. Translation,
yaw, material/raw-foot motion, impulse, temporal moments and physical power
use the same converged stages. Work is independently integrated; it is never
replaced with a kinetic-energy difference. The .3-second slipping law, capacity,
cap-exit condition and 98% slip marker are unchanged.

The viscous-tail method and explicit 100%→98% settling interval are unchanged.
The candidate retains the existing eliminated mode's ≤1 ns root bracket,
12 geometry iterations, bounded retries/refinement and original scope and
accuracy gates. Unsupported channels return no state. This does not prove
complete event detection or provide a World fallback adapter.

Saved input: `patch-45-8-0-3001-1-offset` in the unchanged
`config/grip-bounded-reference.json`; interval 4.167 ms. Phase checkpoints are
collected after timing and the observed/unobserved accepted outputs are exact.

| Four-partition displaced solve | Previous eliminated mode | Capped correction |
| --- | ---: | ---: |
| Work residual at cap exit | 2.20622e-8 | −1.06581e-14 |
| Work residual at slip exit | 2.20670e-8 | 4.81748e-12 |
| Final accepted residual | 1.66809e-9 at eight partitions | 4.79083e-12 at four |
| RHS evaluations across refinement | 1,030 | 552 |

The old four-partition motion/state difference was already below its gate, but
work failed. The correction removes that unnecessary whole refinement. The
acquired case remains at four partitions: cap work also improves, while its
cost rises because it previously needed no extra refinement.

## Accuracy and opposing evidence

All 44 focused contracts and typecheck pass. Reused independent World
references cover acquired mirrors, displaced mirrors and the frontal opposing
control. Additional checks cover wholly capped force/clock/energy, independently
computed cap-exit kinetic energy, unequal intervals and angular temporal-moment
composition, rotated anisotropic geometry, zero/tiny capacity and refused
normal/reel/active/over-reach channels. Input objects are unchanged.

| Maximum error against five independent references | Candidate | Existing limit |
| --- | ---: | ---: |
| Position / facing / spin | 1.86e-10 / 6.82e-9 / 7.24e-7 | 5e-7 / 2.5e-6 / 2.5e-4 |
| Material / raw-foot position | 6.20e-10 / 2.10e-9 | 5e-7 each |
| Leg share | 7.13e-8 | 1e-6 |
| Impulse / temporal moment | 1.24e-6 / 1.18e-8 | .002 / .00005 |
| Angular impulse / temporal moment | 1.44e-6 / 1.36e-8 | .0005 / .000005 |
| Body / motor / passive work | 3.94e-7 / 8.72e-6 / 9.11e-6 | .01 each |
| Work / angular balance residual | 4.79e-12 / 3.64e-12 | 1e-8 / 1e-7 |
| Body/impulse representation residual | 1.42e-14 | 1e-10 |

No tolerance was loosened. The prior reference's leg-share quantization error
remains visible. A raw-foot chart-exit control is refused by all three methods,
with no accepted state or mutated input. No new World references, full suite,
native tackles or games were needed to decide this local numerical correction.

## Cost and limits

Node 22.23.3, AMD EPYC 9V74. Uninstrumented, serial timing on identical inputs:
five warmups per method/case, 21 interleaved repeats with rotating method order.
Preparation, validation and logs are outside the timer. Repeated endpoints are
identical. P95 is the nearest-rank sample statistic, not a population bound.
Numbers are ms per isolated interval, not game speedups.

| Input | Existing adaptive median / p95 / max | Eliminated | Capped correction |
| --- | ---: | ---: | ---: |
| Acquired angled | 2.644 / 4.167 / 5.785 | 1.524 / 2.025 / 4.737 | 1.694 / 2.338 / 4.798 |
| Displaced material | 4.278 / 6.729 / 8.847 | 2.666 / 4.863 / 9.682 | 1.778 / 2.185 / 3.681 |
| Frontal force-free | .475 / 1.807 / 2.646 | .374 / 5.494 / 20.193 | .491 / 6.494 / 18.457 |

Displaced median improves about 33% relative to eliminated; acquired regresses
about 11%. Both loaded cases meet the provisional median≤2 ms / p95≤5 ms
target. The original frontal panel fails the tail target, with large spikes
across methods. This control invokes no stage solve and its physical endpoints,
72 RHS evaluations and four partitions are exactly the same between eliminated
and capped modes.

One targeted fresh-process frontal repeat used 30 warmups and 21 rotating
repeats: adaptive median/p95/max .279/.475/.639 ms, eliminated
.315/1.155/1.342 ms, capped .330/.810/1.073 ms. The large spikes did not recur,
but this does not prove their source or erase the first panel. Both results and
the repeat's reproducible script are retained in the receipt. Sustained local
cost is adequate for the next diagnostic; production tail cost remains unproved.

Chart-exit refusal, one warmup/seven repeats: adaptive median/max .822/2.129 ms,
eliminated 1.753/2.008 ms, capped 1.589/3.440 ms. Candidate maximum worsens
relative to eliminated. These are worst observations in selected controls,
not a global worst-case bound. RHS counts omit geometry-only queries: acquired
candidate uses 228 stage solves/690 geometry iterations; displaced uses 216/654.

Recorded launcher cost is 36.79 seconds including two typechecks, focused
development/final checks, evidence collection and the targeted frontal repeat.
Raw exploratory probes remain in ignored `out/grip-cap/`.

## Next decision

Accept this as the bounded capped-work repair and preserve it experimentally.
Next test one existing mixed normal/tangent witness at the actual bounded
attachment with changing lower share. It must respect the common grip capacity
and preserve motion/work before multiple contacts or World insertion. General
normal/reel channels, active drive, multiple-contact/common-foot allocation,
long holds and exactly-once World effort/fatigue composition remain unproved.

The nine unrelated patch-gate failures remain at their existing 43/52 pin and
were not rerun or re-pinned. Zero timing invocation excludes this correction as
their repair; it does not assign them a common cause. Keeper/angular-law PR #14
and the .24-yard support-history fork remain independent. The integration owner
will run the preserved full suite on a reviewed exact combined candidate; this
branch designates no new baseline.

Reproduce with Node 22.23.3 and the baseline launcher:

```sh
npm run baseline:run -- --candidate -- npx vitest run --project core test/grip-bounded.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-cap-evidence.ts --benchmark
```
