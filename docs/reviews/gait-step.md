# Speeding up to a moderate speed (`GAIT_STEP`, experimental, off)

## The mechanism

`locomotionAccel` speeds a player up as `(wanted - v) / tau`, where `tau` is
the sprint time constant (about 1.45 s for a lineman with `GAME_BURST`). The
comment says it plainly: "a player who wants three-quarter speed pushes with
about three-quarter effort." So a moderate request is approached slowly. A
free lineman asking for 3 yd/s sideways is at 0.9 yd/s after 0.5 s and 1.5 yd/s
after 1 s, whatever his facing (`scripts/diag/physics/pair-lateral.ts`,
`SERIES=1`). Two engaged linemen who both want 3 yd/s average 1.85.

Real players push as hard as the legs allow and level off within a couple of
steps. NFL tracking shows it (`scripts/diag/physics/ramp-time.py`, same
operator; seconds from 0.5 to 2.0 yd/s after the snap, by the peak speed
reached in 2.5 s):

| Run plays | NFL | Sim | `GAIT_STEP=0.3` |
|---|---|---|---|
| OL, peak 3-4.5 (to 3.0 yd/s) | 0.50 (0.90) | 0.70 (1.40) | 0.50 (1.20) |
| OL, peak 4.5+ (to 3.0) | 0.40 (0.60) | 0.70 (0.90) | 0.50 (0.80) |
| RB, peak 3-4.5 (to 3.0) | 0.40 (0.60) | 0.70 (1.50) | 0.30 (0.50) |
| RB, peak 4.5+ (to 3.0) | 0.30 (0.50) | 0.80 (1.30) | 0.30 (0.50) |
| DL, LB, DB, WR | match or faster | | unchanged or matched |

NFL linemen reach 2 yd/s in about 0.5 s whether they top out at 3.5 or 6 yd/s;
the current law predicts about 1.0 vs 0.46 s. Defenders who ask for top speed
were never affected, which is why only OL and backs stood out.

This corrects [physics ideas](physics-ideas.md) section 2: its share-of-peak
operator normalizes each player by his own peak, so a uniformly slow ramp
looks normal.

## The change

`GAIT_STEP=<seconds>` (0.3: about two steps; not fitted). The legs push up to
the force-velocity limit `(vmax - v) / tau` and close the remaining gap to the
wanted speed over that time. Top-speed sprints are unchanged; braking and
cutting are unchanged. Controllers that predict their own lag
(`requestToCover` in zone reach timing, DL flow and run fits; RB mesh timing)
use the same law through `gaitLag()`. Default unchanged; the suite passes
except the known Tite witness.

## Results (8+8 games, rosters 101/202)

| | Default | Gait only | Gait + planners | NFL |
|---|---|---|---|---|
| OZ OL / DL / LB lateral at 3 s, yd | 3.52 / 2.32 / 3.77 | 5.82 / 3.90 / 4.45 | 5.68 / 4.00 / 4.53 | 7.52 / 7.23 / 7.60 |
| OZ engaged OL lateral speed | 1.00 | 2.00 | 1.75 | 3.00 |
| OZ engaged DL depth at 3 s | -0.35 | +0.05 | -0.15 | +1.03 |
| IZ OL / DL lateral at 3 s | 2.44 / 1.53 | 3.84 / 2.57 | 3.82 / 2.67 | 2.86 / 2.52 |
| Puller time to point of attack, s | 2.4 | 2.3 | 2.2 | 1.9 |
| Run yards median | 1.56 / 2.09 | 1.55 / 2.22 | 1.41 / 1.60 | 3.0 |
| Guards | ok / ok | ok / ok | ok / ok | |

Movement timing now matches the NFL across groups, and the zone trench moves
far more like NFL film. Run yards do not move beyond 8-game noise, which is
expected of a mechanism repair that also speeds up the defense. The physics
session owns the World and `kinematics.ts`; promotion is theirs.

## What it exposes next

1. **Gap and pull runs:** the DL drift *away* from the play side (-1.2 yd at
   3 s, NFL +2.2) and backers barely flow (+0.6, NFL +4.4). A defensive read
   of down blocks and pulls, not physics.
2. **Engaged lateral requests** are still about 2 yd/s for both blockers and
   DL (NFL pairs move 3). The stretch rule asks a blocker to give ground to
   match a penetrating defender on a third of stretch ticks, which then trips
   the lost-depth anchor and cuts his lateral work to 30%
   (`scripts/diag/zone/compose-probe.ts`, `flow-probe.ts`).
3. The drive/surface frame leak named in [run-game positioning](run-game-positioning.md)
   is small on free ticks (0.1-0.2 yd/s mean).
