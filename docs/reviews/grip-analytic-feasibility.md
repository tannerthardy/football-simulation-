# Analytic elimination of passive grip stage velocities

The bounded force-elimination candidate preserves the checked mechanics and
reduces warmed local-kernel median cost by 38% on the acquired grip and 42% on
the displaced attachment. It remains experimental: displaced median cost is
2.46 ms against the unchanged 2 ms budget, and World composition is unproved.
The next target is capped-contact work integration. Its error already exists
before the viscous tail begins; further tail refinement cannot remove it.

Tested code/collector `31d947db6ffd6c279d4baee22701cbfbadd2ea79`, branch
`codex/grip-analytic-tail`, from PR #16 `c641f2b`. Comparison baseline stays
`4ded6b6`; runtime source remains `f0879d09…`. There are no `src/` changes,
new World runtime modes or default changes. Capacities and all physical laws,
including grip sliding and recovery, are unchanged. The
[receipt](../../data/reviews/current/grip-analytic-feasibility.json) pins flags,
input/reference hashes, code, measurements, retained failures and command cost.

## Why this approach

Two exponential prototypes were stopped. The first analytically carried frozen
viscous relaxation, impulse/travel chains and an independent squared-slip ODE
for work. It matched the selected witness but cost 32.45 ms. Including the
observed source in that squared-slip operator reduced RHS calls from 2,960 to
2,372, but independent work agreement still forced small steps. Their code is
preserved at `34d907d` and `67a7dec`; raw evidence stays under
`out/grip-analytic/`. Neither prototype is in the final candidate.

The successful alternative keeps the two-stage Gauss rule already checked in
[PR #16's investigation](grip-event-feasibility.md), but analytically eliminates
its stage velocities through the original viscous law. It iterates only contact
geometry rather than every body, impulse, attachment and work variable.

For each stage, tangent force satisfies `F_i = -v_t,i / M_i`, with existing
mobility `M_i = mu |J_i t_i|²`. At fixed stage geometry its two force unknowns obey

```text
F_i + (h/M_i) sum_j A_ij G_ij F_j = -v_t,i,free/M_i
G_ij = (1/m_a + 1/m_b) n_i·n_j
       + k_a,i k_a,j / I_a + k_b,i k_b,j / I_b
k_a,i = r_a,i·n_i; k_b,i = r_b,i·n_i
```

The small system is solved directly. Positions and held-body facing follow the
same collocation drift chains; material/foot movement uses the actual bounded,
rotated Jacobian. Iterate those geometry fields to consistency, then evaluate
the original physical force, work and ledgers at the converged stages. Work is
never replaced by a kinetic-energy difference. The same Gauss quadrature keeps
its body velocity, torque and independently evaluated power consistent.

The force-free nonrotating head-on control uses the existing explicit operator.
Cap exit and the 98%-capacity slip marker retain their original definitions.
Only the candidate stops event bisection once the bracket is at most 1 ns,
rather than always running 36 subdivisions. The bracket component of two such timing uncertainties contributes
at most 6.67e-9 sliding-share uncertainty, below the existing 1e-6 budget. Actual
motion/share/work are still checked against the independent reference. Existing
adaptive/default results reproduce exactly on all five inputs.

Geometry iteration, adaptive retries and overall refinement remain bounded.
Normal/reel demand, capture, over-reach, chart exit or inconsistent body/impulse
representation prevent accepted output. This is one passive tangent grip with
prescribed free support; those checks do not establish every hidden event or
provide a World adapter/fallback.

## Accuracy and controls

All five reused independent World references pass: acquired mirrors, frontal,
and displaced-material mirrors. All 32 focused contracts and typecheck pass.
Checks include unequal partitions across the slip marker, rotated anisotropic
geometry, zero/tiny capacity and unsupported-channel refusal. A fresh declared
boundary control starts inside the raw-foot chart and leaves it under grip load;
both methods refuse the interval, return no state and preserve its input.

| Quantity | Maximum candidate error | Existing limit |
| --- | ---: | ---: |
| Body position | 1.86e-10 yd | 5e-7 yd |
| Facing / spin | 6.82e-9 rad / 7.24e-7 rad/s | 2.5e-6 / 2.5e-4 |
| Material / common-foot position | 6.20e-10 / 2.10e-9 yd | 5e-7 yd |
| Leg share | 7.13e-8 | 1e-6 |
| Impulse / first temporal moment | 1.24e-6 / 1.18e-8 | .002 / .00005 |
| Angular impulse / temporal moment | 1.44e-6 / 1.36e-8 | .0005 / .000005 |
| Body / motor / passive work | 3.93e-7 / 8.72e-6 / 9.11e-6 | .01 each |
| Work / angular conservation residual | 1.67e-9 / 2.11e-10 | 1e-8 / 1e-7 |
| Body/impulse representation consistency | 2.13e-14 | 1e-10 |

No tolerance was loosened. No new World reference collection, native tackles,
games or full suite was run. Those would not decide whether this bounded method
meets its accuracy/cost question. The nine unrelated patch promotion failures
remain documented at their original pins. Keeper/angular-law and .24-yard
support-history work remain separate.

## Cost, favorable and adverse evidence

Node 22.23.3, AMD EPYC 9V74, serial, unobserved/unprofiled timing. The final
comparison uses five warmups per method/input and 21 interleaved repetitions
with rotating method order. Preparation, assertions and logs are outside the
timer. Every repeated endpoint is identical. P95 is the nearest-rank sample
statistic, not a population guarantee. Values are ms per isolated interval.

| Input | Existing adaptive median / p95 / max | Full-state Gauss | Eliminated |
| --- | ---: | ---: | ---: |
| Acquired angled | 3.202 / 4.565 / 5.225 | 12.002 / 14.657 / 15.235 | 1.991 / 3.592 / 4.805 |
| Displaced material | 4.238 / 5.049 / 6.086 | 14.550 / 17.867 / 22.904 | 2.457 / 2.649 / 2.704 |
| Frontal force-free | .082 / .203 / .438 | .296 / .630 / .891 | .090 / .121 / .145 |

Both loaded cases beat the previous local methods. The acquired case meets the
provisional median ≤2 ms / p95 ≤5 ms budget; displaced median still fails. The
earlier one-warmup seven-run panel gave much smaller acquired median benefit
(3.617→3.526 ms) and a small frontal cost regression (.078→.085 ms). The final frontal median also regresses slightly
(.082→.090 ms), despite lower observed tails. That panel is retained; warmup/order mattered enough to justify one warmed interleaved
comparison. These results are neither overall game speedups nor tackle gains.

The fresh chart-exit refusal, one warmup/seven repeats, costs candidate
.951 ms median / 1.568 ms maximum versus adaptive .656 / .941 ms. This adverse
tail observation is retained. It is a measured refusal, not a proven worst-case
runtime bound for every unsupported scene.

RHS counters fall 3,248→672 acquired and 4,756→1,030 displaced. Those counters
exclude geometry-only queries and small matrix solves: candidate diagnostics
also record 180 steps/540 geometry iterations acquired and 279/834 displaced.
Do not equate RHS count with physical computation or speedup. The separate phase witness is collected after timed calls and its
accepted result matches the unobserved result exactly. Its checkpoints and
input are emitted by the collector for a reproducible handoff. The strict whole-
World resolved/fast cost in [PR #15](grip-state-convergence.md) is compatible
saved evidence, not a new benchmark or production-default cost comparison.

## Remaining error and decision

Recorded launcher cost is 62.61 s, including development
checks and four typechecks; exploratory probes are retained separately.

The displaced four-partition candidate has normalized motion/state difference
`7.99e-5`, yet fails the unchanged `1e-8` work gate at `2.2067e-8`. Immediately
after cap exit the residual is already `2.2062e-8`; settling adds about
`4.8e-12`, and the viscous tail leaves it essentially unchanged. Eight partitions
reduce it to `1.6681e-9`, requiring another complete local solve. This small
reproduction isolates the next numerical repair to capped-contact integration,
without attributing it to recovery or relaxing work conservation.

Keep the force-elimination candidate diagnostic. Next test a work-consistent
capped-phase quadrature on this displaced input and acquired/frontal controls,
preserving force timing, attachment motion and the same acceptance limits.
Multiple contacts, simultaneous normal/tangent budgets, active drive, long holds
and World effort/fatigue composition remain required before World insertion.
The integration owner will run the preserved full suite on an exact combined
candidate after those boundaries are addressed; this branch declares no new
baseline or full-patch promotion.

Reproduce with the pinned Node and baseline launcher:

```sh
npm run baseline:run -- --candidate -- npx vitest run --project core test/grip-bounded.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-analytic-evidence.ts --benchmark
```
