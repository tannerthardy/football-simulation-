## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1419 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 312 | 0.220 | 0.268 | 5.6 / 14.2 | 4.3 / 16.8 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 158 | 0.111 | 0.167 | 6.6 / 15.2 | 5.4 / 23.5 |
| TE | 353 | 0.068 | 0.086 | 84 | 0.059 | 0.060 | 5.1 / 15.2 | 3.6 / 13.5 |
| slot | 490 | 0.094 | 0.106 | 47 | 0.033 | 0.034 | 4.8 / 12.2 | 3.7 / 13.0 |
| wide | 181 | 0.035 | 0.040 | 23 | 0.016 | 0.007 | 5.3 / 12.3 | 1.9 / 6.3 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 117 | 0.082 | 0.125 | 6.3 / 14.7 | 5.9 / 23.0 |
| Cover-1 | 265 | 0.051 | 0.071 | 59 | 0.042 | 0.030 | 5.1 / 17.7 | 3.0 / 8.8 |
| Cover-2 | 299 | 0.058 | 0.069 | 30 | 0.021 | 0.026 | 5.3 / 12.3 | 6.5 / 11.8 |
| Quarters | 272 | 0.052 | 0.067 | 54 | 0.038 | 0.042 | 5.7 / 13.3 | 3.2 / 14.0 |
| Cover-6 | 178 | 0.034 | 0.045 | 32 | 0.023 | 0.036 | 5.6 / 13.9 | 4.6 / 28.1 |
| Cover-0 | 55 | 0.011 | 0.014 | 14 | 0.010 | 0.007 | 4.6 / 15.7 | 3.1 / 11.3 |
| 2-Man | 18 | 0.003 | 0.006 | 6 | 0.004 | 0.001 | 5.6 / 20.2 | 1.1 / 4.3 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 238 | 0.168 | 0.231 | 5.8 / 13.8 | 5.1 / 20.3 |
| True | 338 | 0.065 | 0.090 | 74 | 0.052 | 0.037 | 5.1 / 17.0 | 2.9 / 10.3 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 91 of 1419 (0.064; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.113.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.309 / 0.398 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.089 / 0.130 |
| deeper than 4 yd | 0.560 / 0.416 | 0.626 / 0.489 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 312 | 4.4 (2.5-6.3) | 0.65 / 1.36 | 3.0 | 0.35 / 0.24 / 0.41 | 0.15 / 0.85 | 4.3 / 9.0 / 16.8 | 0.215 | 0.64, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.157 |
| never reached | 0.097 | 0.035 |
| stopped (tackle or held for help) | 0.485 | 0.609 |
| contact, then play ended elsewhere | 0.021 | 0.003 |
| missed (contact range, then beaten) | 0.162 | 0.032 |
| beaten without contact | 0.112 | 0.163 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 312 | 6.3 (4.4-8.5) | 5.2 (3.2-8.1) | 17.9 (13.9-22.2) | 0.7 (-2.6-2.2) | 15.6 (11.9-18.4) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 161 | 4.0 (2.9-6.1) | 18.1 (14.6-22.1) | - | - |
| zone | 84 | 8.4 (5.7-10.6) | 16.9 (13.0-19.8) | 8.5 (4.0-8.5) | 13.5 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

312 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 67 | 0.21 | (no seat within 9 yd) |  |  |
| 23 | 0.07 | LB_W | man | man hips open |
| 22 | 0.07 | LB_W | man | man |
| 21 | 0.07 | SS | man | man hips open |
| 20 | 0.06 | NB | man | man |
