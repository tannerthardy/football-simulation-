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

## Follow-up: gap and pull runs (`DL_FIGHT=1`, `PULL_STEP=1`, both off)

Probes: `scripts/diag/zone/flow-probe.ts` (`BY_KIND=1`: engaged DL by block
kind), `scripts/diag/defense/lb-flow-probe.ts`, `scripts/diag/runblock/puller-start.ts`.

**Down-blocked linemen rode the block.** On power/counter most engaged DL are
down-blocked. The blocker drove them backside at 1-1.9 yd/s and the DL asked to
go *with* him: his target is a shoulder offset relative to the blocker plus the
blocker's observed flow, so a down block carries the target along.
`DL_FIGHT=1` gives the defender the lateral twin of the blocker's lost-depth
anchor. When he feels himself driven sideways, away from where he sees the ball
heading, he holds the point where the push began for a decision beat instead of
following. A reach that runs him toward the ball is left alone (a first version
that resisted every push cut outside-zone flow by a quarter; the ball test
fixed it). Washed speed at 2 s: power 0.85 to 0.17 yd/s, counter 1.32 to 0.63;
outside-zone reach unchanged.

**The puller dropped straight back first.** The first pull waypoint was 1.25 yd
behind the line at his own width, so for 0.2 s he asked for 2.7 yd/s backward
and nothing lateral, and turned his body to face his own backfield (facing swung
past -140 deg) before running. `PULL_STEP=1` opens the first leg 0.9 yd to the
play side and keeps the hips toward the play side on it.

**Backers read the pull late** because it started late, and until then their
scrape followed live gaps that slide backside with the down blocks. With the
open step the pull read starts by 1.0 s instead of 1.5.

8+8 games, all with `GAIT_STEP=0.3` (gait + planners as the base):

| | Base | + fight + pull step | NFL |
|---|---|---|---|
| Puller lateral 0.5 / 1.0 s, yd | 0.20 / 1.40 | 0.50 / 1.80 | 0.50 / 1.80 |
| Puller time to point of attack, s | 2.2 | 2.0 | 1.9 |
| Engaged DL depth at 3 s: OZ / IZ / gap | -0.15 / 0.90 / -0.13 | -0.10 / 1.20 / 0.40 | 1.03 / 1.37 / 1.00 |
| Gap-run DL / LB lateral at 3 s | -1.17 / 0.60 | -0.45 / 0.60 | 2.24 / 4.35 |
| Run yards median | 1.41 / 1.60 | 1.27 / 1.68 | 3.0 |
| Guards | ok / ok | ok / ok | |

Puller timing now matches NFL tracking. Run yards stay within noise.

**Still open on gap runs.** By 3 s NFL DL and backers have moved 2-4 yd to the
play side (shed and pursue); ours stay near their alignment. Engaged DL do not
get off blocks to pursue a runner going away, and backers still scrape backside
with down blocks in the first second before the pull read. Next: what an
engaged lineman does when the ball is past or away from him (pursuit release),
then the backers' first-second key.
