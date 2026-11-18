# Facing as a state: design (no build)

Tools/Physics, 2026-11-18, for Integration. Design only until #850's card is in. Measurements: `scripts/diag/body/facing_dist.py` (NFL BDB 2025 weeks 1-9 dropbacks, `o` orientation against `dir` motion, provider `s`; sim: 8 games, seed 101, develop 7a157055, hips = `facing`, shoulders = `facing + trunk`; one operator, 0.1 s grid from the snap to the throw, open movement = nobody within 1.5 yd), `route-speed-sim.mts`, `flip-bench.mts`.

## What is true today

`facing` is the hips. Each tick it moves toward `commandFacing` at `turnRateOf` (`kinematics.ts`: `profile.turnRate`, 4.5-12 rad/s, CB median 9.2 = 527 deg/s, times 0.75 above 6 yd/s). `commandFacing` is the controller's `facing` if it sends one; otherwise the heading of the velocity request when planted (under `PLANT_SPEED` 2.5 yd/s), or the travel heading plus the requested turn clamped to 60 deg (`FACING_LEAD`) when carrying speed. Receivers send no off-path facing except tracking the ball inside 3 yd (`2026-11-14-facing-consumer-map.md`). So facing is a function of velocity, and the laws that read it (DIR_CAP, DIR_START, view cones, MAN_TURN) read the velocity back.

| open movement, speed (yd/s) | receivers NFL | receivers sim shoulders / hips | defenders NFL | defenders sim shoulders |
|---|---|---|---|---|
| angle off path, p50 at 1.5-3 / 3-5 / 5-7 / 7+ | 27 / 20 / 15 / 14 deg | 0 / 1 / 5 / 1 (hips 0 / 1 / 3 / 1) | 113 / 95 / 51 / 21 | 130 / 126 / 53 / 9 |
| p75 | 58 / 41 / 34 / 31 | 12 / 38 / 40 / 13 | 149 / 138 / 80 / 37 | 162 / 157 / 112 / 16 |
| leads the path into a 20+ deg turn (next 0.3 s), median lead | 55 / 70 / 86 %, +9 / +17 / +26 deg | 57 / 53 / 57 %, +1 / +1 / +5 deg | 47 / 58 / 76 % | 44 / 41 / 32 % |
| yaw rate p50 / p90 / p99, deg/s, speed 3-5 | 43 / 139 / 325 | hips 18 / 167 / 424 (shoulders p99 636) | 32 / 100 / 239 | hips 13 / 219 / 289 |
| yaw rate p99 at speed 0-1.5 / 1.5-3 / 5+ | 231 / 287 / 246 | 506 / 498 / 327 | 211 / 226 / 225 | 277 / 288 / 281 |

NFL receivers are 14-27 deg off their path at the median at every speed and lead into turns by 15-25 deg; ours sit on the path and move in jumps (lower median yaw rate, heavier tail). Rules' slant/go hip separation (0.86-0.97 against the NFL's 0.54-0.62) is the same fact read as a classifier. Caveat on the NFL side: `o` is a 10 Hz tracking estimate of upper-body orientation; differencing it smooths instantaneous peaks, so its rate tail is a floor on what hips do, not a ceiling. The p10 of the offset at 7+ yd/s is 2 deg, so the 14 deg median is a real offset, not noise.

## The design, in order

**(a) A facing intent separate from the velocity heading.** The controller states where the player means to point, from the play he knows: a route runner approaching a break aims hips and shoulders at the next leg by the time he is about 0.3 s from it (the lead the NFL shows, +17 deg at 3-5 yd/s, +26 deg at 5-7), holds it through the plant, and after the break lags the new path by whatever the yaw limit leaves. `MoveCommand.facing` already exists; what changes is that route runners, and later defenders in coverage, send it instead of leaving the default. Inputs are his own route and his own state only (no one else's assignment). The velocity request stays the path; the body follows it under the directional cap, so a break is a lead of the hips, a plant, and a drive. One decision, held: the facing intent persists across the break and clears on the next leg (no re-aim per tick).

**(b) A hip yaw rate cap from the measured distribution.** State it as a measured body capacity, like `DIR_START`'s L: NFL orientation yaw rate p99 is 210-325 deg/s across speeds and roles (p90 73-139); ours reaches 280-506 at p99 and 120-219 at p90. Proposed cap: the profile's `turnRate` rescaled so the sim's p99 at speed lands at the NFL's (about 5 rad/s = 290 deg/s for a median body, still scaled by the body's own cone/shuttle score), one parameter, `YAW_CAP_PCT`. Control it must pass: a 180 deg hip flip then takes about 0.62 s instead of 0.34 s, so `flip-bench.mts` (speed after the flip from a 3 yd/s backpedal: 3.77 / 4.83 / 5.73 / 6.47 at 0.25 / 0.5 / 0.75 / 1.0 s today) and the turn-cost table must be re-read; if the flip then loses speed the NFL off-man row does not support (it does not, Coverage found the loss is a controller hold) the cap is too low for that move and the planted-turn limit is the one to relax (planted turns, under 2.5 yd/s, are where the NFL p99 is highest, 231-287 at receivers).

**(c) The gait-locked shoulder offset, only if cheap and nothing else moves.** NFL receivers at 7+ yd/s keep their shoulders 14 deg off the path at the median (p10 2, p75 31): counter-rotation against the stride. `trunk` (TRUNK_TWIST) is already a state with a range; driving it from the gait phase would change no movement (hips and velocity untouched) and matters only for what observers read: the shoulder-class readers (contact legality, wraps, gaze cones) would see +-14 deg. Leave it off until those readers are checked; it is the least important of the three.

## What changes once facing is real

| Law / reader | Today (facing = velocity) | After (a)+(b) | First check |
|---|---|---|---|
| Directional speed cap (DIR_CAP) | angle is almost always 0, bites only in jumps | bites at breaks: lead costs speed before the plant, lag after | turn-cost table (speed change over 0.5 s by entry speed x heading rate) against NFL |
| DIR_START | angle push vs pelvis follows the velocity request | a start after a break begins from a body already facing the new line: less penalty; reaction starts across the hips unchanged | start table, lateral/forward 0.2 s ratio, reactions only |
| Perception cones, gaze (`GAZE_NECK`, `viewCone`) | cone follows the path | cone swings with the intent: a runner leading a break looks at the new leg first; a defender's cone lags his path | cone-hit rates for catch-point and QB seen cues |
| QB stance / throw facing | own `facing` requests (shoulders) | unchanged unless he runs; the cap slows his turn to a read | QB footwork tests, dither |
| Zone eyes (ZONE_EYES) | requests facing toward the key/ball | the yaw cap slows the turn: eyes arrive later by (angle / cap - angle / old rate) | zone-eyes tests, coverage staged set |
| MAN_TURN / turn-and-run | flip in 0.34 s | flip in about 0.62 s at the cap | `flip-bench.mts`; man separation at 1.0 s staged |
| Contact legality, wraps (shoulder class) | shoulders = hips + trunk | unchanged unless (c) is on | wrap/legality counts |

## First measurable checks, before any flag

1. Facing-vs-travel table and lead-into-turn rows above, recomputed with (a) on: receivers' median off-path 14-27 deg at 1.5-7 yd/s (now 0-5), lead share 55/70/86 % with median lead +9/+17/+26 deg (now 57/53/57 %, +1/+1/+5 deg).
2. Rules' slant/go hip separation: 0.86-0.97 now; NFL 0.54-0.62 is the target of the measurement, not a number to fit.
3. Yaw rate p50 / p90 / p99 at 3-5 yd/s: NFL 43 / 139 / 325 (receivers), 32 / 100 / 239 (defenders), same operator.
4. Controls that must not move beyond noise: run yards by family, completion by family, sacks per dropback (DIR_START's lesson), dither budget, route-break speed (plant braking row).

Staging: (b) first, off by default (it changes every body); then (a) for route runners with their own route only; (c) last. Each is a flag, one parameter, no table by team or position.
