# Route-runner speed and corner-following diagnosis (2026-11-14)

Question (Integration/Rules): a crosser runs about 1 yd/s under the NFL from 1.5 s; the follower seems to carry a receiver past a
route corner. Diagnosis only; no engine change is proposed or merged. Operators: `scripts/diag/route-speed/` (`nfl_route_speed.py`,
`sim_route_speed.ts`, `route_break.py`, `sim_corner_past.py`); NFL is BDB 2025 weeks 1-9 drop-backs, ball still held (`pass_forward`
not yet), time since the snap, 10 Hz. The sim bench runs the real `PlaySim` (gun_doubles_11, cover 3 zone unless stated, ball held by a
staged throw at 6 s). The knobs below are local-only (`DIAG_EFFORT`, `DIAG_THROUGH`, `DIAG_SEEK`, `DIAG_NOGETOFF` in `route-motion.ts`
and `receiver.ts`); they are not in the PR.

## 1. Speed by time since the snap (median, yd/s)

NFL mid-class (8-18 yd at 3 s), zone:

| route, runner | 1.5 s | 2.0 | 2.5 | 3.0 | 3.5 | depth at 3 s |
|---|---|---|---|---|---|---|
| CROSS, WR (n 257) | 6.43 | 7.29 | 7.76 | 8.01 | 8.19 | 11.7 |
| CROSS, TE (n 62) | 5.58 | 6.66 | 7.26 | 7.40 | 7.63 | 10.2 |
| GO, WR (n 590) | 6.41 | 7.25 | 7.71 | 7.96 | 7.77 | 13.4 |
| IN, WR (n 367) | 6.38 | 6.95 | 6.80 | 6.34 | 6.16 | 12.5 |

Sim, develop's `cross` route (3 points: {6,-1,.9}, {14,-16,.85}, {18,-34}), WR body (SAMEBODY), n 12:

| arm | 1.5 s | 2.0 | 2.5 | 3.0 | 3.5 |
|---|---|---|---|---|---|
| base | 5.94 | 5.50 | 6.27 | 7.26 | 7.81 |
| no defenders | 6.00 | 5.47 | 6.30 | 7.29 | 7.83 |
| ROUTE_CRAFT off | 5.94 | 5.50 | 6.27 | 7.26 | 7.82 |
| LINE_START off (no get-off) | 6.32 | 5.72 | 6.77 | 7.56 | 7.97 |
| no through-speed or bend cap (`DIAG_THROUGH`) | 6.05 | 6.70 | 6.78 | 7.48 | 7.96 |
| route effort 1 (`DIAG_EFFORT`) | 6.00 | 5.54 | 6.59 | 7.71 | 8.56 |
| effort 1 and no through law | 6.54 | 7.34 | 7.65 | 8.27 | 8.82 |
| NFL CROSS WR | 6.43 | 7.29 | 7.76 | 8.01 | 8.19 |

Go (WR body): sim 6.61 / 7.82 / 8.56 / 9.01 against NFL 6.37 / 7.22 / 7.60 / 7.83: the body and the first 1.5 s are not the problem.

Over (`rules/cross-over` fe14536e, `CROSS_OVER=1`), n 24:

| arm | 1.5 s | 2.0 | 2.5 | 3.0 | 3.5 |
|---|---|---|---|---|---|
| natural runner (TE, vmax 8.6) | 4.68 | 5.53 | 6.14 | 6.52 | 6.74 |
| natural runner, no through law | 4.68 | 5.61 | 6.19 | 6.55 | 6.77 |
| natural runner, effort 1 | 4.90 | 5.99 | 6.82 | 7.37 | 7.40 |
| WR body | 6.18 | 7.14 | 7.74 | 7.90 | 7.64 |
| NFL TE / NFL WR | 5.58 / 6.43 | 6.66 / 7.29 | 7.26 / 7.76 | 7.40 / 8.01 | 7.63 / 8.19 |

## 2. Reading

- Develop's `cross`: the dip at 2.0 s (5.50 against 7.2) is the route law at its first corner, not the body (go is above NFL), not
  defenders, not ROUTE_CRAFT, not the facing (hips 0-2 deg off the path). Removing the corner's through-speed and bend cap gives
  +1.2 yd/s at 2.0 s. The route effort (.84 for the cross family) takes 0.3-0.45 yd/s at 2.5-3.0 s. The get-off costs 0.2-0.4 yd/s
  between 1.5 and 3.0 s (right at 0.5-1.0 s).
- The over has no such corner: the through law moves it by at most 0.1 yd/s. Its shortfall is the runner: the sim's TE crosser
  (vmax 8.6 times effort .84 caps at 7.2; he reaches 6.5 at 3.0 s) is 0.9-1.1 yd/s under the NFL TE crosser at every time; a WR body on the same
  route matches the NFL WR to 0.25 yd/s through 3.0 s. Effort 1 on the TE recovers 0.2 yd/s at 1.5 s, growing to 0.85 at 3.0 s. A TE-over speed shortfall of about 1 yd/s is a
  body-and-effort term, not a follower term.

## 3. Corners (same operator on both: `route_break.py`)

Break = the largest heading change between 0.3-0.8 s before and after, at least 35 deg; vertex from the fitted stem and exit lines;
`cut` = how far inside the vertex the path passes; `arc` = path length from 10% to 90% of the turn.

| class | NFL v_in / v_min / v_out, min/in | NFL radius, arc | sim v_in / v_min / v_out, min/in | sim radius, arc |
|---|---|---|---|---|
| IN/OUT, depth >= 8, turn >= 60 (NFL n 265, sim dig+out n 27) | 6.2 / 5.0 / 5.5, .81 | 4.7, 3.9 | 6.0 / 3.7-4.0 / 6.4-6.5, .62-.68 | 3.1-3.2, 3.0-3.3 |
| rounded, CROSS tb >= 1.4, depth 4-12 (NFL n 217) vs sim cross | 6.1 / 6.3 / 7.3, 1.03 | 9.9, 5.5 | 5.1 / 5.0 / 6.3, .98 | 6.6, 4.9 |
| POST / CORNER (NFL) vs sim post / corner | 6.4-6.5 / 6.0-6.4, .94-.97 | 8.6-9.4, 4.8-5.3 | 7.2 / 7.0, .97 (corner) | 11.9, 7.0 |

The cut inside the vertex is the same (0.5-0.8 yd); NFL receivers plant on a sharp cut (min/in 0.76-0.81, radius about 2.3 yd for true
75-110 deg cuts) and round a bend without slowing (min/in 1.0-1.1, radius 6-10 yd); the sim has the same two regimes (sharp s .4,
rounded s .85-.9). Lateral acceleration at the corner is about the same (NFL v_min^2/radius 4.0-5.3, sim 3.8-4.3 yd/s^2). What differs is speed at that
acceleration: the sim carries 1-1.3 yd/s less into and through the bend and plants deeper on the sharp cut (0.62-0.68 against 0.81).

## 4. The follower at a corner

`steerRoute` has no look-ahead: it steers to the current point with the arrive law and switches at 0.6 yd or when passed within 2 yd.
Per declared corner (`sim_corner_past.py`, 10 Hz track, no defenders, n 12-48): the body passes within 0.04-0.43 yd of the point at
3.3-5.1 yd/s (dig, out, short_in, cross, shallow) or 6.8-7.1 (post, corner), then runs on and stays outside the next leg by up to
1.5-2.2 yd for 54-90 deg turns (0.3-1.3 yd for 30-45 deg) within the next second. So the declared vertex is hit exactly and the
realised path leaves the declared leg by about 2 yd after it. That is the carry past the corner Rules measured on `shallow_high`
(depth keeps climbing after the points flatten). NFL receivers by contrast lead the turn and pass inside the vertex (cut 0.5-0.8 yd).
The bend cap `sqrt(lateral * cutSkill * 1.3 / (1 - cosT))` is a point-turn law (an implicit 1.3 yd corner length): 4.6 yd/s at a 52 deg
corner, about 2.9 at 90. NFL receivers turn the same bends on radii of 5-10 yd, at 4-6.3 yd/s.
