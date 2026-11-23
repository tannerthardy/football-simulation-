# Reach, release timing and the flash read (2026-11-23)

Integration's item, measurement first, on top of PERIPH_ACUITY (engine-92):
1. What the parked READ_WINDOW + quick clock does to the open-turned-down table and to time to throw.
2. Rules' stop-route timing: the NFL releases about 0.2 s before the plant, ours at or after it. Release against the
   break by route family, NFL against ours, and what gates our release.
3. The flash off-read, as a proposal: whether a passer who sees a man come open in his periphery should move his eyes
   there rather than continue the taught order. It also covers the user's question: does he anticipate from the
   coverage he believes, and how is that modelled without making him overpowered?

## 1. READ_WINDOW + quick clock on engine-92

Same 8 games, not paired: the games diverge. Columns are engine-92 → engine-92 + READ_WINDOW + quick clock.

| | engine-92 | + READ_WINDOW + quick clock |
|---|---|---|
| dropbacks | 648 | 678 |
| completion | 68.5% | 69.4% |
| INT | 11 | 6 |
| sacks | 36 | 40 |
| throwaways | 16 | 23 |
| time to throw p50 / p25 | 2.75 / 2.35 s | 2.70 / 2.30 s |
| yards per dropback | 6.68 | 6.38 |
| open receiver never thrown | 20% of dropbacks | 19% |

Turned-down open men, by cause (engine-92 → with READ_WINDOW):
- not in read order yet: 65% → 63%;
- eyes not there yet: 20% → 17%;
- read already passed: 8% → 10%.

It moves the quick game a little earlier. Quick throws go 76 → 94, and on stop routes the read becomes current 0.2 s
sooner. It does not change the progression's reach.

## 2. Release against the break

`scripts/diag/routes/release_vs_break.py`, one operator. NFL: BDB 2025 with player_play.csv; ours: the engine-92
export, seeds 11/23 × 4. Targeted receiver, thrown passes. The break is the plant on a stop route (first frame after
his peak speed below half of it) and the sharpest turn on a breaking route.

| family | n NFL / ours | release − break p50, NFL / ours | thrown before the break | release p50 | break p50 | receiver speed at arrival |
|---|---|---|---|---|---|---|
| stop | 1302 / 208 | −0.10 / +0.30 s | 50% / 19% | 2.50 / 2.70 | 2.50 / 2.30 | 2.3 / 1.9 yd/s (under 1: 13% / 25%) |
| out | 1418 / 100 | +0.30 / +0.60 | 25% / 10% | 2.70 / 2.70 | 2.20 / 1.80 | 6.0 / 4.8 |
| in | 1463 / 89 | +0.40 / +0.70 | 17% / 3% | 2.50 / 3.10 | 2.10 / 2.40 | 5.8 / 5.7 |
| cross | 960 / 49 | +1.60 / +0.70 | 18% / 24% | 3.00 / 2.70 | 1.50 / 1.80 | 7.2 / 5.5 |

On the operator: the break is found on only 688 of 1,418 NFL outs and 114 of 960 crosses (a 25° turn threshold).
Crosses are not comparable.

Our stop, out and in routes break as early as the NFL's or earlier, but the ball leaves 0.3–0.4 s later against the
break.

**What gates it** (`scripts/diag/eyes/release-gate.ts`, league games, 557 throws). For the receiver thrown to, the
first time each gate came true:
- **`ready()` is not the gate.** It comes true a windup plus 0.3 × anticipation before the break he expects, as built.
  His expected break (forecast) runs 0.4–0.8 s after the route's own `breakTime`, but the measured plants are later
  than `breakTime` too, so `breakTime` is not the plant.
- **The price is.** Relative to his expected break on stop routes:
  - ready comes true 0.42 s before it;
  - the read becomes current, and his eyes arrive, about at it;
  - the price clears at −0.03 s;
  - he decides at +0.05 s, and the windup follows.

  At the first ready tick the throw clears his bar on 21% of stop routes (38 of 180), 37% of outs and 31% of ins.

**Why the price is shut before the plant** (`scripts/diag/eyes/stop-price.ts`, staged stop routes: curl_flat, stick,
quick_hitch, hitch_cross, dagger × Cover 1/2/3/4/6 × 3 rosters × 2 seeds × flip; 137 with a plant):

| t − plant | clears his bar | P (bar 0.56) | pick risk (bar 0.04) | pOpen | pClear |
|---|---|---|---|---|---|
| −0.6 s | 4% | 0.10 | 0.24 | 0.40 | 0.27 |
| −0.3 s | 9% | 0.21 | 0.13 | 0.57 | 0.63 |
| 0 | 18% | 0.20 | 0.08 | 0.71 | 0.82 |
| +0.4 s | 37% | 0.41 | 0.06 | 0.68 | 0.83 |

- Before the plant, the undercut and path terms (pClear and the path pick risk) and the contest (pOpen) shut it. The
  closest defender is about 3 yd from the target and is priced as reacting 0.14 s into the windup.
- His picture of the stop receiver is 0.45 s old, and the stop is the current read on only 6–12% of these samples.
- QB_CLOSE_BELIEF (on in a re-run) changes it little: −0.3 s clears 9% → 11%; release − plant p50 +0.85 → +0.85.
- So the gap is not the closing defender alone. It is the path and undercut price of a ball thrown before the break,
  with the defender's reaction counted from the windup. The next step is a targeted check on a few plays: is the path
  defender truly in the lane, and is his reaction to the motion right? Not built.

**The read clock waits on the set.** From the drop measurement (docs/reviews/2026-11-23-drop-set.md), every beat after
read 1 counts from `setAt`. Together with the shut pre-break price, that is the shared root of the late quick game,
release at or after the plant, and the reads never reached.

## 3. Proposal: the flash read, and coverage anticipation

**How much it could reach.** Of the open men never thrown because they were not yet in his order (117 on engine-92;
114 with READ_WINDOW), measured on truth:
- 53–61% were inside 60° of his head while open;
- 32–37% had the gap to their nearest defender grow 1+ yd over the 0.25–0.5 s before;
- only 21–24% had both, a flash he could detect. That is about 4% of dropbacks.

So the flash is a real but modest part. Most of the 65% is the order's reach: the clock from the set, and the
pre-break price on the reads he does reach.

**Proposal (not built; a flag when built).** Today his coverage expectation reorders his reads once, when he identifies
the coverage, and fills unseen defenders where that coverage puts them. Nothing says "Cover 2 rotated, so the hole shot
is next", and nothing uses what he sees in his periphery to change where his eyes go. The proposal:

1. **What he can detect off his gaze** (stated vision facts, already the basis of PERIPH_ACUITY): motion and relative
   motion, but not exact position. The cue is the gap between a receiver and his nearest defender growing in his own
   peripheral pictures. To count, it must grow by more than the error the look states (the sigP of both men, which
   rises with eccentricity and falls with vision), over a short window (about 0.25 s).
2. **The coverage expectation as a per-defender prior.** It sets where he expects a window to open (the hole behind a
   sinking flat defender in Cover 2; the seam window when the middle opens). Today's coverage belief feeds this; the
   per-defender form waits on Coverage's man technique. A flash that agrees with the expectation is believed sooner,
   and one against it needs more evidence. This is anticipation: the expectation chooses where to look, and it never
   prices a throw.
3. **The decision.** His eyes go there when the evidence for the flashed man (prior × cue) beats staying on the current
   read by an entry margin.
   - The exit margin sits on the far side (CLAUDE.md: commit to a decision).
   - At most one flash per play.
   - READ_WINDOW holds: the read he left is passed.
4. **The price follows the look.** The throw is priced only from the look his eyes then take: clear cone, fresh
   picture, PERIPH spreads. A flash earns a look, not a throw.
5. **Why it is not overpowered.** The limits are real costs, not caps:
   - the head turn and the glance (HOT_LOOK's timing);
   - abandoning his current read;
   - the peripheral error, which is large at 45°+;
   - defenses that bait the flash (a robber sitting in the expected hole; a defender who opens late);
   - vision and decision-making setting the cue threshold.

   A wrong expectation sends his eyes to the wrong place, and he pays for it in time.

Measurement for a first build:
- the flash count against this 21–24% bound;
- the open-turned-down table;
- completion and pick rate on flashed throws against looked-at throws (they must not complete better);
- the dither budget's QB facing row.
