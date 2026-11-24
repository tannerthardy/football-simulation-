## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1374 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 309 | 0.225 | 0.252 | 5.6 / 14.2 | 4.3 / 17.7 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 154 | 0.112 | 0.148 | 6.6 / 15.2 | 4.9 / 19.2 |
| TE | 353 | 0.068 | 0.086 | 85 | 0.062 | 0.050 | 5.1 / 15.2 | 3.9 / 11.3 |
| slot | 490 | 0.094 | 0.106 | 50 | 0.036 | 0.054 | 4.8 / 12.2 | 4.2 / 22.8 |
| wide | 181 | 0.035 | 0.040 | 20 | 0.015 | -0.001 | 5.3 / 12.3 | 0.6 / 10.0 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 108 | 0.079 | 0.093 | 6.3 / 14.7 | 5.1 / 20.5 |
| Cover-1 | 265 | 0.051 | 0.071 | 63 | 0.046 | 0.025 | 5.1 / 17.7 | 3.1 / 12.2 |
| Cover-2 | 299 | 0.058 | 0.069 | 42 | 0.031 | 0.047 | 5.3 / 12.3 | 5.7 / 21.4 |
| Quarters | 272 | 0.052 | 0.067 | 50 | 0.036 | 0.054 | 5.7 / 13.3 | 4.3 / 23.1 |
| Cover-6 | 178 | 0.034 | 0.045 | 35 | 0.025 | 0.026 | 5.6 / 13.9 | 3.8 / 11.8 |
| Cover-0 | 55 | 0.011 | 0.014 | 8 | 0.006 | 0.006 | 4.6 / 15.7 | 4.1 / 16.3 |
| 2-Man | 18 | 0.003 | 0.006 | 3 | 0.002 | 0.001 | 5.6 / 20.2 | 3.8 / 6.5 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 240 | 0.175 | 0.220 | 5.8 / 13.8 | 4.6 / 20.4 |
| True | 338 | 0.065 | 0.090 | 69 | 0.050 | 0.032 | 5.1 / 17.0 | 3.3 / 12.5 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 100 of 1374 (0.073; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.109.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.314 / 0.358 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.090 / 0.106 |
| deeper than 4 yd | 0.560 / 0.416 | 0.613 / 0.533 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 309 | 4.3 (2.6-6.7) | 0.65 / 1.34 | 2.9 | 0.37 / 0.24 / 0.39 | 0.24 / 0.76 | 4.3 / 9.1 / 17.7 | 0.214 | 0.63, 0.7 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.172 |
| never reached | 0.097 | 0.058 |
| stopped (tackle or held for help) | 0.485 | 0.628 |
| contact, then play ended elsewhere | 0.021 | 0.003 |
| missed (contact range, then beaten) | 0.162 | 0.003 |
| beaten without contact | 0.112 | 0.136 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 309 | 6.2 (4.3-8.2) | 5.3 (3.2-7.7) | 17.9 (13.3-21.9) | 1.2 (-2.2-2.3) | 15.1 (11.7-18.9) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 159 | 4.2 (2.9-6.6) | 18.1 (13.6-21.6) | - | - |
| zone | 88 | 7.5 (5.2-9.4) | 17.7 (13.2-22.1) | 6.2 (4.0-8.5) | 12.0 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

309 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 62 | 0.20 | (no seat within 9 yd) |  |  |
| 27 | 0.09 | LB_M | man | man |
| 25 | 0.08 | NB | man | man |
| 22 | 0.07 | LB_W | man | man hips open |
| 15 | 0.05 | LB_W | man | man |
