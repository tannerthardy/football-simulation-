## Flat catches: share of completions and of YAC, NFL vs ours

NFL 5189 completions, ours 1456 (24 default games). Flat = caught within 4 yd of the line and 8+ yd laterally from the ball; screens (proxy: behind the line, 2+ linemen 2+ yd downfield at the catch) are listed apart.

### By all

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| all flat (screens apart) | 1786 | 0.344 | 0.449 | 285 | 0.196 | 0.236 | 5.6 / 14.2 | 4.5 / 16.9 |

### By receiver type

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| back | 762 | 0.147 | 0.216 | 145 | 0.100 | 0.142 | 6.6 / 15.2 | 5.8 / 18.7 |
| TE | 353 | 0.068 | 0.086 | 79 | 0.054 | 0.049 | 5.1 / 15.2 | 4.2 / 11.2 |
| slot | 490 | 0.094 | 0.106 | 40 | 0.027 | 0.032 | 4.8 / 12.2 | 3.9 / 10.8 |
| wide | 181 | 0.035 | 0.040 | 21 | 0.014 | 0.013 | 5.3 / 12.3 | 1.8 / 5.3 |

### By coverage family

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| Cover-3 | 629 | 0.121 | 0.168 | 107 | 0.073 | 0.079 | 6.3 / 14.7 | 4.7 / 15.2 |
| Cover-1 | 265 | 0.051 | 0.071 | 48 | 0.033 | 0.038 | 5.1 / 17.7 | 2.4 / 12.9 |
| Cover-2 | 299 | 0.058 | 0.069 | 33 | 0.023 | 0.033 | 5.3 / 12.3 | 6.7 / 13.5 |
| Quarters | 272 | 0.052 | 0.067 | 49 | 0.034 | 0.047 | 5.7 / 13.3 | 4.1 / 19.8 |
| Cover-6 | 178 | 0.034 | 0.045 | 33 | 0.023 | 0.031 | 5.6 / 13.9 | 5.5 / 19.9 |
| Cover-0 | 55 | 0.011 | 0.014 | 9 | 0.006 | 0.005 | 4.6 / 15.7 | 4.7 / 8.4 |
| 2-Man | 18 | 0.003 | 0.006 | 6 | 0.004 | 0.002 | 5.6 / 20.2 | 2.1 / 7.3 |

### By man / zone

| group | NFL flat catches | NFL share of completions | NFL share of YAC | ours flat | ours share of completions | ours share of YAC | NFL YAC p50 / p90 | ours YAC p50 / p90 |
|---|---|---|---|---|---|---|---|---|
| False | 1448 | 0.279 | 0.359 | 223 | 0.153 | 0.191 | 5.8 / 13.8 | 5.0 / 17.3 |
| True | 338 | 0.065 | 0.090 | 62 | 0.043 | 0.045 | 5.1 / 17.0 | 2.7 / 10.7 |

Screens (apart from the flat rows): NFL by the proxy 136 of 5189 completions (0.026; a lower bound, since the proxy needs linemen downfield at the catch), ours 104 of 1456 (0.071; by the call's screen tag or the proxy). Share of all YAC from screens: NFL 0.042, ours 0.136.

Where the YAC comes from, by catch depth (screens apart): share of completions / share of YAC

| catch | NFL | ours |
|---|---|---|
| within 4 yd of the line, any width | 0.414 / 0.542 | 0.277 / 0.355 |
| within 4 yd of the line and inside 8 yd of the ball | 0.070 / 0.092 | 0.082 / 0.119 |
| deeper than 4 yd | 0.560 / 0.416 | 0.652 / 0.520 |

## At the catch (flat catches, screens apart): Defense's pursuit operator on rows built from the positions

| | n | nearest defender dist p50 (p25-p75) | defenders within 5 yd / within 8 yd (mean) | nearest closing speed p50 yd/s | nearest: ahead / level / behind | nearest: outside / inside | YAC p50 / p75 / p90 | share 10+ yd | first defender within 1 yd: share, time p50 (s) |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 1772 | 4.3 (2.6-6.4) | 0.73 / 1.55 | 3.2 | 0.34 / 0.31 / 0.35 | 0.29 / 0.71 | 5.6 / 9.4 / 14.2 | 0.221 | 0.67, 0.7 |
| ours | 285 | 4.8 (2.3-7.1) | 0.59 / 1.24 | 3.1 | 0.27 / 0.26 / 0.47 | 0.20 / 0.80 | 4.5 / 8.6 / 16.9 | 0.218 | 0.70, 0.6 |

### First-defender outcome (Defense's classes), share of flat catches

| outcome | NFL | ours |
|---|---|---|
| trailing from the catch (never level) | 0.123 | 0.161 |
| never reached | 0.097 | 0.042 |
| stopped (tackle or held for help) | 0.485 | 0.670 |
| contact, then play ended elsewhere | 0.021 | 0.004 |
| missed (contact range, then beaten) | 0.162 | 0.025 |
| beaten without contact | 0.112 | 0.098 |

## At the throw (flat catches, screens apart): the nearest non-lineman defender to the receiver

| | n | nearest dist p50 (p25-p75) | his depth p50 (p25-p75) | his width from the sideline | receiver depth | receiver width |
|---|---|---|---|---|---|---|
| NFL | 1786 | 6.2 (4.3-8.4) | 3.7 (-0.8-6.3) | 18.1 (14.3-22.3) | -1.1 (-3.2-1.1) | 16.0 (13.1-19.1) |
| ours | 285 | 6.8 (4.6-9.7) | 5.9 (3.4-8.1) | 18.6 (14.4-22.6) | 0.8 (-2.8-2.1) | 15.7 (11.8-18.9) |

Ours, the owning seat at the throw (where he stood, and for a zone seat where his landmark is):

| owner | n | his depth p50 (p25-p75) | his width from the sideline | landmark depth | landmark width |
|---|---|---|---|---|---|
| man | 143 | 5.4 (3.1-7.7) | 19.2 (15.8-21.8) | - | - |
| zone | 69 | 7.6 (6.5-9.3) | 17.5 (13.8-20.2) | 6.7 (4.0-8.5) | 14.5 (9.0-17.8) |

## Ours: the seat that owned the flat by the call, and what he was doing at the throw (top cases by count)

285 flat catches.

| count | share | seat | kind | technique label |
|---|---|---|---|---|
| 73 | 0.26 | (no seat within 9 yd) |  |  |
| 30 | 0.11 | NB | man | man |
| 18 | 0.06 | SS | man | man |
| 16 | 0.06 | SS | man | man hips open |
| 15 | 0.05 | LB_W | man | man hips open |
