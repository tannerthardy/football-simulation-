# Passive shared-foot contact through its first phase changes

PR #31's unequal-share contact now crosses its first force-cap exit, slip exit
and force reversal. The six declared moving graphs pass an independent reference
and physical/accounting checks. The correction preserves current force targets,
capacities and sliding behavior. **Football benefits remain unproved, and measured
runtime is still too expensive for integration.**

Tested code/harness `1e32677c1e8e5aa4e941b07019c58d2c9094b445` on
`codex/grip-phase-transition`, from PR #31 `bf4d6b6`. Comparison baseline stays
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`; runtime source stays
`f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12`.
[Receipt](../../data/reviews/current/grip-phase-transition.json) pins the 43 flags,
literal input hashes, code hashes, costs and retained refusals.
[Input manifest](../../config/grip-phase-inputs.json) declares the reused graphs
and two fresh share/material/spin transforms before their candidate results.
World, previous reference files/operators, production defaults, experimental RB
settings, player capacities and recovery laws are unchanged. No `src/` edits.

## The first failure and the correction

The previous witness fixed the grip phase. Its first holder remains at full
capacity initially, then falls below the existing **98%** slip marker. Continuing
to slide that grip forever would change its lower share and the common-foot
coupling; stopping the diagnostic was correct.

After cap exit, both grips can stick. PR #31's iterative corrected force mode
then leaves up to `8.4e-7` force difference from the independent solution even
at its accepted normalized target residual. It can also fail its joint-work
projection at 200 microseconds. Tight residuals and conservation alone do not
make an ill-conditioned iterative force solution exact.

The new candidate solves the same one/two-grip tangent constraints directly.
For two grips, `M_ij = mobility * (J_i tangent_i) dot (J_j tangent_j)` and
`slip = bodyPointVelocity + M * force`. Enumerating free/bounded active sets
solves the two linear unknowns and certifies their projected sticking targets,
capacities, inactive normal demands and complete passive work. No additional
strength, alternative allocator preference or active work allowance is supplied.
Non-unique mobility, normal demand, stored span bias and invalid budgets refuse.

The moving integration finds three existing mathematical/physical boundaries:

| Original unequal-share graph | Time after checkpoint |
| --- | ---: |
| Full force-cap exit | 28.806626 microseconds |
| Slip exit at 98% capacity | 30.795526 microseconds |
| Other grip's force crosses zero | 132.306970 microseconds |

The last event matters for fatigue evidence: body force remains continuous, but
`abs(force)` in the effort integral has a corner. Without locating it, the
200-microsecond candidate needs repeated refinement and still exhausts its
budget; an unsplit reference also fails its declared dose convergence. Root-local
splitting repairs the integral without changing the effort law or tolerances.

DOP853 advances translation, yaw, material points, the one raw foot, changing
share, impulses, temporal moments, work, force dose and slip duration together.
Bounded secant/bracket searches restart only the crossing piece, not the World.
When several events cross in one trial, their roots are found and the earliest
is committed. Only accepted state carries dose; trial work never reaches World
fatigue. The existing `.3 s` sliding-share law stops at the slip exit; returned
non-slipping hold length ratchets inward using the existing World rule.

There is a 4,096-field-evaluation, 256-partition and 12-iteration-per-root limit.
Coarse/fine acceptance includes slip duration and every retained motion/ledger
field at `1/16` of the declared tolerances. Renewal of slipping, geometric/span
exit or exhaustion returns no state. Scope permits at most one initially
slipping grip and initial-force zero crossings; it does not promise complete
hidden-event detection, arbitrary contact graphs or a World fallback.

## Independent evidence and preserved controls

The independent force reference enumerates the convex box interior/edges/corners
and ranks by objective; it never imports the direct active-set solver or its
work limiter. Reference integration uses RK4 and bracket bisection at 128/256
pieces. Candidate/reference share coordinates, motion equations and event
definitions, so this is independent numerical/force agreement under those
equations, not independent corrected-World compatibility.

A reference arithmetic defect appeared at the exact force-cap corner. Comparing
nearly equal full objective values around `−38.21` selected an edge with positive
passive power `2.17e-7` instead of the interior optimum. The new reference ranks
the equivalent quadratic distance from the unconstrained optimum, removing the
large constant analytically. No physics, work gate or tolerance was weakened.
The failing corner has a focused regression test; the old PR #31 reference stays
preserved at its original file/pin.

Six comparisons pass: original unequal shares at 100 and 200 microseconds,
stable original graph, single-grip control and two fresh mirrored share/material/
spin transforms at 200 microseconds. Worst candidate difference is `0.03448`
of the declared tolerance and worst independent coarse/fine difference `0.03208`,
both below `0.0625`. Work residual is at most `1.30e-14`; angular momentum,
linear momentum, body/ledger representation, passive power, capacity and dose
budgets also pass. Slip duration agrees with the analytic lower-share change.

Stable controls preserve body, material, raw-foot motion and dose within the
existing tolerances. The new hold output follows actual inward ratcheting;
the older short witness did not implement that state transition. Contact-order
reversal, mirror, proper rotation, `37 + 163` microsecond external partitions,
zero/tiny one-grip loads and unsupported-input refusals pass. Unequal partitions
compose impulse, temporal moments, work, force dose and slip duration exactly
once within the declared gates.

**Retained limits:** old 100-microsecond fixed-phase modes still refuse; the
old operator's 200-microsecond input is outside its short scope. Earlier dynamic
iterative force/work failures and reference cancellation are retained in `out/`.
Preliminary 500/1,000-microsecond candidate paths return states, but their
128/256-piece reference pairs have not converged sufficiently. Those longer
paths are inconclusive, not validated extensions. No native football outcomes
or full default suite were rerun for this uninserted diagnostic.

At the tested revision, **38 focused tests and typecheck pass**: 12 new phase
contracts and all 26 directly related PR #31 contracts. Exact baseline-launcher
receipts are embedded; focused checks cost 4.65 s, typecheck 17.88 s and the two
serial accuracy/benchmark collections approximately 3 s each. Integration's
full suite remains one owner's job on the exact combined candidate.

## Runtime and decision

Two uninstrumented processes on the same AMD EPYC 9V74, Node 22.23.3; five
warmups and 21 rotating serial samples per method/input. Preparation and
accuracy comparisons are outside the clock, with no concurrent profiler,
typecheck or per-step trace. The reference below is the fine diagnostic operator,
not production baseline cost. Every sample and spike remains in the receipt.

| Graph | Candidate median / p95 / maximum ms | Reference median / p95 / maximum ms |
| --- | --- | --- |
| Unequal shares, 200 microseconds | 8.265–10.940 / 12.252–16.297 / 13.425–17.794 | 12.617–17.861 / 17.616–45.603 / 17.724–52.202 |
| Fresh graph, 200 microseconds | 6.593–8.405 / 9.085–10.189 / 9.139–11.546 | 13.540–16.921 / 14.974–31.988 / 19.897–108.157 |
| Stable original control | .703–.804 / .933–1.332 / 1.041–1.777 | 16.269–19.972 / 18.920–22.104 / 22.150–28.099 |
| Single-grip control | .392–.559 / .689–.726 / .858–1.058 | 3.042–4.040 / 3.738–4.431 / 4.177–6.399 |

The event path beats the fine reference, but misses the provisional 2-ms typical
and 5-ms p95 budget. Those costs cover only a 0.2-ms mechanical interval, not a
full World tick. No practical production solver or overall speedup is established;
worst deep-refusal cost is also unmeasured.

One bounded optimization was rejected. WeakMap reuse of identical immutable
stage vectors reduced original solves 1,564→1,420, but median cost worsened
24.624→29.878 ms in its seven-sample screen; fresh cost worsened 7.069→7.973 ms.
It cannot remove most unique stage solves and adds allocation/lookup cost.
Its code/test remain at `9ce2b04`, reverted at `2b82dbe`; the accepted candidate
keeps the simpler uncached implementation. Preliminary screens are retained,
not pooled with the final two runs or presented as code improvements.

## Distance to football proof

This pass removes a concrete mechanical blocker. We still need a correct
production-sized contact interval with active normal/tangent budgets, stored
span energy and World support/fatigue composition, plus acceptable cost. Then
replay identical saved successful and failed native contacts and a small fresh
set. Record the first physical difference, force/work/geometry and material
adverse changes; a different ending is neither automatic failure nor proof of
improvement. Broader games follow only when the relevant interactions require
them. No percentage or calendar estimate of completion is supported yet.

**Single best next question:** can complete passive normal/tangent group work
and span-energy accounting reproduce one saved full World interval without
row-order artifacts? Start with the existing acquired witness and opposing
control before expanding support, recovery or football policy. Keep this phase
candidate/reference available as diagnostics. Solve the full-interval law before
another general speed package; its practical cost remains an independent gate.

The nine unrelated patch failures remain **43/52**, with no expectation repinning.
Zero timing invocation excludes timing as their cause, not one common cause for
all nine. Keeper angular-law work and the `.24 yd` support-history divergence
remain separate. Baseline `4ded6b6` and every production default stay unchanged.

Reproduce with Node 22.23.3:

```sh
node scripts/baseline.mjs --candidate -- npx vitest run --project core test/grip-phase.test.ts test/grip-shared.test.ts test/grip-shared-work.test.ts --maxWorkers=1
node scripts/baseline.mjs --candidate -- npm run typecheck
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-phase-evidence.ts --benchmark
```

See [PR #31's accounting diagnosis](grip-shared-work.md) for the earlier frozen
force failure, unchanged-World limiting-force audit and preserved timing work.
