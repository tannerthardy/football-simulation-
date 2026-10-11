# Sole slip events and the contact lifecycle

**Priority update:** the owner's simplicity review pauses further spatial
expansion. Read [Football-first physics and the simpler support model](football-first-physics-simplification.md)
first. This report retains the validated research and its original proposed
next steps; those steps are no longer prerequisites for football development.

## Status and where to start

The research support model now executes a force-balanced sliding stop and
continues into elastic unloading without discarding contact strain. This is
the first executed slip-event gate, **not a replacement for production World**.
The overall physics readiness gates remain open. Read this review first, then
the preceding [sole traction review](sole-traction-and-next-physics-step.md).

Evidence and reproduction commands are in
[the event evidence README](../../../data/reviews/physics-world/sole-events/README.md).
The source hash, tested counts and measured errors are pinned there.

## The failure and its repair

An ordinary coupled interval can approach a sliding stop but leave a tiny
positive endpoint velocity. The next interval's reversal guard then rejects
the legitimate rebound. Halving again can approach the same boundary forever.
Removing the guard would reintroduce the previously reproduced out-and-back
slip error. Setting velocity to zero afterward would add an unbudgeted impulse.

`advanceSpatialSoleSlipStop` uses the existing 18D torso/two-foot solve. One
endpoint tangent velocity is constructed as zero **inside** its candidate
coordinates; its unknown becomes the positive event duration. All 18 linear
and angular momentum rows remain. Every trial starts from the same accepted
body and shear state, recomputes physical force times candidate duration, and
runs the existing material, geometry, phase, torque and work checks.

The solved endpoint keeps normal compression and saturated shear stretch.
The next ordinary interval unloads that stretch elastically. Its positive
work is funded by decreasing stored energy. The contact is neither permanently
frozen nor reset. A failed solve commits no body state, shear state or elapsed
time. The reported duration domain is an algebraic solve domain, **not** a
certified bracket for an arbitrary continuous trajectory.

The first supported domain is deliberately small: collinear world x/y motion,
center sole patches, positive balanced normal compression, disabled leg force,
and constant center/material-center loads. Equivalent weighted collocated
patches are supported. Only scale-relative floating-point residuals of nominal
equilibrium are admitted, and they remain in the actual equations and state;
they are never reset. Rotating off-center contact, varying normal load and
general two-dimensional slip require further event equations and evidence.

## Independent validation

The stop panel compares actual coupled states against the existing independent
continuum elastic/plastic phase reference. It independently reconstructs each
accepted interval's normal impulse, piecewise chord shear force, force dose,
momentum, strain, energy and plastic loss. It measures endpoint, force-integral
and event-time errors separately. Multiple time partitions, an off-grid stop,
opposing/assisting forces, a later opposite-direction stop, changed physical
capabilities, mirrors, axis swaps, foot-slot swaps, translation and weighted
patch splitting exercise the same physical law. A force exactly balancing
sliding friction and a force exceeding it must not create a stop.

A separate new reference,
`scripts/diag/sole-normal-event-reference.ts`, contains exact ballistic and
compressed normal-contact phases with independently integrated force, work
and loss. It covers touchdown, compression turns, release and replant, plus
under-, critical- and overdamped closing behavior. It imports no production
physics and compares against independently stepped nonsmooth RK4 paths.
Tiny genuine roots are retained; an unresolved arithmetic case is rejected.
This reference is a target for the next kernel change, **not implemented
normal lifecycle behavior**.

The reference's energy and kinetic-work residuals are algebraically equivalent;
their count does not add independent evidence. Its separate RK4 force/loss
comparisons do. Near-critical damping can reject on unresolved cancellation,
and near-grazing topology is not interval-certified. The stop kernel likewise
can safely reject a tiny transverse reversal; admitting equilibrium roundoff
does not waive the general reversal guard.

No material values were fitted to NFL or football outcomes. The normal and
tangent stiffnesses, friction, geometry and small-foot inertia remain explicit
sensitivity assumptions. These checks require no new dataset. AddBiomechanics
and NFL tracking become more useful when actual support/control can be executed
and compared with their observed motion demands.

## Persistent problems and the next step

1. **Normal onset and release.** Re-solve the event prefix using the same body
   equations. Finite compliance has no instantaneous touchdown impulse or
   velocity reset. A fixed full-step Cayley root cannot certify a different
   prefix solve. Do not spread ground force over the airborne part just because
   a conservative discrete-gradient energy identity closes.
2. **A coherent endpoint-coordinate chart.** For a first translating center
   patch, constrain endpoint height inside candidate construction, derive its
   velocity `v1 = 2*(zEvent-z0)/h-v0`, and retain its momentum row.
   All material forces and work must use that same pose. Record and bound the
   rounded residual `(z1-z0)-h*(v0+v1)/2` and its work effect. The current plane
   certificate assumes a velocity-defined path and cannot simply be reused
   with a different coordinate chart. A post-solve height snap is forbidden.
3. **Closing versus opening.** With a closing-only normal dashpot, resolve the
   actual compression turn before rebound. The current chord-average dashpot
   can miss an interior turn. Its contribution to shear capacity is an
   interval-average discrete definition, not instantaneous start support.
4. **Broader contact events.** General tangent unloading, rotating heel/toe
   events, multiple simultaneous contacts and capacity loss need independent
   ordering and convergence evidence. Do not inherit the center-patch proof.
5. **Executed spatial control and grip coupling.** Add bounded leg/posture
   control, actual unload/swing/replant and physical grip opposition in this
   shared solve. Then feed balance with achieved support. No held-anchor reset,
   prescribed normal load or hidden leg-lock multiplier.
6. **World replacement and transfer.** Body-ground recovery and connected
   contact cost must pass before promoting this research path. Then rerun native
   hand-fighting fall/convergence failures and the universal football scenarios,
   followed by NFL movement bands. Unchanged production retains its previous
   3/9 hand-fight fall disagreements and .822 yd baseline trajectory error.

Keep production and PR #1 separate. Do not raise global resolution, adjust
strength to hit game averages, or treat these controlled checks as readiness
for 11-on-11 football.
