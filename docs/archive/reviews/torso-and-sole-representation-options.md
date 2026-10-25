# A small torso and sole model with closed mechanical accounts

Independent architecture review, 2026-10-10. This is a continuation of the
existing material-foot and compliant-leg work, not another World backend or a
readiness certificate. No production code is changed by this review.

The reusable research substrate is now implemented in
`src/physics/material-rigid.ts`. Its eleven primitive tests pass. It provides
candidate midpoint poses and material attachment velocities for a future
coupled solver, plus instantaneous impact candidates and point mobility. The
standalone fixed-point-load diagnostic does **not** constitute a ground,
spring, gait or World solve.

## Recommendation

Use **one rigid torso and two rigid feet**, with explicit mass, actual material
attachment geometry, and initially **isotropic** rotational inertia. Give each
foot three noncollinear sole contact points. Advance attitude with a **Cayley
midpoint update**, coupled to the same midpoint impulse solve as translation,
the compliant legs, ground normals, tangential friction, and grips.

This is smaller than replacing every body by a rigid tetrahedron, and it
resolves a specific mathematical problem in an offset-hip extension: the
velocity of the moving hip must agree with both the force's work and its
angular impulse. The Cayley update supplies that identity exactly for an
isotropic rotor. An exponential attitude update using the same mean angular
velocity does not.

An isotropic inertia is an explicit reduction, not an anthropometric claim.
It represents a rigid body whose rotational response is direction independent.
It cannot justify measured differences between pitch, roll and yaw inertia.
Use a declared inertia prior and sensitivity sweep. Do not insert separate
unrecorded rotational strengths to compensate for that limitation.

The immediate increment should prove offset-hip elastic work and torque in
free flight, then actual finite-sole support. A World adapter follows only
after the same solver handles normal-dependent traction, held lift, touchdown,
and support transfer. The current one-dimensional vertical model remains an
oracle for a restriction of this model; its solved normals must not be passed
to a later, independent horizontal solve.

## Why the obvious exponential update fails

Suppose the torso rotates by angle theta about a fixed axis. A material offset
has actual chord displacement proportional to `2*sin(theta/2)`, while its
arithmetic midpoint lever has magnitude proportional to `cos(theta/2)`.
If attitude is updated with `theta = h*|omega_mean|`, then generally

```
(r1 - r0)/h != omega_mean cross ((r0 + r1)/2).
```

Using the actual chord to close spring work, but the ordinary midpoint lever
to update angular momentum, therefore produces two different attachment
Jacobians. Using an energy-corrected lever only for torque changes the actual
external moment. Either choice can make one ledger look right while violating
the other. It is not enough to check linear momentum and stored energy.

This defect is an integrator mismatch, not a reason to introduce a hidden
restoring moment or to abandon finite hip geometry.

## Cayley attitude and its exact attachment identity

For one rigid body, let `x,v` be its material center position and velocity,
`L` its world angular momentum, `I > 0` its scalar isotropic inertia, and `R`
its orientation. For interval length `h`, define

```
vbar = (v0 + v1)/2
omegabar = (L0 + L1)/(2*I)
Omega = cross_matrix(omegabar)
x1 = x0 + h*vbar
Q = (Id + h*Omega/2) * inverse(Id - h*Omega/2)
R1 = Q*R0
```

The equivalent increment quaternion is proportional to
`(1, h*omegabar/2)`, normalized before left multiplication. Its rotation angle
is `2*atan(h*|omegabar|/2)`, rather than `h*|omegabar|`. This is a second-order
physical integration rule; the difference must not be hidden in a nominal
heading controller.

For fixed external point impulses, the standalone angular fixed-point map has
the sufficient Lipschitz bound

```
B = h*sum(|local_offset|*|point_impulse|)/(4*I).
```

The derivative of `rbar` with respect to end angular momentum is bounded by
`h*|local_offset|/(4*I)`. The implemented diagnostic only certifies that
standalone local branch when `B < 1`; otherwise it returns the unchanged
state and requests local interval subdivision. This is a conservative
**numerical certification rule**, not a force/strength ceiling. Some cases
with larger `B` could still have a unique root. Once force impulses depend on
coupled leg/contact state, this standalone bound is not a proof of uniqueness
for the larger coupled solve.

The bound also says nothing about time accuracy of fast initial free spin.
With no point impulse it is zero even if `h*|omegabar|` is very large, while
Cayley rotation can underrotate strongly compared with the continuous free
rotation. Energy/angular closure then still holds. A spatial/World driver
must check local angular/chord accuracy and locate the first actual material
sole hit, including possible interior crossings. Refinement is local to the
affected interval; it is not a new physical spin ceiling or a global fixed
resolution increase. The free-rotation primitive test checks second-order
trajectory convergence separately from its exact mechanical ledgers.

For any fixed local material offset `a`, define

```
r0 = R0*a
r1 = R1*a
rbar = (r0 + r1)/2
p0 = x0 + r0
p1 = x1 + r1
```

Since `Q - Id = h*Omega*(Q + Id)/2`, the actual attachment displacement obeys

```
(p1 - p0)/h = vbar + omegabar cross rbar.
```

Use `rbar` in the contact/grip/spring Jacobian and in the applied torque.
It is the arithmetic mean of the **endpoint material offsets**, not a point
obtained by rotating `a` with a slerped midpoint quaternion.

With a linear impulse `J` applied at that attachment and an explicit couple
`T`, update

```
m*(v1 - v0) = J
L1 - L0 = rbar cross J + T
K = 0.5*m*|v|^2 + |L|^2/(2*I)
Delta K = J dot vbar + (rbar cross J + T) dot omegabar
        = J dot ((p1 - p0)/h) + T dot omegabar.
```

For angular momentum about a fixed origin,

```
H = x cross (m*v) + L
Delta H = xbar cross J + rbar cross J + T
        = pbar cross J + T.
```

The translational cross term vanishes because `x1-x0 = h*vbar`.
Thus actual point displacement, represented kinetic-energy change, and actual
midpoint external moment use one consistent attachment rule. Orientation is
an unknown of the coupled solve through `L1`; do not compute `rbar` once from
the old pose and freeze it while impulses change angular velocity.

This proof uses scalar isotropic `I`. Replacing it with a diagonal matrix in
world coordinates while rotating the body does not extend the proof to an
anisotropic rigid body. Such an extension needs its own consistent
body/world momentum transformation and energy-momentum integrator.

## Offset hips and the existing axial leg potential

Attach each leg to an actual lower torso offset and an actual foot ankle
offset. For endpoint states define

```
phip = xtorso + Rtorso*ahip
pankle = xfoot + Rfoot*aankle
d0 = pankle0 - phip0
d1 = pankle1 - phip1
ell0 = |d0|; ell1 = |d1|
nDG = (d0 + d1)/(ell0 + ell1)
Fspring = axialLegDiscreteForce(ell0, ell1, config) * nDG
J = h*Fspring
```

The existing saturated axial potential remains the single elastic law. Apply
`J` to the foot at the ankle and `-J` to the torso at the hip, with their actual
midpoint lever torques. Then

```
nDG dot (d1 - d0) = ell1 - ell0
Wspring = J dot ((d1 - d0)/h) = -Delta Uleg
Delta H_internal = ((d0+d1)/2) cross J = 0.
```

The spring therefore transfers force and creates a real torso/foot response
without an invented balance torque. Because it attaches below torso COM, it
can change torso pitch/roll through physical leverage; a center attachment
could not provide that moment.

For a passive axial dashpot, use the achieved rate `(ell1-ell0)/h` and the same
`nDG`. Its work is its scalar damping force times the achieved length change,
which must be nonpositive. Keep the leg present in stance and swing; neither
phase transitions nor touchdown may reset its stored energy.

Changing rest length/stiffness is still active configuration work. It must be
reported and authorized against the same positive-work capacity as stepping
and posture. A spring cannot be lengthened under load for free.

The discrete gradient does not prove that a coarse chord is physically valid.
Body/foot overlap, through-origin leg chords, extreme orientation changes,
contact separation and first touchdown require local event handling or
rejection. Small residuals alone do not validate a trajectory.

## A finite sole without a free ground couple

Keep each foot's COM, orientation, finite mass, and rotational inertia. Three
noncollinear fixed local sole points are the smallest patch with area. They
may represent a broad forefoot pair and a heel contact. Record their geometry
as an explicit foot-shape prior. Four corners are a straightforward later
rectangular refinement, but are not necessary to prove the mechanical rule.
The ankle may sit above the sole plane because it is a different material
offset of the same rigid foot.

For every sole point `c`, use its actual geometry and the same Cayley
attachment velocity:

```
pc = xfoot + Rfoot*ac
vc_discrete = vfoot_bar + omegafoot_bar cross rc_bar
pc.z >= 0
Nc >= 0
normal contact/separation complementarity
|Jc_tangent| <= mu*Nc
Jc = (Jc_tangent.x, Jc_tangent.y, Nc)
```

The foot receives `sum(Jc)` and `sum(rc_bar cross Jc)`. There is **no separate
ground torque**. A center of pressure is a diagnostic obtained from achieved
normal impulses and actual contact positions; it is not an independently
movable radius or a support target granted by the controller.

The patch moment is consequently limited by actual geometry and normal load.
If load concentrates at the heel or an outside edge, that is where it acts.
If all normal impulses vanish, the foot has no traction or ground moment.
Tilting can lift one or two sole points and shrink the achieved support set.
This also permits toe/heel roll without pretending every contact remains
flat. Frictional yaw torque comes from finite tangential forces at actual
points, with the same normal-dependent friction limits.

Ground normals and tangential maximum dissipation are separate physical
conditions. Do not replace them by an associated full-cone energy minimum,
which can buy tangential friction with an artificial normal impulse. Contact
sets, friction directions and nonlinear leg/rotor response must converge in
one local solve. Warm start persistent contact identities and validate the
complete conditions after solving.

An airborne foot reaches its first actual sole-clearance root. Its impact uses
the instantaneous rigid attachment Jacobian and finite translational/rotor
inertia. Finite leg springs supply no instantaneous impact impulse. A plastic
impact may lose energy; report that loss. Friction and normal impulses share
the same impact solve and actual normal budget. Persisting support uses the
finite-interval Cayley midpoint rule above. Do not snap a penetrated foot to
the floor or zero its rotor after landing.

## Bounded joint control, rather than a posture edit

A sole gives the ground somewhere to apply a moment; it does not give the
torso an unlimited ankle motor. Represent explicit bounded hip/ankle control
through the massless effective leg's internal wrench.

Let `A` be an active impulse on the foot ankle, with `-A` at the torso hip.
Let `Th` be an explicit actuator couple on the torso and `Ta` one on the foot.
Internal angular momentum requires

```
dbar cross A + Th + Ta = 0
dbar = (d0 + d1)/2.
```

For transverse commanded couples, let `S = Th + Ta`, with `S dot dbar = 0`.
Then a coherent force mapping is

```
A_transverse = (dbar cross S)/|dbar|^2.
```

A twist actuator can apply equal and opposite axial couples directly to the
two bodies. The transverse mapping must also be force limited near short leg
length; torque capacity alone cannot authorize a `1/length` singularity.
Passive axial support and active joint control are distinct capabilities,
applied identically in every football interaction.

The actual actuator work is

```
Wjoint = A dot ((pankle1-pankle0 - phip1+phip0)/h)
         + Th dot omegatorso_bar + Ta dot omegafoot_bar.
```

This formula counts the torso and foot response. Sum positive work per actual
actuator/configuration change against one declared locomotor power budget;
negative work elsewhere must not finance extra positive work. Controllers
may ask for upright posture, foot clearance or a new plant, but only these
finite delivered wrenches can achieve them. Avoid a second direct heading,
lean, ankle-lock or fall correction beside the physical update.

## Why not start with rigid material tetrahedra?

A torso represented by three noncollinear masses plus three fixed distances
has six rigid degrees of freedom, but its inertia is that of a planar triangle:
one principal moment equals the sum of the other two. Four noncoplanar masses
and six fixed distances can represent a fuller three-dimensional distribution
and actual lower hip nodes. A foot triangle adds three masses and three more
constraints; an actual ankle above the sole plane requires another point or
a derived rigid material offset. This is a sound architecture if full
anisotropic inertia is essential immediately.

Central midpoint distance-constraint impulses have attractive local
identities:

```
Jab parallel (dab0 + dab1)
Delta H_internal = 0
Wconstraint = lambda*(|dab1|^2-|dab0|^2)/2 = 0
```

However, endpoint distance closure plus zero constraint work is not itself a
complete rigid-body integrator. For a general multi-edge graph, endpoint
velocities need not remain tangent to the rigid configuration manifold.
Silently projecting those velocities can remove kinetic energy; retaining
the incompatible velocities creates hidden deformation on the next step.
A claimed rigid energy/angular scheme must prove endpoint velocity
compatibility, impact response and persistent contact as well as distance
closure. A single isolated rotating rod is too weak a test of that issue.

Finite passive central struts avoid hidden rigid projection work, but then
the torso/sole is genuinely compliant and has additional internal modes,
stiffness/capacity priors, and frequency-dependent response. That can be a
useful later soft-body reduction; it is more mechanical state and numerical
work than the present need for a finite hip and sole. It should not be
introduced merely to evade writing the rotational attachment Jacobian.

The isotropic Cayley body is consequently the better first unified increment:
three rigid bodies instead of at least ten material masses and a rigid
constraint graph, exact stated mechanical identities, and straightforward
actual attachment/contact points. Its anisotropic limitation is explicit.

## Consolidation and World seams

Use one canonical material state for torso and both feet. A player's total
COM remains derivable as `(mt*xt + m0*x0 + m1*x1)/(mt+m0+m1)` for football
controllers. Do not independently advance that COM and material centers.
Collision capsules, hand contacts and grips use the actual torso/foot point
Jacobians, including their rotor response. A blended torso/foot grip must use
matching position and impulse weights, not a different contact inverse mass.

The current vertical oracle is recovered when horizontal motion is frozen,
hip/ankle offsets are centered, attitude is fixed, and feet have a single
center contact. It remains a regression oracle until that restriction is
implemented through the shared kernel. The old planar research cases then
become projections or explicit ablations of that same material formulation.

Production integration replaces `World.feet()` and the legacy reduced
support contributions for an entire connected contact island. Ground,
grips, hands and torso collisions cannot first move the old COM and then
feed impulses to a second foot solve. Keep persistent foot/contact/grip IDs.
Record actual normal load, sole contact set, slip, leg energy, delivered joint
work, torso/foot height and orientation. Down/get-up logic eventually follows
physical torso geometry and bounded work, rather than a scalar balance debt.

There are only three rigid bodies per player and at most six sole normal
contacts in the minimal model. Nevertheless, enumerating every stick/slip
combination across a full football contact island is too expensive. Prefer
persistent active sets, local projected normal/disk updates or a small
semismooth solve, with complete residual checks and local event splitting.
The existing shared-compliant/contact diagnostics should measure solver cost
and first divergence. Raising resolution everywhere is not the substitute.

## First proof sequence and remaining limits

1. Cayley material-point identity under finite rotations, quaternion sign
   changes, translation, reflection and arbitrary local offsets.
2. One free offset-hip leg: fixed elastic configuration, damping, bounded
   active wrench and external point load. Close energy, linear momentum and
   angular momentum about a fixed origin; compare subdivisions.
3. Recover the current vertical stand/held-lift/landing oracle as a restricted
   case of the same solver. Preserve actual touchdown/separation timing and
   spring energy without a scheduled normal share.
4. One finite sole: static supported tilt, toe/heel/outside-edge unloading,
   limited ankle torque, frictional slip and impact. Prove achievable moment
   follows normals and geometry, with no independent ground couple.
5. Two-foot support transfer and a failed held corrective step. Ground force,
   joint work and actual contact determine achieved recovery; a fall claim
   also needs torso-ground collision geometry.
6. Shared World island integration, then anchor, double team, shedding,
   absorbed hit, press and open-field tackle checks with one set of physical
   priors. Revisit the reproduced long QB-wrap/hand-fight first divergences.

Exact ledgers do not make the physics ready. Coarse/fine trajectories, contact
transitions, successful ordinary tackles and recoveries, controller behavior,
and size/speed/geometry variations must also transfer. Isotropic inertia,
effective leg compliance, sole geometry and joint capacities remain declared
engineering priors until data constrain them. Ordinary football bodies are
neither perfect spheres nor literal passive springs. The model earns its
reduction by showing that one bounded capability set behaves plausibly across
the same diverse interactions, not by making aggregate game scores match.
