## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1347 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 289 | 0.215 | 0.277 | 5.6 / 14.2 | 5.1 / 22.4 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 156 | 0.116 | 0.189 | 6.6 / 15.2 | 7.8 / 27.0 |
| TE | 353 | 0.068 | 0.086 | 56 | 0.042 | 0.044 | 5.1 / 15.2 | 4.4 / 14.7 |
| slot | 490 | 0.094 | 0.106 | 51 | 0.038 | 0.036 | 4.8 / 12.2 | 3.6 / 20.1 |
| wide | 181 | 0.035 | 0.040 | 26 | 0.019 | 0.008 | 5.3 / 12.3 | 2.0 / 7.9 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 100 | 0.074 | 0.112 | 6.3 / 14.7 | 7.0 / 26.5 |
| Cover-1 | 265 | 0.051 | 0.071 | 58 | 0.043 | 0.039 | 5.1 / 17.7 | 3.1 / 16.7 |
| Cover-2 | 299 | 0.058 | 0.069 | 30 | 0.022 | 0.028 | 5.3 / 12.3 | 5.2 / 13.8 |
| Quarters | 272 | 0.052 | 0.067 | 56 | 0.042 | 0.053 | 5.7 / 13.3 | 6.1 / 21.7 |
| Cover-6 | 178 | 0.034 | 0.045 | 26 | 0.019 | 0.026 | 5.6 / 13.9 | 6.0 / 18.6 |
| Cover-0 | 55 | 0.011 | 0.014 | 13 | 0.010 | 0.017 | 4.6 / 15.7 | 7.3 / 25.1 |
| 2-Man | 18 | 0.003 | 0.006 | 6 | 0.004 | 0.002 | 5.6 / 20.2 | 1.7 / 8.1 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 217 | 0.161 | 0.220 | 5.8 / 13.8 | 6.0 / 22.6 |
| True | 338 | 0.065 | 0.090 | 72 | 0.053 | 0.057 | 5.1 / 17.0 | 3.3 / 18.8 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 92 of 1347 (0.068; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.107.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.302 / 0.412 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.088 / 0.135 |
| deeper than 4 yd | 0.560 / 0.416 | 0.630 / 0.481 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 289 | 4.7 (2.6-7.2) | 0.63 / 1.34 | 2.8 | 0.28 / 0.24 / 0.48 | 0.20 / 0.80 | 5.1 / 11.8 / 22.4 | 0.318 | 0.62, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.228 |
| never reached | 0.097 | 0.042 |
| stopped (tackle or held for help) | 0.485 | 0.599 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.017 |
| beaten without contact | 0.112 | 0.114 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 289 | 6.4 (4.6-8.9) | 5.4 (3.1-8.9) | 17.7 (13.6-22.2) | 1.0 (-2.4-2.3) | 14.9 (11.0-18.5) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 129 | 4.3 (2.8-6.8) | 17.3 (13.6-20.7) | - | - |
| zone | 78 | 7.7 (5.7-9.5) | 18.1 (13.6-20.3) | 8.5 (4.0-8.5) | 14.7 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

289 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 82 | 0.28 | (no seat within 9 yd) |  |  |
| 23 | 0.08 | LB_W | man | man hips open |
| 22 | 0.08 | NB | man | man |
| 19 | 0.07 | SS | man | man hips open |
| 9 | 0.03 | NB | zone | zone (match) target Y |
