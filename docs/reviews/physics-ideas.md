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

## 5. Contact anatomy (follow-up, still diagnostics only)

New tools: `scripts/diag/physics/contact-anatomy.ts` (games),
`tackle-ledger.ts` (1v1 momentum ledger), `collision-exchange.py` and
`contact-distance.py` (NFL vs sim, same operator).

**Every play ends with a fall.** In 4 games, 138 of 144 designed runs with a
first contact end with the carrier down, a median 0.70 s after contact, usually
with one tackler; 101 of those falls are leg holds locking his stepping. NFL
runners are still live at 0.8 s on 83% of runs (sim 35%).

**The early stop scales with closing speed in the sim, not in the NFL.**
Carrier speed change 0.2 s after first contact, by relative closing speed:

| Closing, yd/s | NFL | Sim |
|---|---|---|
| 0-2 | -0.48 | -0.64 |
| 2-3.5 | -0.53 | -1.09 |
| 3.5-5 | -0.53 | -1.58 |
| 5-9 | -0.47 | -1.46 |

The NFL loss is flat, like a force-limited drag. The sim's grows with impact
speed, like a momentum exchange between whole bodies.

**The sim pair sticks; the NFL pair separates.** Center distance and closing
speed after first contact: both get about as close (median 0.6-0.8 yd at
+0.2 s), but NFL pairs then separate (closing -0.36 / -0.95 / -1.12 yd/s at
+0.2 / +0.3 / +0.4 s) while sim pairs stay locked (+0.47 / 0.00 / 0.00).
The NFL defender's velocity barely changes in the first 0.2 s (+0.21 yd/s
head-on, sim +1.02). NFL tacklers also arrive moving with the runner (+0.66
yd/s head-on, +1.89 from the side); sim tacklers arrive planted (-0.03, +0.55).

**Ledger (head-on, 4.5 yd/s runner, 112 vs 102 kg).** The torso collision
removes about 3.1 yd/s in one tick, about what a whole-body inelastic merge
predicts; grip forces are near zero then. The runner's balance goes about 0.3 s
later, and he is down by about 0.7 s.

**The contact law's settings do not matter.** Local experiments (reverted):
torso contact spring 9 / 4 / 2 Hz, with and without the rigid post-integration
relax pass. The exchange spreads over at most 0.1-0.15 s, but by +0.2 s the
runner has the same ~1.5 yd/s. Two single-mass bodies that stay in contact
must share momentum. Solver tuning is not the fix.

### What this points to

1. **Contacts that stay central and stuck.** Real first contacts are usually
   oblique, partial (shoulder and arms), and the bodies slide past or apart.
   Ours meet centrally and stay together. That involves the tackler's aim
   (strike and drive at the carrier's center, "drive through" when in
   front), the immediate grasp, and the single-mass body. The candidate
   physics change is a body whose contact segment (shoulders and arms, about
   half the mass) couples to the rest compliantly over 0.1-0.3 s, with leg
   forces acting in between. That is a large World change for the physics
   owner. First test the cheaper controller side: a tackler who arrives
   moving with the runner and strikes the near hip off-center, against the
   NFL exchange and separation curves above.
2. **Leg holds topple runners too fast.** Find what in the leg-lock law takes
   an upright carrier with one tackler on his legs to a fall in about 0.3 s;
   NFL runners usually stay up and drive for more than a second.
3. Braking capacity and abrupt stop requests (section 3).

## 6. What topples the runner (experiments, nothing kept)

`tackle-ledger.ts` now prints the runner's capture-point excursion (`xi`,
`peak`, fall at 1.0) and the accumulated contact/legs causes each tick.
Witnesses: 112 kg runner, 102 kg tackler, seed 3000; (angle, runner speed,
tackler speed) = (0, 4.5, 1), (45, 5, 2), (90, 5, 3).

| Fall time, s | head-on | 45 deg | side |
|---|---|---|---|
| Production | 0.35 | 0.40 | 0.80 |
| Grip purchase falls toward the ankles (`GRIP_PURCHASE`, ankle .5 / .7) | 0.35 | 0.40 | 0.95 / 0.90 |
| Grip starts as a hand and closes at the existing build rate (`GRIP_CLOSE`) | 0.40 | 0.45 | 0.85 |
| Hold forced to the torso (leg share 0), local only | **no fall in 1.2 s** | 0.60 | 0.75 |

Neither flagged attempt repaired the mechanism, so both were removed. The
isolation is the finding: **the leg share of the hold topples the runner.**
With a torso-only hold the head-on runner drives the tackler back at 2.3 yd/s
at +0.8 s and stays up; NFL head-on runners keep 2.15 yd/s and are 87% live at
+0.8 s. Every tackle starts with a leg share of about 0.5-0.6
(`0.1 + 0.55 x tackling x q + 0.25 from behind`), and the leg share couples
the grip's tension to the runner's corrective support (virtual foot). The foot
then cannot place recovery steps: `xi` climbs about 0.15-0.2 per tick until the
fall, labelled `legs`, even when the runner is still at full speed (side
witness: 4.9 yd/s at the fall).

The tackling reference says a thigh-level clamp stops a runner "if support
and grip endure". Here it works within a few tenths of a second on every
tackle. The leg-hold/support coupling is the law the physics session was
redesigning ("lower-grip support coupling"). These three witnesses, with a
target of "an upright runner with one tackler on his thighs keeps stepping
and drives for most of a second unless the tackler's own support and grip
win", are offered for that work. The central collision is front-loaded but,
on this evidence, secondary for yards after contact.

## 7. Leg-hold bracing (`LEG_BRACE=1`, experimental, off by default)

The only physics change from this investigation, in `World.addLoad` and
`updateSupport`. A leg hold's pitching moment used to be entirely
unbraceable ("a held foot cannot brace this moment"). With the flag:

- The part of a hold above the knee (knee = 0.5 x COM height) acts on the
  hips. The hips brace its moment up to their extension torque, 3.5 N·m per
  kg of body mass (a sprint/strength-athlete figure, not fitted), times the
  fatigue factor; only the excess pitches him.
- The part below the knee acts on the base itself and trips him in full, as
  before.
- The force still loads his COM and his corrective step in full.

Why: halving the hold's coupling to the corrective step changed nothing.
The isolation showed falls come from the trip moment of the thigh-level share
every tackle starts with (leg share about 0.55). Witness thigh holds produce
about 270-420 moment units, below a 112 kg runner's ~470 hip capacity, so
real hips can brace them.

**1v1 witnesses** (fall time, s): head-on 0.35 to 0.50 (the cause becomes the
collision, not the legs); 45 deg 0.40 to 1.2 (speed 3.4-3.5 yd/s, close to NFL
side contacts); side, trailing hold 0.80 to 0.70 (by then the hold has slid to
the ankle, the reference's "stumble after several steps"). Slow rear
witnesses are unchanged.

**Games** (8+8, `ab.sh`), against NFL tracking with the same operator:

| | Off | On | NFL |
|---|---|---|---|
| Live 0.8 / 1.0 / 1.2 s after first contact | 0.35 / 0.21 / 0.14 | 0.62 / 0.45 / 0.33 | 0.83 / 0.71 / 0.59 |
| Carrier speed 0.4 s after contact | 2.40 | 2.85 | 3.61 |
| Yards after contact, median | 1.32 / 1.33 | 1.74 / 1.63 | 2.4 |
| Run yards median; stuff rate | 2.0 / 2.2; 0.37 / 0.38 | 2.35 / 2.49; 0.31 / 0.35 | 3.0 |

Guards: 12/12 on seed 101; `run.box_count` breaks on seed 202, a pre-snap
alignment metric already noted as fragile on that seed.

**Why it stays off.** The 1v1 panel (`scripts/diag/tackle/panel.ts`) shows the
gap it exposes: in diagonal and side cells a lone tackler on the thighs can
no longer finish. Holds go slack (mean grip force 70-160) and the runner drags
him 8-18 yd for 3.5 s without the hold breaking (e.g. 45 deg / 6 yd/s with a
cut: 3.1 to 16.4 yd after contact). The instant trip was the only way a
single tackler finished. Real tacklers finish by rolling or twisting the
runner down, by a second tackler, or the weak hold breaks and the runner
escapes. Promoting this needs those mechanics first:

1. A weak, slack hold on a runner who is pulling away should break (a
   broken tackle), not persist at arm's length indefinitely.
2. A secure thigh hold should be able to finish by rotation (thigh-and-roll)
   or by the tackler's planted weight, through the World rather than through
   an unbraceable moment.

Reproduce:

```sh
LEG_BRACE=1 node --import tsx scripts/diag/physics/tackle-ledger.ts 45 5 3000 2
LEG_BRACE=1 node --import tsx scripts/diag/tackle/panel.ts --seeds 6
sh scripts/diag/runblock/ab.sh brace1 LEG_BRACE=1 && sh scripts/diag/runblock/ab.sh brace0
python3 -I scripts/diag/physics/after-contact.py out/mechanics/nfl-plays.jsonl.gz out/rb/brace1-101.jsonl.gz out/rb/brace1-202.jsonl.gz
```

## 8. Finishing a tackle once thigh holds are braced

Merged first: the physics session's latest tackle code (plant along a
secured hold, no four-second whistle for a moving runner).

**1v1 panel** (6 seeds; tackled share, yards after contact median / p90):
no flags 0.81, 3.0 / 6.0; `LEG_BRACE` 0.50, 5.0 / 16.1; brace plus a
tight-wrap drive 0.56, 4.6 / 13.5. With the brace, a lone tackler rarely
finishes. Traces show why:

- **Side by side**, the existing plant brakes only along the hold, which is
  perpendicular to the runner's travel, so a tight side wrap jogs alongside
  forever.
- **In front**, the tackler drives back at full effort, and the heavier runner
  pushes him backward at 1.3 yd/s for over a second, both balanced. Two leaning
  bodies form a stable pushing contest in this 2D model; only a stalled-progress
  whistle ends it.

Two finishing attempts did not repair this: driving through the hip
(removed), and rolling, where the holder sits down and turns away across the
runner's travel (`TACKLE_ROLL=1`, kept off by default for the next step).

**Isolation (local, reverted).** The roll finishes once the runner's legs are
actually bound. With the wrap's coupling to his corrective step raised from
the leg share (about 0.55) to full, brace plus roll gives falls at 0.85 s
(45 deg, 3 yd/s) and 0.75 s (45 deg, 5 yd/s), close to the NFL timescale. A
trailing 90 deg hold still drags.

**Diagnosis.** The reduced model ties a hold's binding of the runner's steps
to its height (the leg share). Physically it depends on how securely the arms
encircle the legs: a hand on a thigh binds little; a locked wrap around both
thighs binds both legs, so he cannot step to catch himself when rolled or
driven. Real tacklers finish by binding the legs and rolling or driving, not by
an unbraceable moment.

**Next step (proposed, not built).** Make leg binding a property of the
wrap's security and height: the coupling to the corrective step grows with
grip quality for holds at or below the hips, up to full binding for a locked
wrap. Then evaluate `LEG_BRACE` plus `TACKLE_ROLL` on the panel and in games
against the after-contact curves. Promote only if both improve.

## 9. Brace + roll + binding together (`LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1`)

Built on the second session's secure-wrap coupling (`WRAP_BIND`,
[wrap binding](wrap-binding.md)). Its first named blocker was this
session's roll: a square holder picked a fixed world side (`sign(0) || 1`), so
mirrored approach tackles diverged. The roll's sideways part now grows with
the holder's actual lateral offset (none when square, full beyond 0.15 yd);
no tie-break (`f418e26`). The scenario pack, wrap-binding, continued-recovery,
recovery-phase and tackle-support controls pass with all three (79/79). Full
suite with all three: the known Tite failure, plus the loaded-grip research
observer, which rejects `LEG_BRACE` by design ("Recovery input
reconstruction mismatch"; it reconstructs unbraced pitch). Default suite:
Tite only.

**Games** (8+8, rosters 101/202, `ab.sh fin0` vs `fin3`), same operator as NFL:

| | Off | All three | NFL |
|---|---|---|---|
| Live 0.6 / 0.8 / 1.0 / 1.2 s after first contact | 0.74 / 0.40 / 0.24 / 0.18 | 0.90 / 0.67 / 0.45 / 0.30 | 0.92 / 0.83 / 0.71 / 0.59 |
| Carrier speed +0.2 / +0.4 s | 3.05 / 2.46 | 3.54 / 2.92 | 4.19 / 3.61 |
| Yards since contact +0.8 / +1.0 s | 2.0 / 3.0 | 2.2 / 2.6 | 2.0 / 2.3 |
| Yards after contact, median | 1.18 / 1.44 | 1.69 / 1.98 | 2.4 |
| Run yards p25 / median | -0.08 / 1.56, 0.31 / 2.09 | 0.45 / 2.75, 0.51 / 2.83 | 1.0 / 3.0 |
| Runs of 10+ yd | 0.14 / 0.10 | 0.11 / 0.10 | |
| Stuff rate | 0.42 / 0.37 | 0.32 / 0.32 | |
| Guards | 12/12, 12/12 | 12/12, 12/12 | |

Every after-contact measure moves toward NFL tracking; the bottom of the run
distribution improves without inflating long runs.

**1v1 panel** (288 reps): off 234 tackled / 52 escaped / 2 unfinished; all
three 192 / 54 / 42. The unfinished family is slow runners (3 yd/s) held from
the side or behind (45 deg with a cut, 90, 135, 180). Traced at 90 deg: the
wrap is secure (recovery coupling 0.92, grip about 800 of 1,600), and the holder
asks to sit down and roll, but the runner drags him at 3 yd/s. The runner's leg
drive at that speed (~750-800) balances the holder's braking and grip (~800),
and he stays balanced (capture deviation 0.27 yd, inside his base), so binding
never engages. Missing physics: a holder who sits down hangs his **weight** on
the runner, a vertical load his legs must carry. The 2D model can only pull
horizontally. In games a second tackler usually finishes these.

**Recommendation.** Promote the three together (they are coherent only as a
set: the brace alone leaves lone tacklers no finish). The physics session owns
promotion and should review the brace law and the roll; the vertical
weight-transfer finish is the next physics item.

## 10. How the tackler arrives (measurement; nothing changed)

With all three flags the biggest after-contact gap left in games is the first
0.2 s: carrier speed 3.54 vs NFL 4.19 yd/s, and the loss still grows with
closing speed (`collision-exchange.py`: -0.55 / -0.90 / -1.20 / -1.03 yd/s for
closing 0-2 / 2-3.5 / 3.5-5 / 5-9; NFL flat at about -0.5). New tools, same
operator on NFL and sim: `approach-profile.py` (exports) and
`approach-trace.ts` (requested vs achieved approach in games).

Nearest defender before first contact (NFL / sim, all angles):

| s before contact | 0.6 | 0.4 | 0.2 | 0 |
|---|---|---|---|---|
| Defender speed | 3.04 / 2.02 | 3.05 / 1.95 | 3.04 / 1.95 | 3.01 / 1.68 |
| His velocity along the carrier's travel | +0.85 / -0.53 | +1.12 / -0.42 | +1.45 / -0.32 | +1.79 / +0.28 |
| Closing on the line of centers | 4.77 / 4.60 | 4.45 / 4.91 | 3.68 / 5.00 | 1.98 / 3.04 |
| Center distance | 3.20 / 3.86 | 2.26 / 2.91 | 1.42 / 1.90 | 0.85 / 0.95 |
| Path miss distance | 0.72 / 0.78 | 0.63 / 0.64 | 0.57 / 0.53 | 0.53 / 0.50 |

The same pattern holds for DL, LB and DB separately. NFL defenders turn
and run *with* the carrier in the last half second, and the closing speed
falls from about 4.5 to 2 yd/s, mostly inside arm's length (1.4 yd at -0.2 s).
Sim defenders keep coming against the runner's travel at about 5 yd/s until
the torsos meet.

What it is not:

- **Not an aim at his center.** The projected miss distance of the two paths
  is the same (about 0.5 yd at contact).
- **Not the front tackler's minimum drive** in `gatheringApproach`. Disabling
  it (local, reverted) moved head-on velocity along travel by +0.3 yd/s and
  left closing at -0.2 s at 4.6.
- **Not execution.** The requests themselves ask for about 6 yd/s closing at
  1.9 yd (`approach-trace.ts`, requested vs achieved).

After contact the pairs differ too (`contact-distance.py`): NFL centers close
to 0.72 yd at +0.2 s, then separate (closing -0.95 yd/s at +0.3 s). Sim pairs
lock torso to torso (p25 0.51 yd, the two radii) and stay there (closing 0.0).
NFL tacklers seem to absorb the closing through their arms from about 1.4 yd
and hang on at arm's length; ours pull in to the torso, which makes every first
contact a whole-body merge. Candidate mechanisms, in order:

1. **Arm-length contact.** A grasp that forms at reach and holds the bodies
   apart at arm's length (the hold's reel draws them to the torso now), so
   the exchange is force-limited by the arms and grip, not a collision.
   World/tackle law: the physics session's.
2. **The approach request.** The gather plans braking to a fixed "through"
   closing speed (2.5-4.5) at torso contact; NFL tacklers start matching the
   runner's travel earlier. This is a controller choice, but under the current
   physics a hard arrival is rewarded with a bigger exchange. Changing it first
   would remove a technique because the physics overpays it. Repair the
   contact law first, then see whether the controller still charges.
