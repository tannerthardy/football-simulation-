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

## Ours: m-ts2-plays.gz

2129 dropbacks, 40028 receiver-moments (release 8942, fixed 31086).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1156 | 1.0 / 1.8 / 3.9 / 6.5 / 9.3 | 2.0 / 3.6 / 6.2 / 9.7 / 12.1 | 5436 | 0.9 / 1.5 / 2.5 / 4.1 / 6.3 | 2.0 / 2.9 / 4.3 / 6.3 / 8.5 |
| 0-5 | 2098 | 1.0 / 1.8 / 3.1 / 4.8 / 6.7 | 2.8 / 4.2 / 6.2 / 8.5 / 11.3 | 14461 | 1.0 / 1.6 / 3.0 / 4.4 / 5.8 | 2.9 / 4.1 / 5.9 / 8.1 / 10.5 |
| 5-10 | 3609 | 0.9 / 1.4 / 2.5 / 3.8 / 5.0 | 2.8 / 4.0 / 5.9 / 8.4 / 11.4 | 8915 | 0.8 / 1.2 / 2.2 / 3.6 / 4.7 | 2.8 / 4.3 / 6.3 / 8.8 / 11.5 |
| 10-15 | 1460 | 0.8 / 1.3 / 2.3 / 3.4 / 4.7 | 3.3 / 4.8 / 6.9 / 9.2 / 12.0 | 2186 | 0.9 / 1.3 / 2.2 / 3.2 / 4.5 | 4.0 / 5.8 / 8.3 / 10.7 / 13.4 |
| 15-20 | 546 | 1.0 / 1.3 / 2.1 / 3.5 / 5.4 | 4.4 / 6.4 / 9.0 / 12.4 / 15.3 | 88 | 1.1 / 1.2 / 1.6 / 2.1 / 4.1 | 4.5 / 7.0 / 10.3 / 14.2 / 15.9 |
| 20+ | 73 | 0.8 / 0.9 / 1.7 / 4.3 / 5.9 | 5.8 / 7.8 / 11.5 / 16.0 / 18.5 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.31 | 0.35 | 0.34 | 0.53 | 0.18 | 0.30 | 0.41 | 0.18 | 0.41 |
| fixed | 0.25 | 0.34 | 0.41 | 0.51 | 0.19 | 0.30 | 0.61 | 0.12 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 8942) | 0.44 | 0.33 | 0.23 |
| all, fixed (n 31086) | 0.52 | 0.31 | 0.17 |
| wide open, release (n 820) | 0.64 | 0.06 | 0.30 |
| wide open, fixed (n 2478) | 0.69 | 0.07 | 0.25 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 1882 | 0.063 | 0.014 | 0.003 | 0.000 | 0.0036 |
| all | any fixed time | 2127 | 0.064 | 0.005 | 0.000 | 0.000 | 0.0004 |
| man | release | 465 | 0.002 | 0.000 | 0.000 | 0.000 | 0.0000 |
| man | any fixed time | 545 | 0.013 | 0.002 | 0.000 | 0.000 | 0.0002 |
| zone | release | 1417 | 0.083 | 0.019 | 0.004 | 0.000 | 0.0048 |
| zone | any fixed time | 1582 | 0.082 | 0.006 | 0.000 | 0.000 | 0.0005 |
| behind the line (separately), any moment | all | 1584 | 0.159 | 0.069 | 0.016 | 0.001 | 0.0218 |
| back within 3 yd of the line (separately), any moment | all | 785 | 0.029 | 0.010 | 0.001 | 0.000 | 0.0062 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 629 of 1882 thrown dropbacks (0.334); receiver-moments 0.092
- at any fixed time while the ball was held: 1088 of 2127 dropbacks (0.512); receiver-moments 0.080
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 544 of 2127 dropbacks (0.256)
- d1 tail at release: p90 6.0, p95 7.4, p99 10.3; share of receiver-moments with d1 over 5 yd 0.168, over 7 yd 0.059, over 9 yd 0.024
- d1 tail at fixed: p90 5.5, p95 6.4, p99 8.4; share of receiver-moments with d1 over 5 yd 0.139, over 7 yd 0.030, over 9 yd 0.006
- the targeted receiver at release (n 1864): d1 1.4 / 2.4 / 3.6 / 5.2 / 7.0, wide open 0.160; untargeted route runners at release d1 0.9 / 1.4 / 2.4 / 3.9 / 5.7

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 758 | 3217 | 3.0 / 6.3 | 0.112 | 0.407 | 11267 | 3.0 / 5.9 | 0.110 | 0.642 |
| Cover-1 | 440 | 1772 | 1.8 / 4.8 | 0.023 | 0.097 | 6409 | 1.8 / 4.5 | 0.027 | 0.273 |
| Quarters | 341 | 1500 | 2.9 / 6.4 | 0.113 | 0.428 | 4947 | 3.1 / 5.8 | 0.102 | 0.642 |
| Cover-2 | 243 | 1035 | 3.2 / 6.8 | 0.137 | 0.440 | 3640 | 2.4 / 5.2 | 0.071 | 0.479 |
| Cover-6 | 207 | 900 | 2.8 / 6.2 | 0.109 | 0.428 | 3100 | 2.6 / 5.5 | 0.088 | 0.585 |
| Cover-0 | 105 | 380 | 1.6 / 4.0 | 0.013 | 0.054 | 1221 | 1.5 / 4.1 | 0.016 | 0.114 |
| 2-Man | 34 | 138 | 1.7 / 5.3 | 0.036 | 0.172 | 502 | 2.1 / 4.9 | 0.032 | 0.382 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1583 | 6783 | 3.0 / 6.4 | 0.116 | 0.422 | 23493 | 2.8 / 5.7 | 0.098 | 0.607 |
| Man | 545 | 2159 | 1.7 / 4.6 | 0.015 | 0.067 | 7593 | 1.8 / 4.5 | 0.024 | 0.235 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 931 | 3907 | 2.7 / 6.3 | 0.099 | 0.352 | 13680 | 2.6 / 5.6 | 0.082 | 0.545 |
| 2x2 | 782 | 3250 | 2.7 / 6.1 | 0.089 | 0.314 | 11178 | 2.6 / 5.5 | 0.083 | 0.502 |
| 3x2 | 310 | 1343 | 2.5 / 5.5 | 0.085 | 0.359 | 4726 | 2.6 / 5.3 | 0.073 | 0.484 |
| 2x1 | 85 | 352 | 2.5 / 5.6 | 0.057 | 0.221 | 1227 | 2.4 / 4.9 | 0.054 | 0.353 |
| 4x1 | 20 | 90 | 2.0 / 5.0 | 0.089 | 0.389 | 275 | 2.9 / 5.5 | 0.069 | 0.450 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1798 | 7509 | 2.7 / 6.1 | 0.093 | 0.329 | 26085 | 2.6 / 5.5 | 0.081 | 0.517 |
| True | 330 | 1433 | 2.4 / 5.5 | 0.085 | 0.361 | 5001 | 2.6 / 5.3 | 0.072 | 0.482 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1158 | 4875 | 2.7 / 6.0 | 0.093 | 0.335 | 16818 | 2.7 / 5.6 | 0.083 | 0.544 |
| True | 970 | 4067 | 2.6 / 6.0 | 0.090 | 0.333 | 14268 | 2.5 / 5.4 | 0.075 | 0.473 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1898 | 7929 | 2.7 / 6.1 | 0.092 | 0.331 | 27600 | 2.6 / 5.5 | 0.081 | 0.519 |
| True | 230 | 1013 | 2.4 / 5.5 | 0.087 | 0.363 | 3486 | 2.5 / 5.2 | 0.069 | 0.452 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1557 | 6610 | 2.7 / 6.2 | 0.097 | 0.349 | 22733 | 2.7 / 5.6 | 0.086 | 0.543 |
| True | 571 | 2332 | 2.5 / 5.6 | 0.077 | 0.293 | 8353 | 2.3 / 5.1 | 0.062 | 0.426 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| m-ts2-plays.gz | 222 | 0.135 | 256 | 0.094 | 191 | 0.131 | 160 | 0.075 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (m-ts2-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.6 | fix | 5-10 | Cover-1 | 5803 | 1728 | 0.040 | 0.006 |
| -9.8 | fix | 0-5 | Cover-2 | 6565 | 1680 | 0.104 | 0.043 |
| -9.4 | fix | 0-5 | Cover-0 | 1540 | 649 | 0.094 | 0.012 |
| -7.8 | fix | 0-5 | Cover-1 | 10740 | 3101 | 0.039 | 0.016 |
| -7.3 | fix | 5-10 | Cover-3 | 8952 | 3235 | 0.139 | 0.093 |
| -6.9 | fix | 5-10 | Cover-0 | 602 | 318 | 0.118 | 0.016 |
| -5.4 | fix | 0-5 | Quarters | 5480 | 2307 | 0.145 | 0.102 |
| -5.1 | fix | 10-15 | Quarters | 1560 | 372 | 0.106 | 0.040 |

### By man / zone (m-ts2-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.5 | fix | 5-10 | Man | 6943 | 2037 | 0.045 | 0.008 |
| -10.2 | fix | 0-5 | Man | 13192 | 3712 | 0.044 | 0.016 |
| -9.3 | fix | 5-10 | Zone | 20078 | 6878 | 0.120 | 0.083 |
| -7.4 | fix | 0-5 | Zone | 29528 | 10749 | 0.128 | 0.102 |
| -5.6 | rel | behind LOS | Man | 1562 | 296 | 0.036 | 0.003 |
| +4.6 | rel | behind LOS | Zone | 4823 | 860 | 0.121 | 0.186 |
| -4.3 | fix | 10-15 | Man | 2025 | 465 | 0.018 | 0.002 |
| -3.7 | rel | 10-15 | Zone | 4910 | 1167 | 0.129 | 0.093 |

### By formation (m-ts2-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -15.4 | fix | behind LOS | 3x2 | 1528 | 228 | 0.165 | 0.004 |
| -10.0 | fix | 5-10 | 3x1 | 11585 | 3867 | 0.103 | 0.056 |
| -8.1 | fix | 0-5 | 3x2 | 6617 | 2452 | 0.133 | 0.077 |
| -6.4 | rel | behind LOS | 2x1 | 427 | 99 | 0.087 | 0.000 |
| -5.8 | fix | behind LOS | 2x1 | 2002 | 438 | 0.081 | 0.025 |
| -5.2 | fix | 0-5 | 3x1 | 17410 | 6272 | 0.100 | 0.079 |
| -5.0 | fix | 5-10 | 2x2 | 11497 | 3029 | 0.096 | 0.070 |
| +4.1 | rel | behind LOS | 3x1 | 2798 | 532 | 0.100 | 0.171 |

### By play action (m-ts2-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.3 | fix | behind LOS | True | 10037 | 1785 | 0.066 | 0.017 |
| -10.9 | fix | 5-10 | False | 22031 | 6686 | 0.100 | 0.061 |
| -7.7 | fix | 0-5 | False | 36025 | 10743 | 0.108 | 0.084 |
| +5.0 | rel | behind LOS | False | 4265 | 810 | 0.114 | 0.186 |
| -4.3 | rel | behind LOS | True | 2383 | 346 | 0.074 | 0.029 |
| -4.3 | rel | 10-15 | False | 5129 | 1062 | 0.094 | 0.058 |
| +4.0 | fix | behind LOS | False | 14828 | 3651 | 0.123 | 0.149 |
| -3.7 | fix | 10-15 | False | 7793 | 1582 | 0.089 | 0.063 |

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

- 101-2-46 cover2_match rel frame 25 QB (-8.8, 24.5): RB d1 2.7 d2 5.8 front/head-up/opening; Y d1 1.5 d2 1.5 level/inside/opening; X d1 4.4 d2 14.2 front/head-up/opening; Z d1 2.2 d2 9.2 level/outside/steady; H d1 2.5 d2 4.5 level/outside/opening
- 303-1-38 split_quarters_2man rel frame 27 QB (-7.1, 26.6): RB d1 8.2 d2 9.8 front/inside/opening; Y d1 4.4 d2 10.3 behind/outside/opening; X d1 4.5 d2 9.2 front/inside/opening; Z d1 2.5 d2 8.2 behind/outside/closing; H d1 1.9 d2 7.7 front/inside/opening
- 303-1-58 cover4_stubbie rel frame 33 QB (-8.3, 26.9): RB d1 11.0 d2 11.5 front/inside/closing; Y d1 2.5 d2 3.6 behind/inside/opening; X d1 4.9 d2 5.3 behind/inside/closing; Z d1 1.2 d2 7.5 level/inside/steady; H d1 0.8 d2 4.7 level/outside/steady
- 101-1-8 cover2_invert rel frame 33 QB (-8.6, 29.8): RB d1 0.9 d2 3.5 level/inside/closing; Y d1 4.3 d2 6.9 behind/outside/opening; X d1 1.6 d2 4.9 level/head-up/closing; Z d1 2.3 d2 7.0 front/inside/steady; F d1 6.1 d2 7.7 behind/head-up/closing
- 202-1-27 cover3_trips rel frame 29 QB (-8.8, 29.6): RB d1 9.5 d2 10.2 front/inside/opening; Y d1 1.7 d2 2.1 behind/outside/opening; X d1 2.5 d2 6.1 behind/outside/opening; Z d1 2.6 d2 4.4 level/inside/closing; H d1 1.7 d2 1.8 level/inside/closing
- 202-0-54 cover2 rel frame 25 QB (-5.8, 23.7): RB d1 2.2 d2 3.5 behind/outside/closing; Y d1 5.3 d2 5.8 front/inside/opening; X d1 3.0 d2 6.4 behind/outside/opening; Z d1 2.3 d2 9.9 front/head-up/opening; H d1 4.7 d2 7.4 front/inside/opening
- 505-0-64 cover1 rel frame 22 QB (-7.0, 23.6): Y d1 1.1 d2 2.3 level/inside/closing; X d1 1.3 d2 11.1 level/inside/steady; Z d1 0.7 d2 1.2 level/inside/opening; H d1 3.6 d2 4.6 behind/inside/steady
- 404-3-13 cover1_lurk rel frame 24 QB (-8.3, 29.8): RB d1 6.4 d2 6.6 front/inside/opening; Y d1 1.5 d2 3.6 behind/head-up/closing; X d1 3.2 d2 5.8 behind/outside/closing; Z d1 0.5 d2 10.5 level/head-up/closing; H d1 7.1 d2 9.6 level/inside/closing
- 101-0-51 cover3_seam rel frame 23 QB (-7.1, 23.7): Y d1 0.5 d2 1.7 level/inside/steady; X d1 4.2 d2 9.7 behind/outside/closing; Z d1 6.1 d2 10.7 behind/outside/closing; H d1 1.3 d2 4.7 level/outside/opening
- 404-0-34 cover1_lurk_trips rel frame 21 QB (-6.8, 23.6): Y d1 4.5 d2 8.1 level/inside/closing; X d1 1.8 d2 12.3 behind/outside/closing; Z d1 3.4 d2 6.1 behind/outside/closing; H d1 0.9 d2 4.8 level/outside/closing
- 101-0-35 cover2_match rel frame 26 QB (-7.1, 23.6): RB d1 3.0 d2 6.4 behind/inside/opening; Y d1 3.7 d2 7.4 behind/outside/opening; X d1 3.1 d2 7.7 front/head-up/opening; Z d1 3.8 d2 10.8 front/head-up/opening; H d1 0.8 d2 6.9 level/outside/closing
- 101-5-0 cover9 rel frame 26 QB (-7.1, 26.6): RB d1 9.2 d2 9.4 front/inside/opening; Y d1 4.0 d2 5.8 level/outside/opening; X d1 1.7 d2 9.8 behind/outside/closing; Z d1 3.1 d2 10.4 behind/outside/closing; H d1 5.0 d2 7.6 front/inside/opening

Second implementation: 57 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
