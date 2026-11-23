# Open-receiver census, NFL (BDB 2025 weeks 1-9) vs ours

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

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 39701) | 0.50 | 0.32 | 0.18 |
| all, fixed (n 111216) | 0.52 | 0.32 | 0.16 |
| wide open, release (n 3972) | 0.63 | 0.06 | 0.30 |
| wide open, fixed (n 11121) | 0.71 | 0.06 | 0.22 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 8638 | 0.071 | 0.021 | 0.007 | 0.002 | 0.0065 |
| all | any fixed time | 8691 | 0.072 | 0.012 | 0.003 | 0.001 | 0.0022 |
| man | release | 2281 | 0.022 | 0.003 | 0.001 | 0.000 | 0.0012 |
| man | any fixed time | 2345 | 0.025 | 0.002 | 0.000 | 0.000 | 0.0003 |
| zone | release | 5927 | 0.091 | 0.026 | 0.008 | 0.002 | 0.0077 |
| zone | any fixed time | 5909 | 0.090 | 0.013 | 0.002 | 0.000 | 0.0017 |
| behind the line (separately), any moment | all | 7550 | 0.153 | 0.054 | 0.015 | 0.002 | 0.0203 |
| back within 3 yd of the line (separately), any moment | all | 2856 | 0.069 | 0.021 | 0.006 | 0.001 | 0.0148 |

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

## Ours: all-on-plays.jsonl.gz

2185 dropbacks, 41347 receiver-moments (release 9292, fixed 32055).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1198 | 1.0 / 1.8 / 3.9 / 6.7 / 9.7 | 2.1 / 3.5 / 6.5 / 10.0 / 12.5 | 5619 | 0.9 / 1.5 / 2.5 / 4.2 / 6.4 | 2.1 / 2.9 / 4.3 / 6.3 / 8.4 |
| 0-5 | 2132 | 1.1 / 2.1 / 3.5 / 5.1 / 6.8 | 3.0 / 4.4 / 6.3 / 8.7 / 11.5 | 14790 | 1.1 / 1.8 / 3.2 / 4.6 / 5.8 | 3.0 / 4.2 / 6.0 / 8.2 / 10.6 |
| 5-10 | 3756 | 0.9 / 1.5 / 2.6 / 3.9 / 5.1 | 2.8 / 4.2 / 6.0 / 8.5 / 11.5 | 9241 | 0.9 / 1.4 / 2.5 / 3.8 / 4.9 | 2.9 / 4.2 / 6.2 / 8.7 / 11.5 |
| 10-15 | 1550 | 0.8 / 1.3 / 2.1 / 3.3 / 4.9 | 3.0 / 4.5 / 6.7 / 9.0 / 11.9 | 2295 | 0.9 / 1.3 / 2.1 / 3.3 / 5.3 | 3.7 / 5.6 / 7.8 / 10.0 / 13.3 |
| 15-20 | 566 | 1.0 / 1.4 / 2.1 / 3.2 / 5.9 | 4.3 / 6.3 / 8.6 / 11.8 / 15.4 | 110 | 1.0 / 1.2 / 1.6 / 2.1 / 3.2 | 5.3 / 7.7 / 9.5 / 12.7 / 15.2 |
| 20+ | 90 | 0.8 / 0.9 / 1.9 / 4.2 / 6.9 | 5.8 / 8.4 / 11.8 / 14.0 / 16.7 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.29 | 0.33 | 0.38 | 0.55 | 0.17 | 0.28 | 0.43 | 0.17 | 0.39 |
| fixed | 0.27 | 0.31 | 0.42 | 0.54 | 0.17 | 0.29 | 0.61 | 0.12 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9292) | 0.48 | 0.31 | 0.21 |
| all, fixed (n 32055) | 0.53 | 0.30 | 0.17 |
| wide open, release (n 918) | 0.60 | 0.07 | 0.34 |
| wide open, fixed (n 2798) | 0.65 | 0.08 | 0.27 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 1950 | 0.078 | 0.018 | 0.003 | 0.001 | 0.0047 |
| all | any fixed time | 2183 | 0.070 | 0.007 | 0.000 | 0.000 | 0.0006 |
| man | release | 478 | 0.017 | 0.004 | 0.000 | 0.000 | 0.0011 |
| man | any fixed time | 554 | 0.016 | 0.000 | 0.000 | 0.000 | 0.0000 |
| zone | release | 1472 | 0.098 | 0.022 | 0.003 | 0.001 | 0.0058 |
| zone | any fixed time | 1629 | 0.088 | 0.009 | 0.001 | 0.000 | 0.0008 |
| behind the line (separately), any moment | all | 1666 | 0.157 | 0.076 | 0.022 | 0.001 | 0.0241 |
| back within 3 yd of the line (separately), any moment | all | 832 | 0.040 | 0.006 | 0.001 | 0.001 | 0.0041 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 677 of 1950 thrown dropbacks (0.347); receiver-moments 0.099
- at any fixed time while the ball was held: 1177 of 2183 dropbacks (0.539); receiver-moments 0.087
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 593 of 2183 dropbacks (0.272)
- d1 tail at release: p90 6.2, p95 7.6, p99 10.7; share of receiver-moments with d1 over 5 yd 0.180, over 7 yd 0.067, over 9 yd 0.026
- d1 tail at fixed: p90 5.6, p95 6.5, p99 8.5; share of receiver-moments with d1 over 5 yd 0.152, over 7 yd 0.033, over 9 yd 0.006
- the targeted receiver at release (n 1925): d1 1.4 / 2.4 / 3.6 / 5.1 / 6.7, wide open 0.147; untargeted route runners at release d1 0.9 / 1.4 / 2.5 / 4.0 / 5.9

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 779 | 3372 | 3.0 / 6.0 | 0.098 | 0.369 | 11591 | 3.0 / 5.9 | 0.110 | 0.648 |
| Cover-1 | 447 | 1831 | 1.9 / 4.7 | 0.018 | 0.081 | 6661 | 1.9 / 4.6 | 0.027 | 0.280 |
| Quarters | 342 | 1505 | 3.0 / 6.3 | 0.102 | 0.397 | 4876 | 3.4 / 5.8 | 0.104 | 0.640 |
| Cover-2 | 283 | 1208 | 3.4 / 7.8 | 0.211 | 0.647 | 4300 | 2.8 / 5.7 | 0.110 | 0.622 |
| Cover-6 | 197 | 872 | 3.1 / 7.0 | 0.158 | 0.503 | 2897 | 3.0 / 5.9 | 0.110 | 0.614 |
| Cover-0 | 107 | 380 | 1.6 / 4.8 | 0.021 | 0.088 | 1278 | 1.5 / 4.4 | 0.023 | 0.200 |
| 2-Man | 30 | 124 | 1.8 / 4.4 | 0.000 | 0.000 | 452 | 1.9 / 4.8 | 0.024 | 0.333 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1629 | 7073 | 3.0 / 6.6 | 0.125 | 0.438 | 24124 | 3.0 / 5.8 | 0.108 | 0.636 |
| Man | 556 | 2219 | 1.8 / 4.7 | 0.015 | 0.069 | 7931 | 1.8 / 4.6 | 0.025 | 0.255 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 934 | 3975 | 2.7 / 6.4 | 0.100 | 0.349 | 13650 | 2.7 / 5.7 | 0.091 | 0.544 |
| 2x2 | 833 | 3484 | 2.8 / 6.2 | 0.096 | 0.328 | 12115 | 2.7 / 5.6 | 0.089 | 0.554 |
| 3x2 | 327 | 1465 | 2.8 / 5.7 | 0.106 | 0.397 | 4841 | 2.9 / 5.5 | 0.083 | 0.541 |
| 2x1 | 71 | 278 | 2.4 / 5.9 | 0.072 | 0.283 | 1139 | 2.4 / 4.9 | 0.047 | 0.324 |
| 4x1 | 20 | 90 | 3.1 / 5.7 | 0.122 | 0.444 | 310 | 3.0 / 5.5 | 0.077 | 0.450 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1838 | 7737 | 2.7 / 6.3 | 0.097 | 0.337 | 26904 | 2.7 / 5.6 | 0.088 | 0.540 |
| True | 347 | 1555 | 2.8 / 5.7 | 0.107 | 0.399 | 5151 | 2.9 / 5.5 | 0.082 | 0.536 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1165 | 4956 | 2.8 / 6.2 | 0.102 | 0.345 | 16963 | 2.8 / 5.7 | 0.092 | 0.556 |
| True | 1020 | 4336 | 2.7 / 6.1 | 0.095 | 0.350 | 15092 | 2.7 / 5.5 | 0.082 | 0.520 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1944 | 8222 | 2.8 / 6.2 | 0.098 | 0.341 | 28429 | 2.8 / 5.6 | 0.089 | 0.544 |
| True | 241 | 1070 | 2.8 / 5.6 | 0.105 | 0.398 | 3626 | 2.8 / 5.4 | 0.077 | 0.502 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1585 | 6863 | 2.9 / 6.5 | 0.108 | 0.373 | 23275 | 2.9 / 5.8 | 0.097 | 0.585 |
| True | 600 | 2429 | 2.5 / 5.5 | 0.073 | 0.278 | 8780 | 2.4 / 5.1 | 0.060 | 0.418 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| all-on-plays.jsonl.gz | 316 | 0.487 | 198 | 0.242 | 231 | 0.320 | 161 | 0.155 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (all-on-plays.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.1 | fix | 0-5 | Cover-2 | 6565 | 1903 | 0.104 | 0.035 |
| -10.7 | fix | 5-10 | Cover-1 | 5803 | 1851 | 0.040 | 0.006 |
| +10.5 | fix | 10-15 | Cover-2 | 1801 | 316 | 0.177 | 0.487 |
| -8.1 | fix | 0-5 | Cover-0 | 1540 | 662 | 0.094 | 0.020 |
| -8.0 | fix | 10-15 | Cover-3 | 3757 | 927 | 0.104 | 0.039 |
| -6.8 | rel | behind LOS | Cover-1 | 1260 | 237 | 0.036 | 0.000 |
| -6.7 | rel | 10-15 | Cover-3 | 2116 | 592 | 0.118 | 0.044 |
| -6.7 | fix | 15-20 | Cover-3 | 594 | 50 | 0.071 | 0.000 |

### By man / zone (all-on-plays.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.9 | fix | 5-10 | Man | 6943 | 2171 | 0.045 | 0.010 |
| -9.4 | fix | 0-5 | Man | 13192 | 3891 | 0.044 | 0.018 |
| -7.6 | rel | behind LOS | Man | 1562 | 280 | 0.036 | 0.000 |
| -6.4 | fix | 5-10 | Zone | 20078 | 7070 | 0.120 | 0.093 |
| -6.1 | fix | 0-5 | Zone | 29528 | 10899 | 0.128 | 0.106 |
| +4.7 | rel | behind LOS | Zone | 4823 | 918 | 0.121 | 0.185 |
| -4.4 | rel | 10-15 | Man | 1494 | 294 | 0.013 | 0.000 |
| -3.7 | rel | 5-10 | Man | 2955 | 954 | 0.034 | 0.015 |

### By formation (all-on-plays.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.7 | fix | behind LOS | 3x2 | 1528 | 237 | 0.165 | 0.017 |
| -6.1 | fix | 5-10 | 3x1 | 11585 | 3881 | 0.103 | 0.072 |
| -5.8 | fix | 0-5 | 3x2 | 6617 | 2528 | 0.133 | 0.091 |
| -4.5 | fix | behind LOS | 2x1 | 2002 | 421 | 0.081 | 0.033 |
| -4.3 | fix | 0-5 | 3x1 | 17410 | 6230 | 0.100 | 0.083 |
| +4.3 | rel | behind LOS | 3x1 | 2798 | 563 | 0.100 | 0.172 |
| -4.1 | fix | 5-10 | 2x2 | 11497 | 3331 | 0.096 | 0.075 |
| +4.0 | fix | behind LOS | 2x2 | 10846 | 2365 | 0.085 | 0.113 |

### By play action (all-on-plays.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -13.8 | fix | behind LOS | True | 10037 | 1813 | 0.066 | 0.014 |
| -7.4 | fix | 5-10 | False | 22031 | 6908 | 0.100 | 0.073 |
| -5.6 | fix | 0-5 | False | 36025 | 10815 | 0.108 | 0.090 |
| +5.4 | fix | behind LOS | False | 14828 | 3806 | 0.123 | 0.158 |
| +5.1 | rel | behind LOS | False | 4265 | 841 | 0.114 | 0.187 |
| -4.5 | rel | 0-5 | True | 2432 | 571 | 0.097 | 0.049 |
| -3.4 | fix | 5-10 | True | 6504 | 2333 | 0.099 | 0.077 |
| -3.4 | rel | behind LOS | True | 2383 | 357 | 0.074 | 0.036 |

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

- 303-3-72 cover2 rel frame 24 QB (-5.8, 26.7): RB d1 3.8 d2 5.4 front/inside/opening; Y d1 4.7 d2 8.2 level/inside/closing; X d1 6.7 d2 7.9 front/inside/closing; Z d1 3.1 d2 11.7 front/outside/opening; H d1 2.6 d2 3.0 behind/head-up/closing
- 505-0-44 cover1_lurk rel frame 24 QB (-8.5, 29.7): RB d1 3.6 d2 3.6 front/head-up/opening; Y d1 0.8 d2 2.5 level/head-up/closing; X d1 1.4 d2 11.5 behind/outside/closing; Z d1 3.2 d2 17.4 behind/outside/closing; H d1 4.8 d2 5.9 front/outside/opening
- 202-0-17 cover0 rel frame 20 QB (-3.1, 22.6): Y d1 4.0 d2 5.1 behind/inside/closing; X d1 4.4 d2 13.4 behind/inside/closing; Z d1 4.4 d2 4.7 behind/inside/closing
- 404-3-65 cover1_off rel frame 22 QB (-7.4, 29.7): RB d1 0.9 d2 1.3 level/outside/opening; Y d1 0.9 d2 6.6 level/inside/closing; X d1 3.7 d2 5.9 behind/inside/closing; Z d1 2.4 d2 12.2 level/inside/closing; H d1 0.7 d2 3.2 level/inside/closing
- 303-1-25 cover3 rel frame 27 QB (-7.8, 29.6): RB d1 5.7 d2 7.3 behind/inside/steady; Y d1 4.3 d2 8.9 behind/head-up/opening; X d1 2.3 d2 4.6 front/inside/closing; Z d1 3.0 d2 5.2 front/inside/opening; H d1 1.6 d2 3.1 front/inside/opening
- 505-2-31 tampa2 rel frame 27 QB (-5.8, 26.8): RB d1 2.8 d2 5.2 front/inside/opening; Y d1 1.8 d2 2.8 level/inside/closing; X d1 3.4 d2 5.9 level/inside/opening; Z d1 3.7 d2 10.9 front/inside/opening; H d1 1.5 d2 4.4 front/inside/closing
- 202-2-21 cover1_robber rel frame 25 QB (-5.8, 26.7): RB d1 0.6 d2 3.1 level/head-up/steady; Y d1 1.2 d2 4.7 level/inside/closing; X d1 1.1 d2 17.4 front/inside/closing; Z d1 1.2 d2 14.3 level/inside/closing; H d1 1.7 d2 6.8 behind/inside/closing
- 404-0-41 cover3_seam rel frame 32 QB (-7.3, 23.5): RB d1 2.8 d2 11.3 behind/head-up/closing; Y d1 3.2 d2 10.3 behind/inside/closing; X d1 1.2 d2 3.1 behind/head-up/closing; Z d1 1.3 d2 10.7 level/outside/opening; H d1 2.7 d2 12.6 level/inside/closing
- 303-2-54 cover3 rel frame 27 QB (-8.8, 29.6): Y d1 7.9 d2 8.1 behind/outside/closing; X d1 3.5 d2 4.7 behind/inside/closing; Z d1 3.4 d2 5.1 behind/inside/closing; H d1 5.2 d2 6.6 front/inside/opening
- 404-3-53 deuce rel frame 26 QB (-7.1, 29.6): RB d1 7.5 d2 7.9 front/inside/opening; Y d1 6.8 d2 9.7 front/inside/opening; X d1 4.8 d2 5.3 front/inside/closing; Z d1 1.7 d2 2.8 behind/outside/closing; H d1 3.8 d2 5.1 front/head-up/opening
- 505-2-34 cover3_match rel frame 23 QB (-8.2, 29.8): RB d1 3.5 d2 4.3 front/inside/opening; Y d1 1.0 d2 6.3 level/outside/closing; X d1 3.2 d2 9.8 behind/outside/closing; Z d1 4.7 d2 4.9 front/inside/closing; H d1 2.0 d2 7.7 level/inside/steady
- 303-1-60 split_quarters_2man rel frame 32 QB (-7.8, 27.6): RB d1 7.0 d2 8.1 front/inside/opening; Y d1 1.7 d2 1.7 level/inside/opening; X d1 2.4 d2 5.2 front/inside/opening; Z d1 2.2 d2 2.8 level/inside/steady; H d1 1.7 d2 1.8 front/inside/closing

Second implementation: 57 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
