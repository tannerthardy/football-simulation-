# Cheaper turn selection, with the original tail gate still open

**Parked, 2026-10-15.** The native-loop cost measurement proposed below is
deferred: it cannot decide adoption of this historical experimental host.
Preserve both clocks and the adverse contact result. Current-development
contact-law extraction is now the primary integration target.

Preserve this cost-only correction in draft PR #62; keep `turnChoice` absent by
default. The warmed paired planner is cheaper, with exactly matching choices.
The original startup/fixture-heavy screen still fails its tail budget. This is
not a production-readiness or football-benefit result.

Runtime `c45412d`, source
`b925f586d97f9b2257b2ca46c8d7d8486b00c592c567ddea7085005bcd2289eb`;
final diagnostics `57fa361`. Reference `0eb6fc5`, source `7101eecf…`.
Baseline remains `4ded6b6`; PR56 remains uncombined. The
[receipt index](../../data/reviews/current/turn-planner-cost.json) pins exact
revisions, flags, inputs, commands, raw samples and checks.

## Correction and correctness

An instrumented 440,000-call profile attributed 155/1,378 samples to arrival
calculation and 105 to GC. Inlining limits attribution; this is not an allocation
causality proof. Source inspection confirms per-request diagnostic arrays,
candidate records and repeated validation that planning does not need.

World now asks for a scalar route. It uses the same arithmetic, three candidate
lifts, order and tie rule. Validation happens once, with no route-record
allocation. The full diagnostic helper remains available. At exactly zero spin,
settled arrival time is symmetric and increases with absolute displacement:
shortest-angle selection is already best, including ties. World skips forecasting
in that case. No epsilon, latch, changed gain, capacity or physical law.

Against modules restored from immutable `0eb6fc5`, **101,848 route queries and
4,006 complete plans match exactly**, including wrapped headings, tiny/zero
spin, unsupported estimator inputs, both saved bodies/histories and
10/50/100 ms ticks. All 49 affected tests pass. Every field of the 34 retained
turn-task results, loaded endpoints, independent reference checks and partition
controls reproduces the prior receipt exactly. Typecheck and build pass.

Three existing native inputs, each with choice absent/present, also reproduce
their entire prior result objects: ordinary frontal tackle, adverse angled
seed4001, and seed6001 escape. This retains seed4001's +.543732 yard/+.10 second
versus shortest choice; it does not turn that tradeoff into a benefit claim.
No full-suite or game campaign was repeated for this behavior-identical change.
The historical full-suite result stays pinned to `bea90de`, not this revision.
The old dry-cap failure and nine earlier patch failures remain unresolved.

## Both clocks, including adverse results

Node22.23.3 / AMD EPYC9V74; serial processes, no competing collectors.
Every clock measures 22 frozen-body `World.plan` calls. “Shortest” here means
choice absent in the **same patch host**, not timing the production center law
or a whole World/game. Budgets stay median≤.10 ms and p95≤.25 ms.

The original screen constructs fixtures before every timed batch, with 11 warmup
rounds and 101 samples per arm. Two processes before and two after:

| Choice/task | Median range, ms | p95 range, ms | Worst observed, ms |
| --- | --- | --- | --- |
| Prior loaded | .054902–.083165 | .187642–.340011 | 1.518251 |
| Scalar loaded | .079519–.086029 | .435655–.719186 | 7.147079 |
| Prior normal | .049064–.079610 | .188904–.284918 | 1.328186 |
| Scalar normal | .023265–.024647 | .203536–.271858 | 1.615168 |

Loaded performance does not improve on this screen. Both loaded tails fail;
one normal tail fails. Shortest-choice controls also worsen: loaded p95
.080511–.139440 before versus .302525–.751480 after. Those observations remain
valid costs; they cannot establish that the scalar helper caused the increase.

To ask whether the helper itself helps after startup, a complementary clock
prepares reusable fixtures once, rotates shortest/prior/scalar arms in one
process, and uses 2,500 warmup rounds plus 5,001 samples per arm. Two processes:

| Choice/task | Median range, ms | p95 range, ms | Worst observed, ms |
| --- | --- | --- | --- |
| Prior loaded | .013630–.014052 | .066160–.094151 | 3.495484 |
| Scalar loaded | .011287–.011898 | .037736–.067932 | 2.192996 |
| Prior normal | .013320–.013670 | .056875–.079900 | 2.262621 |
| Scalar normal | .008172–.008533 | .015774–.031818 | 6.777989 |

Within-process median reductions are 15.3–17.2% loaded and 37.6–38.6% normal;
p95 reductions are 27.8–43.0% and 60.2–72.3%. Both warmed methods fit the stated
budgets. Scalar normal is close to shortest choice's .008233–.008493 ms median.
Worst samples remain visible, including 6.778 ms. This clock changes both
warmup and fixture reuse; it cannot isolate GC, compilation and host scheduling
individually. Its larger sample count also changes the meaning of a maximum.
It complements rather than replaces the failed original screen.

## Decision

Stop micro-tuning this helper. Retain the small, behavior-identical optimization
for experimental review; the overall cost gate remains open. Next measure the
planner within **one existing native World contact**, attributing startup,
fixture allocation and runtime planning separately, before choosing another
optimization or changing the budget. Keep laws and supported scope fixed.
The existing short-shuttle task remains proposed for later movement measurement;
no extraction, new pipeline or movement retune was started.

Run the focused differential with
`node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/turn-planner-cost.ts`;
add `--benchmark --output=out/turn-planner-cost/paired.json` for the paired clock.
`--native` uses six compact full-result controls copied from the prior receipt
into the tracked index, with its original revision/hash. No ignored history is
required for that check; these are behavior controls, not independent law references.
