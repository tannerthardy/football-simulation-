# The back's run read: first attempt (experimental, off)

`RUN_READ=1` turns it on; production is unchanged. Code: `src/sim/run-read.ts`,
the press-and-read branch in `carrier.ts`, the mesh hook in `assign.ts`, and
`Agent.eyes` (used by `PlaySim.see`).

## Why

The counterfactual check ([counterfactual defenses](counterfactual-defense.md))
showed that a defense which overflows is not punished: the back's choices do
not respond to it. He presses a landmark on a timer and then takes the best
crease with a penalty for leaving the designed aim. Real backs are taught to
read (Running Back Mechanics, sections 1-3, 8, 10, 35): press the track,
read the defender or block that controls the lane, decide, get vertical.

## What was built

- **Eyes.** `Agent.eyes` lists the opponents he keys. Others are seen with
  extra peripheral delay (0.08 + 0.17 x (1 - vision) s). This is general:
  any controller can set keys.
- **Keys from his own picture after the snap.** First key: the first man on
  or outside the play-side tackle (outside/wide zone) or play side of the
  center (inside zone). Second key: the nearest fitting backer. The first key
  is held once identified and re-keyed only if he leaves the line or goes
  down.
- **The read is a relationship.** Leverage is the blocker's projected lateral
  position minus the key's, projected ahead by 0.1 + 0.35 x anticipation s,
  with a held per-read judgment error (0.1 + 0.35 x (1 - vision) yd). Go to
  the side of the block away from the key: sealed inside means bounce,
  outside or widening means bang. If neither frontside answer can be reached
  ahead of the defenders, bend to the safest backside crease.
- **Feasibility** samples his approach path with his own acceleration, not
  only the entry point.
- **Commitment** is made when the read declares near the decision point, at
  decision depth (1.6 yd behind the line), or when pressing is unsafe; never on
  a timer. He reads during the mesh but cannot cut before he has the ball.
  Once committed, the entry becomes his aiming point for the existing lane
  planner.

## Results: not an improvement yet

Same 96 stretch inputs as the counterfactual check:

| Version | Current | Hold | Over |
|---|---|---|---|
| Read off (production) | 2.67 (5+ yd 0.19) | 4.70 | 2.02 |
| Read after the handoff only | 2.36 | 4.98 | 2.34 |
| + key held, read from the snap | 2.45 | 4.78 | 2.45 |
| + approach-path feasibility, crease bend | 2.11 | 5.04 | 2.95 |
| + entry handed to the lane planner | 2.12 | 4.29 | 2.66 |
| + cut only near the decision point | 1.98 (0.11) | 4.38 | 2.22 |

Each step fixed a defect seen on film: the key drifting to a filling
backer, reading starting only at the handoff, a tackle flowing behind the
line meeting him on the way to a "clean" entry, and early cuts that let the
second level fit the lane. None improved ordinary plays. The peripheral
delay is not the cause: `READ_EYES=0` gives the same 2.12. Stopped after five
passes, per the stopping rule.

## Diagnosis for the next attempt

The production back's open-field planner looks at every defender within
his vision range along many headings. The read narrows the choice to three
answers keyed off one relationship. That only helps if the relationship
actually predicts where the space will be. In our sim it may not yet: blocks
come apart, ends penetrate vertically inside a reach, and stretch handoffs
come late. The next step is a measurement, not another rule:

1. **Is the read informative here?** At the decision point, log the key's
   leverage and, at arrival, which entry was actually open. If leverage does
   not predict the open side, the problem is upstream (blocking, defensive
   technique, mesh), not the back.
2. **Read as a prior, not a hard choice.** Let the key direct attention,
   anticipation and the preferred side, while the lane planner still sees
   open grass. That is closer to how vision works, and it cannot do worse than
   the planner alone when the read is uninformative.
3. **The stretch mesh is late.** The probe's under-center stretch handoff
   comes at about 1.65 s; NFL outside zone is 1.3 s median (p90 1.5). A late,
   deep mesh leaves little time to read before the decision depth.

## Follow-up measurement

The [read-information audit](run-read-information.md) measures the same 96 inputs, controller handoffs, actual paths and responding-defender entry branches. It supersedes the tentative mechanism diagnosis above; the experimental read remains default-off.
