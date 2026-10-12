# Physics questions from the controller session (read-only investigation)

No physics code changed. Three experiments, each with the shared operator or
production bodies and joints:

```sh
node --import tsx scripts/diag/physics/pair-lateral.ts
python3 -I scripts/diag/physics/moderate-accel.py out/mechanics/nfl-plays.jsonl.gz out/rb/LABEL-101.jsonl.gz out/rb/LABEL-202.jsonl.gz
python3 -I scripts/diag/physics/after-contact.py out/mechanics/nfl-plays.jsonl.gz out/rb/LABEL-101.jsonl.gz out/rb/LABEL-202.jsonl.gz
```

## 1. Engaged co-flow is not limited by the World

Identical bodies, the production run hand joint, scripted requests (mean
lateral speed 0.5-1.5 s):

| Both request | Free, apart | Engaged, squared | Engaged, hips open 45 | Torso contact only |
|---|---|---|---|---|
| 2 yd/s | 1.06 | 1.31 | 1.31 | 1.06 |
| 3 yd/s | 1.48 | 1.85 | 1.85 | 1.48 |
| 4 yd/s | 1.77 | 2.12 | 2.23 | 1.77 |

The engaged pair moves at least as fast as two free bodies. Facing matters
little at these speeds. The lateral deficit in games (engaged OL 1.0 vs NFL
3.0 yd/s on outside zone) therefore comes from the requests, not from contact.
This agrees with the physics session's finding of no universal pair-speed
barrier.

**Open:** when only the blocker moves, the planted defender's lateral speed
is 0.00, and the rep separates after about 1.3 s. A blocker cannot move a
planted man sideways. That may be right: leg drive acts only along the felt
load, which is the line between the bodies, so he must get to the man's side
first. But hand steer is a slip restraint, not an active force. Real hands
can push a shoulder sideways or turn a man ("turn him", push-pull). Worth
deciding in the contact-point hands (HANDS2) design: active, bounded
tangential hand force, not only restraint.

## 2. The effort-proportional gait is not the problem (falsified)

Hypothesis: `accel = (wanted - v) / tau` makes moderate requests sluggish.
Test: from a standstill at the snap, the share of a player's 0-1.5 s peak
speed reached at 0.3 / 0.5 / 0.8 s, by peak bin. NFL linemen also climb
gradually: OL 0.26 / 0.21 / 0.19 at 0.3 s for peaks of 1.5-2.5 / 2.5-3.5 /
3.5-5 yd/s. The sim reaches equal or larger shares. Peak acceleration and top
speed match the NFL for every group. Nothing to change here.

## 3. Bodies stop too hard

Max deceleration median (p90), sim vs NFL: OL 3.68 (5.25) vs 2.53 (3.86);
RB 4.86 (7.65) vs 3.60 (5.50); WR 5.11 (6.88) vs 3.60 (5.82); DB 4.19 (6.74)
vs 3.12 (5.56). Receivers are mostly free of contact, so it is not only
collisions. The upper tail is about 20% high, which suggests braking capacity
(`brake = (8-15) x GAME_CUT 0.55`). The median is about 40% high, which suggests
controllers also request abrupt stops more often than players do. Both
change pursuit angles, cuts and evasions.

## 4. The stop after contact is front-loaded

Runs with a carrier moving at least 2 yd/s at first contact (NFL 5,546, sim 525):

| After first contact | NFL | Sim |
|---|---|---|
| Speed at +0.0 / +0.2 / +0.4 s | 4.61 / 4.19 / 3.61 | 4.37 / 3.02 / 2.40 |
| Plays still live at +0.6 / +0.8 / +1.0 s | 0.92 / 0.83 / 0.71 | 0.75 / 0.35 / 0.21 |
| Median yards since contact at +0.8 s | +2.0 | +2.0 |

The first 0.2 s removes 1.35 yd/s in the sim against 0.42 in the NFL. Most sim
plays end by 0.8 s; most NFL plays are still going at 1.0 s. Yards gained up
to 0.8 s match, so the deficit is the early whistle and the early impulse,
not finishing. Candidates to separate, in this order:

1. **Grasp onset.** A grasp joint forms at full capacity and starts reeling
   (`pull` 1.2-2.4 yd/s) immediately. Closing arms and setting a grip take
   about 0.2-0.3 s, during which the load builds.
2. **Strike plus collision.** `strike()` adds up to about 1.3 yd/s toward
   the carrier before the wrap, then torso contact. Split the 0.2 s speed loss
   by first-contact type (torso collision, grasp, strike) and approach angle.
   Most NFL first contacts are glancing or from the side, so they couple
   little mass.
3. **Falls.** Two-thirds of sim plays end within 0.8 s of contact. Check
   whether these are physical falls of the carrier or of the pile, and the
   carrier's support state at contact.

The physics session owns tackling. This is offered as evidence and
hypotheses, not a proposed patch.
