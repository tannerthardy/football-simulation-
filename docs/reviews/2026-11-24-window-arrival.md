# The window's arrival against the defender, on HEAD_FOLLOW + FLIGHT_BREAK (2026-11-24)

Integration, with Coverage's answer in: the back-to-the-passer breaks were the frozen-head leak; HEAD_FOLLOW fixes it,
and FLIGHT_BREAK's interception rise is then +0.1 a game. The task: measure when defenders actually reach the catch
point, against the window's priced arrival for the same men, then price from what the passer can see of the defender.

## Operator

`scripts/diag/eyes/arrival-check.ts` on coverage aa952b84d (HEAD_FOLLOW + FLIGHT_BREAK, engine-93), league games:
seeds 11, 15, 31, 35 × 4 (1,112 throws), and 11 and 31 again with the margin's terms.
- Probe build only: the window keeps a row for every defender. Without that it keeps only those it already prices as a
  threat.
- At each decision, every defender within 10 yd of the catch point:
  - his priced margin m (his priced arrival at the catch point minus the ball's, from the decision) and its terms;
  - his truth and his picture.
- From the release: his actual margin, the first time he is within his reach + 0.3 yd of the catch point minus the
  ball's arrival.

## What it shows

**Under-priced at the catch point.** 184 of 3,242 defenders within 10 yd actually reached the catch point by the
ball's arrival (+0.1 s).
- The window priced them a median 0.58 s after the ball (p25 +0.35, p75 +1.11); 146 of the 184 were priced more than
  0.3 s late.
- Seven were interceptors.
- His picture of them was right (median error 0.32 yd).
- They were already closing on the spot 0.30 s before the release (p50): they leave in the windup.

**Over-pricing at the catch point is rare.** 13 defenders were priced to arrive by the ball and did not. The pre-break
shut found earlier (reach-and-release §2, §4) is in the path and undercut terms, not at the catch point. So the window
is both too pessimistic on the path and too optimistic at the catch.

By the window branch that priced the arrivals:

| branch | n | priced m | actual | distance at the decision |
|---|---|---|---|---|
| general (arriveTime after blind + reaction) | 87 | +0.79 | −0.34 | 2.9 yd |
| on the target in his picture (under 3 yd) | 55 | +0.59 | −0.31 | 1.9 |
| roof (QB_ROLE_PATH) | 26 | +0.11 | −0.32 | 5.7 |
| deep zone | 12 | +0.61 | −0.37 | 4.9 |
| carry | 4 | +1.17 | −0.67 | 3.8 |

The margin's terms, on the arrived defenders (seeds 11 and 31, 84):
- m = tt 1.55 − total 1.05 + est +0.01 + rush 0.00 (p50).
- **His rush belief** (`+3 × rushOf(d)`, BLITZ_READ) adds 0.39 s on 26 of them, underneath men in the box who did not
  rush.
- **Tied:** 18 arrivals were "tied" in his picture (`seenTied`, +0.5 s reaction). They sat 0.9 yd from the spot and
  arrived 0.63 s before the ball.
- **The general arrival itself:** without either, tt is 1.75 s for a defender 3.3 yd from the spot who arrives 0.28 s
  before the ball. The model runs him at about half the speed with which he actually gets there.

## Next (the build)

The window's arrival should run the defender as the engine moves him, and start him on the cue he has:
- **The motion:** for every defender, the arrival comes from the same body law the deep-zone and closing branches use
  (`bodyArrive`: his seen position and velocity, his acceleration and top speed, his braking). The general branch's
  `arriveTime` after a standing reaction is replaced.
- **The start, from what the passer sees:**
  - a man facing the passer (hips and eyes in his picture) starts at the release plus his believed reaction;
  - a man turned to his receiver starts at the break plus his reaction;
  - a man already closing on the spot keeps his momentum.
- **The rush belief** applies only to a man moving at the passer in his picture, not as a flat 3 × belief on every
  underneath man.
- **"Tied"** applies only to an engagement the passer sees with a blocker, not route contact at the catch point.
- **The path terms** (the pre-break shut) are re-priced by the same start and motion, so that the window clears about
  0.5 s before the receiver's break when the man he sees cannot get there.
- **Measured against:** this operator (priced against actual margins, by branch); interceptions on throws priced under
  0.01; release − break by family; and the interception rate.

## Two attempts, and the re-diagnosis (2026-11-24)

**Attempt 2: QB_DEF_ARRIVE** (probe build on aa952b84d; WIP diff
`docs/reviews/patches/engine71-footwork/def-arrive-probe-build-aa952b84-wip.diff`).
- What it did: every defender priced by bodyArrive from his seen position and velocity, started by the defenders' rule
  (facing: release + 0.8 reaction; turned to the receiver: break + reaction; else release + 1.8 reactions); tied only
  for a seen blocker; the rush belief only for a man moving at the passer.
- Result on seeds 11 and 31 (off → on): defenders who arrived were priced +0.57 → +0.89 s late (70 → 89 priced more
  than 0.3 s late), and interceptions went 7 → 14. Worse.
- QB_DEF_START (attempt 1, engine-93) was worse the same way. Two attempts have not repaired it, so the build stopped
  here.

**Re-diagnosis** (`scripts/diag/eyes/cue-timing.ts`, `arrival-check.ts` with the picture's velocity; seeds 11 and 31):
- **They are not reacting to the throw.** The defenders who reached the catch point by the ball start closing on it
  +0.05 s after the windup starts. That is before any throw cue reaches them: the load is seen at +0.35, the release is
  believed at +0.25 and known at +0.55, and the ball is seen at +0.70. Those who do not arrive close at +1.10.
- **They are covering the receiver.** They turn toward the spot as the receiver does, in phase with him.
- **His picture cannot show that turn yet.** At the decision they close on the spot at +1.79 yd/s in truth and +0.81 in
  his picture (picture age p50 0.45 s). Even in pictures under 0.3 s old the turn is not there yet (truth +0.93, picture
  0.00). This is honest latency, not a leak.
- **So a start rule cannot fix the price.** The passer handles this by anticipation: the man covering his receiver goes
  where his receiver goes. In the window that is DEF_BELIEF's phase term. The man within 4 yd of the target goes a
  share k (PHASE_MEAN plus his judgment) of the way the target's forecast goes.

**Next** (proposed; measurement first):
- For the coverers who arrive, measure DEF_BELIEF's k, its 4 yd radius against their distances (2–3 yd from the spot,
  often more from the target at the decision), and whether the coverer's phase is read from what the passer sees: his
  leverage and cushion on the receiver, his hips (facing), his speed with the route.
- Then price the coverer through the receiver's forecast, his phase taken from those cues, not a mean.
- The path terms' pre-break shut is separate (the undercut price, reach-and-release §4) and needs its own check, with
  the same operator on path points.
