## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1444 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 298 | 0.206 | 0.267 | 5.6 / 14.2 | 4.4 / 15.4 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 150 | 0.104 | 0.171 | 6.6 / 15.2 | 6.1 / 20.7 |
| TE | 353 | 0.068 | 0.086 | 81 | 0.056 | 0.038 | 5.1 / 15.2 | 3.7 / 11.0 |
| slot | 490 | 0.094 | 0.106 | 51 | 0.035 | 0.049 | 4.8 / 12.2 | 4.3 / 13.9 |
| wide | 181 | 0.035 | 0.040 | 16 | 0.011 | 0.009 | 5.3 / 12.3 | 0.8 / 5.0 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 94 | 0.065 | 0.095 | 6.3 / 14.7 | 5.0 / 20.4 |
| Cover-1 | 265 | 0.051 | 0.071 | 76 | 0.053 | 0.052 | 5.1 / 17.7 | 3.7 / 15.4 |
| Cover-2 | 299 | 0.058 | 0.069 | 43 | 0.030 | 0.029 | 5.3 / 12.3 | 6.0 / 11.3 |
| Quarters | 272 | 0.052 | 0.067 | 35 | 0.024 | 0.054 | 5.7 / 13.3 | 6.3 / 50.0 |
| Cover-6 | 178 | 0.034 | 0.045 | 28 | 0.019 | 0.022 | 5.6 / 13.9 | 3.8 / 14.8 |
| Cover-0 | 55 | 0.011 | 0.014 | 15 | 0.010 | 0.013 | 4.6 / 15.7 | 4.4 / 11.3 |
| 2-Man | 18 | 0.003 | 0.006 | 7 | 0.005 | 0.002 | 5.6 / 20.2 | 1.7 / 6.0 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 206 | 0.143 | 0.203 | 5.8 / 13.8 | 4.7 / 15.2 |
| True | 338 | 0.065 | 0.090 | 92 | 0.064 | 0.064 | 5.1 / 17.0 | 4.1 / 15.2 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 118 of 1444 (0.082; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.127.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.306 / 0.388 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.100 / 0.121 |
| deeper than 4 yd | 0.560 / 0.416 | 0.612 / 0.485 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 298 | 4.6 (2.5-6.7) | 0.63 / 1.35 | 3.0 | 0.30 / 0.28 / 0.42 | 0.16 / 0.84 | 4.4 / 9.0 / 15.4 | 0.228 | 0.65, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.168 |
| never reached | 0.097 | 0.054 |
| stopped (tackle or held for help) | 0.485 | 0.628 |
| contact, then play ended elsewhere | 0.021 | 0.007 |
| missed (contact range, then beaten) | 0.162 | 0.020 |
| beaten without contact | 0.112 | 0.124 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 298 | 6.0 (4.4-8.4) | 4.7 (2.9-6.6) | 18.0 (14.4-21.7) | 1.0 (-3.1-2.2) | 15.5 (11.8-18.1) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 172 | 4.3 (2.8-6.5) | 18.2 (14.8-21.7) | - | - |
| zone | 74 | 7.5 (5.4-9.9) | 14.8 (11.6-19.1) | 4.0 (4.0-8.5) | 9.0 (9.0-14.7) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

298 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 52 | 0.17 | (no seat within 9 yd) |  |  |
| 25 | 0.08 | SS | man | man hips open |
| 25 | 0.08 | LB_M | man | man |
| 25 | 0.08 | LB_W | man | man hips open |
| 24 | 0.08 | NB | man | man |
