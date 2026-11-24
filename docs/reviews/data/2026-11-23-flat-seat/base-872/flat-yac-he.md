## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1419 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 289 | 0.204 | 0.231 | 5.6 / 14.2 | 4.4 / 15.2 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 146 | 0.103 | 0.134 | 6.6 / 15.2 | 5.4 / 16.8 |
| TE | 353 | 0.068 | 0.086 | 68 | 0.048 | 0.037 | 5.1 / 15.2 | 3.9 / 8.6 |
| slot | 490 | 0.094 | 0.106 | 55 | 0.039 | 0.056 | 4.8 / 12.2 | 4.3 / 26.8 |
| wide | 181 | 0.035 | 0.040 | 20 | 0.014 | 0.004 | 5.3 / 12.3 | 1.4 / 3.9 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 102 | 0.072 | 0.095 | 6.3 / 14.7 | 4.8 / 18.2 |
| Cover-1 | 265 | 0.051 | 0.071 | 45 | 0.032 | 0.027 | 5.1 / 17.7 | 3.0 / 12.8 |
| Cover-2 | 299 | 0.058 | 0.069 | 35 | 0.025 | 0.026 | 5.3 / 12.3 | 5.7 / 11.5 |
| Quarters | 272 | 0.052 | 0.067 | 55 | 0.039 | 0.043 | 5.7 / 13.3 | 3.0 / 13.8 |
| Cover-6 | 178 | 0.034 | 0.045 | 31 | 0.022 | 0.023 | 5.6 / 13.9 | 5.7 / 10.5 |
| Cover-0 | 55 | 0.011 | 0.014 | 14 | 0.010 | 0.014 | 4.6 / 15.7 | 4.2 / 22.7 |
| 2-Man | 18 | 0.003 | 0.006 | 7 | 0.005 | 0.003 | 5.6 / 20.2 | 2.5 / 8.4 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 229 | 0.161 | 0.189 | 5.8 / 13.8 | 4.6 / 15.4 |
| True | 338 | 0.065 | 0.090 | 60 | 0.042 | 0.041 | 5.1 / 17.0 | 3.2 / 15.1 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 101 of 1419 (0.071; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.114.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.290 / 0.363 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.086 / 0.132 |
| deeper than 4 yd | 0.560 / 0.416 | 0.639 / 0.524 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 289 | 4.3 (2.2-6.9) | 0.70 / 1.31 | 2.8 | 0.33 / 0.25 / 0.42 | 0.25 / 0.75 | 4.4 / 7.8 / 15.2 | 0.180 | 0.69, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.163 |
| never reached | 0.097 | 0.059 |
| stopped (tackle or held for help) | 0.485 | 0.661 |
| contact, then play ended elsewhere | 0.021 | 0.003 |
| missed (contact range, then beaten) | 0.162 | 0.021 |
| beaten without contact | 0.112 | 0.093 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 289 | 6.2 (4.3-8.1) | 5.7 (3.3-7.8) | 17.5 (13.9-21.3) | 1.1 (-1.9-2.2) | 15.4 (11.7-18.4) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 158 | 4.7 (2.9-6.3) | 17.5 (13.9-21.3) | - | - |
| zone | 79 | 7.6 (6.0-9.7) | 17.7 (14.5-21.6) | 8.5 (5.5-8.5) | 16.9 (9.3-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

289 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 52 | 0.18 | (no seat within 9 yd) |  |  |
| 23 | 0.08 | LB_M | man | man |
| 21 | 0.07 | NB | man | man |
| 19 | 0.07 | LB_W | man | man |
| 18 | 0.06 | SS | man | man hips open |
