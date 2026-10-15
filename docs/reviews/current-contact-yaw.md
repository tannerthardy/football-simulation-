# C/NT yaw: timing closes, native force selection is sensitive

**Keep PR #66 opt-in and draft for Run review. Do not promote the contact law
at native stepping yet.** This pass finds no missing yaw impulse or half-step
of travel in the saved interval. It finds a coupled ground/hand force-selection
sensitivity. Conservation alone cannot certify its accuracy, and this witness
cannot adjudicate the later helper failure.

The candidate runtime remains `1332ddb`, source
`8e0226116bb611cb4ccaf446b6672caca208a34b441b7336b59c0c0ef6e755b3`.
The diagnostic is tested at `bd2db06d4f03da3ddc4e50d5271aebd805a2fe56`.
[Compact evidence](../../data/reviews/current/current-contact-yaw.json) pins
all 44 flags, tool/input hashes and costs. Settings are
`handContact:'patch', groundMovement:'legacy'`, components=1. No runtime code,
capacity, recovery law, default, baseline or existing expectation changed.

## What the small reproduction establishes

Reuse the saved [C/NT packet](../../config/current-contact-first-interval.json),
.35–.40 s, identical acquired bodies and requests, one hands joint, no torso
impacts/strikes or acquired foot. Native center and isolated endpoints still
reproduce exactly. This is a frozen **single interval**, not a refined play.

Independently reconstruct each body's velocity, position, spin and facing
from delivered ground impulses and solved hand-row impulses. A finite force
on substep `[t,t+h]` contributes its impulse times `T-t-h/2` to displacement.
Use the actual common-point arms for yaw. This reference sums the force tape;
it does not read endpoint motion to invent the expected answer.

For 12, 768 and 196,608 subdivisions, largest residuals are below 7e-13 for
motion, 7e-14 rad/s for spin and 1.5e-14 rad for facing. Combined represented
work residual is below 7e-11. Body **and report** fingerprints match the
unobserved replay. The centered translation/yaw application closes for the
forces actually selected. This is conditional accounting evidence, **not an
independent reference for selecting the correct continuous force history**.

The sequence explains where partition dependence enters:

1. `feet()` executes legacy ground yaw using the current spin and a target
   angular speed based on heading error / remaining controller-tick time.
2. `jointRows()` sees that ground-updated spin; the passive tangent solve
   then arrests point slip subject to the existing arm limit.
3. The hand impulse changes spin; the ground motor sees that change on its
   next substep. Each force receives centered travel, but their selection
   was sequential.

During this interval the tangent force changes sign and reaches its positive
cap, while NT's ground motor enters/leaves exact target-speed tracking. Their
selected histories change with subdivision. For example, positive saturated
hand force first occupies the native interval beginning 29.167 ms, versus
19.761 ms on the finest grid. These are **substep labels**, not independently
located physical event times. No ground or contact capacity changed.

## Size and limits of the sensitivity

| Same frozen interval | Position yd | Velocity yd/s | Spin rad/s | Facing rad |
| --- | ---: | ---: | ---: | ---: |
| Native12 → finest196608 | .000169669 | .00650958 | .125198 | .00442373 |
| Last49152 → finest196608 | .0000000423 | .000001358 | .000290928 | .000000808 |

The remaining tail is explicit. This is shrinking self-consistency drift,
not a certified independent dynamics error bound. NT spin was nonmonotonic
at earlier192/768 and the finest grid is not a new production setting.

The small signed C facing effect of changing contact law is **+.000416537 rad
at native12**, but **−.002557157 rad at196608**. NT's native −.004423732 rad
effect nearly disappears at the finest grid. These small signs do not decide
which football outcome is valid. They do mean native yaw cannot support the
precise causal explanation offered for the later helper failure.

The independent force moments also attribute the native/refined differences:
C's facing difference is +.000214079 rad from ground and +.002958239 from
hands. NT's is −.007556453 from ground and +.003132721 from hands. No missing
rotation term is needed to explain either endpoint difference.

Relevant opposing controls retain the same input and forced island:

- Zero hand capacities: native12→12288 facing drift .000198447 rad, spin
  .00772314 rad/s; translation is unchanged to rounding.
- Free ground with the same passive hands: facing drift .000182102 rad,
  spin .00179126 rad/s. The much larger loaded drift requires the interaction.
- True reflected versions of all three controls at12/768 reproduce exactly.
  This excludes a left/right implementation asymmetry in the selected case.

This does not prove every ground/contact interaction is wrong or that the
legacy ground controller should be replaced. In particular, switching to the
response ground law would change the question, rather than repair numerical
integration under the retained law. The seven football assertions from the
[extraction report](current-contact-law.md) remain unmodified and unadjudicated.

## Cost and adoption decision

Same container, Node22.23.3, uninstrumented saved-pair calls including
construction/cloning, two passes with ten warmups then31 samples per setting
each. Report both passes rather than only the more favorable tail:

| Subdivisions | Median range ms | Observed p95 range ms | Worst observed ms |
| --- | ---: | ---: | ---: |
| 12 | .133–.162 | .180–.507 | .767 |
| 48 | .503–.509 | .764–.774 | 1.366 |
| 192 | 1.984–2.185 | 2.408–3.766 | 4.134 |
| 768 | 7.283–7.649 | 8.305–11.888 | 12.354 |

These are local wall costs, not game performance or certified tail percentiles.
Uniform768 costs about45–58× native here. Merely increasing global subdivisions
is not a supported production correction. No unrelated solver's budget is
silently transferred to this witness.

**Decision:** the opt-in extraction can proceed through Run's review and
Integration's explicit experimental-preservation decision. Production promotion
stays held for the helper contracts and unresolved native numerical accuracy.
The law's conservation repair remains supported; its game benefit is unproven.
Do not change assertions or suppress turning reaction to recover an old ending.

No runtime correction is justified by an impulse-timing defect in this packet.
A future numerical candidate should resolve the coupled ground-yaw/tangent
force selection over one substep under the **same laws and shared budgets**,
then face this packet and its opposing control. That is a separate small
candidate, not permission to import the historical solver or retune recovery.

**Single next integration step:** Run adjudicates the four helper situations
using actual feasible requests and protected approach, with this native-yaw
limit visible. Integration owns combined verification after that review;
there was no new full suite or game campaign here. The bounded timing question
is closed as a force-selection accuracy limit, not a missing temporal moment.

```sh
node scripts/baseline.mjs --candidate --receipt out/contact-law-current/yaw-timing/replay.receipt.json -- node --import tsx scripts/diag/physics/current-contact-yaw.ts
```

The final collector takes7.211 s internally /7.487 s with launcher. Including
exploratory traces/refinement, the first collector, typecheck and final replay,
this pass spent34.175 s in launchers. Reuse the prior182 mechanical checks and
center52/52 versus isolated45/52 contracts: runtime and all original assertions
are byte-identical. Typecheck passes with the new diagnostic.
