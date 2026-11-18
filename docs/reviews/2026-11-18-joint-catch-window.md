# The window on the DEF_CATCH catch law, and its arrival calibrated (joint landing with Flex)

QB lane, 2026-11-18. Tree: develop 7a157055 (engine-91) + Flex's joint cut (def-catch-ball-sight-joint-663497bc.diff at
61298c2d). Games: `scripts/diag/eyes/airgames.ts`, seeds 11 and 31, 4 games each. Calibration:
`scripts/diag/eyes/arrive-cal.ts`.

## The catch-law window

Patch: `docs/reviews/patches/engine71-footwork/window-catch-law-on-joint-7a157055.diff`.
- catching.ts exports `defenderCatchChance` and `catchContact`; defenderCatch uses them (bit-identical).
- Under DEF_CATCH the window's jumped-route pick term is first × catchChance (ball to the chest in stride, no receiver's
  arms), and its contested term is (contest − first) × catchChance (edge of reach, the receiver's arms on it), from the
  defender's hands and contested-catch ratings and the receiver's. Off DEF_CATCH the old priors stand.
- The miss already exists: the window averages pick risk over four points of his miss spread (±√2σ). It inherits the
  catch law.

## Games (8 per arm)

| arm | throws | INT | believed INT (sum) | short INT / believed | completion | yds/att | sacks | throwaway or no throw | ttt p50 |
|---|---|---|---|---|---|---|---|---|---|
| both flags off (develop) | 672 | 13 (1.9%) | 7.8 | 11 / 6.2 | 0.698 | 8.44 | 30 | 74 | 2.70 |
| DEF_CATCH + BALL_SIGHT, old window | 624 | 32 (5.1%) | 6.3 | 24 / 5.3 | 0.671 | 7.48 | 41 | 70 | 2.70 |
| + the catch-law window | 646 | 28 (4.3%) | 6.8 | 17 / 5.5 | 0.704 | 7.53 | 29 | 65 | 2.75 |
| + QB_ARRIVE_SPREAD (attempt, not landed) | 451 | 14 (3.1%) | 15.2 | 9 / 12.1 | 0.710 | 8.98 | 60 | 194 | 3.15 |

## Arrival calibration (catch-law window, 440 throws, every defender at every decision, 28 picks)

| believed margin m | n | believed contest | within reach of the ball at its arrival | picks |
|---|---|---|---|---|
| < −0.2 s | 8 | 0.490 | 0.625 | 3 |
| −0.2 to 0 | 5 | 0.443 | 0.400 | 0 |
| 0 to 0.2 | 11 | 0.193 | 0.182 | 0 |
| 0.2 to 0.5 | 117 | 0.078 | 0.248 | 4 |
| 0.5 to 1 | 342 | 0.007 | 0.076 | 6 |
| over 1 | 4,333 | 0.000 | 0.008 | 15 |

- A logistic through these rates is centred at m 0.03 s (he uses 0.05) with scale 0.29 s (he uses 0.13): he is about
  twice too sure of a defender's arrival.
- QB_ARRIVE_SPREAD (scale 0.29; the roof carrier's ball-under-him no longer zeroes a man who can arrive, after 6 of 28
  picks by defenders it priced out) calibrates his total belief (15.2 against 14), but he stops throwing.
- With it, 17 of the 22 picks are by defenders he believed more than a second late. Most picks are not a defender arriving
  at the aimed point: the ball goes where he did not price it (the release re-aim, as on play 35; misses; tips caught by a
  second man). Not landed; attempt diff `arrive-spread-attempt-on-joint.diff`.

Next: classify each pick (re-aim moved the aim, accuracy miss, tip or deflection, path) to find the belief that misses
them. Proposed for the joint landing: Flex's cut + the catch-law window.

## Where the picks happen (`pick-class.ts`, catch-law window, 8 games, 28 picks)

Each pick against the decision's aim, the release's intended point (the re-aim), the drawn aim (his accuracy), the pick
spot and time, and the events between release and pick:
- arrival (at the ball's arrival, no tip, no large re-aim or miss): 13;
- path (picked more than 0.15 s before the planned arrival): 7;
- miss (pick spot over 1.5 yd from the intended point and within 1.5 yd of the drawn aim): 4;
- re-aim (the release moved the aim more than 1.5 yd from the decision's): 4;
- tips first: 0.

The 14 by defenders he believed more than a second late at the catch point: path 5, arrival 5, miss 3, re-aim 1. The
"arrival" ones were picked 2-4 yd from the intended point as the ball came down through the defender's reach. So the picks
he does not believe are mostly along the late flight path, not at the catch point. The window's path term (pClear's touch
and iPath, sampled along the flight) uses a still narrower spread (sPath 0.1 s) than the catch term (sCatch 0.13 s, itself
about half of what the arrival calibration supports). That is where the next fix belongs, not in the catch-point arrival.

## Release re-aim and rusher start: attempts, not landed

Diff: `docs/reviews/patches/engine71-footwork/aim-commit-rush-start-attempts-on-joint.diff`. 8 games each, the catch-law
window tree (honest tracking not yet in):

| arm | throws | INT | short INT | completion | yds/att | sacks | no throw |
|---|---|---|---|---|---|---|---|
| catch-law window | 646 | 28 (4.3%) | 17 | 0.704 | 7.53 | 29 | 65 |
| + QB_AIM_COMMIT v1 (ball to the recheck's priced point; with rusher start) | 638 | 26 (4.1%) | 16 | 0.674 | 7.20 | 37 | 79 |
| + QB_AIM_COMMIT v2 (release re-aim held within 1 yd of the priced point) | 626 | 33 (5.3%) | 17 | 0.679 | 8.79 | 39 | 83 |
| + QB_RUSH_START (rushers start on the ball) | 647 | 38 (5.9%) | 26 | 0.682 | 7.69 | 29 | 66 |

- Aim commit: no visible pick reduction; completion down 2.5-3 pt (the ball goes to an older picture of the receiver).
  Eight divergent games swing about ±6 picks and cannot resolve the re-aim's share (4 of 28). It needs a paired staged
  probe: the same play with and without the release re-aim.
- Rusher start: wrong premise. A rusher facing the passer sees the arm best and bats balls at the line; starting him at
  the release made him later in the window, and short picks went 17 to 26. If anything he is an arm reader.
