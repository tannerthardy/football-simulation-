# HAND_MOMENT (off): the press bounded by the moment it puts on the pusher's trunk (Tools, 2026-11-16)

Flex's finding (B) and Integration's order: bound the hands joint's push by `armForce * fatigue * CHEST_HALF / (reach * sin(theta))`, `theta` the angle of the line to the other man off the pusher's facing, `reach` the distance to his near surface. It is the trunk link of the chain in `2026-11-16-contact-law.md` (on #790), the same cap `GRASP_ARM_MOMENT` already puts on a grasp's yaw, and adds no constant. Push only; steer and hold are as built. It lives in `World` (the hands row's `pushLim`), behind `HAND_MOMENT=1`, off by default; `test/hand-moment.test.ts` holds that unset is off, that a press square to his chest (theta 0) is unchanged and that one at an angle is limited, more so the wider the angle.

## Gates, in Integration's order

**1. Flex's edge pair** (`edge-ride-staged.mts` on claude/quirky-franklin-9lbwbp with this patch; 293 / 269 edge rushers reaching the tackle's hip, flag off / on):

| | off | on |
| --- | --- | --- |
| centre distance p50, hip / +0.2 / +0.5 / +1.0 s (yd) | 0.79 / 0.94 / 1.24 / 1.57 | 0.73 / 0.84 / 1.10 / 1.42 |
| p75 at +1.0 s | 2.29 | 2.66 |
| hip to hip (<= 1.0) by +0.5 s | 80% | 80% |
| closing on the tackle 0 to 0.5 s | -0.71 yd/s | -0.48 |
| tackle speed; down within 1.0 s | 2.9 yd/s; 0% | 2.9; 0% |
| hands then off and stay off / re-fit / never off | 49 / 5 / 46% | 38 / 2 / 59% |
| to the QB, hip to +1.0 s (NFL 5.3 to 3.5) | 4.9 to 4.2 | 4.8 to 3.5 |

The ride tightens toward the NFL's hip-to-hip 0.7 to 1.0 (p50 1.24 to 1.10 at +0.5 s) and the rusher's distance to the QB at +1.0 s lands on the NFL's 3.5. The press costs the tackle neither speed (2.9) nor balance (none down). The tail grows (p75 at +1.0 s 2.29 to 2.66, fewer reach the hip: 293 to 269) and the share who never clear his hands rises 46 to 59%: the bound holds some rushers off, so the shape is more bimodal; whether that is the NFL's bimodality is Flex's read.

**2. Interior staged pair** (C 144 kg against DT 140 kg, `SET_SPOT=1`; the gate where theta is near 0 and the bound should not bind). It does bind a little: pair walk-back 1.15 off, 1.26 on (rusher power x0.85 0.94 to 0.99, blocker mass x0.9 / x1.1 1.56 / 0.95 to 1.48 / 1.03). The log of the bound's evaluations on that pair (rows where the hands push, pusher index 3): it binds on 56% of rows at a median 9 degrees off facing (p90 15), reach 0.65 yd, limit 1.82 kN against a push of 2.03 kN: a 10% trim. At a small angle the bound is about `armForce * 0.12 / (0.65 * sin theta)`, which is `1.15 * armForce` at 9 degrees: the press capacity (`pressForce`, a bench press) is above the hold capacity (`armForce`) it is bounded by, so a squarely planted pusher a few degrees off still gives up about a tenth. That is the one honest weakness of the form: `M_max = armForce * CHEST_HALF` is the grasp-yaw cap, borrowed. If the chest's sustained moment capacity is larger (no source), the interior effect goes away; if it is smaller, the edge effect grows.

**3. Run set** (1,438 saved plays, paired, capped at 20), by family; off mean, paired delta (SE), stuffs off to on:

| family | n | off | delta | stuffs |
| --- | --- | --- | --- | --- |
| OZ | 428 | 2.86 | -0.16 (0.19) | 16.6 to 19.4% |
| IZ | 218 | 3.21 | +0.25 (0.24) | 14.2 to 12.8% |
| counter | 161 | 3.54 | -0.13 (0.31) | 9.9 to 7.5% |
| power | 158 | 3.48 | +0.07 (0.28) | 5.7 to 7.0% |
| trap | 155 | 4.23 | +0.23 (0.22) | 7.1 to 4.5% |
| duo | 139 | 3.07 | +0.05 (0.33) | 16.5 to 16.5% |
| draw | 95 | 4.35 | -0.32 (0.50) | 26.3 to 25.3% |
| toss | 61 | 2.56 | +0.26 (0.63) | 31.1 to 29.5% |
| all | 1,438 | 3.32 | +0.01 (0.10) | 14.7 to 14.8% |

No family resolves. The outside-zone stuffs rise 2.8 points (16.6 to 19.4%, SE about 2.4: not resolved) where a reach block presses at an angle, which is where the bound would bind.

**Dither** (the 135-play panel, then `test/dither-budget.test.ts` on the engine defaults): the budget test passes with `HAND_MOMENT=1`. Carrier / spacing 0.1713 to 0.1511, rush controller 0.224 to 0.204, block / spacing 0.0682 to 0.0782 (295 to 357 events, under its budget); pursuit and loose ball move on 52 and 23 events.

**4. Pass protection** (16 games, seed 23, paired, `SET_SPOT`, `SET_SPOT_TACKLE` and `POCKET_LEVEL` on in both arms, on Flex's branch where they live):

| | base | HAND_MOMENT | delta (interval) |
| --- | --- | --- | --- |
| sack rate per dropback | 4.9% (68/1399) | 5.8% (80/1382) | +0.9 (-0.8 to +2.7) |
| time to throw (s) | 2.77 | 2.73 | -0.05 (-0.09 to -0.01) |
| completion | 67.6% | 66.1% | -1.5 (-4.1 to +0.9) |
| yards / attempt | 9.17 | 8.44 | -0.73 (-1.33 to -0.12) |
| YAC / reception | 7.79 | 7.22 | -0.58 (ns) |
| rush yd / carry (capped) | 3.50 | 3.58 | +0.09 (ns) |
| run stuff rate | 11.8% | 11.6% | -0.3 (ns) |

The rusher gets to the QB faster (time to throw -0.05 s resolved, sacks +0.9 points not resolved, yards per attempt -0.73 resolved: the pass game loses yards as the rush arrives sooner, and the row moves toward the NFL band of 6.35 to 7.89 from 9.17 above it). Pressure by class, never-released and pocket depth are not rows this card has; run them before it is carded. The run rows do not move (a single card's rush row is +-0.4 on its own: `docs/TESTING_COSTS.md`).

## Reading

The edge ride and the rusher's distance to the QB move to the NFL's values with no cost to the tackle's speed or balance, the run set and the run families do not move beyond noise, the dither budget holds, and the pass game loses a yard per attempt that it had in excess of the NFL's. The interior pair moves by about a tenth because the borrowed moment capacity (`armForce * CHEST_HALF`) is lower than the press capacity at small angles; that is the figure that needs a source (the chest's sustained moment against a hand load; Kroemer 1974 and the Waterloo push-pull thesis are the places to look, not read here). I would card it with `SET_SPOT`, `SET_SPOT_TACKLE` and `POCKET_LEVEL` once the pressure-by-class read is in, and I would not promote it without a source for the moment capacity or three levels of it read (1.0, 1.5 and 2.0 times the borrowed cap).

## Capacity levels (Integration's ruling, 2026-11-16, on engine-70 c5c6f590)

The cap `armForce * CHEST_HALF` is borrowed from the grasp's yaw bound, so the one thing in the form without a source is how much moment the chest holds against a hand load. `HAND_MOMENT_CAP` (percent of the borrowed value, default 150) reads it at 100, 125, 150 and 200. The rule for the stated choice: the lowest level at which a pusher square to his man (within about 10 degrees of his facing) is not bound. At 10 degrees and the interior pair's reach of 0.65 yd the 100% limit is 1.63 kN against the 2.03 kN push, so 125% is the least that clears it; 150% is the lowest of the three named levels that does.

**Interior pair** (C 144 kg against DT 140 kg, `SET_SPOT=1`, `anchor-staged.mts`; flag off 1.15 yd/s toward the QB):

| cap | pair walk-back | rusher power x0.85 | blocker mass x0.9 | blocker mass x1.1 |
| --- | --- | --- | --- | --- |
| off | 1.15 | 0.94 | 1.56 | 0.95 |
| 100 | 1.26 | 0.99 | 1.48 | 1.03 |
| 125 | 1.14 | 0.93 | 1.56 | 0.98 |
| 150 | 1.13 | 0.92 | 1.56 | 0.95 |
| 200 | 1.13 | 0.94 | 1.56 | 0.94 |

At 100 the bound trims the pair and flattens its mass dependence (blocker x0.9 1.56 to 1.48); at 125 and above the pair is the flag-off pair, with the same dependence on mass and power.

**Edge pair** (`edge-ride-staged.mts`, same bodies and seeds; rushers reaching the tackle's hip: 293 off, 269 / 292 / 292 / 287 at 100 / 125 / 150 / 200):

| | off | 100 | 125 | 150 | 200 |
| --- | --- | --- | --- | --- | --- |
| centre distance p50, +0.5 / +1.0 s | 1.24 / 1.57 | 1.10 / 1.42 | 1.12 / 1.33 | 1.12 / 1.28 | 1.15 / 1.34 |
| p75 at +1.0 s | 2.29 | 2.66 | 2.53 | 2.01 | 2.08 |
| closing on the tackle, 0 to 0.5 s (yd/s) | -0.71 | -0.48 | -0.58 | -0.55 | -0.52 |
| hip to hip by +0.5 s | 80% | 80% | 82% | 82% | 78% |
| hands then never off | 46% | 59% | 52% | 48% | 50% |
| to the QB, hip to +1.0 s (NFL 5.3 to 3.5) | 4.9 to 4.2 | 4.8 to 3.5 | 4.8 to 3.9 | 4.7 to 3.9 | 4.9 to 4.1 |
| tackle speed; down within 1.0 s | 2.9; 0% | 2.9; 0% | 2.9; 0% | 2.9; 0% | 2.9; 0% |

The ride tightens at every level; the rusher's distance to the QB at +1.0 s reaches the NFL's 3.5 only at 100 and shrinks from there (4.2 off, 3.9 at 125 and 150, 4.1 at 200). The share of rushers whose hands never clear, which rose to 59% at 100 (the wrong direction for the rusher, Flex's concern), is 52% at 125, 48% at 150 and 50% at 200, within a few points of the off value (46%). So the interior pair and the hands-clearing shape both want 125 or more, and the edge rush's gain is about half of what the borrowed cap gave.

**Pass rush, by class** (`hand-pressure.mts`: 864 staged pass plays, 2 edge and 2 interior rushers each, `SET_SPOT`, `SET_SPOT_TACKLE`, `POCKET_LEVEL` on; pressure = within 1.5 yd of the QB before the throw):

| | off | 100 | 150 |
| --- | --- | --- | --- |
| edge: pressured, first at p50 | 6%, 3.10 s | 8%, 3.00 s | 9%, 3.10 s |
| interior: pressured, first at p50 | 1%, 2.85 s | 2%, 2.80 s | 1%, 2.75 s |
| edge, engaged and never released | 88% | 87% | 88% |
| interior, engaged and never released | 95% | 94% | 95% |
| pocket: QB to nearest rusher p50 at 1.5 / 2.0 / 2.5 s (yd) | 5.20 / 4.51 / 3.67 | 5.19 / 4.41 / 3.48 | 5.19 / 4.45 / 3.55 |
| a rusher within 1.5 yd by 2.5 s | 1% | 1% | 1% |

Here "never released" is a blocker's hands on him at some tick and at every tick after until the throw or his pressure; the staged plays are the QB lane's, many without a throw inside 3.5 s, so the pressure rates are small. Neither level moves never-released, and the pocket's room at 2.5 s falls by 0.1 to 0.2 yd. This set does not separate the levels from each other or from off beyond that.

**Pass-protection card** (16 games, seed 23, `SET_SPOT`, `SET_SPOT_TACKLE`, `POCKET_LEVEL` on in all arms, on Flex's branch; base against each level, 90% ranges):

| | base | 100 | 150 |
| --- | --- | --- | --- |
| sack rate per dropback | 4.9% | 5.8% (+0.9, -0.8 to +2.7) | 6.4% (+1.5, +0.4 to +2.7) |
| time to throw (s) | 2.77 | 2.73 (-0.05, resolved) | 2.74 (-0.03, ns) |
| yards / attempt | 9.17 | 8.44 (-0.73, resolved) | 8.99 (-0.18, ns) |
| completion | 67.6% | 66.1% | 65.8% |
| run stuff rate | 11.8% | 11.6% | 14.1% (+2.3, ns) |
| rush yd / carry, capped at 20 | 3.50 | 3.58 | 3.36 (ns) |

One card is 16 games; the two levels' deltas are of the size the card cannot order (sacks +0.9 and +1.5 have overlapping ranges). The card does not say 150 is better or worse than 100, only that neither moves the pass game outside the NFL's bands for sacks (4.6 to 9.4%).

**Run set at 150** (engine-70, paired, capped at 20, ref arm = engine default; `HAND_MOMENT=1`, `ref-compare.py`; four placebo arms, the default stack with one body nudged 0.05 yd, give the floor):

| | all | OZ | IZ | gap | duo | toss | draw |
| --- | --- | --- | --- | --- | --- | --- | --- |
| main set (1,438), 100% | +0.05 (0.11) | -0.03 (0.22) | +0.06 (0.26) | +0.15 (0.16) | -0.07 (0.28) | +0.03 (0.71) | +0.05 (0.43) |
| main set (1,438), 150% | -0.12 (0.10) | -0.34 (0.18) | +0.21 (0.24) | +0.08 (0.15) | -0.63 (0.22) | -0.47 (0.81) | +0.00 (0.37) |
| fresh set (1,295), 150% | -0.02 (0.11) | -0.05 (0.22) | +0.05 (0.24) | -0.16 (0.16) | +0.07 (0.36) | -0.09 (0.82) | +0.46 (0.39) |
| placebo floor, rms of four | 0.07 | 0.14 | 0.16 | 0.06 | 0.26 | 0.39 | 0.13 |

On the main set 150% is -0.12 overall with OZ -0.34 and duo -0.63, both about 2.4 times the placebo rms; 100% on the same set moves nothing, and a bound that bound more at 100 than at 150 would move more at 100. On the fresh set (a different 1,295 plays) 150% is -0.02, OZ -0.05, duo +0.07. Not monotone in the cap and not reproduced on a second set: I read the main-set OZ and duo as divergence the 0.05 yd floor does not cover (one placebo arm alone gave duo -0.45), not as a mechanism. Missed + broken tackles per run 0.216 + 0.091 against 0.202 + 0.084 (main set), 0.216 + 0.107 against 0.212 + 0.110 (fresh). The dither panel with `HAND_MOMENT=1` at 150% passes (every controller and stage inside its budget).

## What the stated choice is

150%: the lowest of the three named levels at which the interior pair is the flag-off pair and a pusher square to his man is not bound. It is a level of a borrowed capacity, not a fit; the source for the chest's sustained moment against a hand load (Kroemer 1974, the Waterloo push-pull thesis) is still owed and nothing here measured it. What it costs is half of the edge gain the borrowed cap gave: the rusher is 3.9 yd from the QB one second after the hip (off 4.2, NFL 3.5), not 3.5. If a source gives a lower capacity the edge ride moves toward the NFL and the interior pair gives up the same fraction of its press; the flag is the one place that trade is made.

## A source for the capacity, and what it does and does not say (2026-11-16)

Chow, A. Y. (2010), *Investigation of Hand Forces, Shoulder and Trunk Muscle Activation Patterns and EMG/force Ratios in Push and Pull Exertions*, MSc thesis, University of Waterloo (UWSpace 10012/5551; read from the full text, tables 3, 4, 11 and the results of §4.2). Twelve male and twelve female volunteers (males 76.8 kg, 180 cm, ages 18 to 26, not athletes) performed maximal two-handed isometric pushes and pulls on a fixed handle at 100 and 150 cm, vertical and horizontal, elbows extended or at 90 degrees or less, with shoulder and L5/S1 moments from kinematics and hand force.

What it gives:
* Males' total two-handed push force: 454 to 475 N with elbows extended (100 and 150 cm, both orientations) and 575 N with flexed elbows at 100 cm, that is 0.60 to 0.76 of body weight (a flexed elbow pushes about 25% harder: the limit is the shoulder moment, not the legs). Females 67% of males. A larger body mass gave a significantly greater force (p about 0.01).
* Resultant shoulder moments across all conditions: right 5.0 to 140.1 N·m (mean 50.4), left 2.2 to 132.5 (mean 43.3). The push direction gave the greater shoulder moments, and extended elbows (a longer reach) gave shoulder flexor moments about three times those of flexed elbows at the same task: the shoulder's moment, force times reach, is what an extended push draws on, which is the form `HAND_MOMENT` bounds.

What it does not give: a lineman's capacity. The volunteers pushed with their whole body against a fixed handle (their legs drive it), at a self-selected stance, and the moments are what a maximal push happened to load, not a measured limit of the chest or the shoulder. Not read: a trained lineman, a hand pressing a moving body, or a moment capacity at the angle of a locked-out arm.

An order of magnitude, as a check and not a source: the borrowed capacity at 100% is `armForce * CHEST_HALF`, 1.54 kN (the interior pair's DT, 140 kg) times 0.11 m, about 169 N·m. The volunteers' peak right shoulder moment, 140.1 N·m for a 77 kg man, scaled to 140 kg is 255 N·m if it grows with body mass (151% of the borrowed value) and 209 N·m if it grows with mass to the two-thirds (124%). The band the stated 150% sits at the top of is 124 to 151%; the mean (50 N·m, 30% of the borrowed value) is a different quantity (the average load across conditions, not a capacity). The three levels read (100, 150, 200) bracket this; 125 to 150 is where the measured scale lands, and 100% is below it.

So: the thesis supports the form (a long reach loads the shoulder, a bent elbow carries more) and puts a mass-scaled measured peak at 124 to 151% of the borrowed capacity. It does not turn 150% from a stated choice into a measurement: it is a scaled number from untrained volunteers.
