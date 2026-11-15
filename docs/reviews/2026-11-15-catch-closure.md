# Catch stage one: the closure (design, 2026-11-15)

Coverage lane, ordered by Integration after the catch research (`docs/research/2026-11-15-catch-process.md`).

The catch becomes a physical event. His hands, or his body, get to the ball's arrival point in time or not, and the
hands close on it in time or not. Both depend on when he had the ball in his own eyes, its pace, and where it arrives
relative to his body. This is stage one. The contest between a defender's jolt and the hold comes second, on top of
it. The rules layer (two feet, survive the ground, incomplete or fumble) is separate and goes behind its own flag.

## What the catch does today (measured)

`scripts/diag/risk/catch-today.ts`, seed 23 x 8 games, engine-68, DIR_CAP=1. It logs the first catch resolution on
each targeted, non-screen pass. n = 560 with the true flight (the oracle) and 590 under the glance rule.

| | today | NFL |
|---|---|---|
| Nearest defender under 1 yd | PBU or INT first 45-50%, completion 45-50% | tight window 41-47% |
| Uncontested (nearest 3+ yd): drop as the first event | 8% oracle, 7% glance | drop tag 3.6-4.5% of arrived targets (BDB 2022) |
| Drop by ball speed at the catch (yd/s) | 3% at 14-18, 5% at 18-22, 13% at 22-26, 10% at 26+: a step | 4.5 / 5.6 / 6.1% at 15-18 / 18-21 / 21+ (arrival frame; needs the frames before arrival) |
| Drop by hands rating | 10% at 0.4-0.6, 8% at 0.6-0.8, 2% at 0.8+ (5x) | the drop trait barely repeats year to year (r about 0.2, PFF) |
| Secured, then lost in the securing window | about 1% of attempts | — |
| Completion by time the ball was in his eyes (glance) | 67% under 0.05 s, 71-82% above it, no trend | — |

Notes on the rows:

- Contest: right in aggregate (Tools' arrival cut agrees). The under-1-yd row stays as a witness.
- Pace step: this is the single +0.08 difficulty above 24 yd/s.
- Securing window: nearly every loss was "dislodged through the hands". The contest lives in the roll before the
  catch.
- Uncontested drops and the hands rating: the rating awards the result.
  - In the new model, hands acts on closure timing variance and placement.
  - The uncontested drop rate must fall out of that, never be set.
- The pace step at 24 yd/s goes.

What each stage-one input is today:

| Input | Today |
|---|---|
| When he had it in his eyes | not read by the catch. A tracking penalty for air time over 1.4 s (off under BALL_EST bit 2); facingBall gates defenders |
| Pace | +0.08 difficulty above 24 yd/s |
| Placement | stretch is (dh / reach)^2. "High" means above heightYd x 1.02, which is the top of the head although the code calls it "chest". Low is below 0.5 yd |
| Catch type | none |
| Closure timing | none. CATCH_POINT waits for the closest approach |
| The hands rating | pCatch = 0.985 - diff x (1.3 - hands) - 0.06 x (1 - hands) |

The catch is a roll whose aggregate is right. The design keeps that aggregate as its witness, and gets there by
mechanism.

## What the catch needs from the throw

The QB lane's touch work and this note are two halves of one interface. The throw delivers the ball's state at the
receiver. The receiver brings his own perception of it.

- **Arrival velocity, relative to his own.** A deep ball he runs away from closes slowly; a slant he runs into closes
  fast.
- **Arrival point in his body frame.** Height (above the head / chest / waist / low), side, and in front of or behind
  his line of run.
- **How long the ball has been in his own eyes, and how recently.** Glance's held time and time looked away, or the
  estimator's samples.

The `touch` rating, which is generated today and read nowhere, should shape the first two on the QB side.

## The closure

### 1. Can his hands get there?

He commits his catch when his belief of the arrival (point and time) is good enough: once his glance dwell is met, or
once his estimate is converged. From then he needs a time to bring his hands to the point:

`T_hands = latency + d_hands / v_hands`

| Term | Value | Source |
|---|---|---|
| latency | about 0.1 s | Brenner & Smeets; the 2009 target-jump study |
| d_hands | distance from his hands' ready position to the arrival point | geometry |
| v_hands | about 3-4 yd/s | stated choice. The lab's whole hand movement is 0.58-0.70 s over about 0.5-0.7 m; initiation is about 0.28 s before contact (Mazyn) |

If the time left at commit is less than `T_hands`, the hands are not there. He takes the ball on the body if it arrives
at his torso; otherwise it is a miss or a touch.

This is "can't get the hands up on a hot ball he wasn't expecting": a late pickup with little time left. It applies at
any pace. Pace matters only by shrinking the time left.

### 2. Where are the hands, and when do they close?

The hands go to where he believed the ball would be at his last correction, after which he is open-loop. The last
correction is when his eyes left the ball.

- For a receiver who looks it in, that is about 0.1-0.12 s before arrival, the floor (Cesqui 2015).
- It is older for one who:
  - turns upfield early;
  - peeks at the coming hit;
  - lost the ball mid-flight.

  Each has a larger error. That is "look it in" as a mechanism.
- The early look-away is his own choice, with a payoff: he sees the defender, braces, and turns sooner. It is not a
  rating roll.

Two errors follow.

**Placement error.** His belief's error at that moment, plus motor noise. The belief error comes from the glance or
estimator error: large in depth, smaller across, growing with time looked away.

**Closure timing error**, sd sigma_t:

- his time-to-contact error at the last correction (7% of about 0.1 s, so about 7 ms, from TAU_SD);
- plus motor timing noise of 5-15 ms (Cesqui 2016; Alderson 1974 via Stone).

### 3. The pocket: does he secure it?

The ball is secured when it is inside the pocket at peak closure, within both a timing and a space tolerance:

- **Timing:** `|timing error| < t_tol`, where `t_tol = pocket depth / closing speed`.
- **Space:** placement error under the pocket radius.

The pocket's size by catch type:

| Catch type | Pocket |
|---|---|
| Hands (diamond, or basket below the waist and over the shoulder) | depth about 0.1 yd and radius about 0.1 yd, scaled by hand size (stated choices) |
| Body (trapped against the torso) | radius about half his torso width; depth is the arms' close onto the chest, about 0.2 s of closure at the ball's closing speed |

Pace now has two physical costs and nothing else:

- less time to get there (step 1);
- a smaller timing tolerance (t_tol falls with closing speed).

A ball he has watched and is set for still gets caught at any pace. The flat NFL total by pace is the exam, with the
QB's selection (hot balls to set receivers) the likely reason it is flat.

**On a miss**, where the ball arrives outside the pocket, or the hands are early or late, contact decides what happens
next:

- **Fingertips:** a soft check of the spin and a bobble.
- **Palm, pad or facemask:** a hard rebound. Restitution is a stated choice, read at two values.
- **Body catch with the arms closing late on a hot ball:** it bounces off the chest. That is the user's point, and it
  comes from the rebound physics.

The existing DEFLECT_BALL physics carries the loose ball. The bobble reflex is a later stage.

### 4. Absorbing the ball's own momentum (the one hold quantity)

A secured ball still has to be stopped. The stopping force is `m_ball x v_close / t_give`:

- m_ball is 0.41 kg.
- t_give is about 0.03-0.1 s, the hands' and arms' give. Soft hands mean a longer give.

The hold has a capacity: `F_hold = mu x F_squeeze x n`.

| Term | Meaning |
|---|---|
| mu | 1.37 bare hand, 1.64 dry glove, about equal when wet (MIT) |
| F_squeeze | his grip on a ball with the arms out, about 100-200 N (derived) |
| n | the number of opposed points of pressure: 1 fingertips, 2 two hands, 3 pinned to the chest, 5 tucked |

The point counts are the coached count, not tuned constants. The research note's section 4 is the derivation.

If the stopping force exceeds `F_hold`, the ball pushes through or out: a drop. That is a hard ball meeting stiff
fingertips.

Stage two uses the same capacity. The defender's jolt drives the ball against the hold through the receiver's arms,
`m_ball x a_arms` over the hit's contact time. The hold rises with `n` as he secures the ball and tucks it. No
separate constant is set per stage.

### 5. Which catch type he chooses

He chooses from what he perceives, as coached:

- Hands away from his body when he has the time (step 1) and the ball is within arm reach.
- Diamond above the waist, basket below it and over the shoulder.
- His body when the hands cannot get there and the ball is at his torso.

The choice uses his own estimate of his reliability: his self-estimate of his timing noise, which can be wrong. There
is no hands threshold on the catch type. A receiver with poor hands who knows it leans on his body, because the body's
wider tolerance is worth more to him; one who overrates his hands reaches and pays for it.

Catching away from the body keeps the ball away from a defender, which is stage two's input.

## What the ratings act on (never the result)

| Rating | Acts on |
|---|---|
| hands | closure timing noise (sigma_t), placement noise, give (t_give), squeeze (F_squeeze) |
| ballTracking | the glance and estimate error and dwell (already) |
| reaction | latency |
| contestedCatch | nothing in stage one. Stage two: strength at the catch point |

Hand size, when the physical profile has it, sets the pocket and helps the squeeze.

## Witnesses, staged before any game read

1. **The separation table** (Tools' arrival cut): kept as the aggregate witness.
2. **Uncontested drops by pace and by time in his eyes.**
   - BDB has pace. Its "time in eyes" is only a proxy (flight time, and the ball's direction against his facing).
   - The ball's speed must be read from the frames just before arrival, checked on a dozen plays first.
   - The 9.7% drop rate beyond 1.8 s of flight (n 93), and facing 6.2% against from-behind 4.3%, are for the model
     to explain or show to be noise. Not to build toward.
3. **Completion by distance to the sideline:** 45% within 1 yd of the sideline, given arrival. This is the rules
   layer's witness.
4. **Contested results by where the defender arrives from.** Stage two's witness, staged now.

**Film:** a dozen catches per outcome (secured hands, secured body, hands late, outside the pocket with fingertips,
pad rebound, stopping-force drop) before any card.

**Scenario tests before games** cover these cases:

- an on-target ball seen 0.6 s ahead: caught at any pace within the hands' give;
- the same ball seen 0.15 s ahead: hands late, body or miss;
- a hot ball to the chest with the arms late: rebound;
- placement error past the pocket: a fingertip touch and a bobble.

No rating appears in any outcome path.

## The state stage one leaves for stage two

So that stage two needs no redesign, every secured ball carries:

- the catch type (hands, basket or body);
- the points of pressure n now;
- since when (the closure's time);
- where the ball sits relative to his body (away from it or against the torso);
- whether his eyes are still on it (when they left).

Stage two's jolt reads these. A defender's hand at the ball, or a hit through his arms, works against `F_hold` at that
`n`. A body catch has the ball against his torso, so a hit arrives through his arms into the ball.

## Sensitivity before any game

Each stated choice is read at two or three levels on the staged scenarios, before any game:

- hand speed;
- pocket radius;
- latency;
- restitution;
- give;
- squeeze.

The report says which one the uncontested drop rate is most sensitive to. If that rate is mostly one chosen constant,
the note says so plainly: it is a choice, not a derivation.

## The fix in passing

"High" today starts at heightYd x 1.02, the top of his head, although the code calls it the chest. It moves to the
pocket's own body frame: the chest is about 0.72 x height. This will move fixtures, and the PR will say so.

## Flags

- `CATCH_CLOSURE` (off): stage one.
- `CATCH_RULES` (off): the rules layer, carded alone.

Every constant above is in a spec table as coached, measured or choice, and each choice is read at two or three values.
