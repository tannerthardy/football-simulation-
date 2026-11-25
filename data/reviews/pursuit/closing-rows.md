## What the defender-only closing speed at the catch is made of (completions with 2.5 s after the catch; every defender within 10 yd)

| sample | band (yd) | n | c_def p50 | rc (the gap shutting) p50 | contact | with (running with) | settle (receiver slows) | drive | other | c_def p50 within each class: contact / with / settle / drive / other | rc p50 within drive |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NFL | 0-2 | 212 | 3.8 | 2.2 | 0.25 | 0.18 | 0.12 | 0.23 | 0.22 | 3.6 / 4.5 / 5.3 / 4.3 / 2.1 | 4.2 |
| NFL | 2-4 | 542 | 3.7 | 2.7 | 0.00 | 0.25 | 0.15 | 0.29 | 0.30 | nan / 4.6 / 4.9 / 3.8 / 1.7 | 4.9 |
| NFL | 4-7 | 1265 | 3.0 | 2.4 | 0.00 | 0.21 | 0.09 | 0.30 | 0.39 | nan / 3.8 / 4.9 / 3.7 / 1.3 | 5.2 |
| NFL | 7-10 | 1802 | 2.6 | 1.3 | 0.00 | 0.21 | 0.08 | 0.23 | 0.48 | nan / 3.6 / 4.9 / 3.9 / 1.0 | 5.2 |
| SIM | 0-2 | 34 | 0.4 | -0.4 | 0.15 | 0.24 | 0.00 | 0.06 | 0.56 | 1.4 / 2.3 / nan / 3.8 / 0.2 | 3.4 |
| SIM | 2-4 | 114 | 2.7 | 1.8 | 0.00 | 0.18 | 0.18 | 0.17 | 0.48 | nan / 3.3 / 5.6 / 3.6 / 1.0 | 4.4 |
| SIM | 4-7 | 345 | 2.1 | 1.0 | 0.00 | 0.17 | 0.12 | 0.17 | 0.55 | nan / 3.6 / 4.6 / 3.1 / 0.8 | 3.6 |
| SIM | 7-10 | 527 | 1.7 | 0.7 | 0.00 | 0.11 | 0.07 | 0.16 | 0.66 | nan / 3.2 / 4.8 / 3.5 / 0.9 | 4.0 |

Shares among the rows that count as closing (c_def 1.5 yd/s or more), NFL:

| band (yd) | n | contact | with | settle | drive | other |
|---|---|---|---|---|---|---|
| 0-2 | 173 | 0.24 | 0.18 | 0.14 | 0.27 | 0.16 |
| 2-4 | 439 | 0.00 | 0.27 | 0.18 | 0.36 | 0.19 |
| 4-7 | 930 | 0.00 | 0.24 | 0.12 | 0.39 | 0.24 |
| 7-10 | 1203 | 0.00 | 0.27 | 0.11 | 0.34 | 0.28 |

### 15 NFL rows in the 0-2 yd band that count as closing (c_def 1.5 yd/s or more), seeded random draw from 173

| gameId-playId | def | man/zone | route | sep (yd) | defender speed | receiver speed | along his run | across, toward the receiver's line | c_def | rc (gap) | angle v_d to v_r | angle v_d to u | class |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2022100205-1671 | CB | man | GO | 1.5 | 6.2 | 7.5 | 5.6 | -2.6 | 3.9 | -2.9 | 25 | 51 | with |
| 2022091802-2995 | CB | man | OUT | 1.7 | 5.5 | 2.4 | 5.3 | 1.6 | 4.1 | 2.9 | 17 | 41 | settle |
| 2022100903-3763 | ILB | zone | HITCH | 1.3 | 5.1 | 2.6 | 4.8 | 1.5 | 5.0 | 2.4 | 17 | 10 | settle |
| 2022110606-659 | CB | zone | OUT | 1.7 | 7.0 | 3.5 | 4.6 | 5.2 | 3.9 | 4.8 | 48 | 56 | other |
| 2022091106-1653 | CB | man | SLANT | 1.8 | 6.5 | 7.3 | 6.3 | -1.4 | 5.6 | -1.4 | 13 | 31 | with |
| 2022091103-2483 | DE | zone | FLAT | 1.6 | 2.9 | 4.5 | -0.3 | 2.9 | 2.6 | 4.9 | 95 | 26 | drive |
| 2022102306-3921 | FS | man | FLAT | 0.7 | 5.1 | 3.8 | 5.1 | 0.3 | 4.2 | 1.2 | 3 | 34 | contact |
| 2022091900-1613 | FS | zone | POST | 0.8 | 1.7 | 2.1 | -1.5 | 0.9 | 1.5 | 3.6 | 149 | 27 | contact |
| 2022100909-2883 | CB | zone | SCREEN | 1.5 | 4.7 | 2.1 | -2.1 | 4.2 | 4.7 | 5.7 | 117 | 2 | drive |
| 2022103006-557 | ILB | man | OUT | 1.8 | 6.0 | 4.0 | 6.0 | 0.7 | 4.6 | 1.9 | 7 | 40 | settle |
| 2022091104-953 | CB | man | SLANT | 0.9 | 6.7 | 6.6 | 6.0 | 3.0 | 6.4 | -0.1 | 27 | 17 | contact |
| 2022102310-917 | CB | man | IN | 1.7 | 7.7 | 7.1 | 7.7 | 0.2 | 6.7 | 0.6 | 1 | 29 | with |
| 2022092505-3437 | CB | man | POST | 1.1 | 5.9 | 6.9 | 5.8 | 0.6 | 4.9 | -0.4 | 5 | 34 | with |
| 2022091107-301 | CB | zone | OUT | 0.9 | 3.7 | 4.9 | 0.2 | 3.7 | 3.6 | 4.4 | 87 | 12 | contact |
| 2022091901-1550 | OLB | zone | SLANT | 1.8 | 5.4 | 5.9 | 5.2 | 1.6 | 5.4 | -0.1 | 17 | 4 | with |

### 15 NFL rows in the 2-4 yd band that count as closing (c_def 1.5 yd/s or more), seeded random draw from 439

| gameId-playId | def | man/zone | route | sep (yd) | defender speed | receiver speed | along his run | across, toward the receiver's line | c_def | rc (gap) | angle v_d to v_r | angle v_d to u | class |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2022100908-2338 | CB | zone | SLANT | 3.7 | 4.2 | 4.9 | 2.1 | 3.7 | 3.5 | 3.8 | 60 | 33 | drive |
| 2022100910-2936 | OLB | man | SCREEN | 2.7 | 6.3 | 5.9 | 5.4 | 3.3 | 3.3 | 3.3 | 31 | 59 | other |
| 2022091103-111 | CB | man | HITCH | 3.0 | 5.7 | 5.9 | 5.7 | 0.5 | 3.2 | 0.3 | 5 | 56 | with |
| 2022092506-1034 | SS | man | CROSS | 2.9 | 4.9 | 5.7 | -1.0 | 4.8 | 3.0 | 8.2 | 102 | 52 | other |
| 2022091100-1887 | ILB | zone | IN | 3.2 | 5.4 | 7.4 | -1.2 | 5.3 | 5.3 | 5.3 | 103 | 13 | drive |
| 2022101603-503 | ILB | man | ANGLE | 2.8 | 3.4 | 1.9 | -3.3 | 0.6 | 3.3 | 5.1 | 170 | 8 | drive |
| 2022100909-1046 | CB | zone | POST | 2.3 | 6.9 | 9.1 | 6.5 | -2.5 | 5.1 | -3.3 | 21 | 42 | with |
| 2022091104-2130 | ILB | zone | ANGLE | 3.3 | 6.4 | 6.8 | 5.9 | 2.5 | 3.0 | 2.4 | 23 | 62 | other |
| 2022110606-1677 | FS | zone | HITCH | 3.3 | 4.4 | 3.1 | 2.7 | 3.4 | 2.5 | 3.4 | 51 | 56 | other |
| 2022101602-3099 | SS | man | HITCH | 2.2 | 4.8 | 3.5 | 2.7 | 4.0 | 3.3 | 4.1 | 56 | 46 | other |
| 2022091808-98 | FS | zone | OUT | 3.5 | 5.5 | 4.6 | 4.3 | 3.4 | 4.1 | 3.3 | 38 | 41 | other |
| 2022092509-1647 | SS | zone | CORNER | 2.5 | 4.1 | 6.5 | 4.0 | -0.8 | 3.6 | -2.6 | 11 | 29 | with |
| 2022102307-2709 | ILB | zone | SCREEN | 3.3 | 3.8 | 1.6 | 2.6 | 2.7 | 2.1 | 2.4 | 45 | 55 | other |
| 2022102307-1976 | ILB | zone | OUT | 3.8 | 6.6 | 6.9 | 4.7 | 4.6 | 5.3 | 4.3 | 45 | 37 | other |
| 2022101600-3097 | ILB | zone | HITCH | 2.8 | 6.2 | 6.7 | 6.2 | 0.5 | 6.2 | -0.4 | 4 | 2 | with |
