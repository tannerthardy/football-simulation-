# Shared-foot grip work: a force-accounting defect before integration

Two passive grips on the same corrective foot can fail their sticking targets
because numerical rows are charged separate shares of one motor's marginal
work. Reversing only their order changes a holder's force from **252.734 to 0**,
under the same **500** capacity. Neither result satisfies the unique independent
force solution. Raising the ordered iteration count from eight to 256 does not
repair it. Conservation checks alone miss this defect.

The separate experimental correction accounts for the complete graph's passive
work once. It agrees with an independent bounded force reference in four
two-grip scenes and both orders. Short moving checks also agree on translation,
rotation, attachments, common-foot movement, work and effort. **This is a bounded
mechanical correction, not a World replacement or football promotion.**

Tested code/harness: `d96a0a91f52504d5684b55948f43bfa318699b0a`, branch
`codex/grip-shared-foot`, stacked on PR #25 `c61e8d5`. Comparison baseline remains
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. Runtime source remains
`f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12`.
[The receipt](../../data/reviews/current/grip-shared-work.json) records exact
flags, input hashes/transforms, file hashes, validations, refusals and the
preserved numerical benchmark. No `src/`, default, capability, recovery-law,
baseline, earlier reference or experimental RB-setting change.

## Why the force stalls

The graph uses the existing acquired multiple-contact fixture: holders 0 and 2
grasp body 1; both attachments act through the **same** foot. Its raw load is
`P = sum(J_i F_i)` and velocity is `u = mobility * P`. Complete passive power is

`sum(F_i dot bodyPointVelocity_i) + mobility * |P|²`.

The current World-derived map instead checks each normal/tangent update against
its own marginal work ledger. Changing one row includes cross-work from the
other row's existing load on the shared foot. An intermediate numerical update
is treated as a separate physical event. A row can exhaust its allowance and
stop, even when a joint update satisfies the force constraints and dissipates
energy. Its unmet sticking target remains under capacity.

The isolated witness explicitly sets each hold to its acquired span, eliminating
stored extension energy. Desired support velocity and active reel are zero;
free ground is unchanged. Bodies, material points, mobility, allocated capacities
and recovery/sliding coefficients are unchanged. The original acquired fixtures
retain their original holds and results; this transform is a separate input.

| Frozen original graph | Holder 0 tangent | Holder 2 tangent | Holder 0 slip | Passive power |
| --- | ---: | ---: | ---: | ---: |
| Old order 0,2; 8 or 256 passes | 252.734 | 104.153 | −0.113662 | −28.7263 |
| Old order 2,0; 8 or 256 passes | 0 | −137.511 | −0.138376 | approximately 0 |
| Coupled work, either order | 500 | 340.589 | −0.0894825 | −44.7412 |

The corrected first grip reaches capacity and can legitimately slip. The second
grip is below capacity and meets its sticking target. Negative total work in
the old result did not establish a correct constraint solution.

This is an actual World-law failure, rather than an extraction artifact. On
the same acquired, zero-extension checkpoint, shrinking finite World steps from
`1e-6` through `1e-7` to `1e-8 s` converge toward each of the two different
row-order limits. Maximum force difference drops `0.1392 → 0.01410 → 0.001412`
in the original order and `0.05806 → 0.005808 → 0.0005809` in reverse. Normal
force stays zero. No controller or active balance-placement decision intervenes.
This does not establish that the defect caused a particular lost block or tackle.

## The bounded correction and independent checks

`sharedGripForce` keeps its old **channel** mode and eight-pass default.
The new **coupled** mode is explicit and unused by World or the preserved timing
candidate. It solves the unchanged normal/tangent targets and circle limits
together, then checks/projects whole-graph passive work once. It requires zero
span bias, checks normalized force-target residual `≤1e-10`, and has a hard
256-pass budget. Unresolved targets or conflict between the work projection and
force constraints refuse; no corrected state is accepted by reverting to the
known defective row-work rule. Returned channel ledgers in this mode are only
numerical marginal traces; graph power is the physical work measure.

The independent force reference enumerates the interior, edges and corners of
a two-variable convex tangent box. It imports neither the work limiter nor the
iterative candidate solver, and verifies that normal targets are inactive.
Its solution is unique on these graphs. It is **not** an independent reference
for arbitrary active normal/tangent circles, reel work or stored spring energy.

Frozen original/mirror, distinct moving material points and unequal lower shares
match the reference in both orders, with force error at most `5.69e-14`.
The corrected mode converges in 4–18 passes. Capacities, passive work and
sticking/sliding conditions pass. Isolated tangent, normal-only and orthogonal
contacts remain unchanged within numerical precision; zero/tiny capacities are
finite and bounded. Stored-span bias, insufficient convergence budget and a
non-unique reference have explicit refusal controls.

The moving witness uses the same material Jacobian and existing `.3 s` sliding
share law. Its spans close, retaining zero extension energy. Candidate DOP853
with two partitions is compared against independent box forces integrated by
RK4 at 128 and 256 partitions. These are deliberately short mechanical
intervals: **100 microseconds**, except the unequal-share control at **20
microseconds**. They do not validate a complete football step or long hold.
The force solutions and timesteppers are independent; the motion equations and
geometric coordinates are shared. This demonstrates agreement under those
equations, rather than independent corrected-World compatibility.

| Moving graph | Old maximum spin error, rad/s | Corrected maximum spin error, rad/s |
| --- | ---: | ---: |
| Original and mirror, 100 microseconds | 0.0112711 | `3.82e-17` |
| Distinct material points, 100 microseconds | 0.0114433 | `2.78e-17` |
| Unequal shares, 20 microseconds | 0.00319843 | `1.70e-17` |
| Single-grip control, 100 microseconds | `2.09e-17` | `2.26e-17` |

The single-grip control is effectively unchanged. These are errors against the
specified mechanical reference, not measured changes in football outcomes.
Both old and corrected short paths close work and angular momentum, showing
why conservation by itself did not detect the incorrect forces. Corrected
material/raw-foot/share motion, impulse, temporal moments, work and dose also
agree. Body/ledger representation, linear/angular momentum, passive power and
capacity-dose checks pass. Reversal, mirrors and unequal external intervals
`37 + 63 microseconds` preserve the result and exactly-once effort accounting.

**Retained adverse scope result:** at 100 microseconds the unequal-share scene
changes grip phase. Both candidate and independent reference refuse that
fixed-phase interval without mutating the input. The 20-microsecond result is
explicitly a shorter input, not a replacement passing expectation. We have not
crossed that transition or established normal/tangent sharing, active motor,
stored-span energy, many-contact, long-hold or native-football correctness.

## Preserved numerical integration evidence

Before the force defect was isolated, the old-law shared-foot integrator was
tested at `4592ec3`. It preserves the eight ordered passes, material/raw-foot
transport, moments, work and dose. Five unchanged-World references refined at
16,384/32,768 pieces pass; worst normalized agreement is `0.03057` of the
original tolerance. A force-limit audit independently converges toward World.

Event-local DOP853 finds the two marginal-work transitions without repeating
whole-approach solves. Earlier Gauss and force-eliminated experiments reduced
counts but lost on runtime; preserve their code at `0dca074` and raw profiles
under `out/`. The accepted diagnostic preserves tight accuracy gates, with
4,096 force-evaluation, 1,024-partition and eight-root-iteration limits.

One final uninstrumented process at `4592ec3`: AMD EPYC 9V74, Node 22.23.3,
five warmups and 21 rotating serial samples, preparation and observers outside
the clock. This is a **single final timing run**, not two independent final runs.
Earlier screens/profiles are not pooled across revisions or environment restarts.

| Original-law graph | Uniform median / p95 / maximum ms | Event-local median / p95 / maximum ms |
| --- | --- | --- |
| Original shared foot | 6.924 / 8.387 / 8.546 | 3.481 / 4.956 / 6.009 |
| Distinct material points | 7.656 / 9.400 / 13.513 | 3.696 / 6.813 / 7.772 |
| Unequal shares | 7.994 / 10.634 / 11.129 | 7.072 / 9.735 / 9.839 |
| Single-grip control | 2.461 / 5.881 / 12.136 | .328 / 1.965 / 2.270 |
| Unsupported `.05 s` hold | refusal; median 28.933, maximum 38.734 | refusal; median 33.920, maximum 39.883 |

Original/distinct typical cost improves about 2×, but unequal shares and refused
holds remain expensive. The provisional 2-ms typical, 5-ms p95 and 10-ms refusal
budgets fail. **This is not a practical production solver**, and its integration
path is now blocked by the demonstrated force-accounting defect. More optimizing
or refining the same law would faithfully reproduce a wrong constraint result.
The corrected work mode has no uninstrumented production-cost claim.

Reference compatibility is recorded rather than assumed: extending input
preparation for fresh cases reproduced every old literal input and all five
fine World outputs exactly. V8 can serialize equal values into different bytes;
the audit hashes saved immutable packets and compares literal/physical results,
without changing expected fixtures. Raw checkpoints and traces remain in `out/`.

## Validation and next decision

At `d96a0a9`, **26 focused tests and typecheck pass**. The evidence collection
also passes: four frozen graphs in both orders, six shrinking-step World audits,
five short moving comparisons, and both retained phase refusals. Baseline-launcher
costs are 3.39 s for focused checks, 18.01 s for typecheck and 1.10 s for evidence;
these independent checks ran concurrently and are not runtime benchmarks.
Earlier development failures—including the single-reference Jacobian wiring
error—remain in ignored logs, not rewritten as passing runs.

Reproduce with Node 22.23.3:

```sh
node scripts/baseline.mjs --candidate -- npx vitest run --project core test/grip-shared-work.test.ts test/grip-shared.test.ts --maxWorkers=1
node scripts/baseline.mjs --candidate -- npm run typecheck
# Historical timing is reused when locally available; its absence does not
# require rerunning a benchmark or prevent force/moving correctness checks.
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-shared-work-evidence.ts
```

The full suite and football panels were deliberately not rerun for an uninserted
diagnostic, following PR #6's testing policy. No previous default-suite result is
claimed for this candidate. The nine unrelated patch failures remain **43/52**;
zero timing invocation excludes timing as their cause, not one common explanation
for all nine. Keeper angular-law work and the `.24 yd` support-history divergence
remain separate.

**Single best next step:** cross the first unequal-share grip-phase transition
on this same input with the independent force reference, carrying changing share,
attachments, work and effort together. Then extend the group accounting to finite
World intervals with normal/span-energy controls before replaying the saved
successful and failed native contacts. Keep the full patch experimental and the
comparison baseline unchanged.
