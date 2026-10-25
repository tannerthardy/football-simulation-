# How ready is the physical foundation?

Latest implementation and gate status:
[grasp motion and readiness gates](grasp-motion-and-readiness-gates.md).
The default conservation/position defects are repaired; graded contact remains
an opt-in prototype with failing football checks. This file retains the audit.

Audit of `c044b46` on `claude/engine-priorities`, following the owner's
universal-interaction direction. The underlying source is unchanged in this
audit. It adds a reproducible diagnostic and delivery gates rather than more
techniques or outcome tuning. PR #1 remains separate.

**We have useful movement and contact components, but do not yet have a
physically consistent universal interaction model.** Free movement is the
most developed part. Passive bump conservation and block pair geometry have
specific passing checks. Sustained loaded contact, body support and contact
transitions are still incomplete. A readiness percentage would be invented;
we need to judge readiness against explicit behaviors and invariants.

The [previous implementation review](fundamentals-and-contact-foundation.md)
contains paired game/NFL comparisons and the regressions from the last
contact changes. This audit identifies physical gaps, **not their frequency
in games or proof that they caused those statistical regressions**.

Evidence is in [`data/reviews/interaction-readiness/`](../../../data/reviews/interaction-readiness).
Run the [diagnostic](../../../scripts/interaction-readiness.ts) using the
[data guide](../../../data/archive/catalog-2026-10-11.md). Its source hash, definitions, synthetic
inputs and per-roster results are recorded with the measurements.

## What we can presently rely on

| Layer | Implemented | What remains unproved or missing |
|---|---|---|
| Free movement | Sprint capacity from splits, finite acceleration, directional speed, braking/cutting ellipse, turn rate, fatigue | Ground support is implicit; contact loads do not universally share its traction budget. Tracking agreement alone does not establish correct forces. |
| Body geometry | Mass, circular torso radius, optional shoulder-turned footprint, reach, height limits for ball actions | No persistent lean/support polygon, physical torso tilt, contact height bands or angular inertia. |
| Passive bump | Mass-weighted normal impulse, dissipative response, coupled-group translation, center-preserving overlap repair | Endpoint-only detection; no general tangential friction or off-center torque. Treating a grasp group as fully coupled ignores weak grip. |
| Blocking | Physical pass-contact normal, measured leverage, bounded pair repositioning, hand/base scalars, pass-set intent | Run and pass solves use different drive laws; contact-local support resets; helper motion/loads have approximations; contact anchors/slip are absent. |
| Tackling | Reach/occlusion checks, approach-quality inputs, impact, graded initial grasp, shared initial momentum, pile drive/topple/progress | Partial coupling is lost on the next update; contact tightening and velocity disagree; base/topple is not a general body state. |
| Press release | Press alignment, skill/geometry contest, finite movement afterwards | One rating draw inside 1.3 yd applies a slowdown; no shared punch/contact/traction calculation. |
| Observation/intent | Delayed observations and football-specific controllers; small protection-intent contract | Visual acquisition is still a design; controllers can use different information and bypass different physical limits. |

These layers have different levels of evidence. The 200 engine tests prove
particular contracts and scenarios, not complete biomechanical or NFL
validation. A successful initial wrap test does not prove the next pile update
preserves its properties. That boundary is one of the failures below.

## Reproduced physical gaps

The audit uses four generated rosters (7, 19, 31, 43), actual engine entry
points and a fixed 0.05-second native timestep. The crossing diagnostic
additionally refines physics sampling while keeping initial geometry fixed.
It does not turn the full production simulation into a variable-step engine.

### Partial grasp becomes full velocity ownership on the next tick

The diagnostic runs actual `tryTackles` with a carrier moving at 6 yd/s and
a stationary side tackler at 1.4 yd. Random misses, breaks and fumbles are
disabled. Both `power` capacities are set to `1e-9` to make external drive
and stopping negligible while keeping the existing toppling ratio finite.
This is a counterfactual isolation of the solver, not a normal tackle cohort.

Across four rosters:

| Quantity | Measured |
|---|---:|
| Initial grip | 0.320–0.418 |
| Mean momentum error when the grasp forms | approximately zero |
| Mean carrier/tackler relative speed after formation | 3.787 yd/s |
| Relative speed after the next `updateBond` | zero |
| Mean added momentum on that update | 311.0 kg m/s |
| Mean added kinetic energy on that update | 850.1 J |
| Mean maximum velocity/displacement mismatch | 2.307 yd/s |

Formation correctly blends velocities about the mass-weighted common motion.
`updateBond` then starts from the carrier's velocity and writes its resulting
velocity to every tackler. With a weak grasp those velocities differ, so this
silently creates momentum and energy. The following internal position
correction changes carrier/tackler separation without writing corresponding
relative velocities. Those are separate defects.

Active players can add energy and exchange momentum with the turf. The gate
is **accounting for bounded external work/impulse**, not requiring conservation
while players drive their feet. With external capacities nearly disabled,
this diagnostic isolates the unexpected creation at the handoff. The initial
grasp test's conservation guarantee does not carry through the next solve.

### Balance belongs to the contact rather than the person

The audit creates a run block, sets blocker/defender bases to 0.25/0.40,
disengages and immediately creates the same block with the same pose and time.
Both bases become 1.00 in **all four cases**. No physical recovery happened.

`baseB` and `baseD` live on `Engagement`; construction starts a new balance
history. The pass-set plant cache is also engagement-local. These are useful
approximations inside one rep, but are poor foundations for a defender
recovering from a release, a blocker taking a second opponent, or a player
changing from block contact to a tackle. Support and posture need persistent
body ownership; contact-specific control can still belong to the contact.

### Endpoint collisions depend materially on sampling

Two compact synthetic bodies have radius 0.25 yd, opposing speeds of
10.5 yd/s, initial longitudinal separation 0.55 yd and lateral offsets of
0 or 0.40 yd. Both start outside the effective 0.45-yard contact diameter.
The trajectories cross within the next 0.05 seconds. The actual `stepBody`
and `resolveBodyContacts` functions run; tackle attempts/controllers do not.

| Physics step | Head-on contact detected | Offset contact detected |
|---|---|---|
| 0.050 s | No | No |
| 0.025 s | Yes | Yes |
| 0.010 s | Yes | Yes |

The native endpoint samples are separated even though the swept trajectories
intersect. Smaller sampling detects the collisions. An offset contact may
legitimately retain longitudinal crossing order after a glancing deflection;
order reversal alone is not the acceptance rule. **Detecting and resolving
the swept body encounter** is the rule.

This demonstrates a possible failure at a plausible running speed, not a
game-frequency estimate. It also does not imply that every real crossing is
a tackle or that increasing the brain's update rate is appropriate.

## The missing universal mechanics

The most important missing structure is a single accounting path for movement,
ground support and contact load. We currently have several partly physical
models that can give the same player different rules as his role changes.

1. **Persistent body support.** Store balance/lean and finite recovery on the
   body. Start with compact support quality, stance orientation and stepping
   versus braced state; independent skeletal feet can wait. A player changing
   targets keeps his momentum, posture and support state. Physical falling
   should follow failure to recover support; an officiating whistle remains
   a separate rule.
2. **One ground-reaction budget.** Propulsion, braking, lateral mirroring,
   resisting a push and rotating the body draw on the same available footing.
   A strong athlete can increase available active force; skill influences
   positioning/control. Neither permits arbitrary force without traction.
3. **Bounded contact anchors and loads.** A torso bump pushes and separates;
   a hand contact can apply limited tangential steering; a grasp can pull until
   reach/load limits cause slip. Weak contacts are edges with compliance, not
   permission to turn an entire connected pile into a rigid body instantly.
4. **Compact angular/postural response.** Distinguish a central load from a
   load on the outside shoulder. A small orientation/angular-velocity and
   lean model can represent rotation, loss of base and recovery. It needs
   consistent torque units and bounded ground/contact moments; richer limb
   animation is independent.
5. **Reliable time and geometry.** Resolve fast body encounters with swept
   checks or bounded adaptive physics substeps. Keep sensor/controller timing
   fixed. Reconcile position corrections with velocity, and test crowded
   contact graphs, release and multiple simultaneous loads.

Full skeletal simulation is unnecessary for these contracts. 2D translation
plus selected height/posture/support states can express much more football
than the current model. Add vertical body dynamics only where a reproduced
failure requires it: jumping, low contact, falling and ball reach are likely
uses. A static catch-height limit is not already a jumping-body simulation.

Native units currently use kg, yards and seconds. These can remain if force,
impulse and torque conversions are explicit and consistent. The audit reports
momentum in kg m/s and kinetic energy in joules after conversion. The scalar
`power` derives from ratings/bench/mass; it is not a directly measured NFL
force curve or turf-friction coefficient.

## How the owner's examples share the foundation

| Football interaction | Shared mechanics | Controller supplies |
|---|---|---|
| Tackle redirects a pass rusher | Reachable hand contact, normal/tangent load, support, relative motion, bounded rotation | Outside lane, set depth, inside leverage, punch/ride/re-anchor choice |
| End squeezes a down block | Shoulder/posture geometry, support, load transmission and finite lateral response | Close space, maintain fit leverage, wrong-arm or box responsibility |
| Receiver escapes a physical release | Contact acquisition, hand load/slip, independent body motion and recovery | Foot/hand release choice, threaten leverage, avoid or clear the punch |
| Linebacker is sealed from a gap | Body/contact geometry, reach, tangential control and loss of support | Fit path, attack the blocker's shoulder, shed or regain leverage |
| Safety loses a tackle on approach | Actual relative trajectory, reachable grasp, limited braking and contact-induced balance change | Approach/leverage, breakdown or strike, target zone and risk tolerance |
| Back is knocked sideways yet stays up | Directional impulse, posture/support deficit, finite recovery steps | Continue drive, brace, evade or recover, protect the ball |

The same contact laws should operate even if the player is called a receiver,
guard or safety. Different techniques select contact placement, intent and
available control; they should not select incompatible momentum rules.
Uncertainty belongs in acquisition, decision, execution and footing rather
than an unexplained final-yard or automatic fall adjustment.

## Implementation order and acceptance gates

### First: make solver transitions coherent

Repair partial-grasp common-motion accounting and position/velocity agreement.
Require the formation-to-next-update probe to preserve momentum with external
capacities disabled, dissipate rather than invent passive energy and retain
finite graded coupling. Include outside assists and the existing third-body
bumps. Do this on the authorized branch; reconcile PR #1 separately before
any merge.

Add swept detection or local physics substeps for free-body fast contact.
Keep 20 Hz decisions/perception and their random samples fixed. A physics
refinement must not let players observe more often, generate new technique
draws per substep or change scripted stimulus timing. Measure cost alongside
head-on, glancing, thin-gap and dense-contact detection.

### Second: introduce body-owned support and an explicit load budget

Carry support/posture through contact release, new targets and tackle/block
transitions. Recovery requires time and finite movement. Migrate the pass
plant/base logic, run base and tackle toppling toward this state incrementally.
Keep hand control/contact history local to each contact.

Use a shared movement/contact capacity calculation; report requested force,
allowed force, traction use, slip and support deficit. Require that adding
lateral demand reduces remaining axial capacity and that an unsupported
player cannot provide a full anchor. Ground impulse/work must explain changes
in total momentum/energy; passive corrections cannot be counted as leg work.

### Third: migrate techniques onto contact intent

Pilot a pass ride and a run seal with identical support/contact machinery,
then the press jam and graded tackle. Publish desired contact location,
normal/tangential action, movement goal and commitment. The shared solver owns
reachable contacts and achievable motion. A failed technique changes local
control and posture; it does not directly prescribe yards or a slowdown timer.

Retain compact skill/footing uncertainty where observation cannot determine
an exact result. A deterministic perfect athlete is not the goal. Its random
execution differences must still respect reach, force and support limits.

### Fourth: certify transfer across football contexts

Build a small shared scenario pack covering all six owner examples. Vary
approach angles/speeds, mass, radius/reach, stance, lateral/axial demand,
weak/strong grips, third bodies and loss/recovery of support. Include mirrored
and rotated copies in a neutral world frame, not a formation-bound fixture.
Add piles and a blocker taking a new target without resetting his body.

Acceptance includes:

- Finite states, bounded penetration/reach and no missed swept encounters.
- Passive two-axis momentum accounting, non-increasing passive kinetic energy,
  and center-preserving internal corrections, within scaled floating tolerance.
- Explicit external impulse/work for driven motion; consistent load limits
  across free movement, blocks, jams and tackles.
- Finite slip, rotation and recovery; no role/contact change restores footing.
- Timestep convergence with fixed controller/perception cadence. Track error
  versus finer-step references and document accuracy/cost before choosing
  production tolerances. Contact detection must not disappear with tick phase.
- Matched fixed-call/front/roster film and anatomy, then paired full-game guards
  and the error budget. Mechanically passing does not alone establish NFL realism.

The Big Data Bowl can constrain free trajectories, displacement, relative
angles, encounter timing, separation, pocket geometry and contact-to-down
development. It does not expose precise hand loads, foot pressure, torso lean,
muscle forces or thoughts. Tracking-based attachment/contact definitions are
proxies. Use coaching and bounded biomechanics assumptions for hidden detail,
and evaluate whether one model transfers across concepts rather than fitting
a separate coefficient to each play.

Our next physical milestone is this shared scenario pack passing through
coherent support and contact rules. That is the point at which expanding
techniques and schemes becomes much less likely to require rebuilding the
foundation. We have not reached it yet. Full QB footwork/pressure memory
remains later work, as the owner requested.
