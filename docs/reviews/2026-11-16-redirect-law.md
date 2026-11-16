# Redirect law: a receiver at about 5 yd/s asked to turn 90 degrees (Tools, 2026-11-16)

Integration's question (from Coverage's glance work): on ball-behind flats a receiver at about 5 yd/s on +y is requested (9.6, 0), then (6, -7), and achieves (2.4, 1.7) in 0.6 s; velocity along the request builds at about 3 yd/s². Is that the movement law or the play? Three readings, one operator, no fix.

## Operator (`scripts/diag/route-speed/redirect-op.mts`, the same code for all three)

10 Hz positions, velocity by central difference over ±0.1 s. An event: four straight frames (headings within 8° of each other) at 4.5 to 5.5 yd/s; the turn begins at the first frame more than 12° off the stem and the onset is the frame before it. For tracking, the exit heading is that of the displacement 0.8 to 1.4 s after the onset and the event counts when the turn is 80 to 130° (a body asked 90° is still curving then; its displacement heading is a few degrees short of the request) and he holds that heading to within 20° with at least 3 yd/s. Reported without any exit heading, so the isolated body and the tracking are read alike: the time his heading is 60° or more off the stem (a 90° request is then within 30°), the turn achieved and his speed at +0.3 / +0.6 / +1.0 s, and his lowest speed in the first second. The time to within 30° of the exit heading and at least 3 yd/s along it is also given where an exit heading exists.

## Results

| | n | t to 60° turned p25/50/75 (s) | turned at +0.3 / +0.6 / +1.0 s (p50, deg) | speed at +1.0 s; lowest in the first second (p50, yd/s) |
| --- | --- | --- | --- | --- |
| isolated WR body, 12 generated WRs, stepBody and World alone, request (9.6, 0) held, facing on travel | 12 | 0.80 / 0.80 / 0.80 | 19 / 47 / 81 | 4.3; 3.6 |
| same, facing asked at the request | 12 | 0.90 / 0.90 / 1.00 | 20 / 43 / 64 | 5.6; 4.4 |
| NFL 2022, 9,713 pass plays, WR/TE/RB tracks (targeted receiver until the catch) | 566 | 0.70 / 0.80 / 0.80 | 21 / 51 / 77 | 4.3; 3.5 |
| sim engine-71 (e90c204c), 790 pass plays, 8 games, seed 101 | 60 | 0.60 / 0.70 / 0.80 | 24 / 55 / 81 | 4.9; 3.6 |
| sim engine-69, 692 pass plays | 118 | 0.70 / 0.70 / 0.80 | 25 / 53 / 78 | 5.1; 3.9 |

Time to within 30° of the exit heading and at least 3 yd/s along it, where the tracking has an exit heading: NFL 0.60 / 0.70 / 0.80 s (p25/50/75; speed at +0.3 / +0.6 s 3.8 / 3.6); sim engine-71 0.60 / 0.70 / 0.80 (3.8 / 3.9). The isolated body, which is asked exactly 90° and so has an exact request, reaches 30° and 3 yd/s along it at 0.75 s with the facing on travel and 0.90 s with the facing asked at the request, with or without the World (the World alone and stepBody give identical numbers: the kinematic path and the solver agree on a lone body).

## In play against the same body alone

`scripts/diag/route-speed/redirect-inplay.mts`: 2,304 staged pass plays (every concept but screens, cover 1 / 2 / 3, twelve seeds, mirrored), 11,290 receiver tracks, 27 redirects found by the operator. Each body's state just before the onset is replayed alone with stepBody under the intents the play gave him over the next second.

| | in play | alone under his intents | his request off the stem |
| --- | --- | --- | --- |
| turned at +0.3 s (deg) | 32 | 33 | 98 |
| turned at +0.6 s | 57 | 60 | 102 |
| turned at +1.0 s | 83 | 83 | 109 |
| speed at +0.3 / +0.6 / +1.0 s (yd/s) | 4.2 / 4.3 / 5.2 | 4.2 / 4.3 / 5.3 | |

The world adds nothing to what the body does alone under the same request (the trunk, contacts and the solver are not slowing him). The play's request is a near-full redirect from the first tick (98° off the stem at +0.3 s).

## The case in the log

Coverage's receiver: asked (9.6, 0) then (6, -7), achieves (2.4, 1.7) at 0.6 s (speed 2.9, about 35° off the first request). The isolated WR under the same two requests is at speed 2.6 (facing on travel) to 3.3 (facing at the request), heading about 45°, at +0.6 s. So the log's receiver is where a lone body is. The "3 yd/s²" along the request is the friction ellipse: the lateral force that turns him comes out of the same grip that would speed him up along the new direction, so his speed falls from 5 to about 3.6 yd/s by 0.5 s while his heading turns, and it rebuilds as the heading closes (4.3 at +1.0 s).

## Reading

- The isolated body, the sim in play and NFL tracking agree on a 90° redirect from about 5 yd/s: about 0.7 to 0.8 s to be 60° round, 21 to 25° at +0.3 s, about 50° at +0.6 s, about 80° at +1.0 s, lowest speed 3.5 to 3.6 yd/s. Nothing here shows the redirect law is slow, in play or in isolation.
- In play equals alone to within 3° and 0.1 yd/s on 27 events (trunk swing, gait state and contacts add nothing measurable).
- Cautions: the isolated twelve WRs give identical numbers, so a WR's own traction and mass do not enter this redirect (a common cap does; I did not trace which constant); the NFL operator selects turns of 80 to 130° that he then holds for 0.6 s, which favours decisive redirects; the sim in-play set is 60 events from the export and 27 from the staged plays; the in-play replay uses the intents the play gave, not what a receiver would have chosen.
