# Route timing: NFL vs sim, stem-and-break routes (2026-11-18)

Integration's question after the QB lane found smash's corner breaks late. One operator on both sides
(`scripts/diag/routes/route_timing.py`): depth past the line at 1.0-3.0 s after the snap (frames before the throw only);
the break = first sustained turn of more than 35 deg off the stem (0.5-0.8 s heading) after 0.8 s; speed over the 0.3 s
before it. NFL: BDB 2025 week 1, traditional dropbacks, no play action, PFF `routeRan` (`nfl` mode). Sim: staged
non-play-action concepts x cover3/4/2/1 x gun doubles/trips x 2 seeds x flip on the engine defaults
(`scripts/diag/routes/route-export.mts`). PFF has no comeback, sail or curl label: curl = HITCH breaking at 9+ yd,
sail = OUT breaking at 10+. Medians.

## All routes of each label
| route | src | n | d@1s | d@1.5s | d@2s | d@2.5s | d@3s | break t | break d | v into break |
|---|---|---|---|---|---|---|---|---|---|---|
| corner | NFL | 143 | 0.9 | 3.5 | 6.7 | 9.8 | 13.4 | 2.30 | 9.3 | 6.9 |
| corner | sim | 144 | 0.5 | 3.0 | 6.0 | 9.4 | 12.3 | 2.92 | 12.1 | 5.9 |
| post | NFL | 213 | 1.1 | 3.8 | 7.1 | 10.2 | 13.5 | 2.30 | 9.6 | 6.3 |
| post | sim | 96 | 0.7 | 3.2 | 6.2 | 10.0 | 13.2 | 2.45 | 9.5 | 5.6 |
| dig | NFL | 328 | 0.9 | 3.2 | 5.9 | 8.9 | 11.2 | 2.20 | 6.2 | 4.6 |
| dig | sim | 160 | 0.5 | 3.0 | 5.8 | 9.2 | 11.6 | 3.10 | 12.2 | 4.5 |
| out | NFL | 401 | 0.2 | 2.2 | 4.1 | 5.2 | 5.1 | 1.80 | 3.3 | 4.4 |
| out | sim | 144 | 0.3 | 2.7 | 5.8 | 8.8 | 9.6 | 3.20 | 10.4 | 2.8 |
| comeback | sim | 64 | 0.8 | 3.2 | 6.3 | 9.8 | 13.2 | 3.50 | 15.7 | 2.4 |
| curl | NFL | 55 | 1.4 | 4.1 | 7.4 | 10.2 | 11.9 | 2.90 | 11.3 | 3.7 |
| curl | sim | 64 | 0.8 | 3.2 | 6.3 | 9.6 | 11.4 | - | - | - |
| sail | NFL | 33 | 1.5 | 4.6 | 8.0 | 10.9 | 13.3 | 2.70 | 11.9 | 6.6 |
| over | NFL | 263 | 0.2 | 1.8 | 3.4 | 4.7 | 5.2 | 1.80 | 2.6 | 5.5 |
| over | sim | 96 | 0.1 | 2.3 | 4.8 | 6.9 | 8.7 | 2.05 | 5.3 | 5.6 |
| hitch | NFL | 602 | 0.5 | 2.6 | 4.7 | 6.5 | 6.6 | 2.00 | 4.1 | 3.1 |
| hitch | sim | 560 | 0.4 | 2.6 | 4.9 | 5.7 | 5.4 | 2.35 | 5.6 | 1.8 |

## NFL routes of the same label breaking within 1.5 yd of our median break depth
| route | src | n | d@1s | d@1.5s | d@2s | d@2.5s | d@3s | break t | break d | v into break |
|---|---|---|---|---|---|---|---|---|---|---|
| corner | NFL@12.1yd | 11 | 1.1 | 3.5 | 6.5 | 10.3 | 12.5 | 2.90 | 12.2 | 7.3 |
| post | NFL@9.5yd | 14 | 0.9 | 3.7 | 7.0 | 10.2 | 13.0 | 2.50 | 9.6 | 6.7 |
| dig | NFL@12.2yd | 29 | 1.5 | 4.1 | 7.5 | 10.5 | 12.4 | 2.80 | 11.9 | 6.0 |
| out | NFL@10.4yd | 26 | 1.4 | 4.0 | 7.2 | 10.0 | 11.9 | 2.50 | 10.3 | 6.4 |
| comeback | NFL@15.7yd | 4 | - | - | - | - | - | - | - | - |
| curl | NFL@11.0yd | 29 | 1.4 | 4.1 | 7.4 | 9.9 | 11.2 | 2.80 | 10.8 | 3.7 |
| over | NFL@5.3yd | 29 | 0.7 | 2.7 | 4.3 | 5.7 | 6.3 | 2.20 | 5.2 | 6.4 |
| hitch | NFL@5.6yd | 78 | 0.7 | 2.7 | 4.7 | 5.5 | 5.8 | 2.30 | 5.2 | 2.7 |

## Reading
- Corner: at the same break depth (12 yd) ours breaks on NFL time (2.92 vs 2.90 s). It breaks late against the median
  NFL corner because our playbook's corner breaks at 11-12 yd (`routes.ts` corner `{ d: 11 }`, measured 12.1) where the
  NFL median is 9.3 yd. Into the break it runs 5.9 against 7.3 yd/s (through speed s 0.65).
- Out (10 yd) and dig (12 yd): late at the same depth, 0.7 s and 0.3 s. Speed into the break 2.8 and 4.5 against 6.4 and
  6.0 yd/s: the through speed `s: 0.4` on both makes him slow to 40% of top speed before the break point, where NFL
  receivers carry their speed to the plant. Their stems are also 1.4-1.7 yd shallower at 2.0 s.
- Post, over, hitch: on time at the same depth (2.45 vs 2.50, 2.05 vs 2.20, 2.35 vs 2.30 s); speed into the break a
  little low (post 5.6 vs 6.7, hitch 1.8 vs 2.7).
- Curl: the operator finds no break on ours (its settle back from 12.5 to 11 yd is gradual); depth by time is 1.1 yd
  shallow at 2.0 s. Comeback: four NFL OUTs break as deep as ours (15.7 yd); too few to compare.
- Every family is 0.4-1.0 yd shallower at 1.0 s than the depth-matched NFL routes (the release), and catches up by 2.5 s
  except the out and dig.
- Not isolated here: CRAFT_HOLD, CRAFT_EXIT and ROUTE_LANDMARK (on by default) act on the release and the leg after the
  break; the through speed and the taught depth explain the late breaks above without them. A flag-off pass of the
  same export would separate them.
