# PLAY_HANDS: a recorded attempt (Coverage, 2026-11-12)

Status: kept on its branch (`coverage/C14-play-hands`) as a recorded attempt; no PR to develop. Stopped at the attempt limit.

## Question

A trailing in-phase defender 1–2 yd from the target at arrival lets 67–78% of on-target balls be caught in the sim, against the NFL's 50% (`trail.py`). Can he play the receiver's hands, not only the ball?

## What was built (flag `PLAY_HANDS`, off)

- **Hands position.** The hands are where the catch is made: the ball at the catch, carried to the tuck over the securing window.
- **Inside standing reach:** unchanged from the engine-39 contest (`CATCH_HANDS`, `CATCH_SECURE`).
- **Beyond standing reach:** a defender reading the catch may lunge to the hands themselves, out to tackle.ts's 0.45 yd lunge. It is his decision, judged from what he sees, with error σ = 0.1 + 0.25 × (1 − ball skills) of the distance.
- **Cost:** the lunge commits his body through tackle.ts's `commitLunge` lean, sized by his extension. The support physics turns that into lost balance and recovery.
- **Sources:** the lunge distance, the lean and the standing reach come from existing mechanics. The judgement σ is a new estimate.
- **Fixtures:** `test/play-hands.test.ts`.

## Attempts

1. **Swipe on reach, speed and timer cost** (engine-36 base):
   - forced go, 1–2 yd: 0.52 → 0.46;
   - `trail.py` completion: 72 → 66%;
   - but hip-catch YAC rose 1.0 → 4.3, because every defender in range swiped and paid;
   - under 1 yd worsened 0.17 → 0.26.
2. **Plus a geometric lunge margin** (engine-39): the effect vanished (`trail.py` 67 → 68%), and under 1 yd and Cover 1 still worsened.
3. **Engine-39 behaviour inside standing reach, the lunge as his judgement, physical cost** (engine-40):
   - forced go, under 1 yd: 0.24 → 0.24;
   - forced go, 1–2 yd: 0.55 → 0.54 (trailing 0.55 → 0.48);
   - `trail.py`: 68 → 71%;
   - openness table: tight / mid / open 46 / 59 / 69 → 46 / 57 / 71%;
   - paired YAC on the same catches: 14.56 → 14.78.

## Why it does not move the target

Geometry at the catch, from `scripts/diag/risk/hands-geom.ts` (forced go, nearest defender 1–2 yd, n 73, 21 trailing):

- The hands are 0.15–0.21 yd off the receiver's centre (`CATCH_POINT` catches at closest approach).
- The defender is 1.38 yd from the hands at p50, 1.47 when trailing.
- Standing reach is 1.14 yd: 16% of these defenders are within it. With the lunge (1.59 yd), 77% are.
- The success law is `CATCH_HANDS`'s: pLoose ∝ depth^0.7, where depth is how far the hands are inside his reach. A full-stretch hand, the usual case here, gets 15–20%.
- What decides a full-stretch hand at the catch is the open term. Fitting it to the NFL rate was ruled out.

## Next

A ball-placement diagnosis comes first: where tight balls arrive relative to the receiver and to the defender, NFL vs sim. If the NFL's missing third is placement (balls away from the defender, caught at full stretch), this mechanism is not where the gap is.
