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
