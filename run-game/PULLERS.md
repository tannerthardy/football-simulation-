# Pullers run fixed landmarks (2026-11-01, develop f476187d)

Question (Tanner, from film): counter's pulling linemen follow set landmarks and then turn, too static to get off the
route and make a better block at a better angle.

Measurement: `tools/py/pullshape.py` (same operator on 2022 NFL and sim), sim = develop `f476187d` (#385 merged),
captured run-only snaps seeds 7..29 odd, counter + power, streams 0..4 (`--concept counter,power`).
Full output: `results/pullshape-DEV.txt`. Per-tick requests: `tools/ts/pullreq.mts <worktree> <seed> <index>`.

## How the pull is built (src/sim/behaviors/blocking.ts)

- At the snap each puller gets three fixed points (`pullPath`): a drop behind his own spot, a flat-leg corner
  behind the down wall (kick: 0.65 yd inside the end's snap spot; wrap: 0.5 yd short of the hole), and an end point
  (kick: at the end's shoulder on the line; wrap: the installed hole, `los + 0.5`, B gap).
- He runs each point with `goTo` (arrive control) and `through = cornerSpeed(radius 0.65)`, so he brakes to ~2 yd/s
  at every point, and only advances when within 0.65 yd of it (`pullIdx`); the corner can also hold him until the
  wall clearance read passes (`observedCorner`).
- The kick fit can leave the route when the end is in front of him; the wrap has no such read: his route ignores
  his target, which is re-picked separately while he runs.

## Film: seed 7 #22 (ace_11 counter vs over), wrap LT

0.5-1.6 s flat at x -1.33 toward the corner point, requested speed falling 6.8 -> 3.2 as he arrives; 1.7 s the end
point (0.5 yd further, 1.8 yd upfield) snaps the request to 115 deg while he still runs 168 deg; speed 3.9 -> 2.9 ->
2.0 -> 0.7 by 2.8 s; path ends at the hole at 2.5 s. Target relabels LB_W -> LB_M -> DT_W -> DE_W; he ends on the
backside end chasing, never a backer.

## NFL vs sim (medians, IQR in results)

| | NFL | sim |
|---|---|---|
| Counter wrap: turn lateral IQR (yd from snap) | 3.98-7.03 | 5.17-5.45 |
| Counter wrap: turn depth IQR | -0.85..+0.83 | -0.72..-0.55 |
| Counter wrap: r(turn lateral, his man's lateral) | 0.78 | 0.39 |
| Counter wrap: speed at 2.0 s | 3.30 | 2.64 |
| Counter wrap: first block relative to turn | 0.8 s before | 0.1 s before |
| Counter wrap: heading at block | 21 deg | 36 deg |
| Peak heading rate in the turn (kick / wrap / power) | 100 / 90 / 92 deg/s | 174 / 140 / 176 deg/s |
| Speed dip into the turn (kick / power) | 1.88 / 1.13 | 2.38 / 2.56 yd/s |
| Power puller: min speed around turn | 2.06 | 1.02 |
| Power puller: turn time / depth | 2.0 s / -0.02 | 2.5 s / -0.80 |
| Power puller: heading at block | 39 deg | 10 deg |

Sim wrap turn point by formation: +2.3..2.4 yd from the ball, 0.65 deep, at 2.3 s in every formation (the hole
landmark). The kick puller's turn does follow his man (r 0.96 vs NFL 0.94) because the kick fit tracks the end, but
it still brakes into points and corners ~1.7x sharper than NFL.

## Reading

NFL pullers carry speed through a rounded path (about 90-100 deg/s of turn), start bending toward their man while
still flat, and engage on the way (wrap blocks ~0.8 s before reaching 45 deg upfield). Sim pullers brake into each
landmark, pivot at it, and the wrap's turn point is the installed hole regardless of where his man is.

## Proposed change (not implemented)

Controller, not physics: keep the wall-clearance constraint (`readPull` clearanceX) but replace point-to-point
arrival with path following: a lookahead point along the current route with speed limited by the curvature the
body can hold (`lateral` capacity), so the turn is a curve, not a stop. Let the route's turn-up come from his own
picture of his man (wrap: the backer/threat he sees; kick: the end, as now), re-read each decision beat, and open
the fit on time-to-intercept rather than 1.2 yd proximity. Measure with `pullshape.py` (turn-point spread and r,
heading rate, dip, block-before-turn) plus the counter card (wrap near box backer, behind-LOS first contact) and
power/trap controls.

## Fix: run/G2-puller-path 452b8acf (2026-11-01)

Corners rounded on the radius his speed and lateral grip hold; the route's end point is passed, not circled
back to; the lead runs through the hole, fits a man he can reach within 0.8 s past his corner, keeps a man he
can reach, ignores men behind his flow (a beat ahead), and leads the runner when no threat is left.
Matched (develop f476187d vs fix, 12 seeds, counter+power, 5 streams; NFL same operator):

| | develop | fix | NFL |
|---|---|---|---|
| Counter wrap speed at 2.0 s | 2.64 | 3.16 | 3.30 |
| Counter wrap heading at first block | 36 deg | 22 | 21 |
| Wrap first block before his 45-deg turn | 0.1 s | 0.5 | 0.8 |
| r(turn lateral, his man) | 0.39 | 0.57 | 0.78 |
| Wrap target switches >= 2 before engaging | 79% | 66% | - |
| Behind-LOS first contact | 38% | 41% | 41% |
| Wrap within 1.2 yd of a box backer | 26% | 21% | 39% |
| Play-side backers untouched | 32% | 34% | 13% |

Scope (all concepts, stream 0): only power, trap, counter and 5 split-zone snaps change. Not addressed: power
puller meets his man flat (11 vs 39 deg); counter wrap late into a crowded hole (behind the LOS at the carrier's
crossing on 2/3 of no-block plays, two bodies within 1.3 yd).

## Where else (pivots.py, develop, all concepts stream 0, brake-and-pivot share per player-play)

| | NFL | sim |
|---|---|---|
| Power TE (Y climbing, re-targeted to a new man mid-climb) | 0% | 11% |
| Draw TE / OL (pass set, then a hard flip to run block ~2.0-2.3 s) | 3% / 0% | 11% / 5% |
| Power back (FB lead) | 0% | 8% |
| Inside zone non-carrier back | 1% | 7% |

Peak heading rate is ~2x NFL for every role in sim, but NFL tracking is filtered and sim is not, so that
number needs both smoothed the same way before it is evidence.
