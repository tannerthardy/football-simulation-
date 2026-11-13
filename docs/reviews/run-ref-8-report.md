# Run-game report: run-ref-8 @ f96e5b2e

Run set f0a8e75b8620 (12 run-only games captured at 1b5415de). Yards capped at 20 for means.

## Yards and tackles

```
plays 1321 / 1321, errors 0
OZ    off: n  395 mean<20  4.69 <=0 10.9% 10+ 13.2% 20+  5.3% broken/run 0.301 missed/run 0.281
      ref: n  395 mean<20  3.18 <=0 18.0% 10+  7.3% 20+  2.5% broken/run 0.157 missed/run 0.228   paired -1.51 (SE 0.34)
IZ    off: n  215 mean<20  4.40 <=0 14.9% 10+ 14.4% 20+  6.5% broken/run 0.237 missed/run 0.265
      ref: n  215 mean<20  4.35 <=0 15.3% 10+ 12.1% 20+  3.7% broken/run 0.200 missed/run 0.214   paired -0.05 (SE 0.51)
gap   off: n  445 mean<20  5.42 <=0  8.3% 10+ 16.6% 20+  7.6% broken/run 0.292 missed/run 0.234
      ref: n  445 mean<20  4.05 <=0  9.4% 10+  7.6% 20+  1.8% broken/run 0.162 missed/run 0.249   paired -1.37 (SE 0.32)
duo   off: n  126 mean<20  6.13 <=0  5.6% 10+ 23.8% 20+  6.3% broken/run 0.389 missed/run 0.357
      ref: n  126 mean<20  3.23 <=0 17.5% 10+  4.0% 20+  0.8% broken/run 0.143 missed/run 0.294   paired -2.91 (SE 0.54)
toss  off: n   55 mean<20  5.29 <=0 20.0% 10+ 20.0% 20+  1.8% broken/run 0.109 missed/run 0.200
      ref: n   55 mean<20  4.76 <=0 21.8% 10+ 16.4% 20+  3.6% broken/run 0.273 missed/run 0.255   paired -0.53 (SE 1.03)
draw  off: n   85 mean<20  6.85 <=0 16.5% 10+ 27.1% 20+  5.9% broken/run 0.518 missed/run 0.365
      ref: n   85 mean<20  4.28 <=0 22.4% 10+ 11.8% 20+  1.2% broken/run 0.294 missed/run 0.235   paired -2.57 (SE 0.88)
all   off: n 1321 mean<20  5.19 <=0 10.9% 10+ 16.7% 20+  6.3% broken/run 0.302 missed/run 0.272
      ref: n 1321 mean<20  3.80 <=0 15.1% 10+  8.6% 20+  2.3% broken/run 0.178 missed/run 0.241   paired -1.38 (SE 0.19)
tackles off: missed 0.272  broken 0.302 (engaged-grab breaks 0.158)  missed + broken open 0.416 a run
tackles ref: missed 0.241  broken 0.178 (engaged-grab breaks 0.111)  missed + broken open 0.308 a run
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
  OU n371 DL blocked 50%  LB blocked 14%  LB free 13%  DB free 6%  DL shed 6%  DL free 6%  LB shed 4%  DB shed 1%  DB blocked 1%
     yards<20 by hitter class: free 4.21 (25%)  shed 2.08 (11%)  blocked 2.53 (64%)
  IN n191 DL blocked 35%  LB blocked 16%  LB free 15%  DL shed 12%  DB free 10%  LB shed 8%  DL free 3%  DB blocked 1%  DB shed 1%
     yards<20 by hitter class: free 6.64 (28%)  shed 2.35 (21%)  blocked 3.90 (51%)
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
   contact -1..0  front     n   79: hitter driven back median +0.42 yd (>=1 yd 24%), carrier gain median +0.82
   contact -1..0  side/rear n   67: hitter driven back median +0.88 yd (>=1 yd 48%), carrier gain median +2.32
   contact 0..1   front     n   40: hitter driven back median +0.37 yd (>=1 yd 22%), carrier gain median +0.76
   contact 0..1   side/rear n   49: hitter driven back median +1.02 yd (>=1 yd 53%), carrier gain median +1.35
   contact 1..3   front     n   56: hitter driven back median +0.46 yd (>=1 yd 25%), carrier gain median +0.81
   contact 1..3   side/rear n   65: hitter driven back median +1.34 yd (>=1 yd 65%), carrier gain median +1.74
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
   -- aligned on first torso distance (<= 0.65 yd; else closest approach), by closing speed (runner - hitter, frame before)
      speeds along the approach axis (yd/s) at -0.1 +0.0 +0.1 +0.2 +0.3 +0.5 +1.0 s from torso distance
   all                    n  185 closing 5.54 yd/s, torso at +0.1 s after proximity | runner +5.54 +4.65 +2.76 +2.43 +2.18 +1.99 +1.57 | hitter -0.11 +0.26 +1.79 +1.54 +1.47 +1.42 +1.57 | sep +0.89 +0.53 +0.52 +0.52 +0.53 +0.54 +0.76
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  39/ 10 deg, side-on  46%  torso  36/ 11 deg, side-on  42%  torso+0.3  47/ 20 deg, side-on  51%
   closing <3             n   16 closing 2.03 yd/s, torso at +0.1 s after proximity | runner +2.87 +2.70 +1.82 +1.74 +1.67 +1.13 +0.03 | hitter +0.78 +0.64 +1.00 +1.03 +1.01 +0.84 +0.02 | sep +0.81 +0.56 +0.52 +0.53 +0.54 +0.54 +0.60
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  57/ 14 deg, side-on  75%  torso  52/ 18 deg, side-on  56%  torso+0.3  59/ 23 deg, side-on  56%
   closing 3-5            n   55 closing 4.28 yd/s, torso at +0.1 s after proximity | runner +4.52 +4.18 +2.56 +2.14 +1.82 +1.48 +1.25 | hitter +0.49 +0.72 +1.42 +1.50 +1.34 +1.31 +1.20 | sep +0.81 +0.54 +0.53 +0.53 +0.53 +0.54 +0.69
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  37/ 11 deg, side-on  40%  torso  36/ 11 deg, side-on  35%  torso+0.3  33/ 24 deg, side-on  36%
   closing 5+             n  114 closing 6.35 yd/s, torso at +0.1 s after proximity | runner +5.98 +5.26 +2.93 +2.63 +2.53 +2.20 +2.31 | hitter -0.55 -0.05 +1.90 +1.78 +1.54 +1.59 +2.18 | sep +0.96 +0.52 +0.52 +0.52 +0.52 +0.53 +1.10
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  33/ 10 deg, side-on  45%  torso  36/ 11 deg, side-on  44%  torso+0.3  52/ 18 deg, side-on  57%
   blocked closing 3-5    n   45 closing 4.20 yd/s, torso at +0.1 s after proximity | runner +4.49 +3.88 +2.52 +2.04 +1.80 +1.39 +1.30 | hitter +0.28 +0.72 +1.31 +1.30 +1.22 +1.15 +1.24 | sep +0.81 +0.54 +0.53 +0.53 +0.54 +0.54 +0.71
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  38/ 10 deg, side-on  42%  torso  39/ 11 deg, side-on  36%  torso+0.3  36/ 24 deg, side-on  38%
   blocked closing 5+     n   65 closing 6.03 yd/s, torso at +0.1 s after proximity | runner +5.93 +5.28 +2.94 +2.62 +2.56 +2.58 +2.06 | hitter -0.29 -0.01 +1.83 +1.39 +1.22 +1.51 +1.86 | sep +0.97 +0.53 +0.53 +0.53 +0.54 +0.74 +1.26
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  60/ 10 deg, side-on  60%  torso  58/ 11 deg, side-on  60%  torso+0.3  60/ 20 deg, side-on  63%
   free closing 3-5       n    5 closing 4.69 yd/s, torso at +0.1 s after proximity | runner +6.23 +5.20 +3.30 +3.00 +2.75 +2.27 +0.85 | hitter +1.45 +1.44 +3.36 +3.09 +2.94 +2.62 +0.82 | sep +0.81 +0.53 +0.51 +0.50 +0.51 +0.50 +0.47
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  36/ 20 deg, side-on   0%  torso  18/ 20 deg, side-on   0%  torso+0.3  21/ 25 deg, side-on  40%
   free closing 5+        n   34 closing 6.70 yd/s, torso at +0.1 s after proximity | runner +6.31 +5.27 +2.95 +2.75 +2.68 +2.08 +3.35 | hitter -0.91 +0.28 +2.29 +2.52 +2.33 +1.96 +3.51 | sep +0.95 +0.51 +0.51 +0.51 +0.51 +0.51 +0.59
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  19/  8 deg, side-on   6%  torso  20/  5 deg, side-on   6%  torso+0.3  39/ 12 deg, side-on  44%
== zone-ref.jsonl: front-on first contacts at -1..3 yd: 175  (torso-distance collisions 164)
   speeds along the approach axis (yd/s) at -0.1 +0.0 +0.1 +0.2 +0.3 +0.5 +1.0 s; gain = runner, contact -> end
   all          n  175 torso  94% | runner +4.74 +4.65 +3.23 +1.96 +1.82 +1.41 +1.18 | hitter +0.32 +0.01 +0.79 +1.42 +1.20 +1.03 +1.05
                         sep +1.22 +0.78 +0.52 +0.53 +0.52 +0.53 +0.59 | gain +1.44 = hitter +0.84 + rel +0.37 | +0.2 s: blocker on him  47%, 2nd tackler  19% | to end 0.9 s | m_r v_r - m_h v_h +431 kg yd/s
                         offset from his path: at contact 0.28 yd, at closest approach 0.28 yd, central (< 0.15 yd)  28%
   torso        n  164 torso 100% | runner +4.74 +4.65 +3.23 +1.95 +1.77 +1.36 +1.20 | hitter +0.35 +0.03 +0.82 +1.47 +1.21 +1.01 +1.02
                         sep +1.22 +0.77 +0.52 +0.52 +0.52 +0.52 +0.57 | gain +1.39 = hitter +0.81 + rel +0.36 | +0.2 s: blocker on him  46%, 2nd tackler  20% | to end 0.9 s | m_r v_r - m_h v_h +429 kg yd/s
                         offset from his path: at contact 0.27 yd, at closest approach 0.27 yd, central (< 0.15 yd)  29%
   touch only   n   11 torso   0% | runner +4.64 +4.66 +4.66 +4.66 +4.40 +3.00 +0.65 | hitter +0.23 -0.21 -0.22 -0.21 +0.42 +1.27 +1.49
                         sep +1.27 +0.95 +0.75 +0.82 +1.06 +1.30 +1.35 | gain +3.00 = hitter +1.99 + rel +1.16 | +0.2 s: blocker on him  55%, 2nd tackler   0% | to end 1.5 s | m_r v_r - m_h v_h +476 kg yd/s
                         offset from his path: at contact 0.43 yd, at closest approach 0.63 yd, central (< 0.15 yd)   9%
   blocked <3   n   13 torso  77% | runner +2.72 +2.47 +2.09 +1.76 +1.13 +0.52 +0.90 | hitter +0.72 +0.11 +0.01 +0.12 +0.42 +0.59 +0.64
                         sep +1.11 +0.87 +0.72 +0.58 +0.54 +0.55 +0.58 | gain +0.80 = hitter +0.67 + rel +0.55 | +0.2 s: blocker on him  92%, 2nd tackler  31% | to end 1.4 s | m_r v_r - m_h v_h +199 kg yd/s
                         offset from his path: at contact 0.35 yd, at closest approach 0.40 yd, central (< 0.15 yd)  15%
   blocked 3-5  n   82 torso  94% | runner +4.73 +4.57 +3.32 +2.06 +1.87 +1.56 +1.30 | hitter +0.52 +0.26 +0.77 +1.34 +1.15 +1.07 +1.05
                         sep +1.20 +0.78 +0.56 +0.54 +0.55 +0.56 +0.61 | gain +1.80 = hitter +0.99 + rel +0.50 | +0.2 s: blocker on him  66%, 2nd tackler  21% | to end 1.2 s | m_r v_r - m_h v_h +408 kg yd/s
                         offset from his path: at contact 0.28 yd, at closest approach 0.30 yd, central (< 0.15 yd)  27%
   blocked 5+   n   29 torso  93% | runner +5.24 +5.23 +4.11 +2.17 +2.07 +1.66 +2.61 | hitter +0.52 +0.17 +1.09 +1.63 +1.29 +1.22 +1.70
                         sep +1.29 +0.83 +0.55 +0.55 +0.56 +0.55 +1.43 | gain +1.81 = hitter +1.18 + rel +0.40 | +0.2 s: blocker on him  55%, 2nd tackler   3% | to end 0.9 s | m_r v_r - m_h v_h +487 kg yd/s
                         offset from his path: at contact 0.25 yd, at closest approach 0.25 yd, central (< 0.15 yd)  28%
   shed 3-5     n   14 torso  93% | runner +4.68 +4.43 +3.13 +1.47 +1.39 +1.40 +0.82 | hitter -0.42 -0.81 +0.24 +1.12 +1.19 +1.00 +0.29
                         sep +1.26 +0.80 +0.52 +0.53 +0.53 +0.53 +0.71 | gain +1.19 = hitter +0.54 + rel +0.32 | +0.2 s: blocker on him   0%, 2nd tackler  29% | to end 0.9 s | m_r v_r - m_h v_h +522 kg yd/s
                         offset from his path: at contact 0.18 yd, at closest approach 0.13 yd, central (< 0.15 yd)  57%
   free 3-5     n   31 torso 100% | runner +4.74 +4.58 +2.86 +1.93 +1.57 +1.00 +0.94 | hitter +0.00 -0.44 +0.96 +1.67 +1.51 +0.99 +1.04
                         sep +1.24 +0.72 +0.51 +0.50 +0.51 +0.51 +0.51 | gain +1.07 = hitter +0.75 + rel +0.20 | +0.2 s: blocker on him   0%, 2nd tackler  19% | to end 0.6 s | m_r v_r - m_h v_h +442 kg yd/s
                         offset from his path: at contact 0.28 yd, at closest approach 0.25 yd, central (< 0.15 yd)  29%
   all <3       n   15 torso  80% | runner +2.72 +2.52 +2.09 +1.54 +0.72 +0.52 +0.87 | hitter +0.36 +0.01 +0.01 +0.15 +0.42 +0.59 +0.45
                         sep +1.12 +0.87 +0.66 +0.55 +0.54 +0.52 +0.57 | gain +0.75 = hitter +0.53 + rel +0.41 | +0.2 s: blocker on him  80%, 2nd tackler  27% | to end 1.3 s | m_r v_r - m_h v_h +285 kg yd/s
                         offset from his path: at contact 0.35 yd, at closest approach 0.38 yd, central (< 0.15 yd)  13%
   all 3-5      n  127 torso  95% | runner +4.72 +4.56 +3.19 +1.95 +1.82 +1.42 +1.12 | hitter +0.25 -0.01 +0.79 +1.41 +1.19 +1.04 +1.04
                         sep +1.22 +0.77 +0.52 +0.52 +0.52 +0.53 +0.59 | gain +1.44 = hitter +0.84 + rel +0.35 | +0.2 s: blocker on him  43%, 2nd tackler  21% | to end 0.9 s | m_r v_r - m_h v_h +432 kg yd/s
                         offset from his path: at contact 0.28 yd, at closest approach 0.27 yd, central (< 0.15 yd)  31%
   all 5+       n   33 torso  94% | runner +5.24 +5.23 +4.07 +2.17 +2.07 +1.66 +2.61 | hitter +0.48 +0.08 +1.12 +1.63 +1.31 +1.22 +1.70
                         sep +1.27 +0.81 +0.55 +0.53 +0.54 +0.53 +1.43 | gain +1.81 = hitter +1.18 + rel +0.40 | +0.2 s: blocker on him  48%, 2nd tackler   6% | to end 0.8 s | m_r v_r - m_h v_h +498 kg yd/s
                         offset from his path: at contact 0.30 yd, at closest approach 0.27 yd, central (< 0.15 yd)  24%
   -- aligned on first torso distance (<= 0.65 yd; else closest approach), by closing speed (runner - hitter, frame before)
      speeds along the approach axis (yd/s) at -0.1 +0.0 +0.1 +0.2 +0.3 +0.5 +1.0 s from torso distance
   all                    n  175 closing 4.55 yd/s, torso at +0.1 s after proximity | runner +4.66 +3.88 +1.98 +1.79 +1.61 +1.38 +1.23 | hitter +0.08 +0.35 +1.41 +1.26 +1.15 +0.95 +0.96 | sep +0.84 +0.55 +0.52 +0.52 +0.53 +0.53 +0.62
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  36/  3 deg, side-on  40%  torso  36/  7 deg, side-on  39%  torso+0.3  41/ 16 deg, side-on  44%
   closing <3             n   29 closing 2.17 yd/s, torso at +0.2 s after proximity | runner +3.54 +3.26 +2.63 +1.93 +1.71 +1.12 +0.95 | hitter +1.35 +1.50 +1.62 +1.73 +1.51 +1.08 +0.96 | sep +0.76 +0.61 +0.52 +0.52 +0.53 +0.53 +0.57
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  54/  3 deg, side-on  52%  torso  39/ 11 deg, side-on  45%  torso+0.3  44/ 25 deg, side-on  48%
   closing 3-5            n   81 closing 4.15 yd/s, torso at +0.1 s after proximity | runner +4.65 +3.92 +1.98 +1.93 +1.72 +1.64 +1.49 | hitter +0.40 +0.55 +1.49 +1.30 +1.14 +0.99 +0.99 | sep +0.84 +0.54 +0.52 +0.53 +0.53 +0.53 +0.59
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  44/  3 deg, side-on  48%  torso  43/  7 deg, side-on  48%  torso+0.3  41/ 19 deg, side-on  46%
   closing 5+             n   65 closing 5.53 yd/s, torso at +0.1 s after proximity | runner +4.77 +4.01 +1.94 +1.57 +1.33 +1.14 +1.23 | hitter -0.73 -0.26 +1.21 +1.14 +1.00 +0.80 +0.85 | sep +0.91 +0.52 +0.52 +0.52 +0.52 +0.51 +0.83
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  23/  3 deg, side-on  25%  torso  25/  5 deg, side-on  26%  torso+0.3  39/  9 deg, side-on  40%
   blocked closing 3-5    n   62 closing 4.19 yd/s, torso at +0.1 s after proximity | runner +4.69 +3.93 +1.99 +1.91 +1.75 +1.64 +1.55 | hitter +0.41 +0.56 +1.46 +1.23 +1.10 +0.99 +0.96 | sep +0.84 +0.55 +0.53 +0.53 +0.54 +0.55 +0.59
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  48/  3 deg, side-on  55%  torso  47/  7 deg, side-on  55%  torso+0.3  51/ 22 deg, side-on  53%
   blocked closing 5+     n   36 closing 5.38 yd/s, torso at +0.1 s after proximity | runner +4.88 +4.08 +2.10 +1.71 +1.47 +1.66 +1.60 | hitter -0.52 -0.12 +0.95 +0.90 +0.84 +0.76 +1.40 | sep +0.88 +0.56 +0.57 +0.57 +0.57 +0.59 +0.89
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  28/  5 deg, side-on  36%  torso  34/  9 deg, side-on  36%  torso+0.3  46/ 13 deg, side-on  50%
   free closing 3-5       n   13 closing 4.02 yd/s, torso at +0.1 s after proximity | runner +4.72 +3.89 +1.98 +1.93 +1.41 +1.34 +0.94 | hitter +0.47 +0.62 +1.93 +1.74 +1.38 +1.37 +1.04 | sep +0.82 +0.51 +0.50 +0.51 +0.51 +0.51 +0.51
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  32/  1 deg, side-on  15%  torso  24/  1 deg, side-on  15%  torso+0.3  20/ 11 deg, side-on   8%
   free closing 5+        n   17 closing 5.66 yd/s, torso at +0.1 s after proximity | runner +4.64 +4.02 +1.87 +1.56 +1.26 +0.84 +0.61 | hitter -0.99 -0.80 +1.34 +1.26 +1.07 +0.85 +0.79 | sep +0.99 +0.51 +0.50 +0.50 +0.50 +0.50 +0.49
                          torso angle, median (hitter vs square to the runner / runner vs his path; hitter side-on >= 45 deg): prox  21/  2 deg, side-on   6%  torso  22/  2 deg, side-on   6%  torso+0.3  30/  9 deg, side-on  18%
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
== zone-ref.jsonl contacts 356
   0 defenders within 1 yd: 594 frames, carrier fwd speed median +4.03 yd/s, stalled (<0.5) 2%
   1 defenders within 1 yd: 2291 frames, carrier fwd speed median +1.72 yd/s, stalled (<0.5) 15%
   2 defenders within 1 yd: 1176 frames, carrier fwd speed median +0.84 yd/s, stalled (<0.5) 35%
   3+ defenders within 1 yd: 846 frames, carrier fwd speed median +0.61 yd/s, stalled (<0.5) 46%
   2nd defender arrives: 71% of contacts, median 0.5 s after first contact; 3rd: 34%, median 1.2 s
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
  all  n 1236  DL depth 0.5 +0.16  1.0 +0.42  2.0 +0.76 | back>=.5 from 0.5s 7%  from snap 6%
  solo n  118  DL depth 0.5 +0.28  1.0 +0.51  2.0 +0.92 | back>=.5 from 0.5s 8%  from snap 4%
  dbl  n   10  DL depth 0.5 +0.49  1.0 +0.67  2.0 +1.46 | back>=.5 from 0.5s 0%  from snap 0%
  free n 1108  DL depth 0.5 +0.15  1.0 +0.41  2.0 +0.73 | back>=.5 from 0.5s 7%  from snap 6%
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
  OU n 211 t0.5 depth +0.62 in +0.19  t1.0 depth +0.03 in +1.08  t1.5 depth -0.43 in +2.30
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
  IN snap depth 0.90 off-centre 5.34 n 113 t0.5 depth +0.60 in -0.08 OT -0.81/+0.39w gap 2.56  t1.0 depth +0.14 in -0.25 OT -0.34/+1.57w gap 1.43  t1.5 depth +0.02 in -0.59 OT +0.15/+2.71w gap 1.13
  OU snap depth 0.90 off-centre 5.36 n 226 t0.5 depth +0.61 in -0.12 OT -0.89/+0.46w gap 2.59  t1.0 depth +0.10 in -0.47 OT -0.70/+1.80w gap 1.66  t1.5 depth -0.17 in -1.07 OT -0.51/+3.34w gap 1.40
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
  gun    OUTSIDE ZONE   188 1.10 |  4.5  4.5  4.4 +0.23  1.3 | -2.30  5.0 | +0.18 -0.69 0.74 | +4.22 +2.55 4.91   58
  gun    INSIDE ZONE     95 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.01 -0.85 0.87 | +3.10 +2.83 4.19   47
  gun    COUNTER         75 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.03 -0.85 0.86 | +3.18 +2.77 4.23   50
  gun    TRAP            71 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | -0.02 -0.84 0.86 | +2.95 +2.76 4.07   47
  gun    POWER           63 1.10 |  4.5  4.5  4.3 +0.14  1.3 | -2.30  5.0 | +0.03 -0.85 0.86 | +3.14 +2.76 4.22   49
  pistol OUTSIDE ZONE    54 1.00 |  4.5  4.5  4.5 +0.20  0.0 | +0.00  7.2 | +0.44 +1.18 1.26 | +1.62 +3.66 4.01   23
  pistol INSIDE ZONE     32 1.00 |  4.5  4.5  4.5 +0.20  0.0 | +0.00  7.2 | +0.43 +1.21 1.28 | +1.56 +3.68 4.00   23
  pistol POWER           17 1.20 |  4.5  4.5  4.4 +0.21  0.2 | -0.00  7.2 | +0.67 +0.61 0.91 | +1.76 +4.05 4.46   23
  pistol COUNTER         16 1.30 |  4.5  4.5  4.5 +0.20  0.1 | -0.00  7.2 | +0.54 +0.93 1.08 | +1.58 +3.97 4.25   21
  pistol TRAP            13 0.90 |  4.5  4.5  4.5 +0.21  0.1 | +0.00  7.2 | +0.59 +0.81 1.01 | +1.52 +4.03 4.31   21
  under  OUTSIDE ZONE   132 1.40 |  1.8  2.3  4.1 +2.14  3.4 | +0.00  7.3 | +1.07 +0.53 1.22 | +3.58 +3.24 4.80   48
  under  INSIDE ZONE     69 1.20 |  1.8  2.4  3.3 +0.46  1.2 | -0.00  7.3 | +0.49 +1.21 1.30 | +1.49 +4.57 4.80   18
  under  TRAP            67 1.10 |  1.8  2.4  3.2 +0.45  1.4 | -0.00  7.3 | +0.53 +1.16 1.28 | +1.57 +4.36 4.74   19
  under  POWER           65 1.40 |  1.8  2.4  3.4 +0.48  0.2 | +0.00  7.3 | +0.51 +1.01 1.13 | +1.45 +4.08 4.40   20
  under  COUNTER         56 1.60 |  1.8  2.3  3.4 +0.48  0.1 | +0.00  7.3 | +0.49 +1.03 1.14 | +1.34 +4.00 4.22   18
```

