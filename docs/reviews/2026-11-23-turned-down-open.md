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

## Follow-up: what the decision knows about a target his head is not on (Integration)

`scripts/diag/eyes/decision-picture.ts`, the same 8 games, 641 decisions (windup start). For the target: his head's
angle; the time since his head was last within 15° of him; his receiver picture's age (forecast.lastPicture) and error
(forecast now against truth). For the defenders within 6 yd of the target: his believed position's error and its age.

| head angle at decision | n | since last in-cone look p50 / p90 | target never in the cone this play | receiver picture age p50 / p90 | receiver error p50 / p90 | near defenders' error p50 / p90 | their picture age p50 / p90 |
|---|---|---|---|---|---|---|---|
| 0-15° | 332 | 0.00 / 0.20 s | 20 | 0.25 / 0.25 s | 0.04 / 0.19 yd | 0.13 / 0.54 yd | 0.25 / 0.60 s |
| 15-30° | 109 | 0.35 / 1.00 s | 62 | 0.25 / 0.25 s | 0.05 / 0.18 yd | 0.13 / 0.57 yd | 0.25 / 0.70 s |
| 30-60° | 107 | 0.35 / 0.90 s | 65 | 0.40 / 0.40 s | 0.13 / 0.54 yd | 0.33 / 1.71 yd | 0.50 / 1.15 s |
| over 60° | 93 | 0.45 / 0.65 s | 72 | 0.60 / 1.10 s | 0.32 / 1.17 yd | 0.50 / 6.43 yd | 0.70 / 1.90 s |

**An information leak.** QBMind.receiverLook gives a clear picture (his delay) inside clearHalf, 19-31° by his vision,
and a peripheral one inside periphHalf (45-69°). The peripheral picture is exact apart from 1.7 times the delay.
- To 30° the picture is as good as dead centre: 0.25 s old and 0.05 yd off.
- At 30-60° it is 0.40 s old and 0.13 yd off: nearly current and accurate, with latency the only cost.
- Only past about 60° does it degrade (receiver 0.32 / 1.17 yd, near defenders up to 6.4 yd at p90).
- On 62-72% of decisions made at 15° or more, the target was never within 15° of his head at any time in the play, yet
  his picture of him was fresh and accurate.

So the decision on a target in his periphery is priced from a near-perfect position and velocity: a far wider picture
than a passer's eyes give. Human peripheral vision detects motion but loses position and velocity precision with
eccentricity. The missing mechanism is a positional and velocity error that grows with the angle off his gaze (and a
"clear" cone narrower than 31° for reading separation), rather than latency alone. Not built.

## PERIPH_ACUITY: the leak removed (built behind a flag, off)

The assignment, relayed by Integration:
- position and velocity error that grows with the angle off his gaze, for receivers and defenders, from stated vision
  facts and scaled by his vision rating;
- a narrower clear cone for reading separation;
- no "must look" rule: his confidence in a picture falls with eccentricity and age.

Built on develop 0226f0d3 (engine-91). Patch:
`docs/reviews/patches/engine71-footwork/periph-acuity-on-0226f0d3.patch`.

**What changes (src/sim/qbmind.ts, receiver-forecast.ts, behaviors/qb.ts).** Every picture he takes (receiverLook for
receivers, observe for defenders) is offset by his misjudgment of that player.

| quantity | law | source |
|---|---|---|
| position error σ_p | 0.06 × range × eccentricity (rad) | positional acuity grows about linearly with eccentricity (Levi, Klein & Aitsebaomo 1985) |
| velocity error σ_v | 0.14 × speed × eccentricity | speed discrimination worsens off the fovea (McKee & Nakayama 1984) |
| vision scale | both × (1.3 − 0.6 × vision) | — |

- The offset is a stable unit normal per player (`mind.judgment`). It is his misreading of that man, so it doesn't
  re-draw each tick and cause dither.
- Defenders felt inside 3 yd keep their exact picture (pocket feel is separate).
- The clear cone narrows from 19–31° to 10–15° half-width, by vision: the useful field for reading separation under
  load (Ball et al. 1988). The periphery's edge is unchanged (45–69°).
- No new gate. The window carries each picture's spread: σ_p plus σ_v grown over the picture's age. It widens the
  margin spreads (contest, undercut, and the catch point through the receiver's spread) and the accuracy σ in
  quadrature. The age spreads that PICTURE_AGE adds also come on with this flag, since an old peripheral picture is the
  same uncertainty. A man seen from the corner of his eye is priced less confidently, and an old picture less still.
- The decision-information scan stays at its listed counts. His own mind is read once per look and passed in, and the
  receiver offset is reused; no row is raised.

**Measured.** The same 8 games (seeds 11–14, 31–34), flag off against on. The games diverge, so the outcome rows are
not paired.

The decision's picture, by head angle at the windup (p50 / p90; off → on):

| head angle | n (off / on) | receiver error, yd | near defenders' error, yd |
|---|---|---|---|
| 0-15° | 332 / 338 | 0.04 / 0.19 → 0.07 / 0.23 | 0.13 / 0.54 → 0.21 / 0.61 |
| 15-30° | 109 / 90 | 0.05 / 0.18 → 0.32 / 0.65 | 0.13 / 0.57 → 0.32 / 2.05 |
| 30-60° | 107 / 97 | 0.13 / 0.54 → 0.56 / 1.38 | 0.33 / 1.71 → 0.63 / 2.13 |
| over 60° | 93 / 77 | 0.32 / 1.17 → 0.50 / 2.20 | 0.50 / 6.43 → 1.09 / 6.62 |

The error now grows with the angle off his gaze, and in the cone it barely moves.

Throws by head angle at the decision (completion, INT, yards per attempt; off → on):

| head angle | off | on |
|---|---|---|
| 0-15° | n 265, 67%, 5, 7.1 | n 256, 69%, 4, 8.6 |
| 15-30° | n 111, 72%, 2, 8.1 | n 111, 66%, 1, 7.2 |
| 30-60° | n 125, 74%, 2, 8.2 | n 112, 64%, 4, 7.8 |
| over 60° | n 120, 72%, 1, 8.7 | n 95, 75%, 2, 6.1 |

Off, throws decided off-gaze completed *better* than throws he was looking at: the leak's signature. On, 15-60°
throws fall to 64-66% while in-cone throws hold.

Over 60° is unchanged at 75%. Those targets are outside the periphery (no new look), so the throw is priced on the
installed-route forecast and old memory. The forecast's own uncertainty there comes only from PICTURE_AGE's age
spread. That is the next place to look, not settled here.

Whole sample (8 games, off → on):

| | off | on |
|---|---|---|
| dropbacks | 692 | 648 |
| completion | 70.0% | 68.5% |
| INT | 10 | 11 |
| sacks | 30 (4.3%) | 36 (5.6%) |
| throwaways | 16 | 16 |
| time to throw p50 | 2.75 s | 2.75 s |
| yards per dropback | 6.89 | 6.68 |

Sacks +6 is inside one SE (about 5.5), but it is the direction a less certain picture would push. Watch it on a
paired run.

Open receivers turned down, while set (off → on):

| | off | on |
|---|---|---|
| open receiver never thrown | 18% of dropbacks | 20% |
| not in read order yet | 65% | 65% |
| his read, eyes not there yet | 17% | 20% |
| read already passed | 10% | 8% |
| eyes on, not ready | 4% | 2% |
| eyes on, priced shut | 4% | 3% |
| footwork gate | 1% | 1% |

- Of the open men he never looked at, the share whose price would clear his bar fell from 52 of 88 to 38 of 83. A man
  he has not looked at is now priced on a vaguer picture.
- Turned-down open throws remain a progression-reach and eye-timing problem, as before. This flag was not meant to
  move that.

Eyes at the windup (off → on):

| | off | on |
|---|---|---|
| eyes on target → release p50 | 0.30 s | 0.25 s |
| eyes never within 15° before release | 13% | 18% |
| windup starts before eyes arrive | 57% | 54% |
| head angle at windup p50 / p75 / p90 | 20 / 50 / 76° | 18 / 44 / 75° |
| over 30° | 39% | 36% |
| over 60° | 19% | 17% |

He still decides off-gaze about as often. The price now carries the error, so he is no longer rewarded for it, but
nothing makes him prefer looking first. A must-look rule was ruled out by the assignment.

The rise in "never within 15°" (13% → 18%) is unexplained and about 2 SE. The narrower cone sends hot throws to look
first more often (HOT_LOOK's inClearLook), which would push the other way. Left for a paired check.

**Dither budget** (test/dither-budget.test.ts):
- Off, it passes.
- On, it fails one row: controller carrier, 0.296/s recorded, 0.390/s measured, budget 0.378 (pooled, three draws).
  Every other controller and stage is inside its budget.

Attribution (the panel's 95 pass plays × 3 draws, per play; scratchpad probe, same plays and seeds):
- Carrier reversals rise from 123 to 149, and 148 of the 285 plays change course.
- The added events are carrier / spacing (27 → 33) and carrier / mode switch (0 → 3). They are spread thin: the largest
  is curl_flat seed 5 (+6, one play), then a screen (+5) and mesh (+4 each).
- In curl_flat seed 5 the throw is the same (2.35 s, Y on the flat) and so is the catch time (3.40 s). His head first
  differs at 1.90 s, by 0.003 rad, because the eyes follow the re-priced options. The zone defenders who read his eyes
  then break on slightly different lines, and the run after the catch meets them in different places.

The carrier's controller and stages are not touched by the flag. This is the course-change effect the test file
already records for ZONE_EYES (engine-75), not a stage that flips. The budget was not raised. The row must be
re-recorded, or the panel's small-sample carrier row pooled further, before the flag is promoted.

**Checks (worktree on 0226f0d3):**
- typecheck clean;
- reference-stack and decision-information guard/scan pass;
- baseline-runner fails its three Node-pin cases here because the container runs Node 22.23.4 against .nvmrc 22.23.3.
  That is environmental; the same cases fail without the patch.

Flag registered off: baseline "0", reference-stack "off", a FLAGS.md row, count 499 (92 off).
