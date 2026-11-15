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
| **Passer's shoulders and arm** | the load, then the arm coming through, with the shoulders pointing | that it is thrown, and a coarse direction (a sector, not a point) | the release belief (arm and load cues); `shoulderTarget` for a zone defender |
| **The ball itself, if he looks** | the ball in his own eyes | its flight, with the glance error (`BALL_EST`, his own bit) | the glance rule (bit 2048) and the estimator |
| **His man's or zone threat's eyes, break and hands** | the receiver turning his head to the ball, settling, hands rising | that the ball is coming to him, and soon. The coached "play the hands" for a trailer who never sees the ball | `readsHandsAt` (hands-cue.ts); bit 256 for the man defender's look |
| **The catch** | the receiver holding the ball, seen; or heard from the crowd or the contact, and late | that it is caught, by whom, and where | **missing**: post-catch starts only from a recorded flight |

## What he does on each

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
