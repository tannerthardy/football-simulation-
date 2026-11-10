
> gridiron-engine@0.1.0 ref:report
> node scripts/ref-report.mjs --skip-operators --flag WR_SNAP=1 --flag QB_RHYTHM=1 --flag PRESS_MIRROR=1 --flag PRESS_RELEASE=1

[ref:report] arm off
[ref] stack run-ref-13 (legacy: all off) @ c4c32b09
[ref] stack run-ref-13 (legacy: all off) @ c4c32b09
[ref] stack run-ref-13 (legacy: all off) @ c4c32b09
[ref] stack run-ref-13 (legacy: all off) @ c4c32b09
[ref:report] arm ref
[ref] stack run-ref-13 @ c4c32b09
[ref] stack run-ref-13 @ c4c32b09
[ref] stack run-ref-13 @ c4c32b09
[ref] stack run-ref-13 @ c4c32b09
[ref:report] arm candidate
[ref] stack run-ref-13 @ c4c32b09, changed: WR_SNAP=1 QB_RHYTHM=1 PRESS_MIRROR=1 PRESS_RELEASE=1
[ref] stack run-ref-13 @ c4c32b09, changed: WR_SNAP=1 QB_RHYTHM=1 PRESS_MIRROR=1 PRESS_RELEASE=1
[ref] stack run-ref-13 @ c4c32b09, changed: WR_SNAP=1 QB_RHYTHM=1 PRESS_MIRROR=1 PRESS_RELEASE=1
[ref] stack run-ref-13 @ c4c32b09, changed: WR_SNAP=1 QB_RHYTHM=1 PRESS_MIRROR=1 PRESS_RELEASE=1
# Run-game report: run-ref-13 @ c4c32b09

Run set f0a8e75b8620 (12 run-only games captured at 1b5415de). Yards capped at 20 for means.
Candidate = run-ref-13 with WR_SNAP=1 QB_RHYTHM=1 PRESS_MIRROR=1 PRESS_RELEASE=1.

## Yards and tackles

```
plays 1321 / 1321, errors 0
OZ    off: n  395 mean<20  4.69 <=0 10.9% 10+ 13.2% 20+  5.3% broken/run 0.301 missed/run 0.281
      ref: n  395 mean<20  3.48 <=0 16.2% 10+  7.8% 20+  4.3% broken/run 0.170 missed/run 0.241   paired -1.21 (SE 0.34)
IZ    off: n  215 mean<20  4.40 <=0 14.9% 10+ 14.4% 20+  6.5% broken/run 0.237 missed/run 0.265
      ref: n  215 mean<20  4.50 <=0  7.4% 10+  9.3% 20+  3.3% broken/run 0.130 missed/run 0.284   paired +0.10 (SE 0.46)
gap   off: n  445 mean<20  5.42 <=0  8.3% 10+ 16.6% 20+  7.6% broken/run 0.292 missed/run 0.234
      ref: n  445 mean<20  4.20 <=0  5.8% 10+  6.5% 20+  1.8% broken/run 0.126 missed/run 0.213   paired -1.21 (SE 0.31)
duo   off: n  126 mean<20  6.13 <=0  5.6% 10+ 23.8% 20+  6.3% broken/run 0.389 missed/run 0.357
      ref: n  126 mean<20  3.50 <=0  7.1% 10+  4.8% 20+  0.0% broken/run 0.119 missed/run 0.183   paired -2.63 (SE 0.55)
toss  off: n   55 mean<20  5.29 <=0 20.0% 10+ 20.0% 20+  1.8% broken/run 0.109 missed/run 0.200
      ref: n   55 mean<20  4.97 <=0 29.1% 10+ 18.2% 20+  7.3% broken/run 0.200 missed/run 0.309   paired -0.32 (SE 1.02)
draw  off: n   85 mean<20  6.85 <=0 16.5% 10+ 27.1% 20+  5.9% broken/run 0.518 missed/run 0.365
      ref: n   85 mean<20  3.77 <=0 27.1% 10+ 11.8% 20+  0.0% broken/run 0.200 missed/run 0.294   paired -3.08 (SE 0.79)
all   off: n 1321 mean<20  5.19 <=0 10.9% 10+ 16.7% 20+  6.3% broken/run 0.302 missed/run 0.272
      ref: n 1321 mean<20  3.97 <=0 11.7% 10+  8.0% 20+  2.7% broken/run 0.147 missed/run 0.239   paired -1.22 (SE 0.19)
tackles off: missed 0.272  broken 0.302 (engaged-grab breaks 0.158)  missed + broken open 0.416 a run
tackles ref: missed 0.239  broken 0.147 (engaged-grab breaks 0.070)  missed + broken open 0.316 a run

plays 1321 / 1321, errors 0
OZ    ref: n  395 mean<20  3.48 <=0 16.2% 10+  7.8% 20+  4.3% broken/run 0.170 missed/run 0.241
      candidate: n  395 mean<20  3.29 <=0 17.2% 10+  7.6% 20+  1.8% broken/run 0.144 missed/run 0.235   paired -0.19 (SE 0.18)
IZ    ref: n  215 mean<20  4.50 <=0  7.4% 10+  9.3% 20+  3.3% broken/run 0.130 missed/run 0.284
      candidate: n  215 mean<20  4.23 <=0  9.3% 10+  8.4% 20+  0.9% broken/run 0.149 missed/run 0.279   paired -0.27 (SE 0.22)
gap   ref: n  445 mean<20  4.20 <=0  5.8% 10+  6.5% 20+  1.8% broken/run 0.126 missed/run 0.213
      candidate: n  445 mean<20  4.30 <=0  4.7% 10+  6.3% 20+  1.3% broken/run 0.124 missed/run 0.265   paired +0.10 (SE 0.15)
duo   ref: n  126 mean<20  3.50 <=0  7.1% 10+  4.8% 20+  0.0% broken/run 0.119 missed/run 0.183
      candidate: n  126 mean<20  3.70 <=0  7.1% 10+  5.6% 20+  0.8% broken/run 0.119 missed/run 0.214   paired +0.20 (SE 0.18)
toss  ref: n   55 mean<20  4.97 <=0 29.1% 10+ 18.2% 20+  7.3% broken/run 0.200 missed/run 0.309
      candidate: n   55 mean<20  2.99 <=0 29.1% 10+  9.1% 20+  0.0% broken/run 0.073 missed/run 0.200   paired -1.99 (SE 0.89)
draw  ref: n   85 mean<20  3.77 <=0 27.1% 10+ 11.8% 20+  0.0% broken/run 0.200 missed/run 0.294
      candidate: n   85 mean<20  3.75 <=0 27.1% 10+  5.9% 20+  1.2% broken/run 0.141 missed/run 0.271   paired -0.02 (SE 0.30)
all   ref: n 1321 mean<20  3.97 <=0 11.7% 10+  8.0% 20+  2.7% broken/run 0.147 missed/run 0.239
      candidate: n 1321 mean<20  3.84 <=0 11.9% 10+  7.0% 20+  1.3% broken/run 0.132 missed/run 0.251   paired -0.13 (SE 0.09)
tackles ref: missed 0.239  broken 0.147 (engaged-grab breaks 0.070)  missed + broken open 0.316 a run
tackles candidate: missed 0.251  broken 0.132 (engaged-grab breaks 0.058)  missed + broken open 0.326 a run
```
[ref:report] wrote out/ref/report.md
