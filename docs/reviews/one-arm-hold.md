# One-arm hold: a grab from inside a block

Main Engine, 2026-11-06. Develop `9a19ced9`. Restage captures for seeds 7–8
(`b5cf5276`, `87ebf3d8`), restage environment `54199f26`.

## Question

Run Game reported this on outside zone (OZ), NFL vs sim with the same code:
- A blocked play-side DL makes first contact on 26% of NFL runs and 51% of sim
  runs.
- The back gains 2.6 yd after that contact in the NFL and 1.3 in the sim.
- Even grips of 0.08–0.2 take a 5–6 yd/s back under 1 yd/s within 0.5 s.

Does a grab made with one free arm from inside a block behave like a full
wrap?

## What the code did (`src/sim/tackle.ts`)

- **Contact quality.** It is normalized to the engaged reach's own short arm
  range. A back passing close to the free shoulder therefore scores q ≈ 1,
  the same as a form tackle.
- **Hold.** The hold base is about 0.8. The grip is `gripForce(d, quality)`,
  which gives a locked-wrap term and two hands.
- **The block.** `grasp()` dissolved the block at the grab. On seeds 7–8, all
  37 held grabs became two-armed wraps within 0.1 s.

In football the blocker's hands stay on him because he chose to tackle, and
one arm cannot lock around a body.

## Change: `ONE_ARM_HOLD` (default on)

A grab from inside a block:
- holds with one hand and no locked wrap (`gripForce(…, lock 0, hands 1)`);
- keeps the block;
- gets the second arm only once he is off the block and his arms' span has
  closed to within 0.15 yd of the torsos touching.

The carrier's request is unchanged: it stays 9.5 yd/s at +0.25 s after the
grab either way. The slowing is the hold.

## Evidence

**Block grabs that make first contact** (`scripts/diag/_blockgrab.mts`, seeds
7–8, n 38):

| | Off | On |
|---|---|---|
| Yards after, p25/50/75/90 | 0.5/1.2/1.9/4.1 | 0.8/1.6/3.4/6.3 |
| Hold broke | 3% | 29% |
| Second arm around | 37/37 within 0.1 s | 6/27 held, p50 0.5 s |
| Carrier speed at +0.25 s (5.1 at the grab) | 2.7 | 3.7 |

**Matched restage**, k = 5, 1415 replays, paired, snap-clustered SE:

| | Off | On | Paired d |
|---|---|---|---|
| All | 7.94 | 8.11 | +0.17 ± 0.04 |
| Runs | 5.10 | 5.61 | **+0.51 ± 0.09** |
| Passes | 9.59 | 9.57 | −0.02 ± 0.03 |

- Run yards p25/50/75/90 go from 0.5/2.2/5.4/11.2 to 0.8/2.8/6.2/11.5.
- Losses (≤ 0) go from 18% to 14%; runs of 10+ yd from 12% to 13%.
- Broken-tackle events on runs: 64 → 136.
- Touchdowns: 138 → 141.
- Rows sha: off `100f3b7f559edb42`, on `b71c0ba23cf69edc`.

This is a material run change, explained by the mechanism. The doubling of
broken tackles is the risk to judge against NFL broken and missed tackle
rates before promotion. Run Game will rerun its OZ operator on its own
snaps, which is the matched football measure.

## Tests

`npm test` 3741/3741, typecheck clean.
- `pursuit-contact`: "a wrapped defender releases his block" now asserts the
  one-arm hold, the kept block and the one-hand capacity.
- `tackle-wait-constraints`: the grab-off-a-block case asserts the kept block.
- `line-read`: the late backside box set adds I-Form Pro counter seed 8, so
  the guard stays exercised. It passes with the flag on and off.
