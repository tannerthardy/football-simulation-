# CATCH_CHOICE: where on the ball's path he plays it (parked)

C14 catch, 2026-11-12, engine-44 (develop 3081064c). Flag `CATCH_CHOICE`, off. Branch `coverage/C14-catch-choice`, no
PR. Parked by Integration: right mechanism, blocked by two named gaps. Supersedes `IN_STRIDE_CATCH` when it lands.

## Why

The default `TrackBall` takes `catchSpot()`, the earliest reachable point on the path (the first sample under 0.92 of
his max catch height), and paces to arrive there on time.

On forced outside go balls (`scripts/diag/risk/forced-meet.ts`, n 211, Rules+Coaching's selection):

- He could reach the QB's aim in stride by its arrival 96% of the time.
- Yet he braked from 8.3 to 6.7 yd/s and met the ball 0.16 s early, 1.6 yd short of the aim and 2.96 yd high (chest 2.06).

That is the high point as a default, not a choice.

## What

`src/sim/catch-choice.ts`:

- **The candidates:** the reachable segment of the path, from the earliest point to the latest point with the ball at or above his shoulders (0.82 × his height, estimated).
- **The choice:** he plays the latest point the two nearest defenders, as he sees them, cannot reach 0.1 s before the ball. Otherwise he plays the point with the best margin.
- **Judgment:** one error per throw on those margins, sd 0.1 + 0.2 × (1 − ball tracking) s.
- **Timing:** re-read every 0.1 s, committed in the last 0.3 s.

A first cut ended the segment at the knees (0.5 yd), and he played balls at waist height. Nothing in `catching.ts` charges a ball between 0.5 yd and his head.

Test `test/catch-choice.test.ts`. It stubs the reference stack's 'on' flags, because in the legacy-pinned engine the defenders leave no safe later point and the choice stays early.

## Read

**Forced bench, off → on:**

| | off | on |
|---|---|---|
| meets the ball before the planned arrival | 0.16 s | 0.09 s |
| distance from the aim along the throw | −1.58 yd | −0.20 yd |
| ball height | 2.96 | 2.00 |
| speed at the meeting | 6.67 | 6.89 |
| defender at the meeting | 1.43 yd | 1.76 yd |
| completion | 52% | 58% |
| misses / drops | 30 / 8 | 7 / 22 |

**Games** (seeds 11 / 23, 8 games each):

| | seed 11 off → on | seed 23 off → on | NFL |
|---|---|---|---|
| deep man 0–2 yd completion | 42 → 55% | 50 → 71% | 32% |
| carried past | 8 → 0% | 5 → 0% | 27% |
| speed at arrival | 5.2 → 4.8 | 5.6 → 5.3 | 6.9 |
| intermediate zone yd/att | 8.77 → 9.61 | 8.27 → 10.02 | 6.85 |
| short zone yd/att | 6.98 → 6.00 | 8.87 → 8.14 | 5.42 |

## Blocked by

- **(a) The catch at speed.** Over the shoulder at speed is barely harder in `catching.ts`: the `shoulder` term is +0.12 to +0.24 difficulty, only above 6.5 yd/s. Keeping his separation then just adds completions. Coverage, next.
- **(b) Natural deep throws.** They land short of his held-from-release spot by more than 1 yd 69–70% of the time, so in games he correctly comes back. Rules+Coaching.

The underneath cost is the IN_STRIDE pattern, until Defense's catch-to-pursuit seam (CATCH_CARRY) lands.
