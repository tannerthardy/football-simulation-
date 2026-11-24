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

## Ours: plays-corner-read.jsonl.gz

2232 dropbacks, 41500 receiver-moments (release 9635, fixed 31865).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1190 | 1.0 / 1.9 / 4.2 / 6.9 / 9.3 | 2.2 / 3.8 / 6.6 / 9.9 / 11.8 | 5364 | 0.9 / 1.5 / 2.5 / 4.1 / 6.6 | 2.1 / 2.9 / 4.2 / 6.2 / 8.5 |
| 0-5 | 2255 | 1.1 / 1.9 / 3.3 / 5.1 / 6.9 | 2.9 / 4.3 / 6.3 / 8.7 / 11.2 | 14799 | 1.0 / 1.6 / 3.0 / 4.5 / 5.8 | 3.0 / 4.2 / 6.0 / 8.1 / 10.5 |
| 5-10 | 3782 | 0.8 / 1.4 / 2.5 / 3.8 / 5.0 | 2.7 / 4.0 / 5.9 / 8.4 / 11.4 | 9260 | 0.8 / 1.3 / 2.3 / 3.6 / 4.8 | 2.8 / 4.2 / 6.2 / 8.7 / 11.4 |
| 10-15 | 1551 | 0.8 / 1.3 / 2.2 / 3.5 / 5.1 | 3.1 / 4.5 / 6.7 / 9.1 / 12.1 | 2320 | 0.9 / 1.3 / 2.2 / 3.3 / 5.0 | 3.7 / 5.5 / 7.9 / 10.7 / 13.5 |
| 15-20 | 609 | 1.0 / 1.4 / 2.1 / 4.0 / 6.2 | 4.6 / 6.5 / 8.9 / 11.8 / 15.7 | 122 | 1.1 / 1.2 / 1.6 / 2.0 / 4.1 | 5.5 / 8.2 / 9.8 / 12.4 / 15.4 |
| 20+ | 248 | 0.8 / 1.0 / 1.7 / 3.2 / 5.4 | 4.7 / 7.6 / 10.8 / 15.3 / 18.9 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.30 | 0.35 | 0.34 | 0.54 | 0.17 | 0.29 | 0.42 | 0.18 | 0.40 |
| fixed | 0.25 | 0.35 | 0.40 | 0.53 | 0.18 | 0.29 | 0.61 | 0.12 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9635) | 0.45 | 0.34 | 0.21 |
| all, fixed (n 31865) | 0.52 | 0.32 | 0.16 |
| wide open, release (n 982) | 0.67 | 0.06 | 0.27 |
| wide open, fixed (n 2792) | 0.69 | 0.07 | 0.24 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 2067 | 0.088 | 0.019 | 0.004 | 0.000 | 0.0053 |
| all | any fixed time | 2194 | 0.067 | 0.008 | 0.000 | 0.000 | 0.0008 |
| man | release | 513 | 0.014 | 0.002 | 0.000 | 0.000 | 0.0005 |
| man | any fixed time | 565 | 0.025 | 0.004 | 0.000 | 0.000 | 0.0003 |
| zone | release | 1554 | 0.113 | 0.025 | 0.006 | 0.001 | 0.0068 |
| zone | any fixed time | 1629 | 0.082 | 0.010 | 0.001 | 0.000 | 0.0009 |
| behind the line (separately), any moment | all | 1665 | 0.177 | 0.067 | 0.014 | 0.001 | 0.0230 |
| back within 3 yd of the line (separately), any moment | all | 876 | 0.029 | 0.014 | 0.008 | 0.000 | 0.0081 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 717 of 2067 thrown dropbacks (0.347); receiver-moments 0.102
- at any fixed time while the ball was held: 1217 of 2194 dropbacks (0.555); receiver-moments 0.088
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 607 of 2194 dropbacks (0.277)
- d1 tail at release: p90 6.3, p95 7.8, p99 10.6; share of receiver-moments with d1 over 5 yd 0.184, over 7 yd 0.070, over 9 yd 0.026
- d1 tail at fixed: p90 5.5, p95 6.5, p99 8.5; share of receiver-moments with d1 over 5 yd 0.145, over 7 yd 0.033, over 9 yd 0.007
- the targeted receiver at release (n 2012): d1 1.4 / 2.4 / 3.8 / 5.5 / 7.8, wide open 0.175; untargeted route runners at release d1 0.8 / 1.3 / 2.4 / 4.0 / 5.7

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 760 | 3329 | 3.0 / 6.5 | 0.123 | 0.421 | 10977 | 3.0 / 6.0 | 0.120 | 0.711 |
| Cover-1 | 466 | 2005 | 1.8 / 4.7 | 0.022 | 0.091 | 6775 | 1.9 / 4.5 | 0.029 | 0.293 |
| Quarters | 389 | 1675 | 2.9 / 6.6 | 0.116 | 0.421 | 5520 | 3.0 / 5.9 | 0.113 | 0.694 |
| Cover-2 | 275 | 1247 | 3.3 / 7.2 | 0.168 | 0.508 | 3979 | 2.5 / 5.4 | 0.083 | 0.509 |
| Cover-6 | 210 | 906 | 2.9 / 7.0 | 0.131 | 0.451 | 2984 | 2.7 / 5.6 | 0.095 | 0.624 |
| Cover-0 | 100 | 338 | 1.7 / 4.3 | 0.018 | 0.073 | 1151 | 1.6 / 4.5 | 0.017 | 0.102 |
| 2-Man | 32 | 135 | 2.2 / 4.8 | 0.007 | 0.036 | 479 | 2.1 / 4.8 | 0.044 | 0.375 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1663 | 7286 | 3.0 / 6.7 | 0.130 | 0.439 | 23950 | 2.9 / 5.8 | 0.108 | 0.661 |
| Man | 569 | 2349 | 1.8 / 4.5 | 0.015 | 0.068 | 7915 | 1.9 / 4.5 | 0.026 | 0.250 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 936 | 4084 | 2.8 / 6.3 | 0.103 | 0.342 | 13366 | 2.7 / 5.6 | 0.092 | 0.572 |
| 2x2 | 876 | 3650 | 2.7 / 6.5 | 0.104 | 0.345 | 12068 | 2.6 / 5.6 | 0.089 | 0.553 |
| 3x2 | 333 | 1538 | 2.4 / 5.7 | 0.100 | 0.375 | 5105 | 2.6 / 5.4 | 0.081 | 0.547 |
| 2x1 | 70 | 288 | 2.6 / 5.6 | 0.073 | 0.270 | 1036 | 2.4 / 4.9 | 0.046 | 0.357 |
| 4x1 | 17 | 75 | 2.3 / 5.7 | 0.093 | 0.467 | 290 | 2.8 / 5.5 | 0.090 | 0.647 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1882 | 8022 | 2.7 / 6.4 | 0.102 | 0.341 | 26470 | 2.6 / 5.6 | 0.089 | 0.555 |
| True | 350 | 1613 | 2.4 / 5.7 | 0.100 | 0.380 | 5395 | 2.6 / 5.4 | 0.081 | 0.551 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1257 | 5389 | 2.7 / 6.5 | 0.107 | 0.357 | 17206 | 2.7 / 5.7 | 0.095 | 0.580 |
| True | 975 | 4246 | 2.6 / 5.9 | 0.095 | 0.333 | 14659 | 2.5 / 5.4 | 0.079 | 0.523 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1996 | 8542 | 2.7 / 6.3 | 0.103 | 0.346 | 28190 | 2.6 / 5.6 | 0.089 | 0.556 |
| True | 236 | 1093 | 2.4 / 5.7 | 0.095 | 0.355 | 3675 | 2.6 / 5.4 | 0.081 | 0.542 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1640 | 7121 | 2.8 / 6.5 | 0.110 | 0.366 | 23070 | 2.7 / 5.7 | 0.096 | 0.586 |
| True | 592 | 2514 | 2.4 / 5.6 | 0.080 | 0.292 | 8795 | 2.4 / 5.1 | 0.065 | 0.470 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| plays-corner-read.jsonl.gz | 237 | 0.359 | 229 | 0.153 | 209 | 0.211 | 152 | 0.099 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (plays-corner-read.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.1 | fix | 0-5 | Cover-2 | 6565 | 1871 | 0.104 | 0.043 |
| -8.7 | fix | 0-5 | Cover-0 | 1540 | 636 | 0.094 | 0.016 |
| -7.7 | fix | 5-10 | Cover-1 | 5803 | 1910 | 0.040 | 0.013 |
| -6.8 | fix | 0-5 | Cover-1 | 10740 | 3280 | 0.039 | 0.019 |
| -6.0 | fix | 5-10 | Cover-0 | 602 | 302 | 0.118 | 0.023 |
| +5.6 | fix | 10-15 | Cover-2 | 1801 | 237 | 0.177 | 0.359 |
| +5.1 | rel | behind LOS | Quarters | 932 | 205 | 0.094 | 0.259 |
| -4.8 | fix | 5-10 | Cover-3 | 8952 | 3179 | 0.139 | 0.107 |

### By man / zone (plays-corner-read.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -9.2 | fix | 5-10 | Man | 6943 | 2189 | 0.045 | 0.013 |
| -8.2 | fix | 0-5 | Man | 13192 | 3915 | 0.044 | 0.020 |
| -6.5 | fix | 5-10 | Zone | 20078 | 7071 | 0.120 | 0.093 |
| -5.6 | fix | 0-5 | Zone | 29528 | 10884 | 0.128 | 0.108 |
| +5.0 | rel | behind LOS | Zone | 4823 | 910 | 0.121 | 0.190 |
| -3.7 | rel | 5-10 | Man | 2955 | 1009 | 0.034 | 0.015 |
| -3.2 | rel | behind LOS | Man | 1562 | 280 | 0.036 | 0.011 |
| +3.0 | fix | behind LOS | Zone | 17869 | 4044 | 0.112 | 0.130 |

### By formation (plays-corner-read.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.3 | fix | behind LOS | 3x2 | 1528 | 221 | 0.165 | 0.014 |
| -8.1 | fix | behind LOS | 2x1 | 2002 | 385 | 0.081 | 0.013 |
| -6.5 | fix | 0-5 | 3x2 | 6617 | 2647 | 0.133 | 0.088 |
| -6.1 | fix | 5-10 | 3x1 | 11585 | 3757 | 0.103 | 0.072 |
| +4.8 | fix | behind LOS | 2x2 | 10846 | 2303 | 0.085 | 0.120 |
| -4.5 | fix | 5-10 | 3x2 | 3779 | 1780 | 0.110 | 0.074 |
| +4.2 | rel | behind LOS | 2x2 | 2807 | 548 | 0.086 | 0.153 |
| +4.0 | rel | behind LOS | 3x1 | 2798 | 535 | 0.100 | 0.170 |

### By play action (plays-corner-read.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.3 | fix | behind LOS | True | 10037 | 1744 | 0.066 | 0.017 |
| -7.6 | fix | 5-10 | False | 22031 | 6773 | 0.100 | 0.072 |
| -6.3 | rel | behind LOS | True | 2383 | 340 | 0.074 | 0.018 |
| -5.9 | fix | 0-5 | False | 36025 | 10929 | 0.108 | 0.089 |
| +5.9 | rel | behind LOS | False | 4265 | 850 | 0.114 | 0.200 |
| +5.9 | fix | behind LOS | False | 14828 | 3620 | 0.123 | 0.162 |
| -2.9 | fix | 10-15 | True | 3017 | 661 | 0.130 | 0.092 |
| -2.8 | fix | 5-10 | True | 6504 | 2487 | 0.099 | 0.080 |

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

- 101-3-5 cover6_rev rel frame 44 QB (-5.9, 23.8): RB d1 9.1 d2 12.3 front/inside/steady; Y d1 7.1 d2 7.5 front/inside/steady; X d1 0.7 d2 19.8 level/head-up/closing; Z d1 4.9 d2 6.1 behind/inside/opening; H d1 1.4 d2 3.2 front/inside/closing
- 303-1-58 cover2_match rel frame 27 QB (-7.8, 23.7): RB d1 4.8 d2 5.5 front/inside/opening; Y d1 1.5 d2 2.2 level/outside/closing; X d1 3.4 d2 6.9 level/inside/opening; Z d1 1.7 d2 5.4 front/inside/opening; H d1 3.9 d2 4.5 behind/outside/opening
- 404-2-85 cover4_meg rel frame 13 QB (-4.8, 23.5): Y d1 1.4 d2 2.6 front/inside/closing; X d1 8.5 d2 9.1 behind/head-up/opening; Z d1 5.4 d2 9.3 behind/outside/closing
- 303-0-3 cover4_box rel frame 30 QB (-7.8, 23.5): RB d1 8.5 d2 9.7 front/inside/opening; Y d1 0.9 d2 1.0 level/head-up/closing; X d1 5.5 d2 6.4 behind/outside/steady; Z d1 3.7 d2 4.0 behind/outside/closing; H d1 3.9 d2 4.8 level/inside/opening
- 101-3-17 cover0 rel frame 21 QB (-7.8, 23.8): RB d1 4.9 d2 6.1 front/inside/opening; Y d1 4.4 d2 6.3 front/inside/opening; X d1 0.9 d2 2.7 level/outside/steady; Z d1 1.0 d2 10.3 level/outside/steady; H d1 0.8 d2 2.4 level/outside/closing
- 505-3-21 cover0 rel frame 29 QB (-5.7, 26.6): RB d1 1.2 d2 7.9 level/inside/opening; Y d1 1.0 d2 3.6 level/head-up/steady; X d1 2.4 d2 11.8 level/inside/opening; Z d1 2.0 d2 5.7 level/inside/opening; H d1 3.9 d2 8.7 behind/inside/opening
- 404-3-59 cover1_off rel frame 13 QB (-4.9, 23.5): Y d1 1.0 d2 4.9 level/head-up/closing; X d1 8.9 d2 9.9 behind/inside/steady; Z d1 5.5 d2 10.4 behind/inside/closing
- 505-1-35 cover1_off rel frame 40 QB (-8.8, 23.5): RB d1 3.7 d2 14.7 level/inside/closing; Y d1 1.5 d2 9.5 level/inside/steady; X d1 0.6 d2 5.4 level/head-up/opening; Z d1 0.5 d2 1.0 level/head-up/steady; H d1 1.5 d2 17.0 level/inside/closing
- 303-3-24 cover4_palms rel frame 13 QB (-4.9, 29.8): Y d1 0.5 d2 1.8 level/head-up/steady; X d1 9.2 d2 9.4 front/inside/opening; Z d1 4.2 d2 9.1 behind/head-up/closing
- 505-0-54 cover0 rel frame 45 QB (-7.0, 23.2): RB d1 6.6 d2 7.6 level/inside/closing; X d1 1.9 d2 7.0 behind/outside/closing; Z d1 3.9 d2 9.7 front/inside/opening; H d1 1.0 d2 12.8 level/outside/closing
- 404-3-80 cover3_buzz rel frame 33 QB (-8.3, 23.5): RB d1 0.9 d2 5.5 level/inside/closing; Y d1 3.9 d2 7.8 behind/outside/closing; X d1 3.0 d2 16.1 behind/outside/opening; Z d1 2.8 d2 13.2 front/head-up/steady; H d1 2.2 d2 2.3 level/inside/opening
- 101-5-15 cover3_match rel frame 38 QB (-6.0, 29.8): X d1 3.6 d2 4.5 front/outside/closing; Z d1 2.5 d2 4.4 front/outside/steady

Second implementation: 50 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
