## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1490 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 273 | 0.183 | 0.218 | 5.6 / 14.2 | 4.2 / 17.4 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 136 | 0.091 | 0.123 | 6.6 / 15.2 | 5.3 / 18.1 |
| TE | 353 | 0.068 | 0.086 | 80 | 0.054 | 0.045 | 5.1 / 15.2 | 3.2 / 10.0 |
| slot | 490 | 0.094 | 0.106 | 41 | 0.028 | 0.044 | 4.8 / 12.2 | 4.2 / 20.4 |
| wide | 181 | 0.035 | 0.040 | 16 | 0.011 | 0.006 | 5.3 / 12.3 | 1.2 / 8.8 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 100 | 0.067 | 0.071 | 6.3 / 14.7 | 4.2 / 12.4 |
| Cover-1 | 265 | 0.051 | 0.071 | 55 | 0.037 | 0.028 | 5.1 / 17.7 | 2.4 / 7.9 |
| Cover-2 | 299 | 0.058 | 0.069 | 43 | 0.029 | 0.036 | 5.3 / 12.3 | 5.4 / 16.9 |
| Quarters | 272 | 0.052 | 0.067 | 34 | 0.023 | 0.046 | 5.7 / 13.3 | 10.0 / 20.0 |
| Cover-6 | 178 | 0.034 | 0.045 | 34 | 0.023 | 0.031 | 5.6 / 13.9 | 3.6 / 17.9 |
| Cover-0 | 55 | 0.011 | 0.014 | 7 | 0.005 | 0.005 | 4.6 / 15.7 | 5.9 / 9.9 |
| 2-Man | 18 | 0.003 | 0.006 | 0 | 0.000 | 0.000 | 5.6 / 20.2 | nan / nan |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 216 | 0.145 | 0.186 | 5.8 / 13.8 | 4.6 / 18.1 |
| True | 338 | 0.065 | 0.090 | 57 | 0.038 | 0.032 | 5.1 / 17.0 | 2.5 / 9.2 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 88 of 1490 (0.059; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.082.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.271 / 0.333 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.088 / 0.115 |
| deeper than 4 yd | 0.560 / 0.416 | 0.670 / 0.585 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 273 | 4.5 (2.4-6.9) | 0.64 / 1.36 | 3.0 | 0.34 / 0.21 / 0.45 | 0.22 / 0.78 | 4.2 / 8.4 / 17.4 | 0.205 | 0.64, 0.7 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.183 |
| never reached | 0.097 | 0.077 |
| stopped (tackle or held for help) | 0.485 | 0.623 |
| contact, then play ended elsewhere | 0.021 | 0.004 |
| missed (contact range, then beaten) | 0.162 | 0.011 |
| beaten without contact | 0.112 | 0.103 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 273 | 6.4 (4.3-8.5) | 5.2 (3.4-7.6) | 18.3 (14.6-22.1) | 1.2 (-3.3-2.2) | 15.4 (11.8-18.9) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 137 | 4.7 (2.9-6.3) | 17.4 (14.8-20.8) | - | - |
| zone | 78 | 7.3 (5.0-9.9) | 16.5 (12.6-21.1) | 7.7 (4.0-8.5) | 12.8 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

273 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 58 | 0.21 | (no seat within 9 yd) |  |  |
| 24 | 0.09 | NB | man | man |
| 21 | 0.08 | LB_M | man | man |
| 17 | 0.06 | LB_W | man | man hips open |
| 14 | 0.05 | SS | man | man hips open |
