24242 samples (one per pair per age)

## pass: defender pad height minus blocker pad height (yd; negative = the defender is lower), by pair age
| age s | pairs | gap p10 / 25 / 50 / 75 / 90 | defender lower by > 0.05 yd | level (within 0.05) | blocker lower by > 0.05 | lift (share of body weight) blocker p50 / defender p50 | blocker posture p50 | defender posture p50 |
|---|---|---|---|---|---|---|---|---|
| 0.3 | 5082 | -0.16 / -0.11 / -0.05 / 0.02 / 0.07 | 0.49 | 0.35 | 0.16 | +0.01 / -0.03 | 0.77 | 0.71 |
| 0.6 | 4585 | -0.15 / -0.11 / -0.04 / 0.03 / 0.08 | 0.47 | 0.35 | 0.18 | +0.01 / -0.02 | 0.78 | 0.71 |
| 1.0 | 4183 | -0.15 / -0.11 / -0.04 / 0.03 / 0.08 | 0.47 | 0.35 | 0.18 | +0.01 / -0.02 | 0.77 | 0.70 |
| 1.5 | 3227 | -0.15 / -0.10 / -0.03 / 0.04 / 0.09 | 0.45 | 0.35 | 0.20 | +0.01 / -0.01 | 0.77 | 0.70 |

## run: defender pad height minus blocker pad height (yd; negative = the defender is lower), by pair age
| age s | pairs | gap p10 / 25 / 50 / 75 / 90 | defender lower by > 0.05 yd | level (within 0.05) | blocker lower by > 0.05 | lift (share of body weight) blocker p50 / defender p50 | blocker posture p50 | defender posture p50 |
|---|---|---|---|---|---|---|---|---|
| 0.3 | 2423 | -0.21 / -0.16 / -0.07 / 0.01 / 0.10 | 0.57 | 0.27 | 0.16 | +0.02 / -0.03 | 0.81 | 0.93 |
| 0.6 | 1976 | -0.21 / -0.15 / -0.07 / 0.01 / 0.09 | 0.56 | 0.29 | 0.15 | +0.01 / -0.03 | 0.80 | 0.92 |
| 1.0 | 1614 | -0.21 / -0.15 / -0.07 / 0.01 / 0.09 | 0.56 | 0.29 | 0.15 | +0.02 / -0.03 | 0.80 | 0.93 |
| 1.5 | 1152 | -0.20 / -0.15 / -0.06 / 0.01 / 0.08 | 0.54 | 0.32 | 0.14 | +0.02 / -0.03 | 0.80 | 0.93 |

## What decides the gap (1.0 s samples, all plays): correlation of the gap with each man's ratings-derived inputs, and the posture each reaches
  corr(gap, defender bend) = -0.59
  corr(gap, blocker bend) = +0.59
  corr(gap, defender power/mass) = +0.52
  corr(gap, blocker power/mass) = -0.13
  corr(gap, defender mass) = +0.53
  corr(gap, blocker mass) = -0.40
  pass blocker posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [2, 0, 306, 418, 2179, 1268, 10]
  pass defender posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [0, 1, 26, 1795, 2337, 7, 17]
  run blocker posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [1, 0, 0, 50, 737, 826, 0]
  run defender posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [119, 3, 63, 23, 125, 392, 889]

By slot (1.0 s): defender posture p50 / blocker posture p50 / gap p50 (n)
  pass DE_S: 0.70 / 0.79 / -0.11 (723)
  pass DE_W: 0.70 / 0.80 / -0.10 (832)
  pass DT_S: 0.70 / 0.76 / +0.01 (1119)
  pass DT_W: 0.71 / 0.75 / -0.01 (1242)
  pass LB_M: 0.71 / 0.79 / -0.10 (98)
  pass LB_W: 0.72 / 0.79 / -0.12 (66)
  pass NT: 0.71 / 0.77 / +0.05 (92)
  run DE_S: 0.95 / 0.80 / -0.16 (168)
  run DE_W: 0.94 / 0.80 / -0.15 (259)
  run DT_S: 0.94 / 0.80 / -0.04 (472)
  run DT_W: 0.95 / 0.80 / -0.07 (461)
  run LB_M: 0.17 / 0.80 / +0.09 (75)
  run LB_W: 0.19 / 0.80 / +0.08 (73)
  run NT: 0.84 / 0.80 / +0.01 (75)

## Lean-force angle (atan lean / weight), capture offset / base radius, ground-impulse use / limit, by age (p50 [p90])
| kind | age s | blocker lean deg | defender lean deg | blocker offset/base | defender offset/base | blocker grip use | defender grip use | share grip use >= 0.95 b / d |
|---|---|---|---|---|---|---|---|---|
| pass | 0.3 | 15.65 [21.04] | 18.17 [29.12] | 0.15 [0.85] | 0.14 [0.99] | 0.64 [0.81] | 0.62 [0.80] | 0.01 / 0.01 |
| pass | 0.6 | 27.31 [34.95] | 31.55 [37.00] | 0.13 [0.50] | 0.13 [0.63] | 0.78 [1.00] | 0.74 [0.90] | 0.23 / 0.05 |
| pass | 1.0 | 29.36 [36.07] | 32.36 [39.19] | 0.06 [0.37] | 0.07 [0.66] | 0.72 [1.00] | 0.75 [0.90] | 0.20 / 0.05 |
| pass | 1.5 | 31.14 [36.90] | 32.60 [39.81] | 0.04 [0.36] | 0.05 [0.59] | 0.75 [1.00] | 0.75 [0.92] | 0.17 / 0.07 |
| run | 0.3 | 17.50 [24.86] | 16.99 [23.17] | 0.31 [1.10] | 0.54 [2.26] | 0.62 [0.82] | 0.58 [0.74] | 0.02 / 0.00 |
| run | 0.6 | 22.08 [38.41] | 28.09 [40.87] | 0.23 [0.92] | 0.28 [1.46] | 0.61 [0.86] | 0.65 [0.87] | 0.03 / 0.04 |
| run | 1.0 | 27.15 [40.20] | 32.35 [45.84] | 0.12 [0.94] | 0.17 [1.85] | 0.62 [0.86] | 0.68 [0.90] | 0.04 / 0.06 |
| run | 1.5 | 29.92 [40.42] | 33.98 [46.27] | 0.09 [1.05] | 0.18 [2.31] | 0.63 [0.87] | 0.68 [0.92] | 0.04 / 0.08 |

## Engaged blocker retreat toward his backfield (yd/s) against his own request, by time since contact (p50; mean of the forced part = velocity minus request)
| kind | age s | pairs | blocker retreat velocity p50 | his requested retreat p50 | forced part (velocity - request) mean | rusher closing velocity p50 | rusher requested p50 |
|---|---|---|---|---|---|---|---|
| pass | 0.3 | 5082 | +1.58 | +0.00 | +1.78 | +1.98 | +0.00 |
| pass | 0.6 | 4585 | +1.88 | +0.00 | +2.01 | +1.86 | +0.00 |
| pass | 1.0 | 4183 | +1.95 | +0.00 | +1.92 | +1.86 | +0.00 |
| pass | 1.5 | 3227 | +1.72 | +0.00 | +1.65 | +1.71 | +0.00 |
| run | 0.3 | 2423 | -0.33 | +0.00 | -0.31 | -0.34 | +0.00 |
| run | 0.6 | 1976 | -0.57 | +0.00 | -0.48 | -0.28 | +0.00 |
| run | 1.0 | 1614 | -0.66 | +0.00 | -0.53 | -0.26 | +0.00 |
| run | 1.5 | 1152 | -0.62 | +0.00 | -0.59 | -0.41 | +0.00 |
