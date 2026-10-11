# Sole traction and the next physics step

**Physics is not ready.** This is a research-model increment. Production
`World`, football plays and replays still use the preceding physics path.
Start here, then read the preceding
[normal support review](sole-compliance-and-next-support-step.md).
Current source SHA-256:
`d7f700a0a2255a7844f34181ed6389b62629c3318a29af1541bcd6699b6a8151`.

## The review's conclusion

The next useful foundation is a consistent chain from foot support to contact
force to whole-body motion. Production still approximates parts of that chain
separately. In sustained blocking, a held leg, a cut or several simultaneous
contacts, those approximations can disagree about what holds the player, how
much force it transmits, and what support is physically achievable. The retained
native hand-fight baseline has 3/9 fall disagreements and .822 yd trajectory
error. This increment does not claim to improve that production baseline.

The previous research increment solved finite torso/feet/leg momentum and
weighted normal sole compression together. It exposed why conserving energy
alone is insufficient: closing a rotating toe's endpoint gap can leave its
actual velocity directed into the ground. A rigid zero-slip tangent rule has
a related problem: zero average slip can hide a velocity reversal, or an
out-and-back contact path. It can pass an energy check while transmitting an
incorrect force. Post-step velocity corrections would introduce another
uncoupled response.

The smaller coherent next step is a finite shear element at each sole point.
It permits limited elastic deformation before yielding. It is an explicit
shoe/ground material assumption, not a convergence regularizer or a player
strength bonus. A true temporal rigid-contact solver remains an alternative
if plausible finite material assumptions cannot pass the eventual lifecycle,
transfer and cost gates. Full skeletal anatomy is unnecessary for this test.

## What is implemented

`src/physics/sole-shear.ts` advances a persistent two-dimensional elastic
stretch along a constant contact chord. The elastic energy is `Kt*w*|s|²/2`.
Force grows with stretch; outward loading at the friction limit instead moves
the plastic anchor and dissipates energy. Elastic unloading can do positive
work on the foot, paid for by decreasing stored energy. Friction therefore
cannot be checked by rejecting every positive tangent work product.

`src/physics/spatial-sole-compliance.ts` evaluates that law inside the existing
18D torso/two-foot solve. Actual candidate normal forces size the per-point
yield disk: `R0/1 = μ*(Kn*w*compression0/1 + Nd)`, with the same constant closing
dashpot `Nd` used by the normal law. Thus integrated tangent capacity is exactly
`μ*(JnormalSpring+JnormalDamper)`. Tangential impulses act at the same actual
material point as the normal, creating the corresponding foot torque. They
change the next trial's foot pose, normal loading and leg response.

The capacity profile is a **discrete affine definition**. In particular, its
start value includes the candidate interval-average closing dashpot. It is
not an observed instantaneous normal-force history. Initial stretch above the
available cap relaxes through an explicit dissipation entry; it is never
silently erased or turned into an unbudgeted body impulse. A free patch has
zero traction and explicitly releases any remaining elastic energy.

Persistent state requires patch IDs and a versioned material fingerprint.
Every Newton/finite-difference trial starts from the same accepted stretch.
Material changes cannot reset or reinterpret its energy. Body and shear state
commit together on acceptance and both roll back on physical/numerical
rejection. Weighted collocated splitting scales stiffness and normal force
together; extra points do not buy extra traction.

Reports separate actual attachment work from constitutive chord work, retain
elastic energy and plastic/initial-return dissipation, and expose all-body
momentum and torque residuals. Local phase estimates include normal, tangent
and leg mobility; tangent response includes both directions and actual moment
arms. Counters include full Newton/line-search/finite-difference constitutive
cost rather than only the final candidate.

## What the independent review found

The development checks found and corrected three distinct problems:

1. Ordinary quadrature in elapsed time could miss a narrow direction-turning
   layer. Reparameterizing by constitutive direction phase resolves it.
2. Phase quadrature alone could miss nearly stationary force during rapid
   normal-capacity loss. Log-capacity integration resolves that second scale.
   Separate force-integral references exposed these errors even when the
   common energy identity passed. Embedded quadrature error remains a numerical
   estimate, not a rigorous enclosure.
3. The body solver initially used unweighted normal force to size split
   patches' trial shear caps while the final audit used weighted force. Actual
   attachment/energy checks rejected the mismatch. Saturated split regressions
   now protect both candidate and final constitutive paths.

The isolated stress script has 202 independent calls covering exact loading,
yield, reverse unloading/reloading, zero-load release, constant-cap analytic
vector integrals, fine independent plastic-return references, rotations,
reflections, weighted splitting and constitutive interval subdivision.

The coupled panel passes **7,870 intervals** with zero ordinary rejection or
independent mechanics violation. Exact 1D endpoint errors decline about
fourfold when the interval halves; maximum independent coupled work residual
is `2.072e-10`. The previous **9,632-interval** normal-support panel also passes
at this source. All **465 TypeScript tests, 22 Python tests, typecheck and
build pass** with the pinned Node 22 runtime.

Coupled evidence and reproduction commands are recorded in
[the evidence README](../../../data/reviews/physics-world/sole-traction/README.md).
The coupled panel reconstructs force, torque, energy and capacity from inputs
and accepted states. Exact 1D phase-event references cover elastic and yielded
motion; a separately stepped planar reference covers a small-inertia loaded
rocking foot. Loaded torso/feet panels include passive legs, shoulder load,
rotation, reflection, translation, point permutation and splitting. Benchmarks
report cost for 1/2/4/8 collocated points per foot. They do not establish the
cost of a connected 22-player World.

`Kn`, `C`, `Kt`, μ and sole geometry remain sensitivity assumptions. The small
AddBiomechanics subset informs mass/inertia and motion demand, not shoe/turf
constitutive parameters. NFL tracking likewise cannot identify pre-slip
deformation or contact force from player positions alone. Do not choose these
parameters from sacks, explosive plays or yards per carry.

## Persistent problems and the best next work

1. **Actual contact and slip lifecycle.** Uniform candidate contact modes and
   endpoint reversal guards are deliberately incomplete. Resolve touchdown,
   first compression, stop/unload, roll-off, release and replant from accepted
   saved states. A full-step Cayley path cannot certify a newly solved prefix.
   Preserve simultaneous events and unresolved snapshots; do not waive rejects
   or substitute zero-velocity projections. Compare event timing and retained
   energy with the exact slide-stop-rebound reference.
2. **Bounded executed spatial control.** Extend series-rest actuation and its
   effort/work accounting to the finite spatial legs. Add desired foot placement
   and achievable swing/planting, then postural control. The foot state must be
   what the solve achieved, rather than the intended step. A step command cannot
   prescribe both support position and independent force.
3. **Grip/foot/support in the connected solve.** A low grip opposes an actual
   foot attachment with the existing grip budget. A failed hold slips; a
   sustainable hold changes achievable support and balance. No separate leg
   lock multiplier or geometric recovery-speed reduction. Preserve attachment
   continuity while bodies rotate, slide and fall.
4. **Body-ground and one World response.** Add torso-ground contact and physical
   fall/get-up capability before replacing production response coherently.
   Preserve total mass and include all connected contact loads. Do not mix
   solved normal loads with scheduled bodyweight traction or move a player
   again in another subsystem after the shared solve.
5. **Local convergence and universal transfer.** Revisit the first divergent
   QB/grip and hand-fight intervals with achieved support in place. Introduce
   persistent/warm-started constraints or localized temporal solves only where
   the reproduced failure demands them. The same mass, traction, actuator and
   balance capabilities must explain anchoring, double teams, shedding, press,
   absorbed contact and approach tackles without scenario strength bonuses.
6. **Football controllers and measured validation.** Then use physically feasible
   approach rollouts, braking, gaze/decision rules and technique. Compare NFL
   distributions by role and situation and across randomized roster cohorts,
   with small full-game regression guards. Statistical closeness does not
   excuse a mechanically incorrect interaction; different generated rosters
   need not share an exact NFL aggregate mean.

We can feel good about the foundation when these mechanics transfer across
contact situations, remain consistent under local timestep refinement and
symmetry, handle support loss and recovery without artificial state resets,
and fit within an affordable World solve. There is no defensible percentage
of remaining gains yet. This work clears another controlled research gate;
it does not clear the physics-ready gate. PR #1 remains untouched.
