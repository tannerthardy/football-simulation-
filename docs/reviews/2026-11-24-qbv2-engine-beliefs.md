# QB_V2: beliefs measured from our engine

QB lane, 2026-11-24. Integration's ruling: the passer's beliefs about what our world does are measured in our world,
listed here with their sample sizes, and re-measured when the catch model and the coverage fixes land. The values
live in `src/sim/qbv2/judge.ts` and `src/sim/qbv2/drive.ts`; this page is the index.

All measurements come from the staged cells. The probe is `scripts/diag/qbv2/stage.ts`, with one mid passer (ratings
60, experience 4) and 30-60 seeds per cell. The eight cells:

- quick outs vs cover3, cover2 squat, cover1 and cover2man;
- slant-flat vs cover3 and cover1;
- stick vs cover3 and cover2.

## Measured values

| Belief | Value | Measured as | n | Round | Re-measure when |
|---|---|---|---|---|---|
| `RUSH_BAT`: a rusher in the ball's low path bats it | 0.02 | throws batted by rushers per rusher-in-lane case | 7 of 377 | cal12 | Defense's rush or batting change |
| `PICK_OF_PLAY`: a play on the ball is caught (every role, × (0.5 + ball skills)) | 0.18 | picks per defender play (pbu, deflection, interception) | 18 of 103 | cal12 + cal14 | the catch model; coverage fixes |
| `CATCH_CLEAN`: a throw no defender plays is caught | 0.82 | completions among throws with no defender play | 165 of 202 | cal14 | Tools' catch fix: replace with the catch model's own estimate |
| `catchFrom` (replaces `CATCH_CLEAN`): his clean-catch belief from his own arm | IN 0.95 within `CATCH_ADJUST` 1.0 yd of his aim, OUT 0.77 beyond; the spread is `PLACE_REAL` 0.82 × his missSigma | completion of undefended throws by ball-to-aim distance; real release error against his believed missSigma (medians 0.66/0.54/0.48 yd against 0.81/0.68/0.57) | 475 throws, 35/60/88 passers, the candidate (QUICK_DRIFT=3); was 1.5 / 0.90 / 0.58 on 152 bit-1 throws | panel3 | Tools' catch fix (the receiver's adjust radius); a change to the throw's error model |
| `UNSEEN_DRIFT`: an unseen man's velocity change | 2.5 yd/s² | chosen, then checked on the role calibration rows | role rows, cal11 | cal11 | the perception changes |

## Still stated, not measured

`PLAY_BREAKUP` 0.6, `LANE_PLAY` 0.12 and `LANE_PLAY_BLIND` 0.2 come from the engine's own `defenderPlay`
probabilities, not from a count.

## Not used as a base

- **Picks per arrival at the point:** the earlier `PICK_IN_FRONT` base. Most plays come from defenders 1.5-5 yd off
  the point at the release (cal12).
- **The NFL's batted-ball rate:** the belief is our engine's, not the NFL's.

## Calibration at the last round

cal16, 239 throws:

- **Completion:** believed 0.75, actual 0.69. By believed P bin:

  | Believed P bin | n | Believed | Actual |
  |---|---|---|---|
  | < 0.65 | 8 | 0.62 | 0.75 |
  | 0.65–0.75 | 96 | 0.71 | 0.65 |
  | 0.75+ | 135 | 0.79 | 0.72 |

- **Interceptions:** believed 0.016, actual 0.033 (8 of 239).
- **Plays on the ball:** believed 0.115 of throws, actual 0.155 (cal14).
- **Open:** the flat thrown at a corner sitting 1-2.4 yd from its point (stick vs cover2, 2 of 10 caught). D rates him
  0.03-0.43 to arrive.
