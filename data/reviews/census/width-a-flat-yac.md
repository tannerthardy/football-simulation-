## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1468 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 304 | 0.207 | 0.262 | 5.6 / 14.2 | 4.7 / 17.1 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 155 | 0.106 | 0.161 | 6.6 / 15.2 | 6.3 / 19.8 |
| TE | 353 | 0.068 | 0.086 | 79 | 0.054 | 0.046 | 5.1 / 15.2 | 3.1 / 10.9 |
| slot | 490 | 0.094 | 0.106 | 50 | 0.034 | 0.044 | 4.8 / 12.2 | 3.9 / 14.0 |
| wide | 181 | 0.035 | 0.040 | 20 | 0.014 | 0.011 | 5.3 / 12.3 | 1.5 / 4.4 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 105 | 0.072 | 0.077 | 6.3 / 14.7 | 4.0 / 14.7 |
| Cover-1 | 265 | 0.051 | 0.071 | 53 | 0.036 | 0.045 | 5.1 / 17.7 | 2.7 / 17.0 |
| Cover-2 | 299 | 0.058 | 0.069 | 38 | 0.026 | 0.041 | 5.3 / 12.3 | 7.8 / 14.2 |
| Quarters | 272 | 0.052 | 0.067 | 51 | 0.035 | 0.058 | 5.7 / 13.3 | 5.6 / 22.9 |
| Cover-6 | 178 | 0.034 | 0.045 | 40 | 0.027 | 0.034 | 5.6 / 13.9 | 5.0 / 19.6 |
| Cover-0 | 55 | 0.011 | 0.014 | 10 | 0.007 | 0.005 | 4.6 / 15.7 | 2.2 / 8.5 |
| 2-Man | 18 | 0.003 | 0.006 | 7 | 0.005 | 0.003 | 5.6 / 20.2 | 2.7 / 7.1 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 237 | 0.161 | 0.211 | 5.8 / 13.8 | 5.3 / 17.3 |
| True | 338 | 0.065 | 0.090 | 67 | 0.046 | 0.051 | 5.1 / 17.0 | 2.7 / 13.5 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 91 of 1468 (0.062; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.100.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.290 / 0.380 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.083 / 0.118 |
| deeper than 4 yd | 0.560 / 0.416 | 0.649 / 0.521 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 304 | 4.4 (1.9-6.9) | 0.63 / 1.23 | 3.0 | 0.26 / 0.29 / 0.45 | 0.22 / 0.78 | 4.7 / 9.3 / 17.1 | 0.237 | 0.69, 0.5 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.155 |
| never reached | 0.097 | 0.046 |
| stopped (tackle or held for help) | 0.485 | 0.671 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.023 |
| beaten without contact | 0.112 | 0.105 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 304 | 6.5 (4.4-9.3) | 5.8 (3.4-7.9) | 18.3 (14.4-22.2) | 0.9 (-2.9-2.2) | 15.6 (11.8-18.8) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 156 | 5.2 (3.0-7.0) | 18.6 (15.3-21.3) | - | - |
| zone | 74 | 7.8 (6.2-9.7) | 17.3 (13.0-20.2) | 5.5 (4.0-8.5) | 9.0 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

304 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 74 | 0.24 | (no seat within 9 yd) |  |  |
| 35 | 0.12 | NB | man | man |
| 19 | 0.06 | SS | man | man hips open |
| 19 | 0.06 | SS | man | man |
| 16 | 0.05 | LB_W | man | man hips open |
