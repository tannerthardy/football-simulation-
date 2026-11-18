# ZONE_LADDER: what the single underneath decision showed (2026-11-18)

Branch `coverage/C14-zone-ladder`; flag `ZONE_LADDER`, off. This is a record, not a landing. The user called it a big
test with no commitment: build the underneath zone defender fresh as one behavior from the coached ladder, and compare
it with the old modes.

## What it was

With the flag on, `UnderneathLadder` replaced ZoneCoverage / CoverageDefender for flat, curl-flat, hook, hole and
robber seats. It used three rungs:

1. **Drop and slide.** He drops to the landmark with his eyes on the QB, slides with the QB's look (weighted by how
   long the look has held), and stops on the QB's set.
2. **Relate to the threat.** He plays the nearest threat in his area, ranking arriving or sitting receivers ahead of
   leaving ones, and carries a vertical to depth, then passes it.
3. **Break on the throw.** This is the existing `playBall`.

Coverage rules entered only as landmark, area and carry depth.

## What it showed (staged set and 8 games, NFL in brackets)

| | old | v1 | v2 | v3 | NFL |
|---|---|---|---|---|---|
| completion | 70.6% | 76.0% | 71.2% | 63.7% | |
| PBU plays | 64 | 42 | 64 | 92 | |
| zone YAC, C2 / C6 | 5.65 / 3.74 | 4.22 / 5.65 | 8.36 / 7.02 | 7.66 / 7.59 | |
| closing at the release | −0.13 | 0.00 | +0.01 | 0.00 | +0.52 |
| lateral toward the throw at the release | 0.40 | 0.48 | 0.27 | 0.45 | 1.57 |
| in front of the receiver | 47% | 34% | 76% | 71% | 57% |

The rung-2 spot differed by version:

- **v1:** held his set depth over short routes.
- **v2:** one yard in front of every short route.
- **v3:** the old zone lane's geometry (0.82 of the way from the QB, tight to the receiver).

## What it refuted

The hypothesis was that the old modes (settle and stem-read / flat-hold holds, ZONE_HOLD's lean, the pick)
were what kept the lateral slide toward the throw at a fifth of the NFL's. Removing them all did not move the slide in
any version (0.40 → 0.27–0.48 vs 1.57).

A later confound check put the real gap in specific cells (pocket, no play action):

- **Sitting targets:** 0.13 vs 0.75.
- **Crossing or breaking targets:** 0.67 vs 2.60.

That is the zone man's relation to a moving or settling receiver in his area, not the holds.

## Pieces worth porting singly

- **Crossers (v2).** Completion 82.3% → 67.3%, YAC p50 5.1 → 3.7. The piece is rung 2 relating to the crosser in
  his band with the receiver's lateral velocity fed forward, and no CUT_WALL / crossWall "wall and pass" taking him
  off it. He ran with the crosser through his area, then passed it at the band edge (1.5 yd outside), instead of
  walling its line. v2's in-front depth constant was what spoiled the rest; the crosser gain came from the relation, not
  the depth.
- **Breakups (v3).** PBU 64 → 92, completion −7 points. The piece is the zone lane's own spot (0.82 of the way, tight
  to the receiver) with nothing pre-empting it: no settle, stem-read or flat-hold holding him off the lane.
  Its cost is YAC (he is on the lane, the ball beats him by a hair, and he is moving wrong for the tackle).
- **Cover 2 flat corner (Rules' rule).** Sink with #1 until the flat is threatened in front of him. This landed
  separately as FLAT_SINK (engine-85).
- **SETTLE_DEPTH off.** Measured with FLAT_SINK and not landed: the dig window (Defense's control) went 62.6% / 9.55 ->
  65.2% / 10.94 yd/att. It stays on.

## What the old modes did that the ladder does not

- **Match conversions.** The old modes have match-after-declare man conversions, trap, rob, wall and crossWall, and the
  quarters / C2 apex rules. Trap was the only technique at NFL slide size (3.4 yd/s at the release). The C4 / C6 YAC
  losses spread over the old zone, man, wall and crossWall jobs.
- **Tightness without the YAC cost.** The old lane's tightness came with tackling position that no ladder version
  matched.
