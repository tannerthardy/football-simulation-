
> gridiron-engine@0.1.0 ref:report
> node scripts/ref-report.mjs --skip-operators --flag LEAN_PITCH=1 --flag PASS_ANCHOR=1

[ref:report] arm off
[ref] stack run-ref-12 (legacy: all off) @ 75674e8d
[ref] stack run-ref-12 (legacy: all off) @ 75674e8d
[ref] stack run-ref-12 (legacy: all off) @ 75674e8d
[ref] stack run-ref-12 (legacy: all off) @ 75674e8d
[ref:report] arm ref
[ref] stack run-ref-12 @ 75674e8d
[ref] stack run-ref-12 @ 75674e8d
[ref] stack run-ref-12 @ 75674e8d
[ref] stack run-ref-12 @ 75674e8d
[ref:report] arm candidate
[ref] stack run-ref-12 @ 75674e8d, changed: LEAN_PITCH=1 PASS_ANCHOR=1
[ref] stack run-ref-12 @ 75674e8d, changed: LEAN_PITCH=1 PASS_ANCHOR=1
[ref] stack run-ref-12 @ 75674e8d, changed: LEAN_PITCH=1 PASS_ANCHOR=1
[ref] stack run-ref-12 @ 75674e8d, changed: LEAN_PITCH=1 PASS_ANCHOR=1
# Run-game report: run-ref-12 @ 75674e8d

Run set f0a8e75b8620 (12 run-only games captured at 1b5415de). Yards capped at 20 for means.
Candidate = run-ref-12 with LEAN_PITCH=1 PASS_ANCHOR=1.

## Yards and tackles

```
plays 1321 / 1321, errors 0
OZ    off: n  395 mean<20  4.69 <=0 10.9% 10+ 13.2% 20+  5.3% broken/run 0.301 missed/run 0.281
      ref: n  395 mean<20  3.15 <=0 14.9% 10+  6.6% 20+  1.5% broken/run 0.114 missed/run 0.256   paired -1.54 (SE 0.33)
IZ    off: n  215 mean<20  4.40 <=0 14.9% 10+ 14.4% 20+  6.5% broken/run 0.237 missed/run 0.265
      ref: n  215 mean<20  3.88 <=0 12.6% 10+  8.4% 20+  0.9% broken/run 0.121 missed/run 0.233   paired -0.52 (SE 0.45)
gap   off: n  445 mean<20  5.42 <=0  8.3% 10+ 16.6% 20+  7.6% broken/run 0.292 missed/run 0.234
      ref: n  445 mean<20  4.17 <=0  5.2% 10+  5.8% 20+  2.7% broken/run 0.153 missed/run 0.238   paired -1.25 (SE 0.32)
duo   off: n  126 mean<20  6.13 <=0  5.6% 10+ 23.8% 20+  6.3% broken/run 0.389 missed/run 0.357
      ref: n  126 mean<20  3.49 <=0  9.5% 10+  4.8% 20+  0.8% broken/run 0.111 missed/run 0.222   paired -2.64 (SE 0.57)
toss  off: n   55 mean<20  5.29 <=0 20.0% 10+ 20.0% 20+  1.8% broken/run 0.109 missed/run 0.200
      ref: n   55 mean<20  3.93 <=0 25.5% 10+ 10.9% 20+  3.6% broken/run 0.236 missed/run 0.236   paired -1.36 (SE 1.01)
draw  off: n   85 mean<20  6.85 <=0 16.5% 10+ 27.1% 20+  5.9% broken/run 0.518 missed/run 0.365
      ref: n   85 mean<20  4.04 <=0 17.6% 10+  7.1% 20+  1.2% broken/run 0.247 missed/run 0.235   paired -2.80 (SE 0.84)
all   off: n 1321 mean<20  5.19 <=0 10.9% 10+ 16.7% 20+  6.3% broken/run 0.302 missed/run 0.272
      ref: n 1321 mean<20  3.73 <=0 11.4% 10+  6.7% 20+  1.8% broken/run 0.142 missed/run 0.241   paired -1.45 (SE 0.19)
tackles off: missed 0.272  broken 0.302 (engaged-grab breaks 0.158)  missed + broken open 0.416 a run
tackles ref: missed 0.241  broken 0.142 (engaged-grab breaks 0.073)  missed + broken open 0.310 a run

plays 1321 / 1321, errors 0
OZ    ref: n  395 mean<20  3.15 <=0 14.9% 10+  6.6% 20+  1.5% broken/run 0.114 missed/run 0.256
      candidate: n  395 mean<20  3.48 <=0 16.2% 10+  7.8% 20+  4.3% broken/run 0.170 missed/run 0.241   paired +0.33 (SE 0.23)
IZ    ref: n  215 mean<20  3.88 <=0 12.6% 10+  8.4% 20+  0.9% broken/run 0.121 missed/run 0.233
      candidate: n  215 mean<20  4.50 <=0  7.4% 10+  9.3% 20+  3.3% broken/run 0.130 missed/run 0.284   paired +0.62 (SE 0.31)
gap   ref: n  445 mean<20  4.17 <=0  5.2% 10+  5.8% 20+  2.7% broken/run 0.153 missed/run 0.238
      candidate: n  445 mean<20  4.20 <=0  5.8% 10+  6.5% 20+  1.8% broken/run 0.126 missed/run 0.213   paired +0.03 (SE 0.16)
duo   ref: n  126 mean<20  3.49 <=0  9.5% 10+  4.8% 20+  0.8% broken/run 0.111 missed/run 0.222
      candidate: n  126 mean<20  3.50 <=0  7.1% 10+  4.8% 20+  0.0% broken/run 0.119 missed/run 0.183   paired +0.01 (SE 0.31)
toss  ref: n   55 mean<20  3.93 <=0 25.5% 10+ 10.9% 20+  3.6% broken/run 0.236 missed/run 0.236
      candidate: n   55 mean<20  4.97 <=0 29.1% 10+ 18.2% 20+  7.3% broken/run 0.200 missed/run 0.309   paired +1.04 (SE 1.01)
draw  ref: n   85 mean<20  4.04 <=0 17.6% 10+  7.1% 20+  1.2% broken/run 0.247 missed/run 0.235
      candidate: n   85 mean<20  3.77 <=0 27.1% 10+ 11.8% 20+  0.0% broken/run 0.200 missed/run 0.294   paired -0.27 (SE 0.58)
all   ref: n 1321 mean<20  3.73 <=0 11.4% 10+  6.7% 20+  1.8% broken/run 0.142 missed/run 0.241
      candidate: n 1321 mean<20  3.97 <=0 11.7% 10+  8.0% 20+  2.7% broken/run 0.147 missed/run 0.239   paired +0.24 (SE 0.12)
tackles ref: missed 0.241  broken 0.142 (engaged-grab breaks 0.073)  missed + broken open 0.310 a run
tackles candidate: missed 0.239  broken 0.147 (engaged-grab breaks 0.070)  missed + broken open 0.316 a run
```
[ref:report] wrote out/ref/report.md
