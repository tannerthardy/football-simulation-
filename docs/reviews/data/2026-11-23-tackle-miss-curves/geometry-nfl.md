source nfl; rows 16384; attempt observed 16234; overall miss probability 0.119 (1936/16234)

## A. Bearing, stratified

| traffic (defenders within 5 yd) \ bearing | ahead | level | behind |
|---|---|---|---|
| 0 | 0.255 (166/650) | 0.119 (200/1681) | 0.111 (49/442) |
| 1-2 | 0.140 (338/2406) | 0.125 (294/2353) | 0.087 (30/345) |
| 3+ | 0.104 (542/5209) | 0.104 (309/2974) | 0.046 (8/174) |

| carrier at the look-back (moving >= 2.0 yd/s) \ bearing | ahead | level | behind |
|---|---|---|---|
| moving | 0.128 (989/7736) | 0.116 (765/6585) | 0.090 (76/841) |
| stopped | 0.108 (57/529) | 0.090 (38/423) | 0.092 (11/120) |

| already in contact with another defender (0.5 s before) \ bearing | ahead | level | behind |
|---|---|---|---|
| no | 0.165 (929/5646) | 0.144 (729/5045) | 0.103 (80/777) |
| yes | 0.045 (117/2619) | 0.038 (74/1963) | 0.038 (7/184) |

| tackler order on the play \ bearing | ahead | level | behind |
|---|---|---|---|
| 0 | 0.147 (821/5583) | 0.133 (645/4861) | 0.100 (74/738) |
| 1 | 0.081 (193/2383) | 0.070 (126/1800) | 0.049 (9/183) |
| 2+ | 0.107 (32/299) | 0.092 (32/347) | 0.100 (4/40) |

## B. Open field: no other defender within 5 yd, no prior contact, no blocker within 1.5 yd of the defender, carrier moving (n 2422, miss 0.140 (338/2422))

| bearing | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| ahead | 473 | 0.254 (120/473) | 6.8 | 1.6 | 0.94 |
| level | 1551 | 0.113 (176/1551) | 7.2 | 1.0 | 0.92 |
| behind | 398 | 0.106 (42/398) | 8.4 | 0.6 | 0.94 |

| approach angle between velocities, deg (0 chase, 180 head-on) | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-45 | 1530 | 0.086 (132/1530) | 7.8 | 1.0 | 0.92 |
| 45-90 | 582 | 0.215 (125/582) | 6.9 | 1.1 | 0.95 |
| 90-135 | 188 | 0.266 (50/188) | 6.7 | 1.4 | 0.98 |
| 135-180.1 | 110 | 0.245 (27/110) | 5.6 | 1.6 | 0.89 |

| aim minus required lead, deg (- under-leads / chases, + over-leads) | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| <-180 | 1 | 0.000 (0/1) | - | -0.1 | - |
| -180--30 | 118 | 0.322 (38/118) | 7.5 | 1.3 | 0.92 |
| -30--10 | 628 | 0.116 (73/628) | 7.2 | 1.1 | 0.97 |
| -10-10 | 869 | 0.069 (60/869) | 6.3 | 0.7 | 0.82 |
| 10-30 | 201 | 0.318 (64/201) | 6.4 | 1.1 | 0.91 |
| >=30 | 66 | 0.242 (16/66) | 7.9 | 0.7 | 0.96 |

| closing speed, yd/s | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| -99-0 | 48 | 0.104 (5/48) | 6.8 | 1.1 | 0.88 |
| 0-2 | 554 | 0.065 (36/554) | 12.3 | 1.0 | 0.94 |
| 2-4 | 754 | 0.109 (82/754) | 7.3 | 0.9 | 0.93 |
| 4-6 | 608 | 0.169 (103/608) | 6.8 | 1.3 | 0.96 |
| 6-8 | 330 | 0.245 (81/330) | 7.0 | 1.3 | 0.93 |
| >=8 | 128 | 0.242 (31/128) | 6.6 | 1.4 | 0.88 |

| defender speed at the look-back, yd/s | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-2 | 47 | 0.191 (9/47) | 9.0 | 2.8 | 1.06 |
| 2-4 | 279 | 0.158 (44/279) | 7.5 | 1.5 | 0.94 |
| 4-6 | 650 | 0.171 (111/650) | 6.4 | 1.0 | 0.97 |
| 6-8 | 966 | 0.142 (137/966) | 7.4 | 0.7 | 0.91 |
| >=8 | 480 | 0.077 (37/480) | 9.5 | 1.8 | 0.92 |

| defender speed change over the last 1.0 s, yd/s (breaking down < 0) | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| -99--2 | 293 | 0.184 (54/293) | 7.5 | 1.2 | 0.97 |
| -2--0.5 | 507 | 0.136 (69/507) | 5.4 | 1.1 | 0.89 |
| -0.5-0.5 | 555 | 0.115 (64/555) | 7.5 | 1.0 | 0.94 |
| 0.5-2 | 713 | 0.132 (94/713) | 8.8 | 1.3 | 0.94 |
| >=2 | 354 | 0.161 (57/354) | 7.1 | 0.8 | 0.91 |

| carrier speed, yd/s | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 2-4 | 521 | 0.198 (103/521) | 6.0 | 0.7 | 1.03 |
| 4-6 | 768 | 0.142 (109/768) | 6.3 | 0.8 | 0.87 |
| 6-8 | 859 | 0.107 (92/859) | 9.0 | 1.2 | 0.94 |
| >=8 | 274 | 0.124 (34/274) | 10.9 | 2.5 | 0.93 |

| carrier cut over the last 0.5 s, deg | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-10 | 1220 | 0.103 (126/1220) | 8.3 | 1.1 | 0.90 |
| 10-20 | 648 | 0.145 (94/648) | 7.3 | 1.3 | 0.93 |
| 20-40 | 323 | 0.198 (64/323) | 6.6 | 1.0 | 0.97 |
| 40-60 | 74 | 0.270 (20/74) | 5.8 | 1.9 | 1.08 |
| >=60 | 9 | 0.333 (3/9) | 7.8 | 2.0 | 1.40 |

| lateral speed difference, |yd/s| | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|---|---|
| 0-1 | 338 | 0.074 (25/338) | 7.2 | 1.0 | 0.87 |
| 1-2 | 419 | 0.095 (40/419) | 7.8 | 1.1 | 0.94 |
| 2-4 | 918 | 0.139 (128/918) | 7.5 | 1.0 | 0.94 |
| 4-6 | 638 | 0.174 (111/638) | 6.8 | 1.1 | 0.93 |
| >=6 | 109 | 0.312 (34/109) | 7.3 | 1.1 | 0.93 |

| defender facing off his line of sight to the carrier, deg | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-20 | 1046 | 0.162 (169/1046) | 6.9 | 1.0 | 0.94 |
| 20-45 | 980 | 0.131 (128/980) | 7.3 | 1.2 | 0.94 |
| 45-90 | 341 | 0.097 (33/341) | 8.8 | 1.2 | 0.91 |
| 90-180.1 | 55 | 0.145 (8/55) | 7.8 | 0.9 | 0.93 |

| defender facing off his own travel, deg (shuffling / turned) | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-20 | 1233 | 0.135 (167/1233) | 7.4 | 1.0 | 0.94 |
| 20-45 | 815 | 0.140 (114/815) | 7.1 | 1.0 | 0.91 |
| 45-90 | 293 | 0.154 (45/293) | 6.4 | 1.6 | 0.95 |
| 90-180.1 | 69 | 0.116 (8/69) | 9.0 | 1.5 | 0.93 |

| carrier facing off the line to the defender, deg (0 sees him coming) | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-45 | 490 | 0.218 (107/490) | 6.3 | 1.8 | 0.93 |
| 45-90 | 647 | 0.167 (108/647) | 7.4 | 1.6 | 0.94 |
| 90-135 | 603 | 0.121 (73/603) | 7.3 | 0.9 | 0.94 |
| 135-180.1 | 682 | 0.073 (50/682) | 7.8 | 0.4 | 0.93 |

| weight ratio defender / carrier | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-0.9 | 657 | 0.114 (75/657) | 6.7 | 1.1 | 0.93 |
| 0.9-1.0 | 772 | 0.130 (100/772) | 7.5 | 1.1 | 0.96 |
| 1.0-1.1 | 523 | 0.136 (71/523) | 7.2 | 1.0 | 0.91 |
| 1.1-1.25 | 378 | 0.177 (67/378) | 7.0 | 1.0 | 0.89 |
| >=1.25 | 92 | 0.272 (25/92) | 7.4 | 1.9 | 0.97 |

| momentum ratio defender / carrier (weight x speed) | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-0.5 | 65 | 0.262 (17/65) | 9.0 | 2.8 | 0.95 |
| 0.5-0.8 | 291 | 0.158 (46/291) | 6.3 | 1.8 | 0.91 |
| 0.8-1.25 | 1344 | 0.108 (145/1344) | 7.8 | 1.2 | 0.94 |
| 1.25-2 | 619 | 0.155 (96/619) | 6.5 | 0.4 | 0.85 |
| >=2 | 103 | 0.330 (34/103) | 7.0 | 0.2 | 1.06 |

| height difference defender - carrier, in | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| -99--2 | 791 | 0.114 (90/791) | 7.2 | 1.0 | 0.94 |
| -2-0 | 506 | 0.115 (58/506) | 7.4 | 1.2 | 0.88 |
| 0-2 | 497 | 0.151 (75/497) | 7.4 | 1.2 | 0.96 |
| 2-4 | 342 | 0.152 (52/342) | 7.2 | 1.0 | 0.90 |
| >=4 | 286 | 0.220 (63/286) | 6.5 | 1.3 | 0.90 |

| sideline distance, yd | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| <0 | 2 | 0.000 (0/2) | - | 0.3 | - |
| 0-3 | 425 | 0.040 (17/425) | 7.6 | 0.6 | 0.97 |
| 3-6 | 491 | 0.118 (58/491) | 7.5 | 1.4 | 0.94 |
| 6-10 | 419 | 0.193 (81/419) | 6.7 | 1.4 | 0.89 |
| 10-15 | 381 | 0.176 (67/381) | 6.8 | 1.5 | 0.92 |
| >=15 | 704 | 0.163 (115/704) | 7.6 | 1.0 | 0.97 |

| distance at the attempt, yd | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0-0.5 | 152 | 0.079 (12/152) | 6.8 | 0.1 | 0.82 |
| 0.5-1.0 | 1942 | 0.143 (278/1942) | 7.0 | 1.3 | 0.92 |
| 1.0-1.5 | 254 | 0.173 (44/254) | 9.7 | 0.5 | 0.98 |
| 1.5-2.0 | 49 | 0.061 (3/49) | 19.6 | 0.0 | 1.03 |
| >=2.0 | 25 | 0.040 (1/25) | 16.7 | 0.2 | 1.02 |

| position group | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| CB | 1115 | 0.117 (130/1115) | 6.8 | 0.8 | 0.92 |
| DB | 1 | 0.000 (0/1) | - | 2.8 | - |
| DL | 55 | 0.345 (19/55) | 10.3 | 1.9 | 0.99 |
| LB | 671 | 0.168 (113/671) | 6.9 | 1.5 | 0.90 |
| S | 580 | 0.131 (76/580) | 7.5 | 1.3 | 0.95 |

| play type | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| catch | 2173 | 0.126 (273/2173) | 6.8 | 1.0 | 0.93 |
| run | 249 | 0.261 (65/249) | 9.5 | 1.9 | 0.95 |

| carrier yards past the line at the attempt | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| -99-0 | 225 | 0.307 (69/225) | 7.6 | 1.4 | 0.94 |
| 0-5 | 753 | 0.174 (131/753) | 6.5 | 1.0 | 0.92 |
| 5-10 | 768 | 0.103 (79/768) | 7.0 | 1.1 | 0.94 |
| 10-20 | 484 | 0.089 (43/484) | 9.1 | 0.8 | 0.92 |
| >=20 | 192 | 0.083 (16/192) | 15.2 | 1.9 | 0.97 |

## C. Crowd

| other defenders within 1.5 yd of the carrier at the attempt | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0 | 9106 | 0.170 (1545/9106) | 6.3 | 1.6 | 0.93 |
| 1 | 4809 | 0.067 (324/4809) | 5.2 | 1.5 | 0.89 |
| 2+ | 2319 | 0.029 (67/2319) | 4.8 | 1.1 | 0.82 |

| blockers within 1.5 yd of the defender at the look-back | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| 0 | 10381 | 0.128 (1329/10381) | 6.2 | 1.3 | 0.93 |
| 1 | 3841 | 0.124 (475/3841) | 5.9 | 1.8 | 0.90 |
| 2+ | 2012 | 0.066 (132/2012) | 5.7 | 1.6 | 0.80 |

| first defender to reach contact range on the play | n | miss probability | yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |
|---|---|---|---|---|---|
| yes | 8829 | 0.150 (1324/8829) | 6.1 | 1.7 | 0.90 |
| no | 7405 | 0.083 (612/7405) | 6.1 | 1.3 | 0.97 |

## D. What a miss and a made tackle look like after the attempt (open field)

| bearing | label | n | carrier deflection 0.5 s, deg p50 | carrier speed kept 0.5 s p50 | separation 0.5 s, yd p50 | carrier forward yd in 1.0 s p50 | time to the end, s p50 |
|---|---|---|---|---|---|---|---|
| ahead | missed | 120 | 9.5 | 0.94 | 2.17 | 2.9 | 2.3 |
| ahead | made | 353 | 11.9 | 0.79 | 0.85 | 1.9 | 0.8 |
| level | missed | 176 | 14.7 | 0.92 | 1.57 | 3.0 | 2.3 |
| level | made | 1375 | 7.3 | 0.86 | 0.59 | 1.8 | 0.7 |
| behind | missed | 42 | 20.6 | 0.94 | 1.24 | 2.7 | 3.1 |
| behind | made | 356 | 10.2 | 0.94 | 0.55 | 2.9 | 0.6 |

## E. Made tackles: forward progress after the attempt by approach and momentum (open field)

| group | n | carrier forward yd in 1.0 s p25 / p50 / p75 | yds to the end p50 |
|---|---|---|---|
| head-on (approach >= 135) | 83 | 1.3 / 1.8 / 2.7 | 1.6 |
| angled (45-135) | 595 | 0.5 / 1.8 / 2.8 | 1.2 |
| chasing (< 45) | 1398 | 0.4 / 2.1 / 4.0 | 1.0 |
| defender momentum > carrier x1.25 | 592 | -0.6 / 1.0 / 2.1 | 0.4 |
| defender momentum < carrier x0.8 | 293 | 1.7 / 2.6 / 3.8 | 1.9 |

## F. Joint logistic model, open field (n 1883, miss 0.133); coefficients per 1 sd, log-odds of a miss

| term | mean | sd | coef | se | z |
|---|---|---|---|---|---|
| closing | 3.84 | 2.37 | -0.14 | 0.21 | -0.6 |
| ds | 6.48 | 1.82 | +0.70 | 0.15 | +4.7 |
| cs | 5.41 | 1.79 | -0.39 | 0.12 | -3.4 |
| |dlat| | 3.08 | 1.77 | +0.38 | 0.12 | +3.1 |
| approach/90 | 0.50 | 0.45 | +0.63 | 0.19 | +3.3 |
| |aim-need|/30 | 0.50 | 0.56 | +0.48 | 0.07 | +6.5 |
| face/90 | 0.29 | 0.27 | -0.25 | 0.08 | -3.0 |
| brk | 0.01 | 1.81 | +0.02 | 0.08 | +0.3 |
| cut/30 | 0.41 | 0.40 | +0.22 | 0.07 | +3.4 |
| log w ratio | -0.03 | 0.13 | +0.08 | 0.07 | +1.1 |
| sideline<3 | 0.16 | 0.37 | -0.50 | 0.11 | -4.7 |
| attempt_dist | 0.84 | 0.24 | +0.05 | 0.08 | +0.6 |

## G. Joint logistic model, all attempts (with crowd terms) (n 9758, miss 0.115); coefficients per 1 sd, log-odds of a miss

| term | mean | sd | coef | se | z |
|---|---|---|---|---|---|
| closing | 5.01 | 2.32 | -0.09 | 0.08 | -1.1 |
| ds | 4.84 | 2.08 | +0.54 | 0.07 | +7.7 |
| cs | 4.61 | 1.79 | -0.03 | 0.05 | -0.5 |
| |dlat| | 3.00 | 1.71 | +0.30 | 0.06 | +5.5 |
| approach/90 | 0.83 | 0.54 | +0.75 | 0.09 | +8.7 |
| |aim-need|/30 | 0.85 | 1.03 | +0.58 | 0.04 | +14.0 |
| face/90 | 0.27 | 0.27 | -0.08 | 0.04 | -2.2 |
| brk | -0.63 | 1.78 | +0.06 | 0.04 | +1.7 |
| cut/30 | 0.45 | 0.45 | +0.14 | 0.03 | +4.4 |
| log w ratio | 0.03 | 0.16 | +0.00 | 0.04 | +0.1 |
| sideline<3 | 0.07 | 0.26 | -0.29 | 0.05 | -6.0 |
| attempt_dist | 0.86 | 0.22 | -0.13 | 0.03 | -3.6 |
| traffic | 2.13 | 1.57 | -0.03 | 0.04 | -0.7 |
| prior | 0.30 | 0.46 | -0.39 | 0.06 | -6.5 |
| pile | 0.58 | 0.79 | -0.54 | 0.06 | -8.7 |
| blk | 0.33 | 0.61 | +0.06 | 0.04 | +1.4 |
| rank | 0.39 | 0.61 | +0.16 | 0.04 | +3.6 |

