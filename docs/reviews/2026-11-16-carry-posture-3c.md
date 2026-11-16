# CARRY_POSTURE 3c: on the cushion break he runs open, and turns fully on a seen event (design, before build)

Defense lane, C9 / task 117. Builds on CARRY_POSTURE 3b (#779) and CORNER_DROP (#783); its own experimental flag
`CARRY_TURN` (off). Nothing is built.

## What is wrong

CUSHION_BREAK decides when a deep man stops pedaling or carrying half-open and turns to run with a climber (the zone
path's `turnedWith`, the man path's `hipsOpen`). Once it fires he turns his back to the quarterback and runs. Under 3b
the posture before that turn is right (43 deg at 1.5 s against the NFL's 42), but the turn itself comes early and is
full.

The same operator on both sides (`nflcarry_bins.py` on BDB 2025 weeks 1-9 and `simcarry_bins.mts`, WR go routes with no
help; torso angle off the line to the QB by the receiver's signed cushion over him, positive = the receiver still in
front):

| Cushion (yd) | NFL before the throw: torso p50, share over 135 deg, speed | Ours (3b) before the throw | NFL ball in the air | Ours ball in the air |
|---|---|---|---|---|
| +3.0 | 56, 3%, 4.7 | 66, 0%, 4.2 | 60, 4%, 4.7 | 48, 2%, 3.6 |
| +2.0 | 65, 9%, 5.0 | 93, 1%, 4.5 | 67, 8%, 5.2 | 93, 7%, 4.4 |
| +1.0 | 71, 14%, 5.2 | 144, 60%, 5.0 | 72, 12%, 5.6 | 152, 67%, 4.6 |
| +0.5 | 69, 15%, 5.3 | 150, 71%, 5.3 | 85, 17%, 6.0 | 147, 66%, 5.2 |
| 0.0 | 81, 25%, 5.4 | 144, 80%, 6.0 | 112, 34%, 6.6 | 144, 83%, 6.6 |
| -0.5 | 76, 30%, 5.0 | 142, 80%, 6.8 | 121, 45%, 6.5 | 145, 89%, 7.3 |
| -1.0 | 60, 14%, 4.2 | 142, 75%, 7.3 | 91, 24%, 5.0 | 146, 89%, 7.6 |

The NFL deep man stays open to the quarterback (torso 56-81 deg) right up to the receiver drawing level, and turns
fully mostly with the ball in the air and the receiver even with or past him (34-45% over 135 deg at 0 to -0.5 yd). Ours
is past 135 deg on 60% of frames at +1.0 yd before any throw, and 80% from level on, and runs faster than the NFL man
once turned (6.8-7.3 against 5.0 at -0.5 to -1.0 yd before the throw): he has given up his eyes to buy speed he did not
need yet.

## What is taught

- Deep zone vertical: "turn when the cushion breaks" means open the hips and run with him, eyes still back to the
  quarterback through the head and trunk, staying on top (USA Football, Defending the deep ball; Rivals All-22, "nobody
  gets behind you").
- He turns his head fully away (locates the ball, plays the receiver's hands) only when the receiver is even with him
  or the ball is in the air to him; until then his eyes are on the quarterback and the threat.

## Design (flag off)

1. **The cushion break opens him; it does not turn him.** When CUSHION_BREAK fires (as now: cushion against overlap
   plus closing times flip time), he opens his hips to his line of travel and runs with the climber, with the trunk and
   head turned back toward the quarterback within the head's reach (neck plus trunk, as in 3b). That is the running
   posture DIR_CAP and the trunk price already charge for: hips on the line, so full directional speed, less the twist's
   price (0.0018 per degree: a 60 deg twist costs 11% of top speed). He concedes that speed; it is the cost of the eyes.
2. **The full turn is a seen event.** He turns his back to the quarterback (head and trunk to the receiver and the
   ball) when, in his own delayed picture, either:
   - the receiver is even with or past him: signed cushion at or below 0 (enter), back above +0.5 yd (exit); or
   - the ball is in the air toward his receiver (his throw sighting and its direction, the existing seen-throw cue,
     not the true flight).
   Commitment: the full turn holds until both cues have cleared their exit margins.
3. **Unchanged.** When CUSHION_BREAK fires; the man path's re-square rule; help and no-help splits; underneath carries.

Stated choices: the exit margin (+0.5 yd); the head's reach and the twist price (3b's and DIR_CAP's, not new).

## Witness, not targets

The same bins (torso off the QB and speed by signed cushion, before the throw and with the ball in the air), WR go,
no help; go-route completion, yards and catch separation; the deep man's distance to the catch point; last_defender
(speed at the catch, closest under 1 yd). Expected direction if built as taught: fewer full turns before level, a
little less speed when carrying ahead of the receiver, the ball located later. Its cost: a receiver who wins clean on
the stem gets a step on a man running open, which is the trade the technique accepts.
