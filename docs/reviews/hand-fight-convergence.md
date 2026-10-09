# Hand-fight convergence and solver accuracy

**Status: partial, not ready for physics certification.** Increasing the
contact-island floor from 6 to 12 substeps improves the closed-loop block
scenarios at a modest measured CPU cost. It does not eliminate sensitivity
around a fall, corner turn or near-quarterback collision.

## Evidence and decision

The expanded redirect grid uses roster seeds 3, 7 and 11, each with rusher
power multipliers 0.7, 1 and 1.4. The blocker and rusher use the real engagement
controller at 20 Hz. Each fixture runs at 6, 12, 24, 48, 96 and 192 fixed
physics substeps; 192 is the numerical reference, not an NFL target.

The height-aware world, including bounded ankle/hip response, produces:

| Substeps | Mean closest-approach error | Maximum error | Corner-turn disagreement | Fall disagreement |
|---|---:|---:|---:|---:|
| 6 | 0.196 yd | 0.575 yd | 2 / 9 | 1 / 9 |
| 12 | 0.127 yd | 0.323 yd | 0 / 9 | 1 / 9 |
| 24 | 0.061 yd | 0.219 yd | 0 / 9 | 1 / 9 |
| 48 | 0.066 yd | 0.231 yd | 0 / 9 | 1 / 9 |
| 96 | 0.023 yd | 0.077 yd | 0 / 9 | 0 / 9 |

All cases remain finite and explain momentum changes through the recorded
ground impulse. These checks establish physical bookkeeping, not whether a
given football outcome is correct. The table is not monotonic because
technique changes depend on physical thresholds.

The remaining fall disagreement is concrete: at seed 3, power 1, the QB falls
at 6–48 substeps; at 96 and 192 the rusher falls instead. The corner-turn
event agrees. Keep this fixture as a temporal-stability guard.

A frontal tackle at 4 yd/s finishes at all resolutions in 1.55–1.65 s;
its endpoint ranges from 53.699 to 53.730 yd. At 7 yd/s all runs finish in
1.10 s, with endpoints 55.428–55.456 yd. The earlier low-speed timeout seen
during contact-height development was resolved by bounded ankle/hip response.

**Decision: use 12–16 adaptive substeps for contact islands.** At 20 Hz,
12 substeps means 4.17 ms and 16 means 3.13 ms. This does not increase a
player's perception or decision frequency. Free movement retains its one-tick
plan and exact integration. The finer 192-step fixture is a 0.26 ms reference.

The published cost probe runs the same two-game roster/seed sequence at each
floor, on Node 22.23.3:

| Floor | Plays | CPU seconds | Wall seconds | CPU ms/play |
|---|---:|---:|---:|---:|
| 6 | 379 | 15.327 | 10.479 | 40.44 |
| 12 | 391 | 18.183 | 12.907 | 46.50 |

That is about **15% more CPU per play**, or 19% per game. Wall time rose
about 19% per play. A preceding repetition with an equivalent instrumented
probe measured only 6% more CPU per play, so avoid treating one timing pair
as an exact universal cost. Both support the same accuracy/cost decision.

## What the trace showed

On the original `627964c` world, the seed-7 blocker first recruited lean at
about t=0.942 with 6 substeps, versus t=0.933 with 48. The hand force itself
agreed closely. The lean target contains a zero-crossing test, `ex > 0`,
and an `m * ex / h` speed governor. A small numerical change to the onset
then alters geometry, which alters the hand load and the next 20 Hz decision.
Eventually a corner-turn threshold ends the refined rep while the coarse
rep remains engaged. Bare hand constraints converge much more closely than
this controller-plus-physics loop.

Replacing end-of-step lean force with its exact interval mean was not a
sufficient fix: on the original seed-7 fixture it reduced the 12-step error
but slightly worsened the 6-step error. Replacing the speed governor's `h`
with a physiological response time changed the refined football outcome;
that is a model change, not just improved integration. Neither was adopted.

## Felt-load predictor experiment, not adopted

An isolated experiment added the already-sensed contact load to the velocity
prediction used to decide whether additional lean was needed:

```ts
const predictedX = b.vel.x + (plan.ax + sup.felt.x / m) * h;
const predictedY = b.vel.y + (plan.ay + sup.felt.y / m) * h;
```

This is physically plausible: the existing prediction includes the ground
force but omits an incoming load. Its correction tends to zero as the step
is refined. Against its own 192-step reference, mean errors at 6/12/24/48
were 0.225/0.116/0.072/0.046 yd, with maxima
0.676/0.357/0.273/0.179 yd. Coarse corner disagreements disappeared and the
fall disagreement disappeared at 48 rather than 96. However, the 6- and
24-step positional errors worsened. The refined solution changed only
0.0044 yd on average, at most 0.0144 yd, with no categorical outcome changes.

Keep this as a measured experiment. The accuracy floor is the smaller,
better-understood change for this pass. Do not treat the predictor as
necessary to pass a statistical football target.

## Reproduction and limits

```sh
node --import tsx scripts/diag/hand-convergence.ts out/hand-convergence.json
node --import tsx scripts/diag/world-hands-converge.ts
node --import tsx scripts/diag/physics-cost.ts out/physics-cost.json 2 9
```

For cost comparisons, run the last command in two separate source snapshots
with identical arguments and only the minimum substep floor changed. Report
both CPU and wall time, and normalize by actual play count; changed physics
can change game trajectories and the number of snaps. One seed pair is a
cost guard, not a broad performance benchmark.

Evidence is in `data/reviews/physics-world/hand-fight-convergence/`. The grid records a
content hash for all engine source, including uncommitted changes. It was
measured before the floor was raised; fixed-resolution fixtures do not use
that floor. The cost artifacts identify each floor's separate source hash.
The report should not be mistaken for measurements of a later engine revision.

Next work should trace the seed-3 collision and improve the coupled
load/lean/constraint integration while preserving momentum, shared traction
and passive-energy contracts. Doubling resolution alone does not settle
grip magnitudes, balance recovery, or NFL transfer.
