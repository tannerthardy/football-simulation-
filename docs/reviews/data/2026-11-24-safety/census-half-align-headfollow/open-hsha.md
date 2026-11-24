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

## Ours: m-hsha-plays.gz

2091 dropbacks, 39507 receiver-moments (release 8734, fixed 30773).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1136 | 1.0 / 1.9 / 3.9 / 6.7 / 9.3 | 2.3 / 3.8 / 6.5 / 10.1 / 12.3 | 5346 | 0.9 / 1.5 / 2.6 / 4.2 / 6.6 | 2.1 / 3.0 / 4.4 / 6.5 / 8.7 |
| 0-5 | 2051 | 1.0 / 1.8 / 3.1 / 4.8 / 6.6 | 2.8 / 4.3 / 6.1 / 8.3 / 10.8 | 14166 | 1.1 / 1.6 / 2.9 / 4.4 / 5.8 | 2.9 / 4.1 / 5.9 / 8.1 / 10.4 |
| 5-10 | 3451 | 0.9 / 1.3 / 2.4 / 3.8 / 4.9 | 2.7 / 4.1 / 6.0 / 8.5 / 11.4 | 8887 | 0.8 / 1.2 / 2.2 / 3.6 / 4.8 | 2.8 / 4.2 / 6.3 / 8.8 / 11.4 |
| 10-15 | 1521 | 0.8 / 1.3 / 2.1 / 3.3 / 4.5 | 3.2 / 4.6 / 6.9 / 9.5 / 12.3 | 2270 | 0.9 / 1.3 / 2.1 / 3.1 / 4.3 | 3.7 / 5.6 / 8.1 / 10.6 / 13.6 |
| 15-20 | 512 | 1.0 / 1.3 / 2.2 / 3.6 / 5.4 | 4.7 / 6.4 / 8.8 / 12.1 / 15.6 | 104 | 1.1 / 1.2 / 1.6 / 2.1 / 3.8 | 6.3 / 8.1 / 10.7 / 13.6 / 15.3 |
| 20+ | 63 | 0.8 / 0.9 / 1.6 / 3.2 / 6.1 | 6.0 / 8.1 / 10.8 / 14.9 / 17.5 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.31 | 0.35 | 0.34 | 0.52 | 0.18 | 0.29 | 0.42 | 0.18 | 0.40 |
| fixed | 0.25 | 0.34 | 0.41 | 0.51 | 0.18 | 0.31 | 0.61 | 0.12 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 8734) | 0.44 | 0.34 | 0.22 |
| all, fixed (n 30773) | 0.52 | 0.32 | 0.16 |
| wide open, release (n 762) | 0.61 | 0.08 | 0.31 |
| wide open, fixed (n 2540) | 0.70 | 0.07 | 0.23 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 1831 | 0.060 | 0.019 | 0.004 | 0.000 | 0.0047 |
| all | any fixed time | 2089 | 0.061 | 0.007 | 0.000 | 0.000 | 0.0007 |
| man | release | 433 | 0.018 | 0.002 | 0.000 | 0.000 | 0.0006 |
| man | any fixed time | 507 | 0.010 | 0.000 | 0.000 | 0.000 | 0.0000 |
| zone | release | 1398 | 0.072 | 0.024 | 0.005 | 0.000 | 0.0060 |
| zone | any fixed time | 1582 | 0.077 | 0.009 | 0.001 | 0.000 | 0.0010 |
| behind the line (separately), any moment | all | 1588 | 0.166 | 0.075 | 0.015 | 0.001 | 0.0242 |
| back within 3 yd of the line (separately), any moment | all | 765 | 0.026 | 0.004 | 0.001 | 0.000 | 0.0021 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 608 of 1831 thrown dropbacks (0.332); receiver-moments 0.087
- at any fixed time while the ball was held: 1127 of 2089 dropbacks (0.539); receiver-moments 0.083
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 577 of 2089 dropbacks (0.276)
- d1 tail at release: p90 6.0, p95 7.4, p99 10.6; share of receiver-moments with d1 over 5 yd 0.163, over 7 yd 0.058, over 9 yd 0.024
- d1 tail at fixed: p90 5.5, p95 6.4, p99 8.4; share of receiver-moments with d1 over 5 yd 0.141, over 7 yd 0.031, over 9 yd 0.006
- the targeted receiver at release (n 1810): d1 1.4 / 2.3 / 3.6 / 5.0 / 6.8, wide open 0.151; untargeted route runners at release d1 0.8 / 1.3 / 2.4 / 3.9 / 5.7

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 728 | 3098 | 2.9 / 6.2 | 0.108 | 0.409 | 10834 | 2.9 / 5.9 | 0.112 | 0.682 |
| Cover-1 | 403 | 1686 | 1.8 / 4.7 | 0.023 | 0.091 | 5962 | 1.9 / 4.6 | 0.030 | 0.303 |
| Quarters | 341 | 1448 | 2.9 / 6.4 | 0.107 | 0.429 | 4993 | 3.1 / 5.9 | 0.110 | 0.674 |
| Cover-2 | 269 | 1124 | 2.9 / 6.7 | 0.114 | 0.415 | 4124 | 2.3 / 5.2 | 0.072 | 0.502 |
| Cover-6 | 216 | 935 | 2.7 / 6.3 | 0.106 | 0.408 | 3100 | 2.6 / 5.6 | 0.087 | 0.569 |
| Cover-0 | 101 | 310 | 1.4 / 4.0 | 0.013 | 0.053 | 1270 | 1.4 / 4.2 | 0.017 | 0.140 |
| 2-Man | 33 | 133 | 1.5 / 4.1 | 0.015 | 0.071 | 490 | 1.7 / 4.4 | 0.022 | 0.212 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1583 | 6712 | 2.9 / 6.3 | 0.109 | 0.414 | 23517 | 2.8 / 5.8 | 0.100 | 0.632 |
| Man | 508 | 2022 | 1.7 / 4.5 | 0.015 | 0.067 | 7256 | 1.8 / 4.5 | 0.025 | 0.250 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 917 | 3849 | 2.6 / 6.2 | 0.087 | 0.323 | 13482 | 2.6 / 5.6 | 0.084 | 0.556 |
| 2x2 | 794 | 3257 | 2.7 / 6.0 | 0.084 | 0.321 | 11502 | 2.5 / 5.5 | 0.083 | 0.529 |
| 3x2 | 303 | 1317 | 2.6 / 5.7 | 0.097 | 0.380 | 4574 | 2.6 / 5.4 | 0.078 | 0.525 |
| 2x1 | 64 | 251 | 2.6 / 6.2 | 0.084 | 0.340 | 995 | 2.3 / 5.1 | 0.065 | 0.508 |
| 4x1 | 13 | 60 | 2.7 / 6.0 | 0.100 | 0.500 | 220 | 2.6 / 5.5 | 0.095 | 0.538 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1775 | 7357 | 2.6 / 6.1 | 0.085 | 0.323 | 25979 | 2.6 / 5.5 | 0.083 | 0.542 |
| True | 316 | 1377 | 2.6 / 5.7 | 0.097 | 0.385 | 4794 | 2.6 / 5.4 | 0.079 | 0.525 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1155 | 4823 | 2.6 / 6.1 | 0.090 | 0.338 | 17054 | 2.6 / 5.6 | 0.084 | 0.546 |
| True | 936 | 3911 | 2.6 / 5.9 | 0.084 | 0.324 | 13719 | 2.5 / 5.4 | 0.081 | 0.532 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1878 | 7822 | 2.6 / 6.0 | 0.086 | 0.326 | 27554 | 2.6 / 5.5 | 0.083 | 0.540 |
| True | 213 | 912 | 2.6 / 5.7 | 0.096 | 0.384 | 3219 | 2.5 / 5.3 | 0.077 | 0.535 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1518 | 6394 | 2.6 / 6.2 | 0.092 | 0.343 | 22470 | 2.7 / 5.7 | 0.090 | 0.577 |
| True | 573 | 2340 | 2.5 / 5.5 | 0.075 | 0.304 | 8303 | 2.3 / 5.1 | 0.063 | 0.442 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| m-hsha-plays.gz | 297 | 0.114 | 222 | 0.032 | 192 | 0.068 | 180 | 0.056 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (m-hsha-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.7 | fix | 0-5 | Cover-0 | 1540 | 658 | 0.094 | 0.003 |
| -9.8 | fix | 5-10 | Cover-1 | 5803 | 1694 | 0.040 | 0.008 |
| -8.7 | fix | 0-5 | Cover-2 | 6565 | 1893 | 0.104 | 0.050 |
| -8.5 | fix | 0-5 | Cover-1 | 10740 | 2850 | 0.039 | 0.014 |
| -6.9 | fix | 5-10 | Cover-2 | 4457 | 1206 | 0.101 | 0.048 |
| -6.7 | fix | 15-20 | Cover-3 | 594 | 54 | 0.071 | 0.000 |
| -6.2 | fix | 5-10 | Cover-0 | 602 | 350 | 0.118 | 0.023 |
| -5.6 | rel | 10-15 | Cover-2 | 1153 | 192 | 0.188 | 0.068 |

### By man / zone (m-hsha-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.0 | fix | 0-5 | Man | 13192 | 3523 | 0.044 | 0.013 |
| -11.0 | fix | 5-10 | Man | 6943 | 2046 | 0.045 | 0.009 |
| -7.6 | fix | 5-10 | Zone | 20078 | 6841 | 0.120 | 0.089 |
| -6.9 | fix | 0-5 | Zone | 29528 | 10643 | 0.128 | 0.104 |
| -6.8 | fix | 10-15 | Zone | 8358 | 1800 | 0.119 | 0.071 |
| -6.2 | rel | 5-10 | Man | 2955 | 880 | 0.034 | 0.007 |
| -4.9 | rel | 10-15 | Zone | 4910 | 1188 | 0.129 | 0.083 |
| -4.3 | fix | 10-15 | Man | 2025 | 470 | 0.018 | 0.002 |

### By formation (m-hsha-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -17.4 | fix | behind LOS | 3x2 | 1528 | 247 | 0.165 | 0.000 |
| -8.4 | fix | 5-10 | 3x1 | 11585 | 3817 | 0.103 | 0.062 |
| -5.9 | fix | 0-5 | 3x2 | 6617 | 2344 | 0.133 | 0.090 |
| -5.2 | fix | 10-15 | 2x2 | 4298 | 899 | 0.096 | 0.051 |
| -5.1 | fix | 0-5 | 3x1 | 17410 | 6162 | 0.100 | 0.079 |
| -5.0 | fix | 10-15 | 3x1 | 4486 | 942 | 0.106 | 0.061 |
| +4.5 | fix | behind LOS | 3x1 | 10098 | 2507 | 0.107 | 0.141 |
| -4.5 | rel | 10-15 | 3x1 | 2798 | 609 | 0.114 | 0.062 |

### By play action (m-hsha-plays.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -9.8 | fix | behind LOS | True | 10037 | 1606 | 0.066 | 0.022 |
| -8.8 | fix | 5-10 | False | 22031 | 6578 | 0.100 | 0.068 |
| -7.3 | fix | 0-5 | False | 36025 | 10444 | 0.108 | 0.085 |
| -6.1 | fix | 10-15 | True | 3017 | 650 | 0.130 | 0.062 |
| +5.6 | fix | behind LOS | False | 14828 | 3740 | 0.123 | 0.160 |
| -5.2 | fix | 10-15 | False | 7793 | 1620 | 0.089 | 0.055 |
| -4.7 | rel | 10-15 | False | 5129 | 1073 | 0.094 | 0.056 |
| -4.7 | rel | behind LOS | True | 2383 | 312 | 0.074 | 0.026 |

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

- 303-2-23 cover9 rel frame 23 QB (-5.8, 23.7): Y d1 2.5 d2 5.3 front/inside/closing; X d1 6.0 d2 6.8 behind/inside/closing; Z d1 4.2 d2 8.3 behind/head-up/closing; H d1 1.5 d2 2.3 level/inside/closing
- 101-0-16 cover8_trix rel frame 30 QB (-7.8, 23.5): RB d1 1.5 d2 4.3 level/inside/steady; Y d1 0.5 d2 7.8 level/head-up/steady; X d1 2.6 d2 7.8 level/outside/steady; Z d1 3.5 d2 5.1 front/inside/opening; H d1 0.8 d2 3.7 level/inside/opening
- 505-1-82 cover3_mable rel frame 25 QB (-7.1, 23.6): RB d1 7.9 d2 9.3 front/inside/opening; Y d1 3.4 d2 5.5 behind/head-up/closing; X d1 1.0 d2 9.0 level/inside/closing; Z d1 1.0 d2 12.1 level/outside/closing; H d1 3.4 d2 6.2 front/inside/opening
- 404-3-38 cover4_palms rel frame 26 QB (-7.8, 26.7): RB d1 3.8 d2 4.8 front/inside/opening; Y d1 1.4 d2 3.0 front/head-up/opening; X d1 5.3 d2 7.2 behind/head-up/opening; Z d1 3.5 d2 3.8 behind/head-up/closing; H d1 2.9 d2 6.8 level/inside/opening
- 303-3-51 cover0 rel frame 26 QB (-8.0, 29.7): RB d1 4.4 d2 7.3 front/inside/steady; X d1 0.5 d2 5.5 level/head-up/closing; Z d1 1.1 d2 22.1 front/inside/closing; H d1 1.3 d2 1.4 level/inside/closing
- 303-2-45 cover4_stubbie rel frame 19 QB (-7.0, 23.5): Y d1 1.4 d2 4.8 front/inside/opening; X d1 6.2 d2 13.1 behind/outside/closing; Z d1 5.6 d2 6.5 behind/outside/closing; H d1 1.0 d2 3.8 behind/outside/closing
- 101-5-11 deuce_dot rel frame 26 QB (-8.4, 24.4): RB d1 1.6 d2 5.7 behind/outside/closing; Y d1 1.0 d2 1.7 level/inside/steady; X d1 3.7 d2 4.9 front/inside/opening; Z d1 1.2 d2 2.7 level/inside/closing; H d1 3.8 d2 4.3 behind/outside/steady
- 101-6-75 cover9_strap rel frame 32 QB (-7.9, 26.7): RB d1 4.5 d2 5.7 level/inside/closing; Y d1 0.7 d2 8.0 level/inside/closing; X d1 2.7 d2 3.4 behind/outside/steady; Z d1 3.9 d2 4.2 front/inside/closing; H d1 4.4 d2 5.8 behind/outside/closing
- 202-2-52 cover1 rel frame 33 QB (-5.8, 24.7): RB d1 0.5 d2 8.5 level/head-up/closing; Y d1 3.9 d2 6.8 front/inside/opening; X d1 0.8 d2 9.4 level/inside/steady; Z d1 1.2 d2 10.1 level/head-up/opening; H d1 0.9 d2 4.1 level/inside/steady
- 303-3-17 cover4_box rel frame 29 QB (-7.8, 26.6): Y d1 1.2 d2 1.5 level/outside/opening; X d1 2.8 d2 6.9 behind/outside/closing; Z d1 3.1 d2 3.7 behind/outside/closing; H d1 3.1 d2 3.4 level/inside/steady
- 101-4-59 cover4_palms rel frame 20 QB (-7.9, 26.7): RB d1 2.6 d2 5.4 behind/outside/opening; Y d1 1.9 d2 7.8 front/inside/opening; X d1 5.0 d2 9.6 behind/outside/closing; Z d1 6.8 d2 7.0 front/inside/closing; H d1 1.9 d2 5.4 behind/inside/closing
- 505-3-44 cover1 rel frame 32 QB (-8.7, 23.7): RB d1 1.5 d2 5.3 front/inside/opening; Y d1 0.6 d2 7.2 level/outside/closing; X d1 1.2 d2 12.5 front/inside/steady; Z d1 0.8 d2 11.9 level/inside/closing; H d1 0.8 d2 10.3 level/head-up/steady

Second implementation: 56 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
