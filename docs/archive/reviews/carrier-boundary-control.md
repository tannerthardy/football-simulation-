# Carrier boundary control

The runner in `RC-R3-counter-under-L-S3` was accidentally leaving the field,
not choosing a safe exit. This is a controller defect exposed by ordinary
movement limits, rather than evidence that turf traction or player strength
needs increasing. The repair gives an ongoing braking redirect priority over
additional downfield acceleration. World still determines whether he can save
his position, and ordinary contact still determines the finish.

## Why the clip exits

The previously shipped 26-clip bounded run library has 12 fixed Over-front
fixtures per mode and one separately labelled Counter diagnostic per mode. The
12 fixed fixtures all finish tackles. The extra Counter diagnostic is the open
space out-of-bounds example: parent source `c02a3b9`, 15.65 credited yards at
7.50 seconds. The retained new parent replay has the exact same physical
signature as that historical panel.

The ball carrier already has an explicit sideline utility. Near a sideline he
can prefer an exit to a costly imminent hit, with conversion, goal-line and
hurry context included. In this Counter clip `plannedExit` is false on every
carrier update. He repeatedly asks to stay in bounds.

At 5.85 seconds his center is 7.06 yards from the sideline, moving outward at
8.05 yards/second. The old boundary guard estimates stopping room from lateral
capacity, then requests just 1 yard/second inward while requesting 6.93
yards/second downfield. Those simultaneous demands share the movement envelope.
As outward velocity falls, the estimated stopping room shrinks; the guard turns
off intermittently and resumes an outward sprint. Later, with a clean downfield
lane, he keeps requesting inward correction but still cannot finish cancelling
the momentum. At 7.45 seconds he is 0.015 yards from the boundary, moving outward
at 1.65 yards/second, heading downfield, with the closest upright defender 5.32
yards away. The next tick ends the play out of bounds.

## Small repair

Boundary recovery persists until outward velocity has been cancelled. During
that redirect the command requests the current downfield velocity rather than
additional downfield propulsion, and an inward target proportional to the
outward speed. The existing World caps the requested acceleration, uses the
same traction budget, turns the body, updates balance and integrates position.
There is no boundary clamp, instant turn, awarded yardage or new movement
capability. A deliberately chosen exit cancels the recovery state.

The first changed carrier command in the isolated comparison is at 5.85
seconds. All earlier carrier positions, velocities and commands are identical.
The old command is `(6.93, 1.00)` yards/second; the new command is `(3.68, 8.05)`.
The runner stays at least 0.74 yards inside the sideline and eventually finishes
with a natural tackle at 23.51 yards / 9.00 seconds. Those later yards are the
consequence of saving the boundary, not a fitted rushing-efficiency target.
This single selected failure does not establish that all pursuit or running
back choices are realistic.

The [retained evidence](../../../data/reviews/physics-world/carrier-boundary/README.md)
contains exact parent and carrier-only recordings, source/profile/input pins,
the patch and a comparison. Each mode passed an unobserved/unrecorded versus
observed/full-recording signature check. The carrier-only tree changes only the
controller file; a current combined-source recording, when supplied to the
exporter, is labelled separately.

Six focused tests use actual World movement on both sidelines. They establish
that a recoverable clean redirect stays inside, insufficient stopping room
still permits an unavoidable exit, and an imminent costly hit can still justify
a deliberate exit even after the runner began a recovery command. The existing
six contact-choice and 17 run-execution tests pass as well. No NFL means were
tuned and no physical capability or solver constants were changed.

The [three-mode replay library](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/carrier-boundary.html) and
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/carrier-boundary.zip) include the parent, isolated
carrier repair, and current combined source. The combined replay incorporates
the centered-hand contact repair and other recorded source changes: its carrier
state begins differing from the parent at 1.80 seconds, well before the boundary
guard. It finishes a natural tackle at 25.23 yards / 9.00 seconds, with at least
1.17 yards of recorded sideline room. This bundled result validates that the
repair survives the combined source; it is not the isolated causal estimate.

## What remains

The lane forecast is still an idealized sprint projection, not a full rollout
of every candidate direction through bodies and changing leverage. This repair
only addresses the diagnosed boundary-control inconsistency. Running through
blocking traffic, selecting the right crease, pacing a lead block, and whether
an apparent pursuit threat is actually reachable remain separate controller
questions. Offensive blocking paths and defensive reads should be evaluated on
observable assignments, geometry and timing before adjusting NFL aggregate
outcomes.

For future stress tests, include a clean sideline lane with high residual
outward velocity, an imminent legitimate hit, a late clock-stopping exit, and a
physically unavoidable boundary crossing. Use the same player profiles and
World capabilities across them. The purpose is coherent behavior under
conflicting goals, not eliminating all out-of-bounds runs.

The 144-run combined-source guard also retains one outside-zone exit,
`RC-R2-oz_strong-over-L-S11` (18.29 yards / 7.55 seconds). There the field
safety closes from 1.60 yards away to 0.82 yards while the runner explicitly
chooses the sideline. He subsequently changes his decision and brakes, but
residual outward momentum still crosses the boundary. This is a hit-avoidance
decision followed by a late abort, rather than the diagnosed Counter runner
leaving clean space without intending an exit. The selected cue/command
samples are retained; utility switching and imperfect anticipation remain
controller review questions. No new fix was added to eliminate this legitimate
category of exit.
