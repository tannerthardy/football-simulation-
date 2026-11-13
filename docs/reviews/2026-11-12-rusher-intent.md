# The pass rusher between moves (diagnosis, 2026-11-12)

Integration ordered this ahead of guard/back help. Our edge rushers cross their tackle's face at about 4 yd/s,
unslowed, and reach the QB after an across-the-face crossing 38% of the time against the NFL's 20%.

Tools:
- `scripts/diag/effective-mass/rusher-state.mts`: engine state; seeds 101-103, flags off.
- `scripts/diag/pass-operators/rusher-engaged.py`: the same code on NFL and sim; ours seed 201 x 8.

## Engaged rusher speed (an OL within 1.0 yd, ball in), NFL / ours

| | speed p50 | toward the QB | across his line to the QB |
|---|---|---|---|
| edge 0.5-1.5 s | 3.58 / 4.01 | 2.53 / 2.34 | 2.20 / 3.23 |
| edge 1.5-2.5 s | 3.48 / 3.48 | 2.46 / 1.37 | 2.06 / 2.96 |
| edge 2.5-4.0 s | 2.36 / 2.80 | 1.37 / 0.20 | 1.35 / 2.50 |
| interior 0.5-1.5 s | 2.57 / 2.06 | 1.85 / 1.50 | 1.32 / 0.56 |
| interior 1.5-2.5 s | 2.37 / 2.00 | 1.68 / 1.21 | 1.18 / 1.24 |
| interior 2.5-4.0 s | 1.90 / 1.90 | 0.98 / 0.73 | 1.09 / 1.26 |

Engaged, the NFL edge rusher drives at the QB (2.5 yd/s through 2.5 s) with some width (about 2.1 across). Ours drive
at the QB about half as much after 1.5 s and run sideways along the blocker 40-85% more.

## Our rusher's request by state (stepPassRep), share of edge rep time

| state | share of edge rep time | requests (of vmax) | push | toward the QB (share of request) | achieved / toward the QB |
|---|---|---|---|---|---|
| between moves (no move window) | 50% | 0.90 | 0.75 | 0.66 | 3.30 / 0.70 |
| a failed move's window | 25% | 0.53 | 0.75 | 0.69 | 2.95 / 0.49 |
| 'power' (sticky: the last move was bull or long-arm, window over) | 16% | 0.55 | 1.00 | 1.00 | 2.16 / 0.72 |
| a live move | 3% | 0.90 | 0.35 | 0.80 | 4.78 / 3.36 |
| turned (phi x side > 0.5), any state | 6% | 0.54-0.92 | | 1.00 | 3.4-4.5 |

Interior: between moves 30% (0.87 vmax), failed move 24%, sticky power 39%, live moves 3%.

## Reading

- Half of an edge rusher's engaged time is the default between-moves request: 0.9 of his top speed at push 0.75,
  aimed at a corner beside the blocker. That corner is measured along his line to the QB, so a third of the request
  runs sideways along the tackle.
- No situation chooses that. A finesse rusher whose move failed or ended runs at the tackle's shoulder at near top
  speed, and a power rusher stays in 'power' after his move's window.
- That is the sideways scrape the NFL comparison shows (across 3.0 vs 2.1 yd/s, toward the QB 1.4 vs 2.5), and the
  fast, unslowed crossing.

## What intent alone can change (without touching move resolution)

Between moves, the rusher chooses from what he feels and sees (his leverage phi x side, his speed, the blocker's set
and hands), not from a default:
1. **Work the edge:** with leverage (phi x side > about 0.3), aim at the blocker's outside hip at a bend pace (his
   bend sets how fast he can run the arc while turning), not 0.9 vmax at a sideways corner.
2. **Convert to power:** with momentum and a blocker still giving ground, drive through his chest at the QB (push 1,
   at his drive pace); not sticky: chosen each decision, while it still has momentum.
3. **Reset and stall:** with neither (head-up, hands on, blocker set), fight the hands at a walking pace, staying in
   front, until the next move. That gives up speed, as a stalled NFL rusher does.
4. **Remove the stickiness:** 'power' is live only while a power move's window lasts or he has just chosen to
   convert.

This changes only his request (speed, push, aim) between moves. Move selection and the roll are untouched (the roll
is the GAPS item). Gates:
- rusher-engaged.py's speed toward the QB and across, by time;
- inside-cross.py's crossing speed and reach-the-QB after an across-the-face crossing;
- pressure-source, edge win, sacks;
- the run report as control (run reps do not use this path).

# RUSH_INTENT: two attempts

## Attempt 1 (b6f2a8d1)

Edge with leverage; power with momentum and a blocker giving ground; stall (1.2 yd/s) otherwise.
- Commitment: 0.25 intent switches/s, 3% reversed within 0.6 s.
- But stall took 77% of engaged time: it was self-locking, because stalling killed the momentum that power required.
- Engaged edge speed 3.26 / 2.37 / 1.27 (NFL 3.58 / 3.48 / 2.36); toward the QB 1.90 / 1.06 / 0.42, worse than off.
- Pressure 32.4% looked NFL-like, but for the wrong reason: the rushers walked.

## Attempt 2 (d5af34e3)

With no leverage he presses through the blocker at the QB (0.55 vmax, push 0.75-1.0 by power and mass). He stalls
only while being driven back.
- Commitment: 0.10 switches/s, 5% reversed. Press 87%, edge 12%, stall 0%.

Engaged edge rusher (rusher-engaged.py), toward the QB / across:

| | 0.5-1.5 s | 1.5-2.5 s | 2.5-4.0 s |
|---|---|---|---|
| NFL | 2.53 / 2.20 | 2.46 / 2.06 | 1.37 / 1.35 |
| off | 2.34 / 3.23 | 1.37 / 2.96 | 0.20 / 2.50 |
| RUSH_INTENT 2 | 2.44 / 2.40 | 1.81 / 1.86 | 0.68 / 1.79 |
| RUSH_INTENT 2 + PAST + TACKLE_SET + OPEN_HANDS + PUNCH | 3.10 / 1.38 | 2.40 / 1.86 | 1.31 / 1.32 |

| seed 201 x 8 | pressured | in front | inside (free) | past outside | at the win | edge win | across-face crossers reach the QB | sacked | tackle retreat 1.5-2.0 s |
|---|---|---|---|---|---|---|---|---|---|
| off | 36.5% | 12.6% | 6.5% (96%) | 2.2% | 10/57/33 | 13% | 38% | 4.5% | −3.50 |
| RUSH_INTENT 2 | 42.6% | 14.0% | 9.1% (97%) | 4.0% | 13/52/35 | 18% | 39% | 6.2% | −3.00 |
| PAST + SET + OPEN + PUNCH | 37.2% | 8.7% | 4.8% (94%) | 4.5% | 25/47/28 | 12% | 30% | 3.8% | −3.50 |
| + RUSH_INTENT 2 | 39.6% | 10.0% | 5.1% (89%) | 6.3% | 26/51/23 | 14% | 58% (n small) | 4.6% | −3.00 |
| NFL | 32.9% | 3.0% | 6.4% (48%) | 3.8% | 26/27/47 | 13% | 20% | 6.7% | −2.75 |

**Reading.**
- The direct measurement the item was for (an engaged rusher's drive at the QB against his sideways scrape) moves
  most of the way to the NFL's, with the other flags almost all the way.
- But a pressing rusher walks the tackle back: pressure and the in-front share go up. That is the tackle's anchor
  (the walk-back diagnosed earlier), now loaded by a rusher who pushes, not the rusher's intent.
- Two attempts. The mechanism (his request) is repaired in the direct measurement; the outcome waits on the tackle's
  side.

# Set A (PAST_ALONG_PATH + OPEN_HANDS + PUNCH): 2 x 16 read and holds, on engine-47 (31b41113)

Flags off are bit-identical to develop d6e3f56f. Seeds 201-216 and 301-316; per-seed values are 201 / 301.

| arm | pressured (pooled) | sacked (pooled) | in front at pressure | inside (free) | past outside | at the win past/front/inside | edge win | across-face crossers reach the QB |
|---|---|---|---|---|---|---|---|---|
| off | 38.4% | 6.8% | 11.8 / 15.0% | 6.5 / 9.5% (89-90%) | 1.6 / 2.4% | 7/59/34, 9/54/37 | 13 / 17% | 36 / 39% |
| A | 33.7% | 5.2% | 8.8 / 10.8% | 5.0 / 7.9% (89-90%) | 2.7 / 3.2% | 15/54/31, 14/49/37 | 11 / 14% | 32 / 30% |
| A + TACKLE_SET + RUSH_INTENT | 43.6% | 6.9% | 11.7 / 12.4% | 6.3 / 7.9% (89-92%) | 5.5 / 10.1% | 22/49/28, 30/42/28 | 15 / 21% | 59 / 52% |
| NFL | 32.9% | 6.7% | 3.0% | 6.4% (48%) | 3.8% | 26/27/47 | 13% | 20% |

Holding, offence (holds-probe.mts, seeds 101-108), per team-game, called:
- off: run 1.00, pass 0;
- A: run 2.81, pass 0.75, total 3.56;
- earlier, OPEN_HANDS alone with the phi frame and the anticipated release: 0.94;
- NFL 2022: about 1.1 accepted.
Hang-on choices: about 1.8-3.1 in every arm.

**Reading.**
- A moves every pass gate toward the NFL: pressured 38.4 → 33.7% (NFL 32.9), the corner win doubles at the win, and
  across-face crossers reach the QB less.
- Sacks fall 6.8 → 5.2% (NFL 6.7).
- A + TACKLE_SET + RUSH_INTENT overshoots pressure (43.6%), as expected while the anchor waits.
- **A is blocked as it stands by holding: 3.56 calls a team-game, 2.81 of them on runs.** Under PAST's frame (past
  along the man's path of travel) a run blocker's grip on a defender moving along the line -- a seal or reach on a
  pursuer -- counts as the man having left the frame. The grip lapses, or is kept and judged, much more often.
  Integration predicted this risk for the path-of-travel frame on seals and reaches. Next: which run blocks the calls
  come from, before any PR.

## Set A: holding diagnosed and fixed (03987d85, 37463008)

holds-detail.mts, seeds 101-108, offensive holding called a team-game:

| definition of 'past' (rep beat, grip frame, holding detector) | run | pass | notes |
|---|---|---|---|
| frames inconsistent (grip along the path only above 1 yd/s; detector on phi) | 2.81 | 0.75 | slow men kept a grip the detector called |
| along the man's path, everywhere (03987d85) | 8.06 | 1.06 | holder behind along the path 93% but still between man and ball (phi < 1) 91%: seals and down blocks on men running down the line |
| along his path AND no longer between him and where he is going (37463008) | 0.38 | 0.00 | the remaining calls have phi >= 1 |
| off | 1.00 | 0 | |
| NFL 2022 accepted | about 1.1 | | |

Run report for A on the final definition: all −0.24 (SE 0.07); outside zone −0.17 (0.09), inside zone −0.22 (0.19),
gap −0.24 (0.13), duo −0.49 (0.25), toss −0.58 (0.40), draw +0.00. Earlier definitions: −0.39, −0.41. OPEN_HANDS
alone: −0.17. Zone hitter classes unchanged (OU DL blocked 50%, DL shed 5%).

The single definition, as Integration suggested: past = behind him along his path AND no longer between him and
where he is going (|phi| >= 1 against his line to the ball carrier or QB); below 1 yd/s, the leverage alone. The
pass 2 x 16 for A is re-run on it before the PR.

## Set A on the final definition: the pass 2 x 16 (q201-A, q301-A; off arms reused, same base)

| | pressured (pooled) | sacked (pooled) | in front at pressure | inside (free) | at the win past/front/inside | edge win | across-face crossers reach the QB |
|---|---|---|---|---|---|---|---|
| off | 38.4% | 6.8% | 11.8 / 15.0% | 6.5 / 9.5% | 7/59/34, 9/54/37 | 13 / 17% | 36 / 39% |
| A (37463008) | 31.3% | 4.1% | 8.3 / 10.9% | 5.4 / 7.2% (92-96%) | 9/54/37, 11/50/38 | 9 / 13% | 25 / 27% |
| NFL | 32.9% | 6.7% | 3.0% | 6.4% (48%) | 26/27/47 | 13% | 20% |

**Reading.**
- Pressure lands on the NFL's (31.3 vs 32.9%), the walked-back tackle's in-front share falls, and across-face crossers
  get home about as rarely as the NFL's (25-27 vs 20%).
- **Sacks fall below the NFL's (4.1 vs 6.7%).** The corner win at the win shrinks back toward off (9-11%), because
  'past' now requires the man to be out of the tackle's way. That leaves the ride for genuine corners only.
- A worse statistic is not a veto. The explanation is the mechanism: A removes the free restraint-and-chase the
  engine had, and does not yet add what lets a rusher win (the anchor and the moves are physical next).

# HOLD_CALL (off, parked): committed / material / called (90f87a6f)

The offence's hold is judged in stages, not by which exemption fires first (`src/sim/contact-holding.ts`, `holdStage`).
Committed is a clear restraint of a man past the blocker's frame (PAST's test, now ahead of the point-of-attack and
double no-calls) or whose feet the grip took. Material is the man at the point of attack, or the next defender to the
ball (distance over top speed against every unblocked standing defender), asking toward it, not inside a double.
Called is material and seen: OFFICIATE's ramp on the act's accumulated opposing Δv (0 at 0.3 yd/s, 0.6 at 1.8 yd/s),
divided by 1 + the other bodies within 1.5 yd of the man, one draw per pair per play. Not fitted. Off is bit-identical.

Set A + HOLD_CALL, seeds 101-108 (16 team-games), per team-game (`holds-probe.mts`):

| | committed | material | called |
|---|---|---|---|
| run | 1.69 (27) | 0.69 (11) | 0.06 (1) |
| pass | 0.06 (1) | 0 | 0 |

NFL 2022: about 1.1 accepted offensive holds per team-game in all.

- Pass: 3,145 pass-pro restraint records, all with the blocker still in front by PAST's frame. Our rushers almost never
  get by a tackle who still has hands on them, so the hold has nothing to act on. The frame is not to be loosened to
  make pass holds; they should appear when edge rushers win the corner at the NFL's rate (the anchor, the rusher's work).
- Run: material holds deliver Δv 0.16-0.73 yd/s, mostly with 1-5 bodies near; the chance seen is 0-0.17. The one call
  was 2.2 yd/s in the clear. Not material: 13 not next to the ball, 3 not going toward it.

Notes for when edge rushers win (Integration, 2026-11-12):

- (a) PI's visibility ramp was fitted on unoccluded downfield contact. It is probably too hard on line play, where the
  umpire and referee are positioned to watch exactly this; holding's visibility needs its own basis.
- (b) "Material" as next to the ball and going toward it looks right.

# RUSH_INTENT with set A: the pressure decomposed (seed 201 x 8, on this head; `pressure-source.py`, same code on NFL)

Per presser class: share of dropbacks, free then (no blocker within 1.0 yd), arriving before 2.5 s (of dropbacks),
sacked per pressure.

| presser | NFL | off | A | A + RUSH_INTENT | RUSH_INTENT |
|---|---|---|---|---|---|
| dropbacks | 9713 | 686 | 717 | 682 | 689 |
| **pressured** | **32.9%** | 37.0% | 25.4% | **34.6%** | 40.3% |
| edge past outside | 3.8%, free 36%, by 2.5 s 1.3%, sk 15% | 0.9% | 1.7% | 3.1%, free 67%, 2.8%, sk 19% | 4.6%, 4.1% |
| edge level / in front | 3.0%, free 18%, 0.5%, sk 20% | 12.7%, free 21%, 4.2%, sk 2% | 7.9%, free 58%, 1.5%, sk 4% | 12.0%, free 42%, 5.0%, sk 5% | 11.6%, 4.9%, sk 5% |
| edge inside | 6.4%, free 48%, 1.9%, sk 22% | 7.1%, free 88% | 4.6%, free 82% | 7.9%, free 78%, 2.2%, sk 13% | 8.6%, free 83% |
| interior DL/LB | 9.8%, free 46%, 3.8%, sk 17% | 8.9% | 6.3% | 6.0%, free 54%, 2.2%, sk 24% | 9.3% |
| other | 10.0%, free 61%, 3.2%, sk 21% | 7.4% | 4.9% | 5.6%, free 58%, 1.8%, sk 18% | 6.2% |
| real pressure (all but in front) | 29.9% | 24.3% | 17.5% | 22.6% | 28.7% |
| sacked per pressure | 19.1% | 14.2% | 11.0% | 13.6% | 15.8% |

A + RUSH_INTENT, other gates:
- sacked 4.7% (A 2.8%; NFL 6.7%);
- edge win 14% (NFL 13%);
- at the win: past / in front / inside 13 / 51 / 36;
- retreat 1.0-1.5 / 1.5-2.0 / 2.0-2.5 / 2.5-3.0 s: −2.75 / −3.00 / −3.00 / −2.75 (A −3.00 / −3.25 / −3.00 / −2.75;
  NFL −2.50 / −2.75 / −2.25 / −1.50).

**Reading.**
- **With A, RUSH_INTENT does not overshoot.** Pressure is 34.6% against the NFL's 32.9%. A alone undershoots
  (25.4%). The 40.3% overshoot belongs to RUSH_INTENT on the off engine, where the tackle still drags and chases.
- **What RUSH_INTENT adds on top of A** (A → A + RUSH_INTENT, points of dropbacks):
  - edge in front +4.1, past outside +1.4, inside +3.3;
  - interior −0.3, other +0.7.
  It is the edge, not interior or free rushers arriving early.
- **The in-front class grows** from 7.9 to 12.0% of dropbacks (NFL 3.0%) and arrives early: 5.0% of dropbacks by 2.5 s
  against the NFL's 0.5%. It still converts at about 5% against 20%. Gate 1 is worse (31.3 → 34.7% of pressure); gate 2
  improves (17.5 → 22.6% of dropbacks, NFL 29.9).
- **With A on, RUSH_INTENT moves the retreat only a little** (about 0.25 yd/s early, nothing late). Without A it moves
  the pair's speed most of the way (pair-geometry table). With A's open hands and ride the pair already moves
  differently, so the walk-back left with A is the rusher in front pushing the tackle into the QB's space.
- So on top of A, RUSH_INTENT is right on total pressure, sacks, edge win and past outside, and wrong on the in-front
  class, which is the anchor's gate. Small cells (about 80 in-front pressures per arm); a 2 x 16 read would settle it.

## A + RUSH_INTENT on 2 x 16 (r201-ARI, r301-ARI) against A (q201-A, q301-A reused; same base, flags off bit-identical)

| | A 201 \| 301 (pooled) | A + RUSH_INTENT 201 \| 301 (pooled) | NFL |
|---|---|---|---|
| dropbacks | 1326 \| 1416 (2742) | 1370 \| 1403 (2773) | 9713 |
| pressured | 27.3 \| 35.1% (31.3%) | 34.5 \| 42.2% (38.4%) | 32.9% |
| sacked | 3.2 \| 5.0% (4.1%) | 4.8 \| 6.9% (5.9%) | 6.7% |
| sacked per pressure | 11.9 \| 14.3% | 14.0 \| 16.4% | 19.1% |
| edge win | 9 \| 13% | 14 \| 18% | 13% |
| in front at pressure, of dropbacks (share of pressure) | 8.3 \| 10.9% (30 \| 31%) | 11.5 \| 12.5% (33 \| 30%) | 3.0% (9%) |
| in front, before 2.5 s | 1.9 \| 3.7% | 4.5 \| 5.7% | 0.5% |
| in front, sacked per pressure | 1.8 \| 3.2% | 5.7 \| 5.7% | 19.9% |
| real pressure (all but in front) | 19.0 \| 24.2% (21.6%) | 23.0 \| 29.7% (26.4%) | 29.9% |
| past outside | 1.5 \| 2.5% | 2.6 \| 4.7% | 3.8% |
| inside (free then) | 5.4 \| 7.2% (92 \| 96%) | 8.1 \| 9.7% (83 \| 87%) | 6.4% (48%) |
| interior | 6.5 \| 8.0% | 6.4 \| 9.9% | 9.8% |
| retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0-4.0 s | −3.25 / −3.25 / −2.75 / −1.50 (both) | −3.00 / −3.00 / −2.75 \| −2.50 / −1.00 (both) | −2.75 / −2.25 / −1.50 / −0.50 |

What RUSH_INTENT adds on top of A, pooled, in points of dropbacks:
- edge in front +2.4, edge inside +2.6, edge past outside +1.6;
- interior +0.9, other −0.3;
- in all, +7.2 (+6.6 from the edge).

**Reading.**
- On 2 x 16, A + RUSH_INTENT overshoots pressure on both seed sets: 38.4% pooled against 32.9%. Each seed set is up
  about 7 points on A. The 8-game read (34.6%) was the low draw.
- Sacks are right (5.9% against 6.7%), with sacks per pressure closer (15.3% pooled against 19.1%).
- Edge win (14-18% against 13%) and past outside (2.6-4.7% against 3.8%) are in range.
- Retreat improves 0.25 yd/s at 1.5-2.5 s and 0.5 yd/s after 3.0 s.
- Real pressure improves (21.6 → 26.4%, NFL 29.9). The in-front class grows (9.6 → 12.0% of dropbacks against 3.0%)
  and arrives early (5.1% before 2.5 s against 0.5%).
- The overshoot is edge pressure, two-thirds of it in front or inside. Inside pressure stays free 83-87% against the
  NFL's 48%. Interior and other are roughly unchanged.
- A caveat: every arm carries PUNCH's QB misread (BLOCK_SEEN treats about 42% of engaged ticks as free rushers;
  previous section). It is common to A and A + RUSH_INTENT, but it may raise sacks and cut scrambles in both.

## Re-read on ba4b9866 (PUNCH's QB contact fix): A and A + RUSH_INTENT, 2 x 16 (seeds 201-216, 301-316)

| | A 201 \| 301 (pooled) | A + RUSH_INTENT 201 \| 301 (pooled) | NFL |
|---|---|---|---|
| dropbacks | 1279 \| 1354 (2633) | 1375 \| 1357 (2732) | 9713 |
| pressured | 29.9 \| 36.6% (33.3%) | 36.6 \| 43.5% (40.0%) | 32.9% |
| sacked | 5.3 \| 7.0% (6.2%) | 5.2 \| 8.2% (6.7%) | 6.7% |
| sacked per pressure | 17.8 \| 19.2% | 14.1 \| 18.8% | 19.1% |
| edge win | 11 \| 13% | 14 \| 19% | 13% |
| in front, of dropbacks (share of pressure; sacked per pressure) | 8.4 \| 10.4% (28%; 3.7 \| 7.1%) | 11.3 \| 13.9% (31-32%; 3.8 \| 5.9%) | 3.0% (9%; 19.9%) |
| in front before 2.5 s | 1.9 \| 3.1% | 4.0 \| 6.3% | 0.5% |
| real pressure (all but in front) | 21.5 \| 26.2% (23.9%) | 25.3 \| 29.6% (27.4%) | 29.9% |
| past outside | 1.8 \| 2.3% | 2.8 \| 4.6% | 3.8% |
| inside (free then) | 6.1 \| 7.9% (90 \| 86%) | 7.3 \| 10.2% (90%) | 6.4% (48%) |
| interior (sacked per pressure) | 7.3 \| 8.6% (27 \| 25%) | 8.8 \| 8.9% (16 \| 29%) | 9.8% (17%) |
| retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0-4.0 s | −3.25 / −3.25 / −3.00 \| −2.75 / −1.25 \| −1.50 | −3.00 / −2.75 \| −3.00 / −2.50 / −1.00 | −2.75 / −2.25 / −1.50 / −0.50 |

Against the pre-fix A (q201-A, q301-A): pressure 31.3 → 33.3%, sacks 4.1 → 6.2%, sacked per pressure about 13 → 18.6%.

**Reading.**
- With the QB reading locked-out blocks correctly, A alone lands on the NFL's pressure (33.3 against 32.9%) and sacks
  (6.2 against 6.7%), with sacks per pressure at the NFL's (18.6 against 19.1%). The sack fall in A's cards came from
  PUNCH's misread, not from A's mechanisms.
- RUSH_INTENT on top now overshoots pressure by 7 points (40.0%), all edge (in front +2.6, inside +1.7, past +1.6).
  Sacks stay at 6.7%. The reason to land it with A (putting the pass rush back in range) is gone.
- Still open with A: the in-front class (9.4% of dropbacks against 3.0%, converting about 5% against 20%), real
  pressure 23.9% against 29.9%, inside pressure free 86-90% against 48%, and the retreat curve.
