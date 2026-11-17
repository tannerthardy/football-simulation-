# HOLD_HEAVY: the holder's finish (2026-11-17, two attempts, miss)

Integration item, base develop d7d6e3a9. Flag off; branch `defense/C20-hold-heavy`, no PR.

## Diagnosis
The hold trace covers zone completions with a bond formed at a carrier speed over 6 yd/s: 107 bonds, 2 seeds,
cover2/3/4 (`hold-trace2.mts`, `ht-sum.py`).

(a) **HOLD_SINK does not put his weight on the ground.** It only changes his speed request: 3.9 -> 3.6 yd/s,
against 5.4 achieved.
- Nothing in it changes his support state: dives stay at 0%.
- An upright holder's hang share is 0 by definition (`hangShare('up')`), so his weight stays on his own feet.
- The hold tows him: turf force along the run is -33 upright (-54 with HOLD_SINK), against -202 off his feet.

(b) **What takes a wrapped carrier down:** 60 of 61 falls are cause `legs`. Those are the held-legs terms:
- the strides his held legs cannot take (HELD_SWING);
- a thigh hold beyond his hip torque;
- an off-feet holder's hanging weight on the legs lever.

An upright holder alongside supplies a grip but no hanging weight, and little drag.

(c) **The slipping branch stops braking by design.** HOLD_FINISH and HOLD_SINK set the commitment to 0 while the
grip slips ("gives with it and keeps his feet with the runner"). 46% of slipping upright ticks ask for no braking.

## Build
- **The read:** one beat after the grasp (reaction time x (1.5 - tackling)), a holder beside or behind the runner
  feels from his own body whether he is still being carried at 85% or more of his speed at the grasp (over 2 yd/s).
- **A slipping grip** triggers the same decision after half that beat.
- **Getting heavy:** he commits for the bond. He drops any request along the runner's path, takes his lowest
  posture and drops his weight off his feet onto the man (dive 0.2, a drop rather than a launch).
- **If the hold is stopping the man,** the read starts a new beat.
- **Everything else is the World's:** hanging, turf drag, the hands sliding down the legs (HANG_GRIP) and the grip
  tearing off.

## Gates

| | develop | HOLD_HEAVY | + BEND_FORECAST bit 1 |
|---|---|---|---|
| hold trace: holder upright share | 60% | 30% | |
| hold trace: turf force, off-feet holder | -202 | -286 | |
| hold trace: carrier speed 0.5 / 1.0 s | 5.3 / 5.4 | 5.5 / 5.1 | |
| hold trace: still moving > 2 yd/s at 1 s | 51% | 53% | |
| hold trace: broken per bond | 0.14 | 0.09 | |
| contact cells: down within 1 s, behind centre / hip / reach (NFL 76 / 69 / 66%) | 51 / 48 / 50% | 45 / 46 / 28% | 44 / 46 / 52% |
| staged man YAC | 3.02 | 3.09 | 2.99 |
| staged zone YAC | 6.16 | 6.09 | 5.79 |
| staged zone 20+ | 5.7% | 5.5% | 5.1% |
| staged zone never reached | 7.6% | 8.6% | 8.5% |
| run set: yards per carry | 3.88 | 3.93 | 3.93 |
| run set: missed per carry | 0.148 | 0.148 | 0.148 |
| run set: broken per carry | 0.099 | 0.117 | 0.117 |
| head-on control: carrier gains 5+ in 1 s | 2.8% | 2.4% | 1.6% |
| dither | pass | pass | |

- The holder now leaves his feet at a median 0.2 s into the bond (develop 0.4 s).
- 0.3 s after he does, the carrier has slowed 0.6 yd/s (develop 0.15).

## Why it misses
The upright roll finish (a close, secure, upright holder turning the runner over his held legs) needs the holder on
his feet:
- Upright, close, gripping holder ticks fall from 20% to 10%.
- Falls preceded by such a holder fall from 33% to 18%.

Getting heavy trades the roll for dead weight. The dead weight slows the runner but does not fell him within the
second, and on runs it is torn off more often.

## Attempt 2 (Integration's go: the taught order)
Finish on his feet if he can. At the read he keeps the upright roll when it is available: close (within the bodies
plus 0.15 yd), secure (grip x quality 0.5 or more), on his feet and not slipping. He gets heavy only when it is not
available.

The finish chosen per bond (hold trace, 116 bonds):
| finish | share of bonds | down within 1 s |
|---|---|---|
| heavy | 85% | 63% |
| roll kept | 13% | 67% |
| neither | 2% | 50% |

On develop, where nothing gets heavy: the roll was available at some point in 52% of bonds (66% down) and never in
48% (51% down).

| | develop | attempt 2 | + BEND_FORECAST bit 1 |
|---|---|---|---|
| hold trace: holder upright share | 60% | 35% | |
| hold trace: carrier down within 1 s | 59% | 63% | |
| hold trace: carrier speed 0.5 / 1.0 s | 5.3 / 5.4 | 5.5 / 5.2 | |
| hold trace: broken per bond | 0.14 | 0.09 | |
| contact cells: down within 1 s, behind centre / hip / reach (NFL 76 / 69 / 66%) | 51 / 48 / 50% | 45 / 51 / 33% | 44 / 51 / 52% |
| staged man YAC | 3.02 | 2.99 | 2.88 |
| staged zone YAC | 6.16 | 6.08 | 5.77 |
| staged zone 20+ | 5.7% | 5.5% | 5.2% |
| run set: yards per carry | 3.88 | 3.87 | 3.87 |
| run set: missed per carry | 0.148 | 0.148 | 0.148 |
| run set: broken per carry | 0.099 | 0.117 | 0.117 |
| head-on control: carrier gains 5+ in 1 s | 2.8% | 2.9% | 1.9% |
| dither | pass | pass | |

**Verdict: a miss.**
- The roll is rarely available at the moment the read falls due, so attempt 2 behaves like attempt 1.
- Dead weight slows the carrier but does not take him down sooner. The contact cells do not move toward the NFL's
  66-76%.
- On runs the dropped hold is torn off more often.

The open physics question goes to Tools: a 90 kg grounded holder slows a running carrier by only about 2 yd/s^2.
Is the joint load capped by grip capacity, or by the carrier's drive?

This was the last attempt on the mechanism. The flag stays off, on the branch only.
