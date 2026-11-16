# The defender's honest picture of the throw and the catch (design, 2026-11-15)

Coverage lane. Integration assigned this as the other half of the catch build. It is designed with
`2026-11-15-catch-closure.md`, because the defender's play on the ball (the breakup, the interception, the hit at the
catch) reads what he knows of the flight. Build order: after CATCH_CLOSURE stage one.

## The cheat it removes (measured)

**Today (`acquireFlight`).** Every defender past throw recognition gets the true flight copied at once, with no look
at the ball. That is the receiver's oracle on the other side of the ball.

**Under the estimator.** `acquireFlight` returns empty until he has his own estimate, and then records no flight. So:

- `hasObservedFlight` stays false;
- `flightLanded`, `unresolvedBallArea` and HONEST_READS' post-catch path never start for him;
- he stays in his coverage and arm-only branches past the catch.

`scripts/diag/risk/yac-split.ts`, seed 11 x 16, engine-69:

| | oracle | defense estimator only (2177) |
|---|---|---|
| YAC per reception | 7.50 | 14.10 |
| YAC at 2-3 yd separation | 5.6 | 10.7 |
| nearest defender's closing speed at the catch | 4.15 yd/s | 3.20 yd/s |
| first contact after the catch | 1.20 s | 1.55 s |

Pursuit fails even at equal separation. The goal is **not** a return to 7.5. The oracle's 7.5 is already above the
NFL's 4.5-5.9 with the cheat in. The goal is that pursuit starts from something he saw.

## What each defender gets, and when, from what he can see

Each cue comes through the perception he already has: delayed, in his view, occluded by bodies. Skill sets how fast
and how reliably he gets it, never what he does with it.

| Cue | What he sees | Gives him | Exists today |
|---|---|---|---|
| **Passer's eyes, set and front foot** (Defense's QB_INTENT, approved 2026-11-16) | his eyes held on a receiver in or entering the defender's window (ZONE_HOLD's held `seenQbEyes`) with his set; then the front foot's step into the throw, once the QB lane exposes it as a body event | a receiver (not a sector) and an intention (not a throw): an underneath zone dropper breaks on it before the ball leaves | Defense's rungs, read from the same per-defender picture; no change to this note's store or flags |
| **Passer's shoulders and arm** | the load, then the arm coming through, with the shoulders pointing | that it is thrown, and a coarse direction (a sector, not a point) | the release belief (arm and load cues); `shoulderTarget` for a zone defender |
| **The ball itself, if he looks** | the ball in his own eyes | its flight, with the glance error (`BALL_EST`, his own bit) | the glance rule (bit 2048) and the estimator |
| **His man's or zone threat's eyes, break and hands** | the receiver turning his head to the ball, settling, hands rising | that the ball is coming to him, and soon. The coached "play the hands" for a trailer who never sees the ball | `readsHandsAt` (hands-cue.ts); bit 256 for the man defender's look |
| **The catch** | the receiver holding the ball, seen; or heard from the crowd or the contact, and late | that it is caught, by whom, and where | **missing**: post-catch starts only from a recorded flight |

## What he does on each

0. **On the passer's intention (QB_INTENT, Defense):** an underneath zone dropper already breaking on the held eyes
   or the front foot keeps that break. The NFL's nearest zone defender is closing before the release (-0.8 to +0.9 yd/s
   over the last half second, speed 2.8 to 3.3); ours is not (-0.6 to 0.0, slowing).
1. **On the arm, without the ball:**
   - a zone defender breaks toward the sector the shoulders point at (today's shoulder-break);
   - a man defender stays on his man, and looks if he is in phase (bit 256).
   - No landing point.
2. **On the ball in his eyes:** he plays the flight he believes (`playObservedFlight` on his glance path). This is the
   only route to an interception, because an interception needs the ball.
3. **On his man's hands and eyes:** a trail defender plays the hands at the catch (CATCH_HANDS, and the closure's
   stage two jolt). He breaks on the catch, not on the flight.
4. **On a seen catch:** he rallies to the carrier. HONEST_READS' post-catch path starts here, from his own sight of
   the carrier holding the ball (the holder channel, `sim.see(a, R).carrying`), not from a flight's recorded landing.
   This is the missing link.
   - A defender who is looking elsewhere gets the catch when his view next includes the carrier, or by sound with a
     stated delay.
   - Sound is a choice: crowd noise or contact, read at two values.

## The arm is not the earliest cue

QB_INTENT puts eyes, set and front foot above the arm, so nothing here may start a defender's play from the arm as if
it were his first information:

- **The shoulder break (1).** On the arm a zone defender breaks toward the shoulders' sector. If he is already breaking
  on the passer's intention, the arm refines that break (the sector against the receiver he is already playing). It
  does not restart it from his drop, and does not double his acceleration.
- **The flight (2).** His ball play starts from the ball in his eyes, never from `loadingAt` or `releasedAt`. Neither
  rung gives him a landing point.
- **Stage two of the catch.** It reads when he started, which is the earliest rung he acted on (intention, arm, ball or
  hands), not `loadingAt`.
- **Today's code.** `shoulderTarget`'s break and the release belief (`loadingAt`, `releasedAt`, `ballAt`) are unchanged
  by this note. Where QB_INTENT and the shoulder break both act on one defender, the joint read is Defense's and mine
  together: the same throws with QB_INTENT on and off, and the defender's speed and heading through the arm. A second
  start shows there as a step in his acceleration at `loadingAt`.

## Skill (never the result)

| Rating | Acts on |
|---|---|
| playRecognition, anticipation | the delay from arm to break; the reliability of the shoulder sector |
| manCoverage | the phase judgment (bit 256, already); reading the hands |
| ballSkills | the glance dwell and error (already, through `skill()`) |
| reaction | the latency to a seen catch |

## What stage two of the catch reads from him

The closure's stage two jolt reads:

- where he arrives relative to the receiver's arms and the ball;
- whether he saw the ball, which decides whether he plays the ball or the hands;
- when he started.

All three are outputs of this picture, so stage two needs no other input from the defense.

## The honest arm is 26657, not 26625 (gate, 2026-11-16)

Measured with seed 11 on the engine-71 head. Receivers have BREAK_LOOK and SEEN_EMPTY on, with HEAD_RIDE, ACQ_SEEN and TRACKED_CATCH. The witness scripts are `scripts/diag/risk/def-late.ts`, `yac-split.ts` and `scripts/diag/catch/paired-throws.ts`.

| arm | YAC per catch (16 games) | YAC, separation 3-5 / 5+ yd | first contact, p50 | paired 305 caught |
|---|---|---|---|---|
| oracle (0) | 7.92 | 8.86 / 14.80 | 1.15 s | 218 |
| 26625 (glance + hands + settle) | 12.84 | 13.77 / 21.44 | 1.35 s | 202 |
| 26657 (+ bit 32, passive sight) | 14.58 | 14.91 / 27.01 | 1.50 s | 212 |

**Why 26625's lower YAC is not the honest level.** Without bit 32, a defender who never sampled the ball still believes the release. release-belief's and ThrowSight's "ball" cue tests the true ball position against a cone about his body facing (`viewCone`). That cue sets his `ballAt` and `releasedAt`. His estimator then seeds a flight from the release prior alone, and the settle runs him to that flight's ball line before he has seen the ball. Body facing is not gaze, so this is a cheat. Bit 32 removes it: his sight of the ball is his own sample alone.

The never-sampled defenders, release belief at the catch (2 games):
- **26625:** zone defenders were 97 ball+motion and 9 none; rushers were 225 ball+motion and 67 ball.
- **26657:** zone defenders were 68 arm+motion and 16 none; rushers were 292 arm+motion and 38 none.

Their closing on the catcher at the catch, p50 (yd/s):

| role | 26625 | 26657 |
|---|---|---|
| zone | +1.96 | -0.32 |
| rush | +1.02 | -0.94 |
| man | -1.08 | -2.64 |

On 26657, ACQ_SEEN (with its prior-only fix) puts the catch in their picture at 0.30-0.35 s after the catch. They start on the carrier at 0.75 s (zone), 1.15 s (man) and 1.05 s (rush). The gap after the picture is a body moving away that has to stop and turn, not a held branch.

**The missing mechanism.** On 26657 most of the never-sampled rushers and zone defenders saw the arm come through. That arm belief starts no look and no flight. The estimator's prior seeds only from `ballAt`, so a rusher keeps rushing.

**Next attempt (approved in principle, not started; new work paused 2026-11-16).** On an arm belief with no sample, his head is wanted along the seen passer's shoulder bearing, with a read error by rating as in SHOULDER_READ, and the ball is searched there. Nothing is known until the ball is in his eyes, and he keeps his assignment until then. Gate:
- start by release-belief source;
- def-late by role;
- YAC by separation band;
- paired 305;
- ball-glance's no-knowledge test.

## Witnesses

- **YAC:** `yac-split.ts`'s defense arm against the oracle, YAC by separation band. Not tuned to any number; the
  explained difference is the cost.
- **Contact:** time to first contact after the catch; the nearest defender's closing speed at the catch.
- **Mechanism film:** a dozen catches each where the nearest defender:
  - never saw the ball;
  - saw the arm only;
  - played the hands;
  - saw the catch late.
- **No knowledge without a cue:** a test that a defender with none of the four cues does nothing different from his
  coverage, every tick.

## Flags

One new bit for the defense's honest picture (proposed: BALL_EST bit 8192, off). It is carded alone, and against the
oracle with the receivers' glance (6145) on.
