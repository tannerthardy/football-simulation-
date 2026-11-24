# Blocking: the physics first, then the techniques (2026-11-24)

Integration, at the user's direction: review how blocking works from the physics up (where the hands go, how two men
fight), rebuild what rests on faulty assumptions, and let the techniques follow from the physics as the answers to why
one man cannot win when he should. This is the plan of record for line play. Lanes: read "Who builds what".

Sources: a read of `src/physics/world.ts`, `support.ts`, `kinematics.ts`, `src/players/physical.ts`,
`src/sim/engagement.ts` (3,309 lines), `behaviors/blocking.ts`, `contact-holding.ts`, the engaged tackle in
`tackle.ts`; the recorded diagnoses (`docs/reviews/push-contest-traction.md`, `2026-11-12-tackle-set.md`,
`2026-11-14-stance-base-proposal.md`, `2026-11-15-set-spot.md`, `effective-mass.md`, `hands-plan.md`,
`pass-rush-hands.md`, `shed-moves.md`, `run-shed-release.md`); Tools' push-contest scoping note
(`docs/reviews/2026-11-24-push-contest-scope.md`, PR #866); Flex's staged anchor numbers; and the outside audit of
engagement.ts. Develop d31271e42 (engine-96).

## 1. What exists, and where it stops being physics

**The bodies are simulated honestly.** Nothing in the blocking code sets a position or a velocity. Each man makes a
request; the World resolves feet, traction, torso contact, the hand joint and balance.
- Balance is a capture point over a base: pushed harder than his feet can follow, he must step, and past the reach of
  a step he falls. Push height tips him (above his centre one way, below it the other).
- Pad level exists as posture. It lowers his centre and pads and widens his base. Where two pads press, the line of
  action carries a vertical part that lifts the higher man and loads the lower one (`PAD_LEVERAGE`, on).
- A committed lean into a load exists, and removing the load dumps the lean into his balance (the physical basis of a
  swim or a pull).
- Arms have one force budget shared by everything his hands do.

**The hands are not physical.** This is the fault the rest stands on.
- A hand contact is one line between the two chests. Hands have no position: no inside or outside, no height of
  their own, no vertical force. Arm length is not a physical limit; extension is whatever the controller sets.
- How hard that line can push, hold and steer is scaled by `e.control`, an abstract hand-fight number in [−1, 1]
  (`setContactHands`, engagement.ts:522–531: push = press × (0.35 + 0.65|c|); steer = arm × (0.15 + 0.55c)).
- `control` is set by dice: a ratings roll at first contact (punch against swipe or strike), a ratings drift with
  noise on run blocks, and jumps when a move's roll lands or fails.
- Every pass-rush move except the bull is a weighted dice pick, then a logistic roll of skill against skill, and on
  success a scripted shove and a new `control` (resolveMove, engagement.ts:1065–1181). A landed move cuts the
  blocker's push to 20% and his steer to 10% (806–809).
- "Who is winning" (`e.win`) uses only the angle and the blocker's balance, not the hands, and gates the blocked
  defender's tackle.

**Strength is hidden.** Each man's push is the lesser of his leg drive and 1.1 × his weight (`TURF_MU`, marked
unsourced in the code). For strong players leg drive already exceeds that, so more strength adds nothing and two
capped men are decided by mass. Staged centre against tackle: rusher power × 1.15 leaves the walk-back at 1.16 yd/s;
blocker mass × 0.9 makes it 1.57. Leg force has no force-velocity relation (`LEG_FV` parked), so a small strength edge
carries a man sideways without limit. Matched pairs never move.

**The base has no direction.** A man balances over a circle of about 0.17 yd. A staggered base along the press would
be 0.3–0.4 yd. Two attempts to give the base a shape made blockers fall more and were removed; the cause was not
found.

**Whole techniques are missing or are labels.** No hand placement; no defender lockout (the base of stack and shed);
two-gap is a fit label with no mechanics; no counter off a first move; no wrong-arm, cut block or jump set; chips are
a type nothing reads; a second blocker is a "helper" leaning on a flank, limited to one; a block has no outright win
(no pancake); stunts are scripted paths, off.

**What the measurements say** (same operator, ours against NFL tracking):
- Interior rusher's gain on his blocker at 1.0 s: 0.00 yd/s against +0.63. Pairs "move as one block".
- Off the block by 3 s: 10% against 34%. Never released: 53–58% against 37%.
- Engaged defensive lineman's lateral move at 2 s: 0.4–0.5 yd against 2.3.
- Hand steer at its limit on 65% of samples.
- Run stuffs 12.1% against a band of 15.9–23.5%; a doubled lineman is never driven back.
- Whole-game sack and pressure rates sit near the NFL's. They are the product of dice fitted over time, so they are
  not evidence the mechanism is right, and they will move when the dice go.
- One caution on a reference: the NFL's "held interior pair is walked back 1.3–1.6 yd/s whatever the weights" is an
  inferred category over a narrow range of weights, and uncovered linemen retreat as far as engaged ones, so most of
  it is the set, not the push. It is not a target.

## 2. The physics of two linemen, as we will model it

Four things decide a rep. Each is a physical quantity with a place in the World; none is a score.

**A. Legs: what a man can put into the ground.**
- A grip limit: friction of cleats on turf times the load on his feet. The coefficient gets a source (scrum and sled
  force studies, cleat traction tests) or is stated as a choice with its range.
- A strength limit that depends on how fast he is already moving in that direction (force-velocity) and on how deep
  his posture is (a deep knee bend costs force), so strength shows above and below the grip limit.
- Posture is an outcome as well as a request: a man holds a low pad level under load only as far as his legs can.
  Lift from an opponent who is under him raises him unless he can resist it. This is where "strong as an ox" lives:
  standing a man up and not being stood up.

**B. Base: where the force must stay.**
- The base has a shape set by his stance: wider or staggered along the load resists more that way and is slower to
  move across it. That trade is the kick-slide against the anchor, and it is the man's choice, made on what he feels.
- The earlier failure is re-diagnosed before anything is built (who fell, in which direction, under which stance).
  This is a two-point support shape, not anatomical feet.

**C. Arms: what connects the two men.**
- Each man has two arms. An arm is a strut from his shoulder to a hand, with a real length limit, a force limit that
  depends on extension (strong at lockout for holding a man off, weaker in mid-range for moving him), and a speed
  limit for the hand.
- A hand is a contact point at a place on the other man: across his shoulder line (inside on the chest, or outside on
  the shoulder and arm) and at a height.
- Force through an arm acts at that point along the arm. From its place and height follow, with no extra rule:
  how much moves him and how much turns him (a hand off his centre turns him); how much tips him; how much load moves
  between the two men's feet; and what it costs the pusher's own balance and trunk.
- A grip adds tension (a pull) and is what a hold is.
- Inside hands win because their line runs through the man's centre and under his pads, and because they put the
  other man's arms outside, where his own line is off centre and his elbows are wide.

**D. The hand fight: hands against hands.**
- A hand stays where it is by pressure and grip. It is displaced when something moves it harder than it is held:
  a chop or club across the forearm, a rip under it, a swim over it.
- A displaced hand must travel back and re-fit; that takes time set by hand speed and by seeing or feeling the
  opening. First contact is a race of reach and hand speed.
- `control` is deleted. What it stood for is read off the bodies: whose hands are inside, at what height, at what
  extension, with what force.

**Ratings act on capacities and control, never on a result:** hand speed, how accurately a hand lands where he aims,
arm and leg strength, how low he can play, how fast he feels a change through his hands and feet, and what he
chooses. No roll decides a rep.

## 3. Techniques, as what the physics makes possible

A technique is a way of using A–D. Each is built only after the physics that makes it work exists, and each is the
answer to a staged case where the man who should win cannot.

| Technique | What it is in A–D | Fails when |
|---|---|---|
| Bull rush | Low pads, hands inside and under, drive | The blocker is lower, or his base is set along the push |
| Anchor | Sink, set the base along the load, re-fit hands inside | He is late to sink, or his legs cannot hold the posture |
| Long arm | One arm at lockout inside the blocker's chest; reach keeps his hands off | The blocker's arms are longer, or he knocks the arm down |
| Speed rush, dip | Beat the set to the corner; lower the inside shoulder so there is less to strike | The tackle's kick and reach get there; he cannot hold the lean at speed |
| Club, chop, swipe | Move a hand off by striking the arm | The hand is held harder than the strike, or is re-fit in time |
| Rip, swim | Go under or over an arm | His pads are too high for the rip; the blocker's hands are not low enough to swim |
| Push-pull, snatch | Load his lean, then remove the load | He has not committed his weight |
| Spin | Turn about the contact point on the blocker's push | The blocker has not pushed |
| Counter | A second move as the first is answered | He does not feel the answer in time |
| Punch | The hands' first strike, timed to arrive inside as he closes | He punches at air, or outside |
| Drive block | The bull from the offense | As above |
| Reach block | Gain outside position, then turn him with the far hand | The defender widens with him or locks him out |
| Double team | Two men's forces on one, hip to hip, each with his own hands | The defender gets low and splits it, or one blocker leaves early |
| Lockout, stack | Inside hands at extension holding the blocker off while he reads | The blocker gets inside his hands |
| Shed | Throw a blocker whose weight is committed, by pull and push | The blocker's base is under him |
| Hold | A grip from outside the frame, or kept after he is beaten | The official sees it (`BLOCK_FRAME`, the persistent hold) |

What each man chooses comes from what he feels and sees: the other's hands, lean, pad level and feet. Skill sets how
well and how soon. Move choice stops being a weighted draw.

## 4. Order of work and gates

**Phase 0, now, no engine change.**
- A staged bench: pass (bull, speed, long arm), run (drive, reach, double), with forces, hand state, posture, base
  and balance logged per tick. Extend `scripts/diag/effective-mass/anchor-staged.mts`.
- The sensitivity table, which is the truth test for every later phase: change one thing and the staged result must
  move the right way and by a believable amount. Stronger legs; stronger arms; longer arms; lower pads; a set base;
  heavier; faster hands; hands inside against outside.
- Sources: the grip coefficient; scrum, sled and force-plate horizontal forces as multiples of body weight; arm
  press and pull forces by extension; hand speeds. Citations verified.
- Re-diagnose the base-shape failure.
- Fix the plain defects found by the audit that do not depend on the rebuild: the engaged tackle's free-side test,
  the one-tick hold and block frame (PR #905), the run fit's facing after a shed.

**Phase 1, legs and base (World).** Grip limit sourced; force-velocity and posture in leg drive; posture under load;
base shape by stance. Gate: the sensitivity table's leg, pad and base rows; matched pairs can move each other;
blocker falls stay in the NFL's 1–5 per 100 dropbacks.

**Phase 2, arms and hands (World).** Two arms a man; hands as contact points with place and height; force at the
point producing push, turn, tip and load transfer; grip. Builds on the parked pieces (`RUSH_HANDS`, `HAND_MOTOR`,
`HAND_MOMENT`, `HAND_SITE`). `setContactHands` stops reading `control`. Gate: the arm, reach and hand-place rows;
energy and momentum accounted for; angular momentum closed (the open defect in `pass-rush-hands.md`).

**Phase 3, the hand fight.** Displacement and re-fit; first contact as a race; `control`, its drift and the contact
exchange rolls deleted. Gate: staged hand-fight cases; the come-off and lateral-move measures move toward the NFL's.

**Phase 4, techniques as decisions.** In this order: pass set, punch and anchor; bull and long arm; speed and dip;
club, rip, swim; push-pull and spin; counters; then drive, reach, double, lockout and shed; then stunts and
pass-offs. Each replaces its dice. Gate per technique: its staged win and its staged loss, both for the stated
reason.

**Phase 5.** The remaining dice and parked flags deleted; tests re-recorded; rating-to-capacity map documented.

**Whole-game gates, read after each phase, never tuned to:** interior rusher's gain at 1.0 s; off the block by 3 s;
engaged lateral move at 2 s; pressure by source and by time; sack funnel; blocker and rusher falls; run stuffs and
yards before contact; doubled lineman's movement; holding calls. A worse statistic is not a veto; an unexplained one
or one caused by a bug in the new mechanism is.

Everything is behind flags until its phase clears. The old engagement code stays live until Phase 5.

## 5. Risks

- This is the largest rebuild in the engine and it runs beside the quarterback rebuild. The pocket the passer feels
  will change under him. Phases land one at a time with a card each, and the QB lane is told before each.
- Whole-game pass-protection numbers are near the NFL's today because the dice were fitted. They will move.
- The hand model was tried in part before (`RUSH_HANDS`) and gave too much interior pressure with clubs landing on
  set hands. That is a finding to explain in Phase 3, not a reason to keep the dice.
- Cost: two arms a man for every engaged pair each substep. Measured in Phase 2.

## 6. Who builds what

- **Tools / Physics:** Phases 0–2 (the bench, the sensitivity table, sources, legs, base, arms and hands in the
  World). First deliverable: the bench and the table on today's engine, so the starting faults are on record.
- **Line play (a lane to be named, see below):** Phases 3–5 in `engagement.ts` and `behaviors/blocking.ts`: the hand
  fight, techniques as decisions, deleting the dice.
- **Rules + Coaching:** each technique as taught (hand placement, aiming points, footwork, the counter to each move,
  the rules for doubles and pass-offs), sourced, one standard version, in the Phase 4 order.
- **Defense:** the defender's side of run techniques (lockout, shed, two-gap, wrong-arm) with the line-play lane;
  keeps `BLOCK_FRAME` and the post-shed work.
- **Run Game:** the engaged tackle (free side, arm share) and the run-block side of doubles and reaches as they
  meet the run fits.
- **QB lane:** told before each phase lands; `held()`'s read of the true block becomes what he sees of the hands
  and the pads.
- **Flex:** felt strength in the believed body takes its evidence from Phase 1–2's forces.
- **Integration:** reviews each phase's design note before code, cards and lands each phase.

Line play has had no owner since the trenches lane ended; the 22 failing blocking tests in the ledger are still
under that name. This plan needs one. Until the user decides, Tools starts Phase 0 and Defense carries the defects.
