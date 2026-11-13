# Live gaps: a run game that reads the bodies, not snap coordinates

Controller session, `claude/live-gaps`. Work in progress, **not merged**:
two native split-zone controls diverge (see Stage 2) and wide-zone width is
still well short of the NFL.

## The problem

- Defensive gaps were snap-time coordinates (`gapY`: ball + 0.65/1.95/3.25/
  4.2-4.6 yd). They did not move when the line moved.
- Free defenders reacted to only the first pulling guard/tackle, by at most
  1.5 yd.
- Zone blockers took a fixed short first step, then attacked the defender's
  current shoulder. Doubles never ran the track.
- The runner pressed a fixed snap-time aiming point.

## What changed (each switchable for A/B)

1. **Live gaps** (`src/sim/live-gaps.ts`, `LIVE_GAPS=0` off). Gaps are counted
   outward from the center in the observer's delayed picture of the surface
   (OL and inline ends). A puller or climber leaves the surface; if his stance
   lay between present bodies he leaves a vacancy, so neighbours keep their
   gap names. Equal to `gapY` at the snap. Used by free run fits and the
   engaged first-level stack shoulder. Tests: `test/live-gaps.test.ts`.
2. **Read the guards** (`PULL_READ=0` off). Every puller a free fit sees
   (off the surface, behind the line, moving across) shows where a blocker
   will arrive; the fit flows to keep box/spill leverage on his arrival, never
   against the pull.
3. **Zone track** (`ZONE_FLOW=0` off). Before contact, zone linemen (and
   stretch doubles) ask for the lateral speed that puts them on the
   defender's predicted playside shoulder when they meet, **planned with their
   own acceleration law** (speed approaches the request with time constant
   tau, so a short early distance needs an explosive start). Hips open half
   way toward the track. The first step uses the same plan.
4. **Teammates know the call.** Teammate spacing predicted a neighbour from a
   0.2 s old picture (standing still at the snap), so every zone lineman
   braked for the man beside him. A lineman running the called track now
   publishes the call's tempo (`Behavior.calledMotion`), and spacing predicts
   him from it. Private live decisions stay private.

Inside/split-zone doubles keep their own check/help/climb coordination.

## Findings on the way

- In the first second of outside/wide zone, about 45% of lineman decisions
  were unreleased doubles that never ran the track.
- From a standstill the body law gives about 0.35 yd/s after 0.3 s for a
  1.7 yd/s request, but full effort covers about 0.55 yd in 0.5 s (NFL OL
  0.58). The body could; the controller never asked.
- With OL spacing disabled entirely, OL displacement at 1.5 s rose 0.94 to
  1.28 yd: the stale teammate picture was a major brake.

## Results

`scripts/diag/zone-flow.ts` (paired inputs), median OL / DL play-side
displacement at 1.5 s:

| | Before | After |
|---|---|---|
| Outside zone | 0.60 / 0.63 | 1.13 / 0.94 |
| Wide zone | 0.67 / 0.70 | 1.14 / 0.98 |
| Inside zone | 0.61 / 0.61 | 0.94 / 0.82 |
| Power, counter | unchanged | unchanged |

Games (two 8-game cohorts, `scripts/diag/runblock/ab.sh`):

| | All off | Package | NFL |
|---|---|---|---|
| OZ OL lateral flow at 1.5 s | 0.68 / 0.66 | 1.48 / 1.54 | 3.40 |
| IZ OL lateral flow | 0.74 / 0.68 | 1.06 / 0.94 | 1.80 |
| Gap/pull OL flow | 0.26 / 0.28 | 0.30 / 0.34 | 0.82 |
| OZ front (box) flow | 0.42 / 0.45 | 0.65 / 0.57 | 2.80 |
| Outside zone median / <=1 yd / 4+ | 2.2 / 0.45 / 0.37 | 1.3 / 0.47 / 0.26 | - |
| Inside zone median / <=1 yd | 2.7 / 0.26 | 2.5 / 0.27 | - |
| Gap/pull median / <=1 yd | 1.4 / 0.43 | 1.4 / 0.44 | - |

All 12 mechanism guards hold. Live gaps alone (no OL change) slightly
improved runs in both cohorts (median 1.57/2.09 to 1.90/2.24).

## Why outside zone got worse: the leverage shed

OZ/WZ runs of 1 yd or less are stopped by a DL who **shed before contact**
(47 of 68 before, 61 of 77 with the package), 1.3-1.5 yd in the backfield.
`stepRunRep` frees a defender whenever `|phi| >= 1.1` measured against the
blocker's **fixed drive line** (`engagement.ts`). A running zone blocker who
gets ahead of his man produces exactly that angle; the rule awards the
defender a free release. In real football the same picture is the backside
of a reach: the cutback lane. This is an awarded outcome, not physics, and it
is the next repair. A live runner aim (aiming point read from live gaps) was
tried and made it worse (OZ median 0.9); it was reverted.

## Next

1. Replace the run leverage shed with an outcome the bodies decide (hand
   load and position relative to the runner's lane), in controller scope.
2. Then the runner: press, then read the frontside defender (bounce / up /
   back) from live gaps.
3. Defensive gap exchange when a defender is reached or washed.

## Stage 2 (same branch): release, stretch reach, defensive flow, live aim

Width diagnosis (`scripts/diag/zone/pair-probe.ts`, `stretch-shape.py`): it
is not physics or lineman speed. Free linemen stopped asking for speed after
reaching the shoulder; engaged pairs move at the compromise of the two
requests (correct physics); defenders never raced to keep their gaps; and
above all **the ball was narrow**. NFL outside zone, same operator:

| | NFL | Before | Now |
|---|---|---|---|
| OL lateral at 1.0 / 1.5 / 2.0 s | 1.86 / 3.42 / 4.96 | 0.40 / 0.68 / 1.08 | 0.9 / 1.4-1.7 / 1.9-2.2 |
| Box defenders 1.0 / 1.5 / 2.0 s | 1.33 / 2.80 / 4.47 | 0.12 / 0.40 / 0.73 | 0.3 / 0.7 / 1.1 |
| RB lateral 1.0 / 1.5 / 2.0 s | 1.50 / 3.60 / 5.70 | 0.60 / 1.00 / 1.80 | 0.6 / 1.1-1.2 / 2.2-2.3 |
| RB depth 1.0 / 2.0 / 2.5 s | -6.2 / -2.8 / -0.9 | -5.0 / -2.2 / -0.9 | -4.8 / -2.6 / -1.4 |
| Crosses the line at | 7.3 yd (5.1-10.5) | 3.5 yd | 5.2-5.3 yd |

Changes (switchable):

1. **Release by the blocker's torso** (`LEVER_FACING=0` off). The run
   leverage release used the absolute angle against a fixed frame, so a won
   reach freed the defender. It now uses the angle from the blocker's actual
   facing after the turn he can make this step.
2. **Stretch reach stays connected** (`STRETCH_REACH=0` off): forward work
   only keeps contact, and the lateral request never pulls back against the
   defender's play-side flow.
3. **Defensive flow planned with the body** (`DL_FLOW=0` off): an engaged
   lineman keeps his shoulder two reads ahead using the same lag-aware
   planner as the zone blockers. A reached lineman runs instead of
   penetrating: engaged DL depth at 3 s -1.1 to about -0.6 yd (NFL +0.2).
4. **Threat read** (`THREAT_READ=0` off): a free fit attacks when the back's
   seen path crosses the line at his gap and the back is at the surface,
   not when the back merely stands near it.
5. **Live aiming point** (`LIVE_AIM=0` off): the runner's designed aim is
   the play's gap read from the line he sees. It made runs worse twice while
   DL penetrated 1.1 yd; with (3) it works.
6. Gap surfaces carry width and motion (`gapSurfaceIn`, tested). A backer
   scrape with the gap's motion (`SCRAPE=1`) was mixed in games and is off.

Games (two 8-game cohorts), designed runs by family:

| | All off | Stage 1 | Now |
|---|---|---|---|
| Outside zone median / <=1 yd / 10+ | 2.2 / 0.45 / 0.15 | 1.3 / 0.47 / 0.08 | 3.1 / 0.31 / 0.24 |
| Inside zone median / <=1 yd | 2.7 / 0.26 | 2.5 / 0.27 | 4.3 / 0.19 |
| Gap/pull median / <=1 yd | 1.4 / 0.43 | 1.4 / 0.44 | 2.0 / 0.38 |
| Duo median / <=1 yd | 2.1 / 0.22 | 2.0 / 0.17 | 2.7 / 0.08 |

All 12 guards hold. Run p90 rose to about 14.5 yd (NFL 10): watch the tail.
1,346 of 1,348 assertions pass. Two native split-zone controls diverge:
the Tite witness (the tight end now keeps the end, so the tackle never
collects him) and the Bear double (a working nose keeps the center-guard
double from releasing within 2 s).

Width is still about half the NFL. The back crosses at 5.2 yd, not 7.3,
and gains only 1.1 yd laterally by 1.5 s (NFL 3.6): his press point is the
line (`los + 0.6`), so his path is diagonal, while NFL backs stay deep and
flat. Next: the back's stretch track and press/bounce/cut read, then
defensive gap exchanges.

## Stage 3: the other half of the width (stretch mesh, linebackers)

`scripts/diag/zone/stretch-gaps.py` compares the whole outside-zone play with
NFL tracking (same operator). Before this stage, ranked:

| | NFL | Sim |
|---|---|---|
| QB alignment for OZ: under / gun / pistol | 77 / 16 / 7 % | 33 / 57 / 10 % |
| Under-center handoff: time, width, depth | 1.4 s, 2.9 yd, -5.1 | 1.45 s, 1.0 yd, -4.3 |
| Back's speed at 1.0 / 1.5 s | 4.3 / 5.7 | 2.0 / 3.0 (braked into the mesh) |
| Back turns upfield | 1.8 s at 4.2 yd wide | 1.3 s at 1.0 yd |
| Backers sideways at 1.0 / 1.5 / 2.0 s | 1.3 / 3.05 / 4.9 | 0.05 / 0.35 / 0.70 |
| Center / play-side guard sideways at 2.0 s | 5.2 / 4.7 | 1.6 / 1.3 |
| Box DL sideways at 2.0 s | 4.5 | 1.1 |

Changes (switchable):

1. **Stretch mesh on the back's track** (`STRETCH_MESH=0`): from under center
   the QB opens and gets depth to hand off outside the tackle's stance; the
   back arrives running and rides his track; the QB follows him for the last
   moment. Back's speed 3.6 / 4.3 yd/s at 1.0 / 1.5 s, lateral 2.6-3.1 at
   1.5 s, turns up at 1.6-1.7 s 3.4 yd wide, first contact 2.75 s (NFL 2.8).
   Outcomes unchanged (OZ median 3.1).
2. **Backers** recognise run by 0.5 s (92%) but asked for a proportional
   drift the lag law made late. Now: lateral work toward a *moving* landmark
   is planned with the body (`LB_PLAN=0`); the gap's motion (the line's
   flow, the earliest zone key) carries the landmark (`SCRAPE=0`); and once
   the back's track declares a direction a backer keeps inside-out leverage
   on him (`FLOW_READ=0`). Backers sideways at 1.5 / 2.0 s: 0.35 / 0.70 to
   1.0 / 2.0 (NFL 3.05 / 4.9).
3. **Climbs intercept** (`CLIMB_INTERCEPT=0`): climb and lead blocks aim at
   the backer's intercept point under the climber's own reach law. Neutral.

With realistic backer flow, **OZ outcomes fall** (median 3.1 to 1.7 yd,
stuffs 0.33 to 0.39). Backers now make 36 of 112 OZ first contacts; 16 were
assigned to a climber who never engaged them and 14 had no blocker. The
defence is closer to the NFL; the offence lacks its real counters. Per the
project rule this is kept: the next work is on the offence.

Next:
- Why climbers never reach flowing backers (combo release timing, traffic,
  path) and who should own unassigned backers.
- The back's cutback read behind over-flowing backers (press, then bounce /
  up / back).
- Interior line width (center/guard 1.5-1.9 vs NFL 4.7-5.2; DL 1.2 vs 4.5):
  engaged-pair lateral speed, see the physics question on the workboard.
- OZ formation mix (77% under center in the NFL, 33% here) is play-calling.

## Stage 4: following the physics session's guidance (steps 1-3)

[Guidance](wide-zone-guidance.md), in its order:

1. **Anchor on lost depth only** (`ANCHOR_SPLIT=0` off). The anchor braced
   against the whole felt load, which includes a flowing defender's lateral
   push, so it reversed play-side requests (13/26 ticks on RG-DT_S). It now
   triggers on load and motion toward the blocker's own backfield, braces
   upfield and then spends little on lateral work (one traction budget);
   lateral co-flow under load keeps the lateral request. Bull-rush native
   request driven 0.48 yd (old anchor 0.60, none 1.01); zone play-side
   blockers keep about 1.3 yd/s instead of sagging to 0.95.
   (Bracing along the drive line or the body line was tried first: neither
   held the bull rush.)
2. **Keeper eligibility from the achieved torso** (`KEEPER_TORSO=0` off).
   `keeperCandidate` and the climber's `readJoinedSurface` both used the
   fixed-frame angle; both now use the angle between the keeper's actual
   chest and the man (the reader uses his own delayed picture of the
   keeper's facing). No credited turn. The split-zone Bear control passes
   again.
3. **Planned climbs** (`CLIMB_PLAN=0` off). One acquired picture per read;
   candidate meeting points on the backer's predicted path at his play-side
   shoulder, each previewed with `previewFreeMovement` (own facing, support,
   braking); the earliest attainable one is held until the next read,
   otherwise the closest approach (traced as unattainable).

`scripts/diag/zone/climb-probe.ts` (24 native OZ/WZ inputs): 60 backer
assignments; 28 climbers became free, 19 reached loaded contact; 10 freed
climbers never touched the backer (6 with an attainable plan at some read);
many doubles never release anyone before the runner arrives. The leak is
now the release decision, not the climb path.

Games are within cohort noise (OZ median 1.7 to 2.1; IZ medians swing 2.4 to
4.3 across arms of the same code family at about 120 runs per arm, so single
arms do not rank changes). All guards hold. Only the Tite witness diverges.

Open with physics: the run release still credits `turnRate * dt`; the
guidance asks not to, but without it the diagonal inside-hip contact control
(a blocker facing straight downfield, defender 104 degrees off) is lost.

## Stage 5: double release, path protection, and the run shed roll

**Double release** (`FLOW_RELEASE=0` off). A stretch double released only when
the backer came within 4.2 yd. On stretch the backer flows before he fills,
so the release came late. A combination blocker now also releases on a
backer whose seen motion brings him within reach in half a second, or who
is seen flowing play side faster than 1.5 yd/s.
`scripts/diag/zone/combo-probe.ts` (30 doubles): mean release 1.69 to 1.58 s.

**Path protection after contact** (step 4, `scripts/diag/zone/path-probe.ts`:
48 native OZ/WZ inputs, 3 rosters x 2 fronts x 2 flips x 2 seeds). It traces
every run rep from contact to its end: where the blocker stands on the line
from the defender to the runner, chest angle, peak hand load and how the
rep ends. A first-contact ledger then names the defender, his planned
blockers and their reps. It found:

- Linebacker blocks mostly hold: 60 of 105 are still on at the stop,
  covering the path on 78% of ticks. Only 3 of those backers make first
  contact.
- First contact by defender role: play-side end 14, middle linebacker 13,
  tackles 11. The end typically hits 0.9 yd behind the line.
- 8 of the end's 14 got off through **the shed roll**, often with the
  blocker covering the path on nearly every tick (34 of 35, 28 of 30). The
  roll was `rng.chance(logistic(ratings))` followed by a scripted shove on
  the blocker. It awarded a block win from ratings. Each failed roll also
  gave the blocker +0.2 hand control he had not earned.

**Physical run shed** (`SHED_PHYSICAL=0`: the old roll). The decision is
unchanged: a defender whose runner is within 3.5 yd tries to get off toward
the ball side for two decision intervals (tag `shed-attempt`). The outcome is
physical. He works across the blocker's ball-side shoulder at full lateral
effort while pressing into him. The hand fight sets the hands as before
(the defender acts on the joint when he controls the hands). The rep ends
only by the existing geometry: lost leverage against the blocker's torso,
separation beyond arm reach, runner past, or a fall.
A first version that also stripped the blocker's steering grip during an
attempt released linemen too easily (DL-released stuffs 141 to 171); it
was dropped.

| Same inputs (path probe) | Roll | Physical |
|---|---|---|
| OZ/WZ gain, mean / median, yd | 1.09 / 0.5 | 2.09 / 0.9 |
| Play-side end first contact depth, yd | -0.9 | -0.7 |
| IZ / power / counter / duo mean gain, yd | 2.56 / 0.64 / 1.85 / 2.65 | 2.23 / 1.41 / 1.51 / 2.77 |

Games (`ab.sh`, 8+8 games): median 1.88/2.40 (roll) vs 2.00/2.02; stuff
rate 0.36/0.38 vs 0.39/0.42 (about one standard error); points 55/47 vs
60/47. All guards hold. This is neutral within cohort noise. It is kept
because the roll violated the model rules, not for a statistic.
`test/run-shed.test.ts` fails under the roll.

What remains is the hand fight itself. `control` is still a ratings-driven
random walk that sets the hand joint's push, steer and hold. Replacing it
belongs with the contact-point hand forces (HANDS2), after the physics
session's angular-contact work.

**Assignment audit** (step 5). Two fixes, one in the measurement:

- *Receiver stalks shared no ledger* (`STALK_CLAIM=0`: old). Each receiver
  took his nearest defensive back or linebacker, so 106 of 602 game runs had
  two or three receivers on one man (Y, Z and H all on SS) while a backer
  had nobody. Receivers now share one ledger: closest unclaimed pairs first,
  skipping backers a lineman or lead already owns; only a receiver with
  nobody left helps. Duplicate-stalk plays 106 to 4; stuff rate 0.405 to
  0.373, median 1.78 to 1.92 yd (cohort noise is similar in size); guards
  hold. `test/stalk-ledger.test.ts` fails on the old rule.
- *The run attribution called a double's backer "never assigned"* until the
  double released (it read only `plan.target`). It now records the backer
  from the snap ("double backer, never engaged").

Corrected linebacker first contacts (577 runs, 16 games):

| Class | Count |
|---|---|
| Double's backer, never engaged | 106 |
| Assigned, never engaged | 36 |
| Engaged, released before contact | 27 |
| Never assigned | 23 |

The 23 are mostly numbers: an extra box defender, or linemen blocking a
nickel or corner walked onto the line. The large leak is doubles that do
not release to their backer before the runner arrives, across inside zone,
duo and stretch. That is the next controller mechanism; `FLOW_RELEASE`
covers only part of it.
