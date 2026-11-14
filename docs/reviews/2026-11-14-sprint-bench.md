# Lone-body sprint bench and defender energy (movement law)

Question (Integration): when a body asks for full speed in a straight line, does the movement law give the speed it should, and is energy 0.75 what slows the free-play defenders? Scripts: `scripts/diag/sprint-bench.ts` (`out/sprint-bench.txt`), `scripts/diag/snap-energy.ts`. Develop `57325109`. Lone body, no opponent, no contact; the `stepBody` and `World.step` paths agree to 0.01 yd/s, and both sit 0.03–0.06 above the closed form from the trapezoid step.

## The curve (full-speed straight request, facing forward)

DB = BDB 2027 `combine_results.csv` median (n 104: 10-yd 1.54 s, 40 4.49 s, 195 lb). `combine_results.csv` has no LB, so LB is the sim generator's median at quality .5 (1.58 s, 4.62 s, 236 lb).

| Profile | vmax yd/s | tau s | a0 = vmax/tau |
|---|---|---|---|
| DB combine curve | 10.36 | 0.63 | 16.5 |
| DB in game | 9.84 | 1.32 | 7.5 |
| LB combine curve | 10.04 | 0.64 | 15.7 |
| LB in game | 9.21 | 1.29 | 7.2 |

`derivePhysical` multiplies tau by `gameSpeed` (0.95) and by `GAME_BURST` (2.2), by design: it is calibrated to NGS per-play peak accelerations ("p50 within about 0.6 yd/s²"), not to combine splits. So the 10-yard split in game is 2.06 s (DB) and 2.13 s (LB) against 1.54 and 1.58 in the data, and the 40 is 5.4 and 5.6 s. Whether a per-play-peak calibration is the right target for a defender who is trying to run at full speed is a separate question; it is a documented choice, not a bug.

Speed in yd/s, DB, `stepBody`:

| Energy | start v0 | 0.5 s | 1 s | 1.5 s | 2 s |
|---|---|---|---|---|---|
| 1.00 | 0 | 3.16 | 5.31 | 6.77 | 7.75 |
| 1.00 | 3 | 5.20 | 6.69 | 7.70 | 8.39 |
| 1.00 | 4.5 | 6.22 | 7.38 | 8.17 | 8.71 |
| 1.00 | 6 | 7.23 | 8.07 | 8.64 | 9.03 |
| 0.75 | 0 | 3.11 | 5.23 | 6.67 | 7.65 |
| 0.75 | 3 | 5.15 | 6.62 | 7.62 | 8.30 |
| 0.75 | 4.5 | 6.17 | 7.31 | 8.09 | 8.62 |
| 0.75 | 6 | 7.20 | 8.01 | 8.56 | 8.94 |

LB is 0.1–0.5 lower throughout (`out/sprint-bench.txt`). The curve is the law: the closed form V − (V − v0)e^(−t/τ) matches.

## What energy 0.75 does

`fatigueFactor(0.75)` = 0.9906. It multiplies the top speed and the drive force, so it costs under 1% (0.05–0.1 yd/s in the table). At 0.5 it is 0.947, at 0.25 0.854. Energy 0.75 does not explain a defender running 4.6–5.4 yd/s with a request of 9.4.

## Why defenders are at 0.75 a few seconds in

Measured in one seed-7 game (718 CB/S/LB pass-play reps): energy at the snap is 0.84 (p10 0.70), at the end of a 5.2 s pass play 0.73 (p10 0.59); a pass play spends 0.11. The snap value carries over: the fast pool refills at 0.006–0.016 per second of rest (time constant 1–3 minutes) toward a reserve, so a defender on his fourth consecutive snap starts at 0.69. A pure sprint from rest spends 0.07 in 2 s and 0.23 in 6 s, so the play spends about half a sprint's worth. 0.75 is therefore what a defender carries at the catch, not a sign of extra tax in the play.

## What does slow a defender in the bench: facing

The law caps top speed by the angle between his hips and his travel (`directionalSpeedFactor`: 1 forward, `shuffle` sideways, `backpedal` backward). A lone body at v0 4.5, energy 0.75, requesting 9.8 along +x with the hips turned (DB):

| Facing off travel | cap yd/s | 0.5 s | 1 s | 1.5 s | 2 s |
|---|---|---|---|---|---|
| 0° | 9.75 | 6.17 | 7.31 | 8.09 | 8.62 |
| 60° | 8.20 | 5.86 | 6.72 | 7.26 | 7.61 |
| 90° | 6.27 | 5.30 | 5.74 | 5.98 | 6.11 |
| 135° | 5.58 | 5.03 | 5.31 | 5.44 | 5.51 |
| 180° | 4.90 | 4.72 | 4.82 | 4.86 | 4.88 |

Sim D1 and D2 reach 4.6–5.4 yd/s under a 9.4 request. That is what a body with its hips 90°–135° off its path does, and it is not what a forward-facing body does (7.3 by +1 s). This is a hypothesis, not a finding: the play's own facing at the catch has not been read. The test that decides it is one column: `angleDiff(body.facing, heading of velocity)` for D1 and D2 at the catch, +0.5, +1.0, +1.5 s on the same free plays. If it is near zero, something else in the play is taxing him (support/capacity, contact, `drive`, the traction clamp, the endurance factor) and the next bench step is the same lone body with that term added; if it is large, the question moves to why a defender closing on a catcher keeps his hips off his path (the controller's facing request, or the turn-rate limit in `stepBody`).

## Outcome (Integration, 2026-11-14)

Defense's stage trace has the sim's D1 and D2 hips within 10–18° of their velocity, so the facing cap does not explain the 4.6–5.4 yd/s: the hypothesis above is not supported. NFL part 3 (BDB 2025 weeks 1–9, n 866) shows NFL near defenders are slower than ours at every mark (D1 5.6 → 4.7, D2 never above about 5) and stay upfield of the catcher (catcher past D1 0.52 at +1.0 s against the sim's 0.86), so the gap is approach and leverage, a controller question for Defense. The law and energy are cleared. The in-game tau at 2.09x the combine's is a separate open question, not to act on from this evidence, since NFL in-play speeds are at or below the sim's.
