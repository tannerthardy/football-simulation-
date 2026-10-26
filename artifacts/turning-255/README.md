# #255 (turning measurement): why it is held, and the check on today's develop

Source: develop `b559fdc` merged with #255 head `035214e0942238bb9fdd10241b42bd5a923b2ca7` (clean merge, no conflicts;
the PR's base `a8c0455` is 70 commits behind). Engine SHA256 `0dea552c…`. Node v22.22.0 (`.nvmrc` 22.23.3), Python 3.12 venv with
`scripts/data/requirements-movement.txt` (numpy 2.3.5, pandas 2.2.3) for the data suite; the movement report ran under Python 3.13.16.

## Why it is held
Not an operator defect, not stale source or runtime: **no one has reviewed it.** 0 reviews, 0 review threads, labels `lane:tools gap:F1 hold`,
and PLAN/GAPS only say "held". The 111 PR comments are other lanes' handoffs (pursuit panel, #263/#267, reserved-evidence transfer).
On a fresh merge with current develop everything passes, so the smallest blocker is a reviewer's sign-off on the operator contract
(`docs/reviews/turning-measurements.md`). A `hold` without a stated reason should either get one or be lifted.

| Check on develop + #255 | Result |
|---|---|
| merge | clean |
| `python -m unittest test/test_yaw_measurement.py` | 18 pass |
| `npm run test:data` (CI-pinned numpy 2.3.5) | 248 pass (develop alone: 230 pass) |
| `npx vitest run test/yaw-measurement.test.ts` | 4 pass |
| `npm run typecheck` | pass |
| simulator adapter on today's engine | runs, exit 0, `status: partial` (travel unavailable below 1 yd/s, as documented) |

Container note: with this container's numpy 2.5.3, 4 tests in `test_orientation_motion_audit.py` fail on plain develop too; they pass under the CI pin. Not #255.

## What it measures on today's engine (seed 7, 2 games, defensive LB/DB slots, 1,661 player-play paths)
Command: `node --import tsx scripts/diag/yaw-sim.ts 7 --games 2` (about 50 s; JSON stays in ignored `out/turning255/`).
Clock: recorded `frame.t`; observed step 0.1 s (p50 = p99 = max), gap intervals 0, frame-ID gaps 0, so nominal 10 Hz windows are real 0.2 s.
Rows: 108,579 eligible rows → 76,750 retained after timing/post-snap filters; 1,661 paths. Body = recorded facing; travel = position secant (unavailable below 1 yd/s: 1,150 rows).

| start speed | body rotation deg/s p50 / p90 / p99 (n adjacent pairs) | travel-direction change p50 / p90 (n) | body swing ≥90° within 0.2 s (count/n) | body vs travel opposed ≥120° (n frames); aligned <60° |
|---|---|---|---|---|
| 1–2 yd/s | 5.7 / 355.2 / 550 (11,454) | 63.9 / 218.3 (10,583) | 493/11,243 = 4.4% | 34.7% (11,597); 36.7% |
| 2–4 yd/s | 17.2 / 309.4 / 538.6 (23,184) | 42.0 / 118.7 (23,170) | 638/22,564 = 2.8% | 21.7% (23,612); 55.5% |
| 4–6 yd/s | 28.6 / 194.8 / 509.9 (16,347) | 24.7 / 66.4 (16,336) | 220/15,628 = 1.4% | 7.4% (16,784); 83.6% |
| 6+ yd/s | 17.2 / 108.9 / 315.1 (12,921) | 12.9 / 42.2 (12,919) | 11/12,114 = 0.1% | 0.1% (13,452); 98.8% |

Per-path fastest 0.2 s swing p90 (body / travel, n paths): 0–2 yd/s 518.5 / 274.1 (1,658 / 1,654); 2–4: 518.5 / 188.6; 4–6: 461.2 / 87.5 (1,399); 6+: 266.4 / 56.2 (856).
Excursion flags: 0 (n=0), so raw and "without flagged body frames" views are identical here. Partial terminal windows: 2,479 body, 3,141 travel (excluded from full-window denominators).

Reading: the body turns far faster than the travel direction at every speed, and at 2–4 yd/s about a fifth of frames have the body facing 120°+ away from where
he is moving. These are sampled orientation changes, not gaze, plants or capacity. No NFL comparison is made (no raw NFL CSVs in this workspace).
For COV-6, the operator can be used as is: per-play fast-turn counts by start speed, with the denominators above.

Not merged by this lane; the project thread decides.
