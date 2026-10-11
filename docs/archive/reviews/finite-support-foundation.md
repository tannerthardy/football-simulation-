# Finite feet: the next physical foundation

## Status and where to start

**Physics is NOT READY.** A finite support research kernel is now implemented
in `src/physics/finite-support.ts`. It has persistent foot identities,
unloading, finite swing, achieved-position landing, loading, friction-limited
slip, and a coupled grip/ground/actuator solve. **World does not import or select
it.** Production support and football behavior remain at `8a6683c`.

This is the mechanical foundation for the owner's priorities 1–2, not completion
of priorities 1–3 in the football engine. There is no calibrated running gait,
vertical contact solve, or production fall integration. The wider mechanical
panel still rejects cases; passing conservation tests cannot certify it.

Work on `claude/engine-priorities`. Read [PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md)
alongside this review. PR #1 stays separate. Reviewed evidence and exact commands
are in [finite-support](../../../data/reviews/physics-world/finite-support/README.md).
The previous [constraint-work handoff](constraint-work-and-impact-timing.md)
preserves the production work repair and unresolved sustained-contact traces.

## What the deep review found

The principal deficiency is the force path through support, rather than a lack
of football-specific moves. The previous averaged-foot experiment translates
its corrective point with the body and can improve balance while a corrective
step is merely intended. Its cumulative offset reaches 7.27 yd. A grip can
restrict that correction without representing a real planted point's ground
reaction. Limiting or resetting the offset would conceal the missing mechanics.

Several apparent football defects share this foundation:

| Observation | Missing or unstable mechanism | Next falsifiable check |
| --- | --- | --- |
| A lineman keeps yielding or suddenly falls under a long shove | Achieved footing, force-limited ground reaction and balance evolve through different approximations | Same plant/step model anchors, yields, then recovers or fails as load increases |
| A leg grip trips a runner differently across resolutions | Foot placement, grip restraint and load transfer are not one force solve | Fixed captured slot survives lift/landing; stronger sustainable restraint progressively opposes the same step |
| Players look like they skate or whiff on turns | Controller requests, available traction, actual plants and nominal running support are only loosely coupled | Same capabilities brake, plant and redirect across speeds without extra agility |
| Long hand fights disagree about falls | Initial impact timing, subsequent support feedback and near-dependent constraints amplify one another | Trace the first difference, then solve only the affected local constraints |
| A passing game or outside run is too explosive | Physics, pursuit, assignment and technique can all contribute | Separate physical feasibility from decisions; do not tune forces to yards or points |

Independent reviews considered three reductions. Full articulated limbs require
segment masses, joint inertia and validation that we do not have; they add too
many uncertain parameters for this next step. A finite-mass foot coordinate can
be coherent, but its full mass matrix and limb kinetic energy must accompany
the changed geometry. Adding only an inverse foot mass is inconsistent. The
chosen first slice uses massless, damped relative placement coordinates with
explicit reaction forces and work. It makes the missing force path testable
without claiming anatomical dynamics.

## Implemented reduction

Units remain the repository's kg, yards and seconds. Every body owns two stable
slots. A slot has an actual world position, relative rest offset, plant/swing
mode, normal-load share, intended target and finite stroke state. A step unloads
the same slot before lifting it. Swing contributes no ground support. At the
end of the stroke the flat model plants at the **achieved** location and records
target error, then transfers load. It never substitutes the target for the
achieved point or changes a held slot's identity.

The scheduled stroke ends and load-transfer ends split locally. The clock here
is a declared motor stroke/transfer assumption, not a football read or a tackle
success timer. There is no foot height, so the kernel cannot establish that a
held foot remains suspended above turf. An exact-target landing gate was rejected:
body motion and finite integration can otherwise leave a foot hovering forever.

For interval length `h`, body mass `M`, total external/grip/ground impulse `P`,
slot aggregate generalized impulse `S`, compliant mobility `mu`, and bounded
free command `u0`:

```text
mean body velocity = V0 + P / (2 M)
relative slot velocity = u0 + mu S / h
absolute slot velocity = mean body velocity + relative slot velocity
grip landmark = X + s (foot - X)
grip landmark velocity = mean body velocity + s relative slot velocity
generalized landmark impulse = [J, s J]
```

All constraint velocities, integrated positions and work use this midpoint
velocity consistently. Ground and grips are solved together before integration.
A sticking plant needs zero achieved absolute velocity; friction limits its
ground impulse to `traction × load share × h`. If the force cannot hold it, the
point slips through its actual velocity. A passive finite reach reaction limits
the relative coordinate before integration; there is no post-step position reset.

The same profile-derived support capabilities supply traction, placement speed
and active force. Free commands share both a summed-speed limit and summed
force limit across the slots. Passive mobility remains finite at zero active
effort; zero effort does not turn a leg into a rigid lock. Multiple grip claims
share their owner's capacity, and all unusable claims are removed before
allocation. A later broken claim cannot dilute an earlier usable grip.

Ground work uses absolute foot velocity, grip work uses relative landmark
velocity, reach work uses the relative coordinate, and motor work is `-S·u`.
Together with prescribed external work they close planar body kinetic energy.
Final passive work is checked after the entire solve, since a later row can
change an earlier row's work. No foot kinetic energy is invented for a massless
coordinate. The reach response is a finite-interval speculative constraint,
not an anatomically exact rod or a calibrated peak joint force.

## Local convergence repair

A held point that begins taking ground load makes grip and plant rows nearly
dependent. At small intervals `mu/h` dominates the body response, so separate
row iteration can consume 256 iterations without solving their force balance.
Conservation still closes in that failed candidate; that does not make it valid.

The local block has midpoint responses `a=.5/M+mu/h`, grip response `q`, and
signed cross response `c=sign(.5/M+s mu/h)`. Eliminating an interior full grip
gives the isotropic ground response `a-c²/q`; the ground disk remains exact.
For an inactive normal grip, the tangent impulse is a scalar `z` bounded by the
grip capacity. For each `z`, the exact ground minimizer is its capped disk
projection. The remaining tangent gradient is monotone, with derivative at
least `q-c²/a`, so a bounded scalar bracket finds its minimum. The candidate
must still satisfy normal slack, ground and grip caps. Other active sets remain
with projected iteration; nearly singular blocks are skipped.

This repaired the targeted collinear and oblique load-transfer failures without
extra strength, looser solve accuracy, or more global physics subdivisions.
It does not guarantee convergence for every constrained graph. Numerical
normal-boundary acceptance is 1e-12 impulse roundoff; the solve tolerance remains
1e-9. `coupledUpdates:false` provides the ablation.

The low-level solver returns its diagnostic candidate even when convergence is
false. The phase driver throws `SupportSolveError`, includes that report, and
restores the whole attempted tick, preserving body/slot identities. A rejected
candidate cannot advance loading or become a false plant.

## Evidence and persistent failures

All measurements use Node 22.23.3 and the source/script pins in the manifest.

| Mechanical panel | Separate rows | Local coupled blocks |
| --- | ---: | ---: |
| Original simultaneous grip/ground cases | 24/24 converge | 24/24 converge |
| Seed-4713 three-body/four-grip stress | 224/240 converge | 229/240 converge |
| Finite-step lifecycle: four profiles, five conditions, two mirrors, four tick partitions | 88/160 complete | 138/160 complete |

Every accepted/converged case passes the specified work, momentum, traction and
active-budget checks. The stress script independently reconstructs free
commands from achieved velocities and impulses; a self-reported budget fraction
alone is insufficient. Maximum converged stress work and momentum residuals are
about 1.6e-12 and 5.7e-13 in repository units. These are numerical checks, not
validation of actual NFL gripping or ground-force magnitudes.

**Eleven stress candidates and 22 lifecycle cases remain rejected.** Many
lifecycle failures occur near completion of load transfer, including a locally
split interval of about 0.000147 s. The current two-row block leaves shared
multi-plant/body modes and some active-set transitions to slow projected
iteration. Two mirrored pairs disagree on completion, even though body-position
mirror errors among completed pairs are about 1.3e-13 yd. Reporting only the
successful mirror error would hide that failure. The largest completed body
position difference against the finest partition is about 0.0191 yd, with
comparison cells omitted when either run failed. It is not whole-contact or
football convergence.

Other limitations remain material:

- Loads are prescribed quasi-static nonnegative shares summing to one. They
  are not solved vertical forces, and there is no flight phase. Running data
  with vertical loads above two body weights cannot be reproduced by this
  assumption.
- Geometry and stroke/transfer/response times are provisional engineering
  assumptions. Massless limbs omit limb inertia, vertical work and metabolic
  effort; a freely moving unloaded slot need not change body kinetic energy.
- The kernel has translation only: no torso collisions, yaw/pitch coupling,
  gait controller, balance recovery, falls or football decisions. A point
  labeled plant can also be sliding; loaded support alone proves no balance.
- The midpoint stiff-limit sign reversal is reported explicitly; bounded work
  does not make stiff motion accurate. No full running or stiff-timestep
  readiness claim is made.
- This is not a second physics world for football. Production integration must
  share existing locomotion, lean and turning effort rather than run this solve
  after World and spend another traction budget.

Final verification: **322 TypeScript tests across 33 files, 22 Python data
tests, typecheck and build pass.** The production hand panel remains at three
native-resolution fall disagreements out of nine and 0.822 yd worst closest
error. The five-task production panel's native mean/max position difference
against 48 subdivisions remains 0.0297/0.0690 yd. The new kernel is unused there;
those unchanged results do not establish its football transfer. No new NFL
outcome fitting or full-game statistical cohort was needed for an unused module.

## How the small biomechanics sample guides this

The acquired [four-subject sample](../../../data/reviews/biomechanics-support/README.md)
has 12 windows, 5,892 frames and 5,431 force-valid frames. At the 50 N plate
threshold, the two Hamner subjects' median loaded intervals shorten from
0.324/0.357 s at 2 m/s to 0.204/0.224 s at 5 m/s. Each subject/speed cell has
six complete intervals at that threshold. This supports checking speed-dependent
load timing for a future gait, not fitting the prototype's .12 s swing/transfer
parameters. Plate loading does not identify every individual foot's stance.

Total vertical force p95 spans roughly 1.85–2.59 body weights across the running
windows. Marker/CoP distances are registration context, not a support radius or
plant tolerance. Derived COM and force-fitted dynamics are not independent
force truth. The selected Moore windows still lack original disturbance/belt
timing; they cannot identify recovery latency. No extra dataset download or
contact-force fitting was performed in this increment.

## What's next, in order

1. **Finish the local constrained solve before World integration.** Reproduce
   the retained late-transfer and mirror-status failures. Inspect KKT/physical
   velocity residuals and first active-set change, then consider one grip plus
   all positive-load plants on its endpoints as a tiny local constrained block.
   Preserve disks, one-sided grip and shared caps. Do not independently clip an
   unconstrained block, increase global resolution or hide failed candidates.
2. **Design nominal gait and one motor budget.** Translate World movement intents
   into stance push and finite swing placement, including speed-dependent stance
   and flight assumptions. All ground/leg/yaw/lean actions must spend the same
   capabilities. Validate unopposed walking, running, braking and cuts before
   feeding contact loads. Use Hamner timings descriptively and NFL matched
   movement tasks for actual football demand.
3. **Integrate achieved support with balance.** Current `xi` is excess capture
   error relative to nominal free gait, not raw `X+V/omega-CoP`. Substituting raw
   support into that calculation would count sprinting as a fall and double
   count existing following/overspeed terms. Derive the nominal gait frame first;
   then distinguish an attempted step, achieved landing, slipping support and an
   unavoidable loss of support. Do not add a fall grace timer.
4. **Add an explicit default-off World path.** Preserve captured foot IDs through
   grips and phase changes; use the same landmark Jacobian for geometry, force,
   work and leverage. Extend rotational response consistently. Re-run ordinary
   successful tackles and moderate-push recovery before long QB-wrap traces.
5. **Prove transfer.** Anchor, double drive, shed, absorbed contact, press and
   tackling must work across sizes/speeds/leverage with one capability set.
   Then inspect the first sustained disagreement after the repaired impact onset.
   Keep small conditional NFL guards; technique and roster differences belong
   in interpretation, not hidden physics bonuses.

The highest-value extra material remains small: original Moore T046/T031
disturbance events, treadmill belt histories and mapping to processed windows;
or force-plate/marker trials of cutting and recovery with clear contact timing.
NFL tracking constrains executed movement but cannot directly identify grip
strength, cleat friction or collision force. A giant additional generic motion
dataset is lower priority than closing these known mechanical failures.
