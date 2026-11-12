# Corner route: requested vs achieved, NFL vs sim (2026-11-11)

**Question.** The read-compiler audit found that our corner, drawn at 40°, gains only about 15° outward in the
0.5 s after its break. Is that a bug?

There are three possible answers:

- **(a)** The receiver rounds the cut because he carries too much speed into it.
- **(b)** The route's target or steering asks for a shallow angle.
- **(c)** NFL corners round about as much, and the 40° drawing is the idealisation.

This is a diagnosis only. Nothing in the engine changed.

```sh
node --import tsx scripts/diag/corner/sim-corners.ts > out/corner/sim.jsonl
python3 -I scripts/diag/corner/corner.py sim out/corner/sim.jsonl > out/corner/sim-tracks.jsonl
python3 -I scripts/diag/corner/corner.py nfl data/raw/bdb2025/big-data-bowl-data 1,2,3 > out/corner/nfl.jsonl
python3 -I scripts/diag/corner/corner.py report out/corner/nfl.jsonl out/corner/sim-tracks.jsonl
```

## Data and operator

**NFL.** Every BDB 2025 route labelled `CORNER` on a non-play-action dropback, weeks 1–3: 473 routes, 252 from
the slot and 221 from outside.

**Sim.** Every installed corner in the restaged game plays (`out/matched-restage` seeds 7 and 11, four dice
variants each; the same inputs as `scripts/diag/pass-operators/routes.ts`): 92 routes, 60 from the slot and 32
from outside.

**How a track is built (both sides):**

- 10 Hz from the snap, measured downfield and outward from the ball.
- "Slot" means he is not the widest receiver on his side.
- The targeted receiver's track ends at the throw.
- Other receivers' tracks end when the ball arrives. In the sim they also end when the receiver stops running his
  route.

**The break.** `nfl_routes.py`'s rule (a turn of more than 45° between the 0.2 s before and after, or a
slow-down) finds a break on only 27 of 473 NFL corners and 1 of 92 of ours. Neither league's corner is a sharp
cut. So the comparison uses a departure rule, applied identically to both:

- the first frame at 0.8 s or later and at least 5 yd deep;
- where his heading over the next 0.3 s is more than 10° further outward than over the 0.5 s before.

It finds the departure on 392 of 473 NFL corners and 52 of 92 sim corners. The sim misses are tracks that
ended, with the play, before the corner broke: median 11.9 yd deep, 2.8 s.

## Numbers

All values are medians unless shown as p25/p50/p75. Angles are degrees outward from straight downfield.

| | NFL slot | Sim slot | NFL outside | Sim outside |
|---|---|---|---|---|
| Departures found / routes | 193 / 252 | 30 / 60 | 199 / 221 | 22 / 32 |
| Depth at departure (yd) | 9.3 | 11.2 | 9.1 | 11.0 |
| Time at departure (s) | 2.30 | 2.50 | 2.30 | 2.40 |
| Stem angle, 0.5 s before | 8° | 1° | −3° | 0° |
| Angle over the first 0.5 s (p25/p50/p75) | 12 / **22** / 29° | 17 / **17** / 17° | 1 / **11** / 23° | 15 / **15** / 18° |
| Angle over the first 1.0 s (p25/p50/p75) | 20 / **32** / 36° | 25° | 9 / **19** / 32° | 24° |
| Heading from 0.3 to 0.6 s | 30° | 24° | 18° | 24° |
| Maximum heading within 1.5 s (p25/p50/p75) | 34 / **44** / 55° | 30 / **40** / 45° | 27 / **41** / 53° | 33 / **47** / 54° |
| Time to reach a 30° heading | 0.3 s (155 reached) | 0.5 s (22) | 0.4 s (140) | 0.6 s (19) |
| Speed into the departure (yd/s) | 6.97 | 7.06 | 6.96 | 7.13 |
| Minimum speed in the first 0.5 s | 6.77 | 6.74 | 6.86 | 6.68 |
| Speed 0.5 s after | 7.00 | 7.49 | 7.05 | 7.40 |
| **Requested** heading, first 0.5 s (sim only) | — | **43°** | — | **43°** |

## Verdict: mostly (c), with one real difference

**(c) NFL corners round about as much.** NFL receivers do not cut a corner either:

- Only 27 of 473 trip a 45° rule.
- Over the first 0.5 s after leaving the stem, an NFL slot corner goes out 22° and an outside corner 11°. Ours go
  out 17° and 15°.
- Over 1.0 s: NFL 32° and 19°; ours about 25° and 24°.
- The heading they finally reach is the same: NFL 44° and 41°, ours 40° and 47°.

So the drawn 40° is about the heading a corner ends up on. A sharp 40° turn at 11 yd is the idealisation.

**Not (a).** Speed into the turn is the same as the NFL's: 7.0 yd/s against 7.0–7.1. Neither league's receivers
slow through it: the minimum is 6.7–6.9 in both.

**Not (b).** The controller asks for 43° from the first frame of the turn. The body achieves less, at about the
NFL rate, because a receiver at 7 yd/s with our lateral capacity bends rather than snaps. That is requested ≠
achieved, as it should be.

**The one difference: the slot corner leaves later and from a straighter stem.**

- **Slot timing.** Our slot corners depart at 11.2 yd and 2.5 s; the NFL's at 9.3 yd and 2.3 s.
- **Slot stem.** The NFL slot corner is already drifting outward in its stem (8°) and reaches a 30° heading by
  0.3 s. Ours runs a straight stem (1°) to the drawn 11-yd point and reaches 30° at 0.5 s.
- **Outside corners match on angle.** Ours are slightly sharper than the NFL's, but they also depart about 2 yd
  deeper (11.0 vs 9.1 yd).

The likely cause is the drawing itself (`routes.ts:48`: a straight stem to 11 yd, then the turn), not the cut.
The departure depth is the item to look at on film before changing anything.

**What this means for the read compiler.** The 2x2 smash pair is missed because our slot corner leaves later and
straighter. The NFL slot corner is at least as gradual early on. So the compiler's high-low test should measure
where the high route is going (its heading or its position later in its window), not where it is when it first
becomes ready. That is a compiler fix, not a route fix.

**Limits:**

- The sim sample is small: 52 departures. Its p25 and p75 barely differ because one drawing is run by similar
  bodies.
- BDB's `CORNER` label covers several depths and conversions (some bend flat or back against coverage). The p75
  and the late headings carry that.
- The departure rule is an inferred category. It was checked on single tracks of each, but it is still weaker
  evidence than speeds and positions.
