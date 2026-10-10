# Small spatial continuation of the same material leg model

Read-only derivation, 2026-10-10. This is a proposed research continuation,
not implemented World physics or a balance-readiness claim.

## Shared scalar law review

The live `leg-compliance.ts` law has the correct saturated potential and
finite elastic force. `axialLegDiscreteForce()` directly integrates the force
over the *actual length interval*, so it works across slack and saturation
without the clipped-compression denominator error. The dashpot has its own
explicit force ceiling, remains present in flight, and opposes the supplied
actual axial rate. Configuration work is the change in stored potential at
fixed geometry; it still requires actuator authorization/capacity in a driver.

The scalar law should be shared by 1D and spatial physics. Do not fit a
different radial spring to an anchor, tackle or stride.

## State and central discrete-gradient force

Use the same material torso and two foot masses, now with positions/velocities
in 3D. Center hip attachment is the first reduction; real hip offsets and
finite soles come later. Keep an isotropic torso rotor `I`, world angular
velocity `omega`, and orientation. The orientation does not change the
center-attached spring law.

For each leg, let `d0 = foot0 - torso0`, `d1 = foot1 - torso1`,
`ell0 = |d0|`, `ell1 = |d1|`, and `wbar = (d1 - d0)/h`.
Define

```
nDG = (d0 + d1)/(ell0 + ell1)
fDG = axialLegDiscreteForce(ell0, ell1, config)
Fspring_foot = fDG*nDG
Fspring_torso = -Fspring_foot
```

The exact identities are

```
nDG dot (d1 - d0) = ell1 - ell0
Wspring = h*Fspring dot wbar = -Delta Uleg
|nDG| <= 1, so |Fspring| <= elastic_force_cap
```

The force is central at the actual material midpoint separation
`dbar = (d0 + d1)/2`, so its pair orbital angular impulse is zero. A
normalized midpoint direction instead of `nDG` does not have the exact
length/work identity and must not be substituted silently.

For damping use the achieved axial rate

```
lengthRate = (ell1 - ell0)/h = nDG dot wbar
fDamp = axialLegDamping(lengthRate, config)
Fdamp = fDamp*nDG
Wdamp = h*fDamp*lengthRate <= 0
```

This remains central and force bounded. It is a passive radial dashpot, not
free damping of the full relative foot velocity.

The discrete gradient alone does not prevent a coarse chord passing through
the torso. Opposite `d0,d1` of equal length give `nDG = 0` and identical
endpoint potential, although the intervening path crosses a compression
barrier. Detect actual body/foot overlap or ambiguous through-origin/chord
crossing and locally split/reject it. A zero work residual does not validate
that path. Later finite torso geometry supplies a real nonpenetration limit.

## One mechanical interval solve

Let `P_i = h*(Fspring_i + Fdamp_i + Fmotor_i)` be the leg impulse on foot i,
`G_i = (Jt_i.x, Jt_i.y, Ni)` its ground impulse, and `E` other physical
contact/grip/external impulses. With downward gravity vector `gvec`,

```
mt*(vt1-vt0) = mt*gvec*h - sum(P_i) + E_torso
mi*(vi1-vi0) = mi*gvec*h + P_i + G_i + E_foot_i
x1-x0 = h*(v0+v1)/2                         [every material point]
```

The springs depend on the unknown final geometry; normals and friction also
depend on the same final motion. Solve these equations together. An impulse
computed from a completed vertical solve and later borrowed by the planar
kernel is a sequential approximation, not this coupled model.

For a center-attached active leg impulse `A_i = h*Fmotor_i`, represent its
reaction couple with the actual material midpoint:

```
tau_i = -dbar_i cross A_i
I*(omega1-omega0) = sum(tau_i) + external_angular_impulse
Wmotor_i = A_i dot (vi_mean-vt_mean) + tau_i dot omega_mean
```

For isotropic I, the rotor energy change is exactly total angular impulse
dot mean omega. The active forces' orbital angular change cancels their
rotor reaction. The central spring/damper requires no artificial rotor
reaction. A hip offset later changes actual attachment velocity, torque and
length gradients; copying the center equations would be incorrect.

Total energy includes kinetic energy of all three material masses, real rotor
kinetic energy, `g*sum(m*z)`, and both stored leg potentials. The acceptance
ledger is

```
Delta(K + Ug + Ulegs) = motor_work + external_work
                       + damping_work + ground_work + impact_work
```

Ground and impact work are nonpositive; springs are already in stored energy.
Total linear momentum changes only by gravity and external/ground impulses.
Orbital plus rotor angular momentum changes by the corresponding actual
midpoint external moments, including gravity about the fixed origin.

## Ground active sets and events

Use actual clearance and persistent material foot identity. There are only
two feet, so enumerating normal contact/separation and tangent stick/slip
sets is practical before using a more general solver. On each candidate,
solve nonlinear leg response, normal reaction and tangential response to
convergence; then check the complete contact conditions and work.

For an initially resting contact:

```
Ni >= 0
normal velocity = 0 if Ni > 0; >= 0 if Ni = 0
|Jt_i| <= mu*Ni
```

Static tangential response keeps the actual foot at zero endpoint velocity.
Kinetic friction opposes actual travel with `|Jt| = mu*Ni`; solve its direction
with the coupled response and split at physical stops/direction changes.
An average normal alone does not prove continuous contact: if instantaneous
required support reaction reaches zero, split at that separation event rather
than hold the foot with an average-positive impulse beyond it.

Airborne feet advance to the first coupled ground-clearance root. Apply a
plastic contact impulse at that event, with finite springs contributing no
instantaneous impulse, then continue. Normal impact and its tangential
friction share the same contact event and absolute normal impulse. Do not
snap penetrated foot height or grant support because a stroke timer expired.

Do **not** simply minimize kinetic energy over a full friction cone and call
that Signorini plus Coulomb contact. An associated cone solve can add normal
reaction to buy more tangential friction, producing artificial separation or
dilatancy. The physical normal complementarity and tangent maximum-dissipation
condition at the solved normal are separate conditions. Local projected
normal/disk iteration or active-set/Newton solve must validate both, not merely
the cone bound and total negative work.

With material points, uncoupled ground self-response is `1/mi` per component
(`0.5/mi` for midpoint response). Leg relative self-response is
`1/mi + 1/mt`; other legs couple through the torso. For a blended center/foot
attachment `p=(1-s)*xt+s*xf`, its impulse and point-velocity Jacobians are
the same weights `(1-s),s`. These are useful primitive checks; the nonlinear
coupled leg/ground solve cannot pretend its final effective response is just
the isolated foot diagonal.

## Scope, capabilities and next validation

Passive elastic and damping ceilings are explicit physical priors. Active
stance, swing, correction and retraction share one active vector/torque budget
and actual positive-work budget. A three-dimensional grip shares one vector
tension cap, not separate vertical and horizontal budgets. During flight all
normal impulses vanish, so internal leg forces cannot accelerate total COM
horizontally.

This centered torso/point-foot spatial kernel can test real normal-dependent
traction, vertical lift opposed by a holder, touchdown friction, radial
compression under horizontal push and a swing that actually clears turf.
It still cannot establish realistic tilt support: center-attached axial
springs have no restoring torso pitch/roll moment, two point feet have no
finite sole region, and real hip/ankle geometry is absent. Keep those limits
explicit rather than adding a free CoP radius or legacy capture-point force.

Useful first comparisons: 1D static stand reproduced by the spatial model;
free-flight COM acceleration equals gravity only; one planted foot with
graded normals has correspondingly graded horizontal traction; finite held
foot lift has progressive force/work-limited response; touchdown loses energy
without reflecting endpoint foot velocity; oblique spring/ground contact
closes both angular momentum and stored-energy work under subdivision and
mirroring. These are mechanics checks, not NFL outcome targets or readiness.
