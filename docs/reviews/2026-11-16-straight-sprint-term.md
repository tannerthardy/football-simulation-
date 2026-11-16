# The straight sprint from 4 yd/s: the World does not lose drive (Tools, 2026-11-16)

Integration's question (Defense's `scripts/diag/defense/straight-row.mts` on defense/C14-high-low): a full-effort defender running 4 yd/s straight at the carrier gains +0.9 yd/s in 0.5 s in the World, against +1.5 for the same body stepped alone with `stepBody` and +1.8 on the sprint curve, and the same with `DIR_CAP=0`. Which term takes half the acceleration, on a lone body and with others near: intended, double-counted, or a bug?

**Answer: none. The World gives the same gain as `stepBody` from the same state and intent on every tick, it delivers all of the gait's planned force, and a real NFL defender in the same bin gains less than ours.** The gap in the probe comes from what the probe compares against.

## 1. The lone body matches

`scripts/diag/sprint-bench.ts` (lone body, the real `World.step`, no opponent): from 4.5 yd/s at full energy, the law's closed form, `stepBody` and the World give 6.02 / 6.04 / 6.04 yd/s at 0.5 s, 7.05 / 7.08 / 7.08 at 1.0 s (an LB, vmax 9.21, tau 1.29). Nothing in support, `legDrive`, availability or traction costs a lone man drive, and with bodies near and not in contact nothing changes (below, the same tick comparison inside plays).

## 2. In plays: World against `stepBody`, tick by tick, same state and intent

`scripts/diag/route-speed/straight-term.mts` (the probe's 74 defenders, hooks in `docs/reviews/patches/2026-11-16-straight-term-hooks.patch`): before each World step I clone the body, run `stepBody` on the clone with the intent the World is about to get, and compare the speed each gains over the step. By the angle of the requested velocity off his velocity:

| request off velocity | n ticks | World gain / step (yd/s) | stepBody gain / step |
| --- | --- | --- | --- |
| 0 to 15 deg | 387 | 0.14 (mean 0.10) | 0.14 (0.09) |
| 15 to 30 | 284 | 0.13 (0.09) | 0.13 (0.09) |
| 30 to 60 | 206 | 0.09 (0.03) | 0.10 (0.05) |
| 60 to 180 | 59 | -0.17 (-0.15) | -0.18 (-0.15) |

The force budget in `World.feet` is not the limit: over the first 0.5 s the planned force is 4.8 m/s² per kg (p10 3.2, p90 6.4), leg strength at his speed 6.1 to 6.5 (`pushForce * fv * along * a`, `fv` 0.73 to 0.75), traction 11.8; strength is under the demand on 7 to 20% of ticks and traction never binds; availability 1.00, fatigue 1.00. Realized speed gain equals the planned force along his velocity (3.85 against 3.82 m/s² where the plan is within 15 deg of his velocity). So no term between `stepBody` and the World costs drive. The first and third columns' small difference at 30 to 60 deg (mean 0.03 against 0.05) is the lean and support step, a tenth of a yard per second per second.

## 3. Why the probe's columns differ

* **The sprint-curve column runs to `vmax`; the defender asked for 8.09.** "Full effort" is `effort` 1.0 on a request of 8.09 yd/s (the controller's speed, 86% of his 9.39), not a request for top speed. The law's propulsion falls to zero at the wanted speed (`lift`, "starting is the low-speed end of the legs' force-velocity curve ... that force falls to zero at his wanted speed instead of at top speed"). The curve to 8.09: 4.72 at +0.25 s and 5.30 at +0.5 s. The World gives 4.70 and 4.95: equal at 0.25 s; at 0.5 s 0.35 yd/s lower, which is the next point.
* **The request is not straight.** The population is velocity within 45 deg of the line to the carrier, not the request within 45 deg of his velocity. The planned force is a median 49 deg off his velocity (p10 14, p90 104 deg), so most of it turns him: forward gain falls with the request angle (table above), and `locomotionAccel` gives the turn a share of the same envelope (`(a_t/At)^2 + (a_n/An)^2 <= 1`). Hips are median 13 deg off his velocity and 40 off the plan.
* **The "alone" column holds the intent from the catch tick for 0.5 s.** The real intent keeps changing direction, which the held one does not.

## 4. Is the ellipse right? The NFL envelope (`accel_turn_envelope.py`)

Forward acceleration a_t at 3.5 to 5 yd/s, by the normal acceleration |a_n| in the same frame (10 Hz, centred differences, all players; p99 of a_t, yd/s²):

| \|a_n\| | 0-1.5 | 1.5-3 | 3-4.5 | 4.5-6 | 6-8 |
| --- | --- | --- | --- | --- | --- |
| NFL | 5.75 | 5.05 | 4.70 | 4.43 | 4.10 |
| sim (8 games, same operator) | 5.21 | 5.00 | 4.56 | 3.76 | 3.45 |

The NFL's best forward drive falls by about 29% from straight to a 6 to 8 yd/s² turn; ours by about 34%: 15% under at the sharpest bin. Not the collapse to zero an ellipse of the two limits would draw at `An`. (Noise in a 10 Hz second difference inflates both axes; it cannot create the slow fall.) The sim's p50 and p90 are higher than the NFL's: ours accelerate more of the time.

## 5. The NFL man in the same bin

`nfl_straight_gain.py` and Defense's `rally.py` on the BDB 2025 export (weeks 1 to 9), completions caught 0 to 12 yd, defenders within 8 yd of the carrier at the catch with velocity within 45 deg of the line to him, back to the QB, unbroken for 0.5 s (n 1,204). Speed along the line to the carrier by his speed at the catch:

| speed at the catch | n | +0.25 s | +0.5 s | gain at +0.25 / +0.5 s | p25 / p75 of the +0.5 gain |
| --- | --- | --- | --- | --- | --- |
| 3.0 to 3.5 | 64 | 3.55 | 3.59 | +0.21 / +0.31 | -0.56 / +1.04 |
| **3.5 to 4.5 (v0 4.02)** | **220** | **4.21** | **4.39** | **+0.24 / +0.44** | -0.35 / +0.91 |
| 4.5 to 5.5 | 325 | 5.10 | 5.08 | +0.11 / +0.03 | -0.64 / +0.56 |
| 5.5 to 7 | 372 | 6.26 | 6.16 | +0.10 / -0.02 | -0.54 / +0.39 |

The World's 74: +0.70 at +0.25 s and +0.95 at +0.5 s from 4.0. The NFL defender from 4.0 gains +0.24 and +0.44; Defense's wider row (all velocity-off-line bins together, `rally.py`) is 5.29 at +0.25 s and 4.97 at +0.5 s for back-to-QB under 45 deg (n 1,619). Nobody in the NFL bin is at 6 by +0.5 s. They are closing on a carrier, arrival and the tackle stop the acceleration, and the sprint curve is not what a pursuing defender does.

Where the sim sits against the NFL in the rally row (`rally.py`, all families; ours from Defense's message, 8 games):

| | at the throw: distance / speed / heading off the line / closing | at the catch |
| --- | --- | --- |
| NFL first to arrive | 6.3 yd / 3.5 yd/s / 78 deg / 0.6 | 3.0 yd / 5.3 / 34 deg / 4.1 |
| ours first to arrive | 5.8 / 2.6 / 83 / 0.2 | 3.3 / 4.4 / 22 / not given |
| NFL second | 10.0 / 3.1 / 90 / 0.0 | 7.3 / 4.5 / 30 / 3.5 |
| ours second | 9.1 / not given / 103 / -0.3 | 8.0 / 3.9 / 26 / not given |

The NFL first man is 0.5 yd farther at the throw but 0.9 yd/s faster and already closing; at the catch he is 0.3 yd closer and 0.9 yd/s faster. His speed at the throw is the difference (3.5 against 2.6 yd/s), not what the body does after the catch. Full table: `out/defense-batch/rally_nfl.txt` (my container), sent to Defense.

## 6. Verdict

* Intended: the wanted-speed asymptote and the turn-share ellipse are the law as written (and the sprint curve toward `wanted` is what the World follows). Not double-counted, not a bug: World equals `stepBody` per tick, and strength, traction and availability do not bind.
* Probe: use the wanted speed as the curve's asymptote, and take the request angle off velocity as a condition, not the velocity angle off the carrier line. Re-run the "alone" column with the intent as it changes.
* Football: the real difference is earlier, in how fast and how directly our defenders move at the throw, a controller question. The sim's capacity is not behind it; the sim's forward drive while turning is about 15% under the NFL's at the sharpest turns, a smaller thing.
