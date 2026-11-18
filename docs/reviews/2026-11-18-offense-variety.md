# What our offense asks the defense, against the NFL (2026-11-18)

Integration's item: four held defensive rules never fire because our offense never asks their question. Ours: 8 whole
games, 1,038 called snaps (`scripts/diag/offense/what-we-show.mts`; the call before motion). NFL: BDB 2025 week 1, 1,944
snaps (`scripts/diag/offense/nfl_show.py`: plays.csv formation and alignment; the snap frame for personnel, stacks,
bunches and splits with structure.ts's thresholds; route breaks from `scripts/diag/routes/route_timing.py`).

| look | NFL | ours | held rule it would exercise |
|---|---|---|---|
| 2x2 / 3x1 / 2x1 / empty (3x2) / quads | 42.8 / 36.4 / 10.9 / 6.6 / 1.1% | 40.2 / 44.6 / 9.4 / 5.8 / 0% | — / C3_HOOK, Book / — / Book-Read / Quads checks |
| personnel 11 / 12 / 21 / 10 | 62.6 / 17.5 / 8.4 / 1.3% | 58.3 / 17.9 / 7.1 / 13.3% | 10 personnel ten times the NFL's share |
| receiver stack (two within 1.6 yd across, 0.8 deep) | 16.9% | 1.8% (heavy_13; gun_wing_12's 7.1% is a wing on the Y) | Zone It, stack releases |
| reduced #1 (6-9 yd from the ball) | 37.6% (loose: includes wing sides) | 1.8% | Zone It, Cover 9 Clue |
| 2x2, both #2s detached | 11.3% | 6.6% (gun_spread_10, 10 personnel only) | QUARTERS_CHECK Palms, PALMS_FIX |
| bunch | 9.7% | 7.4% | Box, BOX_IN, banjo |
| corner break depth: under 9 / 11-14 yd | 43% / 27% of corners | none / all (12 yd) | C2_APEX undercut, SQUAT_TOPDOWN |
| out break at 5-7.5 yd | 10% of OUTs | none (quick out 5, out 10) | PALMS_FIX trigger |
| trips with a cross / trips flat-and-go | 16.1% / 12.6% of dropbacks | y_cross from trips: #2 crosses, #3 flat; flood: #2 out | C3_HOOK (#3 over; #3 flat under vertical #2) |
| a wheel on the play | 2.1% of dropbacks | seam_hitch's back wheel only | PALMS_FIX wheel, Q flat-wheel |

Caveats: NFL OUT/IN/CROSS are mostly short (52% of OUTs, 40% of INs, 55% of CROSSes break inside 5 yd); concept
shares in the NFL cannot be read from labels, so concept rows give patterns, not plays. "Reduced" is loose (it counts a
wing side); a stricter split needs the wideout's alignment, not the outermost body.

## The top six, by NFL frequency and the held rule they would exercise
| # | install | needs | owner |
|---|---|---|---|
| 1 | Receiver stacks and reduced splits in 2x2 and 3x1 (a stack-slot doubles, a tight-split trips) | formation defs with depth/split offsets (`formations.ts`); release order for the stacked pair (CRAFT_HOLD/RELEASE_SIDE); concepts as they are | Rules+Coaching (formations, concepts); receiver release work |
| 2 | 11 personnel 2x2 with both #2s detached (a flexed Y), and 10 personnel back to its NFL share | one formation def; the playcaller's personnel weights | Rules+Coaching; playcaller owner |
| 3 | Smash corner at 8-9 yd beside the 12-yd deep corner | a `smash_corner` route; smash and corner-flat use it; read plan: hitch/corner off the squat corner | Rules+Coaching (route, concept); QB lane (key, timing) |
| 4 | Trips with #3 on the over (Y-cross / drive from 3x1) | concept (#1 clear, #2 seam or dig, #3 over at 12-14); read: high-low on the hook and robber | Rules+Coaching; QB lane |
| 5 | Trips flood/sail with #3 flat under a vertical #2 (#1 dig or post, #2 go, #3 flat) | concept; read: #2 go to #3 flat off the curl-flat; protection unchanged | Rules+Coaching; QB lane |
| 6 | #2 out at 6 and the wheel (out-and-up, a #2 or back wheel off a flat) | routes (`out6`, `wheel` for a slot); a concept pairing them; read: the wheel as a shot off the squat/Palms corner | Rules+Coaching; QB lane |
Also: shallow series under each hook rule (mesh and drive variants with the shallow at each hook), when the CUT_WALL
exemptions are revisited. Every install needs its read plan in the read compiler (KEYS/ROLE_KEYS, `installedPlan`)
before it is called in games; protection changes for none of the six.
