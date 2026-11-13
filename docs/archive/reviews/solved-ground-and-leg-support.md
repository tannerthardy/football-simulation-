# Solved ground and leg support: current review

**Status: physics is NOT READY for production or the owner's OK.** The current
increment adds standalone research on compliant axial legs, bounded series
rest-length control, unilateral vertical ground contact, and material rigid
body attachment mechanics. None of these modules is selected by `World`; the
production movement, contact, fall, and tackle path remains unchanged. This
review is pinned to canonical source hash
`45441b0fc60f6005908501fdbf8dc129e088aec97b959935d9cf3b1c301cbabe`.
Run reports made against other source hashes remain historical evidence and
must not be relabeled as this source's results.

## What this increment establishes

The research vertical solver represents a torso and two finite-mass feet on a
single vertical axis. Gravity applies to every represented mass; unilateral
ground normals, impacts, compression-only capped springs, dampers, and optional
series rest-length actuators are solved in the same interval. Persistent spring
energy is included across stance, flight, and impacts. The analytic and
mechanics tests are useful local contracts for this reduced model. They do not
validate a three-dimensional player or make ground support available to the
game.

The series actuator is a bounded material configuration control, not a leg
force exemption. Its rest length has explicit rate and travel limits, its
spring configuration transfer is internal; it is not counted a second time as
motor work. Positive shaft work must fit the shared active actuator budget. Under load, extending
the rest length costs work. A weak actuator may fail to retract or raise the
torso; a controller cannot teleport the attachment geometry. The accounting
also exposes the key design condition: restoring the body costs actual shaft
work, while an underpowered shaft backdrives. Declared structural end-stops can
carry the capped elastic load passively; they are not a commanded infinite
muscle force. Their reaction starts at actual arrival and ends at actual release.

The material-rigid primitives provide actual material attachment positions,
midpoint velocities, impact candidates, and isotropic rotor mechanics. The
torso-plus-two-rigid-foot spatial design is the appropriate next small
physical substrate: solve leg forces, normal reactions, friction, grips and
rotational response together. The existing planar gait model has no vertical
clearance, torso height, pitch/roll, or achieved normal load. Its prescribed
support loads therefore cannot serve as physical evidence of lift-off,
traction, or falling.

The finite-segment shape report is a prior from processed OpenSim assignments,
not measured NFL anatomy. It aggregates native Hamner skeleton masses and
embedded local inertia tensors over the non-foot body group and each foot group
(talus, calcaneus, toes) for eight selected running windows in two subjects.
The torso proxy uses `trace(I)/3` only as an explicitly isotropic reduction;
the full tensor and eigenvalues are retained. The report gives both kg m² and
kg yd², with `1 kg m² = 1/(0.9144²) kg yd²`. Heel and toe positions are embedded
model markers, not measured sole or cleat geometry. These data provide
transparent sensitivity priors, not a fitted torso or foot rotor.

The pinned native Python wheel does not expose readable inertia values through
its `BodyNode.getMomentOfInertia` output-argument binding, and the body
properties object exposes no readable inertia member. All 80 XML body/pass
entries inspected in the selected models have zero off-diagonal terms, so the
off-diagonal sign convention cannot be independently checked against native
values. The report records that limitation instead of claiming a native match.
See [the aggregate shape-prior report](../../../data/reviews/biomechanics-support/rigid-shape-priors.json)
and [the source/data audit](../../../data/reviews/biomechanics-support/README.md).

## What is not established

Energy closure alone is not a contact or gait acceptance test. A model can
close an energy ledger while allowing adhesion, an early end-stop, or a joint
crossing its travel bound and returning before the endpoint. Acceptance must also check unilateral normal signs,
actual endpoint clearance, event timing, force and configuration caps, and
whether the prescribed physical state was actually reached. A leg spring's
force limit does not by itself cap a discontinuous series-motor/backdrive
reaction. Any such transition must either satisfy the same bounded actuator
contract or reject/resolve locally without mutating accepted state.

No measured data here calibrates NFL leg stiffness, rest length, damping,
series rate, active-force capacity, joint torque, or ground traction. Hamner
force and COM series provide context; the processed kinematics can have large
force residuals and the dynamics pass was force-fitted. The small Moore subset
does not preserve belt commands or perturbation event timing. The shape priors
do not supply a finite sole polygon, cleat contact points, or a verified native
inertia tensor. The 1D solver has no horizontal motion, tilt, sole geometry, or
World coupling. The planar gait panel is not a gait-quality result just because
its sampled intervals close their ledgers or finish without solver rejection.

The current source pin and supporting test/report outputs are useful for
reproducing component behavior only. No complete production fall/contact gate,
universal interaction gate, hand-fall convergence gate, or NFL transfer gate
has been passed by this increment. Game averages are not calibration targets.

## Evidence and remaining production failures

The [pinned reports and commands](../../../data/reviews/physics-world/solved-support/README.md)
keep independent mechanical reconstruction separate from the solver's own ledger.

- Nine ordinary vertical scenarios at three resolutions complete without
  rejection. The intentionally insufficient power budget rejects at all three
  resolutions, preserving the input state.
- Eight series-control scenarios at three resolutions complete without
  rejection or independent contract violations. The seeded 2,000-tick panel
  also completes; 32 cases lift a foot before reaching any structural end-stop.
- An independent analytic lift reference converges under subdivision. The
  first-lift error falls from 348 microseconds at a 0.1-second maximum interval
  to about 0.0016 microseconds at 0.0001 second. The coarse foot-height error is
  still 0.0032 yd: a closed ledger is not accurate motion by itself.
- The hidden airborne joint-stop fixture detects both first arrivals even
  when the free endpoint has already returned inside the allowed range. Its
  first-arrival error falls from 63 to 8 microseconds between the two tested
  resolutions. Uncertifiable grazing transitions reject atomically.
- The rigid attachment diagnostic accepts 6,384 transformed trials and
  correctly rejects 6,000 above its numerical uniqueness bound. Independent
  work, momentum and material-geometry checks pass. This does not certify
  high-speed free rotation's time accuracy; the report exposes that limitation.

All **390 TypeScript tests and 22 Python tests pass**, as do typecheck and
build, on the pinned source. No new football cohort was run: `World` does not
use the new components. The production sustained hand-fight diagnostic still
has the previous **3/9 fall disagreements** and **0.822 yd** worst trajectory
error. No improvement to those failures is claimed here.

## Next work, in order

1. **Build one coherent spatial island:** one torso, two finite feet, explicit
   hip and sole attachment points, gravity, unilateral normals, friction,
   grips, impact, and rotational response in the same interval solve. Do not
   pass solved normals to a later independent horizontal solve.
2. **Bound executed control:** keep leg spring, series rest motion, swing,
   posture, and correction within explicit shared force, power, and positive
   work budgets. Exercise backdrive and hard-stop transitions; preserve atomic
   rejection witnesses.
3. **Gate a World adapter on the same contact island:** all production
   participants must use the same accepted state, ground and contact solve.
   Keep it isolated until baseline behavior is reproducible and rollback is
   exact.
4. **Run physical regressions before football transfer:** native hand-fall
   convergence at multiple resolutions, conservation/contact invariants,
   mirrored and translated interactions, and universal multi-body contact.
   Then run the owner's NFL movement and game guards without fitting those
   outcomes.

The earlier research reports remain useful for their own source versions:
[inertial feet and support readiness](inertial-feet-and-support-readiness.md),
[the vertical-support design](spatial-support-continuation.md), and
[torso/sole representation options](torso-and-sole-representation-options.md).

## Reproduction and source scope

The canonical engine-source pin for this review is
`45441b0fc60f6005908501fdbf8dc129e088aec97b959935d9cf3b1c301cbabe`. Current
validation runs should record their own start/end canonical source hashes,
runtime, command, and script hash; use only results whose pin matches the
source under review. The model-prior extractor is reproducible from the
already acquired, checksum-pinned subject files and native reader:

```sh
python3 scripts/data/biomechanics-rigid-priors.py \
  --out out/biomechanics-rigid-priors.json
```

Its input manifest and subject hashes, pinned reader version/commit, and
extractor start/end hashes are embedded in the committed JSON. Raw subject
files and the native reader remain ignored under `out/virtual-foot-data/`.
