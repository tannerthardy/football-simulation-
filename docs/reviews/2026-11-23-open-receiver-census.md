# Open-receiver census, NFL vs ours (develop 0226f0d3, engine-91)

Tools/Physics, 2026-11-23, for Integration (the user's film finding: "we're just leaving dudes way too wide open too often"). One operator on both sides (`scripts/diag/census/`): `nfl_plays.py` and `sim_plays.mts` write the same play format, `open_census_report.py` reads it. Sim: 8 games, seed 101 (Ironmen v Comets, strength .55), 693 dropbacks, read-only tap on `PlaySim.tick`. NFL: BDB 2025 weeks 1-9 (2022), 9,657 dropbacks. Definitions are in the script's header and in the tables below; wide open is d1 beyond the NFL's own p90 for that (moment kind, depth band).

## Answer in short

- **In aggregate we do not leave receivers more open than the NFL does, by this operator.** Dropbacks with at least one wide-open receiver at the release: NFL .338 (2,922 of 8,638), ours .336 (206 of 614; binomial se .019). At any fixed time (1.5-3.0 s) while the ball is held: .550 / .525. Open for two consecutive fixed times (same receiver, 0.5 s apart): .250 / .273. The targeted receiver at the release: d1 median 3.5 / 3.7 yd, wide open .138 / .141. d1 tail at the release: p95 7.8 / 7.4, p99 10.6 / 10.2 yd.
- **The excess is in one place: the 10-15 yd band while the ball is held, in zone, mainly Cover-2 and Cover-6.** Wide-open share of receiver-moments at fixed times, 10-15 yd: Cover-2 .573 ours vs .177 NFL (124 vs 1,801 receiver-moments), Cover-6 .305 vs .096 (105 vs 1,240), all zone .166 vs .119, 2x2 .160 vs .096, non-play-action .150 vs .089. At the release the 10-15 band is close (d1 p90 5.5 vs 5.2). So these are intermediate routes open before the ball comes out; our QB throws late on quick game (known issue 1), so a window that the NFL QB uses is read for another half second.
- **We are tighter than the NFL elsewhere:** 0-10 yd in zone (Cover-3 5-10 yd fixed .070 vs .139, Cover-2 0-5 yd .025 vs .104), behind the line after play action (.015 vs .066), Cover-0 and Cover-1 short. By family (dropbacks with a wide-open receiver at the release): Cover-3 .304 vs .409, Cover-2 .542 vs .530, Quarters .388 vs .404, Cover-1 .140 vs .098, Cover-6 .521 vs .418, Cover-0 .062 vs .226.
- **The second-nearest defender is farther in the NFL than in ours** in the 0-10 yd bands (release d2 median 7.1 vs 6.0 yd at 0-5), so ours has fewer receivers with only one defender near: not more.
- Operator checks: my formation label agrees with PFF's receiverAlignment on 8,469 of 9,258 NFL plays (.915). A second implementation (stacked norms, polar angles) matches the operator on 54 NFL and 58 sim receiver rows at the release to 0.0000 yd, with no relation or side mismatches (listed per play at the end).
- Caveats: our sample is 8 games of one team pair; the z values in the cell tables treat receiver-moments as independent but receivers in one play are correlated, so they overstate; route runner = PFF `wasRunningRoute` (NFL) and a behavior that is a route (ours). The user's impression may rest on concepts or coverages the cell tables show; I did not look at concept-level cells.

Wide-open export for Coverage's attribution: `data/reviews/census/wide-open-default.json.gz` (1,160 wide-open receiver-moments: play, concept, coverage, receiver, time, d1/d2, nearest defender and relation, and every defender's behavior kind, target seat and man technique / zone landmark at that moment).

## Full tables

NFL: 9657 dropbacks, 9257 with a route runner at a sampled moment, 150917 receiver-moments. Wide-open thresholds are the NFL p90 of d1 by (moment kind, depth band):

| moment | behind LOS | 0-5 | 5-10 | 10-15 | 15-20 | 20+ |
|---|---|---|---|---|---|---|
| release | 8.6 | 6.8 | 5.2 | 5.2 | 6.0 | 6.1 |
| fixed 1.5-3.0 s | 6.2 | 6.0 | 5.1 | 5.1 | 5.8 | nan |

## NFL

9258 dropbacks, 150917 receiver-moments (release 39701, fixed 111216).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 6648 | 1.6 / 2.9 / 4.3 / 6.4 / 8.6 | 3.5 / 4.7 / 6.8 / 9.2 / 11.7 | 24865 | 1.0 / 1.8 / 2.8 / 4.3 / 6.2 | 2.7 / 3.5 / 4.7 / 6.5 / 8.7 |
| 0-5 | 12123 | 1.0 / 1.6 / 3.2 / 5.1 / 6.8 | 3.8 / 5.4 / 7.1 / 9.1 / 11.4 | 45399 | 1.0 / 1.5 / 2.9 / 4.6 / 6.0 | 3.4 / 4.8 / 6.4 / 8.4 / 10.5 |
| 5-10 | 10489 | 0.9 / 1.3 / 2.3 / 3.8 / 5.2 | 3.6 / 5.0 / 6.8 / 9.1 / 12.0 | 28535 | 0.9 / 1.4 / 2.5 / 3.9 / 5.1 | 3.6 / 4.8 / 6.4 / 8.5 / 10.9 |
| 10-15 | 6711 | 0.9 / 1.4 / 2.5 / 3.9 / 5.2 | 4.2 / 5.5 / 7.2 / 9.2 / 12.4 | 10810 | 1.0 / 1.6 / 2.7 / 3.9 / 5.1 | 4.3 / 5.4 / 7.0 / 8.8 / 11.4 |
| 15-20 | 2567 | 1.0 / 1.5 / 2.5 / 4.3 / 6.0 | 4.8 / 6.4 / 8.1 / 10.3 / 13.3 | 1585 | 1.1 / 1.6 / 2.7 / 4.3 / 5.8 | 4.8 / 6.2 / 7.8 / 9.5 / 11.7 |
| 20+ | 1163 | 0.9 / 1.4 / 2.4 / 4.2 / 6.1 | 4.4 / 6.3 / 8.9 / 12.1 / 16.0 | 22 | 1.2 / 2.0 / 2.4 / 4.1 / 6.3 | 4.9 / 7.2 / 8.6 / 9.4 / 11.3 |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.28 | 0.36 | 0.36 | 0.50 | 0.19 | 0.31 | 0.48 | 0.19 | 0.32 |
| fixed | 0.25 | 0.35 | 0.40 | 0.47 | 0.20 | 0.33 | 0.59 | 0.15 | 0.27 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 2922 of 8638 thrown dropbacks (0.338); receiver-moments 0.100
- at any fixed time while the ball was held: 4776 of 8691 dropbacks (0.550); receiver-moments 0.100
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 2172 of 8691 dropbacks (0.250)
- d1 tail at release: p90 6.5, p95 7.8, p99 10.6; share of receiver-moments with d1 over 5 yd 0.214, over 7 yd 0.077, over 9 yd 0.025
- d1 tail at fixed: p90 5.7, p95 6.7, p99 9.0; share of receiver-moments with d1 over 5 yd 0.162, over 7 yd 0.041, over 9 yd 0.010
- the targeted receiver at release (n 8293): d1 1.2 / 2.0 / 3.5 / 5.5 / 7.4, wide open 0.138; untargeted route runners at release d1 0.9 / 1.5 / 2.8 / 4.4 / 6.2

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 2964 | 12528 | 3.4 / 6.8 | 0.119 | 0.409 | 34850 | 3.2 / 6.0 | 0.125 | 0.659 |
| Cover-1 | 1960 | 8206 | 1.8 / 4.8 | 0.024 | 0.098 | 23259 | 1.9 / 4.8 | 0.043 | 0.310 |
| Cover-2 | 1297 | 5732 | 3.8 / 7.4 | 0.171 | 0.530 | 16852 | 3.0 / 6.0 | 0.118 | 0.648 |
| Quarters | 1200 | 5293 | 3.3 / 6.7 | 0.112 | 0.404 | 14180 | 3.2 / 6.1 | 0.130 | 0.705 |
| Cover-6 | 873 | 3910 | 3.2 / 6.9 | 0.119 | 0.418 | 11286 | 2.9 / 5.8 | 0.101 | 0.614 |
| other | 460 | 1984 | 2.0 / 5.6 | 0.070 | 0.212 | 5827 | 2.4 / 5.5 | 0.082 | 0.350 |
| Cover-0 | 341 | 1349 | 2.1 / 6.1 | 0.071 | 0.226 | 2866 | 2.1 / 5.6 | 0.089 | 0.387 |
| 2-Man | 162 | 699 | 1.5 / 3.9 | 0.011 | 0.052 | 2096 | 1.6 / 3.9 | 0.021 | 0.188 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 6334 | 27463 | 3.4 / 6.9 | 0.129 | 0.434 | 77168 | 3.1 / 6.0 | 0.121 | 0.659 |
| Man | 2463 | 10254 | 1.8 / 5.0 | 0.029 | 0.113 | 28221 | 1.8 / 4.8 | 0.046 | 0.311 |
| Other | 460 | 1984 | 2.0 / 5.6 | 0.070 | 0.212 | 5827 | 2.4 / 5.5 | 0.082 | 0.350 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 2x2 | 3826 | 16367 | 2.9 / 6.3 | 0.093 | 0.322 | 46015 | 2.7 / 5.6 | 0.092 | 0.538 |
| 3x1 | 3636 | 15455 | 2.9 / 6.6 | 0.102 | 0.343 | 44247 | 2.7 / 5.8 | 0.103 | 0.547 |
| 3x2 | 1181 | 5447 | 3.0 / 6.7 | 0.112 | 0.381 | 13418 | 2.9 / 6.1 | 0.126 | 0.604 |
| 2x1 | 450 | 1738 | 3.1 / 6.7 | 0.100 | 0.293 | 5680 | 2.7 / 5.4 | 0.079 | 0.507 |
| 4x1 | 136 | 617 | 3.2 / 7.5 | 0.147 | 0.492 | 1556 | 3.0 / 6.3 | 0.129 | 0.718 |
| 1x1 | 14 | 42 | 2.4 / 4.9 | 0.024 | 0.077 | 148 | 1.9 / 3.9 | 0.007 | 0.071 |
| 3x0 | 8 | 20 | 2.2 / 4.3 | 0.050 | 0.200 | 108 | 2.9 / 5.5 | 0.093 | 0.625 |
| 2x0 | 6 | 15 | 2.6 / 4.2 | 0.000 | 0.000 | 44 | 2.4 / 4.4 | 0.045 | 0.167 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 7934 | 33611 | 2.9 / 6.4 | 0.097 | 0.329 | 96181 | 2.7 / 5.7 | 0.096 | 0.539 |
| True | 1323 | 6090 | 3.0 / 6.8 | 0.116 | 0.393 | 15035 | 2.9 / 6.1 | 0.126 | 0.615 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 5194 | 22037 | 2.9 / 6.5 | 0.102 | 0.341 | 63617 | 2.7 / 5.8 | 0.103 | 0.549 |
| True | 4063 | 17664 | 3.0 / 6.5 | 0.097 | 0.335 | 47599 | 2.7 / 5.7 | 0.096 | 0.551 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 8737 | 37251 | 2.9 / 6.5 | 0.099 | 0.334 | 105638 | 2.7 / 5.7 | 0.099 | 0.546 |
| True | 520 | 2450 | 3.1 / 6.8 | 0.114 | 0.400 | 5578 | 3.0 / 6.1 | 0.124 | 0.613 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 6906 | 30390 | 2.9 / 6.5 | 0.100 | 0.341 | 81748 | 2.8 / 5.9 | 0.106 | 0.561 |
| True | 2351 | 9311 | 3.0 / 6.5 | 0.100 | 0.329 | 29468 | 2.7 / 5.4 | 0.082 | 0.517 |

## Ours: sim-default.jsonl.gz

693 dropbacks, 12933 receiver-moments (release 2906, fixed 10027).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 381 | 1.0 / 1.8 / 3.6 / 6.3 / 8.7 | 2.3 / 3.6 / 6.2 / 8.9 / 11.7 | 1837 | 0.9 / 1.5 / 2.4 / 3.9 / 6.1 | 2.1 / 2.8 / 4.2 / 6.0 / 8.3 |
| 0-5 | 715 | 1.1 / 2.1 / 3.5 / 5.0 / 6.7 | 2.9 / 4.3 / 6.0 / 8.2 / 11.1 | 4496 | 1.2 / 2.0 / 3.3 / 4.6 / 5.9 | 3.0 / 4.2 / 5.8 / 8.1 / 10.4 |
| 5-10 | 1114 | 1.0 / 1.6 / 2.7 / 3.9 / 4.9 | 2.9 / 4.0 / 6.0 / 8.6 / 11.1 | 2820 | 1.0 / 1.5 / 2.6 / 3.8 / 4.8 | 2.9 / 4.2 / 6.3 / 8.9 / 11.4 |
| 10-15 | 495 | 0.8 / 1.4 / 2.3 / 3.4 / 5.5 | 3.3 / 4.9 / 6.9 / 9.2 / 12.1 | 832 | 1.0 / 1.5 / 2.3 / 3.5 / 6.0 | 3.8 / 5.9 / 8.0 / 10.1 / 12.9 |
| 15-20 | 175 | 1.0 / 1.3 / 2.1 / 3.2 / 6.7 | 3.9 / 6.0 / 8.9 / 11.4 / 13.4 | 42 | 1.0 / 1.3 / 1.6 / 2.1 / 6.0 | 5.4 / 7.1 / 9.3 / 10.5 / 12.4 |
| 20+ | 26 | 0.7 / 0.9 / 1.6 / 2.8 / 4.7 | 5.0 / 6.1 / 10.4 / 13.2 / 17.2 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.31 | 0.31 | 0.38 | 0.53 | 0.17 | 0.31 | 0.42 | 0.17 | 0.40 |
| fixed | 0.27 | 0.29 | 0.44 | 0.52 | 0.17 | 0.31 | 0.62 | 0.11 | 0.27 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 206 of 614 thrown dropbacks (0.336); receiver-moments 0.095
- at any fixed time while the ball was held: 364 of 693 dropbacks (0.525); receiver-moments 0.088
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 189 of 693 dropbacks (0.273)
- d1 tail at release: p90 6.1, p95 7.4, p99 10.2; share of receiver-moments with d1 over 5 yd 0.173, over 7 yd 0.063, over 9 yd 0.017
- d1 tail at fixed: p90 5.6, p95 6.5, p99 8.5; share of receiver-moments with d1 over 5 yd 0.150, over 7 yd 0.030, over 9 yd 0.006
- the targeted receiver at release (n 604): d1 1.8 / 2.6 / 3.7 / 5.1 / 6.9, wide open 0.141; untargeted route runners at release d1 0.9 / 1.5 / 2.5 / 4.0 / 5.8

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 286 | 1231 | 2.9 / 5.7 | 0.079 | 0.304 | 4123 | 3.0 / 5.6 | 0.093 | 0.598 |
| Cover-1 | 114 | 476 | 2.0 / 4.8 | 0.034 | 0.140 | 1615 | 2.2 / 4.8 | 0.030 | 0.246 |
| Cover-2 | 97 | 386 | 3.2 / 7.4 | 0.192 | 0.543 | 1538 | 2.6 / 5.7 | 0.118 | 0.588 |
| Quarters | 91 | 386 | 3.0 / 6.3 | 0.104 | 0.388 | 1295 | 3.4 / 6.0 | 0.109 | 0.604 |
| Cover-6 | 75 | 334 | 3.0 / 6.6 | 0.141 | 0.521 | 1072 | 3.1 / 5.8 | 0.111 | 0.600 |
| Cover-0 | 22 | 64 | 2.4 / 4.6 | 0.016 | 0.062 | 255 | 1.4 / 4.7 | 0.020 | 0.136 |
| 2-Man | 8 | 29 | 2.7 / 4.9 | 0.000 | 0.000 | 129 | 2.4 / 5.1 | 0.054 | 0.625 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 556 | 2369 | 3.0 / 6.3 | 0.110 | 0.385 | 8106 | 3.0 / 5.7 | 0.102 | 0.594 |
| Man | 137 | 537 | 2.1 / 4.7 | 0.028 | 0.122 | 1921 | 2.1 / 4.8 | 0.029 | 0.248 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 286 | 1187 | 2.8 / 6.3 | 0.098 | 0.353 | 4077 | 3.0 / 5.7 | 0.097 | 0.577 |
| 2x2 | 261 | 1107 | 2.9 / 6.3 | 0.099 | 0.342 | 3799 | 2.8 / 5.6 | 0.092 | 0.521 |
| 3x2 | 98 | 427 | 2.8 / 5.6 | 0.084 | 0.314 | 1434 | 2.8 / 5.4 | 0.077 | 0.490 |
| 2x1 | 43 | 165 | 2.5 / 5.8 | 0.079 | 0.263 | 642 | 2.4 / 4.6 | 0.045 | 0.302 |
| 4x1 | 5 | 20 | 2.0 / 4.1 | 0.000 | 0.000 | 75 | 2.5 / 4.8 | 0.027 | 0.400 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 590 | 2459 | 2.8 / 6.3 | 0.097 | 0.342 | 8518 | 2.8 / 5.6 | 0.091 | 0.532 |
| True | 103 | 447 | 2.7 / 5.5 | 0.081 | 0.300 | 1509 | 2.8 / 5.4 | 0.075 | 0.485 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 356 | 1479 | 2.9 / 6.4 | 0.097 | 0.334 | 5181 | 2.9 / 5.6 | 0.088 | 0.528 |
| True | 337 | 1427 | 2.7 / 5.8 | 0.093 | 0.337 | 4846 | 2.8 / 5.5 | 0.089 | 0.522 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 618 | 2589 | 2.8 / 6.2 | 0.096 | 0.340 | 8938 | 2.8 / 5.6 | 0.089 | 0.526 |
| True | 75 | 317 | 2.7 / 5.5 | 0.082 | 0.297 | 1089 | 2.9 / 5.4 | 0.079 | 0.520 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 477 | 2023 | 2.9 / 6.3 | 0.108 | 0.374 | 6902 | 3.0 / 5.8 | 0.103 | 0.585 |
| True | 216 | 883 | 2.5 / 5.4 | 0.063 | 0.251 | 3125 | 2.5 / 5.1 | 0.055 | 0.394 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (sim-default.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.1 | fix | 0-5 | Cover-2 | 6565 | 675 | 0.104 | 0.025 |
| +8.7 | fix | 10-15 | Cover-2 | 1801 | 124 | 0.177 | 0.573 |
| -8.2 | fix | 5-10 | Cover-3 | 8952 | 1153 | 0.139 | 0.070 |
| -7.0 | fix | 10-15 | Cover-3 | 3757 | 356 | 0.104 | 0.031 |
| -6.0 | fix | behind LOS | Cover-0 | 572 | 52 | 0.059 | 0.000 |
| -5.5 | fix | 10-15 | Cover-1 | 1682 | 96 | 0.018 | 0.000 |
| +4.6 | fix | 10-15 | Cover-6 | 1240 | 105 | 0.096 | 0.305 |
| -4.5 | fix | 0-5 | Cover-0 | 1540 | 127 | 0.094 | 0.024 |

### By man / zone (sim-default.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -6.1 | fix | 5-10 | Zone | 20078 | 2291 | 0.120 | 0.082 |
| -6.1 | fix | 10-15 | Man | 2025 | 121 | 0.018 | 0.000 |
| -5.5 | fix | 0-5 | Zone | 29528 | 3581 | 0.128 | 0.099 |
| -4.2 | rel | 5-10 | Zone | 6924 | 892 | 0.132 | 0.089 |
| +3.3 | fix | 10-15 | Zone | 8358 | 711 | 0.119 | 0.166 |
| -3.3 | fix | 5-10 | Man | 6943 | 529 | 0.045 | 0.023 |
| -2.0 | fix | 0-5 | Man | 13192 | 915 | 0.044 | 0.032 |
| -1.9 | fix | behind LOS | Man | 5848 | 352 | 0.064 | 0.043 |

### By formation (sim-default.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -17.4 | fix | behind LOS | 3x2 | 1528 | 112 | 0.165 | 0.000 |
| -5.6 | fix | 5-10 | 3x1 | 11585 | 1122 | 0.103 | 0.060 |
| -4.9 | fix | behind LOS | 2x1 | 2002 | 247 | 0.081 | 0.024 |
| -3.8 | fix | 0-5 | 3x2 | 6617 | 671 | 0.133 | 0.088 |
| +3.1 | fix | 10-15 | 2x2 | 4298 | 332 | 0.096 | 0.160 |
| -3.0 | fix | 0-5 | 4x1 | 667 | 40 | 0.106 | 0.025 |
| -2.8 | rel | 5-10 | 2x1 | 335 | 40 | 0.110 | 0.025 |
| -2.6 | fix | 5-10 | 3x2 | 3779 | 505 | 0.110 | 0.077 |

### By play action (sim-default.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -9.9 | fix | behind LOS | True | 10037 | 685 | 0.066 | 0.015 |
| -5.0 | fix | 5-10 | False | 22031 | 1999 | 0.100 | 0.070 |
| +4.1 | fix | 10-15 | False | 7793 | 586 | 0.089 | 0.150 |
| -4.0 | rel | 0-5 | True | 2432 | 224 | 0.097 | 0.040 |
| -3.6 | rel | 5-10 | True | 1622 | 308 | 0.119 | 0.062 |
| -2.9 | rel | behind LOS | True | 2383 | 137 | 0.074 | 0.029 |
| -2.5 | fix | 5-10 | True | 6504 | 821 | 0.099 | 0.074 |
| -2.5 | fix | 0-5 | True | 9374 | 1367 | 0.069 | 0.053 |

## Operator check

Formation operator vs PFF receiverAlignment on NFL: 8469 of 9258 agree (0.915); most common disagreements: 2x2 for 2x1 x148, 3x1 for 2x1 x115, 2x2 for 3x1 x106, 3x1 for 2x2 x81, 2x1 for 3x1 x56.

### NFL: 12 plays at the release, every route runner: the operator against a second implementation (stacked norms, polar angles)

- 2022102301-1438 Cover 6-Left rel frame 24 QB (-8.3, 29.5): 44901 d1 4.1 d2 4.3 front/inside/opening; 46093 d1 3.7 d2 15.3 behind/inside/closing; 53488 d1 2.4 d2 15.4 front/inside/opening; 53512 d1 1.3 d2 8.1 level/outside/opening; 53633 d1 6.7 d2 7.4 front/inside/opening
- 2022101601-151 Cover-3 rel frame 27 QB (-9.1, 26.9): 43324 d1 3.3 d2 8.7 level/inside/closing; 45185 d1 7.1 d2 9.9 behind/inside/steady; 48097 d1 1.4 d2 3.8 level/inside/closing
- 2022092502-107 Cover-3 rel frame 23 QB (-10.8, 18.8): 47842 d1 2.3 d2 6.3 behind/outside/closing; 48118 d1 2.5 d2 6.5 front/inside/closing; 52442 d1 1.6 d2 13.8 level/inside/steady; 52449 d1 2.5 d2 7.9 behind/inside/closing; 54538 d1 2.8 d2 4.4 behind/outside/closing
- 2022101000-3436 Cover-0 rel frame 12 QB (-4.8, 24.5): 40011 d1 3.5 d2 3.5 front/inside/opening; 44874 d1 1.2 d2 1.9 level/head-up/closing; 46243 d1 1.4 d2 9.2 level/inside/steady; 52440 d1 4.1 d2 7.4 front/inside/closing; 54519 d1 2.6 d2 3.3 level/inside/closing
- 2022101603-1957 Cover 6-Left rel frame 26 QB (-7.4, 23.5): 47842 d1 2.0 d2 5.6 level/inside/steady; 52442 d1 6.1 d2 6.2 front/outside/opening; 53556 d1 3.8 d2 7.5 front/inside/opening; 53703 d1 10.7 d2 11.7 front/inside/steady; 54518 d1 1.5 d2 4.3 behind/outside/closing
- 2022092600-865 Cover-3 rel frame 17 QB (-5.2, 23.6): 43329 d1 4.1 d2 8.3 behind/head-up/closing; 46071 d1 3.4 d2 4.0 level/outside/closing; 46309 d1 7.1 d2 10.6 level/inside/steady; 48489 d1 5.5 d2 7.7 front/inside/closing
- 2022091113-630 Quarters rel frame 35 QB (-9.5, 30.1): 43293 d1 7.1 d2 9.9 front/inside/opening; 45052 d1 3.6 d2 6.5 behind/outside/opening; 52425 d1 1.9 d2 9.0 behind/outside/opening
- 2022110604-56 Cover-3 rel frame 36 QB (-7.7, 30.7): 41282 d1 1.8 d2 14.5 level/inside/steady; 44931 d1 4.2 d2 5.7 front/outside/opening; 47749 d1 1.2 d2 13.3 level/inside/closing; 47807 d1 3.6 d2 7.5 level/inside/opening; 47920 d1 3.8 d2 8.3 behind/outside/closing
- 2022091104-2736 Quarters rel frame 25 QB (-9.0, 23.7): 44930 d1 2.6 d2 4.5 behind/outside/closing; 44947 d1 2.3 d2 3.9 front/inside/opening; 46130 d1 3.8 d2 12.4 behind/inside/closing; 47791 d1 5.8 d2 9.9 behind/inside/closing; 53541 d1 2.9 d2 5.0 front/inside/opening
- 2022092600-1316 Cover-2 rel frame 13 QB (-6.1, 24.1): 43329 d1 0.9 d2 8.8 level/outside/steady; 46071 d1 2.8 d2 3.9 behind/inside/closing; 46309 d1 3.7 d2 8.0 behind/outside/steady; 48489 d1 0.8 d2 6.2 level/outside/closing
- 2022091200-931 Cover-3 Seam rel frame 32 QB (-6.2, 31.8): 42358 d1 5.1 d2 10.8 level/inside/opening; 46109 d1 3.6 d2 8.2 level/outside/closing; 52423 d1 2.7 d2 8.4 behind/outside/closing; 52454 d1 1.4 d2 9.2 level/inside/steady; 52526 d1 6.2 d2 7.1 front/inside/opening
- 2022091100-458 Cover-2 rel frame 12 QB (-4.7, 24.4): 48374 d1 6.8 d2 8.5 front/inside/opening; 52489 d1 5.1 d2 7.5 front/inside/opening; 53433 d1 1.7 d2 3.4 behind/head-up/closing; 53612 d1 1.8 d2 5.6 front/inside/opening; 54473 d1 1.2 d2 11.9 level/head-up/closing

Second implementation: 54 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.

### ours: 12 plays at the release, every route runner: the operator against a second implementation (stacked norms, polar angles)

- 101-2-35 cover1_off rel frame 23 QB (-8.3, 23.6): Y d1 2.1 d2 2.4 front/head-up/opening; X d1 0.8 d2 6.9 level/inside/closing; Z d1 0.8 d2 11.7 level/head-up/closing; H d1 5.1 d2 5.9 behind/inside/closing
- 101-0-37 cover9_clue rel frame 24 QB (-7.9, 23.5): RB d1 9.3 d2 10.2 front/inside/opening; Y d1 1.2 d2 3.0 level/outside/opening; X d1 3.6 d2 7.8 behind/outside/steady; Z d1 1.3 d2 9.9 level/head-up/closing; H d1 2.2 d2 3.4 level/inside/closing
- 101-0-39 cover8_trix rel frame 26 QB (-7.7, 29.7): RB d1 5.3 d2 5.4 front/inside/opening; Y d1 3.0 d2 3.0 behind/outside/closing; X d1 1.6 d2 5.4 front/inside/closing; Z d1 2.3 d2 9.5 front/inside/closing; H d1 2.2 d2 4.0 behind/head-up/closing
- 101-2-29 cover3_buzz rel frame 21 QB (-5.8, 29.8): RB d1 2.8 d2 4.3 level/inside/closing; Y d1 5.8 d2 5.9 front/outside/opening; X d1 4.5 d2 14.8 behind/outside/closing; Z d1 1.2 d2 2.0 front/inside/opening; H d1 0.9 d2 2.3 level/inside/opening
- 101-4-65 cover4_book_read rel frame 25 QB (-8.4, 26.8): RB d1 3.6 d2 4.1 front/inside/opening; Y d1 4.6 d2 7.0 front/inside/opening; X d1 3.6 d2 7.4 behind/outside/opening; Z d1 2.6 d2 11.9 behind/outside/closing; H d1 3.5 d2 3.6 behind/inside/steady
- 101-4-70 cover2_match rel frame 35 QB (-8.3, 27.0): RB d1 3.1 d2 5.7 front/head-up/opening; Y d1 1.7 d2 3.7 front/head-up/closing; X d1 4.8 d2 5.2 behind/inside/closing; Z d1 3.2 d2 6.7 front/inside/opening; F d1 0.6 d2 3.6 level/head-up/steady
- 101-0-57 cover1_lurk rel frame 27 QB (-9.1, 29.4): RB d1 5.6 d2 11.3 level/inside/closing; Y d1 0.6 d2 5.7 level/head-up/closing; X d1 1.1 d2 10.0 level/outside/opening; Z d1 0.7 d2 4.7 level/head-up/closing; H d1 5.2 d2 6.1 front/inside/opening
- 101-7-42 cover1 rel frame 21 QB (-7.6, 23.5): RB d1 6.2 d2 8.6 front/inside/opening; Y d1 2.0 d2 2.9 behind/inside/closing; X d1 1.0 d2 2.8 level/outside/steady; Z d1 0.9 d2 6.7 level/inside/closing; H d1 1.3 d2 4.9 level/inside/steady
- 101-2-26 cover8_trix rel frame 24 QB (-7.8, 23.6): Y d1 3.6 d2 5.9 behind/inside/steady; X d1 3.1 d2 6.0 behind/outside/closing; Z d1 5.7 d2 9.2 front/inside/opening; H d1 2.9 d2 4.4 behind/outside/steady
- 101-0-47 cover4 rel frame 29 QB (-8.2, 27.0): RB d1 9.7 d2 10.4 behind/inside/closing; Y d1 4.3 d2 10.0 behind/inside/closing; X d1 5.0 d2 5.2 front/inside/closing; Z d1 3.4 d2 5.1 behind/head-up/closing; H d1 3.7 d2 6.6 front/inside/opening
- 101-2-9 split_quarters_2man rel frame 26 QB (-7.8, 25.4): RB d1 4.6 d2 6.5 front/head-up/opening; Y d1 3.8 d2 5.4 behind/inside/steady; X d1 2.7 d2 7.7 level/inside/opening; Z d1 3.6 d2 4.2 front/inside/closing; H d1 4.4 d2 8.3 behind/inside/opening
- 101-1-51 cover2_match rel frame 27 QB (-8.0, 23.8): RB d1 0.9 d2 9.6 level/head-up/opening; Y d1 4.0 d2 4.3 behind/inside/steady; X d1 4.7 d2 9.2 front/head-up/opening; Z d1 7.7 d2 9.2 front/inside/closing; H d1 1.6 d2 4.5 behind/outside/opening

Second implementation: 58 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
