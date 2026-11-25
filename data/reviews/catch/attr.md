## Our uncontested catch rolls against the NFL's drops

Ours: 1704 catch rolls, 1568 first rolls of a targeted pass, 1399 uncontested (nearest defender over 1.5 yd, no contest, not deflected), 1320 of them with the ball within 1.0 yd of him. NFL: 6657 targeted passes at arrival, 5188 with no defender within 1.5 yd.

### Rates (uncontested)

| sample | rolls | caught | drop (diff < 0.35) | miss (diff >= 0.35) | drop / (caught + drop) | not caught / all |
|---|---|---|---|---|---|---|
| ours, all | 1399 | 1283 | 82 | 34 | 6.0% | 8.3% |
| ours, ball within 1.0 yd | 1320 | 1231 | 82 | 7 | 6.2% | 6.7% |
| ours, ball within 0.5 yd | 1037 | 982 | 53 | 2 | 5.1% | 5.3% |
| NFL (dropped_pass tag), caught or dropped | 4815 | 4579 | 236 | | 4.9% | |
| NFL, ball within 1.0 yd, not caught | 2379 | 2151 | | | | 9.6% |

### Where the ball is: distance from his centre at the roll (ours) / at pass_arrived (NFL), yd

| sample | n | p25 | p50 | p75 | p90 | share over 1 yd | share over 2 yd |
|---|---|---|---|---|---|---|---|
| NFL, all targeted, no defender within 1.5 yd | 5188 | 0.61 | 1.10 | 1.83 | 2.54 | 54% | 20% |
| NFL, caught | 4579 | 0.60 | 1.07 | 1.81 | 2.48 | 53% | 19% |
| NFL, dropped (tag) | 236 | 0.68 | 1.13 | 1.76 | 2.70 | 55% | 19% |
| NFL, incomplete and not tagged | 373 | 0.83 | 1.37 | 2.17 | 3.44 | 68% | 28% |
| ours, all uncontested first rolls | 1399 | 0.13 | 0.25 | 0.51 | 0.85 | 6% | 0% |
| ours, caught | 1283 | 0.12 | 0.24 | 0.48 | 0.78 | 4% | 0% |
| ours, dropped (diff < 0.35) | 82 | 0.19 | 0.37 | 0.67 | 0.81 | 0% | 0% |
| ours, missed (diff >= 0.35) | 34 | 1.01 | 1.08 | 1.20 | 1.27 | 79% | 0% |

NFL drop rate by the ball's distance at arrival (uncontested, caught or dropped):

| distance | NFL n | NFL dropped | ours n | ours dropped (of caught + dropped) | ours not caught (all) |
|---|---|---|---|---|---|
| 0-0.5 | 875 | 4.3% | 1036 | 5.1% | 5.3% |
| 0.5-1.0 | 1362 | 5.1% | 284 | 10.4% | 12.0% |
| 1.0-1.5 | 891 | 5.6% | 79 | 0.0% | 34.2% |
| 1.5-2.5 | 1209 | 4.1% | 0 | 0.0% | 0.0% |
| 2.5-99 | 478 | 6.1% | 0 | 0.0% | 0.0% |

### Attribution: the expected failure probability by term (ours, uncontested, ball within 1.0 yd), and the same on the rolls that were dropped

| term | mean over all rolls (pts) | mean over the dropped rolls (pts) | share of the dropped rolls' expected failure |
|---|---|---|---|
| floor | 3.19 | 3.21 | 30% |
| stretch (ball off his hands) | 2.65 | 4.02 | 37% |
| high ball | 0.37 | 0.44 | 4% |
| low ball | 0.06 | 0.00 | 0% |
| hard ball (over 24 yd/s) | 1.16 | 1.76 | 16% |
| tracking penalty (long flight) | 0.00 | 0.00 | 0% |
| running-track term (CATCH_SPEED) | 0.98 | 1.41 | 13% |
| expected failure (sum) | 8.40 | 10.83 | |
| realised not-caught | 6.7% | | |
| hands rating (mean, p25-p75) | 0.72 (0.65-0.80) | 0.72 | |

Counterfactual on the same rolls: the expected drop rate (drop / (caught + drop), the sim's label) with one term removed (the rest as rolled):

| removed | expected drop rate among rolls with diff < 0.35 |
|---|---|
| nothing | 7.8% |
| floor | 4.6% |
| stretch (ball off his hands) | 5.5% |
| high ball | 7.6% |
| low ball | 7.8% |
| hard ball (over 24 yd/s) | 6.7% |
| tracking penalty (long flight) | 7.8% |
| running-track term (CATCH_SPEED) | 7.0% |

### By his speed and the ball's direction (uncontested, ball within 1.0 yd), realised and the expected failure's two halves

| group | n | not caught | drop / (caught + drop) | floor (pts) | stretch (pts) | running-track (pts) | other (pts) | NFL drop (tag) |
|---|---|---|---|---|---|---|---|---|
| speed 0-2 | 352 | 6.5% | 6.3% | 3.2 | 2.3 | 0.0 | 1.1 | 3.8% (n 712) |
| speed 2-4 | 347 | 6.1% | 5.8% | 3.2 | 2.2 | 0.1 | 1.2 | 4.7% (n 1043) |
| speed 4-6 | 413 | 5.8% | 5.6% | 3.3 | 2.7 | 1.4 | 1.8 | 4.7% (n 1413) |
| speed 6-8 | 196 | 9.7% | 8.3% | 3.1 | 3.9 | 3.0 | 2.5 | 5.7% (n 1394) |
| speed 8-99 | 12 | 16.7% | 9.1% | 3.2 | 3.8 | 7.7 | 4.3 | 5.5% (n 253) |
| ball from behind (cos > 0.5) | 644 | 7.3% | 6.4% | 3.2 | 3.2 | 1.8 | 2.1 | 4.4% (n 3373) |
| across | 303 | 7.3% | 7.3% | 3.2 | 3.0 | 0.5 | 1.2 | 5.7% (n 973) |
| runs at it (cos < -0.5) | 187 | 4.3% | 4.3% | 3.2 | 1.3 | 0.0 | 1.0 | 7.1% (n 254) |
| standing (speed < 1) | 186 | 6.5% | 5.9% | 3.2 | 1.5 | 0.0 | 1.2 | 6.0% (n 215) |

### By his hands rating (ours, uncontested, ball within 1.0 yd): the rating rolled against the outcome

| hands rating | n | not caught | drop / (caught + drop) | expected floor (pts) | expected failure (pts) |
|---|---|---|---|---|---|
| 0.0-0.6 | 198 | 5.1% | 4.6% | 4.3 | 10.6 |
| 0.6-0.7 | 265 | 9.1% | 8.7% | 3.6 | 9.6 |
| 0.7-0.8 | 544 | 6.2% | 5.7% | 3.0 | 8.1 |
| 0.8-1.0 | 313 | 6.7% | 6.1% | 2.4 | 6.6 |

### His hands against the ball: dh (the ball path's closest horizontal approach to his centre) and the reach it is scaled by (ours, uncontested first rolls)

| | p25 | p50 | p75 | p90 |
|---|---|---|---|---|
| dh (yd) | 0.09 | 0.25 | 0.50 | 0.85 |
| reach + 0.3 (yd) | 1.28 | 1.29 | 1.32 | 1.33 |
| stretch = (dh/reach)^2 | 0.01 | 0.04 | 0.15 | 0.42 |
| height of the ball z (yd) | 1.22 | 1.47 | 1.74 | 1.97 |