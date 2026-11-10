# Run-game report: run-ref-7 @ 13b43410

Run set f0a8e75b8620 (12 run-only games captured at 1b5415de). Yards capped at 20 for means.

## Yards and tackles

```
plays 1321 / 1321, errors 0
OZ    off: n  395 mean<20  4.69 <=0 10.9% 10+ 13.2% 20+  5.3% broken/run 0.301 missed/run 0.281
      ref: n  395 mean<20  3.09 <=0 22.3% 10+  7.8% 20+  2.8% broken/run 0.137 missed/run 0.215   paired -1.60 (SE 0.34)
IZ    off: n  215 mean<20  4.40 <=0 14.9% 10+ 14.4% 20+  6.5% broken/run 0.237 missed/run 0.265
      ref: n  215 mean<20  4.53 <=0 16.3% 10+ 13.0% 20+  4.2% broken/run 0.181 missed/run 0.214   paired +0.13 (SE 0.51)
gap   off: n  445 mean<20  5.42 <=0  8.3% 10+ 16.6% 20+  7.6% broken/run 0.292 missed/run 0.234
      ref: n  445 mean<20  3.93 <=0  9.4% 10+  9.2% 20+  2.7% broken/run 0.189 missed/run 0.261   paired -1.49 (SE 0.33)
duo   off: n  126 mean<20  6.13 <=0  5.6% 10+ 23.8% 20+  6.3% broken/run 0.389 missed/run 0.357
      ref: n  126 mean<20  3.18 <=0 18.3% 10+  4.8% 20+  0.8% broken/run 0.135 missed/run 0.286   paired -2.95 (SE 0.54)
toss  off: n   55 mean<20  5.29 <=0 20.0% 10+ 20.0% 20+  1.8% broken/run 0.109 missed/run 0.200
      ref: n   55 mean<20  4.51 <=0 23.6% 10+ 16.4% 20+  5.5% broken/run 0.236 missed/run 0.255   paired -0.78 (SE 1.04)
draw  off: n   85 mean<20  6.85 <=0 16.5% 10+ 27.1% 20+  5.9% broken/run 0.518 missed/run 0.365
      ref: n   85 mean<20  4.22 <=0 22.4% 10+ 10.6% 20+  1.2% broken/run 0.306 missed/run 0.259   paired -2.63 (SE 0.87)
all   off: n 1321 mean<20  5.19 <=0 10.9% 10+ 16.7% 20+  6.3% broken/run 0.302 missed/run 0.272
      ref: n 1321 mean<20  3.75 <=0 16.7% 10+  9.4% 20+  2.8% broken/run 0.176 missed/run 0.241   paired -1.44 (SE 0.19)
tackles off: missed 0.272  broken 0.302 (engaged-grab breaks 0.158)  missed + broken open 0.416 a run
tackles ref: missed 0.241  broken 0.176 (engaged-grab breaks 0.116)  missed + broken open 0.302 a run
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
  OU n370 DL blocked 51%  LB free 13%  LB blocked 9%  DL shed 8%  DB free 6%  LB shed 6%  DL free 5%  DB blocked 1%  DB shed 1%
     yards<20 by hitter class: free 5.16 (24%)  shed 1.81 (15%)  blocked 1.96 (61%)
  IN n192 DL blocked 33%  LB blocked 20%  LB free 15%  DL shed 12%  DB free 9%  LB shed 6%  DL free 3%  DB blocked 2%  DB shed 1%
     yards<20 by hitter class: free 5.83 (27%)  shed 3.43 (18%)  blocked 4.30 (55%)
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
   contact -1..0  front     n   74: hitter driven back median +0.35 yd (>=1 yd 30%), carrier gain median +0.78
   contact -1..0  side/rear n   69: hitter driven back median +0.73 yd (>=1 yd 48%), carrier gain median +1.67
   contact 0..1   front     n   38: hitter driven back median +0.38 yd (>=1 yd 18%), carrier gain median +0.81
   contact 0..1   side/rear n   47: hitter driven back median +1.08 yd (>=1 yd 55%), carrier gain median +1.80
   contact 1..3   front     n   47: hitter driven back median +0.39 yd (>=1 yd 17%), carrier gain median +0.75
   contact 1..3   side/rear n   68: hitter driven back median +1.70 yd (>=1 yd 68%), carrier gain median +1.98
```

### frontcourse

```
== NFL 2022
   speeds along the approach axis (yd/s) at -0.1 +0.0 +0.1 +0.2 +0.3 +0.5 +1.0 s; gain = runner, contact -> end
   all          n  556 torso  86% | runner +4.39 +4.21 +3.94 +3.61 +3.31 +2.69 +1.44 | hitter +0.46 +0.55 +0.61 +0.72 +0.78 +0.96 +0.97
                         sep +1.20 +0.87 +0.60 +0.51 +0.53 +0.73 +0.94 | gain +2.84 = hitter +1.00 + rel +1.38 | +0.2 s: blocker on him  59%, 2nd tackler  35% | to end 1.5 s
                         offset from his path: at contact 0.34 yd, at closest approach 0.32 yd, central (< 0.15 yd)  20%
   torso        n  478 torso 100% | runner +4.43 +4.24 +3.97 +3.63 +3.31 +2.69 +1.40 | hitter +0.37 +0.49 +0.58 +0.71 +0.78 +0.98 +1.00
                         sep +1.20 +0.85 +0.57 +0.48 +0.49 +0.65 +0.87 | gain +2.84 = hitter +1.00 + rel +1.39 | +0.2 s: blocker on him  56%, 2nd tackler  34% | to end 1.5 s
                         offset from his path: at contact 0.33 yd, at closest approach 0.30 yd, central (< 0.15 yd)  23%
   touch only   n   78 torso   0% | runner +4.08 +3.84 +3.60 +3.40 +3.26 +2.75 +1.84 | hitter +0.85 +0.82 +0.77 +0.81 +0.89 +0.91 +0.82
                         sep +1.17 +0.93 +0.80 +0.84 +0.97 +1.24 +1.49 | gain +2.89 = hitter +1.13 + rel +1.34 | +0.2 s: blocker on him  78%, 2nd tackler  44% | to end 1.7 s
                         offset from his path: at contact 0.48 yd, at closest approach 0.61 yd, central (< 0.15 yd)   4%
   blocked <3   n   68 torso  69% | runner +2.80 +2.54 +2.25 +1.99 +1.75 +1.35 +0.53 | hitter +0.21 +0.16 +0.21 +0.36 +0.37 +0.41 +0.31
                         sep +1.12 +0.91 +0.73 +0.60 +0.57 +0.62 +0.82 | gain +1.31 = hitter +0.36 + rel +0.93 | +0.2 s: blocker on him  91%, 2nd tackler  41% | to end 1.9 s
                         offset from his path: at contact 0.31 yd, at closest approach 0.31 yd, central (< 0.15 yd)  19%
   blocked 3-5  n  209 torso  86% | runner +4.33 +4.05 +3.78 +3.43 +3.13 +2.51 +1.36 | hitter +0.45 +0.53 +0.66 +0.70 +0.77 +1.01 +1.03
                         sep +1.18 +0.87 +0.62 +0.52 +0.54 +0.69 +0.86 | gain +2.83 = hitter +1.01 + rel +1.31 | +0.2 s: blocker on him  80%, 2nd tackler  39% | to end 1.6 s
                         offset from his path: at contact 0.35 yd, at closest approach 0.35 yd, central (< 0.15 yd)  18%
   blocked 5+   n  107 torso  84% | runner +5.74 +5.60 +5.40 +5.15 +4.77 +4.19 +2.89 | hitter +1.58 +1.64 +1.66 +1.68 +1.64 +1.78 +1.46
                         sep +1.24 +0.88 +0.59 +0.50 +0.59 +0.88 +1.45 | gain +4.24 = hitter +1.87 + rel +2.01 | +0.2 s: blocker on him  85%, 2nd tackler  34% | to end 1.5 s
                         offset from his path: at contact 0.40 yd, at closest approach 0.38 yd, central (< 0.15 yd)  12%
   shed <3      n   11 torso  82% | runner +2.68 +2.48 +2.17 +2.02 +1.55 +1.36 +0.61 | hitter -0.32 -0.28 -0.09 -0.04 -0.01 +0.38 +0.32
                         sep +1.13 +0.84 +0.63 +0.46 +0.53 +0.64 +0.59 | gain +1.62 = hitter +0.58 + rel +0.71 | +0.2 s: blocker on him   9%, 2nd tackler  27% | to end 1.5 s
                         offset from his path: at contact 0.35 yd, at closest approach 0.34 yd, central (< 0.15 yd)   9%
   shed 3-5     n   52 torso  90% | runner +4.17 +3.94 +3.67 +3.47 +3.06 +2.29 +0.90 | hitter +0.08 +0.26 +0.30 +0.52 +0.61 +0.77 +0.49
                         sep +1.26 +0.90 +0.55 +0.46 +0.47 +0.69 +0.99 | gain +2.15 = hitter +0.61 + rel +1.42 | +0.2 s: blocker on him   2%, 2nd tackler  33% | to end 1.6 s
                         offset from his path: at contact 0.39 yd, at closest approach 0.25 yd, central (< 0.15 yd)  25%
   shed 5+      n   24 torso 100% | runner +5.81 +5.62 +5.41 +5.09 +4.62 +3.97 +2.13 | hitter +1.19 +1.30 +1.25 +1.22 +1.54 +1.54 +1.83
                         sep +1.26 +0.85 +0.49 +0.41 +0.46 +1.09 +0.97 | gain +4.01 = hitter +1.95 + rel +1.98 | +0.2 s: blocker on him   8%, 2nd tackler  12% | to end 1.2 s
                         offset from his path: at contact 0.34 yd, at closest approach 0.30 yd, central (< 0.15 yd)  38%
   free <3      n   12 torso 100% | runner +3.01 +2.64 +2.09 +1.85 +1.48 +1.00 +0.57 | hitter -1.77 -1.53 -1.41 -0.88 -0.55 +0.13 +1.13
                         sep +1.20 +0.78 +0.53 +0.39 +0.37 +0.42 +0.40 | gain +1.66 = hitter +0.93 + rel +1.15 | +0.2 s: blocker on him  17%, 2nd tackler  25% | to end 2.0 s
                         offset from his path: at contact 0.18 yd, at closest approach 0.14 yd, central (< 0.15 yd)  50%
   free 3-5     n   51 torso  96% | runner +4.15 +3.92 +3.68 +3.30 +3.13 +2.74 +1.46 | hitter -0.87 -0.77 -0.37 -0.15 +0.23 +0.80 +0.92
                         sep +1.21 +0.79 +0.45 +0.37 +0.49 +0.84 +1.26 | gain +2.50 = hitter +0.73 + rel +1.40 | +0.2 s: blocker on him   4%, 2nd tackler  31% | to end 1.2 s
                         offset from his path: at contact 0.33 yd, at closest approach 0.29 yd, central (< 0.15 yd)  27%
   free 5+      n   22 torso  91% | runner +5.88 +5.61 +5.43 +5.15 +4.87 +4.37 +2.98 | hitter +1.54 +1.62 +1.65 +1.55 +1.55 +2.02 +2.06
                         sep +1.35 +0.86 +0.58 +0.55 +0.70 +0.96 +1.05 | gain +3.86 = hitter +1.73 + rel +1.68 | +0.2 s: blocker on him   0%, 2nd tackler  36% | to end 0.9 s
                         offset from his path: at contact 0.28 yd, at closest approach 0.29 yd, central (< 0.15 yd)  32%
   all <3       n   91 torso  75% | runner +2.83 +2.55 +2.21 +2.00 +1.72 +1.34 +0.57 | hitter -0.01 +0.01 +0.12 +0.11 +0.27 +0.38 +0.34
                         sep +1.13 +0.89 +0.69 +0.57 +0.52 +0.59 +0.68 | gain +1.34 = hitter +0.57 + rel +0.94 | +0.2 s: blocker on him  71%, 2nd tackler  37% | to end 1.9 s
                         offset from his path: at contact 0.26 yd, at closest approach 0.31 yd, central (< 0.15 yd)  22%
   all 3-5      n  312 torso  88% | runner +4.26 +4.00 +3.74 +3.42 +3.12 +2.48 +1.31 | hitter +0.23 +0.29 +0.33 +0.52 +0.62 +0.92 +0.89
                         sep +1.20 +0.86 +0.58 +0.49 +0.52 +0.72 +0.92 | gain +2.67 = hitter +0.87 + rel +1.34 | +0.2 s: blocker on him  55%, 2nd tackler  37% | to end 1.5 s
                         offset from his path: at contact 0.35 yd, at closest approach 0.31 yd, central (< 0.15 yd)  21%
   all 5+       n  153 torso  88% | runner +5.79 +5.61 +5.40 +5.14 +4.75 +4.13 +2.66 | hitter +1.49 +1.62 +1.57 +1.67 +1.61 +1.80 +1.49
                         sep +1.26 +0.87 +0.57 +0.50 +0.59 +0.92 +1.39 | gain +4.06 = hitter +1.87 + rel +1.80 | +0.2 s: blocker on him  61%, 2nd tackler  31% | to end 1.3 s
                         offset from his path: at contact 0.37 yd, at closest approach 0.36 yd, central (< 0.15 yd)  19%
   (no masses in this source: momentum omitted)
== zone-off.jsonl: front-on first contacts at -1..3 yd: 185  (torso-distance collisions 180)
   speeds along the approach axis (yd/s) at -0.1 +0.0 +0.1 +0.2 +0.3 +0.5 +1.0 s; gain = runner, contact -> end
   all          n  185 torso  97% | runner +5.54 +5.43 +3.54 +2.57 +2.25 +1.94 +1.70 | hitter +0.02 -0.20 +1.09 +1.66 +1.50 +1.36 +1.49
                         sep +1.27 +0.76 +0.52 +0.52 +0.52 +0.53 +0.74 | gain +1.61 = hitter +1.11 + rel +0.38 | +0.2 s: blocker on him  46%, 2nd tackler  19% | to end 0.9 s | m_r v_r - m_h v_h +532 kg yd/s
                         offset from his path: at contact 0.27 yd, at closest approach 0.30 yd, central (< 0.15 yd)  29%
   torso        n  180 torso 100% | runner +5.56 +5.48 +3.55 +2.56 +2.24 +1.91 +1.69 | hitter +0.01 -0.20 +1.09 +1.72 +1.54 +1.37 +1.47
                         sep +1.27 +0.75 +0.52 +0.52 +0.52 +0.53 +0.71 | gain +1.58 = hitter +1.11 + rel +0.37 | +0.2 s: blocker on him  46%, 2nd tackler  20% | to end 0.8 s | m_r v_r - m_h v_h +537 kg yd/s
                         offset from his path: at contact 0.27 yd, at closest approach 0.29 yd, central (< 0.15 yd)  29%
   touch only   n    5 torso   0% | runner +4.10 +3.47 +3.42 +3.58 +3.14 +3.41 +2.50 | hitter +1.29 +1.09 +1.09 +0.96 +0.97 +1.34 +2.28
                         sep +1.10 +0.97 +0.83 +0.92 +1.01 +1.33 +2.01 | gain +8.70 = hitter +7.45 + rel +1.24 | +0.2 s: blocker on him  60%, 2nd tackler   0% | to end 2.0 s | m_r v_r - m_h v_h +175 kg yd/s
                         offset from his path: at contact 0.57 yd, at closest approach 0.66 yd, central (< 0.15 yd)   0%
   blocked <3   n   12 torso  92% | runner +2.35 +2.49 +1.92 +1.35 +0.76 +0.75 +0.05 | hitter -0.36 -0.60 -0.34 +0.47 +0.44 +0.51 +0.02
                         sep +1.10 +0.86 +0.55 +0.53 +0.53 +0.54 +0.71 | gain +0.82 = hitter +0.15 + rel +0.53 | +0.2 s: blocker on him  83%, 2nd tackler  17% | to end 1.3 s | m_r v_r - m_h v_h +263 kg yd/s
                         offset from his path: at contact 0.16 yd, at closest approach 0.31 yd, central (< 0.15 yd)  25%
   blocked 3-5  n   42 torso  93% | runner +4.27 +4.28 +3.40 +2.16 +1.93 +1.38 +0.86 | hitter +0.13 -0.10 +0.37 +0.79 +0.76 +0.82 +0.90
                         sep +1.17 +0.81 +0.55 +0.55 +0.56 +0.57 +0.66 | gain +1.68 = hitter +0.95 + rel +0.43 | +0.2 s: blocker on him  71%, 2nd tackler  26% | to end 1.2 s | m_r v_r - m_h v_h +390 kg yd/s
                         offset from his path: at contact 0.34 yd, at closest approach 0.31 yd, central (< 0.15 yd)  29%
   blocked 5+   n   71 torso 100% | runner +5.93 +6.06 +4.18 +2.95 +2.59 +2.14 +2.47 | hitter +0.36 +0.20 +1.60 +2.03 +1.80 +1.54 +2.08
                         sep +1.30 +0.72 +0.52 +0.53 +0.53 +0.56 +1.35 | gain +1.83 = hitter +1.25 + rel +0.48 | +0.2 s: blocker on him  63%, 2nd tackler  20% | to end 0.8 s | m_r v_r - m_h v_h +560 kg yd/s
                         offset from his path: at contact 0.28 yd, at closest approach 0.31 yd, central (< 0.15 yd)  27%
   shed 3-5     n    7 torso 100% | runner +4.61 +4.49 +3.05 +1.49 +1.46 +1.32 +0.43 | hitter -1.41 -1.60 +0.16 +0.52 +0.97 +1.34 +0.50
                         sep +1.27 +0.75 +0.51 +0.50 +0.50 +0.50 +0.51 | gain +1.15 = hitter +0.84 + rel +0.31 | +0.2 s: blocker on him   0%, 2nd tackler  14% | to end 0.8 s | m_r v_r - m_h v_h +547 kg yd/s
                         offset from his path: at contact 0.26 yd, at closest approach 0.36 yd, central (< 0.15 yd)  29%
   shed 5+      n   12 torso 100% | runner +6.18 +5.81 +3.49 +2.95 +2.83 +2.21 +4.05 | hitter -0.86 -0.93 +1.48 +2.20 +1.98 +1.47 +2.02
                         sep +1.38 +0.71 +0.51 +0.50 +0.50 +0.50 +3.18 | gain +1.74 = hitter +1.27 + rel +0.42 | +0.2 s: blocker on him   0%, 2nd tackler   8% | to end 0.6 s | m_r v_r - m_h v_h +690 kg yd/s
                         offset from his path: at contact 0.23 yd, at closest approach 0.30 yd, central (< 0.15 yd)  25%
   free 3-5     n    6 torso 100% | runner +4.80 +4.34 +2.68 +1.41 +1.51 +1.36 +1.02 | hitter -1.13 -1.08 -0.06 +1.34 +1.42 +1.38 +0.98
                         sep +1.28 +0.72 +0.49 +0.49 +0.49 +0.49 +0.47 | gain +1.31 = hitter +1.01 + rel +0.30 | +0.2 s: blocker on him   0%, 2nd tackler  33% | to end 0.8 s | m_r v_r - m_h v_h +511 kg yd/s
                         offset from his path: at contact 0.12 yd, at closest approach 0.09 yd, central (< 0.15 yd)  67%
   free 5+      n   33 torso  97% | runner +6.40 +6.24 +4.43 +3.19 +2.94 +2.57 +3.45 | hitter -0.59 -0.33 +1.91 +2.53 +2.46 +2.59 +3.47
                         sep +1.34 +0.70 +0.51 +0.52 +0.51 +0.52 +0.57 | gain +1.67 = hitter +1.45 + rel +0.27 | +0.2 s: blocker on him   3%, 2nd tackler   9% | to end 0.6 s | m_r v_r - m_h v_h +623 kg yd/s
                         offset from his path: at contact 0.26 yd, at closest approach 0.34 yd, central (< 0.15 yd)  27%
   all <3       n   14 torso  93% | runner +2.35 +2.49 +2.04 +1.35 +0.76 +0.82 +0.08 | hitter -0.36 -0.60 -0.44 +0.47 +0.50 +0.54 +0.12
                         sep +1.12 +0.88 +0.56 +0.53 +0.53 +0.54 +0.63 | gain +0.83 = hitter +0.24 + rel +0.43 | +0.2 s: blocker on him  71%, 2nd tackler  29% | to end 1.2 s | m_r v_r - m_h v_h +263 kg yd/s
                         offset from his path: at contact 0.17 yd, at closest approach 0.29 yd, central (< 0.15 yd)  29%
   all 3-5      n   55 torso  95% | runner +4.37 +4.37 +3.38 +1.97 +1.76 +1.38 +0.87 | hitter +0.01 -0.29 +0.31 +0.84 +0.82 +0.87 +0.94
                         sep +1.18 +0.78 +0.54 +0.53 +0.53 +0.54 +0.64 | gain +1.54 = hitter +0.84 + rel +0.42 | +0.2 s: blocker on him  55%, 2nd tackler  25% | to end 1.0 s | m_r v_r - m_h v_h +457 kg yd/s
                         offset from his path: at contact 0.34 yd, at closest approach 0.30 yd, central (< 0.15 yd)  33%
   all 5+       n  116 torso  99% | runner +6.06 +6.08 +4.20 +3.01 +2.80 +2.41 +2.64 | hitter +0.06 +0.06 +1.63 +2.16 +1.95 +1.68 +2.13
                         sep +1.30 +0.72 +0.52 +0.52 +0.52 +0.53 +1.07 | gain +1.78 = hitter +1.31 + rel +0.37 | +0.2 s: blocker on him  40%, 2nd tackler  16% | to end 0.6 s | m_r v_r - m_h v_h +591 kg yd/s
                         offset from his path: at contact 0.25 yd, at closest approach 0.31 yd, central (< 0.15 yd)  27%
== zone-ref.jsonl: front-on first contacts at -1..3 yd: 159  (torso-distance collisions 148)
   speeds along the approach axis (yd/s) at -0.1 +0.0 +0.1 +0.2 +0.3 +0.5 +1.0 s; gain = runner, contact -> end
   all          n  159 torso  93% | runner +4.75 +4.68 +3.10 +2.00 +1.75 +1.23 +1.30 | hitter +0.35 +0.00 +0.80 +1.39 +1.23 +0.98 +0.85
                         sep +1.21 +0.77 +0.53 +0.52 +0.53 +0.53 +0.56 | gain +1.28 = hitter +0.83 + rel +0.35 | +0.2 s: blocker on him  44%, 2nd tackler  16% | to end 0.9 s | m_r v_r - m_h v_h +421 kg yd/s
                         offset from his path: at contact 0.30 yd, at closest approach 0.27 yd, central (< 0.15 yd)  23%
   torso        n  148 torso 100% | runner +4.75 +4.68 +3.06 +1.90 +1.62 +1.18 +1.23 | hitter +0.38 +0.00 +0.86 +1.46 +1.26 +0.99 +0.76
                         sep +1.21 +0.75 +0.52 +0.52 +0.52 +0.52 +0.53 | gain +1.24 = hitter +0.79 + rel +0.34 | +0.2 s: blocker on him  45%, 2nd tackler  17% | to end 0.9 s | m_r v_r - m_h v_h +421 kg yd/s
                         offset from his path: at contact 0.27 yd, at closest approach 0.26 yd, central (< 0.15 yd)  24%
   touch only   n   11 torso   0% | runner +4.79 +4.79 +4.73 +4.74 +4.51 +4.28 +3.01 | hitter +0.21 -0.21 -0.29 -0.03 +0.14 +0.71 +1.80
                         sep +1.18 +0.91 +0.75 +0.89 +1.10 +1.53 +2.68 | gain +5.80 = hitter +3.23 + rel +1.40 | +0.2 s: blocker on him  27%, 2nd tackler   9% | to end 2.1 s | m_r v_r - m_h v_h +377 kg yd/s
                         offset from his path: at contact 0.46 yd, at closest approach 0.64 yd, central (< 0.15 yd)   0%
   blocked <3   n    8 torso  88% | runner +2.82 +2.35 +1.84 +1.01 +0.83 +0.70 +0.38 | hitter -0.55 -0.41 -0.31 +0.15 +0.42 +0.13 -0.05
                         sep +1.12 +0.79 +0.53 +0.53 +0.54 +0.57 +0.57 | gain +1.03 = hitter +0.15 + rel +0.60 | +0.2 s: blocker on him  88%, 2nd tackler  25% | to end 1.2 s | m_r v_r - m_h v_h +299 kg yd/s
                         offset from his path: at contact 0.48 yd, at closest approach 0.32 yd, central (< 0.15 yd)   0%
   blocked 3-5  n   71 torso  93% | runner +4.72 +4.62 +3.32 +2.02 +1.76 +1.22 +1.26 | hitter +0.63 +0.26 +0.84 +1.36 +1.17 +0.97 +0.80
                         sep +1.17 +0.78 +0.54 +0.54 +0.53 +0.54 +0.57 | gain +1.34 = hitter +0.89 + rel +0.42 | +0.2 s: blocker on him  65%, 2nd tackler  17% | to end 1.1 s | m_r v_r - m_h v_h +397 kg yd/s
                         offset from his path: at contact 0.25 yd, at closest approach 0.28 yd, central (< 0.15 yd)  24%
   blocked 5+   n   27 torso  85% | runner +5.36 +5.31 +3.99 +2.30 +2.13 +2.01 +1.85 | hitter +0.87 +0.39 +1.17 +1.65 +1.33 +1.26 +1.51
                         sep +1.25 +0.75 +0.56 +0.57 +0.57 +0.57 +0.84 | gain +1.77 = hitter +1.66 + rel +0.41 | +0.2 s: blocker on him  44%, 2nd tackler  11% | to end 1.2 s | m_r v_r - m_h v_h +482 kg yd/s
                         offset from his path: at contact 0.29 yd, at closest approach 0.27 yd, central (< 0.15 yd)  19%
   shed 3-5     n   14 torso 100% | runner +4.78 +4.66 +2.79 +1.68 +1.57 +1.23 +1.07 | hitter -0.01 -0.43 +1.07 +1.37 +1.33 +1.08 +0.98
                         sep +1.17 +0.70 +0.53 +0.52 +0.52 +0.51 +0.51 | gain +1.21 = hitter +0.67 + rel +0.26 | +0.2 s: blocker on him   0%, 2nd tackler  36% | to end 0.8 s | m_r v_r - m_h v_h +477 kg yd/s
                         offset from his path: at contact 0.33 yd, at closest approach 0.26 yd, central (< 0.15 yd)  36%
   free 3-5     n   29 torso  97% | runner +4.64 +4.56 +3.49 +1.98 +1.62 +1.20 +1.27 | hitter +0.17 -0.12 +0.52 +1.61 +1.60 +1.07 +1.25
                         sep +1.29 +0.79 +0.50 +0.50 +0.50 +0.50 +0.52 | gain +1.17 = hitter +0.76 + rel +0.33 | +0.2 s: blocker on him  14%, 2nd tackler  10% | to end 0.7 s | m_r v_r - m_h v_h +461 kg yd/s
                         offset from his path: at contact 0.30 yd, at closest approach 0.26 yd, central (< 0.15 yd)  21%
   all <3       n   12 torso  92% | runner +2.82 +2.44 +1.97 +0.71 +0.78 +0.56 +0.18 | hitter -0.69 -0.96 -0.63 +0.26 +0.44 +0.35 -0.17
                         sep +1.13 +0.84 +0.52 +0.51 +0.51 +0.51 +0.56 | gain +0.83 = hitter -0.01 + rel +0.49 | +0.2 s: blocker on him  58%, 2nd tackler  17% | to end 1.1 s | m_r v_r - m_h v_h +335 kg yd/s
                         offset from his path: at contact 0.40 yd, at closest approach 0.28 yd, central (< 0.15 yd)   8%
   all 3-5      n  114 torso  95% | runner +4.72 +4.62 +3.19 +2.01 +1.64 +1.22 +1.27 | hitter +0.44 +0.00 +0.80 +1.37 +1.23 +1.06 +0.85
                         sep +1.20 +0.78 +0.52 +0.52 +0.52 +0.52 +0.54 | gain +1.29 = hitter +0.85 + rel +0.35 | +0.2 s: blocker on him  44%, 2nd tackler  18% | to end 0.9 s | m_r v_r - m_h v_h +412 kg yd/s
                         offset from his path: at contact 0.27 yd, at closest approach 0.27 yd, central (< 0.15 yd)  25%
   all 5+       n   33 torso  88% | runner +5.35 +5.29 +3.83 +2.17 +2.07 +1.66 +2.26 | hitter +0.72 +0.27 +1.17 +1.65 +1.33 +1.23 +1.56
                         sep +1.25 +0.74 +0.56 +0.56 +0.57 +0.56 +0.78 | gain +1.67 = hitter +1.65 + rel +0.32 | +0.2 s: blocker on him  39%, 2nd tackler  12% | to end 0.9 s | m_r v_r - m_h v_h +487 kg yd/s
                         offset from his path: at contact 0.29 yd, at closest approach 0.26 yd, central (< 0.15 yd)  21%
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
== zone-ref.jsonl contacts 343
   0 defenders within 1 yd: 580 frames, carrier fwd speed median +4.29 yd/s, stalled (<0.5) 3%
   1 defenders within 1 yd: 2206 frames, carrier fwd speed median +1.84 yd/s, stalled (<0.5) 17%
   2 defenders within 1 yd: 1261 frames, carrier fwd speed median +0.83 yd/s, stalled (<0.5) 35%
   3+ defenders within 1 yd: 871 frames, carrier fwd speed median +0.48 yd/s, stalled (<0.5) 51%
   2nd defender arrives: 73% of contacts, median 0.5 s after first contact; 3rd: 36%, median 1.2 s
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
  solo n  119  DL depth 0.5 +0.28  1.0 +0.51  2.0 +0.90 | back>=.5 from 0.5s 10%  from snap 3%
  dbl  n   10  DL depth 0.5 +0.49  1.0 +0.68  2.0 +1.47 | back>=.5 from 0.5s 0%  from snap 0%
  free n 1107  DL depth 0.5 +0.15  1.0 +0.41  2.0 +0.70 | back>=.5 from 0.5s 7%  from snap 6%
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
  IN n196 by0.6 93% by1.0 99% by1.5 99%  median OL lateral speed at 0.5 s 1.30
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
  IN n 120 t0.5 depth +0.66 in +0.23  t1.0 depth +0.25 in +1.07  t1.5 depth -0.36 in +2.03
  OU n 211 t0.5 depth +0.61 in +0.21  t1.0 depth +0.02 in +1.15  t1.5 depth -0.47 in +2.40
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
  IN snap depth 0.90 off-centre 5.34 n 113 t0.5 depth +0.53 in +0.10 OT -0.81/+0.39w gap 2.38  t1.0 depth -0.10 in +0.35 OT -0.34/+1.42w gap 1.12  t1.5 depth -0.12 in -0.05 OT +0.14/+2.20w gap 1.14
  OU snap depth 0.90 off-centre 5.36 n 226 t0.5 depth +0.52 in +0.08 OT -0.89/+0.46w gap 2.38  t1.0 depth -0.30 in +0.32 OT -0.73/+1.68w gap 1.12  t1.5 depth -0.48 in -0.46 OT -0.54/+2.72w gap 1.32
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
  gun    INSIDE ZONE     95 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.01 -0.85 0.87 | +3.10 +2.86 4.19   47
  gun    COUNTER         75 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.03 -0.85 0.86 | +3.18 +2.77 4.23   50
  gun    TRAP            71 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | -0.02 -0.84 0.86 | +2.95 +2.76 4.07   47
  gun    POWER           63 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.03 -0.85 0.86 | +3.14 +2.75 4.22   49
  pistol OUTSIDE ZONE    54 1.00 |  4.5  4.5  4.5 +0.20  0.0 | +0.00  7.2 | +0.44 +1.18 1.26 | +1.62 +3.66 4.01   23
  pistol INSIDE ZONE     32 1.00 |  4.5  4.5  4.5 +0.20  0.0 | +0.00  7.2 | +0.43 +1.21 1.28 | +1.56 +3.69 4.00   23
  pistol POWER           17 1.20 |  4.5  4.5  4.4 +0.21  0.2 | -0.00  7.2 | +0.67 +0.61 0.91 | +1.76 +4.06 4.46   23
  pistol COUNTER         16 1.30 |  4.5  4.5  4.5 +0.20  0.1 | -0.00  7.2 | +0.54 +0.93 1.08 | +1.58 +3.97 4.25   21
  pistol TRAP            13 0.90 |  4.5  4.5  4.5 +0.21  0.1 | +0.00  7.2 | +0.59 +0.81 1.01 | +1.52 +4.03 4.31   21
  under  OUTSIDE ZONE   132 1.40 |  1.8  2.3  4.1 +2.14  3.4 | +0.00  7.3 | +1.07 +0.53 1.22 | +3.58 +3.24 4.80   48
  under  INSIDE ZONE     69 1.20 |  1.8  2.4  3.3 +0.46  1.2 | -0.00  7.3 | +0.49 +1.21 1.30 | +1.49 +4.57 4.80   18
  under  TRAP            67 1.10 |  1.8  2.4  3.2 +0.45  1.4 | -0.00  7.3 | +0.53 +1.16 1.28 | +1.57 +4.36 4.74   19
  under  POWER           65 1.40 |  1.8  2.4  3.4 +0.48  0.2 | +0.00  7.3 | +0.51 +1.01 1.13 | +1.45 +4.08 4.40   20
  under  COUNTER         56 1.60 |  1.8  2.3  3.4 +0.48  0.1 | +0.00  7.3 | +0.49 +1.03 1.14 | +1.33 +4.00 4.22   18
```

