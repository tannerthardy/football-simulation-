## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1449 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 311 | 0.215 | 0.241 | 5.6 / 14.2 | 4.8 / 20.2 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 160 | 0.110 | 0.164 | 6.6 / 15.2 | 6.9 / 24.7 |
| TE | 353 | 0.068 | 0.086 | 74 | 0.051 | 0.041 | 5.1 / 15.2 | 4.1 / 14.0 |
| slot | 490 | 0.094 | 0.106 | 46 | 0.032 | 0.031 | 4.8 / 12.2 | 3.8 / 11.8 |
| wide | 181 | 0.035 | 0.040 | 31 | 0.021 | 0.006 | 5.3 / 12.3 | 1.2 / 4.2 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 115 | 0.079 | 0.084 | 6.3 / 14.7 | 4.9 / 22.7 |
| Cover-1 | 265 | 0.051 | 0.071 | 59 | 0.041 | 0.041 | 5.1 / 17.7 | 2.8 / 20.3 |
| Cover-2 | 299 | 0.058 | 0.069 | 32 | 0.022 | 0.027 | 5.3 / 12.3 | 6.6 / 14.7 |
| Quarters | 272 | 0.052 | 0.067 | 53 | 0.037 | 0.056 | 5.7 / 13.3 | 5.5 / 31.0 |
| Cover-6 | 178 | 0.034 | 0.045 | 34 | 0.023 | 0.022 | 5.6 / 13.9 | 5.2 / 15.9 |
| Cover-0 | 55 | 0.011 | 0.014 | 11 | 0.008 | 0.010 | 4.6 / 15.7 | 4.9 / 17.1 |
| 2-Man | 18 | 0.003 | 0.006 | 7 | 0.005 | 0.001 | 5.6 / 20.2 | 1.3 / 3.9 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 237 | 0.164 | 0.189 | 5.8 / 13.8 | 5.3 / 20.7 |
| True | 338 | 0.065 | 0.090 | 74 | 0.051 | 0.052 | 5.1 / 17.0 | 3.5 / 19.8 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 96 of 1449 (0.066; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.094.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.304 / 0.356 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.090 / 0.115 |
| deeper than 4 yd | 0.560 / 0.416 | 0.630 / 0.550 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 311 | 4.3 (2.3-6.5) | 0.69 / 1.32 | 3.2 | 0.32 / 0.24 / 0.44 | 0.17 / 0.83 | 4.8 / 9.9 / 20.2 | 0.248 | 0.66, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.174 |
| never reached | 0.097 | 0.058 |
| stopped (tackle or held for help) | 0.485 | 0.643 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.016 |
| beaten without contact | 0.112 | 0.109 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 311 | 6.1 (4.4-8.7) | 5.8 (3.1-9.0) | 17.4 (13.6-21.2) | 1.0 (-2.4-2.4) | 15.0 (11.5-18.6) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 151 | 4.5 (2.7-7.2) | 18.3 (13.8-21.2) | - | - |
| zone | 85 | 7.2 (5.0-9.2) | 16.9 (13.5-19.8) | 8.5 (4.8-8.5) | 14.7 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

311 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 75 | 0.24 | (no seat within 9 yd) |  |  |
| 27 | 0.09 | NB | man | man |
| 21 | 0.07 | LB_W | man | man hips open |
| 18 | 0.06 | SS | man | man hips open |
| 15 | 0.05 | LB_M | man | man |
