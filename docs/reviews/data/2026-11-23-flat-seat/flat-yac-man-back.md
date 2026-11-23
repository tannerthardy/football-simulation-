## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1480 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 282 | 0.191 | 0.225 | 5.6 / 14.2 | 4.7 / 18.7 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 138 | 0.093 | 0.151 | 6.6 / 15.2 | 6.5 / 27.3 |
| TE | 353 | 0.068 | 0.086 | 73 | 0.049 | 0.040 | 5.1 / 15.2 | 4.5 / 12.2 |
| slot | 490 | 0.094 | 0.106 | 48 | 0.032 | 0.025 | 4.8 / 12.2 | 2.2 / 10.1 |
| wide | 181 | 0.035 | 0.040 | 23 | 0.016 | 0.009 | 5.3 / 12.3 | 2.2 / 8.2 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 99 | 0.067 | 0.090 | 6.3 / 14.7 | 4.9 / 22.2 |
| Cover-1 | 265 | 0.051 | 0.071 | 59 | 0.040 | 0.031 | 5.1 / 17.7 | 3.6 / 15.7 |
| Cover-2 | 299 | 0.058 | 0.069 | 42 | 0.028 | 0.040 | 5.3 / 12.3 | 6.9 / 25.8 |
| Quarters | 272 | 0.052 | 0.067 | 46 | 0.031 | 0.044 | 5.7 / 13.3 | 4.3 / 30.7 |
| Cover-6 | 178 | 0.034 | 0.045 | 22 | 0.015 | 0.015 | 5.6 / 13.9 | 6.5 / 11.2 |
| Cover-0 | 55 | 0.011 | 0.014 | 12 | 0.008 | 0.005 | 4.6 / 15.7 | 3.0 / 13.7 |
| 2-Man | 18 | 0.003 | 0.006 | 2 | 0.001 | 0.000 | 5.6 / 20.2 | 1.0 / 1.0 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 210 | 0.142 | 0.190 | 5.8 / 13.8 | 5.5 / 24.8 |
| True | 338 | 0.065 | 0.090 | 72 | 0.049 | 0.036 | 5.1 / 17.0 | 3.6 / 15.6 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 87 of 1480 (0.059; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.118.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.293 / 0.347 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.103 / 0.122 |
| deeper than 4 yd | 0.560 / 0.416 | 0.649 / 0.535 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 282 | 4.4 (2.1-6.5) | 0.62 / 1.27 | 3.0 | 0.32 / 0.24 / 0.44 | 0.19 / 0.81 | 4.7 / 9.8 / 18.7 | 0.241 | 0.63, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.117 |
| never reached | 0.097 | 0.082 |
| stopped (tackle or held for help) | 0.485 | 0.617 |
| contact, then play ended elsewhere | 0.021 | 0.000 |
| missed (contact range, then beaten) | 0.162 | 0.018 |
| beaten without contact | 0.112 | 0.167 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 282 | 6.3 (4.4-8.6) | 5.9 (3.6-8.5) | 16.9 (13.4-20.9) | 1.3 (-1.6-2.4) | 14.5 (11.2-18.7) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 148 | 5.2 (3.2-7.6) | 17.3 (13.9-21.2) | - | - |
| zone | 72 | 8.2 (4.3-9.6) | 17.4 (12.9-22.6) | 4.3 (4.0-8.5) | 9.0 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

282 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 62 | 0.22 | (no seat within 9 yd) |  |  |
| 31 | 0.11 | NB | man | man |
| 24 | 0.09 | SS | man | man hips open |
| 13 | 0.05 | SS | man | man |
| 12 | 0.04 | LB_M | man | man |
