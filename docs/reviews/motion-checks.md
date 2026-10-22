# Defensive answers to pre-snap motion (`MOTION_CHECK`)

2026-10-22, branch `claude/motion-checks` (PR #196), stacked on #194
`claude/def-alignment`, with #193's offensive motion merged (`MOTION`, the
coverage-rules session's). The user asked for the defense to "know how to
line up ... and all the checks". The coverage-rules session handed over the
defense's response to motion (`MotionRuntime.respond` in `src/sim/motion.ts`)
together with its Fangio items E1 and E3. Default-off, identical when off.

**Question.** When one offensive player goes in motion, does the defense
move the way tracked defenses do: who goes with him, who exchanges jobs,
whether anyone runs the width of the field, and whether the front re-sets?

## Measurement

One operator for both sides: `scripts/diag/align/motionlook.py`.
- **Tracking.** `nfl_motion.py` (2022 BDB 2025 weeks 1-9) takes every play
  with exactly one offensive player in motion since the line set
  (`player_play.motionSinceLineset`): 4,259 plays, 3,856 classified. For
  each, it records every player at the `line_set` and `ball_snap` frames, with
  PFF man/zone and each defender's primary man matchup.
- **Sim.** `sim_motion.ts` uses real coordinators and a real `PlaySim` set-up
  over the 2022 situations, with motion on. Recording is on: the first
  pre-snap frame is the line set, and the bodies at the end of set-up are the
  snap.
- **Kinds.**
  - jet: the motion man is still moving at the snap;
  - empty: he starts in the backfield and ends detached;
  - across: he ends on the other side of the ball;
  - same: in, out, or in and back on his side.
- **Measures.**
  - travel: a non-lineman moved with him at least 60% of his lateral move
    and ends within 3 yd of him;
  - lock: in man coverage, the defender matched to him at the snap was
    already on him at the line set;
  - far crossers: non-linemen who crossed the ball and moved more than 5 yd;
  - over M: who ends nearest him laterally, under 8 deep.

## What tracking shows

| Kind, coverage | n | travel | lock | far crossers | nobody within 3 yd |
|---|---|---|---|---|---|
| across, man | 259 | 53% | 51% | 53% | 2% |
| across, zone | 623 | 14% | | 17% | 5% |
| jet, man | 524 | 47% | 66% | 22% | 1% |
| jet, zone | 1,431 | 16% | | 6% | 4% |
| empty, man | 65 | 68% | 69% | 29% | 5% |
| empty, zone | 174 | 23% | | 9% | 10% |
| same side, man | 199 | 50% | 58% | 7% | 1% |
| same side, zone | 383 | 30% | | 5% | 3% |

- **Man coverage.** It locks about half to two-thirds of the time; otherwise
  it trades.
- **Zone coverage.** It bumps: jobs move and players slide; someone crosses
  the field on 6-17% of motions.
- **Empty motion.** In man, a backer ends over the back 40% of the time
  ("Roll It": a backer takes a back motioning out).
- **Sources** (catalog section 5, `docs/references/defensive-alignment-sources.md`):
  - 2002 Bengals: "STAY", "BUMP: pass defenders on motion ... slide one man
    over", "LOCK: all coverage defenders stay on their man";
  - MQ glossary: "Spin", "Rocket", "Roll It", "Glue";
  - 1997 Jets / 1999 Buccaneers: motion across the ball changes strength;
  - 1998 Bears: "TE move" shifts the front;
  - timing: jets leave time only for individual rules, and safeties rotate
    late on the cadence, not on motion.

## What the sim did (the provisional bump)

Every 0.2 s the whole defense re-sorted to the alignment for the formation
it saw 0.3 s earlier. At the snap the coverage was re-installed and man
targets were re-matched by position, so every motion was a trade. When
strength flipped, whole groups ran across the field: zone across motions had
a far crosser on 59% of plays (tracked 17%), and nobody was within 3 yd of
the motion man on 57% (tracked 5%).

## The rule (`MOTION_CHECK`)

- **Man coverage locks or trades.** A lock keeps the line-set man defender
  on the motion man through every re-sort and the snap's re-install
  (`alignDefense`'s man override). The lock rates are the tracked ones by
  kind: across 51%, jet 66%, empty 69%, in-and-back 58%. Otherwise he
  trades.
- **Everyone else bumps.** The coverage for the new formation is handed to
  whoever is nearest, by least summed squared distance, so several men slide
  rather than one running the width of the field:
  - the corners exchange only with each other, so they keep their sides;
  - every other job goes among the nickel, dime, safeties and backers;
  - a deep job goes only to a safety;
  - a man job on a wide receiver never goes to a backer.
  On a change of strength the safeties spin, and the new slot is taken by
  the down safety or an apex backer.
- **The front stays.** A receiver's motion does not move the front's side:
  the linemen keep their techniques, and the backers stay keyed to them.
  Under the provisional re-sort, the front re-set at the snap around linemen
  who had not moved, so their gaps were assigned from spots they did not
  occupy.
- **A jet locked in man is trailed at full speed.** The defender runs to
  where the jet was a reaction time ago, carried on at its seen pace.

## Result (snap frames, candidate profile plus `MOTION=1`)

| | provisional bump | `MOTION_CHECK` | tracked |
|---|---|---|---|
| across, zone: far crossers | 59% | 20% | 17% |
| across, zone: nobody within 3 yd of him | 57% | 35% | 5% |
| across, man: far crossers | 86% | 70% | 53% |
| empty, zone: far crossers | 39% | 13% | 9% |
| empty, man: a backer ends over him | 38% | 50% | 40% |
| jet, man: travel | 0% | 5% | 47% |

What is left is mostly the offense's motion paths, which are the
coverage-rules session's plans:
- **Jets.** Sim jets snap 1 yd past the ball (median motion-man lateral at
  the snap 1.6 yd); tracked jets snap at 5.0 yd, mostly before reaching the
  ball. A defender trailing to the middle of the formation does not end
  "over" him, and the linemen are nearest.
- **Across.** Sim across motion sets the receiver at a median 8.8 yd from
  the ball after moving 17.8 yd; tracked motion sets at 5.4 after 11.7. The
  widest receivers set where no underneath defender stands.

## Game check

Eight games, seed 101, source `e4bea23c`, candidate profile with `MOTION=1`,
`MOTION_CHECK` off then on, run through `baseline.mjs --candidate`.

| | provisional bump | `MOTION_CHECK` | NFL |
|---|---|---|---|
| Report flags, off / all | 36 / 113 | 33 / 117 | |
| Guard | 12/12 | 11/12 (`run.box_count` 75th/90th percentile 7/8 → 8/9) | |
| Run yards, mean | 7.4 | 6.8 | |
| Broke contact on runs | 16.6% | 13.5% | 12.5% |
| Separation at the throw, median [IQR] p90 | 3.45 [1.75, 4.97] 7.28 | 3.28 [1.84, 4.59] 6.02 | 3.86 [2.28, 5.72] 7.62 |
| Zone separation at 2.5 s, p90 | 7.14 (off) | 5.72 (ok) | 5.26 |
| Yards after catch, mean / p90 | 9.7 / 26.3 | 10.7 / 32.0 | |

**The box guard.** It is the games diverging, not the response. The games
call different plays: 348 and 376 runs, at different downs and distances.
Box count is a whole number, and the guard compares its 75th and 90th
percentiles. On the same motion plays (snap frames, identical set-ups, only
the response differs), `MOTION_CHECK` lowers the snap box:

| Motion | box change from line set to snap (NFL) | provisional | `MOTION_CHECK` |
|---|---|---|---|
| across, runs | −0.02 | +0.75 | +0.45 |
| across, all | −0.08 | +0.74 | +0.37 |
| empty | −0.46 | +0.18 | −0.39 |

Nine-man run boxes on those plays fall from 120 to 101. Two sources of box
growth are not this flag:
- The same-side motions' +0.83 is identical in both arms. That is the front
  stems, blitz creeps and snap-count movement in the same pre-snap window.
- The jets' +0.5 is the jet that snaps at the ball.

**Passing.** Wide-open tails close: zone separation at 2.5 s goes from off
to ok. Separation at the throw tightens past the tracked tail (p90 6.0
against 7.6). The yards-after-catch tail rises, from 50 catches against man
coverage. It is the after-catch item on the workboard.

**Reading.** The motion mechanism moves toward tracking. The pass-game
tightening has no single traced cause yet. `MOTION_CHECK` stays off in the
profile: it acts only with `MOTION` on, and `MOTION` is the coverage-rules
session's flag (off). Turning motion on is the user's call; turn on the
check with it.

## Tests

`test/motion-check.test.ts` (4):
- zone motion: the corners keep their sides and no one runs the field;
- the defender over the motion man was nearer him than the nickel at the
  set;
- man motion: locks and trades both occur over seeds, and a lock keeps the
  set defender on him to the snap;
- four wide, a strength-flipping motion: the linemen keep their spots on,
  and re-set off.

Core: 2,953/2,953 plain, and under the candidate profile with `MOTION=1
MOTION_CHECK=1`.

## Not done

- **Fangio E1** (strength and rotation to the nickel side, the nickel
  traveling only on a change of strength) and **E3** (real rotation timing,
  with the rotating safety fitting from where he stands). The bump's
  exchange covers the nickel's side for zone. Rotation timing is
  `alignDisguised`'s rotation at the snap.
- **Shifts** (several players resetting) and tight-end motion: `MOTION`
  moves one off-ball player.

## Reproduce

```sh
python3 -I scripts/diag/align/nfl_motion.py            # out/align/nfl-motion.csv.gz (raw data in data/raw)
node scripts/baseline.mjs --candidate --flag MOTION=1 --flag MOTION_CHECK=1 -- \
  node --import tsx scripts/diag/align/sim_motion.ts --n 4000 --out out/align/sim-motion-check.csv.gz
python3 -I scripts/diag/align/motionlook.py out/align/nfl-motion.csv.gz out/align/sim-motion-check.csv.gz
```
