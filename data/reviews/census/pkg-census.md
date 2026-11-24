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

## Ours: defall-all24.jsonl.gz

2242 dropbacks, 41033 receiver-moments (release 9718, fixed 31315).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1236 | 1.0 / 1.7 / 3.9 / 7.0 / 9.5 | 2.3 / 3.8 / 6.7 / 9.9 / 12.2 | 5438 | 0.9 / 1.5 / 2.5 / 4.0 / 6.2 | 2.1 / 2.9 / 4.3 / 6.2 / 8.5 |
| 0-5 | 2344 | 1.1 / 2.1 / 3.6 / 5.1 / 7.0 | 3.0 / 4.5 / 6.4 / 8.7 / 11.6 | 14594 | 1.2 / 2.0 / 3.3 / 4.6 / 5.9 | 3.2 / 4.3 / 6.0 / 8.2 / 10.6 |
| 5-10 | 3820 | 0.9 / 1.5 / 2.6 / 4.0 / 5.1 | 2.9 / 4.1 / 6.0 / 8.4 / 11.4 | 8929 | 0.9 / 1.4 / 2.5 / 3.8 / 4.9 | 2.9 / 4.3 / 6.3 / 8.8 / 11.5 |
| 10-15 | 1557 | 0.8 / 1.2 / 2.1 / 3.3 / 5.1 | 3.1 / 4.5 / 6.7 / 9.1 / 12.0 | 2239 | 0.8 / 1.3 / 2.1 / 3.2 / 5.4 | 3.5 / 5.4 / 7.7 / 10.0 / 12.9 |
| 15-20 | 556 | 1.0 / 1.3 / 2.1 / 3.3 / 6.3 | 3.9 / 5.8 / 8.6 / 11.6 / 14.8 | 115 | 1.0 / 1.2 / 1.5 / 2.1 / 7.1 | 5.2 / 7.1 / 9.5 / 11.3 / 13.1 |
| 20+ | 205 | 0.7 / 0.9 / 1.8 / 3.5 / 5.1 | 4.1 / 6.8 / 9.8 / 15.4 / 18.4 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.29 | 0.34 | 0.37 | 0.54 | 0.18 | 0.28 | 0.43 | 0.19 | 0.38 |
| fixed | 0.26 | 0.31 | 0.43 | 0.54 | 0.17 | 0.29 | 0.62 | 0.12 | 0.26 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9718) | 0.47 | 0.32 | 0.21 |
| all, fixed (n 31315) | 0.54 | 0.29 | 0.17 |
| wide open, release (n 1004) | 0.63 | 0.06 | 0.31 |
| wide open, fixed (n 2776) | 0.67 | 0.07 | 0.26 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 2086 | 0.071 | 0.014 | 0.003 | 0.000 | 0.0037 |
| all | any fixed time | 2205 | 0.067 | 0.006 | 0.001 | 0.000 | 0.0007 |
| man | release | 509 | 0.012 | 0.002 | 0.000 | 0.000 | 0.0005 |
| man | any fixed time | 554 | 0.014 | 0.002 | 0.000 | 0.000 | 0.0002 |
| zone | release | 1577 | 0.091 | 0.018 | 0.004 | 0.001 | 0.0048 |
| zone | any fixed time | 1651 | 0.084 | 0.008 | 0.001 | 0.000 | 0.0009 |
| behind the line (separately), any moment | all | 1683 | 0.167 | 0.065 | 0.024 | 0.001 | 0.0228 |
| back within 3 yd of the line (separately), any moment | all | 852 | 0.046 | 0.015 | 0.009 | 0.004 | 0.0092 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 755 of 2086 thrown dropbacks (0.362); receiver-moments 0.103
- at any fixed time while the ball was held: 1167 of 2205 dropbacks (0.529); receiver-moments 0.089
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 583 of 2205 dropbacks (0.264)
- d1 tail at release: p90 6.2, p95 7.8, p99 10.6; share of receiver-moments with d1 over 5 yd 0.182, over 7 yd 0.071, over 9 yd 0.026
- d1 tail at fixed: p90 5.6, p95 6.5, p99 8.5; share of receiver-moments with d1 over 5 yd 0.153, over 7 yd 0.033, over 9 yd 0.007
- the targeted receiver at release (n 2033): d1 1.4 / 2.5 / 3.8 / 5.3 / 7.4, wide open 0.160; untargeted route runners at release d1 0.9 / 1.4 / 2.5 / 4.1 / 5.9

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 793 | 3449 | 3.0 / 6.3 | 0.108 | 0.399 | 10916 | 3.1 / 5.9 | 0.112 | 0.648 |
| Cover-1 | 454 | 2008 | 1.8 / 4.6 | 0.023 | 0.103 | 6450 | 2.1 / 4.7 | 0.026 | 0.260 |
| Quarters | 357 | 1552 | 3.1 / 6.6 | 0.128 | 0.458 | 4764 | 3.4 / 5.9 | 0.111 | 0.635 |
| Cover-2 | 278 | 1242 | 3.4 / 7.6 | 0.204 | 0.603 | 4295 | 2.8 / 5.8 | 0.116 | 0.631 |
| Cover-6 | 220 | 971 | 3.0 / 6.6 | 0.129 | 0.466 | 3107 | 3.0 / 5.7 | 0.102 | 0.590 |
| Cover-0 | 112 | 374 | 1.5 / 4.5 | 0.021 | 0.079 | 1365 | 1.3 / 4.2 | 0.018 | 0.117 |
| 2-Man | 28 | 122 | 1.9 / 4.4 | 0.000 | 0.000 | 418 | 2.3 / 4.9 | 0.033 | 0.357 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1679 | 7360 | 3.1 / 6.7 | 0.130 | 0.451 | 23519 | 3.1 / 5.8 | 0.110 | 0.630 |
| Man | 563 | 2358 | 1.8 / 4.6 | 0.020 | 0.084 | 7796 | 1.9 / 4.6 | 0.024 | 0.229 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 933 | 4064 | 2.8 / 6.3 | 0.103 | 0.350 | 12957 | 2.9 / 5.6 | 0.089 | 0.536 |
| 2x2 | 898 | 3773 | 2.8 / 6.4 | 0.104 | 0.361 | 12213 | 2.7 / 5.6 | 0.089 | 0.538 |
| 3x2 | 321 | 1488 | 2.7 / 5.8 | 0.106 | 0.405 | 4756 | 2.9 / 5.6 | 0.093 | 0.520 |
| 2x1 | 77 | 338 | 2.6 / 6.1 | 0.083 | 0.311 | 1184 | 2.4 / 4.9 | 0.059 | 0.390 |
| 4x1 | 13 | 55 | 3.1 / 6.1 | 0.145 | 0.545 | 205 | 3.0 / 5.5 | 0.107 | 0.538 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1908 | 8175 | 2.8 / 6.3 | 0.103 | 0.354 | 26354 | 2.8 / 5.6 | 0.088 | 0.531 |
| True | 334 | 1543 | 2.7 / 5.8 | 0.108 | 0.410 | 4961 | 2.9 / 5.6 | 0.094 | 0.521 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1248 | 5307 | 2.8 / 6.5 | 0.108 | 0.367 | 16847 | 2.9 / 5.6 | 0.092 | 0.544 |
| True | 994 | 4411 | 2.7 / 5.9 | 0.098 | 0.355 | 14468 | 2.8 / 5.5 | 0.085 | 0.512 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 2005 | 8640 | 2.8 / 6.3 | 0.102 | 0.355 | 27819 | 2.8 / 5.6 | 0.088 | 0.530 |
| True | 237 | 1078 | 2.7 / 5.7 | 0.112 | 0.424 | 3496 | 2.9 / 5.6 | 0.093 | 0.519 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1629 | 7108 | 2.9 / 6.5 | 0.115 | 0.392 | 22336 | 3.0 / 5.8 | 0.100 | 0.567 |
| True | 613 | 2610 | 2.5 / 5.4 | 0.071 | 0.281 | 8979 | 2.5 / 5.1 | 0.060 | 0.430 |

## Ours: pkg-all24.jsonl.gz

2220 dropbacks, 40663 receiver-moments (release 9666, fixed 30997).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1297 | 0.9 / 1.9 / 3.9 / 6.9 / 9.8 | 2.2 / 3.8 / 6.7 / 10.1 / 12.3 | 5372 | 0.9 / 1.5 / 2.6 / 4.2 / 6.5 | 2.1 / 3.0 / 4.4 / 6.4 / 8.7 |
| 0-5 | 2215 | 1.2 / 2.1 / 3.7 / 5.2 / 7.0 | 3.3 / 4.8 / 6.7 / 9.0 / 11.6 | 14338 | 1.1 / 1.8 / 3.3 / 4.7 / 5.9 | 3.2 / 4.4 / 6.1 / 8.3 / 10.6 |
| 5-10 | 3836 | 0.9 / 1.4 / 2.5 / 3.8 / 5.1 | 2.8 / 4.1 / 6.0 / 8.6 / 11.5 | 8980 | 0.9 / 1.3 / 2.2 / 3.5 / 4.7 | 2.8 / 4.3 / 6.4 / 8.8 / 11.4 |
| 10-15 | 1578 | 0.7 / 1.3 / 2.0 / 3.0 / 3.9 | 2.9 / 4.2 / 6.5 / 9.2 / 11.8 | 2199 | 0.9 / 1.3 / 2.0 / 2.9 / 3.8 | 3.5 / 5.3 / 7.6 / 9.9 / 13.0 |
| 15-20 | 560 | 1.0 / 1.4 / 2.1 / 3.2 / 4.7 | 3.9 / 5.8 / 8.2 / 11.6 / 15.0 | 108 | 1.1 / 1.3 / 1.7 / 2.4 / 3.7 | 5.1 / 7.0 / 9.6 / 11.9 / 15.7 |
| 20+ | 180 | 0.8 / 1.2 / 1.8 / 3.4 / 5.2 | 4.6 / 5.9 / 10.0 / 14.9 / 17.9 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.28 | 0.35 | 0.37 | 0.53 | 0.18 | 0.29 | 0.42 | 0.19 | 0.39 |
| fixed | 0.23 | 0.33 | 0.44 | 0.51 | 0.19 | 0.30 | 0.62 | 0.12 | 0.26 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9666) | 0.48 | 0.32 | 0.20 |
| all, fixed (n 30997) | 0.55 | 0.30 | 0.15 |
| wide open, release (n 906) | 0.66 | 0.06 | 0.28 |
| wide open, fixed (n 2563) | 0.71 | 0.07 | 0.22 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 2073 | 0.059 | 0.017 | 0.004 | 0.000 | 0.0045 |
| all | any fixed time | 2182 | 0.059 | 0.008 | 0.001 | 0.000 | 0.0009 |
| man | release | 504 | 0.010 | 0.000 | 0.000 | 0.000 | 0.0000 |
| man | any fixed time | 552 | 0.005 | 0.000 | 0.000 | 0.000 | 0.0000 |
| zone | release | 1569 | 0.075 | 0.023 | 0.006 | 0.000 | 0.0060 |
| zone | any fixed time | 1630 | 0.077 | 0.011 | 0.001 | 0.000 | 0.0011 |
| behind the line (separately), any moment | all | 1668 | 0.185 | 0.090 | 0.037 | 0.001 | 0.0321 |
| back within 3 yd of the line (separately), any moment | all | 879 | 0.056 | 0.022 | 0.016 | 0.005 | 0.0120 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 710 of 2073 thrown dropbacks (0.342); receiver-moments 0.094
- at any fixed time while the ball was held: 1153 of 2182 dropbacks (0.528); receiver-moments 0.083
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 545 of 2182 dropbacks (0.250)
- d1 tail at release: p90 6.1, p95 7.7, p99 11.5; share of receiver-moments with d1 over 5 yd 0.174, over 7 yd 0.066, over 9 yd 0.030
- d1 tail at fixed: p90 5.5, p95 6.5, p99 8.7; share of receiver-moments with d1 over 5 yd 0.147, over 7 yd 0.033, over 9 yd 0.008
- the targeted receiver at release (n 2026): d1 1.5 / 2.4 / 3.8 / 5.5 / 7.8, wide open 0.167; untargeted route runners at release d1 0.9 / 1.4 / 2.4 / 3.9 / 5.6

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 756 | 3337 | 3.0 / 6.4 | 0.107 | 0.384 | 10344 | 3.1 / 5.9 | 0.112 | 0.645 |
| Cover-1 | 457 | 1968 | 1.8 / 4.5 | 0.021 | 0.101 | 6551 | 1.9 / 4.6 | 0.024 | 0.255 |
| Quarters | 396 | 1757 | 3.1 / 6.6 | 0.127 | 0.473 | 5406 | 3.3 / 6.0 | 0.121 | 0.718 |
| Cover-2 | 265 | 1179 | 3.0 / 7.3 | 0.137 | 0.460 | 3980 | 2.4 / 5.4 | 0.079 | 0.531 |
| Cover-6 | 206 | 895 | 3.0 / 6.5 | 0.122 | 0.466 | 2994 | 3.0 / 5.5 | 0.082 | 0.585 |
| Cover-0 | 110 | 392 | 1.5 / 4.1 | 0.031 | 0.116 | 1283 | 1.4 / 4.1 | 0.017 | 0.138 |
| 2-Man | 30 | 138 | 2.1 / 4.6 | 0.007 | 0.034 | 439 | 2.2 / 4.7 | 0.025 | 0.333 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1661 | 7342 | 3.0 / 6.5 | 0.117 | 0.423 | 23296 | 3.0 / 5.8 | 0.103 | 0.632 |
| Man | 559 | 2324 | 1.7 / 4.4 | 0.021 | 0.093 | 7701 | 1.8 / 4.5 | 0.021 | 0.223 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 917 | 4028 | 2.7 / 6.2 | 0.099 | 0.352 | 12826 | 2.7 / 5.6 | 0.084 | 0.533 |
| 2x2 | 860 | 3646 | 2.7 / 6.4 | 0.095 | 0.350 | 11483 | 2.7 / 5.7 | 0.087 | 0.541 |
| 3x2 | 355 | 1612 | 2.6 / 5.4 | 0.081 | 0.320 | 5317 | 2.8 / 5.4 | 0.077 | 0.506 |
| 2x1 | 73 | 320 | 2.7 / 5.8 | 0.072 | 0.217 | 1136 | 2.4 / 4.9 | 0.054 | 0.417 |
| 4x1 | 15 | 60 | 2.0 / 5.3 | 0.117 | 0.500 | 235 | 2.4 / 5.3 | 0.094 | 0.600 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1850 | 7994 | 2.7 / 6.3 | 0.096 | 0.346 | 25445 | 2.7 / 5.6 | 0.084 | 0.532 |
| True | 370 | 1672 | 2.6 / 5.4 | 0.083 | 0.326 | 5552 | 2.8 / 5.4 | 0.078 | 0.509 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1261 | 5375 | 2.8 / 6.3 | 0.099 | 0.356 | 17010 | 2.7 / 5.6 | 0.086 | 0.548 |
| True | 959 | 4291 | 2.6 / 5.9 | 0.087 | 0.325 | 13987 | 2.7 / 5.4 | 0.079 | 0.503 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1972 | 8549 | 2.7 / 6.2 | 0.095 | 0.345 | 27305 | 2.7 / 5.6 | 0.083 | 0.530 |
| True | 248 | 1117 | 2.6 / 5.5 | 0.081 | 0.323 | 3692 | 2.8 / 5.4 | 0.079 | 0.518 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1675 | 7329 | 2.8 / 6.4 | 0.105 | 0.378 | 23250 | 2.8 / 5.7 | 0.092 | 0.574 |
| True | 545 | 2337 | 2.3 / 5.3 | 0.059 | 0.232 | 7747 | 2.4 / 5.0 | 0.053 | 0.393 |

## Ours: sfb-all24.jsonl.gz

2191 dropbacks, 40559 receiver-moments (release 9618, fixed 30941).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1234 | 1.0 / 1.8 / 3.9 / 7.0 / 9.6 | 2.4 / 3.9 / 6.8 / 10.0 / 12.4 | 5293 | 0.9 / 1.5 / 2.6 / 4.1 / 6.4 | 2.1 / 3.0 / 4.4 / 6.5 / 8.8 |
| 0-5 | 2196 | 1.2 / 2.2 / 3.7 / 5.3 / 7.0 | 3.0 / 4.6 / 6.6 / 9.0 / 11.7 | 14360 | 1.1 / 1.8 / 3.3 / 4.7 / 6.0 | 3.2 / 4.4 / 6.1 / 8.2 / 10.5 |
| 5-10 | 3807 | 0.9 / 1.4 / 2.5 / 3.8 / 5.0 | 2.9 / 4.2 / 6.1 / 8.5 / 11.2 | 8938 | 0.9 / 1.3 / 2.3 / 3.6 / 4.7 | 2.9 / 4.3 / 6.4 / 8.8 / 11.3 |
| 10-15 | 1566 | 0.8 / 1.3 / 2.0 / 3.0 / 4.0 | 3.0 / 4.4 / 6.6 / 9.1 / 11.7 | 2254 | 0.8 / 1.3 / 1.9 / 2.8 / 3.7 | 3.4 / 5.3 / 7.6 / 10.1 / 13.1 |
| 15-20 | 622 | 0.9 / 1.4 / 2.1 / 3.2 / 4.6 | 3.7 / 5.3 / 7.7 / 11.3 / 14.8 | 96 | 1.1 / 1.2 / 1.5 / 1.9 / 2.7 | 4.8 / 6.7 / 9.0 / 11.0 / 13.5 |
| 20+ | 193 | 0.7 / 1.0 / 1.8 / 3.5 / 5.1 | 5.0 / 7.3 / 11.1 / 14.6 / 18.6 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.28 | 0.35 | 0.38 | 0.51 | 0.19 | 0.30 | 0.42 | 0.19 | 0.39 |
| fixed | 0.24 | 0.32 | 0.44 | 0.51 | 0.19 | 0.30 | 0.62 | 0.12 | 0.26 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9618) | 0.48 | 0.32 | 0.21 |
| all, fixed (n 30941) | 0.55 | 0.29 | 0.16 |
| wide open, release (n 865) | 0.68 | 0.06 | 0.27 |
| wide open, fixed (n 2547) | 0.71 | 0.08 | 0.21 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 2058 | 0.068 | 0.015 | 0.005 | 0.000 | 0.0038 |
| all | any fixed time | 2157 | 0.067 | 0.008 | 0.000 | 0.000 | 0.0008 |
| man | release | 488 | 0.020 | 0.000 | 0.000 | 0.000 | 0.0000 |
| man | any fixed time | 521 | 0.021 | 0.004 | 0.000 | 0.000 | 0.0003 |
| zone | release | 1570 | 0.083 | 0.019 | 0.007 | 0.000 | 0.0049 |
| zone | any fixed time | 1636 | 0.082 | 0.010 | 0.001 | 0.000 | 0.0010 |
| behind the line (separately), any moment | all | 1637 | 0.172 | 0.089 | 0.035 | 0.002 | 0.0309 |
| back within 3 yd of the line (separately), any moment | all | 823 | 0.053 | 0.027 | 0.016 | 0.006 | 0.0154 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 681 of 2058 thrown dropbacks (0.331); receiver-moments 0.090
- at any fixed time while the ball was held: 1124 of 2157 dropbacks (0.521); receiver-moments 0.082
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 574 of 2157 dropbacks (0.266)
- d1 tail at release: p90 6.1, p95 7.6, p99 11.3; share of receiver-moments with d1 over 5 yd 0.176, over 7 yd 0.064, over 9 yd 0.027
- d1 tail at fixed: p90 5.5, p95 6.5, p99 8.6; share of receiver-moments with d1 over 5 yd 0.148, over 7 yd 0.033, over 9 yd 0.008
- the targeted receiver at release (n 2017): d1 1.5 / 2.4 / 3.7 / 5.4 / 7.7, wide open 0.165; untargeted route runners at release d1 0.8 / 1.3 / 2.4 / 3.9 / 5.6

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 726 | 3209 | 2.9 / 6.2 | 0.101 | 0.376 | 10275 | 3.1 / 5.9 | 0.112 | 0.645 |
| Cover-1 | 430 | 1860 | 1.8 / 4.9 | 0.027 | 0.125 | 6251 | 2.0 / 4.6 | 0.027 | 0.269 |
| Quarters | 385 | 1702 | 3.1 / 6.4 | 0.118 | 0.422 | 5163 | 3.4 / 6.0 | 0.113 | 0.671 |
| Cover-2 | 281 | 1250 | 3.0 / 7.0 | 0.129 | 0.455 | 4150 | 2.5 / 5.4 | 0.077 | 0.511 |
| Cover-6 | 223 | 1024 | 2.9 / 6.7 | 0.117 | 0.412 | 3277 | 2.8 / 5.7 | 0.087 | 0.577 |
| Cover-0 | 110 | 408 | 1.4 / 4.5 | 0.025 | 0.101 | 1271 | 1.4 / 4.0 | 0.021 | 0.167 |
| 2-Man | 36 | 165 | 1.8 / 4.2 | 0.006 | 0.029 | 554 | 2.1 / 4.6 | 0.014 | 0.222 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1658 | 7371 | 3.0 / 6.4 | 0.111 | 0.403 | 23530 | 3.0 / 5.8 | 0.101 | 0.611 |
| Man | 533 | 2247 | 1.7 / 4.6 | 0.022 | 0.100 | 7411 | 1.8 / 4.5 | 0.024 | 0.238 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 903 | 3869 | 2.7 / 6.3 | 0.096 | 0.344 | 12740 | 2.8 / 5.6 | 0.082 | 0.513 |
| 2x2 | 847 | 3666 | 2.7 / 6.2 | 0.088 | 0.317 | 11563 | 2.6 / 5.6 | 0.087 | 0.555 |
| 3x2 | 336 | 1605 | 2.7 / 5.6 | 0.092 | 0.376 | 5067 | 2.9 / 5.4 | 0.079 | 0.507 |
| 2x1 | 81 | 358 | 2.5 / 5.7 | 0.034 | 0.141 | 1211 | 2.4 / 4.8 | 0.040 | 0.300 |
| 4x1 | 24 | 120 | 2.8 / 5.6 | 0.092 | 0.375 | 360 | 3.1 / 5.7 | 0.106 | 0.583 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1831 | 7893 | 2.7 / 6.2 | 0.090 | 0.322 | 25514 | 2.7 / 5.6 | 0.083 | 0.523 |
| True | 360 | 1725 | 2.7 / 5.6 | 0.092 | 0.376 | 5427 | 2.9 / 5.4 | 0.081 | 0.513 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1238 | 5317 | 2.7 / 6.3 | 0.091 | 0.327 | 16947 | 2.8 / 5.6 | 0.086 | 0.541 |
| True | 953 | 4301 | 2.6 / 5.9 | 0.088 | 0.336 | 13994 | 2.7 / 5.4 | 0.078 | 0.496 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1936 | 8393 | 2.7 / 6.2 | 0.090 | 0.327 | 27194 | 2.7 / 5.5 | 0.082 | 0.523 |
| True | 255 | 1225 | 2.7 / 5.6 | 0.087 | 0.358 | 3747 | 2.9 / 5.4 | 0.083 | 0.504 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1633 | 7217 | 2.8 / 6.4 | 0.099 | 0.361 | 22824 | 2.9 / 5.7 | 0.091 | 0.563 |
| True | 558 | 2401 | 2.4 / 5.3 | 0.062 | 0.241 | 8117 | 2.4 / 5.1 | 0.059 | 0.400 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| defall-all24.jsonl.gz | 310 | 0.494 | 239 | 0.255 | 220 | 0.355 | 147 | 0.177 |
| pkg-all24.jsonl.gz | 292 | 0.079 | 241 | 0.029 | 213 | 0.089 | 162 | 0.037 |
| sfb-all24.jsonl.gz | 334 | 0.057 | 263 | 0.011 | 240 | 0.075 | 179 | 0.039 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (defall-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.2 | fix | 0-5 | Cover-2 | 6565 | 1920 | 0.104 | 0.035 |
| +10.6 | fix | 10-15 | Cover-2 | 1801 | 310 | 0.177 | 0.494 |
| -9.9 | fix | 10-15 | Cover-3 | 3757 | 846 | 0.104 | 0.028 |
| -8.1 | fix | 0-5 | Cover-0 | 1540 | 742 | 0.094 | 0.020 |
| -7.9 | fix | 5-10 | Cover-1 | 5803 | 1776 | 0.040 | 0.012 |
| -7.2 | fix | 5-10 | Cover-0 | 602 | 364 | 0.118 | 0.014 |
| -6.8 | rel | 10-15 | Cover-3 | 2116 | 577 | 0.118 | 0.043 |
| -6.6 | fix | 5-10 | Cover-3 | 8952 | 3116 | 0.139 | 0.097 |

### By man / zone (defall-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.6 | fix | 5-10 | Man | 6943 | 2133 | 0.045 | 0.010 |
| -7.5 | fix | 0-5 | Man | 13192 | 3842 | 0.044 | 0.022 |
| -5.3 | fix | 0-5 | Zone | 29528 | 10752 | 0.128 | 0.109 |
| +5.1 | rel | behind LOS | Zone | 4823 | 957 | 0.121 | 0.189 |
| -4.9 | fix | 5-10 | Zone | 20078 | 6796 | 0.120 | 0.099 |
| -4.4 | fix | 10-15 | Man | 2025 | 485 | 0.018 | 0.002 |
| -4.0 | rel | 5-10 | Man | 2955 | 950 | 0.034 | 0.014 |
| -2.6 | rel | 5-10 | Zone | 6924 | 2870 | 0.132 | 0.113 |

### By formation (defall-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -15.6 | fix | behind LOS | 3x2 | 1528 | 250 | 0.165 | 0.004 |
| -7.2 | fix | 5-10 | 3x1 | 11585 | 3630 | 0.103 | 0.066 |
| -4.5 | fix | 0-5 | 3x2 | 6617 | 2421 | 0.133 | 0.100 |
| +4.4 | rel | behind LOS | 2x2 | 2807 | 565 | 0.086 | 0.156 |
| -3.9 | fix | 0-5 | 3x1 | 17410 | 6086 | 0.100 | 0.084 |
| +3.6 | rel | behind LOS | 3x1 | 2798 | 542 | 0.100 | 0.161 |
| -3.1 | rel | 5-10 | 3x1 | 3914 | 1655 | 0.096 | 0.071 |
| -3.0 | fix | behind LOS | 2x1 | 2002 | 452 | 0.081 | 0.046 |

### By play action (defall-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -13.9 | fix | behind LOS | True | 10037 | 1830 | 0.066 | 0.014 |
| +5.6 | rel | behind LOS | False | 4265 | 886 | 0.114 | 0.194 |
| -5.5 | fix | 5-10 | False | 22031 | 6467 | 0.100 | 0.079 |
| -4.2 | fix | 0-5 | False | 36025 | 10579 | 0.108 | 0.094 |
| -4.1 | rel | 0-5 | True | 2432 | 640 | 0.097 | 0.053 |
| +3.7 | fix | behind LOS | False | 14828 | 3608 | 0.123 | 0.147 |
| -3.6 | fix | 5-10 | True | 6504 | 2462 | 0.099 | 0.076 |
| +3.5 | rel | 0-5 | False | 9691 | 1704 | 0.101 | 0.131 |

### By coverage family (pkg-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -8.9 | fix | 10-15 | Cover-3 | 3757 | 777 | 0.104 | 0.032 |
| -8.2 | fix | 0-5 | Cover-0 | 1540 | 647 | 0.094 | 0.019 |
| -8.0 | fix | 5-10 | Cover-1 | 5803 | 1878 | 0.040 | 0.012 |
| -7.8 | fix | 5-10 | Cover-0 | 602 | 363 | 0.118 | 0.008 |
| -7.8 | fix | 5-10 | Cover-3 | 8952 | 2916 | 0.139 | 0.089 |
| +7.3 | rel | behind LOS | Quarters | 932 | 211 | 0.094 | 0.341 |
| -7.1 | fix | 5-10 | Cover-2 | 4457 | 1230 | 0.101 | 0.047 |
| -6.7 | fix | 0-5 | Cover-1 | 10740 | 3156 | 0.039 | 0.019 |

### By man / zone (pkg-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -13.2 | fix | 10-15 | Zone | 8358 | 1763 | 0.119 | 0.041 |
| -10.8 | fix | 5-10 | Man | 6943 | 2191 | 0.045 | 0.010 |
| -10.4 | rel | 10-15 | Zone | 4910 | 1240 | 0.129 | 0.048 |
| -10.0 | fix | 0-5 | Man | 13192 | 3741 | 0.044 | 0.017 |
| -9.2 | fix | 5-10 | Zone | 20078 | 6789 | 0.120 | 0.083 |
| +6.8 | rel | behind LOS | Zone | 4823 | 987 | 0.121 | 0.215 |
| -6.1 | rel | 15-20 | Zone | 2016 | 459 | 0.124 | 0.048 |
| -4.4 | rel | 10-15 | Man | 1494 | 338 | 0.013 | 0.000 |

### By formation (pkg-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.3 | fix | behind LOS | 3x2 | 1528 | 259 | 0.165 | 0.015 |
| -9.7 | fix | 5-10 | 3x1 | 11585 | 3667 | 0.103 | 0.056 |
| -8.7 | fix | 10-15 | 3x1 | 4486 | 826 | 0.106 | 0.036 |
| -8.6 | fix | 10-15 | 2x2 | 4298 | 813 | 0.096 | 0.031 |
| -7.1 | rel | 10-15 | 3x1 | 2798 | 648 | 0.114 | 0.043 |
| -5.8 | rel | 10-15 | 2x2 | 2710 | 559 | 0.092 | 0.036 |
| +5.4 | rel | behind LOS | 2x2 | 2807 | 594 | 0.086 | 0.173 |
| -5.2 | fix | 5-10 | 3x2 | 3779 | 1882 | 0.110 | 0.070 |

### By play action (pkg-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -13.4 | fix | behind LOS | True | 10037 | 1615 | 0.066 | 0.014 |
| -10.5 | fix | 10-15 | False | 7793 | 1631 | 0.089 | 0.032 |
| -9.4 | fix | 5-10 | False | 22031 | 6871 | 0.100 | 0.066 |
| -9.3 | rel | 10-15 | False | 5129 | 1146 | 0.094 | 0.032 |
| -9.0 | fix | 10-15 | True | 3017 | 568 | 0.130 | 0.039 |
| +7.5 | rel | behind LOS | False | 4265 | 932 | 0.114 | 0.223 |
| -5.8 | fix | 5-10 | True | 6504 | 2109 | 0.099 | 0.062 |
| +4.9 | fix | behind LOS | False | 14828 | 3757 | 0.123 | 0.155 |

### By coverage family (sfb-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.2 | fix | 10-15 | Cover-3 | 3757 | 791 | 0.104 | 0.027 |
| -8.3 | fix | 10-15 | Quarters | 1560 | 374 | 0.106 | 0.019 |
| -8.1 | fix | 0-5 | Cover-0 | 1540 | 675 | 0.094 | 0.019 |
| -8.0 | fix | 10-15 | Cover-6 | 1240 | 263 | 0.096 | 0.011 |
| -7.7 | fix | 10-15 | Cover-2 | 1801 | 334 | 0.177 | 0.057 |
| -7.0 | rel | 10-15 | Cover-3 | 2116 | 539 | 0.118 | 0.041 |
| -6.8 | fix | 5-10 | Cover-3 | 8952 | 2954 | 0.139 | 0.094 |
| -6.7 | fix | 15-20 | Cover-3 | 594 | 43 | 0.071 | 0.000 |

### By man / zone (sfb-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -17.3 | fix | 10-15 | Zone | 8358 | 1802 | 0.119 | 0.028 |
| -12.8 | fix | 15-20 | Zone | 1315 | 86 | 0.110 | 0.000 |
| -10.8 | rel | 10-15 | Zone | 4910 | 1253 | 0.129 | 0.046 |
| -9.3 | fix | 5-10 | Man | 6943 | 2061 | 0.045 | 0.013 |
| -9.1 | fix | 0-5 | Man | 13192 | 3598 | 0.044 | 0.018 |
| -9.1 | fix | 5-10 | Zone | 20078 | 6877 | 0.120 | 0.083 |
| -7.1 | rel | 15-20 | Zone | 2016 | 502 | 0.124 | 0.042 |
| +4.9 | rel | behind LOS | Zone | 4823 | 938 | 0.121 | 0.188 |

### By formation (sfb-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -15.6 | fix | behind LOS | 3x2 | 1528 | 248 | 0.165 | 0.004 |
| -11.1 | fix | 10-15 | 3x1 | 4486 | 864 | 0.106 | 0.027 |
| -10.8 | fix | 10-15 | 2x2 | 4298 | 876 | 0.096 | 0.023 |
| -9.9 | fix | 5-10 | 3x1 | 11585 | 3616 | 0.103 | 0.056 |
| -7.5 | fix | 10-15 | 3x2 | 1285 | 425 | 0.093 | 0.016 |
| -6.6 | rel | 10-15 | 3x1 | 2798 | 594 | 0.114 | 0.045 |
| -6.0 | rel | 15-20 | 2x2 | 1056 | 248 | 0.097 | 0.020 |
| -6.0 | fix | behind LOS | 2x1 | 2002 | 448 | 0.081 | 0.025 |

### By play action (sfb-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -16.0 | fix | behind LOS | True | 10037 | 1605 | 0.066 | 0.010 |
| -14.0 | fix | 10-15 | False | 7793 | 1639 | 0.089 | 0.021 |
| -11.3 | fix | 10-15 | True | 3017 | 615 | 0.130 | 0.028 |
| -10.2 | fix | 5-10 | False | 22031 | 6702 | 0.100 | 0.064 |
| -10.2 | rel | 10-15 | False | 5129 | 1122 | 0.094 | 0.029 |
| -9.4 | fix | 15-20 | False | 1054 | 75 | 0.078 | 0.000 |
| -7.8 | rel | behind LOS | True | 2383 | 335 | 0.074 | 0.012 |
| -6.3 | rel | 15-20 | True | 876 | 131 | 0.111 | 0.015 |

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

- 101-3-19 cover4_poach rel frame 24 QB (-5.8, 23.5): RB d1 2.7 d2 4.4 front/inside/opening; Y d1 8.7 d2 11.9 level/inside/opening; X d1 0.5 d2 4.3 level/head-up/steady; Z d1 2.9 d2 8.3 behind/outside/closing; H d1 1.1 d2 7.9 level/inside/closing
- 505-0-24 cover4 rel frame 40 QB (-8.1, 29.8): Y d1 3.8 d2 6.5 front/inside/opening; X d1 0.7 d2 5.9 level/head-up/closing; Z d1 1.2 d2 8.2 level/inside/closing; H d1 1.9 d2 4.8 level/outside/closing
- 202-3-10 cover4_box rel frame 29 QB (-7.3, 23.3): RB d1 6.9 d2 8.1 front/inside/opening; Y d1 2.9 d2 3.9 behind/head-up/steady; X d1 2.0 d2 5.3 behind/outside/opening; Z d1 3.1 d2 3.3 behind/outside/opening; H d1 2.0 d2 3.6 behind/head-up/opening
- 404-0-56 cover4 rel frame 28 QB (-7.8, 29.7): RB d1 3.8 d2 5.3 front/inside/opening; Y d1 3.6 d2 9.7 behind/inside/closing; X d1 1.1 d2 4.8 level/inside/closing; Z d1 2.9 d2 10.2 behind/outside/closing; H d1 3.9 d2 4.0 front/head-up/opening
- 202-1-43 cover8_trix rel frame 28 QB (-8.4, 26.1): RB d1 4.7 d2 9.3 behind/head-up/closing; Y d1 1.8 d2 3.9 behind/head-up/closing; X d1 4.1 d2 4.6 behind/outside/steady; Z d1 4.1 d2 4.6 front/inside/steady; H d1 1.8 d2 5.1 level/inside/opening
- 202-1-31 cover1_off rel frame 43 QB (-8.1, 29.7): RB d1 5.2 d2 7.5 front/inside/opening; Y d1 2.2 d2 6.4 level/inside/opening; X d1 2.9 d2 18.4 front/head-up/closing; Z d1 1.9 d2 9.2 level/outside/closing; H d1 0.5 d2 12.0 level/head-up/steady
- 404-3-91 cover3_match rel frame 31 QB (-7.9, 29.8): Y d1 2.4 d2 2.6 front/inside/opening; X d1 1.0 d2 12.0 level/outside/steady; Z d1 2.4 d2 12.4 behind/outside/closing; H d1 2.7 d2 6.4 level/inside/closing
- 505-0-83 cover1 rel frame 22 QB (-7.9, 23.6): RB d1 5.3 d2 7.5 front/inside/opening; Y d1 4.0 d2 4.3 behind/inside/closing; X d1 0.8 d2 3.6 level/outside/closing; Z d1 1.3 d2 13.0 front/inside/steady; H d1 1.3 d2 5.6 level/inside/opening
- 404-0-21 cover2_match rel frame 30 QB (-7.9, 23.6): RB d1 5.1 d2 8.0 front/inside/opening; Y d1 2.4 d2 6.6 behind/inside/closing; X d1 3.2 d2 5.5 front/outside/opening; Z d1 6.8 d2 8.7 front/inside/opening; H d1 4.0 d2 4.7 behind/inside/opening
- 202-2-77 cover3 rel frame 16 QB (-5.8, 23.5): X d1 6.5 d2 9.9 behind/inside/closing; Z d1 6.5 d2 9.0 front/inside/steady; H d1 2.1 d2 6.5 front/inside/closing
- 303-3-92 cover2 rel frame 24 QB (-7.1, 29.7): RB d1 7.6 d2 7.6 behind/outside/closing; Y d1 5.2 d2 7.1 behind/head-up/closing; X d1 4.3 d2 7.8 behind/outside/steady; Z d1 1.1 d2 15.2 level/outside/closing; H d1 4.9 d2 9.3 level/inside/closing
- 101-3-24 cover3 rel frame 30 QB (-6.3, 29.8): RB d1 8.7 d2 9.7 front/inside/opening; Y d1 3.9 d2 4.7 front/inside/opening; X d1 2.9 d2 3.3 front/inside/steady; Z d1 3.7 d2 6.5 front/inside/opening; H d1 2.6 d2 3.7 level/outside/opening

Second implementation: 56 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
