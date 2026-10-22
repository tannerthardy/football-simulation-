# The A-gap man's spot (`AGAP_ALIGN`), ported to `claude/run-game-v3`

2026-10-22. This is a port of #196's `AGAP_ALIGN` (f614f3d5) onto the
shared build, without #194/#196's team-habit plumbing (`alignStyle`). The
full write-up is in #196's `docs/reviews/defensive-alignment.md` §7. Default
off; identical when off.

**Question** (from the run-game session): on runs the sim's centre is
covered at the snap, meaning a front man is within 1 yd of him laterally,
far more often than tracked. Is that the calling mix or the alignment within
a front?

**Answer.** It is the alignment.
- `FRONT_ALIGN` put the 1 technique on the centre's shoulder (0.57 yd).
- The tracked A-gap man in a 4-down over/under stands a median 0.69 of the
  centre-guard split off the centre, about 1.0 yd.
- That spot is mostly the team's habit:
  - team medians run from 0.30 (NYG, a shade on the centre) to 0.82 (PHI,
    a 2i on the guard), sd 0.14;
  - weight moves it only -0.017 per 10 lb;
  - down, personnel and run or pass move the median by under 0.06.

**Rule.** With `FRONT_ALIGN`, a lineman's 1 technique stands at his team's
share of the centre-guard split as set. The share comes from
`aGapHabit(team)` (`league/team.ts`): N(0.63, 0.14), clamped to 0.30-0.85
and seeded by the team id. It reaches the sim as `PlaySetup.aGap`, which
`Game` passes. A defense without a habit, such as lab scenes, uses 0.63.
The gap is unchanged.

**Evidence.** Snap frames over 6,000 2022 situations on this branch's
pinned profile (`OL_ALIGN` on). The operator is `scripts/diag/align/deflook.py`,
with `sim_snapframe.ts` as the sim extract. Tracked: 2022 BDB weeks 1-9.

| | Over, centre covered | Under, centre covered | Runs in over/under | A-gap share p10/50/90 |
|---|---|---|---|---|
| tracked | 48% | 51% | 56% | 0.33/0.69/0.91 |
| off | 87% | 98% | 93% | 0.27/0.39/0.64 |
| `AGAP_ALIGN` | 54% | 55% | 55% | 0.48/0.63/0.81 |

The spread is narrower than tracked because within-team scatter (sd 0.23)
is not drawn.

**Tests.**
- New: `test/agap-align.test.ts`, covering both lines (`OL_ALIGN` 0 and 1)
  and the team habit.
- Pin: `kick-log`'s recorded counter scene holds the flag off. With the 1
  technique in the gap, the over3 kicker never meets the end.
- Core: 2,969/2,969 plain, and 2,969/2,969 under the profile with
  `AGAP_ALIGN=1`.

**Reproduce.**

```sh
node scripts/baseline.mjs --candidate --flag AGAP_ALIGN=1 -- \
  node --import tsx scripts/diag/align/sim_snapframe.ts --n 6000 --out out/align/sim-on.csv.gz
python3 -I scripts/diag/align/deflook.py out/align/nfl-snap.csv.gz out/align/sim-on.csv.gz --by fam
```

The tracked extract comes from #196's `scripts/diag/align/nfl_snapframe.py`,
which reads raw data from `data/raw`.
