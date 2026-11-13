# BLOCK_RELEASE (RUN-12): a run blocker whose man leaves the play

Run Game, 2026-11-10. Flag `BLOCK_RELEASE`, off. Measured on run-ref-9 (develop 77894ef5) and the fixed 1,321-run set.

## The question

HANDS_CHEST raised the scorecard row "blocker on a man out of the play" from 108 to 123 events per 100 runs. Flex's
`run-block-ends.mts` showed the cause: the chest hands removed an accidental release (the pair twisting apart). A run
blocker had no release of his own. His blocks ended only by separation, the runner passing his man, or the whistle.

## The rule

An engaged OL, TE or FB comes off his man and takes another defender when all of these hold. He reads it from his own
picture, on his decision beat, with no timer and no knowledge of anyone's assignment.

- He is not in a live double, and his job is not a pull, lead or stalk.
- His man is more than 5 yd from the acquired runner and moving away from him.
- Another defender has no offensive body on him (as the blocker sees it), is within 3 yd of the runner and within 6 yd
  of the blocker.
- No teammate who is free of other defenders is nearer to that man.

Attempt 1 counted every nearer teammate, busy or not. It released 19 times on five seeds. Counting only teammates who
are not touching another defender gives 104.

## Results (fixed 1,321 runs)

Time per run a blocker spends on a man more than 5 yd from the runner and moving away, with a defender free within
3 yd of the runner:

| | Off | On |
|---|---|---|
| All blockers | 0.594 s | **0.544 s** (pre-HANDS_CHEST 0.543) |
| OL, nearest free man more than 6 yd away | 0.162 | 0.142 |
| OL, nearest free man 3–6 yd away | 0.151 | **0.124** |
| OL, nearest free man within 3 yd | 0.025 | 0.022 |
| WR or other, more than 6 yd | 0.156 | 0.152 |
| WR or other, 3–6 yd | 0.091 | 0.094 |

About 0.31 s of the 0.594 is a blocker more than 6 yd from the free man, and about 0.26 s is a receiver or other
blocker. No release recovers either in time to matter. The realistic ceiling for an OL or TE release is about 0.18 s
a run.

Paired yards under 20, `npm run ref:report -- --flag BLOCK_RELEASE=1` (SE in brackets):

| | Off | On | Paired |
|---|---|---|---|
| All | 3.85 | 3.82 | −0.02 (0.02) |
| OZ | | 3.13 | +0.03 (0.02) |
| IZ | 4.16 | 4.20 | +0.05 (0.04) |
| Gap | 4.28 | 4.16 | **−0.12 (0.06)** |
| Duo | 3.71 | 3.72 | +0.01 (0.09) |
| Toss | 3.71 | 3.82 | +0.11 (0.06) |
| Draw | 4.50 | 4.50 | 0 |

## The gap row

`scripts/diag/_brgap.mts` (not committed) traced the gap releases on the matched restage seeds 7–29.

| | Counter | Power | Trap |
|---|---|---|---|
| Plays with a release | 23 | 24 | 27 |
| Released from a down block | 9 | 14 | 19 |
| Released from a climb | 17 | 6 | 8 |
| Released from a cutoff | — | 8 | 8 |
| Man left was the kick target or a puller's target | 3 of 26 | 0 of 28 | 1 of 37 |

The releases do not abandon the pullers' work.

- **The suspect:** a man washed down by a down block, who looks as if he is leaving but is only being pushed.
- **The one fix attempt:** release only from a man running away at 1.5 yd/s relative, not 0.5. Down-block releases on
  gap plays fell from 42 to 32.
- **Result:** the gap row was unchanged to the decimal (4.16, 8.8% at or below 0, −0.12). So the gap loss does not come
  from washed down blocks. The attempt was reverted, and the rule stays as committed.

## Decision

Held off. It recovers the scorecard row to its pre-HANDS_CHEST level, but yards do not move, and gap runs lose 0.12
(about 2 SE) for a reason the trace has not found. The larger run-game gap is still outside zone: the back's read and
the covered-guard climbs.
