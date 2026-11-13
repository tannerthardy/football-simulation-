# BLOCK_SEEN: the QB feels a block only from what he sees (2026-11-12)

Flag: `BLOCK_SEEN`, off. It is QB_FEEL's perception half on its own flag, without the pocket move, in
`src/sim/behaviors/qb.ts` (`held` → `seenHold`).

## Rule

A rusher is held only by an offensive body the QB sees in contact with him and on his path. Contact means within
arm's length: the blocker's reach plus the rusher's radius.

The time added is the way around that body: `(0.2 + (width − off)/2)`, scaled by pocket presence. That is the same
geometry QB_FEEL already used.

What the rule no longer reads: the sim's engagement record and its private win score.

Off (the engine-32 default):
- `held()` credits any engaged rusher 0.35–1.75 s from `engagement.win`.
- That credit grows as the score falls while the rusher closes.
- With the flag off the engine is bit-identical (export hash, seed 999).

## The repro, checked first

Rules + Coaching's setup: hitches vs Cover 2, seed 2 flipped, roster 2, `READ_PLAN=1 BACK_RELEASE=1`, on
`rules/read-compiler-p1` at 44c01eff. `scripts/diag/effective-mass/feel-trace.mts` traces it.

The free strong-side end is not credited any block. `held` is 0 and he is not engaged.

His estimate still rises from 0.76 s to 1.95 s while he stands 1.6 yd away:
- **What the end is doing.** He is running past the QB at 5–6 yd/s with almost no closing speed: the QB slid off
  his path.
- **What the QB sees.** His picture is 0.25–0.3 s old and extrapolated at constant velocity. During the end's turn
  back it shows him moving away at up to 3.4 yd/s, and it is 0.4–0.75 yd off his true position.
- **The resulting error.** The estimate pays a brake-and-return penalty on that stale velocity: 1.95 s, against a
  true time of 0.85 s.

So this case is the age of the picture of a body changing direction. It is not a stale engagement, and BLOCK_SEEN
does not change it.

Two candidate repairs, neither built:
1. `pressure()` uses the picture carried forward with the acceleration he has seen. That already exists as
   `feltClosing` under SET_DECIDE.
2. A coached rule: an unblocked man inside ~2 yd is a hit now, whatever his closing speed. It is observable:
   unblocked and near.

The overrun itself (the end's path past a sliding QB) is the rush's business, for Defense.

A stale engagement does occur on develop: a game showed the engagement record outliving body contact. With an
arm's-length test that is rare (10 of 466 engaged samples within 3 yd), and BLOCK_SEEN ignores it.

On develop with only `BACK_RELEASE=1` (roster 2), the play does not reproduce: he throws at 2.4 s.

Fixture: `test/block-seen.test.ts`, on the repro with roster 7, where the strong-side end is engaged.
- Off: the end inside 3 yd is credited more than 1 s.
- On: at most a body width.
- A blocker seen beyond arm's length holds nothing, even though the sim still has the pair engaged.

## Paired read (engine-32, sim-export seeds 201 and 301, 16 games each)

The first two rows come from `feel-games.mts`, seed 201, 8 games.

| | off 201 | on 201 | off 301 | on 301 |
|---|---|---|---|---|
| estimate − true, rushers within 3 yd, p25/p50/p75 (s) | 0.25 / 1.28 / 1.57 | 0.14 / 0.22 / 0.32 | | |
| … engaged rushers (s) | 1.26 / 1.48 / 1.65 | 0.16 / 0.24 / 0.34 | | |
| a rusher truly ≤0.5 s away, felt ≤0.5 s by then | 3% | 6% | | |
| time to throw p50 (s) | 2.70 | 2.65 | 2.65 | 2.60 |
| defender within 1 yd before release | 11.9% | 8.7% | 16.2% | 13.2% |
| sacks (dropbacks) | 3.6% | 3.2% | 5.9% | 5.8% |
| sack / throw / scramble after contact | 24 / 70 / 6% | 27 / 72 / 1% | 31 / 66 / 3% | 36 / 63 / 1% |
| hit throws completed (n) | 58% (117) | 54% (91) | 45% (154) | 44% (112) |
| hit throws to a tight target | 26% | 16% | 23% | 22% |
| completion, all throws | 68.4% | 66.0% | 65.9% | 68.2% |
| interceptions | 2.2% | 1.9% | 2.2% | 2.6% |
| target is a back | 17.4% | 15.8% | 18.0% | 16.2% |

Reading:
1. **The estimate is repaired.** It was 1.3–1.5 s long for rushers in his lap and is now 0.2 s, about the age of
   his picture.
2. **He gets the ball out a little earlier.** Fewer rushers reach him before the release (−3 points on both
   seeds), and time to throw falls by 0.05 s.
3. **Sacks barely move.** He still almost never feels the imminent man in time (6%). The rest of the error is the
   picture's age, as in the repro; that is candidate repair 1 above.
4. **Scrambles after contact fall to 1%,** because the hot path now fires earlier. That is the SET_DECIDE /
   movement question, which stays parked.
5. **The back's share of targets falls** by 1.6–1.8 points, probably because he throws earlier, before the back's
   release. Completion and interceptions move within noise.

## Pacing a rusher in contact (2026-11-12)

Found by Rules + Coaching's READ_PLAN key-read fixture (`test/read-plan.test.ts`, corner_flat vs Cover 2, seed 3):
- DE_W is in his blocker's hands, ridden from beside (0.7–1.35 yd off, not on his path) and driving.
- BLOCK_SEEN read him as a fresh sprint at a standing QB: 0.56–0.63 s, where his actual arrival was about 0.9–1.3 s.
- QB_RHYTHM's pressure jump then took the QB's eyes off a ready, open flat, and he threw at 2.85 s instead of 2.15 s.

The gap the rusher closes is smaller than his speed toward the QB, because the QB drifts back.

Rule: a rusher with any blocker within arm's length is paced. His felt time is at least (distance − 0.8) ÷ his closing
speed (his seen velocity toward the QB less the QB's own, floor 0.5 yd/s, capped at 3 s). The path geometry's "way
round the body" still applies on top.

Results:
- The fixture's flat comes on rhythm at 2.15 s, and `read-plan.test.ts` passes with BLOCK_SEEN off and on.
- New bull-rush fixture in `test/block-seen.test.ts`: a rusher driving his blocker back at 3 yd/s is paced at that
  rate, not read as a sprint.

`feel-games.mts`, seed 201, 8 games. Estimate − realized arrival (centre within 1.3 yd while he holds the ball;
rushers who arrived within 2 s), p25/p50/p75, by rush type as the QB sees it:

| rush type | off | on |
|---|---|---|
| through a blocker on his path | 1.02 / 1.39 / 1.62 (n 169) | 0.15 / 0.43 / 0.79 (n 286) |
| ridden beside a blocker | 0.27 / 0.45 / 1.02 (n 262) | 0.26 / 0.39 / 1.19 (n 296) |
| free | 0.23 / 0.39 / 0.85 (n 491) | 0.19 / 0.30 / 0.53 (n 479) |

All medians are positive by construction: the estimate is to 0.8 yd, the arrival to 1.3 yd. No rush type now reads
early. Sacks in these 8 games: 34 off, 25 on.
