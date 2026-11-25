## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1389 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 314 | 0.226 | 0.266 | 5.6 / 14.2 | 4.3 / 17.8 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 149 | 0.107 | 0.156 | 6.6 / 15.2 | 5.4 / 20.5 |
| TE | 353 | 0.068 | 0.086 | 92 | 0.066 | 0.057 | 5.1 / 15.2 | 4.8 / 12.0 |
| slot | 490 | 0.094 | 0.106 | 46 | 0.033 | 0.041 | 4.8 / 12.2 | 3.2 / 15.8 |
| wide | 181 | 0.035 | 0.040 | 27 | 0.019 | 0.012 | 5.3 / 12.3 | 2.2 / 5.1 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 117 | 0.084 | 0.100 | 6.3 / 14.7 | 5.2 / 17.6 |
| Cover-1 | 265 | 0.051 | 0.071 | 60 | 0.043 | 0.027 | 5.1 / 17.7 | 2.1 / 9.7 |
| Cover-2 | 299 | 0.058 | 0.069 | 47 | 0.034 | 0.069 | 5.3 / 12.3 | 7.6 / 36.2 |
| Quarters | 272 | 0.052 | 0.067 | 51 | 0.037 | 0.037 | 5.7 / 13.3 | 3.9 / 17.5 |
| Cover-6 | 178 | 0.034 | 0.045 | 27 | 0.019 | 0.031 | 5.6 / 13.9 | 5.3 / 16.6 |
| Cover-0 | 55 | 0.011 | 0.014 | 10 | 0.007 | 0.003 | 4.6 / 15.7 | 1.8 / 5.1 |
| 2-Man | 18 | 0.003 | 0.006 | 2 | 0.001 | 0.000 | 5.6 / 20.2 | 0.8 / 0.8 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 246 | 0.177 | 0.238 | 5.8 / 13.8 | 5.2 / 20.0 |
| True | 338 | 0.065 | 0.090 | 68 | 0.049 | 0.029 | 5.1 / 17.0 | 2.1 / 7.8 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 87 of 1389 (0.063; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.104.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.318 / 0.412 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.092 / 0.145 |
| deeper than 4 yd | 0.560 / 0.416 | 0.620 / 0.484 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 314 | 4.9 (2.3-7.7) | 0.59 / 1.31 | 3.3 | 0.30 / 0.24 / 0.46 | 0.21 / 0.79 | 4.3 / 8.6 / 17.8 | 0.210 | 0.67, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.188 |
| never reached | 0.097 | 0.051 |
| stopped (tackle or held for help) | 0.485 | 0.659 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.013 |
| beaten without contact | 0.112 | 0.089 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 314 | 6.7 (4.7-9.5) | 6.6 (4.3-8.7) | 17.2 (13.7-21.3) | 1.3 (-1.5-2.3) | 14.9 (11.0-18.1) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 143 | 5.7 (3.8-8.0) | 17.9 (14.2-21.4) | - | - |
| zone | 83 | 8.0 (6.4-10.1) | 16.3 (13.2-19.2) | 4.0 (4.0-8.5) | 9.0 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

314 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 88 | 0.28 | (no seat within 9 yd) |  |  |
| 31 | 0.10 | NB | man | man |
| 20 | 0.06 | SS | man | man hips open |
| 18 | 0.06 | LB_W | man | man hips open |
| 10 | 0.03 | LB_M | man | man |
