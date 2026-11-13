# Run-game report: run-ref-5 @ d9ba31e3

Run set f0a8e75b8620 (12 run-only games captured at 1b5415de). Yards capped at 20 for means.

## Yards and tackles

```
plays 1321 / 1321, errors 0
OZ    off: n  395 mean<20  4.69 <=0 10.9% 10+ 13.2% 20+  5.3% broken/run 0.301 missed/run 0.281
      ref: n  395 mean<20  3.13 <=0 21.5% 10+  7.1% 20+  2.5% broken/run 0.187 missed/run 0.210   paired -1.55 (SE 0.33)
IZ    off: n  215 mean<20  4.40 <=0 14.9% 10+ 14.4% 20+  6.5% broken/run 0.237 missed/run 0.265
      ref: n  215 mean<20  4.46 <=0 14.4% 10+ 11.6% 20+  3.3% broken/run 0.200 missed/run 0.260   paired +0.05 (SE 0.50)
gap   off: n  445 mean<20  5.42 <=0  8.3% 10+ 16.6% 20+  7.6% broken/run 0.292 missed/run 0.234
      ref: n  445 mean<20  3.80 <=0  8.8% 10+  7.0% 20+  1.6% broken/run 0.121 missed/run 0.207   paired -1.62 (SE 0.32)
draw  off: n   85 mean<20  6.85 <=0 16.5% 10+ 27.1% 20+  5.9% broken/run 0.518 missed/run 0.365
      ref: n   85 mean<20  4.51 <=0 21.2% 10+ 14.1% 20+  0.0% broken/run 0.306 missed/run 0.224   paired -2.34 (SE 0.85)
other off: n  181 mean<20  5.88 <=0  9.9% 10+ 22.7% 20+  5.0% broken/run 0.304 missed/run 0.309
      ref: n  181 mean<20  4.13 <=0 17.7% 10+ 11.0% 20+  3.9% broken/run 0.204 missed/run 0.260   paired -1.75 (SE 0.54)
all   off: n 1321 mean<20  5.19 <=0 10.9% 10+ 16.7% 20+  6.3% broken/run 0.302 missed/run 0.272
      ref: n 1321 mean<20  3.80 <=0 15.5% 10+  8.8% 20+  2.3% broken/run 0.177 missed/run 0.225   paired -1.39 (SE 0.19)
tackles off: missed 0.272  broken 0.302 (engaged-grab breaks 0.158)  missed + broken open 0.416 a run
tackles ref: missed 0.225  broken 0.177 (engaged-grab breaks 0.104)  missed + broken open 0.298 a run
```

## Operators (zone runs; mesh: zone and gap)

### hitblk

```
== NFL 2022
  OU n1624 DL blocked 33%  LB blocked 19%  DL shed 13%  LB free 13%  LB shed 8%  DB free 6%  DL free 6%  DB blocked 1%  DB shed 0%
     yards<20 by hitter class: free 5.77 (25%)  shed 3.12 (22%)  blocked 3.39 (54%)
  IN n1327 DL blocked 39%  LB blocked 21%  LB free 14%  DL shed 7%  DB free 7%  LB shed 6%  DL free 5%  DB blocked 1%  DB shed 0%
     yards<20 by hitter class: free 5.49 (25%)  shed 3.14 (14%)  blocked 3.58 (60%)
== zone-off.jsonl
  OU n378 DL blocked 46%  LB free 16%  LB blocked 12%  DB free 8%  DL free 7%  LB shed 6%  DL shed 5%
     yards<20 by hitter class: free 5.20 (31%)  shed 3.28 (11%)  blocked 3.98 (58%)
  IN n195 DL blocked 43%  LB free 18%  LB blocked 18%  DL shed 10%  LB shed 6%  DL free 2%  DB free 2%  DB shed 1%
     yards<20 by hitter class: free 6.06 (23%)  shed 5.74 (17%)  blocked 2.82 (61%)
== zone-ref.jsonl
  OU n372 DL blocked 52%  LB free 13%  LB blocked 11%  DL shed 8%  DL free 6%  LB shed 5%  DB free 4%  DB blocked 1%  DB shed 1%
     yards<20 by hitter class: free 4.92 (23%)  shed 2.93 (13%)  blocked 2.09 (64%)
  IN n194 DL blocked 36%  LB blocked 21%  LB free 18%  DL shed 13%  DB free 7%  LB shed 3%  DL free 2%  DB shed 1%  DB blocked 1%
     yards<20 by hitter class: free 6.26 (26%)  shed 2.43 (16%)  blocked 4.16 (57%)
```

### hitterback

```
== NFL 2022
   contact -1..0  front     n  191: hitter driven back median +0.57 yd (>=1 yd 37%), carrier gain median +2.16
   contact -1..0  side/rear n  375: hitter driven back median +0.96 yd (>=1 yd 50%), carrier gain median +2.44
   contact 0..1   front     n  175: hitter driven back median +0.73 yd (>=1 yd 42%), carrier gain median +2.51
   contact 0..1   side/rear n  412: hitter driven back median +1.17 yd (>=1 yd 56%), carrier gain median +2.67
   contact 1..3   front     n  190: hitter driven back median +0.94 yd (>=1 yd 47%), carrier gain median +2.59
   contact 1..3   side/rear n  441: hitter driven back median +1.47 yd (>=1 yd 62%), carrier gain median +3.03
== zone-off.jsonl
   contact -1..0  front     n   63: hitter driven back median +0.29 yd (>=1 yd 19%), carrier gain median +0.71
   contact -1..0  side/rear n   86: hitter driven back median +1.23 yd (>=1 yd 55%), carrier gain median +2.44
   contact 0..1   front     n   61: hitter driven back median +0.64 yd (>=1 yd 34%), carrier gain median +1.02
   contact 0..1   side/rear n   71: hitter driven back median +0.81 yd (>=1 yd 49%), carrier gain median +2.80
   contact 1..3   front     n   61: hitter driven back median +0.82 yd (>=1 yd 34%), carrier gain median +1.17
   contact 1..3   side/rear n   67: hitter driven back median +2.22 yd (>=1 yd 81%), carrier gain median +2.45
== zone-ref.jsonl
   contact -1..0  front     n   71: hitter driven back median +0.36 yd (>=1 yd 35%), carrier gain median +0.98
   contact -1..0  side/rear n   68: hitter driven back median +0.85 yd (>=1 yd 47%), carrier gain median +2.13
   contact 0..1   front     n   51: hitter driven back median +0.31 yd (>=1 yd 22%), carrier gain median +0.90
   contact 0..1   side/rear n   51: hitter driven back median +1.42 yd (>=1 yd 63%), carrier gain median +1.52
   contact 1..3   front     n   42: hitter driven back median +0.42 yd (>=1 yd 14%), carrier gain median +0.77
   contact 1..3   side/rear n   58: hitter driven back median +1.61 yd (>=1 yd 64%), carrier gain median +1.85
```

### pile

```
== NFL 2022
   0 defenders within 1 yd: 3876 frames, carrier fwd speed median +3.80 yd/s, stalled (<0.5) 7%
   1 defenders within 1 yd: 11089 frames, carrier fwd speed median +2.75 yd/s, stalled (<0.5) 12%
   2 defenders within 1 yd: 8384 frames, carrier fwd speed median +1.50 yd/s, stalled (<0.5) 27%
   3+ defenders within 1 yd: 6011 frames, carrier fwd speed median +0.50 yd/s, stalled (<0.5) 49%
   2nd defender arrives: 80% of contacts, median 0.3 s after first contact; 3rd: 43%, median 0.7 s
== zone-off.jsonl contacts 409
   0 defenders within 1 yd: 998 frames, carrier fwd speed median +4.77 yd/s, stalled (<0.5) 2%
   1 defenders within 1 yd: 2634 frames, carrier fwd speed median +2.31 yd/s, stalled (<0.5) 11%
   2 defenders within 1 yd: 1398 frames, carrier fwd speed median +1.22 yd/s, stalled (<0.5) 26%
   3+ defenders within 1 yd: 872 frames, carrier fwd speed median +0.69 yd/s, stalled (<0.5) 42%
   2nd defender arrives: 66% of contacts, median 0.5 s after first contact; 3rd: 34%, median 1.1 s
== zone-ref.jsonl contacts 341
   0 defenders within 1 yd: 485 frames, carrier fwd speed median +3.63 yd/s, stalled (<0.5) 4%
   1 defenders within 1 yd: 2313 frames, carrier fwd speed median +1.90 yd/s, stalled (<0.5) 15%
   2 defenders within 1 yd: 1181 frames, carrier fwd speed median +0.88 yd/s, stalled (<0.5) 33%
   3+ defenders within 1 yd: 947 frames, carrier fwd speed median +0.52 yd/s, stalled (<0.5) 49%
   2nd defender arrives: 70% of contacts, median 0.6 s after first contact; 3rd: 41%, median 1.1 s
```

### trench2

```
== NFL 2022
  all  n 6185  DL depth 0.5 +0.18  1.0 +0.54  2.0 +0.70 | back>=.5 from 0.5s 17%  from snap 14%
  solo n 1388  DL depth 0.5 +0.21  1.0 +0.58  2.0 +0.82 | back>=.5 from 0.5s 16%  from snap 14%
  dbl  n  124  DL depth 0.5 +0.26  1.0 +0.62  2.0 +0.75 | back>=.5 from 0.5s 21%  from snap 10%
  free n 4673  DL depth 0.5 +0.17  1.0 +0.53  2.0 +0.66 | back>=.5 from 0.5s 17%  from snap 14%
== zone-off.jsonl
  all  n 1276  DL depth 0.5 +0.29  1.0 +0.51  2.0 +0.43 | back>=.5 from 0.5s 13%  from snap 6%
  solo n  499  DL depth 0.5 +0.38  1.0 +0.58  2.0 +0.56 | back>=.5 from 0.5s 11%  from snap 4%
  dbl  n   38  DL depth 0.5 +0.56  1.0 +0.77  2.0 +0.69 | back>=.5 from 0.5s 16%  from snap 5%
  free n  739  DL depth 0.5 +0.21  1.0 +0.45  2.0 +0.34 | back>=.5 from 0.5s 14%  from snap 8%
== zone-ref.jsonl
  all  n 1236  DL depth 0.5 +0.16  1.0 +0.42  2.0 +0.73 | back>=.5 from 0.5s 8%  from snap 6%
  solo n  121  DL depth 0.5 +0.27  1.0 +0.50  2.0 +0.94 | back>=.5 from 0.5s 9%  from snap 2%
  dbl  n    9  DL depth 0.5 +0.52  1.0 +0.71  2.0 +1.46 | back>=.5 from 0.5s 0%  from snap 0%
  free n 1106  DL depth 0.5 +0.15  1.0 +0.41  2.0 +0.70 | back>=.5 from 0.5s 8%  from snap 6%
```

### linestep

```
== NFL 2022
  IN n1327 by0.6 78% by1.0 86% by1.5 89%  median OL lateral speed at 0.5 s 1.30
  OU n1588 by0.6 97% by1.0 98% by1.5 99%  median OL lateral speed at 0.5 s 2.25
== zone-off.jsonl
  IN n197 by0.6 82% by1.0 94% by1.5 98%  median OL lateral speed at 0.5 s 1.20
  OU n392 by0.6 100% by1.0 100% by1.5 100%  median OL lateral speed at 0.5 s 1.60
== zone-ref.jsonl
  IN n196 by0.6 94% by1.0 98% by1.5 98%  median OL lateral speed at 0.5 s 1.30
  OU n374 by0.6 97% by1.0 99% by1.5 100%  median OL lateral speed at 0.5 s 1.85
```

### bsend

```
== NFL 2022
  IN n 457 t0.5 depth +0.57 in +0.28  t1.0 depth -0.08 in +1.16  t1.5 depth -0.57 in +2.40
  OU n 609 t0.5 depth +0.52 in +0.33  t1.0 depth -0.14 in +1.43  t1.5 depth -0.70 in +3.12
== zone-off.jsonl
  IN n 115 t0.5 depth +0.64 in +0.16  t1.0 depth +0.35 in +1.02  t1.5 depth +0.18 in +1.93
  OU n 224 t0.5 depth +0.61 in +0.15  t1.0 depth +0.25 in +1.06  t1.5 depth +0.09 in +2.19
== zone-ref.jsonl
  IN n 120 t0.5 depth +0.66 in +0.23  t1.0 depth +0.24 in +1.07  t1.5 depth -0.36 in +2.02
  OU n 211 t0.5 depth +0.61 in +0.21  t1.0 depth +0.02 in +1.16  t1.5 depth -0.47 in +2.42
```

### psend

```
== NFL 2022
  IN snap depth 0.91 off-centre 5.22 n 766 t0.5 depth +0.55 in +0.06 OT -0.98/+0.31w gap 2.31  t1.0 depth -0.27 in +0.05 OT -1.01/+1.01w gap 1.35  t1.5 depth -0.92 in -0.15 OT -1.08/+1.66w gap 0.97
  OU snap depth 0.87 off-centre 5.16 n 720 t0.5 depth +0.50 in -0.02 OT -1.00/+0.48w gap 2.21  t1.0 depth -0.34 in -0.37 OT -0.99/+1.56w gap 1.28  t1.5 depth -1.11 in -1.21 OT -1.07/+2.81w gap 1.11
== zone-off.jsonl
  IN snap depth 0.90 off-centre 5.41 n 114 t0.5 depth +0.53 in +0.11 OT -0.79/+0.46w gap 2.35  t1.0 depth -0.16 in +0.26 OT -0.41/+1.53w gap 1.09  t1.5 depth -0.38 in +0.01 OT -0.22/+2.19w gap 1.16
  OU snap depth 0.90 off-centre 5.42 n 226 t0.5 depth +0.53 in +0.07 OT -0.77/+0.48w gap 2.35  t1.0 depth -0.20 in +0.20 OT -0.56/+1.64w gap 1.01  t1.5 depth -0.43 in -0.32 OT -0.54/+2.39w gap 1.19
== zone-ref.jsonl
  IN snap depth 0.90 off-centre 5.34 n 113 t0.5 depth +0.53 in +0.10 OT -0.81/+0.39w gap 2.38  t1.0 depth -0.10 in +0.35 OT -0.34/+1.42w gap 1.12  t1.5 depth -0.12 in -0.05 OT +0.15/+2.20w gap 1.14
  OU snap depth 0.90 off-centre 5.36 n 226 t0.5 depth +0.52 in +0.08 OT -0.89/+0.47w gap 2.38  t1.0 depth -0.30 in +0.32 OT -0.74/+1.68w gap 1.12  t1.5 depth -0.48 in -0.46 OT -0.55/+2.72w gap 1.31
```

### mesh

```
== NFL 2022
  align  concept       n    t   | QB depth@.3/.6/hand lat@hand speed | RB start lat/dep | RB rel QB lat/dep  sep | RB v lat/fwd speed heading
  gun    INSIDE ZONE    774 1.10 |  4.6  4.6  4.5 -0.03  0.8 | -2.26  5.1 | -0.70 -0.46 0.94 | +2.65 +2.70 3.83   45
  gun    POWER          264 1.05 |  4.5  4.6  4.7 -0.10  1.0 | -2.27  5.0 | -0.60 -0.49 0.91 | +3.00 +2.15 3.82   53
  gun    OUTSIDE ZONE   255 1.00 |  4.6  4.6  4.8 +0.12  0.8 | -2.33  4.8 | -0.16 -0.53 0.81 | +4.45 +1.40 4.74   72
  gun    PULL LEAD      190 1.10 |  4.5  4.6  4.8 +0.21  0.9 | -2.33  4.8 | +0.02 -0.44 0.86 | +4.65 +0.82 4.81   80
  gun    MAN            177 1.10 |  4.5  4.5  4.6 -0.16  0.9 | -2.24  5.1 | -0.90 -0.38 1.11 | +1.45 +2.55 3.02   29
  gun    COUNTER        175 1.10 |  4.7  4.7  4.9 -0.22  1.4 | -2.30  5.0 | -0.53 -0.54 0.90 | +2.85 +1.90 3.64   55
  gun    DRAW           109 1.30 |  4.6  4.6  5.1 -0.15  1.3 | -2.34  5.0 | -0.86 -0.59 1.19 | +1.40 +1.80 2.52   38
  gun    TRAP            61 1.00 |  4.5  4.5  4.5 -0.13  1.1 | -2.04  5.2 | -0.77 -0.49 1.14 | +2.05 +2.60 3.48   33
  gun    TRICK           41 1.10 |  4.7  4.6  4.7 -0.16  1.9 | -7.29  1.9 | -0.51 -0.49 1.43 | +6.60 -2.35 7.22  112
  pistol OUTSIDE ZONE   112 1.20 |  4.6  4.7  5.1 +1.32  1.7 | -0.06  7.3 | +1.01 +0.61 1.25 | +4.20 +2.90 5.13   56
  pistol MAN             80 1.20 |  4.6  4.6  4.5 -0.02  0.9 | -0.03  7.1 | +0.50 +0.27 0.75 | +0.52 +4.22 4.40    9
  pistol INSIDE ZONE     26 1.20 |  4.5  4.6  5.0 +0.38  2.3 | +0.02  7.1 | +0.77 +0.25 0.94 | +1.87 +3.53 4.06   26
  pistol POWER           25 1.20 |  4.7  4.7  4.9 +0.22  0.9 | +0.00  7.0 | -0.17 +0.20 0.65 | +0.90 +3.65 3.93   15
  pistol COUNTER         21 1.10 |  4.3  4.4  4.8 +0.18  0.8 | -0.04  6.7 | -0.33 +0.34 0.55 | +0.80 +3.55 3.63   12
  pistol PULL LEAD       14 1.30 |  4.6  4.7  5.0 +0.81  1.4 | +0.08  7.3 | +2.25 +1.98 3.00 | +5.03 +0.90 5.29   80
  under  OUTSIDE ZONE  1236 1.30 |  1.6  2.2  4.3 +1.87  4.3 | -0.03  7.3 | +0.91 +0.72 1.22 | +4.25 +3.45 5.50   50
  under  MAN            748 1.20 |  1.6  2.2  4.4 +0.09  4.2 | +0.00  7.2 | +0.77 +0.50 1.06 | +1.05 +4.07 4.31   15
  under  INSIDE ZONE    433 1.20 |  1.6  2.2  4.4 +0.89  4.2 | -0.02  7.2 | +0.79 +0.57 1.07 | +1.70 +4.05 4.46   23
  under  PULL LEAD      263 1.20 |  1.6  2.1  4.1 +0.99  3.8 | +0.03  7.2 | +2.32 +2.63 3.76 | +5.45 +1.05 5.62   79
  under  POWER          229 1.20 |  1.6  2.2  4.5 -0.17  4.2 | +0.02  7.2 | +0.87 +0.52 1.16 | +1.35 +4.05 4.33   18
  under  COUNTER        155 1.30 |  1.6  2.3  4.8 -0.48  4.2 | -0.02  7.4 | +0.69 +0.65 1.15 | +1.30 +3.45 3.82   19
  under  TRICK          151 0.70 |  1.6  2.0  2.3 -0.23  2.7 | -4.89  2.6 | -0.06 +0.95 1.18 | +7.10 -0.75 7.24   96
  under  TRAP            44 1.20 |  1.6  2.0  4.0 +0.73  4.1 | +0.00  6.7 | +0.74 +0.47 1.06 | +2.05 +4.10 4.68   29
  under  FB RUN          37 0.90 |  1.5  2.0  2.7 -0.17  3.0 | -1.81  4.3 | -0.59 +0.03 0.91 | +1.45 +3.15 3.63   23
  under  DRAW            29 1.40 |  1.6  2.2  4.8 +0.09  3.8 | -0.01  7.0 | +0.78 +0.24 1.10 | +0.70 +3.50 3.67   11
== all-off.jsonl
  align  concept       n    t   | QB depth@.3/.6/hand lat@hand speed | RB start lat/dep | RB rel QB lat/dep  sep | RB v lat/fwd speed heading
  gun    OUTSIDE ZONE   187 1.00 |  5.0  5.0  5.0 +0.00  0.1 | -2.30  5.5 | -1.05 -0.26 1.08 | +3.07 +1.90 3.51   60
  gun    INSIDE ZONE     93 1.00 |  5.0  5.0  5.0 +0.00  0.2 | -2.30  5.5 | -1.04 -0.25 1.06 | +3.11 +1.84 3.53   62
  gun    COUNTER         75 1.40 |  5.0  5.0  5.0 +0.00  0.1 | -2.30  5.5 | -1.05 -0.37 1.13 | +2.69 +2.13 3.50   52
  gun    TRAP            71 0.90 |  5.0  5.0  5.0 +0.06  0.6 | -2.30  5.5 | -0.59 -0.38 0.71 | +3.35 +1.94 3.87   60
  gun    POWER           63 1.20 |  5.0  5.0  5.0 +0.10  0.8 | -2.30  5.5 | -0.45 -0.46 0.64 | +3.53 +1.99 4.04   61
  pistol OUTSIDE ZONE    55 1.00 |  4.1  4.3  4.3 +0.23  0.1 | +0.00  7.2 | +0.48 +1.16 1.25 | +1.55 +3.50 3.82   23
  pistol INSIDE ZONE     34 1.10 |  4.1  4.3  4.3 +0.23  0.0 | +0.00  7.2 | +0.49 +1.16 1.25 | +1.48 +3.55 3.86   23
  pistol POWER           17 1.20 |  4.1  4.3  4.3 +0.25  0.3 | -0.00  7.2 | +0.60 +0.83 1.03 | +1.58 +3.74 4.03   23
  pistol COUNTER         16 1.30 |  4.1  4.3  4.3 +0.23  0.1 | -0.00  7.2 | +0.55 +0.97 1.12 | +1.36 +3.80 4.03   20
  pistol TRAP            13 0.90 |  4.1  4.3  4.3 +0.24  0.0 | +0.00  7.2 | +0.45 +1.24 1.32 | +1.33 +3.36 3.61   22
  under  OUTSIDE ZONE   150 1.20 |  1.8  2.3  3.9 +1.82  3.5 | +0.00  6.8 | +0.69 +1.11 1.30 | +2.81 +2.77 4.01   46
  under  INSIDE ZONE     70 1.10 |  1.8  2.4  3.2 +0.46  1.3 | +0.00  6.8 | +0.51 +1.11 1.20 | +1.52 +3.90 4.23   22
  under  TRAP            67 1.10 |  1.8  2.4  3.2 +0.44  1.5 | -0.00  6.8 | +0.52 +1.17 1.28 | +1.56 +3.83 4.17   22
  under  POWER           64 1.40 |  1.8  2.4  3.4 +0.48  0.1 | +0.00  6.8 | +0.42 +1.12 1.21 | +1.32 +3.21 3.48   22
  under  COUNTER         55 1.60 |  1.8  2.3  3.4 +0.47  0.1 | +0.00  6.8 | +0.43 +1.11 1.18 | +1.22 +3.38 3.63   20
== all-ref.jsonl
  align  concept       n    t   | QB depth@.3/.6/hand lat@hand speed | RB start lat/dep | RB rel QB lat/dep  sep | RB v lat/fwd speed heading
  gun    OUTSIDE ZONE   188 1.10 |  4.5  4.5  4.4 +0.23  1.3 | -2.30  5.0 | +0.18 -0.69 0.74 | +4.22 +2.54 4.91   58
  gun    INSIDE ZONE     95 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.01 -0.85 0.87 | +3.09 +2.86 4.19   47
  gun    COUNTER         75 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.03 -0.85 0.86 | +3.18 +2.77 4.23   50
  gun    TRAP            71 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | -0.02 -0.84 0.86 | +2.95 +2.75 4.07   47
  gun    POWER           63 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.03 -0.85 0.86 | +3.14 +2.75 4.22   49
  pistol OUTSIDE ZONE    54 1.00 |  4.5  4.5  4.5 +0.20  0.0 | +0.00  7.2 | +0.44 +1.18 1.26 | +1.62 +3.66 4.01   23
  pistol INSIDE ZONE     32 1.00 |  4.5  4.5  4.5 +0.20  0.0 | +0.00  7.2 | +0.43 +1.21 1.28 | +1.56 +3.69 4.00   23
  pistol POWER           17 1.20 |  4.5  4.5  4.4 +0.21  0.2 | -0.00  7.2 | +0.67 +0.61 0.91 | +1.76 +4.06 4.46   23
  pistol COUNTER         16 1.30 |  4.5  4.5  4.5 +0.20  0.1 | -0.00  7.2 | +0.54 +0.93 1.08 | +1.58 +3.97 4.25   21
  pistol TRAP            13 0.90 |  4.5  4.5  4.5 +0.21  0.1 | +0.00  7.2 | +0.59 +0.81 1.01 | +1.52 +4.03 4.31   21
  under  OUTSIDE ZONE   132 1.40 |  1.8  2.3  4.1 +2.14  3.4 | +0.00  7.3 | +1.07 +0.53 1.22 | +3.58 +3.24 4.80   48
  under  INSIDE ZONE     69 1.20 |  1.8  2.4  3.3 +0.46  1.2 | -0.00  7.3 | +0.49 +1.20 1.29 | +1.49 +4.57 4.80   18
  under  TRAP            67 1.10 |  1.8  2.4  3.2 +0.45  1.5 | -0.00  7.3 | +0.53 +1.16 1.29 | +1.53 +4.36 4.70   19
  under  POWER           65 1.40 |  1.8  2.4  3.4 +0.48  0.2 | +0.00  7.3 | +0.51 +1.02 1.13 | +1.44 +4.10 4.39   20
  under  COUNTER         56 1.60 |  1.8  2.3  3.4 +0.48  0.1 | +0.00  7.3 | +0.49 +1.03 1.14 | +1.28 +4.00 4.23   18
```

