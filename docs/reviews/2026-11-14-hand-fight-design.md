# The interior pass-rush hand fight: measured, then designed (Flex, 2026-11-14, engine-65 / 66; no build before Integration reads it)

PRESS_SPRING stopped on the finding that a continuous press holds an engaged pair by friction alone. The NFL's pairs orbit
with hands on, so their press comes and goes, and the moves that should make it come and go write to a `control` that
decides nothing. The reference's own interior pass-rush pairs barely orbit (11 deg against the NFL's 39): a pre-existing
gap that every hands flag has tried to cover from the wrong side. This note measures the fight first, then designs it from
how it is taught.

## 1. Measured

Operators: `interior-fight.py` and `interior-orbit.py` (the same code on BDB and sim exports; pairs are each of the three
middle OL and the nearest DL within 1.2 yd from the snap + 0.2 s, engaged while within 1.2 yd, to the throw), and
`moves-fight.mts` (ours only: per interior pass rep, the moves fired, whether they land, the hands joint's load).
Sim: engine-65 reference stack, seed 11 x 8 (and 23 x 8 for the reference); RUSH_HANDS is the existing hand model, off.

**The fight by time since first contact** (orbit = net change of the bearing between them; offset = the rusher across
the blocker's line to the QB, + toward the side he started on):

| | 0-0.5 s | 0.5-1.0 s | 1.0-1.5 s | 1.5-2.5 s |
|---|---|---|---|---|
| orbit p50 / p90, NFL (23,733 pairs) | 5 / 26 deg | 25 / 70 | 34 / 93 | 39 / 119 |
| reference | 3 / 17 | 6 / 36 | 9 / 47 | 11 / 52 |
| RUSH_HANDS | 3 / 25 | 11 / 61 | 17 / 80 | 21 / 83 |
| offset p25 / 50 / 75, NFL | +0.16 / +0.39 / +0.64 yd | -0.04 / +0.30 / +0.59 | -0.18 / +0.24 / +0.56 | -0.33 / +0.13 / +0.52 |
| reference | +0.08 / +0.29 / +0.57 | +0.02 / +0.21 / +0.53 | -0.02 / +0.15 / +0.51 | -0.11 / +0.21 / +0.58 |
| separation p50, NFL | 0.99 yd | 0.81 | 0.80 | 0.81 |
| reference | 0.91 | 0.85 | 0.92 | 0.92 |

**First release** (separation past 1.2 yd, or the rusher's bearing past 70 deg off the blocker's line to the QB):

| | p25 / 50 / 75 | released by 1.0 s / 2.0 s | never |
|---|---|---|---|
| NFL | 0.3 / 0.7 / 1.2 s | 43% / 60% | 37% |
| reference | 0.2 / 0.9 / 1.4 | 30% / 46% | 49% |
| RUSH_HANDS | 0.3 / 0.7 / 1.2 | 44% / 61% | 36% |

**Ours, per interior pass rep** (moves-fight.mts, seed 11 x 4, 926 reps, rep p50 2.1 s):
- 3 move decisions a rep (p90 4), 1.24 a second.
- Landed: bull 100%, dip 33%, rip 22%, club 21%, swim 18%, long-arm 9%, spin 6%, snatch 3%.
- The hands joint is loaded 91% of the rep (p50), in one continuous stretch of 1.5 s (p50).
- **In every move's window the hands' load rises, not falls**: rip 795 -> 1,009 N, swim 775 -> 964, club 671 -> 967,
  spin 668 -> 1,032. A move that "lands" scales the blocker's steer (x 0.1) and push (x 0.2 for spin and swim) for its
  window and fires a centre strike (PHY-STRIKE). It never takes a hand off the man.
- Under RUSH_HANDS the hands are loaded 83% of the rep (1.15 s stretch). The club, a force on the blocker's hand, leaves
  0 N in its window: the one move that clears a hand. Swim, rip, snatch, spin and dip are still rolls and still raise the
  load.

**Read:**
1. The NFL fight happens between 0.5 and 1.0 s: the pair turns 20 deg there (5 -> 25), the rusher's offset spreads to the
   other half (p25 +0.16 -> -0.04, and on to -0.33: the counters), and the pair closes to 0.81 yd. Ours barely moves
   then (3 -> 6 deg), stays wider (0.85-0.92), and its rusher rarely crosses to the other half (p25 -0.11).
2. **RUSH_HANDS already gets the release timing right** (44 / 61 / 36% against 43 / 60 / 37), and half the orbit. Its
   known overshoot (interior pressure 20% of dropbacks on this read, NFL about 9.8) therefore comes after the release:
   the released rusher reaches the QB more often than the NFL's. That is the come-off question (a beaten blocker's ride,
   the next blocker's help, the QB's movement), not the fight's.
3. So the hand fight is RUSH_HANDS' model finished: every move acting on the hands, not just the club.

## 2. How the fight is taught

**The rusher** clears the blocker's hands first, then wins with the body. A clear is a strike on the blocker's hand or
arm, at the wrist, forearm or elbow:
- the chop and the swipe knock a hand off or across (one hand, or a double swipe with both);
- the rip comes up under the blocker's arm through his armpit with the inside arm, the shoulder dipped;
- the swim brings the arm over the blocker's shoulder as the near hand is pressed down;
- the cross chop attacks the blocker's control arm across the rusher's body.
A clear alone does not win the rep: the feet still have to shorten the path and the shoulder still has to turn the
corner. A rusher stays light on his hands to recover and reset when the blocker swipes at him.
([Pass rush moves handbook](https://dlineexamples.substack.com/p/pass-rush-moves-handbook);
[The beginner's guide to rushing the passer](https://jayarnold.substack.com/p/the-beginners-guide-to-rushing-the);
[VIQTORY: pass rush moves for DL coaches](https://www.viqtorysports.com/pass-rush-moves/);
[What is a cross chop](https://www.footballnationusa.com/post/what-is-a-cross-chop-how-pass-rushers-clear-the-tackle-s-hands).)

**The blocker** strikes, re-strikes and replaces:
- independent hands on a 45-degree set: one hand can strike while the other is held, and a "flash" of one hand draws
  the rusher's move early;
- set with the hands at chest height to invite the slap-down, then drop them to the waist as he comes and re-punch, or
  punch to half extension, draw back and re-punch;
- the snatch-and-trap: the blocker chops or swipes the rusher's wrist, forearm or elbow to take his balance, the counter
  the rusher answers with a long arm;
- patience on the punch: don't lean on the hands, keep the head back.
([USA Football, the art of the strike](https://blogs.usafootball.com/blog/6283/the-art-of-the-strike-3-techniques-offensive-linemen-can-use-to-fend-off-pass-rushers);
[USA Football, snatch and trap](https://blogs.usafootball.com/blog/6349/how-nfl-offensive-linemen-use-the-snatch-and-trap-technique-to-stop-pass-rushers);
[X&O Labs, 4 ways to improve pass protection](https://www.xandolabs.com/?p=6437);
[Coaches Insider, the elements of pass protection](https://coachesinsider.com/football/the-elements-of-pass-protection-article/).)

The sources are coaching blogs and clinic notes, not one authority; the aiming points vary by scheme.

## 3. The design (not built)

Built on RUSH_HANDS' hand: the blocker's hand is a one-degree-of-freedom body on the hands joint. A force on it over its
contact time is resisted by the arm's hold (steer x bent / extension + friction on the measured press + a grip's hold).
The excess slides the hand, falling to nothing at the edge of the man's torso, where the hand is off. A hand that is off
re-fits after the blocker's reaction plus the arm's travel from his chest at ARM_SPEED.

The properties Integration set, and how each is met:

1. **A move acts on a hand's fit, never on an outcome.** Each move is a force on one of the blocker's hands (or both),
   for the time the rusher's arm takes across it, from his own arm and hand speed:
   - **chop / swipe / club**: across the blocker's hand at the wrist (RUSH_HANDS' club law, unchanged);
   - **rip**: up and across the blocker's outside hand from below, for his arm's time across the forearm (RUSH_RIP's
     force law, which needs RUSH_HANDS), while his body dips (the bend request);
   - **swim**: down and across the blocker's near hand as the swimming arm passes over the shoulder, for the same time;
     the arm over the top is the body's path, not a rule;
   - **snatch / trap**: the rusher grips the blocker's wrist and pulls it across (a grasp row on the hand, its hold his
     grip strength); the hand is trapped while he holds it;
   - **spin and dip**: body moves. The rusher's chest turns or drops away from the blocker's hands, the contact point
     leaves the torso, and handEdge takes the hand off by geometry. No hand rule of their own.
   - **bull and long-arm**: no clear. The bull drives through the press; the long-arm is the rusher's own hands joint at
     his lockout (RUSH_HANDS), countered by the blocker's club on it.
   Whether a hand comes off is then the World's: the force against the arm's hold. No roll, no landed window, no
   `control` swing.
2. **The blocker's re-fit takes his reaction plus arm travel and can be late.** RUSH_HANDS' refit: after his reaction to
   the felt loss, the hand travels from his chest to the man at ARM_SPEED and lands where his hand placement puts it
   (the placement error by his hand technique, as PAIR_HANDS' placeHand drew it). Independent hands: each hand re-fits
   on its own, so one can be on while the other travels. The replace and re-punch is a new strike with its own
   landing.
3. **Skill sets timing and placement on both sides.** The rusher's hand speed sets how long his arm takes across the
   blocker's forearm, so a quicker hand delivers its force in less time. His arm strength sets the force. The blocker's
   hand technique sets his re-fit's placement error, and his reaction sets the delay. Ratings set capacities and errors,
   never an outcome.
4. **The press and its friction exist only while a hand is fitted.** The hands row's push, hold and steer scale with the
   hands on (RUSH_HANDS' handEdge and handsOn), so while a hand is off or travelling its press and its friction are gone.
   That is what lets the pair orbit (PRESS_SPRING's lesson). It needs no second friction law: the row's own limits are
   already the fitted hands'.
5. **It replaces the rated move rolls, not sits beside them.** resolveMove's remaining rolls (speed, dip, spin, swim,
   rip, snatch; the bull's landed window) and the `control` swing go. A move is a decision (the rusher's keys: a hand
   unloaded by touch, the blocker's arm advantage by sight, RUSH_HANDS') and its physics.

**The open question RUSH_HANDS left** (a cleared hand freed the path: interior pressure 12-14%, now 20%) is not the
fight's. The release timing is already the NFL's, so the overshoot is what a released rusher gets. That is two things
this design keeps separate:
- RUSH_ONE_HAND's rule that one hand gone opens one side, not the rep (the body and the other hand are still in front);
- the come-off: the beaten blocker's ride (PASS_RIDE), the next blocker's help, the QB's movement.
The first is in the design. The second is measured and decided after it, with the come-off operator against the NFL's.

**Flags it retires** when it lands:
- RUSH_HANDS' remaining rolls;
- RUSH_RIP and RIP_CLEAR (folded in: the rip's force law is one of the moves);
- RUSH_ONE_HAND (folded in);
- CONTROL_HANDS and HAND_FIT (the rolled `control` they work around no longer exists);
- the parked pair-contact flags stay parked: PAIR_HANDS, PRESS_SPRING, HANDS_LEVER. PHY-STRIKE (strikes at the line of
  centres) is fixed for the hand strikes by construction, since they act on the hand body.

**Gates, written before any build:**
1. interior-fight by time: orbit at 0.5-1.0 s toward the NFL's 25 deg (today 6), the rusher's offset reaching the
   other half (p25 at 1.5-2.5 s toward -0.33, today -0.11), separation toward 0.81;
2. release timing kept at the NFL's (43 / 60 / 37%);
3. moves-fight: in a cleared move's window the hands' load falls (today it rises in every window);
4. interior pressure no higher than today's reference (12.9 / 11.5% of dropbacks; NFL about 9.8), then the
   come-off measured;
5. interior-orbit on pass sets toward 39 deg (today 11), runs unchanged (53);
6. the run set by concept, falls, sacks and dither.

## 4. After Integration's read (2026-11-14): staged, both sides, no outcome gates

**Stages, each with its own two attempts at the game read:**
1. **The physics, one move.**
   - Press, friction and steer exist only through a fitted hand, per hand.
   - The re-fit is the blocker's reaction plus arm travel, with placement error.
   - The club, which already clears, is the only move.
   - Gates: the hands' load falls in the club's window; the orbit at 0.5-1.0 s moves; the offset p25 moves; release
     timing is kept.
   - If one move plus honest hands gives most of the orbit, the remaining moves are detail. If it gives none, the theory
     is wrong, and six more moves would have hidden that.
2. Rip and swim, as forces on a fit.
3. Snatch, spin and dip by geometry, and retiring the rolls.

**The blocker's half** (written before building, so the law is not rusher-sided):
- **What he perceives:** he sees the arm come, at his sight delay. A move he reads late lands, because the clear's force
  arrives before his hold can be set against it. He feels a hand go light by touch at the hands' delay.
- **What he does besides re-fit:**
  - independent hands: one strikes or holds while the other re-fits;
  - re-punch: a new strike with its own landing;
  - snatch back: his own grip on the rusher's wrist, the coached snatch-and-trap, a grasp on the rusher's arm that holds
    it out of position;
  - anchor: sink against a bull (ANCHOR_BASE's lean on the felt load);
  - give ground: his set's kick, already the mirror's.
- **What a miss costs him:** a re-punch that misses leaves the hand extended and late back to bent (the reach's cost,
  measured in PRESS_SPRING's stem-and-cut row). A snatch that misses leaves his hand off the man for its travel back.

**The rusher's symmetric costs and commitment:**
- A failed clear leaves his arm out of position for its return travel (RUSH_HANDS' sweep: reaction plus the arm's
  return at ARM_SPEED, twice if the club stopped on a hand). A clear that left him off balance costs his reaction again.
  He throws no other move until the arm is back.
- A committed move is committed. Today he makes 1.24 decisions a second; under the new law a decision is made only at
  a decision point (the arm back, or a felt change: a hand going light by touch) and is never re-rolled on the same
  picture. The dither guard covers his requests.

**Gates corrected:**
- Interior pressure is a reported row, not a gate. If the fight's timing, orbit and offset are right and pressure is
  high, the fault is after the release (the come-off: ride, help, the QB's response), its own piece of work. A hand
  force is never sized to hold pressure down.
- "Toward 25 deg / 39 deg" are places to look, not targets. The forces come from arm strength and hand speed, and the
  orbit that results is the result.

**Never ban what works.** No move is made to fail by a roll or a cooldown once this exists. If the club clears every
time under the new law, the answer is the blocker's counter (he reads it, sets his hold, snatches back) or the club's
cost (his arm out of position), found from how it is coached.

**Interaction with ENGAGE_TRUNK / CHEST_SHOULDERS and the yaw findings.** Stage 1's "press only through a fitted hand"
acts on the same contact. The order is the patch first, the hands on top:
- The patch assumes nothing of the hands: hips on the set, shoulders on the felt man, the chest segment across the
  shoulders. All hold whether the press is continuous or comes and goes.
- The hands stage assumes the patch: the hand body's contact point is the chest segment, so the shoulders decide where
  a hand lands and where its edge is.
- The yaw findings stand under both: no moment on a set blocker from a press or a strike, and grip not shared with the
  yaw motor. An intermittent press changes how often there is a press to share grip with, not the motor's law. The
  shared-grip budget is measured after stage 1, on the new contact.

**Retirements** (accepted in principle): RUSH_HANDS' rolls, RUSH_RIP, RIP_CLEAR, RUSH_ONE_HAND, CONTROL_HANDS and
HAND_FIT. Each is executed only when the stage that replaces it has carded.

**A second witness for stage 1** (the QB lane's ends-by-time measurement, engine-66, 16 games; one code path on BDB and
our exports; non-designed gun dropbacks, no play action or screens; sacks timed at the wrap):

| | common drop 2-3.5 yd: NFL / ours | deeper drop 3.5-5 yd: NFL / ours |
|---|---|---|
| sacked, all | 7% / 4% | 9% / 12% |
| alive at 3.0 s, ending in a sack | 12% / 4% | 10% / 6% |
| alive at 3.5 s | 12% / 5% | 12% / 4% |
| alive at 4.0 s | 11% / 6% | |

Our rush gets home early about as often but does not finish late: a quarterback still holding at 3 s is sacked a third
as often as the NFL's. That fits the orbit finding (the pairs do not rotate, and a rusher who has not won by about
1.5 s never wins). Added as a reported row, not a target: **the share of dropbacks alive at 3.0 s that end in a sack**.
Late NFL sacks also include coverage sacks, where a moving quarterback runs into a rusher who came off his block.
Whether ours come off a block toward a moving quarterback at all is the come-off question, measured after stage 1.

## 5. Stage 1, attempt 1: built and read (2026-11-15, `FITTED_HANDS`, branch 7037d163)

Built as section 4's stage 1 on RUSH_HANDS' hand (requires RUSH_HANDS; the name HAND_FIGHT is the run fight's flag):
- **Two hands, each its own one-DOF body** (`handPair`). Each carries half the joint's push, hold and steer at its own
  edge factor: press, its friction and steer exist only through a fitted hand, hand by hand. A strike acts on the
  hand it meets and is held by that arm alone (half each term). RUSH_HANDS' joint held a club with both arms.
- **Re-fit:** after reaction plus travel (refitTime), landing with a placement error by hand technique (PLACE_SPREAD);
  past the torso's edge it missed and goes again.
- **No landed-move window** from a lost hand on pass reps: the man is freed only by the World.
- **The club is the interior rusher's one move**, thrown when a hand is on him and his arm is back (RUSH_HANDS' return
  cost); no rolled cooldown. He works the side he feels cleared, by touch at 0.06 s. RUSH_ONE_HAND's aim read the
  joint's state with no delay; under the flag that is removed.
- Off identical (seed 999 287b9553c2e9b709). World tests: test/fitted-hands.test.ts.

**Read:** seed 11 x 8, on the patch base (ENGAGE_TRUNK + CHEST_SHOULDERS). Operators: interior-fight.py,
pressure-source.py, club-fight.mts (seed 11 x 4; new: moves-fight.mts reads a window by moveUntil, and the club, about
0.03 s, ends inside one tick).

| | NFL | base | + RUSH_HANDS | + FITTED_HANDS |
|---|---|---|---|---|
| orbit p50 0.5-1.0 / 1.0-1.5 / 1.5-2.5 s (deg) | 25 / 34 / 39 | 7 / 9 / 12 | 11 / 15 / 20 | **26 / 39 / 37** |
| offset p25 0.5-1.0 / 1.0-1.5 / 1.5-2.5 s (yd) | -0.04 / -0.18 / -0.33 | +0.02 / -0.03 / -0.07 | 0.00 / -0.06 / -0.09 | **-0.07 / -0.34 / -0.25** |
| separation p50 0.5-1.0 s (yd) | 0.81 | 0.85 | 0.89 | **0.81** |
| released by 1.0 / 2.0 s, never | 43 / 60%, 37% | 32 / 47%, 48% | 46 / 61%, 35% | **53 / 73%, 25%** |
| hands' load before / 0.1 s after a club (N) | | | 322 / 616 | **868 / 541** |
| clubs a second / clearing a hand | | | 0.45 / 35% | 1.54 / 54% |
| hands on, share of rep: 2 / 1 / 0 | | | 92 / 8 / 0% | 62 / 36 / 2% |
| interior pressure, % of dropbacks (reported) | about 9.8 | 12.0 | 21.7 | **38.5** |
| sack proxy, % of dropbacks; alive at 3.0 s ending in one (reported) | 7; 12 | 6.1; 12.7 | 7.2; 15.2 | **15.2; 31.6** |

The sack proxy counts a dropback with no forward pass ending behind the line (it includes QB runs for a loss); it is
a comparison between arms, not the QB lane's operator.

**Gates:**
1. **The club's window: pass.** The load falls after it (868 -> 541 N); under RUSH_HANDS alone it rises
   (322 -> 616 N).
2. **The orbit at 0.5-1.0 s: pass**, at the NFL's (26 against 25 deg), and on through 1.0-2.5 s.
3. **The offset p25: pass.** The rusher reaches the other half (-0.34 at 1.0-1.5 s against the NFL's -0.18 to -0.33),
   and separation is at the NFL's 0.81.
4. **Release timing: fail, overshot.** 53 / 73% by 1.0 / 2.0 s against 43 / 60%; never released 25% against 37%.

**Where the releases come from** (club-fight.mts, separation past 1.2 yd after contact): 533 of 810 reps
(RUSH_HANDS 417 of 780).
- 391 come with both hands on; 141 with one hand off (RUSH_HANDS 29); 194 within 0.5 s of a clear (RUSH_HANDS 37).
- A hand is off 0.35 s p50 (p90 0.55) before both are back.

So the clears now free the man, as taught. The overshoot is that they come too often and cost him nothing the blocker
makes him pay:
- 1.54 clubs a second, every time his arm is back, and 54% clear.
- The blocker never sees one coming: the club is a force from the instant it is thrown, with no arm travel to the
  hand before it. The return travel is modelled (RUSH_HANDS' sweep) but the approach is not.
- The blocker has none of section 4's half: no read of the arm, no hold set against it, no snatch back.

One move plus honest hands gives all of the orbit: section 4's test of the theory comes out for it. What is missing
is the blocker's half, not more rusher moves.

**Proposed attempt 2** (the last for stage 1), from section 4's blocker half and the rusher's costs:
1. **The club's approach.** His hand travels to the blocker's wrist (0.45 of his arm at his hand speed, the same sweep
   as its return) before the force acts.
2. **The blocker reads the arm coming** by sight (an arm is seen, not felt), at his sight delay of 0.12-0.24 s by his
   read.
   - Seen before the force arrives: he sets that hand's hold. The arm bends toward his bent length (the lever term
     rises) and he takes cloth: a grip, OPEN_HANDS' hold, for the club's time.
   - Seen late: it lands as now.

No roll, no cooldown, no cap on clubs. Whether the club still works is then the World's, against a hold set by a man
who saw it.

## 6. Stage 1, attempt 2: the club's approach and the blocker's read (2026-11-15, `FITTED_HANDS`, 54a595c2, engine-67)

Integration's conditions, as built:
1. **The approach is physics.** His near hand travels 0.45 of his arm at his hand speed (0.11-0.19 s) to the
   blocker's wrist before the force acts, aimed at one hand. If that hand is not there at the onset, the club meets
   air: no contact at all.
2. **The blocker's read is perception.** He sees the arm start at his sight delay (0.12 + 0.12 x (1 - read)), and only
   with the rusher in the view cone about his eyes (head.ts; his facing without HEAD). His answer is what he has time
   for before the onset, with no roll:
   - a forearm's width of hand travel: take the hand away (the club meets air) and re-punch as it passes;
   - less: firm the hand with cloth (armForce x 0.6) for the club's time;
   - none: it lands.
3. **The rusher pays.** A held club costs RUSH_HANDS' second sweep. A club through air costs a double return, his
   reaction again for the balance, and his arm's momentum into his body.
4. **Cloth is on the joint** (grip and hold), where the holding detector reads it.

Off identical (engine-67 7c0603676f346494). Attempt 1 re-read on the same engine from a worktree.

**Read:** seed 11 x 8, the patch base.

| | NFL | base | + RUSH_HANDS | attempt 1 | **attempt 2** |
|---|---|---|---|---|---|
| orbit p50 0.5-1.0 / 1.0-1.5 / 1.5-2.5 s (deg) | 25 / 34 / 39 | 7 / 8 / 11 | 10 / 13 / 15 | 27 / 41 / 41 | **20 / 35 / 43** |
| offset p25, same windows (yd) | -0.04 / -0.18 / -0.33 | +0.02 / -0.02 / -0.09 | +0.01 / -0.05 / -0.09 | -0.11 / -0.38 / -0.36 | **-0.01 / -0.17 / -0.33** |
| separation p50 0.5-1.0 s (yd) | 0.81 | 0.85 | 0.89 | 0.85 | **0.85** |
| released by 1.0 / 2.0 s, never | 43 / 60%, 37% | 30 / 44%, 51% | 46 / 62%, 35% | 55 / 73%, 25% | **42 / 62%, 35%** |
| clubs a second / clearing a hand within 0.25 s | | | | 1.52 / 54% | **1.26 / 35%** |
| hands' load before / 0.25 s after a club (N) | | | | 879 / 536 | **855 / 625** |
| hands on, share of rep: 2 / 1 / 0 | | | | 64 / 34 / 2% | **78 / 22 / 0%** |
| interior pressure, % of dropbacks (reported) | about 9.8 | 10.9 | 21.9 | 38.8 | **23.1** |
| sack proxy; alive at 3.0 s ending in one (reported) | 7; 12 | 5.4; 12.7 | 10.1; 18.0 | 15.1; 35.8 | **8.7; 19.8** |
| holding calls on pass plays (club-fight, 4 games) | | | | 0 of 365 | **2 of 366** |

The load at 0.1 s after a club now rises (855 -> 885 N): the force has not yet arrived (the approach). It has fallen by
0.25 s.

**Gates:**
1. The club's window: pass (the load falls once the force acts).
2. The orbit at 0.5-1.0 s: pass (20 against 25; 35 / 43 against 34 / 39 later).
3. The offset p25: pass, on the NFL's in every window.
4. **Release timing: pass** (42 / 62 / 35 against 43 / 60 / 37).

**What did it.** The approach, not the blocker's read.
- The blocker's answer: late 93%, unseen 6%, firm 3 of 2,031, away none (30 clubs met air, on hands already off at
  the onset).
- His sight delay (0.12-0.24 s) is as long as the arm's travel (0.11-0.19 s), so a reactive read almost never beats a
  club.
- What changed is that the force arrives after the travel, aimed at a hand that has had that time to move with the
  bodies. Clears fall from 54 to 35% of clubs, and the rate from 1.52 to 1.26 a second, with no cooldown.

**What the blocker still lacks** (for the later stages, not stage 1). His half as coached is anticipation and timing,
not reaction to an arm already moving. That is the set and the hands' rhythm:
- hands at chest height to invite the slap, then dropped and re-punched;
- a punch drawn back and re-thrown;
- independent hands, one held while the other strikes.

He can only act on a club before it starts if he acts on cues earlier than the arm. The rusher's set-up (his feet, his
shoulder, the near arm's position) or his own rhythm are what the coaching describes. Built from perceived cues, that
is the blocker's stage. The snatch-back is the same.

**Interior pressure is still high** (23.1% against base 10.9 and the NFL's about 9.8, with the release timing on the
NFL's). By Integration's rule that is the come-off, and stage 1 is done. The come-off is the next measured question:
the beaten blocker's ride, the next blocker's help, the QB's movement.

## 7. After the release: the come-off, measured (2026-11-15, Integration's questions; diagnosis only)

Operators, the same code on BDB 2022 (23,733 interior pairs) and our exports:
- `interior-comeoff.py`: pairs and release exactly as interior-fight.py; from the release to the throw: reach (within
  1.5 yd of the QB), path, what is near him at +0.3 / +0.5 s, and the QB's movement.
- `late-sacker.py`: the late sack by who made it.

Sim: seed 11 x 8 on the patch base, engine-67. Base, and FITTED_HANDS attempt 2 ("FH").

**1. Release to the QB.**

| | NFL | base | FH |
|---|---|---|---|
| interior pairs released | 63% | 49% | 65% |
| of released, reached the QB before the throw | **8%** | 10% | **15%** |
| reached, per pair | **4.8%** | 4.8% | **10.0%** |
| release to reach p25 / 50 / 75 | 0.9 / 1.4 / 2.3 s | 1.0 / 1.3 / 1.5 | 1.1 / 1.3 / 1.6 |
| path off his line to the QB over 0.5 s, p50; flattened past 45 deg | 40 deg; 45% | 39; 43% | 42; 44% |

The base reaches the QB per pair at the NFL's rate (it releases less, and more of its releases get there). FH releases
at the NFL's rate, and twice as many of its released rushers get there. The whole excess is after the release. The
path out of the release is the same; the NFL's reachers take longer (p75 2.3 s against 1.6).

**2. What stops a released NFL rusher.**

| | NFL | base | FH |
|---|---|---|---|
| blocker within 1.2 yd at +0.3 / +0.5 s | 48 / 37% | 39 / 32% | 45 / 30% |
| another OL within 1.0 yd by +0.5 s | 56% | 56% | 54% |
| a back within 1.0 yd | 2% | 5% | 7% |
| QB moved past 1.0 yd in 0.5 s | 44% | 34% | 37% |

Split by whether his blocker is still on him at +0.5 s:

| | NFL | base | FH |
|---|---|---|---|
| blocker still on (within 1.2 yd): reached | 12% | 13% | 14% |
| **blocker off (past 1.2 yd): reached** | **7%** | 12% | **22%** |
| blocker off: closing on the QB over 0.5 s, p50 | **-0.2 yd/s** | +0.2 | **+0.7** |
| blocker off, help came (60 / 60 / 53% of them): reached; closing | 7%; -0.1 | 7%; +0.2 | 16%; +0.2 |
| blocker off, no help: reached; closing | **8%; -0.4** | 20%; +0.5 | **28%; +1.0** |
| ... and the QB moved past 1 yd: reached; closing | **9%; -1.4** | 27%; -0.2 | **41%; +0.2** |
| ... and the QB still: reached; closing | 8%; +0.5 | 15%; +0.8 | 19%; +1.7 |
| blocker off: release to throw p50 | 1.4 s | 1.2 | 1.3 |

- A rusher still on his blocker reaches the QB at the NFL's rate in both arms.
- The excess is the rusher who has got off his blocker. The NFL's reaches the QB 7% of the time, ours 22%, with
  help as near (53 against 60%) and the same time to the throw.
- The NFL's off-blocker rusher on average does not close on the QB at all (-0.2 yd/s); ours does (+0.7).
- Two things carry it:
  - **The QB's movement escapes him in the NFL and not in ours.** With no help, a QB who moves takes the NFL's rusher
    off him (-1.4 yd/s; reached 9%). Ours keeps closing (+0.2) and reaches 41%: our QB's movement takes him along or
    toward the rusher.
  - **Help that arrives stops the NFL's rusher and only half-stops ours** (reached 7 against 16%, with help within
    a yard).
- Even unhelped against a still QB, ours closes faster (+1.7 against +0.5 yd/s).
- By count, the off-blocker class is all of the excess: reached, per pair, 7.3% in FH against the NFL's 1.9%, the
  5.2 points between FH and the NFL.

**3. Whether a release means the same thing.** The aggregates agree:

| | NFL | base | FH |
|---|---|---|---|
| fired by separation / by past-the-shoulder | 39 / 61% | 60 / 40% | 36 / 64% |
| separation at it, p50 | 1.08 yd | 1.20 | 1.02 |
| blocker at +0.3 s: clean (past 1.5) / at his hip (within 1.2) / between | 21 / 48 / 20% | 18 / 39 / 32% | 15 / 45 / 31% |

Fourteen each (`--examples 14`, the first in file order) read the same way.
- NFL: 9 by separation (1.20-1.35 yd, the blocker 1.2-1.8 yd at +0.3 s) and 5 past the shoulder (0.7-1.0 yd, the
  blocker 0.8-1.1).
- FH: 6 and 8, with the same distances.
- Clean runners (the blocker past 2 yd at +0.5 s): 3 in each. FH moved the release's character from the base's (separation, a clean break) to the NFL's
(past the shoulder, the blocker on his hip). The release gate did not pass on a label: the fight is not too decisive.
What is too decisive is what happens after it.

**4. The late sacks.** Of dropbacks alive at 3.0 s, ending with no forward pass behind the line, by the defender
nearest the QB at the end (`late-sacker.py`):

| | NFL | base | FH |
|---|---|---|---|
| alive at 3.0 s ending in a sack | 14.6% | 12.7% | 19.8% |
| by an interior DL | **4.1%** | 5.7% | **14.0%** |
| by an edge (other DL / LB) | **9.5%** | 6.6% | **5.8%** |

The FH excess is all interior, from (2): the off-blocker rusher who keeps closing on a moving QB. The NFL's late sacks
are mostly the edge's, and ours are short there in both arms. That is the late-sack gap the QB lane found (12 against
4% on engine-66), and the hand fight does not touch it.

**Edges.** The two-hand physics applies to every pass rep, but edge outcomes barely move (edge-rush.py, base -> FH):
- wide-aligned: past outside at 2.0 s 7 -> 12%, inside 6 -> 5%;
- very wide: 8 -> 8%, inside 1 -> 3%;
- by top speed: the fastest third past outside 18 -> 19%;
- edge pressure, % of dropbacks: past outside 1.1 -> 1.0, level / in front 5.3 -> 6.5, inside 8.2 -> 6.2.
The stand-up edge at the deeper launch is being read (tackle-set-side.mts, roster 11, both drops, base / FH).

**What follows** (Integration's two pieces, in this order on this evidence):
1. **The come-off**, first: it is where the excess is.
   - The QB's escape from a free interior rusher: his movement takes him toward or along the rusher in ours and away
     in the NFL's. That is the QB lane's controller, the same finding as the edge sack's step-up, from the other side.
   - The helper's pickup: as near as the NFL's, half as effective.
   - The rusher's closing speed when free.
   Each needs its own look on film before a build.
2. **The blocker's anticipation stage**: acting before the arm starts, from the rusher's set-up he can see. Section
   6's list, to be sourced.

## 8. The come-off on film (2026-11-15, Integration's three looks; diagnosis only)

**Population** (all rows below): the QB lane's (early-sack.py).
- NFL: PFF dropbacks, not designed movement, no play action, no spikes.
- Ours: no boot / roll / sprint / waggle / naked / screen or play-action concept.
- The section 7 numbers hold on it: the off-blocker rusher reaches the QB 9% of the time in the NFL (BDB 2022,
  17,027 interior pairs), 12% in the base and 21% under FH. Unhelped, with the QB moving: 13% (-0.4 yd/s) in the NFL
  against 41% (+0.5) under FH.

**Operators:**
- `comeoff-frames.py`: the same code on BDB and ours, every 0.1 s from the release to the throw (at most 2.0 s), on
  interior-comeoff.py's off-blocker cases.
- `comeoff-film.mts`: ours only; the internal state (the rusher's request against the true and the seen QB, whom he is
  engaged with, the helper's perception and engagement); seed 11 x 4.

**(a) The helper.**

| | NFL | base | FH |
|---|---|---|---|
| off-blocker rushers helped (an OL within 1.0 yd by +0.5 s) | 61% | 62% | 53% |
| reached, helped | **5%** | 7% | **13%** |
| helper's velocity toward him at first touch, p50 | -1.12 yd/s | -0.69 | -0.85 |
| helper's facing off the bearing to him | 17 deg (tracking 'o') | | 11 deg (internal) |
| helper held within 1.0 yd the whole next 0.5 s: all / of those who still reached | 70 / **63%** | 69 / 64% | 65 / **36%** |

- The NFL helper and ours arrive as near and as fast, and face him as square.
- The difference is what he holds. Of helped rushers who still reach the QB, the NFL's helper is still on him the whole
  0.5 s in 63% of cases (he is ridden home), ours in 36% (he is lost).
- Internal state (FH): when a helper is on him, the rusher's engagement is mostly the original block with the helper
  added (48% of frames) or a new block by the helper (20%). In 162 helped cases the helper took him as his own blocker
  29 times; he joined as a helper 88 times and never engaged 45 times.
- A helper on an engagement is a support joint (push 0.8 of his press x support, steer 0.4 of his arm), not a block.
  Under FH the original blocker's hands are often off, so the man is held by the weaker joint: the rusher moves at
  3.1 yd/s while engaged under FH, against 1.9 in the base.
- The helper's perception of him is accurate (error p50 0.19 yd) and timely. The gap is in what the pickup becomes,
  not in what he sees.

**(b) The free rusher** (frames with no OL within 1.0 yd of him):

| | NFL | base | FH |
|---|---|---|---|
| more than 3 yd from the QB: rusher speed / closing (yd/s) | 2.92 / -0.01 | 2.12 / +0.81 | 3.61 / +1.36 |
| ... the QB's speed / away from him | 2.24 / 1.13 | 1.00 / 0.00 | 1.41 / 0.40 |
| 1.5-3 yd: rusher speed / closing | **4.00** / 1.63 | 4.30 / 2.49 | **4.74** / 3.00 |
| ... the QB's speed / away | **3.16** / 0.98 | 1.50 / 0.54 | **1.00** / 0.37 |
| the last 0.6 s before a reach: rusher speed / closing | **3.91** / 3.19 | 5.00 / 3.56 | **5.22** / 4.28 |

- He aims at the QB as he sees him, and that picture is right: request off the seen QB p50 14 deg, off the true QB
  13; the seen QB's error p50 0.08 yd (pursuitPoint at 0.5 of the delay).
- Two differences:
  - most of the closing gap is the QB moving (c);
  - in the last yards ours runs in about 1.2 yd/s faster (5.2 against 3.9). The NFL's slows into the QB (breakdown to
    tackle under control, or re-finding a QB who has moved); ours runs through at speed.

**(c) The QB.**
- In the last 0.6 s before a free rusher reaches him, the NFL QB moves at 2.0 yd/s, mostly up and across (up +0.5,
  away 0.06): the step-up and slide. Ours stands: 0.7 yd/s (base 1.4), up 0.0.
- At 1.5-3 yd from a free interior rusher: the NFL QB moves at 3.2 yd/s, ours at 1.0.
- What he could have seen: an interior rusher in front of him, 1.5-3 yd away and closing at 3-4 yd/s, inside his view
  of the field, for 0.3-0.6 s before the reach.
- That is the QB lane's controller: the same finding as no step-up from the deeper set.
- Play ids, ours, off the blocker, unhelped, reached:
  - FH (48): S11-P35, S11-P74, S11-P88, S11-P93, S11-P96, S11-P115, S11-P123, S11-P134, S12-P12, S12-P18;
  - base (24): S11-P81, S11-P158, S12-P88, S12-P108, S13-P37, S13-P75, S13-P91, S13-P119, S14-P60, S14-P84, S14-P136,
    S14-P168.

**Which carries it.** Of FH's 12-point excess in off-blocker reach (21 against 9%):
- helped (13 against 5%, on 53% of them): about 4 points;
- unhelped (25 against 11%, on 47%): about 7 points. The QB's standing carries most of this; the rusher's speed into
  him adds to it.
So (c) first by size, then (a), then (b). (a) and (b) are mine; (c) is the QB lane's.

**The stand-up edge at the deeper launch** (tackle-set-side.mts, roster 11, the twelve changed concepts, 576
matchups an arm; engine-67 patch base): sacks by the strong-side stand-up edge are 33 shallow / 13 deeper in the base
and 12 / 7 under FH.
- On engine-66 without the patch it was 27 / 62. The deeper-launch excess is gone on this base before the hand fight.
- Which of the patch (ENGAGE_TRUNK + CHEST_SHOULDERS) and engine-67 (VERTS_QUICK and the rest) took it is not read.
- FH lowers both: the interior gets there first.

## 9. Integration's rulings on section 8 (2026-11-15)

**The stand-up edge's deeper-launch excess: which change took it.** tackle-set-side.mts, roster 11, the twelve
changed concepts, 576 matchups an arm. Sacks by the strong-side stand-up edge, shallow / deeper:

| arm | shallow | deeper | QB depth at 3.0 s, shallow / deeper |
|---|---|---|---|
| engine-66, no patch (section 5 of the tackle-set review) | 27 | 62 | 5.84 / 6.84 |
| engine-67, no patch | 28 | 62 | 5.76 / 6.84 |
| engine-67 + patch, VERTS_QUICK off | 46 | 26 | 5.94 / 6.67 |
| engine-67 + patch | 33 | 13 | 5.77 / 6.65 |

- **The patch (ENGAGE_TRUNK + CHEST_SHOULDERS) takes it**: deeper 62 -> 13 on engine-67. VERTS_QUICK alone does not
  move it (62 -> 62 without the patch).
- Off the patch, the deeper launch's sacks came across the concepts (comebacks 10, trips_outs 9, verts_hitch 7, ...).
  With it they are only on the verticals and comebacks.
- **The QB's step-up fault is still there underneath.** At 3.0 s the deeper QB is still 0.9 yd deeper than the
  shallow one (6.65 against 5.77) in every arm. The patch's tackle, holding his hips on the set, keeps the edge off him;
  the QB has not changed.
- This is a row for the patch's card.

**(b), Integration's split: does the NFL rusher gather against a QB who is standing?** comeoff-frames.py, the QB
lane's population, off-blocker cases:

| rusher speed p25 / 50 / 75 (yd/s), QB still (< 0.5 yd/s) | NFL | base | FH |
|---|---|---|---|
| the last 0.6 s before a reach | 3.35 / **4.12** / 4.61 | 4.50 / 5.15 / 5.59 | 4.74 / **5.22** / 5.59 |
| free, 1.5-3 yd from the QB | 2.55 / **3.81** / 4.50 | 2.06 / 5.00 / 5.59 | 4.27 / **5.00** / 5.41 |
| ... QB moving (> 1.5 yd/s), last 0.6 s | 2.83 / 3.91 / 5.00 | 4.47 / 5.02 / 5.59 | 4.92 / 5.15 / 5.70 |

The NFL's rusher gathers even against a QB who is standing: 4.1 yd/s into a still QB against our 5.2. That is not an
effect of (c), so (b) is its own build: his approach as a tackler's, his response to what the QB he sees can do, from
the tackle approach's law, not a speed bound near a QB. Our p75 sits at 5.59 in every row, a capacity ceiling the
NFL's p75 (4.5-5.0) does not reach.

**(a) the pass-off: built** (`PASS_OFF`, off, e346168e).
- Found in the code: `beat()` disengaged the whole engagement when the primary was beaten, helper included. A helper
  with his hands on the man lost him at that instant. That is the 36% against 63%.
- The build: when a helper's hands are on him (his joint loaded last step: touch), the helper keeps him as his own block
  on his own joint, a fresh fight. The beaten blocker leaves the rep with the ordinary 0.6 s shed window; then his own
  blocking decides whether he recovers to double or finds work.
- **Why 45 of 162 helped rushers were never engaged by the nearest OL:**
  - 20 were blocking their own man;
  - 25 were free but faced away (55 deg p50 off the bearing to the rusher), 20 of the 45 tackles looking outside;
  - none was out of reach (within 1.0 yd for 8 frames p50).
  The pass-off does not touch these. Whether the free ones should have turned to him is the "looking for work"
  question: whom a free blocker watches and when.

Noted, not built (Integration, 2026-11-15): the 25 free helpers facing away. As coached, a free lineman looks for work
inside-out and helps the nearest threat. Whom a free blocker watches and when is its own question.

## 10. PASS_OFF read (2026-11-15; seed 11 x 8, engine-67 patch base; the QB lane's population for the come-off rows)

**Attempt 1** (e346168e: the hand-off only at `beat()`) barely fired: 3 hand-offs against 82 sheds in 2 games.
- FH: helped off-blocker reach 16 -> 15%, interior pressure 23.1 -> 23.6%.
- Base: helped reach 7 -> 4%.
- Most FH rushers who reach the QB are never beaten in the code: they are still in the first man's rep at arm's length.

**Attempt 2** (a9b509f2) adds the coached cue: the helper takes him when he sees him come off the blocker he is
helping (his view cone, his sight delay: beyond the blocker's working reach or past his shoulder). 160 hand-offs in 2
games. Off identical (7c0603676f346494); the dither budget passes with it on.

| | NFL | base | base + PASS_OFF | FH | **FH + PASS_OFF** |
|---|---|---|---|---|---|
| off-blocker rushers reaching the QB | 9% | 12% | 12% | 21% | **12%** |
| ... helped: reached | 5% | 7% | 8% | 16% | **7%** |
| ... unhelped: reached | 11% | 20% | 16% | 25% | **19%** |
| helped rushers who still reached: helper on him the whole 0.5 s | 63% | 64% | 58% | 36% | **65%** |
| released by 1.0 / 2.0 s, never | 43 / 60 / 37% | 30 / 44 / 51% | 32 / 48 / 47% | 42 / 62 / 35% | 42 / 65 / 32% |
| orbit p50 0.5-1.0 s | 25 deg | 7 | 7 | 20 | 18 |
| interior pressure, % of dropbacks | about 9.8 | 10.9 | 11.9 | 23.1 | **19.0** |
| edge pressure: past outside / level / inside | | 1.1 / 5.3 / 8.2 | 0.6 / 5.7 / 5.2 | 1.0 / 6.5 / 6.2 | 1.6 / 5.1 / **8.3** |
| other pressure | | 5.0 | 6.4 | 7.2 | 5.6 |
| sack proxy | 7 | 5.4 | 5.2 | 8.7 | 9.1 |
| alive at 3 s ending in a sack: interior / edge | 4.1 / 9.5% | 5.7 / 6.6 | 6.5 / 3.0 | 14.0 / 5.8 | **10.2 / 8.5** |

**Read:**
- **Under FH the pass-off does (a)'s job.** Helped reach is at the NFL's (7 against 5%), and so is the helper's hold
  (65 against 63%). Off-blocker reach falls most of the way (21 -> 12 against 9).
- The residual is the unhelped rusher (19 against 11%): (b) his finish, then (c) the QB.
- **The cost shows, as Integration asked:**
  - The helper who takes the interior man leaves the edge's inside. Edge pressure from inside the tackle rises
    6.2 -> 8.3% of dropbacks, and late edge sacks 5.8 -> 8.5% of those alive at 3 s, toward the NFL's 9.5.
  - Late interior sacks fall 14.0 -> 10.2 (NFL 4.1).
  - The sack proxy is unchanged (8.7 -> 9.1).
  - The pressure moves from the interior to the edge rather than going away.
- **On the base it changes little.** The base's releases are clean breaks, not men coming off a helped block: helped
  reach 7 -> 8%.
- The release timing barely moves under FH (never 35 -> 32%). The hand-off continues reps that would have counted
  as a release.

## 11. RUSH_GATHER attempt 1 read (2026-11-15; seed 11 x 8, engine-67 patch base; QB lane's population)

`RUSH_GATHER` (800c6da8): the free pass rusher finishes on the QB with chase()'s close gather (gatheringApproach)
from his picture of the QB, his braking and his tackling's arrival speed. Off identical.

| | NFL | base | base + RG | FH + PO | FH + PO + RG |
|---|---|---|---|---|---|
| rusher speed, last 0.6 s before a reach, QB still: p50 | **4.12** | 5.15 | 5.00 | 5.41 | **4.74** |
| free 1.5-3 yd from a still QB: p50 | 3.81 | 5.00 | 3.00 | 5.39 | 4.72 |
| off-blocker reach | 9% | 12% | 12% | 12% | **18%** |
| ... helped / unhelped | 5 / 11% | 7 / 20% | 7 / 22% | 7 / 19% | 12 / 27% |
| after a reach: distance at +0.3 s p50; time within 1.5 yd; thrown | 0.82 yd; 0.5 s; 35% | 0.64; 0.3; 71% | 0.57; 0.3; 66% | 0.85; 0.3; 52% | 0.58; 0.3; 65% |
| interior pressure, % of dropbacks | about 9.8 | 10.9 | 13.9 | 19.0 | 20.6 |
| sack proxy; sacked per pressure | 7; | 5.4; 18.3% | 4.6; 15.7% | 9.1; 23.6% | **7.0; 20.5%** |
| alive at 3 s ending in a sack: interior / edge | 4.1 / 9.5 | 5.7 / 6.6 | 3.8 / 7.1 | 10.2 / 8.5 | 11.3 / 3.9 |

**Read:**
- **The finish moves toward the NFL's.** At a still QB in the last 0.6 s: 5.41 -> 4.74 yd/s against 4.12.
- Sacks fall (9.1 -> 7.0; per pressure 23.6 -> 20.5%), and the QB gets the ball out more often once reached (52 -> 65%
  thrown).
- **It is not a hover.** After a reach the gathered rusher is as close (0.58 yd at +0.3 s) and no longer within
  1.5 yd than before.
- **The adverse result:** more off-blocker rushers reach 1.5 yd (12 -> 18% under FH + PO; unchanged on the base),
  helped and unhelped alike, and interior pressure rises 19.0 -> 20.6.
  - Not yet explained.
  - A candidate in the law as ported: chase()'s gather aims at the seen QB's position (the goal is his picture,
    offset 0), while the sprint it blends into aims at pursuitPoint's intercept. A rusher gathering at 2.5 yd plus
    his stopping distance turns from the intercept toward where the QB is, which may take him around a helper's
    line rather than through it.
  - Needs its own look (the gather onset's position against the helper and the QB, the reached against the not)
    before an attempt 2.
- Not for the card yet. FITTED_HANDS + PASS_OFF go as a patch without it.

## 12. RUSH_GATHER attempt 2, and stop (2026-11-15)

**Attempt 1's adverse row, on film** (comeoff-film.mts, FH + PO with and without RG, seed 11 x 4, off-blocker cases):
- The rusher's request points more straight at the QB (13 -> 10 deg off the true QB).
- He closes faster though he runs slower (closing p50 1.78 -> 2.68 yd/s, speed 4.24 -> 4.06).
- He is free more often in helped cases (11 -> 18% of frames), and the helper takes him less (46 -> 40%).
- Cause: chase()'s gather begins at contact plus his stopping distance (about 4-4.5 yd, so near the release) and aims
  its arrival at the QB's seen spot. Blended into his sprint, it re-aimed him off his intercept line, around the helper.

**Integration's second check: reach against contact and outcome.**
- After a reach, attempt 1's rusher was as close to the QB (0.58 yd at +0.3 s) for as long (0.3 s) as before.
- The ball came out more often (52 -> 65% thrown) and sacks fell (9.1 -> 7.0).
- So the extra reaches were real arrivals, not a slower man hovering at 1.5 yd. They ended in throws more often than
  sacks.

**Attempt 2** (4b934202): the gather sets his speed only, on his own line (the sprint's direction).

| | NFL | base | base + RG2 | FH + PO | FH + PO + RG1 | FH + PO + RG2 |
|---|---|---|---|---|---|---|
| rusher speed, last 0.6 s, QB still: p50 | 4.12 | 5.15 | 5.00 | 5.41 | 4.74 | **4.92** |
| off-blocker reach | 9% | 12% | 10% | 12% | 18% | **16%** |
| ... helped / unhelped | 5 / 11 | 7 / 20 | 6 / 16 | 7 / 19 | 12 / 27 | 10 / 24 |
| after a reach: thrown | 35% | 71% | 71% | 52% | 65% | 53% |
| interior pressure | about 9.8 | 10.9 | 12.1 | 19.0 | 20.6 | **22.6** |
| sack proxy | 7 | 5.4 | 4.8 | 9.1 | 7.0 | 8.8 |
| alive at 3 s ending in a sack: interior / edge | 4.1 / 9.5 | 5.7 / 6.6 | 4.7 / 4.3 | 10.2 / 8.5 | 11.3 / 3.9 | 14.7 / 6.8 |

**Attempt 2 fails.**
- Under FH + PO the finish barely moves toward the NFL's (4.92 against 4.12).
- Off-blocker reach still rises (16 against 12), and so do interior pressure (22.6) and late interior sacks (14.7).
- On the base it is close to neutral.

**Two attempts: stopped. RUSH_GATHER stays off and is parked.** What to re-diagnose before any third idea:
- Both versions raise reach under FH + PO. A rusher who slows near the QB is reached by the 1.5 yd operator no less
  often, and the helper does not get him back either way. The arrival speed may not be the variable that matters.
- Our free rusher's speed sits near his capacity (p75 5.6-5.8 yd/s in every arm), where the NFL's p75 is 4.5-5.0 even
  against a moving QB. That may be a capability (top speed or acceleration out of a fight), not a choice.
  - The next look: the free interior rusher's speed against his own vmax by time since release, NFL against ours.
  - Is ours faster everywhere after the release, or only into the QB?
  - That separates a capacity read from a controller one.

## 13. The blocker's anticipation stage: design for Integration's read (2026-11-15; not built)

**What the measurement says it must do.** Under FITTED_HANDS attempt 2 the blocker's read of a club came late 93% of
the time: his sight delay (0.12-0.24 s) is as long as the arm's travel to his wrist (0.11-0.19 s). Reacting to an
arm already swinging cannot work, and the coaching does not ask him to. It asks him to act on what comes before the
swing, and on his own rhythm.

**How it is taught** (sources below):
- **The rusher's move needs his hands and feet in sync.** "Rushers succeed when they are able to sync their hands and
  feet together during their chosen pass-rush move." The blocker's tools work on that sync.
  - **Bait (flash):** a hand flashed at the rusher early in the rep draws his move before he is ready; the move then
    misses or shows itself, and the blocker sits on what is left (Lane Johnson against a cross-chop).
  - **Alternate hands:** inside strike, outside strike, alternated, "keeps rushers guessing and off-balance".
  - (USA Football, the art of the strike.)
- **Point and counterpoint hands.** The inside hand is the point hand on the inside shoulder. The outside hand is the
  counterpoint: "the counter point hand is going to counter any moves by DL to get his hands off of you". Strong with
  the inside hand, soft with the outside. (McNally clinic notes.)
- **Set the hands to invite, then re-punch.** Hands at chest height to invite the slap-down, then dropped to the waist
  as he comes, and re-punched. Or punch to half extension, draw back, and re-punch. Patience on the punch: do not lean
  on the hands, head back. (X&O Labs; Coaches Insider.)
- **Snatch-and-trap is keyed on what he sees of the rusher's weight.**
  - It works on a rusher whose weight is too far forward on an arm (a long-arm or bull thrown without the feet), "ideally
    deployed prior to contact being established".
  - It needs "quick mental processing skills to key and diagnose when these moves are coming".
  - Swiping that arm away takes his support: "a sudden, abrupt collapse". (USA Football, snatch-and-trap.)

**The cue that comes before the swing, and is observable.** A club starts from a cocked arm: the rusher's near hand
comes off the blocker and draws back before it sweeps. In ours that state exists (the arm away on its return, then
ready: `handsBackAt`) but no one can see it.

**Proposed build** (`BLOCK_ANTICIPATE`, off; on FITTED_HANDS):
1. **The rusher's near arm is an observable.** Each tick the perception record holds its state: on the blocker /
   drawn back / sweeping. Others perceive it at their sight delay, as any body state. No new information: it is his
   arm, in view.
2. **The blocker's answers to a cocked arm he sees**, chosen by what he has time for (no roll):
   - firm the counterpoint hand on that side (OPEN_HANDS' cloth, attempt 2's firm, visible to the holding detector),
     held while the arm is away;
   - or re-punch the side the cocked arm has opened (his chest is open while his arm is back): a strike that lands with
     his placement error, at the cost of the reach (his arm extended, late back to bent);
   - or nothing, if he sees it late.
3. **His own rhythm (bait)**, the coached flash: a hand flashed at the rusher's face early in the rep. Our rusher's
   club is keyed on his own felt cue (a hand on him, his arm back), so a flash that leaves his chest light for a moment
   draws the club early into a hand that is not there. That is the club through air, already costed (double return,
   balance).
   - Whether and when he flashes is the blocker's decision from his own state. That needs its own care: a timer would
     be the convenient-timer rule broken.
   - Proposed: offered after 1-2 have read, not with them.
4. **Snatch-and-trap** stays for the long-arm / bull stage (stage 3), keyed on the rusher's lean, which the support
   model has.

**The rusher's side** stays as built. His answer to a blocker who firms against his cocked arm is his choice of when to
club. That is the between-moves question (task 13), not this stage.

**Gates, written before building:**
1. The blocker's answers: in time on a material share of clubs (today 0.1%), by what he saw.
2. Club clearing rate falls from 35% for the clubs he answered, and not for the ones he did not.
3. The orbit at 0.5-1.0 s and the release timing kept near the NFL's (20 deg, 42 / 62 / 35%).
4. Reported: interior pressure, off-blocker reach, holding calls (the firm's cloth), sacks.

**Order and cost.** The arm observable is the larger piece (perception record, a field per rusher); the answers reuse
attempt 2's firm and the existing strike. One stage, two attempts at its game read, as before.

**Sources:**
- [USA Football: the art of the strike](https://blogs.usafootball.com/blog/6283/the-art-of-the-strike-3-techniques-offensive-linemen-can-use-to-fend-off-pass-rushers)
- [USA Football: snatch-and-trap](https://blogs.usafootball.com/blog/6349/how-nfl-offensive-linemen-use-the-snatch-and-trap-technique-to-stop-pass-rushers)
- [Jim McNally pass / run clinic notes](https://www.scribd.com/doc/305124327/Jim-McNally-Pass-Run-Clinic-Notes)
- [X&O Labs: 4 ways to improve pass protection](https://www.xandolabs.com/?p=6437)
- [Coaches Insider: the elements of pass protection](https://coachesinsider.com/football/the-elements-of-pass-protection-article/)

These are coaching blogs and clinic notes, not one authority.

## 14. Capacity or choice: the free rusher's speed out of the fight (2026-11-15; comeoff-frames.py, QB lane's population)

Free frames (no OL within 1.0 yd) of off-blocker interior rushers, speed p50 / p75 (yd/s):

| | NFL | base | FH + PO |
|---|---|---|---|
| 0.1-0.5 s after the release | 2.55 / 3.54 | 2.24 / 2.92 | **3.64 / 4.50** |
| 0.5-1.0 s | 3.00 / 4.00 | 2.50 / 3.54 | **3.54 / 4.61** |
| 1.0-1.5 s | 3.16 / 4.47 | 2.50 / 3.35 | 4.03 / 4.92 |
| 1.5-2.1 s | 3.54 / 5.00 | 1.80 / 2.55 | 3.54 / 4.30 |
| 2-3 yd from the QB | 4.00 / 4.92 | 4.30 / 5.39 | 4.92 / 5.59 |
| 3-5 yd | 3.16 / 4.12 | 2.06 / 3.54 | **4.12 / 4.72** |
| 5-7 yd | 2.55 / 3.54 | 2.12 / 2.55 | **3.20 / 3.64** |

**Read:**
- **Under FH the rusher leaves the fight about 1 yd/s faster than the NFL's** (3.64 against 2.55 in the first 0.5 s)
  and stays faster all the way in. It is not a finish chosen near the QB, so a gather could not fix it (section 12).
- **Nor is it a top-speed capacity.** The base, with the same bodies, leaves the fight slower than the NFL's (2.24).
- **It is the fight's exit speed under the new hands.** While the press comes and goes, the rusher's request in the
  rep stays at his rush pace (0.8 of vmax, stepPassRep). Each time a hand comes off he converts that request into speed
  at once: engaged FH rushers already move at 3.1 yd/s against the base's 1.9 (section 8).
- An NFL rusher fighting hands is not running at 80% of his top speed while he fights: his feet and hands are synced
  to the move ("rushers succeed when they sync their hands and feet").
- **So the next piece is the rusher's request during the fight: his feet in the move.** That is the between-moves
  intent (task 13) and the rush's pace while his hands work. Measure first: the NFL's engaged interior rusher's speed
  (pairs within 1.2 yd, interior-fight's pairs) against ours by time since contact, base and FH.

**The engaged rusher's speed** (interior-fight.py's pairs, frames within 1.2 yd), p50 / p75 by time since contact:

| | 0-0.5 s | 0.5-1.0 s | 1.0-1.5 s | 1.5-2.5 s |
|---|---|---|---|---|
| NFL | 2.55 / 3.20 | 2.50 / 3.16 | 2.06 / 2.92 | **1.80 / 2.69** |
| base | 2.00 / 2.55 | 1.58 / 2.24 | 2.06 / 2.69 | 2.06 / 2.69 |
| FH | 2.12 / 2.69 | 2.12 / 2.92 | 2.83 / 3.54 | 2.69 / 3.64 |
| FH + PO | 2.24 / 2.83 | 2.24 / 2.92 | 2.92 / 3.61 | **3.20 / 4.00** |

- The NFL's engaged rusher is fastest at contact and slows as the rep goes on (2.55 -> 1.80): the fight stalls him.
- Ours starts slower (2.1-2.2) and speeds up through the rep under FH (to 2.9-3.2 after 1.0 s): the engaged rusher is
  moving, not stalled, as the press comes and goes.
- So the gap is in the late fight. An engaged NFL rusher who has not won by 1 s is held nearly in place. Ours, with a
  hand off half the time, runs around the blocker at his rush pace. That is where his speed out of the release comes
  from.
