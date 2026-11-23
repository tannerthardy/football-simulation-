# Pursuit diagnosis: old angles or missed tackles? (2026-11-23, measurement only)

Question (the user): do too many of our defenders take old angles and fall behind the ball carrier, or do they mostly
try to tackle and miss? Added from F09: do the CB and NB take angles *together*, and why does the NB come from behind?

Engine: develop 0226f0d3 (engine-91), no source change. Operator: `scripts/diag/pursuit/` on `defense/pursuit-operator`.
One analysis (`pursuit-an.py`) is applied to both sides, using positions and velocities at 10 Hz only.
- **NFL:** BDB 2025, every completion, 5,214 plays (24 dropped for tracking jumps). Flex ran it; the derived files are in
  `docs/reviews/data/2026-11-23-pursuit/` on `claude/quirky-franklin-9lbwbp` at 0f31795d.
- **Sim:** 8 coverages (cover0, cover1, cover2man, cover2, cover3, cover4, cover6, tampa2) × 32 concepts × 2 formations
  × 3 seeds × flip, 1,845 completions. Tables are in `docs/reviews/data/2026-11-23-pursuit-sim/`.

## Definitions

**Contact proxy.** Centre distance ≤ 1.0 yd. Checked against engine contact events on all 1,845 sim plays: both agree on
1,688; the engine has contact the proxy does not on 142; the proxy has contact the engine does not on 15.

**Beaten.** All three must hold:
- the defender was level with or ahead of the carrier at some point;
- the carrier's lead along his travel is > 1 yd and growing over 0.2 s;
- separation is > 1.5 yd and growing.

**Failure classes** for a beaten first defender, checked in this order:
1. engaged by a blocker: an offensive player within 1.2 yd of him for ≥ 0.3 s before the beat;
2. reached contact range, then beaten;
3. flat-footed;
4. overrun: moving against the carrier's travel at the beat;
5. old angle: heading nearer the bearing to the carrier than the constant-velocity intercept by more than 10°;
6. outrun on a fair angle.

**Two "first defenders" are scored.** "Nearest" is the nearest defender at the catch. "In front" is the nearest defender
not behind the carrier at the catch; on the film plays the nearest one was already trailing in 4 of 6.

**Operator checks.** The checks are the 12-play files (NFL and sim), the user's six film plays, and F09. The NFL check
found a tracking jump scored as contact (2022091809-2235), which led to the jump guard. The sim check found trailing
defenders scored as beaten and dragged tacklers scored as missed; both were fixed before these runs.

**Sim "beaten without contact" is genuine.** The first defender's closest approach before the beat had a median of
2.0 yd, and only 26% came within 1.5 yd. It is not an artefact of the 1.0 yd threshold.

## 1. Old angle or missed tackle? (outside catches, within 12 yd of the sideline)

| first defender (nearest at the catch) | NFL (n 2,094) | sim (n 701) |
|---|---|---|
| carrier speed at catch → +0.5 → +1.0 s (p50, yd/s) | 5.3 → 5.0 → 4.9 | **1.9 → 3.5 → 4.2** |
| stops him (tackles or holds for help) | 58.1% | 72.2% |
| reached contact range, then beaten | 10.9% | 3.3% |
| beaten without contact | 5.3% | 13.0% |
| trailing from the catch | 13.7% | 7.1% |

Failure class of the beaten or missed first defenders, outside catches:

| failure class | NFL (n 341) | sim (n 114) |
|---|---|---|
| reached contact range, then beaten | **60.7%** | 14.9% |
| engaged by a blocker first | 19.4% | 7.9% |
| outrun on a fair angle | 12.0% | 19.3% |
| old angle (aimed at or behind the carrier) | 5.3% | **28.9%** |
| overrun (moving against him at the beat) | 1.8% | **26.3%** |
| flat-footed | 0.9% | 2.6% |

After the first defender is beaten:

| | NFL | sim |
|---|---|---|
| carrier's yards after the beat (p50) | 3.2 | 7.0 |
| ends in a touchdown | 6.4% | 19.3% |

The first defender in front shows the same pattern:

| first defender in front, failure class | NFL (n 349) | sim (n 140) |
|---|---|---|
| reached contact range, then beaten | 55.9% | 10.7% |
| engaged by a blocker first | 22.3% | 7.9% |
| outrun on a fair angle | 14.6% | 23.6% |
| old angle | 4.0% | 32.9% |
| overrun | 2.0% | 22.9% |

The pattern holds within catch-speed bands:
- Slow catches (< 3 yd/s), NFL: contact then beaten 47%, blocker 27%, old angle 10%, overrun 3.5%.
- Slow catches, sim: overrun 32%, old angle 24%, contact then beaten 16%.
- 3-6 yd/s catches, sim: old angle 47% of 17 plays (small cell).

All completions show the same pattern. Old angle plus overrun is 42% of sim failures against 7% in the NFL. "Reached
contact range, then beaten" is 19% in the sim against 50% in the NFL.

**Answer.** Ours fail by angle, not by missed tackles. Our first defender stops the carrier more often than the NFL's.
When he fails, he rarely got there. The NFL's first defender usually reaches the carrier and is then broken, slipped or
blocked. Ours aim at or behind the carrier, or run past him, and the carrier then gains twice as many yards and scores
three times as often. Our failures are less frequent but cost more.

## 2. Why: the speed the pursuer assumes

Our receivers catch nearly standing still and then accelerate: median 1.9 → 3.5 → 4.2 yd/s on outside catches. The
NFL's are already running at 5.3 and hold it.

The pursuit forecasts all use the carrier's *seen current speed*, with no acceleration:
- **Meeting spot:** `pursuitPoint` under TRACK_PURSUIT; acceleration 0, forecast speed V = the seen speed.
- **On-top point:** OPEN_FIELD's `onTopPoint`; the seen velocity × at most 0.6 s.
- **Close gather:** aims at his seen position.

Stale-spot row: four zone coverages, one seed, 358 completions, read through a read-only engine trace tap
(`pursuit-assume.mts`). For the nearest defender on outside catches (n 70):

| | median (yd/s) |
|---|---|
| carrier speed assumed when the defender first committed (about +0.3 s) | 2.2 |
| carrier's actual speed then | 2.5 |
| actual speed 0.5 s later | 4.1 |
| actual speed 1.0 s later | 4.8 |
| actual minus assumed, at +0.5 s | **+1.8** (p75 +2.5) |
| actual minus assumed, at +1.0 s | +1.6 |

For the first defender in front the gap is +1.9 at +0.5 s. Ticks spent before reaching contact range were split
across the meeting spot (57%), the close gather (30%) and the on-top point (9%).

On the NFL side, a current-speed forecast would be off by about −0.3 yd/s at +0.5 s, because carriers hold their speed.

The forecast's no-acceleration assumption is a modelling choice (TRACK_PURSUIT cites people not perceiving acceleration
over short windows). It is cheap against an NFL catch. It is costly against our standing catch: the forecast spot sits
at or just ahead of the carrier, then he runs through it. On the checked sim old-angle plays, the defender's heading is
within 3-18° of the bearing to the carrier. Meanwhile the intercept he would need opens from 30° to 65° as the carrier
goes from 0 to 5.8 yd/s.

Two causes can be at work, and this report does not decide between them:
- the forecast (a defender should anticipate a receiver who will accelerate out of the catch);
- the catch itself (why our receivers catch stopped). A route/catch question for Offense.

## 3. F09 (y_cross vs cover4_poach): why the NB chases from behind

Trace: `f09-trace-develop.txt`. The setup was captured from the film game (`film-setup.mts`) and replays exactly: 22 yd,
NB `missed_tackle` at +1.2 s, CB_S tackles.

**At the catch.**
- Y catches 4 yd from the sideline, standing still (0 yd/s), 12 yd past the LOS on 1st & 10, so past the line to gain.
- NB: 10.0 yd away, 1.8 yd ahead of the carrier along his line and 9.8 yd inside him, running 7-8 yd/s across the field.
- CB_S: 12.9 yd away, 12.6 yd ahead and 2.7 yd inside, coming downhill.

**NB, +0.3 to +0.7 s: meeting spot.**
- OPEN_FIELD's on-top point is switched off for this play: its short-yardage exception counts a runner *past* the line
  to gain as short yardage. This is the parked #855 bug.
- His forecast assumed 1.2 → 3.6 yd/s while the carrier was actually doing 2.2 → 4.4 and accelerating.
- His aim stayed only 1.0-1.6 yd ahead of the carrier along the carrier's line.

**NB, +0.8 s on: close gather.**
- He is 3.7 yd away and dead level with the carrier.
- The gather's goal is the carrier's seen position. At 8 yd/s across the field he crosses behind the carrier: 1.1 yd
  behind at +1.0 s, 1.3 yd behind at +1.2 s.
- He reaches for the carrier from behind his hips and misses (engine `missed_tackle`, +1.2 s).

**CB_S.**
- He used the meeting spot, then from 6.1 yd the close gather.
- He slows to 2.5-3 yd/s, takes him level, and bonds at +1.5 s for the tackle.

**With #855's open-field file on develop** (only `src/sim/open-field.ts` from d0047a71; with its flags off the build
reproduces develop exactly):
- The NB takes the on-top point until +0.8 s, but still ends up behind at +1.0 s (1.1 yd behind).
- He does not miss; he wraps late at +2.65 s.
- The play goes 23.4 yd instead of 21.9 yd.
- #855 changes the stage, not the outcome. The on-top point also forecasts at the seen speed: at most 0.6 s of lead at
  1.9-4.1 yd/s against a carrier reaching 5.

**Answer.** The NB approaches as if from behind because every stage aims him at where the carrier is, or at most 1.5 yd
ahead, while the carrier accelerates from a standing catch. Then he arrives level at full speed across the carrier's
path and his own momentum carries him behind.

## 4. "Together": do two defenders bracket the carrier?

Two nearest defenders at each moment; bracketed = on opposite sides of the carrier's velocity line. Outside catches:

| | NFL | sim |
|---|---|---|
| bracketed at the catch | 32.7% | 26.2% |
| angle between them at the catch (p50) | 60° | 46° |
| bracketed at +0.5 s | 31.8% | 36.5% |
| bracketed at +1.0 s | 39.3% | 43.9% |
| bracketed at first contact | 34.9% | 37.0% |
| angle between them at first contact (p50) | 62° | 56° |
| first man into contact range arrives from behind the carrier's hips (> 90° off his travel) | 64.5% | 62.1% |

All completions:

| | NFL | sim |
|---|---|---|
| bracketed at the catch | 42.8% | 34.7% |
| bracketed at first contact | 46.0% | 40.1% |
| first man arrives from behind the hips | 58.2% | 54.2% |

On this measure we are close to the NFL. NFL pairs start somewhat wider apart at the catch, but ours bracket as often
by +0.5 s, and arrivals from behind the hips are as common in the NFL. The population difference is in section 1
(angle and overrun failures), not in bracketing as measured here.

A caveat on the operator: "bracketed" ignores the sideline as the second side. Plays near the sideline (F09: the carrier
4 yd from it, both defenders inside) can be well contained without two defenders on opposite sides.

## 5. From the code: does a pursuer know where his teammates are pursuing?

No. Each defender solves his own intercept from his own picture of the carrier:
- **`chase` and `pursuitPoint`** (`src/sim/behaviors/common.ts`): forecast and meeting spot use no teammates.
- **`onTopPoint`** (`src/sim/open-field.ts`): looks at offensive bodies in the lane only.
- **`aroundBodies`:** looks at offensive bodies only.

The only shared structure is a fixed leverage rule:
- `leverage()` shades every pursuer to the carrier's inside, more so near the sideline. It is identical for all
  pursuers, so it cannot assign one man inside and another outside.
- `pursuitLeverage` honours a called outside shoulder only from an installed run fit (`runFit` force or edge). There is
  no pass-play pursuit role: no force, alley or inside-out-by-position.

Nothing makes a defender keep his angle *relative to* a teammate's.

## The six film plays (sim)

`film-plays.txt`. The first defender in front was beaten without contact in 5 of 5 (F67 had no defender in front):

| play | how he lost the carrier |
|---|---|
| F64 | DT_W, old angle |
| F62 | outrun on a fair angle |
| F65 | outrun on a fair angle |
| F69 | outrun on a fair angle |
| F66 | engaged by a blocker first |

The nearest defender at the catch was trailing in 4 of 6.

## Limits

- **Sim sample.** Staged single plays at LOS 40 from the native trace setup, not games. The stale-spot row is one seed
  of four zone coverages.
- **No NFL truth tags.** BDB 2025 has no missed-tackle column, so "reached contact range, then beaten" mixes missed
  tackles, broken tackles and slips.
- **Inferred categories.** Old angle and overrun are geometric inferences. They were checked by eye on 6 sim plays and
  12 NFL plays, not validated against tags.
- **The sim's slow catch** is part of the cause and is outside the Defense lane.
