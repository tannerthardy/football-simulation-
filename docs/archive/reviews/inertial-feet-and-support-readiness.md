# Inertial feet and support readiness

## Status and where to start

**Physics is not ready for the owner's OK.** The next useful improvement is a
consistent force path through the feet, ground, body and hands. More specialized
football moves will not repair that foundation.

The unused research modules `inertial-support.ts` and `inertial-gait.ts` now
represent finite foot inertia, actual placement, shared leg effort, ground
traction, material grip attachments and a closing work/momentum ledger. Neither
is imported by `World`. Production football movement, falls and tackles still
use the preceding support model. Do not interpret a passing research panel as
an improvement already visible in the film room.

Work on `claude/engine-priorities`; keep PR #1 separate. Read
[PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md) alongside this review.
The [previous finite-support review](finite-support-foundation.md) retains its
historical measurements. Those describe the original massless reduction, not
the current inertial model.

## Deep review: what needs a different model

| Persistent problem | Diagnosis | Useful repair | Inadequate workaround |
| --- | --- | --- | --- |
| Long blocks and wrapped tackles disagree about falls | Contact load and actual support evolve through separate approximations | Solve material feet, ground reaction and hand constraints together; feed achieved support into body dynamics | More strength, a longer fall delay, or globally doubling substeps |
| A held corrective foot changes identity or provides support before landing | Intended correction is mistaken for an achieved plant | Persistent foot IDs, force-driven swing and recorded placement error | Resetting the support anchor or accepting the requested target |
| A nominal runner is slowed by his own foot controller | A corrective-step speed cap is being used for normal leg retraction | Finite foot inertia and a locomotion controller using actual world foot velocity | Increasing the corrective speed until one running case looks right |
| A sliding plant reverses velocity every interval without losing energy | Zero midpoint velocity is mistaken for a terminal stop | Coupled finite friction and explicit slip/stick transitions | Accepting energy closure as evidence that the trajectory is accurate |
| A strong grip creates sideways foot motion and repeated supposed stops | A signed velocity projection detects a direction change, not a zero-speed stop | Solve the 2D friction vector; distinguish direction updates from full-vector stops | Raising the event limit or snapping foot velocity to zero |
| Work and linear momentum close but rotation is unexplained | Noncentral internal forces create an unrepresented couple | Real actuator reaction torque and central passive tether forces | Ignoring angular momentum or hiding it in a strength multiplier |
| Ground traction and balance look plausible individually but fail together | Normal load, torso height, support torque and landing are not physically coupled | A minimal vertical/contact and pitch/roll reduction in the same solve | A filtered reference that lets contact-induced balance error disappear with time |

The massless kernel remains useful as an ablation and a numerical constraint
fixture. It is unsuitable as the normal gait foundation: at steady body speed
7 yd/s, a stationary plant requires relative foot velocity -7 yd/s. Restricting
that coordinate to a roughly 3.4 yd/s corrective-placement budget applies an
artificial braking force even in an otherwise unopposed stride.

Finite foot inertia fixes that particular modeling error only if geometry,
inverse mass, kinetic energy and reaction forces all change together. Merely
adding an inverse foot mass to the old solver would be inconsistent.

## Implemented physical reduction

Mass `M` is the player's total mass, including two point feet with masses `m0`
and `m1`. The material torso has mass `Mt = M - m0 - m1`. Positions and
velocities are world quantities. If `X,V` denote total COM state and `xi,vi`
the feet:

```text
Xt = (M X - sum(mi xi)) / Mt
Vt = (M V - sum(mi vi)) / Mt
K  = 0.5 Mt |Vt|² + sum(0.5 mi |vi|²) + 0.5 I omega²
```

The equivalent relative-coordinate inverse mass is
`Linv[i,j] = delta[i,j]/mi - 1/M`. A force applied to a material foot, a force
applied to the material torso, and a blend between them have their own matching
geometry, velocity, Jacobian, impulse response and work. A captured foot remains
the same slot through unloading, swing and loading.

Leg actuators act between actual feet and the torso. Their reaction changes
torso motion; they cannot move a foot without spending force and work. Summed
force magnitudes across both legs share the existing profile-derived leg
capacity. Positive work across both legs shares one declared power allowance;
negative work in another leg cannot finance additional positive work. Noncentral
leg actuation applies the corresponding reaction torque to a material torso
rotor, and that rotor's work is included in the same allowance.

Passive reach and tether normals use the actual midpoint geometry. A grip's
tension is capped by its allocated force allowance. If tension cannot hold the
distance, actual extension is recorded as slip and the passive hold distance
ratchets; the grip does not secretly reel the player back. It stops transmitting
force at its first reach crossing, while work already delivered remains in the
ledger. Pure tether tension permits transverse motion. A hand that also steers
needs a separate bounded control action, not free sideways rope resistance.

The old vector grip remains an explicit ablation. It can close translational
work while adding an unexplained angular couple. Its apparent ability to stop
sideways movement is not an acceptable universal interaction model.

The gait controller requests finite forces for stance drive and a future swing
trajectory. Actual foot motion is solved. Landing records the achieved point
and its error, including a miss when a strong hold defeats the stroke. Braking
still requests steps in the direction of actual travel. The planner forecasts
the other stance foot's reach deadline; that forecast is an imperfect control
plan, not a guarantee of successful placement.

The low-level solver returns candidates, including rejected ones, for diagnosis.
The gait driver rolls back the whole attempted tick on failure, preserving
body, foot and grip identities. Rejected candidates cannot advance support or
become a false successful tackle.

## Reviewed evidence

The [evidence and commands](../../../data/reviews/physics-world/inertial-support/README.md)
pin Node 22.23.3, source `3b328c7b…872df`, scripts and raw diagnostic hashes.
The final gait probe applies the same 0.01 s external force pulse at every
resolution through the shared driver. An earlier probe changed pulse duration
with `dt`; those results are historical and are not a pure before/after comparison.

- **288/288 gait cases complete**, including three foot-mass priors, three
  tick partitions, two mirrored/translated presentations, braking, cuts,
  pushes and weak/medium/strong sustained holds. All 96 timestep triplets are
  complete. No rejected trajectory is silently continued.
- Work, linear momentum and angular momentum residual maxima are approximately
  **3.28e-11, 4.44e-14 and 1.50e-12** in repository units. Mirror comparisons
  have no placement count/slot disagreements. This establishes sampled
  accounting and symmetry, not NFL gait realism.
- **Loaded-foot sliding remains a concern.** Nearly all loaded sliding occurs
  while a foot is taking load. The largest mean foot speed is 12.86 yd/s at
  only 3.37% prescribed load near the start of loading. Across all sampled
  loading intervals, mean sliding speed is 0.0555 yd/s. Some high-foot-mass,
  fast-stride cases finish loading with about 5.49 yd/s slip. There is still
  no physical vertical landing to determine when that foot should take load.
- Coarse/fine differences remain material: maximum torso path error is
  **0.142 yd**, maximum foot path error **1.061 yd**, and maximum matched
  landing-position difference **0.647 yd**. These include controller/phase
  sensitivity, not just numerical constraint residual. Inspect first divergent
  steps; do not increase global resolution to conceal them.
- The standalone inertial kernel's initially static and coupled-midpoint-slip
  cohorts both converge **1,836/1,836** with no contract violations. Unsplit
  midpoint candidates can still reverse endpoint velocity; they are not valid
  gait intervals until the driver handles their contact events. The frozen-slip
  ablation rejects 1,101/1,827 overlong candidates for positive passive work;
  these are retained stop/direction brackets, not successful trajectories.
- A four-grip panel adds repeated limbs/owners and multiple owners. All
  1,219 eligible random multigrip graphs have independently recoverable
  rank-4 impulse ledgers, with no unchecked cap. Static and coupled-midpoint
  cohorts again converge 1,836/1,836 without contract violations. This is
  evidence of shared constrained mechanics, not proof of a football double team.
- The original massless lifecycle improves from 138/160 to **160/160**, with
  no mirror-status disagreement; seed-4713 stress improves from 229/240 to
  **240/240**. Two wider 1,000-case seeds still reject **3 and 6** candidates.
  These local block repairs do not resolve the massless gait-model objection.

**351 TypeScript tests across 35 files, 22 Python data tests, typecheck and build
pass.** Production `World` does not select these modules. Its retained three
native hand-fight fall disagreements out of nine and 0.822 yd worst closest
error remain unresolved. No new full-game outcome cohort or parameter fitting
was needed for an unused model; game reproducibility remains tested.

## What the data can actually constrain

The new `scripts/data/biomechanics-inertial-priors.py` reads the two already
acquired Hamner subjects. Their embedded kinematic/low-pass OpenSim models
assign about **2.084% of total model mass to each foot** (talus, calcaneus and
toes). Their modeled total masses are 72.84 and 76.48 kg. Both models use the
same segment proportions. These are model assignments in two scaled male
models, not independent measured foot masses or an NFL population estimate.

The inertial panel therefore checks per-foot fractions 1%, 2.084% and 4% rather
than declaring the middle value correct. A point foot's effective inertia also
depends on omitted leg motion; the anatomical mass alone does not establish it.
Local segment inertia tensors are retained by the extraction script but are not
silently added to the planar torso rotor.

The existing small sample's speed-dependent plate-loading intervals and vertical
forces above two body weights are especially useful for rejecting the current
quasi-static load assumption. They do not directly set a motor stroke duration,
NFL friction coefficient, hand strength, or recovery latency. The Moore windows
still need original perturbation/belt timing before they can constrain recovery
response.

NFL tracking remains the more direct reference for football movement demand.
Use matched task distributions, body sizes, approach speeds and trajectories;
separate what a player could do from what he chose to do. League points and
explosive rates mix physics with coverage, calling, perception and roster
quality. They are regression context, not force targets.

## What is still missing

The present model is planar, with a torso yaw rotor and two point feet. It has
no articulated legs, vertical COM motion, solved ground normal reactions,
flight phase, pitch/roll, torso collisions, recovery/falls, or football
controllers. Load transfer is prescribed using nonnegative shares summing to
one. That assumption cannot reproduce running ground forces above body weight
or establish whether a restrained foot has actually reached the turf.

The power prior `legForce * max(vmax, stepSpeed)` is a broad explicit actuator
prior, not measured muscle power. Transfer/tracking/stroke times are also
explicit research assumptions. The kernel's caps are checked; their empirical
magnitudes are not certified by those checks.

An achieved plant is necessary for balance but not sufficient. Replacing the
legacy balance error with raw `X + V/omega - CoP` would count ordinary running
as a fall. Filtering a contact-induced velocity change into a nominal-motion
reference is also unsafe: it can erase unrecovered disturbance without a
restoring ground impulse or successful corrective plant.

## Best next steps and acceptance gates

1. Finish the 2D slip/stick model and local event transitions. A transverse turn
   must not be counted as a stop. Every accepted contact interval must obey the
   original force disks, passive-work bounds, finite reach and linear/angular
   accounting. Inspect all rejected and mirrored-status cases, not only averages
   among successful runs.
2. Add the smallest physically coherent vertical-support reduction: actual foot
   height, unilateral turf contact, normal impulse, torso height and pitch/roll.
   Start with finite axial leg compliance and an explicit stored-energy law,
   then bounded joint/retraction control. Rest-length/posture changes cost
   actuator work; phase changes must not erase or create compression energy.
   Tangential traction depends on the normal impulse actually transmitted.
   Flight has zero ground traction. The existing horizontal push cap is not a
   3D strength limit, and planar reach is not leg length. Finite sole and hip
   attachment geometry are prerequisites for authoritative balance. See the
   [integration design](physical-support-integration-design.md) for equations,
   alternatives and replacement points in `World`. Do not run a second ground
   solve after `World`.
3. Make recovery depend on that achieved support and body response. A moderate
   shove should produce a successful step; a larger one or a sustainable held
   foot should defeat it progressively. A disturbance remains mechanically
   present until real support restores it. Do not use an outcome timer or decay
   its debt into a filtered reference.
4. Integrate through an explicit default-off `World` path. Torso contacts, hand
   joints, strikes, grips, feet, lean and yaw must share the same solve and
   capability budgets. Preserve actual contact landmarks and IDs throughout.
5. Prove transfer across anchor, double-team drive, shed, absorbed contact,
   receiver jam/release and approach tackling with one capability set. Inspect
   the first coarse/fine difference in the retained QB-wrap and hand-fight
   traces. Only then compare small full games and conditional NFL movement.

Readiness means stable, physically accounted trajectories across those tasks,
including sustained and simultaneous contact, plausible movement constrained
by data, and production transfer. A closing ledger or a better points-per-game
number by itself is not that milestone.
