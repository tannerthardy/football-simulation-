# Design note: the blocker–defender pair contact model (PAIR_HANDS)

Flex, 2026-11-14, for Integration's approval before any code. Evidence: [the tackle-set review](2026-11-12-tackle-set.md)
(CONTROL_HANDS, HAND_FIT, BRACE_GAIT, the hands-vs-torso measurement).

## Read first: the yaw question is the request (2026-11-14, after Tools' off-centre trace)

The engaged blocker's facing request is the bearing to the man: `engagement.ts` sets `facing: atan2(d.pos - b.pos)` for the
engaged pass set (line ~2106), the ride (~2124) and the run drive (~1595); the staged rows did the same. On the crossing
row (Tools, PR #745) the pair turned 68-69 deg (outside) and 43-44 deg (inside); with no contact spin at all (inside,
HANDS_LEVER=0) 39-40 deg on the motor alone: about 90% of the turn is the request. Contact moments do reach him (joints to
about 1,460 N on 0.04-0.12 yd arms, 0.2-0.4 s), against a motor at its grip-limited cap (peak 249 / 223 of 241, lagging
11-18 deg). A request that tracks the opponent's bearing hides every "turned" outcome: he turns with the man beating him,
and there is no moment to show it.

So the order of the design is:

1. **What he is trying to face.** As coached: a pass setter keeps his shoulders square to his set (inside-out, his chest
   between the rusher and the quarterback, hands to the man's inside half); he does not turn to follow the rusher's
   shoulder. Opening his hips to run with a man who has won the corner is a decision (the ride, with its enter / exit
   margins), not a tick-by-tick bearing. The same for a run blocker (square to his track, his head on the play side) and a
   run defender holding a gap (square to the line, his outside arm free). The request comes from his set, his landmark and
   what he feels, not the man's true position.
2. **The motor yielding past its cap** under an applied moment: being turned is losing that facing against the man's force
   and his own late feet.
3. **Where the load goes**: the shoulder joint carrying it, or bodies off the line of centres, and the two joints on one
   gap sharing it. Grip shared with the motor is a separate second item.

Falsifiable: with a square request, the facing-follows-bearing slope (NFL 0.72, ours 0.78) can stay near the NFL only if
contact turns him; if it collapses toward 0 and the rusher off his chest (NFL 15 deg, ours 3) jumps far past the NFL,
the moments are missing. Information: the engaged requests read `d.pos` (the man's true position, undelayed); through
the hands he feels the man, but at the felt delay the punch already uses (`sim.see(b, d, 0.06 / rt)`), so the new request
reads that, not the true position.

## Why one model, not a sixth single-law flag

Five single-law flags on the hands joint each exposed the same thing:
- RIP_CLEAR;
- HANDS_LEVER;
- BRACE_GAIT;
- CONTROL_HANDS;
- HAND_FIT.

Today one `hands` joint per engagement stands in for both men's hands and for the torso between them:

1. **It belongs to whoever the rolled `control` names.** Its sign picks the actor; its size scaled the press until
   CONTROL_HANDS.
2. **It carries all the load at any gap.** In engaged play the torso contact carries essentially nothing (p50 0 N in
   every gap bin but touching). When the chests do touch, both constraints act across the one gap (14-58% of touching
   ticks), and inside the bent base the hands' force rises (1650-1800 N under HAND_FIT) instead of handing over.
3. **It has a set length.** A man going by leaves it in 0.05-0.10 s (the stalk), and a man in front is held at its
   length (the edge, separation 1.00-1.12 against the NFL's 0.76-0.89).

## The model, as it is taught

The sources are the handbook's coached reductions:
- [trenches](../football-handbook/trenches.md) section 2: supported arrival, hands with feet, independent recovery;
- section 7: sets, the anchor, controlled yielding, "continuous hands when physically possible";
- section 8: the defender's strike and extension, the rusher's attack and counter ("a rip, club, swim or snatch
  changes contact/access and cannot provide an unexplained burst of energy");
- Jerry Campbell's DL run and pass teaching cited there.

These are coaching proposals, not measured NFL facts.

### Each man has his own hands state

On one pair there are two hands states, the blocker's and the defender's. Each holds:

- **Fit:** off, or on the man at a site, by side. The site is inside (on his chest plate, inside his arms) or outside
  (on his shoulder or arm, outside his hands). A hand that is off re-fits by reach and arm speed (RUSH_HANDS' refit:
  reaction plus the gap at ARM_SPEED).
- **Length:** a state between his bent base (forearm, arm x 0.3) and lockout (arm x 0.9). It moves at ARM_SPEED: out to
  follow a man going away or by, as far as lockout (the stalk, the ride); in under a load the arm does not hold (the
  recoil, HAND_FIT attempt 2's law); out under his own strike (PUNCH).
- **Force:** pressForce along the arm and armForce across it. Inside hands press through the bones of a straight arm
  (the strut at lockout is right: LONGARM_STRUT's finding). Outside hands press on a shoulder or arm and steer the man
  (they cannot hold him off his line). The one-degree-of-freedom hand (RUSH_HANDS, RIP_CLEAR) is the site's sliding.

### Who has inside hands is placement, not a roll

At each strike, and each re-fit, a hand lands at a site. Where it lands depends on:
- **Reach:** arm length against the gap at the strike; the longer arm arrives first (the existing armEdge physical
  term, without the dice).
- **Timing:** whose hands arrive first. The strike's travel time at ARM_SPEED from his felt picture of the man (PASS_FEEL
  latency). Late hands land outside, on an arm already inside.
- **Skill acting on placement error:** a hand aimed at the chest plate lands with an error whose spread falls with his
  hand technique (a perceptual and motor error, sim.dice, the same kind of draw as a throw's accuracy). The error
  decides inside or outside, not the outcome.
- **The other man's hands:** a hand already inside blocks the line to the chest; the second hand lands outside it, or
  must clear it (a rip, swipe or club).

`control` is removed as a state. Where something needs "who has the better of the hands", it reads the two fits.

### Force through hands while there is arm length, then the torso

- **Beyond either man's bent base:** the hands carry the load (the joints as today, one per hand that is on, each with
  its own length and limits).
- **As a man's length reaches his bent base under load:** his hands' share hands over to the torso contact
  continuously over the last part of the arm's travel. The press limit falls to zero at the base, while the torso
  contact (already in the World) carries the rest. One gap, one load path at a time, blended. The two constraints never
  both hold the same distance.
- **With the chests together:** the torso contact carries the normal load, and friction carries the across. The hands
  that are still on steer and hold (a man with his hands inside and his elbows in holds with his body and legs). This
  is the run fit, and the edge's 0.81 yd.

### The defender's side is the same hands

- **The run defender's stack:** strike, lockout, separate; then the shed, which is his hands clearing the blocker's
  (the rip, swipe or club law). It is his hands state at lockout on the blocker, inside if he won the placement.
  Today it is the same joint with the sign flipped, then a rolled shed.
- **The rusher's moves** are the same hands acting from his side:
  - the long-arm is his inside hand at lockout (exists as a joint under RUSH_HANDS);
  - the rip, club and swipe are forces on the blocker's hand at its site (exist as forces under RUSH_HANDS and
    RIP_CLEAR);
  - the swim and the snatch are not yet forces (rolls).
- **Each move needs a target state.** A rip is the rusher's near arm under the blocker's outside hand; the club, the
  blocker's inside hand from outside.

## What each existing flag becomes

| flag | under PAIR_HANDS |
|---|---|
| CONTROL_HANDS | subsumed: capacity is each man's own; `control` removed |
| HAND_FIT | subsumed: the blocker's length state, follow and recoil |
| RUSH_HANDS (the hand body, refit, club, long-arm, keyed) | subsumed: the 1-DOF hand is the site's slide; the club and long-arm are the rusher's hands |
| RIP_CLEAR | subsumed (the rip force on an outside hand) |
| RUSH_ONE_HAND | subsumed (per-hand fit) |
| LONGARM_STRUT, KEYED_FELT, RUSH_ARM_BALANCE | carried over, read on the per-hand state |
| HAND_SITE | subsumed: the site replaces the bearing weight |
| HANDS_CHEST | kept (chest points: where the hands meet) |
| HANDS_LEVER | kept as an option: it acts on the hands' rows; its IZ question is re-read |
| PUNCH, PUNCH_STRIKE | kept: the strike that sets the site and length |
| OPEN_HANDS | kept: the grip at a site (holding) |
| BRACE_GAIT | independent; re-read on top |
| VERTICAL_SET, CORNER_AIM | independent; CORNER_AIM re-read on top |
| HAND_FIGHT, the run shed rolls, DL_HANDS, RUN_HAND_MOVE, `contactControl` | die: replaced by the fits; the shed is the defender's hands |
| resolveMove's logistic for the finesse moves still rolled (swim, snatch, spin) | stays for now as the next rolls to rebuild; their outcome writes a fit, not `control` |

## Witnesses, and what I expect to move

**Pass:**
- separation at +0.4 s by landing class, against the NFL's 0.81 / 0.76 / 0.89; expected to close to about bodies plus
  the bent base, and below it on reps where the rusher is inside;
- edge win (13%);
- interior pressure (9.8%);
- the standing body correlations (mass, arm, speed; the roll's coefficient should go to about zero);
- falls;
- the inside share at the win (47%).

I expect interior pressure to rise from CONTROL_HANDS' 2-3%, because placement lets a rusher win the hands, and the
long-arm and club then act on a real fit. The edge should close toward bodies plus the base and below.

**Run:**
- missed + broken;
- toss (-1.18 under HAND_FIT with the defender's hands missing), IZ, gap, duo;
- the stalk's joint life (0.05-0.10 s now; expected several tenths) and a crosser's speed lost;
- Rules+Coaching's screen fixtures.

I expect run blocks to lose most of HAND_FIT's +0.62 as the defender gets his stack and shed back.

**Both:** the dither budget, and a fixed-seed staged pair for each fit outcome (inside vs outside, both sides). The rep
should be decided by placement, reach, timing and the bodies.

## Scope and attempts

One flag (PAIR_HANDS), two attempts, read on all three populations from the first run. The swim, snatch and spin stay
rolls whose outcomes write a fit. Rebuilding them as forces is the follow-on.

## Amendments (Integration, 2026-11-14) and the build plan

### 1. The hand-over agrees with the bench curve

A bent arm is not weak: the bench strength curve rises toward lockout, and its weakest point is mid-range, not the
bottom. So the press limit follows his strength through the whole arm. It is pressForce along an inside hand from the
bent base to lockout (flat: the curve's spread is not a sourced constant, and its mid-range dip is a refinement, not a
softening). It does not fall through the arm's range.

**The span.** The hand-over happens only over the last span, where the hands are pinned at the chest and the forearm,
not the arm, is the strut: from the bent base (arm x 0.3, elbows fully bent, the hands at his own chest) to the chests
meeting (the bodies' gap 0).

**The arm's length below the base.** Under PAIR_HANDS the length state may go below the bent base only when he is
beaten there: the load exceeds what his arm holds at that bend, i.e. his press. HAND_FIT's coached recoil stops at the
base. The arm gives when beaten, not because it is bent.

**The law across the span.** The hands carry what the torso does not. With the bodies touching, the hands' push limit
for that pair is his press less the torso contact's normal force on the same pair (the World's previous substep), never
below zero. Total normal force across the gap is therefore continuous through the hand-over, by construction: the press
limit until the chests carry it, then the chests.

**Witness:** a staged drive into a set blocker, the total normal force through the hand-over: no dip, no spike beyond
the closing impact.

### 2. Placement

- At each strike and each re-fit, the hand's landing point on the man is drawn once: a motor error in yards at the
  target, its spread falling with his hand technique, the same kind of draw as a throw's accuracy (sim.dice per strike).
- Inside or outside follows from geometry: the landing point against the man's frame (inside his shoulders, the chest
  plate) and against the other man's hands. A hand already inside blocks the line to the chest; a later hand lands
  outside it or must clear it.
- Reach (arm length against the gap) and timing (the strike's travel at ARM_SPEED from his felt picture) decide who
  arrives first, so a great technician can be beaten to the spot.
- **Witness:** the inside share by rating gap (the rating moves placement; the rep follows the bodies).

### 3. Remaining rating rolls (engine-64, seed 11 x 4, move resolutions per 100 dropbacks; move-rolls.mts)

| move | interior | edge | under PAIR_HANDS |
|---|---|---|---|
| bull | 217.1 | 101.0 | force (RUSH_BULL) |
| rip | 152.2 | 75.4 | force on the blocker's outside hand (RIP_CLEAR's law, edge and interior) |
| club | 134.0 | 64.7 | force on the blocker's hand (RUSH_HANDS' law) |
| longarm | 110.2 | 53.5 | the rusher's inside hand at lockout (RUSH_HANDS' joint) |
| swim | 146.5 | 80.1 | **remains a roll**; writes a fit |
| snatch | 45.3 | 17.1 | **remains a roll**; writes a fit |
| spin | 42.5 | 43.7 | **remains a roll**; writes a fit |
| speed / dip | 2.0 / 20.5 | 76.2 / 23.3 | **remains a roll** (the bend); writes a fit |

The remaining rolls total about 236 interior and 240 edge resolutions per 100 dropbacks. That sizes the follow-on.

### 4. Sequence inside attempt 1

1. Staged pairs, before any game read, each with a fixed seed and its mirror:
   - pass set: inside fit, outside fit, the strike beaten to the spot by reach;
   - drive block: the defender's stack against the blocker's fit;
   - stalk: a crosser at 3 and 4 yd/s;
   - the hand-over: total force continuous.
2. Dither budget.
3. Games: edge, interior, falls; the fresh run set by concept; the standing correlations.

Staged pairs that are wrong get fixed inside attempt 1. A failed game read spends the attempt.

### 5. Off and the subsumed flags

Off is bit-identical. Every subsumed flag keeps its code and stays readable as off; nothing is deleted in this PR.

### 6. Expectations before the read (PAIR_HANDS against CONTROL_HANDS + HAND_FIT 2, engine-64)

| witness | now | expected |
|---|---|---|
| interior pressure | 2-3% of dropbacks | up, to about 5-8% (rushers win placement; the long-arm and club act on a real fit) |
| edge win | 5% | up, to about 7-10% |
| separation at +0.4 s, wide / outside / head-up | 1.00 / 0.96 / 1.01 | closes 0.05-0.15 yd (bodies plus the base, and below when the rusher is inside) |
| sacks | 2.2% | up, to about 3-4% |
| OL proxy falls | 5.7 /100 | down slightly, to about 4-5 (the torso carries the load the arm was spiking on) |
| run set (all, against ref) | +0.62 | gives back most of it: +0.0 to +0.3; toss back toward 0 (the defender's stack and shed return) |
| stalk joint life | 0.05-0.10 s | 0.3-0.5 s; a crosser at 4 yd/s loses 1-2 yd/s |
| roll's correlation with the rep | -0.11 edge | about 0; mass and arm above 0.1 |

## Attempt 1: stopped at the staged step (2026-11-14, engine-64)

The fit was reshaped three times inside attempt 1:
1. magnitude (inside press, outside arm);
2. geometry (an outside hand acting at the near shoulder, with lever arms and yaw);
3. friction (an outside hand steers only by HAND_MU x its own press).

Also inside attempt 1:
- the rusher presses only on a power rush;
- the arm starts at the gap;
- the yield is continuous in load against capacity (85-100%);
- the bent-base centre distance is fit to the NFL's held separation (BASE_CENTRES 0.80 yd: held edge reps at +0.4 s
  0.89 / 0.76 / 0.82 by landing; KNOWN_PROBLEMS PHY-ROUND).

Off is bit-identical to develop (engine-64, f45b8a7e377c73b2), and the dither budget passes with it on. No game read
was run.

**The three coached asymmetries, staged (pair-staged.mts, side +/-1 identical):**

| asymmetry | blocker or defender outside | inside | shows it |
|---|---|---|---|
| an outside-handed blocker loses the crosser: stalk, crosser at 3 yd/s, his speed after 0.5 s | 3.00 yd/s (not slowed) | 1.94 yd/s | yes |
| the same, a rusher crossing upfield past him: rusher lateral | 1.44 yd | 1.04 yd | yes |
| a rusher with a hand on the blocker's outside shoulder gets the corner: power rusher, rusher lateral / blocker turned | 0.13 yd / 1 deg | 0.13 yd / 0 deg | **no** |
| an inside-handed run defender holds his gap, an outside one is moved: reach block, defender lateral | -0.00 yd | 0.01 yd | **no** |

**The blocker is yaw.**
- In the power-rusher rows the rusher's hand presses 2032 N at the blocker's near shoulder: the outside fit's row,
  0.12 yd off his centre (CHEST_HALF), a moment of about 240 N.yd. The blocker turns 1 deg in 0.6 s, the same as the
  inside fit (0 deg).
- In the reach rows both men turn about 25-29 deg alike: their facing follows their own requests.
- In every row the two men's facing changes are identical, because facing is the controller's request held by a yaw
  motor (turnBodyResponse, torque up to traction x base radius). No moment applied to a body turns it against his
  request.
- HANDS_LEVER found the same: a staged shoulder press turned the man 0.9 -> 7.1 deg against his motor.

"Turn the man" is half of line play and of tackling. It cannot exist while the yaw is the request's. Integration is
logging this with Tools.

**Reproducer for Tools.** `PAIR_HANDS=1 node --import tsx scripts/diag/effective-mass/pair-staged.mts`, the rows
"turn: a power rusher, his hand outside / inside on the blocker" (two equal bodies, the rusher at 2 yd/s with a 0.5
yd/s cross component, his hand at the blocker's near shoulder at 2032 N; the blocker requesting to face the rusher).
Expected under a physical yaw: the blocker turned toward the rusher's push side. Observed: 0-1 deg.

**What attempt 1 leaves.**
- The friction-limited outside steer is a real mechanism and shows the first asymmetry.
- The other two need the man's body to turn under a moment.
- PAIR_HANDS stays off. Its pieces (the defender's own hands, placement, control from fits, the hand-over, the fitted
  base) wait on a yaw that a moment can move.

**The hand-over, forced (Integration's request; pair-staged.mts).** These rows start the pair at or inside the base.

| row | separation at 0.2 / 0.4 / 0.6 s | closest | torso load | first-tick jump | his speed after |
|---|---|---|---|---|---|
| a 150 kg man driving a 90 kg one (run, both inside) | 0.97 / 1.30 / 1.57 | 0.73 | never | 3260 N | 2.75 yd/s |
| a 150 kg bull on a 90 kg pass-setter (both inside) | 0.96 / 1.28 / 1.58 | 0.77 | never | 3490 N | 2.85 yd/s |

The opening impact throws the lighter man back before any sustained chest-to-chest load forms. The torso contact never
carries load in staging, so the hand-over's continuity cannot be shown there. That is another reason the parked pieces
wait.

## Step 1, the request law: measured first (2026-11-14)

Before writing "square to his set" into the law, the NFL was asked what an engaged tackle faces. `engaged-yaw.py` now
also measures the set frame: his facing against "back to the QB" (the direction from the QB through him), how far the
rusher is off that line, and a joint least-squares fit of his facing change over 0.4 s windows on the QB-frame change and
the rusher-bearing change. NFL BDB (94,573 engaged tackle frames) against ours (engine-64 + ENGAGE_FELT, seed 11 x 8):

| | NFL | ours |
|---|---|---|
| his facing off "back to the QB", p50 / p90 | 32 / 90 deg | 22 / 65 deg |
| the rusher off that line, p50 / p90 | 32 / 92 deg | 20 / 67 deg |
| the rusher off his chest, p50 / p90 | 15 / 43 deg | 3 / 15 deg |
| facing change = a x QB-frame change + b x rusher-bearing change | a 0.27, b 0.61 | a 0.01, b 0.80 |
| his facing rate, p50 / p90 | 44 / 126 deg/s | 6 / 106 deg/s |

So **the NFL tackle does not keep his back to the QB**: he is as far off that line as the rusher is (32 deg), and his
facing moves mostly with the rusher (0.61) and partly with the set frame (0.27). A pure "square to the set" request would
put the rusher about 32 deg off his chest; the NFL has 15. The coached rule that fits is the one the handbook teaches for
the hands and eyes: **his nose on the man's inside number** (the near half of his chest toward the QB), from his felt
picture of the man. That is a point on the man, not the man's centre: it is offset from the bearing by about half a chest
width at the hands' distance (0.2-0.25 yd at 0.9-1.1 yd centre to centre, 10-15 deg) to the QB's side, and it moves with
the man and with the QB frame both.

**The law proposed for step 1 (not built):**
- Engaged pass set: facing = the bearing from him to the man's inside number (the felt man's centre, plus his chest
  half-width toward the protect point, perpendicular to the line between them). The inside-out relationship is what the
  number encodes; no constant blend of frames, no cap.
- The ride (already a decision with margins): facing on his path, as now.
- Run block: the bearing to the man's play-side number (the reach's open facing as now: REACH_RACE_OPEN off that).
  Run defender holding a gap: the bearing to the blocker's gap-side number (his outside arm free).
- What stays the World's: how fast he turns (the yaw motor's bounded torque), what turns him (where the load goes,
  step 3).

**The coaching each request comes from** (retrieved 2026-11-14; coaching blogs and clinic notes, not one authority,
and the aiming points vary by scheme):
- *Pass set: inside-out, half a man, punch the inside half.* The tackle beats the rusher to a spot that gives him a
  half-man relationship, playing inside-out; the spot is between the rusher and where the QB sets up, which makes the
  rusher choose inside or outside; the punch goes to the defender's inside half, staying as square as he can, and his
  inside hand into the rusher's chest keeps the inside leverage
  ([Coaches Insider, the elements of pass protection](https://coachesinsider.com/football/the-elements-of-pass-protection-article/);
  [USA Football, how offensive tackles keep edge rushers on their toes](https://blogs.usafootball.com/blog/6729/how-offensive-tackles-keep-edge-rushers-on-their-toes);
  [USA Football, the art of the strike](https://blogs.usafootball.com/blog/6283/the-art-of-the-strike-3-techniques-offensive-linemen-can-use-to-fend-off-pass-rushers);
  [Gridiron Strategies, five keys of drop-back protection](https://gridironstrategies.com/article/drop-back-pass-protection-centers-around-5-basic-keys)).
  "As square as he can" and "the inside half" are both in it: shoulders square to where he is going, nose and hands on
  the man's inside half. The NFL fit (0.61 on the rusher, 0.27 on the set frame) is that.
- *Run block: the play-side number, by scheme.* The reach targets the play-side number, the blocker staying square
  ([X&O Labs, reach technique](https://www.xandolabs.com/?p=10086)); for covered linemen in wide and mid zone most coaches
  teach the far (play-side) armpit, uncovered linemen the near number of the next play-side down lineman
  ([X&O Labs, zone aiming points survey](https://www.xandolabs.com/?p=11804);
  [X&O Labs, uncovered technique](https://www.xandolabs.com/?p=21795)). So the run blocker's point is the side his
  engaged goal already names (the seal target's side, `e.sealTarget`), not a new choice.
- *Run defender holding a gap: hands on the blocker, leverage in the gap.* Stab and grab: the inside hand to the
  blocker's chest, the outside hand to his outside shoulder pad, a body on a body with the leverage kept in the gap; an
  edge keeps his outside shoulder free
  ([USA Football, defeating one-on-one blocks](https://blogs.usafootball.com/blog/583/defensive-line-techniques-for-defeating-one-on-one-blocks);
  [Hoops King, gap responsibility](https://hoopsking.com/blogs/default-blog/youth-football-gap-responsibility-stop-the-run)).
  His point is the blocker's gap-side half (his fit's side), his outside arm the free one.

**What "toward the QB" means without the true quarterback.** The inside number is the man's half toward the place the
blocker protects: the launch point of the called protection on the ball's line (`protectPoint`, the called drop he
knows from the huddle; already REP_SEEN's `qbB`), never `sim.qb.pos`. A scramble or a moved launch changes it only
through what he can know: the call, or the quarterback as he last saw him when he turned to look. The rep's frame
(`axisOf`, the true QB's line from the rusher, kept true in ENGAGE_FELT for this reason) moves with this law: for the
blocker's reads it becomes the felt rusher's line to the protect point; the rusher's own frame stays his picture of the
QB (`qbD`). The outcome tests that use `e.phi` stay on the World's bodies.

**How step 1 is judged** (engaged-yaw.py, the same operator on both): the rusher-off-chest angle should rise from 3 deg
toward the 10-15 deg the number gives, with no motor change. If the offset alone accounts for the NFL's 15 deg and the
joint fit moves toward the NFL's (a up from 0.01, b down from 0.80), the request was the missing piece; what is left
between the facing rates (6 against 44 deg/s p50, partly the NFL sensor's noise) and the slope's spread is the contact
turning him (steps 2-3). If the off-chest angle overshoots far past 15, the motor is losing nothing it should.

## Tools' yaw trace (2026-11-14), and item 6 resolved: the 2,032 / 0 N chatter is PAIR_HANDS's beaten yield

Tools' trace (PR #745, `pair-yaw-trace.mts`) on the staged power-rusher rows: the rusher's shoulder joint carries load only
in tick 1; the blocker's inside joint carries the whole press with a 0.00-0.02 yd arm (squared men: the chest segments'
closest points lie on the line of centres), so the moment is never applied and the motor never fights (peak 150 of a
1,696 budget). The 0.27 lever lengthened the arm of a joint carrying nothing. Grip is not shared (the motor's budget reads
1,696 while the hands carry 2,032).

Item 6, the blocker's joint at 2,032 N on even ticks and 0 on odd ones (`hands-chatter.mts`, the same staging):

| arm | last 6 ticks, blocker's joint N |
|---|---|
| PAIR_HANDS, hands law each tick | 0 / 2,032 alternating, extension 0.82 / 0.97 yd |
| PAIR_HANDS, hands law not called after the first tick | 906-944, steady |
| HAND_FIT + CONTROL_HANDS (no PAIR_HANDS) | settles to about 1,570-1,610 within 4 ticks |
| CONTROL_HANDS alone; default | uneven while the strike drives the man out, no period-2 cycle |

So it is the hands law, and only under PAIR_HANDS: `punch`'s beaten yield. The joint is rigid up to its push limit, so the
force it reports is 0 (slack) or the limit. The yield reads last tick's force: at the limit, beat = 1 and the arm folds a
full ARM_SPEED step (0.15 yd), the joint goes slack; at 0, beat = 0 and the arm extends a full step back to the man. That is
a bang-bang loop with a one-tick delay. The joint's own push limit already is the yield (an arm that cannot hold gives at
the limit, and the bodies close as far as the man pushes): the fold counts it twice. **Every PAIR_HANDS press number so far
is double the mean (about 1,016 N)**; the attempt-1 staged rows and PAIR_HANDS' 0.46 restitution should be read with that
in mind. Other arms' press numbers stand.

Repair for attempt 2 (not built): the beaten arm gives only as far as the man has pushed it (its length follows the
achieved gap from above, never shorter than it), so the joint stays at its limit and the bodies close at the rate the excess
drives them, continuous in the load. The yaw design uses the same reading: the turn comes from where the load goes (the
shoulder joint carrying it, or bodies off the line of centres), the load-sharing between the two joints on one gap, and
grip shared with the motor second.
