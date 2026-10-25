# Recovery allocation and football transfer

## Status and where to start

The production model now reserves recovery effort after actual drive and yaw,
and gives a held corrective coordinate finite, profile-derived compliance.
The same allocated recovery law applies to unheld bodies. No anatomical feet,
new backend, strength bonuses or global substep increase were added.

Read [the evidence and rerun commands](../../../data/reviews/physics-world/recovery-allocation/README.md).
Watch [the paired run library](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/run-contact-review.html), or download
[its offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/run-contact-review.zip). It contains 12 fixed
inputs under each source, plus one explicitly labelled diagnostic Counter input
under each source. The refreshed [inspection room](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/inspection-room.html)
retains LAB-P001 through LAB-P006.

This is a useful repair, not a claim that physics is finished. Controllers can
now receive targeted football improvements within the shared capabilities;
complete biomechanics is not a prerequisite.

## The failure and the smaller repair

The previous held-only reservation charged recovery twice: availability already
reduced gait when off balance, then creating a low-grip motor removed another
force reserve. An arbitrarily weak hold could therefore change acceleration and
turning substantially while transmitting almost no force.

The first replacement preserved ordinary gait, but made passive mobility
proportional to the inverse of unused effort. At nearly exhausted drive/yaw
budgets that became enormous. In `RC-R3-counter-under-L-S3`, a corner's partial
leg reach made the runner's capture deviation jump from zero to 3.014 yards
in one tick and caused an immediate fall. Accounting limits passed; football
transfer exposed the failure. The rejected witness is retained with the evidence.

The final rule separates two quantities:

- **Active allocation:** unused profile strength and traction after actual
  locomotion/lean force and support-radius yaw demand.
- **Passive mobility:** `stepSpeed / pushForce`, fixed for the physical profile,
  independent of unused effort or grip presence.

Allocated recovery speed is the smaller of fatigued stepping speed and mobility
times the remaining effort. The existing latency ramp and analytic base-crossing
law use that peak speed for held and unheld bodies. During a hold, only the solved
force-dependent velocity difference perturbs this common recovery. Zero reserve
means zero active correction; it does not make a weak grip infinitely effective.
Attachments and balance history survive that interval.

The fall threshold still represents the profile's maximum recovery capability,
rather than shrinking immediately when effort is spent turning. Insufficient
actual correction can instead accumulate imbalance into a fall. Free/airborne
and diving commands allocate no active corrective step. Grounded recovery tests
isolate posture and metabolism; passive collision tests measure before subsequent
fall/friction impulses.

Recovery strength also comes from the profile, rather than the direction of a
nearly zero residual gait request. This removes a second discontinuity: tiny
forces could otherwise switch the movement-direction allowance and change
recovery by a finite amount.

This remains a reduced constitutive assumption, not measured NFL leg stiffness.
An existing movement law can demand more force than the profile's `pushForce`;
then correction receives zero reserve. The current repair does not silently
expand strength to pay for both actions, and does not claim to fix that separate
movement/strength-envelope mismatch.

## How it was validated

The mechanical panel has 432 trials: two profiles including a fatigued heavy
player, three speeds, straight/turn/brake commands, both mirrors, six grip
capacities, and 12/48 physics subdivisions. Zero-capacity holds match absent
holds exactly. The maximum tiny-grip balance difference falls to 2.73e-9 yards;
the controls preserve position and facing to approximately 1e-7 yards and
1e-9 radians. Observers are checked against unobserved state and RNG.

Strength, traction, arm/motor work and momentum contracts hold within numerical
precision. Analytic unheld command effort is inferred from the actual allocated
recovery state and labelled as such; it is not a measured external foot force.
The older source's missing unheld allocation remains explicitly unknown.

Native/refined fall agreement is exact across the panel's 216 pairs. Position
error improves to 0.00428 yards, but maximum support error grows from 0.0806 to
0.0991 yards and velocity error from 0.0274 to 0.0739 yards/second. These sustained
contact limits remain visible. In the separate hand-fight panel, native fall
disagreements decline from 1/9 to 0/9; worst closest-position error remains
about 0.822 yards. Outcome agreement alone does not establish convergence.

The football panel uses 144 full 11v11 runs: three generated roster pairs,
six concepts, Over/Under fronts, both directions and two play seeds. Scripts,
rosters, inputs and RNG checks match across sources. No controllers were retuned.

| Controlled run measure | Previous source | New source |
| --- | ---: | ---: |
| Stuffed runs, gain <= 0 | 32/144 (22.2%) | 23/144 (16.0%) |
| Median credited gain | 0.92 yd | 1.06 yd |
| Mean credited gain | 1.73 yd | 1.82 yd |
| Mean gain after first carrier contact | 1.58 yd | 1.65 yd |
| Runs gaining 10+ yards | 1/144 | 4/144 |
| Timeouts / actual lower-range releases | 0 / 0 | 0 / 0 |

Results vary by concept: inside/outside zone mean gain declines slightly while
wide zone and some gap calls improve. Shared recovery also changes blockers and
defenders before contact, so the aggregate difference is not exclusively a
tackle effect. The labelled Counter witness now survives the small initial
disturbance and slipped reach; it finishes out of bounds at 22.37 yards, rather
than the rejected instant fall or the baseline 70-yard touchdown. Do not treat
either endpoint as the intended outcome.

The evidence directory also retains shared-capability/scenario results, four
matched full-game checks across two roster pairs, isolated cost measurements,
and the final test/build/browser verification. Read their scope and limitations
before interpreting an aggregate as improvement.

## NFL references and measurement repair

The anatomy tool now distinguishes canonical carrier contact from a missed
tackle, block, reach or earlier wrap. It verifies possession, carrier identity
and event order, excludes ambiguous transfers/returns, and gets the tackled
carrier's position from frames rather than a tackle event's tackler position.
Official forward-progress gain remains separate from physical displacement.
Eight counterexample tests cover these definitions.

Canonical contact is currently emitted once per play, rather than per possession
segment. A QB touched before a handoff or release can suppress a later acquired
carrier's contact record. The anatomy tool excludes such unobservable samples;
all 144 panel contacts occur after transfer and are unaffected. Report this
selection limitation in future pressured-pass studies.

The current BDB 2025 contact reference contains 1,142 designed runs with a
handoff, labelled first contact and tackle, from two weeks. Median labelled
contact-to-tackle time is 1.35 seconds; median ball displacement after contact
is 2.33 yards. That selected tackled cohort is not interchangeable with all
contacted simulated runs or official gain-minus-contact statistics. Use matching
cohorts, physical endpoints and tracking-scale smoothing before comparison.
The 2027 selected-player pre-release pass movement data cannot calibrate run
grips or recovery strength. No new dataset is needed to confirm the repaired
continuity failure.

## Next, in order

1. Inspect paired first-contact windows, including ordinary fixed inputs and the
   labelled Counter witness. Ask where the first implausible plant, reach or
   recovery happens, not whether the final gain seems desirable.
2. Improve tackle approach and braking with short achievable movement rollouts,
   using current traction, turning and recovery limits. Compare crossing-angle
   approaches and collision avoidance across profiles and mirrors; retain
   believable misses rather than guaranteeing tackles.
3. Trace the worst remaining sustained-contact timing error before changing the
   solver. Localize the first differing contact/lean/recovery transition; consider
   a local persistent-state repair only when it improves retained football cases.
4. Diagnose early run penetration together with snap reaction, offensive first
   step, posture and combo-release control. Use matched NFL get-off/contact
   measurements, rather than increasing blocking force to tune yards per carry.
5. Reconcile any demonstrated gait/strength-envelope mismatch without degrading
   the measured free-movement model. Expand support state only if a concrete
   retained failure cannot be solved coherently with the current reduced model.

The owner can help most by reviewing the first implausible action in paired clips:
does the defender brake before reaching, can that weak grip interrupt this step,
and is there an identifiable escape lane? Record the clip ID, time and action.
That is more useful now than another large motion-capture download.
