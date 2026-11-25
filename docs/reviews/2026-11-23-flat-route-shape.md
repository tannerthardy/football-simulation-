# Flat-route shape, NFL vs ours (develop 0226f0d3)

Tools/Physics, 2026-11-23, for Integration and Rules (the user: "do our flat routes even align with typical flat routes? ours seem to get more up the field as they're running the route"). `scripts/diag/census/route_shape.py`; NFL: BDB 2025 weeks 1-9 (9,657 dropbacks, positions to the release, with the PFF route label); ours: 24 default games (2,128 dropbacks, positions through the end of the play, route ids and drawn waypoints from the tap). A flat-route runner = a route runner with 6+ yd of lateral displacement and under 5 yd of depth at 2.0 s (targeted or not).

## In short

- **In the first 2 s ours do not climb more than the NFL's; after 2 s they do.** Depth past the line at 2.0 s, ours minus NFL (median): back -0.6 yd, slot 0.0, TE +0.6. At 3.0 s: back 0.0, slot +0.8, TE +1.6. Angle of the path to the line over 1-2 s: back -9 degrees, slot +1, TE 0 (ours back 6 degrees against the NFL's 15; slot 21 against 20; TE 20 against 20).
- **The drawn route bends upfield after the first leg.** `back_flat` is drawn (lateral, depth from his start): (4.0, 0.3), (7.0, 1.0), (10.0, 3.0), (16.4, 7.2): about 8 degrees to the line for the first 7 yd of lateral and about 33 degrees after. `flat` is drawn (10.0, 3.5), (13.5, 5.3), (14.4, 10.2): 19 degrees for 10 yd, then 27, then about 80 degrees (nearly straight upfield). What they run: back_flat (5.5, 0.7) at 2.0 s and (10.2, 1.9) at 3.0 s, flat (4.4, 2.4) and (9.9, 4.4). The NFL back FLAT stays near 15 degrees (depth -5.0 at the snap, -4.1 at 2.0 s, -3.6 at 3.0 s).
- **Ours run the flat about 20% slower, so the ball arrives later and higher.** Speed over 0.5-2.0 s: back 5.1 NFL, 4.0 ours; slot 5.6 vs 4.3; TE 4.9 vs 4.4. Lateral covered by 2.0 s: back 7.5 vs 6.3, slot 8.2 vs 6.2, TE 7.2 vs 6.5. The release comes at 2.7 s (NFL) against 2.9 (ours), and a caught flat target is caught at a median depth of 0.7 yd (p25-p75 -2.1 to 3.1) in the NFL (n 822) against 2.5 yd (0.3 to 6.0) in ours (n 30), with the flight time 1.1 vs 1.2 s.
- **So: the flat's first leg is shallower than the NFL's or the same, the last leg climbs, and the slower pace puts the catch on the climbing part.** Rules owns the route definitions: the `back_flat` and `flat` last waypoints are what turn the route upfield; the quick_out, out, back_out and swing routes do not meet the flat geometry (they reach 6+ yd lateral only after 2.0 s). Our sample of flat-geometry runners is 264 (back 215, TE 20, slot 29, wide 0) because ours seldom run flats from wide; the NFL's is 3,722.
- Caveats: positions only at 10 Hz both sides; the NFL record ends at the release (median 2.7 s), so depth at 3.0 s uses the plays that last that long; NFL route labels (FLAT, SCREEN, WHEEL, ANGLE, CROSS) are PFF's, ours are the engine's route ids; the geometric class mixes labels on the NFL side (CROSS, GO and HITCH runners also satisfy it).

## Flat routes: the shape of the route as run, NFL vs ours

Flat-route runners (6+ yd lateral and under 5 yd deep at 2.0 s): NFL 3722, ours 264. Medians; depth in yd past the line; lateral and angle as defined in the script header.

### By receiver type

| group | n | depth 0 s | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | lateral by 2.0 s | by 3.0 s | speed 0.5-2.0 s | angle to the line 0-2 s / 1-2 s | targeted | release (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NFL back | 1777 | -5.0 | -4.9 | -4.6 | -4.2 | -3.7 | -3.6 | -2.8 | 7.5 | 13.2 | 5.1 | 15 / 15 | 0.18 | 2.7 |
| ours back | 215 | -5.0 | -4.9 | -4.7 | -4.5 | -4.3 | -3.8 | -2.8 | 6.3 | 11.2 | 4.0 | 7 / 6 | 0.12 | 2.9 |
| NFL TE | 677 | -1.8 | -1.7 | -1.2 | -0.2 | 1.0 | 1.8 | 2.1 | 7.2 | 12.7 | 4.9 | 20 / 20 | 0.20 | 2.7 |
| ours TE | 20 | -1.1 | -0.9 | -0.2 | 0.6 | 1.6 | 2.6 | 3.7 | 6.5 | 12.4 | 4.4 | 23 / 20 | 0.50 | 2.9 |
| NFL slot | 1212 | -2.2 | -2.1 | -1.6 | 0.0 | 1.5 | 2.3 | 2.9 | 8.2 | 15.2 | 5.6 | 20 / 20 | 0.22 | 2.8 |
| ours slot | 29 | -1.2 | -1.1 | -0.5 | 0.4 | 1.4 | 2.5 | 3.7 | 6.2 | 11.8 | 4.3 | 23 / 21 | 0.21 | 2.9 |
| NFL wide | 56 | -1.4 | -1.1 | -0.3 | 1.2 | 2.8 | 4.7 | 5.9 | 6.6 | 11.8 | 5.1 | 30 / 32 | 0.30 | 2.8 |
| ours wide | 0 | | | | | | | | | | | | |
| NFL all | 3722 | -3.2 | -3.4 | -3.2 | -2.6 | -1.4 | -0.4 | 0.2 | 7.5 | 13.5 | 5.2 | 18 / 18 | 0.20 | 2.7 |
| ours all | 264 | -5.0 | -4.9 | -4.7 | -4.5 | -4.3 | -3.8 | -2.8 | 6.3 | 11.2 | 4.0 | 7 / 6 | 0.16 | 2.9 |

### back: by our route id and by the NFL route label

| group | n | depth 0 s | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | lateral by 2.0 s | by 3.0 s | speed 0.5-2.0 s | angle to the line 0-2 s / 1-2 s | targeted | release (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ours back route back_flat | 206 | -5.0 | -4.9 | -4.7 | -4.5 | -4.3 | -3.8 | -2.8 | 6.3 | 11.2 | 4.0 | 7 / 6 | 0.11 | 3.0 |
| ours back route flat | 8 | -1.2 | -1.0 | -0.2 | 0.7 | 1.8 | 3.0 | 3.8 | 6.6 | 13.1 | 4.6 | 23 / 21 | 0.25 | 2.5 |
| NFL back FLAT | 1365 | -5.0 | -5.0 | -4.7 | -4.4 | -4.1 | -4.2 | -3.6 | 7.3 | 13.1 | 5.0 | 15 / 14 | 0.18 | 2.6 |
| NFL back WHEEL | 136 | -4.8 | -4.7 | -4.3 | -3.2 | -1.4 | 0.9 | 3.9 | 8.0 | 13.4 | 5.6 | 24 / 27 | 0.21 | 2.9 |
| NFL back SCREEN | 107 | -6.2 | -6.4 | -6.1 | -5.6 | -5.4 | -5.3 | -5.0 | 11.8 | 16.2 | 6.0 | 4 / 7 | 0.20 | 2.5 |
| NFL back CROSS | 90 | -2.8 | -3.0 | -3.0 | -3.5 | -3.8 | -3.7 | -2.3 | 11.7 | 16.2 | 6.2 | -4 / -0 | 0.16 | 3.1 |
| NFL back ANGLE | 27 | -4.7 | -4.6 | -4.1 | -3.2 | -1.4 | 0.6 | 1.6 | 6.6 | 8.0 | 4.8 | 25 / 27 | 0.26 | 2.6 |

### slot: by our route id and by the NFL route label

| group | n | depth 0 s | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | lateral by 2.0 s | by 3.0 s | speed 0.5-2.0 s | angle to the line 0-2 s / 1-2 s | targeted | release (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ours slot route flat | 16 | -1.2 | -1.1 | -0.5 | 0.4 | 1.4 | 2.5 | 3.7 | 6.1 | 12.5 | 4.4 | 23 / 21 | 0.19 | 3.1 |
| NFL slot CROSS | 642 | -2.0 | -2.0 | -2.2 | -2.1 | -1.1 | -0.5 | -0.5 | 8.4 | 16.4 | 5.7 | 8 / 11 | 0.27 | 2.8 |
| NFL slot GO | 195 | -2.4 | -2.2 | -1.3 | 0.6 | 3.2 | 6.1 | 9.6 | 10.3 | 13.8 | 6.5 | 28 / 36 | 0.10 | 2.8 |
| NFL slot FLAT | 192 | -2.2 | -1.9 | -1.0 | 0.2 | 1.2 | 1.8 | 2.7 | 7.6 | 13.8 | 5.2 | 21 / 20 | 0.18 | 2.5 |
| NFL slot SCREEN | 58 | -4.2 | -4.4 | -4.5 | -4.2 | -4.2 | -3.8 | -2.5 | 11.7 | 16.2 | 5.8 | 3 / 8 | 0.19 | 2.6 |
| NFL slot HITCH | 47 | -1.4 | -1.2 | -0.2 | 1.5 | 3.5 | 4.5 | 5.8 | 6.8 | 11.9 | 5.1 | 32 / 33 | 0.23 | 3.0 |

### wide: by our route id and by the NFL route label

| group | n | depth 0 s | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | lateral by 2.0 s | by 3.0 s | speed 0.5-2.0 s | angle to the line 0-2 s / 1-2 s | targeted | release (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NFL wide CROSS | 24 | -1.6 | -1.5 | -0.4 | 1.1 | 2.9 | 4.9 | 6.3 | 7.4 | 13.3 | 5.3 | 27 / 30 | 0.42 | 2.9 |
| NFL wide GO | 11 | -1.1 | -0.9 | 0.1 | 1.6 | 3.4 | 6.0 | - | 6.3 | 9.5 | 5.1 | 35 / 34 | 0.09 | 2.7 |
| NFL wide HITCH | 9 | -1.6 | -1.5 | -0.7 | 1.2 | 2.7 | 3.9 | 4.8 | 6.7 | 11.8 | 5.1 | 28 / 35 | 0.22 | 3.2 |

### Do ours climb more? Depth at 2.0 s and 3.0 s and the angle to the line, same geometric class, difference ours minus NFL (median)

| group | depth at 2.0 s | depth at 3.0 s | angle 0-2 s | angle 1-2 s |
|---|---|---|---|---|
| back | -0.6 | -0.0 | -8 | -9 |
| TE | +0.6 | +1.6 | +3 | +0 |
| slot | -0.0 | +0.8 | +3 | +1 |

### Flat targets that were caught: depth at the catch and the ball's flight

| | n | depth at the catch p50 (p25-p75) | flight time (s) p50 |
|---|---|---|---|
| NFL (completions, through the play) | 822 | 0.7 (-2.1-3.1) | 1.1 |
| ours | 30 | 2.5 (0.3-6.0) | 1.2 |

### Ours: the drawn waypoints per route id beside the mean path actually run (lateral toward the side he goes, depth past the line, both relative to his snap spot)

| route id | n | drawn waypoints (lateral, depth) | run at 1.0 s | 2.0 s | 3.0 s |
|---|---|---|---|---|---|
| back_flat | 210 | (0.0, 0.0) → (4.0, 0.3) → (7.0, 1.0) → (10.0, 3.0) → (15.0, 6.3) | (1.7, 0.3) | (6.3, 0.7) | (11.2, 2.2) |
| flat | 44 | (0.0, 0.0) → (10.0, 3.5) → (14.9, 5.3) → (15.1, 10.3) | (1.4, 0.8) | (6.3, 2.7) | (12.5, 4.9) |

### Ours: every route id whose drawn path ends 6+ yd to the side or is a flat / swing / arrow / bubble / shoot, drawn against run (all runners of the id, no geometry filter)

| route id | runners | drawn waypoints (lateral, depth rel. start) | run at 1.0 s | 2.0 s | 3.0 s | share that meet the flat geometry |
|---|---|---|---|---|---|---|
| back_flat | 845 | (0.0, 0.0) → (4.0, 0.3) → (7.0, 1.0) → (10.0, 3.0) → (16.4, 7.2) | (1.4, 0.3) | (5.5, 0.7) | (10.2, 1.9) | 0.24 |
| flat | 621 | (0.0, 0.0) → (10.0, 3.5) → (13.5, 5.3) → (14.4, 10.2) | (0.9, 0.7) | (4.4, 2.4) | (9.9, 4.4) | 0.07 |
| slant | 466 | (0.0, 0.0) → (4.5, 4.5) → (12.0, 6.5) → (37.2, 13.2) → (37.2, 51.0) | (0.0, 1.0) | (1.5, 5.2) | (6.4, 8.6) | 0.00 |
| quick_out | 462 | (0.0, 0.0) → (3.0, 1.5) → (10.0, 2.5) → (14.0, 3.1) | (0.0, 1.1) | (0.8, 4.9) | (4.8, 6.9) | 0.00 |
| dig | 432 | (0.0, 0.0) → (3.5, 2.0) → (24.0, 2.3) → (30.0, 2.4) → (30.3, 42.4) | (0.0, 1.4) | (0.7, 6.7) | (1.6, 11.6) | 0.00 |
| angle | 360 | (0.0, 0.0) → (-9.0, 3.5) → (-24.7, 10.1) → (-24.7, 48.6) | (0.6, 1.0) | (1.6, 3.9) | (0.9, 6.4) | 0.00 |
| corner | 355 | (0.0, 0.0) → (11.0, 13.0) → (14.0, 23.0) → (14.0, 39.3) | (0.0, 1.4) | (0.6, 7.0) | (0.8, 13.1) | 0.00 |
| post | 287 | (0.0, 0.0) → (16.0, 28.0) → (29.6, 45.4) → (28.8, 43.4) | (0.0, 1.4) | (0.6, 7.1) | (1.0, 13.5) | 0.00 |
| out | 282 | (0.0, 0.0) → (3.0, 2.0) → (12.0, 2.5) | (0.0, 1.3) | (0.5, 6.3) | (1.1, 11.1) | 0.00 |
| cross | 224 | (0.0, 0.0) → (15.0, 8.0) → (32.1, 12.0) → (32.1, 52.0) | (0.2, 1.2) | (1.4, 5.6) | (5.2, 9.4) | 0.00 |
| shallow | 178 | (0.0, 0.0) → (2.0, 1.0) → (23.5, 1.2) → (26.7, 1.3) → (27.0, 41.3) | (0.7, 0.8) | (3.6, 3.3) | (8.6, 3.8) | 0.00 |
| back_out | 127 | (0.0, 0.0) → (2.0, 2.0) → (12.0, 2.0) → (16.6, 2.0) | (0.5, 1.2) | (1.8, 4.9) | (4.7, 7.0) | 0.00 |
| short_in | 101 | (0.0, 0.0) → (16.0, 0.5) → (29.1, 0.9) → (29.1, 40.8) | (0.0, 1.1) | (0.5, 5.4) | (3.1, 7.6) | 0.00 |
| wheel | 91 | (0.0, 0.0) → (5.0, 4.0) → (6.5, 40.0) → (8.2, 62.4) | (1.0, 1.1) | (3.9, 4.3) | (8.0, 7.9) | 0.00 |
| stick | 75 | (0.0, 0.0) → (-0.6, -0.5) | (0.0, 1.1) | (0.5, 5.4) | (0.1, 7.3) | 0.00 |
| deep_out | 45 | (0.0, 0.0) → (3.0, 2.0) → (12.0, 2.5) | (0.0, 1.3) | (0.6, 6.2) | (0.2, 12.0) | 0.00 |
| mesh_under | 39 | (0.0, 0.0) → (2.5, 1.5) → (24.0, 2.0) → (24.0, 38.8) → (26.3, 42.0) | (0.5, 0.8) | (2.8, 3.7) | (7.5, 4.7) | 0.00 |
| shallow_high | 39 | (0.0, 0.0) → (2.5, 2.0) → (24.0, 2.5) → (29.3, 2.6) | (0.5, 1.0) | (3.0, 4.6) | (6.9, 6.2) | 0.00 |
| swing | 29 | (0.0, 0.0) → (5.0, 1.0) → (9.0, 4.5) → (16.5, 11.0) | (1.2, 1.2) | (4.4, 3.8) | (8.6, 5.9) | 0.03 |
| tunnel | 22 | (0.0, 0.0) → (1.5, -0.4) → (3.5, 0.3) → (33.2, 11.2) → (33.2, 16.2) | (0.3, 1.2) | (0.9, 1.4) | (3.1, 1.1) | 0.00 |
| bubble | 13 | (0.0, 0.0) → (2.5, 0.0) → (4.5, 2.0) → (11.1, 8.6) → (11.1, 13.6) | (0.8, -0.4) | (4.3, -0.2) | (6.4, 3.0) | 0.00 |

All our route ids in these games: go 1588, hitch 1420, back_flat 845, seam 677, quick_hitch 672, flat 621, slant 466, quick_out 462, dig 432, angle 360, corner 355, hook 321, post 287, out 282, cross 224, shallow 178, comeback 142, curl 139, back_out 127, short_in 101, wheel 91, stick 75, now_screen 69, deep_out 45, mesh_under 39, shallow_high 39, swing 29, tunnel 22, bubble 13.
