# SET_DECIDE clean read (set phase only; no drop hook; BLOCK_SEEN off; 2026-11-11)

**Population.**
- League sim-export, seeds 201 and 301, 16 games each, off against `SET_DECIDE=1`, base engine-26 (THROW_BODY on).
- throw-path, IRN v COM, 16 games per arm.
- Same seeds in both arms; the games diverge after the first changed play.
- NFL: BDB 2025, pocket dropbacks, same operators.

| | seed 201 off → on | seed 301 off → on | NFL |
|---|---|---|---|
| Rusher at 1 yd: throw / sack / scramble | 65 / 34 / 2 → **44 / 50 / 6** | 71 / 26 / 3 → **38 / 52 / 10** | 29 / 49 / 22 |
| Sacks, all dropbacks | 6% → **9%** | 7% → **11%** | 7% |
| No throw | 8.0 → 12.2% | 8.2 → 15.9% | 11.0% |
| Throws after contact, complete / yd/att | 35% / 5.4 → 51% / 7.3 | 43% / 5.6 → 49% / 7.8 | 33% / 4.5 |
| Clean throws, complete / yd/att | 63% / 9.7 → 63% / 10.2 | 63% / 8.8 → 64% / 8.7 | |
| Clean ends outside (drift) | 1 → 2% | 1 → 3% | 13% (no rusher near) |
| Scramble yards p50 | 7.5 → 7.5 | 7.7 → 8.8 | 7.5 |
| YAC mean | 7.00 → 7.90 (± 0.45) | 5.96 → 5.66 (± 0.36) | |

**throw-path** (16 games per arm):

| | off | on |
|---|---|---|
| Rhythm | 223 (65% / 8.7) | 253 (67% / 9.1) |
| Current read | 783 (59% / 9.4) | 713 (60% / 9.5) |
| Outlet | 163 (58% / 6.9) | 146 (59% / 8.0) |
| Out of reads | 51 (49% / 8.1) | 61 (43% / 4.5) |
| Hot / panic | **75** (40% / 6.5) | **13** (31% / 1.9) |
| No throw: sack / scramble / fumble | 61 / 36 / 9 | 102 / 84 / 5 |

- Stuck plays: none in either arm. The fumbles are strip-sacks.
- Refused throws: 88 on 34 plays. Those plays then went sack 17, out of reads 8, current read 4, hot path 3, scramble 2.
- Outlet throws 163 → 146: the plays that lose one mostly go to a later read or the hot path, or the refused-throw plays above.

**Verdict.**
- Panic throws go away (75 → 13); rhythm and clean throws are untouched.
- At contact the throw / sack / scramble split moves toward the NFL on both seeds.
- **But** overall sacks overshoot the NFL (9% and 11% against 7%). The panic throws he no longer makes become sacks, because he has no movement to escape with: ends-outside with a rusher at 1 yd is 4–11% against 40%.
- The remaining hit throws are on-time throws hit in the delivery, completing 49–51% against the NFL's 33%.
- So the decision structure alone is **not a standalone candidate**. Its overshoot is what the missing movement should absorb. Promote it together with a movement that reads.
