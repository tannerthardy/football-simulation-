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
