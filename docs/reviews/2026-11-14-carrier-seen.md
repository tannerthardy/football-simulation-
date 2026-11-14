# CARRIER_SEEN: the ball carrier's information leaks (2026-11-14)

Run Game lane, at Integration's request. The user's standing rule: "EVERY TIME
WE FIND INFORMATION CHEATING REMOVE IT AND FIGURE OUT A SOLUTION EVERY TIME".

The rows are the "Ball carrier" section of
`docs/reviews/2026-11-13-information-leak-sweep.md`.

## The build (one flag, off)

`CARRIER_SEEN=1` replaces each true-state read with what the back sees, using
existing perception:
- `sim.see()` positions and poses;
- seen contact (`src/sim/seen-contact.ts`: `seenEngaged`, `seenEngagedWith`).

`CARRIER_SEEN_ROWS` (diagnostic) selects rows for measurement.

| Row | Where | Was | Now |
|---|---|---|---|
| keys | `run-read.ts` readKeys and the re-key | `sim.engagements` names the blocker on his key | the offensive body he sees in contact with his key |
| risk | `entryRisk` | `d.engagement` adds 0.35 s | a defender he sees in contact adds 0.35 s |
| unsafe | the read's `unsafe` | `d.isDown` / `d.engagement` | a defender he sees down, rising or in contact is not a closing threat |
| down | readKeys, entryRisk, key gone | true `isDown` | seen pose down or rising |
| duo | `assign.ts` onHandoff | duo read key from true positions | from where he sees the box backers at the handoff |
| squeeze | `carrier.ts` command | squeeze-gap bodies filtered by true `isDown` | the bodies he sees on their feet |

## Read

All arms use the fresh run set (1,295 runs, `npm run ref:report -- --set fresh`),
branch `run/G3-oz-backfield` at 93966dee (develop engine-61 merged) plus this
change.

**On the reference stack** (engine-61, where `RUN_READ` is off):
- With `CARRIER_SEEN=1`, the yards change on 1% of plays. The paired delta is
  +0.00 for every family; missed + broken stays 0.265 a run.
- Placebo floor (2 arms, 0.05 yd nudge): all-runs mean −0.01, RMS 0.02. Those arms
  change 93–94% of plays.
- On this stack only the duo and squeeze rows run; the four run-read rows sit
  behind `RUN_READ`.

**With the run read on** (`RUN_READ=1` alone vs `RUN_READ=1` plus
`CARRIER_SEEN=1`, paired): 75 of 1,295 plays change (5.8%):
- inside zone 21/227, wide zone 27/182, outside zone 21/161;
- trap 3/147, counter 2/151, draw 1/92;
- none on power, duo, toss or split zone.

| Family | Yards per run, RUN_READ | Plus CARRIER_SEEN | Paired (SE) |
|---|---|---|---|
| OZ | 2.30 | 2.21 | −0.09 (0.05) |
| IZ | 2.65 | 2.67 | +0.02 (0.03) |
| All | 3.20 | 3.18 | −0.02 (0.01) |

Missed + broken tackles stay at 0.259 a run in both arms.

## Reading

- Removing the leaks costs almost nothing. The back's seen picture of who is
  engaged and who is down matches the record closely enough that his read rarely
  changes.
- Where it does change (zone reads, 6% of runs with the read on), the outside-zone
  difference is −0.09 yd. That is about 2 SE, and inside the stack's placebo spread
  for outside zone (RMS 0.19).
- Nothing in the behaviour argues against turning it on. It is ready to be the
  default (`!== '0'`) when Integration lands it.

## Not done

- The hole-choice and cut operators replay the main run set, not the fresh one, so
  they were not run here. On the reference stack there is nothing for them to see
  (+0.00).
- The rows outside this section (`carrier.ts:438` QB slide, `tackle.ts` target set)
  belong to the QB lane and the tackle owner.
