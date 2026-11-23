## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1452 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 300 | 0.207 | 0.270 | 5.6 / 14.2 | 4.9 / 16.5 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 149 | 0.103 | 0.180 | 6.6 / 15.2 | 7.3 / 21.4 |
| TE | 353 | 0.068 | 0.086 | 76 | 0.052 | 0.044 | 5.1 / 15.2 | 4.5 / 11.0 |
| slot | 490 | 0.094 | 0.106 | 57 | 0.039 | 0.040 | 4.8 / 12.2 | 3.4 / 12.2 |
| wide | 181 | 0.035 | 0.040 | 18 | 0.012 | 0.006 | 5.3 / 12.3 | 1.8 / 5.2 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 92 | 0.063 | 0.109 | 6.3 / 14.7 | 5.8 / 23.9 |
| Cover-1 | 265 | 0.051 | 0.071 | 59 | 0.041 | 0.035 | 5.1 / 17.7 | 3.1 / 12.1 |
| Cover-2 | 299 | 0.058 | 0.069 | 30 | 0.021 | 0.023 | 5.3 / 12.3 | 6.0 / 13.2 |
| Quarters | 272 | 0.052 | 0.067 | 59 | 0.041 | 0.051 | 5.7 / 13.3 | 7.4 / 18.0 |
| Cover-6 | 178 | 0.034 | 0.045 | 45 | 0.031 | 0.044 | 5.6 / 13.9 | 6.5 / 18.2 |
| Cover-0 | 55 | 0.011 | 0.014 | 8 | 0.006 | 0.007 | 4.6 / 15.7 | 6.5 / 15.2 |
| 2-Man | 18 | 0.003 | 0.006 | 7 | 0.005 | 0.001 | 5.6 / 20.2 | 1.1 / 2.6 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 228 | 0.157 | 0.236 | 5.8 / 13.8 | 6.4 / 18.9 |
| True | 338 | 0.065 | 0.090 | 72 | 0.050 | 0.034 | 5.1 / 17.0 | 2.6 / 11.9 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 107 of 1452 (0.074; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.117.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.298 / 0.396 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.091 / 0.126 |
| deeper than 4 yd | 0.560 / 0.416 | 0.629 / 0.488 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 300 | 5.1 (2.7-7.9) | 0.57 / 1.26 | 2.9 | 0.33 / 0.24 / 0.43 | 0.19 / 0.81 | 4.9 / 9.9 / 16.5 | 0.247 | 0.61, 0.8 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.173 |
| never reached | 0.097 | 0.070 |
| stopped (tackle or held for help) | 0.485 | 0.590 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.023 |
| beaten without contact | 0.112 | 0.143 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 300 | 6.7 (4.4-9.5) | 5.9 (3.0-8.2) | 18.2 (14.2-22.0) | 1.1 (-2.6-2.2) | 15.6 (11.7-18.7) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 140 | 4.6 (2.7-6.4) | 18.0 (14.9-21.1) | - | - |
| zone | 77 | 8.3 (6.0-10.5) | 17.9 (12.7-22.3) | 8.5 (4.0-9.5) | 14.7 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

300 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 83 | 0.28 | (no seat within 9 yd) |  |  |
| 25 | 0.08 | LB_W | man | man hips open |
| 22 | 0.07 | NB | man | man |
| 16 | 0.05 | SS | man | man hips open |
| 14 | 0.05 | LB_M | man | man |
