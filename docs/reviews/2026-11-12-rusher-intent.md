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
