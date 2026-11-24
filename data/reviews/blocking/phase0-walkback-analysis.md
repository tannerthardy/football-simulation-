/usr/local/lib/python3.13/site-packages/numpy/_core/fromnumeric.py:3862: RuntimeWarning: Mean of empty slice
  return _methods._mean(a, axis=axis, dtype=dtype,
/usr/local/lib/python3.13/site-packages/numpy/_core/_methods.py:142: RuntimeWarning: invalid value encountered in scalar divide
  ret = ret.dtype.type(ret / rcount)
## A. reproduce operator row counts (frame samples, not pairs)
  0-0.5: frame samples 84660; distinct pairs contributing 22671
  0.5-1.0: frame samples 77322; distinct pairs contributing 18101
  1.0-1.5: frame samples 48506; distinct pairs contributing 11809
  1.5-2.5: frame samples 39489; distinct pairs contributing 6869

## B. weights over held pairs (unique play x blocker)
n pairs 25562 distinct plays 9671
blocker lb : min 260 p10 297 p50 310 p90 327 max 360 (mean 311.3, sd 12.2)
rusher lb  : min 185 p10 265 p50 302 p90 328 max 379 (mean 298.8, sd 25.6)
rusher-blocker lb: min -137 p10 -50 p50 -10 p90 21 max 119 (mean -12.5, sd 28.8)
rusher group: Counter({'DL': 23435, 'LB': 2036, 'DB': 91})
rusher pos: [('DT', 13745), ('DE', 5874), ('NT', 3816), ('OLB', 1340), ('ILB', 622), ('MLB', 64), ('SS', 60), ('FS', 26), ('LB', 10), ('CB', 5)]
pairs per bin (all rushers / DL-group rushers only):
   < -30      6038  /    4000
   -30..0    10687  /   10602
   0..+30     7227  /    7223
   > +30      1610  /    1610
pairs |diff|>=60: 1814  |diff|>=90: 273  |diff|<=15: 11481
DL-only rusher-blocker: min -100 p10 -40 p50 -7 p90 23 max 119 (mean -7.8, sd 24.5)
DL-only rusher lb: min 235 p10 280 p50 305 p90 329 max 379 (mean 303.4, sd 20.8)
corr(wr, wb) = -0.04227950561404616
held duration (s, frames*0.1) p10/50/90: [0.1, 1.0, 2.2] ended by Counter({'angle': 9989, 'time': 9329, 'sep': 6244})
contact start time since snap p10/50/90: [0.5, 0.9, 1.5]

## C. per-pair mean velocity vs weight difference (regression, cluster bootstrap by play)
  0-1.0 s since contact / all rushers n= 20745 mean v +1.46 sd 1.01 | slope per 30 lb -0.114 yd/s  95% CI [-0.129, -0.099] | r -0.105 | sd(diff) 28.1
  0-1.0 s since contact / DL rushers only n= 19264 mean v +1.44 sd 1.00 | slope per 30 lb -0.105 yd/s  95% CI [-0.122, -0.087] | r -0.085 | sd(diff) 24.3
  0-1.0 s since contact / DL, |diff|<=60 trimmed n= 18931 mean v +1.44 sd 1.00 | slope per 30 lb -0.109 yd/s  95% CI [-0.129, -0.089] | r -0.083 | sd(diff) 22.8
  1.0-2.5 s since contact / all rushers n=  9627 mean v +1.07 sd 1.01 | slope per 30 lb +0.064 yd/s  95% CI [+0.043, +0.087] | r +0.058 | sd(diff) 27.3
  1.0-2.5 s since contact / DL rushers only n=  9123 mean v +1.09 sd 1.01 | slope per 30 lb +0.026 yd/s  95% CI [+0.001, +0.051] | r +0.020 | sd(diff) 24.3
  1.0-2.5 s since contact / DL, |diff|<=60 trimmed n=  8974 mean v +1.09 sd 1.01 | slope per 30 lb +0.017 yd/s  95% CI [-0.010, +0.045] | r +0.012 | sd(diff) 22.7
  DL, 0-1 s: v = 3.11 + -0.149*(rusher wt per 30 lb) + -0.015*(blocker wt per 30 lb)  (n 19264)
  pair-level mean v (0-1 s since contact), DL rushers, by diff bin: mean (sem) n
     < -30    +1.61 (0.02) n 3245
     -30..0   +1.44 (0.01) n 8751
     0..+30   +1.38 (0.01) n 5943
     > +30    +1.28 (0.03) n 1325
  same, 1.0-2.5 s:
     < -30    +1.04 (0.03) n 1363
     -30..0   +1.09 (0.02) n 4007
     0..+30   +1.07 (0.02) n 3050
     > +30    +1.19 (0.04) n 703
  rusher group mix of held pairs per bin (share DL): [np.float64(0.66), np.float64(0.99), np.float64(1.0), np.float64(1.0)]
  mean pair v 0-1 s by rusher group: {'DL': 1.44, 'LB': 1.74, 'DB': 1.73}

## D. mass-proportional prediction (assumption-labelled)
  model1 v = v0 + u*(wr-wb)/(wr+wb), u=3.0 yd/s (rusher's free closing speed): 30 lb diff -> +0.148 yd/s
  model1 v = v0 + u*(wr-wb)/(wr+wb), u=5.0 yd/s (rusher's free closing speed): 30 lb diff -> +0.246 yd/s
  model2 net force = a0*(wr-wb), pair accel = a0*diff/(wr+wb), a0=3.0 yd/s2 per own-weight, over 0.5s: 30 lb -> +0.074 yd/s
  model2 net force = a0*(wr-wb), pair accel = a0*diff/(wr+wb), a0=3.0 yd/s2 per own-weight, over 1.0s: 30 lb -> +0.148 yd/s
  model2 net force = a0*(wr-wb), pair accel = a0*diff/(wr+wb), a0=5.0 yd/s2 per own-weight, over 0.5s: 30 lb -> +0.123 yd/s
  model2 net force = a0*(wr-wb), pair accel = a0*diff/(wr+wb), a0=5.0 yd/s2 per own-weight, over 1.0s: 30 lb -> +0.246 yd/s
  (mean wr+wb = 610 lb)

## E. sample 8 random held pairs (seed 12345)
  (drawn uniformly from all held pairs)
  play 2022100906-343 blocker G 332lb vs rusher DT(DL) 300lb | contact 1.6s, held 1.2s (ended: time, throw 2.7s) | sep min/mean/max 0.70/0.95/1.17 yd | speed blocker 2.2 rusher 2.6 yd/s | pair v toward QB +1.96 (blocker alone +1.89, rusher alone +2.25) | other D within 2yd of blocker in 67% of frames; other OL within 2yd of rusher 75%
  play 2022110607-853 blocker C 325lb vs rusher NT(DL) 340lb | contact 1.0s, held 2.1s (ended: angle, throw 3.2s) | sep min/mean/max 0.61/0.76/1.10 yd | speed blocker 2.3 rusher 2.7 yd/s | pair v toward QB +2.38 (blocker alone +2.24, rusher alone +2.54) | other D within 2yd of blocker in 0% of frames; other OL within 2yd of rusher 43%
  play 2022091113-3139 blocker G 310lb vs rusher DT(DL) 280lb | contact 0.9s, held 0.9s (ended: time, throw 1.7s) | sep min/mean/max 0.71/0.83/1.12 yd | speed blocker 1.4 rusher 2.5 yd/s | pair v toward QB +1.09 (blocker alone +0.89, rusher alone +1.35) | other D within 2yd of blocker in 33% of frames; other OL within 2yd of rusher 33%
  play 2022100213-4153 blocker G 310lb vs rusher DT(DL) 308lb | contact 0.6s, held 0.7s (ended: angle, throw 2.3s) | sep min/mean/max 0.40/0.62/0.99 yd | speed blocker 2.4 rusher 3.5 yd/s | pair v toward QB +2.31 (blocker alone +1.80, rusher alone +2.93) | other D within 2yd of blocker in 0% of frames; other OL within 2yd of rusher 100%
  play 2022092900-3095 blocker G 305lb vs rusher NT(DL) 310lb | contact 1.0s, held 1.2s (ended: angle, throw 3.0s) | sep min/mean/max 0.73/0.88/1.04 yd | speed blocker 2.3 rusher 1.8 yd/s | pair v toward QB +1.54 (blocker alone +1.43, rusher alone +1.62) | other D within 2yd of blocker in 50% of frames; other OL within 2yd of rusher 100%
  play 2022092513-532 blocker C 315lb vs rusher DT(DL) 310lb | contact 1.7s, held 0.4s (ended: time, throw 2.0s) | sep min/mean/max 1.08/1.11/1.14 yd | speed blocker 1.0 rusher 2.1 yd/s | pair v toward QB +0.70 (blocker alone +0.32, rusher alone +1.02) | other D within 2yd of blocker in 0% of frames; other OL within 2yd of rusher 25%
  play 2022092502-3510 blocker C 309lb vs rusher DT(DL) 255lb | contact 0.8s, held 0.8s (ended: time, throw 1.5s) | sep min/mean/max 1.04/1.13/1.17 yd | speed blocker 1.0 rusher 1.2 yd/s | pair v toward QB +0.99 (blocker alone +0.91, rusher alone +1.07) | other D within 2yd of blocker in 0% of frames; other OL within 2yd of rusher 100%
  play 2022102309-2524 blocker G 330lb vs rusher DE(DL) 285lb | contact 1.1s, held 0.4s (ended: sep, throw 2.0s) | sep min/mean/max 1.03/1.08/1.14 yd | speed blocker 1.3 rusher 3.5 yd/s | pair v toward QB +1.58 (blocker alone +1.19, rusher alone +2.12) | other D within 2yd of blocker in 100% of frames; other OL within 2yd of rusher 100%

## F. held-pair population checks
  frames with other D within 2yd of blocker: 0.284  other OL within 2yd of rusher: 0.749
  pairs with such a double (other D<=2yd of blocker) in >=50% of held frames: 0.27
  mean sep (yd): 0.85  mean speed blocker/rusher: 1.9 2.3
  share of held pairs with held >=1.0 s: 0.51  >=2.0 s: 0.15

## G. walk-back: held pairs vs uncovered OL (velocity toward QB, yd/s; p50 of frame samples [mean of per-unit means]) 
  uncovered OL units 3574; held pairs 25562
  by TIME SINCE SNAP (held: frames while held; blocker alone = the blocker's own retreat toward the QB):
   0.0-0.5s: held blocker +0.00 (mean +0.30, n frames 1770) | held pair +0.50 | held rusher +0.95 | uncovered OL -0.00 (mean +0.39, n frames 14296) | unit means: held-blocker +0.30+-0.02 (n 1095), uncovered +0.39+-0.01 (n 3574)
   0.5-1.0s: held blocker +0.81 (mean +0.63, n frames 23102) | held pair +1.09 | held rusher +1.56 | uncovered OL +0.92 (mean +0.81, n frames 17831) | unit means: held-blocker +0.65+-0.01 (n 9026), uncovered +0.81+-0.02 (n 3574)
   1.0-1.5s: held blocker +1.30 (mean +1.17, n frames 69879) | held pair +1.69 | held rusher +1.97 | uncovered OL +1.36 (mean +1.04, n frames 17210) | unit means: held-blocker +1.17+-0.01 (n 18628), uncovered +0.99+-0.02 (n 3547)
   1.5-2.5s: held blocker +1.56 (mean +1.39, n frames 120909) | held pair +1.56 | held rusher +1.70 | uncovered OL +1.26 (mean +1.02, n frames 27796) | unit means: held-blocker +1.34+-0.01 (n 17802), uncovered +0.96+-0.02 (n 3220)
  by TIME SINCE CONTACT (uncovered OL given pseudo-contact times resampled from held pairs' contact times, seed 0):
   0.0-0.5s: held pair +1.61 (n 84660) | held blocker alone +1.18 | uncovered OL +1.17 (n 16891)
   0.5-1.0s: held pair +1.59 (n 77322) | held blocker alone +1.58 | uncovered OL +1.35 (n 14796)
   1.0-1.5s: held pair +1.32 (n 48506) | held blocker alone +1.30 | uncovered OL +1.19 (n 10943)
   1.5-2.5s: held pair +0.84 (n 39489) | held blocker alone +0.90 | uncovered OL +0.98 (n 5413)
  weights: uncovered OL blocker lb min 260 p10 297 p50 311 p90 327 max 350 (mean 311.6, sd 12.3)
  uncovered share of interior-OL slots with weights:  0.123
  uncovered: corr(blocker weight, 0-1s retreat) = -0.144
  BLOCKER ALONE 0-1 s, DL rushers    n= 19264 mean v +1.17 sd 1.02 | slope per 30 lb -0.091 yd/s  95% CI [-0.109, -0.073] | r -0.072 | sd(diff) 24.3
  BLOCKER ALONE 1-2.5 s, DL rushers  n=  9123 mean v +1.09 sd 1.01 | slope per 30 lb +0.012 yd/s  95% CI [-0.013, +0.036] | r +0.009 | sd(diff) 24.3
