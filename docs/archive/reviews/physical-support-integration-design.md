# Production integration: achieved support without phantom balance

Independent read-only design review, 2026-10-10. Current source is an unused
planar research kernel and driver. The recommendations below are prerequisites
and incremental work, not a readiness certification.

## Recommendation

Finish the planar mechanical contracts before changing production. The next
physical increment should derive vertical/contact support as described below.
A gated World island adapter can also test horizontal anchoring and transmitted
forces, but remains a hybrid diagnostic until physical support exists. Do not
make planar foot-placement state authoritative for falls.

For authoritative support and falling, the next coherent foundation is a
small **vertical and tilt extension**, rather than an increasingly complicated
nominal-gait error reference. It needs a torso, two inertial foot points,
gravity, unilateral ground normals, and torso pitch/roll. It does not require
an articulated skeleton. The actual ground reactions and body motion can then
explain loss of support. A physical reference twin remains useful for
diagnostics and controller testing, but is not a substitute for those missing
states.

## Why planar feet do not yet establish balance

The current planar kernel has valuable physical structure: total COM, actual
torso and foot material velocities, finite force and reach, persistent grip
identities, passive ground/grip work, and the reaction rotor for noncentral leg
actuation. These can establish whether a planted leg transmits a horizontal
force or slips, without resetting the anchor.

Its ground capacity still comes from prescribed normal shares whose sum is
body weight. It has no vertical foot motion, achieved clearance, torso height
collapse, pitch/roll kinetic energy, or gravitational potential energy. A held
foot can therefore fail an intended horizontal stroke, but the model cannot
prove that the foot cannot lift or that the body must tip. Its yaw rotor closes
planar internal torque; it is not a pitching body.

Legacy `Support.xi` is deviation from *controlled gait*, not the raw stopping
capture point. Replacing it with `X + V/sqrt(g/h) - actual_support` makes an
ordinary sprint appear unbalanced by several yards. Adding planned COM
acceleration to a reference grants forces that may never have been delivered.
Following all actual acceleration lets the reference absorb impacts. A filtered
external-load reference has another defect: after an impulse, its decaying
force estimate can erase the stored velocity error even though no loaded
corrective step or restoring ground impulse occurred.

Do not solve these defects by damping a balance debt toward zero. In a
diagnostic nominal comparison, keep a committed gait plan independent of
whether the real foot reaches it, record real misses and slips, and explicitly
label the reference error nonphysical. Planned targets or unloaded swinging
feet must not count as achieved support.

## Minimal physical state and equations

Retain total body mass `M` and explicit foot masses `m_i`; torso mass is
`m_t = M - sum(m_i)`. Promote material COM/torso/foot positions and velocities
to three components. Retain actual torso orientation and angular velocity;
adding pitch/roll to the existing yaw rotor is enough initially.

With total COM `X`, relative feet `r_i`, COM velocity `V`, and relative foot
velocities `u_i`, the present exact mass transformation extends per axis:

```
x_i = X + r_i
x_t = X - sum(m_i r_i)/m_t
v_i = V + u_i
v_t = V - sum(m_i u_i)/m_t
K_translation = 0.5 M |V|^2 + 0.5 sum(m_i |u_i|^2)
                + 0.5 |sum(m_i u_i)|^2/m_t
L_inverse[i,j] = delta[i,j]/m_i - 1/M
```

Use real rotor kinetic energy and gravity potential:

```
E = K_translation + 0.5 omega dot I omega + M g X.z
```

The gravity term includes the feet automatically because `X` is total COM.
Do not put gravity only on the torso while retaining total-COM potential.

A physical leg force `F_i` acts on foot `i`, with `-F_i` on the torso. For
the current center-attachment reduction, supply its reaction couple:

```
tau_motor = -sum((x_i - x_t) cross F_i)
W_motor_i = impulse_i dot mean(v_i - v_t)
            + reaction_angular_impulse_i dot mean(omega)
```

This is actuator work, including the body response to a noncentral force.
If the model later places the hip or contact at a finite torso offset, its
actual material Jacobian and rotor contribution must replace the center
formula; a frozen geometric point with a different velocity Jacobian is not
adequate. Gravity, leg motors, ground, reach and grips belong in the same
local physical interval solve.

Ground contact is determined by *actual* foot clearance and velocity:

```
foot.z >= 0, normal_impulse >= 0
normal_impulse * separation = 0          [unilateral contact]
|tangential_impulse| <= mu * normal_impulse
```

An initially resting foot has a static tangential row. A slipping foot gets
finite kinetic friction opposite actual slip; split locally at stop/contact
events. Swing phase is controller intent, not permission to disable a ground
row. A step becomes unloaded because its achieved normal falls to zero, and
becomes support again because it actually touches ground and takes load.
Ground work must be nonpositive; ground may supply momentum but not energy.
The normals, friction limits, holder load, passive reach and motor response
must be solved together. Prescribing `load = 1` on the other foot would
otherwise hide the very loss of support being modeled.

A useful energy acceptance condition is:

```
Delta(K + U) = motor_work + external_contact_work
               + ground_work + grip_work + passive_reach_work
```

Do not additionally apply legacy reduced gravity growth, contact-height
`tipAccel`, lock-induced travel, scalar recovery, or a fall drive to this
physical state. They would count the same loss of support twice or add
unexplained work. Pitch/roll and body-ground collision must carry the fall.

## Force and power prerequisites

The existing `supportParams.pushForce` is a *horizontal, traction-capped*
drive capacity. It cannot simply become the norm bound on a 3D leg force:
supporting `Mg` would consume most or all of it before any horizontal drive.
Likewise, fixed `traction = mu Mg` must become a force limit based on the
achieved normal, not an extra independent traction source.

An all-active 3D force extension would require an explicit provisional actuator
capability; do not infer an empirical muscle maximum from one tracking
acceleration or one ground-reaction peak. One shared force budget must bound
all simultaneous stance, swing, corrective, and posture forces, and actual
positive work must share one power budget. Static vertical support uses force
but performs no mechanical work; raising the COM uses positive leg work and
must not happen through direct posture edits. Braking may dissipate energy,
but negative work from one leg must not finance unrestricted positive work
from another.

The four acquired biomechanics subjects constrain feasible height ranges,
ground-reaction/loading timing and foot motion. Their running force peaks
are observations of requested effort, not universal maximum strength. NFL
tracking constrains resulting trajectories and cutting/braking demand. These
are complementary priors; neither directly measures grip strength or a
football player's full actuator envelope.

The current planar reach is a horizontal workspace prior, not a 3D leg
length. Reusing it as a torso-to-ground sphere can make the initial upright
stance infeasible: upright COM height is about `0.55 * stature`, while the
planar reach is at most `0.5 * stature`. Use measured/explicit hip offset and
leg geometry, or an explicitly configured center-to-foot surrogate length;
do not silently stretch the existing reach to pass tests.

Two point feet give only a line segment of static support. Real soles give a
finite region and transmit ankle moments. The first vertical research model
can expose this point-foot limitation honestly. Before it determines ordinary
stance/fall behavior, add a coherent finite sole patch or foot angular state
with finite ankle torque and actual work. Adding a free CoP radius or applying
a ground couple directly to torso spin without its physical joint work would
reintroduce hidden support energy.

## Controllers and achieved support

The controller asks for a body velocity, posture and finite foot stroke. It
may plan a future landing outside present reach, but must predict the other
stance leg's reach deadline and whether bounded force/work can complete the
stroke before support disappears. Braking to zero also needs steps. A phase
clock may describe an intended gait cycle; it must not grant a successful
plant, normal load, or clearance by itself.

Track actual normal impulses, foot slip, loaded support geometry, achieved
height/tilt, leg extension and delivered restoring moments. They are the
physical support diagnostics. During fast gait the COM need not be statically
over the current sole. The controller can use a capture target or short
bounded-force rollout to choose a future plant, but an analytical raw CP
must not decide that the runner is already falling. A failed corrective step
is a physical failure to achieve useful support; it is not a separate strength
multiplier or a reduced recovery scalar.

The minimal unavoidable-fall claim should remain modest: no feasible local
support/motor action avoids continued height/tilt loss over the tested horizon.
Actual down status should follow torso-ground geometry. Getting up must also
request bounded leg/arm work. Timed down/rise rules can remain an explicitly
approximate game policy until that physical behavior exists.

## Incremental implementation and World seams

1. Finish the planar kernel's local active-set, central tether, contact-stop,
   first-break and rollback checks. Measure rejection, mirror status and
   coarse/fine behavior; successful work ledgers alone do not certify it.
2. Add vertical point-foot mechanics and unknown normals in isolated research
   scenarios: stand, lift, force-limited held lift, land, shove and recover.
   Extend gravity, passive work and angular momentum contracts before using
   tilt or height as a fall signal. Add finite sole/joint support before
   interpreting ordinary balance.
3. Add a nondefault World contact-island adapter with one authoritative solve.
   Keep football decisions unchanged. Translate their movement/brace/step
   requests into physical leg forces and their hand/grip requests into the
   actual attachment rows. Run the universal owner scenarios and matched
   movement panel with full force/work reports. An earlier horizontal-only
   adapter may be useful for diagnosis, but cannot certify physical balance.
4. Integrate that physical support path into the same gated World adapter.
   Retire the legacy reduced support contributions for that mode; compare
   universal interactions and controlled full games before considering
   production.

In current World, `feet()` applies COM motor/ground impulse before grips and
contacts; `updateSupport()` later handles reduced balance. An inertial adapter
must replace these physical paths for its entire island, not run afterwards.
Existing block, grasp, body collision and active arm impulses must use the
new torso/foot material inverse responses. Applying an old `1/M` body impulse
then a separate foot solve duplicates effects and uses the wrong attachment
mobility. Current `groundWork` includes active drive; the new mode needs
separate leg motor work and passive ground work against full represented
energy. Do not sum both old and new work ledgers.

Retain one canonical body coordinate. If `Body.pos/vel` remain total COM for
controller compatibility, collision centers and contact Jacobians must use
the derived material torso position/velocity. Store persistent foot and grip
identity through transfers; do not rebuild feet at the COM or reset a held
anchor when the controller chooses a new assignment. Yaw commands also need
finite joint/ground response in the same budget, not an independent
`turnBody()` update beside the represented rotor.

## Can the planar path help anchors and jams now?

Yes, as a gated or diagnostic model for horizontal force transmission under
explicitly prescribed quasi-static normal support. It can show an anchor
slipping at finite traction, a weak hand losing a hold, a held stroke missing
its target, or a rusher being redirected without an independent scenario
strength factor. Those are useful cross-interaction checks.

It cannot yet justify a lowered man's vertical leverage, a held foot's
failure to clear the turf, a runner pitching down, normal-load redistribution,
or realistic falls. Retaining legacy fall policy beside a gated planar adapter
is an explicitly hybrid experiment, not a physical balance solution. Do not
call that combination physics ready, and do not tune its capacities to improve
sack or tackle totals.

## Vertical architecture choice: active vector force versus compliant strut

**A — one provisional 3D actuator norm cap** is straightforward to extend from
the present motor kernel, provided gravity and ground normals are physical.
It needs an explicit new capacity above static body weight; the existing
horizontal, traction-capped `pushForce` is not that quantity. The model can
support standing and control foot clearance, but a controller must continually
request vertical support, and an unmeasured capacity/controller can generate
arbitrarily good support unless force, work, geometry and actual normal limits
all constrain it. A correct ledger makes those assumptions visible; it does
not empirically validate them.

**B — passive axial leg compliance plus bounded joint control** is the better
first vertical *research reduction*. It provides ordinary support and elastic
return from explicitly stored energy rather than an invented perpetual active
vertical strength bonus. The same axial response applies during a shove,
anchor, absorbed hit, landing and stride. It does not need a separate football
interaction multiplier. A rigid compression strut is also passive, but an
uncapped rigid strut can carry arbitrarily large force and makes collapsing
under load impossible; finite compliance with a reported axial cap is more
informative.

For actual hip-to-foot length `ell`, configured rest length `ell0`, compression
`q = max(0, ell0 - ell)`, and unit hip-to-foot direction `n`, use a passive
compressive force and its matching potential:

```
f(q) = min(k*q, axial_force_cap)
U_leg(q) = integral_0^q f(s) ds
F_foot = f(q) n, F_hip = -F_foot
```

The saturation must be in the stored-energy law too. Clipping a quadratic
spring force while retaining its uncapped quadratic potential breaks work
closure. A passive damper may dissipate axial motion, but its signed work must
be reported. Midpoint/discrete-gradient spring integration must satisfy
`W_spring = -Delta U_leg` for fixed configuration; this is internal stored
energy, not fresh positive actuator work on every rebound.

SLIP-style compliance can support standing at finite compression and return
energy during running. **Bare SLIP is not a complete football leg**: its usual
massless instantaneous leg repositioning cannot replace the persistent
inertial-foot stroke; point-mass SLIP also has no torso tilt or finite sole.
A crouched human supports himself partly through active knee/hip torque,
so an effective passive spring is a reduced stance model, not proof that real
muscles provide this support passively.

Keep the leg present through transfer. A controller cannot disable a loaded
spring for swing and later reenable it at a new compression without accounting
for discarded and created energy. Changing posture, rest length or stiffness
is actuator configuration work. In the unsaturated spring case:

```
P_configuration = k*q * d(ell0)/dt + 0.5*q*q * dk/dt
```

For saturation, use the corresponding derivative of `U_leg`. Lengthening the
rest length under compression can raise the torso and costs positive work;
shortening can dissipate or absorb stored energy. These changes must share the
same force/rate and positive-work budget as swing and other active controls.
Do not reset `ell0` to current length at touchdown or transfer. A fixed
passive leg can unload and swing through physical motion, but realistic
retraction and crouch will still need bounded active control.

For a center hip attachment, a controlled transverse hip torque `tau`, with
`tau dot n = 0`, has the physical force mapping

```
F_transverse = (tau cross n)/ell
torso_reaction_torque = -tau
```

Use its actual foot/torso relative and rotor velocities for motor work. Bound
force as well as torque near short leg length; otherwise `1/ell` creates a
force singularity. Axial passive load, active hip/swing torque and finite ankle
control are distinct physical capabilities, applied consistently everywhere.
Do not hide them as scenario strength bonuses. Ground remains unilateral with
friction based on the solved normal, and a sole/foot angular representation is
still needed before ankle moments or ordinary static balance are authoritative.

An axial spring attached exactly at torso COM produces no restoring torso
pitch/roll torque. It is a coherent first vertical load experiment, but not
realistic tilt balance. Before making tilt authoritative, use an explicit
material hip offset `x_hip = x_t + R*a_hip`, its actual velocity, and the
hip-to-foot length. The torso receives the spring force at that hip and the
corresponding lever torque; passive spring work uses `v_foot - v_hip`.
The central hip-to-foot spring conserves angular momentum without an invented
balance torque. Its moving attachment Jacobian and energy law must agree.

Practical order: retain the completed planar increment; next derive/configure
one compliant vertical leg law with an explicit potential, then test standing,
compression/return, held unloading and touchdown with actual ground normals.
Only then add bounded active rest-length/posture and hip/ankle control. This is
a design for the next increment, not a request for a third parallel prototype
or production promotion now.

Unknowns remain under either architecture: effective axial stiffness and
damping, working/rest length versus posture, axial force ceiling, active joint
torque/rate/power bounds, and finite sole geometry. The four biomechanics
subjects can constrain effective force versus leg compression and support
timing. Test whether one size-normalized parameter range transfers across
their speeds and subjects; a separately fitted spring for each condition would
not demonstrate generality. GRF peaks supply observed demands/minimum capacity,
not maximum joint forces. They do not establish NFL contact-load strength.
