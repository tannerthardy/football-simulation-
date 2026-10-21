# Hands that push: plan, bench and an active hand motor (experimental, off)

## Why

A World hand joint is passive. `push` only stops the bodies closing inside
the arms' lockout, `hold` only stops them parting, and `steer` only brakes
tangential slip (`solveTangent` drives relative tangential velocity to zero).
Every active force in a block comes from the legs leaning along the line
between the bodies. So nobody can drive a man sideways or turn him with his
hands. That one gap shows up across the trench:

- a blocker cannot move a planted defender sideways (pair-lateral: 0.00 yd/s);
- the reach panel's slant and penetrator win because the blocker cannot
  redirect them ([reach panel](reach-panel.md));
- drag hand, slingshot and torque need active tangential force;
- pass-rush moves (bull, rip, speed, long-arm, snatch) are still success rolls
  on ratings ([pass-rush hands](https://github.com/tannerthardy/football-simulation-/blob/claude/pass-rush-hands/docs/reviews/pass-rush-hands.md));
- the hand-fight `control` walk that sets push/steer/hold is ratings-driven.

The tackle grasp already has the missing piece: an active reel, bounded by arm
force, arm speed and the arm-work budget. Hands get the same.

## Phase 0: bench

`scripts/diag/hands/bench.ts`: two matched linemen joined by a real World
hand joint; feet and hand requests are scripted, so only the World decides.
Mirrored, both hand-contact modes, audits (work residual, arm impulse limit,
pair momentum vs ground impulse). Drills: turn a planted man, drag hand on a
flowing defender (with restrain and no-hands controls), slingshot a
penetrator, pass-pro punch, defender snatch. Hand requests use optional joint
fields the baseline World ignores, so the same bench measures before and after.

## Phase 1: `HAND_MOTOR=1` (World, default off)

`HandJoint.drive` (wanted tangential velocity of b past a, yd/s) and
`HandJoint.shove` (wanted separating speed with the hands on, yd/s). The
steering row aims its tangential velocity at `drive` instead of zero, and is
charged to the steering actor's arm work (`active`), within the steer limit.
A shove makes the compressive row aim for that separating speed while the
hands are within lockout plus slack, within the push limit and arm work. Both
are clamped to `ARM_SPEED`, act at the existing contact point (patch mode gives
real moments), and are resisted only by the other body's feet, support and
hands. No controller sets them yet, so default and flag-on suites are
identical (Tite witness only) and the angular-law audit is byte-identical.

| Drill (center contact) | Baseline | `HAND_MOTOR=1` |
|---|---|---|
| Drag hand: defender flows 3 yd/s, blocker drives +1 | 1.29 yd (alone 0.96) | 1.82 yd; blocker moves 0.90 instead of 1.29 |
| Snatch: defender holds and drives a leaning blocker across | 0.00 yd | 0.15 yd (patch 0.24, balance excursion 0.17) |
| Turn a planted, braced man | 0.07 yd | 0.10 yd (braced feet beat arms) |
| Punch on a 3 yd/s rusher | dv 1.76 | dv 1.80 (incoming load already saturates arm push) |
| Slingshot along his path | lat -0.02, pen 1.00 | lat -0.07, pen 2.32 |

All mirrors exact; all audits pass with the motor. Open points: in patch mode
the turn drill rotates the defender 83 deg in a second (part of it is his own
re-facing toward a blocker who moved 0.74 yd); the slingshot drill should score
displacement away from the runner's lane, not depth.

## Phase 2, first controllers (`RUN_HANDS=1`, `DL_HANDS=1`, both off; need `HAND_MOTOR=1`)

**Run blocker (`RUN_HANDS`).** A blocker who controls the hand fight pushes a
defender further the way he has committed, when that way takes him off the
blocker's body: a wide flow is dragged past the hole, an inside duck is slung
further inside. Three guards came from the reach panel, one per failure seen:

1. A man working across the blocker's face is only braked (helping him would
   hand him the edge).
2. A man coming straight through is fought with feet and chest, judged by his
   own motion, not the blocker's step (the first version slid a penetrator
   past the shoulder: 3.1 to 5.1 yd).
3. A blocker who feels himself driven back keeps his arms on stopping the man:
   arms share one strength budget, and arms spent sideways released the anchor
   (penetrator 3.6 yd until this guard).

Reach panel with the guards: flow defender carried to 5.42 yd with the blocker
1.2 yd inside him (the cutback lane); anchor, slant and penetrator exactly at
baseline; mirrors exact.

**Shedding defender (`DL_HANDS`).** A defender who controls the hands while
getting off toward the ball drives himself past the blocker's ball-side
shoulder with them (rip, push-pull), not only his feet.

8+8 games, all with `GAIT_STEP=0.3`:

| | Base | + `RUN_HANDS` | + `RUN_HANDS` + `DL_HANDS` |
|---|---|---|---|
| Run yards median | 1.41 / 1.60 | 2.22 / 1.63 | 1.83 / 1.52 |
| Stuff rate | 0.45 / 0.44 | 0.39 / 0.41 | 0.43 / 0.48 |
| Runs of 10+ yd | 0.07 / 0.10 | 0.13 / 0.12 | 0.08 / 0.10 |
| OZ engaged DL depth at 3 s (NFL +1.03) | -0.15 | +0.20 | +0.05 |
| Guards | ok | ok | ok |

The blocker's hands help the offense a little and the defender's give some of
it back; both are within 8-game noise. That is the expected shape when both
sides get the same new physical tool. Who controls the hands is still the
ratings-driven `control` walk; the hands now act, but who gets inside hands is
not yet physical.

## Who controls the hands (`HAND_FIGHT=1`, off): attempt 1

`control` (who supplies the hand forces, and how strongly: 35-100% of arm
force) was a ratings walk toward the better hand-technique rating. With the
flag, first hands land by timing (reach against the closing gap, punch speed
and spread from hand skill, the blocker's snap-count edge), and control then
relaxes toward each side's share of upper-body leverage: balance margin
(support availability), squareness, pad level, arm strength after fatigue.
Hand skill sets the re-fit rate.

Early control now favors blockers; by 2 s about 40% of reps are the
defender's. Reach panel: anchor, flow and drive unchanged or better for the
blocker, but a penetrator with a running start gets 4.6 yd (was 3.1): a
blocker driven back loses balance margin, so the hands, so more ground, while
the defender leaning into him reads as balanced because the blocker carries
his lean.

Games (8+8, with `GAIT_STEP`): engaged DL depth at 1.0 / 1.5 s is unchanged
(OZ 0.47 / 0.30 to 0.50 / 0.25, IZ 0.63 / 0.67 to 0.65 / 0.80, gap 0.40 / 0.30
to 0.40 / 0.23; NFL 0.27 / 0.13, 0.47 / 0.45, 0.32 / 0.13), and yards are
unchanged. Later depth (2-3 s) is worse, but it is confounded: NFL plays still
live then are mostly runs past the line, with DL turning to pursue downfield,
so it measures the play more than the block. On the clean early window the
physical hand fight is neutral while removing the ratings walk. Off for now.

Open: the panel's penetrator loop. Balance margin ignores how much of a
player's support depends on the man in front of him; in football that
commitment is the weakness (step aside or re-anchor and he falls forward).
Count the lean a player's support owes to the contact as leverage he cannot
spend in the hand fight, then re-test the same panel and games.

## Phase 2, next

- Who controls the hands: replace the `control` random walk with the hand
  fight itself (inside position, punch timing and arm length decide where the
  hands land), using `HANDS2`'s two-hand geometry.
- Pass rush: rush moves as hand actions instead of success rolls.
- Slingshot when a penetrator has already beaten the cutoff (blocker behind
  his shoulder), scored by displacement away from the runner's lane.

## Phase 2 (original plan)

- Run blocking: drag hand when a reached defender flows and the blocker
  cannot get across; redirect a slanting or penetrating man away from the
  runner's lane; keep the drive block as a control.
- Defensive line: push-pull and snatch as hand drives in the shed, replacing
  the ratings `control` walk where hands decide.
- Pass rush: rush moves as hand actions instead of success rolls (with the
  `HANDS2` two-hand geometry).

Ownership: the World hand law is the physics session's. This is a flagged
prototype for their review, like `LEG_BRACE` and `GAIT_STEP`.

```sh
node --import tsx scripts/diag/hands/bench.ts
HAND_MOTOR=1 node --import tsx scripts/diag/hands/bench.ts
```
