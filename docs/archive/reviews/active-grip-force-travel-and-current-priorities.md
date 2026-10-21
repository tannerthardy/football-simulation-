# Active grip force travel and current engine priorities

## Status and where to start

Keep the reduced shared physics model. This increment fixes how an achieved
muscular grip force moves both players over its physical interval. The same
correction applies to torso and lower attachments; it adds no anatomical state,
strength bonus, solver iterations or football outcome override.

Watch the [18 paired tackle recordings](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/grasp-reel.html), or use
the [offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/grasp-reel.zip). Read the
[source-pinned evidence and commands](../../../data/reviews/physics-world/grasp-reel/README.md).
The [coverage help audit](coverage-roof-priority-audit.md) identifies the next
bounded controller experiment, including a counterexample to its obvious shortcut.

The foundation is stronger, and the smaller model remains the best development
direction. It has not earned a universal physics OK or a claim that 95% of
possible gains are exhausted. Current football errors do not justify expanding
the anatomical solver before improving demonstrated decisions and requests.

## The diagnosed error and repair

An active grip already delivered a bounded, equal-and-opposite impulse. Velocity,
momentum, force limits and kinetic-work accounting could all pass while position
was wrong: travel used the new velocity throughout the force interval. A
constant force therefore pulled the players together too far, with an error
proportional to the interval length.

World now centers the **achieved** active-reel impulse for body travel, as it
already does for bounded hand and strike forces. The achieved fraction comes
from the existing pair/support impulse solve after shared force and work limits.
A requested but undelivered pull cannot generate travel. Later constraint
corrections do not erase a finite force that was actually delivered.

A lower attachment changes support response and how much force can be delivered;
it does not change the body's equal-and-opposite impulse-to-motion relationship.
Both attachment types therefore need the same body-travel correction. Lower
support mobility, its bounded chart, motor work and passive capture keep their
existing integration rules. Instantaneous torso impacts also retain their timing.

The retained torso-only intermediate passes the torso oracle but leaves the
lower body-travel error. It is archived separately and is not the final engine.
No force capacities or player profiles were fitted to fix either defect.

## Independent mechanics checks

| Check | Before | Final | Scope |
| --- | ---: | ---: | --- |
| Torso force/travel oracle | 24/48 position checks pass | 48/48 | Two arbitrary force caps, four subdivisions, three rotations, active/passive; free ground |
| Lower force/travel oracle | 24/48 position checks pass | 48/48 | One ordinary standing tick from rest, actual moving bounded support; same input grid |
| Lower observer controls | 48/48 exact repeats | 48/48 exact repeats | Observing achieved substep loads does not change physical execution |

All 48 active position failures before the fix remain in the evidence. All 48
passive physical controls are unchanged. Maximum active position error drops
from 0.0125 yd to below 1e-15 yd for torso grips, and from 0.003125 yd to below
3e-16 yd for lower grips. These are designed inputs, not NFL force measurements.

At six subdivisions, the lower oracle's 200 kg·yd/s² pull closes the gap
0.0009375 yd too far before the repair. The actual support coordinate moves
about 0.0396 yd and exchanges motor work; it is not frozen to manufacture the
answer. After the correction, its mobility is unchanged and differences in
support offset/work are at roundoff. This is an independent body center-of-mass
motion oracle, **not** an independent convergence oracle for the foot chart or
an empirical calibration of NFL grip strength.

Nine new regression tests cover exact motion, rotations, passive travel,
progressive weak/strong forces, a reachable strike exhausting shared arm work,
and two actual lower-support force caps. On the original engine, seven fail for
the expected position error and two controls pass. All nine pass on final.
The full 657 TypeScript tests, 22 Python tests, typecheck and build pass.

## Transfer to retained football interactions

The same collectors, scenarios, initial profiles and seeds are used before and
after. Every adverse case, live window and raw trajectory remains available.

| Panel | Result |
| --- | --- |
| Sustained hand redirects | Native 12-step versus 192-step mean closest-distance error 0.06167 → 0.06111 yd; maximum stays 0.18168 yd. Fall and corner disagreements remain 0/9. Individual refinement errors remain nonuniform. |
| Captured wraps and switched controllers | All five initial captured states match. All 30 support trials and 20 switched trajectories change, with no changed fall sets. |
| 144 ordinary run inputs | 17 lower gains, 11 higher, 116 equal; mean credited gain 1.32653 → 1.32611 yd. Stuffs remain 38 and 10-yard explosives remain two. |
| 64 tackle inputs | 52 physical records change. Outcome, phase, miss/break counts, random draws, wrap, down and whistle times remain unchanged. Six carrier falls move 50 ms later; largest endpoint change is 0.0731 yd. |

Two run finish causes swap in opposite directions: `RC-R2-wz_strong-under-L-S3`
changes from stalled progress to physical down; `RC-R3-power-under-R-S3` changes
the reverse way. Aggregate finish counts conceal those changes, so both are
retained explicitly. The run panel has no physical timeouts, lower-hold releases
or excess support-motor work. Its first-contact time and distance are unchanged.

The 56 primary tackle inputs still include 14 live six-second windows; the eight
retrospective crossing witnesses all finish. A live endpoint is a censor, not
a forced miss or timeout. Films contain nine paired fixtures: seven selected
primary geometries and two labelled retrospective witnesses. Four recordings
are censored and 14 have natural finishes. The parked bystanders and selected
straight runner/pursuer are disclosed; these are controlled encounters, not
full team pursuit or measurements of tackle frequency.

All 18 films retain their exact shifted events, generated profiles and full
telemetry. Eight representative browser samples, filters, inspection, mobile
layout and the offline ZIP pass. Body-facing marks remain body orientation,
not actual eye tracking.

## Full-game guard and remaining limits

The two games match initial rosters and seeds; later calls, clocks and random
draws diverge. Scores change 53–24 to 19–14 and 31–28 to 41–17. Combined credited
yards per completion fall 17.16 to 15.25, but rushing YPA also falls 1.83 to 1.40,
stuffs rise 18/47 to 24/52, and interceptions rise nine to 15. Receiver YAC
improves in one game and worsens in the other. These are mixed regression guards,
not a causal estimate or evidence of an NFL-calibrated offense.

Neither game has physical timeouts, lower-hold releases or motor-work excess.
Final maximum momentum/work residuals are about 1e-11 kg·yd/s and
4.9e-11 kg·yd²/s². Conservation and exact isolated travel do not prove authentic
coverage, blocking, pursuit, grip magnitudes or contact timing. Concurrent guard
timings are not a computational-speed benchmark.

The contact predictor still combines pre-travel positions with post-force
velocities. Finite-force centering does not resolve every contact-onset or impact
event. Passive capture and support-chart refinement remain separate numerical
questions. Reproduce a material football failure and find its first divergence
before adding persistent state, local event solving or more resolution.

## Next, in order

1. **Coverage help that follows observed movement.** The retained Smash picture
   rejects plausible deep help solely for exceeding six yards. A Bunch picture
   proves that deleting the maximum also accepts a departing safety. Test short
   projected cushion and corridor persistence using delayed observations,
   preserve own-primary responsibility and shallow wall handoffs, then rerun
   the fixed ordinary panel. No hidden teammate assignment or perfect future
   trajectory is a legal read.
2. **OL recovery, combination releases and finding work.** Continue the retained
   wrong-side contact fits and stale regrab cases. Record what a blocker believes,
   requests and actually loads; distinguish a missed read, unreachable angle,
   delayed combo release and failed physical block. Better linemen may react
   sooner through existing traits, but cannot gain an extra force multiplier.
3. **Pursuit and tackle approach in traffic.** Preserve normal geometry controls
   alongside crossing, braking and multiple-pursuer witnesses. Judge attainable
   motion through the same traction/support limits, then execute contact. A
   tackle-opportunity prediction is not proof that an actual grip can hold.
4. **Local numerical debt only where witnessed.** Keep active travel, passive
   restraint and impacts distinct. Use the unchanged multi-contact panels to
   falsify repairs; retain adverse cases instead of raising resolution globally.

Use NFL tracking to check conditional movement/contact demands and distributions
across generated rosters. Use this shared model across anchoring, driving,
shedding, absorbed contact, jams and tackles. Improve controllers or techniques
when the requested action is wrong; change physics when a feasible request
executes incoherently. Game averages become more useful as the actual calls and
techniques become credible, rather than serving as force-tuning targets now.
