# The coverage side of the flat package on the open census (SQUAT_SINK, FLIGHT_BREAK, OFF_DRIVE, SEAT_FILL)

Tools/Physics, 2026-11-24, for Coverage and Integration. Branch `coverage/C14-squat-sink` at 92a369672 (its base is develop 0226f0d3), the same 24 games and operators as the census; three arms of those games: default (develop 0226f0d3, flags off), the package (`SQUAT_SINK=1 FLIGHT_BREAK=1 OFF_DRIVE=1 SEAT_FILL=1`), and `SQUAT_SINK=1 FLIGHT_BREAK=1` only. Each arm is its own sample: the plays diverge after the first changed one, so these are two draws of the same games, not a paired test. NFL = BDB 2025 weeks 1-9. Tables: `data/reviews/census/pkg-census.md`, `pkg-quarters.md`. New: `scripts/diag/census/quarters_break.py`, `outcomes.mts`, `open_census_report.py --rows`.

## In short

1. **The 10-15 yd window now over-closes.** Wide-open share of receiver-moments at fixed times, Cover 2 | Cover 6: NFL .177 | .096, default .494 | .255, package .079 | .029, SQUAT_SINK+FLIGHT_BREAK .057 | .011. At the release: NFL .188 | .097, default .355 | .177, package .089 | .037, SF+FB .075 | .039. The earlier SQUAT_SINK+OFF_DRIVE run landed at the NFL's (.197 | .069); FLIGHT_BREAK takes it to well under.
2. **Aggregate wide-open at the NFL's.** Dropbacks with a wide-open receiver at the release: NFL .338, default .362, package .342, SF+FB .331; at any fixed time .550 | .529 | .528 | .521. By family at the release (NFL | default | package | SF+FB): Cover 2 .530 | .603 | .460 | .455; Cover 6 .418 | .466 | .466 | .412; Cover 3 .409 | .399 | .384 | .376; Cover 1 .098 | .103 | .101 | .125; Quarters .404 | .458 | .473 | .422.
3. **Corner on top / level / trailing at #1's break (n)**: Cover 2 NFL .40 / .23 / .36 (124) | default .11 / .16 / .74 (121) | package .34 / .24 / .42 (76) | SF+FB .38 / .25 / .37 (71). Cover 6 NFL .40 / .20 / .40 (87) | .25 / .15 / .60 (48) | .42 / .17 / .42 (36) | .38 / .27 / .35 (37). Cover 3 NFL .51 / .09 / .39 | .40 / .12 / .48 | .56 / .09 / .35 | .56 / .11 / .33. Cover 1 (man) NFL .59 / .26 / .15 | .41 / .46 / .14 | .30 / .52 / .17 | .32 / .52 / .16: no better. Cover 2 and Cover 6 are at the NFL's; the distance at the break in Cover 2 is median 2.1-2.2 yd against the NFL's 4.2 (p75 3.0-3.7 against 9.2): he is on top as often, but nearer.
4. **The flat gets more open and costlier, as before.** Flat catches' share of completions NFL .344 | default .169 | package .216 | SF+FB .197; share of YAC .449 | .204 | .270 | .226. Open flats (nearest defender over 8 yd) per game NFL 1.50 | default 1.83 | package 2.42 | SF+FB 2.29; open-flat YAC per game 17.4 | 25.2 | 31.5 | 26.5. Owner classes, catches (per game, YAC yd): (a) no seat owns it default 25 (1.04, 352), package 37 (1.54, 533), SF+FB 25 (1.04, 296); (b) the owner left default 6, package 5, SF+FB 4; (c) the owner too deep default 10, package 15, SF+FB 19; (d) blocked 3 | 0 | 5; (e) on it and able 0 | 1 | 2. Cover-6 flat catches: 26 | 27 | 27 (NFL 178 in 136 games); YAC p50 / p90 5.1 / 10.5 | 6.9 / 13.8 | 4.2 / 14.5.
5. **Is the completion rise fewer breakups?** Per throw (completions, incompletions, breakups, interceptions; sacks and scrambles out; n about 1,900 per arm): completion default .747 | package .763 | SF+FB .766; breakups .104 | .096 | .091; plain incompletions .132 | .129 | .131; interceptions .017 | .013 | .012. So about half of the +.016-.019 in completion is fewer breakups (-.008 to -.013), and the rest is fewer interceptions and a hair fewer incompletions. By family, breakups per throw (default | package | SF+FB): Cover 2 .086 | .078 | .098 (n 243 | 230 | 244), Cover 6 .095 | .063 | .091, Cover 3 .082 | .072 | .059, Cover 1 .142 | .152 | .144, Quarters .110 | .089 | .056. None is outside a throw-count noise of about one point.

## Quarters (next family)

**Wide-open share by depth band, fixed times | at the release** (NFL | default | package | SF+FB):

| band | NFL | default | package | SF+FB |
|---|---|---|---|---|
| behind the line | .118 / .094 | .168 / .314 | .175 / .341 | .161 / .262 |
| 0-5 | .145 / .125 | .113 / .131 | .124 / .127 | .120 / .110 |
| 5-10 | .132 / .133 | .099 / .120 | .111 / .125 | .101 / .128 |
| 10-15 | .106 / .106 | .029 / .050 | .040 / .028 | .019 / .041 |
| 15-20 | .062 / .064 | .000 / .011 | .042 / .026 | .000 / .008 |

Ours is under the NFL in 10-20 yd, level at 0-10, and over behind the line at the release (.31-.34 against .09; n 188-211 receiver-moments). **The worst band is behind the line at the release**, and the wide-open receivers there are the back's flat: of 59 wide-open (default) 49 are `back_flat` (47 are the RB), 8 `now_screen`; package 61 of 72 `back_flat`; the NFL's 88 are FLAT 44, SCREEN 28, CROSS 15 (n 932). The 10-15 band that is under the NFL's in ours is the seam, the corner and the go (default 10 wide-open: corner 4, seam 4).

**Corner and safety at the break** (corner = the man nearest #1 at the snap; safety = the deepest safety on that side; on top / level / trailing; n):

| sample | receiver | corner | corner dist p50 | safety | safety dist p50 |
|---|---|---|---|---|---|
| NFL | #1 | .53 / .12 / .35 (121) | 6.2 | .86 / .06 / .08 (120) | 12.7 |
| NFL | #2 | .56 / .13 / .30 (119) | 10.1 | .96 / .01 / .03 (114) | 11.7 |
| default | #1 | .58 / .06 / .36 (33) | 2.5 | .93 / .07 / .00 (29) | 11.4 |
| default | #2 | .72 / .10 / .18 (97) | 10.6 | 1.00 / 0 / 0 (93) | 11.6 |
| package | #1 | .54 / .04 / .42 (48) | 3.3 | .93 / .05 / .02 (44) | 11.6 |
| package | #2 | .58 / .13 / .29 (102) | 10.3 | 1.00 / 0 / 0 (100) | 11.8 |
| SF+FB | #1 | .47 / .09 / .44 (32) | 5.0 | .90 / .07 / .03 (30) | 10.9 |
| SF+FB | #2 | .59 / .13 / .27 (91) | 10.1 | .99 / .01 / .00 (88) | 11.5 |

Quarters #1 breaks are few in ours (32-48 against the NFL's 121): our #1 rarely runs a break the operator catches. The default's #2 corner is on top far more often (.72) than the NFL's (.56), and the package and SF+FB bring it to the NFL's (.58 | .59); the safety is on top of both receivers at the break in ours 99-100% of the time against the NFL's 86% for #1 and 96% for #2 (the NFL's #1 gets 8% past his safety, ours none).

## What this says, and what it does not

- Taken together the package does what it was built to do for Cover 2 and Cover 6 at the break and in the aggregate, and over-corrects the 10-15 yd window to a third or less of the NFL's wide-open rate (a window the sample puts at 292-334 receiver-moments in Cover 2, 241-263 in Cover 6). The flat gains the open yards that the window loses (class (a) up in the package, class (c) up in SF+FB), so the owner of the flat is still the open item, now with 2.3-2.4 open flats a game against the NFL's 1.5.
- SEAT_FILL and OFF_DRIVE add little to the aggregate over SQUAT_SINK+FLIGHT_BREAK on these samples: SF+FB alone is at or under the package on the 10-15 window, on the Cover 2/6 corner rows and on open flats. Cover 1 (man) does not improve in either arm.
- Samples: each arm 24 games, one draw; differences of about 0.04 in a wide-open share and about one point in a per-throw rate are inside the noise of these counts. The corner-break rows have n 30-125.
