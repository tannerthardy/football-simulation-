## Release - break by route family (targets, dropbacks without play action)

Negative = the ball out before the break. p25 / p50 / p75 (n).

| family | break band | NFL | OURS |
|---|---|---|---|
| HITCH | <3 | -0.1 / 0.1 / 0.3 (22) | - (1) |
| HITCH | 3-7.5 | -0.2 / -0.1 / 0.1 (520) | 0.1 / 0.3 / 0.7 (388) |
| HITCH | 7.5-12 | -0.3 / -0.0 / 0.2 (200) | 0.1 / 0.5 / 0.9 (28) |
| HITCH | 12-18 | -0.2 / 0.0 / 0.4 (141) | 0.0 / 0.1 / 0.1 (21) |
| HITCH | 18-60 | -0.3 / 0.0 / 0.2 (15) | - (1) |
| HITCH | break not found | NFL 221 | OURS 31 |
| OUT | <3 | 0.2 / 0.5 / 0.7 (134) | 0.5 / 1.0 / 1.3 (19) |
| OUT | 3-7.5 | 0.1 / 0.2 / 0.4 (386) | 0.3 / 0.5 / 0.6 (100) |
| OUT | 7.5-12 | -0.1 / 0.0 / 0.3 (150) | 0.0 / 0.2 / 0.3 (23) |
| OUT | 12-18 | -0.3 / -0.2 / 0.1 (87) | - (0) |
| OUT | 18-60 | -0.7 / -0.2 / 0.6 (15) | - (0) |
| OUT | break not found | NFL 146 | OURS 8 |
| IN | <3 | 0.4 / 0.7 / 1.3 (30) | - (0) |
| IN | 3-7.5 | 0.2 / 0.4 / 0.7 (173) | 0.5 / 0.6 / 0.7 (28) |
| IN | 7.5-12 | -0.0 / 0.2 / 0.5 (119) | 0.4 / 0.6 / 0.8 (58) |
| IN | 12-18 | -0.1 / 0.2 / 0.6 (74) | - (4) |
| IN | 18-60 | -0.3 / 0.0 / 0.4 (13) | - (0) |
| IN | break not found | NFL 16 | OURS 6 |
| SLANT | <3 | 0.4 / 0.5 / 0.7 (152) | 0.6 / 1.0 / 1.7 (19) |
| SLANT | 3-7.5 | 0.1 / 0.3 / 0.5 (136) | 0.6 / 0.8 / 1.2 (24) |
| SLANT | 7.5-12 | - (2) | - (4) |
| SLANT | 12-18 | - (2) | - (0) |
| SLANT | 18-60 | - (0) | - (0) |
| SLANT | break not found | NFL 163 | OURS 10 |

## What is thrown when: NFL, target class by release time (row %, dropbacks without play action)

| release s | n | screen | back | flat | quick | intermediate | deep | other |
|---|---|---|---|---|---|---|---|---|
| 0-1.5 | 353 | 66 | 7 | 8 | 11 | 4 | 4 | 0 |
| 1.5-2 | 894 | 13 | 18 | 10 | 49 | 4 | 7 | 0 |
| 2-2.5 | 1846 | 7 | 16 | 3 | 44 | 15 | 15 | 0 |
| 2.5-3 | 1538 | 3 | 19 | 3 | 19 | 31 | 24 | 0 |
| 3-3.5 | 850 | 3 | 18 | 5 | 12 | 40 | 22 | 0 |
| 3.5+ | 753 | 2 | 17 | 5 | 14 | 34 | 28 | 0 |
| all | 6234 | 9 | 17 | 5 | 29 | 22 | 18 | 0 |

Release time p25 / p50 / p75 by class (NFL): screen 1.2 / 1.6 / 2.2; back 2.1 / 2.5 / 3.0; flat 1.7 / 2.2 / 3.0; quick 1.9 / 2.2 / 2.5; intermediate 2.5 / 2.8 / 3.3; deep 2.4 / 2.7 / 3.2; other 2.5 / 2.7 / 3.2

## What is thrown when: OURS, target class by release time (row %, dropbacks without play action)

| release s | n | screen | back | flat | quick | intermediate | deep | other |
|---|---|---|---|---|---|---|---|---|
| 0-1.5 | 47 | 100 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1.5-2 | 111 | 73 | 5 | 6 | 9 | 1 | 4 | 2 |
| 2-2.5 | 317 | 4 | 10 | 15 | 62 | 5 | 3 | 0 |
| 2.5-3 | 403 | 0 | 16 | 12 | 54 | 13 | 4 | 0 |
| 3-3.5 | 293 | 0 | 14 | 17 | 36 | 28 | 5 | 0 |
| 3.5+ | 218 | 0 | 32 | 10 | 22 | 29 | 7 | 0 |
| all | 1389 | 10 | 15 | 13 | 42 | 16 | 5 | 0 |

Release time p25 / p50 / p75 by class (OURS): screen 1.2 / 1.6 / 1.7; back 2.6 / 3.0 / 3.6; flat 2.3 / 2.8 / 3.2; quick 2.3 / 2.6 / 3.0; intermediate 2.8 / 3.3 / 3.5; deep 2.5 / 2.9 / 3.4; other 1.8 / 1.8 / 2.1

## Check: first 25 plays, NFL

| play | release s | target pos | label | class | break s | break depth | release - break |
|---|---|---|---|---|---|---|---|
| 2022091200-85 | 2.0 | WR | SLANT | quick | 1.6 | 4.3 | 0.4 |
| 2022091200-109 | 2.7 | WR | POST | deep | 2.0 | 5.5 | 0.7 |
| 2022091200-156 | 2.1 | WR | HITCH | intermediate | 2.5 | 10.6 | -0.4 |
| 2022091200-201 | 4.5 | TE | HITCH | intermediate | - | - | - |
| 2022091200-264 | 1.7 | FB | FLAT | back | - | - | - |
| 2022091200-467 | 3.1 | RB | CROSS | back | - | - | - |
| 2022091200-664 | 3.2 | RB | SCREEN | screen | - | - | - |
| 2022091200-762 | 1.9 | TE | FLAT | flat | - | - | - |
| 2022091200-931 | 3.2 | TE | FLAT | flat | - | - | - |
| 2022091200-1028 | 2.3 | RB | FLAT | back | - | - | - |
| 2022091200-1241 | 2.3 | WR | HITCH | quick | 2.4 | 5.5 | -0.1 |
| 2022091200-1320 | 2.6 | RB | SCREEN | screen | - | - | - |
| 2022091200-1344 | 2.5 | WR | GO | deep | - | - | - |
| 2022091200-1409 | 3.9 | TE | FLAT | flat | - | - | - |
| 2022091200-1487 | 3.6 | WR | CORNER | deep | 1.5 | 2.3 | 2.1 |
| 2022091200-1550 | 1.2 | WR | SCREEN | screen | - | - | - |
| 2022091200-1579 | 2.5 | TE | GO | deep | - | - | - |
| 2022091200-1725 | 5.0 | WR | GO | deep | - | - | - |
| 2022091200-1764 | 5.0 | WR | HITCH | intermediate | 2.7 | 8.8 | 2.3 |
| 2022091200-1793 | 2.6 | WR | GO | deep | - | - | - |
| 2022091200-1851 | 2.2 | RB | SCREEN | screen | - | - | - |
| 2022091200-2038 | 2.0 | WR | OUT | quick | 2.1 | 5.5 | -0.1 |
| 2022091200-2093 | 3.2 | RB | FLAT | back | - | - | - |
| 2022091200-2244 | 2.8 | RB | FLAT | back | - | - | - |
| 2022091200-2268 | 2.3 | RB | ANGLE | back | - | - | - |

## Check: first 25 plays, OURS

| play | release s | target pos | label | class | break s | break depth | release - break |
|---|---|---|---|---|---|---|---|
| 101-0-2 | 2.5 | WR | HITCH | quick | 2.3 | 5.3 | 0.2 |
| 101-0-3 | 2.9 | TE | FLAT | flat | - | - | - |
| 101-0-4 | 3.4 | WR | HITCH | quick | 2.6 | 5.8 | 0.8 |
| 101-0-5 | 2.3 | WR | HITCH | quick | 2.4 | 4.9 | -0.1 |
| 101-0-6 | 3.2 | TE | HITCH | quick | - | - | - |
| 101-0-7 | 3.2 | WR | OUT | quick | 2.9 | 6.8 | 0.3 |
| 101-0-9 | 2.9 | FB | HITCH | back | 2.7 | 6.0 | 0.2 |
| 101-0-10 | 3.5 | TE | CORNER | deep | 2.8 | 11.4 | 0.7 |
| 101-0-11 | 2.7 | WR | HITCH | quick | 2.1 | 5.4 | 0.6 |
| 101-0-14 | 4.2 | RB | ANGLE | back | - | - | - |
| 101-0-15 | 2.6 | TE | CROSS | intermediate | - | - | - |
| 101-0-16 | 4.3 | TE | GO | deep | - | - | - |
| 101-0-17 | 2.3 | TE | FLAT | flat | - | - | - |
| 101-0-18 | 2.9 | WR | HITCH | quick | 2.2 | 5.3 | 0.7 |
| 101-0-19 | 3.4 | TE | FLAT | flat | - | - | - |
| 101-0-20 | 3.1 | WR | FLAT | flat | - | - | - |
| 101-0-22 | 2.8 | WR | HITCH | quick | 2.2 | 5.6 | 0.6 |
| 101-0-23 | 1.8 | RB | FLAT | back | - | - | - |
| 101-0-26 | 2.5 | TE | OUT | quick | 1.8 | 3.7 | 0.7 |
| 101-0-27 | 2.7 | RB | FLAT | back | - | - | - |
| 101-0-30 | 2.6 | WR | CROSS | intermediate | - | - | - |
| 101-0-32 | 3.7 | RB | FLAT | back | - | - | - |
| 101-0-33 | 4.0 | WR | HITCH | deep | 5.2 | 19.1 | -1.2 |
| 101-0-34 | 1.8 | TE | GO | deep | - | - | - |
| 101-0-37 | 2.8 | WR | SLANT | quick | 2.2 | 5.3 | 0.6 |
