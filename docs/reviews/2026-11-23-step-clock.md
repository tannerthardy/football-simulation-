# The step clock, the defender's start and the batted ball (2026-11-23)

Integration's go after the path-term check (docs/reviews/2026-11-23-reach-and-release.md §4–5), with conditions and the
user's: the clock is intent, not a script. A look takes time to resolve, and he leaves or throws when confident. That is
two quantities per passer: how fast a look resolves, and how sure he needs to be. The build is three separable flags,
all off, on develop 7b36c6e5 (engine-92).

Patch: `docs/reviews/patches/engine71-footwork/step-clock-def-start-bat-on-7b36c6e5.patch`. It also applies to develop
7689bc4e7.

## What was built

**`QB_STEP_CLOCK`** (src/sim/behaviors/qb.ts: `clockAt`, `updateLook`, `resolveTime`, `confidenceNeed`, the drop's
plant, the read's leave, the window's look spread).

- **The clock.** He plants at his set point or on the drop's count from the snap (snap + called drop time), whichever
  comes first. Off, the drop ended on its 0.4 s overtime more often than on arrival: phase set p50 1.45 s on a quick drop
  called for 0.75, 2.30 s on a five called for 1.4. Every later beat counted from that late set. Each read's step lands
  n strides after the plant. A read's time is its step (one stride), not the rating-set dwell. READ_WINDOW and the quick
  clock ride with it (`READ_WINDOW || QB_STEP_CLOCK`).
  - A first form timed the clock from the count even when he had set earlier. Play-action sets reached before the fake's
    full 1.8 s count were held to it, and play-action sacks went 12 → 21. Fixed (the earlier of the two) before the
    reported runs.
- **A look resolves.** From when his clear cone holds the man, resolved = 1 − e^(−dwell/τ).
  - τ = (0.12 + 0.36 (1 − proc)) × (1 + 0.8 narrow) × (1 + 0.6 (1 − agreement)).
  - proc = 0.4 playRecognition + 0.4 decisionMaking + 0.2 min(1, experience/8).
  - agreement is the overlap of his coverage belief now with his belief at the snap (disguise slows him).
  - An unresolved look adds LOOK_SEP 0.5 yd × (1 − resolved) in quadrature to the receiver's spread and to the men
    within 4 yd of him, in the window price. A rough picture is priced as rough.
- **He moves on when sure.** At a read's step he leaves only when resolved ≥ need.
  - need = (0.3 + 0.5 × ½(composure + discipline)) × (1 − (0.8 − 0.4 composure) × u), so felt pressure lowers it.
  - u ≥ 0.8 overrides.
  - Resolution only grows while his eyes stay, so the choice cannot flip back.
  - No outcome is set by a rating: ratings act on τ, the need and the pressure response.

**`QB_DEF_START`** (the window).
- **When a defender starts.** Each defender keeps his seen course and momentum until he can know to break, then turns
  with no second delay. All starts are as the passer believes him (his believed reaction rt, QB_BELIEVED_DEF):
  - a zone man facing the passer: windup + rt;
  - one not facing him: windup + 1.8 rt;
  - the man on the target: break + rt, weighted by the passer's man belief against the zone start.
  - A man sitting on the spot or moving into the lane keeps his early arrival through his momentum.
- **The receiver's body.** A defender whose way to the ball's path runs through the receiver's body (his forecast spot
  at that moment, radius sum + 0.2) goes around it, adding the chord's detour (`screenDetour`).

**`QB_BAT_HEIGHT`** (the window). A rusher is engaged in his picture, or within 2 yd past the line. He is priced as the
engine bats a ball (catching.ts `defenderPlay`):
- the chance the arc passes inside his raised hands (reach, reaction-reach height, ×0.95 engaged) in the flight's first
  0.4 s;
- times the engine's batting chance: 0.12 free or 0.04 engaged, ×0.2 not facing, his recognition unknown to the passer
  (the middle);
- BAT_PICK 0.1 of those as picks.

The general undercut term no longer applies to him.
- A first form used a yes/no reach from the picture. On our own rushers it predicted 12.9 bats against 20 actual, half
  of them on throws it priced at zero (engaged DL 4.6–6.4 yd from the QB, batting at 0.10–0.25 s), and it over-priced
  the top bin (7.0 against 3). The reach is now a soft edge: logistic((reach − distance)/σ), σ = hypot(0.35, his
  picture's spread, 0.4 × (windup + τ)), the engaged drift factor 0.5.
- Re-measured on the price arm (645 attempts):
  - predicted 16.2 bats, actual 19;
  - by priced bin (predicted / actual): under 0.01, 0.8 / 0; 0.01–0.03, 2.8 / 6; 0.03–0.06, 6.1 / 7; 0.06+, 6.5 / 6.
- NFL: DE/DT/NT defend 2.0% of attempts (BDB 2025 player_play passDefensed, 8,728 attempts), 3.1% with OLBs, an upper
  bound since OLBs also drop.
- Ours batted 2.0% off and 2.9% on the price arm.

Flags are registered off (baseline "0", reference stack "off", FLAGS rows); count 502 (380 on, 94 off).

## What the engine does today for a low- against a high-rated passer

Staged panel: `scripts/diag/eyes/rating-panel.ts`, 256 plays per row (curl_flat, smash, dagger, mesh, quick_outs,
stick, flood, y_cross × Cover 1/2/3/4 × 2 rosters × 2 seeds × flip). One passer, his mental ratings set to 35 / 60 / 88
(experience 0 / 4 / 10). Arm, accuracy and body are his roster's.

| all off | completions | INT | sacks | dwell per read p50 | reads left with under 0.2 s eyes-on | release − break |
|---|---|---|---|---|---|---|
| 35 | 140 | 3 | 17 | 0.30 s | 18% | +0.50 |
| 60 | 163 | 2 | 15 | 0.25 | 36% | +0.55 |
| 88 | 172 | 1 | 12 | 0.20 | 61% | +0.65 |

Today his eyes differ by rating only through the dwell (0.42 + 0.4 (1 − decisionMaking) − 0.1 awareness). So the best
passer moves on fastest, leaving 61% of reads before his eyes have been on the man 0.2 s: the darting pattern, on the
wrong passer. There is no stare-down, and nothing makes a look's quality depend on how long it lasted. The rest of the
outcome gap comes from the bar (aggression), processing() in the eyes gate and the windup.

## The panel with the clock

Adding two mixed profiles: stare (processing 35, composure and discipline 88) and dart (processing 60, composure and
discipline 30). From the clock's own log of each read he left:

| QB_STEP_CLOCK | resolved when he leaves p50 | his need | reads held past the step | held p50 / p90 | completions | sacks |
|---|---|---|---|---|---|---|
| dart | 0.48 | 0.45 | 34% | 0.05 / 0.15 s | 158 | 15 |
| 35 | 0.53 | 0.47 | 46% | 0.10 / 0.20 | 152 | 18 |
| 60 | 0.64 | 0.60 | 56% | 0.15 / 0.25 | 163 | 16 |
| 88 | 0.78 | 0.74 | 57% | 0.15 / 0.35 | 175 | 12 |
| stare | 0.75 | 0.74 | 75% | 0.30 / 0.45 | 149 | 17 |

- The stare-down passer holds three reads in four past their step, 0.30 s at p50, and the darter leaves on rough
  pictures. Both come out of the two quantities. The high-rated passer's reads left before 0.2 s of eyes-on fall from 61%
  to 31%.
- **A caveat on the profiles.** A passer whose mental ratings all move together is not a stare-down at the low end: low
  composure and discipline make him need little, so he darts on slow looks.
- **A caveat on the "read 1 past its step" count** (47% → 22% at 35): it does not show staring, because read 1 is looked
  at through the drop and is resolved by its step. The clock's log is the measure.

With clock and price (`both`), completions are 153 / 160 / 173 / stare 157 / dart 166, and release − break +0.50 /
+0.45 / +0.65.

## League games

8 games per arm (seeds 11–14 and 31–34; exports 11 and 23 × 4). Not paired: the games diverge. Integration's card is
the paired test.

| | off | clock | price | both | NFL |
|---|---|---|---|---|---|
| completion | 68.5% | 67.6% | 66.5% | 71.9% | |
| yards per dropback | 6.68 | 6.63 | 6.84 | 7.31 | |
| INT | 11 | 8 | 9 | 11 | |
| sacks | 36 | 38 | 33 | 29 | |
| throwaways | 16 | 25 | 19 | 14 | |
| time to throw p50 | 2.75 s | 2.65 | 2.60 | 2.55 | 2.47 |
| open man never thrown | 20% | 22% | 18% | 19% | |
| of those, not in read order yet | 65% | 74% | 80% | 70% | |
| batted per attempt | 2.0% | 1.8% | 2.9% | 1.6% | DL 2.0% (3.1% with OLB) |
| stop: release − break p50 | +0.30 s | +0.20 | +0.20 | +0.10 | −0.10 |
| stop: thrown before the break | 19% | 19% | 24% | 30% | 50% |
| out: release − break | +0.60 | +0.70 | +0.60 | +0.60 | +0.30 |
| in: release − break | +0.70 | +0.70 | +0.60 | +0.60 | +0.40 |
| gun 2–3.5 yd set (time, depth) | 2.00 s, 3.03 yd | 1.90, 2.69 | 1.90, 2.70 | 1.80, 2.64 | 2.00, 2.78 |
| under centre set depth | 6.27 yd | 4.60 | 6.23 | 6.07 | 3.70 |

Interceptions by throw timing, stop routes (before / after the break): off 3 of 37 (8.1%) / 4 of 162 (2.5%); both 1 of
60 (1.7%) / 2 of 141 (1.4%). Small counts. The risk of a defender truly sitting on the spot stays in the price (the
catch-point contest and jump terms are untouched): in the staged stop routes it is what still shuts most pre-plant
throws, an underneath man about 1.8 yd inside the hitch (§4 of the reach record).

## What it says

1. **The price was the gate, and the honest price opens it part way.** On staged stop routes, 0.3 s before the plant,
   QB_DEF_START takes the path pick from 0.142 to 0.023 and P from 0.21 to 0.37. What remains is the catch-point contest
   by the underneath man inside the hitch: real, and left in.
   - In games, stop routes thrown before the break go 19% → 30% with both flags (NFL 50%), and release − break goes
     +0.30 → +0.10 (NFL −0.10).
   - Whether our underneath droppers sit closer to hitch spots than the NFL's is a coverage question this does not
     answer.
2. **The clock alone does not extend his reach.** Unresolved looks are priced rough, and he leaves only when sure, so
   reads come no sooner: not in read order yet 65% → 74%. It does move the set earlier and shallower, nearer the NFL.
   Under centre, 6.27 → 4.60 yd against the NFL's 3.70, because he plants on the count.
3. **Together** they throw earlier (2.55 s p50) with fewer sacks (29) and no rise in picks. Not paired; the card decides.
4. **The batted price now matches our own rushers**, and the batted rate stays in the NFL's range.

**Checks** (develop 7b36c6e5 + patch):
- typecheck clean;
- reference-stack, information guard and scan, engine-pin, read-window, qb-stick, qb-peek-clock, qb-receiver-forecast,
  qb-memory-awareness and periph-acuity pass with the flags at their defaults;
- the read-window and qb-stick tests take the parked quick-clock patch's test hunks with it;
- dither budget passes with all three flags on.

**Film:** docs/reviews/film/qb-vision-2026-11-23/ (index.html + film.json; `scripts/diag/eyes/film-record.ts`). The
six plays at three ratings with the vision cone; also published for the user as a page. On three of the six (curl_flat,
dagger, mesh) all three passers throw the same ball at the same time: there, his eyes are not what decides the play.
