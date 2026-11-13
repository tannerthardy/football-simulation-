# TACKLE_SET: the tackle's set against an edge rusher (attempt 1, stopped)

Integration, 2026-11-12. The edge-rush diagnosis (`2026-11-12-edge-rush.md`) found our tackle ending deeper than the
QB (-8.2 vs -7.8 at 3.0 s; NFL tackle -6.8) while still asking to retreat. The assignment: kick to a set depth that
meets the arc short of the launch point, from what the tackle knows, then anchor. Add no strength or anchor capacity.
If he is driven back while asking to hold, report requested vs achieved and stop.

## Mechanism (flag `TACKLE_SET`, off)

- **Set depth from the call.** The tackle sets no deeper than the called drop's launch point plus a body width
  (`tackleFloor`, 1.0 yd). The drop spec now lives in `src/sim/called-drop.ts`, shared with the QB; the move is
  bit-identical. He still kicks with what he sees of the rusher's path, as PASS_KICK does.
- **Why it was never an anchor (off).** In the rep, the PASS_KICK extension follows the rusher's depth down to half a
  yard short of the QB's *live* spot, so a drifting QB takes the tackle with him. The mirror also runs across the
  rusher's line to the QB. Once the rusher is wide and deep that line is mostly lateral, so mirroring along it is a
  retreat: an LT 0.35 yd short of the floor asked for -7.8 yd/s.
- **The request (on).**
  - Short of the floor: no more depth speed than he can brake off before it. This uses the braking law movement
    already uses: sqrt(2 * 0.8 * brake * distance), as in `kinematics.ts`.
  - At the floor: none.
  - Unengaged: the PASS_KICK set is clamped at the floor and stops matching the rusher's retreat there.
- **Off is bit-identical.** Seed 999 export hash, against develop af9d7bd1.

## Bench: edge-probe, requested vs achieved (seeds 101-104, 4 games)

`node --import tsx scripts/diag/effective-mass/edge-probe.mts 101 4`, summarised by `edge-probe-sum.py`. The x
columns are yards past the line; velocities are along x, where negative is deeper.

| 3.0 s, ball in | off | on |
|---|---|---|
| tackle requested x | -2.01 | 0.00 |
| tackle achieved x | -2.26 | -1.48 |
| tackle depth | -7.97 | -7.36 |
| QB depth | -7.89 | -7.86 |
| tackle minus QB (NFL about +1.0) | +0.15 | +0.65 |
| tackle deeper than the QB | 48% | 32% |
| rusher requested / achieved x | -3.52 / -2.35 | -3.39 / -1.67 |
| rusher achieved lateral | -0.57 | -0.31 |
| engaged | 78% | 77% |

At 2.5 s the tackle asks for -1.54 (off -2.60) and achieves -2.57 (off -2.77).

### Asking to hold, being driven

Tackles requesting 0 (at the set):

| time | engaged n | achieved x p25 / 50 / 75 | faster than 1 yd/s | rusher depth vs tackle |
|---|---|---|---|---|
| 2.5 s | 57 | -2.84 / -2.30 / -1.65 | 95% | +0.33 (in front) |
| 3.0 s | 74 | -1.70 / -1.15 / -0.65 | 58% | +0.23 (in front) |

Repro: `test/tackle-set.test.ts`, four verticals vs Cover 2, seed 2.
- The LT reaches the set (x 33.0) at about -3.5 yd/s and asks for 0 from there.
- A DE on a swim, then a spin, holds about 1000 N on the hands joint, about the tackle's braking capacity.
- The tackle is walked to 31.7, 1.3 yd past the set, at 3.0 then 2.2 yd/s.
- The rusher stays 0.2-0.3 yd in front of him, driving straight through: his lateral request is -3 to -5 yd/s and he
  achieves about 0.

## Reading

The rule is now what the tackle asks for. What stops him short of the set is no longer his controller but the
rusher's load. Per the assignment I stop there: no anchor capacity added, no game read of TACKLE_SET alone. Its
effect would be to measure how far a rusher walks a tackle, which EDGE_ARC changes.

The load comes from a rusher whose path aims through the tackle. In the rep his aim is the corner beside the
blocker, measured along the axis to the QB, and once the bodies are level that point is behind the tackle. So:

- The next mechanism is EDGE_ARC (the rusher's landmark), not the tackle.
- TACKLE_SET's anchor should be read with EDGE_ARC on, where the rusher's force is spent going around rather than
  through.
- If a tackle at his set is still walked back by a rusher running the arc, that is the anchor question (physics) to
  re-diagnose, not a controller fix.

# EDGE_ARC, attempt 1, and the game read of both flags

## Mechanism (flag `EDGE_ARC`, off)

An edge rusher's landmark is outside his tackle's outside shoulder (bodies + 0.45 yd, the rep corner's existing offset),
at the depth he sees the QB. This applies both before contact (`PassRusher`, keyed on the end man) and in the rep, where
it replaces the corner measured along the line to the QB.
- Once he is 0.3 yd deeper than the tackle's hips he turns for the QB.
- The inside counter (spin/swim weights in `chooseMove`) comes from the tackle he sees level with or outside his own
  body within 1.5 yd, rather than from the blocker's velocity.
- His bend sets speed and cut. Nothing sets whether he wins.
- Off is bit-identical (seed 999 hash).

## Bench (edge-probe, seeds 101-104)

- EDGE_ARC asks for depth instead of a run at the QB: his lateral request at 1.0 s is −1.6 (off −5.5) and he
  achieves −3.8 to −4.4 yd/s of depth by 1.5 s.
- With both flags at 3.0 s he is level with the tackle, 0.3 yd deeper. The tackle asks for 0 and is carried at
  −1.34 yd/s (TACKLE_SET alone: −1.48).

## Game read: seed 201, 8 games, four arms, same code on NFL tracking

The arms are off / TACKLE_SET / EDGE_ARC / both. The state columns are not level / level outside / past outside / inside.

| gate | off | TACKLE_SET | EDGE_ARC | both | NFL |
|---|---|---|---|---|---|
| states at 1.5 s | 64/28/7/1 | 62/29/8/1 | 46/37/15/2 | 48/34/16/2 | 57/25/10/8 |
| states at 2.0 s | 61/27/6/6 | 58/27/8/7 | 37/41/15/7 | 37/37/19/7 | 31/30/23/15 |
| states at 2.5 s | 59/24/6/11 | 58/22/8/12 | 38/36/14/12 | 35/28/24/13 | 28/24/26/22 |
| at the win: past / level or in front / inside | 13/50/37 | 13/51/36 | 6/58/36 | 10/41/48 | 26/27/47 |
| edge win (within 2 yd before the ball is out) | 11% | 11% | 9% | 10% | 13% |
| free at the win | 49% | 52% | 47% | 60% | 41% |
| tackle depth at 2.5 / 3.0 s | −6.9 / −8.2 | −6.8 / −7.5 | −7.0 / −8.6 | −6.8 / −7.3 | −6.2 / −6.8 |
| QB depth at 3.0 s | −7.8 | −7.8 | −7.9 | −7.9 | −8.2 |
| tackle width outward at 1.5 / 3.0 s | +1.2 / +0.8 | +1.2 / +0.9 | +1.6 / +1.2 | +1.5 / +1.6 | +0.7 / −0.6 |
| rusher to the QB at 3.0 s | 4.9 | 4.7 | 5.4 | 5.4 | |
| free rushers at 2 yd from the edge (free-rush.py) | 3% (4/148) | 1% (1/161) | 3% (5/153) | 6% (8/142) | 23% |
| sacked (pressure-time.py) | 3.4% | 4.7% | 3.4% | 4.6% | 6.7% |
| pressured (any defender within 2 yd) | 30.3% | 32.1% | 28.7% | 28.5% | 32.9% |
| time to pressure p25/50/75 | 2.3/2.6/2.9 | 2.3/2.6/3.0 | 2.2/2.5/2.9 | 2.3/2.6/3.1 | 2.3/2.7/3.2 |
| time to throw p50 | 2.55 | 2.45 | 2.55 | 2.50 | 2.60 |
| dropbacks | 669 | 685 | 729 | 692 | 9713 |

### Sacks

TACKLE_SET's move (3.4 → 4.7%) is about 9 sacks in 685 dropbacks, inside the noise of one 8-game set. The free
rusher's sacks moved the same way: of those within 2 yd, 15 → 19% sacked. Its rushers come from inside; edge free
rushers are 1-8 plays per arm. The mechanism that fits is a tackle who no longer drifts back with the QB, which
leaves less room behind the QB to escape. That is not checked, so it is not claimed.

## Reading

**What both flags fix.** Together they move the rusher's path most of the way to the NFL's. At 2.0-2.5 s, "not level"
falls from about 60% to 35-37% (NFL 28-31%) and "past outside" reaches 19-24% (NFL 23-26%). The tackle's depth is
within half a yard of the NFL's at 3.0 s. TACKLE_SET alone barely changes the rusher; EDGE_ARC alone gets him level
but takes the tackle deeper than the QB (−8.6).

**What they don't fix.** Getting around does not turn into winning around.
- At the win, past outside is still 10% (NFL 26%).
- Past-outside rushers at 3.0 s are 5.4 yd from the QB.
- The arc makes the tackle widen: +1.6 at 3.0 s against the NFL's −0.6.

In the NFL the tackle stays at his width and gives up the depth, so the rusher's corner is close to the QB. Ours mirrors
the rusher outward, and the rusher keeps his landmark outside the tackle's *current* shoulder, so the two drift wide
together. The overset cue (the tackle level with or outside the rusher's body) almost never fires against a rusher
0.8 yd outside him.

**Attempt 2, EDGE_ARC.** Take the landmark from what he sees at the snap: outside the tackle's set (his snap width)
rather than his live shoulder. A tackle who widens past that width is then oversetting by the rusher's own picture,
and the cue becomes the tackle's width gained past the landmark. The tackle side is protection's: his mirror chasing
the rusher outward (the rep's lane term) is the next candidate there.

# EDGE_ARC, attempt 2: landmark from the snap (stopped, re-diagnose)

## Change

- **Landmark.** The landmark is now outside the tackle's *set*: his alignment as seen at the snap, plus the 0.8 yd a
  kick takes (`KICK_WIDTH`, the set point in `blocking.ts`), plus bodies and 0.45 yd (`arcLandmark`). It no longer
  follows his live shoulder.
- **Overset.** The overset cue is the tackle seen wider than that set by more than 0.45 yd, within 1.5 yd in depth.
- Off is bit-identical (seed 999 hash). Fixture: `test/edge-arc.test.ts`.

## Read (seed 201, 8 games; same off and TACKLE_SET arms as above)

| gate | off | EDGE_ARC 1 | EDGE_ARC 2 | both (1) | both (2) | NFL |
|---|---|---|---|---|---|---|
| states at 2.0 s | 61/27/6/6 | 37/41/15/7 | 41/35/17/7 | 37/37/19/7 | 43/32/17/8 | 31/30/23/15 |
| states at 2.5 s | 59/24/6/11 | 38/36/14/12 | 42/30/15/13 | 35/28/24/13 | 42/24/18/15 | 28/24/26/22 |
| at the win: past / front / inside | 13/50/37 | 6/58/36 | 8/56/37 | 10/41/48 | 4/44/52 | 26/27/47 |
| edge win | 11% | 9% | 11% | 10% | 10% | 13% |
| tackle width at 3.0 s | +0.8 | +1.2 | +0.9 | +1.6 | +1.3 | −0.6 |
| tackle depth at 3.0 s | −8.2 | −8.6 | −8.6 | −7.3 | −7.6 | −6.8 |
| free at 2 yd from the edge | 3% | 3% | 3% | 6% | 2% | 23% |
| sacked | 3.4% | 3.4% | 5.2% | 4.6% | 4.4% | 6.7% |
| time to pressure p50 | 2.6 | 2.5 | 2.6 | 2.6 | 2.6 | 2.7 |

## Re-diagnosis

Both attempts move where the rusher *is*: getting level and past roughly triples by 2.0 s. Neither moves where he
*wins*: past outside at the win stays at 4-13% (NFL 26%), and the edge share of free rushers stays at 2-6% (NFL 23%).

The rusher gets around the tackle and still doesn't get to the QB. At the win the tackle is within 1.2 yd half the time
or more, and a rusher past outside at 3.0 s is 5 yd from the QB. So the open question is not his path. It is what
happens after he turns, while the tackle's hands are still on him: in the rep a rider keeps a loaded outside hand
(`canRidePassContact`), and the beat only triggers at |phi| ≥ 1 against the rusher-to-QB axis.

Next diagnostic, before any third mechanism. Follow rushers past outside at 2.0 s through the next second:
- whether they are still in a hands joint, and its force;
- their requested vs achieved turn toward the QB;
- distance to the QB;
- the same measures on NFL tracking for those who came free: separation from the tackle against time after getting
  past.

# After the turn (diagnostic, Integration 2026-11-12)

Tools:
- `scripts/diag/pass-operators/edge-past.py`: geometric, the same code on NFL and sim. "Past" is the first frame
  from 0.5 s with the rusher more than 0.3 yd deeper than the tackle and not inside him.
- `scripts/diag/effective-mass/edge-past.mts`: the engine's state. Hands joint, rep, move, hips, requested vs
  achieved, and the move live while a tackle asking to hold is carried back.

## Geometry (edge-past.py; sim seed 201, 8 games)

| | off | both (attempt 1) | both (attempt 2) | NFL |
|---|---|---|---|---|
| edge rushes that get past before the ball is out | 13% | 41% | 33% | 39% |
| when, p50 | 1.40 s | 1.60 s | 1.50 s | 1.80 s |
| rusher depth vs the QB at past, p25/50/75 | +1.6/+2.4/+3.0 | +0.7/+1.9/+2.6 | +1.0/+2.1/+2.7 | +1.2/+2.0/+3.1 |
| at or beyond the QB's depth at past | 6% | 13% | 10% | 5% |
| to the QB at past | 5.9 | 6.3 | 5.8 | 5.1 |
| separation from the tackle at past / +0.3 / +0.6 / +0.9 s | 0.85/1.00/1.12/1.68 | 1.03/1.00/1.04/1.06 | 0.98/1.00/1.08/1.25 | 0.89/1.00/1.12/1.30 |
| tackle within 1.2 yd at +0.3 / +0.6 / +0.9 s | 70/56/41% | 81/72/61% | 80/63/47% | 63/54/46% |
| turn over 0.5 s: heading rate / radius | 21 deg/s / 14.0 yd | 37 / 6.7 | 39 / 7.1 | 35 / 7.0 |
| speed toward the QB in that turn | 2.7 | 1.1 | 1.5 | 2.6 yd/s |
| closed within 2 yd after past / time | 31% / 1.00 s | 13% / 1.30 | 13% / 1.40 | 21% / 0.90 |
| NFL tackle's hips turned at past (orientation) | | | | 81% |

## Engine state (edge-past.mts, seeds 101-104)

Rushers past the tackle under both flags (n 206 at past):

| | past | +0.3 s | +0.6 s | +0.9 s |
|---|---|---|---|---|
| hands joint between them | 88% | 79% | 50% | 35% |
| tackle's hands (of joints) | 63% | 71% | 86% | 95% |
| joint force p50 | 604 N | 674 | 572 | 698 |
| tackle hips turned (> 45 deg off downfield) | 96% | 97% | 95% | 93% |
| rusher toward the QB: requested / achieved | 4.8 / 1.7 | 7.0 / 1.7 | 8.0 / 2.1 | 8.3 / 2.5 yd/s |

Off: joint 70/56/34/24%, achieved toward the QB 2.8/2.9/3.1/4.5. The tackle is behind the rusher's hip at past by
the definition of past, and stays there (96-100%).

### Carried back while asking to hold

These are ticks with the tackle in the rep, requesting |x| < 0.05 and achieving < −1 yd/s, keyed by the rusher's
current or last move; "live" means landed and inside its window. Under TACKLE_SET there are 1387 ticks:

| move | share | force p50 |
|---|---|---|
| bull | 22% | 1151 N |
| swim | 17% | 1064 N |
| club | 15% | 966 N |
| rip | 15% | 932 N |
| spin | 11% | 1054 N |
| longarm | 9% | 1094 N |

A live move accounts for under 2% of ticks. Both flags: 1092 ticks, the same pattern.

## Reading

1. **He is not run by the pocket.** At past he is about 2 yd short of the QB's depth, as in the NFL (+1.9-2.1 vs
   +2.0; at or beyond the QB 10-13% vs 5%). The QB's depth and the arc's aiming depth are not the gap.
2. **The turn is the NFL's.** Heading rate and radius match (37-39 deg/s, about 7 yd, vs 35 deg/s, 7.0 yd), and so
   does separation from the tackle. Bend is not the gap.
3. **What differs is the closing.**
   - Ours start 0.7-1.2 yd further from the QB (5.8-6.3 vs 5.1). That is lateral: the tackle and the rusher have
     drifted wide together (tackle width +1.3-1.6 vs −0.6). This is TACKLE_SET's width, seen from the rusher's side.
   - After past, ours close at 1.1-1.5 yd/s against 2.6, while still in a hands joint 79% of the time at +0.3 s.
     That joint is mostly the tackle's hands, with his hips turned and him behind the rusher's hip.
   - The NFL tackle stays within 1.2 yd somewhat less often (63/54/46% vs 81/72/61%) at the same median separation.
     An NFL tackle beaten at the hip still rides him, as in ours, but the rusher keeps his speed toward the QB.
4. **The carried-back load is the rush between moves, not a move.** A rusher not in a move asks for 0.8-0.95 of his
   top speed at push 0.75. A finesse rusher whose move has ended leans on the tackle as hard as a bull rusher
   (900-1060 N vs 1150 N). Whether a rusher between moves should drive through the hands like that is a separate
   rusher-intent / contact question from anchor capacity. Not touched.

Next, as Integration ordered: TACKLE_SET attempt 2, the set's width (a spot, inside-half leverage, the long way
round, no chasing wide). It addresses point 3's lateral half. The joint persisting behind the hip (the other half) is
recorded for a later, separate decision.

## The joint behind the hip: push or hold? (edge-past.mts, both flags with TACKLE_SET attempt 2, seeds 101-103)

The force is the joint's achieved world force on the rusher (`normalForceOnB` + `tangentForceOnB`). It is measured
along his velocity (negative: retarding his motion) and along his line to the QB.

| after past | +0 s | +0.3 s | +0.6 s | +0.9 s |
|---|---|---|---|---|
| joints measured | 199 | 200 | 126 | 68 |
| normal force: compression / tension / zero | 28 / 20 / 52% | 50 / 7 / 43% | 54 / 12 / 34% | 47 / 25 / 28% |
| force along his velocity, p50 | −347 N | −251 | −259 | −503 |
| retarding (< −50 N) | 78% | 79% | 78% | 81% |
| of it from the normal, p50 | 0 N | 0 | 4 | 0 |
| of it from the tangent (steer), p50 | −357 N | −336 | −424 | −587 |
| retarding by compression / by tension | 5 / 2% | 2 / 3% | 2 / 6% | 7 / 12% |
| force away from the QB | 76% | 93% | 97% | 94% |
| joint has grab capacity (`hold` > 0) | 44% | 50% | 61% | 76% |
| rep flagged holding | 0% | 0% | 0% | 1% |

**Reading.**
- From behind the hip the tackle is not pushing the rusher wide: the normal force does almost no work along the
  rusher's motion.
- The retarding force is the hands' tangential "steer" force: 250-600 N dragging back along his path, mostly with no
  compression underneath it to be friction.
- In football terms that is a hold. The rep never records one, and the joint carries grab capacity half the time or
  more.

This matches Integration's part (1): open hands can't pull or drag. Off compression, the tangential force of an
open hand should be bounded by friction on the push it has. Dragging beyond that is a grab: the blocker's choice,
with a holding foul through OFFICIATE.

# TACKLE_SET attempt 2 (width) and EDGE_ARC attempt 2: the 2 x 16 read

The base is 207770fa + e902285f (develop af9d7bd1). Seeds are 201-216 and 301-316 (16 games each); arms are off /
TACKLE_SET / EDGE_ARC / both. Gates: `scripts/diag/pass-operators/{edge-rush,edge-past,pressure-time,free-rush,sack-room}.py`,
the same code on NFL tracking. Cells give seed 201 | seed 301.

| gate | off | TACKLE_SET | EDGE_ARC | both | NFL |
|---|---|---|---|---|---|
| states at 2.0 s (not level/level/past/inside) | 61/27/7/6 \| 53/33/7/6 | 36/51/9/5 \| 31/51/13/4 | 42/34/17/7 \| 38/34/18/10 | 24/33/36/8 \| 22/28/41/9 | 31/30/23/15 |
| states at 2.5 s | 59/23/7/11 \| 56/25/7/13 | 32/48/10/10 \| 31/40/15/13 | 43/29/14/13 \| 40/27/13/19 | 22/21/36/22 \| 21/18/33/29 | 28/24/26/22 |
| tackle width at 1.5 / 3.0 s | +1.2/+0.9 (201) | +0.6/−0.4 (201); 3.0 s −0.4 (301) | +1.4/+0.9 (201) | +0.8/+0.4 (201) | +0.7/−0.6 |
| tackle depth at 3.0 s | −8.2 \| −8.1 | −8.0 \| −7.8 | −8.5 \| −8.5 | −7.7 \| −7.8 | −6.8 |
| edge win (within 2 yd before the ball is out) | 11 \| 15% | 15 \| 18% | 10 \| 13% | 16 \| 19% | 13% |
| at the win: past/front/inside | 12/49/39 \| 9/53/38 | 17/47/36 \| 20/42/38 | 7/55/38 \| 5/53/42 | 10/40/50 \| 10/35/56 | 26/27/47 |
| get past the tackle | 14 \| 16% | 23 \| 31% | 25 \| 30% | 58 \| 61% | 39% |
| to the QB at past | 5.9 \| 6.1 | 4.7 \| 4.4 | 6.1 \| 6.1 | 5.6 \| 5.7 | 5.1 |
| speed toward the QB after past | 2.6 \| 2.3 | 2.3 \| 2.4 | 1.9 \| 2.1 | 2.6 \| 2.7 | 2.6 |
| closed within 2 yd after past | 32 \| 33% | 33 \| 32% | 14 \| 16% | 16 \| 21% | 21% |
| free rushers at 2 yd from the edge | 2 \| 2% | 2 \| 3% | 3 \| 1% | 1 \| 1% | 23% |
| sacks, pooled (± 1 se) | 5.8% ± 0.5 | 6.9% ± 0.5 | 6.0% ± 0.5 | 6.9% ± 0.5 | 6.7% |
| sacks by seed | 4.7 \| 6.8 | 6.9 \| 6.8 | 4.8 \| 7.3 | 6.3 \| 7.6 | |
| pressured, pooled | 35.2% | 40.2% | 32.5% | 39.8% | 32.9% |
| pressured by 2.5 s | 16.0 \| 20.0% | 21.7 \| 22.8% | 12.5 \| 16.6% | 21.1 \| 20.5% | 13.2% |
| time to pressure p50 | 2.5 \| 2.5 | 2.5 \| 2.5 | 2.6 \| 2.6 | 2.5 \| 2.6 | 2.7 |

## Sacks

The seed-to-seed spread of the off arm alone (4.7 vs 6.8%) is as large as any arm effect, so one 8-game set could not
size the move, as Integration said. Pooled, TACKLE_SET moves sacks 5.8 → 6.9% (+1.1, about 1.6 standard errors of
the difference) and EDGE_ARC moves them 5.8 → 6.0%.

**The "less room behind the QB" link is not supported** (sack-room.py).
- On sacked plays the tackle is deeper than the QB at pressure 40 → 27% (201) and 29 → 22% (301): the tackle no
  longer drifts.
- But the QB's retreat after pressure does not shrink consistently: p50 +0.5 → +0.5 on 201, +0.5 → +0.2 on 301.
- What does move is pressure: pressured 35 → 40%, by 2.5 s 16-20 → 22-23%.
- With TACKLE_SET the edge rusher wins more often (edge win 11-15 → 15-18%), and from closer: 4.4-4.7 yd at past,
  against 5.9-6.1 off and 5.1 NFL.

So the sacks follow the pressure. The tackle that no longer widens or drifts leaves the rusher a shorter corner, and
that is now past the NFL's (pressure 40 vs 33%, edge win 15-18 vs 13%).

## Reading

**TACKLE_SET (attempt 2).** The tackle's width is now the NFL's in shape (+0.6 → −0.4 against +0.7 → −0.6). The
win moves around the corner (past outside at the win 17-20%, NFL 26%; in front 42-47%, NFL 27%), and closing after
past is NFL-like. But:
- he is still about a yard too deep at 3.0 s (−7.8 to −8.0, NFL −6.8): driven back while asking to hold, as
  attempt 1 found;
- pressure and edge wins overshoot.
In football terms the overshoot is expected while the post-past drag (the joint behind the hip) is unchanged:
OPEN_HANDS changes it next.

**EDGE_ARC (attempt 2).** Alone it does little: it gets the rusher level, but the tackle widens with him. With
TACKLE_SET it overshoots getting past (58-61% vs 39%) while the win is still mostly inside (50-56%, NFL 47) and
seldom around (10%, NFL 26).

**Neither moves the edge share of free rushers at 2 yd** (1-3% vs 23%). The operator classes the rusher's side by
where he is when he is within 2 yd. NFL edge rushers that close are still outside the OL's snap span 23% of the
time; ours have come inside it. Not yet explained.

Not promotion candidates. Next is OPEN_HANDS (Integration: all hands joints, off), then this read again.

# OPEN_HANDS (restaged: open hands, grip, kept grip): reads

Base b2b3f4a0 (develop 97337d57 merged); flags off are bit-identical (seed 999).

## Run (npm run ref:report, fixed set f0a8e75b8620, 1,321 runs, yards under 20, paired against the reference)

| | OPEN_HANDS | OPEN_HANDS + OPEN_HANDS_BACK_ONLY |
|---|---|---|
| all | −0.17 (SE 0.05) | −0.10 (SE 0.04) |
| outside zone | −0.12 (0.07) | |
| inside zone | −0.16 (0.10) | |
| gap | −0.19 (0.10) | −0.05 (0.08) |
| duo | −0.18 (0.26) | −0.04 (0.17) |
| toss | −0.73 (0.44) | −0.60 (0.44) |
| draw | +0.02 (0.27) | −0.07 (0.09) |
| runs <= 0 / 10+ | 9.9 → 10.7% / 7.6 → 7.0% | 10.1% / 7.1% |
| missed / broken tackles a run | 0.257 → 0.235 / 0.131 → 0.120 | 0.249 / 0.123 |

Who the back meets (hitblk) is unchanged. Inside-frame run blocking barely moves. The wider frame cut (past the hip)
carries about 0.07 of the 0.17.

## Pass (sim-export, seeds 201-216 and 301-316)

Arms: off / OPEN_HANDS / OPEN_HANDS + TACKLE_SET + EDGE_ARC. Cells give seed 201 | seed 301.

| gate | off | OPEN_HANDS | all three |
|---|---|---|---|
| states at 2.0 s (not level/level/past/inside) | 60/29/5/5 \| 56/30/7/7 | 61/27/6/5 \| 55/31/7/7 | 24/33/37/6 \| 22/29/43/7 |
| at the win: past/front/inside | 10/60/31 \| 10/52/38 | 10/58/32 \| 10/52/38 | 8/49/43 \| 10/39/52 |
| edge win | 12 \| 16% | 13 \| 16% | 15 \| 22% |
| get past | 11 \| 15% | 12 \| 14% | 57 \| 63% |
| speed toward the QB after past | 2.5 \| 2.4 | 2.5 \| 2.3 | 2.5 \| 2.7 |
| closed within 2 yd after past | 30 \| 34% | 33 \| 33% | 13 \| 22% |
| tackle depth at 3.0 s | −8.3 \| −8.1 | −8.1 \| −8.1 | −7.8 \| −7.8 |
| sacked | 4.3 \| 6.4% | 4.9 \| 6.8% | 5.8 \| 9.6% |
| sacked, pooled | 5.3% | 5.9% | 7.7% |
| pressured | 33.7 \| 39.6% | 34.6 \| 40.8% | 38.1 \| 47.2% |

NFL: sacked 6.7%, pressured 32.9%, at the win 26/27/47, closed after past 21%.

OPEN_HANDS alone hardly changes pass protection. With the edge flags it doesn't change closing after past either
(13 | 22% against 16 | 21% without OPEN_HANDS on the earlier base). A grip that lapses 0.25-0.5 s after the rusher
passes the hip still carries most of the drag through the moment that matters.

## Holding (holds-probe.mts, seeds 101-108, offence)

| per team-game | off | OPEN_HANDS | OPEN_HANDS with an instant release (diagnostic, not committed) |
|---|---|---|---|
| hang-on choices (tryHold) | run 2.56, pass 3.00 | run 2.81, pass 2.69 | run 2.69, pass 2.56 |
| holding called | run 1.31, pass 0 | run 3.94, pass 0.94 | run 0.06, pass 0.25 |
| total called | 1.31 | 4.88 | 0.31 |
| achieved-restraint records, unresolved | run 12, pass 24 | run 64, pass 237 | run 65, pass 202 |

NFL 2022 offensive holding: about 1.1 accepted per team-game (611 with yardage + 144 dismissed, nflfastR via
nflpenalties.com; 581 accepted on Pro-Football-Reference; 544 team-games).

**Reading.**
- The detector exempts |phi| < 1, so every new call is a grip still on a man past the hip: the release window. Under
  OPEN_HANDS the detector also sees a grip's drag, not only its pull.
- The calls are set by how fast a beaten blocker lets go: reaction x (2 - discipline) gives 4.9 a team-game; letting
  go the instant the man is past gives 0.3.
- Neither delay is sourced. The release is a decision, so its timing has to come from what the blocker sees and
  anticipates (the man getting past before phi reaches 1) and from the grip tearing under the man's momentum. It
  should not be a fitted constant.
- Off, the engine already calls 1.3 a team-game on runs, from passive cloth tension (hold = 0.25 arm x control) on
  men past the hip.

## OPEN_HANDS: anticipated release, the detector, pressure source (2026-11-12, later)

**Release (719cae92).** The timer is replaced by the holder's decision from what he feels of the man going by: the
seen phi (by touch, PASS_FEEL's latency) carried forward by its rate over a lead of reaction x (discipline +
awareness - 1), from a reaction time late to a reaction time early. Flags off are bit-identical.

Holding, offence, holds-probe.mts, seeds 101-108, per team-game:
- off: called 1.31 (run 1.31, pass 0);
- release on a timer: called 4.88;
- anticipated release: called 0.94 (run 0.38, pass 0.56).
NFL 2022 accepted is about 1.1. Hang-on choices are about 2.75 a team-game in every arm. Not fitted.

**Detector.** The native holding detector (`observeHolding`) calls every restraint its margins judge clear. There is
no official in it: no visibility, angle, pile or open-field distinction. OFFICIATE's visibility model exists only for
pass interference (`pass-interference.ts`). So holds "committed" (clear) and "called" are the same count;
borderline restraint stays unresolved evidence (run about 62, pass about 211 records a team-game).

**Behind the hip the drag persists.** edge-past.mts, all three flags, seeds 101-103:
- tangential force along the rusher's path stays −310 to −530 N p50 (retarding 72-81%);
- tension 10-26%, the hands joint 53-85% at +0 to +0.9 s past.
Under the agreed definition these are legal inside-frame grips. The rusher is past the tackle in depth, but by the
rep's phi (against his line to the QB) the tackle is still between him and the QB, and he is not on the rusher's
back. "Past the hip" in football is past the blocker along the man's path of travel; the rep's phi is measured
against the line to the QB. That definition decides whether the drag at the corner is a lapsed grip.

**Where the pressure comes from** (pressure-source.py; % of dropbacks; off | all three on seeds 201/301 vs NFL):

| presser | off | all three | NFL |
|---|---|---|---|
| edge rusher past outside | 2.0/2.7 | 1.8/3.3 | 3.8 |
| edge rusher level or in front of his tackle | 12.4/13.8 | 11.9/13.7 | 3.0 |
| edge rusher inside (free then) | 5.8/8.6 (87-89%) | 8.4/14.5 (91-96%) | 6.4 (48%) |
| interior DL/LB | 6.4/7.9 | 8.4/9.2 | 9.8 |
| other | 7.0/6.6 | 7.7/6.4 | 10.0 |

- The standing excess (all arms): the tackle is walked back into the QB.
- The flags' excess: an inside counter that nobody inside picks up.

# Excess (1): the tackle walked back into the QB, diagnosis (report only)

Tools:
- `scripts/diag/effective-mass/tackle-anchor.mts`: engine state, both sides of the contact, by the tackle's phase.
- `scripts/diag/pass-operators/tackle-retreat.py`: geometric, the same code on NFL and sim.
Engine-42 + this branch, seeds 101-103, ball in the QB's hands, edge rusher in front of his tackle (not past, not
inside). Forces in kg*yd/s^2 (1 N = 1.094).

## The gate: tackle retreat while engaged, rusher in front (tackle-retreat.py)

| time since snap | NFL tackle x-velocity p50 (retreating > 1 yd/s) | ours (off, 201 \| 301) | tackle minus QB depth, NFL / ours |
|---|---|---|---|
| 1.0-1.5 s | −2.50 (88%) | −3.00 \| −3.00 (98%) | +2.7 / +2.8 |
| 1.5-2.0 s | −2.75 (95%) | −3.50 \| −3.50 (99%) | +2.4 / +2.7 |
| 2.0-2.5 s | −2.25 (91%) | −3.25 \| −3.25 (99%) | +2.1 / +1.7 |
| 2.5-3.0 s | −1.50 (67%) | −3.00 \| −2.75 (96%) | +1.6 / +0.4 |
| 3.0-4.0 s | −0.50 (33%) | −2.00 \| −2.25 (75-77%) | +1.0 / −1.4 |

Rusher x-velocity is about the same: NFL −3.5 / −2.25 / −1.25 / −0.25; ours −3.5 / −3.25 / −2.75 / −2.0. The NFL pair
decelerates from 2.0 s and has nearly stopped by 3.0 s. Ours keeps going about 2 yd/s faster late, through the QB's
depth.

## Requested vs achieved, by the tackle's phase (tackle-anchor.mts)

Capacity references (p50):
- tackle 142 kg: traction μmg 1680 (pad lift reduces it to about 1450-1520 in contact), push min(leg drive,
  traction) 1530;
- rusher 117 kg: traction 1375, push 1246.

Off (PASS_KICK):

| phase | ticks | tackle requested / achieved x | his ground force toward the rusher / friction limit | utilisation p50 (≥ 0.95) | hands N | rusher push, asks of vmax, ground force toward the tackle (utilisation) |
|---|---|---|---|---|---|---|
| kicking, 0-1.5 s | 1796 | −2.69 / −2.81 | 58 / 1636 | 0.46 (5%) | 668 | 0.75, 0.90, 386 (0.41) |
| kicking, 1.5-2.5 s | 4797 | −2.73 / −3.38 | 596 / 1453 | 0.83 (33%) | 997 | 0.75, 0.85, 472 (0.63) |
| kicking, 2.5 s+ | 1390 | −2.62 / −2.72 | 585 / 1493 | 0.66 (23%) | 911 | 0.75, 0.55, 404 (0.68) |
| asking to hold (rare off), 2.5 s+ | 53 | −0.08 / −1.13 | 1054 / 1461 | 1.00 (70%) | 1066 | 1.00, 0.55, 181 |

TACKLE_SET:

| phase | ticks | requested / achieved | ground force / limit | utilisation (≥ 0.95) | hands N | rusher |
|---|---|---|---|---|---|---|
| kicking, 1.5-2.5 s | 3266 | −3.07 / −3.57 | 293 / 1476 | 0.77 (28%) | 978 | 0.75, 0.88, 309 |
| asking to hold, 1.5-2.5 s | 236 | 0.00 / −2.95 | 1009 / 1501 | 0.98 (56%) | 951 | 0.75, 0.56, 340 (0.65) |
| asking to hold, 2.5 s+ | 678 | 0.00 / −1.63 | 1120 / 1506 | 0.99 (63%) | 888 | 0.75, 0.55, 367 (0.66) |

Moves in these ticks are almost never live (0-7% after 1.5 s): the rusher is between moves.

## Reading

1. **Off, the tackle is not driven: he retreats because he asks to.**
   - Through 2.5 s off, nearly all engaged ticks are the tackle kicking (−2.6 to −2.7 yd/s requested), and he
     achieves about that (−2.7 to −3.4).
   - His feet are well below their friction limit (utilisation 0.46-0.83).
   - The NFL tackle with the man in front slows from about 2.0 s and has nearly stopped by 3.0 s. Ours keeps asking
     for −2.6 at 2.5 s+. That is the PASS_KICK rep's follow (it tracks the rusher's depth to half a yard short of the
     live QB), not a capacity limit.
2. **Asking to hold (TACKLE_SET), he is at his capacity, and two things beyond strength explain why the lighter man
   still moves him.**
   - **Momentum.** He reaches his set still moving at kick speed (−3 to −3.5 yd/s) with the rusher on him. The pair
     (about 259 kg at about 3 yd/s, about 780 kg*yd/s) must be stopped by his net ground force: about 1000-1120
     toward the rusher, less the rusher's own drive of about 340. That takes about 1 s. The rusher's force through
     the hands (about 950) is mostly his own momentum being stopped, not his legs (ground force 300-370, utilisation
     0.65).
   - **Friction shared with the mirror.** His friction limit in contact is 1450-1520, and utilisation sits at 0.98,
     yet only about 1000-1120 of it points at the rusher. The rest goes to the lateral mirror (the rep's sideways
     request).
   So the 315-lb man braced would win (his push capacity of 1530 is above the rusher's 1246) if he were set and
   still. He loses because he arrives moving and splits his traction. That is a timing and controller question (when
   he stops the kick, how he decelerates into the set), not strength.
3. **Rusher between moves.** stepPassRep asks for push 0.75 and 0.8 + 0.15 x bend of vmax toward the corner whenever
   no move is live. `power` (push 1.0, 0.55 vmax, aimed at the QB) follows `e.move`, the last move chosen, so a bull or
   long-arm keeps "power" after its window ends. These are defaults nobody chose by situation; a finesse rusher with a
   spent move leans at 0.75. In these contacts, though, his legs supply only 300-470 (utilisation 0.4-0.7). The ~1000
   through the hands comes from the pair's momentum, not his drive. Fixing his intent alone would not stop the tackle;
   the tackle's kick speed at contact would.
4. **No capacity change is indicated.** The capacity references favour the tackle. The gap is the tackle's request:
   a kick that never decelerates off, and arriving at the set at full kick speed under TACKLE_SET. TURF_MU 1.1 remains
   unsourced, but nothing here turns on it.

# TACKLE_SET stage 3: the kick decelerating into the set (two attempts, reverted; re-diagnosis)

Base: engine-44 (3081064c) merged; flags off are bit-identical. Read: seed 201, 8 games, gates tackle-retreat.py,
pressure-source.py, edge-rush.py, pressure-time.py.

- **Attempt 1 (2cd97028).** He gives ground only while the rusher threatens the corner: read by touch outside his
  outside shoulder (a per-rep misread from his read rating) and gaining more than 1.5 yd/s. Otherwise he sits at his
  depth, with the mirror matching only the man's sideways speed.
  - Engaged retreat unchanged before 2.5 s (−3.0 / −3.5 / −3.25 yd/s at 1.0-1.5 / 1.5-2.0 / 2.0-2.5 s).
  - In front of his tackle at pressure: 12.6 → 11.0%.
  - Why: the rusher is nearly always a threat by that rule (0.8 yd outside, gaining 3+ yd/s), and while threatened
    the kick still follows his depth speed.
- **Attempt 2 (4eff0e82).** While threatened he kicks to the set, timed to the rusher's seen arrival at that depth.
  - Worse: requested −5.35 early, engaged retreat −4.0 at 1.5-2.0 s, in front 13.8%.
- Both reverted (778949a9).

## Counterfactuals (diagnostic only, uncommitted, run in separate worktrees)

| seed 201 x 8 | retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0+ s | edge rusher in front at pressure | inside (free then) | past outside | edge win | sacked / pressured |
|---|---|---|---|---|---|---|
| off | −3.50 / −3.25 / −2.75 / −2.00 | 12.6% | 6.5% (96%) | 2.2% | 13% | 4.5 / 36.5% |
| (A) TACKLE_SET, he sits once engaged, mirror reduced | −2.25 / −2.00 / −1.50 / −0.50 | 5.1% | 32.2% (97%) | 11.5% | 34% | 13.5 / 59.9% |
| (A2) the same with the full mirror | −2.50 / −2.25 / −1.75 / −0.75 | 5.7% | 30.9% (98%) | 7.6% | 33% | 13.7 / 57.9% |
| (B) rusher between moves: push 0.35 at 0.55 vmax | −3.25 / −3.00 / −2.75 / −1.75 | 11.3% | 5.7% | 1.1% | 11% | 3.0 / 30.1% |
| (B) + TACKLE_SET | −3.50 / −3.25 / −2.00 / −0.50 | 12.8% | 6.4% | 2.1% | 13% | 4.9 / 35.9% |
| NFL | −2.75 / −2.25 / −1.50 / −0.50 | 3.0% | 6.4% (48%) | 3.8% | 13% | 6.7 / 32.9% |

## Re-diagnosis

1. **The pair moves at the speed the tackle asks for.** Stop his kick in the rep (A, A2) and the engaged retreat
   matches the NFL by time, and the in-front share falls from 12.6 to about 5%. Take the lean off the rusher (B) and
   the retreat barely moves. The rusher's defaults are not the cause of the walk-back.
2. **But a tackle who stops retreating is beaten, by our engagement, three times as often, and the beaten rusher
   comes inside free.**
   - Edge win 33-34% against 13%; inside at pressure 31-32% against the NFL's 6.4%; free then 97-98%.
   - At the win, the tackle is within 1.2 yd only 17-21% of the time.
   - As I read it: with the tackle stationary, the rusher's line to the QB swings inside him as the rusher draws
     level. The rep's beat, |phi| >= 1 against that line ("turned the corner"), fires, the rep ends, and nothing
     inside picks him up.
   - Off, the tackle avoids this only by retreating with the rusher, which keeps phi below 1, and the price is the
     depth.
   So the walk-back is how our tackle survives a rep that an anchored NFL tackle survives by staying in front with
   his hands and feet.
3. **Next question (diagnostic, not a mechanism).** Under an anchored tackle, what ends the rep?
   - phi at the beat;
   - where the rusher is against the tackle (depth, width) and his velocity;
   - whether the tackle's hands were on;
   - whether the rusher actually got past the tackle's body or only crossed the QB line;
   - the same geometry on NFL tracking for rushers held level outside an engaged, nearly stationary tackle
     (tackle-retreat's state) for 0.5 s or more.
   If the beat fires while the rusher is still beside the tackle at arm's length, the beat's measure (against the
   QB line, not past the blocker's body), not the tackle's request, is what forces the retreat. That is the same
   definitional issue as OPEN_HANDS (i): past the man along his path of travel, not the line to the QB.

## The rusher's defaults (recorded, not touched; the next item on that side)

- Between moves, stepPassRep asks every rusher for push 0.75 at 0.8 + 0.15 x bend of vmax toward the corner. No
  situation chose these: a finesse rusher with a spent move leans like a bull.
- `power` (push 1, 0.55 vmax, aimed at the QB) follows `e.move`, the last move chosen, so a bull or long-arm stays
  "power" after its window ends.
- In football, between moves he resets his hands and works the edge, converts speed to power only with leverage and
  momentum, or stalls.
- (B) shows these defaults are not what walks the tackle back. Taking the lean off lowers pressure (30 vs 36.5%) and
  sacks (3.0 vs 4.5%).

# The beat under an anchored tackle, and PAST_ALONG_PATH (2026-11-12)

## Diagnostic: what ends a tackle-edge rep (beat-probe.mts, seeds 101-103)

| | off (kicking) | TACKLE_SET | anchored (A2) |
|---|---|---|---|
| rep ends, of which 'turned the corner' | 53 / 43 | 50 / 39 | 141 / 121 |
| at that beat: tackle along the rusher's own path p50 | −0.47 yd | −0.67 | −0.70 |
| hips past hips (tackle > 0.3 yd behind along his path) | 53% | 90% | 98% |
| still level or ahead along his path | 47% | 10% | 2% |
| within the tackle's reach / hands joint on | 100 / 100% | 100 / 100% | 98 / 100% |
| rusher depth vs tackle, width outside, to the QB | −0.48, —, 5.3 | −0.86, +0.24, 4.2 | −1.07, +0.43, 4.5 |

- With a kicking tackle, half the corner beats fire on the QB-line crossing while the rusher is still level along his
  path.
- With an anchored tackle the rusher is genuinely past along his path, but still within reach with hands on, and the
  rep ends: no ride.

## NFL: rusher level-outside an engaged, nearly stationary tackle (level-hold.py)

- NFL: 0.16 spells a dropback, p50 0.20 s, 25% lasting 0.5 s or more. They end: ball out 32%, back in front 28%,
  tackle moving 19%, past 9%, apart 8%, inside 3%.
- Ours off: 0.09 a dropback. Ours anchored: 0.54, ending past 58%.

## PAST_ALONG_PATH (433b2add, off; off bit-identical to engine-44)

Beaten means past along the man's path (the blocker more than 0.3 yd behind him along his velocity). Past but within
reach, the rep is a ride: the blocker keeps up and pushes him on past, away from the QB. OPEN_HANDS's frame uses the
same test.

Seed 201, 8 games:

| arm | in front at pressure | inside (free) | at the win past/front/inside | edge win | closed after past | sacked | engaged retreat 1.5-2.0 s |
|---|---|---|---|---|---|---|---|
| off | 12.6% | 6.5% (96%) | 10/57/33 | 13% | 26% | 4.5% | −3.50 |
| PAST_ALONG_PATH | 12.3% | 6.1% (100%) | 12/57/31 | 13% | 31% | 4.2% | −3.50 |
| + TACKLE_SET | 12.1% | 4.5% (93%) | 9/65/26 | 11% | 15% | 2.7% | −3.50 |
| + TACKLE_SET + OPEN_HANDS | 9.7% | 7.1% (94%) | 21/46/33 | 14% | 30% | 4.7% | −3.50 |
| NFL | 3.0% | 6.4% (48%) | 26/27/47 | 13% | 21% | 6.7% | −2.75 |

Anchored counterfactual (diagnostic, uncommitted: no kick once engaged under TACKLE_SET; the mirror's retreat
remains):

| arm | retreat 1.5-2.0 / 2.0-2.5 s | in front | inside (free) | past outside | at the win | edge win | sacked / pressured |
|---|---|---|---|---|---|---|---|
| without PAST_ALONG_PATH | −3.0 / −3.0 | 11.1% | 15.9% (93%) | 5.7% | 16/36/48 | 22% | 9.3 / 46.6% |
| with PAST_ALONG_PATH | −3.0 / −3.0 | 11.3% | 11.3% (97%) | 5.9% | 19/42/39 | 19% | 6.3 / 41.5% |
| + OPEN_HANDS | −3.0 / −2.75 | 9.1% | 13.1% (95%) | 7.4% | 23/32/45 | 19% | 4.9 / 47.2% |

## Reading

- With OPEN_HANDS and TACKLE_SET, PAST_ALONG_PATH moves the win to the corner: past outside at the win 21% (NFL 26%),
  closing after past 30% (NFL 21%), edge win 14% (NFL 13%). Alone it changes little, because a kicking tackle rarely
  lets phi reach 1.
- Under an anchored tackle it cuts the inside-free share (15.9 → 11.3%) and the sacks (9.3 → 6.3%), but not to the
  NFL's 6.4% at 48% free. What remains is a rusher inside his tackle with nobody on him (free 93-97% against the NFL's
  48%): the guard/back help question.
- The walk-back is not fixed by any of these. The retreat stays −3.0 to −3.5 at 1.5-2.0 s whenever the tackle still
  moves with the rusher: his kick, or, with the kick off, his mirror's along-axis component. Only the earlier A2 (no x
  retreat at all) matched the NFL's retreat curve.

## A2 proper with PAST_ALONG_PATH (diagnostic, uncommitted: no x retreat once engaged under TACKLE_SET, full mirror)

| seed 201 x 8 | retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0+ s | in front | inside (free) | past outside | at the win past/front/inside | edge win | closed after past | sacked / pressured |
|---|---|---|---|---|---|---|---|---|
| A2 + PAST_ALONG_PATH | −2.50 / −2.25 / −1.75 / −0.75 | 7.5% | 18.8% (97%) | 10.6% | 28/23/49 | 25% | 37% | 6.3 / 49.0% |
| A2 + PAST_ALONG_PATH + OPEN_HANDS | −2.50 / −2.25 / −1.75 / −1.00 | 6.5% | 29.8% (97%) | 10.5% | 23/15/62 | 32% | 48% | 7.5 / 57.1% |
| A2, no PAST (earlier) | −2.50 / −2.25 / −1.75 / −0.75 | 5.7% | 30.9% (98%) | 7.6% | 18/14/69 | 33% | — | 13.7 / 57.9% |
| NFL | −2.75 / −2.25 / −1.50 / −0.50 | 3.0% | 6.4% (48%) | 3.8% | 26/27/47 | 13% | 21% | 6.7 / 32.9% |

**Reading.**
- An anchored tackle with PAST_ALONG_PATH reproduces the NFL's engaged retreat curve, and the in-front excess falls
  from 12.6% to 7.5%.
- PAST_ALONG_PATH alone takes the anchored tackle's inside losses from 30.9% to 18.8% and its sacks from 13.7% to
  6.3%.
- But he is still beaten three times the NFL rate inside, free 97%, and twice around (past outside 10.6% vs 3.8%).
- Open hands give the inside back (29.8%): without a grip, an anchored tackle cannot keep a man who crosses his face.
- What is left is the inside move against an anchored tackle: the rep's move resolution (spin/swim/club against his
  hands and feet when he is not retreating), and no help inside him. That is the next question. The walk-back was
  hiding it.

# How the inside move beats a tackle (diagnostic, 2026-11-12)

Tools:
- `scripts/diag/effective-mass/inside-probe.mts`: engine state at each edge rusher's crossing of his tackle's face.
- `scripts/diag/pass-operators/inside-cross.py`: the same code on NFL and sim.
Arms: off; A2 + PAST_ALONG_PATH (anchored counterfactual, uncommitted); the same + OPEN_HANDS. Seeds 101-103 for the
probe, seed 201 x 8 for the crossing table.

## How a pass-rush move is resolved today (resolveMove)

By a rating-weighted roll:
- p = logistic(−2.1 + 3.4 (skill − counter) + bonus − 0.6 control), then `rng.chance(p)`;
- skill: the rusher's finesse, power, bend, strength (and three-cone for the spin) ratings;
- counter: 0.45 hands + 0.25 read + 0.3 feet of the blocker;
- bonus: some geometry and bodies (phi x side, mass, arm and height differences, pad level, base) and −1.4 when
  doubled.
On success the effect is applied by fiat:
- bull, long-arm, club and snatch: a strike impulse;
- spin: flips the working side;
- swim and spin: take the hands off for 0.3 s (steer x 0.1, push x 0.2);
- control is reset.
So whether a move lands is awarded by ratings, not by where hands and bodies end up. That is against the model rule.

**But it is not what loses the inside.** At the crossing the rusher's last move had lost its roll in most cases.
Anchored + PAST: won and live 7%, won earlier 10%, lost about 70%, the rep just ended 12%. He crosses through body
motion, not a granted move.

## The tackle at the crossing (inside-probe.mts)

| | off | A2 + PAST | A2 + PAST + OPEN_HANDS |
|---|---|---|---|
| crossings inside the tackle within 2 yd, % of dropbacks | 20% | 33% | 43% |
| tackle lateral toward the ball, requested / achieved | 2.27 / 0.00 | 2.22 / 1.53 | 2.44 / 1.29 yd/s |
| his inside leverage 0.3 s before (rusher's width outside him) p25/50/75 | 0.11/0.26/0.32 | −0.04/0.10/0.25 | 0.15/0.27/0.38 |
| hands joint on | 42% | 79% | 77% |
| normal force p25/50/75 (compression > 50) | 68/603/1059 (78%) | −91/0/0 (21%) | 0/0/0 (5%) |
| tangential force p50 / grip | 280 / — | 299 / — | 0 / 26% |
| control p50 | 0.01 | 0.14 | 0.58 |

- The anchored tackle's hands are on but carry no compression when the man crosses his face (N p50 0). The joint
  sits in its slack band: the bodies are farther apart than the hands' working extension and nearer than the slack
  limit, so only the steer acts.
- With a grip that steer is about 300; with open hands it is nothing. That is why OPEN_HANDS loses more inside: the
  hand is not punched into the man, so there is no push for friction to act on.
- His feet do not get there either: he asks for 2.2-2.4 yd/s toward the ball and gets 1.3-1.5. He was nearly head-up
  0.3 s before, not inside-half: the rusher only 0.10 yd outside him at the median.

## Help (both sides)

inside-cross.py, seed 201 x 8 against NFL. A crossing is the rusher's width outside his tackle going below
−0.3 yd within 2 yd; help is in the next 0.5 s.

| | crossings per dropback | met by another blocker (within 1 yd) | one within 2 yd | none | reached 2 yd of the QB (met / not met) |
|---|---|---|---|---|---|
| NFL | 39.7% | 34% | 63% | 37% | 26% (18% / 30%) |
| ours off | 21.8% | 19% | 46% | 54% | 41% (39% / 41%) |
| A2 + PAST | 34.6% | 8% | 39% | 61% | 66% (40% / 68%) |
| A2 + PAST + OPEN_HANDS | 50.7% | 9% | 34% | 66% | 66% (53% / 67%) |

Engine side (inside-probe.mts): another blocker came within 2 yd of the crosser in 33-36% of crossings.
- engaged him: 2-5%;
- free and did nothing: 9-13%;
- busy with another man only: 18-22%.

## Reading

1. The NFL rusher crosses inside his tackle often (on 40% of dropbacks) but reaches the QB only 26% of the time
   after. A second blocker meets him a third of the time, and the tackle stays on him. Ours, anchored, reach the QB
   66% of the time.
2. Three layers, in order of what the data supports:
   - **The tackle's hands carry no push when the man crosses** (the joint slack, N about 0): the punch, his inside
     hand into the man, is missing.
   - **His feet and leverage:** nearly head-up, achieving about 60% of his lateral request.
   - **Nobody inside meets him:** met 8-9% against 34%; a free blocker within 2 yd does nothing 9-13% of the time.
3. The rating roll is against the model rule and should be replaced by a physical resolution in its own time, but it
   is not the cause here: most crossings come after a lost roll.

# PUNCH (hands to the man), first read, and a spec for physical move resolution

## The slack band (hands-band.mts, seeds 101-102)

An engaged rep's hands joint against its working extension. c = distance − extension: below 0 the joint compresses;
0-0.06 is slack; beyond is tension, with no force without a grip.

| ticks | compression | slack | beyond | gap between bodies / his arm p50 | extension / his arm p50 |
|---|---|---|---|---|---|
| run (off) | 50% | 15% | 35% | 0.26 | 0.22 |
| pass, tackle-edge (off) | 42% | 33% | 25% | 0.29 | 0.27 |
| pass, tackle-edge (anchored + PAST) | 27% | 14% | 58% | 0.37 | 0.25 |
| pass, tackle-edge (anchored + PAST + PUNCH) | 28% | 36% | 36% | 0.55 | 0.46 |
| run (anchored + PAST + PUNCH) | 55% | 24% | 20% | 0.26 | 0.24 |

The hand law works at elbows-bent extension, about a quarter of the arm. The man is almost never beyond full arm
(0-3%), but an anchored tackle stands him off past the bent elbows more than half the time.

## PUNCH (b68eab4a, off; off bit-identical to engine-44)

A blocker's own hands work to where he feels the man, out to lockout (0.9 of his arm), no faster than ARM_SPEED. At
air he is overextended for his reaction time with a third of his push. Pass and run reps through the same joint.

| seed 201 x 8 | retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0+ s | pressured | in front | inside (free) | past outside | at the win | edge win | crossings / reach the QB after | sacked |
|---|---|---|---|---|---|---|---|---|---|
| off | −3.50 / −3.25 / −2.75 / −2.00 | 36.5% | 12.6% | 6.5% (96%) | 2.2% | 10/57/33 | 13% | 21.8% / 41% | 4.5% |
| anchored + PAST | −2.50 / −2.25 / −1.75 / −0.75 | 49.0% | 7.5% | 18.8% (97%) | 10.6% | 28/23/49 | 25% | 34.6% / 66% | 6.3% |
| anchored + PAST + PUNCH | −2.25 / −2.00 / −1.50 / −1.00 | 45.0% | 8.2% | 15.8% (95%) | 6.7% | 21/32/48 | 22% | 25.8% / 61% | 7.0% |
| PAST + TACKLE_SET + OPEN_HANDS | −3.50 / −3.25 / … | 37.7% | 9.7% | 7.1% (94%) | 5.1% | 21/46/33 | 14% | — | 4.7% |
| PAST + TACKLE_SET + OPEN_HANDS + PUNCH | −3.50 / −3.00 / −2.25 / −0.75 | 34.5% | 8.6% | 4.7% (82%) | 3.2% | 19/48/33 | 11% | 15.3% / 36% | 4.0% |
| NFL | −2.75 / −2.25 / −1.50 / −0.50 | 32.9% | 3.0% | 6.4% (48%) | 3.8% | 26/27/47 | 13% | 39.7% / 26% | 6.7% |

Inside-probe, anchored + PAST + PUNCH (seeds 101-103):
- crossings: 33 → 28% of dropbacks;
- at the crossing the hands joint is on 63%, N p50 still 0 (compression 26%);
- the tackle asks for 2.32 yd/s toward the ball and gets 1.22;
- help within 2 yd 43%; it engaged him 4%; free and idle 9%.

**Reading.**
- PUNCH gets the hands out to the man (extension 0.25 → 0.46 of the arm against an anchored tackle). It takes a
  little of the inside away from the anchored tackle (crossings 34.6 → 25.8%, inside 18.8 → 15.8%).
- It does not make the crossing a contest of hands. At the moment the man crosses, the joint is still unloaded: he
  goes across the face faster than the tackle's feet follow (1.2 of 2.3 yd/s), so the hand ends up behind him.
- With all four flags the edge rush is the closest yet (pressured 34.5 vs 32.9%, edge win 11 vs 13%, inside 4.7 vs
  6.4%). But it keeps the walk-back (the kick still follows the rusher) and still wins in front too often (48 vs 27%
  at the win). Sacks are now under the NFL (4.0 vs 6.7%).
- Run control: the run report with PUNCH is pending.

## Spec for resolving pass-rush moves physically (GAPS item; built after hands, feet and leverage)

Today a move lands by a rating roll and its effect is applied. A physical resolution needs each move to be an action
of the rusher's hands and body on the blocker's hands joint, succeeding or failing by where they end up:
- **Swim:** his near arm goes over the blocker's hand or arm on the working side. It succeeds when his arm passes
  over the contact before the blocker's hand re-fits: the joint's contact point is released on that side (the hand
  is knocked down and he is past it), within his arm speed and reach, against the blocker's grip or press holding the
  contact.
- **Rip:** his arm comes up under the blocker's hand and armpit. It succeeds when his shoulder drops under the
  contact height (pad level, bend) and his upward arm force exceeds the hand's hold on that side; the contact point
  slides off up and over.
- **Spin:** he rotates his torso so the hand contact point on him rotates off. It succeeds when his yaw rate carries
  the contact point outside the blocker's hand reach on the far side before the blocker re-fits. It fails into the
  blocker's chest if the blocker is square and close (a spin against a pressed, anchored blocker gives up his back).
- **Club:** an impulse on the blocker's arm at the contact. It succeeds when the impulse exceeds what the blocker's
  arm and grip resist, knocking the hand off (the World's strike, aimed at the arm, not the torso).
- **Bull / long-arm:** already mostly physical (push through the joint). The roll only adds the strike: it should be
  the rusher's push through his hands and legs against the blocker's anchor, as the World resolves now.
- **Snatch:** a pull on the blocker's extended arm. It succeeds against an overextended blocker (PUNCH's state) when
  his pull exceeds the blocker's balance margin.
- **Dip / speed:** feet and bend around the corner. Already physical apart from the roll's control change.
Each needs the contact point(s) of the blocker's hands on the rusher (the World's `contact` patch), and each fails
against hands that stay fitted, pressed and inside. That is why hands, feet and leverage come first.

## PUNCH run control (npm run ref:report -- --flag PUNCH=1; fixed set, 1,321 runs)

Paired against the reference, yards under 20:
- all −0.30 (SE 0.10);
- outside zone −0.34 (0.18), inside zone −0.48 (0.28), gap −0.13 (0.17), duo −0.59 (0.28), toss −1.01 (0.73),
  draw +0.37 (0.40);
- runs ≤ 0: 9.9 → 11.6%; 10+: 7.7 → 6.3%.

hitblk, zone OU: DL blocked 51 → 42%, DL shed 4-5 → 10%.

punch-run.mts (seeds 101-103):
- run blockers' hands at lockout on 4% of engaged ticks, but 9% of sheds;
- sheds a run 0.77 → 0.63 (different games).

**Reading.** Arm's length is the defender's run technique: a blocker extended to lockout gives the defender the
separation to shed and make the play. A run blocker's technique is to close and fit tight, inside hands, and drive.
PUNCH as built is a pass-protection technique applied to every block. The joint and the physics are shared; which
technique a blocker chooses depends on his job. Proposal: PUNCH is the pass blocker's choice; run blockers keep the
existing fit.

# Layer (ii), attempt 1: TACKLE_ANCHOR, and what the crossing really is

- **PUNCH as technique (16af1798).** Only a pass set punches: not an interior lineman's run look on play-action, and
  a draw blocker only while he is still selling pass. Run report control: all +0.01 (SE 0.02); outside zone +0.02
  (0.04); others +0.00; draw +0.06 (0.30). DL shed at the hit is back to 4%. Unchanged.
- **TACKLE_ANCHOR (1b800758, off; with TACKLE_SET).** Once engaged with an edge rusher he asks for no more depth and
  plays from inside half (front point 0.33 yd inside the man's line to the QB, by his feet).

| seed 201 x 8 | retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0+ s | pressured | in front | inside (free) | past outside | at the win | edge win | crossings / reach QB | sacked |
|---|---|---|---|---|---|---|---|---|---|
| A2 + PAST (counterfactual) | −2.50 / −2.25 / −1.75 / −0.75 | 49.0% | 7.5% | 18.8% (97%) | 10.6% | 28/23/49 | 25% | 34.6% / 66% | 6.3% |
| ANCHOR + PAST + SET | −2.50 / −2.75 / −2.25 / −1.00 | 43.8% | 10.7% | 18.6% (94%) | 4.3% | 16/32/52 | 22% | 36.4% / 56% | 5.3% |
| ANCHOR + PAST + SET + OPEN + PUNCH | −2.50 / −2.50 / −2.00 / −1.00 | 42.5% | 7.5% | 17.2% (95%) | 4.2% | 16/29/55 | 18% | 25.8% / 54% | 6.1% |
| NFL | −2.75 / −2.25 / −1.50 / −0.50 | 32.9% | 3.0% | 6.4% (48%) | 3.8% | 26/27/47 | 13% | 39.7% / 26% | 6.7% |

inside-probe, ANCHOR + PAST + SET + PUNCH:
- leverage 0.3 s before the crossing: rusher 0.24 yd outside him p50, unchanged from 0.10-0.26;
- the tackle asks for 2.53 yd/s laterally and gets 1.28;
- the hands joint is on 67%, N p50 0 (compression 29%).

The inside-half request is not achieved. The anchor is achieved (an NFL-like retreat curve), and past-outside is
NFL-like (4.2% vs 3.8%).

## What differs after the crossing (inside-cross.py, extended; seed 201 x 8 against NFL)

| | crossings | tackle within 1.2 yd at +0.3 / +0.5 s | tackle lateral speed toward the ball | rusher speed at the crossing / 0.3 s later | reaches the QB |
|---|---|---|---|---|---|
| NFL | 39.7% | 56% / 47% | 1.33 | 3.81 / 3.69 | 26% |
| ours off | 21.8% | 34% / 29% | 0.50 | 4.03 / 4.26 | 41% |
| ANCHOR + PAST + SET + OPEN + PUNCH | 25.8% | 10% / 9% | 1.33 | 4.78 / 4.81 | 54% |
| PAST + SET + OPEN + PUNCH | 15.3% | 25% / 25% | 1.00 | — | 36% |

**Reading.**
- NFL rushers cross inside their tackle often (on 40% of dropbacks). What differs is the crossing itself:
  - the NFL crosser is slowed by the contact (3.8 to 3.7 yd/s) and the tackle stays on him (47% at +0.5 s);
  - ours cross about 1 yd/s faster and are not slowed (4.8 to 4.8). The anchored tackle, moving across as fast as
    the NFL's (1.33 yd/s), keeps him only 9% of the time.
- The man crosses the tackle's face nearly free: his hands carry no push at the crossing and his body is not in the
  path.
- The crossing speed (about 1 yd/s over the NFL's) comes before the contact. That points back at the rusher's
  between-moves request (0.8-0.95 vmax at push 0.75, recorded earlier) as much as at the tackle.
- Attempt 2 for (ii) should not be more lateral request (he already gets the NFL's lateral speed). It should be
  what makes the crossing a contact:
  - the tackle's inside hand meeting the man as he comes across: a punch aimed at the near shoulder, inside the
    line, so the joint compresses across his path;
  - and the rusher's crossing speed, which in football comes off the move (a swim or rip trades speed for
    clearance).

## Play-action: the run look by evidence (a2d55456)

The playbook has one generic play-action protection: three PA concepts with a `fake` and `teBlock`, no protection
type, and no concept using the 'boot' drop. On a fake the linemen differed only by a 0.35 s clock (every lineman's low
stance, the interior holding at the line, PUNCH's technique clause).

Under PUNCH the look now ends on the first of:
- contact with his man;
- a yard past the line;
- his man's seen pass rush;
- his patience (0.35-1.0 s by discipline).
Protection types go to Rules+Coaching's concept queue. Hardened fixtures: more than 50 engaged interior ticks over 8
PA plays, none in a run look while engaged, and more than 3 distinct end times.

## Layer (ii), attempt 2: PUNCH presses (b0ad8de2)

The hands go 0.1 yd into the man instead of to the touch.

| seed 201 x 8 | pressured | in front | inside (free) | past outside | at the win | edge win | crossing speed / +0.3 s | tackle on at +0.5 s | reach QB after | sacked |
|---|---|---|---|---|---|---|---|---|---|---|
| anchored, all flags (attempt 1) | 42.5% | 7.5% | 17.2% (95%) | 4.2% | 16/29/55 | 18% | 4.78 / 4.81 | 9% | 54% | 6.1% |
| anchored, all flags (attempt 2) | 41.5% | 8.2% | 16.3% (94%) | 5.7% | 16/31/53 | 21% | 4.96 / 4.81 | 9% | 65% | 5.7% |
| kicking, all flags (attempt 1) | 34.5% | 8.6% | 4.7% (82%) | 3.2% | 19/48/33 | 11% | 4.30 / 4.24 | 25% | 36% | 4.0% |
| kicking, all flags (attempt 2) | 37.2% | 8.7% | 4.8% (94%) | 4.5% | 25/47/28 | 12% | 4.26 / 4.07 | 10% | 37% | 3.8% |
| NFL | 32.9% | 3.0% | 6.4% (48%) | 3.8% | 26/27/47 | 13% | 3.81 / 3.69 | 47% | 26% | 6.7% |

inside-probe, anchored, all flags with the press:
- at the crossing the hands joint is on 72%, N p50 still 0 (compression 21%); control p50 −0.07;
- the tackle asks for 2.60 yd/s laterally and gets 1.41;
- the rusher requests 0.90 of his vmax (p25/75 0.55/0.94) at push 0.75, 89% of it across the tackle toward the ball,
  and achieves 4.63 yd/s. In 75-85% of crossings his last move had lost its roll or he was not in one.

**Two attempts, not repaired: stop and re-diagnose.**
- The press applies only to the blocker's own hands (control ≥ 0). At the crossing the defender's hands are in
  control about half the time, so the blocker's hands do not press then.
- More basically, the rusher sprints across the tackle's face at 0.9 of his top speed on his default between-moves
  request, not a move.
- The NFL crosser goes about 1 yd/s slower and is slowed further by the contact. Ours crosses as a free runner and
  outruns the tackle's feet.
- So the next item is the one Integration ordered before help: the rusher's between-moves intent.

## Re-diagnosis: what "inside" is (inside-cross.py with depth at the crossing; inside-probe.mts with the working side)

| inside crossings, seed 201 x 8 | depth vs the tackle p25/50/75 | across his face (level or in front) → reaches the QB | behind him (around, then in) → reaches the QB |
|---|---|---|---|
| NFL | −0.60 / +0.60 / +1.00 | 66% → 20% | 34% → 39% |
| ours off | −0.80 / +0.70 / +1.00 | 66% → 38% | 34% → 46% |
| anchored, all flags | −1.70 / −1.50 / −1.20 | 7% → 58% | 93% → 65% |
| kicking, all flags | −1.30 / −1.00 / +1.00 | 37% → 30% | 63% → 41% |

The rusher's working side at the crossing (engaged), anchored with all flags:
- inside 19%; never inside when the rep began; in 'power' 32%.
- Yet 89% of his request points across toward the ball: after drawing level or past he aims at the QB.

Off: inside 55%, inside at the rep's start 18%, power 64%.

**Reading.**
1. **Under TACKLE_ANCHOR, "inside" is mostly the corner.** 93% of the anchored tackle's inside losses come with the
   rusher 1.5 yd deeper than him: beaten around, then turning in behind him. This is the cost Integration warned of
   (settle against a speed rusher and you are run around). PAST_ALONG_PATH's ride does not keep him: the tackle is
   within 1.2 yd at +0.5 s only 9% of the time. So the anchor is not yet a candidate. Its open questions are the
   decision to stop kicking against speed and the ride's ability to stay on the hip.
2. **Off, our crossings split like the NFL's** (66% across the face, 34% around). But across-the-face crossers reach
   the QB 38% of the time against the NFL's 20%. They cross faster (about 4.0 against 3.8 yd/s) and are not slowed.
   That is the rusher's between-moves request (0.8-1.0 of vmax at push 0.75 toward a corner or the QB), the item
   ordered next.
3. **Layer (ii) is closed** after two attempts. Neither the inside-half request nor the press changes the crossing,
   because the crossings that matter under the anchor are not across the face.

# The anchor: proposal (Flex, 2026-11-12, after set A)

## Gates

All on set A's 2 x 16 pass read (seeds 201-216 and 301-316, about 2,700 dropbacks per arm), with the same code run
on NFL 2022 tracking (9,713 dropbacks). Tools: `pressure-source.py` (now with sacks per pressure), `tackle-retreat.py`.

1. **The edge rusher still in front of his tackle when he comes within 2 yd of the QB.**
   - Share of all pressure: 31% with A (off 35%), against the NFL's 9%.
   - Converted to a sack: 3% with A (off 6%), against the NFL's 20%.
   - These are tackles carried back into the QB's space with the rusher still on them. Every other presser
     converts about as the NFL's do (A about 18% against 19%).
2. **Real pressure** (all pressure except that class): 21.6% of dropbacks with A, against the NFL's 29.9%.
3. **The retreat curve** (tackle engaged, rusher in front; x-velocity p50, yd/s; tackle minus QB depth):

| time since snap | NFL | A (201 \| 301) | NFL depth over the QB | A |
|---|---|---|---|---|
| 1.5-2.0 s | −2.75 | −3.25 \| −3.25 | +2.4 | +2.8 |
| 2.0-2.5 s | −2.25 | −3.25 \| −3.25 | +2.1 | +2.0 |
| 2.5-3.0 s | −1.50 | −2.75 \| −2.75 | +1.6 | +0.9 |
| 3.0-4.0 s | −0.50 | −1.50 \| −1.50 | +1.0 | −0.1 / −0.4 |

The NFL rusher slows with his tackle (−3.5 / −2.25 / −1.25 / −0.25); ours keeps the tackle's pace (−3.25 / −3.0 /
−2.75 / −1.75).

Guards, the costs the anchored counterfactuals showed: edge win (NFL 13%), inside at pressure (6.4%, free 48%), past
outside (3.8%), inside crossings that come around behind him (34%), sacked (6.7%), pressured (32.9%). Run report
unchanged: the anchor is a pass set only.

## What is known

- **The pair moves at the speed the tackle asks for** (stage 3 re-diagnosis). Stop his kick once engaged (A2) and the
  retreat curve matches the NFL's. Take the lean off the rusher (B) and it barely moves. When asked to hold he is at
  capacity, but he arrives moving at kick speed. Only about two-thirds of his traction points at the rusher; the rest
  goes to the mirror. No strength change is indicated.
- **A tackle who simply stops is run around.** TACKLE_ANCHOR: 93% of its inside losses are rushers 1.5 yd deeper than
  him, beaten around and turning in behind (Integration's warning: settle against speed and you are run around).
  Edge win 18-25% against 13%.
- **The beat's measure is settled.** PAST_ALONG_PATH (in A) makes "beaten" behind him along the man's own path, so
  the retreat is no longer needed to keep phi below 1. Its ride keeps a man past him within reach.

## Proposal: kick while he is gaining on your hip, sit when he is not

The coached rule: kick-slide to keep your outside shoulder on his inside shoulder, and when he stops gaining on you
or converts to power, sit and anchor. Built from what the tackle sees, behind a flag on top of A (with TACKLE_SET's
floor and width).

1. **The signal is the rusher's progress past him along the rusher's own path**: `along` in PAST_ALONG_PATH's frame.
   It is seen with the tackle's reaction delay, and its rate is taken over his reaction time.
   - While the rusher is gaining on his hip (along falling faster than the tackle's own error band), he kicks at the
     rusher's depth speed, as now.
   - When the rusher is not gaining (along steady, or he is pressing into the tackle), he stops kicking.
   - Attempt 1's threat rule (outside his shoulder and gaining depth) was nearly always true. Depth speed is not the
     threat; gaining on the hip is.
2. **Brake into the set.** The stop is a request for zero depth speed. His body's brake capacity sets the
   deceleration, and the floor and width stay TACKLE_SET's. No timer.
3. **Anchor before the mirror.** Sitting and pressed (hands in compression), his lateral request is what is left once
   he holds the press: the mirror matches the man's lateral speed only up to the friction remaining after the press.
   This is a technique choice in the controller, not a World change: the World still clips the total.
4. **The ride.** If the rusher starts gaining again, rule 1 has him kick again. Past along the path, PAST's ride takes
   over as now.

## Before building: one diagnostic (decides rule 1)

On NFL tracking and sim A, over frames with the tackle engaged and the rusher in front:
- the rusher's along-path progress rate against the tackle, binned;
- the tackle's x-velocity in each bin.

If NFL tackles retreat with the rusher's gain and stop when it is near zero, rule 1 is the football. If they retreat
regardless, the signal is something else (the QB's depth or the drop's timing), and I report before building.

## The diagnostic: rule 1 is wrong; the NFL tackle stops by depth (`hip-gain.py`)

Frames from 1.0 s with the tackle engaged and the rusher in front. NFL 94,688 frames; A 201 10,828 and 301 15,697.

| rusher gaining on the hip (along-rate, yd/s) | NFL tackle x-vel p50 | A (201 \| 301) |
|---|---|---|
| faster than 1.5 | −2.25 | −2.75 \| −2.50 |
| 0.75-1.5 | −2.50 | −3.25 \| −3.00 |
| 0.25-0.75 | −2.50 | −3.25 \| −3.25 |
| not gaining (±0.25) | −2.25 | −3.25 \| −3.50 |
| losing ground | −2.25 | −3.25 \| −3.25 |
| rusher slower than 1 yd/s (share of frames) | −0.50 (6.4%) | −0.25 \| −0.50 (2.0%) |

NFL tackles retreat at the same speed whether or not the rusher is gaining on the hip. Ours run about 0.75-1 yd/s
faster in every bin. Gaining on the hip is not the signal.

| tackle minus QB depth | NFL | A (201 \| 301) |
|---|---|---|
| +3 or more | −2.00 | −3.00 \| −3.00 |
| +2 to +3 | −2.75 | −3.25 \| −3.25 |
| +1.5 to +2 | −2.75 | −3.25 \| −3.25 |
| +1 to +1.5 | −2.50 | −3.25 \| −3.50 |
| 0 to +1 | −1.75 | −3.00 \| −3.50 |
| deeper than the QB | −0.25 | −0.75 \| −2.25 |

| tackle depth behind the line | NFL | A (201 \| 301) |
|---|---|---|
| 3-4 yd | −2.50 | −3.25 \| −3.25 |
| 4-5 yd | −2.75 | −3.50 \| −3.25 |
| 5-6 yd | −2.50 | −3.25 \| −3.25 |
| 6-7 yd | −2.00 | −3.00 \| −3.50 |
| beyond 7 yd | −1.25 | −2.50 \| −2.75 |

**Reading.**
- The NFL tackle brakes by depth. He slows from about 1.5 yd short of the QB's depth (6-7 yd behind the line on these
  drops) and is nearly stopped at it. The rusher slows with him.
- Ours carries kick speed to and past the QB's depth: −3.0 to −3.5 at 0 to +1 yd, where the NFL tackle is at −1.75.
- So the anchor is TACKLE_SET's floor (the called launch point less a body width), reached by braking early enough,
  not a decision taken from the rusher's gain.
- This also explains why TACKLE_ANCHOR was run around while the NFL tackle is not. TACKLE_ANCHOR stopped as soon as
  engaged, about 3-4 yd deep, where the corner is still open. Stopping at the QB's depth leaves the rusher no corner
  short of the QB; a man past along his path there is PAST's ride.

**Revised rule 1.** Under TACKLE_SET his depth request toward the floor follows a braking profile:
- the speed is at most √(2 · a · distance to the floor), with `a` his own brake capacity derated by the load on his
  hands (he must stop the pair, not only himself: his mass over the pair's);
- rules 2 (no timer: the body brakes) and 3 (the anchor before the mirror) stand.

TACKLE_SET's existing braking clamp uses his unloaded brake. The read of TACKLE_SET attempt 2 (achieved −2.95 asking 0
at 1.5-2.5 s) is the pair's momentum arriving at the floor; the derate starts the stop before the floor, where the
NFL's does. Gates unchanged.

## TACKLE_BRAKE, attempt 1 (de1e5119, off): read and diagnosis

Seed 201 x 8, same base. A = PAST_ALONG_PATH + OPEN_HANDS + PUNCH; S = A + TACKLE_SET; SB = S + TACKLE_BRAKE.

| | A | S | SB | NFL |
|---|---|---|---|---|
| dropbacks | 717 | 649 | 694 | |
| pressured | 25.4% | 36.4% | 36.3% | 32.9% |
| in front at pressure: share of pressure / sacked per pressure | 31.3% / 3.5% | 33.5% / 5.1% | 29.8% / 2.7% | 9% / 20% |
| real pressure (all but in front), of dropbacks | 17.5% | 24.2% | 25.5% | 29.9% |
| past outside | 1.7% | 2.6% | 4.9% | 3.8% |
| inside (free then) | 4.6% (82%) | 5.7% (92%) | 5.2% (92%) | 6.4% (48%) |
| sacked | 2.8% | 5.1% | 5.0% | 6.7% |
| retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0+ s | −3.25 / −3.00 / −2.75 / −1.25 | −3.50 / −3.25 / −2.50 / −1.00 | −3.25 / −3.00 / −2.00 / −0.75 | −2.75 / −2.25 / −1.50 / −0.50 |

TACKLE_BRAKE's own step (S → SB) is small: the late retreat moves toward the NFL's (2.5-3.0 s −2.50 → −2.00), the
in-front share 33.5 → 29.8%. The 1.5-2.5 s retreat barely moves.

Engine state (`tackle-anchor.mts`, seeds 101-103, S | SB):

| phase | ticks | requested / achieved x | his ground force toward the rusher / limit (utilisation) | hands N |
|---|---|---|---|---|
| kicking, 1.5-2.5 s | 3150 \| 3429 | −2.62 / −3.49 \| −2.53 / −3.11 | 441 / 1526 (0.77) \| 686 / 1529 (0.79) | 1121 \| 1015 |
| kicking, 2.5 s+ | 427 \| 561 | −1.81 / −2.53 \| −1.52 / −2.19 | 863 (0.98) \| 887 (0.99) | 1104 \| 1133 |
| asking to hold, 1.5-2.5 s | 280 \| 144 | 0 / −2.83 \| 0 / −1.67 | 1004 (0.96) \| 1197 (0.97) | 1046 \| 845 |

**Reading.**
- In the bulk of the rep (kicking, 1.5-2.5 s) the clamp does not bind. He asks for about −2.5 and is still 1-2 yd
  above his floor, where √(2ad) allows more. The NFL tackle achieves about what we request (−2.75 at 1.5-2.0 s).
  Ours is carried 0.6-0.9 yd/s past his request.
- Carried, he resists with the running-brake envelope (`kinematics.ts`: At = brake x (0.85 + 0.15 fat)). His ground
  force toward the rusher, 686-887, is about brake x mass (6 x 142 = 852), well under his push (1530) and traction
  (1520-1610); utilisation 0.79. A backpedalling tackle pushed back faster than he asks can only brake like a runner
  stopping, not drive his legs into the man.
- The NFL pair decelerates from about 2.0 s (rusher −3.5 → −2.25 in 0.5 s, about 2.5 yd/s²). Ours loses about
  0.5 yd/s per 0.5 s.
- So the next lever is not a controller rule: it is how a body pushed back through its hands resists, which is a
  shared capacity question (the brake envelope vs leg drive in contact). Not changed; for Integration.

## Before attempt 2 (physics): what the feet actually do when he is carried

Instrumented `World.feet()` in a scratch worktree (diagnostic only, not committed: a hook after the ground-force
allocation). The probe drove nativeTraceSetup plays, four verticals and smash against Cover 2, seeds 1-24, with
A + TACKLE_SET + TACKLE_BRAKE. Sampled: the tackle engaged with the edge rusher in front, 1.5-2.5 s, kicking (4,152
substeps). Forces in kg*yd/s^2, along x (+ = toward the rusher). p50 (p25 / p75):

| term | value |
|---|---|
| requested / achieved x-velocity | −3.05 / −3.70 |
| locomotion force (braking himself, the running brake envelope) | 578 (146 / 642) |
| felt press | −586 (−700 / −369) |
| lean target (leg drive into the felt load, = the press under PASS_ANCHOR's growth 0) | 559 |
| lean achieved | 186 (132 / 310) |
| lean limit at his base: m · ω0² · base radius (posture 0.59) | 261 |
| allocation cap / leg strength / traction · availability | 1346 / 1619 / 1412 |
| availability | 1.00 |

**Reading (corrects the diagnosis above).**
- He does answer the press with his legs: the World's lean, leg drive into the felt load. It is not only the running
  brake.
- The lean is held near his base of support. LEAN_PITCH lets it exceed m·ω0²·base radius (261 at posture 0.59) only
  at the inverted pendulum's growth rate from where it is, and it decays (LEAN_DECAY) or is released as the felt press
  swings (p25-p75 −700 to −369).
- So the drive available already follows posture and base, as Integration's condition (2) asks. A man moving back
  cannot put full drive in at once. Nothing is capped by strength or traction (use 756 of a 1346 cap).
- "Asking to hold, 1000-1200" is the same envelope at lower speed: the running brake plus the base-limited lean. It
  does not demonstrate a 1530 push from rest; I said it did, and that was wrong.
- So the physical inconsistency I named (a loaded body answering only with a runner's stopping envelope) is not
  there. What remains:
  1. **Technique (controller).** He sets at posture 0.6 whatever the press. A lower, wider base under a heavy press
     (PASS_SINK, an existing flag, off) raises the base limit about 1.26x.
  2. **Technique (controller).** Under PASS_ANCHOR his lean target is the press (growth 0), so his legs can only
     cancel the press, never slow the pair. Its reason: a pull or swim must not pitch him onto the rusher.
  3. **Physics, open question.** Decelerating himself (locomotion) needs no lean; resisting a press needs lean
     within his base. In an inverted-pendulum model both are horizontal ground force with the centre of pressure
     offset. Whether the asymmetry is right is a whole-body question for every body, not one to change for the
     anchor.
- No attempt 2 built. For Integration.

## The owner's anchor shape (re-set the base) against the sources, and what the body model has

**Sources: `docs/references/offensive_line_protection_textbook.pdf`.**
- §7.6, anchoring power: "keep feet under the body, sink through hips/knees, reestablish inside leverage, and absorb
  force through a braced trunk and foot repositioning … replace ground with short, coordinated steps. A guard can cede
  a controlled yard."
- §7.6, the anchor progression: "widen/replace support foot without crossing → lower center of mass with spine
  controlled → absorb and steer, not simply lean back → prepare for spin or late counter when rusher feels the
  anchor."
- §7.7: against speed-to-power, "Stop retreat, bring feet under hips, anchor." The red flag is "recoil into QB at five
  yards". Against bull and long arm, "refit inside hand, brace, replace feet". The red flag is "hips driven backward".
- §8.4: "turn a deepening set into an anchor without getting his outside foot stuck behind him … anchored by foot
  leverage rather than falling forward."
- §20.5, the anchor-and-reset drill: "blocker absorbs, resets feet, then reacts to spin." The re-set is a window a
  counter attacks.
- §1.1: giving up two yards to absorb a bull rush can be a successful rep.

The sources support (a) drive needs the base under the hips, (b) re-setting it is a coached technique with a cost and a
counter window, and (c) the set stance's push applies after. They describe it as short replacement steps (widen or
replace the support foot); "hop" is not their word. Modelled as base replacement, of which a hop is one form.

**What the body model already represents.**
- **The base under him, against the load's direction:** `support.lean`, his centre of mass held toward a felt load.
  The legs' drive into the load is the lean. It is limited by `baseRadiusAt(posture)` (a lower, wider stance is a
  bigger base) and, under LEAN_PITCH, grows past the base only at the inverted pendulum's rate. `support.xi`
  (capture-point deviation) and `availability` (from xi against the base) represent losing balance. Posture moves
  at POSTURE_RATE.
- **(a) is already there:** carried back under a swinging press, his lean is about 186 of a 559 target (base limit
  261). Little drive, because his base is not under him.
- **The re-set's speed:** `profile.stepSpeed`, the recovery stepping speed that already moves the base under a
  displaced centre of mass, scaled by fatigue and feet held.

**What is missing.**
- **The choice.** A controller action, the tackle's: from the press he feels and being carried past his request, he
  re-sets. Cue: felt press with achieved retreat beyond requested. How often and how early comes from his
  pass-block technique; how fast from stepSpeed and balance. No timer.
- **Its effect.** When the step completes, his feet are under his hips toward the load: his lean may be set at once to
  the base limit at the sunk posture (PASS_SINK's lower posture). Today it can only grow toward that at the pendulum
  rate. From there it grows to the press as now, and his push capacity (sp.pushForce, unchanged) applies through
  it. No new capacity.
- **Its cost.** Duration = step length / stepSpeed. Ground given = the step, his retreat continuing through it.
- **Lightness.** During the step his feet are unweighted, so traction and availability fall: a pull or push in that
  window moves him more, and a rusher's move landing in it finds him light. The model has no per-foot normal load. A
  stand-in is needed (traction x availability scaled down for the step's duration), recorded as debt. Today's pass
  move resolution is the rating roll (GAPS); the window's physical effect comes through traction until moves are
  resolved physically.

## TACKLE_RESET, attempt 2 of the re-diagnosed mechanism (285860f7, off): read, then stop

Seed 201 x 8, same base (SB = A + TACKLE_SET + TACKLE_BRAKE; SBR = SB + TACKLE_RESET):

| | SB | SBR | NFL |
|---|---|---|---|
| dropbacks | 694 | 662 | |
| pressured | 36.3% | 31.9% | 32.9% |
| in front at pressure: share of pressure / sacked per pressure | 29.8% / 2.7% | 38.9% / 3.7% | 9% / 20% |
| real pressure, of dropbacks | 25.5% | 19.5% | 29.9% |
| past outside / inside | 4.9% / 5.2% | 3.3% / 4.7% (free 100%) | 3.8% / 6.4% |
| sacked | 5.0% | 4.1% | 6.7% |
| edge win | 14% | 14% | 13% |
| retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0+ s | −3.25 / −3.00 / −2.00 / −0.75 | −3.25 / −3.00 / −2.25 / −1.50 | −2.75 / −2.25 / −1.50 / −0.50 |

Worse on the first two gates; the retreat curve is unchanged.

**The re-set fires** (`reset-probe.mts`, nativeTraceSetup four verticals and smash against Cover 2, seeds 1-24):
re-sets in 90 of 95 tackle pass reps, about 4 steps a rep, the first at 1.95 s (p25-p75 1.80-2.05).
- Each step is about 0.02 s: the sunk stance's base radius over a stepping speed of about 3.2 yd/s. So in practice
  it lasts one 0.05 s tick.
- x-velocity −2.08 at the step, −1.41 0.25 s after landing.

**Why it does not move the gates.**
- Engine state (`tackle-anchor.mts`, seeds 101-103), kicking at 1.5-2.5 s: his ground force toward the rusher falls
  from 686 (SB) to 579. The steps take away his braking, and he is carried at −3.20 against a request of −2.64.
- `feet()` instrumented again (scratch worktree, same fixture), kicking at 1.5-2.5 s, SB | SBR:
  - lean before the step: 184 | 167;
  - lean target: 559 | 510;
  - felt press: −586 | −525;
  - base limit: 261 | 262;
  - posture: 0.59 | 0.59 (p75 0.75);
  - xi: 0.03 | 0.04;
  - availability: 1.0 | 1.0.
- The lean set on landing does not persist into the kicking window. It is back near the base limit by the next
  sample, though its target is twice that and the press supports it (`unsupportedLean` releases only past
  1.25 x the press).
- So what holds the lean down while he moves backward under a press is in the World (lean blending, LEAN_PITCH, or
  another writer between ticks), not in his choice of technique. Two controller attempts at this mechanism
  (TACKLE_BRAKE, TACKLE_RESET) have not moved it.

**Stop.** The open question is the World's: under a sustained press, while he moves backward, why does his lean stay
at the base limit when its target and the load would support twice that? That needs the support/World owner, or a
targeted read of `feet()`'s lean state across ticks, before a third mechanism.

## The lean trace: what holds a carried tackle's drive into the man (diagnostic; `scripts/diag/effective-mass/lean-trace/`)

The fixture was four verticals and smash against Cover 2, seeds 1-24, with A + TACKLE_SET + TACKLE_BRAKE. Each stage
of `World.feet()`'s lean was hooked for the tackle engaged with an edge rusher in front, 1.5-2.5 s.

**Writers.** In the World only `feet()` writes the lean, plus the fall and get-up resets. In the sim, `lunge` (a reach
at air), tackle.ts and TACKLE_RESET write it. Over 4,152 substeps:
- release before the blend (`unsupportedLean`): acted on 0%;
- the blend toward the target: k = 0.099 a substep (LEAN_RISE 0.04 s), rising 94%;
- LEAN_PITCH: clamped 86%;
- release after: 0%;
- nothing changes the lean between ticks.

**One tick** (seed 1, four verticals, RT, t 1.95), x-components:
- the lean enters at 183 and the blend takes it to 227;
- LEAN_PITCH clamps the vector's magnitude to its pendulum growth (406 → 469 over the tick);
- it leaves at 185 → 212: +16% a tick, about e^(ω0 t) with ω0 ≈ 3.1 /s, doubling in about 0.22 s.

**One rep** (seed 23, four verticals, RT), the full vectors:
- the press felt is about (−200 to −500, ±1000 to 1700): mostly lateral;
- |lean| grows 232 → 1035 from 1.80 to 2.25 s under the clamp, then holds the press with no clamp from 2.30 s;
- he slows from −3.7 to −1.9 yd/s by 2.5 s and stops by 3.1 s.

**Aggregate** (346 ticks, 1.5-2.5 s):
- press |F| p50 1381 (p25-p75 1170-1499); the share along his retreat axis, |Fx|/|F|, is p50 0.42;
- the rusher is beside him: dx +0.16, |dy| 1.01 yd;
- |lean| / |target| p50 0.45 (p25-p75 0.32-0.78); |lean| p50 630 against a target of 1361.

**Reading.**
1. **A correction.** The "186 held at the base limit" above was the x-component only. The press on an edge tackle is
   mostly across him: the hands' load acts along the line between the bodies and the rusher is beside him. His lean is
   not held at the base limit. It grows at the pendulum rate and reaches the press in about 0.45 s when the press is
   steady.
2. **The limiting writer is LEAN_PITCH**, and only through its growth rate. Within 1.5-2.5 s the lean reaches about
   45% of its target because it grows from small at the pendulum's rate while the press direction turns and swings.
   The release (`unsupportedLean`) never acts.
3. **Is LEAN_PITCH doing what it was built for?** Yes. A lean cannot appear instantly: the centre of mass must get
   ahead of the base, and with the feet planted that happens only by falling, at the inverted pendulum's rate. It has
   no route for the other way he gets his centre of mass ahead of his feet: moving his feet back, a replacement step.
   That is a case it does not cover, not an error.
4. **Why TACKLE_RESET did nothing useful.** On landing it set the lean to the base limit, about 262. That is below the
   630 he already had: it cost braking and gave nothing.
5. **What a step would physically buy.** Moving the base back by the step's length moves the lean by stiffness x
   length (m·ω0² ≈ 1380 per yd for this tackle), bounded by the press. A 0.3-0.5 yd replacement is about 400-700:
   about the target gap. That is a different mechanism from the one built.
6. **The press's direction is a second question.** Only about 40% of the rusher's load acts along the tackle's
   retreat. The rest is across him.

## The engaged pair's geometry (`pair-geometry.py`; NFL against ours, same code)

Frames from 1.0 s, ball in, with the edge rusher within 1.2 yd of his tackle. Ours: seed 201 x 8 on this head, off, with
RUSH_INTENT, and set A. No body orientation in the format, so "square" uses the tackle's own retreat: the rusher within
30° of the direction opposite his motion.

| | 1.5-2.0 s | 2.0-2.5 s | 2.5-3.0 s | 3.0-4.0 s |
|---|---|---|---|---|
| **square / beside (> 60°)** | | | | |
| NFL | 16 / 58% | 16 / 63% | 16 / 67% | 9 / 81% |
| off | 11 / 52% | 9 / 59% | 9 / 58% | 17 / 36% |
| RUSH_INTENT | 28 / 35% | 22 / 46% | 14 / 54% | 13 / 53% |
| A | 14 / 50% | 21 / 49% | 22 / 56% | 24 / 48% |
| **rusher in front (QB frame) dx / outside** | | | | |
| NFL | +0.70 / +0.70 | +0.55 / +0.60 | +0.50 / +0.50 | +0.37 / +0.40 |
| off | +0.77 / +0.70 | +0.85 / +0.80 | +0.81 / +0.80 | +0.54 / +0.80 |
| RUSH_INTENT | +0.76 / +0.60 | +0.85 / +0.70 | +0.85 / +0.70 | +0.64 / +0.70 |
| A | +0.75 / +0.70 | +0.63 / +0.60 | +0.64 / +0.60 | +0.31 / +0.40 |
| **pair heading against the line to the QB** | | | | |
| NFL | 45° | 41° | 43° | 58° |
| off | 63° | 71° | 88° | 93° |
| RUSH_INTENT | 48° | 50° | 65° | 77° |
| A | 63° | 59° | 64° | 54° |
| **pair speed / rusher speed** | | | | |
| NFL | 3.50 / 3.95 | 3.09 / 3.26 | 2.50 / 2.66 | 2.02 / 2.26 |
| off | 3.63 / 3.64 | 3.28 / 3.29 | 3.00 / 3.01 | 2.24 / 2.26 |
| RUSH_INTENT | 3.04 / 3.01 | 2.78 / 2.76 | 2.51 / 2.51 | 1.67 / 1.68 |
| A | 3.45 / 3.48 | 3.19 / 3.16 | 2.86 / 3.01 | 1.95 / 2.46 |

Tackle x-velocity (tackle-retreat.py) at 1.0-1.5 / 1.5-2.0 / 2.0-2.5 / 2.5-3.0 s:
- NFL: −2.50 / −2.75 / −2.25 / −1.50
- off: −3.00 / −3.50 / −3.25 / −3.00
- RUSH_INTENT: −2.75 / −3.00 / −2.75 / −2.50

RUSH_INTENT's in-front share is 28.8% of pressure (off 34.3%), converting at 5.0% (off 2.3%). Its pressure is 40.3%
(off 37.0%).

**Reading.**
1. **The NFL pair is not square: it is beside, as ours is.** The rusher is beyond 60° of the tackle's retreat on 58-81%
   of NFL frames, against 36-70% of ours, and he sits in the same place in the QB frame within 0.1-0.3 yd. The
   hypothesis (NFL square with the load through the chest, ours beside with the load across) does not hold. A
   kick-slide geometry item under TACKLE_SET is not indicated by this.
2. **What differs is where the pair goes and how fast.**
   - The NFL pair heads 41-45° off the line to the QB from 1.5 to 3.0 s. Ours off heads 63-88° off it: across and
     away, the tackle carried deep and wide.
   - The NFL pair slows from 3.5 to 2.5 yd/s by 2.5-3.0 s. Ours off is still at 3.0.
3. **The rusher's request moves both toward the NFL's.** With RUSH_INTENT the pair's speed matches the NFL's within
   about 0.1-0.4 yd/s, its heading comes to 48-65°, and the tackle's retreat comes within 0.25-1.0 yd/s of the NFL's.
   Our rusher between moves drives the pair across and away at full pace; that, not the anchor's size, is most of the
   walk-back.
4. RUSH_INTENT is parked waiting on the anchor because pressure overshoots (40.3% against 32.9%). This reverses the
   order: the rusher's request is the larger part of the retreat, and the anchor is second.

# Why PUNCH cuts scrambles (Integration's card question, 2026-11-13)

Cards (Integration, seeds 11 / 23, 16 games): PUNCH takes scrambles from 2.8 to 1.8% and 2.8 to 0.7%.

**The QB's decision** (`scripts/diag/pass-operators/punch-scramble/`; the instrumentation is a patch for a scratch
worktree; seeds 11-18, PAST_ALONG_PATH + OPEN_HANDS on):

| | PUNCH off | PUNCH on |
|---|---|---|
| dropbacks | 703 | 700 |
| dropbacks where he checks for a scramble lane / with a panic check | 173 / 31 | 148 / 30 |
| checks / panic checks | 1462 / 101 | 1333 / 108 |
| checks with at least one lane open | 176 | 46 |
| scrambles fired (clock / panic) | 38 / 4 | 9 / 1 |

He looks for a lane about as often. He sees one a quarter as often.

**Why the lanes close.** `shouldScramble` adds the hold he sees on each rusher to the rusher's time to the lane.
BLOCK_SEEN (on in the stack) counts a rusher as in contact only when the centres are within the blocker's
`profile.reach` plus the rusher's radius. `profile.reach` is 0.25 + 0.85 arm from the centre (the catch and tackle
radius). PUNCH puts the hands at lockout: the bodies plus 0.9 arm, about 0.1 yd beyond that.

| engaged pass pairs (nativeTraceSetup, four verticals and smash against Cover 2, seeds 1-16) | PUNCH off | PUNCH on |
|---|---|---|
| ticks | 5690 | 5325 |
| gap between the bodies p25 / 50 / 75 | 0.11 / 0.27 / 0.33 yd | 0.23 / 0.64 / 0.84 yd |
| joint extension past the bodies p50 | 0.24 | 0.70 |
| beyond the QB's "in contact" (reach + rusher radius) | 0.5% | 46.1% |
| truly at air (beyond lockout + 0.05) | 0% | 4.4% |
| beyond the blocker's full arm from the body surfaces | 0% | 1.1% |

So on about 42% of engaged ticks the QB reads a rusher in a locked-out block as a free man sprinting at him: no hold
and no pacing. Every lane closes and he does not scramble. This is a perception definition, not the pocket: the
punch's geometry and the QB's contact test use different arms. BLOCK_SEEN's own description is "the rusher's body
within the blocker's arm's length". With elbows bent (PUNCH off) the two never disagree.

**Proposed fix (not built).** BLOCK_SEEN's contact test uses the blocker's arm from the body surfaces (radii +
armIn/36, the punch's arm), and stays bit-identical off by being gated under PUNCH, which is what introduced the
extension. The same misreading may also be in his pressure feel (sacks +0.4 / +0.8 with PUNCH); to check after the
fix.

**Fix built** (under PUNCH; `qb.ts` `inArm`, used by `seenHold` and `freeBound`; off bit-identical, seed 999 hash). The
same seeds 11-18 with PAST_ALONG_PATH + OPEN_HANDS (`scr-probe.mts`, 703 dropbacks an arm):

| | PUNCH off | PUNCH on, before | PUNCH on, with the fix |
|---|---|---|---|
| scrambles | 20 | 4 | 18 |
| sacks | 30 | - | 30 |

block-seen, free-bound, past-along-path and scorecard-provenance pass.

# The earliest in-front pressures (`early-front.py`; on ba4b9866, A 2 x 16, f201-A / f301-A; NFL same code)

In-front pressure before 2.5 s: NFL 0.5% of dropbacks (n 51); A 1.4 / 2.7%.

| | NFL | A 201 | A 301 |
|---|---|---|---|
| first contact (rusher within 1.2 yd of his tackle) | 1.30 s | 2.00 s | 1.90 s |
| tackle depth at contact (over the QB) | −4.1 (+1.9) | −5.1 (+1.8) | −5.2 (+2.3) |
| tackle x-velocity over contact's first second | −2.70 | −3.33 | −3.75 |
| at pressure: time / tackle / QB depth | 2.30 / −6.6 / −6.9 | 2.30 / −6.1 / −7.4 | 2.30 / −6.7 / −8.0 |
| QB drift toward the rusher since 1.0 s | +0.30 | −0.10 | −0.10 |
| tackle to QB at pressure | 1.50 | 1.33 | 1.39 |

All engaged tackle-edge pairs, by the time of first contact (share of pairs; becomes an in-front presser):

| first contact | NFL | A 201 | A 301 | A + TACKLE_SET (t201-S, 8 games) |
|---|---|---|---|---|
| before 1.2 s | 20% (1.5%) | 25% (0.2%) | 21% (0.2%) | 9% (0%) |
| 1.2-1.5 s | 42% (2.6%) | 53% (0.6%) | 55% (1.5%) | 35% (1.4%) |
| 1.5-1.8 s | 26% (3.0%) | 10% (4.8%) | 10% (8.7%) | 28% (3.2%) |
| 1.8-2.2 s | 7% (3.8%) | 5% (26%) | 6% (28%) | 16% (14%) |
| 2.2 s or later | 5% (1.7%) | 8% (33%) | 7% (27%) | 12% (26%) |
| tackle over the QB at contact, 2.2 s or later | +2.1 | +1.2 | +1.3 | +1.1 |

**Reading.**
- The earliest in-front pressures are not a press unanswered in the first second, and not the QB drifting toward the
  rusher. Their first contact comes late (1.9-2.0 s against 1.3 s), with the tackle already 5 yd deep.
- Late first contacts (from 1.8 s) are as common in ours as in the NFL's: 12-14% of pairs against 12%. In the NFL
  they almost never become in-front pressure (2-4%). In ours they do 26-33% of the time.
- At a late contact our tackle is about 1.2 yd above the QB, against the NFL's 2.1. The tackle's depth is the same as
  the NFL's (−6.5 against −6.3); the gap is the QB, about 0.7-0.9 yd shallower than the NFL's at that time. A rusher
  who reaches the tackle's side there is already within 2 yd of the QB.
- TACKLE_SET makes late contact more common (28% of pairs from 1.8 s) without moving that geometry.
- Next: what the late-contact rusher does before contact (arc width, a delayed or looping rush, a stunt), and the QB's
  depth at those times (NFL deeper: a deeper drop, or climbing less).

## Earliest in-front pressures, parts 1 and 2 (measurement only; on ba4b9866, A)

**Part 2a: the QB's depth against time** (`qb-depth.py`; non-play-action in ours; the NFL set has no play-action
label). p50 behind the line at 1.0 / 1.5 / 1.75 / 2.0 / 2.25 / 2.5 / 3.0 s:

| | 1.0 | 1.5 | 1.75 | 2.0 | 2.25 | 2.5 | 3.0 |
|---|---|---|---|---|---|---|---|
| NFL gun | −5.3 | −6.5 | −7.1 | −7.5 | −7.7 | −8.0 | −8.0 |
| A gun (201 \| 301) | −5.3 | −6.8 | −7.6 | −7.9 \| −7.8 | −7.9 | −7.9 | −7.9 |
| NFL under center | −3.2 | −5.2 | −6.5 | −7.2 | −7.8 | −8.4 | −8.5 |
| A under center | −3.5 \| −3.6 | −5.4 | −6.4 \| −6.6 | −7.1 \| −7.2 | −7.7 | −7.9 | −7.9 |

In the gun our QB reaches his depth earlier than the NFL's and stops dead at 7.9 yd; the NFL's settles to 8.0. Under
center ours tracks the NFL's to 2.25 s and stops at 7.9 where the NFL's goes on to 8.4-8.6.

**Part 2b: TACKLE_SET's floor against where the QB is** (`launch-vs-qb.mts`, seeds 201-206, A; TACKLE_SET's floor
computed, not applied).
- Gun, 385 dropbacks, launch point p50 8.0 yd, floor 7.0:
  - QB minus launch point at 1.5 / 2.0 / 2.5 s: +1.25 / +0.16 / +0.10 (short by more than 0.5 yd: 89 / 3 / 5%);
  - the tackles over the QB: 2.98 / 2.53 / 1.32.
- Under center, 122 dropbacks:
  - QB minus launch point at 1.5 / 2.0 / 2.5 s: +2.76 / +0.87 / +0.12 (short by more than 0.5 yd: 96 / 73 / 9%);
  - the tackles over the QB: 2.08 / 2.37 / 1.76.

So in the gun the QB reaches the called launch point by 2.0 s and stays there: the tackle is not setting to a point the
QB has not reached, and the QB does not stop short. Under center he is still 0.9 yd short at 2.0 s (Rules+Coaching's
finding) and there by 2.5 s.

The "QB 0.7-0.9 yd shallower" in the late-contact plays was selection. Across all dropbacks the late gap is 0.1 yd in
the gun and 0.5-0.7 yd under center after 2.5 s. What differs late is our tackle: 1.3 yd over the QB at 2.5 s, against
the NFL's +2.1 (2.0-2.5 s) and +1.6 (2.5-3.0 s).

**Part 1: the late-contact rusher before contact** (`early-front.py`; pairs whose first contact comes at 1.8 s or
later):

| | NFL (n 1323) | A 201 (n 215) | A 301 (n 289) |
|---|---|---|---|
| aligned outside the tackle at the snap (contact 1.2-1.5 s: reference) | +2.9 (+2.4) | +2.4 (+2.6) | +2.5 (+2.5) |
| at 1.0 s: outside / ahead in depth / gap / speed | +2.2 / +1.6 / 2.8 / 3.7 | +1.3 / +1.9 / 2.4 / 3.8 | +1.4 / +1.8 / 2.3 / 3.8 |
| at 1.5 s: outside / ahead / gap / speed | +1.5 / +0.9 / 1.9 / 4.4 | +1.3 / +1.2 / 1.7 / 4.0 | +1.2 / +1.2 / 1.8 / 4.0 |

- The NFL's late contacts are wide rushers: aligned wider, still 2.2 yd outside at 1.0 s. That is the arc, and it
  meets the tackle late because it is long.
- Ours are ordinary alignments, closer to straight in front of the tackle, 1.7-2.4 yd from him and not touching until
  1.8 s or later.
- So our tackle retreats ahead of a rusher close in front of him, at the rusher's pace, keeping out of contact until
  both are at the QB's depth. That is PASS_KICK's follow: matching the rusher's depth speed while he is in front.
- It is the tackle's set, not the drop.

## The unengaged approach (Integration, 2026-11-13; `approach-gap.py` same code both sides, `approach/approach-probe.mts` engine)

Rusher in front of his tackle and not in contact (gap > 1.2 yd), 1.0-1.8 s, ball in. By the rusher's width outside the
tackle at the snap.

| | NFL | A 201 | A 301 |
|---|---|---|---|
| **head-up / shaded (≤ 1.5 yd)** | | | |
| pairs | 1392 (10%) | 129 (5%) | 83 (3%) |
| tackle / rusher x-vel | −2.00 / −3.00 | −2.50 / −3.00 | −2.25 / −3.00 |
| gap rate p25 / 50 / 75 | −1.41 / −0.94 / −0.16 | −1.57 / −0.59 / +0.35 | −1.76 / −0.50 / +0.15 |
| first contact p50; from 1.8 s | 1.10 s; 8% | 1.40 s; 28% | 1.30 s; 16% |
| **wide (1.5-3 yd)** | | | |
| pairs | 9725 | 1901 | 1995 |
| tackle / rusher x-vel | −2.50 / −4.00 | −2.50 / −3.75 | −2.50 / −3.75 |
| gap rate p25 / 50 / 75 | −2.12 / −1.73 / −1.09 | −2.18 / −1.34 / 0.00 | −2.33 / −1.53 / −0.38 |
| first contact p50; from 1.8 s | 1.30 s; 8% | 1.20 s; 13% | 1.30 s; 14% |
| **very wide (> 3 yd)** | | | |
| pairs | 2607 | 381 | 471 |
| tackle / rusher x-vel | −2.75 / −4.00 | −2.50 / −4.00 | −2.50 / −4.00 |
| gap rate p50 | −1.96 | −2.10 | −2.04 |
| first contact p50; from 1.8 s | 1.60 s; 33% | 1.30 s; 7% | 1.30 s; 12% |
| **last yard (gap 2.2 → 1.2) closed by the rusher** (> 100%: the tackle keeps giving ground) | 146-156% | 104-137% | 110-131% |
| **tackle over the QB at first contact, by contact time** (< 1.2 / 1.2-1.5 / 1.5-1.8 / 1.8-2.2 / 2.2+ s; `early-front.py`) | +2.9 / +2.6 / +2.4 / +2.3 / +2.1 | +2.6 / +2.9 / +3.0 / +2.6 / +1.2 | +2.7 / +2.9 / +3.0 / +2.6 / +1.3 |

**The NFL tackle against an unengaged rusher.** He does not hold his depth and let the gap close. He keeps
retreating (−2.0 to −2.75 yd/s) and the rusher closes the last yard and more (146-156%). Our tackle's depth speed is
the same for wide and very wide rushers (−2.5) and faster for head-up ones (−2.25 to −2.5 against −2.0). In the last
yard ours gives less ground (104-137%).

**Why our rusher in front is not closing** (engine, seeds 201-206, A; unengaged rusher in front of his tackle, gap
1.2-2.6 yd, 1.0-1.8 s; his branch in `PassRusher.decide` instrumented in a scratch worktree):

| | closing (rate < −0.3), 92% of ticks | not closing, 8% |
|---|---|---|
| branch / plan | arc/speed 37%, power 31%, arc/finesse 29% | power 33%, arc/speed 19%, arc/finesse 11%, lane 14%, other 9% |
| asks / achieves | 8.89 (vmax) / 4.35 yd/s | 8.82 (vmax) / 1.96 yd/s |
| heading at the tackle, asked / achieved (1 = straight) | 0.96 / 0.89 | 0.90 / 0.80 |
| support | up 100% | up 83%, falling 11%, down 5% |
| touching another body | none 96% | none 56%, H 22%, Y 14%, RB 2% |
| x-vel rusher / tackle | −4.02 / −2.24 | −1.27 / −2.02 |

- Our rusher is not waiting on the tackle, working a move without contact, or throttled by a stage. Unengaged in front,
  he asks for full speed nearly straight at the tackle and closes on 92% of ticks.
- The 8% that stall are physical: a chip from a tight end, H-back or back (38%) or off his feet (16%).
- So the rusher's half is not the cause.

**Reading.**
- The approach itself is close to the NFL's: the tackle's depth speed and the rusher's closing rate match for wide and
  very wide rushers. Late contacts come mostly from head-up and shaded rushers (16-28% late against 8%), where our
  tackle retreats faster than the NFL's and the gap can open.
- Where our late contact differs is depth. At a first contact from 2.2 s the tackle is 1.2-1.3 yd over the QB against
  the NFL's 2.1. Every earlier contact bin is at or above the NFL's. With the QB stopped dead at 7.9 yd (Part 2a), the
  tackle reaches him.
- There is no single "close to contact" fix here. The candidates are the head-up retreat speed (small: 3-5% of pairs)
  and late depth (the tackle keeps going down to the QB's level while the QB has stopped).

## Sizing the untouched tackle's stop (`untouched-depth.py`; measurement for the design after the re-card)

Non-play-action dropbacks thrown at 2.0 s or later. The launch point is the QB's depth at the throw (the NFL set has no
called drop). A tackle is untouched while no defender has come within 1.2 yd of him since the snap. Frames 2.0-3.0 s,
his depth over the launch point (+ = shallower), p10 / 25 / 50 / 75 / 90:

| | NFL | A 201 | A 301 |
|---|---|---|---|
| launch depth p50 | 7.5 yd | 7.8 | 7.8 |
| untouched tackle frames | 8915 | 3788 | 2558 |
| over the launch point | +0.5 / +1.8 / +3.2 / +4.9 / +6.9 | −0.3 / +1.0 / +1.9 / +2.6 / +3.4 | −0.1 / +1.1 / +1.8 / +2.5 / +3.2 |
| giving ground faster than 1 yd/s | 70% (x-vel p50 −1.75) | 91% (−2.50) | 91% (−2.50) |
| settled (x-vel ≥ −1): over the launch point | +1.4 / +2.9 / +4.6 / +6.5 / +8.1 (n 2637) | +0.4 / +1.0 / +1.6 / +2.2 / +2.9 (n 324) | +0.2 / +1.1 / +1.7 / +2.2 / +2.9 (n 233) |

**Reading.**
- The NFL's untouched tackle sits much higher over the launch point than ours: p50 +3.2 against +1.8-1.9.
- He has settled on 30% of frames against our 9%. When settled he is at +4.6 p50, with a wide spread (p10 +1.4, p90
  +8.1). Ours, when settled, is at +1.6-1.7 with a narrow spread.
- Caveat: "untouched at 2-3 s" includes tackles whose man dropped or went elsewhere (helping inside, no rusher). The
  very high NFL settled depths are probably those. For sizing the stop against a rusher still coming, the
  still-giving-ground row is the cleaner reference: NFL +0.3 / +1.5 / +2.8 / +4.2 / +5.9, ours about −0.2 / +1.0 /
  +1.9 / +2.6 / +3.3.
- So the stop sits around +2 to +3 yd over the launch point with a spread of about ±1.5 yd. Integration's "≈ 2 yd" is
  the lower end of the NFL's middle half.

## The two cautions before designing the stop (Integration, 2026-11-13)

**1. Our called depth against our depth at the throw** (`launch-vs-qb.mts`, seeds 201-206, A): QB minus the called
launch point at the throw, p25 / 50 / 75:
- gun (353): +0.12 / +0.17 / +0.25;
- under center (109): +0.15 / +0.23 / +0.64.

He throws about 0.2 yd short of the called depth (under center, up to 0.6). The NFL sizing is over the depth at the
throw, so on our called depth the centre is about +2.7 to +3.2.

**2. Is a tackle at the stop depth still on the rusher's inside path?** (`untouched-lateral.py`, same code.)
Untouched tackle, 1.5-3.0 s, +1.5 to +4.0 over the launch point, his paired rusher in front of him 1.2-4 yd away; one
sample per pair per 0.3 s.

| | NFL (3001) | A 201 (1650) | A 301 (1222) |
|---|---|---|---|
| over the launch point p50 | +3.0 | +2.9 | +2.9 |
| rusher outside him p50 | +1.3 | +1.2 | +1.2 |
| tackle on the rusher's line to the QB (offset ≤ 0.65 yd) | 77% (offset p50 0.33) | 62% (0.54) | 60% (0.55) |
| next 1.0 s: meets / past outside / inside / none | 61 / 4 / 12 / 23% | 19 / 1 / 4 / 76% | 30 / 2 / 4 / 64% |
| settled subset (x-vel ≥ −1): n; on the line; meets / past outside / inside | 130; 68%; 44 / 1 / 20% | 47; 64%; 32 / 0 / 2% | 23; 57%; 43 / 9 / 4% |

**Reading.**
- At this depth the NFL tackle is on the rusher's line to the QB 77% of the time and meets him within a second 61% of
  the time. Past outside stays at 4% overall and 1% when he has settled. Settling at +2.5 to +3 does not hand the NFL
  rusher the corner.
- Settling does give up more inside (20% against 12%). Those crossings are what the NFL's inside help (guard, back)
  handles; ours is the queued inside-free item.
- Ours at the same depth is less often on the line (60-62%, offset 0.54 against 0.33). Two-thirds of the time the pair
  does not meet within a second (64-76% none, against 23%): the tackle keeps retreating ahead of a rusher who is not
  closing on him.
- So the stop needs its lateral half too: settling at the depth on the rusher's inside path to the QB, by what he sees.
  A depth stop on a tackle 0.5 yd off the line would give the rusher an angle earlier.

# Spec: physical pass-rush move resolution (RUSH_HANDS, off; for Integration before any build)

**Why.** With set A the blocker's hands work through the World. They are pressed to lockout at arm speed, push is
bounded by the joint and traction, and a punch at air leaves him overextended. The rusher's moves are still
`resolveMove`'s rating roll. That roll has no term for the blocker's extension, a won move leaves the hands joint in
place, and its effects are applied by fiat (a `control` change, a strike). Engine-54 measured the result: same moves
at the same success rate (15-17%), the rusher held 0.2-0.4 yd farther off, pressure about −4.5 points.

This replaces the roll with moves that act on the blocker's hands and body through the World. The blocker's extension
is what makes him vulnerable.

## State the World needs (small)

The blocker's hands joint gets a **fit state**, from what has physically happened:
- *fitted*: inside, pressed, elbows in. The joint's limits as today.
- *extended*: at or near lockout (PUNCH's extension ≥ 0.8 arm). Today's limits, but the arm is a long lever: a lateral
  impulse at the hand turns it off the man more easily, and his centre of mass is ahead of his base (lean, LEAN_PITCH).
- *off*: knocked off, missed, or slid off. push = hold = steer = 0 until he re-fits.
- **Re-fit**: the hand travels back to the man at ARM_SPEED (PUNCH's machinery) after the blocker's reaction time to
  the loss, felt by touch. No timer: the distance and arm speed set it.

No two-hand model. One joint with a fit state is the simplest one that tells a fitted hand from an extended one from a
lost one.

## The rusher's moves: action, what makes each work, what failing costs

The rusher keys on what he sees and feels:
- the blocker's arms out (extended) or not yet on him (late hands);
- the blocker's set: oversetting width, retreat speed, shoulders turned;
- the blocker's weight forward (lean over his feet);
- his own pad level against the blocker's hand height.

Ratings act on timing (when he sees it, by `passRushFinesse` and awareness), hand speed, strength (impulse size) and
bend (pad level). Never on the outcome.

| move | action through the World | works when | if it fails |
|---|---|---|---|
| **swipe / club** | a strike on the blocker's arm at the hand, lateral to the joint (the World's `strike`, aimed at the arm, not the torso) | the impulse's torque at the hand exceeds what his arm and grip hold. Extended: the lever is long and the grip resists less. Fitted and pressed: resists. Result: the joint goes *off* on that side | his own hands were off the blocker for the strike: the blocker's punch lands on an open chest (the current failed-move strike, now only if the blocker's hands are fitted and re-fit in time) |
| **snatch / pull** | a pull on the extended arm (tension through the joint, from the rusher) | the blocker is *extended* with his centre of mass ahead of his base: the pull adds to his lean past the base (xi grows) and availability falls | against a fitted, sat blocker it moves nothing; the rusher has stopped his feet and given up ground toward the QB |
| **rip** | his near arm drives up under the blocker's hand and armpit, shoulder dropped | his pad height (`padHeightAt`, posture and bend) is below the blocker's hand contact and his upward force exceeds the hold on that side: the contact slides off up and over (*off*) | a high rip into a fitted hand: he has turned his shoulder and is ridden past (PAST's ride) |
| **long-arm** | his extended arm into the blocker's chest (a joint from the rusher's side at his own lockout) | his arm is longer than the blocker's reach or the blocker is late: the blocker's hands cannot reach his chest (extension limited by the blocker's arm), and the rusher's legs drive through his straight arm. The World resolves the push | a shorter arm: the blocker fits inside it and clubs it down (the blocker's swipe, same mechanics, his side) |
| **dip under a high punch** | he drops his pad level as the punch comes | the punch's target (his chest) drops below the hand's path: PUNCH's existing *at air* branch (overextended, push × 1/3 for a reaction time). That is the window | dipping too early or into a low punch: he is lower and slower with no window |
| **spin** | his yaw rotates the contact off | his yaw rate carries the contact point beyond the hand's reach on the far side before the re-fit | against a square, pressed, close blocker he gives his back and is driven past |
| **bull** | already physical: push through the joint against the anchor | as now | as now |
| **speed / dip** | already physical: feet and bend around the corner | as now | as now |

**GRIP_BREAK** is the physical release behind swipe, club and rip: a strike or a lift that exceeds the grip
capacity (under OPEN_HANDS, a *grip* has the hold limit; open hands only friction) takes the joint *off*. The release
is the World's limit being exceeded, not a declared success.

## The blocker's counters (his technique, not scripted)

- **Re-fit** after an *off*: at arm speed, after his reaction time.
- **Don't overextend.** His extension choice (PUNCH) now carries a cost (lever, lean), so pressing to lockout is a
  choice with a risk: a disciplined blocker punches and re-bends.
- **Anchor** (lean and base, as the World has it).
- **Give ground** (the kick).
- **His own swipe** on a long-arm, with the same mechanics on his side.

Nothing is banned. A blocker who keeps his hands fitted defeats the swipe. A rusher who reads an extended arm beats it.

## Fixtures (both ways; World and engagement unit tests, same bodies)

1. Swipe against an extended arm takes the joint *off*. The same swipe against a fitted, pressed hand at the same
   impulse does not.
2. Snatch against an extended, leaning blocker: xi grows and availability falls. Against a sat blocker: no effect, and
   the rusher's own forward speed is lost.
3. Rip with the rusher's pad below the hand: off. With it above: fails, rusher ridden.
4. Long-arm: the longer-armed rusher keeps the blocker's hands off his chest. The shorter-armed one does not, and is
   clubbed down.
5. Dip as a punch is thrown at his chest: the punch goes to air (PUNCH's overextension). Against a low punch: no
   window.
6. Re-fit: after an *off*, the hands return within (distance / ARM_SPEED + reaction time), not a fixed time.
7. Off: bit-identical (the roll restored).

## Reads to land on (same operators as the set A reads; NFL in brackets)

- Pressure by class: past outside 3.8%, in front 3.0%, inside 6.4%, interior 9.8% of dropbacks.
- Time to pressure p50 2.6-2.7 s.
- Sacks per pressure 19%.
- Walked-back share (in front at pressure) 9%.
- Rushers reaching the tackle's hip 58 per 100 dropbacks.
- Engaged rusher win rate and move-success rate by move, against the blocker's fit state.

Controls: the fixed run set (run reps keep their hands), holds (committed / material), dither.

## Build order (two attempts, then re-diagnose)

1. The World: the fit state, *off* limits, re-fit at arm speed, and GRIP_BREAK's release by exceeded limits. Fixtures
   6 and 7.
2. The moves, each replacing its branch of `resolveMove` behind RUSH_HANDS: swipe/club, rip and snatch first (they
   answer the extended arm); then long-arm, dip and spin. Fixtures 1-5.
3. The rusher's keys from what he sees (extension, set, lean) into `chooseMove`. That is intent, not outcome.

## RUSH_HANDS stage 2: the reads (A against A + RUSH_HANDS; engine-54 tree at 2b4d6346, seeds 11 / 23, 16 games)

| | A 11 \| 23 | A + RUSH_HANDS 11 \| 23 | NFL |
|---|---|---|---|
| native sacked (review stats) | 2.1 \| 2.4% | 3.0 \| 2.9% | 4.6-9.4% band |
| native pressured | 16.5 \| 12.1% | 16.1 \| 14.7% | |
| sacked (operator) | 2.6 \| 3.1% | 3.9 \| 3.9% | 6.7% |
| pressured | 32.1 \| 26.9% | 32.9 \| 29.8% | 32.9% |
| time to pressure p50; by 2.5 s | 2.6 s; 14.1 \| 12.3% | 2.7 \| 2.6 s; 13.0 \| 13.4% | 2.6-2.7 s |
| sacks per pressure | 8.2 \| 11.5% | 11.7 \| 13.1% | 19.1% |
| edge in front, of dropbacks (share of pressure) | 12.9 \| 10.0% (40 \| 37%) | 11.9 \| 9.8% (36 \| 33%) | 3.0% (9%) |
| edge past outside | 1.4 \| 1.5% | 2.5 \| 1.9% | 3.8% |
| edge inside | 4.2 \| 3.5% | 4.6 \| 3.8% | 6.4% |
| interior | 7.1 \| 6.2% | 9.1 \| 6.1% | 9.8% |
| rushers reaching the hip per 100 dropbacks | 24.2 \| 23.0 | 26.6 \| 25.5 | 58 |
| retreat 1.5-2.0 / 2.0-2.5 / 2.5-3.0 s | −3.0 / −3.0 / −2.75 (both) | the same | −2.75 / −2.25 / −1.50 |
| native scrambles; completion | 1.5 \| 1.9%; 68.0 \| 65.5% | 1.5 \| 2.3%; 66.3 \| 65.0% | |

Club success by the rusher's finesse (`club-probe.mts`, seed 11 x 2): below 0.4: 9%; 0.4-0.7: 17%; 0.7 and above: 15%.

**Reading.**
- Two physical moves move sacks toward the NFL on both seeds: native about +0.7 points, operator +1.3 / +0.8. Sacks per
  pressure go up (8.2 → 11.7, 11.5 → 13.1). The in-front share of pressure falls 4 points, past outside rises.
- Pressure by class and time to pressure barely move: the class composition and the walk-back are as with A. Rushers
  reach the tackle's hip a quarter as often as the NFL's: 24-27 against 58 per 100 dropbacks.
- Why so little: the moves now resolve physically, but they are chosen by the old weights. A club succeeds against an
  unpressed hand (about 50-70%) and almost never against a pressed one (3-12%), and the rusher does not choose it by
  seeing an exposed hand. The corner itself (speed, dip) is still a roll. The between-player spread is small and not
  monotone in finesse.
- By Integration's rule ("if pressure by class and time to pressure come back toward the NFL with two moves, add the
  rest one at a time; if not, re-diagnose"), this is "not". Re-diagnosis points to the choice (item 4: keys from what
  he sees) before more moves. Rip, snatch, dip and spin wait.

## RUSH_HANDS keys: the read (5c47b27c; seeds 11 / 23, 16 games, engine-54 tree)

| | A | stage 2 (moves, old choice) | + keys | NFL |
|---|---|---|---|---|
| native sacked | 2.1 / 2.4% | 3.0 / 2.9% | 5.1 / 3.7% | band 4.6-9.4% |
| operator sacked | 2.6 / 3.1% | 3.9 / 3.9% | 5.9 / 4.3% | 6.7% |
| pressured | 32.1 / 26.9% | 32.9 / 29.8% | 43.4 / 37.0% | 32.9% |
| time to pressure p50; by 2.5 s | 2.6 s; 14.1 / 12.3% | 2.6-2.7 s; 13.0 / 13.4% | 2.5 s; 24.2 / 18.7% | 2.6-2.7 s |
| sacks per pressure | 8.2 / 11.5% | 11.7 / 13.1% | 13.6 / 11.8% | 19.1% |
| edge in front (share of pressure) | 12.9 / 10.0% (40 / 37%) | 11.9 / 9.8% (36 / 33%) | 10.9 / 7.5% (25 / 20%) | 3.0% (9%) |
| edge past outside | 1.4 / 1.5% | 2.5 / 1.9% | 4.0 / 4.1% | 3.8% |
| interior (free then) | 7.1 / 6.2% | 9.1 / 6.1% | 19.4 / 15.7% (79 / 67%) | 9.8% (46%) |
| interior before 2.5 s | 2.4 / 2.6% | 3.0 / 2.7% | 10.7 / 7.6% | 3.8% |
| hip reach per 100 dropbacks | 24 / 23 | 27 / 26 | 33 / 32 | 58 |

Clubs with the keys (`club-probe.mts`, seed 11 x 2):
- against tackles: 284 clubs, 38% at an unloaded hand, 18% off, press N p50 766, extension 0.90 arm;
- against guards and the center: 667 clubs, 61% at an unloaded hand, 39% off, press N p50 77, extension 0.23 arm.

**Reading.**
- Choice moves the composition toward the NFL. In-front share falls to 20-25%, past outside reaches the NFL's, hip
  reach rises by a third, sacks are in or near the band.
- Pressure overshoots through the interior: twice the NFL's interior rate, free and early. Interior blockers' hands
  carry almost no press (N p50 77): arms bent, not punching. The rusher reads that state correctly and clubs it.
- The defect is on the blocker's side: interior pass sets without press under the hands. It existed before RUSH_HANDS;
  nothing exploited it. Next diagnostic: why the guard's hands are unloaded (PUNCH's extension against the seen gap,
  control, the hands joint's mode).

## RUSH_HANDS attempt 2 (two hands, 95fbbb16): the read, then stop

| | keys (attempt 1) | two hands (attempt 2) | NFL |
|---|---|---|---|
| native sacked | 5.1 / 3.7% | 4.9 / 4.9% | band 4.6-9.4% |
| operator sacked; pressured | 5.9 / 4.3%; 43.4 / 37.0% | 6.2 / 5.9%; 40.1 / 39.5% | 6.7%; 32.9% |
| sacks per pressure | 13.6 / 11.8% | 15.5 / 14.9% | 19.1% |
| time to pressure p50 | 2.5 s | 2.5-2.6 s | 2.6-2.7 s |
| edge in front (share of pressure) | 10.9 / 7.5% (25 / 20%) | 10.6 / 9.4% (26 / 24%) | 3.0% (9%) |
| edge past outside | 4.0 / 4.1% | 4.0 / 3.8% | 3.8% |
| interior; free then; before 2.5 s | 19.4 / 15.7%; 79 / 67%; 10.7 / 7.6% | 16.9 / 16.6%; 70 / 69%; 6.5 / 7.4% | 9.8%; 46%; 3.8% |
| hip reach per 100 | 33 / 32 | 37 / 32 | 58 |

The two-hand count leaves sacks in the band and conversion higher, but the interior row barely moves. The interior
rusher is still free at pressure 70% of the time and early. Two attempts at stage 2's outcome: stop and re-diagnose
how the interior rusher gets free (the rep's end, the guard's recovery), not the club's size.

## RUSH_HANDS with the rusher's hand recovery (08d79b3f): the read

Interior moves per rep 3.75 → 2.50 (off 2.51); the guard's hands at lockout 10 → 18% of ticks (off 31%).

| | two hands | + recovery 11 \| 23 | NFL |
|---|---|---|---|
| native sacked | 4.9 / 4.9% | 6.0 \| 4.7% | band 4.6-9.4% |
| operator sacked; pressured | 6.2 / 5.9%; 40.1 / 39.5% | 6.7 \| 5.6%; 40.6 \| 35.9% | 6.7%; 32.9% |
| sacks per pressure | 15.5 / 14.9% | 16.6 \| 15.3% | 19.1% |
| interior; free; before 2.5 s | 16.9 / 16.6%; 70 / 69%; 6.5 / 7.4% | 16.5 \| 12.3%; 74 \| 67%; 8.3 \| 6.6% | 9.8%; 46%; 3.8% |
| hip reach per 100 | 37 / 32 | 32 \| 27 | 58 |

**What an interior "free" pressure is** (`interior-free-kind.py`; first pressers from inside the tackles, free at
pressure):

| | NFL | A (11) | two hands (11) | + recovery (11 \| 23) |
|---|---|---|---|---|
| of dropbacks | 4.4% | 5.1% | 11.8% | 12.2 \| 8.3% |
| never engaged | 0.5% (at 0.1 s: snap geometry) | 0.4% | 0.2% | 0.2 \| 0.1% |
| stunt / twist (lateral travel > 2 yd) | 1.8%, at 3.3 s | 1.1% | 1.4% | 2.0 \| 1.0% |
| engaged, then free | 2.2%, last within 1.2 yd 0.1 s before | 3.6%, 0.4 s before | 10.3%, 0.4 s before | 10.0 \| 7.1%, 0.4 s before |

**Reading.**
- The NFL's interior "free" pressure is about half stunts (late) and half wins that come off the blocker right at the
  QB, 0.1 s before. Ours is almost all wins, three to four times the NFL's, coming off 0.4 s before.
- Recovery removed the extra attempts, but not the extra wins. A won interior rep ends at PAST's out-of-reach beat
  with no ride: `canRidePassContact` applies only to tackles (`passSet.outside`). A guard passed beyond his arm is
  done, and the rusher runs about 0.4 s free to the QB. The NFL guard stays on him until the QB.
- Next look, per Integration: the doubles (22% of interior reps, the helper's hands untouched by RUSH_HANDS), and the
  interior ride (staying on a man who has won the hip, as the tackle does).

# PASS_RIDE (908ab8ad, off): the block becomes a ride

**Diagnosis** (`ride-probe.mts`, develop's set A, seed 11 x 3): reps ending "past him" spend about 0.3-0.45 s riding
before the man gets beyond the blocker's arm. While riding, guards move 1.9 yd/s against the rusher's 3.4. The ride's
request was the man's velocity less 1 yd/s toward the QB (`RIDE_PUSH`, written as "push him past"), so the blocker fell
behind by design; facing the rusher, he also shuffled sideways at the directional cap.

**Build:** one rule for every pass blocker (`rideIntent`):
- he runs with the man on his QB side (a body's width across his path), matching his velocity and closing on that spot;
- hips open (facing where he goes);
- he pushes through his hands (the joint's push flattens the man away from the QB);
- once riding he stays on him until the man is clearly back in front (along his path by more than PAST_MARGIN);
- the rep still ends when the man is beyond his arm, so whether he keeps up is his body's.

The tackles' ride is the same code path and changes too: tackles ride at 1.8 yd/s, up from 1.3. Guards ride at 2.9 yd/s
(was 1.9) against rushers at 4.1-4.2. They still lose about 0.8 yd over about 0.45 s: a man with a running start
against a blocker accelerating out of his set.

**Read on set A** (seeds 11 / 23, 16 games, engine-54 tree):

| | A | A + PASS_RIDE | NFL |
|---|---|---|---|
| native sacked | 2.1 / 2.4% | 3.0 / 2.2% | band 4.6-9.4% |
| pressured; sacks per pressure | 32.1 / 26.9%; 8.2 / 11.5% | 30.3 / 28.2%; 10.2 / 11.0% | 32.9%; 19.1% |
| edge in front (share of pressure) | 12.9 / 10.0% (40 / 37%) | 10.1 / 9.6% (34 / 34%) | 3.0% (9%) |
| interior; free at pressure | 7.1 / 6.2%; 73 / 59% | 6.7 / 5.2%; 53 / 57% | 9.8%; 46% |
| interior engaged-then-free (of dropbacks) | 3.6 / 3.1% | 2.4 / 2.7% | 2.2% |
| ... last within 1.2 yd of a blocker before pressure | 0.4 / 0.4 s | 0.2 / 0.3 s | 0.1 s |

The ride moves the interior wins onto the NFL's count and closer to its timing, and the walked-back class shrinks.
Pressure and sacks barely move on set A. Next: the read with RUSH_HANDS on.

**With RUSH_HANDS on** (seeds 11 / 23, same head): RUSH_HANDS + recovery → + PASS_RIDE:
- native sacked 6.0 / 4.7 → 4.3 / 3.6%; pressured 40.6 / 35.9 → 38.7 / 33.7%;
- interior 16.5 / 12.3 → 16.0 / 11.6%; engaged-then-free 10.0 / 7.1 → 9.4 / 6.6% of dropbacks, still 0.4 s before
  pressure.

The ride barely moves it. `ride-probe.mts` with both flags (seed 11 x 3), guards:
- reps ending "past him" double (48 against 22);
- while ridden, the rusher runs at 4.73 yd/s (4.07 toward the QB) against the blocker's 2.75;
- press under the guard's hands is 0, with a hand cleared in 66% of these reps.

`interior-free.mts`: interior first pressers 16% of dropbacks, free 80%, last rep ended "past him" 73%.

**Reading.** Under RUSH_HANDS a one-hand clear frees the man's path, not only his hands. "Hand gone" puts the rusher in
his landed-move request (working past at 0.8-1.0 of vmax), and he goes round the guard's body faster than any ride can
follow. In football a club wins a hand; the blocker's body is still in front and has to be gone round, and the other
hand is on him. The open question is what the body does (torso contact, the ride's push with one hand, how much path a
club buys), not the club's size. Recommendation: PASS_RIDE stands on its own (it improves set A's interior on both
seeds). RUSH_HANDS is parked with that question named.

# RUSH_ONE_HAND (46a73129, off): RUSH_HANDS attempt 3, a miss

**Change:** one cleared hand no longer gives the landed-move request. The rusher works to the side the hand guarded,
through the body and the remaining hand. Only both hands gone is a landed move, and PAST declares the win.

**Prediction, before the read:** interior engaged-then-free 9.4 / 6.6% → 2-3% of dropbacks, sacks near 4-5%.

**Read** (engine-55 merge, RUSH_HANDS + PASS_RIDE, seeds 11 / 23, 16 games each, same head; arms are without → with RUSH_ONE_HAND):

| | without | with | NFL |
|---|---|---|---|
| native sacked | 3.9 / 4.0% | 3.6 / 3.3% | band 4.6-9.4% |
| pressured (pressure-source) | 39.3 / 35.7% | 40.1 / 36.4% | 32.9% |
| interior | 16.3 / 12.9% | 15.8 / 13.4% | 9.8% |
| interior engaged-then-free | 9.1 / 7.2% | 9.7 / 7.3% | 2.2% |
| ... last within 1.2 yd before pressure | 0.4 / 0.3 s | 0.2 / 0.3 s | 0.1 s |

**Missed.** The interior count does not move.

`ride-probe.mts` (seed 11 x 3), guards/center, without → with:
- reps ending "past him": 63 → 34;
- while ridden: rusher 4.57 → 4.93 yd/s, blocker 2.78 → 3.21;
- press N under the hands 0.00 in both, and for tackles too.

**What the miss tells us.** Removing the one-hand landed request halves the reps that end "past him", but the man
still comes free as often: by another route, and still faster than the ride once he is beside the blocker. The
remaining hand's press is 0 because of the ride's geometry, not the club's slack moment. Once the pair is side by
side and moving the same way, the joint's normal (blocker to man) carries nothing, and the only thing between the man
and the QB is the blocker's body. That body offers no resistance to a man running along it. Per the agreed stop, the
next step is torso contact (what a blocker's body does to a man going past it at his hip), not a fourth attempt at the
hands.

# Torso contact: diagnosis (2026-11-13, before any build)

Question (Integration): our ridden rusher runs 4.9 yd/s against the blocker's 3.2 with zero press. Does the NFL's ride
slow and bend him, and what does our World apply between two bodies side by side?

## NFL against ours, same operator (`ride-pair.py`)

Dropbacks, 0.5 s to the throw. Each DL/LB is paired each frame with the nearest OL within 1.2 yd. Tackles are the two
outermost linemen at the snap, interior the other three. "Ridden" means the rusher is level with or past the blocker
toward the QB (dx <= +0.2 along the QB-blocker line). "In front" means dx >= +0.5. Ours: RUSH_HANDS + PASS_RIDE +
RUSH_ONE_HAND, seed 11 x 16, on the engine-55 merge. Without RUSH_ONE_HAND, the rows differ by under 0.2 yd/s.

| | NFL interior | ours interior | NFL tackle | ours tackle |
|---|---|---|---|---|
| ridden frames /100 dropbacks | 638 | 463 | 504 | 202 |
| ridden: rusher speed p50 (p75) | 2.93 (3.76) | 3.02 (4.19) | 3.40 (4.45) | 3.58 (4.60) |
| ridden: rusher toward the QB | 2.04 | 2.33 | 2.36 | 2.54 |
| ridden: blocker speed | 2.25 | 2.14 | 2.69 | 2.61 |
| ridden: centre distance p25 / p50; share < 0.65 yd | 0.58 / 0.73; 37% | 0.67 / 0.81; 24% | 0.60 / 0.76; 34% | 0.67 / 0.82; 20% |
| ridden: curvature p25/50/75 (deg/s, + toward the QB) | -14/+13/+38 | -15/+14/+40 | -2/+27/+50 | -6/+22/+48 |
| in front: centre distance p50; share < 0.65 yd | 0.89; 10% | 0.90; 11% | 0.91; 8% | 0.92; 12% |
| ride episode duration p50 / p75 | 0.30 / 0.60 s | 0.30 / 0.50 s | 0.40 / 0.70 s | 0.30 / 0.50 s |
| ride ends with the pair apart (> 1.2 yd) | 46% | 54% | 44% | 49% |
| came off a ride /100 dropbacks | 38.2 | 37.9 | 33.6 | 20.5 |
| ... then within 2 yd of the QB before the throw | 9.9 (26%) | 20.3 (53%) | 9.9 (29%) | 10.4 (51%) |
| off the ride and reached the QB: QB distance, heading off the line to him, speed | 2.33 yd, 26°, 3.95 | 3.10 yd, 26°, 4.67 | 2.12 yd, 35°, 4.19 | 2.28 yd, 33°, 5.03 |
| off the ride, did not reach: QB distance, heading off his line | 5.21 yd, 40° | 4.10 yd, 32° | 5.18 yd, 44° | 4.65 yd, 38° |
| off the ride: time, throw after | 3.0 s, 0.7-1.2 s | 2.2-2.4 s, 0.5-0.7 s | 3.0 s, 0.8-1.2 s | 2.4-2.7 s, 0.5-0.6 s |

**Reading.**
- The ridden rusher's speed, curvature and the blocker's speed are close to the NFL in the frame-level medians.
  The probe's 4.9 against 3.2 is the subset of reps that end "past him", not the typical ridden frame.
- What differs is how close the ride is. With the man in front, our spacing matches the NFL (0.90 against 0.89 yd;
  11 against 10% within 0.65). Once he is past the shoulder, NFL pairs close in to the body (0.73 yd, 37% within 0.65);
  ours stay at arm's length (0.81 yd, 24%).
- What differs most is what a ride costs him. Our rushers come off a ride as often as the NFL's (38 per 100 dropbacks
  interior). Half of them then reach the QB, against a quarter in the NFL. They come off earlier (2.2-2.4 s against
  3.0), farther from the QB yet faster (3.1 yd at 4.7 yd/s against 2.3 yd at 3.95), and the ones that miss are on a
  more direct line (32° off it against 40°, 4.1 yd from him against 5.2).
- The NFL ride carries the man past and off the QB's line and costs him speed. Ours lets him go with his line and his
  speed intact.

## What the World applies (`ride-probe.mts`, RUSH_HANDS + PASS_RIDE, seed 11 x 2)

In reps ending "past him", while riding:
- centre distance p25 / 50 / 75: 1.13 / 1.32 / 1.52 yd (guards), 1.18 / 1.38 / 1.55 (tackles);
- the hands joint's extension is 0.89 yd, and the centre distance is beyond it in 88% / 97% of riding ticks, so the
  joint is slack: press N is 0, and only a grip's hold acts;
- torso contact in 0% of riding ticks.

Torsos meet a compliant contact at 0.9 x (r1 + r2), about 0.55-0.6 yd, with Coulomb friction 0.35 and real moments.
That contact would slow a man running along a blocker's body (friction on the normal load) and bend him (the normal
load across his path). The support model already carries a side load on his balance and lets the blocker lean into a
load he feels. None of it acts in a ride, because the two bodies never touch.

**Why they never touch.** The hands joint is a strut of fixed length, the arm's extension measured to the chest, set
when the hands fitted in front. When the man is in front, that is right: the hands keep him off the body, and our
spacing there matches the NFL. When he is beside the blocker, the hand that is still on him is on his near shoulder,
side or back plate, with the elbow bent. Its working length is a forearm, not a locked-out arm. Our joint still
pushes him out to 0.89 yd while the blocker is close (mode 1, c < 0). That is the ride's "push through the hands",
and it keeps him off the body. Once he is beyond 0.89 yd, the joint is slack. Either way the two torsos stay apart:
the hands strut the pair open, and the blocker accelerating out of his set cannot then close a yard on a man
already at speed.

So the ride's push through the hands has no normal to push on once they are abreast. Its line runs from the blocker's
chest to the man's centre at arm's length. The hand that is actually on him sits at bent-arm length, and the normal
that could carry a force is the torso contact.

## Proposal (shared physics; not built)

**HAND_SITE (one flag).** A hands joint's working length follows where the hand is on the man.
- Fitted to his chest (the man in front, within the joint's frame), it is the arm's extension, as now.
- On his side or back (the man past along the blocker's facing by more than the torso, or the joint's line more than
  about 60° off the blocker's facing), it is the bent arm: forearm plus hand, about 0.25-0.3 yd beyond the torsos.
- The change runs at ARM_SPEED, the arm's own speed, not a step.
- The hand's push is still bounded by the press the arm can make at that elbow angle (the existing arm budget).

The pair can then close to the body. Two things then act with no new force law:
- the torso contact's normal (the blocker leaning into a load he feels; the man's balance carrying it on one side);
- friction along it (0.35 x N against their speed difference).

What a ride costs the man becomes the bodies': their masses, the blocker's lean and traction, the man's balance.

**What it does not do.** No speed cap, no ride-specific slow-down, no change to the contact law, no new ratings. If
the touching pairs still let the man run off at 4.7 yd/s, the contact law itself is the next question (does a 0.35
dry-cloth friction and a 9 Hz compliant normal carry what a leaning 140 kg body does?). That would be a separate,
measured step.

**Where else bodies side by side happen, and the controls each needs:**
- **Run blocks** (seal, reach, cut-off, drive blocks that turn the man). The same hands joint and its strut. A seal
  is hip to hip, so HAND_SITE should bring run blocks closer, not further, from football.
  - Control: fixed run set (3.59-3.60 on the current candidate), duo/toss rows (the run-block grip frame gap in GAPS
    is the same frame question), run-block movement tests.
- **Tackles in pursuit / the carrier beside a defender.** No hands joint (grasp joints and torso contact), so they are
  unchanged by construction.
  - Control: tackle and grasp tests; whiff and broken-tackle rates on the run cards.
- **Pile-ups and double teams.** Torso contacts unchanged; helper hands are hands joints, so the helper's working
  length changes the same way when the man is beside him.
  - Control: doubles probe (22% of interior reps), pile-up and push tests.
- **The pass rep with the man in front.** Unchanged by construction (chest site). Spacing in front already matches
  the NFL (0.90 against 0.89).
  - Control: the "in front" row above must not move.

**Expected, stated before any build.**
- ridden centre distance toward 0.73 (within 0.65 yd: 24% → about 35%);
- of rushers who come off a ride, the share reaching the QB from 53% toward 30%, those that miss carried wider;
- interior engaged-then-free under RUSH_HANDS + PASS_RIDE from about 9% toward 4-5%.

Not to 2.2% from this alone: the stunt class and the RUSH_HANDS seat timing are separate. If the ridden distance
closes and the reach share does not move, the contact law is the question, and the next step is a measured one,
not a fourth hands attempt.

**Tests it would come with:**
- a staged two-body scene (a man passing a blocker at the hip, with and without a lean): the speed lost and the path
  bent, against the impulse ledger's own numbers, momentum conserved;
- the working length's change bounded by ARM_SPEED (no step);
- the dither budget (the site switch has an enter and an exit margin);
- off bit-identical.

# HAND_SITE (906a6b93, off) and the ride-spot cut: the bodies do not close

Expectation (stated before the read): ridden centre distance toward 0.73; share reaching the QB after coming off a ride
53% → about 30%; interior engaged-then-free about 9% → 4-5%. RUSH_HANDS + PASS_RIDE, seeds 11 / 23 x 16, same head.
`ride-pair.py` (interior) and `interior-free-kind.py`:

| | without | HAND_SITE | HAND_SITE + ride spot at 0.8 of the bodies' width (RIDE_CONTACT_DIAG, diagnostic only) | NFL |
|---|---|---|---|---|
| ridden centre distance p50; within 0.65 yd | 0.82 / 0.81; 22 / 25% | 0.81 / 0.81; 23 / 25% | 0.82 / 0.82; 24 / 24% | 0.73; 37% |
| came off a ride, then reached the QB | 53 / 46% | 53 / 46% | 52 / 48% | 26% |
| interior engaged-then-free | 9.1 / 7.2% | 10.1 / 8.6% | 10.5 / 8.5% | 2.2% |
| native sacked | 3.9 / 4.0% | 5.4 / 3.6% | 5.1 / 3.7% | 4.6-9.4% |

**Missed at the first link: the bodies do not close.** Neither the hand's working length nor the ride's requested
spacing sets how far apart a ridden pair is.
- The probe already showed the joint slack in 88% of riding ticks. The strut was not what held them apart.
- Asking the rider for a spot inside the torso contact changes nothing measurable either.

In ridden frames our blocker is slower than the rusher (2.1 against 3.0 yd/s). The NFL ridden blocker is close to his
rusher's pace relative to ours (2.25 against 2.93). Most "ridden" frames, as the operator counts them, may not be in
PASS_RIDE's riding branch at all. The operator's "past the shoulder" (dx <= +0.2) is not PAST_ALONG_PATH.

Stopped after two attempts. Re-diagnose before anything else: in the sim's ridden frames, which branch is the blocker
in (riding, still engaged in front, released, or a different blocker's man), and what his request and achieved
velocity are. HAND_SITE stays in the tree, off. It is correct about where a hand can be, but it is not the binding
constraint. RIDE_CONTACT_DIAG (spot at 0.8 of the width, the run above) was removed after the read; it was a one-line scale on `w` in rideIntent.

## Re-diagnosis: what ride-pair's "ridden" frames are in the sim (`ridden-branch.mts`, RUSH_HANDS, engine-56, seed 11 x 2)

The same geometry as `ride-pair.py`: the rusher within 1.2 yd of the nearest OL and level with or past him toward the QB.
Here each such tick is classed by the branch the lineman is in.

| class | interior share | blocker request / achieved | rusher | centre distance (< 0.65) | tackles share |
|---|---|---|---|---|---|
| in his rep, riding (PASS_RIDE) | 6% | 6.30 / 3.15 | 4.65 | 1.11 (0%) | 5% |
| in his rep, not riding | 19% | 3.90 / 2.32 | 3.89 | 0.93 (8%) | 28% |
| a helper on him | 14% | 3.12 / 1.79 | 2.21 | 0.66 (35%) | 2% |
| the lineman engaged with another man | 33% | 2.28 / 2.26 | 2.85 | 0.71 (31%) | 30% |
| the lineman in no rep | 28% | 3.57 / 1.46 | 2.35 | 0.80 (19%) | 36% |

**Reading.** The operator's "ridden" population is mostly not a ride:
- a rusher going past a lineman who is blocking someone else, or no one;
- a helper;
- his own blocker before the ride.

The ridden-distance gap to the NFL (0.81 against 0.73) is a mixed number, and HAND_SITE and the ride-spot cut were
built on it. That was the mistake: an inferred category not checked on the plays (CLAUDE.md). Within the true ride
(about 6% of these frames), the blocker asks for 6.3 yd/s and gets 3.15, against a rusher at 4.65, at 1.1 yd: the body
cannot follow a man who leaves at that speed. The outcome-level gap still stands, because it does not depend on the
class: 53% of our rushers coming off a lineman reach the QB, against 26% in the NFL.

**Next question.** For the rushers who come free and reach the QB, which branch did they come off: the ride, their
rep before the ride, a passing lineman, a helper? At what speed and how far from the QB? That decides whether the gap
is the ride (body), the rep (hands / moves), or the line's spacing (who is blocking whom).

## At the come-off: the QB and the next blocker (`come-off.py`; NFL against ours, same code)

A come-off is a DL/LB within 1.2 yd of an OL on one frame and of none on the next (0.5 s to the throw). "From ridden"
means the last close frame was level with or past the blocker toward the QB. Ours: RUSH_HANDS + PASS_RIDE, seeds 11 / 23
x 16 (engine-55 merge).

Pooled over outcomes (not split by whether he reached the QB, so not circular):

| come-offs from ridden | NFL | ours (11 / 23) |
|---|---|---|
| interior: QB displacement toward the rusher in the 0.5 s after | -0.75 yd | -0.20 / -0.16 |
| interior: growth of rusher-spot-to-QB distance over 0.4 s | +0.82 | +0.27 / +0.22 |
| tackle: QB displacement toward the rusher in the 0.5 s after | -0.74 | -0.12 / -0.11 |
| tackle: growth over 0.4 s | +0.81 | +0.36 / +0.26 |
| interior come-off time p50 | 3.0 s | 2.1-2.2 s |
| interior: QB "up" over the 1.0 s before (+ toward the line) | -0.5 to -1.0 | -1.6 to -1.7 (still in his drop) |
| interior: nearest other blocker at the come-off | 1.9-2.0 yd | 1.6-1.75 |
| interior: another blocker within 1.2 yd in 0.4 s | 15-16% | 20-36% |
| come-offs from any state, /100 dropbacks (interior / tackle) | 95 / 74 | 125-128 / 103-115 |

**Reading.**
- **Help is not the gap.** Our next blocker is nearer and gets to the rusher more often than the NFL's.
- **The QB is.** When a rusher comes off a ride, the NFL QB moves about 0.75 yd away from him in the next half
  second. Ours moves 0.1-0.2. So the NFL rusher's spot falls 0.8 yd behind the QB in 0.4 s; ours falls 0.2-0.3 behind.
  "The ride carries him off the QB's line" is, in large part, the QB leaving the line. That belongs to Rules+Coaching
  (POCKET_CLIMB / QB_FEEL are off in the stack).
- **The timing differs too.** Our come-offs happen during the QB's drop (2.1-2.2 s, the QB still going back 1.6 yd a
  second), against 3.0 s in the NFL, when he has set and can move. Rushers come off linemen about a third more often
  than in the NFL. The rep itself still ends early and often; that part is ours (trenches).

## The come-off checked by frame, and corrected (`come-off.py` with hysteresis)

Checked on 12 traced come-offs per side (`COME_OFF_TRACE=<seed>` prints the rusher-to-lineman distance from 1.2 s
before to 0.3 s after). Two defects, the same lesson as "ridden":
- **Chatter at 1.2 yd.** NFL rushers hovering at 1.0-1.2 yd for a second counted as come-offs each time they ticked
  over 1.2 (2022101604-3437).
- **Contact time reset.** It reset when a neighbouring lineman was briefly nearer (2022091802-817: within 1.2 yd for
  12 frames, logged as 0.1 s).

Fixed:
- a come-off is now attached at <= 1.2 yd, then beyond 1.5 yd of every lineman;
- contact time is the continuous time within 1.5 yd of the lineman he comes off.

After the fix the traces are genuine separations (distance rising through 1.5 yd), and the "brief" passing class
nearly vanishes on both sides (NFL 3.8 / 1.3, ours 6.2 / 1.1 per 100 dropbacks).

Come-offs from his own blocker (continuous contact >= 0.5 s). NFL against ours (RUSH_HANDS + PASS_RIDE, seeds 11 / 23 x 16):

| | NFL | ours |
|---|---|---|
| interior: per 100 dropbacks | 48.6 | 69.9 / 65.5 |
| interior: time p25/50/75 | 2.3 / 3.2 / 4.1 s | 1.7 / 2.1 / 2.6-2.7 s |
| interior: contact before it p50 | 1.7 s | 1.2 / 1.1 s |
| interior: then reached the QB | 17% | 21 / 17% |
| tackle: per 100 dropbacks | 41.1 | 85.8 / 76.0 |
| tackle: time p50 | 3.1 s | 2.0 / 2.0 s |
| tackle: contact p50 | 1.6 s | 0.8 / 0.8 s |
| tackle: then reached the QB | 20% | 14 / 13% |
| QB toward the rusher, 0.5 s after (interior / tackle, all come-offs) | -0.73 / -0.74 yd | -0.14 to -0.18 / -0.06 to -0.07 |

**Corrections to the reads above.**
- "53% of ours reach the QB after coming off a ride, against 26%" came from the chattering operator. Counted cleanly, a
  come-off from his own blocker reaches the QB about as often as the NFL's: 17-21% interior against 17%, tackles
  13-14% against 20%.
- The QB row holds, and is larger with the fix (NFL -0.73 to -0.99 yd, ours -0.06 to -0.18).

**The rep's gap:**
- our reps end about 1.1 s earlier (2.0-2.1 s against 3.1-3.2 s), after shorter contact (interior 1.1-1.2 s against
  1.7 s, tackles 0.8 s against 1.6 s);
- they end more often: 1.4x interior, 2x tackles.

Next (trenches): what ends our reps at 2 s. Use the sim's own record of each come-off: the shed note, the move, the
hands' state and PAST.

## What ends our pass reps (`rep-end.mts`, engine-56 default, seed 11 x 3)

Each pass rep with an OL primary that ends before the throw, attributed to the call that ended it. `sim.disengage` is
wrapped to record its caller. A beat's shed note is used where one was recorded.

| ended by | interior /100 dropbacks | tackles /100 |
|---|---|---|
| **blocker down (falling)** (`updateEngagements`: a body down) | **12.7** at 2.55 s | **13.8** at 2.80 s |
| rusher down | 2.9 | 2.5 |
| both down | 0.7 | — |
| "past him" (PAST, the ride lost) | 3.6 | 6.2 |
| re-assignment (`assign.ts`), separation | 1.4, 1.1 | 1.1, 0.4 |
| all before the throw | 22.5 (p50 2.50 s) | 24.3 (p50 2.65 s) |

In the reps that end with the blocker falling, over their last 0.3 s:
- the blocker goes away from the rusher at 1.50 yd/s (interior) and 1.51 (tackles), while asking for 0.09 and -0.89
  (to hold or close);
- the rusher follows at 0.9;
- the hands press at about 460-490 N;
- the move is a bull or a long-arm in about half, and finesse in the rest.

The commonest way our pass rep ends is the blocker being driven back faster than he asks and falling. It is not a
beat, a move or the ride. That fits the come-off rows above: earlier and more often than the NFL, after shorter
contact. Its NFL rate is not in the tracking (no body state). Before any change, the next step is a check on film of
how often an NFL pass protector goes down, and on our side a staged rep (a bull rush against an anchor) that shows
the support and capture-point path to the fall.

## OPEN_HANDS on the fresh run set (Integration's ask; `ref:report --set fresh --placebo 4 --flag OPEN_HANDS=0`)

The candidate is OPEN_HANDS **off**, against the stack with it on. Plays changed: 79% (placebos 78-95%).

| family | candidate (off - on) | placebo mean ± RMS |
|---|---|---|
| all | **+0.27 (SE 0.07)** | -0.03 ± 0.07 |
| OZ | +0.30 (0.15) | -0.17 ± 0.19 |
| gap | +0.34 (0.13) | -0.14 ± 0.16 |
| duo | +0.32 (0.23) | +0.19 ± 0.23 |
| IZ | +0.13 (0.16) | +0.21 ± 0.26 |
| draw / toss | +0.22 / +0.05 | +0.37 / -0.59 (wide) |

OPEN_HANDS' run cost is real on the fresh set, about 0.27-0.30 a run beyond divergence, carried by gap and OZ. It is
not the biased set's selection. With it off, engaged-grab tackle breaks are 0.063 a run, against 0.039 on. This is
the GAPS run-block grip frame row: seals and reach blocks lose the man across their face.

# Protector falls (Integration, 2026-11-13): diagnosis

## 1. An NFL rate, as a bound (`fall-proxy.py`; same code on both, scored against the sim's own fall events)

The proxy: an OL whose speed stays below a threshold for a hold time, starting before the throw (it may run past it),
having had a DL/LB within 1.2 yd in the 0.5 s before. Variants require his man to have left, or him to have been moving
(>= 1.0 yd/s) just before. On the sim, a fall's speed falls to 0 within about 0.7 s and stays there.

| variant | ours: proxy /100 dropbacks, recall, precision (engine-56, seed 11 x 16; true falls 30.5 /100) | NFL proxy /100 |
|---|---|---|
| < 0.5 for 1.0 s, man left | 7.7; 18%; 71% | 0.8 |
| < 0.5 for 1.0 s | 13.9; 28%; 61% | 3.4 |
| < 0.5 for 1.0 s, was moving | 11.2; 24%; 66% | 1.8 |
| < 0.3 for 1.0 s, was moving | 7.9; 18%; 69% | 0.3 |
| < 0.5 for 0.8 s, was moving | 12.8; 26%; 63% | 3.4 |

Recall is low because many falls come just before the play ends. The proxy fires 4-26x as often on ours as on the NFL.
Corrected by our precision and recall, the NFL is about 1-5 linemen falls per 100 dropbacks (all five). That is an
upper bound: NFL plays run longer after a fall, so its recall is higher. Ours is 30.5 (RUSH_HANDS + PASS_RIDE: 32).
The size is settled: about 6-25x.

## 2. The fall, traced (`fall-trace.mts`, engine-56 default, seed 11 x 3: 37 interior, 43 tackle falls before the throw)

Medians over the 1.0 s before the fall. Directions are taken along the press he feels (+ = the way he is pushed).

| | 1.0 s | 0.6 s | 0.3 s | 0.1 s | the fall tick |
|---|---|---|---|---|---|
| interior: press felt | 1265 | 1360 | 1628 | 1454 | **472** |
| interior: his lean against it | 815 | 997 | 1307 | **1504** | 477 |
| interior: capture point along the press (x base radius) | +0.02 | -0.00 | -0.01 | -0.03 | **-3.68** |
| interior: velocity along the press / asked | 1.02 / 0.08 | 1.26 / 0.00 | 1.60 / 0.29 | 1.71 / 0.18 | |
| tackles: press / lean | 1153 / 465 | 1199 / 781 | 1418 / 1121 | 1385 / 1335 | 497 / 470 |
| tackles: capture point | +0.02 | -0.04 | -0.26 | -0.53 | -3.86 |

- Press direction: about 165° off his facing (in front of him). Posture 0.54. Cause: 'contact' in every case.
- Fall direction: **forward, onto the man, 33 of 37 interior and 36 of 43 tackles**; backward 0 and 2; the rest
  sideways.
- Rusher's move at the fall: interior bull 10, swim 10, club 6, long-arm 5, snatch 2; tackles club 9, rip 9, bull 7,
  swim 7, spin 7.

**Reading: none of (a), (b) or (c). He is propped on the man.**
- He is driven back at 1.0-1.7 yd/s against a request of about 0, as the rep-end probe showed. His lean into the man
  grows to the press, about 1500 kg·yd/s² by 0.1 s before. For a 140 kg lineman that is about one body weight of
  horizontal ground force, the posture of a man leaning on a wall.
- His capture point stays centred (|xi| < 0.05 of his base) only because the press props him.
- When the rusher's move takes the load away (a swim, club, rip, snatch, a bull's pull, a spin), the press falls by
  two-thirds in one tick while the lean is still about 1500. His capture point jumps 3.7 base radii toward the man,
  and he falls forward.
- He is not toppled backward about a planted base (b), and his feet are not failing to follow a retreat (a: xi is
  ~0 until the unload). The press is not unmet (c): it is met, with all his weight, and that is the problem when it
  goes.

**What football says.** A protector who leans on the man falls when the man pulls or swims. That is real, and it is
what those moves exploit. It is also exactly what pass-protection technique coaches against: weight over the feet, a
wide base, sit in it, punch and re-fit, never lean. The NFL's 1-5 falls per 100 dropbacks says real protectors
rarely end up propped.

**Questions for the mechanism, before any proposal:**
1. Why does the lean grow to the full press? The lean's target follows the felt load, so a sustained press is met
   with an equal lean. A coached protector meets it with his base (stagger, sink, friction under a lower centre of
   mass) and gives ground, rather than with a lean that is propped on the man.
2. Why does the lean not leave with the press? `unsupportedLean` releases only past 1.25x the felt press, and the
   felt press is filtered over ~40 ms. A one-tick unload of 1000 leaves the lean in place for long enough to
   topple him.

The second is World behaviour (support), the first is how much of himself he commits (the controller's lean request
and the World's growth). Previous attempts in this area (TACKLE_BRAKE, TACKLE_RESET, PASS_SINK) all acted on the
retreat and the base, not on the commitment, which is why none of them changed the fall.
