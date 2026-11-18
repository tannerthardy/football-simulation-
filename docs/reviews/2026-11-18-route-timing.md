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

## Notes for the offense list
- Corner depth: left as taught. Ours breaks at 11-12 yd (a deep corner, 12-14 yd, is a taught depth) where the NFL
  median is 9.3; at the same depth it is on NFL time. A smash corner at about 10 yd and a deep corner at 12-14 both
  exist; the playbook has one. A variety item, not a timing fault.
- Release: every family is 0.4-1.0 yd shallower at 1.0 s. What sets the first second here: the stance and first steps
  from rest (no receiver is moving at the snap in staged plays, where NFL receivers in motion are), the release moves
  (RELEASE_SIDE / RELEASE_COMMIT / CRAFT_HOLD round a man over him) and any jam. To be looked at with the release work.

## The out and dig as taught speed cuts: ROUTE_SHAPE (off), measured with this operator
`s: 0.4` sits on the square plant (`cut: true`), where the follower's corner law already caps him at what his lateral
grip and cut skill allow on a 90 deg plant (about 4 yd/s): the fraction is a second, invented brake ahead of it. The
taught out, and the dig as Viqtory Sports and USA Football teach it ("push to 10, speed cut, flatten at 12"), is a
rounded speed cut: ROUTE_SHAPE (`routes.ts SHAPES`, built 2026-11-14 from those sources) runs both at s 1 as rolls,
so the turn and the speed through it come from the body's lateral envelope at his cut skill (the fillet plan in
`route-motion.ts`), the same envelope the physics executes. Choice marked: dig = speed cut (Viqtory, USA Football);
the square-plant dig stays available as the off arm. Engine defaults, same staged set:

| route | arm | break t | break d | v into | v out | d@2s | NFL at the same depth (t / v into) |
|---|---|---|---|---|---|---|---|
| out | off | 3.20 | 10.4 | 2.8 | 3.9 | 5.8 | 2.50 / 6.4 (at 10.4 yd) |
| out | ROUTE_SHAPE | 2.60 | 8.9 | 4.7 | 4.8 | 5.7 | 2.40 / 6.2 (at 8.9 yd) |
| dig | off | 3.10 | 12.2 | 4.5 | 4.7 | 5.8 | 2.80 / 6.0 (at 12.2 yd) |
| dig | ROUTE_SHAPE | 2.70 | 9.7 | 5.1 | 5.1 | 5.8 | 2.50 / 5.8 (at 9.7 yd) |

Post and hitch do not change. Still 0.2 s behind the NFL at the same depth: the stem is about 1 yd shallow at 2.0 s
(the release, above), not the break. Outcomes by the target's route (`route-outcome.mts`, same set):

| route | off: comp, yd/att, sep at throw, throw t | ROUTE_SHAPE |
|---|---|---|
| out | 32/42, 14.19, 2.42, 2.75 | 25/42, 7.73, 2.62, 2.70 |
| dig | 26/44, 9.50, 2.72, 3.70 | 30/49, 8.26, 2.81, 3.40 |
| quick_out | 85/95, 8.92, 3.72, 2.60 | 79/96, 7.25, 3.85, 2.60 |
| hitch | 92/124, 5.07, 4.66 | 91/125, 4.93, 4.59 |

Adverse and open: the out completes less with more separation (incompletions in trips_sail, double_outs, trips_outs vs
Cover 2/3, separation about 2.6 at the throw). Not traced: the throw's lead on the rounded out (the QB's forecast of the
new path) is the first suspect. Dither budget passes with ROUTE_SHAPE on.
