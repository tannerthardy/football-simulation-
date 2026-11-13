# FORECAST_HOLD: a receiver a little off his line is still running his route (2026-11-12)

**Question** (Integration). On 14% of dropbacks the quarterback pumps at the plant's re-check. His window P falls by
about 0.5 between his decision and the plant, 0.2–0.4 s later. Is that defenders reacting to the windup, or something
in his own evaluation?

## Trace: 30 pumps with a P drop over 0.3

`scripts/diag/read-plan/pump-trace.ts`: league games, engine-42, seed 101. At the decision and at the plant it records
every defender's picture and true state with the window's terms, and the receiver's forecast, model and picture age.
It also records where the receiver truly was at the ball's planned arrival.

| Cause | Pumps |
|---|---|
| (a) the defender who sank it changed course or speed | 1 |
| (b) the defender's picture was off at the decision | 6 |
| (c) the receiver's forecast catch point moved 2–8 yd in 0.2 s, for the same planned arrival | 22 |
| unclassified | 1 |

- **Defenders hold course.** Their true position at the plant is about 0.1 yd from their course at the decision.
- **The forecast flips models.** In 18 of the 22 receiver cases, it goes from `installed-route` (his read of the
  route) at the decision to `observed-motion` (a straight line of the receiver's current velocity) at the plant.
- **The decision was the right forecast.** The error to where the receiver actually was at arrival is about 1.2 yd
  for the decision point against about 4.5 yd for the plant's re-aim. He commits to a correct forecast, then pumps on
  a wrong one.
- **His picture of the receiver is 0.2 s old at both moments.** The difference is how the new picture is classified.

**Mechanism.** `receiver-forecast.ts inferProgress` places a picture on the installed route only within the
receiver's body radius (about 0.3 yd) of the drawn path. Anything farther makes the whole forecast a straight line,
ignoring the coming break. During the windup his eyes are on the aim point, so he gets a fresh picture of the
receiver, and real receivers drift off the drawn line (route craft, rounding the cut, a press release).

## How far receivers drift off the drawn line

`scripts/diag/read-plan/forecast-drift.ts` covers every picture of a moving receiver (2 yd/s or more) on the
forced-concept panel, seed 1: 58,652 pictures. 97% of them are running along their path.

| Route phase | Running along it | Off the line p50 / p75 / p90 / p95 (yd) | Not placed, off |
|---|---|---|---|
| Stem | 0.99 | 0 / 0.17 / 1.19 / 1.90 | 0.22 |
| After the break | 0.91 | 0.44 / 1.13 / 1.63 / 2.11 | 0.60 |
| No break (verticals, drags) | 1.00 | 0.02 / 0.19 / 1.46 / 3.32 | 0.23 |

By time: 17% are not placed at 1–2 s, 32% at 2–3 s (the throwing time) and 58% after 3 s.

## Change (`FORECAST_HOLD`, off)

`src/sim/receiver-forecast.ts`, `inferProgress`:

- **The tolerance comes from the measured drift.** While he runs along the route (heading within about 53° of the
  segment), a picture is placed within `HOLD_TOL` by phase: stem 1.2, after the break 1.6, no break 1.5 yd. Each is
  the 90th percentile above.
- **It is the QB's belief.** It is a field on his forecast (`ReceiverForecast.holdTol`), so knowledge of a receiver,
  a sharper QB or more reps could hold it tighter later. That seam is left, not built.
- **A real break-off still drops to observed motion at once.**
  - Stopped (fallen, jammed) or cutting across the route keeps only the body radius.
  - Farther off than the tolerance is not placed.
  - Moving against the route was already a contradiction.
- **Callers.** `inferProgress` is private to `receiver-forecast.ts`, and `ReceiverForecast` is used only by the QB.
  It changes his readiness, his window, his expected break time, HOT_LOOK's picks and where his gaze holds.
  Defenders do not use it, and `RouteRunner.breakTime` is separate.

## Read (engine-42; DEF_BELIEF off)

| | Off | On |
|---|---|---|
| Pictures moving along the route not placed (panel, seed 1) | 0.26 | 0.10 per phase |
| Pumps, 16 league games | 210 / 1,537 (13.7%) | 110 / 1,576 (7.0%) |
| P drop at the re-check p50 | 0.51 | 0.44 |

**Paired forced-concept panel** (1,536 plays):

| | Off | On |
|---|---|---|
| INT | 41 | 38 |
| Sacks | 35 | 29 |
| Completion | 0.613 | 0.624 |
| Yards a play | 9.39 | 10.02 |
| Time to throw p50 | 2.80 s | 2.75 s |

171 plays change target or attempt. On the 160 newly targeted throws, flag on against the same plays off:

| | Completion | INT | Yards |
|---|---|---|---|
| On | 0.49 | 9 (5.6%) | 9.5 |
| Off (13 of them sacks) | 0.37 | 6 | 7.2 |

**League games** (seeds 101 and 201, 8 games each):

| | Off | On |
|---|---|---|
| Completion | 0.638 | 0.662 |
| Yards a play | 8.79 | 9.53 |
| Sacks | 2.6% | 2.5% |
| INT | 27 | 26 |
| P accepted / completion | 0.70 / 0.63 | 0.71 / 0.64 |
| Free rusher at 2 yd: throws / sacked / scrambles | 70 / 15 / 12% | 77 / 15 / 6% |

## Reading it

- **The pumps were mostly his own forecast's inconsistency.** Holding the route forecast through ordinary drift
  halves them.
- **The newly attempted throws are worth more than what they replaced:** 0.49 complete and 9.5 yd, against 0.37, 7.2
  yd and 13 sacks on the same plays. They are slightly riskier: 9 INT against 6 on 160 plays.
- **Calibration does not move.** P accepted against completion is unchanged. That is DEF_BELIEF's job, and the two
  should be read together.
- **With a free rusher at 2 yd he now throws more** (70 → 77%, NFL 57%) and scrambles less (12 → 6%). The pumps were
  part of how he ended up holding the ball. Fewer pumps means more throws under pressure: the population of Flex's
  EXTEND and the urgency work.
- **Still open:**
  - 7% of dropbacks still pump; the remaining causes are the defender-picture and flicker cases.
  - Interceptions on the newly attempted throws (5.6%) deserve a look with DEF_BELIEF on.

## Checks

`npx tsc --noEmit -p .` is clean. `test/forecast-hold.test.ts` passes (3/3): a go run 1 yd off its line keeps the
route on and loses it off; cutting across, stopped, or 3 yd off falls back on; on the line both read the route.
`test/qb-receiver-forecast.test.ts` (9/9) and `test/forecast-break.test.ts` (2/2) pass.

`npm test`: 444 files, 4064/4064 (branch rules/deep-shot on the engine-42 tree with DEF_BELIEF).
