# COV-1: where closing during the flight is lost

**Question:** our nearest zone defender closes 0.12 yd while the ball is in
the air, against 0.65 in the NFL. Which stage goes wrong first: seeing the
throw, reacting to it, or running?

**Answer: none of the three.** After the release, our defenders ramp toward
the target at close to the NFL's rate. What first goes wrong happens before the
ball is thrown:

1. **Where the ball goes.** Our QBs throw into tighter windows. Weighting our
   throws to the NFL's mix of separations at the throw recovers 70–100% of the
   mean gap.
2. **The drop pace at the throw.** Our zone defenders are still bailing when
   the ball comes out, about 1 yd/s faster than tracked zone defenders in the
   last second, and twice as many are running downfield faster than 4 yd/s.
   When the target is underneath the nearest defender, ours is moving away from
   him at the release; the NFL's is already moving toward him.

The two may be linked: a QB who sees a dropper bailing has a reason to throw
under him. That's a hypothesis, not tested here.

No engine change. Diagnosis only.

## How it was measured

One operator for both sides: `scripts/diag/depth/flightclose.py`, over the
common play format and the same `metrics.Play` code as the mechanics report.
Zone coverage only; x is downfield; D0 is the defender nearest the target at
the throw. The closing metric is `air.defender_closing` (separation of the
nearest defender at the throw minus at arrival).

- NFL: 2022 tracking common plays (4,747 zone throws).
- Sim: develop `58ae15d7`, `sim-export.ts` 8 games each at seeds 101 and 109
  (568 and 486 zone throws).

```sh
node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/mechanics/sim-dev-101.jsonl.gz
python3 -I scripts/diag/depth/flightclose.py out/mechanics/nfl-plays.jsonl.gz out/mechanics/sim-dev-101.jsonl.gz out/mechanics/sim-dev-109.jsonl.gz
node --import tsx scripts/diag/zone-release-techniques.ts 4 101
```

## A. The window mix explains most of the mean

Closing by separation at the throw, share of throws / mean closing (yd):

| Separation at throw | NFL | Sim s101 | Sim s109 |
| --- | --- | --- | --- |
| 0–2 yd | 0.13 / −0.31 | 0.23 / −0.75 | 0.22 / −0.76 |
| 2–4 yd | 0.30 / 0.07 | 0.39 / −0.12 | 0.43 / −0.03 |
| 4–6 yd | 0.30 / 0.80 | 0.26 / 0.79 | 0.23 / 0.88 |
| 6+ yd | 0.27 / 1.45 | 0.12 / 1.39 | 0.12 / 1.65 |
| **All, mean** | **0.61** | **0.16** | **0.21** |
| Sim re-weighted to the NFL mix | | **0.48** | **0.60** |

- A defender who is already tight at the throw has little to close. 62–65%
  of our zone throws go into windows under 4 yd, against 43% in the NFL.
- From 4 yd up, our closing matches the NFL's. The deficit inside a band is
  only in the tight windows (0–4 yd).
- Our targets are also deeper at the throw: 5.8–6.1 yd past the line against
  4.1.

## B. After the throw: seeing, reacting and running look right

D0's speed toward the target (yd/s, median) from the throw to +0.8 s:

| Band | NFL: at throw → +0.8 (gain) | Sim s101 | Sim s109 |
| --- | --- | --- | --- |
| 0–2 | 1.60 → 4.63 (+3.0) | 0.00 → 2.67 (+2.7) | 0.54 → 2.81 (+2.3) |
| 2–4 | 0.77 → 3.90 (+3.1) | −1.15 → 1.90 (+3.1) | −0.68 → 1.74 (+2.4) |
| 4–6 | 0.33 → 3.69 (+3.4) | −0.52 → 2.79 (+3.3) | −0.34 → 3.54 (+3.9) |
| 6+ | 0.13 → 3.25 (+3.1) | −0.32 → 2.82 (+3.1) | −0.51 → 2.60 (+3.1) |

- The ramp starts within 0.2 s on both sides. Recognition was already fast
  after #207 (deep zone defenders recognize the throw a median 0.10 s after
  the release).
- The gain over the flight is the NFL's within about 0.5 yd/s, and only short
  of it in the tight bands.
- **What differs is the starting point.** At the throw our D0 is moving away
  from the target in every band except 0–2; the NFL's is moving toward him in
  every band.
- A receiver's break before the throw is handled about as well: D0 plants
  (downfield speed ≤ 0.5) a median 0.2 s after the target's break, against
  0.0 s in the NFL. The NFL defender was already slower when the break came
  (0.75 vs 1.25 yd/s).

## C. The drop pace at the throw

When the target is under D0 (two thirds of throws on both sides), D0's
downfield speed and speed toward the target at the release:

| Band | NFL | Sim s101 | Sim s109 |
| --- | --- | --- | --- |
| 0–2 | 1.75 / +0.77 | 0.75 / −0.24 | 0.00 / −0.04 |
| 2–4 | 0.75 / +0.65 | **3.00 / −2.78** | **2.25 / −2.31** |
| 4–6 | 0.50 / +0.31 | 2.00 / −1.27 | 1.25 / −0.92 |
| 6+ | 0.00 / +0.52 | 1.75 / −0.71 | 1.75 / −0.79 |

Every zone defender 3+ yd off the ball (not rushing), median downfield speed
around the throw, and the share faster than 4 yd/s at it:

| | −1.0 s | −0.4 s | throw | +0.4 s | > 4 yd/s at throw |
| --- | --- | --- | --- | --- | --- |
| NFL, under (3–9 yd) | 1.75 | 2.0 | 1.75 | 1.25 | 0.18 |
| Sim, under | 2.5–2.75 | 3.0 | 2.5–2.75 | 1.5–1.75 | **0.32–0.33** |
| NFL, deep (9+ yd) | 2.5 | 2.75 | 2.5 | 1.75 | 0.22 |
| Sim, deep | 2.25–2.5 | 3.25–3.5 | 3.5 | 2.25–2.5 | **0.39–0.42** |

- Both sides slow down after the throw at about the same rate. Ours do it from
  about 1 yd/s faster.
- Our deep defenders are faster and shallower at once: 16.9 yd at the throw
  against 18.6.

### Which techniques carry the speed (sim internals)

`scripts/diag/zone-release-techniques.ts`, seed 101, 4 games: the technique
label on each zone defender's command at the release, with his downfield speed.

- **Deep (9+ yd):** `deep-turn-run` is 43% of deep defenders at the release,
  at 4.7 yd/s (commanded 7.5), and carries 2.1 of their 2.8 yd/s mean.
  `deep-over` is 23% at 2.7.
- **Underneath:** `carry-run-past` (8%, 4.1 yd/s, commanded 8.7),
  `deep-turn-run` (7%, 5.5) and `wall-open` (2%, 3.7) are the fast ones;
  `zone-landmark` (11%) is at 1.8.
- On the targeted plays with the target under the nearest defender and 2–6 yd
  of separation, half of the nearest defenders were still retreating at the
  release, mostly in `carry-run-past`, `deep-turn-run` and `spot-drop`.

So the speed comes from defenders turned and running with a receiver, not from
a slow reaction to the ball.

## What this means for COV-1

- Seeing, reacting and running after the throw are not where it first goes wrong.
  Speeding up recognition or the break toward the ball would chase a stage that
  is already about right.
- The coverage stage to look at is **how long and how fast a zone defender stays
  turned and running with a receiver before the throw**. That's when the
  latches in `deep-turn-run` and `carry-run-past` release, and what a defender
  sees that tells him to stop running: the receiver throttling, the QB at the
  top of his drop. One question per technique, on matched snaps.
- The throw-selection half (tight windows, deeper targets) is the QB's decision
  (QB-1, G3/G4). Logged for that lane. It may move once droppers stop bailing.
- A change in this area should be judged with the separation band mix held
  fixed (section A re-weighting), or the metric will move for reasons that
  aren't closing.

## Limits

- 8 games per seed. The sim bands have 49–219 throws each; the NFL ones have
  423–1,420. The direction is the same on both seeds in every table.
- The QB-defender link (QBs throwing under bailing droppers) isn't tested.
- After the random-stream split lands, the seeds' plays change. The operator
  doesn't, so re-run it then.
