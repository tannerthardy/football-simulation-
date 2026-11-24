# Receiver alignment at the snap: NFL against ours (2026-11-24)

Rules + Coaching, for Integration. This follows from the go route: our wide receivers seemed to set wider of the
sideline than the NFL's. Measured first; nothing is built.

**Runs:**
- Operator: `scripts/diag/routes/alignment_chart.py`, identical code both sides.
- NFL: `nfl_routes.py`, BDB 2025 weeks 1-9, 9,674 dropbacks, 21,609 receivers not in motion.
- Ours: the chart's 24 games (engine-92 `7b36c6e55`, `npm run ref`), 4,867 receivers.
- Frame 0 = the snap; ball = the center's y; hashes 23.58 / 29.75 yd from the sideline.

Tables: `docs/reviews/data/2026-11-24-alignment/alignment-tables.md`.

**Where ours come from:** `src/playbook/alignment.ts`.
- Not fixed per formation, and not blind to the hash. `wideOffset` places the #1 by his room to his own sideline,
  measured from the ball's spot, from `ROUTE_ROOM`. That is a table of tracked 2022 medians by his route, with two
  columns: alone on his side, and with others (WR_ALIGN, on).
- Slots stand at a share of the #1's split: 0.58 for #2, 0.62 in trips, 0.40 for #3.
- The only variation is a team habit, `wrRoom` (sd 0.8 yd, per team). Depths are two values: 0.7 yd on the line, 1.2
  off it.

## What the data say

1. **The route rule is right, and the NFL's medians follow the taught split rule.** The rule:
   - a plus split outside the top of the numbers (about 9 yd from the sideline) for a vertical or an in-breaker;
   - a reduced or nasty split inside the numbers for a route that breaks out or across;
   - "normal" for a displaced #1 is halfway between the top of the numbers and the hash.

   Sources: Bleacher Report NFL 101, the route tree; a pattern-reading guide (Scribd, unattributed) (M).

   NFL #1 room to his sideline (median), with others on his side / alone:

   | route | NFL with others | NFL alone | ours with others | ours alone |
   |---|---|---|---|---|
   | go | 9.8 | 10.6 | 10.1 | **12.1** |
   | slant | 9.6 | 10.3 | 10.0 | **11.4** |
   | hitch | 10.0 | 14.1 | 10.7 | 14.1 |
   | in | 10.0 | 14.6 | **11.6** | **15.6** |
   | post | 10.8 | 14.2 | **12.4** | **15.6** |
   | out | 15.5 | 14.8 | 15.9 | 15.6 |
   | corner | 15.1 | 15.3 | 15.6 | 15.6 |
   | cross | 17.1 | 16.0 | - | 15.6 |

   - The pattern is ours too: the reduced split for outs, corners and crossers, and the plus split for verticals and
     slants with others on the side.
   - The residual is 1-1.5 yd of extra room for a #1 alone on go / slant / post / in, and for a #1 with others on in /
     post. It is not the 4 yd the go table suggested. That table's bins hid a wide NFL distribution: p25 9.0, p75 11.7
     on the go alone.
2. **Field against boundary:**
   - NFL: the boundary #1 keeps more room than the field #1 (median 11.5-11.8 against 10.4-10.8 yd). Into the boundary
     he has less field, and he takes a reduced split for room to break.
   - Ours: the same on both sides (11.6-11.9).
   - One staff's rule puts the boundary receiver at the bottom of the numbers; the NFL median does not.
3. **Our splits do not vary.** NFL #1 with two detached on his side: room p25 / p75 9.2 / 14.9. Ours 10.3 / 11.8. The
   NFL's spread is the route mix plus the receiver and the call; ours is the route table and two team habits.
4. **Depth is two numbers.** Ours 0.7 / 1.2; the NFL is continuous (0.3-1.4 p25-p75; slot #2 p50 0.9 against our 1.2).
5. **Alone #1 (1x1, 12 and 21 personnel):**
   - ours are wider from the ball: 12.6 against 10.4 yd;
   - the gap to the next man inside is 9.5 against 6.6 yd.

   Part of this is the ball's spot: 28% of our snaps with a #1 come from the middle of the field against the NFL's 11%.
   That is the game's ball spotting, not alignment.
6. **TE attached 63% (ours) against 32% (NFL).** The NFL's tight ends are mostly flexed: in the slot, as a wing or
   detached. In our library 18 of 31 TE-type slots across 24 formations are inline or wing. This is formation and
   call mix, the biggest single gap here.
7. **Shapes:**

   | detached receivers | NFL | ours |
   |---|---|---|
   | on a bunch side | 4% | 8% |
   | in a stack | 3% | 0% |
   | WR nasty (within 4 yd of the edge) | 2% | 5% |

   Ours has no stacked formation.
8. **Backs:**
   - Offset gun backs match (2.3 yd wide, 4.9-5.0 deep).
   - Single backs behind an under-center or pistol QB are deeper (7.3-7.5 against 6.7 yd) and always exactly behind
     the ball (width 0.0 against 0.2-2.1).

## Proposed builds, by consequence (none built)

1. **TE alignment mix:** flexed tight ends, as slot, wing and detached, in the formations the calls use most. The
   share follows the play-caller and the formation library, not a split rule. It changes every defense's run fit and
   coverage count, so it needs the formation owner's call. Measure first by formation, per call.
2. **ROUTE_ROOM re-derived on this operator** (BDB 2025, the same frame and definitions), with a third axis:
   field / boundary. A table read, not a tuned constant: the NFL's own medians by route × alone / others × field /
   boundary. Behind a flag in `wideOffset`. Expected: a #1 alone on a vertical about 1.5 yd nearer the sideline; the
   boundary #1 about 1 yd more room.
3. **Variation:** the receiver's own habit as well as the team's (a per-player draw, like the team's `wrRoom`), and
   the depth off the line drawn per player around the NFL's 0.9 yd instead of 0.7 / 1.2. The NFL's spread inside a
   route class is about ±2 yd. Not sourced as coaching (L); it is what players do.
4. **Stack and backfield:** a stack formation (3% of NFL detached receivers), and the single back's width and depth
   under center (6.7 yd, offset up to 2 yd). Formation owner.

For the route items: our wide receivers are not 4 yd too tight, so GO_STEM's 5 yd room rule stands as built. The
flat's width (item b) does not come from alignment: the #2 and #3 match (room 17.6-21.9 against 17.6-21.9 NFL).

## Built: ALIGN_SIDE as a landmark rule, and RCV_HABIT (2026-11-24, both off)

Integration's objection to the first form was right: a table of the NFL's medians reproduces them by construction and
cannot generalize. ALIGN_SIDE now codes the rule the cells follow, in landmarks a receiver uses. All distances are
room to his own sideline:
- the top of the numbers, 9 yd;
- the hash, 23.58 yd;
- normal: halfway between them, 16.3 yd;
- reduced: halfway between normal and the hash, 19.9 yd. From positions; no source.

**The rule:**
- A vertical or a slant (go, fade, slant) takes the plus split, at the top of the numbers.
- An in-breaker (hitch, curl, stick, hook, short in, dig, post) takes the plus split with others on his side and the
  normal split alone.
- A route that breaks out or across (quick out, out, deep out, corner, crossers) takes the normal split.
- To the field, a lone #1 moves one landmark toward the ball (plus -> normal -> reduced).

Sources: Bleacher Report NFL 101 (plus split); a pattern-reading guide (normal, halfway between the numbers and the
hash; M); a staff's rules (the field split depends on the QB's arm; M).

**Cells: rule against the NFL's medians** (room yd, ball on a hash; a miss is over 1 yd):

| route | alone boundary | alone field | others boundary | others field |
|---|---|---|---|---|
| go | 9.0 / 10.3 **-1.3** | 16.3 / 16.5 | 9.0 / 9.0 | 9.0 / 10.0 |
| slant | 9.0 / 10.2 **-1.2** | 16.3 / (thin) | 9.0 / 9.1 | 9.0 / 9.8 |
| hitch | 16.3 / 13.8 **+2.5** | 19.9 / 18.0 **+1.9** | 9.0 / 9.3 | 9.0 / 10.1 **-1.1** |
| in | 16.3 / 14.5 **+1.8** | 19.9 / 18.3 **+1.6** | 9.0 / 9.5 | 9.0 / 10.1 **-1.1** |
| post | 16.3 / 13.9 **+2.4** | 19.9 / 17.9 **+2.0** | 9.0 / 10.5 **-1.5** | 9.0 / 10.8 **-1.8** |
| out | 16.3 / 14.5 **+1.8** | 19.9 / 19.1 | 16.3 / 13.0 **+3.3** | 16.3 / 16.9 |
| corner | 16.3 / 14.6 **+1.7** | 19.9 / 20.2 | 16.3 / 14.1 **+2.2** | 16.3 / 16.4 |
| cross | 16.3 / 15.4 | 19.9 / 20.3 | 16.3 / 14.7 **+1.6** | 16.3 / 18.9 **-2.6** |

13 of 31 cells are within 1 yd. The misses are information:
1. **A lone #1 to the boundary on any non-vertical** sets about 14 yd off the sideline, 2 yd short of normal.
   - In split from the ball he is 9-10 yd out on either side, which may be the real rule for a lone #1: a split from
     the ball or tackle, not a landmark.
   - A lone go is 13.3 yd from the ball on both sides.
2. **With others,** posts and field-side in-breakers sit about a yard wider than the top of the numbers (10-11).
3. **Boundary outs and corners with others** are about 2-3 yd less reduced than normal (13-14). The boundary's
   short field makes the reduced split smaller.

The sim reproduces the rule as coded (24 games): lone go 9.0 / 16.2, lone in-breakers 15.6 / 20.0, outs 15.6 / 20.3.
With others ours sit at 10.0 against the rule's 9.0: the team habit or the 8 yd minimum split from the ball.

**RCV_HABIT** (stated choices, unchanged):
- #1 of 2 room p25-p75: 10.5-11.8 -> 9.7-12.0 (NFL 9.2-14.9);
- detached depth p10-p90: 0.74-1.2 -> 0.55-1.39 (NFL -0.07-1.77).
