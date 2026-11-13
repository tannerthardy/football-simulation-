# DEF_BELIEF: what the quarterback believes defenders will do to his throw (2026-11-12)

**Question.** The urgency-bar diagnosis (docs/reviews/2026-11-12-urgency-bar.md) found the bar fine and his belief
wrong. He accepts P 0.72 and completes 0.64 even with no urgency, and the gap grows to 0.20 at urgency 0.5–0.75.
Where in the window (`QBPass.window`: P = pOpen · pClear · pAcc · hands) is the error, and what does a QB know that
would correct it?

The fix must be his belief, built from what a quarterback can know, with his experience and decision-making setting
how accurate it is, and with error both ways. It must not be a blanket shrink of P.

## Diagnosis (engine-40, ARRIVE_LEAD and CUSHION_BREAK on)

### 1. The window by factor against how the throws actually failed

`scripts/diag/read-plan/calibration_report.py` on league games (hot-games.ts, seeds 101 and 201, 8 games each),
1,055 throws. Each factor is set against the failure it predicts:

| | Predicted | Observed |
|---|---|---|
| Defended (pbu, deflection, INT) | 0.08 | **0.19** |
| Off target (ground, given not defended) | 0.20 | 0.17 |
| Dropped (given reached) | 0.05 | 0.08 |

Defended balls are under-predicted about 2.4×, at every depth and urgency. Off target is about right, except at
high urgency (0.25 vs 0.35).

### 2. Why defended is under-predicted: the securing window

Since engine-39, CATCH_SECURE is on: a won catch is in the receiver's hands for 0.12–0.45 s before it is a catch. A
defender who reaches the ball or the receiver's body in that time gets a try to dislodge it, by hand or by hit
(`catching.ts secureStep`).

The window still rules a defender who arrives after the ball as beaten. It misses exactly the defender who arrives
just after it. Receivers are coached that the catch has to survive the hit, so this is something a quarterback knows.

### 3. The run term, where defenders are when they start

`scripts/diag/read-plan/window-probe.ts` on the forced-concept panel, 1,913 throws. For each defender, the window's
time to the catch point was recomputed from his actual state at the end of the blind time it gave him, and at its
predicted start:

| | Interceptors (n 38) | Closest defender, no INT (n 1,620) |
|---|---|---|
| Reached − predicted | −0.34 s | −0.16 s |
| Reached − prediction from his actual state at the blind time | −0.14 s | −0.04 s |

So `timeToReach` itself is about right. The error is where he is by then: the window has every defender keep his
course. The probe split that by defender:

| Defender | Extra closing on the point vs his course | vs moving fully with the target |
|---|---|---|
| Within 4 yd of the target, not facing the QB (n 270) | +0.70 yd | −0.32 yd |
| Within 4 yd of the target, facing the QB (n 407) | +0.31 yd | −0.35 yd |
| Farther, facing the QB (n 806) | −0.07 yd | |
| Interceptors farther, facing the QB (n 17) | +0.77 yd | |

- **Defenders on the target close about halfway between their course and the receiver's motion.** That is coverage
  on a man.
- **Farther defenders facing him keep their course on average.** The few who jump the throw (the interceptors) are
  not distinguished by anything he can see: distance from the throwing lane, or how long his body had faced the target
  (median 0 s; SHOULDERS_SET is off). Their early break stays a risk, not a mean shift. Building "watchers break
  early" would have been the blanket shrink ruled out.
- **Carrying the body through the reaction** (moving, not frozen, while he reacts) did not help: −0.40 s vs −0.34 s.

## Change (`DEF_BELIEF`, off)

`src/sim/behaviors/qb.ts`, `window`:

- **The man on the target moves partly with him.** A defender within 4 yd of the target, by his pictures, carries
  PHASE_MEAN (0.5) of the target's forecast motion over his blind time, in position and velocity.
- **The catch must survive the late defender.** A defender arriving after the ball, but within SECURE_T (0.3 s) of it,
  can still get it out: pSecure, inside pOpen.
  - His chance is DISLODGE (0.5), scaled by how well the receiver holds on (hands and contested-catch skill), times
    0.65 because the grip strengthens through the window.
- **His knowledge sets the error.** know = 0.25 + 0.45·decision-making + 0.3·min(1, experience/8). Both beliefs are
  right on average, and spread both ways by (1 − know) through his own judgment draws.

Calibrated on engine-40/41's defense (ARRIVE_LEAD, CUSHION_BREAK and the catch contest on). It must be re-read when
the defense changes: SHOULDER_READ and the match-carry work will make more defenders break early, and a change to
CATCH_SECURE changes the securing window it prices.

## Read: league games, engine-41 (HOT_LOOK on)

Seeds 101 and 201, 8 games each.

| | FREE_BOUND off: DEF_BELIEF off | On | FREE_BOUND on: off | On |
|---|---|---|---|---|
| Passes | 1,452 | 1,519 | 1,541 | 1,516 |
| P accepted / completion | 0.70 / 0.65 | 0.67 / 0.67 | 0.71 / 0.64 | 0.66 / 0.64 |
| Defended, predicted / observed | 0.08 / 0.16 | 0.14 / 0.16 | 0.08 / 0.18 | 0.15 / 0.18 |
| Off target, predicted / observed | 0.19 / 0.16 | 0.18 / 0.14 | 0.19 / 0.15 | 0.18 / 0.15 |
| Completion, all passes | 0.658 | 0.681 | 0.654 | 0.645 |
| INT | 22 | 19 | 37 | 23 |
| Sack rate | 2.4% | 3.8% | 1.2% | 2.1% |
| Yards a play | 9.34 | 9.14 | 9.22 | 8.88 |
| Free rusher at 2 yd: throws / sacked / scrambles | 72 / 12 / 14% | 66 / 17 / 14% | 83 / 5 / 10% | 78 / 8 / 12% |

NFL, free rusher at 2 yd: throws 57%, sacked 25%, scrambles 17%.

By urgency, P accepted / completion:

| u | FREE_BOUND off: DEF_BELIEF off | On | FREE_BOUND on: off | On |
|---|---|---|---|---|
| 0 | 0.72 / 0.68 | 0.69 / 0.71 | 0.73 / 0.65 | 0.68 / 0.69 |
| 0–0.5 | 0.67 / 0.66 | 0.64 / 0.69 | 0.68 / 0.66 | 0.64 / 0.62 |
| 0.5–1 | 0.68 / 0.48 | 0.61 / 0.51 | 0.67 / 0.59 | 0.63 / 0.54 |

## Reading it

- **His belief now matches what defenders do.** Defended balls go from 0.08 predicted against 0.16–0.18 to 0.14–0.15
  against 0.16–0.18. Overall P is within 0.02 of completion where it was 0.05–0.07 over.
- **He throws less into the defenders he used to miss.** Interceptions fall: 22 → 19, and 37 → 23 with FREE_BOUND on.
  Completion holds or rises.
- **More often he has no throw.** Alarmed plays with no hot throw in time go 19 → 34 and 26 → 60, and the sack rate
  rises. With a free man at 2 yd he throws 66–78% (was 72–83%; NFL 57%) and is sacked 8–17% (was 5–12%; NFL 25%).
  This is the population the noThrow seam hands to Flex's EXTEND.
- **Yards a play fall 0.2–0.35.** These are the contested throws he no longer makes. Integration's note stands: what a
  pressured completion earns after the catch (9.5 yd/att against the NFL's 6.8) is a YAC question, and the window is
  not built to absorb it.
- **Still open at high urgency (u 0.5–1):**
  - Off target is 0.19–0.22 predicted against 0.25–0.31 observed: his belief of what urgency costs his accuracy is
    short. The placement split (realized miss about 1.4–1.8× his sigma) is the next look.
  - Drops at high urgency are 0.11 against 0.05 predicted.
- **The gate** (with FREE_BOUND on, sacks no longer collapse): 1.2% → 2.1%, against 2.4% → 3.8% with FREE_BOUND off.
  Better, not closed.

## Paired panel and fixture (engine-41, forced-concept panel, 1,536 plays)

| | INT | Sacks | Completion | Yards a play |
|---|---|---|---|---|
| DEF_BELIEF off | 33 | 71 | 0.600 | 8.68 |
| DEF_BELIEF on | 30 | 94 | 0.602 | 8.93 |

638 plays change. Fixture (`test/def-belief.test.ts`): levels against Cover 1 from gun doubles, seed 1.

- Off: he throws the in-breaker S2 at 2.85 s, and it is intercepted.
- On: he passes it up and throws the back at 2.90 s, completed for 9 yd.

## Placement (Integration's low-priority accuracy check): not answered yet

`scripts/diag/risk/placement-split.ts` measures the ball's true closest approach to the receiver in free flight
(interpolated within the tick, excluding the ball in a receiver's hands) and the release's own miss from its draws.

On the forced-concept panel the release draws repeat across plays of the same seed (the panel's dice are seeded by
play seed and key). The ratio of release miss to his sigma comes out identical in every group, 0.92. So the panel
cannot measure the miss distribution, and the question needs league games, where every play draws its own.

What the panel does show (engine-41, 938 throws):

- **Offset:** within 0.5 yd 43% of all throws and 53% of tight throws (median 0.61 and 0.46 yd).
- **Comparison:** this is not Coverage's operator (their flight line against the receiver at arrival), so the two
  numbers are not directly comparable.
- **Receiver adjustment:** on balls still in flight at the planned arrival, the receiver arrives about 1.4 yd from
  the aim point, yet the ball passes about 0.6 yd from him. The receiver's adjustment does absorb much of the miss.

## Pumps at the plant (engine-42 tree, 16 league games; `scripts/diag/read-plan/pump-flicker.ts`)

| DEF_BELIEF | Pumps | Planned P p50 | Drop at the plant's re-check p50 | Swing > 0.3 | Flicker (back within 2 ticks) |
|---|---|---|---|---|---|
| Off | 210 / 1,537 (13.7%) | 0.74 | 0.51 | 169 | 27 (1.8% of dropbacks) |
| On | 212 / 1,503 (14.1%) | 0.64 | 0.42 | 151 | 17 (1.1%) |

- **The one-frame flicker is rare.** Integration's rule puts its trace after the deep shot.
- **Pumps are common, and DEF_BELIEF does not change them.** Between the decision and the plant, the throw's value
  collapses on 14% of dropbacks.
- **The probable mechanism** is defenders reacting to the windup itself (zone defenders read the load and the QB's
  perceived facing). That is an interaction, not a belief error he could price from what he sees before deciding.
- **Open:** an NFL figure for aborted throwing motions, before treating 14% as a defect.

## Not done

- **INT by whether the interceptor was watching him** (Integration's third check). The probe records whether the
  closest defenders faced him, and three quarters of interceptors did, before and after. A per-INT split on games
  needs the interceptor's facing recorded in hot-games.ts.
- **The placement split on league games** (above).

## Checks

`npx tsc --noEmit -p .` is clean. `test/def-belief.test.ts` passes (2/2). `npm test`: 442 files, 4059/4059 (branch on
develop 700a9b67, engine-41).
