> Historical research rescued from `claude/run-blocking` at `88bfc45147f58f670444f3d1159c288bafff1521`.
> Its experiments and measurements describe that source. This integration
> imports the document only; it does not install that branch’s engine changes.

# Run blocking: what stops runs, and what moves the line

Work in progress on `claude/run-blocking`, cut from `claude/engine-priorities`
at `12ccf98`. Two native 8-game cohorts (seeds 101, 202) reproduce the
current review's baseline exactly (67.4 and 44.4 points per team). NFL
comparisons use the shared operator in `scripts/mechanics/metrics.py`.

## Who stops runs

`scripts/diag/runblock/run-attrib.ts` observes every designed handoff (no
reads, decisions or RNG) and classifies the first defender to reach the back.

- 39-42% of designed runs gain 1 yd or less.
- On those, 67-71% of first stoppers had **shed** their block, almost all
  DL, meeting the back 1.1-1.4 yd behind the line.
- 93% of sheds are the automatic leverage break (`|phi| >= 1.1` against the
  blocker's fixed drive line); the rated shed roll is only 7%.
- In the 0.5 s before a stopper's leverage shed, the defender gains 0.5-0.6 yd
  toward the ball relative to his blocker while the blocker travels 0.3-0.4 yd
  along his own drive line: the pair circles, the blocker does not brace
  against where the defender is going.
- 10+ yd runs come from the opposite failure: second-level defenders never
  assigned or never reached.

## The line does not move laterally

`scripts/diag/runblock/line-flow.py`, NFL 2022 vs sim at 1.5 s:

| Mean lateral motion | NFL OL | NFL front | Sim OL | Sim front |
|---|---|---|---|---|
| Outside zone | 3.42 yd | 2.80 | 0.72 | 0.45-0.53 |
| Inside zone | 1.80 | 1.50 | 0.82-0.90 | 0.38-0.46 |
| Gap/pull | 0.82 | 0.80 | 0.28-0.30 | 0.26-0.33 |

NFL zone linemen move laterally from the snap (0.58 yd by 0.5 s) and fronts
flow with them at arm's length. Sim zone linemen take a short first step,
attack the defender's current shoulder and stall chest to chest. Engaged pairs
then move laterally at about the defender's requested speed.

**Change on this branch:** zone linemen (OZ/WZ run, IZ/split press) run the
track toward the play side before contact and meet the playside shoulder while
moving (`RunBlocker.zoneFlow`). Doubles/checks keep their own coordination.
Outside-zone line flow rises from 0.72 to about 1.1-1.4 yd; outcomes on its own
are mixed. All 12 guards hold. Contract tests: `test/zone-flow.test.ts`.

## Pullers start late

`scripts/diag/runblock/pullers.py`: NFL power/counter pullers are 0.5 / 1.9 /
3.5 yd wide at 0.5 / 1.0 / 1.5 s; sim 0.1 / 1.0 / 2.5. Peak speed and depth
match. A diagonal first waypoint barely helped, so the delay is in the start.

## Tried and not kept

- Lane-frame leverage (blocker keeps the defender's path to the installed
  track): fewer stuffs, but blockers gave ground; a second variant was worse.
- Keeping the stretch drive after the zone read; moving gaps from observed OL
  positions; felt (touch) flow for engaged defenders: little or conflicting.
- Defenders stepping around a blocker instead of driving through him: cleaned
  up the backfield picture and improved outcomes, but it bans a behavior
  instead of asking why driving through a set blocker works. Not kept.

## What the bull-rush panel taught us

The project rule (see `CLAUDE.md`): if something works far better than in real
football, do not ban it; find why it fails in real life and put that in the
engine. Defenders driving blockers into the backfield prompted this panel
(`scripts/diag/runblock/bullrush-panel.ts`): one engaged OL and DL, real
hands, a straight 2-second bull rush, varying bodies, posture, fatigue and the
blocker's response.

**Findings before the change**

- Pushing was capped by traction = friction x body weight. Above strength
  about 0.73 both players sat at that cap, so **mass decided everything**: a 15%
  heavier DL drove an equal OL 1.3 yd in 2 s. Pad level, strength and fatigue
  changed nothing.
- Pad height was computed, but only for tipping. Contact added no vertical
  force, so "the low man wins" could not happen.
- Identical bodies at equal effort drifted 0.4 yd from the first push and
  never stopped: the "yielding is stronger" factor sat under the traction cap.
- The game's own run-block request was driven 1.0 yd versus 0.4 when bracing:
  locomotion and lean share one traction budget, and the blocker kept spending
  it on lateral drive while being driven.
- Fatigue was nearly free: a full 2 s bull rush costs about 5% energy, a 0.25%
  force loss, and 35 s between snaps restores most of it.
- `bend` (pad level) came from 3-cone/shuttle agility, so every OL had
  0.06-0.20 against 0.3-0.8 for DL.

**Changes on this branch**

1. **Pad-line loading** (`src/physics/world.ts`). Contact between two players
   acts along the line between their pads. Pushing from lower pads lifts the
   higher player: his feet carry less load and the pusher's more, equal and
   opposite, bounded so the lighter player keeps 20% of his weight on his
   feet. Traction is friction x actual load. Planar momentum and work are
   unchanged. Body collisions and hand joints only; tackle grasps and strikes
   are not yet included. `StepReport.tractionImpulse` reports the actual limit.
2. **Contact pad level** (`padBend` in `src/players/physical.ts`): strength,
   balance and contact technique, a little agility, minus height. Movement
   and center-of-mass height keep the agility-based `bend`.
3. **Anchoring** (`src/sim/engagement.ts`): a run blocker who feels himself
   driven back pushes straight against the felt load instead of continuing
   his lateral drive.

Panel with all three (identical bodies unless noted; yd driven in 2 s):

| Arm | Before | After |
|---|---|---|
| Equal pad level, full brace | 0.40 | 0.40 |
| Blocker stands up | 0.43 | 2.2-2.7 |
| Rusher stands up | 0.40 | about 0 (rush stalls) |
| 15% heavier rusher who stands up | 1.32 | 0.2 |
| Tired blocker (energy 0.3) | 0.42 | 1.1-1.6 |
| Game's own run-block request | 1.01 | 0.6 |

Fatigue now costs leverage, through the posture rise the engine already had.
Tests: `test/pad-line-load.test.ts` (conservation, mirror, leverage, fatigue,
anchoring). The ground-impulse budget checks in 15 test files now compare with
`tractionImpulse`. The frozen solo hand-fight hashes in
`test/run-hand-control.test.ts` were re-frozen for these changes.

**In games** the package is about neutral: runs of 1 yd or less 0.36-0.39
(was 0.39-0.42); median 1.5-1.8; 90th percentile about 10 (NFL 10). Engaged DL
more than 1 yd deep at 3 s: 14-18% (NFL 12%). All 12 guards hold. So the 1v1
physics is now honest, but it is not what makes runs fail in games.

## Next

- **Fatigue is still almost free.** Repeated maximum efforts should cost
  force across a drive (no-huddle, rotation value). That needs both the cost of
  isometric effort and the fatigue curve, checked against movement data.
- **Equal-leverage drift.** Balanced forces never bleed off the first push's
  momentum; the eccentric advantage needs to act below the traction cap.
- **Strength saturates** at 0.73; it should matter through force at speed and
  holding pad level under load.
- **Tackle grasps** should get the same pad-line loading (lifting a carrier).
- **Engaged DL still end 0.7-0.8 yd deep at 3 s** (NFL +0.2). With honest 1v1
  physics, trace the request side: OL drive lines, DL depth requests toward
  the runner and the circling leverage sheds.
