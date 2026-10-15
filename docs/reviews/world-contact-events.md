# World replacement preflight: moving geometry blocks adoption

**Hold the World adapter.** The saved event history closes work and reproduces
the frozen-field reference, but fixed moment arms do not remain one common
physical force point as the bodies move. The independent angular-momentum ledger
detects the difference. Correcting the force point only during application fixes
that ledger while breaking the selected history's passive-work condition.
This is a precise blocker for the proposed replacement, not a new runtime fix.

Tested diagnostic `0b055c9fe9297a477cdc5bf8744781c7650926b0`, from draft
[PR73](https://github.com/tannerthardy/football-simulation-/pull/73)
`d786f3efaa7add8f9808d306d112c042b741f4da`. Engine source remains
`5fe694911cda2806e5c4392e5f5d97aaf09abb593d8f98a106fa80fab88a7565`.
[Manifest, results and receipts](../../data/reviews/current/world-contact-events.json).
Fresh remote develop is `8ca8deebe4afa91c3021bdd119bed8976cf00e47`; its new
Run information repair has no physics diff from the previously fetched
`4679a3c260188143bcc66f6f20534327c78d7eaa`. No branches were combined here.
This remains a PR73 comparison, not verification of current develop controllers.

## What fails, and why

Let `t` be the frozen unit tangent, `r = pB-pA`, `s = armA+armB`, and `F`
the signed force on B. Translation supplies internal orbital torque
`cross(r,t)*F`; the selected rotational law supplies `-s*F`.
After subtracting the ground-force torque at the actual body trajectory and
the delivered ground yaw torque, the unexplained angular impulse is exactly

```text
delta L = integral F(time) * [cross(r(time),t) - s] dtime
        = C0*J + C1*integral time*F dtime
                + C2/2*integral time^2*F dtime
```

Here `C0 = cross(r0,t)-s`, `C1 = cross(vB-vA,t)`, and
`C2 = cross(groundAccelerationB-groundAccelerationA,t)`. Tangent hand forces
cannot change normal separation, so this identity needs no recovery model or
new contact selection. Work can close perfectly for this frozen generalized
force law while angular momentum fails for the moving physical geometry.

| Existing saved field | Unexplained angular impulse, kg yd²/s | Double work residual, kg yd²/s² |
| --- | ---: | ---: |
| Motor transition, .366667 s | -1.46848488664e-3 | 3.51e-14 |
| First slip event, .3625 s | -1.07546320829e-4 | 8.22e-15 |
| Sliding control, .350000 s | -2.50977293792e-6 | -4.66e-15 |
| Zero hand force | roundoff | 4.95e-14 |
| Stationary normal separation | roundoff | 5.81e-15 |

The angular preflight criterion is `1e-9 kg yd²/s`: three moving fields fail;
both controls pass. The diagnostic exits zero when it faithfully reproduces
and explains these failures; its result explicitly says **physicalGatePassed:
false**, **worldIntegrated: false**, **adoptionReady: false**.

This is not all one timing error. On the motor transition, the changed force
centroid contributes `-1.46774007515e-3`; normal acceleration contributes
`-7.44811497318e-7`; the remaining chord-placement term is about `1e-15`.
The sliding control has no first-moment difference and retains a smaller
acceleration/chord quadrature error. Do not describe that as a force reversal.

## Independent checks and rejected simple repair

[`event-geometry-reference.py`](../../scripts/diag/physics/event-geometry-reference.py)
imports no engine code. It replays the **already preserved independent Decimal
force/ground-torque tape**, not endpoints or forces produced by a new solver.
It integrates translation, rotation, external torque and work polynomially;
its second ledger uses the integral identity above. The original reference
endpoint agrees within `1e-60`; the actual JS endpoint agrees within `7.11e-15`.
The JS angular residual agrees with Decimal within `1.82e-12`.

70-/100-digit nonzero results agree when converted to double. Mirrors reverse
angular error without changing work. Translating the origin and dividing each
delivered phase into .23/.41/.36 preserve the same angular residual to Decimal
roundoff. These partitions retain the **same force tape**; they are not a claim
that World can refresh geometry without changing its force selection.

A small prescribed-force control isolates the time centroid without ground
forces, support or recovery. Closing speed is 2 yd/s, duration 4 ms, frozen span
is the exact midpoint span. A uniform 50-force-unit load and a -100/+100
reversal deliver the same .2 impulse. The uniform case balances; the reversal
leaves exactly `-.0006 kg yd²/s`, explained by its first temporal moment.
This isolates timing, and is not presented as a valid passive grip technique.

For the bounded correction ablation, move the common point with normal
separation, keeping the acquired arm ratio and **the identical prescribed
force/ground-torque tape**. Both momentum and work then close to Decimal
roundoff. However, in the first-slip field the supposed sticking phase now
crosses from `-.00105877` to `+.00109377 yd/s` and does **positive** hand work
`4.53240802349e-6 kg yd²/s²`, exceeding the preserved `1e-14` passive-work gate.
The total interval hand work is still negative; that aggregate hides the local
failure. On the motor field the old sticking phase also crosses zero slip.

**Reject application-only correction.** A final yaw adjustment, force-weighted
mean arm or ledger projection cannot establish correct force selection, motion,
work and passivity together. Moving the arms changes spin and slip before the
next event, so selection must use the same geometry as application.

## World boundary, cost and adoption decision

The replacement-boundary audit from PR73 remains useful: provisional `feet`
ground work/yaw, ordinary hand solving, centered travel/yaw, absolute arm-force
amount and recovery reserve must each have one owner. `spendEnergy` is once per
controller tick. That audit does **not** validate an implemented World effort or
support interface; there is no new World path in this branch.

Net World median/tail/worst cost is **not measured**, because a physically valid
replacement is not available. Timing an invalid adapter would not answer the
acceptance question. Reuse PR73's complete local candidate median14.07–14.47 µs,
p9516.73–16.89 µs on the transition and563.758 µs worst across controls. The local
10-µs median gate still fails reliably. The separately declared full-World
feasibility target remains <=2x the paired baseline median; neither budget is
changed or claimed to pass.

The final reference/preflight commands cost 0.393 seconds combined; the focused
typecheck costs13.665 seconds. These are validation-command costs, **not solver
benchmarks**. Earlier diagnostic receipts remain indexed; PR73's11 focused
checks and its references are compatible reused evidence. No full suite,
football collection, new native outcomes or game-benefit claim.

**Next decision:** before World insertion, test one saved slip-event interval
with the common force point included in both force/event selection and motion.
Use the stationary-normal and sliding controls; require angular balance,
phase passivity, work and original capacities together. This is a moving-geometry
numerical dependency under the existing law, not a request for stronger recovery
or a wholesale solver import. If that cannot be done within the bounded scope,
retain the frozen-field method as a diagnostic reference and reconsider the
integration method rather than micro-optimizing it again.

No `src`, capacity, recovery, feature-default or existing-test-expectation change.
The seven contact-extraction assertions and nine historical patch-gate failures
remain separate retained evidence. This preflight neither diagnoses their common
cause nor attributes any failed wide-zone block or tackle to this error.

## Reproduce

Use Node22.23.3 and the recorded baseline profile; all44 flags/components=1 are
in the manifest, including RUN_READ=0. No flags affect the prescribed local tape.
Raw outputs belong in ignored `out/`. On the tested revision:

```sh
mkdir -p out/world-events
node scripts/baseline.mjs --candidate -- python3 scripts/diag/physics/event-geometry-reference.py out/world-events/geometry-reference70.json 70
node scripts/baseline.mjs --candidate -- python3 scripts/diag/physics/event-geometry-reference.py out/world-events/geometry-reference100.json 100
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/event-geometry-preflight.ts
```
