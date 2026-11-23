## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1403 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 237 | 0.169 | 0.204 | 5.6 / 14.2 | 4.3 / 18.9 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 107 | 0.076 | 0.115 | 6.6 / 15.2 | 7.2 / 24.6 |
| TE | 353 | 0.068 | 0.086 | 63 | 0.045 | 0.042 | 5.1 / 15.2 | 3.2 / 15.4 |
| slot | 490 | 0.094 | 0.106 | 45 | 0.032 | 0.037 | 4.8 / 12.2 | 2.6 / 18.1 |
| wide | 181 | 0.035 | 0.040 | 22 | 0.016 | 0.009 | 5.3 / 12.3 | 1.8 / 6.6 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 89 | 0.063 | 0.079 | 6.3 / 14.7 | 4.8 / 15.6 |
| Cover-1 | 265 | 0.051 | 0.071 | 44 | 0.031 | 0.040 | 5.1 / 17.7 | 2.7 / 25.0 |
| Cover-2 | 299 | 0.058 | 0.069 | 27 | 0.019 | 0.034 | 5.3 / 12.3 | 8.9 / 26.7 |
| Quarters | 272 | 0.052 | 0.067 | 41 | 0.029 | 0.028 | 5.7 / 13.3 | 2.6 / 17.5 |
| Cover-6 | 178 | 0.034 | 0.045 | 26 | 0.019 | 0.017 | 5.6 / 13.9 | 5.1 / 10.5 |
| Cover-0 | 55 | 0.011 | 0.014 | 6 | 0.004 | 0.006 | 4.6 / 15.7 | 3.7 / 24.4 |
| 2-Man | 18 | 0.003 | 0.006 | 4 | 0.003 | 0.000 | 5.6 / 20.2 | 0.4 / 1.6 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 185 | 0.132 | 0.162 | 5.8 / 13.8 | 4.9 / 18.3 |
| True | 338 | 0.065 | 0.090 | 52 | 0.037 | 0.042 | 5.1 / 17.0 | 2.1 / 23.7 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 100 of 1403 (0.071; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.111.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.272 / 0.317 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.103 / 0.113 |
| deeper than 4 yd | 0.560 / 0.416 | 0.659 / 0.574 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 237 | 4.5 (2.5-6.9) | 0.67 / 1.32 | 2.9 | 0.24 / 0.21 / 0.54 | 0.16 / 0.84 | 4.3 / 11.2 / 18.9 | 0.283 | 0.63, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.207 |
| never reached | 0.097 | 0.059 |
| stopped (tackle or held for help) | 0.485 | 0.599 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.030 |
| beaten without contact | 0.112 | 0.105 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 237 | 6.6 (4.4-8.8) | 5.7 (3.9-8.4) | 18.7 (14.8-22.8) | 1.3 (-2.1-2.7) | 16.0 (11.9-18.9) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 120 | 5.3 (3.6-7.9) | 19.0 (15.5-22.8) | - | - |
| zone | 58 | 7.8 (5.2-10.0) | 17.4 (13.0-20.2) | 8.5 (4.0-10.0) | 12.0 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

237 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 59 | 0.25 | (no seat within 9 yd) |  |  |
| 28 | 0.12 | NB | man | man |
| 14 | 0.06 | SS | man | man hips open |
| 13 | 0.05 | LB_W | man | man |
| 10 | 0.04 | LB_M | man | man |
