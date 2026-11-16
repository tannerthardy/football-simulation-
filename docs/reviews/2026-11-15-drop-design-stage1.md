# Drop design, stage 1: eyes and feet coupled perfectly (design, not built)

The user's direction (2026-11-15): first make the coupling perfect, see what that moves, and only then add the error
(young quarterbacks who can't get through the progression in the rhythm, or lock on elsewhere). Measured basis:
[the drop measurements](2026-11-15-drop-measurements.md). Coaching basis:
[the chapter](../football-handbook/qb-drops-and-pocket.md), sections 2-4.

One flag, `QB_FOOTWORK` (off), numeric with bits until the game read so a mixed card can be attributed (as
`NEAR_FIELD` and `BALL_EST`): 1 = reads on steps and the release on a step, 2 = the open-hip drop, 4 = climb / slide /
reset. It collapses to one switch when it flips.

## Before it: the plan's clock (`PLAN_CLOCK`, off)

Checked first, so perfect coupling is not coupling to stale timing (`scripts/diag/escape/rhythm-check.ts`, engine-68,
157 read routes that declare a vertex break). The compiled break times are current: the true break minus the
compiled one is p25/50/75 -0.20 / -0.05 / +0.15 s (pressed receivers later). But `planBreakAt` added the
snap-secured time to a time already on the play clock, so his belief of every installed break was 0.49 s late
(p50) wherever his forecast could not place it. That is a clock bug in DECLARED_BREAK's readiness, not a design
choice. It is fixed behind its own flag and read as its own arm. With it on, his belief minus the true break is
p25/50/75 -0.15 / +0.10 / +0.25 s (off +0.29 / +0.49 / +0.69). Stage 1 is built and read on `PLAN_CLOCK=1`, so it
is not measured against the late belief.

## What exists to build on

- `plan.rhythm` (read compiler, `runtime.ts`): each read's coached step ('set', 'hitch', 'hitch2'), its compiled time
  and the time its route is ready. It is computed and nothing in the quarterback reads it.
- The drop branch (`qb.ts`): the set point, the rhythm throw from the last step, `facingDown = 0`.
- QB_GATHER's hitch to the read (on in the reference): a hitch that follows his eyes.
- The physics: `directionalSpeedFactor` caps speed by chest against travel; the moving-thrower price (`missSigma`,
  THROW_PLATFORM where on) prices a throw on the move.

## The four parts

1. **The read waits for its step.** His progression index moves to read k when his feet reach read k's step from
   `plan.rhythm`, not when a dwell expires. The steps are the plant (the set), the hitch's landing, and a second
   hitch or climb's landing. The dwell stays as the time a look takes: a read whose step has come and whose look is
   not finished is still being read. A read with no step in the plan (a late read, an outlet past hitch2) moves on
   from the last step plus his dwell, as now. Footwork events are his own body's (his base under him after a forward
   movement), not compiled times. A drop that ends early (pressure, a hot) moves the steps with it.
2. **The ball leaves on a step.** A throw decided on read k starts its load so the release falls on the landing of
   the step it is decided on: the plant for a set read, the hitch's landing for a hitch read. A throw decided between
   steps waits for the next landing or, under pressure, goes from where he is (the existing moving-thrower price).
   There is no "stop, then wind up". The load overlaps the last step, as the existing rhythm throw already does from
   the drop.
3. **The drop opens the hips.** In the depth steps his chest points between downfield and read 1's side: the NFL's
   22-59 degrees off downfield through the drop is the check, not a target. He squares in the hitch and windup
   (existing motion facing). He opens to read 1's side (the side of the plan's first read; to the field when read
   1 is in the middle). The cost is his view of the backside: his chest and head turn away from it, so a backside
   rusher is acquired later. That is not assumed: the probe row is blind-side pressure detected later (his felt
   picture's first fix on the backside rusher against the rusher's true time to him), open-hip arm against off.
   The pace comes from the rhythm, not a speed to a landmark: the drop's steps are timed so his plant lands when
   read 1's route is ready (the NFL drop is slower, deeper, and still moving at the release 40-65% of the time;
   ours hurries to a spot and waits). The directional cap now acts on a crossover, not a backpedal. Measured backward speeds (NFL 1.9 / 2.2 / 1.8 / 1.1 yd/s through a short gun drop, ours 2.6 / 3.1 /
   2.5 / 1.6) are a check of the result.
4. **Pocket movement is a footwork event.** Taught as "edge high, climb; interior push, slide, reset". A climb or a
   slide of one gap, decided from his felt pressure picture once (hysteresis: enter on the man's time to him under
   his remaining need, exit by a margin on the far side), is itself the next step. Its landing, the reset, is where
   the next read comes. This makes QB_GATHER's hitch and the climb the same kind of step, and it supplies the slide
   the default engine lacks (interior man: NFL slides away 29%, ours 3%). QB_AVOID's two failures are kept in mind:
   the read must not freeze while he moves (it is waiting for the reset, which is a step), and moving off a free
   rusher alone did not help.

   The choice is from the pressure he perceives and is committed: the dither panel (`test/dither-budget.test.ts`,
   `dither-core.ts`) covers the QB's controller with it on.
5. **The hot by the third step** (Rules + Coaching, `tannerthardy/football-simulation-#776`, from Hewitt: "the
   quarterback must release the ball by the third step whenever possible"). BLITZ_READ's flat 1.6 s bar on a hot
   route becomes a footwork event: a route is a hot answer if it can be thrown by the drop's third step, so the bar
   depends on gun / three-step / five-step. On post_cross and trips_outs the "no hot" is probably that bar against
   a planted 6 yd hitch from the gun. The seven-man play-action concepts (pa_post_dig, pa_shot) have no designed hot:
   a free man there is beaten or the ball thrown away (QB_EVADE_UP, the throwaway), not a hot. Screens: no hot.

## Information

All four parts read his own body and his pictures: his feet and base are his own; the plan's steps are installed
knowledge. Pressure is the felt picture already used by `pressure()`. Nothing reads another player's assignment.

## How it is read

What Integration will look for, and what I report with it:
- (bit 1) the throw on a landing must not be a quantized delay: time to throw on the quick game and on free-rusher
  blitzes, against today's;
- the receiver-speed-at-release witness by route family (Tools' `scripts/diag/route-speed/nfl_effort.py` and
  `sim_effort.ts`, run from their branch) moving toward the NFL's;
- (bit 2) blind-side pressure detected later, measured;
- (bit 4) the slide chosen from perceived pressure and committed, with the dither panel.
Under center: we have 1 dropback in 517 under center (NFL 6%). That is the playbook's and formations', noted for
Rules; stage 1 does not touch it.


- Probe rows (the same operators, unchanged): `drop_reads_table.py` (read and eye changes on footwork events:
  expected near 100% by construction; release on a step), and `drop-steps.py` (chest, speed, release state, last
  0.6 s).
- Football rows on the paired staged set (`drop-staged.ts`) and then games: time to throw by concept, completion and
  yards a play by concept, sacks, and the late answer. The deeper set's late losses (y_cross) are the case the
  premise names: they should change.
- Expectation, stated before the run: quick game throws earlier (on the plant, not 0.2 s after a stop); later reads
  in five-step concepts come later where the hitch is later than the dwell, earlier where it is sooner; sacks against
  interior pressure fall with the slide; the backward speed falls toward the NFL's with the open hips. A loss in
  yards a play from late reads is not a veto: it is read against the step timing it came from.

## Stage 2 (after stage 1 is read)

The coupling's error, one mechanism, its own flag: his read progress and his footwork run on separate clocks, held
together by experience and decision-making and pulled apart by pressure. A young quarterback's eyes lag his feet (a
read not finished when its step lands is thrown late or skipped) or lock (the next step lands, his eyes stay).

## Bit 1, built and read (2026-11-15)

Built at 7d7e8e32 and 72d662cb. Paired staged set (`drop-staged.ts`, 192 plays a concept, PLAN_CLOCK=1 and
QB_TICK_PICTURE=1 in both arms).
- Attempt one moved his eyes off read 1 at the set + 0.1 s, before a read-1 throw on the plant could start (off,
  read-1 throws leave 0.40-0.55 s after the set). Attempt two gives each read his yes/no glance first.
- An implementation bug mapped steps by receiver. A key read reorders his reads, so read 1 waited for read 2's hitch.
  Steps now go by place in his current order, as coached.

| Concept | Yd/play off -> on | Sacks | INT | Time to throw |
| --- | --- | --- | --- | --- |
| stick | 8.67 -> 9.93 | 1 -> 1 | 6 -> 5 | 2.60 -> 2.65 |
| curl_flat | 9.30 -> 9.77 | 2 -> 1 | 5 -> 2 | 2.85 -> 2.75 |
| smash | 8.19 -> 7.48 | 15 -> 16 | 7 -> 6 | 3.15 -> 2.90 |
| dagger | 6.84 -> 6.42 | 13 -> 18 | 1 -> 6 | 3.50 -> 3.45 |
| smash, CONCEPT_DROPS=1 | 6.96 -> 8.16 | 12 -> 15 | 6 -> 6 | 3.25 -> 3.50 |
| dagger, CONCEPT_DROPS=1 | 6.84 -> 5.63 | 13 -> 24 | 1 -> 3 | 3.50 -> 3.60 |

- **Where beats fit their routes, bit 1 gains**: stick, curl_flat, and smash once its read 1 fits under CONCEPT_DROPS.
- **Dagger's losses are its install.** Its dig, read 1 after the key, is first open at 3.0 s. Its beat is the set at
  1.9 s (or the hitch at 2.7 s), so his eyes leave it before it opens. The off arm's dwell held him on the dig or
  brought him back to it (3.55-3.95 s), or took the back at 3.5 s. That is the install's EARLY fault
  ([the beat list](2026-11-15-beat-vs-ready.md), for Rules' drop marking), and stage two's veteran holding a beat on
  what he sees. It is not a reason to loosen stage one (Integration's ruling).

## Bit 1 with the hitch as a base reset, against #780's marking (2026-11-15)

**Integration's ruling, and the build (139dac55).** The hitch is a base reset at depth, one stride of his own drop:
the drop's time over its taught steps. It is turned to the read; the forward version belongs to bit 4's pressure
decision. The paired staged set used CONCEPT_DROPS=1 with #780's COACHED_DROP, in a scratch worktree (not committed).

Paired staged results:

| Concept | Yd/play off / step-up / reset | Sacks off / step-up / reset | throw_held off / reset |
| --- | --- | --- | --- |
| dagger | 6.84 / 6.14 / 6.57 | 13 / 26 / 16 | 1 / 1 |
| mesh | 11.32 / 13.34 / 14.98 | 7 / 18 / 12 | 0 / 5 |
| smash | 8.19 / 7.35 / 8.08 | 15 / 21 / 21 | 2 / 3 |
| drive | 12.28 / 13.47 / 14.44 | 2 / 4 / 4 | 1 / 2 |
| double_outs | 9.45 / 12.82 / 12.72 | 1 / 2 / 1 | 1 / 1 |
| flood | 13.16 / 19.98 / 19.44 | 4 / 7 / 5 | 4 / 5 |

Flood's gain is a coverage fault: the dig, 27 yd a throw at 86%, sent to Defense.

**What remains is LATE marking: a beat that trails an open route.**
- Smash's keyed hitch/corner is on the five-step hitch, so the key's low (the hitch, ready 2.0 s) waits for a landing
  at about 2.7 s. On 6 of its 9 new sacks the off arm threw it at 2.2 s.
- Mesh's read 2 (the mesh_under, ready about 2.1 s) is on the second hitch at 3.3 s. On all 6 new sacks the off arm
  threw it at 2.7-3.3 s.

**Trajectories (games, unpaired, about 240 gun dropbacks a side):**

| | Net upfield plant -> release p25/50/75/90 (yd) | Plays with a hitch run |
| --- | --- | --- |
| NFL | -0.15 / 0.00 / +0.12 / +0.93 | 21% |
| Off | -0.04 / +0.04 / +0.41 / +1.50 | 27% |
| Reset | -0.03 / +0.03 / +0.48 / +1.60 | 30% |

The excess over the NFL is the existing pocket spring and edge climb (bit 4's to replace), not bit 1.

Plant to release, like with like, p25/50/75 (s):

| | Short gun drops | 3.5-6 yd gun drops |
| --- | --- | --- |
| NFL | 0.2 / 0.5 / 0.7 | 0.3 / 0.6 / 1.1 |
| Off | 0.3 / 0.6 / 1.0 | 0.6 / 0.8 / 1.1 |
| Bit 1 | 0.3 / 0.7 / 1.1 | 0.5 / 1.2 / 1.5 (n 24) |

- On deeper drops the five-step beat (set + 0.8) plus the windup releases about 0.6 s later than the NFL's median, on a
  small cell.
- He still releases set (under 1 yd/s) on 98% of short drops (NFL 60%): the in-place gather is a stop.

**Who owns the release on the move.** "Ball out as the foot lands, with momentum" is not stage one's gather. In bit 1
he is set at release on 98% of short drops (NFL 60%). It needs the throw on the move: the last drop step or the gather
carrying his weight into the throw, priced by the moving-thrower model (THROW_PLATFORM). Bit 2 owns it, because bit 2
paces the drop's steps, and the step into the throw is the drop's last stride. Bit 4's moves (climb, slide, reset)
throw from the reset by the same mechanism.

**Ownership with Rules (Integration, 2026-11-15).** The plan hands over a step index per read, with a keyed pair as one
place. The quarterback derives its time from his own stride (his drop's time over its steps), which retires
FIVE_STEP_BEAT / RHYTHM_BEAT as seconds. Bit 1's own keyed-place merge (fd9f8c41) is deleted when that lands.

## The vertical cue (bit 1, a8133e5e)

**The cue.** A vertical is readable when its release is decided in his pictures:
- the receiver is out of the collision (2+ yd past the line, running), and
- he is even with or past the man over him along the stem (the nearest defender he believes within 4 yd across and no
  more than 2 yd shallower), or there is no such man.

The margin is read with his own judgment draw x 0.6 x (1 - awareness) yd, and once read it holds. Rules' readable event
plus the aim point (docs/reviews/2026-11-15-vertical-ready.md on #780): the window prices the throw to the aim point.

**Paired staged result** (four_verts and verts_hitch, PLAN_CLOCK=1 QB_TICK_PICTURE=1):

| | Vertical targets | Receiver depth at release p25/50/75 (yd) | Throw time p50 |
| --- | --- | --- | --- |
| NFL go | - | 6.2 / 9.2 / 13.1 | 2.6 s |
| Off | 82 of 384 | 12.4 / 13.7 / 14.6 | 3.15 s |
| On | 95 of 384 | 11.5 / 13.2 / 14.6 | 3.05 s |

Completion held (67 -> 66%). Readiness was not the binding constraint: the price is.

**Before touching the price** (Integration's caution): his accuracy belief should be his knowledge of his own spread.
Compute the spread his throw model produces at that distance and platform, against the default receiver's catch
radius. If the belief matches it, the receiver is the fault (BALL_EST), and the belief is re-derived on that receiver.
The Marinelli ball placement by the defender's position is for the touch note (not built).

## Bit 1 on the plan's step index, against #780 at 4ceba657 (engine-69)

**The build (f56ed6b3).** Bit 1 reads each read's `n` from the plan and lands step n at n strides of his own drop. It no
longer reads the plan's `at`, RHYTHM_BEAT or FIVE_STEP_BEAT.

**Paired staged, off -> on:**

| Concept | Sacks | throw_held | Yd/play |
| --- | --- | --- | --- |
| smash | 12 -> 14 | 5 -> 0 | 7.94 -> 7.82 |
| mesh | 1 -> 2 | 4 -> 2 | 10.06 -> 7.37 |
| dagger | 22 -> 21 | 10 -> 9 | 5.38 -> 5.18 |
| drive | 6 -> 4 | 5 -> 3 | 12.41 -> 13.23 |
| flood | 7 -> 0 | 8 -> 0 | 13.52 -> 20.24 (the Defense dig) |
| double_outs | 0 -> 1 | 0 -> 1 | 9.37 -> 11.92 |

**Mesh's loss is the corner.** Off threw it 14 times for 53.0 yd at 86%. On never threw it: on #780's `gun5` marking
the corner is read 1 on the set (about 2.0 s) and first open at about 2.7 s, so his eyes leave it before it opens. That
is an EARLY marking fault, and the corner's 53 yd at 86% is a coverage fault of its own.

**y_cross's late underneath** (ready 1.9-2.0 s, read 2 at the second hitch at 3.1 s) is the coached order (the
check-down after the cross), not a step fault. Whether it is still a throw at 3.1 s is to be measured.

## Design: the grass read (built 2026-11-16 as QB_FOOTWORK bit 8; results at the end of this section)

Rules + Coaching (docs/reviews/2026-11-15-vertical-ready.md on #780; Win With The Pass on mesh; Gonzalez, Wilhite and
Marinelli on the vertical) and Integration's rulings. A route thrown before its break, into space (a vertical, mesh's
corner, a post, a deep out), is read on the grass it is going to, during the drop.

**Why it is needed.** Bit 1's vertical cue was a first piece: it reads the man over the receiver, and only from his
set. Mesh's corner shows the general case. It is a first read decided by the last step with no dwell: "on his fifth
step, the ball should be gone or he should be on to his mesh read". He is told to "look at the area he is going" (a
point about 20 yd past the break), not at the receiver. Under bit 1 his eyes leave it at the set, before it opens, so
it is thrown 0 times in 192 (off: 14, at 53 yd a throw, which is also a coverage fault).

**The read: two events, in his own pictures.**
1. *Readable.* The landing area is decided: no defender in his picture sits in it or can reach it before the ball (a
   safety on top, a hook player under it), and the man on the receiver is beaten or under him (the leverage cue,
   generalized: even or past on a vertical, inside or underneath on a corner or post).
2. *Aim point.* The landing area itself: the forecast's point where the route will be at the ball's arrival.
   The window prices the throw between them (anticipation: throwing before the receiver is there, to where he will
   be). The window's own defender terms do the pricing at the aim point; the readable event only allows the look to be
   a throw.

**When he reads it.** A concept's first read can be read during the drop, not from the set. His eyes go to the landing
area from the drop's start (QB_EYES's halfway-through-the-drop rule becomes "the drop", for a grass read). The look is
a stage-one look: decided by his last step, no dwell. That is also what bit 2's open-hip drop toward read 1 is for: the
hips and eyes face the read's side while the feet go back.

**Who decides what.**
- The plan marks which reads are grass reads: routes thrown before their break into space. Today these are the
  'vertical' declare rule plus the corner and post families when they are read 1; Rules to confirm the list.
- The quarterback reads the grass from his pictures, never from the geometric truth. His awareness sets how
  cleanly he sees the landing area (a judgment draw on the margin, as the vertical cue); his experience sets how
  early in the drop he can take it.

**Placement** (for the touch note, not built). On the fade, Marinelli's read of the defender after the escape picks the
ball: behind him, the hole shot; even, over the top to the outside shoulder; over the top, low and outside. This is the
first sourced piece of touch.

**Witnesses**, ours against the NFL:
- mesh's corner thrown (0 of 192 today; off 14);
- receiver depth at release on go balls (NFL p50 9.2 yd; ours 13.2 with the cue);
- throw time on gos (NFL 2.6 s; ours 3.05).

**The price, before it is touched.** The vertical cue showed readiness was not what held the vertical: the price was.
Before the grass read is built, check his long-flight accuracy belief against the spread his throw model actually
produces at that distance and platform with the default receiver (Integration's caution). If they agree, the receiver
(BALL_EST) is what moves the witness, not the belief.

## Bit 1 on the card's base: develop + #780 at 385bb69f (2026-11-15)

**What was wrong with the earlier reads.** On develop, CONCEPT_DROPS=1 makes 'five' itself the deeper set (8.8 yd,
1.8 s). On this branch the deeper set had its own name, so the reads above ran the five-step concepts at gun5 depth.
Re-read on the card's base, the deeper set exposed two faults in bit 1, both fixed:
1. **The feet now keep the plan's clock** (a17e4600). Step k lands k strides after his set, whatever read his eyes are
   on. Before, a step was taken only when the read his eyes were on needed it. With his eyes held on a keyed pair and
   then moved to the outlet, he waited a stride: dagger, 11 of 13 new sacks the back thrown off at 3.40-3.55 s.
2. **The gather is a step in time, not a command that pins him** (668a7539). The pinned gather skipped the pocket
   spring's push off a nearby rusher for most of his time in the pocket. Dagger then had 10 throw_held on its 11 new
   sacks.

**Paired staged at the card's base, off -> on** (CONCEPT_DROPS=1 PLAN_CLOCK=1 QB_TICK_PICTURE=1, 192 plays a concept):

| Concept | Yd/play | Sacks |
| --- | --- | --- |
| dagger | 5.51 -> 6.07 | 18 -> 17 |
| smash | 8.90 -> 8.41 | 14 -> 12 |
| drive | 12.58 -> 12.40 | 6 -> 9 |
| mesh | 10.06 -> 7.97 | 1 -> 0 |
| double_outs | 9.37 -> 12.46 | 0 -> 1 |
| flood | 13.52 -> 22.39 | 7 -> 0 |

Mesh's loss is still its corner (the grass read, unbuilt). Flood's gain is the coverage fault on the dig.

**Patches.** The stack is in docs/reviews/patches/engine69-780-stack/: five layers on 385bb69f, plus all-five. The
QB / blitz / hot / read-plan / concept-drops core tests pass at the top (27 files, 117 tests).

## His facing, and what bit 2 now owns (2026-11-16)

Measured by scripts/diag/eyes/facing-swing.ts (dither-core's definitions applied to his facing; engine-70, 392 pass
plays).

**It is the request, not the body.** Requested facing: 1,121 re-aims, 186 reversed within 0.3 s. Achieved: 652 re-aims,
99 reversed.

**Where the reversals come from:**
- **His eyes and read changes (68).** With SHOULDERS_SET off, his pocket facing is square to his current read, re-aimed
  whenever his eyes or read index move. It aims at the receiver's true position, a small leak.
- **The play-action fake (61).** In the gun the fake's turn lasts about 0.2 s (fakeUntil is an absolute 0.7 s; he has
  the ball at 0.49 s). Holding the fake's side fixed removed only 6, so it was not landed.

**Bit 2 now carries:**
1. the open-hip drop toward read 1;
2. drop pacing from the rhythm, including the gun play-action fake and set (plant 1.6 s against the NFL's 2.2-2.7);
3. the step into the throw;
4. shoulders that set on a step toward a target he has decided on, not on a look (a look moves his eyes and head
   only);
5. his facing from his picture of the read, not its true position.

## Bit 2, parts 1 and 2 (dfb82071, b6a06d85)

Read with bit 1 (QB_FOOTWORK=3) on CONCEPT_DROPS=1. Engine-70, seeds 11 / 23 x 2 games, unpaired.

**Part 1: open hips in the drop, shoulders on a step.** His chest opens from downfield toward his picture of read 1 in
proportion to the depth dropped. His shoulders set at the plant and at each landed step, to his picture of the read he
is on; a look moves only his eyes and head.

| | Bit 1 alone | Bits 1+2 | NFL |
| --- | --- | --- | --- |
| Chest off downfield, short gun drop (25/50/75/90% of depth) | 0 / 0 / 0 / 0 deg | 11 / 22 / 31 / 37 deg | 22 / 41 / 55 / 59 deg |
| Requested facing re-aims / reversed | 1,312 / 235 | 521 / 88 | - |
| Reversals: eyes / read change / drop -> set | 76 / 37 / 33 | 4 / 2 / 2 | - |

Backward speed is unchanged. The NFL's chest is more side-on, as in the coached crossover; that is a statement of the
drop, not a number to fit.

**Part 2: the play-action fake from the measured mesh.** BDB 2025 (scripts/diag/eyes/nfl_pa_ride.py): the gun mesh comes
at 1.2 s, ridden 0.5 s; under center at 1.4 s, ridden 0.2 s. The fake is now held to the mesh plus half its ride (gun
1.45 s, under center 1.5 s), in place of an absolute 0.7 s.

| Gun play action | Snap -> plant | Plant -> release p50 |
| --- | --- | --- |
| Old 0.7 s fake | 1.60 s | 0.90 s |
| Measured fake | 2.30 s | 0.50 s |
| NFL | 2.20 s | 0.60 s |

The fake's facing reversals go 54 -> 0.

**Still to build:**
- (3) drop pacing for dropbacks (ours about 40% faster back and shallower than the NFL's);
- (4) the step into the throw, as a visible body state for Defense's QB_INTENT.

## Bit 2, part 3: the crossover and the drop's pace (651e599b)

Engine-71, seeds 11 / 23 x 2 games, unpaired, against parts 1+2.

**The crossover.** His hips open side-on to travel toward read 1's side over the first third of the depth, and hold.
The chest overshoots the NFL as far as part 1 undershot it:

| Short gun drop (25/50/75/90% of depth) | Chest off downfield | Chest against travel |
| --- | --- | --- |
| Parts 1+2 | 11 / 22 / 32 / 37 deg | 169 / 158 / 148 / 146 deg |
| Part 3 | 52 / 89 / 90 / 86 deg | 128 / 91 / 90 / 90 deg |
| NFL | 22 / 41 / 55 / 59 deg | 160 / 139 / 123 / 112 deg |

The NFL thrower sits between square and side-on. Proposed statement (for Integration): open on the crossover steps,
part-square on the plant step.

**The pace.** The drop now arrives at its measured time.

| Short gun drop | Backward speed at 25/50/75/90% (yd/s) | Plant -> release p25/50/75 |
| --- | --- | --- |
| Parts 1+2 | 2.6 / 3.1 / 2.5 / 1.5 | 0.4 / 0.7 / 1.2 s |
| Part 3 | 2.4 / 2.9 / 2.5 / 1.3 | 0.3 / 0.6 / 0.9 s |
| NFL | 1.9 / 2.2 / 1.8 / 1.1 | 0.2 / 0.5 / 0.7 s |

Deeper drops' plant to release is now the NFL's: 0.3 / 0.6 / 1.0 s against 0.3 / 0.6 / 1.1.

About half the remaining speed excess is distance and start: the drop covers 3.4 yd (NFL 3.1) and starts 0.1 s later
(0.7 s against 0.6).

## Part 3's facing, checked against the tracking; part 4 retired (2026-11-16)

**The crossover, by drop depth** (BDB 2025 gun, non-PA, chest off downfield p50):

| Depth | 1-2 yd | 2-3 | 3-4 | 4-5 | 5-6 | 6+ |
| --- | --- | --- | --- | --- | --- | --- |
| At the plant | 59 | 58 | 61 | 58 | 58 | 54 |
| Most open in the drop | 62 | 65 | 69 | 69 | 75 | 89 |

So he opens on the crossover steps, further the longer the drop, and comes back to about 58-60 deg at the plant
whatever the depth. Ours (d61ab662: side-on in the first third, then turned to read 1 on the plant stride): at the plant
46 / 36 / 32 deg, most open 79 / 90 / 90 deg (1-3 / 3-4 / 4+ yd). The shape is right; the angles need a per-step turn
and a partial square that are not sourced. Integration to rule.

**Part 4, the step into the throw, is retired into bit 4.** The windup already steps him toward the aim point
(STRIDE_SPEED by the delivery). That step is visible as arm 'load' -> 'deliver' plus his seen velocity, and is Defense's
front-foot rung. The NFL's speed at release (p50 0.9 yd/s short, 1.4 deeper; ours 0.4) is mostly not forward: set
35-60%, forward 8-16%, sideways 15-30%, back 18-19%. It is drift and reset, so it is pocket movement thrown from the
move: bit 4's.

**The stance at the plant** (Integration's re-diagnosis, measured). BDB 2025 gun non-PA dropbacks, chest bearing minus
the bearing to the eventual target at the plant:

| Target side | Unsigned p50 | Signed p50 | Chest off downfield p50 |
| --- | --- | --- | --- |
| Left | 64-75 deg | -64 to -75 deg | 33-45 deg |
| Right | 29-39 deg | -27 to -37 deg | 71-79 deg |

The rows cover every depth. On throws within 0.15 s of the plant, chest against target is p50 22 deg: he squares as he
throws.

The chest is always rotated the same way, to the throwing-arm side (most NFL quarterbacks are right-handed; no
handedness in the data), with the front shoulder toward the target. The amount depends on the target's side, so there
is no single constant. The flat 58-61 deg off downfield is this stance averaged over sides.

**Decisions:**
- Part 3's facing is carded as built, with the 15-25 deg written down as open.
- The stance (front shoulder to the read, chest to the arm side) is the shared fix for the plant and for bit 2's
  shoulders-on-a-step, which are chest-on today. It needs a handedness field and the amount question; not built.

## The grass read, built (QB_FOOTWORK bit 8, 2026-11-16)

Before the plan carries grass fields (Rules), the quarterback's side uses fallbacks: a first read whose route is a go,
fade, corner, post or deep out is a grass read (`GRASS_ROUTES`, chosen); its landing area is his forecast of the man
1.2 s ahead (`GRASS_AHEAD`, chosen). His eyes are on that point through the drop. On the plant it is a throw if it is
readable (out of the collision: 2 yd deep and 4 yd/s; nobody in his picture within 2 yd of the man's path to the landing
area, plus an awareness-scaled judgment margin; a man shallower than the receiver is under the throw and does not count)
and priced worth it as any read. Otherwise, a tick past the plant, he is on to read 2. No dwell, and no veteran look-off
before it (his eyes were already there).

Two corrections on the way, both from staged traces:
- The seam is not a grass read. At the plant it is 3-4 yd deep, under the hook defender's depth, so it can never be
  decided there; it is taught as a read of the hook and safety off the hitch (`vertReadable`). With it in the set,
  four verts and dagger lost their seam read for nothing.
- The look-off. A veteran's look-off on the plant held his eyes on a decoy for 0.25-0.35 s before the grass read; read
  1 then went past its moment and the wind-up to read 2 came late into the edge rush (mesh roster 7 seed 2, one play
  shape across seven coverages: sacks 6 -> 13, arm held at the delivery). Not before a grass read.

Staged, bits 1+2 (`QB_FOOTWORK=3`) against 1+2+8 (`=11`), `CONCEPT_DROPS=1`, 192 plays a concept (drop-staged.ts):

| concept | sacks | ints | completions | yd/play | throw t | corners (t, depth) |
|---|---|---|---|---|---|---|
| mesh | 6 -> 0 | 2 -> 2 | 156 -> 136 | 9.57 -> 9.25 | 2.70 -> 2.42 | 5 (3.04 s, 12.6) -> 20 (2.42 s, 9.4) |
| smash | 17 -> 11 | 8 -> 4 | 107 -> 112 | 6.39 -> 6.44 | 3.68 -> 3.42 | 25 (3.42 s, 13.1) -> 24 (3.16 s, 11.0) |
| four_verts | 20 -> 18 | 4 -> 4 | 65 -> 67 | 9.98 -> 10.06 | 3.51 -> 3.47 | - |
| verts_hitch | 14 -> 13 | 3 -> 3 | 90 -> 90 | 9.84 -> 9.66 | 3.59 -> 3.55 | - |
| dagger | 22 -> 22 | 1 -> 1 | 97 -> 97 | identical | identical | - |

Mesh's corners are thrown against cover 2 and tampa 2 (the hole between the cloud corner and the safety), as taught.
The go witness has not moved: on four verts the outside go is read 1 only against cover 1, where it is readable on 6
of 8 staged plants (grass-plant.ts) and his price declines it (the trailing corner within 1-2 yd). That is the price's
call, not readiness; the accuracy-belief check above comes before touching it. Gos thrown remain seams off the hitch,
at 12.5 yd and about 3 s.

Test: test/qb-grass-read.test.ts (mesh against cover 2 and tampa 2: no dwell on the grass read after the plant; more
corners than off, each within 0.6 s of the plant). Probes: scripts/diag/eyes/grass-trace.ts, grass-plant.ts.

### With the plan's fields (Rules' GRASS_READ, #802), 2026-11-16

Rules set the list from the sources and put it on the plan: `rhythm[i].grass = { landing, t, decided: 'step' }`. The
landing is the point on the installed route at the NFL's median air yards (go/seam/fade 22, corner 19), in the plan's
frame (converted with his own strong sign). Any read in the rhythm can be a grass read, decided on its own step `n` (the
plant for n = 0, a hitch for n = 1). The declared verticals are in, the seam included; that answers the seam problem
above: keyed to its hitch, it is decided there, not at the plant. The corner is in only as read 1 and not half of a key
(mesh yes; smash, corner_flat and sail_corner no, thrown off their defender). The post and the deep out are out, as
they are thrown on the break.

The quarterback side (GRASS_READ=1): `isGrass` is the plan's mark; the landing is the plan's; he moves on a tick past
the step that decides it; his eyes are on its landing area while it is his read (drop and set). Without the fields the
fallback stands, and its landing is no longer a chosen 1.2 s: his forecast at the time a ball started now arrives
there (his wind-up plus its flight at his natural speed, two passes).

Staged, `QB_FOOTWORK=11`, 192 plays a concept; the plan arm run on this branch with #802 merged in a scratch tree:

| concept | =3 | =11 fallback | =11 + GRASS_READ |
|---|---|---|---|
| four_verts sacks / cmp / yd | 20 / 65 / 9.98 | 19 / 68 / 10.26 | 11 / 79 / 11.21 |
| four_verts verticals: t, depth | 3.01 s, 12.8 yd | 2.96 s, 12.4 yd | 2.69 s, 10.1 yd (NFL 2.6, 9.2) |
| verts_hitch sacks / cmp / yd | 14 / 90 / 9.84 | 12 / 93 / 10.10 | 16 / 84 / 9.16 |
| verts_hitch verticals: t, depth | 3.03 s, 13.0 yd | 2.96 s, 12.5 yd | 2.63 s, 9.8 yd |
| dagger sacks / cmp / yd | 22 / 97 / 5.56 | 22 / 97 / 5.56 | 11 / 117 / 6.65 |
| mesh sacks / cmp / yd, corners | 6 / 156 / 9.57, 5 | 0 / 136 / 9.21, 20 | 0 / 135 / 8.91, 20 |
| smash sacks / ints / cmp | 17 / 8 / 107 | 14 / 4 / 107 | 17 / 8 / 107 (corner keyed: as off) |

The vertical witness moves only with the plan's fields: decided on its step at the plan's landing, the vertical leaves
at 2.6-2.7 s and 10 yd, against the NFL's 2.6 s and 9.2 yd. verts_hitch is the adverse cell (cmp 90 -> 84, sacks 14 ->
16), not yet diagnosed.

**Mesh completions (156 -> 136), explained.** Paired plays: the corner itself is 20 of 20 for 48.7 yd a throw (a
coverage fault in the cover 2 hole, for Defense). The loss is 25 plays where both arms throw the under crosser and
only off catches it: with no dwell on the corner he is on the crosser 0.36 s earlier (2.41 vs 2.77 s) and throws it
still in the mesh traffic (nearest defender at the release 3.5 vs 4.6 yd), priced the same (P 0.77 vs 0.74). His
window does not see a crosser still inside the traffic; this is the same question as ROUTE_LANDMARK's pressed out
(the window overrating a man with a defender on him), taken up there. A few of the 25 are roll noise: the look-off's
dice draw is skipped with bit 8, and 6 plays went the other way.

