# Speed kept through a heading change: ours against the NFL (measurement; no build)

Tools/Physics, 2026-11-25, for Integration and Defense (their question after #931's honest reach: pursuers ask full effort at the intercept and get about 0.6 of top speed with the velocity heading 30-40 degrees behind the request). No engine change. Develop `2817f0fad` (engine-102). One operator, `scripts/diag/pursuit/turn_speed.py`, reads three kinds of track in the census play format: the bench (one body, a known request), 24 sim games (default engine; 592 pursuer and 295 carrier turns), and BDB 2025 weeks 1-9 (all completions and runs through the end of the play: 2,584 pursuer and 1,599 carrier turns). Bench: `scripts/diag/pursuit/turn_bench.mts`. Request tap: `scripts/diag/census/sim_plays_req.mts` (read-only: its tracks are identical to the plain export, checked). Full tables: `data/reviews/pursuit/report-all.md` and `report-alone.md`.

## In short

1. **Ours does not lose clearly more speed than the NFL's in any cell with at least 10 events on both sides: three cells are lower by 0.01-0.07 (pursuers 5.5 yd/s at 30 degrees, carriers 5.5 yd/s at 30 and 60 degrees), the other eleven are equal or higher.** Pursuers, min speed over entry (NFL | sim): 5.5 yd/s entry 0.48 | 0.44 at 30 degrees, 0.49 | 0.50 at 60, 0.45 | 0.57 at 90, 0.40 | 0.66 at 120; 7 yd/s entry 0.48 | 0.58, 0.42 | 0.61, 0.45 | 0.75, 0.46 | 0.68. Carriers (cells with at least 10 events): 0.60 | 0.59 and 0.56 | 0.49 at 30 and 60 degrees, 5.5 yd/s; 0.69 | 0.77 and 0.66 | 0.84 at 7. The NFL slows to about 0.45 of its entry speed for any heading change over 30 degrees at 5-7 yd/s; the sim, where it has the events, slows less.
2. **The bench body, asked for full effort in the new direction, keeps more speed than the NFL's average** (min / entry 0.99, 0.86, 0.60 at 60, 90, 120 degrees from 5.5; 0.96, 0.80, 0.56 from 7) and turns in the NFL's average time (1.14 / 1.54 / 1.73 s against NFL pursuers 1.29 / 1.68 / 1.92 from 5.5; 1.24 / 1.74 / 1.91 against 1.38 / 1.72 / 2.12 from 7), on the NFL's average path (7.0 / 8.4 / 7.6 yd against 6.1 / 7.7 / 8.0). So what Defense sees, the body asked for full effort through 90-120 degrees at 5-7 yd/s reaching 0.55-0.80 of its entry speed, is what an average NFL defender's body does in the same turn: he reaches about 0.45.
3. **Where the body is short: the NFL's fastest tenth turn 25-45% faster than the bench at the same retained speed** (turn time, fastest tenth: 0.90 / 1.20 / 1.32 s at 60 / 90 / 120 degrees from 5.5, 1.00 / 1.20 / 1.46 from 7, against the bench's 1.14 / 1.54 / 1.73 and 1.24 / 1.74 / 1.91; min / entry for the best tenth is 0.94 / 0.86 / 0.70 and 0.90 / 0.82 / 0.81, the bench's 0.99 / 0.86 / 0.60 and 0.96 / 0.80 / 0.56). The bench turns at exactly the lateral envelope: 90 degrees at 6.2 yd/s on `lateral x (1 - 0.2 v / vmax)` = 5.9 yd/s2 is (pi/2) x 6.2 / 5.9 = 1.65 s, measured 1.64-1.74. The NFL's fastest 90 degree turns at 5.5 yd/s (1.10-1.20 s) need 7-8 yd/s2 at constant speed, or about 6.9 with the speed they shed. Whether that is a shortfall of our average body or the NFL's best bodies in a mixed population cannot be told here (no per-player ratings on the NFL side). In game the sim's own fastest tenth at 60 degrees is not slower: 0.56 s from 5.5 and 0.80 s from 7 against the NFL's 0.90 and 1.00 (the in-game 90 and 120 degree cells are too small for a fastest tenth). So the bench's slow full-ask turn is a measure of one kind of request, a far velocity target with the body still accelerating along the old heading, and not a demonstrated limit on what pursuers do in game.
4. **At 90-120 degrees ours turns wider than the NFL does.** Path through the turn, pursuers (NFL | sim): 7.7 | 11.0 at 5.5/90 (n 186, 12), 8.0 | 13.3 at 5.5/120 (103, 14), 8.8 | 14.8 at 7/90 (41, 18), 11.0 | 17.0 at 7/120 (27, 11); turn time 1.68 | 1.83, 1.92 | 2.37, 1.72 | 2.07, 2.12 | 2.55 s. The in-game pursuer keeps speed and swings out: 0.57-0.75 of entry against the NFL's 0.40-0.46. These cells are small (11-18 sim events), and the bench does not do this (path 7.6-10.8 yd), so the extra arc is in what the controllers ask in game, not in the envelope.
5. **No term is shown to cost speed in the body.** Directional cap (hips off the line of travel, DIR_CAP): the cap factor averages 0.91-0.97 in full-ask turns in game (minimum 0.81) and 0.93-0.98 on the bench: at most about 5%. Fatigue and cut skill: energy at full-ask frames median 0.74, which is a 0.99 fatigue factor; cutSkill sent by the controllers is 1.00 (5th to 95th percentile 1.00-1.09), effort 1.00. Support availability: 1.00 on the bench; 0.84-0.85 mean (minimum 0.64-0.67) for pursuers in full-ask 30 and 60 degree turns in game, 0.99-1.00 for carriers, with other bodies often near, so this one is a lead, not a measured cost (section 4).

So the answer to "does ours lose clearly more speed than the NFL's in the same bin": no, in the bins where there are events; at worst 0.07 lower in three cells and higher in most. The pursuit misses at 110-130 degrees that Defense stages (0 of 6 at 5.5-7 yd/s; the line falls between 85 and 110 degrees) are what the bench does at 120 degrees (0.55-0.60 of entry and 1.7-1.9 s), and about what the NFL mean pursuer does at 120 (0.40-0.46 and 1.9-2.1 s), but not what NFL pursuers do in the best tenth (1.3-1.5 s). Nothing here asks for a capacity change. The two things worth the Defense lane's attention are the controller's wide arc in game at 90-120 degrees (point 4), and whether the pursuit angles asked of the body at the intercept are ones NFL defenders take (75 degrees and over in 480 of 2,584 NFL pursuer turns, 19%, against 76 of 592 of ours, 13%).

## Operator

A turn = a run of frames over which the velocity heading (direction of the 0.4 s centred displacement) moves one way, seeded above 0.3 rad/s and extended while above 0.15 rad/s, starting from the catch or handoff onward. Start s = its first frame, end e = its last, angle = the heading change from s-1 to e+1 (20 degrees and over). Entry speed = the mean speed over the 3 frames before s (4.5 yd/s and over, and not more than a fifth under his fastest speed in the second before: no restarts from a stop). Per turn: min speed from s-0.3 s to e+0.8 s over entry; speed 0.6 s after the start and at the end over entry; turn time = (e - s + 1) / 10; path = track length from s to e; mean lateral acceleration = (path / time) x angle / time. Pursuers = defenders within 12 yd of the carrier at the turn, none closer than 1 yd to the carrier at any time from 0.3 s before to 0.9 s after; carriers = the receiver after the catch or the back after the handoff. Bins: entry 4.75-6.25 / 6.25-7.75 / 7.75-9.5 yd/s (labelled 5.5 / 7 / 8.5), angle 20-45 / 45-75 / 75-105 / 105-150 degrees (30 / 60 / 90 / 120). Turns in which the sim body went off his feet (support availability 0 at any frame; falls and dives, not separated) are not turns and are counted apart (95 of 982 in the first set).

The first version of the event finder windowed the heading over 0.6 s either side and scored slow turns as small angles (the bench's 90 degree ask reads as 37 degrees); the rate-based finder above replaces it, and entry speed was changed from the fastest speed before to the speed just before after two traced events turned out to be a stop-and-restart and a fall.

## Bench

PlaySim fixture (`contactFixture`), every other body parked, no controller. The body runs from rest asked the entry speed along +x for 5 s (a flying start leaves the support state behind the velocity and the body sheds 1.5 yd/s in 0.3 s), then asked its top speed along the new heading (effort 1, cutSkill 1, facing default = direction of travel, the hips leading the path by at most 60 degrees). Nine bodies: CB_W, CB_S, FS, SS, LB_M, LB_W, RB, X, Y of the fixture teams (vmax 9.0-10.0, lateral 6.5-7.0, brake 6.3-7.0), both turn directions. The bench holds the 8.5 yd/s ask at an entry of about 8.4.

Bench, same operator (mean over the nine bodies and both directions; a 30 degree ask is below the operator's rate threshold):

| entry | asked | bodies | min speed | min / entry | +0.6 s / entry | exit / entry | turn time (s) | path (yd) | lateral accel (yd/s2) | peak lateral accel (yd/s2) |
|---|---|---|---|---|---|---|---|---|---|---|
| 5.5 | 60 | 18 | 5.5 | 0.99 | 1.12 | 1.28 | 1.14 | 7.0 | 4.2 | 2.9 |
| 5.5 | 90 | 18 | 4.7 | 0.86 | 0.87 | 1.21 | 1.54 | 8.4 | 4.6 | 3.0 |
| 5.5 | 120 | 18 | 3.3 | 0.60 | 0.61 | 1.06 | 1.73 | 7.6 | 4.7 | 3.1 |
| 7 | 60 | 18 | 6.7 | 0.96 | 0.99 | 1.10 | 1.24 | 8.8 | 4.4 | 2.9 |
| 7 | 90 | 18 | 5.5 | 0.80 | 0.80 | 1.02 | 1.74 | 10.8 | 4.7 | 3.0 |
| 7 | 120 | 18 | 3.8 | 0.56 | 0.58 | 0.90 | 1.91 | 9.4 | 4.7 | 3.1 |
| 8.5 | 60 | 18 | 7.6 | 0.91 | 0.91 | 0.97 | 1.33 | 10.5 | 4.6 | 2.8 |
| 8.5 | 90 | 18 | 6.2 | 0.74 | 0.76 | 0.88 | 1.83 | 12.5 | 4.8 | 2.9 |
| 8.5 | 120 | 18 | 4.3 | 0.51 | 0.60 | 0.77 | 2.13 | 11.6 | 4.7 | 3.0 |

Bench read from the request itself (min speed in the next 2 s over entry, time for the velocity heading to reach 90% of the asked angle; this is not the operator and not comparable to the NFL, which has no request):

| entry | asked | bodies | min / entry in the next 2 s | time to 90% of the asked heading (s) | speed then / entry | path to then (yd) |
|---|---|---|---|---|---|---|
| 5.5 | 30 | 18 | 1.01 | 2.21 (18 of 18 reach it) | 1.59 | 16.6 |
| 5.5 | 60 | 18 | 0.99 | 2.02 (18 of 18 reach it) | 1.52 | 13.9 |
| 5.5 | 90 | 18 | 0.86 | 1.98 (18 of 18 reach it) | 1.38 | 11.5 |
| 5.5 | 120 | 18 | 0.60 | 1.80 (18 of 18 reach it) | 1.14 | 8.0 |
| 7 | 30 | 18 | 1.01 | 2.32 (18 of 18 reach it) | 1.30 | 19.1 |
| 7 | 60 | 18 | 0.96 | 2.20 (18 of 18 reach it) | 1.24 | 16.7 |
| 7 | 90 | 18 | 0.80 | 2.21 (18 of 18 reach it) | 1.14 | 14.3 |
| 7 | 120 | 18 | 0.55 | 2.10 (18 of 18 reach it) | 0.95 | 10.6 |
| 8.5 | 30 | 18 | 1.00 | 1.93 (18 of 18 reach it) | 1.09 | 17.1 |
| 8.5 | 60 | 18 | 0.91 | 2.24 (18 of 18 reach it) | 1.05 | 18.3 |
| 8.5 | 90 | 18 | 0.74 | 2.44 (18 of 18 reach it) | 0.97 | 17.3 |
| 8.5 | 120 | 18 | 0.51 | 2.39 (18 of 18 reach it) | 0.83 | 13.4 |

At a full ask the velocity heading approaches the request slowly because the body keeps accelerating along the old heading while it turns: the bench reaches 90% of a 30 degree ask in about 2.2 s.

## NFL against the sim (all turns)

All events (a pursuer within 1 yd of the carrier is left out; other bodies may be near): kept / found: NFL 4183 / 4183, SIM 982 / 982. Of the kept, ended with the body off his feet (sim only, support availability 0): SIM 95.

Pursuers, 5.5 and 7 yd/s entry (cells with at least 10 events):

| role | entry | angle | sample | n | entry speed | min speed | min / entry (mean, p25, p75) | +0.6 s / entry | exit / entry | turn time (s) | path (yd) | lateral accel (yd/s2) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pursuer | 5.5 | 30 | NFL | 914 | 5.4 | 2.6 | 0.48 (0.20, 0.84) | 0.75 | 0.76 | 0.84 | 4.0 | 3.1 |
| pursuer | 5.5 | 30 | SIM | 195 | 5.4 | 2.4 | 0.44 (0.17, 0.71) | 0.74 | 0.81 | 0.64 | 3.2 | 4.0 |
| pursuer | 5.5 | 60 | NFL | 456 | 5.4 | 2.6 | 0.49 (0.23, 0.79) | 0.82 | 0.75 | 1.29 | 6.1 | 3.6 |
| pursuer | 5.5 | 60 | SIM | 67 | 5.5 | 2.8 | 0.50 (0.26, 0.80) | 0.85 | 0.81 | 1.06 | 5.7 | 4.8 |
| pursuer | 5.5 | 90 | NFL | 186 | 5.3 | 2.4 | 0.45 (0.21, 0.69) | 0.80 | 0.74 | 1.68 | 7.7 | 4.1 |
| pursuer | 5.5 | 90 | SIM | 12 | 5.6 | 3.3 | 0.57 (0.31, 0.93) | 0.94 | 0.86 | 1.83 | 11.0 | 5.0 |
| pursuer | 5.5 | 120 | NFL | 103 | 5.4 | 2.1 | 0.40 (0.22, 0.54) | 0.68 | 0.76 | 1.92 | 8.0 | 4.6 |
| pursuer | 5.5 | 120 | SIM | 14 | 5.3 | 3.5 | 0.66 (0.46, 0.91) | 0.99 | 1.07 | 2.37 | 13.3 | 5.2 |
| pursuer | 7 | 30 | NFL | 224 | 6.8 | 3.2 | 0.48 (0.17, 0.81) | 0.80 | 0.76 | 0.98 | 5.9 | 3.5 |
| pursuer | 7 | 30 | SIM | 86 | 7.0 | 4.1 | 0.58 (0.23, 0.97) | 0.87 | 0.86 | 0.81 | 5.4 | 4.3 |
| pursuer | 7 | 60 | NFL | 127 | 6.8 | 2.9 | 0.42 (0.16, 0.66) | 0.79 | 0.68 | 1.38 | 7.9 | 4.1 |
| pursuer | 7 | 60 | SIM | 46 | 6.9 | 4.2 | 0.61 (0.27, 0.93) | 0.86 | 0.82 | 1.30 | 8.5 | 4.8 |
| pursuer | 7 | 90 | NFL | 41 | 6.7 | 3.0 | 0.45 (0.25, 0.61) | 0.73 | 0.68 | 1.72 | 8.8 | 4.5 |
| pursuer | 7 | 90 | SIM | 18 | 7.0 | 5.3 | 0.75 (0.60, 0.97) | 0.92 | 0.96 | 2.07 | 14.8 | 5.2 |
| pursuer | 7 | 120 | NFL | 27 | 6.8 | 3.1 | 0.46 (0.28, 0.64) | 0.72 | 0.70 | 2.12 | 11.0 | 5.0 |
| pursuer | 7 | 120 | SIM | 11 | 6.7 | 4.6 | 0.68 (0.39, 0.96) | 0.95 | 0.90 | 2.55 | 17.0 | 5.5 |

Carriers:

| role | entry | angle | sample | n | entry speed | min speed | min / entry (mean, p25, p75) | +0.6 s / entry | exit / entry | turn time (s) | path (yd) | lateral accel (yd/s2) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| carrier | 5.5 | 30 | NFL | 530 | 5.5 | 3.3 | 0.60 (0.33, 0.92) | 0.87 | 0.87 | 0.85 | 4.4 | 3.2 |
| carrier | 5.5 | 30 | SIM | 143 | 5.2 | 3.1 | 0.59 (0.37, 0.84) | 0.84 | 0.88 | 0.61 | 3.0 | 4.2 |
| carrier | 5.5 | 60 | NFL | 234 | 5.5 | 3.1 | 0.56 (0.31, 0.82) | 0.85 | 0.82 | 1.24 | 6.3 | 3.9 |
| carrier | 5.5 | 60 | SIM | 44 | 5.3 | 2.7 | 0.49 (0.31, 0.67) | 0.82 | 0.80 | 1.01 | 5.1 | 4.6 |
| carrier | 5.5 | 90 | NFL | 104 | 5.5 | 2.7 | 0.49 (0.27, 0.69) | 0.83 | 0.77 | 1.61 | 7.8 | 4.4 |
| carrier | 5.5 | 120 | NFL | 33 | 5.5 | 2.5 | 0.45 (0.26, 0.61) | 0.79 | 0.78 | 2.01 | 10.2 | 4.8 |
| carrier | 7 | 30 | NFL | 220 | 6.9 | 4.8 | 0.69 (0.47, 0.96) | 0.91 | 0.89 | 0.97 | 6.3 | 3.8 |
| carrier | 7 | 30 | SIM | 23 | 6.8 | 5.3 | 0.77 (0.66, 0.97) | 0.92 | 0.94 | 0.78 | 5.4 | 4.2 |
| carrier | 7 | 60 | NFL | 125 | 6.9 | 4.6 | 0.66 (0.42, 0.96) | 0.91 | 0.87 | 1.46 | 9.5 | 4.4 |
| carrier | 7 | 60 | SIM | 10 | 6.9 | 5.8 | 0.84 (0.84, 0.98) | 1.02 | 1.07 | 1.61 | 11.8 | 4.4 |
| carrier | 7 | 90 | NFL | 44 | 6.8 | 3.6 | 0.54 (0.33, 0.76) | 0.81 | 0.72 | 1.81 | 10.6 | 4.7 |
| carrier | 7 | 120 | NFL | 19 | 6.9 | 3.6 | 0.53 (0.30, 0.73) | 0.86 | 0.73 | 2.43 | 14.4 | 5.0 |

Turning alone (no other body within 1 yd; this removes 83% of the NFL's turns and 76% of the sim's, so the cells are small):

Events with another body within 1 yd (0.3 s before to 0.9 s after) are left out, so every row is a body turning alone: kept / found: NFL 711 / 4183, SIM 239 / 982. Of the kept, ended with the body off his feet (sim only, support availability 0): SIM 19.

| role | entry | angle | sample | n | entry speed | min speed | min / entry (mean, p25, p75) | +0.6 s / entry | exit / entry | turn time (s) | path (yd) | lateral accel (yd/s2) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pursuer | 5.5 | 30 | NFL | 195 | 5.4 | 3.1 | 0.57 (0.29, 0.94) | 0.78 | 0.81 | 0.86 | 4.3 | 3.2 |
| pursuer | 5.5 | 30 | SIM | 42 | 5.4 | 2.8 | 0.51 (0.22, 0.93) | 0.81 | 0.87 | 0.70 | 3.9 | 3.8 |
| pursuer | 5.5 | 60 | NFL | 78 | 5.4 | 3.5 | 0.64 (0.34, 0.94) | 0.86 | 0.88 | 1.34 | 6.8 | 3.7 |
| pursuer | 5.5 | 60 | SIM | 14 | 5.6 | 3.2 | 0.56 (0.27, 0.95) | 0.86 | 0.89 | 1.17 | 6.8 | 4.6 |
| pursuer | 5.5 | 90 | NFL | 41 | 5.3 | 2.8 | 0.52 (0.31, 0.73) | 0.76 | 0.79 | 1.56 | 6.9 | 4.3 |
| pursuer | 5.5 | 120 | NFL | 30 | 5.5 | 2.6 | 0.47 (0.39, 0.60) | 0.59 | 0.88 | 1.93 | 8.3 | 4.7 |
| pursuer | 7 | 30 | NFL | 62 | 6.9 | 4.6 | 0.66 (0.29, 0.97) | 0.88 | 0.88 | 1.00 | 6.5 | 3.7 |
| pursuer | 7 | 30 | SIM | 29 | 7.0 | 5.6 | 0.79 (0.71, 0.98) | 1.00 | 1.00 | 0.87 | 6.3 | 4.3 |
| pursuer | 7 | 60 | NFL | 24 | 6.8 | 4.6 | 0.67 (0.46, 0.96) | 0.90 | 0.87 | 1.52 | 9.7 | 4.2 |

## The upper end

Fastest tenth of each cell, NFL and sim (the bench's mean is in the bench table):

| role | entry | angle | sample | n | min / entry, best tenth | turn time, fastest tenth (s) | peak lateral accel, best tenth (yd/s2) | exit / entry, best tenth |
|---|---|---|---|---|---|---|---|---|
| pursuer | 5.5 | 60 | NFL | 456 | 0.94 | 0.90 | 3.2 | 1.19 |
| pursuer | 5.5 | 60 | SIM | 67 | 0.96 | 0.56 | 5.5 | 1.32 |
| pursuer | 5.5 | 90 | NFL | 186 | 0.86 | 1.20 | 3.8 | 1.26 |
| pursuer | 5.5 | 120 | NFL | 103 | 0.70 | 1.32 | 4.2 | 1.18 |
| pursuer | 7 | 60 | NFL | 127 | 0.90 | 1.00 | 3.6 | 1.09 |
| pursuer | 7 | 60 | SIM | 46 | 0.98 | 0.80 | 5.8 | 1.24 |
| pursuer | 7 | 90 | NFL | 41 | 0.82 | 1.20 | 4.1 | 1.02 |
| pursuer | 7 | 120 | NFL | 27 | 0.81 | 1.46 | 4.5 | 1.03 |
| carrier | 5.5 | 60 | NFL | 234 | 0.95 | 0.90 | 3.4 | 1.28 |
| carrier | 5.5 | 60 | SIM | 44 | 0.91 | 0.66 | 3.8 | 1.10 |
| carrier | 5.5 | 90 | NFL | 104 | 0.93 | 1.10 | 3.8 | 1.24 |
| carrier | 5.5 | 120 | NFL | 33 | 0.92 | 1.30 | 4.2 | 1.30 |
| carrier | 7 | 60 | NFL | 125 | 0.98 | 1.10 | 3.7 | 1.22 |
| carrier | 7 | 90 | NFL | 44 | 0.98 | 1.20 | 4.0 | 1.17 |
| carrier | 8.5 | 60 | NFL | 52 | 0.99 | 1.30 | 3.6 | 1.12 |

## What the sim body does when the controller asks for full speed

The tap reads `PlaySim.intents` after each tick: the request the World was given, with effort and cutSkill (`rq3` files, not committed; regenerate with `scripts/diag/census/sim_plays_req.mts`).

| role | angle | ask | n | entry speed | request (yd/s) | min / entry | exit / entry | turn time (s) | request-to-velocity heading lag at the turn's end (deg) |
|---|---|---|---|---|---|---|---|---|---|
| pursuer | 30 | under 6 | 169 | 5.5 | 3.8 | 0.30 | 0.65 | 0.58 | 57 |
| pursuer | 30 | 6-8.5 | 85 | 5.7 | 7.4 | 0.55 | 0.96 | 0.75 | 34 |
| pursuer | 30 | 8.5 and over | 118 | 6.7 | 9.3 | 0.81 | 1.06 | 0.87 | 28 |
| pursuer | 60 | under 6 | 64 | 5.7 | 4.2 | 0.33 | 0.60 | 0.86 | 53 |
| pursuer | 60 | 6-8.5 | 28 | 5.9 | 7.1 | 0.55 | 0.80 | 1.23 | 35 |
| pursuer | 60 | 8.5 and over | 54 | 6.7 | 9.3 | 0.84 | 1.09 | 1.56 | 23 |
| pursuer | 90 | 8.5 and over | 25 | 6.8 | 9.3 | 0.88 | 1.12 | 2.37 | 16 |
| pursuer | 120 | 6-8.5 | 10 | 5.7 | 7.8 | 0.52 | 0.92 | 2.25 | 36 |
| pursuer | 120 | 8.5 and over | 13 | 5.9 | 9.3 | 0.89 | 1.24 | 2.84 | 18 |
| carrier | 30 | under 6 | 109 | 5.1 | 4.9 | 0.47 | 0.79 | 0.55 | 15 |
| carrier | 30 | 6-8.5 | 73 | 5.3 | 7.0 | 0.70 | 0.94 | 0.64 | 19 |
| carrier | 30 | 8.5 and over | 39 | 6.0 | 9.5 | 0.83 | 1.10 | 0.83 | 26 |
| carrier | 60 | under 6 | 28 | 5.1 | 4.8 | 0.39 | 0.70 | 0.88 | 17 |
| carrier | 60 | 6-8.5 | 17 | 5.8 | 6.8 | 0.50 | 0.75 | 1.01 | 24 |
| carrier | 60 | 8.5 and over | 16 | 6.5 | 9.6 | 0.89 | 1.16 | 1.64 | 24 |

By the angle asked (the request's direction against the entry heading) against the bench's asked angle:

| sample | role | asked (deg) | n | entry speed | achieved turn (deg) | min / entry | exit / entry | turn time (s) |
|---|---|---|---|---|---|---|---|---|
| SIM | pursuer | 30 (asked 31) | 166 | 6.7 | 53 | 0.87 | 1.13 | 1.48 |
| SIM | pursuer | 60 (asked 55) | 17 | 6.7 | 55 | 0.89 | 1.08 | 1.41 |
| SIM | pursuer | 150+ (asked 150) | 8 | 5.2 | 28 | 0.24 | 0.53 | 0.41 |
| SIM | carrier | 30 (asked 32) | 37 | 6.3 | 43 | 0.91 | 1.20 | 1.26 |
| SIM | carrier | 60 (asked 57) | 13 | 6.4 | 40 | 0.83 | 1.06 | 1.04 |
| bench | one body | 60 (asked 60) | 36 | 6.2 | 45 | 0.98 | 1.19 | 1.19 |
| bench | one body | 90 (asked 90) | 36 | 6.2 | 75 | 0.83 | 1.11 | 1.64 |
| bench | one body | 120 (asked 120) | 36 | 6.2 | 107 | 0.58 | 0.98 | 1.82 |

At the same asked angle, in game loses far more than the bench (60 degrees: 0.57 against 0.98; 90 degrees: 0.45 against 0.83), but those turns are mostly with other bodies near. What the body state shows:

| sample | role | angle | n | entry speed | min / entry | exit / entry | hips off travel, mean / max (deg) | directional cap factor, mean / min | support availability, mean / min | planned accel along / across (yd/s2) |
|---|---|---|---|---|---|---|---|---|---|---|
| SIM | pursuer | 30 | 118 | 6.7 | 0.81 | 1.06 | 24 / 36 | 0.95 / 0.90 | 0.98 / 0.96 | 0.4 / 4.0 |
| SIM | pursuer | 60 | 54 | 6.7 | 0.84 | 1.09 | 24 / 42 | 0.97 / 0.90 | 1.00 / 0.97 | 0.4 / 4.4 |
| SIM | pursuer | 90 | 25 | 6.8 | 0.88 | 1.12 | 24 / 41 | 0.98 / 0.88 | 1.00 / 0.97 | 0.4 / 4.6 |
| SIM | pursuer | 120 | 13 | 5.9 | 0.89 | 1.24 | 33 / 65 | 0.97 / 0.85 | 0.99 / 0.91 | 0.3 / 4.7 |
| SIM | carrier | 30 | 39 | 6.0 | 0.83 | 1.10 | 27 / 41 | 0.96 / 0.90 | 0.99 / 0.98 | 1.0 / 4.1 |
| SIM | carrier | 60 | 16 | 6.5 | 0.89 | 1.16 | 22 / 39 | 0.97 / 0.90 | 1.00 / 0.97 | 0.6 / 4.3 |
| bench | all | 60 | 36 | 6.2 | 0.98 | 1.19 | 25 / 41 | 0.98 / 0.83 | 1.00 / 1.00 | 1.1 / 4.0 |
| bench | all | 90 | 36 | 6.2 | 0.83 | 1.11 | 32 / 52 | 0.96 / 0.70 | 1.00 / 1.00 | 0.6 / 4.3 |
| bench | all | 120 | 36 | 6.2 | 0.58 | 0.98 | 35 / 52 | 0.93 / 0.60 | 1.00 / 1.00 | 0.1 / 4.3 |

In-game pursuers in these turns have support availability 0.84-0.85 and planned acceleration across 3.3-3.8 yd/s2 against the bench's 1.00 and 4.0-4.3; carriers 0.98-1.00. Availability is how far his base is out of balance (`support.ts availability`); it scales the whole locomotion envelope (`locomotionAccel` capacity). It is the one term that differs between game and bench, and it is confounded with contact (the unfiltered set includes bodies within 1 yd). The contact-free sample of full-ask turns is too small to separate them (a handful per cell).

## Limits

- The NFL turns are what players chose to do, including deliberate plants and stops; the bench is a full effort ask. They agree in the bins that matter because players at 5-7 yd/s turning 60+ degrees in pursuit mostly are at the limit of what they can do, but a stop that the NFL player wanted and ours did not is not separable here. The best-tenth comparison is the nearest to a capacity read.
- The sim sample is 24 games (592 pursuer and 295 carrier turns; 11-18 events in the 90 and 120 degree cells). Entry speeds of 7.75 yd/s and over are 39 NFL and 52 sim pursuer turns and 125 NFL and 10 sim carrier turns, spread over four angle bins, so nothing is said above 7.5 yd/s except for the bench.
- The turn categories are inferred from tracking at 10 Hz with the provider's smoothing on the NFL side and the same centred differences on ours (CLAUDE.md: weaker than direct measurement). Heading comes from displacement over 0.4 s, which cuts a fast turn's peak rate.
- Pursuer eligibility is inferred (within 12 yd of the carrier; no pursuer closer than 1 yd). Blockers and teammates can be near in the all-turns tables.
- The bench uses nine average fixture bodies; the NFL is a mixed population of positions and ratings. Position groups are not separated.
- 95 sim turns that end with the body off his feet (support availability 0, 10% of the 982) are left out of every table. They include dives and falls with a body near; the contact-free subset is 19 of 258 (7%). Whether the unintended falls are too many or too few is not measurable here (NFL tracking has no fall flag). A pursuer who stops dead within 1 s of a contact-free turn (speed under a quarter of entry, and under 0.15 at its lowest) is 6.0% of NFL turns (32 of 532) and 6.6% of the sim's (12 of 181): 5.5% | 8.0% at 30 degrees, 3.2% | 5.4% at 60, 5.3% | 0 of 14 at 90, 19% | 0 of 5 at 120.

## Addendum: Coverage's man turn-back (Integration's case)

Integration's case, relayed by Coverage: in the engine-72 honest-defender set every late defender's request turned onto the carrier 0.2-0.4 s after the catch, man defenders more than 8 yd away were running about 7.4 yd/s away with their own men, and the turn back cost about 1.3 s; is 1.3 s at 7 yd/s the body law or our turn? `scripts/diag/pursuit/man_turnback.py`, one operator on both sides, on the same exports as above (NFL: completions in man calls, PFF manZone; sim: 24 games on engine-102, the call's man flag, with the request tap).

Selection, the same on both sides: a defender at least 8 yd from the catcher at the catch, running 4 yd/s or more with his velocity at least 100 degrees off the direction to the catcher, and a non-catcher eligible receiver within 3 yd of him (his own man, inferred). Measured for 3 s from the catch (plays with less track after the catch are left out).

| sample | band | n | speed at the catch | catch to heading change of 20 degrees (s, p50) | catch to velocity within 45 deg of the catcher (s, p25 / p50 / p75) | not turned in 3 s | speed when turned / at the catch | lowest speed on the way / at the catch | turn time from the start (s) | distance to the catcher then (yd) |
|---|---|---|---|---|---|---|---|---|---|---|
| NFL | 8-15 yd | 36 | 6.7 | 0.90 | 1.70 / 1.90 / 2.50 | 0.53 | 0.64 | 0.41 | 1.07 | 13.1 |
| NFL | 15+ yd | 129 | 6.3 | 1.00 | 1.60 / 2.00 / 2.30 | 0.50 | 0.59 | 0.40 | 1.06 | 27.5 |
| NFL | 8+ yd | 165 | 6.4 | 1.00 | 1.60 / 2.00 / 2.40 | 0.50 | 0.60 | 0.40 | 1.06 | 24.5 |
| SIM | 8-15 yd | 7 | | | | | | | | |
| SIM | 15+ yd | 32 | 6.6 | 0.80 | 1.40 / 1.70 / 2.00 | 0.09 | 0.70 | 0.42 | 1.09 | 22.5 |
| SIM | 8+ yd | 39 | 6.7 | 0.80 | 1.45 / 1.70 / 2.10 | 0.10 | 0.69 | 0.40 | 1.08 | 20.6 |

Share of those defenders whose velocity is within 45 degrees of the catcher by (all rows, 8+ yd):

| sample | n | 1.0 s | 1.5 s | 2.0 s | 2.5 s | 3.0 s |
|---|---|---|---|---|---|---|
| NFL | 165 | 0.01 | 0.12 | 0.25 | 0.42 | 0.50 |
| SIM | 39 | 0.03 | 0.26 | 0.62 | 0.77 | 0.90 |

SIM: the request points within 45 degrees of the catcher at p25 / p50 / p75 0.30 / 0.30 / 0.60 s after the catch (n 39); the velocity does at 1.45 / 1.70 / 2.10 s: the body adds 1.30 s at the median.


What it says:

- **The turn itself is the same.** From the first 20 degree change of heading to the velocity pointing within 45 degrees of the catcher: NFL 1.06 s, sim 1.08 s (1.07 | 1.09 in the far band); the lowest speed on the way is 0.40 of the speed at the catch on both sides (the NFL's turned speed is 0.60 of it, ours 0.69). So 1.3 s of body at 6.7 yd/s is the body the NFL has too.
- **What differs is the start.** The sim's request points at the catcher 0.30 s after the catch (p25 / p50 / p75 0.30 / 0.30 / 0.60 s) and the velocity has moved 20 degrees at 0.80 s (the first 0.5 s of body lag); the NFL's velocity has moved 20 degrees at 1.00 s. By 2.0 s from the catch 25% of NFL defenders have the velocity within 45 degrees of the catcher against 62% of ours, and by 3.0 s 50% against 90%; half the NFL's defenders are still not turned back to the catcher 3 s after the catch. The NFL takes longer than ours from the catch to the turned state (median 2.0 s against 1.7 s), mostly because it starts later.
- **Not in the NFL data:** whether a request exists earlier (a defender in the NFL who turns his head to the ball does so before the catch and may be running with it) and why half do not turn back at all (the play is dead for him, or he is covering a man still live). The sim's 10% not turned is the other end.

So 1.3 s at 6.7 yd/s is not the body law's excess: the NFL's own turn takes the same time from its first motion, and starts later than ours. Nothing here asks for a change to the turn; the question that remains is the decision's timing, what the NFL defender knows at the catch (the data cannot say).

Limits: NFL 165 and sim 39 defenders at 8+ yd (the sim's 8-15 yd band has 7: no row); the own-man test is by position, so a zone defender who happens to be near a receiver is in; 'man' for the NFL is PFF's play label, for the sim the call's flag; the engine-72 numbers Coverage quotes are a different engine (here the sim defenders are at 6.7 yd/s, not 7.4).
