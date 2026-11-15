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
