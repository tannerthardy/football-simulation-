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

## Step 1, corrected after Tools' review (2026-11-14): hips on the set, shoulders on the felt man

**The inside-number aim below is withdrawn.** Tools' review of the measurement:
- NFL `o` is the shoulder pads; ours is the hips. They are the same body part only with no trunk.
- The NFL's 15 deg off-chest is mostly a sensor bias, not technique. Stationary pre-snap linemen read 11.9 deg off
  square (p50), nearly still engaged pairs 18.7 deg, frame jitter p50 0.0 / p90 1.8 deg.
- The test a bias cannot fake is the signed angle. Tackle chests point a median 5.8-6.6 deg to the OUTSIDE of the
  rusher's centre, the same sign with the QB on either side (n about 31,000 and 33,000). That is the opposite of the
  +10-15 deg an inside-number aim predicts: a chest that follows the rusher late.
- In the World a 12 deg offset moves a chest-segment end 0.025 yd. But it makes the two segments non-parallel, so the
  closest points leave the line of centres and the press gets a 40-100 N·yd lever against the motor's 1,696. Any
  facing-rate change has to be checked with pair-yaw-trace before it is read as the request's doing.

Integration's ruling: the coaching (work the inside half) is real, but it is about **position**: half a man inside,
between the rusher and the protect point. That is what the set and the mirror already do. It is not an angular offset of
his nose.

**The law (not built):**
- Hips (`facing`), the set and ride requests:
  - engaged pass set: square to the line he protects, from his inside-out position, i.e. the direction from the protect
    point (the called launch point on the ball's line) through him;
  - the ride: on his path, as now.
- Shoulders (`look`, TRUNK_TWIST): on the man as he has him (ENGAGE_FELT's picture), within the trunk's ±55 deg.
- Run blocker: hips on his track (the drive or surface axis, REACH_RACE's open hips as now), shoulders on the felt man.
- Gap-holding run defender: hips square to the line of scrimmage, shoulders on the felt blocker.
- Readers that compare his front with the line to the man use the shoulders: `e.phi`, `axisOf` (the blocker's frame from
  the protect point), the run block's `off` / `behind`, `beta` in the hand site, `chestOff`.

The set-frame term and the rusher term then come from two body segments, each with its own bound: the hips at the yaw
motor's capped torque, the shoulders at TRUNK_RATE within the range. There is no blend constant. The lag is the body's
and the picture's: the trunk turns at 360 deg/s, so most of the shoulders' trail behind a moving rusher is the felt
delay. At 0.06 s, a rusher crossing at 3 yd/s at 1 yd sits about 10 deg ahead of the felt bearing.

**How step 1 is judged** (engaged-yaw.py, the shoulders on both sides, both smoothed over the same 0.4 s):
- the joint fit moves from 0.01 / 0.80 toward the NFL's 0.27 / 0.61 (QB frame / rusher bearing);
- the signed off-chest angle moves toward about -6 deg (trailing the rusher's motion) from ours, with the unsigned 15 deg
  dropped as a target;
- pair-yaw-trace on the staged rows separates the request's effect from the contact lever the offset creates.

**If TRUNK_TWIST does not land on engine-65, the one-angle version:** facing (hips, the only angle) on the felt man, as
ENGAGE_FELT already gives. Its lag is the felt delay plus the yaw motor's bound. It cannot produce a set-frame term (a
0.27 needs a second segment), so it would show whether the trailing sign and size come from the picture alone.

## Step 1, the request law: measured first (2026-11-14)

*(Superseded by the correction above: kept for the record.)*

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

## Step 1, attempt 1: ENGAGE_TRUNK read (2026-11-14)

Built on claude/trunk-stage1 (3bd1b543) merged into this branch, with ENGAGE_FELT. Off is bit-identical (seed 999,
f45b8a7e377c73b2). Seeds 11 / 23 x 8, the control is TRUNK_TWIST + ENGAGE_FELT; EXPORT_SHOULDERS=1, so `o` is the
shoulders on both sides of every NFL comparison. The signed angle is Tools' definition (route-speed-diag f6521776),
ported line for line (`signed-off.py`): on the NFL plays it reads -4.6 / -7.6 against Tools' -5.8 / -6.6 on the raw weeks
1-2.

| | NFL | control | ENGAGE_TRUNK |
|---|---|---|---|
| signed off-chest p50, the two QB sides (+ = chest on the QB side of the man) | -5.8 / -6.6 | -1.4 / -1.9, -1.6 / -2.3 | -2.4 / -3.0, -2.6 / -3.4 |
| joint fit: facing change = a x QB frame + b x rusher bearing | 0.27 / 0.61 | 0.02 / 0.82, 0.00 / 0.81 | 0.08 / 0.52, 0.06 / 0.60 |
| frames with the chest more than 30 deg outside the man | 20% | 16% | 23% |
| of those, with the man inside (ball side) and in front | 40% | 20% | 48% |
| of those, with the man outside and in front | 11% | 16% | 19% |
| edge win / pressured | 13% / | 9, 8% / 29.3, 28.2% | 9, 9% / 28.1, 28.0% |
| OL proxy falls /100 | | 5.7 / 4.9 | 6.4 / 5.2 |

- The trailing sign and the rusher term move to the NFL's. The rusher term reaches it: 0.52-0.60 against 0.61.
- The set-frame term barely moves: 0.06-0.08 against 0.27. That is the half that missed.
- The trailing tail is the NFL's own pattern (worst against a man gone inside), a little heavier against a man outside.
- The shoulders still sit on the felt man (unsigned off-chest p50 3 deg): the trunk turns at 360 deg/s within 55 deg, so
  between them the felt delay and the hips do almost all the trailing.

**Dither:** passes with the flag. Block / engagement reversals fall 479 -> 395; carrier / spacing is 0.135/s. The control
arm (TRUNK_TWIST + ENGAGE_FELT without it) fails carrier / spacing at 0.196/s against 0.174.

**Run set** (1295 plays, paired against the reference):

| arm | all | OZ | IZ |
|---|---|---|---|
| control | +0.10 (SE 0.10) | +0.22 | +0.01 |
| ENGAGE_TRUNK, run hips on the drive axis (as first built: a bug) | -0.13 (SE 0.12) | -0.36 | -0.14 |
| ENGAGE_TRUNK, run hips on his feet's path | -0.12 (SE 0.11) | -0.25 | -0.51 |
| the run blocker's half only | -0.07 (SE 0.11) | -0.17 | -0.32 |
| the run defender's half only | +0.03 (SE 0.12) | -0.09 | +0.56 |

The first build put a run blocker's hips on his drive axis, so an outside-zone blocker shuffled sideways at shuffle speed.
That was a bug against the stated law (hips on his track) and is fixed: the hips go where his feet are asked to go.
After it the total is still about 0.2 below the control. Neither half carries it: each costs 0.07-0.17, and the concept
rows swing in opposite directions between the halves (IZ -0.32 against +0.56). That is within the noise of two
unpaired arms (about 0.15). Not diagnosed further yet.

**Not yet measured:**
- The contact lever the new hips create. Tools' pair-yaw-trace scripts both bodies' facing, so it does not exercise the
  request; the in-game yaw impulse needs Tools' World instrumentation (yaw-trace-world.patch).
- The chest segments. On claude/trunk-stage1 itself the World's chest segments read `facing` (the hips): `chestPoints`,
  the segment lines at world.ts 541 and 729. `shouldersOf` there is only in the report fields (`chestI` / `chestJ`). The
  merge dropped nothing: per file, the same count of `shouldersOf` reads as 3bd1b543.

## The chest on the shoulders (CHEST_SHOULDERS), and the contact lever measured (2026-11-14)

Tools' follow-up (Integration): the NFL's loaded shoulders track the man with 0.1 s of lag or less, and sit the same
against the set line engaged or not, so the trunk is not slow or locked under load. The signed angle sits inside the
12 deg orientation floor and is no target. The set-frame term (0.07 against 0.27) would need a shoulder-to-hip spring
with no sourced stiffness. Ruling: no attempt 2 on it; ENGAGE_TRUNK attempt 1 stands as built, pending the second run set.

**CHEST_SHOULDERS** (off; needs TRUNK_TWIST): the World's chest segment lies across the shoulders, not the hips. That
covers `chestPoints`, `chestArms`, `shoulderArms`, `capsuleGeom`, through one `chestHalf`. Its law test
(test/chest-shoulders.test.ts):
- a twisted body's segment rotates by the twist;
- an untwisted body is unchanged to the digit;
- off, the segment follows the hips whatever the trunk;
- it refuses to run without TRUNK_TWIST.
Off is bit-identical (f45b8a7e377c73b2).

**In games, contact yaw on engaged pass-set tackles** (Tools' World trace, applied in a local worktree only; seed 11 x 2):

| arm | hands rows levered | contact spin into him p50 / p90 (trace units) | motor lag p50 / p90 |
|---|---|---|---|
| reference stack + TRUNK_TWIST + ENGAGE_FELT | 0% | 0 / 0 | 0.6 / 11.1 deg |
| + ENGAGE_TRUNK | 0% | 0 / 0 | 2.4 / 23.7 deg |
| + HANDS_LEVER | 100% | 1.1 / 2.4 | 2.8 / 9.0 deg |
| + HANDS_LEVER + ENGAGE_TRUNK | 100% | 2.0 / 3.6 | 6.5 / 43.0 deg |
| + HANDS_LEVER + ENGAGE_TRUNK + CHEST_SHOULDERS | 100% | 1.8 / 3.3 | 4.7 / 38.4 deg |

- **In the reference engine, contact never turns an engaged tackle.** No hands row is levered without HANDS_LEVER, so
  "turn the man" has no lever at all there, whatever the request or the chest geometry.
- With the lever, the hips-on-the-set request nearly doubles the spin contact puts into him, as Tools predicted.
- Putting the chest on the shoulders lowers it a little: shoulders on the man make the segments more parallel. That is
  coherent, since a chest square to the press has no lever.

**Staged asymmetries** (pair-staged.mts, PAIR_HANDS + HANDS_LEVER; STAGE_TRUNK=1 asks as ENGAGE_TRUNK does):

| row | no trunk | hips on the set, shoulders on the man | the same + CHEST_SHOULDERS |
|---|---|---|---|
| a crosser past the blocker: his speed after, blocker outside / inside | 2.94 / 1.62 | 2.81 / 1.86 | 2.93 / 2.09 |
| a power rusher's hand outside: the blocker's hips turned | 1 deg | 0 deg | 1 deg |
| a reach on a run defender, his stack inside / outside: the defender's lateral | 0.01 / -0.00 yd | 0.03 / -0.01 | 0.01 / -0.01 |

- The shoulders now follow the man while the hips hold (55 against 0 deg on the crossing row).
- **The rusher's hand on the outside shoulder still does not turn the blocker** (1 deg). Tools' earlier trace says why:
  the press goes through the blocker's own joint at 2,032 N with an arm of 0.00-0.02 yd, while the rusher's shoulder
  joint, the one with the lever, carries nothing after tick 1. With PAIR_HANDS' 2,032 / 0 chatter on top
  (item 6, the beaten yield), the load path between the two joints is the missing piece, not the chest geometry.
- So PAIR_HANDS' second attempt is where this goes next:
  - the beaten arm gives only as far as the man pushed it, so it does not chatter;
  - the rusher's hand on the shoulder carries his press;
  - with CHEST_SHOULDERS and HANDS_LEVER, its lever then reaches the blocker's yaw.

## PAIR_HANDS attempt 2, first build: stopped at the staged step on the load rule itself (2026-11-14)

**The gates were written down before building:**
- the power rusher's outside hand turns the blocker's hips (today 0-1 deg);
- the outside-handed blocker loses the crosser (2.9 against 2.1 yd/s already) and the edge;
- the inside-handed run defender holds his gap while the outside-handed one is moved (today about 0 in every arm);
- the press is steady, with no period-2 cycle.

**The load rule as built:** each man's hands are his own strut, pressing the other body with the force he chooses (at
most his press) at his own contact point while the gap is inside his lockout. Both joints ask for the current gap plus
an arm-speed step, at most lockout, so each row saturates at its owner's press. Neither is the one rigid joint carrying
the pair's load. The beaten fold is gone. Under PAIR_HANDS the blocker's joint keeps him as its actor, and the World no
longer takes the torso's previous-step normal off the push limit. Off is bit-identical (f45b8a7e377c73b2).

**Staged** (hands-chatter.mts, a 144 kg bull on a 144 kg pass setter; PAIR_HANDS + HANDS_LEVER + TRUNK_TWIST +
CHEST_SHOULDERS):
- No period-2 cycle. The blocker's joint goes 2,032 -> 1,751 -> 550 -> 454 -> 391 N, steady.
- **But both struts push the bodies apart.** The rusher's own joint carries 1,294 -> 1,114 -> 394 N at the same time, so
  the two presses add, about 3,300 N apart at contact. The pair is driven out to lockout (1.56 yd centre to centre) in
  0.3 s, rel. velocity +2 yd/s apart, the same with the rusher's hand inside or outside. The NFL's centre to centre at
  +0.4 s is 0.76-0.89.

**Why the rule is wrong, not just mistuned.** A man's arms carry what his legs drive. A bull who pressed with his arms
beyond his legs' drive would push himself backward. The press is not a force he chooses independently of his base; the
arm is a strut that transmits his leg drive up to its strength. That is the rigid-up-to-limit joint attempt 1 already
had. The real defect of attempt 1 is that two rigid struts on one gap are **statically indeterminate**: they share the
load only through their compliance, and with none the longer one carries everything (the 2,032 on one joint, the other
slack). Making both carry load needs either:
- an arm stiffness per strut (a spring: the load splits by stiffness), or
- one combined pair row whose force is the pair's, with its point of application split between the two contact points
  by a rule.
Neither has a sourced constant or rule in hand. It is a physics decision, like the trunk under load, and not something
to invent inside the last attempt.

**State:** the build stays on the branch behind PAIR_HANDS (off), recorded as attempt 2's first build, failing condition 2
(conservation and sharing) at the staged step. No game read was taken; the decision on the strut model comes first.

## PAIR_HANDS attempt 2, the arm as a spring (Integration's ruling (a)): staged gates, and the stop (2026-11-14)

**The model:** each arm is a spring about the length its owner holds, its force capped at his strength. The World gives
each PAIR_HANDS hands row its own softness: stiffness k = strength / ARM_GIVE, frequency sqrt(k / its effective mass),
the hands' damping ratio. ARM_GIVE = 3 in: elbow flexion under a full press, a stated choice with that meaning, the same
for every body, not fitted. The World's hands rows were already soft (5 Hz for all: about 1 in of give at 2,000 N for
a 72 kg pair). Attempt 1's 2,032 / 0 was the rusher's length (0.80) leaving his joint slack on a wider gap, not rigidity.

The lengths:
- the bull's bent arms and the blocker's (pass set and run): the bent base, BASE_CENTRES 0.80;
- a long-arm and a run defender's stack: lockout.
No strike and no fold. Off is bit-identical (f45b8a7e377c73b2).

**Lengths tried on the way, each failing the staged bull:**
- the blocker on the punch's strike and recoil: the strike re-fired each time his hands unloaded, extension 0.95 / 0.80
  and force 2,032 / 0-400 N, period 2;
- the pass setter at lockout: his spring sat 0.6 yd compressed at its 2,032 N cap and threw a same-size bull to 1.5 yd.

**Staged** (PAIR_HANDS + HANDS_LEVER + TRUNK_TWIST + CHEST_SHOULDERS; pair-staged STAGE_TRUNK=1):

| gate (numbers written before) | before | attempt 2 | |
|---|---|---|---|
| steady press, both arms carry, the sum the drive | 2,032 / 0 chatter | 720 / 446 N steady (their strength ratio at equal deflection), 0.77 yd centre to centre (NFL 0.76-0.89) | passes |
| the power rusher's outside hand turns the blocker's hips | 0-1 deg | 0 deg (shoulders 1) | **fails** |
| the outside-handed blocker loses the crosser: speed after, outside / inside | 2.9 / 2.1 | 2.92 / 2.35; stalk at 3 yd/s 3.00 / 2.29 | passes (the edge itself not staged) |
| the inside-handed run defender holds, the outside-handed one is moved: his lateral | about 0 | 0.08 / 0.06 yd; the reach never connects (joint life 0 s, separation 1.7 yd) | **fails** |

**Why each failure is physics, not a constant:**
- **Gate 1.** The rusher's arm carries about 450 N at the blocker's shoulder, on a lever of at most CHEST_HALF (0.12 yd):
  about 54 N·yd. The set man's yaw motor holds 190-360 N·yd (OT, standing to 80% of traction in use). A steady press
  cannot turn a man whose feet resist it, here or on a field. Turning a set man takes a strike (a club, a rip's force
  across the forearm: impulses, RIP_CLEAR's piece) or his own feet losing the race, not the press of a held arm. The gate
  asked the steady press for what only a move can do.
- **Gate 3.** A lockout length on a spring is an independent press again. The run defender's stack sits about 0.8 yd
  compressed at its cap, pushes the blocker off his reach before the blocker's hands (bent base, 0.80) ever touch, and
  the reach's steer has nothing to act through. Any lockout target reproduces the first build's failure (two presses
  adding, the pair driven apart). A stack is the defender extending his arms against a blocker who drives into him; with
  a blocker who steps laterally, the lockout spring is a shove into air.

**Stop.** That is the second attempt. Re-diagnosis, for whoever takes the pair model next:
1. The arm-as-spring with a bent working length is right for the press: steady, shared, conserving, the NFL's held
   separation with no constant fitted to it.
2. Lockout is not a spring length. It is an extension, a motion of the arm at arm speed, that ends when the arm is
   straight. It belongs with the strikes (a punch, a long-arm's lockout, a stack's extension) as an impulse or a bounded
   extension rate, not as the spring's rest length.
3. Turning a man is the moves' and the feet's (strikes across the body, the race), not the steady press's. The yaw
   question's next step is the strike impulses' lever (club, rip, swim at the shoulder) against the motor, measured in
   games with Tools' trace, not another hands law.
4. HANDS_LEVER's IZ +0.73 is not answered by this attempt (no game read was taken: the staged gates failed first).

## The press as a shared spring: design note before its flag (2026-11-14; Integration's ruling 1)

**What it keeps from PAIR_HANDS attempt 2:**
- both men's arms are springs about a bent working length (BASE_CENTRES, the NFL's held 0.76-0.89 yd);
- each has the stated give (ARM_GIVE, 3 in; stiffness = strength / give, as the row's own softness) and is capped at its
  owner's strength (press inside, arm outside);
- fits from placement (placeHand: a motor error on the landing point, inside or outside);
- the friction-limited outside steer: min(arm x 0.7, HAND_MU x the hand's normal force). This is the one asymmetry that
  has passed every staging: the outside-handed blocker loses the crosser, and the stalk crosser slows 3.00 -> 2.29.

**What it drops:**
- no lockout rest length;
- no claim that a held press turns a set man (withdrawn);
- no fold, no strike re-fire, no torso subtraction.

**1. What holds a run defender's gap.** HAND_FIT deleted his stack: the joint was the blocker's with the sign flipped,
and the punch's length law shortened it under load, so a run defender had no arms of his own. Here his arms are his own
spring at his bent length, capped at his press, at his fit (an inside hand on the chest plate, an outside hand at the
shoulder with its lever). What holds his gap is that press plus his feet:
- his feet keep him in the gap (his run-fit request, unchanged);
- his arms keep the blocker at the bent distance, so the blocker's drive arrives through both springs, shared by
  deflection;
- whether he is moved is the blocker's drive and steer against his feet's traction and his press.
- An inside-handed defender has the frame, so the blocker's steer on him is friction-limited at the shoulder (the outside
  rule, applied to the blocker's outside hand). An outside-handed defender is steered with the blocker's full arm. That
  is the staged asymmetry to show (inside-handed holds, outside-handed is moved). The test is the reach and the drive
  rows of pair-staged, with the blocker driving into him, not stepping away.
- He sheds by the existing shed logic (his feet and hands across the blocker's shoulder), not by an arm shove.

**2. What a long-arm and a stack extension are: a bounded extension.** The arm's working length moves from bent toward
lockout at ARM_SPEED, as a motion, and ends straight. While extending and once straight, the arm is the same spring
about its current length. So it pushes only as far as something compresses it, and gives back when the load exceeds
his cap (the spring at its ceiling yields). That is "holds at that length only while he can afford the load", with no
second rule. It is chosen over an impulse because:
- An impulse is instantaneous: it has no duration for the opponent to see or answer, and it needs a size with no source.
- The extension has the arm's real time cost (lockout minus bent over ARM_SPEED, about 0.25 s for a 34 in arm), which the
  other man can feel and counter (the long-arm counter already reads it). It reuses ARM_SPEED, already sourced, and adds
  no constant.
- It is a decision with a window: a long-arm move, a stack-and-shed's shed. It is not a rest length from contact on, so
  it cannot reproduce the "lockout spring from contact" failure. Outside a window the length returns to bent at ARM_SPEED.

**The flag and its gates.** One flag (PRESS_SPRING), needing HANDS_LEVER, TRUNK_TWIST and CHEST_SHOULDERS for the
shoulder lever. Two attempts, staged first, with the gates written down before:
- the staged bull holds steady and shared at the bent distance (720 / 446 N, 0.77 yd today);
- the crosser asymmetry kept (2.92 / 2.35);
- the inside-handed run defender holds against a driving blocker while the outside-handed one is moved (about 0 today);
- a long-arm extends at arm speed and drives a blocker who does not answer it.
Its first game read includes the run set by concept.

## Turning as a strike question: measured (2026-11-14; Integration's ruling 2)

`strike-moments.mts`, seed 11 x 4, engine-65 reference stack (ENGAGE_TRUNK off), every strike on an engaged pass-set
blocker before the throw. World strikes act at the line of centres (`pairImpulse` with x, y only), so **no move puts any
moment on the blocker today, by construction**. The question is whether giving them a lever would matter. The
counterfactual moment is the strike's impulse across the line times CHEST_HALF (0.12 yd), at his shoulder, against his
yaw motor's budget over the same tick (traction x base radius x dt; and at 80% of traction in use).

| move | n | impulse across the line p50 / p90 (kg yd/s) | moment / one-tick budget p50 / p90 (standing; at 80% in use) | over budget |
|---|---|---|---|---|
| club | 457 | 5 / 31 | 0.04 / 0.21; 0.06 / 0.35 | 0% |
| swim | 456 | 7 / 24 | 0.05 / 0.17; 0.08 / 0.29 | 0% |
| rip | 452 | 5 / 17 | 0.03 / 0.12; 0.05 / 0.20 | 0% |
| long-arm | 319 | 6 / 24 | 0.04 / 0.17; 0.07 / 0.28 | 0% |
| snatch | 213 | 6 / 21 | 0.04 / 0.15; 0.07 / 0.25 | 0% |
| spin | 171 | 10 / 33 | 0.07 / 0.23; 0.11 / 0.38 | 0% |
| dip | 79 | 27 / 39 | 0.20 / 0.28; 0.34 / 0.46 | 0% |

**The feet's race:** on ticks where the rusher holds a half-man (|phi| 0.4-0.7) and moves faster than 2 yd/s (n 3,179):
- the blocker's hips turn p50 / p90 30 / 133 deg/s, against the bearing to the rusher at 16 / 112;
- the bearing outruns his hips on 27% of ticks;
- he is never at his turn-rate cap (0%).

**Read:**
- A lever on the moves would not turn a set man: even at the shoulder, every move's moment stays under half his motor's
  one-tick budget, at 80% of traction in use.
- His feet never lose the race: his hips keep up with the rusher's bearing and never reach their cap.
- So in this engine nothing can take a set blocker's facing from him: not the press (54 N·yd against 190-360), not a
  strike, not the race.
- If being turned is real football, the missing piece is not a lever. It is either:
  - the turn-rate cap and the yaw motor's budget being too generous for a man whose traction is spent on holding ground
    (grip shared between holding ground and holding facing: the yaw note's second item, still unbuilt); or
  - the facing request itself (ENGAGE_TRUNK's hips on the set make the race real, where the default's "face the man" never
    races).
- Next, if asked: the same race on ENGAGE_TRUNK, and the motor's budget with the shared grip.

## PRESS_SPRING attempt 1: gates written before the read (2026-11-14)

The reference engine today (pair-staged.mts STAGE_TRUNK=1, side 1, equal 144 kg bodies unless stated). PRESS_SPRING is
read with HANDS_LEVER, TRUNK_TWIST and CHEST_SHOULDERS:

| gate | reference today | to pass |
|---|---|---|
| G1 the bull (pass set, blocker inside, rusher outside) | one joint 1,668 N, the pair pushed out to 1.13 yd by 0.6 s | no period-2 cycle; both arms carry load; 0.76-0.89 yd centre to centre at 0.6 s (the NFL's held separation) |
| G2 the crosser upfield, blocker outside / inside | his speed after 2.14 / 2.14 (no asymmetry) | the outside-handed blocker's crosser at least 0.3 yd/s faster |
| G3 a blocker driving into a run defender holding his gap, his hands inside / outside | moved back 0.15 / 0.15 yd | the inside-handed man moved at least 0.1 yd less |
| G4 a long-arm on a blocker who does not answer it | separation 0.89 -> 1.24 yd (0.2 / 0.6 s) | the extension reaches lockout at arm speed (0.25-0.35 s) and the separation grows at least 0.3 yd |
| G5 the stalk: a crosser at 3 yd/s past a standing blocker | joint life 0.05 s | at least 0.5 s (Tools' screens-only NFL: engaged 0.8 s median, 74% held 0.5 s or more) |

### PRESS_SPRING attempt 1: staged read

Both sides of the field give the same rows (mirror checked). Off is bit-identical to develop (seed 999, 7225da15f3023012).

| gate | reference | PRESS_SPRING | |
|---|---|---|---|
| G1 the bull | one joint 1,668 N, 1.13 yd at 0.6 s | 741 -> 1,177 N total across both arms, steady, 0.75 / 0.77 yd at 0.2 / 0.6 s | passes |
| G2 the crosser, blocker outside / inside: his speed after | 2.14 / 2.14 | 2.92 / 2.35 | passes |
| G3 a reach driving across a run defender, his hands inside / outside: his lateral, his turn | 0.03 / 0.03 yd, 0 / 0 deg | 0.01 / 0.14 yd, 2 / 14 deg | passes (see below) |
| G4 a long-arm on a blocker who does not answer it | 0.89 -> 1.24 yd | 0.95 -> 1.52 yd (0.2 / 0.6 s): the extension at arm speed drives him off | passes |
| G5 the stalk, a crosser at 3 yd/s | joint life 0.05 s | 0.00 s: the blocker's hands never reach him | **fails** |

Notes on the read:
- **G3 as first written** (a straight drive into a run defender) gives 0.23 / 0.23 yd moved back in both arms. That is
  right: a straight drive is the blocker's legs against the defender's feet, and his hand placement does not change his
  traction. The coached difference is control: who can steer whom across. The reach row shows it once the design note's
  rule is built: an inside-handed defender has the frame, so the blocker steers him only with the friction his press
  gives him at the shoulder. That rule was in the note but missing from the first build; it is now in, still attempt 1.
- **G4** needed the staged long-arm row to open its move window (`moveUntil`), as resolveMove does in games. The
  staging now opens it for that row only; a "speed" move with an open window took the crosser rows' steer away.
- **G5 fails because of the design, not a constant.** Under PRESS_SPRING the blocker holds his bent length (0.80 centre
  to centre) whatever the man does. A crosser passing at 1.04 yd is beyond his bent hands, so the blocker never touches
  him. The note gives the defender a bounded extension (long-arm, shed) but gives the blocker none: no reach for a man
  not yet on his hands. HAND_FIT had it (unloaded, the hands follow the man out), together with the recoil that
  chattered.

**Attempt 1 fails G5. Attempt 2, proposed:** the blocker's reach is the same bounded extension. While his hands carry
nothing and the man he has (felt or seen) is beyond his bent length but inside his lockout, his length moves toward the
man at ARM_SPEED. Once his hands carry load it returns to bent at ARM_SPEED. Its enter and exit are on the load, with
the exit (UNLOADED of his press) above the enter (no load), so it cannot flip on a single tick. It is still a spring
about its current length, so a reach that lands presses only as the man compresses it. Gates as above, G5 against
Tools' screens-only NFL (engaged 0.8 s median, 74% held 0.5 s or more).

### PRESS_SPRING attempt 1, the reach and the staged gates re-read (still attempt 1: no game read yet)

**The blocker's reach** (added; Integration: a blocker with no reach for a man not yet on his hands is a hole in the build):
- It is the defender's bounded extension, for the blocker. While his hands carry nothing and the man as he has him
  (touch at the hands' delay if loaded, else sight at his sight delay; never the true position) is beyond his bent
  length and inside lockout, his length moves toward the man at ARM_SPEED. It returns to bent at ARM_SPEED once his hands
  carry load.
- It turns on at no load and off at UNLOADED x his press: the exit is above the entry.
- It punches into the man (the reach's target is the man plus PRESS_INTO, the punch's depth). A reach that only touched
  carried nothing: the staged stalk read 0 N and the crosser was not slowed.

**Two staging corrections** (not engine changes):
- The staged pairs step the World directly and never recorded perception, so every man's picture of the other was the
  fixture's first placement, frozen. They now record each tick, as PlaySim.tick does. This moved the reference rows too:
  the bull 1.13 -> 0.92 yd at 0.6 s, the crosser 2.14 -> 1.95, the long-arm 1.24 -> 0.92. The "reference today" column
  written before the read came from the frozen picture; the pass thresholds were absolute and are judged as written.
- The stalk gate as written ("a crosser at 3 yd/s past a standing blocker") fails under PRESS_SPRING too. The reach
  lands (joint life 0.50 / 0.45 s, 303 N), but a standing blocker's arm steer (about 0.7 of his arm force) is less than
  the crosser's leg drive, and the crosser is not slowed (2.31 / 3.01 against 2.29 / 3.00). A stalk is played with the
  feet: the blocker shuffles to stay in front, and the NFL's 0.8 s held includes his feet. The stalk row as played (the
  blocker shuffling at 80% of the crosser's lateral speed) is the gate.

**G3's proper statement:** hand placement decides control on a reach (who can steer whom across), not who wins a
straight drive. A straight drive is the blocker's legs against the defender's feet, and the defender's hand placement
does not change his traction (0.23 / 0.23 yd moved back with either hands).

| gate | reference (perception recorded) | PRESS_SPRING | |
|---|---|---|---|
| G1 the bull | 1,668 / 1,287 N on one joint, 0.92 yd at 0.6 s | both arms, 741 -> 1,177 N steady, 0.75 / 0.77 yd | passes |
| G2 the crosser, blocker outside / inside: his speed after | 1.95 / 1.95 | 2.93 / 2.14 | passes |
| G3 a reach across a run defender, his hands inside / outside: his lateral | 0.03 / 0.03 yd | 0.00 / 0.13 yd | passes |
| G4 a long-arm on a blocker who does not answer it | 0.89 -> 0.92 yd | 0.95 -> 1.53 yd | passes |
| G5 the stalk as played, 3 yd/s, blocker inside / outside: joint life, crosser's speed after | 0.05 s, 2.99 | 0.75 / 0.70 s, 2.53 / 2.92 | passes (NFL screens-only 0.8 s median, 74% held 0.5 s+) |
| G5 at 4 yd/s, inside / outside | 0.05 s, 3.76 | 0.80 / 0.45 s, 3.44 / 3.73 | the outside-handed blocker short of 0.5 s at 4 yd/s |
| the reach's cost: a crosser who stems at the reach and cuts back at 0.25 s, blocker inside / outside: his lateral, joint life | 1.42 / 1.42 yd, 0.15 s | 0.94 / 1.62 yd, 0.80 / 0.60 s | the outside-handed reaching blocker gives up 0.2 yd more than the reference: his extended hands are late back |

### PRESS_SPRING attempt 1: the first game read (engine-65)

Seeds 11 / 23 x 8, the reference stack against PRESS_SPRING + HANDS_LEVER + CHEST_SHOULDERS. Unpaired games; the run set
is paired.

| | reference | PRESS_SPRING | NFL |
|---|---|---|---|
| pressured | 30.9 / 30.0% | 29.9 / 25.4% | |
| interior pressure, of dropbacks | 12.9 / 11.5% | 7.0 / 6.7% | |
| edge pressure from inside, of dropbacks | 5.9 / 4.8% | 4.4 / 3.5% | |
| inside at the edge win | 51 / 37% | 35 / 33% | 47% |
| edge win (within 2 yd of the QB) | 8 / 8% | 8 / 7% | 13% |
| first contact lands wide | 52 / 49% | 49 / 46% | 49% |
| sacks (timing definition, pooled) | 4.5% | 5.0% | 6.7% |
| sacks before 3.0 s: unblocked; the sacker an edge | 7%; 23% | 11%; 35% | |
| OL proxy falls /100 | 6.0 / 5.6 | 7.5 / 2.9 | |
| dither | | passes | |

**Run set (fresh, 1,295 plays, paired against the reference): +0.31 (SE 0.14).**
- By concept: OZ +0.39 (SE 0.27), **IZ +0.85 (SE 0.33)**, gap +0.03, duo +0.48, toss +0.03, draw -0.15.
- Missed + broken 0.271 -> 0.233; engaged-grab breaks 0.040 -> 0.023.
- HANDS_LEVER alone on the same set was IZ +0.26, so most of this is PRESS_SPRING's.

**The screens' block_lane row**, in a scratch tree with Integration's honesty candidate (SCREEN_CALL, CLOUD_KILL,
STALK_CLOSE on), seed 11 x 8:

| | screens only | + PRESS_SPRING | NFL screens |
|---|---|---|---|
| engaged within 1.2 yd | 0.4 s | 0.3 s | 0.8 s |
| held 0.5 s or more | 43% | 32% | 74% |
| the defender reaches the catcher within 1 s of contact | 24% | 14% | 13% |

- The outcome (reaching the catcher) moves to the NFL's; the proximity category (engaged within 1.2 yd) moves away.
- That is consistent with the blocker holding the man at arm's length, outside the 1.2 yd radius, but it is an inferred
  category against an outcome. A few plays need to be looked at before either is leaned on. The sample is about 95
  contacts per arm.

**Read:**
- The blocks got stronger everywhere: interior pressure nearly halves, the run game gains 0.31 with inside zone +0.85,
  and screens keep the defender off the catcher.
- That is a material change, and more yards alone prove nothing. It needs its mechanism found before it lands:
  - which blocks change (the matched staged IZ set, PRESS_SPRING off / on, the same bodies);
  - whether it is the run defender's arms (his own springs at bent length, the shed's extension window), the blocker's
    reach, or the frame rule's friction-limited steer.
- Sacks rise a little (4.5 -> 5.0%), with more unblocked and more edge sackers, while interior pressure falls. Pressure
  is moving from the interior to the edge.

### PRESS_SPRING: where the run gain comes from (matched staged IZ)

iz-lever.mts, the same 120 inside-zone plays and bodies (three rosters x Under / Over x 20 seeds), control
(HANDS_LEVER + CHEST_SHOULDERS) against PRESS_SPRING on top:
- Yards 6.16 -> 7.14, paired +0.98 (SE 0.68): the run set's direction.
- Missed 25 -> 23, **broken 20 -> 39**.
- The arms diverge first at 0.5-0.6 s, in the interior (LG 41, C 38, DT_S 25, DT_W 14 plays).

**The change is turning.** Under PRESS_SPRING the engaged interior pairs stay square. Median |turn| over the block:

| block | blocker, control -> PRESS_SPRING | defender | duration |
|---|---|---|---|
| RG>DT_W | 70 -> 15 deg | 73 -> 18 | 1.90 -> 1.70 s |
| C>DT_S | 82 -> 18 | 129 -> 60 | 1.10 -> 1.77 s |
| LG>DT_S | 49 -> 15 | 83 -> 34 | 2.00 -> 1.80 s |
| LT>DE_S | 70 -> 36 | 67 -> 57 | |
| LG>DE_S | 76 -> 22 | 60 -> 46 | |
| Y>DE_S | 98 -> 46 | 84 -> 22 | |

The reference without the lever also turns them about 60 deg (RG>DT_W 61 / 53). So with one hands joint an engaged
pair orbits about itself as the bodies move, each facing the other. With two shared springs at the bent length the pair
holds its geometry and does not orbit: the defensive tackle is not turned out of his gap, but neither is the blocker
spun off the block. The center's block on the shade lasts 1.10 -> 1.77 s.

**Which is football is an NFL question, not a yards one:** how far an engaged interior pair rotates over a block (the
change in the bearing between them and in each man's facing over the engagement), measured on BDB with the same pairing.
A strong measurement (positions and facing), and the next step before PRESS_SPRING can land or be judged. Broken
tackles doubling on the staged set (20 -> 39; the run set had them fall, 0.094 -> 0.074) is also unexplained.

### PRESS_SPRING attempt 1: failed on the orbit; the cause found (diagnostic arms, a local worktree only)

**The game read fails on a mechanism.** interior-orbit.py (new): each interior OL and the nearest DL within 1.2 yd on
run plays; the net change of the bearing between them over the block (the pair's orbit) and each man's facing change.
Same code on BDB and the sim, seed 11 x 8.

| | orbit p25 / 50 / 75 / 90 | facing change, blocker / defender p50 |
|---|---|---|
| NFL (15,954 pairs) | 25 / 51 / 87 / 126 deg | 33 / 30 |
| reference | 18 / 53 / 85 / 117 | 41 / 40 |
| PRESS_SPRING | 6 / 23 / 66 / 100 | 29 / 32 |
| PRESS_SPRING, the defender's steer zeroed (diagnostic) | 8 / 30 / 71 / 102 | 33 / 33 |
| PRESS_SPRING, both men's steer zeroed (diagnostic) | 29 / 62 / 94 / 124 | 47 / 41 |

- The reference already orbits like the NFL. PRESS_SPRING halves it, so its run gain (+0.31; IZ +0.85) comes from
  interior pairs too rigid sideways, and is not to be believed.
- The matched staged IZ with the defender's steer zeroed is still +0.83 (SE 0.68).
- The constraint is tangential. A hands row's steer is a two-way lock on the pair's sideways relative motion, up to
  0.7 (blocker) or 0.55 (defender) of the arm's strength. With two springs always in contact both locks act at once,
  stiffer than the reference's one, intermittent joint.

**Attempt 2, proposed (the last):** hands on a man give two different tangential forces, and the row has to carry each
as what it is.
- **Passive:** friction on the press, both ways, at most HAND_MU x the hand's normal force (the outside-hand rule, now
  for every hand). It resists sliding only as hard as the press allows.
- **Active:** his steer, one way only. His arm works the man across in the direction he is steering, up to its strength
  (the run blocker's play-side seal, the defender working toward his gap). It does not hold the man in place against
  motion the other way beyond friction.

Judged on the orbit (toward the NFL's p50 51 deg) and on the five staged gates again, then the game read.
