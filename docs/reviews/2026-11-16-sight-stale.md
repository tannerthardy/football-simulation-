# SIGHT_STALE: what a player believes of a man he cannot see

Integration's ruling (2026-11-16) on the stale-picture report: bound the picture of a lost man, mark it so a consumer can tell it from a sighting, and replace the never-sighted fall-back (a leak) with the pre-snap alignment. One numeric flag, off, acting inside `SIGHT_PURE=1` (#786); bits 1, 2, 4.

## What was wrong

Under SIGHT_PURE a man a player cannot see is carried on his last picture, and that picture ages and runs on its recorded velocity without bound (reads up to 9 s old). A man he has never seen since the snap was answered from the perception record's oldest sample, `perceive(1.2)`: the true position 1.15 s ago, through whatever hides him. That is delayed truth, not a belief.

## The flag (`SIGHT_STALE`, bits; `src/sim/playsim.ts` `sightedPure`, `staleOf`)

| bit | what | source |
|---|---|---|
| 1 | a lost man is carried on his last velocity for the record's length (`(HISTORY-1)·dt` = 1.15 s, counted from the moment he was seen, the picture's own age included) and then held | the record's length, no fitted horizon |
| 2 | a picture older than the reader's own delay carries `Perceived.stale = true` and `spread = STALE_SPREAD · (age − own delay)` | `STALE_SPREAD = 2` yd/s, a stated choice; no consumer reads `spread`, so it moves nothing |
| 4 | a man not seen since the snap is believed where he lined up (the first record), on the velocity he had then for the record's length, then held, marked stale (with bit 2) | every player saw the alignment |

Bit 4 holds the alignment guess regardless of bit 1. `Perceived` gains two optional fields; with the flag off nothing changes (byte identity is SIGHT_PURE's own; with SIGHT_PURE off the flag does nothing).

## Staged read 1: who reads an old picture (30 run plays, seed-11 set, 2.73 M reads; `scripts/diag/effective-mass/stale-reads.mts`)

With SIGHT_PURE on and SIGHT_STALE=0: 32,326 reads (1.18%) are older than 1 s, 4,992 older than 3 s. By site, the largest in count:

| reader, site | reads | older than 1 s | share | age p50 / p90 | off the man p50 / p90 |
|---|---|---|---|---|---|
| defender, `possession-read.observedHolder` | 767,516 | 9,293 | 1.2% | 1.2 / 3.8 s | 0.8 / 4.7 yd |
| defender, `Recognition.cues` | 196,327 | 4,820 | 2.5% | 1.2 / 4.5 s | 1.0 / 5.4 yd |
| defender, `breakdownForContact` and `seenDown` | 125,432 | 2,518 | 2.0% | 1.2 / 3.8 s | 0.7 / 4.0 yd |
| carrier, `possession-read.observedHolder` | 21,758 | 2,404 | 11.1% | 1.8 / 4.5 s | 2.3 / 7.5 yd |
| carrier, `BallCarrier.trafficTempo` | 12,452 | 2,121 | 17.0% | 2.1 / 4.3 s | 3.1 / 9.0 yd |
| carrier, `carrier.ts` (other) | 52,414 | 2,155 | 4.1% | 2.1 / 4.1 s | 3.0 / 8.7 yd |

`arrivalEvidence` is not among the fourteen sites with the most old reads. The carrier is where old pictures are common (11 to 17% of his reads of defenders at those two sites); a defender's old reads are 1 to 2.5%.

## Staged read 2: stale reads by bit (same plays)

| SIGHT_STALE | reads older than 1 s | older than 3 s | marked stale | carrier `trafficTempo` off the man p50 / p90 |
|---|---|---|---|---|
| 0 | 32,326 | 4,992 | 0 | 3.1 / 9.0 yd |
| 1 | 33,675 | 5,643 | 0 | 3.2 / 9.2 yd |
| 2 | 32,326 | 4,992 | 195,697 | 3.1 / 9.0 yd |
| 4 | 32,327 | 8,165 | 0 | 3.1 / 9.0 yd |
| 7 | 33,676 | 8,671 | 219,322 | 3.2 / 9.2 yd |

(Different bits send the plays down different paths, so the totals are not the same reads; bit 2 changes no read's position and its row is the same run as 0.) The marker lands on about 7% of all reads: a read older than the reader's own delay is common (a defender whose man steps out of view for a few ticks). The error of the marked ones is small (p50 0.3, p90 1.1 yd for defenders; carrier `trafficTempo` 0.8 / 5.1).

Holding (bit 1) does not make the carrier's read of a lost defender closer to him: the defender behind a carrier keeps running, so a held guess is as far off as a carried one (3.1 / 9.0 to 3.2 / 9.2 yd). What it removes is the unbounded carry, not the error.

## Bit 4 against the leak (20 plays, `scripts/diag/effective-mass/stale-reads.mts` and a probe of the two guesses)

Before 1.2 s into the play the record's oldest sample is the alignment, so the two answers are identical: 11,805 of 12,208 never-sighted reads in 20 plays are there. After it, 403 reads (385 defenders, 18 carriers) differ:

| reader | after 1.2 s, n | leak p50 / p90 off the man | alignment + hold p50 / p90 |
|---|---|---|---|
| defender | 385 | 1.4 / 2.1 yd | 2.3 / 5.1 yd |
| carrier | 18 | 0.3 / 2.5 yd | 0.4 / 2.5 yd |

The honest guess is worse than the leak because the leak knew where the man was. That is the point of removing it, and it concerns about 3% of never-sighted reads. In the 30-play set bit 4 answers 3,322 reads of `Recognition.cues`, 6,908 of `observedHolder` (defender), 935 of the carrier's `observedHolder`, of which 131, 107 and 19 are after 1.2 s.

## Gates

- Query-order invariance with every bit on: a run play with extra sight questions after every tick is unchanged (`test/sight-stale.test.ts`; the SIGHT_PURE tests are unchanged).
- Unit: off, a lost man runs on without bound and is unmarked; bit 1 stops him at the record's length; bit 2 marks him with a growing spread.
- Run set (1,438 plays, seed 7 to 29 run-only games), paired, capped yards: SIGHT_PURE against SIGHT_PURE with bit 1 +0.004 (SE 0.011), bit 4 +0.031 (0.015), bits 1+2+4 +0.031 (0.018); bit 2 alone changes nothing (identical to SIGHT_PURE). Against the engine default (SIGHT_PURE off): −0.01 (SE 0.08) for SIGHT_PURE alone, +0.02 (0.08) with bits 1+2+4. Stuffs (≤ 0 yd) 15.2% (default), 15.2% (SIGHT_PURE), 15.0% (all bits). Plays changed by bits 1 / 4 / 1+2+4: 129 / 51 / 175 of 1,438. Missed tackles per run 0.188 and broken 0.095, the same with and without. Fumbles 32 (default), 25 (SIGHT_PURE), 24 to 25 with any bit (run plays only).
- Dither panel (135 plays, all bits on): every controller and stage inside its budget, smallest slack 0.0049 (coverage mode switch); the carrier 0.338 against 0.437.

## Who should ignore a stale picture

No consumer does yet; `stale` is only readable. The question this raises is not whether a carrier should ignore a lost defender (he has nothing better) but whether `trafficTempo` should treat a stale one as less certain than a sighted one, which needs a consumer change (Rules' lane), not another bit here. In this run set the bits move nothing a run play shows, so there is no evidence yet that any consumer needs it.

## Not measured

Pass plays (the QB's and receivers' reads are not in the run set), yards after contact (not in the replay output), `arrivalEvidence` (outside the top sites), and the scorecard.
