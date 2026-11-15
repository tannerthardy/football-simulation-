# Drop design, stage 1: eyes and feet coupled perfectly (design, not built)

The user's direction (2026-11-15): first make the coupling perfect, see what that moves, and only then add the error
(young quarterbacks who can't get through the progression in the rhythm, or lock on elsewhere). Measured basis:
[the drop measurements](2026-11-15-drop-measurements.md). Coaching basis:
[the chapter](../football-handbook/qb-drops-and-pocket.md), sections 2-4.

One flag, `QB_FOOTWORK` (off), for the whole of stage 1. Its four parts are one mechanism, the progression carried
by the feet, and are not separate switches. Each part has its own probe row so a failure can be localized.

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
   (existing motion facing). His commanded pace is unchanged; the directional cap now acts on a crossover, not a
   backpedal. Measured backward speeds (NFL 1.9 / 2.2 / 1.8 / 1.1 yd/s through a short gun drop, ours 2.6 / 3.1 /
   2.5 / 1.6) are a check of the result.
4. **Pocket movement is a footwork event.** Taught as "edge high, climb; interior push, slide, reset". A climb or a
   slide of one gap, decided from his felt pressure picture once (hysteresis: enter on the man's time to him under
   his remaining need, exit by a margin on the far side), is itself the next step. Its landing, the reset, is where
   the next read comes. This makes QB_GATHER's hitch and the climb the same kind of step, and it supplies the slide
   the default engine lacks (interior man: NFL slides away 29%, ours 3%). QB_AVOID's two failures are kept in mind:
   the read must not freeze while he moves (it is waiting for the reset, which is a step), and moving off a free
   rusher alone did not help.

## Information

All four parts read his own body and his pictures: his feet and base are his own; the plan's steps are installed
knowledge. Pressure is the felt picture already used by `pressure()`. Nothing reads another player's assignment.

## How it is read

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
