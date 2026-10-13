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

## Phase 2 (next): controllers ask for it

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
