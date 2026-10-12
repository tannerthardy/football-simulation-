# Controller easy gains: anchor, rush-move audit, tackle and fatigue panels

Controller session, `claude/easy-gains`, cut from `claude/engine-priorities`
at `8579632`. One controller change (run-blocker anchoring); everything else
is a diagnostic or a measurement handed to the physics session. No physics,
capacity or tackle code changed.

## Run-blocker anchoring (landed, `RUN_ANCHOR=0` disables)

A run blocker who feels himself driven back (felt contact load above a quarter
of his weight and his own velocity along it) stops spending traction on
lateral drive and pushes straight back against the load. Locomotion and lean
share one traction budget in the World, so drive spent sideways was ground
given up. Same capacities, same physics.

Bull-rush panel (`scripts/diag/runblock/bullrush-panel.ts`; yd driven in 2 s):

| Arm | Before | Anchor |
|---|---|---|
| Identical bodies, game's own run-block request | 1.01 | 0.60 |
| Native rosters (C vs DT), game's own request | 0.82 | 0.56 |
| Identical bodies, blocker braces (reference) | 0.40 | 0.40 |

Games, two 8-game cohorts (seeds 101 / 202), shared mechanism operator:

| | Baseline | Anchor | NFL 2022 |
|---|---|---|---|
| Outside-zone OL lateral flow, 1.5 s (negative control) | 0.74 / 0.72 | 0.82 / 0.72 | 3.40 |
| Inside-zone OL lateral flow | 0.72 / 0.70 | 0.74 / 0.72 | 1.80 |
| Designed runs of 1 yd or less | 0.42 / 0.37 | 0.43 / 0.38 | - |
| Engaged DL depth at 3 s, median | -0.7 / -0.7 | -0.8 / -0.7 | +0.2 |
| Points per team | 55.3 / 40.9 | 57.8 / 35.8 | - |

Lateral flow is not reduced; outcomes are neutral within cohort noise; all 12
guards hold. `test/run-anchor.test.ts` fails without the change (1.01 vs 0.70
allowed). The anchor is not the cause of failed runs; it removes a 1v1
incoherence. The pad-line loading proposal stays off (physics review).

## Rush moves are outcome dice that almost always fail

`scripts/diag/passrush/panel.ts --trace` (1v1 edge rep, scripted moves) and
two full games:

- In games, **5.8% of 1,971 rush moves succeed** (bull 8%, longarm 6%,
  club 6%, swim 5%, rip 4%, snatch 3%, spin 2%; dip 17%). Each move is
  `rng.chance(logistic(...))` from ratings.
- Every failure gives the blocker `control += 0.35` and a punch strike. Control
  is a ratings-driven random walk plus these bumps, and it sets hand-joint
  strength. Failed moves therefore make the next move less likely to work.
- In the 1v1 panel speed, chop and chop-spin scripts are indistinguishable:
  nearly every move fails, and rushers win only by turning the corner
  physically.
- The punch itself is a physical, momentum-conserving `World.strike` within
  arm limits; removing it changes little (pressure 0.73 to 0.77). **The earlier
  claim that the punch knocks rushers down was wrong:** every rusher "down" in
  the panel is a sack dive at the QB.

The fix is physical move resolution (hand forces at contact points, the
HANDS2 direction), which waits on the angular-contact solve. No change here.

## Tackle panel (diagnostic only)

`scripts/diag/tackle/panel.ts`: one carrier, one tackler using the production
`chase`/`tryTackles`; bearings 0-180 degrees, speeds 3/6/8 yd/s, straight or
late-cut carrier, mirrored sides, 12 seeds (576 reps). Records every attempt
(rolled miss vs grip, origin, capacity, mean/peak achieved grip force, held
time, break), contact impulse, and censored endings.

- Mirror sides agree in every cell.
- Rolls decide 1% of attempts in ordinary cells and 5% in difficult ones;
  physics decides most 1v1 outcomes.
- **From behind against a slow carrier (135-180 degrees, 3 yd/s) the grip
  carries almost no load**: capacity about 1,430 but mean force about 4 over
  4.1 s, while the carrier walks 12 yd before going down. The tackler runs
  with him instead of setting his feet. At 135 degrees / 6 yd/s, 18 of 24 reps
  are censored at the time limit the same way.
- At 90 degrees and 8 yd/s the tackler never gets an attempt (start geometry
  out of reach); at 90 degrees / 6 yd/s, 22 of 24 escapes leave the tackler on
  the ground after a lunge.

## Fatigue is almost free (measured; proposal to the physics session)

`scripts/diag/fatigue/game-energy.ts` (two full games) and
`scripts/diag/fatigue/repeat-panel.ts`:

- Energy at the snap: DL median 0.970, 10th percentile 0.943, worst 0.718.
  The speed/force factor at the snap: median 0.999, 10th percentile 0.997,
  worst 0.976. Starters play every snap; nothing makes rotation worthwhile.
- Twelve maximal 2 s bull rushes with 35 s rest settle at energy 0.964 and a
  0.13% force loss; with 12 s rest (no-huddle), 0.86%. Yards driven never
  change.
- Cause: one energy pool with a convex loss curve, `1 - 0.14 deficit^1.4`,
  which is nearly flat for the small repeated deficits football produces.
  Short maximal efforts in real play draw on a fast store that depletes within
  seconds and recovers over tens of seconds, on top of slow game-long fatigue.

Proposal (physics owner): a fast compartment depleted by high-intensity effort
(sprint, maximal push), recovering on a tens-of-seconds scale, with a direct
effect on peak force and speed; keep the slow pool. Check it first with
`repeat-panel.ts` and against movement data, not game statistics.

## Other

- `claude/pursuit-coverage` is superseded: the shared branch carries the same
  zero-mean pursuit bias. Its diagnostics land here (`scripts/diag/pursuit/`).
- `claude/in-stride-catch` needs an A/B against the moving-catch repair before
  it is dropped or kept.
- `npm run test:data` has 4 failures in `test_orientation_motion_audit` on the
  shared branch with or without this change.

## Reproduce

```sh
node --import tsx scripts/diag/runblock/bullrush-panel.ts
RUN_ANCHOR=0 node --import tsx scripts/diag/runblock/bullrush-panel.ts
sh scripts/diag/runblock/ab.sh anchor && sh scripts/diag/runblock/ab.sh base RUN_ANCHOR=0
python3 -I scripts/diag/runblock/summary.py base anchor
ARM=base node --import tsx scripts/diag/passrush/panel.ts --seeds 30 --trace
node --import tsx scripts/diag/tackle/panel.ts --seeds 12
node --import tsx scripts/diag/fatigue/game-energy.ts 101 202
node --import tsx scripts/diag/fatigue/repeat-panel.ts --reps 12 --rest 35
```
