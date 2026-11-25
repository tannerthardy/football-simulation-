# ROUTE_SHAPE's missed outs: the forecast is right; the receiver's ball estimate is not

QB lane, 2026-11-18. The item: Rules' out trace on rules/cut-speed cf7c2dac. Under ROUTE_SHAPE=1 the aim misses the
receiver at the arrival by 1.45 yd, against 0.61 off. Rules' suspect was the QB's receiver forecast (inferProgress or
the steerRoute loop without the fillet's turn state). Reproduced: 11 completions and 13 incompletions on, 17 and 6 off.

Probe: `scripts/diag/routes/out-forecast.mts`. At the throw it records:
- the QB's forecast of the out at 0–1.2 s;
- the receiver's real position, speed and behavior every 0.2 s;
- whether he has seen the ball;
- his chosen catch point and the end of his own ball estimate.

## Finding

**The forecast follows the rounded out until the receiver turns to the ball.** On Rules' plays:
- Forecast error at 0.2 / 0.4 s: 0.01–0.23 / 0.04–0.48 yd.
- This holds even with his fillet turn begun at the throw (double_outs cover2, seed 1: progress 0 with the runner
  mid-turn; the forecast matches to 0.05 yd at 0.4 s).

**The error grows only once he slows.** Speed after the throw:
- trips_outs: 5.8 → 1.8 yd/s;
- double_outs: 5.1 → 2.1 yd/s;
- trips_sail: 5.2 → 3.1 yd/s.

Each slowdown starts at the tick he first sees the ball, 0.4 s after the release.

**Why he sees it so early.** The rounded break turns him back toward the passer. On the square out he finds the ball
only at about 1.2 s, runs his route through to it, and the throw is complete.

**Once he has seen it, his own ball estimate is wrong and stays wrong.** BALL_EST 6145 (the estimator plus bit 2048,
so the servo is off; the TrackBall path is CATCH_CHOICE on his estimate).

| play | aim (depth, lateral), arrival | his estimate's end | his choice |
|---|---|---|---|
| trips_outs cover3 doubles s1 flip | 12.3, 16.7 at 5.07 | 16.1, 14.0 at 5.15 (from 0.4 s) | 11.1, 11.1 at 4.85, fixed |
| double_outs cover2 doubles s1 | 11.3, −17.4 at 4.27 | 6.9, −11.5 at 4.00, frozen 0.4–1.2 s | none |

The estimate from his first sight puts the ball several yards short and does not update for the rest of the flight.
He brakes to meet a ball that is not coming there.

## What it is not, and where it goes

- **Not the QB's forecast**, nor inferProgress losing the fillet state: the forecast is right while he runs his route.
- **A forecast change cannot repair it.** He leaves the route because of his own picture of the ball.
- **It belongs to BALL_EST** (the receiver's own sight and estimate of the ball: the first-sight fit and why it is not
  re-sampled after the first sight). That is Coverage's design, not built here.
- **Why the square out hides it:** he finds the ball late there and runs his route through to it.
- **The QB's aim is not changed.** Leading him to where his estimate will take him would be the QB reading the
  receiver's private estimate.
