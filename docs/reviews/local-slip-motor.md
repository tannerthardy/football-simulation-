# Saved motor/slip transition: accurate local reference, runtime hold

The next C/NT field at **.366666667 s** now has a consistent local force
history through the motor transition. Independent reference agreement and
work/impulse accounting pass. **The implementation does not reliably meet
the unchanged cost budget; retain it as a reference, not a World candidate.**
One bounded allocation refactor produced too little benefit. Stop arithmetic
micro-tuning here; no recovery change or broader mechanics package follows.

Runtime: `cbe8a8818be2638758adbbebf7374a50f52f0622`; final tests/diagnostics
`8d84f69d089dbf5408621b4042f77df9b60ea629`,
source `dedb8290bdbab5db520f927f1f7d5ee08e5325695e4a2221df4482e53a6575fa`.
Branch `codex/slip-motor-event`, from PR70 `1ee42fe`; PR70 and PR68 remain
preserved. [Exact inputs, settings, checks and all costs](../../data/reviews/current/local-slip-motor.json).

## Existing-law contract and causal result

PR70 rejects this saved field because the native mean NT ground acceleration
is **-16.8496 rad/s²**, rather than either saturated limit. That mean cannot
be treated as a constant torque across the transition.

Use the bounded continuous limit of the existing legacy coupled motor:
requested spin is the clipped heading error divided by remaining controller
time. Away from that spin, ground torque saturates toward it. At the target,
it cancels the hand's torque if capacity permits; an overload remains
torque-limited and can move the body away from the requested spin. This
adds no gain, response law, strength or hard spin projection.

For a constant-acceleration phase, let `q = headingError - remaining*spin`.
Then `q' = -remaining*angularAcceleration`. Its zero has a stable quadratic
root. Along with a slip-zero event and the clipped spin target, this permits
constant-force phases without repeatedly advancing World. The saved tangent,
moment arms, leg forces and original yaw/tangent capacities remain fixed.

| Phase in the saved 4.166667-ms field | Duration ms | Tangent force, kg yd/s² | NT ground acceleration, rad/s² |
| --- | ---: | ---: | ---: |
| Stop initial slip | .058874 | -398.834200 | -52.621451 |
| Stick while NT turns toward its request | 2.883057 | +45.937614 | -52.621451 |
| Reach the request, then lose sticking under load | 1.224736 | +398.834200 | +52.621451 |

The NT reaches its requested spin **2.941931 ms** into the field. Ground torque
then reverses. Available torque cannot maintain sticking, so slip resumes and
ends at **-.002587361 yd/s**. The legitimate overload is retained; the solver
does not hold the target by giving the motor extra force.

Hand work is **-.000684192 kg yd²/s²**. The NT's signed ground angular impulse
is **-.397461072 kg yd²/s**, while its absolute amount is **.964414747**, or
**2.43×** absolute net impulse. This is why timing, work and absolute force/
torque amounts must travel together. The module returns those integrals; it
does not apply World effort or fatigue.

## Evidence and limits

The independent Python Decimal implementation uses **bisection** for force
and event time, with analytic motion/work integration and no engine imports.
The JavaScript candidate uses piecewise-linear force and quadratic event
roots. The saved-contact reference was committed at `2ef35e8` before the
candidate implementation. Nonzero quantities from **70-/100-digit** runs
round identically; tiny zero-slip/work and closure tails differ by at most
**2.108e-67**. An initial strict equality check of those numerical zero tails
was corrected; physical accuracy gates were not relaxed.

Across the saved transition, both PR70 fields and the unloaded opposing
control:

- Maximum motion discrepancy is **7.11e-15**; maximum integral/reference
  discrepancy is **4.48e-14**. Total kinetic-energy/work closure residual
  stays below **5.05e-14**.
- Three unequal partitions agree in motion, signed/absolute impulse, temporal
  moments and work within **5.69e-14**. The preserved1e-14 per-phase passive-work gate holds;
  every ground acceleration and tangent force obeys the supplied cap.
- The unloaded opposing control reaches the requested spin and stops using
  ground torque. The original sliding control and first slip event retain
  PR70's motion/work results. Mirrors, equivalent heading representations,
  zero/tiny capacities and input immutability pass.
- Refining the **existing** endpoint selection, independently of the event
  kernel, approaches the same result. For the saved transition, maximum
  component discrepancy falls **1.5027e-5 → 1.6144e-6** from256→4096 pieces;
  concurrent hand-work error falls **4.2635e-6 → 3.1210e-7**. The unloaded
  motion error falls **5.7595e-8 → 2.0608e-10**. These residuals are retained;
  the refined endpoint method is a contract cross-check, not the precision
  oracle or the ordered World work ledger.

**44 distinct focused checks passed this pass:** 15 new local checks plus
11 unchanged PR70 and18 unchanged PR68 controls. The final15 and typecheck
pass. Original test expectations remain unchanged. No full suite, games
or new football collection was run.

Final review also demonstrated a genuine experimental guard defect: a free
turn can cross the heading-wrap boundary and return before the phase endpoint.
The old guard accepted that case. The new interior-extremum check explicitly
rejects it without changing the input. Saved fields are unaffected. Controller
deadline, heading-branch and bounded event-count exits remain explicit.

[`integrateSlipMotor`](../../src/physics/local-slip-motor.ts) is **not imported
by World**. Supported evidence is limited to this frozen two-body tangent
field and stated controls. Moving contact frames, material attachments,
normal/tangent shared-budget reallocation, multiple rows, support/recovery
allocation and exactly-once World fatigue are not validated here. No new
default, environment flag, capacity, recovery law or football controller was
added. PR68's full-interval work hold and original seven affected assertions
remain, separately from the historical nine patch-gate failures.

## Actual cost and stopping decision

Pinned Node **22.23.3**, TypeScript5.9.3 emitted ES2022; no TSX instrumentation
inside measured calls. Same container, no competing collectors. Each benchmark
has1,000 warmups per case/kernel and two interleaved passes of101 individual
calls. Validation, body copies and result construction are included.

The unchanged target is **median <=10 µs and p95 <=25 µs per field**. This is
the local feasibility allocation, not a whole-World runtime guarantee.

| Final source, two passes | Median µs | p95 µs | Observed maximum µs |
| --- | ---: | ---: | ---: |
| Saved motor transition | 11.297–18.748 | 21.673–50.025 | 1072.131 |
| Prior slip event | 8.342–13.500 | 22.654–27.732 | 3078.197 |
| Sliding control | 4.516–7.201 | 8.523–9.475 | 399.030 |
| Unloaded opposing control | 7.852–11.747 | 16.115–54.321 | 741.434 |

**The cost gate fails.** Do not select the favorable field or pass: the worst
observed final-source call is **3.078 ms**. Before the guard correction, the
same physical kernel measured9.54–18.07 µs median on the transition; its first
run had a1.630-ms maximum. The unchanged PR70 kernel's timings also vary
between passes. Tail cause is unproven; these samples are not hard bounds.

One compiled profile of100,000 saved-field calls identified substantial phase
processing and about10% garbage-collector samples. It did not establish one
dominant removable allocation or explain individual benchmark tails. A bounded
refactor reused evaluators and removed temporary arrays, preserving all
compared contact results bit for bit. In the paired pre-guard comparison it
improved transition medians only about **5–6%**, still missing the target;
its observed maximum reached **2.420 ms**. Restore the simpler implementation.
All runs and the rejected commit `1406664` remain indexed; no tolerances or
budgets changed to manufacture a pass.

Indexed launcher commands cost **59.689 s**, including profiling, refactor,
checks after the demonstrated guard correction and all benchmark runs.
Independent Python generation and report/Git work are outside that subtotal.

## Recommendation and single next step

Preserve the numerical result as an independent local reference. **Do not
promote it or begin a general World adapter under the current budget.**
Accuracy through the saved motor/slip event is no longer the blocker; practical
cost and its variability are. No new recovery law or solver scope is justified.

The next bounded engineering question is **how much cost belongs to event
selection versus body/accounting application** on these same fields. Measure
that separation before choosing a schedule-only interface that could reuse
the existing World update path. Require the same accuracy and cost gates;
do not assume removing copies will solve it. If event selection itself exceeds
the budget, retain this as a reference and reconsider the numerical method or
explicit engineering budget rather than continue small arithmetic edits.

Run's collection-route and helper-contract work remains independent. Develop
was fetched at `7d1451b2c31786e075550183a6a93bbda23da29b`; its physics tree is
unchanged from approved `a1b16e6`. This deliberate PR70 research pin is not
combined verification of newer controllers. Historical `4ded6b6`, all44 flags/
components=1 and production defaults remain unchanged.

```sh
python scripts/diag/physics/local-slip-motor-reference.py out/slip-motor/reference100.json 100
node scripts/baseline.mjs --candidate --receipt out/slip-motor/replay.receipt.json -- node --import tsx scripts/diag/physics/local-slip-motor.ts
node scripts/baseline.mjs --candidate --receipt out/slip-motor/cost-replay.receipt.json -- node scripts/diag/physics/compiled-slip-motor-cost.mjs
```
