# FREE_BOUND: a free man near him is a hit soon (2026-11-12)

Flag: `FREE_BOUND`, off. Code: `src/sim/behaviors/qb.ts` (`freeBound`, used in `pressure`). With the flag off the
engine is bit-identical (export hash, seed 999).

## Rule

It applies to a rusher the QB sees unblocked (no offensive body within arm's length of him) and within 3 yd. For
that rusher, his felt time is at most how soon the man could hit him:
- a typical rusher's burst of 5 yd/s², from where the QB sees him, to within a hand (1.0 yd) of the QB's body;
- any speed toward the QB counts as a head start;
- the old picture's speed away or across is not counted against the rusher.

The constants are a QB's-eye estimate, not the rusher's ratings, and are not fitted to sacks or yards. For a man
behind his shoulder, poor pocket presence applies the bound up to 0.5 s late.

Fixture: `test/free-bound.test.ts`, with the repro geometry built directly.
- Setup: a free end 1.6–1.9 yd away, moving across at 5–6 yd/s and away at 2 yd/s, on a picture 0.3 s old.
- On: under 0.5 s. Off: 1–2 s.
- A man in a block isn't bounded, and nothing changes beyond 3 yd.

## Paired read (engine-34; BLOCK_SEEN off on both sides)

Sim-export seeds 201 and 301, 16 games each. The estimate columns come from `feel-games.mts`, seed 201, 8 games; with
the flag on, the estimate is the one `pressure()` itself uses.

| | off | on |
|---|---|---|
| estimate − true, unblocked rushers within 3 yd, p25/p50/p75 (s) | 0.08 / 0.17 / 0.24 | −0.09 / 0.07 / 0.19 |
| … estimate more than 0.5 s long | 5% | 0% |
| … estimate more than 0.3 s short (he expects the hit sooner than it can come) | 0% | 10% |
| a rusher truly ≤0.5 s away, felt ≤0.5 s by then | 2% | 14% |
| sacks, dropbacks (201 / 301) | 3.9 / 6.4% | 2.0 / 3.6% |
| defender within 1 yd before release | 12.0 / 15.3% | 9.0 / 11.6% |
| time to throw p50 | 2.65 / 2.65 s | 2.60 / 2.60 s |
| hit throws completed (n) | 54% (126) / 39% (140) | 51% (94) / 46% (112) |
| interceptions, all throws | 2.2 / 2.2% | 2.3 / 2.1% |
| completion, all throws | 65.1 / 66.4% | 64.8 / 67.0% |
| target is a back | 18.1 / 17.2% | 19.8 / 23.6% |

Reading:
- The long tail of a free man read as far away is gone.
- He feels the imminent man in time 7× as often.
- Sacks fall by 40–50% on both seeds, with time to throw down 0.05 s.
- More balls go to the back: the outlet under pressure.
- Expecting the hit too soon is new and intended, since the bound is a "could". It shows on 10% of free-rusher
  samples.
