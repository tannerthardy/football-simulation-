# CARRY_POSTURE attempt 3: the deep zone carry of a vertical (design, before build)

Defense lane, C9 / task 117. Flag `CARRY_POSTURE` (off). It replaces attempt 3's first build (ea23ba5f) and is built on
develop fbeeef9b (engine-68). It depends on Tools' DIR_CAP (#771, tools/dir-cap 70202e4b, merged locally): under
today's facing curve the 60-90 deg band this posture lives in is the body's slowest, so it can only be measured with
the corrected curve. Integration will card the two together.

## What is taught (the rule the player follows)

- **Bail, half-turned, eyes on the passer.** A deep-third or deep-quarter player who has read pass sinks with a bail:
  hips open about 45 deg to his leverage side, head back inside on the quarterback, and breaks when the ball is thrown
  (Bleacher Report, "NFL 101: Introducing the Basics of Cover 3"; Steelers Depot, "Football 101: Bail Technique").
- **Nobody gets behind you.** The deep player's job against a vertical is depth over the receiver, not stride for
  stride (Rivals, "All 22 Breakdown: Dissecting Cover 3": the deep thirds are taught that nobody gets behind them).
- **Run with him from the hip, eyes back.** When the vertical climbs into him he opens further and runs with him from
  a half turn, on the receiver's hip with the head still able to come back to the ball. He shows his back only when
  he must run for his life. That is a stated reading of the coaching above, measured below.

## What the NFL man does (Tools, nflcarry_split.py, BDB 2025 weeks 1-9; WR go, free release, no help)

| t | torso off QB | his speed | climber vx | cushion | turned > 135 deg |
|---|---|---|---|---|---|
| 1.5 s | 41 deg | 3.5 | 6.2 | 4.8 | 1% |
| 2.25 s | 63 deg | 4.9 | 7.2 | 2.6 | 7% |
| 3.0 s | 80 deg | 6.1 | 7.7 | 1.3 | 14% |

He opens early and progressively, runs 1.6-2.3 yd/s under the climber, spends the cushion to about 1.3 yd, and stays
60-80 deg off the QB. Not carrying, deep men sit about 36 deg open (attach_torso.py).

## Ours (simcarry_split.mts, 8 games, engine-67, WR go, no help)

Square (2 deg) to 1.75 s, then 106 deg at 2.25 s and 150 deg at 3.0 s, turned 25% -> 88%, cushion 2.1 -> 0.2. Two
causes in the code: the posture is only a speed match (`openTo`: the smallest angle off the QB whose facing cap gives
the needed pace; a square pedal covers the NFL man's early pace, so he stays square), and once the cushion is spent the
need is the climber's vx (`carrySpeedNeed`'s `spare <= 0 ? vx`), which no half-open posture gives, so he turns.

## Design

1. **Posture is the bail, not a speed match.** From the snap read of pass, a deep zone defender's hips open to his
   leverage side by the bail angle, `BAIL_OPEN` (45 deg, the taught half turn; ZONE_EYES already states it for Cover
   3 corners), head on the QB through the neck and trunk (`lookJoints`). The speed match only opens him further: the
   facing is the more open of the bail and `openTo`'s angle for the need.
2. **Opening with the carry.** While he carries a climber he keeps the receiver and the QB both in view: his torso
   turns toward the receiver's bearing as far as needed to keep the receiver within the head's reach while the head is
   on the QB (the angle between them less the neck range, bounded by the trunk and then the hips). As the receiver
   climbs level, the angle grows on its own: the progressive 41 -> 63 -> 80 deg comes from geometry, not a schedule.
3. **The end of the carry protects the throw.** Once the spare cushion is spent his need is not the receiver's pace.
   He may concede the cushion down to the floor (both bodies' overlap with no help, minus it with help) over the time a
   ball thrown now would take to reach his depth: need = vx - (cushion - floor) / H, where H is his distance from the
   passer over the deep-ball speed already used for the shoulder estimate (SHOULDER_BALL_SPEED, 17 yd/s), so a man 20
   yd from the passer has about 1.2 s. A deeper man can give more; a man about to be passed must run.
4. **The turn is kept and committed.** He turns his back only when no posture within the head's reach (neck plus trunk)
   gives that need, under DIR_CAP's curve. The side he opened to and the turn are committed decisions (attempt 3's
   first build): side kept per receiver until square again; turn exits once the need is below 0.85 of the cap at the
   reach angle.

Stated choices: BAIL_OPEN 45 deg (taught), the turn exit 0.85, H from SHOULDER_BALL_SPEED. No timer, no hidden
information: the receiver, his speed and the QB come from the defender's own pictures (`sim.see`).

## Expected (stated before the build)

WR go, no help: torso off QB at 1.5 / 2.25 / 3.0 s toward 41 / 63 / 80 deg; turned under 15% at every time; cushion at
3.0 s about 1.3 yd; his speed about 6 at 3.0 s. Deep completions on gos against zone not up (pass-count deep rows).
The breaking routes (WR other) must not lose their drive: a man half-open breaks forward with less turn than from a
backpedal (task 122's trace: the deep man's break on the ball spent 0.6 s turning 140 deg at 1.5-2 yd/s).

Witness: simcarry_split.mts against these rows, the attempt-1 carry table, deep completion rate on gos, and the
last-defender row (last_defender.py) for the break on the ball.
