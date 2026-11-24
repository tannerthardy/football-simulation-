## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1442 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 275 | 0.191 | 0.241 | 5.6 / 14.2 | 4.4 / 19.5 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 125 | 0.087 | 0.136 | 6.6 / 15.2 | 6.6 / 21.7 |
| TE | 353 | 0.068 | 0.086 | 76 | 0.053 | 0.048 | 5.1 / 15.2 | 2.9 / 11.9 |
| slot | 490 | 0.094 | 0.106 | 55 | 0.038 | 0.052 | 4.8 / 12.2 | 3.8 / 19.7 |
| wide | 181 | 0.035 | 0.040 | 19 | 0.013 | 0.005 | 5.3 / 12.3 | 2.1 / 6.1 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 83 | 0.058 | 0.080 | 6.3 / 14.7 | 6.1 / 19.0 |
| Cover-1 | 265 | 0.051 | 0.071 | 56 | 0.039 | 0.035 | 5.1 / 17.7 | 2.1 / 13.0 |
| Cover-2 | 299 | 0.058 | 0.069 | 28 | 0.019 | 0.027 | 5.3 / 12.3 | 5.0 / 15.0 |
| Quarters | 272 | 0.052 | 0.067 | 58 | 0.040 | 0.057 | 5.7 / 13.3 | 4.4 / 20.4 |
| Cover-6 | 178 | 0.034 | 0.045 | 35 | 0.024 | 0.033 | 5.6 / 13.9 | 5.2 / 21.0 |
| Cover-0 | 55 | 0.011 | 0.014 | 11 | 0.008 | 0.008 | 4.6 / 15.7 | 5.9 / 11.9 |
| 2-Man | 18 | 0.003 | 0.006 | 4 | 0.003 | 0.001 | 5.6 / 20.2 | 1.1 / 7.4 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 211 | 0.146 | 0.200 | 5.8 / 13.8 | 5.2 / 20.3 |
| True | 338 | 0.065 | 0.090 | 64 | 0.044 | 0.041 | 5.1 / 17.0 | 2.2 / 14.0 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 87 of 1442 (0.060; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.113.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.286 / 0.378 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.095 / 0.137 |
| deeper than 4 yd | 0.560 / 0.416 | 0.655 / 0.509 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 275 | 4.3 (2.0-6.2) | 0.71 / 1.40 | 2.8 | 0.32 / 0.25 / 0.43 | 0.20 / 0.80 | 4.4 / 9.7 / 19.5 | 0.229 | 0.61, 0.5 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.185 |
| never reached | 0.097 | 0.062 |
| stopped (tackle or held for help) | 0.485 | 0.589 |
| contact, then play ended elsewhere | 0.021 | 0.004 |
| missed (contact range, then beaten) | 0.162 | 0.022 |
| beaten without contact | 0.112 | 0.138 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 275 | 5.8 (4.0-7.8) | 4.9 (3.3-7.5) | 18.3 (14.3-21.7) | 1.4 (-1.4-2.3) | 15.4 (11.9-18.6) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 138 | 4.6 (3.1-6.8) | 18.0 (14.4-21.1) | - | - |
| zone | 81 | 7.4 (5.4-8.9) | 17.3 (14.1-21.3) | 8.5 (4.0-8.5) | 13.3 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

275 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 56 | 0.20 | (no seat within 9 yd) |  |  |
| 24 | 0.09 | LB_W | man | man hips open |
| 19 | 0.07 | LB_M | man | man |
| 18 | 0.07 | NB | man | man |
| 12 | 0.04 | SS | man | man hips open |
