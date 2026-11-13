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

## Step 2: when a zone defender stops running with a receiver

Matched snaps: `matched-restage.ts capture` seeds 7, 8, 101–104 on `58ae15d7`
(835 snaps, 369 zone throws), written in the common format by
`scripts/diag/matched-common.ts` so the NFL operators measure them unchanged.

### What the defender does over a vertical

`scripts/diag/depth/carrypace.py`: every frame in the second before the
throw, a zone defender with a receiver within 4 yd running downfield faster
than 4 yd/s and shallower than him. "Pace" is his downfield speed divided by
the receiver's; "matching" is the share with pace > 0.8.

| Pair | Cushion | NFL pace / matching | Sim (matched base) |
| --- | --- | --- | --- |
| Wide, receiver 10+ yd | 0–1 yd | 0.79 / 0.47 | 0.90 / 0.57 |
| | 1–2 | 0.73 / 0.31 | 0.90 / 0.85 |
| | 2–3 | 0.71 / 0.28 | 0.90 / 0.91 |
| | 3–5 | 0.68 / 0.22 | 0.87 / 0.84 |
| Box, receiver 10+ yd | 2–3 | 0.59 / 0.16 | 0.86 / 0.84 |
| | 3–5 | 0.54 / 0.18 | 0.93 / 0.86 |
| Wide, receiver under 10 yd | 3–5 | 0.54 / 0.06 | 0.76 / 0.32 |

- A tracked defender with cushion gives ground below the receiver's speed and
  matches him only when the cushion is nearly gone. Ours copies his speed at
  any cushion.
- It isn't the release of a carry. With the nearby receiver below 3 yd/s, 4–5%
  of ours run faster than 4 yd/s (NFL 2%). When a receiver throttles, ours
  starts slowing a median 0.2 s after him (NFL 0.1).
- On the matched throws where the target is under the nearest defender within
  6 yd, the commonest technique is a pattern-match `man-open` on the target
  himself (73 of 205), 2.7 yd over a receiver who is slowing at 6.8 yd.

### Where the speed copy is in the code

Three over-the-top carries feed the receiver's full downfield speed forward:

- `ZoneCoverage` deep (`deep-over` / `deep-turn-run`): target the receiver plus
  a 2.2–2.7 yd roof, receiver speed fed forward.
- `ManCoverage` with `overTop` (match rules): target the receiver plus
  0.8 + 0.15·v, receiver velocity fed forward.
- `ZoneCoverage` underneath carry (`carry-wall` / `carry-run-past`): the target
  never comes more than 0.5 yd below his current depth, with the seam's speed
  fed forward, so spare cushion is kept for the whole carry.

`DeepCoverage.choose` already previews the body and escalates to matching or
running when the roof would be lost; it returns the technique's own request
when it is safe. So the copy is in the request, not in the safety check.

### Attempt 1, declared before running: spend the spare cushion

**Rule.** Over a receiver he has more cushion on than his technique's roof,
the defender feeds forward only the share of the receiver's speed that the
roof needs, `roof / cushion`; at or under the roof he copies it in full. No new
constant: each site's existing roof is the `need`. The preview check still
escalates. Reads: his own position and his acquired picture of the receiver.
Switch `CARRY_PACE` (on; `=0` is today's request) for the matched comparison.

**Predictions** (matched snaps, `CARRY_PACE=0` vs on):

1. Matching share at 2+ yd of cushion falls below 0.5 for wide and box pairs
   over receivers 10+ yd deep.
2. The nearest defender's downfield speed at the throw, with the target under
   him in a 2–6 yd window, falls by at least 0.5 yd/s.
3. Closing in flight re-weighted to the NFL separation mix rises by at least
   0.1 yd.
4. Cost: completions with 20+ air yards don't fall; no size predicted.
5. Runs: no run snap changes.

**Stop.** If 1 or 2 doesn't happen, or 20+ yd completions more than double on
the matched snaps, stop and re-diagnose before a second attempt.

### Attempt 1 result: not held, reverted

Matched snaps, `CARRY_PACE=0` (byte-identical to develop) vs on:

- Matching share at 2+ yd of cushion: wide 0.91 → 0.91 and 0.84 → 0.83, box
  0.84 → 0.80 and 0.86 → 0.89. **Prediction 1 not held.**
- The nearest defender's speed at the throw (target under him, 2–4 yd window)
  2.0 → 2.0 yd/s. **Prediction 2 not held.**
- Re-weighted closing 0.49 → 0.59, but 537 of 835 snaps changed, run snaps
  included (prediction 5 not held). That's divergence, not the mechanism.

### Re-diagnosis: the depth chooser makes every carry a race

Instrumenting `DeepCoverage.choose` on the same snaps (`CARRY_PACE=0`), in the
second before the throw, for carries with the receiver faster than 4 yd/s:

| Cushion | Calls | Chooser overrides the technique | Request: own → chosen | Receiver | Roof |
| --- | --- | --- | --- | --- | --- |
| 1–2 yd | 774 | 0.89 | 7.9 → 9.2 yd/s | 7.1 | 1.9 |
| 2–3 yd | 1,937 | 0.93 | 5.4 → 8.9 | 7.3 | 1.9 |
| 3–5 yd | 4,832 | 0.97 | 2.7 → 8.1 | 6.8 | 1.8 |

- With 3–5 yd of cushion over a 1.8 yd roof, the chooser still overrides the
  technique 97% of the time and asks for more than the receiver's speed.
  Attempt 1 changed only the request it overrides.
- The reason is the recovery term at the end of its 0.8 s preview: the speed
  deficit times (turn time + the body's acceleration constant, about 1.1 s).
  That charges the full cost of catching up with a receiver who runs forever.
  A pedalling defender 5 yd/s slower is charged about 7 yd, so no pace below
  the receiver's is ever safe.
- And when the technique's own request fails, the menu jumps straight to the
  receiver's speed or a sprint; there is no slower safe option to pick.

### Attempt 2, declared before running: safe against a throw made now

**Rule** (`DeepCoverage.choose`, switch `THROW_HORIZON`, on; `=0` is today's):

1. The recovery charge covers only the time a throw made now would take to
   arrive: his reaction time plus the natural flight time from his picture of
   the QB to his picture of the receiver (the 2023-tracking relation the QB
   already uses, at an average arm). Within that window the receiver gains the
   deficit during the turn, then `Δv·τ·(1 − e^(−t/τ))` while the defender
   accelerates. Today's term is this charge with an endless window.
2. When the technique's request isn't safe, he takes the slowest safe one: the
   same facing at speeds stepping up toward the receiver's, before opening or
   sprinting.

No tuned constant: the flight relation, reaction time, turn rate and τ already
exist. It applies wherever the chooser is used: deep zone and man/match with
depth protection.

**Predictions** (matched snaps, `THROW_HORIZON=0` vs on):

1. Matching share at 2+ yd of cushion falls below 0.6 for wide pairs over
   receivers 10+ yd deep, and pace falls as cushion grows.
2. The nearest defender's downfield speed at the throw (target under him,
   2–6 yd window) falls by at least 0.5 yd/s.
3. Closing in flight re-weighted to the NFL separation mix rises by at least
   0.1 yd.
4. Completions with 20+ air yards rise, but less than double.
5. Man coverage changes too; reported, no prediction.

**Stop.** If 1 or 2 doesn't happen, or 4 is broken, this is the second failed
attempt: stop, write down why, and re-diagnose.

### Attempt 2 result: partly works, stop rule reached

Matched snaps, `THROW_HORIZON=0` (byte-identical to develop) vs on. The code
is parked on branch `coverage/G3-cov1-throw-horizon`, not in this PR.

| Declared | Result | |
| --- | --- | --- |
| 1. Wide matching at 2+ yd of cushion below 0.6; pace falls with cushion | 2–3 yd: 0.91 → 0.35; 3–5 yd: 0.84 → 0.61 (54 frames: they now spend the cushion). Box 2–3 yd: 0.84 → 0.22, 3–5 yd: 0.86 → 0.12 | mostly held |
| 2. Nearest defender's downfield speed at the throw falls ≥ 0.5 yd/s (target under him, 2–6 yd) | 2–4 yd: 2.0 → 1.75; 4–6 yd: 1.0 → 1.0 | **not held** |
| 3. Re-weighted closing rises ≥ 0.1 yd | 0.49 → 0.58 | **not held** (+0.09) |
| 4. 20+ air-yard catches rise, less than double | 13 → 17 | held |

- **Deep defenders now pace like tracking.** Share faster than 4 yd/s at the
  throw 0.42 → 0.23 (NFL 0.22); their median downfield speed at it 3.5 → 2.25
  (NFL 2.5).
- **Underneath defenders don't move** (0.33 → 0.33 faster than 4 yd/s, NFL 0.18).
- **Cost:** pass yards per play 8.34 → 9.18 on the same 568 passes. The largest
  changes are long YAC after short catches, for example a 4.3-yd catch going
  9.3 → 81.0 yd. With deep defenders no longer racing, they arrive later to the
  runner; that's where Stage 4's pursuit gap shows.

**Why it doesn't fix COV-1.** The chooser governs deep-zone and depth-protecting
carries. The nearest defender on our zone throws is mostly someone else: a
pattern-match `man-open` on the target at 6.8 yd (73 of 205), or an underneath
zone technique (`lane`, `lane-carry`, `carry-run-past`, `spot-settle`). Only
about 11 of 205 were in a deep-zone technique at the release.

### Re-diagnosis: the next stage to look at

The nearest defender's case is a match defender in man technique over a
receiver who throttles at 6–8 yd (curl, hitch, comeback):

- At the start of the receiver's slow-down, ours is retreating at 2.75–3.0 yd/s
  (NFL 2.0) and begins to slow a median 0.2 s after him (NFL 0.1; ours slows
  first 9–14% of the time, NFL 31%).
- His pace comes from `man-open`, which feeds his acquired picture of the
  receiver's velocity forward. The picture is 0.2–0.4 s old, and nothing in
  it anticipates a throttle: a tracked defender often slows before the
  receiver does.

So the open question is what a defender over a stem can see that a throttle
is coming (the receiver's depth against the route's break depth, his pad level
sinking, the QB at the top of his drop) and whether `man-open` uses it. That
needs its own diagnosis before any third change.
