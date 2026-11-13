# Grasp motion: verified repairs and a rejected default replacement

Follow-up to `08afbb9` on `claude/engine-priorities`. The owner wants an
explicit signal when the underlying physics is very good. **The current
assessment remains NOT READY.** Passing unit tests or improving one game
average is insufficient. The readiness gates below determine that signal.

This implementation repairs reproduced momentum and position defects in the
default tackle pile, adds shared impulse/grasp primitives, and retains a
bounded-contact prototype behind an explicit development option. The prototype
passes its mechanical checks but fails the football checks, so it is **off by
default**. PR #1 is untouched; the changes to this branch's `tackle.ts` must
be reconciled before any separate PR merge.

Evidence and provenance:
[`data/reviews/grasp-motion/`](../../../data/reviews/grasp-motion).
The [preceding audit](universal-interaction-readiness.md) records the original
counterexamples and proposed architecture. The [data guide](../../../data/archive/catalog-2026-10-11.md)
contains commands for both default and experimental models.

## What the default engine now does

The pile's common velocity comes from **all participants' mass and velocity**.
Previously `updateBond` started with the carrier's velocity and copied it to
every tackler. A weak initial grasp left different velocities, so that copy
could add momentum and kinetic energy without an external force.

The default continues to use a coupled-pile approximation. Coupling dissipates
internal relative kinetic energy, conserving total momentum. Drive and
resistance then apply an explicit external impulse through the shared contact
kernel. `bond.physics` records the impulse and its kinetic work in native
kg/yard/second units. A change in total momentum is attributable to ground
drive/resistance rather than silently redefining common motion.

Players advance with their resulting velocity. The old automatic position
pull-in at 4.5 yd/s is removed. That pull-in preserved the pair center but
changed their relative positions without corresponding motion or work.
Tightening a tackle needs actual foot/contact work, which the prototype begins
to model. It cannot be a free position adjustment.

**This does not complete graded sustained contact.** The default still locks
common velocity after formation. Grip still affects resistance, toppling and
escape, but its maturation retains the older rate toward a wrap. Persistent
support and physical contact placement are unfinished. The default repair is
a conservation/bookkeeping correction, not validation of that approximation.

## Controlled evidence

The unchanged revised interaction diagnostic runs on archived `08afbb9` and
current source. Four rosters, one actual formation-to-update transition each;
random misses/breaks/fumbles are disabled and ground powers are nearly zero.

| Quantity | Before | Default after | Experimental after |
|---|---:|---:|---:|
| Mean added momentum on next update | 311.0 kg m/s | approximately zero | approximately zero |
| Mean change in kinetic energy | +850.1 J | -267.3 J | -75.1 J |
| Mean common-motion displacement error | 0.0955 yd | approximately zero | approximately zero |
| Relative speed after formation | 3.787 yd/s | 3.787 yd/s | 3.787 yd/s |
| Relative speed after update | zero | zero | 3.203 yd/s |

Negative kinetic change is passive dissipation. Active players may add energy
and exchange momentum with the turf; tests independently compare measured
momentum/energy changes with recorded external impulse/work for both models.

The diagnostic now checks the center's displacement against independent
mass-weighted common motion. It also reports final velocity versus average
velocity over the step, **not as an error metric**: substep acceleration can
legitimately make those differ. Isolated analytical damping convergence and
explicit velocity integration test the prototype's motion instead.

The shared kernel has checks for unequal masses, grouped helpers, bounded
normal/tangent impulse, passive energy, simultaneous contacts, rest without
unexplained tightening, finite reach, overloaded/overextended release,
rotation, and isolated timestep refinement. Integration checks cover the
default handoff, external work in both paths, grounded closing, weak grasps,
contact improvement from geometry, and outside bumps. The moving-wrap test
now requires advection without unaccounted position tightening.

The full suite has **222 passing tests**; typecheck and build pass. These
establish specific contracts, not complete NFL realism or a validated joint,
turf or force model.

## The bounded-grasp prototype

`applyGroupImpulse` records actual kinetic work. `coupleGroupMotion` shares a
finite impulse between groups, preserves two-axis momentum and internal group
motion, and dissipates passive relative kinetic energy. `advanceGrasps`
integrates a graph of bounded contact edges through four local physics steps.
The brain and perception still update at their existing cadence.

A grasp tries to stick, subject to its load budget. It resists separating
motion within arm reach and slips when it cannot maintain that reach. Normal
and tangential actions share the available impulse budget. It never pulls a
resting pair together by modifying positions. Neighboring edges are rechecked
with the remaining budget; they receive no extra force allocation per solver
iteration.

Foot drive is separate from passive structural grasp load: someone can be
dragged while still holding on. Weak-grasp footwork uses immediate local
contact feedback to match the carrier's motion and close the remaining body
gap. `movementDemand` supplies the same acceleration/cutting/facing limits
used by free movement. Closing and bracing share a finite foot-force envelope.
Grasp improvement depends on actual distance/quality, not time alone.

The compact structural force ceiling currently maps mass and strength to
0.5–3.0 body weights before grip quality. This is **an unvalidated model
assumption**, not an NFL measurement. Ground force mappings, body-centered
reach, controller choices and toppling also remain simplified. Strong wraps
still use the older external collision-group approximation; the graph is not
a universal angular/height/contact-anchor solver.

Standing contact in this prototype requires actual arm reach, unlike the
default's older extra lunge allowance. Diving remains a separate existing
action. Weak grasps are not rigidly grouped for outside body collisions.
Loss of reach/load produces an explicit grasp-loss event and ordinary retry
cooldown, without automatically putting the defender on the ground.

These mechanisms are useful development work. **Their football transfer is
not acceptable yet**, so `experimentalGrasps` defaults to false in play/game
setup. The measurement tools require `--experimental-grasps` to use it.

## Football checks and why the prototype stays off

The solo lab uses **240 cases**, five initial bearings, speeds 3/6 yd/s,
four rosters and unchanged direct-to-current-carrier pursuit. Both revised
measurement scripts run against the archived baseline. Down counts are now
explicit; empty conditional cohorts print `N/A`, not a misleading zero mean.

| Solo-lab quantity | Before | Default after | Experimental |
|---|---:|---:|---:|
| Completed-tackle cases / all cases | 222 / 240 | 222 / 240 | 179 / 240 |
| Mean contact-to-down, only completed tackles | 0.97 s | 0.98 s | 1.01 s |
| Mean yards after contact, only completed tackles | 2.01 yd | 1.44 yd | 1.98 yd |
| Broken grasps/tackles per case | 0.04 | 0.04 | 0.22 |

Those conditional means hide a decisive prototype failure: the 90-degree
and 135-degree fast cases have **no completed tackles**. Traces show early
extended contact with large relative motion and poor approach alignment.
This lab's pursuit is simpler than the game controller and is not an NFL
cohort, but the failure must be understood rather than excused by its aggregate
mean. Test sound and poor approaches explicitly in the next scenario pack.

A paired **eight-game, seed 7, one-league** comparison confirms the issue:
default points/team-game are **25.06**, versus **62.50** for the prototype;
YPA **8.33 -> 12.97** and YAC **5.93 -> 12.85**. This is why its mechanical
passes do not authorize making it the default. Later random draws and play
calls diverge as outcomes change; fixed seeds do not freeze the entire game.

The main paired default check uses **32 games, seed 7, four leagues**. Baseline
source matches the prior contact-foundation final panel exactly; its calibration
artifact is reused with recorded provenance. Final default has 4,186 plays,
versus 4,219 before.

| Default game quantity | Before | After |
|---|---:|---:|
| Points/team-game | 34.75 | 30.28 |
| Yards/attempt | 9.81 | 9.14 |
| YAC/reception | 7.06 | 6.02 |
| Interceptions/attempt | 6.31% | 5.34% |
| Sack rate | 5.60% | 5.39% |
| Rush yards/carry | 3.95 | 3.07 |
| Run stuffs | 23.64% | 30.97% |
| Run yards before contact | 0.53 yd | 0.54 yd |
| Third-down conversions | 35.80% | 28.96% |

Passing improves in several quantities but remains far from NFL references.
Runs and third downs regress. Do not adjust carrier power or reintroduce
unaccounted momentum to restore yards. The coupled tackle approximation,
early contact, support/recovery and first-level blocking need further anatomy.

The additional paired 16-game contact anatomy selects plays tackled in the
field. Run/catch cohorts are 629/589 before and 604/603 after. Mean run
contact-to-tackle is **1.36 -> 1.32 s**, yards after contact **2.46 -> 1.71**;
completion contact-to-tackle **1.15 -> 1.07 s**, yards after contact
**2.00 -> 1.35**. These selected cohorts differ from full-game YAC/YBC.
The existing event-based extractor includes missed attempts in its first-contact
set and uses recorded frames; its definitions differ from true body impact
and tracking attachment proxies. Consult its counts and definitions before
interpreting NFL comparisons. These limitations are retained, not hidden.

The six-game film has **828 clips across 27 concepts**, uses the repaired
**default** engine, and passes all **18 browser checks**. Its ZIP contains
the verified populated HTML. It is a separate
roster/cohort from the calibration panels. Use exact G/P clip IDs and copied
references when identifying bad interactions.

## Gates for the owner's eventual OK

| Gate | Current status | Required next evidence |
|---|---|---|
| Contact-transition momentum and work accounting | Reproduced default defect repaired; controlled checks pass | Preserve these checks through support, slip and multiple simultaneous loads |
| Graded sustained contact with bounded loads | Mechanically tested prototype; football transfer fails | Credible sound/poor approach scenarios, observed load/slip anatomy, acceptable paired game guards |
| Body-owned support, posture and finite recovery | Unfinished; all four immediate recontacts still reset base | No contact/role change restores balance; loss and recovery across all six owner examples |
| Shared traction across movement/contact | Partial prototype demand/budget only | Whole-body axial/lateral/bracing/rotation competition, explicit ground impulse/work, fatigued support |
| Reliable fast/crowded body encounters | Native crossing probe still fails both cases | Swept detection or adaptive physics, crowded constraints and release; fixed brain cadence |
| Angular/height/contact geometry | Missing compact torque/support/height-anchor model | Central versus shoulder loads, skinny gaps, low contact, upright versus falling, bounded reach |
| Transfer across football roles and techniques | Pending shared scenario pack | Redirect, squeeze, release, seal, approach tackle, sideways-hit recovery on the same primitives |
| Temporal stability and observation boundaries | Isolated grasp convergence passes only | Whole-world timestep/tick-phase tests without faster perception or extra stochastic draws |

The eventual signal should cite those passing gates and their remaining
accuracy limits. It must include repeatable controlled scenarios, coherent
shared physical rules, representative 11-on-11 film/anatomy and tracking
checks on quantities the data actually observes. An NFL-like points average
alone is neither necessary proof nor sufficient proof of sound physics.

Next, prioritize persistent support and fast-body encounter detection while
keeping the conservation repairs. Continue the bounded-grasp controller/load
work with explicit sound-versus-poor approach fixtures before enabling it.
The broader architecture remains in the previous audit. Full QB feet and
pressure-memory simulation remain later work.
