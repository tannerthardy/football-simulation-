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

## On engine-93 (FLIGHT_BREAK on): measured again, and the price is not ready there (2026-11-24)

Integration asked for the build to be measured on top of FLIGHT_BREAK (coverage/C14-flight-break a771ec841, engine-93),
with interceptions by the interceptor's state. Base: a771ec841 plus the patch.
- The defender-start rule was brought in line with the defenders' own rule (defense.ts `playBelievedBall`, the shoulder
  read and FLIGHT_BREAK):
  - one who sees the passer, man or zone, at the release plus 0.8 reactions (theirs is the reaction × (1 − 0.4
    anticipation); the passer cannot know the anticipation, so the middle);
  - a man on the target turned to his receiver at the break plus his reaction;
  - anyone else not facing him at the release plus 1.8 reactions.
- WIP diff: `docs/reviews/patches/engine71-footwork/step-clock-def-start-bat-on-engine93-a771ec84-wip.diff`.

Same 8 games per arm, not paired:

| engine-93 | off | clock | price | both |
|---|---|---|---|---|
| completion | 69.8% | 68.3% | 68.3% | 65.8% |
| yards per dropback | 6.64 | 6.09 | 5.95 | 6.39 |
| INT (of attempts) | 8 (1.3%) | 8 (1.3%) | 15 (2.4%) | 10 (1.5%) |
| sacks | 47 | 40 | 33 | 26 |
| throwaways | 23 | 28 | 9 | 8 |
| time to throw p50 | 2.75 s | 2.65 | 2.60 | 2.55 |
| stop: thrown before the break | 15% | 16% | 23% | 22% |
| batted per attempt | 0.7% | 1.8% | 1.6% | 2.1% |

**Interceptions by the interceptor's state** (`scripts/diag/eyes/int-price.ts`: at each decision, the window's
per-defender rows for the throw chosen and each defender's truth and picture):
- Nearly every interceptor broke on that throw (FLIGHT_BREAK's flightBreakOf set at the release): off 8 of 8, price 13
  of 15. None was tipped.
- Most were the defender covering the target (off 7 of 8, price 11 of 15), 3–9 yd from the spot at the decision, and
  most were already closing on it within 0.05 s of the decision.
- **His picture of them was right.** Error 0.1–0.5 yd and about 0.25 s old in all but two: a 3.1 yd error at 1.15 s on
  the off arm, and one phantom 28.8 yd off, a memory he had not refreshed.
- **His price did not see them coming.**
  - Priced picks against actual: off 7.0 against 8, price 6.2 against 15.
  - Most actual picks came on throws he priced under 0.01: off 5 of 8, price 8 of 15.
  - The interceptor was not priced as a threat at all (no row: contest under 0.05 and no pick term) on 4 of 8 (off) and
    10 of 15 (price). Where he was priced, his margin was +0.3 to +1.75 s: he arrives well after the ball, in the
    passer's model.
- So the miss is the window's arrival model against the engine's breaking defender, not his picture. It predates this
  build (half the off arm's picks are unpriced). QB_DEF_START makes it worse on engine-93 because it starts that
  defender later, and the defender arrives anyway.

**What follows.** The price arm (QB_DEF_START, QB_BAT_HEIGHT) is not for landing on engine-93 as built. The next step is
a measurement: for the defenders who break on a throw (interceptions and the rest), when they leave against the windup
and the release, how fast they close, where they meet the ball, and the window's priced arrival for the same men. Then
the arrival is brought to the body the engine moves: the break's moving goal and its braking, the start at the cue the
defender actually has. That is the same rule the defenders use, so the passer's belief follows FLIGHT_BREAK.

Also, for Coverage: several interceptors who broke at the release had their back to the passer (114–166° off him). What
cue a man turned to his receiver uses to break on the release is worth a check on their side.

**QB_KEY_THROW and QB_RHYTHM under the clock** (staged panel, mid rating, clock on, engine-93): neither is inert.
- QB_RHYTHM=0 changes 47 of 256 plays: completions 164 → 173, sacks 16 → 15. Its pressure rule, eyes to the outlet,
  still acts.
- QB_KEY_THROW=1 changes 37 plays: completions 164 → 164.
- So they are not folded silently into the clock. A retirement review needs its own measurement.

The clock arm is unaffected by the price question. On engine-93 it sets him earlier and throws earlier with the same
interception rate. Its yards per dropback (6.64 → 6.09) are within the unpaired spread, and the card decides.

**Flex's underneath-defender measurement (2026-11-24)** answers the coverage question in §"What it says", 1.
- Source: `scripts/diag/defense-film/stop_lane.py` on claude/quirky-franklin-9lbwbp; BDB 2025 weeks 1–2 against 8 of
  our games on the #872 base.
- Our underneath defender is in the stop and out lane at the break (within 1.5 yd of the QB-to-break segment) about as
  often as the NFL's. At 3–7.5 yd, NFL against ours: stop #1 8% / 11%, stop #2 5% / 12%, out #1 11% / 15%, out #2
  13% / 13%. Distances are close too: stop #1, nearest defender 4.2 / 3.9 yd from the receiver, 3.2 / 2.6 yd from the
  lane.
- So the remaining pre-break gap is the passer's price, not the coverage. Throws before a stop's break: NFL 59%, ours
  38% (#1) and 54% (#2).
- The next measurement is the window's arrival against the breaking defender, held until Coverage answers the
  back-to-the-passer question.

## Clock-only landing (2026-11-24)

Integration asked for QB_STEP_CLOCK alone, with READ_WINDOW and the quick clock, in the usual landing form; the price
code stays off develop until the arrival work changes it.

Patch: `docs/reviews/patches/engine71-footwork/step-clock-landing-on-7689bc4e.patch`. It applies to develop 7689bc4e7
and c0c4bdd70.
- **Defaults and engine id.**
  - QB_STEP_CLOCK is on by default (`=0` restores); the engine is engine-93 by merge order (renumber if
    coverage/C14-flight-break lands first).
  - READ_WINDOW is on with the clock and acts only with it (`READ_WINDOW=0` turns it off). Its read is now of the
    `!== '0'` form the scorecard's setting reader requires.
  - The flag count is 500: 382 on, 90 off.
- **The price code is removed:** no QB_DEF_START or QB_BAT_HEIGHT.
- **One fix since the measured runs.** A keyed pair (slant and flat) is one look; leaving it for a read outside it now
  passes both its routes. Under the clock, slant_flat's flat was otherwise thrown at 4.0 s on a 1.5 s flight after the
  order ran out (read-window test, on arm). This acts only with the clock, on keyed pairs.
- **Tests:**
  - read-window, the off control: with the clock the failure READ_WINDOW prevents shows as late flats, not reopened
    reads, so the control is reopened + late flats > 0.
  - qb-peek-clock: done with the peek by the second hitch, either to the back or by throwing a vertical from it (both
    arms throw the go at 2.25 s under the clock), with off no shorter. QB_PEEK_CLOCK no longer separates the arms on this
    play; it needs a scene or a retirement review.
- **Pinned to QB_STEP_CLOCK=0 with owner notes:**
  - acc-radius: the seam on the two-high scene comes at 3.3 s under the clock; QB to re-record.
  - drop-belief: the window's spreads carry each look's history, which confounds its "nothing else moves" comparison;
    QB to restate it.
  - tackle-set: the throw moves, so the tackler meets a different play; Defense to re-record.
- **red-diff** (quiet machine, on 7689bc4e7 + patch): **new red: 0, fixed: 1** (qb-stick, owner Coverage). The ledger is
  updated (59 entries).

## Clock-only landing refreshed at engine-94 (2026-11-24)

Rebased on develop c9e6c3f89 (engine-93, HEAD_FOLLOW on). The code and test hunks of
`step-clock-landing-on-7689bc4e.patch` apply unchanged; the registration was redone on engine-93's files:
QB_STEP_CLOCK (baseline "0", stack "on"), READ_WINDOW promoted to "on" (it acts only with the clock), stack id
engine-94, docs/FLAGS.md 501 flags (383 on, 90 off, 28 numeric), REFERENCE_STACK engine-94 section.
Patch: `patches/engine71-footwork/step-clock-landing-on-c9e6c3f8.patch` (17 files, +363/-38, sha256 6ff9d2123a9e),
`git apply --check` clean on c9e6c3f89. Typecheck clean. Red-diff (alone): tests run 4453; failing 59; on the
ledger 59; new red 0, fixed 0.

## Why the clock adds sacks (Integration's card, 2026-11-24)

Integration's card of the clock landing on engine-93: sack rate up in every seed (pooled 5.15% → 5.83%), completion,
yards, INT and YAC flat. Operator `scripts/diag/eyes/sack-cause.ts` + `sack_cause_table.py`, on the engine-94 landing
(wtClock94), 16 league games per arm, QB_STEP_CLOCK on and =0, the same seeds (11-18, 19-26):

| | clock on | clock off |
|---|---|---|
| dropbacks, sacks | 1476, 93 (6.30%) | 1440, 81 (5.62%) |
| sacked < 2.5 s / 2.5-3.5 / 3.5-4.5 / >= 4.5 | 1.29 / 3.59 / 0.95 / 0.47% | 2.08 / 2.50 / 0.69 / 0.35% |
| sacked on his last read | 61 (4.13%) | 47 (3.26%) |
| sacked on an earlier read / out of reads | 2.03% / 2 | 1.81% / 8 |
| keyed pair expired / quick family | 3 / 4 | 0 / 10 |
| felt (u >= 0.5) over 1 s before, still in the pocket behaviour | 2.57% | 1.32% |
| dropbacks ending on his last read: share, thrown, sacked | 26.8%, 80.8%, 15.4% | 27.4%, 85.6%, 11.9% |

Not the keyed pair (3 sacks), not READ_WINDOW (quick-family sacks fell 10 → 4), not a hold on a read he is working
(earlier-read sacks +0.2 points). The excess is on his last read: +0.87 points, against fewer early and out-of-reads
sacks. There he throws less (85.6% → 80.8%) and is sacked more. In 25 of the 61 the look at the last read had never
resolved (resolution 0: the man never inside his clear cone), and 33 of 61 were sacked with felt pressure under 0.8,
where the hold's pressure exit is. So the confidence hold and the unresolved-look spread in the price keep him on a
look that cannot resolve, past the checkdown/throwaway he took without the clock: a missed pressure response caused
by the new mechanism, not the intended cost of holding a read he is unsure of. Repair (controller): a hold lasts only
while the look is resolving (the man in his clear cone); with nothing resolving there is nothing to wait for.

### The repair and what remains (2026-11-24)

Repair (QB_STEP_CLOCK, controller): a hold waits only on a look that is resolving: the man in his clear cone, or his
head still on its way there (the turn left at the head rate, plus 0.1 s). Past that, a look that cannot resolve has
nothing to wait for and he moves on (the stare-down is intact: a look inside his cone still resolves at his rating).
Same seeds, 16 games per arm (sack-cause.ts; sack-probe.ts, which leaves all 1486 outcomes unchanged):

| | clock off | clock on | repaired |
|---|---|---|---|
| sacks | 5.62% | 6.30% | 6.26% |
| on his last read: thrown / sacked | 85.6 / 11.9% | 80.8 / 15.4% | 83.4 / 13.7% |
| holds on at the sack | 0 | 24 | 15 |
| sacked at 4.5 s or later | 0.35% | 0.47% | 0.13% |
| last-read sacks: time on the read p50 | 0.75 s | | 0.65 s |
| last-read sacks with the back in protection | 10 | | 13 |
| sacks on earlier reads | 2.36% | | 2.76% |
| time from the set to the sack p50 | 1.35 s | | 1.60 s |

The repair halves the last-read gap, but the total does not move. What remains is not on a stalled look, and not on a back
in protection; he does not wait longer there (0.65 s against 0.75 s). The probe found the last-read sacks mostly on a
back who is not throwable (P null on 34 of 52), in both arms alike, and pricing the look as resolved gives the same
P: the unresolved-look spread is not the cause either. The residue is diffuse: he reaches each read about 0.25 s later in the
down, the step pacing the clock exists to give him. At 16 games an arm the total is +0.64 ± 0.87 points, not
resolvable here; Integration's six-seed card (about 7,000 dropbacks) is the test. Release against the break, the same
seeds (release_vs_break.py), repaired against off: stop +0.30 / +0.30 s, out +0.60 / +0.60, in +0.50 / +0.70
(NFL -0.10, +0.30, +0.40).

### Refreshed landing with the repair (engine-94, r2)

`patches/engine71-footwork/step-clock-landing-on-c9e6c3f8-r2.patch` on develop c9e6c3f89 (sha256 db5a038a6178; `git apply
--check` clean; typecheck clean): the engine-94 landing plus the repair above. The first red-diff of the repair caught
an information leak in it (decision-information-scan: the head-turn allowance read the receiver's true position);
the allowance now turns toward his picture of the man (`this.mind.estimate(read).pos`). The sack runs above were taken
before that change; it moves only the head-turn allowance. Red-diff (alone): tests run 4453; failing 59; on the ledger 59;
new red 0, fixed 0.

### Landing refreshed at engine-95 on develop e5c6db5c9 (FLIGHT_BREAK merged)

`patches/engine71-footwork/step-clock-landing-on-e5c6db5c.patch` (sha256 19b4a68d06f2; `git apply --check` clean on e5c6db5c9;
typecheck clean). The r2 code and test hunks apply unchanged; registration redone on engine-94's files: QB_STEP_CLOCK
(baseline "0", stack "on"), READ_WINDOW "on", stack id engine-95, docs/FLAGS.md 503 flags (384 on, 91 off, 28 numeric),
REFERENCE_STACK engine-95 section (with the resolving-look line). Red-diff (alone): tests run 4453; failing 58; on the
ledger 58; new red 0, fixed 0.
