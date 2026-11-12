# The wrap at speed: what our physics does after a side or rear wrap (2026-11-12)

## Parked (2026-11-12): read this first

**Status: parked by Integration.** None of HOLD_SINK, HANG_AIRBORNE or HANG_GRIP is a candidate. All three are off on
develop and on this branch. The benches and tools are kept for picking this up later.

**Why parked.** Defense decomposed the short-catch YAC excess (3.9 yd over the NFL):
- about 2.0 yd from plays where no defender ever gets within 1.5 yd;
- 1.0 yd before the first arrival;
- 0.9 yd after a defender is on him.

The finish is under a quarter of it. Pursuit angle (FRONT_ANGLE) is the larger lever, so the grip question waits until
that lands.

**Established:**
- Fast side and rear wraps give up about twice the NFL's yards after contact (Coverage's `finish_split.py` cells).
- The holder does commit and go to the ground (census).
- While airborne, his weight was only half-counted on the hold. HANG_AIRBORNE (all of it while airborne) is right in
  physics.
- A closed leg wrap arrests at the ankle and binds the stride (HANG_GRIP attempt 2), as statics says.
- The fall itself is fine: the toppling bench (`fall-bench.mts`) and the tracking measure (`fall-end.py`) both say so.
- The holder's post-grasp intent (HOLD_SINK) changes nothing for chasers already at speed, who are most of the fast
  cells.

**What blocks it: the grip capacity law.**
- It was set for a horizontal tear by a standing holder. Off his feet it gives about half the holder's body weight
  (two hands on the jersey ≈ 0.75 W, × 0.7 off his feet).
- A fit athlete can dead-hang his own body weight.
- So routing a hanging load through it tears open grips that used to hold until help arrived: broke 6–7% → 10–11%
  (attempt 1: 24%), with after-contact yards no better.

**The next question (diagnosis only, when picked up):** dead-hang and tear capacity by grip type (cloth, round a
limb, locked wrap) against body weight; what the current law gives; every place the law is used.

**Why each flag is not a candidate:**
- HOLD_SINK (the holder's post-grasp intent): the fixtures pass, but the game cells do not move, because chasers are
  already above the target it caps.
- HANG_AIRBORNE (all of an airborne holder's weight on the hold): correct physics, but the load bypasses the grip, so
  a loose grab binds as well as a locked wrap.
- HANG_GRIP (the hanging load through the grip; attempt 2, ankle arrest for closed wraps): it tears open grips, for
  the capacity reason above.

**Benches and tools:**
- `side-wrap-bench.mts`, `fall-bench.mts`, `hang-bench.mts`;
- `finish-trace.mts` (census, the holder's fall, tears);
- `pass-operators/fall-end.py`.

Status: a diagnosis. Nothing is built.

Question (Integration, from Coverage's `2026-11-12-finish-after-contact.md`): in the fast cells our completions give
up about 2× the NFL's yards after first contact and stay up about 1.4× as long. Which of the three things a real wrap
does does our physics do?
1. Add the tackler's mass to the carrier at once.
2. Take away his stride.
3. Pull his base out from under him.

## Tools

- `scripts/diag/effective-mass/finish-trace.mts`. Every completion's first grasp on the catcher, kept when it is
  from the side or behind with the carrier or the holder at 4+ yd/s. It traces, from the grasp:
  - the carrier's speed along his heading;
  - what momentum sharing alone would leave the pair at;
  - the grip force;
  - each body's ground force (the World's step report);
  - the pair's momentum change;
  - the holder's request and his balance deviation;
  - the stride bound and support states.
- Sample: develop 61fe0c99 (engine-34), seed 101, 8 games. 60 wraps kept; 34 are in Coverage's fast cells:
  - behind, holder > 6: 13;
  - side, carrier > 6: 13;
  - side, holder 4–6: 7;
  - behind, carrier > 6: 1.
- `scripts/diag/effective-mass/drag-bench.mts`: the World alone, a rear wrap at 6.5 yd/s. It now takes
  `HOLDER_POSTURE`.

## Findings, fast cells (n = 34, medians)

**1. Mass added at once: partly, and not where it should be.**
- Where it works: in a side form wrap the momentum share happens at contact. One example went 6.2 → 3.2 yd/s in
  0.3 s against a share of 2.9.
- Over all 34: by +0.25 s the carrier has lost 0.93 yd/s, against the 1.41 a momentum share predicts (two-thirds).
- **Over the first 0.3 s the pair's momentum along his heading rises.** The ground force on the pair is +207
  kg·yd/s², about +0.11 g.
- The cause is the holder. His own ground force over the first 0.3 s is +209: +256 from the side, +74 from behind.
  He asks to plant: his request is a median 2.8 yd/s while he moves at 5.5, and he asks below his speed on 22/34.
- In 15/34 the grip pulls his centre of mass 0.3+ yd ahead of his base along the carrier's path (peak deviation p75
  0.51 yd).
  - His recovery steps then drive him forward at +449 for 0.3 s, then only −95 over the next 0.5 s.
  - Traces show +1,000 for the first 0.15–0.25 s.
  - Some fall at about 0.45 s and slide along without traction.
- The other 19 brake: −44, then −468, about 0.5 g of the holder's weight. That is still a gentle stop for a
  190 kg pair.
- His requested posture is 0.6 in every hold.
- **A low, wide base is not the repair.** On the World bench a rear wrap ends the same with the holder at posture
  0.6 or 1.0: trips at 0.55 / 0.90 s and 3.95–5.44 yd, in both.

**2. Stride taken away: no, not by one holder.**
- The carrier's own ground force stays positive: +78 over the first 0.3 s, +31 over 0.3–0.8 s. He keeps asking for
  his full speed (7–10 yd/s).
- Under SWING_STRIP the stride is bound only when the hold's moment (grip capacity × leg share × lever) reaches his
  hip torque. One holder's grip (capacity p50 990) rarely does.
- The stride bound appears in 20/34 plays, usually once a second holder or a hanging leg hold arrives.
- On the World bench (rear wrap, legs 0.8, lock 0.56): grip −0.62 g, holder's feet −0.57 g, runner still +0.15 g,
  stride bound 0 throughout.

**3. Base pulled out: late.**
- The carrier is still up 0.3 s after the wrap in 26/34.
- 18/34 have a second holder before the end; most go down then.
- On the bench a rear wrap trips him at 0.55–0.90 s. He then keeps 4.3–4.5 yd/s through the fall, with no ground
  force on him while falling, so the fall itself carries him about 2 yd.

Time from the wrap to the end: 1.2–1.55 s. Yards after the wrap: 2.3–5.0 by cell. Against the NFL's 0.7–0.8 s and
1.5–2.5 yd.

## What our physics does and doesn't do

| A real side or rear wrap | Ours |
|---|---|
| shares momentum at once (speed drops by the mass ratio) | at the moment of contact in a form wrap, yes. A trailing or reaching holder doesn't anchor: in 15/34 the pull tips him forward and his recovery steps run him along with the carrier, so the pair speeds up for 0.3 s |
| takes away the stride | no. One holder's moment is below the carrier's hip torque, so the bound is 0 and he drives at +0.1 g |
| pulls the base out | late: when a second man arrives, or on the bench at 0.55–0.9 s, after which the fall carries about 2 yd at full pace |

## Proposals (none built; diagnosis first per the rule, one at a time)

1. **Why the holder is tipped forward rather than braced.**
   - Bench a holder at rest grabbed from the side by a 90 kg runner at 6 yd/s, in the World alone.
   - Trace where the grip's pull acts on him (arm height against his centre of mass) and what his support does: lean,
     recovery step, fall.
   - Posture alone doesn't change it, so the question is the pull's line and the support model's response.
   - Done right, it makes momentum sharing happen at once in all wraps.
2. **The stride under a closed wrap of both legs.**
   - Today the stride is bound by a torque comparison only.
   - Arms locked around both thighs constrain the legs' separation geometrically, however strong the hip is: a
     kinematic constraint, not a "tackle succeeds" roll. The carrier can still tear it by breaking the grip.
   - Needs a bench first, and an NFL check on legs-wrapped finishes.
3. **The fall's carry.** Check that a tripped carrier's forward travel during the fall is the physics of a pitching
   body: centre of mass moving on, then pad and turf friction. On the bench he carries about 2 yd at full pace.

Coverage's cells say both duration and yards per second are too high. (1) addresses the early speed; (2) and (3)
address the duration.

## Proposal 1, diagnosed: what the holder asks for after the grasp

Tool: `scripts/diag/effective-mass/side-wrap-bench.mts`, the World alone. A 92 kg runner at 6 yd/s; an 84 kg holder
beside him at rest; grasp legs 0.5, lock 0.75 (games' capacity law, 999).

| holder asks | his feet, first 0.3 s | his balance deviation along the path | runner at 0.3 s | runner trips | runner travel |
|---|---|---|---|---|---|
| stop (vel 0, push 1, posture 0.6) | −0.5 to −0.7 g | −0.02 to −0.14 yd: he leans back into the load | 3.9 yd/s | 0.50 s | 2.5 yd |
| the runner's velocity (run with him) | +0.4 to +0.8 g | +0.17 yd | 4.3 yd/s | 0.85 s, still 2.8 yd/s falling | 3.7 yd |

The physics anchors him when he asks to stop. A side wrap then ends in 2.5 yd and 0.5 s (NFL side cells: 1.5–2.5 yd in
0.8 s). The grip's pull acts at his hands' height on the carrier, below his centre of mass, so it does not pitch him
forward. What tips him is the linear pull on a body whose feet are still running.

In games (34 fast wraps), over the first 0.3 s he asks for a median 55% of the carrier's speed along the carrier's
path (p25 0.36, p75 0.71):

| request | n | his feet | pair force | yards after the wrap |
|---|---|---|---|---|
| ≥ 70% (runs with him) | 9 | +328 | +489 | 6.1 |
| 35–70% | 18 | −42 | −10 | 3.1 |
| < 35% | 7 | +227 (already pulled 0.31 yd off his base) | +181 | 3.9 |

The source is in `src/sim/tackle.ts` (`updateBond`, HOLD_FINISH): his request along the runner's path is
speed × (1 − commit). `commit` is his grip security, `next`, which ramps from the acquired quality, and it is 0 while
the grip slips. So early in the wrap, when the load arrives, he mostly keeps running with the man. He anchors only as
the grip firms, by which time the pull has often taken him off his base.

Proposed repair (not built): the holder's post-grasp intent, as coached ("sink and drag").
- Once he has a hold that is not slipping, he stops running with the man. He asks to stop along the runner's path and
  leans against the load. His execution comes from his own tackling skill (how fast he commits) and strength, not
  from the grip-security ramp.
- While the grip slips he still gives with it (the existing rule).
- The World decides whether the grip survives the load. A weak grip that anchors is torn off: a broken tackle, the
  carrier free to drive through.
- No new force, no outcome cap.
- Gates: Coverage's fast cells against the NFL's 0.9–2.5 yd in 0.7–0.8 s; the slow cells stay matched; the run-game
  fixed set is the control.

## HOLD_SINK: two attempts, not repaired (2026-11-12): stopped for re-diagnosis

Flag `HOLD_SINK`, off. With it off the engine is bit-identical. Read: `finish-trace.mts`, seed 101, 8 games, fast cells.

| | off | attempt 1 | attempt 2 |
|---|---|---|---|
| what he asks for along the path, first 0.3 s (share of the carrier's speed) | 0.55 | 0.67 | 0.54 |
| his feet, first 0.3 s (kg·yd/s²) | +209 | +205 | +203 |
| his feet, 0.3–0.8 s | −121 | −193 | −198 |
| pair force, first 0.3 s | +207 | +288 | +325 |
| grips torn within 0.5 s | 2 / 34 | 5 / 38 | 8 / 38 |
| second holder before the end | 18 / 34 | 17 / 38 | 17 / 38 |
| wrap to end, p50 | 1.42 s | 0.90 s | 1.17 s |
| yards after the wrap, p50 | 3.8 | 3.4 | 4.0 |

The two attempts:
1. Once his hands have held for his reaction time × (1.5 − tackling), he commits max(0.6 + 0.4 tackling, grip
   security).
2. Sunk, he asks along the path for at most his own speed less his commitment, never to keep up.

An earlier version ramped commitment from 0 and committed less than HOLD_FINISH early on. It was replaced before
attempt 1 was read.

Why neither repairs it: the forward drive happens in the first 0.15–0.25 s.
- A debug trace of the first side wrap shows HOLD_FINISH's request: the carrier's speed × (1 − grip security).
- For a holder who grabbed from rest beside the runner, that is a request to accelerate forward to about 1.3–2.2
  yd/s.
- His legs deliver it while the grip also pulls him forward.
- The "knows he has him" delay covers that window, so the old request still rules exactly when the load arrives.
- Later he brakes harder, and more grips tear.

The bench's "stop" holder plants from the grasp: no delay, and no request to run.

Re-diagnosis question for Integration:
- Is not running with the man part of the hold itself? A man who has his arms on someone does not sprint to keep up
  with him; that needs no decision.
- Is only the full sink a decision that waits on knowing he has him?
- If yes: the first part has no delay, and only the commitment depth waits.
- This would be a third design, so it is not built without a yes.

## HOLD_SINK, third design (2026-11-12): fixtures pass, games do not move

**Design.** From the grasp, his request along the runner's path is min(his own speed, HOLD_FINISH's target). After
his recognition delay it is his own speed × (1 − commitment). Side and rear wraps only.

**Fixtures** (`test/hold-sink.test.ts`):
- A holder at a standstill asks for 0 along the path.
- A matched rear chase gets HOLD_FINISH's request unchanged.
- Stepped, a tight side wrap from a standstill: down at 0.45 s, 3.2 yd (HOLD_FINISH: 0.55 s, 4.1 yd).

**Games.** Engine-35 (develop a702f0cd merged), sim-export seeds 201 and 301, 16 games each, Coverage's
`finish_split.py` against the NFL (BDB 2025).

| completions | off 201 / 301 | on 201 / 301 | NFL |
|---|---|---|---|
| standardised mean after contact (NFL on our mix) | 3.13 / 3.09 (2.07 / 1.99) | 3.37 / 2.92 (2.14 / 2.04) | 2.18 |
| side, holder 4–6: yd p50, contact to end | 3.0, 1.1 s / 2.4, 1.0 s | 2.9, 1.1 s / 2.6, 1.1 s | 1.5, 0.8 s |
| behind, holder > 6 | 3.2, 0.9 s / 3.0, 0.9 s | 3.5, 0.9 s / 2.7, 0.9 s | 1.8, 0.7 s |
| side, carrier > 6 | 5.0, 1.1 s / 6.6, 1.4 s | 5.3, 1.3 s / 3.9, 0.8 s | 2.5, 0.8 s |
| second defender | 46 / 46% | 47 / 46% | — |
| broke | 9 / 7% | 8 / 7% | — |

Runs at the second level (`--runs`), standardised mean after contact: 4.14 / 4.55 off, 3.89 / 4.53 on. The NFL on our
mix is 3.97 / 3.99, and the NFL's own is 4.41.

`finish-trace.mts`, seed 101, 8 games: 56 fast wraps off, 63 on.
- The request barely changes: 0.58 → 0.55 of the carrier's speed.
- His feet over the first 0.3 s: +170 → +124. Over 0.3–0.8 s: −201 → −237.
- Pair force, first 0.3 s: +191 → +140.
- Yards after the wrap: 3.66 → 3.13.
- Wrap to end: 1.23 → 1.05 s.

Tears within 0.5 s, by grip at acquisition (lock < 0.5 = weak) and the mass mismatch (carrier more than 10% heavier),
off → on:
- secure wrap, heavier carrier: 0/10 → 0/14;
- secure wrap, matched or lighter: 1/23 → 1/25;
- weak grip, heavier carrier: 5/13 → 3/9;
- weak grip, matched or lighter: 3/10 → 5/15.

Secure wraps don't tear and weak grips do, about a third of the time on both sides. Attempt 2's 8/38 was not this
design.

**Reading.** The fast cells are dominated by chasers who grab a carrier at speed and are already moving along his
path. For them, "never ask to accelerate" changes nothing: they are already faster than HOLD_FINISH's target. What
the plant changes in the traces (about −0.5 yd) does not show above noise in the cells. The holder's intent is not
the main excess in these cells.

What remains for the chaser is the carrier's own stride. One holder never binds it, so the carrier keeps driving
(+0.1 g) until a second man arrives. That is proposal 2 (the closed two-leg wrap as a geometric constraint on the
stride), and it is the next question.

HOLD_SINK stays off. It is not a promotion candidate on its own. It can be re-read together with proposal 2,
because it is what keeps the holder's mass against the runner once the stride is bound.

## Census and the fall (2026-11-12)

### Census

`finish-trace.mts` snapshots, seed 101, 8 games, 56 fast side and rear wraps (38 side, 18 behind):

| | at the grasp | +0.3 s | +0.6 s |
|---|---|---|---|
| grip site (live holds): legs (leg share ≥ 0.7) / hips / waist | 22 / 28 / 6 | 21 / 25 / 5 | 12 / 22 / 4 |
| two-arm locked wrap (lock ≥ 0.5) | 33 / 56 | 45 / 51 | 36 / 38 |
| holder up / falling / down | 56 / 0 / 0 | 41 / 10 / 0 | 14 / 19 / 5 |
| holder speed ÷ carrier speed, p50 | 0.67 | 1.01 | 1.08 |
| holder ground force, p50 (kg·yd/s²) | +271 | −293 | −154 |
| drag on the carrier through the grip, p50 | 0 | −476 | −207 |
| carrier's own drive, p50 | +152 | +110 | +30 |
| carrier stride bound | 0 | 15 / 56 | 9 / 47 |
| carrier still up | 56 / 56 | 43 / 56 | 35 / 47 |
| carrier balance deviation (COM against his base), p50 (yd) | 0.00 | 0.29 | 0.48 |

The tackler does commit and goes to the ground. Falling, he travels at the carrier's pace and his feet give almost
nothing.

### (i) The fall: `scripts/diag/effective-mass/fall-bench.mts`

A 101 kg RB starts a forward fall (the World's own fall path), against plain rigid-body toppling over a caught foot.
The physics: angular momentum about the foot is kept through the catch, the body rotates under gravity, the foot has
Coulomb friction (μ 0.6, estimated), it lands at 0.25 of its COM height and then slides at the World's down
friction.

| speed | World: falling / to rest | toppling: to landing / to rest |
|---|---|---|
| 3 yd/s | 1.30 yd in 0.43 s / 1.83 yd at 0.80 s | 1.46 yd in 0.48 s / 2.05 yd at 0.86 s |
| 5 yd/s | 2.15 yd in 0.43 s / 3.66 yd at 1.05 s | 1.64 yd in 0.33 s / 3.20 yd at 0.95 s |
| 7 yd/s | 3.00 yd in 0.43 s / 5.98 yd at 1.30 s | 1.73 yd in 0.25 s / 4.78 yd at 1.12 s |

At 5–7 yd/s the centripetal need of pivoting over the foot exceeds gravity. The toppling body leaves the turf and keeps
its horizontal speed until it lands. So "no ground force while falling at speed" is close to physics.

The World's fall time is fixed (0.43 s for this body) where a fast topple lands in 0.25–0.33 s. That costs about
0.5–1.2 yd at 5–7 yd/s. It is not the main excess.

### Tracking

`scripts/diag/pass-operators/fall-end.py`, same code on NFL BDB 2025 and sim (engine-35, seeds 201 and 301, 16 games
each). Solo finishes: one defender within 1.5 yd at the end. Measured from the carrier's last frame at ≥ 70% of his
running speed to the end, p50:

| speed then | NFL | ours 201 / 301 |
|---|---|---|
| < 4 yd/s | 0.61 yd, 0.30 s (n 996) | 0.71 / 0.54 yd, 0.40 s |
| 4–6 yd/s | 1.20 yd, 0.30 s (n 1468) | 0.81 / 0.54 yd, 0.10–0.20 s |
| > 6 yd/s | 0.73 yd, 0.10 s (n 441) | 0.71 / 0.72 yd, 0.10 s |

Our final falls do not carry farther than the NFL's. The excess yards after contact come before the final fall: the
0.3–1.0 s between the grasp and the trip, while the falling holder's weight never loads the carrier.

That points to (ii): the hanging holder's weight acting low on the held legs. (i) as a falling-friction change is
not supported by the physics or the measurement. Not built; Integration decides.

### (ii) The hanging holder: `scripts/diag/effective-mass/hang-bench.mts`

Setup: the World alone. A 92 kg WR at v0 asks to keep running. An 84 kg CB behind him is just off his feet (falling,
at 0.9 v0) with a rear grasp on the legs.

| v0, legs, lock | runner | travel | stride bound | airborne hang moment: World / reference / hip torque |
|---|---|---|---|---|
| 5, 0.5, 0.56 / 0.9 | up at 1.5 s | 7.3 / 6.9 yd | 0 | 141 / 281 / 368 |
| 5, 0.8, 0.56 / 0.9 | down 0.90 s | 5.5 / 5.3 yd | 0 | 225 / 450 / 368 |
| 7, 0.5, 0.56 / 0.9 | up at 1.5 s | 9.4 / 9.3 yd | 0 | 141 / 281 / 368 |
| 7, 0.8, 0.56 / 0.9 | down 0.8 / 0.9 s | 6.7 / 7.2 yd | 0 | 225 / 450 / 368 |

The load over time, reference against World:

- **While the holder is airborne** (his fall, 0.40 s here): none of his weight is on the turf, so all of it hangs on
  the hold.
  - World: half (HANG_SHARE 0.5, the same as a grounded holder).
  - The runner's stride stays free. He accelerates (5.0 → 5.4 yd/s, own ground force +230 to +340) while the grip
    drags only −150.
  - Reference: the whole weight hangs. On a leg hold (legs 0.8) that is 450 against his hip torque of 368, which binds
    the stride. On a hip hold (0.5) it is 281, which does not.
- **After he lands:** half his weight rests on the turf, and the rest of his load is his sliding friction through the
  grip.
  - World: grip drag −450 to −480 while the runner still drives +270. The stride is free (half-weight moment 225 < 368).
  - Reference drag: −675 (0.75 × his weight).
- **The grip's own moment** uses 0.7 of capacity once the holder is off his feet. A locked wrap (lock 0.9, legs 0.8)
  lands at 366, just under 368, so it never binds either.

What is missing, in order:
1. The airborne holder's whole weight on the hold: the hang share during his fall.
2. Then the post-landing drag against a stride that is still free. That is grip capacity and friction, and the
   runner's drive.
3. No vertical load on the carrier's base exists in the World, which is horizontal only. The hanging weight acts only
   through the stride comparison.

Proposal (not built; Integration decides): its own flag, off. While a holder is falling (off his feet, not yet
landed) and still holding, his hanging share is 1 (all of his weight on the hold). On landing it is HANG_SHARE as now.
The rest stays the same: the stride comparison against hip torque, SWING_STRIP, LEGS_HELD. A leg hold then binds the
stride for the airborne window; a hip hold may not.

## HANG_AIRBORNE: three-arm read (2026-11-12)

Arms: off; HANG_AIRBORNE; HANG_AIRBORNE + HOLD_SINK. Engine-35 (develop a702f0cd merged), sim-export seeds 201 and
301, 16 games each.

The HANG_AIRBORNE-only arm on seed 201 crashed in game 3 in the rules code: "Unsupported NFL 8-7-6: end-zone recovery
impetus/momentum" (playsim.ts possess). The different play flow reached a rule the code does not support yet, which
is for Rules + Coaching. So seed 201 has off and both flags only.

Completions, `finish_split.py` against the NFL (n 4934):

| | NFL | off 201 / 301 | HANG_AIRBORNE — / 301 | both 201 / 301 |
|---|---|---|---|---|
| standardised mean yards after contact (NFL on our mix about 2.0) | 2.18 | 3.13 / 3.09 | — / 2.81 | 3.17 / 2.66 |
| play over within 1 s | 61% | 50 / 50% | — / 56% | 57 / 56% |
| side, holder 4–6 | 1.5 yd, 0.8 s | 3.0 yd, 1.1 s / 2.4, 1.0 | — / 2.4, 1.2 | 2.2, 0.9 / 2.5, 1.1 |
| behind, holder > 6 | 1.8, 0.7 | 3.2, 0.9 / 3.0, 0.9 | — / 3.0, 0.9 | 4.1, 0.9 / 3.0, 0.9 |
| behind, holder 4–6 | 0.9, 0.8 | 1.7, 0.9 / 1.3, 0.9 | — / 1.5, 0.8 | 1.7, 0.8 / 1.1, 0.8 |
| side, holder > 6 | 1.9, 0.8 | 4.9, 1.1 / 4.6, 1.2 | — / 4.2, 0.9 | 5.1, 1.3 / 4.2, 0.9 |
| slow cells (holder < 4): front / side / behind | 1.6 / 1.5 / 0.9 | 1.4 / 2.0 / 1.3, 1.2 / 2.1 / 0.0 | — / 1.2 / 2.3 / 0.4 | 1.3 / 2.0 / 1.2, 1.2 / 2.3 / 0.7 |
| ended by a second defender | — | 46 / 46% | — / 44% | 46 / 48% |
| broke | — | 9 / 7% | — / 9% | 9 / 5% |
| missed | — | 6 / 6% | — / 6% | 7 / 6% |

Runs at the second level, standardised mean after contact: off 4.14 / 4.55; HANG_AIRBORNE — / 4.18; both 3.97 / 4.41.
NFL on our mix 3.97–4.14; NFL own 4.41.

The holder's fall, `finish-trace.mts` seed 101, 8 games, fast wraps where the holder fell while holding. Grip at the
start of his fall:

| arm | grip | n | stride bound in the fall | tore in the fall | yards after the wrap p50 | wrap to end |
|---|---|---|---|---|---|---|
| off | two arms, unlocked (lock < 0.5) | 13 | 3 | 5 | 9.2 | 1.70 s |
| off | two arms, locked | 24 | 5 | 0 | 3.8 | 1.35 s |
| HANG_AIRBORNE | unlocked | 10 | 8 | 7 | 16.0 | 2.65 s |
| HANG_AIRBORNE | locked | 16 | 4 | 0 | 4.1 | 1.27 s |
| both | unlocked | 11 | 10 | 3 | 4.0 | 0.70 s |
| both | locked | 18 | 3 | 0 | 4.5 | 1.43 s |

No one-arm holds reached a fall in this sample.

Reading:
- In the games the flag moves little: play over within 1 s 50 → 56–57%, standardised yards down 0.3–0.4 on seed 301,
  flat on seed 201.
- No cell overshoots below the NFL. The slow cells and second-defender involvement are about unchanged.
- **The flag is too blunt in the way Integration asked about.** Unlocked holds bind the stride in the fall as often as
  or more often than locked wraps (8–10 of 10–11 against 3–4 of 16–18). When they hold, they get the full benefit
  (with HOLD_SINK: 0.70 s, 4.0 yd).
- The hanging load acts through the stride comparison and never stresses the grip. A loose hold tears in the fall only
  for other reasons (3–7 of 10–11), so a weak grab is as good as a locked wrap the moment the tackler leaves his feet.

HANG_AIRBORNE waits. The next piece is routing the hanging weight through the grip's capacity: the hanging moment is
transmitted only up to what the hold can carry, and the excess slides the grip and can tear it. That uses the same
kind of reference: an unlocked hold's capacity against the holder's weight at the hold.

Locked wraps also bind the stride less than expected (3–5 of 16–24). Many are hip holds (leg share < 0.65), where the
statics says a hanging holder cannot stop the stride. That is the honest high-tackle case, not a defect.

## HANG_AIRBORNE + HANG_GRIP: game read, adverse, explained (2026-11-12)

Engine-38 (develop 814192c6 merged), sim-export seeds 201 and 301, 16 games each, off against both flags.
`finish_split.py` against the NFL.

| | off 201 / 301 | on 201 / 301 | NFL |
|---|---|---|---|
| standardised mean after contact (NFL on our mix about 2.1) | 3.28 / 2.72 | 3.87 / 3.56 | 2.18 |
| play over within 1 s | 49 / 53% | 47 / 48% | 61% |
| broke | 7 / 6% | **24 / 24%** | — |
| second defender | 49 / 49% | 36 / 37% | — |
| missed | 8 / 6% | 9 / 6% | — |
| behind, holder 4–6 (yd p50) | 1.1 / 1.0 | 2.1 / 2.0 | 0.9 |
| side, holder > 6 | 4.4 / 3.8 | 6.6 / 3.8 | 1.9 |

`finish-trace.mts` (seed 101, 8 games, 80 wraps):
- Grips broken: 6 off, 28 on, of which 17 within 0.5 s.
- With both flags, 23 of 51 holders who fell while holding tore their grip during the fall. Off: 1 of 45.

**Cause: the rule's tear at the ankles.**
- In games a grip's capacity is max(wrap law, two hands on the jersey), about 650 for a CB, × 0.7 off his feet ≈ 450.
- An airborne holder's whole weight is about 900. So almost every diving holder's hands slide down to the ankles and come
  off, including tackles that held before.
- That is wrong for a closed wrap round the legs. Locked arms around a leg carry the hanging weight by geometry: they
  can slide down the leg, but at the ankles the foot arrests them. That is the shoestring tackle, with the longest lever
  on the stride.
- Only an open grip (hands on cloth, one arm, an unclosed wrap) slips off over the foot.

Not a candidate as it stands.

Proposed second attempt (not built):
- A locked wrap of the legs (lock ≥ 0.5, two arms) slides under overload to the ankles and holds there, carrying its
  capacity at the ankle lever.
- An open grip (lock < 0.5, or one arm) slides and comes off at the ankles, as now.
- The stride comparison applies throughout the slide at the current hold height. That is already so; Integration asked
  to confirm it.

## HANG_GRIP attempt 2: not repaired; stopped for re-diagnosis (2026-11-12)

The rule: at the ankles the foot arrests the closed share of the wrap (capacity + lock × the hanging weight); an open
grip slips off.

Bench (hang-bench): lock 0.25 tears; lock 0.56 slides to the ankles and holds (the runner is down at 0.25–0.30 s,
2.6–3.3 yd); lock 0.9 does not slide (a leg wrap binds, a hip hold does not).

HANG_SLIDE at 0.75 / 1.5 / 3 yd/s gives identical outcomes. The World's own horizontal slip, from a holder slower than
the runner, carries the hold to the ankles within the first 0.05 s. The slide rate only matters for holds that are
overloaded high on the leg without slipping horizontally first.

Games (engine-38, seeds 201 and 301, 16 games each, off against both flags):

| | off | attempt 1 | attempt 2 |
|---|---|---|---|
| broke | 7 / 6% | 24 / 24% | 10 / 11% |
| second defender | 49 / 49% | 36 / 37% | 44 / 41% |
| standardised after contact (NFL on our mix about 2.1) | 3.28 / 2.72 | 3.87 / 3.56 | 3.39 / 3.12 |
| runs, standardised (NFL on our mix about 4.0) | 4.40 / 4.33 | — | 4.63 / 3.76 |

Traces (seed 101, 80 wraps): holders who fell while holding, by grip at the start of the fall, as tore / bound out of n:

| | off | attempt 1 | attempt 2 |
|---|---|---|---|
| open (lock < 0.5) | 1 / 4 of 10 | 12 / 2 of 12 | 15 / 5 of 19 |
| locked | 0 / 9 of 35 | 11 / 17 of 39 | 0 / 16 of 32 |

Yards after the wrap p50: 2.62 off, 3.58 attempt 1, 3.61 attempt 2.

**Re-diagnosis.** Locked wraps now behave as the statics says: they never tear and bind twice as often. The adverse
result is the open grips: 15 of 19 tear under an airborne holder, where off they held and the play ended with the
second defender.

That comes down to the grip capacity law, not to this rule:
- The two-hands-on-the-jersey capacity is about 0.75 of the holder's body weight (handHold: per hand
  m × (0.42 + 0.16 strength) × g, × 0.75 for a slick jersey).
- × 0.7 off his feet, that leaves about half his weight.
- A fit athlete can dead-hang his own body weight from two hands.
- The law was set for a holder on his feet pulling horizontally (a runner tearing through hands). Under a hanging load
  it understates what hands on cloth or a leg can carry.

Routing the full weight through it therefore tears what should hold. That is shared grip physics, outside these flags.
Both flags stay off.

Next question (not built): the grip capacity against a hanging (vertical, sustained) load versus a horizontal tear.
Reference: dead-hang grip as a fraction of body weight, by grip on cloth or round a limb.
