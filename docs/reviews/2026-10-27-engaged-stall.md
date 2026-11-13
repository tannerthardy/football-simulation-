# Engaged trench stall on runs: what holds the pairs still

Main Engine, Stage 1, 2026-10-27, develop `a58ebc2d` (with #297's leg
force-velocity law, #327's yaw traction and #340's snap-clock film). Question:
engaged OL and DL move about 1.1-1.3 yd/s at 1.0 s on runs; NFL linemen move
2.1-2.2. Is that contact physics, or what the bodies are asked to do?

**Answer:**
- **Mostly the engaged defender's controller.** His lateral request flips sign
  about 1.7 times a second without new information. A planner inverts the old
  lag law over a horizon much shorter than the lag, so its gain is very high.
- **Then disagreement.** Blocker and defender want the same lateral direction
  only half the time.
- **Contact physics delivers NFL-level pair flow** whenever the two agree for
  half a second.
- **The physics share is the start law held in #336.** With it, agreeing pairs
  reach about 90% of the smaller request instead of 75-80%.
- The controller is the run-defense lane's (`engagement.ts` `stepRunRep`, the
  defender request). This review hands it over with the evidence; it changes
  no behavior.

## 1. The stall on film (same operator, NFL vs sim)

`scripts/mechanics/run_pair_motion.py`:
- A pair is an OL and the nearest DL within 1.1 yd.
- Velocities are central differences at 10 Hz, both sources on the snap clock.
- Runs only: NFL BDB2025 weeks 1-2; sim run-only seeds 7/9/11/13, two games each.

| Pairs, median | n | OL speed | DL speed | centroid downfield | centroid lateral (abs) | centroid speed (p25-p75) |
|---|---|---|---|---|---|---|
| NFL, 1.0 s | 4,030 | 1.97 | 1.85 | 0.01 | **1.47** | 1.75 (1.08-2.58) |
| sim, 1.0 s | 2,659 | 0.92 | 0.86 | 0.02 | **0.55** | 0.84 (0.54-1.21) |
| NFL, 1.5 s | 4,486 | 2.01 | 1.95 | 0.22 | 1.47 | 1.89 (1.10-2.94) |
| sim, 1.5 s | 2,685 | 0.90 | 0.90 | 0.15 | 0.52 | 0.85 (0.50-1.24) |

NFL pairs drift sideways together. Ours barely do. Neither side's pairs move
much downfield.

## 2. Physics, alone: two engaged bodies who both want to go sideways

`scripts/diag/physics/pair-lateral.ts`:
- Production World, hand joint, identical bodies, scripted requests.
- Mean speed over 0.5-1.5 s, both bodies requesting the same lateral speed:

| Requested | free, squared | engaged, squared | engaged, hips open 45° | torso only |
|---|---|---|---|---|
| 4 yd/s | 1.77 | 2.20 | 2.35 | 1.77 |

Engaged pairs move at least as fast as free bodies. The slowness both share is
the gait's approach to a below-top-speed request: the start term in #336.
Contact does not stall a pair that agrees.

## 3. What the engaged bodies request

`scripts/diag/run-pair-requests.ts` logs every engaged run pair per tick:
- each body's request and velocity;
- the carrier's side;
- the jobs.

`run_pair_requests.py` summarizes them.

Seeds 7 and 9, 0.95-1.55 s, about 17,000 pair-ticks:

| | develop | + #336 law | `DL_FLOW=0` | `DL_FLOW=0` + #336 law |
|---|---|---|---|---|
| Blocker / defender lateral request | 1.14 / 2.50 | 1.17 / 2.46 | 1.30 / 2.28 | 1.39 / 2.31 |
| Both want the same lateral direction | 52% | 51% | 65% | 63% |
| Defender lateral flips per second (median pair) | **1.67** | 1.25 | **0.00** | 0.00 |
| Agreement held 0.5 s (episodes) | 730 | 798 | 2,368 | 2,778 |
| Achieved by those (vs the smaller request) | 1.57 of 1.93 | 1.88 of 2.08 | 1.77 of 2.10 | 2.02 of 2.21 |
| Pair lateral speed, all pairs | 0.53 | 0.60 | 0.70 | 0.76 |

Blockers never flip. The defender's flips are not reads:
- The ball changed sides of the pair across 1% of them.
- After a flip he heads toward the ball 51% of the time.
- 99% are run-play DL in their rush job, across every concept.
- 25% have a double-team helper on him.

## 4. Why the defender flips (first wrong stage)

`engagement.ts` (`stepRunRep` defender movement):

    flow = requestToCover(gaitLag(d.profile), target - d.pos.y, horizon, d.vel.y)

- `horizon = 2 * decisionInterval`, about 0.4-0.6 s. `requestToCover` is the
  exact inverse of the old lag law: u = (distance − v₀·lag) / (horizon − lag),
  with lag = τ(1 − e^(−horizon/τ)) and τ about 1.25-1.35 s for a DL.
- Over that horizon it amounts to a position gain of 8-19 per second and a
  speed gain of 4-6.
  - A defender 0.1 yd off his aim point asks for 1-2 yd/s.
  - Once he is moving 0.5 yd/s toward it, the command is about −2.5 yd/s and
    he reverses.
- The request saturates at full lateral speed. A perceived aim point that
  refreshes each decision keeps it hunting.

`DL_FLOW=0`, the existing proportional follow (held flow + 3 × error), removes
the flips entirely and raises agreement from 52% to 65%.

## 5. What remains after both

With `DL_FLOW=0` and #336's law, pairs that agree move 1.48 yd/s on average,
NFL's figure. The overall median is 0.76, because 37% of pairs still want
opposite directions. The defender heads toward the ball only 56-59% of the
time, so his aim point (run-fit gap logic) is the next stage. That is
run-defense intent, not physics.

## Hand-off

1. **Run defense (`engagement.ts` defender request).** Replace the high-gain
   deadbeat chase with a request the body can follow without reversing. For
   example: plan over a horizon at least the body's lag, or limit the request
   to the speed from which he can still stop at the aim (no overshoot), with
   the lag from `gaitLag(profile, wanted)` once #336 lands.
   - Measure with `scripts/diag/run_pair_requests.py`: flips per second, the
     agreement share, pair lateral speed.
   - Bar: NFL pair lateral 1.47 yd/s from `run_pair_motion.py`.
   - Then the defender's aim relative to the ball.
2. **Physics (Main Engine).** #336 (held) adds about 15-25% to every agreeing
   pair. If it lands, planners should get the wanted-speed lag.
3. **Zone blockers** plan with the same `requestToCover` but do not flip:
   their aims are steadier. Recheck after item 1.

No engine change here; docs and diagnostics only.
