## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1385 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 309 | 0.223 | 0.253 | 5.6 / 14.2 | 4.5 / 17.2 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 143 | 0.103 | 0.168 | 6.6 / 15.2 | 7.2 / 23.7 |
| TE | 353 | 0.068 | 0.086 | 89 | 0.064 | 0.044 | 5.1 / 15.2 | 3.6 / 10.1 |
| slot | 490 | 0.094 | 0.106 | 58 | 0.042 | 0.036 | 4.8 / 12.2 | 2.5 / 14.9 |
| wide | 181 | 0.035 | 0.040 | 19 | 0.014 | 0.004 | 5.3 / 12.3 | 0.9 / 6.3 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 96 | 0.069 | 0.086 | 6.3 / 14.7 | 5.0 / 19.1 |
| Cover-1 | 265 | 0.051 | 0.071 | 63 | 0.045 | 0.044 | 5.1 / 17.7 | 3.3 / 15.9 |
| Cover-2 | 299 | 0.058 | 0.069 | 43 | 0.031 | 0.029 | 5.3 / 12.3 | 4.8 / 10.9 |
| Quarters | 272 | 0.052 | 0.067 | 60 | 0.043 | 0.053 | 5.7 / 13.3 | 4.9 / 17.1 |
| Cover-6 | 178 | 0.034 | 0.045 | 28 | 0.020 | 0.025 | 5.6 / 13.9 | 5.0 / 16.1 |
| Cover-0 | 55 | 0.011 | 0.014 | 12 | 0.009 | 0.014 | 4.6 / 15.7 | 5.2 / 25.1 |
| 2-Man | 18 | 0.003 | 0.006 | 7 | 0.005 | 0.002 | 5.6 / 20.2 | 1.8 / 6.8 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 231 | 0.167 | 0.196 | 5.8 / 13.8 | 5.0 / 17.0 |
| True | 338 | 0.065 | 0.090 | 78 | 0.056 | 0.057 | 5.1 / 17.0 | 3.1 / 17.6 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 93 of 1385 (0.067; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.114.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.309 / 0.360 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.086 / 0.108 |
| deeper than 4 yd | 0.560 / 0.416 | 0.625 / 0.532 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 309 | 4.7 (2.3-7.3) | 0.63 / 1.24 | 2.9 | 0.35 / 0.26 / 0.39 | 0.23 / 0.77 | 4.5 / 9.2 / 17.2 | 0.223 | 0.64, 0.7 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.155 |
| never reached | 0.097 | 0.065 |
| stopped (tackle or held for help) | 0.485 | 0.625 |
| contact, then play ended elsewhere | 0.021 | 0.003 |
| missed (contact range, then beaten) | 0.162 | 0.010 |
| beaten without contact | 0.112 | 0.142 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 309 | 6.2 (4.4-8.6) | 5.6 (3.2-8.5) | 18.0 (14.4-22.0) | 1.3 (-2.1-2.4) | 15.4 (11.9-18.2) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 136 | 3.8 (2.9-6.3) | 17.7 (14.5-21.1) | - | - |
| zone | 93 | 7.8 (6.0-9.3) | 16.1 (11.6-20.5) | 8.5 (4.0-8.5) | 12.0 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

309 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 80 | 0.26 | (no seat within 9 yd) |  |  |
| 18 | 0.06 | LB_W | man | man hips open |
| 16 | 0.05 | NB | man | man |
| 16 | 0.05 | SS | man | man hips open |
| 11 | 0.04 | NB | man | man hips open |
