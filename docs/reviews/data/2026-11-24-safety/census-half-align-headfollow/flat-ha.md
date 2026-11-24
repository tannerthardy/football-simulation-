## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1487 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 329 | 0.221 | 0.235 | 5.6 / 14.2 | 3.6 / 15.2 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 170 | 0.114 | 0.145 | 6.6 / 15.2 | 5.2 / 19.8 |
| TE | 353 | 0.068 | 0.086 | 81 | 0.054 | 0.036 | 5.1 / 15.2 | 2.4 / 8.9 |
| slot | 490 | 0.094 | 0.106 | 50 | 0.034 | 0.042 | 4.8 / 12.2 | 2.9 / 27.1 |
| wide | 181 | 0.035 | 0.040 | 28 | 0.019 | 0.012 | 5.3 / 12.3 | 1.3 / 7.0 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 113 | 0.076 | 0.096 | 6.3 / 14.7 | 4.5 / 19.4 |
| Cover-1 | 265 | 0.051 | 0.071 | 75 | 0.050 | 0.036 | 5.1 / 17.7 | 2.6 / 10.4 |
| Cover-2 | 299 | 0.058 | 0.069 | 39 | 0.026 | 0.026 | 5.3 / 12.3 | 5.2 / 12.0 |
| Quarters | 272 | 0.052 | 0.067 | 56 | 0.038 | 0.047 | 5.7 / 13.3 | 4.0 / 23.2 |
| Cover-6 | 178 | 0.034 | 0.045 | 31 | 0.021 | 0.023 | 5.6 / 13.9 | 2.9 / 17.2 |
| Cover-0 | 55 | 0.011 | 0.014 | 8 | 0.005 | 0.003 | 4.6 / 15.7 | 3.0 / 9.1 |
| 2-Man | 18 | 0.003 | 0.006 | 7 | 0.005 | 0.004 | 5.6 / 20.2 | 5.7 / 7.4 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 244 | 0.164 | 0.193 | 5.8 / 13.8 | 4.1 / 17.9 |
| True | 338 | 0.065 | 0.090 | 85 | 0.057 | 0.042 | 5.1 / 17.0 | 2.9 / 10.4 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 90 of 1487 (0.061; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.105.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.315 / 0.372 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.094 / 0.137 |
| deeper than 4 yd | 0.560 / 0.416 | 0.624 / 0.524 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 329 | 4.3 (2.3-6.2) | 0.69 / 1.45 | 3.1 | 0.36 / 0.23 / 0.41 | 0.21 / 0.79 | 3.6 / 7.7 / 15.2 | 0.179 | 0.70, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.155 |
| never reached | 0.097 | 0.058 |
| stopped (tackle or held for help) | 0.485 | 0.684 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.015 |
| beaten without contact | 0.112 | 0.088 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 329 | 5.9 (4.4-8.2) | 5.0 (2.9-7.4) | 17.8 (14.0-21.4) | 1.0 (-3.2-2.2) | 15.0 (11.7-18.7) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 190 | 4.4 (2.8-6.3) | 18.2 (14.8-21.3) | - | - |
| zone | 89 | 7.3 (4.8-9.3) | 16.6 (12.1-20.0) | 8.5 (4.0-8.5) | 12.0 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

329 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 50 | 0.15 | (no seat within 9 yd) |  |  |
| 28 | 0.09 | NB | man | man |
| 26 | 0.08 | LB_W | man | man hips open |
| 23 | 0.07 | LB_M | man | man |
| 20 | 0.06 | LB_W | man | man |
