# SIGHT_BALL staged (Flex, 2026-11-25)

`scripts/diag/coverage/sight-ball-stage.mts` on develop 7585be04f, 5 cells x 12 seeds.

## BALL_EST=2049 (estimator for both sides), SIGHT_BALL=0

glimpse vs sawAt (ball): agree 56742, disagree 0
estimator samples taken: offense 814, defense 1487
| defender tracking the flight | ticks | seenReady (has an estimate) | seesBall (sees it now) |
|---|---|---|---|
| head 30-90 deg off | 1437 | 28% | 1% |
| head within 30 deg of the ball | 3379 | 75% | 22% |
| head over 90 deg off | 291 | 20% | 1% |

## BALL_EST=2049, SIGHT_BALL=1

glimpse vs sawAt (ball): agree 56742, disagree 0
estimator samples taken: offense 813, defense 1404
| defender tracking the flight | ticks | seenReady (has an estimate) | seesBall (sees it now) |
|---|---|---|---|
| head 30-90 deg off | 1402 | 28% | 1% |
| head within 30 deg of the ball | 3322 | 74% | 21% |
| head over 90 deg off | 288 | 22% | 2% |

## Default BALL_EST=6145 (receivers only)

SIGHT_BALL=0: estimator samples taken: offense 824, defense 0
SIGHT_BALL=1: estimator samples taken: offense 824, defense 0

The head-off bins use the recorded head (else facing); the estimator keeps its own head under HEAD=0, so a few "sees it now" ticks with the recorded facing over 90 deg off are his neck turned to the ball.
