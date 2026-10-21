# Spatial support to World: adapter seams

Read-only architecture review, 2026-10-10. This is a map for a future
non-default adapter, not an implementation or readiness claim. The spatial
primitives are still research code. Current production `World` remains a
planar COM/yaw model with reduced capture-point support.

## Current research interfaces

- [`material-rigid.ts`](../../../src/physics/material-rigid.ts) defines the
  `MaterialRigidState` (mass, isotropic inertia, position, linear velocity,
  angular momentum, local-to-world basis), Cayley midpoint poses and exact
  material attachment position/velocity identities. It has no force,
  strength, gait or ground policy.
- [`spatial-support.ts`](../../../src/physics/spatial-support.ts) exposes
  `newSpatialSupport`, `evaluateSpatialSupportCandidate`, and
  `advanceSpatialSupport`. It couples all 18 linear/angular momentum equations
  for one torso and two rigid feet with fixed hip/ankle offsets and passive
  axial springs/dampers. Known center, point and couple impulses enter that
  solve. It currently has no ground, active posture, series rest-length
  control, inter-player contacts, or `World` selection.
- [`sole-contact.ts`](../../../src/physics/sole-contact.ts) provides unilateral
  normal and metric Coulomb friction projections plus `solveSoleImpact` and
  `solveSoleReaction` for one rigid body at already established contact
  geometry. The impact call requires the sole points to already lie on the
  plane and holds pose fixed; it does not find touchdown time.
- [`spatial-ground.ts`](../../../src/physics/spatial-ground.ts) exposes
  `advanceSpatialGroundContact` with at least three non-collinear
  sole points per supporting foot; the other foot may be unloaded. It adds sole impulses to the same spatial candidate as leg
  response, checks endpoint gap, normal/friction rows, work, and negative
  instantaneous held reaction or an outward release demand. It explicitly does not handle touchdown or
  liftoff events, and reports `interiorEventCertification: 'not-provided'`.
  It requires established contacts with zero initial normal velocity; it is a
  smooth-contact prototype, not a lifecycle driver.

These are useful composable mechanics APIs, but the current capability is
isotropic rotors, fixed passive legs, and established sole contact. A playable
gait still needs bounded series/rest control, hip-direction and posture
controls, persistent contact modes, and actual liftoff/touchdown events. No
caller may interpret a candidate state on a rejected report as accepted state.

## Existing World seams

[`Body`](../../../src/physics/kinematics.ts) stores `pos: Vec2`, `vel: Vec2`,
`facing`, and `spin`; it has no height, 3D orientation, angular momentum,
finite feet, or persistent support-contact geometry. `profile.massKg` is the
whole-player mass. `pos` is used as the player's planar center for collision,
movement, intent and tracking. In a finite-mass representation, the material
torso center and total-body COM differ whenever the feet move relative to the
torso. The adapter must define one canonical map. A sound seam is to preserve
`Body.pos/vel` as the planar total COM/control anchor and compute torso pose
from the torso/foot masses and relative material states; torso collision and
joint geometry must then use the computed torso pose. Do not silently assign
`Body.pos` to both total COM and torso material center.

`PhysicalProfile` already has useful movement intent/capacity inputs:
`vmax`, `tau`, `brake`, `lateral`, `turnRate`, `massKg`, `heightYd`,
`power`, and optional `balance`, `bend`, `stepSpeed`. `locomotionAccel()` in
`kinematics.ts` turns a requested velocity into a planar planned acceleration;
it is not a solved 3D joint force and already assumes the production support
envelope. `supportParams()` in `support.ts` derives mass/height-based defaults,
including an assumed `TURF_MU`, yaw inertia, traction and push force. Those
values can seed explicit experiments or preserve controller intent, but they
do not establish finite leg force, joint torque, series-actuator rate, sole
shape or NFL contact capacity. The AddBiomechanics shape report is a model
prior only; mapping it to each roster profile needs a declared mass/inertia
assignment and sensitivity range.

`World.step()` plans each body's intent once, partitions bodies into near and
alone groups, and advances near participants in a shared planar island.
`substep()` and `integrateSubstep()` apply old `feet()` locomotion/lean/dive
forces, solve planar `detect()`/`solveContact()` torso contacts and hand/grasp
joints, integrate `Body.pos`, then call `updateSupport()` to advance the
capture-point/fall state. `feet()` also updates facing, yaw, and virtual-foot
state. `bodyshape.ts` supplies a 2D squeeze ellipse. None of those are spatial
torso/sole contact geometry or physical support events.

Current `HandJoint` and `GraspJoint` attach through planar center separation,
height scalars, and an optional share into the held body's `VirtualFoot`.
`graspPoint()`/`graspVelocity()` make the reduced foot coordinate consistent
with that reduced model; they are not a material hand attachment Jacobian.
Any spatial holder must join the same coupled island as the held player and
apply equal/opposite forces at actual material hand/torso/limb attachments,
including angular impulse and work on both participants. A held player cannot
be left on legacy support while the holder uses spatial feet.

## Non-negotiable adapter boundaries

An experimental `supportModel: 'spatial'` should be an explicit whole-island
choice. For every selected body, one and only one path owns translation,
rotation, leg force, ground reaction, contact and fall state for that
interval. The following production path must not also execute for those bodies:

- `feet()` propulsion, lean, dive, yaw and virtual-foot correction;
- legacy `updateSupport()` capture-point growth, fall thresholds, or timed
  down/rise updates;
- planar `detect()`/`solveContact()` impulses for the same torso pair;
- planar hand/grasp impulses or `supportImpulse()` for a grip represented in
  the spatial solve;
- the legacy ground impulse/work ledger for force already applied through
  spatial sole contacts.

Conversely, the adapter must not append a second spatial impulse to legacy
`Body.vel` after the old substep. Existing `MoveCommand` may supply desired
motion/facing, but the spatial controller must transform that intent into
bounded, executed forces/torques in the shared solve. Do not add a hybrid
fallback that runs legacy physics after a spatial rejection: that would change
the physical law at the exact hard cases and can hide missing state. Reject
and retry locally from the same snapshot, or report the whole experimental
step as not advanced.

## Required interface and transaction plan

1. Add a sidecar `SpatialBodyState` keyed by stable player identity. It should
   own torso/foot material states, their mass split/inertias/bases, fixed
   attachment geometry, leg/controller state, and persistent sole contact
   modes. Keep it separate from ephemeral solver work arrays. Define
   conversion to/from `Body.pos/vel/facing/spin` in one tested adapter; preserve
   total COM and momentum when projecting to the existing controller/recording
   view.
2. Extend the contact graph so every near body pair, hand/grasp joint, strike,
   and other impulse participant belongs to one solve island. The static turf
   does not permit a body-to-body split for a connected grip. Broaden the
   current planar circle sweep with conservative spatial bounds, then use
   actual material torso/hand/sole points for contact rows. Sole points require
   a shape prior; do not infer a cleat polygon from heel/toe markers.
3. Build a single island candidate with all participants' linear/angular
   momenta, passive legs, bounded active controls, sole normals/friction,
   impacts and player-player contacts. Allocate each body's shared leg/arm
   force, power and positive-work budget across all its active channels before
   accepting the candidate. Holders and held bodies use the same equations and
   energy/momentum ledger.
4. Put touchdown, separation, friction stop/reversal, spring chord limits,
   and angular phase into a local event driver. Solve the first event time,
   re-solve every connected participant over each segment, and preserve the
   first rejection witness. The current established-ground prototype is not
   an event driver.
5. Make a substep transactional. `World.step()` currently mutates bodies,
   supports, joint loads/break state, pending strikes, world time and report
   accumulators. There is no whole-island public rollback checkpoint. Compute
   candidates off to the side; commit body, joint, gait, support, time and report
   state only when the complete connected solve is accepted. For local
   subdivision, restore the full connected island, all connected joints, and
   per-step budgets before retrying. No RNG draws should occur inside the
   retry loop.
6. Serialize a versioned spatial sidecar by stable body/joint IDs (material
   poses, velocities, angular momenta, contact modes/IDs, leg and gait state,
   and controller state). Scratch arrays and Newton iterates are transient.
   Round-trip a snapshot, step both copies, and compare complete states,
   joints, outputs, and next RNG state. Old saves need an explicit default-off
   migration path; absence of sidecar data must not select spatial physics.
7. Keep the solve sparse and contact-connected. A dense finite-difference
   Newton system scales poorly as every body contributes 18 momentum unknowns
   plus each contact force. Broad-phase first, solve only connected islands,
   exploit per-body/attachment Jacobians, and bound local event subdivisions.
   Measure a full 22-player tick and worst-case trench/grasp cluster at target
   hardware before increasing default work. Never split a holder from a held
   participant to meet a timing budget.

## Gates before enabling the adapter

First prove local spatial mechanics: zero-ground free flight follows gravity;
passive hip/ankle springs and damping close work at oblique offsets; static
standing has nonnegative normals; flight has no traction; held-foot lift
progresses only within grip/leg force and work limits; finite sole touchdown
loses the correct impact energy; unloading actually releases normal support;
and no accepted interval has negative normal reaction, penetration, hidden
stored-energy return, or force-cap excess. Repeat under translation, rotation,
reflection and timestep refinement. Ledger closure alone is not enough; the
path and event sequence must converge.

Then gate the full coupled island with a hand/fall reference at multiple
resolutions, universal multi-body contacts, and the owner's six interactions.
Require exact rollback and snapshot round-trip, no legacy/spatial double
impulses, equal/opposite joint impulses, and measured worst-case runtime. Run
NFL movement and game summaries afterward as transfer guards, not fitting
targets. Keep the option default-off until every applicable gate is reviewed
and production control reaches the intended states physically.
