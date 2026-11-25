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

## Ours: wa-all24.jsonl.gz

2316 dropbacks, 42797 receiver-moments (release 9973, fixed 32824).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1292 | 1.0 / 1.9 / 4.1 / 7.2 / 9.9 | 2.4 / 4.1 / 7.1 / 10.2 / 12.4 | 5678 | 1.0 / 1.5 / 2.6 / 4.2 / 6.6 | 2.1 / 3.0 / 4.5 / 6.5 / 8.6 |
| 0-5 | 2386 | 1.1 / 2.1 / 3.6 / 5.1 / 6.9 | 3.2 / 4.7 / 6.6 / 9.0 / 11.7 | 15242 | 1.1 / 1.9 / 3.2 / 4.6 / 5.9 | 3.2 / 4.4 / 6.0 / 8.3 / 10.7 |
| 5-10 | 3892 | 0.9 / 1.5 / 2.6 / 3.9 / 5.2 | 2.9 / 4.2 / 6.0 / 8.6 / 11.4 | 9404 | 0.9 / 1.4 / 2.5 / 3.8 / 4.9 | 2.9 / 4.2 / 6.1 / 8.7 / 11.4 |
| 10-15 | 1625 | 0.8 / 1.3 / 2.2 / 3.4 / 5.1 | 3.0 / 4.4 / 6.6 / 8.9 / 11.8 | 2381 | 0.9 / 1.3 / 2.1 / 3.4 / 5.7 | 3.5 / 5.4 / 7.5 / 9.9 / 13.0 |
| 15-20 | 591 | 1.0 / 1.4 / 2.1 / 3.9 / 6.4 | 4.1 / 5.9 / 8.2 / 11.1 / 14.7 | 119 | 1.1 / 1.3 / 1.7 / 2.3 / 7.1 | 4.6 / 7.5 / 9.5 / 11.5 / 14.8 |
| 20+ | 187 | 0.8 / 1.2 / 2.1 / 4.2 / 6.4 | 5.2 / 6.9 / 11.7 / 14.9 / 17.8 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.30 | 0.33 | 0.37 | 0.55 | 0.17 | 0.28 | 0.44 | 0.18 | 0.38 |
| fixed | 0.27 | 0.31 | 0.42 | 0.55 | 0.17 | 0.28 | 0.61 | 0.12 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 9973) | 0.48 | 0.31 | 0.21 |
| all, fixed (n 32824) | 0.53 | 0.30 | 0.18 |
| wide open, release (n 1112) | 0.61 | 0.08 | 0.31 |
| wide open, fixed (n 3079) | 0.67 | 0.08 | 0.26 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 2137 | 0.080 | 0.018 | 0.006 | 0.000 | 0.0046 |
| all | any fixed time | 2283 | 0.071 | 0.009 | 0.001 | 0.000 | 0.0008 |
| man | release | 498 | 0.016 | 0.004 | 0.000 | 0.000 | 0.0011 |
| man | any fixed time | 553 | 0.009 | 0.004 | 0.000 | 0.000 | 0.0003 |
| zone | release | 1639 | 0.099 | 0.022 | 0.008 | 0.001 | 0.0057 |
| zone | any fixed time | 1730 | 0.091 | 0.010 | 0.002 | 0.000 | 0.0010 |
| behind the line (separately), any moment | all | 1735 | 0.192 | 0.082 | 0.020 | 0.002 | 0.0277 |
| back within 3 yd of the line (separately), any moment | all | 846 | 0.047 | 0.017 | 0.009 | 0.002 | 0.0092 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 823 of 2137 thrown dropbacks (0.385); receiver-moments 0.112
- at any fixed time while the ball was held: 1306 of 2283 dropbacks (0.572); receiver-moments 0.094
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 655 of 2283 dropbacks (0.287)
- d1 tail at release: p90 6.4, p95 7.9, p99 11.0; share of receiver-moments with d1 over 5 yd 0.196, over 7 yd 0.074, over 9 yd 0.029
- d1 tail at fixed: p90 5.7, p95 6.6, p99 8.6; share of receiver-moments with d1 over 5 yd 0.157, over 7 yd 0.036, over 9 yd 0.007
- the targeted receiver at release (n 2119): d1 1.5 / 2.5 / 3.9 / 5.4 / 7.5, wide open 0.174; untargeted route runners at release d1 0.9 / 1.4 / 2.5 / 4.1 / 6.0

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 751 | 3292 | 3.0 / 6.3 | 0.108 | 0.394 | 10551 | 3.1 / 5.9 | 0.115 | 0.677 |
| Cover-1 | 447 | 1897 | 1.9 / 5.0 | 0.027 | 0.116 | 6483 | 1.9 / 4.7 | 0.029 | 0.295 |
| Quarters | 383 | 1691 | 3.2 / 6.9 | 0.138 | 0.503 | 5137 | 3.4 / 6.0 | 0.113 | 0.686 |
| Cover-2 | 327 | 1430 | 3.5 / 7.5 | 0.200 | 0.602 | 5005 | 2.9 / 6.0 | 0.126 | 0.663 |
| Cover-6 | 270 | 1160 | 3.1 / 6.9 | 0.151 | 0.512 | 3956 | 3.0 / 5.8 | 0.113 | 0.693 |
| Cover-0 | 100 | 328 | 1.4 / 4.4 | 0.024 | 0.098 | 1172 | 1.3 / 4.0 | 0.010 | 0.102 |
| 2-Man | 38 | 175 | 1.8 / 4.6 | 0.006 | 0.028 | 520 | 1.9 / 4.6 | 0.021 | 0.237 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1758 | 7684 | 3.2 / 6.7 | 0.138 | 0.472 | 25077 | 3.1 / 5.9 | 0.115 | 0.675 |
| Man | 558 | 2289 | 1.8 / 4.8 | 0.023 | 0.098 | 7747 | 1.8 / 4.6 | 0.025 | 0.250 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 977 | 4139 | 2.8 / 6.5 | 0.116 | 0.375 | 13996 | 2.8 / 5.7 | 0.096 | 0.572 |
| 2x2 | 937 | 3998 | 2.9 / 6.5 | 0.113 | 0.395 | 12743 | 2.8 / 5.7 | 0.096 | 0.591 |
| 3x2 | 317 | 1478 | 2.7 / 5.7 | 0.099 | 0.389 | 4747 | 2.9 / 5.5 | 0.091 | 0.543 |
| 2x1 | 66 | 263 | 2.8 / 6.4 | 0.095 | 0.351 | 1058 | 2.5 / 5.1 | 0.053 | 0.455 |
| 4x1 | 19 | 95 | 2.7 / 5.6 | 0.105 | 0.421 | 280 | 3.0 / 5.4 | 0.089 | 0.579 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1980 | 8400 | 2.9 / 6.5 | 0.114 | 0.384 | 27797 | 2.8 / 5.7 | 0.094 | 0.577 |
| True | 336 | 1573 | 2.7 / 5.7 | 0.100 | 0.391 | 5027 | 2.9 / 5.5 | 0.091 | 0.545 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1302 | 5493 | 2.9 / 6.5 | 0.118 | 0.390 | 17947 | 2.8 / 5.7 | 0.095 | 0.585 |
| True | 1014 | 4480 | 2.8 / 6.2 | 0.104 | 0.379 | 14877 | 2.8 / 5.6 | 0.092 | 0.556 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 2078 | 8865 | 2.8 / 6.5 | 0.114 | 0.386 | 29222 | 2.8 / 5.7 | 0.094 | 0.576 |
| True | 238 | 1108 | 2.7 / 5.6 | 0.095 | 0.379 | 3602 | 2.8 / 5.5 | 0.091 | 0.538 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1751 | 7623 | 2.9 / 6.6 | 0.121 | 0.413 | 24499 | 2.9 / 5.8 | 0.103 | 0.603 |
| True | 565 | 2350 | 2.6 / 5.6 | 0.082 | 0.294 | 8325 | 2.5 / 5.2 | 0.067 | 0.478 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| wa-all24.jsonl.gz | 371 | 0.461 | 350 | 0.249 | 249 | 0.281 | 201 | 0.164 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (wa-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| +10.4 | fix | 10-15 | Cover-2 | 1801 | 371 | 0.177 | 0.461 |
| -9.6 | fix | 0-5 | Cover-0 | 1540 | 614 | 0.094 | 0.011 |
| -9.5 | fix | 10-15 | Cover-3 | 3757 | 785 | 0.104 | 0.029 |
| -8.7 | fix | 5-10 | Cover-1 | 5803 | 1783 | 0.040 | 0.010 |
| -8.2 | fix | 5-10 | Cover-0 | 602 | 357 | 0.118 | 0.006 |
| -7.9 | fix | 0-5 | Cover-2 | 6565 | 2246 | 0.104 | 0.056 |
| -6.7 | fix | 15-20 | Cover-3 | 594 | 40 | 0.071 | 0.000 |
| +6.6 | rel | behind LOS | Quarters | 932 | 221 | 0.094 | 0.308 |

### By man / zone (wa-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -11.3 | fix | 5-10 | Man | 6943 | 2138 | 0.045 | 0.009 |
| -8.1 | fix | 0-5 | Man | 13192 | 3765 | 0.044 | 0.020 |
| +7.3 | rel | behind LOS | Zone | 4823 | 999 | 0.121 | 0.223 |
| -4.8 | fix | 5-10 | Zone | 20078 | 7266 | 0.120 | 0.100 |
| -4.6 | fix | 0-5 | Zone | 29528 | 11477 | 0.128 | 0.112 |
| +4.1 | fix | 10-15 | Zone | 8358 | 1900 | 0.119 | 0.155 |
| +3.4 | fix | behind LOS | Zone | 17869 | 4335 | 0.112 | 0.131 |
| -2.8 | rel | 5-10 | Man | 2955 | 941 | 0.034 | 0.018 |

### By formation (wa-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -9.3 | fix | behind LOS | 3x2 | 1528 | 216 | 0.165 | 0.028 |
| -6.5 | fix | 5-10 | 3x1 | 11585 | 3930 | 0.103 | 0.070 |
| +5.7 | rel | behind LOS | 3x1 | 2798 | 551 | 0.100 | 0.203 |
| +5.6 | rel | behind LOS | 2x2 | 2807 | 642 | 0.086 | 0.174 |
| -5.4 | fix | 0-5 | 3x2 | 6617 | 2483 | 0.133 | 0.094 |
| -4.8 | fix | behind LOS | 2x1 | 2002 | 372 | 0.081 | 0.030 |
| +4.7 | fix | behind LOS | 2x2 | 10846 | 2523 | 0.085 | 0.117 |
| +3.9 | fix | behind LOS | 3x1 | 10098 | 2561 | 0.107 | 0.135 |

### By play action (wa-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.6 | fix | behind LOS | True | 10037 | 1685 | 0.066 | 0.021 |
| +7.3 | rel | behind LOS | False | 4265 | 967 | 0.114 | 0.217 |
| -5.5 | fix | 5-10 | False | 22031 | 7126 | 0.100 | 0.079 |
| +5.3 | fix | behind LOS | False | 14828 | 3993 | 0.123 | 0.157 |
| +4.9 | fix | 10-15 | False | 7793 | 1775 | 0.089 | 0.131 |
| -4.4 | fix | 0-5 | False | 36025 | 11512 | 0.108 | 0.094 |
| -3.0 | fix | 5-10 | True | 6504 | 2278 | 0.099 | 0.079 |
| -2.7 | rel | 0-5 | True | 2432 | 558 | 0.097 | 0.065 |

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

- 505-0-16 cover4 rel frame 26 QB (-8.0, 29.5): RB d1 4.8 d2 5.4 front/inside/opening; Y d1 4.0 d2 5.0 behind/inside/closing; X d1 4.2 d2 6.5 behind/outside/steady; Z d1 2.9 d2 9.7 behind/head-up/closing; H d1 1.3 d2 5.5 level/inside/steady
- 404-0-68 cover6_book rel frame 30 QB (-7.8, 23.7): RB d1 9.3 d2 9.5 behind/inside/opening; Y d1 1.4 d2 4.2 level/head-up/opening; X d1 5.8 d2 8.7 front/inside/closing; Z d1 1.4 d2 6.9 behind/outside/closing; H d1 2.5 d2 4.6 level/inside/steady
- 101-1-29 cover4_poach rel frame 29 QB (-8.6, 26.6): RB d1 11.4 d2 12.0 front/inside/opening; Y d1 1.2 d2 3.5 level/inside/steady; X d1 1.2 d2 11.5 level/inside/closing; Z d1 3.2 d2 4.7 behind/outside/closing; H d1 4.0 d2 7.1 behind/outside/opening
- 505-3-23 cover4 rel frame 25 QB (-7.7, 29.7): RB d1 8.0 d2 9.5 front/inside/opening; Y d1 2.9 d2 3.5 behind/inside/opening; X d1 1.1 d2 2.9 behind/outside/steady; Z d1 1.4 d2 10.8 behind/outside/steady; H d1 1.3 d2 3.2 front/head-up/opening
- 505-2-18 cover1 rel frame 36 QB (-5.2, 29.8): RB d1 4.9 d2 5.5 front/inside/closing; Y d1 0.9 d2 1.4 level/inside/closing; X d1 1.1 d2 10.6 level/head-up/opening; Z d1 1.5 d2 12.7 behind/head-up/opening; H d1 1.2 d2 6.1 front/head-up/steady
- 303-1-52 cover2_invert rel frame 38 QB (-5.9, 29.9): RB d1 5.5 d2 5.9 front/inside/opening; Y d1 0.8 d2 4.3 level/head-up/closing; X d1 5.0 d2 9.1 behind/inside/opening; Z d1 7.1 d2 12.2 front/inside/opening; H d1 1.9 d2 3.4 front/head-up/opening
- 505-0-33 cover3_trips rel frame 32 QB (-6.6, 23.5): Y d1 2.2 d2 5.8 behind/outside/closing; X d1 4.3 d2 15.0 behind/inside/opening; Z d1 3.1 d2 3.1 behind/outside/opening; H d1 4.3 d2 5.9 behind/inside/opening
- 404-2-19 cover2_match rel frame 38 QB (-8.3, 23.4): RB d1 5.7 d2 5.9 level/inside/opening; Y d1 2.3 d2 6.2 front/inside/opening; X d1 8.4 d2 9.0 behind/inside/closing; Z d1 3.1 d2 12.0 behind/outside/opening; H d1 1.0 d2 5.1 level/outside/opening
- 505-3-48 cover3_match rel frame 33 QB (-7.8, 25.9): RB d1 3.6 d2 7.9 behind/inside/closing; Y d1 3.2 d2 8.3 front/inside/opening; X d1 3.6 d2 9.7 behind/outside/opening; Z d1 1.8 d2 10.6 level/outside/opening; H d1 3.9 d2 7.7 level/inside/opening
- 404-2-54 cover3 rel frame 26 QB (-7.2, 23.5): RB d1 6.9 d2 7.4 front/inside/opening; Y d1 3.8 d2 4.4 level/outside/opening; X d1 2.5 d2 2.8 front/inside/closing; Z d1 1.5 d2 13.9 front/inside/closing; H d1 5.6 d2 5.7 front/inside/closing
- 505-3-65 cover4_palms rel frame 24 QB (-7.7, 26.4): RB d1 6.5 d2 8.1 front/inside/opening; Y d1 3.8 d2 7.0 behind/head-up/steady; X d1 5.4 d2 6.9 behind/head-up/steady; Z d1 4.6 d2 8.0 behind/outside/opening; H d1 1.7 d2 6.0 behind/head-up/closing
- 404-2-11 cover4 rel frame 24 QB (-8.6, 23.6): RB d1 4.2 d2 4.3 front/outside/opening; Y d1 2.3 d2 2.8 level/outside/closing; X d1 2.3 d2 7.8 behind/outside/closing; Z d1 6.3 d2 13.4 behind/outside/closing; H d1 4.5 d2 4.9 behind/inside/closing

Second implementation: 59 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.
