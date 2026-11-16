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
