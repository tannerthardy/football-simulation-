# Wide-open receivers he does not throw to, and his eyes at the throw (the user's film; measurement only)

QB lane, 2026-11-23. Develop 0226f0d3 (engine-91, frozen). League games: seeds 11-14 and 31-34 (8 games), 692 dropbacks
(631 thrown, 16 thrown away, 30 sacks). Probe `scripts/diag/eyes/open-turned-down.ts`; table
`scripts/diag/eyes/open_turned_down_table.py`. NFL: `scripts/diag/eyes/nfl_qb_square.py` (BDB 2025 weeks 1-2, 2,017
targeted dropbacks).

**Wide open** (interim, until Tools' census): nearest defender 4+ yd and no defender within 2 yd of the segment from the
QB to the receiver, true positions. Sampled every 0.25 s and on each read change while he holds the ball. **Eyes on**:
his head within 15° of the receiver's bearing (QB_HEAD on; the cone the film shows).

## How often a wide-open receiver goes unthrown

Counted only while he is set (before his set, open receivers on their stems are not throws he can make):

| | dropbacks | share |
|---|---|---|
| a wide-open receiver at some sample | 162 | 23% |
| a wide-open receiver never thrown to | 124 | 18% |
| the same, the route also ready by his plan | 102 | 15% |

(Counting the drop too, before he can throw: 90% of dropbacks.)

**Why the ball did not go there** (each unthrown open receiver at the furthest stage he reached; 153 receivers, QB set):

| cause | receivers | share |
|---|---|---|
| not in his read order yet (eyes on an earlier read; he threw it or the play ended first) | 99 | 65% |
| his current read, eyes not there yet (head still turning) | 26 | 17% |
| read already passed | 15 | 10% |
| eyes on, route not ready by his plan | 6 | 4% |
| eyes on, priced shut | 6 | 4% |
| eyes on, cleared his price, footwork gate | 1 | 1% |
| eyes on, cleared his price, not thrown | 0 | 0% |
| under pressure (urgency ≥ 0.8) | 0 | |

- **Priced shut (6):** 3 on pick risk over his max and 3 on P under his bar. The limiting term is pOpen 3 and pClear 3.
  The closer is a defensive lineman in the lane on 3 (DE 2, DT 1), otherwise NB, CB and DB, at 4-18 yd from the
  receiver.
- **Where his eyes were elsewhere:** his price for the open man, had he looked, cleared his bar on 54 of 92 (59%).

So the turned-down open throws are almost all **where his eyes go and when**, the progression, not the price. He does
not see an open man and refuse him: 0 receivers cleared his price under his eyes and went unthrown, and 6 were priced
shut. Two thirds are reads he never reached (he threw the earlier read, often while this one was open), and a sixth are
his current read with his head still turning.

## Throws to a covered man with an open one available

631 throws: to a man with a defender inside 2 yd at the last sample before release, 117 (19%). With another receiver wide
open at that sample: 15 (2% of throws).

## His eyes at the throw (the film's two observations)

621 throws with the timing:

| | p10 | p25 | p50 | p75 |
|---|---|---|---|---|
| eyes on target (head within 15°, continuously) → release | 0.00 | 0.15 | 0.30 | 0.50 s |
| eyes on target → windup start | | −0.20 | −0.10 | +0.15 s |
| head-to-target angle at windup start | | 3° | 20° | 50° (p90 76°) |

- **His eyes arrive after the windup has started on 57% of throws**, and 13% never come within 15° before release.
- **At the windup start his head is more than 30° off the target on 39%** (the target in his periphery) and more than
  60° off on 19%.
- This is the film exactly. In the windup his gaze goes to the throw's point and the head turns there at its rate, so
  he decides on a target his head is not yet on.

**What the NFL can say.** Tracking has no gaze, only body orientation (`o`), and an NFL passer throws side-on. His body
is a median 61° off the target 1 s before release, 58° at −0.5 s, 45° at −0.3 s and 19° at release (p75 35°). It is
within 15° before release on only 22% of throws. Ours squares early: a median 5° at release, within 15° for a median
0.3 s before it, and more than 30° off at −0.5 s on only 37% (NFL 82%). That is a stance difference (QB_STANCE, off),
not an eyes measure. The NFL data cannot say when a passer's eyes reach his target.

## What it points to (not built)

1. The progression's reach: two thirds of unthrown open men are reads he never got to. The first read is thrown while a
   later one is open: in 8 games, 52 of the 92 he never looked at would have cleared his bar. That is the read order
   and how long he holds the early reads, the drop-back dwell already flagged (64% of drop-back reads move on the
   0.35 s dwell), not the window.
2. Decide only on what his eyes have seen: the windup starts on a target his head reaches 0.10 s later (median), and on
   39% of throws the target is in his periphery. The decision is made on his picture of the receiver, kept current by
   QB_TICK_PICTURE and the forecast, not on a look.
