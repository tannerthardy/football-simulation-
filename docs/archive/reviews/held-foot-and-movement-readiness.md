# Held-foot motion, matched NFL tasks and the physics OK

**Read first on `claude/engine-priorities`. Physics remains NOT READY.**
Use [PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md) throughout. The owner
wants a reusable physical foundation before more coverage, playcalling or QB
mechanics. The previous evidence is in
[NFL references and shared support physics](nfl-reference-and-support-integration.md).
PR #1 remains separate.

## The physical repair

A leg restraint compared the carrier's **ending velocity** with the holder's
**starting velocity**. Two identical bodies could accelerate together, maintain
exactly the same separation, yet accumulate a trip contribution as if the
carrier had run past the held foot. A one-step mirrored reproduction produced
0.001789 yd of invented leg deviation.

The world now records each body's interval-mean translation used by position
integration, before contact velocity relaxation. Both sides of the held-foot
comparison use that same interval. The common-acceleration reproduction now
has zero relative translation and no leg-trip contribution. Using the velocity
after relaxation would still mix two different motions. Real relative movement
and contact-height moments continue to affect support. No capacity, strength,
reaction, latency or global solver-resolution constants were changed.

This repairs a general constraint inconsistency; it is **not** a solution to
the larger hand-fighting convergence failure. Nine real-technique fixtures at
12 versus 192 substeps still have mean closest-distance error **0.206 yd**,
worst **0.822 yd**, and **two fall disagreements**. The seed-7 block path diverges
before the wrap; the near-critical seed-3 QB support transition also remains.
The refined numerical result is not an NFL ground truth.

## Actually using the NFL movement data

Three portable scripts now take BDB2027 drill trajectories through the ordinary
physics world and measure both paths with the **same** 10 Hz position-derived
speed, 0.5 s acceleration smoothing and athlete weighting used in our NFL audit:

1. `scripts/data/movement_task_fixtures.py`: choose one earliest eligible event
   per athlete/drill, requiring measured stature, mass, arm length, ten split
   and forty. Validate drill names and disjoint athlete splits. Trim derivative
   edges and initialize from observed movement; official drill timing is not
   reconstructed from the trimmed path.
2. `scripts/diag/movement-tasks.ts`: seed the measured body, neutral ratings,
   observed initial velocity and explicit missing-measurement proxies. Run a
   fully informed position/velocity feedback controller at 20 Hz, paired at
   0.15 and 0.40 s response settings on identical bodies. A response setting is
   a controller gain, **not a fitted human reaction time or a skill rating**.
3. `scripts/data/movement_task_report.py`: verify fixture identity and all four
   mode/response pairs; use identical measurement operators. A failed simulated
   measurement stays in the error/fall denominator. Exclusions, missing agility
   and unknown contact are visible in the aggregates.

The panel has **888 paths from 420 athletes, 3,552 trials**, with 2025 athletes
reserved separately. No parameters were fitted, so reporting that cohort does
**not** establish held-out predictive accuracy. Raw paths and trial frames stay
in ignored `out/`; collaborators get the scripts, aggregate evidence and hashes.

| Drill | Development 2023–24 paths | Reserved 2025 paths |
|---|---:|---:|
| Forty | 285 | 133 |
| Short shuttle | 99 | 53 |
| Three cone | 97 | 46 |
| OL long pull right | 43 | 28 |
| Backpedal / 90-degree break | 75 | 29 |

`footballMapping` uses the current generated-body mapping.
`sprintFit` changes only V/tau to the athlete's measured ten/forty solution in
the diagnostic. Both retain the current braking, lateral, turning and support
capacities. It is a controlled comparison, not a deployed engine change.

The laboratory controller knows the path; it does not simulate perception or
football choices. Facing follows the command because observed body orientation
is unavailable. Thus the backpedal drill tests path geometry, **not backpedal
technique**. OL dummy/contact geometry is unknown and not simulated. Bench,
agility and other missing measurements have declared neutral proxies; their
uncertainty cannot be hidden behind a precise athlete label. Combine sprinting
and padded football are different conditions.

## What the panel says

Reserved-2025 median path RMSE, yards; 0.15 s controller setting unless shown:

| Body / task | Paths | Football mapping | Measured sprint V/tau |
|---|---:|---:|---:|
| WR forty | 33 | 4.18 | 0.31 |
| OL forty | 28 | 5.32 | 0.28 |
| OL long pull | 28 | 2.53 | 1.45 |
| OL short shuttle | 16 | 2.24 | 1.91 |
| OL three cone | 15 | 3.16 | 2.38 |
| DB backpedal drill path | 29 | 1.57 | 0.28 |

This exposes **capacity versus demand**, not a mandate to accelerate every
football player harder. `GAME_BURST` currently reduces the physical acceleration
envelope itself to match average game demand. A controller requesting maximum
movement cannot recover the measured sprint. The eventual design should retain
physical capacity and put role, effort and pace decisions in control. Preserve
the existing football demand evidence while making that separation explicit;
do not simply revert the burst constant and call football movement calibrated.

Hard reversals remain poor even with measured sprint V/tau. For 2025 OL shuttle
paths, NFL median braking demand is **6.41 yd/s²**, against **5.10** in the sprint
diagnostic; simulated peak speed is **6.89 yd/s**, against **5.45** observed.
The controller chases error through the turn. A gentler 0.40 s response improves
OL three-cone RMSE from **2.38 to 1.04 yd** on the *same* sprint-fit bodies.
This separates a control contribution from possible capacity limits; it does
not prove which braking constant is correct. Only 12/28 reserved OL bodies have
both agility measurements, so report the complete-measurement subset before
fitting. Plan braking and turn feasibility from geometry and current movement,
rather than adding hidden technique strength boosts.

All 3,552 trials remain finite and standing, with no rejected simulated
measurements. Recorded translation uses at most the model's traction budget
(fraction 1.0 to rounding); planar work residual is below `4e-12` model units.
Those are model contracts. NFL position tracks alone cannot validate turf
friction, grip force, contact height or support/potential energy.

## When we can give the physics OK

The OK means **the world is a dependable foundation for football controllers**,
not that every play is right or that all possible gains can be counted. Use
these gates together:

| Gate | What should persuade us | Current status |
|---|---|---|
| Accounted interactions | Momentum, work, reach and traction remain bounded under piles, duplicate grips, off-centre hits and extreme valid bodies; active work has an identified actuator | Planar contracts pass. Reduced support/vertical energy and physical magnitudes still need evidence |
| Stable numerical behavior | Practical solver refinement changes contact positions by small fractions of a body width, not a yard; outcome reversals are confined to explicitly traced near-threshold reps | **Fails:** 0.822 yd worst block error and 2/9 fall disagreements |
| Shared capabilities transfer | The same mass, strength, traction, balance and reach explain anchoring, doubles, sheds, jams and contact absorption; techniques change control without changing hidden strength | 120 mechanical reps pass contracts/mirrors. Real-technique and loaded-contact transfer remain incomplete |
| Credible movement | Measured bodies can execute matched sprint, braking and curved-path tasks; reserved athletes and complete-measurement subsets behave plausibly, including tails | Panel built; capacity/demand and hard-reversal issues exposed. No validated fitted model |
| Credible loaded football | Films show reachable contact, real displacement/anchors, believable recovery and tackles across rosters/fronts; contact behavior survives plausible parameter uncertainty | Still open: run contact, approach feasibility and support/grip uncertainty |
| Architecture holds up | New techniques use existing primitives; most remaining film errors can be reproduced as observation, decision or technique mistakes on an otherwise capable body | Not demonstrated yet |

Near a real fall or grip boundary, tiny changes can legitimately change an
outcome. Trace the physical margin and the continuous path before judging the
binary result. This does not excuse large pre-contact/block-path errors. For
new numerical tolerances, relate distance to body/reach geometry and support
error to the critical margin; do not silently widen gates around today's output.

On film, good physics should let us explain the result: the blocker loses his
base, the rusher redirects through leverage, or the runner outruns a reachable
grip. Players can still take bad angles or misread plays. Our confidence should
come from those errors responding to controller fixes while the world stays
unchanged. Matching points per game is a guard, not this acceptance test. We
cannot honestly certify "95% of every possible physics improvement."

## Next work, in order

1. Finish the local pre-wrap hand/lean/load convergence trace, then the
   near-critical QB support transition. Keep controls at 20 Hz. Use the exact
   reproduced failures; no global step-floor increase as a substitute for diagnosis.
2. Separate measured movement capacity from football effort/control without
   losing the current game-demand envelope. Add a feasibility-aware lab path
   planner and compare identical bodies before changing universal braking/cut
   magnitudes. Use complete agility measurements and athlete-grouped cohorts.
3. Revisit loaded run first contact: posture, OL response advantage, doubles,
   front/alignment and actual contact geometry. Current DL 0.5 s speed is near
   the NFL reference; blanket slower DL get-off is not the demonstrated problem.
4. Use the same movement/reach/support model to choose achievable tackle
   approaches, imperfectly. A physically impossible grab should not be rescued
   by a special tackle outcome roll.
5. Contact/support parameter sensitivity and appropriate force/balance research
   are still required. AddBiomechanics remains metadata-only; NFL paths cannot
   supply wrap force or cleat friction measurements.

Evidence, commands and final guard results are in
`data/reviews/physics-world/held-foot-and-movement-tasks/`.
The manifest pins the engine, scripts, inputs and aggregates. Keep the physics
priority; leave coverage expansion, roster rating fitting and full QB mechanics
for after the foundation is convincing.

## Verification and football guards

Engine source SHA-256: `92eb1ea66cfffd94732d7eb2dc8132212a135fdf8a2cf17a595f7d1674632e63`.
Baseline commit: `dfa803d`, source
`e6f1cea4f7c3d2d1a5660c00b31d12cef68a8e1c73d6574931053e7937b5ab57`.
**266 engine tests, 20 data checks, typecheck and build pass.** The shared
mechanical panel remains 120 reps: native 12 versus 48 steps has mean subject
error 0.030 yd, worst 0.075 yd, no fall disagreements; momentum/work/arm limits
and mirrors pass. This does not supersede the failing real-technique sweep.

Identical seeds and cohort definitions as the previous handoff:

| Measurement | Baseline | Held-foot repair |
|---|---:|---:|
| 16-game points/team-game | 27.22 | 30.09 |
| Run yards/carry | 3.42 | 3.50 |
| Run stuffs | 23.96% | 24.10% |
| Interceptions/throw | 7.12% | 7.32% |
| 20+ yd completions/throw | 14.32% | 15.73% |
| Completed YAC | 8.06 yd | 8.19 yd |
| Missed + broken tackles/play | 0.21 | 0.22 |
| Four-game geometric pressure | 29.3% | 25.5% |
| Four-game DL speed at 0.5 s, median | 1.58 yd/s | 1.58 yd/s |
| Four-game run DL peak acceleration, median | 5.03 yd/s² | 5.09 yd/s² |
| Four-game first-contact YBC, mean | 0.81 yd | 0.89 yd |

Passing explosiveness and interceptions worsen; rushing changes little and
geometric pressure falls. These coupled small cohorts do not establish causality
or overall football improvement. Retain a demonstrated constraint repair and
investigate the remaining mechanics; do not reintroduce false tripping to fit
points. The two generated leagues span 25.63–34.56 points/team-game, illustrating
roster effects rather than proving NFL agreement. Calibration-script legacy
target labels are broad guards; the conditional nflverse evidence is the richer
reference.

Fresh film contains **920 clips, six fixed-team games, 27 concepts**. All 20
browser checks pass; the ZIP contains identical HTML. This cohort has 550 throws,
358 completions, 25 interceptions and 167 other incompletions. Drops account for
31/167 (**18.6%**), versus FTN's 11.1% in our clean 2022 reference cohort. Recorded
geometric pressure still cannot explain the cause of each miss. Film is a
different roster cohort from the generated-league guard, and clips are indexed
by the new source SHA; do not assume old G/P IDs describe the same play.
