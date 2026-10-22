# Where pass pressure comes from (measurement; no engine change)

2026-10-22, branch `claude/pass-pro`, on #196 `claude/motion-checks`
(f585b203). The user asked for work on pass protection. The blocker side is
the run-game session's (`claude/run-game-v3`,
`docs/reviews/pass-protection.md`: `PASS_KICK`, `PASS_RIDE`, `QB_SETTLE`,
...). The rusher side is the run-defense session's (#190, "Interior pass
rush"). This page adds one operator and its first reading. Engine changes
wait on those owners.

## Operator

`scripts/diag/passpro/pressure.py` reads common-format plays
(`scripts/mechanics/metrics.Play`), tracked and simulated, with one code
path. Definitions are in its docstring:
- **Pressure:** a defender within 2 yd of the QB before the throw, as in
  `metrics.py`.
- **Hazard:** pressures per 0.5 s among dropbacks still clean, unthrown and
  live.
- **Rushers:** each by spot (edge or inside), with the protector he spends
  most frames within 1.5 yd of.
- **Past:** a blocked rusher is past his blocker once he is 0.3 yd nearer the
  QB.
- **Way:** where he got past, outside or inside; or still on his blocker at
  the pressure, which is the pocket driven back.
- **Rep survival:** by blocker (T, G, C).
- **Pocket:** the line's mean depth at 1, 2 and 3 s.

`scripts/diag/passpro/reps.ts` traces the sim's pass engagements: moves
tried and landed, how and when each rep ended, and when the rusher got past.

## First reading

The NFL side is 2022 weeks 1-9, 9,566 dropbacks
(`nfl_bdb2025.py --plays-out`). The sim side is the #194 candidate profile,
8 games, seed 101 (`out/mechanics/sim-C1`, 705 dropbacks). None of the
run-game session's pass flags are in it.

| | NFL | Sim |
|---|---|---|
| Pressured | 30.5% | 28.4% |
| Hazard 1.5-2.0 / 2.0-2.5 / 2.5-3.0 / 3.0-3.5 s | 1.3 / 9.6 / 21.6 / 20.3% | 2.3 / 19.9 / 15.9 / 12.9% |
| Rep holds at 2.0 / 3.0 s: tackle | 94 / 79% | 76 / 65% |
| Rep holds at 2.0 / 3.0 s: guard | 92 / 79% | 96 / 89% |
| Rep holds at 2.0 / 3.0 s: centre | 93 / 82% | 97 / 99% |
| Pressures: edge beats the tackle | 40% | 70% |
| Pressures: inside DL beats G or C | 28% | 17% |
| Way: still on the block / inside / outside / unblocked | 40 / 36 / 17 / 5% | 6 / 58 / 32 / 2% |
| Pressurer past his blocker, p50 | 2.2 s | 1.5 s |
| Edge on a tackle: at his depth / past him by 2.0 s | 24 / 7% | 27 / 22% |
| Line depth at 1 / 2 / 3 s | 1.66 / 3.82 / 5.20 | 1.22 / 3.36 / 5.46 |

- **The total hides two wrong mechanisms.** Tackles lose edge rushers too
  early. Edges reach the tackle's depth as often as tracked ones, but the
  tackle stays between him and the QB far less. Meanwhile the interior
  barely loses, and the NFL's largest pressure route, the blocker driven
  back into the QB with the rusher still on him, is nearly absent.
- **The trace (600 dropbacks, same profile).** 38% of tackle-edge reps end
  at `stepPassRep`'s `|phi| >= 1` corner beat (median 1.6 s), nearly all
  right after a failed move. This is what the run-game session's
  `PASS_RIDE` and `RIDE_FACING` address on its build. The bull rush lands in
  2-6% of its windows (the rated success roll), and a failed bull draws the
  blocker's punch back.
- **The pocket's depth is not the difference.**

## Reproduce

```sh
python3 -I scripts/mechanics/nfl_bdb2025.py --plays-out out/passpro/nfl-plays.jsonl.gz --out out/passpro/nfl-bdb2022.json
python3 -I scripts/diag/passpro/pressure.py out/passpro/nfl-plays.jsonl.gz SIM-PLAYS.jsonl.gz
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/passpro/reps.ts --n 600
```
