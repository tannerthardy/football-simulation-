# Backside end on zone runs away: why the chase stalls (report only)

Run Game for Integration, 2026-11-16, engine-71 (develop e90c204c; my branch at its merge).

Integration's numbers: ours +1.6 yd toward the ball by 2.0 s, the NFL's 3–5 yd, with his key already his tackle.

## Trace

`scripts/diag/edge/backside-chase.mts`: staged zone runs (oz/iz × strong/weak), gun doubles and singleback, over and
under fronts, cover 3, 6 seeds × flip, 192 reps. Per 0.25 s: the backside end's travel toward the ball, depth, his
tackle's travel, the carrier's lateral distance from him, and the branch driving him. `WHY=1` prints his key, its
stance and step, the line read and pullers.

Split by the branch that drove him (p25/p50/p75, yd toward the ball at 2.0 s):

| run | front | branch | n | toward ball, 2.0 s | his tackle, 2.0 s |
|---|---|---|---|---|---|
| OZ | over | END_CHASE | 17 | 3.05/5.73/6.04 | 5.21/5.40/5.77 |
| OZ | under | END_CHASE | 16 | 2.55/4.04/4.68 | 2.26/2.95/4.38 |
| IZ | over | END_CHASE | 19 | 0.28/4.43/4.96 | 3.91/4.28/4.62 |
| IZ | under | END_CHASE | 14 | 3.26/3.47/3.88 | 2.14/3.71/3.84 |
| OZ | over | edge-trail (no chase) | 7 | 0.93/1.16/1.17 | 5.31/5.47/5.50 |
| OZ | under | edge-trail | 8 | 1.95/2.24/2.53 | 4.47/4.48/4.78 |
| IZ | over | edge-trail | 5 | 0.15/0.23/0.31 | 4.44/4.58/4.60 |
| IZ | under | edge-trail | 10 | 0.51/0.55/0.70 | −0.76/−0.51/−0.37 |

1. **When END_CHASE drives him, the chase is there.** 3.5–5.7 yd toward the ball by 2.0 s, at or above the NFL's 3–5.
   He tracks behind his key's hip, so he never passes his tackle (about 1 yd short of the tackle's travel when the
   tackle is his key).
2. **About a third of reps never enter END_CHASE, and those are the stall** (−0.1 to +2.5 yd at 2.0 s). They are the
   weak-side runs where his key is the Y, not the tackle. Two cases:
   - **Under front: he is blocked.** The Y steps at him first (−0.7 to −0.9 yd/s at 0.5 s: a cutoff or hinge on the
     backside end), so it is not a zone step away and END_CHASE correctly does not fire. This is a blocked backside
     end, not the NFL's unblocked population. Separate it in the comparison.
   - **Over front: the Y steps away toward the ball (+0.4 to +1.1 yd/s), but the line read is still 0 at the first
     decision beat.** `lineRead` needs four of five linemen stepping the same way, and holds for his decision
     interval. So he squeezes and sets ("squeeze-set"). By the time the read turns, he has recognised the run and
     `rush` hands him to `runFit`. There:
     - END_CHASE (run-fits.ts ~587) moves only his **depth** (x ≤ LOS − 1), not his lateral aim.
     - The edge job's **trail rule** keeps his lateral aim at a constant cushion from the carrier, equal to his own
       alignment width from the ball (`cushion = |gy − ballY|`).
     - So once in the fit, he moves with the carrier only beyond that cushion and never closes it. This is the
       stall.
3. **Pace is not the limit.** In the stalled reps his speed is low because his aim does not move, not because he
   cannot run: the END_CHASE reps of the same bodies reach 4–5.7 yd.
4. **The squeeze limit ("only as far as the spot the blocker left") is not it either.** That rule only applies on the
   down-block branch before END_CHASE. In the stalled over-front reps the squeeze-set spot is where he was when the
   run was recognised, and from then on the fit's trail cushion governs.

## Where it bears on my numbers

The backside cutback lane on weak-side zone runs with a Y to the backside: the end sits at his alignment width off
the carrier instead of closing behind the play. That is a third of my staged weak-side zone reps. Real game share not
measured here.

## What would fix it (not built; Defense's controller)

- **In the edge fit,** a backside edge whose line flowed away with no puller (END_CHASE's own condition) aims behind
  the play: his key's hip, or the back's heels, at chase depth. The trail cushion stays for a play-side or contain
  edge.
- **END_CHASE's pre-recognition branch** could hold on a line read that is still forming (three of five, or the read
  carried from the previous beat), so the first beat does not set him.
- **The blocked case (the Y on him)** is not a chase case and should stay as is.
