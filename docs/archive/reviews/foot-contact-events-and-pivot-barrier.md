# Foot contact: hidden geometry and the next integrator barrier

**Physics is not ready.** The spatial support modules are still research code;
production `World` and football replays are unchanged. The current source pin
is `ca530a6af81f9a2e390068b9bc45806ca6f94410abf62724ddadcaceeff21e0b`.
Read this before the preceding
[spatial feet review](spatial-feet-and-ground-readiness.md), whose measurements
retain their own earlier source pin.

## What improved

`material-plane.ts` encloses the plane crossings of a declared material point
path. The path is the existing rigid interval's center translation and Cayley
rotation, using the full candidate's mean momenta. Its signed plane gap is a
cubic numerator divided by a positive quadratic. Outward-rounded interval
arithmetic and Bernstein subdivision retain possible roots, including a
crossing and return hidden between positive endpoints. Positive or negative
endpoint checks alone miss those cases.

The API explicitly distinguishes root enclosures, coincidence, penetration
past a stated distance tolerance, numerical uncertainty and exhausted budgets.
Repeated/grazing roots remain ambiguous. A zero-derivative triple root can
cross the plane; it must not automatically be classified as grazing. Returned
bracket widths are checked after merging, so a poorly conditioned broad root
cannot claim to meet a requested fine time resolution.

The established-ground solver now uses those enclosures to reject interior
penetration along its candidate path. It checks active sole points automatically
and accepts optional complete `soleGeometry` for airborne/inactive points.
Geometry points acquire no contact force. A regression reproduces a rotating
swing toe that starts and ends above the ground but crosses below it in between;
with its geometry supplied, the entire interval rejects without moving the
accepted state, adding a contact impulse or snapping the foot's pose.

This is geometric evidence for one numerical candidate. It is **not** a
certificate of continuous physical motion, a re-solved prefix, support force
history, or accepted touchdown. Resizing the interval changes the implicit
candidate; its path must be rebuilt and the full connected mechanics re-solved.
The ground report still says `interiorEventCertification: 'not-provided'`.
Clearance is checked only for supplied points, not an unmodeled sole/body shape.

## The persistent problem this review found

Simply enabling a one-point toe or heel contact in the existing ground solve
is unsafe. The current step chooses one integrated normal impulse to close an
endpoint position gap. Its conjugate work uses the material point's midpoint
displacement velocity. That does not also ensure zero **instantaneous endpoint
normal velocity** on a rotating foot.

The [reproducible pivot diagnostic](../../../data/reviews/physics-world/contact-events/pivot-barrier.json)
uses unit mass/inertia, gravity -10 yd/s², a .2 s interval, local point
(.3, 0, -1), initial angular velocity (0, 2, 0) and center vertical speed .6.
Initial contact normal velocity is zero. The computed compressive normal
impulse is 1.1965816947 kg yd/s. Endpoint gap and work/momentum residuals are
approximately roundoff, yet the endpoint point moves into the plane at
**-0.0242 yd/s**. The next sustained-contact interval correctly rejects that
state. The same issue declines under subdivision but is not repaired by it.

Three noncollinear flat points hide the pitching mode. This is why the current
three-point restriction remains. It is also why closing an energy ledger is
insufficient for calling foot physics ready. A toe pivot and rocking edge must
maintain both actual support geometry and compatible material velocity.

## Best next engineering step

Build a **constraint-consistent rotating contact interval** before implementing
a generic walking/running lifecycle. The old step has one time-integrated
force unknown for its position condition. Sustained contact needs enough
temporal force information to satisfy configuration and endpoint velocity
together, with all forces applied at actual rotated attachments.

There are two credible routes. The smaller next experiment is a **finite,
unilateral shoe/turf compliance law**, with stored ground-contact energy. Real
shoe/turf deformation permits compatible normal motion instead of insisting
that every loaded toe has exactly zero endpoint normal speed. Apply the same
material-point force, work and torque accounting already used for leg and
body contact. Include its potential explicitly; positive unloading work must
come from previously stored surface energy. Use area weights so adding or
duplicating sole points cannot multiply stiffness or traction. Initially use
compression-only passive damping to avoid a tensile dashpot or an unexplained
stored-energy reset. Available NFL/AddBiomechanics data do **not** calibrate
turf stiffness, indentation, damping or cleat geometry: sensitivity ranges are
provisional, and compliance must not be added merely to hide convergence.

Keep the rigid limit as an independent comparison. A local two-stage
constrained collocation solve, or equivalently a contact force profile with
independent impulse/time-moment information, remains the alternative if a
plausible compliant interface cannot pass support and local timestep tests.
Keep torso, both feet, gravity, passive leg forces and sole reactions together.
Derive the stage equations and constraint count; two extra multipliers alone
do not prove physical or numerical consistency. Validate normal sign, friction
disks, force/work quadrature and spring energy independently. A chosen force
profile needs a sign certificate over the entire interval, not only samples.

An alternative is a fully derived constrained variational/discrete-gradient
rigid-body method. It may be appropriate if the collocation prototype fails
the same tests. A post-step position or velocity projection is not an adequate
replacement: it changes momentum, torque and energy after the shared solve.
Any RATTLE-like construction must derive its multipliers, actual attachment
Jacobians, unilateral reactions and work as part of the same method. Neither
name nor a closed final ledger establishes that derivation.

Start with the reproduced single-point pitching foot, then a two-point rocking
edge, then one and two full patches. For rigid support, require actual endpoint
position and velocity compatibility. For compliant support, require bounded
indentation, physically achieved motion, unilateral forces, and surface-energy
accounting, then convergence toward the rigid reference as the compliant limit
is tightened at adequate local accuracy. Both need passive damping/friction,
total momentum and correct normal-force history. Repeat under local timestep
and coordinate changes. Preserve the full input on failure. Do not introduce
a strength bonus or globally increase resolution to hide the pivot problem.

After that local gate:

1. Locate earliest touchdown and release by re-solving prefixes, compose
   pose-preserving impacts with continuous support, and retain persistent point
   identities. A finite compliant leg supplies no instantaneous Dirac impulse;
   simultaneous points on one rigid foot share its impact solve. Future rigid
   inter-player constraints must join the same connected impact island.
2. Add spatial bounded series actuation, swing and posture control to that same
   solve, with shared force/power/work limits and physically executed recovery.
3. Add torso-ground collision before permitting complete falls or recovery.
4. Replace the full connected World response using the
   [adapter seam design](spatial-world-adapter-seams.md), then test native
   hand-fall convergence and transfer across the universal football interactions.
5. Compare matched NFL movement/contact strata and small game guards. Keep
   roster and technique variation separate from physical capability calibration.

## Evidence and its limits

The [pinned commands and reports](../../../data/reviews/physics-world/contact-events/README.md)
include four exact root fixtures and 800 transformed candidate paths. An
independent Rodrigues construction checked 160,800 samples and 280 sampled
sign crossings; every tested crossing was retained, with no ordinary numerical
budget rejection. Maximum reconstruction/covariance error is below 2.1e-14 yd.
Sampling is an independent stress check, not a proof of every root: the
outward enclosures and exact analytic fixtures address the hidden/repeated cases.

The [independent constrained pivot reference](../../../data/reviews/physics-world/contact-events/pivot-reference.json)
integrates the actual one-point frictionless equations on their analytic
constraint manifold at nine resolutions. It is a reference coordinate system,
not a projection of a production state. Fourth-order endpoint convergence and
separate force/moment quadrature agree to about `1e-14` at the finest interval.
An energy-orbit certificate establishes a strictly positive normal, without
an endpoint-only liftoff assertion. The reference normal impulse is
1.2258922905 kg yd/s and its actual endpoint material normal velocity is zero;
the old endpoint-gap map instead gives 1.1965816947 and -0.0242 yd/s. This is a
concrete mechanical target for choosing the next contact method.

All **433 TypeScript tests and 22 Python tests pass**, with clean typecheck and
build on Node 22.23.3. The ordinary established-ground, free-flight and
sole-impact panels were rerun against the current source and retain zero
ordinary rejection or independent violation. No game cohort was run because
`World` is unchanged.

The pivot remains an intentionally **unresolved barrier**, not a passing gait
example. The current production hand-fight fall failures are unchanged. No
claim of NFL calibration, stronger footing in replay, complete gait or 95% of
physics gains follows from this increment.
