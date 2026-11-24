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
