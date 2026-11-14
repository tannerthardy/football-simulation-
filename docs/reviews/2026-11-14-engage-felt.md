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

(pending: seeds 11 / 23 x 8 with EXPORT_FACING, the fresh run set, dither with the flag on)
