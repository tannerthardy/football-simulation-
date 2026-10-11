# Constraint work, impact timing and the next physical support model

## Status and where to start

**Physics is NOT READY.** Production now allows a numerical constraint solve
to correct its own earlier impulse guess without paying for that guess as a
separate muscle action. The same arm/grip limits remain. Two further numerical
experiments are default-off; neither fixes the sustained fall disagreement.

Work on `claude/engine-priorities` and read
[PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md). PR #1 remains separate.
Evidence and exact commands are in
[data/reviews/physics-world/constraint-work](../../../data/reviews/physics-world/constraint-work/README.md).
The previous [virtual support review](virtual-foot-coupling-and-biomechanics.md)
contains the rejected averaged-foot prototype and the acquired small
AddBiomechanics subset. That prototype remains an experiment, not a real foot.

The owner's seven priorities remain the development order. Priorities 1–3
are incomplete: there is no finite planted/swinging support lifecycle or
physical normal-load transfer yet. The work below repairs accounting needed
before adding those simultaneous constraints. It does not substitute better
game averages for a support model.

## Production repair: numerical corrections are not additional actions

A three-body fixture using the actual World row methods exposes the defect.
After an initial dissipative grip impulse, the next iteration needs to undo
part of its overstrong guess. That correction adds kinetic energy relative
to the guess, but the completed channel still removes energy relative to the
start of this physical solve. The former per-update passive clamp rejects it,
leaving a normal-row residual of 0.032. The converged passive solution has
net work about -0.957 in the fixture's kg·yd²/s² units.

For active hands, counting every positive numerical correction as arm effort
charges different work for the same converged dissipative solution when rows
are reversed. The fixture demonstrates this; it does not measure the frequency
of this configuration during NFL plays.

`World.constraintWork: 'per-solve'` is now the default. Each normal and tangent
channel has its own signed ledger for one physical substep. An iteration can
recover its own earlier dissipative guess, but the final passive channel stays
nonpositive. Active charge is the change in positive channel net work. Real
strikes and reeling still pay for each physical operation from the shared arm
budget. Rows and credits expire at the physical substep boundary. Credits do
not transfer between channels, bodies or time intervals.

The isolation and actual-world lifecycle tests cover momentum/work closure,
shared active limits, fresh rows, and separate passive normal/tangent ledgers
including the experimental support-motor path. This is not a proof of row-order
invariance for every mixed-sign, shared-budget graph or closure of reduced
pitch, vertical and limb energy.

## First divergence: the no-grasp hit

The seed-19 five-second frontal pursuit scene contains no grasps. The fine run
can also reuse every coarse controller command, separating solver behavior
from pursuit feedback. Read-only observers are checked against uninstrumented
runs and leave tick states unchanged.

The first shared-time disagreement is at 0.925 s. Both resolutions predict
the same touch time, 0.924413280765 s. Production applies contact before that
instant: 3.580 ms early at 12 subdivisions, 0.455 ms early at 48. At the first
shared endpoint, the combined two-body differences are 0.00652 yd in position,
0.9431 yd/s in velocity and 0.04253 yd in capture-point state. Both remain up.
Tick-integrated normal impulse is close, 340.181 versus 339.889 kg·yd/s; equal
impulse totals do not establish equal physical load timing or support response.
The 12-step run remains upright while the 48-step matched-control run falls
at 1.577083 s.

The experimental `impactTiming: 'local-sweep'` splits the nominal interval
before an incoming unrestrained torso pair reaches contact. It continues the
existing force/contact/support solve on either side. Nominal global resolution
is unchanged; local split counts and cap hits are reported. The predictor is
a constant-acceleration chord, not an exact coupled motion solution. The entire near-contact
island must have no live hand/grasp constraints or pending strikes. This
world currently groups all near bodies into one island; excluding a pair from
prediction alone would still subdivide its coupled solve when another pair
hits. Constrained islands retain speculative handling.

This restriction matters: the first unrestricted experiment loses shared-task
mirror agreement by up to about 0.00164 yd at refined resolution. A touch
epsilon does not repair it. Forecasting a coupled hand response from free
motion is not valid. The restricted experiment restores the shared-task
symmetry without pretending those collisions have been fixed. A mixed-island
regression test verifies that an unrelated incoming free pair cannot change
a persistent hand solve through event subdivision.

At the first shared impact endpoint, local splitting reduces position,
velocity and support differences to approximately 1.2e-9 yd, 2.1e-6 yd/s and
4.4e-9 yd. Subsequent force/support divergence still grows. The matched fine
run falls at 1.590625 s; the coarse run stays upright. **Onset is improved;
sustained-contact convergence is not solved.**

## Filter integration experiment

Production takes the mean of a filtered acceleration and then applies the
nonlinear free-foot acceleration limit. That differs from integrating the
limited response throughout the interval when the envelope saturates.
`integrateFilteredFollow` splits sign/envelope crossings and applies bounded
quadrature to the exact exponential filter with a frozen body velocity and
capability frame. It reports an error estimate, convergence flag and evaluation
count. The estimate is not a rigorous bound; depth/evaluation limits are
explicit. If the evaluation cap leaves an unestimated interval, the error is
explicitly null and the convergence/failure flag remains false/nonzero; it
is never recorded as zero or an implicitly serialized Infinity. No movement capability or physical constant is increased.

`supportIntegration: 'integrated'` selects it in the world; the default remains
`'mean'`. Tests compare a fine independent numerical reference, partitioning,
reversals, saturation, directional envelopes, reflection and rotation. This
fixes an isolated operator-order error, not missing impulse phase or moving
limbs. Combined with local onset splitting, the sustained fall disagreement
remains (fine matched fall at 1.587500 s). It is not promoted.

## Physical support design: keep coordinates, inertia and work consistent

The next model needs two persistent support-slot identities, finite reachable
candidate placement and nonnegative load transfer. A loaded plant remains in
world coordinates until lift or friction slip. Unloaded candidate movement
cannot count as achieved support; a leg grasp remains on its captured slot
through a role exchange. Ground traction and active leg effort are shared
with locomotion, lean and turning. Quasi-static normal-load shares must be
labeled as an assumption: this engine has no vertical-force solve.

A planted slot changes the force path. Reusing full COM impulse plus the old
averaged-foot mobility would violate the velocity Jacobian of a fixed point.
For a finite point-mass derivation, let total COM be X and r = xslot − X.
If foot mass is mf and torso mass is M − mf, the internal inertia for this
coordinate is mf·M/(M − mf), **not** the reduced mass for foot–torso separation.
A blended grasp at X + s·r has generalized impulse [J, sJ]. A fixed slot
requires V + rdot = 0; use its constrained inverse mass and ground reaction
from the same mass matrix. Friction-limited slip changes that constraint and
must account for negative ground work. Do not change geometry while retaining
the old effective mass or erase a held point at transfer.

The finite-mass calculation is a design check with illustrative masses,
not measured athlete segment inertia or an implemented World foot. An
alternative massless placement motor still needs explicit actuator/ground
reaction and work accounting in both swing and plant modes. Choose one
coherent reduction before integrating the lifecycle; do not mix them.

## Validation and limitations

Final verification on Node 22.23.3: 308 TypeScript tests, typecheck and build
pass; 22 Python data tests pass. Final source and measurement pins are
distinguished in the manifest. The runtime version is a required measurement
coordinate, alongside source, roster seed and constructor policy.

The source-pinned eight-game guard uses seed 7 and two generated leagues;
tracking uses four games, seed 5. Per-solve work changes game histories:
pressure 24.3% → 29.2%, sack rate 3.11% → 5.25%, points/team-game
31.06 → 28.69. Other guards worsen: passing yards/attempt 9.58 → 10.02,
20+ completions/attempt 12.73% → 14.63%, YAC 8.40 → 8.59 and rushing
yards/carry 3.81 → 3.47. These are descriptive, noisy guards with generated
rosters, not fitting targets or causal attribution of individual plays.

A late guard caught a runtime mismatch: the auxiliary frozen-validation
games used Node 24.19.0, while the final production measurements use Node
22.23.3. Those cohorts are retained with their actual runtime; their metric
differences are not attributed to the last experimental-only source edits.
The same-runtime Node 22 parent comparison is recorded separately. Small
floating-point differences can grow into different closed-loop game histories.
The repository now declares Node 22 and pins 22.23.3 in `.nvmrc`; every
measurement manifest still records the actual executable/version.

Ordinary frontal tackles remain successful across the existing six-resolution
panel. The production hand-fixture fall disagreements remain 3/9 at native
resolution; worst closest-approach error remains 0.822 yd. The default shared
five-task panel preserves its existing behavior and budgets. Neither passing
aggregate contracts nor improved pressure is a readiness certificate.

## What's next

1. Build the finite two-slot lifecycle with a consistent plant/swing actuator
   or inertia model, shared ground reaction, reachable placement, explicit slip
   and grip identity continuity. Validate the support mechanics before integrating
   balance and normal football controllers. No anchor resets to hide drift.
2. Feed balance from physically achieved loaded support. Recheck weak/medium/
   strong holds and ordinary successful tackles; distinguish failed corrective
   placement from unavoidable falls.
3. Trace the remaining sustained disagreement after 0.929167 s. Inspect
   compliant-contact residuals, ground/support feedback and event timing;
   improve persistent/local solves only where the trace identifies a defect.
   Do not raise global subdivisions or add a fall grace period.
4. Revalidate anchor, double drive, shedding, absorbed contact, jam and
   tackling across sizes, speeds and leverage using one capability set.
   Continue small conditional NFL guards without tuning forces to totals.
5. Then executable approach rollouts and initial run push/get-off mechanics.
   Use the existing Hamner loading/marker observations for support timing.
   Moore recovery fitting still needs original T046/T031 disturbance/belt
   events and mapping to the processed windows. That missing metadata blocks
   that specific data comparison, not all engine progress.

No coverage, QB, playcalling, viewer library or PR #1 changes are included.
