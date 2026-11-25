# PLAN_BREAK_BODY: the planned break from the body that runs it (2026-11-24, Rules + Coaching, flag off)

Integration's ask: the installed routes' planned break times were 0.5-0.7 s ahead of what our receivers run, and the
passer's forecast and throw timing read them. A passer knows his receivers' timing from practice, so the plan should be
the route as our receivers run it. Only the plan's numbers change; receiver behaviour is unchanged.

## Measurement (staged, no throw)

`scripts/diag/routes/plan-break-probe.mts`:
- 19 concepts × gun doubles and gun trips × 3 seeds against cover3: 552 receiver rows.
- The planned break is `RouteRunner.breakTime` from his route's install.
- The run break uses the route chart's break rule (route_chart.analyse: a stop's plant, a turn's peak) on his 10 Hz
  track. It is the same operator as the chart's NFL column.

| route | planned (old) | run break | run − planned | NFL (route chart) |
|---|---|---|---|---|
| slant | 0.79 s | 1.50 | +0.72 | 1.5-1.8 |
| quick_out | 1.19 | 1.80 | +0.74 | 2.0 |
| hitch / quick_hitch | 1.49 / 1.40 | 2.20 / 2.20 | +0.71 / +0.80 | 2.3 |
| dig | 1.82 | 2.70 | +0.96 | about 2.6-2.7 |
| out (9 yd) | 1.71 | 2.60 | +0.87 | 2.6 |
| hook / short_in | 1.82 / 1.40 | 2.60 / 2.35 | +0.82 / +0.90 | |
| curl / comeback | 2.34 / 3.05 | 2.80 / 3.20 | +0.49 / +0.19 | |

The receivers break on NFL time; the plan was early.

**Why:** breakTime was startDelay + 0.25 + breakDist / (0.85 × effort × vmax) + the get-off loss. That is an average of
85% of an effort-scaled top speed (about 7 yd/s) from the snap. A receiver accelerating from his stance is at about
3.5-4 yd/s at 1.0 s, the NFL's and ours alike per Flex's get-off table.

## The change (PLAN_BREAK_BODY, off)

- **The plan's break is his own body's run along his own path, from a standstill** (`bodyRunTime`, route-motion.ts):
  the same stepBody, LINE_START get-off drive, and arriveVelocity approach into each speed-controlled point that run
  him, stepped by distance along the path.
- **The break point is the path's first 35-degree turn** (firstBreakDepth's rule). That is the turn he runs; a shaped
  route's speed point is its stem's end, 1.5-2 yd short of it. A route with no such turn keeps the old rule.
- **The receiver's own look for the ball** (preLook) keys `lookBreakTime`, today's number, so his behaviour is unchanged.
  That look also fires early, for the same reason; moving it is a behaviour change and a separate flag if wanted.

## Result: plan against the receiver's own arrival at the turn vertex

Same probe, flag on:

| route | plan − vertex arrival p50 (p25 / p75) |
|---|---|
| hitch / quick_hitch | +0.10 / +0.11 (+0.08 to +0.15) |
| slant | +0.13 (+0.12 / +0.13) |
| hook / curl / comeback / stick | +0.15 / +0.08 / +0.13 / +0.13 |
| corner / out / dig / quick_out | +0.20 / +0.29 / +0.34 / +0.26 |

- The chart's turn peak comes a further 0.2-0.4 s after the vertex on the rounded breaks (the dig turns at its 10 yd
  stem end and peaks near 12).
- Two attempts were made:
  - the body run alone left the short routes 0.3-0.5 s early against the chart;
  - adding the path's own turn vertex as the break point closed most of the rest.
- The remaining 0.1-0.3 s is not fitted away. Candidates are the steering's bends (STEM_WORK) and the 0.6 yd "reached"
  radius.
- Not covered: the flat, cross, go and seam have no planted break, and their first 35-degree vertex is late in the
  path. They keep a plan by the same body run, unverified against a break.

## Checks

- `test/plan-break-body.test.ts`, on slant and quick_hitch:
  - on, the plan is within 0.3 s of the vertex;
  - off, it is 0.42 / 0.56 s early;
  - the receiver's track is identical on and off.
- Typecheck passes.

The QB's throw timing (qb.ts, the old controller) reads the plan, so the flag changes when the passer throws. That is
for Integration's card. QB_V2's readers are the QB lane's to switch with the same flag.
