# Short passing game: why flats fail, and the QB's throw estimate (Coverage, 2026-11-11)

Status: parked for Rules + Coaching's stress matrix. Two off flags (`FORECAST_PACE`, `ROUTE_PLACE`) are in this branch as they stand; neither is a promotion candidate.

## Populations

- **Panel:** recaptured on develop 05587800 with leagueSample (seed 7: 155 snaps, seed 11: 147), 4 dice shifts. About 809 throws.
- **Export:** sim-export seeds 101-108 at 05587800 (1,091 plays).
- **NFL:** BDB 2025 weeks 1-3 (`out/mechanics/nfl-plays.jsonl.gz`). NFL and sim use the same Python operators. Arrival is `pass_arrived`, else the last frame.

## Findings

1. **The QB's estimate is too optimistic, not too pessimistic** (`throw-calibration.ts`, panel). Predicted completion is 0.72; realised is 0.57. By aim depth:

   | aim depth | predicted | realised |
   |---|---|---|
   | behind the line | 0.84 | 0.63 |
   | 0-5 yd | 0.78 | 0.51 |
   | 5-10 yd | 0.73 | 0.61 |
   | 10-20 yd | 0.70 | 0.58 |
   | 20+ yd | 0.57 | 0.42 |

   Predicted INT is right on average (0.021 vs 0.023) but discriminates poorly.

2. **Completion by catch depth matches the NFL short; the throw mix does not** (`depthwidth.py`, export vs NFL).
   - 0-5 yd: 0.74 vs 0.74.
   - Behind the line: 0.82 vs 0.83.
   - 20+ yd: 0.51 vs 0.29.
   - Behind the line and wide: **0% of our targets vs 12.7%** (behind the line overall: 4.6% vs 17%). This agrees with Rules + Coaching: open flats are thrown 9.5% of the time vs 32.6%.

3. **Flats fail when thrown** (`flat-force.ts`, clean forced throws).
   - Completion is 0.51 (n 68). With the nearest defender 3-4.5 yd away, the QB predicts 0.80 and completes 0.59; NFL flats there complete 87% (#538).
   - Failures are receiver misses (15), then drops (6) and PBUs (6).
   - At a miss the ball is 1.15 yd from him (reach 0.99), 2.3 yd high, with him moving 2.7 yd/s.

4. **The receiver slows into the catch.** On short-wide targets he goes from 5.6 to 3.0 yd/s between release and arrival (n 24); the NFL goes from 5.3 to 5.0 (n 1,623).
   - Cause: `TrackBall` runs to the *earliest* reachable point on the ball's path below 0.92 x his max catch height. On a flat thrown from inside, that point is early and high.
   - `IN_STRIDE_CATCH` (existing, off) keeps him at 4.6 yd/s and brings the ball down to 1.8 yd, but forced-flat completion moves only 0.51 -> 0.53.

5. **The ball is thrown behind him.** With a fresh picture (median error 0.26 yd), the aim point is 1.7 yd behind the receiver along his run at the planned arrival. The aim implies 1.7 yd/s; he runs 4.6.
   - The forecast falls back to straight-line observed motion on 53% of throws, and on 93-100% of flats, swings and shallows. `inferProgress` places a receiver on his route only within his body radius.
   - Flats sit 0.4-0.65 yd off the installed line at the throw.
   - Shallows, short ins and observed-motion digs sit 1.5-2 yd off. That looks like a systematic difference between the path run and the installed path; not yet diagnosed.

6. **The QB is not early** (`relbreak.py`, release minus break by route class from the trajectory, export vs NFL).

   | route class | sim | NFL |
   |---|---|---|
   | stop routes | -0.70 s | -0.80 s |
   | in-breaking, 10-20 yd | -0.6 s | -0.6 s |
   | out-breaking, 10-20 yd | -0.3 s | -0.9 s |
   | 5-10 yd breaks that keep climbing | +0.6 s | +0.2 s |

   Where we differ, we are later. Our targets are 50% breaks that keep climbing (NFL 24%). A zone corner over the catcher is "away at the release" mostly because of that target mix and catch depth (11.4 vs 5.4 yd), not throw timing. On stop routes (`stopbreak.py`), the over-the-top defender's velocity after the break matches the NFL.

## Attempts (two-attempt rule: both made; stop and re-diagnose)

Forced flats are clean rows; the panel is the paired restage.

| arm | forced flats | aim along run | misses | panel completion | panel INT | flats/swings targeted |
|---|---|---|---|---|---|---|
| off | 0.51 (n 68) | -1.7 yd | 15 | 0.566 | 0.023 | 37 |
| `FORECAST_PACE` (observed motion paced toward route speed on `continue` routes) | 0.64 (n 39) | +0.5 yd | 5 | 0.555 | 0.025 | 41 |
| `ROUTE_PLACE` (route placement within radius + 0.5 yd) | 0.60 (n 25) | -2.0 yd | 4 | 0.579 | 0.017 | 33 |
| both | 0.54 (n 13) | 0.0 yd | 3 | 0.567 | 0.020 | 35 |

Panel completion SE is +/-0.017.

- `FORECAST_PACE` fixes the lead on flats. Its costs: the total aim error on bending crossers grows (shallow 3.3 -> 4.3 yd), and go routes are over-led (+1.4 -> +2.1 yd).
- `ROUTE_PLACE` leaves fewer clean rows (more pumps and throws elsewhere), so its forced-flat reading is weak.

## Next step when unparked

Integration's order: one attempt combining the lead and the catch. Re-diagnose first:

- **(a)** Why shallows and short ins run 1.5-2 yd off their installed path, which decides whether route placement or pacing is the right forecast fix.
- **(b)** Read the lead fix together with `IN_STRIDE_CATCH` and the TrackBall catch point, which is also Run Game's now-screen problem; one fix, in TrackBall.

Gates:
- forced-flat completion toward 87% at 3-4.5 yd;
- speed into the catch (NFL 5.3 -> 5.0);
- miss geometry and drops;
- the panel calibration.

Then the look dice (`defense.ts`, one event per defender per flight), then the joint read with Run Game's BACK_RELEASE.
