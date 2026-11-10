
> gridiron-engine@0.1.0 ref:report
> node scripts/ref-report.mjs --skip-operators --flag GRASP_ARM_MOMENT=1

[ref:report] arm off
[ref] stack run-ref-14 (legacy: all off) @ 737ed889
[ref] stack run-ref-14 (legacy: all off) @ 737ed889
[ref] stack run-ref-14 (legacy: all off) @ 737ed889
[ref] stack run-ref-14 (legacy: all off) @ 737ed889
[ref:report] arm ref
[ref] stack run-ref-14 @ 737ed889
[ref] stack run-ref-14 @ 737ed889
[ref] stack run-ref-14 @ 737ed889
[ref] stack run-ref-14 @ 737ed889
[ref:report] arm candidate
[ref] stack run-ref-14 @ 737ed889, changed: GRASP_ARM_MOMENT=1
[ref] stack run-ref-14 @ 737ed889, changed: GRASP_ARM_MOMENT=1
[ref] stack run-ref-14 @ 737ed889, changed: GRASP_ARM_MOMENT=1
[ref] stack run-ref-14 @ 737ed889, changed: GRASP_ARM_MOMENT=1
# Run-game report: run-ref-14 @ 737ed889

Run set f0a8e75b8620 (12 run-only games captured at 1b5415de). Yards capped at 20 for means.
Candidate = run-ref-14 with GRASP_ARM_MOMENT=1.

## Yards and tackles

```
plays 1321 / 1321, errors 0
OZ    off: n  395 mean<20  4.69 <=0 10.9% 10+ 13.2% 20+  5.3% broken/run 0.301 missed/run 0.281
      ref: n  395 mean<20  3.29 <=0 17.2% 10+  7.6% 20+  1.8% broken/run 0.144 missed/run 0.235   paired -1.40 (SE 0.32)
IZ    off: n  215 mean<20  4.40 <=0 14.9% 10+ 14.4% 20+  6.5% broken/run 0.237 missed/run 0.265
      ref: n  215 mean<20  4.23 <=0  9.3% 10+  8.4% 20+  0.9% broken/run 0.149 missed/run 0.279   paired -0.17 (SE 0.45)
gap   off: n  445 mean<20  5.42 <=0  8.3% 10+ 16.6% 20+  7.6% broken/run 0.292 missed/run 0.234
      ref: n  445 mean<20  4.30 <=0  4.7% 10+  6.3% 20+  1.3% broken/run 0.124 missed/run 0.265   paired -1.11 (SE 0.31)
duo   off: n  126 mean<20  6.13 <=0  5.6% 10+ 23.8% 20+  6.3% broken/run 0.389 missed/run 0.357
      ref: n  126 mean<20  3.70 <=0  7.1% 10+  5.6% 20+  0.8% broken/run 0.119 missed/run 0.214   paired -2.43 (SE 0.57)
toss  off: n   55 mean<20  5.29 <=0 20.0% 10+ 20.0% 20+  1.8% broken/run 0.109 missed/run 0.200
      ref: n   55 mean<20  2.99 <=0 29.1% 10+  9.1% 20+  0.0% broken/run 0.073 missed/run 0.200   paired -2.30 (SE 0.91)
draw  off: n   85 mean<20  6.85 <=0 16.5% 10+ 27.1% 20+  5.9% broken/run 0.518 missed/run 0.365
      ref: n   85 mean<20  3.75 <=0 27.1% 10+  5.9% 20+  1.2% broken/run 0.141 missed/run 0.271   paired -3.10 (SE 0.80)
all   off: n 1321 mean<20  5.19 <=0 10.9% 10+ 16.7% 20+  6.3% broken/run 0.302 missed/run 0.272
      ref: n 1321 mean<20  3.84 <=0 11.9% 10+  7.0% 20+  1.3% broken/run 0.132 missed/run 0.251   paired -1.35 (SE 0.18)
tackles off: missed 0.272  broken 0.302 (engaged-grab breaks 0.158)  missed + broken open 0.416 a run
tackles ref: missed 0.251  broken 0.132 (engaged-grab breaks 0.058)  missed + broken open 0.326 a run

plays 1321 / 1321, errors 0
OZ    ref: n  395 mean<20  3.29 <=0 17.2% 10+  7.6% 20+  1.8% broken/run 0.144 missed/run 0.235
      candidate: n  395 mean<20  3.14 <=0 16.7% 10+  6.1% 20+  1.5% broken/run 0.116 missed/run 0.230   paired -0.15 (SE 0.06)
IZ    ref: n  215 mean<20  4.23 <=0  9.3% 10+  8.4% 20+  0.9% broken/run 0.149 missed/run 0.279
      candidate: n  215 mean<20  4.15 <=0  8.8% 10+  8.8% 20+  0.5% broken/run 0.116 missed/run 0.270   paired -0.09 (SE 0.08)
gap   ref: n  445 mean<20  4.30 <=0  4.7% 10+  6.3% 20+  1.3% broken/run 0.124 missed/run 0.265
      candidate: n  445 mean<20  4.21 <=0  4.5% 10+  7.2% 20+  1.3% broken/run 0.108 missed/run 0.263   paired -0.09 (SE 0.03)
duo   ref: n  126 mean<20  3.70 <=0  7.1% 10+  5.6% 20+  0.8% broken/run 0.119 missed/run 0.214
      candidate: n  126 mean<20  3.61 <=0  7.1% 10+  5.6% 20+  0.8% broken/run 0.111 missed/run 0.214   paired -0.09 (SE 0.06)
toss  ref: n   55 mean<20  2.99 <=0 29.1% 10+  9.1% 20+  0.0% broken/run 0.073 missed/run 0.200
      candidate: n   55 mean<20  2.73 <=0 27.3% 10+  7.3% 20+  0.0% broken/run 0.036 missed/run 0.182   paired -0.26 (SE 0.20)
draw  ref: n   85 mean<20  3.75 <=0 27.1% 10+  5.9% 20+  1.2% broken/run 0.141 missed/run 0.271
      candidate: n   85 mean<20  3.51 <=0 25.9% 10+  4.7% 20+  0.0% broken/run 0.129 missed/run 0.247   paired -0.24 (SE 0.15)
all   ref: n 1321 mean<20  3.84 <=0 11.9% 10+  7.0% 20+  1.3% broken/run 0.132 missed/run 0.251
      candidate: n 1321 mean<20  3.72 <=0 11.4% 10+  6.8% 20+  1.1% broken/run 0.111 missed/run 0.245   paired -0.12 (SE 0.03)
tackles ref: missed 0.251  broken 0.132 (engaged-grab breaks 0.058)  missed + broken open 0.326 a run
tackles candidate: missed 0.245  broken 0.111 (engaged-grab breaks 0.051)  missed + broken open 0.304 a run
```
[ref:report] wrote out/ref/report.md
