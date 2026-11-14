# ROUTE_FILLET: lead a route corner (2026-11-14, experimental, off)

Why: `docs/reviews/2026-11-14-route-speed.md` (PR #750). The follower point-turned at each vertex (a bend cap with an implicit 1.3 yd
corner, `sqrt(lateral * cutSkill * 1.3 / (1 - cosT))`), so a rolled bend was slow and the body then swung 1.5-2.2 yd outside the next
declared leg; NFL receivers lead the turn and pass inside the vertex (cut 0.5-0.8 yd, radius 6-10 yd on a rolled bend).

## The law (`steerRoute`, `route-motion.ts`)

The declared through speed `s` still says what the route asks (a speed cut s .4, a rolled bend s .85-.9). The corner is a fillet:
- usable lateral acceleration `aLat = lateral * cutSkill`; the radius at the declared through speed is `v^2 / aLat`;
- he starts the turn `T = R tan(theta / 2)` before the vertex, never more than 0.6 of a leg shared with a neighbouring corner (the
  leg he leaves the line on is his alone); if the legs leave no room, the speed through it is `sqrt(aLat * R)` on the radius that fits;
- once begun the turn is carried to its exit point on the next leg (a goal that persists, cleared if something else moves his place on the
  route); a turn under 12 deg, or onto a leg under 1 yd, is followed straight;
- cut skill acts only through `aLat`; the regime comes from the declared `s` and the angle, with no new threshold.
The receiver keeps the turn (`RouteRunner.turn`); the QB's forecast runs the same law (`receiver-forecast.ts`). Off, nothing changes.
Test: `test/route-fillet.test.ts` (lone body: inside the vertex, less outside carry, no corner = same path, a plant stays a plant).

## Witnesses (sim bench from `scripts/diag/route-speed/` on PR #750; no defenders unless stated; WR body for speed rows)

Speed by time, cross (WR body, no defenders), 1.5 / 2.0 / 2.5 / 3.0 / 3.5 s: off 6.00 / 5.47 / 6.30 / 7.29 / 7.83, on 5.77 / 6.66 / 7.50 / 7.94 /
8.20, NFL WR crosser 6.43 / 7.29 / 7.76 / 8.01 / 8.19. With cover 3 the 3.5 s value falls to 6.0 on (a contact with an underneath
defender at about 3.3 s, seeds 2-6, not the follower; no-defender arm is clean). GO is bit-identical (n 96).

| class (matched angle) | NFL v_in / v_min / v_out, radius, arc, cut | sim off | sim on |
|---|---|---|---|
| IN/OUT 75-90 deg, depth >= 8 | 5.6 / 3.9 / 4.9, 3.0, 2.9, .72 | 5.2 / 3.8 / 6.7, 3.2, 3.1, .73 | 4.9 / 3.2 / 6.1, 2.5, 2.1, .56 |
| cross (first break 35-60) | depth 4-12: 6.1 / 6.3 / 7.3, 9.9, 5.5, .54 | 5.1 / 4.9 / 6.3, 6.5, 4.3, .53 | 4.7 / 5.0 / 6.3, 7.2, 3.8, .48 |
| slant 35-75, depth 4-12 | 5.0 / 4.8 / 5.4, 6.0, 3.7, .51 | 4.4 / 5.0 / 7.2, 5.6, 5.1, .72 | 2.7 / 3.6 / 6.5, 5.6, 3.9, .44 |
| corner | 6.5 / 6.4 / 6.7, 9.4, 5.3, .58 | 7.3 / 7.1 / 8.9, 12.1, 7.1, .64 | 7.1 / 5.9 / 7.5, 9.8, 3.8, .38 |

Outside carry past the corner (`sim_corner_past.py`, yd outside the next leg within 1 s): cross 1.8 to 0.1, shallow 1.6 to 0.3, shallow_high 1.9 to
0.3, slant 0.8 to 0.1, post 1.3 to 0.2, corner 1.9 to 0.5, dig 0.8 to 0.2, short_in 1.8 to 0.2, out 1.5 to 1.0.

Rules' rows (`rules/mesh-time` 8441cdf3 with CROSS_FLAT and MESH_TIME on; `scripts/diag/route-speed/depth_by_time.ts`), depth / across at 1.5 / 2.0 / 2.5 / 3.0 s:
shallow (drag, declared 2.5): off 2.7 / 3.3 / 3.2 deep (NFL 2.2 / 2.9 / 3.1), on 2.4 / 2.7 / 2.7; across 4.4 / 7.7 / 11.3 vs 4.6 / 7.7 / 11.2 (NFL 5.1 / 11.3 at
2.0 / 3.0). shallow_high 4.2 / 5.7 / 6.3 off, 3.8 / 4.9 / 5.3 on. mesh_under (declared 4.0) 3.0 / 4.2 / 4.7 off, 2.7 / 3.7 / 4.0 on. The depth now meets
its declaration instead of overshooting it by 0.6-1 yd.

## Where it falls short (two attempts; attempt 2 only let the first leg use its whole length, which moved the shallow and cross a little)

- The plant is deeper than NFL: v_min 3.2 against 3.9 at matched angles (the old law was 3.8). The through speed `s` is now strict
  (the old law carried 0.3-0.7 yd/s more than `s` at the vertex), and a turn costs speed in the body. `s` .4 on dig/out would need to be about .48 for NFL's v_min.
  That is the route table's constant, not a second law; the same applies to corner (s .65: v_min 5.9 against NFL 6.4).
- Slants and short routes with a corner in the first 2-3 yd start the turn from low speed: slant v_min 3.6 against NFL 4.8 (off 5.0).
- The read compiler samples the follower, so first-read ready times move; see the table in the PR.

## Control: first-read ready time, off against on (`ready_times.ts`, `ready_diff.py`; 865 route windows, 33 concepts x 5 formation families, attempt 2)

Moved by more than 0.1 s (mean over the windows that moved, largest in brackets), seconds:
- later: slant_flat +0.29 (+0.45), double_slants +0.19 (+0.50), seam_slant +0.23 (+1.20), fade_flat +0.24 (+1.40), flood +0.25 (+0.35), drive +0.20 (+0.35);
- earlier: pa_flood -0.09 (+0.60 on one), y_cross -0.21 (-0.30), sail_corner -0.19 (-0.30), corner_flat -0.19 (-0.30), smash -0.18 (-0.30), trips_outs -0.29 (-1.75), post_cross -0.10 (-0.40), bubble_screen -0.13 (-0.20), verts_hitch -0.13 (-0.20), seam_hitch -0.12 (-0.20), hitch_out -0.11 (-0.20);
- mean 0.10 on a 10 Hz grid (one step; hitches, quick_outs, trips_stick, levels): hitches -0.10, quick_outs -0.10, trips_stick -0.10, levels -0.10, hitch_post -0.07.
Mesh moves by +0.08 on average with one window +0.90. The read compiler times a route from the follower's sampled geometry (heading change
and depth thresholds), so a corner that is led reads as breaking earlier (rolled crossers, corners, outs) and a slant, whose turn now starts from the
stance, as later. Decision for Integration: whether the compiler's timing should be re-read with this on (as it was for CROSS_OVER).
