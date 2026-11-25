8242 samples (one per pair per age)

## pass: defender pad height minus blocker pad height (yd; negative = the defender is lower), by pair age
| age s | pairs | gap p10 / 25 / 50 / 75 / 90 | defender lower by > 0.05 yd | level (within 0.05) | blocker lower by > 0.05 | lift (share of body weight) blocker p50 / defender p50 | blocker posture p50 | defender posture p50 |
|---|---|---|---|---|---|---|---|---|
| 0.3 | 1757 | -0.16 / -0.11 / -0.05 / 0.02 / 0.07 | 0.49 | 0.35 | 0.16 | +0.01 / -0.02 | 0.77 | 0.71 |
| 0.6 | 1605 | -0.15 / -0.11 / -0.04 / 0.03 / 0.08 | 0.47 | 0.35 | 0.18 | +0.01 / -0.02 | 0.77 | 0.71 |
| 1.0 | 1464 | -0.15 / -0.11 / -0.04 / 0.03 / 0.08 | 0.47 | 0.36 | 0.17 | +0.01 / -0.02 | 0.77 | 0.71 |
| 1.5 | 1127 | -0.15 / -0.10 / -0.03 / 0.04 / 0.09 | 0.45 | 0.35 | 0.20 | +0.00 / -0.01 | 0.77 | 0.70 |

## run: defender pad height minus blocker pad height (yd; negative = the defender is lower), by pair age
| age s | pairs | gap p10 / 25 / 50 / 75 / 90 | defender lower by > 0.05 yd | level (within 0.05) | blocker lower by > 0.05 | lift (share of body weight) blocker p50 / defender p50 | blocker posture p50 | defender posture p50 |
|---|---|---|---|---|---|---|---|---|
| 0.3 | 756 | -0.20 / -0.15 / -0.07 / 0.01 / 0.10 | 0.57 | 0.26 | 0.17 | +0.02 / -0.03 | 0.81 | 0.93 |
| 0.6 | 634 | -0.20 / -0.15 / -0.07 / 0.00 / 0.10 | 0.56 | 0.27 | 0.16 | +0.02 / -0.03 | 0.80 | 0.92 |
| 1.0 | 516 | -0.20 / -0.15 / -0.07 / 0.00 / 0.09 | 0.56 | 0.28 | 0.16 | +0.02 / -0.03 | 0.80 | 0.93 |
| 1.5 | 383 | -0.20 / -0.15 / -0.06 / 0.00 / 0.09 | 0.54 | 0.32 | 0.14 | +0.02 / -0.02 | 0.80 | 0.93 |

## What decides the gap (1.0 s samples, all plays): correlation of the gap with each man's ratings-derived inputs, and the posture each reaches
  corr(gap, defender bend) = -0.59
  corr(gap, blocker bend) = +0.58
  corr(gap, defender power/mass) = +0.51
  corr(gap, blocker power/mass) = -0.08
  corr(gap, defender mass) = +0.52
  corr(gap, blocker mass) = -0.40
  pass blocker posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [1, 0, 113, 158, 770, 418, 4]
  pass defender posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [0, 1, 6, 630, 814, 5, 8]
  run blocker posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [0, 0, 0, 11, 247, 258, 0]
  run defender posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: [40, 0, 21, 9, 45, 119, 282]

By slot (1.0 s): defender posture p50 / blocker posture p50 / gap p50 (n)
  pass DE_S: 0.70 / 0.79 / -0.11 (255)
  pass DE_W: 0.70 / 0.79 / -0.10 (296)
  pass DT_S: 0.70 / 0.76 / +0.01 (383)
  pass DT_W: 0.72 / 0.75 / -0.01 (447)
  pass LB_M: 0.71 / 0.79 / -0.09 (32)
  pass NT: 0.71 / 0.76 / +0.06 (34)
  run DE_S: 0.94 / 0.81 / -0.15 (62)
  run DE_W: 0.88 / 0.80 / -0.12 (82)
  run DT_S: 0.95 / 0.80 / -0.04 (144)
  run DT_W: 0.94 / 0.80 / -0.08 (147)
  run LB_M: 0.18 / 0.80 / +0.10 (31)
  run LB_W: 0.19 / 0.79 / +0.06 (20)
  run NT: 0.93 / 0.80 / +0.02 (23)

## Lean-force angle (atan lean / weight), capture offset / base radius, ground-impulse use / limit, by age (p50 [p90])
| kind | age s | blocker lean deg | defender lean deg | blocker offset/base | defender offset/base | blocker grip use | defender grip use | share grip use >= 0.95 b / d |
|---|---|---|---|---|---|---|---|---|
| pass | 0.3 | 15.64 [20.75] | 18.17 [29.10] | 0.16 [0.85] | 0.15 [0.98] | 0.64 [0.81] | 0.63 [0.79] | 0.01 / 0.02 |
| pass | 0.6 | 26.89 [34.93] | 31.51 [36.81] | 0.13 [0.51] | 0.12 [0.64] | 0.76 [1.00] | 0.74 [0.90] | 0.22 / 0.05 |
| pass | 1.0 | 28.73 [36.07] | 32.08 [38.89] | 0.06 [0.39] | 0.07 [0.65] | 0.71 [1.00] | 0.74 [0.89] | 0.20 / 0.04 |
| pass | 1.5 | 31.00 [37.01] | 32.32 [39.67] | 0.04 [0.35] | 0.06 [0.60] | 0.74 [1.00] | 0.76 [0.92] | 0.17 / 0.07 |
| run | 0.3 | 18.03 [24.87] | 17.09 [23.14] | 0.34 [1.06] | 0.57 [2.55] | 0.63 [0.81] | 0.59 [0.74] | 0.02 / 0.00 |
| run | 0.6 | 25.10 [38.76] | 29.21 [41.16] | 0.20 [0.81] | 0.27 [1.39] | 0.63 [0.87] | 0.64 [0.87] | 0.03 / 0.04 |
| run | 1.0 | 28.59 [40.08] | 32.60 [46.02] | 0.11 [0.85] | 0.17 [1.76] | 0.62 [0.86] | 0.67 [0.90] | 0.03 / 0.05 |
| run | 1.5 | 29.00 [40.25] | 32.92 [46.14] | 0.08 [1.03] | 0.18 [2.16] | 0.63 [0.87] | 0.68 [0.91] | 0.03 / 0.07 |

## Engaged blocker retreat toward his backfield (yd/s) against his own request, by time since contact (p50; mean of the forced part = velocity minus request)
| kind | age s | pairs | blocker retreat velocity p50 | his requested retreat p50 | forced part (velocity - request) mean | rusher closing velocity p50 | rusher requested p50 |
|---|---|---|---|---|---|---|---|
| pass | 0.3 | 1757 | +1.61 | +1.17 | +0.20 | +1.97 | +4.23 |
| pass | 0.6 | 1605 | +1.89 | +1.58 | +0.43 | +1.86 | +4.14 |
| pass | 1.0 | 1464 | +1.95 | +1.81 | +0.34 | +1.90 | +4.83 |
| pass | 1.5 | 1127 | +1.74 | +1.27 | +0.39 | +1.75 | +4.17 |
| run | 0.3 | 756 | -0.31 | -1.35 | +0.95 | -0.33 | +0.50 |
| run | 0.6 | 634 | -0.57 | -1.54 | +0.97 | -0.31 | +0.77 |
| run | 1.0 | 516 | -0.71 | -1.53 | +0.86 | -0.30 | +1.21 |
| run | 1.5 | 383 | -0.66 | -1.49 | +0.77 | -0.46 | +0.98 |
