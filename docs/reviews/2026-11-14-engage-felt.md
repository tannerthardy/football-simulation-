# ENGAGE_FELT: engaged men read the man as they have him (Flex, 2026-11-14, engine-64)

The standing rule: every information cheat found is removed when found. Integration (2026-11-14) found the engaged
pass set, the ride and the run drive requesting `facing: atan2(d.pos - b.pos)`, the bearing to the man's true,
undelayed position. ENGAGE_FELT (off; `ENGAGE_FELT=1`) gives each engaged man a picture of the man he is engaged with
(`feltMan`): by touch at the hands' delay (0.06 s, the delay punch() already feels the man at) while either man's hands
carry load, by sight (0.12 + 0.12 x (1 - read) s, REP_SEEN's hands-off delay) when they do not. Off is bit-identical to
develop (seed 999, f45b8a7e377c73b2).

## The audit: every read of the opponent's true state in src/sim/engagement.ts

`d` is the defender, `b` the blocker. A read of a man's own body is not listed. **Fixed** reads go to the felt picture
under the flag; **kept** reads stay true, with the reason.

### Pass rep (stepPassRep, rushIntent)

| read | what it decides | |
|---|---|---|
| engaged pass set `facing` (d.pos) | the blocker's facing request | fixed |
| `riding` (pastAlongPath on d.pos, d.vel, e.phi; PASS_RIDE's persistence on d.vel) | his decision to ride the man | fixed; the felt past decides the ride |
| `past` + out of reach -> beat | the rep's end: the man past him and beyond his arms | kept: outcome geometry, the World's (REP_SEEN's rule) |
| lane shift `(d.pos.y - b.pos.y) * outside` | working an outside rush wide of the lane | fixed |
| TACKLE_ANCHOR's edge test (d.pos.y) | anchored inside-half play | fixed (flag off in the stack) |
| the legacy ride (PASS_RIDE=0: d.vel, d.pos, facing) | his ride request | fixed |
| `front` base (d.pos) under REP_SEEN | cancels exactly against `known` | kept: no effect (front = known + the lane offsets) |
| the rusher's corner, edge, stall and cleared aims (b.pos) | where he runs off the blocker's body | fixed |
| EDGE_ARC's past-the-hips test (b.pos.x) | the arc's turn | fixed (flag off) |
| rushIntent's leverage (e.phi) and the blocker giving ground (b.vel) | the rusher's between-moves intent | fixed |
| `axisOf` (the true QB's line from the rusher) | the rep's frame for leverage, the mirror's lateral axis, the move geometry | kept for now: the requests that matter already take their own QB picture (qbD, qbB under REP_SEEN); moving the frame is part of the request law (the yaw note's step 1) |
| `e.phi` (measurePhi on the true bodies) | leverage for the outcome tests and the old control drift | kept: outcome geometry; the decisions that used it (ride, intent) are fixed |
| canRidePassContact (d.pos against his extension and facing) | whether a loaded hand still holds the man | kept: physical retention of a contact |

### Run rep (stepRunRep)

| read | what it decides | |
|---|---|---|
| run drive `facing`, REACH_RACE's opened facing (d.pos) | the blocker's facing request | fixed |
| seal `offset` (d.pos with the felt velocity) | his lateral correction | fixed |
| SEAL_HOLD `raw` (d.pos) | the leverage he holds | fixed |
| `gap`, `forward` (d.vel), `ahead` | his drive pace and connection | fixed |
| wallFeet / reachFeet `rel` (d.pos) | the wall and reach footwork | fixed |
| the reach steer's `leaving` (d.pos, d.vel) | whether he steers a man coming off | fixed |
| `toD` / `behind` (d.pos against his torso) | the block lost behind his shoulders | kept: outcome geometry (his hands and chest work in front of the torso the World turned) |
| SHED_PAST's `rb` (b.pos) | the body no longer in the defender's way | kept: outcome geometry |
| the defender's facing (b.pos), ZONE_RUN's opened facing | the defender's facing request | fixed |
| `localBlocker`, SHED_ROUTE's `routeBody` by touch (b.pos) | the support runner's and shed route's local body | fixed: touch at the hands' delay, not undelayed |
| ZONE_RUN's reach speed, race-over `across`, `shoulder`, pace (b.pos, b.vel) | the race for the shoulder | fixed |
| TOUCH_READ's touch velocity (b.vel) | the flatten read | fixed (flag off) |
| runHandDrive, DL_HANDS, the reach steer's joint drive (self / other on the joint) | the joint's drive direction | kept: physics of the joint |

### Elsewhere in engagement.ts

| read | what it decides | |
|---|---|---|
| helperIntents' facing and DOUBLE_TRACK spot (d.pos) | the helper's request | fixed (the helper's own felt picture) |
| prepareClimberFeet's flow-side test (d.pos.y) | which double member goes with the flow | fixed (his sight of the man, already read below it) |
| updateEngagements' `apart` (true bodies) | the rep ends when the bodies are apart | kept: physical |
| inBlockReach, placeBoth, punch's first gap, refitTime, firstHands, setHands, longArm, clubHand, strikes | contact, joint and strike geometry and timing | kept: physics |
| drivenBack (the defender's felt load), armBalance | his own body | not a read of the opponent |

## Lane read

Engine-64 (develop 3d445688) + ENGAGE_FELT only, seeds 11 / 23 x 8, against default; the same operators on sim exports as
on NFL tracking (edge-rush.py, pressure-source.py, fall-proxy.py). Off is bit-identical to develop (seed 999,
f45b8a7e377c73b2); the patch on develop and this branch give the same game with it on (d7b7c5273350f548).

| | default | ENGAGE_FELT | NFL |
|---|---|---|---|
| the tackle at first contact, rusher aligned wide: retreat / outward p50 | 2.50 / +1.00, +0.75 | 2.25-2.50 / +0.75 | 2.50 / 0.00 |
| the same, very wide | 2.75 / +0.50 | 2.75 / +0.50, +0.25 | 3.00 / -0.25 |
| first contact lands wide | 26 / 27% | 28 / 24% | 49% |
| inside at the edge win | 72 / 60% | 77 / 63% | 47% |
| edge win (within 2 yd of the QB) | 10 / 8% | 11 / 8% | 13% |
| pressured | 32.0 / 26.2% | 32.9 / 28.3% | |
| interior pressure, of dropbacks | 11.4 / 8.5% | 11.1 / 9.5% | |
| OL proxy falls (under 0.5 yd/s for 0.8 s after moving) | 5.2 / 7.0 /100 | 7.3 / 5.8 /100 | |
| rusher off the tackle's chest at +0.4 s, p50 (outside half / wide) | | 0 / +1, 0 / 0 deg | 15 deg (engaged-yaw.py) |

The fresh run set (1295 plays, paired against the reference): +0.14 (SE 0.10); every concept within its SE (OZ +0.15,
IZ +0.29, gap +0.04, duo +0.02, toss +0.66 on 45, draw +0.04). Missed + broken 0.271 -> 0.299: broken 0.094 -> 0.127, of
which engaged-grab breaks 0.040 -> 0.053.

**Dither: over the recorded budget on one stage.** With the flag on, carrier / spacing is 0.202/s (59 events in 292
moving s) against a budget of 0.174 (recorded 0.122 on develop 121d458b). Today's off arm on the same panel is already
0.140/s (45 events in 323 s), so the step is 14 events, about 1.4 sigma. The blocker's own stages do not move: block /
engagement 483 -> 484 events (0.109 -> 0.116/s on fewer moving seconds), block / spacing 277 -> 294; rush / engagement 87
-> 79. ENGAGE_FELT does not touch the carrier's controller; his spacing re-aims follow the bodies around him, which the
changed blocks place differently. Read: not oscillation in the felt blocks (their engaged re-aims are flat); the
carrier panel is small (292 s). Not explained further yet.

## Read

- **It is honesty, and it barely moves the pass rep.** Every edge row stays within a few points of default; the rusher
  stays on the tackle's chest (0-1 deg at +0.4 s against the NFL's 15), as expected while the request is still "face the
  man": the felt picture is 0.06 s old while the hands are on. The facing question is the request law (the yaw note).
- **The run game is flat to slightly up** (+0.14, SE 0.10), with broken tackles up 0.033 a run, 0.013 of it engaged
  grabs: a run defender engaged on a blocker now acts on a picture of him 0.06-0.24 s old. Not diagnosed.
- **Dither:** the carrier / spacing stage is over the recorded budget, 1.4 sigma over today's off arm; the blocks' own
  re-aims are flat. It needs a decision: land as honesty with the budget re-recorded, or a targeted look at which carrier
  reversals are new first.

## Attribution (Integration, 2026-11-14), and a fix

**A defect in feltMan, found and fixed: the touch / sight hand-over was a step.** `felt-switch.mts` (seed 11 x 2): 96%
of feltMan calls were by touch, but the hands' load crossed zero about once per engaged second, and 86% of the sight
stretches were a single tick. Each one made the picture jump from 0.06 s old to 0.12-0.24 s old for a tick and back: the
picture stepping back in time about 0.54 times per engaged second, by 0.06-0.18 s (REP_SEEN's `known` and RUN_FEEL's
`runSeen` have the same step in the default engine). The fix: a hand unloaded for a tick still has the man; from the
last loaded tick the delay ages continuously toward his sight delay over his reaction time (so the picture never steps
back in time), and a reloaded hand is fresh information at once; kept per pair in the play, delays held to 0.01 s.
Under the flag `known` and `runSeen` use the same picture. After it the picture steps back in time on 0.01% of ticks
(largest 0.12 s); touch regained makes it fresher by more than 0.03 s on 3.1%. Off is still bit-identical
(f45b8a7e377c73b2); on, the patch and the branch give the same game (df786187313e600c).

**Dither, after the fix: passes.** Carrier / spacing 0.174/s (51 events in 293 s) against its budget of 0.174 (today's
off arm 0.140, 45 events in 323 s); the blocks' own stages flat (block / engagement 482 events, rush / engagement 78).
Per play (`carrier-dither.mts`, the same 135 plays, each its own accumulator): 26 plays change, 15 up and 11 down, net
+6, and one play carries +8 (wz_strong seed 1, 0 -> 8). By concept the reversals move between runs (wide zone 1 -> 15,
outside zone weak 12 -> 8, counter 8 -> 4, inside zone 7 -> 3); the bodies within 2 yd at a reversal are fewer
opponents, engaged and free (engaged 23 -> 14, free 98 -> 53), not more. The carrier's controller is untouched: his
spacing re-aims follow the bodies around him, and the changed blocks send the same snaps down different paths.

**Broken tackles: not feltMan.** feltMan is called only in the engaged reps (pass, run, helpers); nothing in
tackle.ts, the carrier or the grab reads it. `break-trace.mts` (seed 11 x 6, every grasp and break on designed runs):

| tackler when he took hold | default: grasps a run, broken a run (of grasps) | ENGAGE_FELT |
|---|---|---|
| engaged (the engaged grab) | 0.351, 0.044 (13%) | 0.373, 0.045 (12%) |
| off a block within 1.0 s | 0.466, 0.012 (3%) | 0.495, 0.014 (3%) |
| free | 1.590, 0.028 (2%) | 1.484, 0.045 (3%) |
| all | 2.41, 0.084 | 2.35, 0.111 |

The engaged and off-a-block rates are flat; the rise is free tacklers' holds slipping (7 -> 13 events), men feltMan
never reads for. On the fresh run set after the fix: +0.10 (SE 0.10), broken 0.094 -> 0.120 (engaged grabs 0.040 ->
0.052), missed 0.217 -> 0.216. The run set's engaged-grab rise (about 16 events in 1295 runs) is not reproduced in the
games' per-grasp rate; both are within their counts' noise.
