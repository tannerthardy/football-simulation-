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

## Ours: fb0-all24.jsonl.gz

2297 dropbacks, 42258 receiver-moments (release 9952, fixed 32306).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1263 | 1.0 / 1.8 / 4.0 / 7.4 / 10.0 | 2.4 / 4.0 / 6.9 / 10.2 / 12.3 | 5464 | 1.0 / 1.5 / 2.6 / 4.2 / 6.6 | 2.1 / 3.0 / 4.5 / 6.5 / 8.6 |
| 0-5 | 2409 | 1.2 / 2.1 / 3.6 / 5.1 / 6.9 | 3.1 / 4.5 / 6.4 / 8.7 / 11.6 | 15110 | 1.1 / 2.0 / 3.3 / 4.6 / 5.9 | 3.1 / 4.3 / 6.0 / 8.2 / 10.6 |
| 5-10 | 3897 | 0.9 / 1.5 / 2.7 / 4.0 / 5.1 | 2.9 / 4.2 / 6.0 / 8.5 / 11.3 | 9206 | 0.9 / 1.4 / 2.5 / 3.8 / 4.8 | 2.9 / 4.3 / 6.2 / 8.7 / 11.3 |
| 10-15 | 1551 | 0.8 / 1.2 / 2.1 / 3.3 / 5.1 | 3.0 / 4.4 / 6.7 / 9.0 / 11.7 | 2412 | 0.9 / 1.3 / 2.1 / 3.3 / 5.5 | 3.6 / 5.4 / 7.7 / 9.9 / 12.9 |
| 15-20 | 608 | 1.0 / 1.4 / 2.1 / 3.8 / 6.5 | 4.3 / 6.2 / 8.5 / 11.2 / 14.5 | 114 | 1.1 / 1.2 / 1.6 / 2.4 / 6.3 | 4.9 / 7.8 / 9.3 / 11.4 / 14.2 |
| 20+ | 224 | 0.7 / 1.1 / 2.0 / 3.3 / 5.8 | 4.7 / 7.0 / 10.4 / 15.1 / 17.8 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.29 | 0.34 | 0.37 | 0.54 | 0.18 | 0.28 | 0.43 | 0.19 | 0.38 |
| fixed | 0.27 | 0.31 | 0.42 | 0.54 | 0.17 | 0.29 | 0.61 | 0.12 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9952) | 0.47 | 0.32 | 0.21 |
| all, fixed (n 32306) | 0.53 | 0.29 | 0.18 |
| wide open, release (n 1083) | 0.60 | 0.08 | 0.32 |
| wide open, fixed (n 2875) | 0.65 | 0.07 | 0.27 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 2132 | 0.073 | 0.019 | 0.005 | 0.000 | 0.0048 |
| all | any fixed time | 2261 | 0.060 | 0.011 | 0.001 | 0.000 | 0.0011 |
| man | release | 495 | 0.012 | 0.002 | 0.000 | 0.000 | 0.0005 |
| man | any fixed time | 541 | 0.009 | 0.002 | 0.000 | 0.000 | 0.0002 |
| zone | release | 1637 | 0.092 | 0.024 | 0.006 | 0.001 | 0.0061 |
| zone | any fixed time | 1720 | 0.076 | 0.013 | 0.002 | 0.000 | 0.0014 |
| behind the line (separately), any moment | all | 1720 | 0.187 | 0.086 | 0.019 | 0.001 | 0.0282 |
| back within 3 yd of the line (separately), any moment | all | 883 | 0.050 | 0.025 | 0.010 | 0.002 | 0.0150 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 805 of 2132 thrown dropbacks (0.378); receiver-moments 0.109
- at any fixed time while the ball was held: 1251 of 2261 dropbacks (0.553); receiver-moments 0.089
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 618 of 2261 dropbacks (0.273)
- d1 tail at release: p90 6.3, p95 7.9, p99 10.9; share of receiver-moments with d1 over 5 yd 0.189, over 7 yd 0.075, over 9 yd 0.032
- d1 tail at fixed: p90 5.6, p95 6.5, p99 8.5; share of receiver-moments with d1 over 5 yd 0.152, over 7 yd 0.034, over 9 yd 0.007
- the targeted receiver at release (n 2090): d1 1.5 / 2.5 / 3.9 / 5.4 / 7.7, wide open 0.169; untargeted route runners at release d1 0.9 / 1.4 / 2.5 / 4.1 / 5.9

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 771 | 3374 | 3.0 / 6.2 | 0.105 | 0.398 | 10829 | 3.1 / 5.9 | 0.112 | 0.674 |
| Cover-1 | 430 | 1884 | 1.8 / 4.7 | 0.020 | 0.087 | 6173 | 2.0 / 4.6 | 0.027 | 0.271 |
| Quarters | 393 | 1715 | 3.0 / 6.8 | 0.127 | 0.466 | 5452 | 3.3 / 5.9 | 0.106 | 0.648 |
| Cover-2 | 316 | 1417 | 3.6 / 7.5 | 0.219 | 0.620 | 4672 | 2.9 / 5.6 | 0.107 | 0.615 |
| Cover-6 | 244 | 1052 | 3.2 / 6.7 | 0.143 | 0.511 | 3434 | 3.1 / 5.7 | 0.112 | 0.657 |
| Cover-0 | 114 | 404 | 1.4 / 4.1 | 0.025 | 0.091 | 1336 | 1.3 / 4.1 | 0.019 | 0.143 |
| 2-Man | 29 | 106 | 2.2 / 4.9 | 0.047 | 0.174 | 410 | 2.0 / 4.6 | 0.034 | 0.379 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1752 | 7687 | 3.1 / 6.8 | 0.135 | 0.466 | 24822 | 3.1 / 5.8 | 0.108 | 0.649 |
| Man | 545 | 2265 | 1.7 / 4.6 | 0.020 | 0.085 | 7484 | 1.8 / 4.6 | 0.025 | 0.248 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 951 | 4095 | 2.8 / 6.3 | 0.109 | 0.356 | 13499 | 2.8 / 5.6 | 0.087 | 0.547 |
| 2x2 | 896 | 3837 | 3.0 / 6.7 | 0.113 | 0.401 | 11928 | 2.9 / 5.7 | 0.098 | 0.577 |
| 3x2 | 353 | 1602 | 2.7 / 5.8 | 0.108 | 0.394 | 5428 | 2.9 / 5.5 | 0.083 | 0.527 |
| 2x1 | 78 | 328 | 2.6 / 5.3 | 0.061 | 0.254 | 1196 | 2.4 / 4.9 | 0.049 | 0.436 |
| 4x1 | 19 | 90 | 3.2 / 6.2 | 0.111 | 0.556 | 255 | 3.5 / 5.8 | 0.106 | 0.789 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1925 | 8260 | 2.8 / 6.4 | 0.109 | 0.373 | 26623 | 2.8 / 5.6 | 0.090 | 0.556 |
| True | 372 | 1692 | 2.8 / 5.8 | 0.108 | 0.403 | 5683 | 3.0 / 5.5 | 0.084 | 0.540 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1296 | 5532 | 2.9 / 6.5 | 0.113 | 0.374 | 17536 | 2.9 / 5.7 | 0.096 | 0.570 |
| True | 1001 | 4420 | 2.8 / 6.1 | 0.104 | 0.382 | 14770 | 2.8 / 5.5 | 0.081 | 0.532 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 2031 | 8750 | 2.8 / 6.4 | 0.109 | 0.374 | 28243 | 2.8 / 5.6 | 0.090 | 0.555 |
| True | 266 | 1202 | 2.8 / 5.9 | 0.111 | 0.405 | 4063 | 3.0 / 5.5 | 0.084 | 0.541 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1689 | 7363 | 2.9 / 6.6 | 0.120 | 0.406 | 23430 | 3.0 / 5.8 | 0.100 | 0.593 |
| True | 608 | 2589 | 2.5 / 5.4 | 0.078 | 0.296 | 8876 | 2.5 / 5.1 | 0.060 | 0.444 |

## Ours: fb1-all24.jsonl.gz

2195 dropbacks, 40688 receiver-moments (release 9409, fixed 31279).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1199 | 1.0 / 1.8 / 4.1 / 7.2 / 9.6 | 2.3 / 3.9 / 6.8 / 10.1 / 12.5 | 5319 | 0.9 / 1.5 / 2.6 / 4.2 / 6.5 | 2.1 / 3.0 / 4.5 / 6.4 / 8.6 |
| 0-5 | 2216 | 1.1 / 2.1 / 3.6 / 5.1 / 6.9 | 3.1 / 4.6 / 6.4 / 8.9 / 11.9 | 14415 | 1.1 / 2.0 / 3.2 / 4.6 / 5.9 | 3.1 / 4.3 / 6.0 / 8.2 / 10.6 |
| 5-10 | 3630 | 0.9 / 1.5 / 2.7 / 4.0 / 5.2 | 2.9 / 4.2 / 6.0 / 8.5 / 11.1 | 9019 | 0.9 / 1.4 / 2.5 / 3.9 / 4.9 | 2.9 / 4.2 / 6.2 / 8.7 / 11.3 |
| 10-15 | 1535 | 0.8 / 1.3 / 2.2 / 3.3 / 5.0 | 3.0 / 4.4 / 6.4 / 8.9 / 11.5 | 2422 | 0.9 / 1.3 / 2.1 / 3.3 / 5.3 | 3.4 / 5.4 / 7.7 / 10.3 / 13.4 |
| 15-20 | 626 | 0.9 / 1.4 / 2.1 / 3.5 / 6.1 | 4.1 / 6.0 / 8.6 / 11.8 / 15.1 | 104 | 1.0 / 1.3 / 1.7 / 2.3 / 7.4 | 6.0 / 8.3 / 9.7 / 11.7 / 14.5 |
| 20+ | 203 | 0.7 / 1.0 / 2.1 / 4.0 / 6.7 | 4.4 / 7.0 / 10.3 / 15.1 / 17.9 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.30 | 0.34 | 0.36 | 0.55 | 0.17 | 0.28 | 0.43 | 0.18 | 0.39 |
| fixed | 0.27 | 0.31 | 0.42 | 0.54 | 0.17 | 0.29 | 0.61 | 0.12 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9409) | 0.47 | 0.32 | 0.22 |
| all, fixed (n 31279) | 0.53 | 0.29 | 0.18 |
| wide open, release (n 993) | 0.59 | 0.07 | 0.35 |
| wide open, fixed (n 2877) | 0.64 | 0.08 | 0.28 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 2011 | 0.089 | 0.020 | 0.005 | 0.000 | 0.0051 |
| all | any fixed time | 2162 | 0.080 | 0.009 | 0.002 | 0.000 | 0.0011 |
| man | release | 468 | 0.021 | 0.004 | 0.002 | 0.002 | 0.0011 |
| man | any fixed time | 544 | 0.024 | 0.006 | 0.004 | 0.000 | 0.0008 |
| zone | release | 1543 | 0.109 | 0.025 | 0.006 | 0.000 | 0.0063 |
| zone | any fixed time | 1618 | 0.100 | 0.011 | 0.002 | 0.000 | 0.0012 |
| behind the line (separately), any moment | all | 1656 | 0.182 | 0.073 | 0.020 | 0.001 | 0.0256 |
| back within 3 yd of the line (separately), any moment | all | 808 | 0.058 | 0.026 | 0.006 | 0.004 | 0.0151 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 741 of 2011 thrown dropbacks (0.368); receiver-moments 0.106
- at any fixed time while the ball was held: 1182 of 2162 dropbacks (0.547); receiver-moments 0.092
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 616 of 2162 dropbacks (0.285)
- d1 tail at release: p90 6.4, p95 8.0, p99 11.0; share of receiver-moments with d1 over 5 yd 0.190, over 7 yd 0.075, over 9 yd 0.030
- d1 tail at fixed: p90 5.6, p95 6.6, p99 8.6; share of receiver-moments with d1 over 5 yd 0.155, over 7 yd 0.036, over 9 yd 0.007
- the targeted receiver at release (n 1973): d1 1.4 / 2.5 / 3.9 / 5.5 / 7.9, wide open 0.175; untargeted route runners at release d1 0.9 / 1.4 / 2.5 / 4.1 / 5.9

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 722 | 3196 | 2.9 / 6.3 | 0.099 | 0.378 | 10388 | 3.1 / 6.0 | 0.116 | 0.668 |
| Cover-1 | 429 | 1776 | 1.8 / 4.6 | 0.017 | 0.076 | 6032 | 2.0 / 4.6 | 0.023 | 0.225 |
| Quarters | 366 | 1611 | 3.0 / 6.6 | 0.119 | 0.440 | 5070 | 3.3 / 5.9 | 0.114 | 0.675 |
| Cover-2 | 308 | 1362 | 3.6 / 7.5 | 0.200 | 0.609 | 4636 | 2.9 / 5.8 | 0.114 | 0.650 |
| Cover-6 | 228 | 1017 | 3.4 / 7.3 | 0.171 | 0.569 | 3228 | 3.1 / 5.9 | 0.118 | 0.634 |
| Cover-0 | 107 | 307 | 1.6 / 4.5 | 0.023 | 0.090 | 1348 | 1.4 / 4.5 | 0.027 | 0.215 |
| 2-Man | 35 | 140 | 1.8 / 4.4 | 0.014 | 0.069 | 577 | 1.9 / 4.6 | 0.017 | 0.257 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1648 | 7291 | 3.1 / 6.8 | 0.131 | 0.458 | 23675 | 3.1 / 5.9 | 0.114 | 0.657 |
| Man | 547 | 2118 | 1.8 / 4.5 | 0.017 | 0.073 | 7604 | 1.9 / 4.6 | 0.022 | 0.219 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 918 | 3924 | 2.8 / 6.4 | 0.109 | 0.376 | 13184 | 2.8 / 5.7 | 0.091 | 0.525 |
| 2x2 | 853 | 3577 | 2.9 / 6.6 | 0.108 | 0.370 | 11618 | 2.8 / 5.6 | 0.096 | 0.576 |
| 3x2 | 336 | 1533 | 2.8 / 5.9 | 0.101 | 0.386 | 5194 | 2.9 / 5.6 | 0.092 | 0.560 |
| 2x1 | 67 | 275 | 2.6 / 5.8 | 0.036 | 0.115 | 983 | 2.5 / 4.9 | 0.052 | 0.403 |
| 4x1 | 21 | 100 | 3.1 / 5.9 | 0.140 | 0.500 | 300 | 3.0 / 5.5 | 0.097 | 0.619 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1838 | 7776 | 2.8 / 6.5 | 0.106 | 0.364 | 25785 | 2.8 / 5.6 | 0.092 | 0.543 |
| True | 357 | 1633 | 2.8 / 5.9 | 0.103 | 0.393 | 5494 | 2.9 / 5.6 | 0.093 | 0.563 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1217 | 5169 | 2.9 / 6.6 | 0.117 | 0.386 | 16804 | 2.9 / 5.7 | 0.099 | 0.570 |
| True | 978 | 4240 | 2.7 / 6.1 | 0.092 | 0.347 | 14475 | 2.8 / 5.5 | 0.084 | 0.518 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1944 | 8276 | 2.8 / 6.5 | 0.107 | 0.367 | 27460 | 2.8 / 5.6 | 0.092 | 0.547 |
| True | 251 | 1133 | 2.8 / 5.7 | 0.098 | 0.377 | 3819 | 2.9 / 5.6 | 0.090 | 0.546 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1648 | 7111 | 2.9 / 6.6 | 0.115 | 0.401 | 23061 | 3.0 / 5.8 | 0.102 | 0.581 |
| True | 547 | 2298 | 2.6 / 5.6 | 0.076 | 0.268 | 8218 | 2.5 / 5.1 | 0.064 | 0.444 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| fb0-all24.jsonl.gz | 382 | 0.484 | 272 | 0.235 | 234 | 0.321 | 163 | 0.233 |
| fb1-all24.jsonl.gz | 352 | 0.420 | 255 | 0.329 | 238 | 0.303 | 152 | 0.250 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (fb0-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.7 | fix | 0-5 | Cover-2 | 6565 | 2122 | 0.104 | 0.034 |
| +11.3 | fix | 10-15 | Cover-2 | 1801 | 382 | 0.177 | 0.484 |
| -10.3 | fix | 0-5 | Cover-0 | 1540 | 691 | 0.094 | 0.009 |
| -8.9 | fix | 10-15 | Cover-3 | 3757 | 863 | 0.104 | 0.034 |
| -8.8 | fix | 10-15 | Quarters | 1560 | 413 | 0.106 | 0.017 |
| +8.0 | rel | behind LOS | Quarters | 932 | 217 | 0.094 | 0.369 |
| -8.0 | fix | 5-10 | Cover-1 | 5803 | 1686 | 0.040 | 0.011 |
| -7.8 | fix | 5-10 | Cover-3 | 8952 | 2996 | 0.139 | 0.089 |

### By man / zone (fb0-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -9.5 | fix | 0-5 | Man | 13192 | 3683 | 0.044 | 0.017 |
| -9.3 | fix | 5-10 | Man | 6943 | 2053 | 0.045 | 0.013 |
| -7.4 | fix | 5-10 | Zone | 20078 | 7153 | 0.120 | 0.090 |
| +7.3 | rel | behind LOS | Zone | 4823 | 983 | 0.121 | 0.224 |
| -6.1 | fix | 0-5 | Zone | 29528 | 11427 | 0.128 | 0.107 |
| -4.2 | fix | 10-15 | Man | 2025 | 446 | 0.018 | 0.002 |
| +3.1 | fix | 10-15 | Zone | 8358 | 1966 | 0.119 | 0.145 |
| -2.8 | rel | 5-10 | Man | 2955 | 927 | 0.034 | 0.018 |

### By formation (fb0-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.0 | fix | behind LOS | 3x2 | 1528 | 238 | 0.165 | 0.025 |
| -7.9 | fix | 5-10 | 3x1 | 11585 | 3757 | 0.103 | 0.064 |
| -7.0 | fix | behind LOS | 2x1 | 2002 | 427 | 0.081 | 0.019 |
| +6.7 | rel | behind LOS | 2x2 | 2807 | 582 | 0.086 | 0.203 |
| +6.0 | fix | behind LOS | 2x2 | 10846 | 2318 | 0.085 | 0.129 |
| -5.9 | fix | 0-5 | 3x2 | 6617 | 2793 | 0.133 | 0.092 |
| +5.2 | rel | behind LOS | 3x1 | 2798 | 554 | 0.100 | 0.191 |
| -4.8 | fix | 5-10 | 3x2 | 3779 | 1869 | 0.110 | 0.073 |

### By play action (fb0-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.5 | fix | behind LOS | True | 10037 | 1789 | 0.066 | 0.019 |
| +8.1 | rel | behind LOS | False | 4265 | 896 | 0.114 | 0.235 |
| -7.5 | fix | 5-10 | False | 22031 | 6802 | 0.100 | 0.072 |
| +5.7 | fix | behind LOS | False | 14828 | 3675 | 0.123 | 0.161 |
| -4.6 | fix | 0-5 | False | 36025 | 11135 | 0.108 | 0.093 |
| -3.9 | fix | 5-10 | True | 6504 | 2404 | 0.099 | 0.074 |
| +3.7 | fix | 10-15 | False | 7793 | 1725 | 0.089 | 0.120 |
| -3.6 | rel | 0-5 | True | 2432 | 609 | 0.097 | 0.057 |

### By coverage family (fb1-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.1 | fix | 10-15 | Cover-3 | 3757 | 884 | 0.104 | 0.028 |
| -9.6 | fix | 0-5 | Cover-2 | 6565 | 2157 | 0.104 | 0.047 |
| -9.6 | rel | 10-15 | Cover-3 | 2116 | 554 | 0.118 | 0.025 |
| +8.8 | fix | 10-15 | Cover-2 | 1801 | 352 | 0.177 | 0.420 |
| -8.5 | fix | 10-15 | Quarters | 1560 | 425 | 0.106 | 0.019 |
| +7.6 | fix | 10-15 | Cover-6 | 1240 | 255 | 0.096 | 0.329 |
| -7.0 | fix | 0-5 | Cover-1 | 10740 | 2918 | 0.039 | 0.017 |
| -7.0 | fix | 0-5 | Cover-0 | 1540 | 654 | 0.094 | 0.026 |

### By man / zone (fb1-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -9.8 | fix | 0-5 | Man | 13192 | 3647 | 0.044 | 0.017 |
| -7.7 | fix | 5-10 | Man | 6943 | 2190 | 0.045 | 0.017 |
| -5.0 | fix | 0-5 | Zone | 29528 | 10768 | 0.128 | 0.110 |
| +4.9 | rel | behind LOS | Zone | 4823 | 946 | 0.121 | 0.187 |
| -4.4 | rel | 10-15 | Man | 1494 | 317 | 0.013 | 0.000 |
| -4.4 | fix | 10-15 | Man | 2025 | 481 | 0.018 | 0.002 |
| -3.5 | fix | 5-10 | Zone | 20078 | 6829 | 0.120 | 0.105 |
| +3.1 | fix | behind LOS | Zone | 17869 | 4046 | 0.112 | 0.130 |

### By formation (fb1-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.6 | fix | behind LOS | 3x2 | 1528 | 233 | 0.165 | 0.017 |
| -6.3 | rel | 10-15 | 3x1 | 2798 | 589 | 0.114 | 0.048 |
| -5.3 | fix | 5-10 | 3x1 | 11585 | 3723 | 0.103 | 0.075 |
| -5.1 | fix | 0-5 | 3x2 | 6617 | 2656 | 0.133 | 0.096 |
| +4.6 | rel | behind LOS | 3x1 | 2798 | 531 | 0.100 | 0.183 |
| -4.4 | fix | behind LOS | 2x1 | 2002 | 371 | 0.081 | 0.032 |
| +4.2 | fix | behind LOS | 2x2 | 10846 | 2310 | 0.085 | 0.115 |
| -3.9 | rel | behind LOS | 2x1 | 427 | 77 | 0.087 | 0.013 |

### By play action (fb1-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.7 | fix | behind LOS | True | 10037 | 1660 | 0.066 | 0.018 |
| +5.4 | rel | behind LOS | False | 4265 | 872 | 0.114 | 0.190 |
| +4.9 | fix | behind LOS | False | 14828 | 3659 | 0.123 | 0.155 |
| -4.5 | fix | 0-5 | False | 36025 | 10763 | 0.108 | 0.093 |
| -4.0 | fix | 5-10 | False | 22031 | 6796 | 0.100 | 0.085 |
| -3.4 | rel | 0-5 | True | 2432 | 509 | 0.097 | 0.057 |
| +2.8 | fix | 10-15 | False | 7793 | 1766 | 0.089 | 0.112 |
| -2.6 | fix | 5-10 | True | 6504 | 2223 | 0.099 | 0.081 |

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

- 404-1-12 cover4_poach rel frame 31 QB (-7.1, 23.5): RB d1 4.7 d2 11.2 level/inside/closing; Y d1 0.5 d2 6.1 level/head-up/steady; X d1 1.8 d2 7.4 behind/outside/closing; Z d1 1.3 d2 10.8 level/inside/closing; H d1 1.1 d2 2.3 level/inside/closing
- 101-0-12 cover4_poach rel frame 26 QB (-6.5, 23.3): RB d1 2.2 d2 3.2 behind/head-up/opening; Y d1 2.1 d2 9.9 level/inside/steady; X d1 3.6 d2 9.2 behind/inside/opening; Z d1 2.7 d2 6.7 behind/outside/closing; H d1 4.3 d2 12.2 level/inside/closing
- 505-2-11 cover6_area rel frame 22 QB (-7.1, 29.8): RB d1 9.4 d2 9.5 front/inside/opening; Y d1 3.0 d2 6.9 front/outside/opening; X d1 5.6 d2 10.9 front/inside/opening; Z d1 3.3 d2 5.0 behind/outside/closing; H d1 1.6 d2 4.4 level/inside/closing
- 505-0-47 cover3 rel frame 29 QB (-5.8, 29.7): RB d1 5.3 d2 6.4 front/inside/opening; Y d1 3.1 d2 5.9 behind/inside/closing; X d1 3.9 d2 10.8 level/inside/steady; Z d1 2.0 d2 5.0 level/inside/closing; H d1 5.2 d2 7.3 behind/outside/closing
- 505-2-26 cover0 rel frame 24 QB (-5.9, 23.6): X d1 1.0 d2 9.7 level/outside/steady; Z d1 0.7 d2 12.4 level/outside/closing
- 101-3-25 deuce rel frame 33 QB (-8.6, 26.7): RB d1 5.2 d2 6.2 behind/head-up/closing; Y d1 1.0 d2 7.1 level/outside/closing; X d1 3.5 d2 5.6 behind/outside/closing; Z d1 2.6 d2 6.0 behind/outside/opening; H d1 5.8 d2 6.5 behind/inside/opening
- 303-0-64 cover1_lurk rel frame 30 QB (-7.8, 26.2): RB d1 3.6 d2 5.3 behind/inside/opening; Y d1 4.4 d2 5.9 level/inside/closing; X d1 0.9 d2 6.8 level/inside/closing; Z d1 5.1 d2 7.3 behind/head-up/opening; H d1 1.7 d2 3.9 level/inside/opening
- 101-2-46 cover3_mable rel frame 38 QB (-8.7, 27.0): RB d1 13.5 d2 14.1 front/inside/closing; Y d1 3.9 d2 13.7 front/inside/closing; X d1 0.9 d2 11.5 level/outside/opening; Z d1 1.1 d2 12.4 level/outside/opening; H d1 3.1 d2 4.1 front/outside/opening
- 202-1-25 cover6_rev rel frame 29 QB (-6.2, 30.4): RB d1 7.3 d2 10.1 front/inside/opening; Y d1 2.0 d2 3.7 level/inside/steady; X d1 1.2 d2 6.2 level/head-up/steady; Z d1 3.8 d2 4.9 front/head-up/steady; H d1 8.1 d2 14.1 front/inside/opening
- 101-0-72 cover3_buzz rel frame 42 QB (-7.2, 29.9): RB d1 7.8 d2 14.5 level/inside/closing; Y d1 0.9 d2 4.8 level/inside/opening; X d1 0.8 d2 13.2 level/outside/steady; Z d1 0.8 d2 16.2 level/outside/steady; H d1 8.5 d2 10.2 behind/outside/opening
- 404-1-17 cover3_buzz rel frame 23 QB (-7.5, 23.7): RB d1 3.2 d2 6.3 front/inside/opening; Y d1 1.5 d2 3.3 behind/head-up/closing; X d1 1.3 d2 6.0 behind/outside/closing; Z d1 1.4 d2 6.9 level/inside/closing; H d1 2.2 d2 4.6 front/head-up/opening
- 303-2-64 cover6_rev rel frame 37 QB (-8.6, 27.3): RB d1 8.2 d2 18.8 front/inside/opening; Y d1 0.8 d2 3.0 level/inside/steady; X d1 2.3 d2 6.5 level/outside/steady; Z d1 5.1 d2 10.2 behind/inside/closing; H d1 3.1 d2 5.8 behind/head-up/closing

Second implementation: 57 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
