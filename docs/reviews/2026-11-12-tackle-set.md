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
