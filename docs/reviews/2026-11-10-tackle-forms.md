# Tackle forms: what the engine can represent (2026-11-10)

Tanner's question: how much of the real variety of tackles can we represent? This is an inventory of the engine
(`src/sim/tackle.ts`, `src/physics/world.ts`) against the forms tackles take on film. Then a measurement plan to quantify
variety on NFL tracking and in the sim with the same operators. Diagnosis only; nothing here is built.

> Where this file is read on develop: `WHIFF_MARGIN`, `TKL_EXEC_STATE`, `GRAB_CONNECT`, `LEG_HOLD_SLIDE`, `HELD_STEP` and `HELD_FALL` are not develop flags. They are attempts on Flex's branch (`claude/quirky-franklin-9lbwbp`), off or reverted there as each section says, and reach develop only if promoted.

## What a tackle is in the engine

| Piece | What it carries | Where |
|---|---|---|
| **Grasp joint**, one per tackler | grip capacity (`gripForce`: arm force × wrap quality), `lock` (wrap closure), **`legs`** (one 0–1 number: how low the hold is), one arm or two, reach, `pull` (reel speed), hold distance, `extended` (from the ground after a dive), `brace` (`REACH_CONTACT`, off) | `grasp()` |
| **Strike** | one explosive step at the runner's near hip before the wrap, within traction | `strike()` |
| **Dive** | a real fall toward the runner; on success a weak, all-legs hold | `tryTackles` dive branch |
| **Committed lunge** | a miss leaves an unsupported lean, so the tackler may lose his base | `commitLunge()` |
| **Bond** | all tacklers on one carrier: holder intents (drive, plant, roll toward his side), the carrier's legs still driving | `updateBond()` |
| **Torso collisions** | big hits without a grasp; the runner can be knocked off his feet | World contacts, support |
| **Finish** | (1) a physical fall: trips, thigh holds against hip brace, held strides (`HELD_SWING`), hanging weight, a roll; (2) forward progress stalled 0.8 s; (3) QB in the grasp 0.25 s | `afterStep`, `updateBond` |

The tackle's origin is labelled `form`, `reach`, `lunge`, `block` (one-armed off a block), `dive`, `+assist`, `+behind`.

## Real forms against the engine

| Form on film | In the engine | How |
|---|---|---|
| Form tackle (strike, wrap, drive through) | **emergent** | strike step + high-quality two-arm wrap + drive intent |
| Big hit without a wrap (shoulder, hit-stick) | **emergent** | torso collision; the runner's support can fall |
| Arm tackle or jersey grab | **approximated** | a low-quality grasp. One-armed only off a block (`ONE_ARM_HOLD`); a free tackler's grab is always two-armed |
| Shoestring or ankle tackle (dive at the feet) | **approximated** | dive, `legs` = 1, fixed quality 0.3. **Whether it lands is a dice roll** (unless `TKL_WHIFF`) |
| Ankle tap from behind (a hand on the heel) | **flagged** | `TACKLE_TOUCH` (off) |
| Hip-drop, roll or swing-down | **approximated** | the holder's roll intent toward his side in `updateBond` |
| Drag-down by weight (hang on the legs) | **emergent** | hanging weight on a leg hold (`HANG_SHARE`), held strides |
| Gang tackle or pile push | **approximated** | several holders in one bond; the end is the 0.8 s stalled-progress rule, not the pile's physics |
| Stood up, forward progress | **rule** | the stall rule |
| High wrap from behind or horse-collar | **partial** | an upper hold from behind with reel. No collar or shoulder-pad grip; no illegality |
| Cut or chop at the knees (no grasp) | **missing** | contact height is always the pads (`padHeightAt`). A body cannot strike the knees |
| Push out of bounds | **missing as a technique** | only incidental contact |
| Strip or punch-out | **missing as a technique** | fumbles are a probability per contact (`pFumble`), not a hand on the ball |
| Lift and drive or slam | **missing** | no vertical dimension beyond pad lift |
| Wrap and twist (rotate him down) | **partial** | roll intent, plus the grasp moment (`GRASP_ARM_MOMENT`) |

The runner's side matters too: a tackle's variety is half his.

| Runner counter-move | In the engine |
|---|---|
| Keep the legs driving, fall forward | yes (bond intents) |
| Cuts and jukes before contact | yes (`cutSkill`, squeeze), as movement only |
| Stiff-arm | **missing** (no runner hands joint) |
| Spin out of a hold | **missing** as a technique (spins exist for pass rushers only) |
| Lower the shoulder, truck | **partial** (collision mass and posture); no deliberate technique |
| Hurdle, protect the ball, dive for the marker | **missing** |

## Where the variety collapses

1. **`legs` is one number.** Waist, thighs, knees and ankles are one axis. There is no left/right side, no "head across"
   (leverage side) and no ball-arm side.
2. **Contact height is fixed to the pads.** No low strikes, no high hits, no cut.
3. **Several outcomes are still dice:** the whiff (`pMiss`, unless `TKL_WHIFF`), dive success, the fumble, and an execution
   draw per attempt. Ratings set those *probabilities*, which conflicts with the model rule that ratings set capabilities,
   not results. `TKL_WHIFF` (off) is the existing physical replacement for the whiff.
4. **The finish has three paths,** two of them rules (stall, in-the-grasp). Many real tackles end as a fall the physics
   would have to produce.
5. **The runner has no technique against a tackle** beyond movement and leg drive.

## Measurement plan (proposed)

The same operators on BDB 2025 tracking (tackles labelled solo or assisted in `player_play.csv`) and on sim dumps.
Each is a distribution, so it shows variety, not just a mean.

| Operator | What it shows | NFL source |
|---|---|---|
| Tackler approach at first contact (front / side / behind) and his speed then | the mix of tackle geometries | tracking + `soloTackle` / `tackleAssist` |
| Number of defenders within 1 yd at the end | solo against gang tackles | tracking |
| First contact to down (or end), distribution | quick takedowns against drag-downs | tracking + end frame |
| Yards after first contact, by approach | how each form holds | tracking |
| Direction the runner ends up moving relative to his travel (forward, back, sideways) | drive-through against roll-down against falling forward | tracking |
| Tackler on the ground after the play (stillness rule, as in `olfall.py`) | dives and leg tackles | tracking |
| Sim only: the origin mix and the finish path (fall / stall / grasp rule) | what the engine actually uses | the bond and joints |

**Priorities**, for Integration and Tanner to order:
1. **Replace the dice:** promote or repair `TKL_WHIFF`, a physical dive success, and fumbles from the ball's exposure and hits.
2. **Contact height as a continuous choice:** low hits and cuts.
3. **Split `legs`** into height plus side (and the ball-arm side).
4. **Runner techniques:** a stiff-arm (a hands joint from the runner), a spin out of a hold.
5. **Make pile and stall finishes physical where the bodies allow.**

## The shared index (agreed with Defense, 2026-11-10)

- **First contact, the default for all three lanes:** geometric. It is the first frame after the carrier phase starts (the handoff, else the snap, on runs; the catch on passes) in which any defender's centre is within 1.0 yd of the carrier's. This is `backfield.py`'s and Defense's `scripts/diag/defense-yards/yards.py` rule, and it is identical code on NFL and sim.
- **Event-based contact is an option for the grasp itself:** `tackle-forms.py ... event` uses the BDB `first_contact` tag or the engine's `carrier_contact`. The two are labelled by different processes, so this is not the shared default.
- **Primary tackler:** the defender nearest the carrier at first contact.
- **End:** the `end` event (the NFL whistle; the sim's dead ball).
- **Defense's outcome classes on that index:** made, missed, broken, other.

## NFL 2022 run carries (`tackle-forms.py`, geometric contact, 5,938 carries)

| Tackler's approach | Share | His speed (yd/s) | Contact → end p25 / p50 / p75 (s) | Yards after contact p25 / p50 / p75 | Defenders within 1 yd at the end: 0 / 1 / 2 / 3+ | Runner's end direction: fwd / side / back / stopped | ≥ 1 still defender within 1.5 yd |
|---|---|---|---|---|---|---|---|
| Front | 27% | 1.9 | 1.0 / 1.5 / 2.1 | 1.2 / 2.3 / 3.5 | 11 / 30 / 30 / 30% | 60 / 18 / 10 / 11% | 21% |
| Side | 69% | 3.2 | 1.0 / 1.4 / 2.2 | 1.6 / 2.8 / 4.6 | 17 / 34 / 29 / 19% | 72 / 14 / 6 / 8% | 15% |
| Behind | 4% | 6.3 | 0.8 / 1.1 / 1.8 | 1.0 / 2.6 / 4.7 | 26 / 39 / 21 / 14% | 85 / 9 / 2 / 4% | 11% |

## How to represent each part: physics, structure or weighted probability (Tanner, 2026-11-10)

Tanner's guidance: great tackling matters, we cannot simulate everything, and dice are acceptable where a weighted
probability is the best and cheapest faithful representation. This section proposes where each part of a tackle goes.

**Three tiers:**

- **P, physics.** The World decides. Use it when the outcome changes where bodies are and how fast they move afterwards (yards after contact, piles, pursuit angles, who is on the ground), and the World already has the ingredients: mass, speed, traction, reach, support.
- **S, structure.** A small discrete choice or parameter feeding the physics: which form is attempted, contact height, grip side. Use it when real players pick from a few techniques. The choice is a controller decision on observable evidence; its execution is physics.
- **W, weighted probability.** A dice roll whose probability is a **function of physical state first, ratings second**. Use it when the real mechanism is below the body scale we simulate (fingers on cloth, a hand on the ball, grip slipping on a jersey, timing within one tick), and when the result is a discrete event whose aftermath the physics then carries.
  - Rule for W: the probability must move with the state the World produced (contact quality, closing speed, ball exposure, where the grip is), not with ratings alone.
  - The dice decide the sub-scale event only. Everything that follows is bodies.

**The decision test, per part.** Does the outcome feed back into body positions in a way NFL tracking can see? Then P, or S feeding P. Is it a sub-scale binary event whose rate NFL data can calibrate? Then W, with state inputs. The cheapest choice that passes its operator wins.

| Part of a tackle | Tier | Representation | Inputs | Cost | Checked by |
|---|---|---|---|---|---|
| Approach and strike into the hip | **P** (exists) | the strike step | speed, traction, angle | done | approach geometry, speed at contact |
| Which form he attempts (wrap, shoulder hit, dive at the legs, arm grab, cut) | **S** | a technique choice on observable evidence: his angle, speed, the runner's speed and cut, his own balance. Execution is P | geometry, ratings as skill | M | the form mix by approach, end direction |
| Contact height (high wrap, waist, thighs, cut at the knees) | **S → P** | a chosen target height into the existing contact-height and tip law. Low contact trips (an existing path); high contact tips back | the chosen height, posture | M | runner end direction, falls |
| Grip location and side (waist / thighs / ankles; near or far side; head across) | **S** | split `legs` into height plus side. Side sets the roll direction and which way the runner can spin out | approach side | S–M | end direction (sideways share) |
| **Whiff on a reach** (fingers miss the jersey) | **W** (state) | p = f(contact quality, relative speed, the runner's cut in the last 0.2 s) × a tackling-skill modifier. Replaces `pMiss` | geometry first | S | missed share by approach (Defense's classes) |
| Grip holding or slipping | **P** (exists) | grip capacity against load, breaks | forces | done | broken share, yards after contact |
| Dive or shoestring connects | **W** (state) | p = f(distance to the feet, the runner's speed and stride). On success, a leg hold. The fall is P | geometry | S | still defenders, dive outcomes |
| Fumble or strip | **W** (state) | p = f(ball exposure: carry arm against the hit side, number of holders, hit impulse, a strip attempt chosen as S) × ball security | hit impulse, sides | M | fumble rate by hit type |
| Execution draw per attempt | **W, drop it** | fold into the whiff and grip terms above. A separate per-rep draw double-counts noise | — | S | — |
| Finish: physical fall | **P** (exists) | support falls | forces | done | contact → end, end direction |
| Finish: pile, forward progress | **S + rule** | keep the stall rule (officials rule it), but the pile's push is physics (all bodies). Measure that piles move like NFL piles | bodies | done / measure | defenders at the end, contact → end |
| Finish: QB in the grasp | **rule** | with Rules + Coaching | — | — | sack contact → down |
| Runner's stiff-arm | **S → P** | a runner hands row (the hands joint exists), chosen on evidence: a tackler closing from the side, a free arm | geometry | M | yards after contact, side tackles |
| Runner spins out of a hold | **S → P** | a chosen yaw burst against the grip. The grasp moment and arm bound decide whether he gets out | grip forces | M | broken share |
| Runner lowers the shoulder or falls forward | **S → P** | posture and lean (exist), chosen at contact | posture | S | end direction (forward share) |
| Hurdle, lift-and-drive, slam | **out of scope** | rare, and needs a vertical dimension | — | — | — |

**Suggested order** (cheapest per yard of football first; measure before and after each):
1. **Replace `pMiss` with the state-based whiff (W) and drop the execution draw.** Small, and it fixes the rule conflict.
2. **Split grip into height plus side (S).** Small, and it feeds roll direction and spin-outs.
3. **Technique choice, including contact height (S → P).** Medium. This is where most of the missing forms come from: shoulder hits, cuts, dives as choices.
4. **Runner counters: stiff-arm, then spin-out (S → P).** Medium. These are the runner's half of the variety.
5. **State-based fumble (W).** Medium; needs ball side and exposure.
6. **The dive's connect probability (W).** Small.

The sim side of the tackle-forms operator (in progress) gives the baseline for all of these.

## Sim baseline on the shared index (run-ref-13, the fixed 1,321 runs; `run-frames.mts` → `tackle-forms.py`, `tackle-origin.mts`)

| Run carries | Sim | NFL |
|---|---|---|
| Approach at first contact: front / side / behind | 36 / 58 / 6% | 27 / 69 / 4% |
| Tackler speed p50 (yd/s): front / side / behind | 1.6 / 2.6 / 5.1 | 1.9 / 3.2 / 6.3 |
| Contact → end p50 (s): front / side / behind | 1.1 / 1.4 / 1.0 | 1.5 / 1.4 / 1.1 |
| Yards after contact p50: front / side / behind | **1.1** / 2.2 / 1.8 | **2.3** / 2.8 / 2.6 |
| Defenders within 1 yd at the end, 0 / 1 / 2 / 3+ (side) | **3** / 15 / 30 / **52%** | **17** / 34 / 29 / **19%** |
| Runner's end direction (side): forward / sideways / back / stopped | 71 / 9 / 4 / **15%** | 72 / 14 / 6 / **8%** |
| ≥ 1 still defender within 1.5 yd at the end | 23–26% | 11–21% |

**Sim only** (1,274 tackled carries):

- **Finish:** a physical fall 91% (1,163), stalled forward progress 9% (110).
- **First hold:** form 508, reach 402, off a block 295, lunge 61, **dive 6**.
- **All holds:** reach 1,630, form 851, block 518, lunge 79, dive 6.
- **Holders at the end:** 1 in 19%, 2 in 36%, 3 in 30%, 4+ in 14%.
- **Leg holds** (legs ≥ 0.5): none in 26%, one in 49%, two or more in 25%.

**First reading.**

- **Our tackles are gang tackles.** At the end, 3+ defenders are within 1 yd in 36–52% of carries (NFL 14–30%). Almost never is no defender within 1 yd (1–3%, against the NFL's 11–26%; an NFL runner often ends free of bodies, pushed out, sliding or falling forward alone).
- Solo finishes are rare in ours (19% one holder). Yards after contact are shorter, most of all head-on (1.1 against 2.3).
- Defense owns the rally side (who arrives and when). The tackle side is mine: one tackler's ability to finish alone, and the share of carries ending with the runner separated from bodies.
- **Dives are nearly absent:** 6 of 1,274 first holds. The dive path (escaping runner, tackler behind) rarely triggers. The shoestring and ankle forms are effectively missing in practice, not only in kind.
- **Runners end stopped about twice as often** (15–18% against 8–11%). That fits piles that stop him instead of tackles that knock him forward or down.

## The leg wrap (Tanner: "wrapping around the legs is essential"; `leg-bench.mts`, 2026-11-10)

**The physics already rewards it strongly.** Same tackler, same grip capacity (lock 0.8), the hold placed at different heights. Time until the runner's support falls, and his travel by then:

| Approach | Chest (legs 0) | Waist (0.5) | Thighs (0.8) | Shins (1.0) |
|---|---|---|---|---|
| Head-on, runner 4 yd/s | still up at 2.0 s, 2.6 yd | 0.30 s, 0.6 yd | 0.25 s, 0.5 yd | 0.20 s, 0.4 yd |
| Side, crossing 5 yd/s | 1.10 s, 2.1 yd | 0.55 s, 1.5 yd | 0.30 s, 1.1 yd | 0.20 s, 0.8 yd |
| Behind, pulling away 5 yd/s | 1.95 s, 4.2 yd | 0.90 s, 2.2 yd | 0.40 s, 1.4 yd | 0.20 s, 0.8 yd |

**In games it does not show** (run-ref-13 tackles):

| Tackles | n | Time held (p50) | Yards on the play (p50) |
|---|---|---|---|
| Solo, upper hold | 113 | 0.75 s | 0.3 |
| Solo, leg hold | 133 | 0.90 s | 1.7 |
| No leg hold | 326 | 1.25 s | 1.6 |
| One leg hold | 624 | 1.25 s | 2.8 |
| Two or more | 324 | 1.48 s | 4.5 |

**Why.** The tackler never *chooses* the legs. Where his hands land is a draw from what he can reach (`gripReach`, `GRIP_REACH` on):

- free and square: mean 0.20 + 0.45 × tackling × quality, capped at 0.75 (a typical tackle lands at the waist);
- from behind: mean 0.6–0.75;
- off a block: 0.35.

So head-on and side tacklers rarely wrap the thighs, and the leg holds that do happen are mostly from behind or from lunges at runners already getting away. That selection makes them look worse.

**What is missing, and the proposal** (moves up the order, ahead of the other technique choices):

1. **A leg-wrap technique (S → P).** Choosing to tackle low:
   - lower his pads (posture) in the last steps;
   - aim his strike and hands at the near thigh with his head across the runner's travel;
   - wrap and drive.
   - The costs must be physical and visible, so that "never ban what works" holds:
     - getting low takes time and reach;
     - a cutting runner can step out of a low target (the whiff margin grows with the runner's lateral acceleration);
     - head-on, a low tackler can be run over or carried (the runner's forward fall and leg drive);
     - a stiff-arm (later) defeats a high, upright approach more than a low one.
   - The choice is the controller's, on observable evidence: his angle, closing speed, the runner's speed and cut, his own balance.
2. **A check that the leg hold is not too absolute.**
   - The bench downs a head-on runner in 0.2–0.3 s with 0.4–0.6 yd gained. The NFL's head-on yards after contact are 2.3 (p50).
   - The runner's forward fall and the drive through a thigh wrap need checking before more leg wraps are added. Otherwise tackles get too sure.
   - The measure: yards after contact by approach and the runner's end direction (forward share).

## Levels of a tackle at the body (Tanner, 2026-11-10)

"Wrapping around the waist and hips really messes up their balance, and sometimes you don't wrap, you just dive at that area to trip a guy up. There are levels to it."

The design target: the tackler chooses **where on the body** (height) and **whether he wraps or only hits**. The physics then decides what that does to the runner's balance. Each level, what the engine has now and what it needs:

| Level | What it does to the runner | Engine now | Needs |
|---|---|---|---|
| High wrap (chest, shoulders) | pulls him back or turns him, little effect on his base; he keeps his legs | a grasp at `legs` ≈ 0 (`HOLD_FINISH` sits it at the hands' height) | as is |
| **Waist and hip wrap** | a moment about his hips at a low lever: tips him over his base and takes his hips away from his feet | the same grasp at `legs` ≈ 0.5: the contact-height tip and `HIP_BRACE` (hips brace up to their torque, the rest pitches him). The bench downs a side runner in 0.55 s | chosen, not drawn; the absoluteness check |
| **Thigh and knee wrap** (both legs together) | his strides cannot come through: the surest finish | `legs` 0.8: `HELD_SWING` (held strides) and a trip below the knee. Bench 0.25–0.40 s | chosen; the check that it isn't too absolute (forward fall, one-leg drive) |
| **Dive into the hips or thighs without wrapping** (shoulder or body at low height, a trip) | a low impact under his centre of mass: his base is knocked out from under him while his torso keeps going | **missing.** Every torso contact is at pad height, so a body cannot hit low | contact height as the tackler's choice. The existing contact-height tip law then gives a low hit the right sign (a hit below his COM pitches him forward over it) |
| Shin and ankle (shoestring, a tap) | a trip of the stride foot | the dive path (all legs, weak hold), and `TACKLE_TOUCH` (off). Nearly unused in games (6 of 1,274) | the dive's trigger, and a state-based connect probability (W tier) |

**Design consequence.** A single "aim point" choice covers almost all of these: target height, plus wrap or hit-only. It replaces the `gripReach` draw for a free tackler. Its execution is physics: posture to get low, the strike, the contact height, the grasp's height. Its costs are physical: time and reach to get low, a cutting runner stepping out of a low target, being run over head-on, and a low dive committing the tackler to the ground.

**Runner counter already built: `CARRIER_BRACE` (off, Run Game, 2026-11-08), kept for this work.**

- The carrier lowers his pads and lunges along his path into a tackler he sees closing.
- Its earlier read: front-on carrier gain 0.93–1.12 → 1.50–2.29 yd (NFL 2.16–2.59).
- It is the "lower the shoulder, fall forward" counter (S → P), and an arm in the leg-wrap check: does a braced runner fall or drive forward through a thigh wrap?

## Step 1 read: `TKL_WHIFF` + `WHIFF_MARGIN` + `TKL_EXEC_STATE` (2026-11-10)

**Run set** (`ref:report`, paired 1,321 against run-ref-13):

- Yards 3.97 → 3.90 (paired −0.07, SE 0.06).
- Missed 0.239 → 0.207 a run; broken 0.147 → 0.088; engaged-grab breaks 0.070 → 0.066.

**Defense's `yards.py`** (first contact at 1.0 yd; made / missed / broken; 8 paired games, `sim-export.ts --seed 101`):

| | Step 1 off | Step 1 on | NFL (Defense's report) |
|---|---|---|---|
| Catches, all | 59 / 1 / 33% (n 353) | 61 / 0 / 29% (n 318) | 62 / 4 / 20% |
| Catches, DB tacklers | 53 / 1 / 38% (n 244) | 56 / 0 / 34% (n 228) | 63 / — / 18% |
| Catch approach: from behind | 74% | 72% | 69–73% |
| YAC, p50 / mean | 5.0 / 10.3 | 4.5 / 10.6 | |
| Runs, all | 56 / 5 / 17% (n 302) | 63 / 4 / 15% (n 316) | |
| Runs, open field | 64 / 2 / 23% (n 56) | 47 / 0 / 34% (n 62, noisy) | |

**Gates.**

1. **Missed share: holds, but does not move toward the NFL.** Catches 1 → 0% (NFL 4%); runs 5 → 4%. The geometric whiff rarely fails from behind in space: the tackler's hands get there.
2. **Breaks fall** (runs 0.147 → 0.088; catches 33 → 29%). Explained by dropping the execution draw's low tail, which made weak holds that broke.
3. **No bug-caused regression seen.**

**Reading.** Step 1 is the right representation, but it does not fix the catch side. The gap there is the solo finish from behind: a DB who has the receiver breaks 34–38% (NFL 18%), while misses are about 0 (NFL 4%).

**Next diagnostic, ahead of the leg-wrap technique.** Why a hold from behind in space breaks.

- Is it the grip failing against the runner's pull (capacity against load)?
- Is it the hold's height (from behind `gripReach` gives 0.6–0.75, legs)?
- Is it the holder being dragged or spun off?
- Or is it his support falling?
- Trace each broken catch tackle tick by tick, with `hold-breaks.mts` style instrumentation.
- This sits beside the head-on absoluteness check: head-on leg holds look too sure on the bench, while holds from behind in space break too often in games.

## Why catch tackles fail: drag, not grip breaks (`catch-break.mts`, run-ref-13 default, 8 live games, 877 holds on catchers; 2026-11-10)

Help class at the grab = other defenders downfield of the carrier within 10 yd, a proxy for Defense's class. "Dragged" = the hold stayed on, but the carrier gained 3+ yd during it and was still at 3+ yd/s 0.5 s after the grab, the shape of Defense's "broken" class.

| Catch holds | n | Grip broke | Held but dragged 3+ yd at 3+ yd/s | Gained during the hold (p50) | Holder off his feet |
|---|---|---|---|---|---|
| Last man (help 0) | 236 | 8% | **35%** | 2.1 yd | 56% |
| Help 1 | 287 | 9% | 29% | 1.7 | 48% |
| Help 2+ | 354 | 5% | 13% | 1.1 | 49% |
| DB from behind, open field, help 0 | 73 | 11% | **44%** | 3.0 | 75% |

**The dragged holds** (212):

- legs share p50 0.57 (hips and waist); lock 0.56;
- runner at 6.3 yd/s at the grab;
- the grip loaded at its capacity (load/capacity p50 1.0);
- the **holder off his feet in 78%**;
- the hold lasts 1.4 s, while the runner gains 4.9 yd (p50).

**The grip breaks** (8–12%) are lunges and dives at full stretch on a runner pulling away (3.7–5.9 yd/s faster), lock about 0.29, gone in 0.3 s. Those are what NFL charting calls *misses*. Defense's NFL class-0 misses (7–18%) happen at the same carrier speed, about 7.5 yd/s.

**Reading.**

- The last man's failure is a hold that stays on and doesn't stop the runner. A tackler on the ground hanging off a runner's hips or waist is dragged about 5 yd.
- In football that hold, the drag-down, brings him down in a step or two. The tackler's weight hangs on the hips and thighs, his strides can't come through, and he is pulled back and down.
- It is the opposite side of the head-on question: there a leg hold downs the runner too fast (0.2–0.3 s on the bench); from behind, with the holder on the ground, it barely slows him.

**Next: a drag-down bench.**

- A holder from behind, going to the ground, with a hip or thigh hold, on a runner at 6–7 yd/s.
- Decompose the runner's deceleration: the grip's pull at capacity; the holder's ground friction while down (`FALL_FRICTION` / `DOWN_FRICTION`); hanging weight (`HANG_SHARE`); held strides (`HELD_SWING`); the runner's own drive.
- Find which is missing or capped against what a 90–100 kg man dragging on turf does.
- The target is Defense's NFL class-0 from-behind cell (made 44–57%, broken 38–46%) and its yards after contact.

## Drag-down bench (`drag-bench.mts`, 2026-11-10)

**Setup:** a CB (84 kg) behind a WR (92 kg) running at 6.5 yd/s, holding the hips (legs 0.6) or thighs (0.8), lock 0.56, the games' capacity law. The runner keeps asking for 6.5 yd/s.

| Holder | Hold | Runner falls? | Runner's travel | What the hold does |
|---|---|---|---|---|
| **On the ground** | hips 0.6 | no (up at 1.5 s) | 8.0 yd | grip at capacity, pulling 0.45 runner-mg; the holder's turf friction would resist 0.69; the stride is 69% held; **the hold slides past reach and breaks at 0.45 s**, and the runner re-accelerates |
| **On the ground** | thighs 0.8 | no | 8.1 yd | the same; breaks at 0.45 s |
| On his feet | hips 0.6 | at 1.10 s (legs) | 5.2 yd | grip 0.62 mg (at capacity); the holder plants at about 0.8 |
| On his feet | thighs 0.8 | at 0.50 s (legs) | 3.4 yd | the stride binds, a trip |

**What is missing, holder on the ground.**

1. **The grip is the bottleneck,** not the body: 0.45 mg against the holder's 0.69 mg of turf friction. The runner tows him at about 0.4 g of deceleration.
2. **An overloaded leg hold lets go.** It slides past reach and breaks. A real one slides **down the legs**: the hands run down the thighs and calves to the ankles, binding the stride. That is the drag-down and the ankle trip.
3. **The held-stride effect** (`HELD_SWING`, 69% bound) is real but needs about 1 s against his recovery stepping, and the hold is gone in 0.45 s.

**Proposed fix (off, physics; attempt 1): `LEG_HOLD_SLIDE`.**

- A grasp on the legs whose grip is overloaded while the holder is dragged migrates down the legs: its leg share rises toward 1 and its hold point moves to the shins and feet, at the slip the overload produces. It does not slide past reach and release.
- At the shins the existing trip path (a hold below the knee trips him in full) takes over.
- It releases only at the feet, when the runner's stride pulls free (the grip at the ankle against his leg drive).
- **No new strength:** the same grip capacity and the same trip law. Only where the hands go when they slip changes.
- **Checks:**
  - bench: a runner dragging a downed holder falls within about 1–2 strides, at a gain near the NFL's;
  - games: Defense's class-0 behind cell (catches 41 / 0 / 53 → NFL 58 / 5 / 35; yards after 4.8 → 3.5);
  - the head-on case must not get surer: this only acts on a dragged holder.
- **Then part 2,** the full-stretch connect probability as the whiff source.

## Drag-down: two attempts, both missed; stopped to re-diagnose (2026-11-10)

`drag-bench.mts` now reports trip / release / still dragging for three pairings: as generated, strong runner (power × 1.3) against weak tackler (× 0.75), and the reverse.

**Attempt 1, `LEG_HOLD_SLIDE` (reverted).**

- The idea: a downed holder's slipping grip slides down the legs instead of his arms stretching out of reach.
- **No effect,** because the engine already does it: the hold reaches the ankles (legs share 1.00) before it releases, with the flag off too.
- Off, holder down: released in every pairing except weak runner against strong tackler (trip at 0.40–0.45 s).

**Re-diagnosis** (tick trace, holder down, ankle hold):

- The runner's capture-point deviation grows steadily, about 2 yd/s: 0.18 → 1.07 yd in 0.4 s. His foot is held (`feetLock` 0.4–0.5), and the held-stride share is 0.69.
- **He never falls.** The World's fall threshold uses a free, full-speed recovery step: `recoverySpeed(sp, 0, fat)` in `updateSupport`, about 1.3 yd.
- Measured against the step he can actually make, he crosses at about 0.30 s. Instead, the hold slides past reach at 0.45 s.

**Attempt 2, `HELD_FALL` (reverted).**

- The idea: the threshold uses the held foot's step (`criticalDeviation` with `feetLock`).
- **Far too absolute:** every case trips at 0.05–0.20 s, including head-on (0.05 s, 0.15 yd). Strong-runner and weak-runner pairings give the same answer.
- `feetLock` is the instantaneous ratio of achieved to desired step. At the onset of a hold the foot has achieved nothing yet, so it reads near 1. That is a transient, not a sustained restriction.

**What a coherent version needs** (design question, not built):

- The point of no return for a held runner depends on the step he *can* make against the hold. That is his leg's stepping force against the grip's capacity at that height, a sustained capacity ratio from strength and grip, not the measured transient.
- A strong runner breaks a weak ankle hold and steps; a weak runner held by a strong grip cannot.
- It must not touch the head-on case, which is already too sure on the bench (0.2–0.3 s).

## Held-step threshold: attempt 1 of the new diagnosis (`HELD_STEP`, reverted; 2026-11-10)

**First, a measurement fix.** `leg-bench.mts` now measures the runner's travel to rest (down and under 0.2 yd/s), not to the start of his fall. Head-on thigh wraps still total only 0.68–0.74 yd (NFL head-on yards after contact 2.3). The head-on deficit is real.

**The law tried.** A held runner's recovery step speed × max(0, 1 − G/F):

- G = the grip capacity on him × the leg share of each hold;
- F = his leg drive (`pushForce`).

**Drag bench** (holder down / holder up; hips 0.6, thighs 0.8):

| Pairing | Downed holder | Standing holder |
|---|---|---|
| As generated | trip at 0.30–0.35 s, 2.9–3.1 yd | 0.30–0.90 s, 2.8–4.7 yd |
| Strong runner, weak tackler | **trip** at 0.40–0.45 s, 3.5–3.7 yd (should step out) | 0.65 s, or still dragging |
| Weak runner, strong tackler | trip at 0.15–0.20 s, 2.2–2.5 yd | 0.15–0.45 s |

**Head-on bench:** down at 0.05 s, **0.39 yd to rest** (was 0.25 s, 0.68 yd). Surer, the wrong way.

**Why it missed.**

1. G/F is near or above 1 for every pairing. Grip capacity at these locks is comparable to his whole leg drive, so the ratio does not separate strong runners from weak ones enough to let a strong runner step out.
2. A threshold based on the achievable step can only lower the point of no return. It **cannot make the head-on case less sure.** Integration's "one law for both directions" does not hold for this mechanism.

**The head-on deficit is a different mechanism:** the runner's forward drive and fall through a tackler in front of him, with the tackler driven back. `CARRIER_BRACE` (the runner lowering his pads and lunging) is the existing candidate. Its earlier read moved front-on gain 0.93–1.12 → 1.50–2.29 yd (NFL 2.16–2.59).

**Status.** The drag-down threshold is a real gap: a held runner is judged against a free full step. A coherent capacity for the stepping leg against the grip, one that lets a strong runner step out, is still open. Per Integration, the bench stalled, so the work switches to part 2 (the full-stretch connect probability).

## Part 2, attempt 1: `GRAB_CONNECT` (off; missed its gates; 2026-11-10)

`yards.py`, 8 paired games (`sim-export.ts --seed 101`), made / missed / broken at first contact:

| | Step 1 off | Step 1 | Step 1 + `GRAB_CONNECT` | NFL |
|---|---|---|---|---|
| Catches, all | 59 / 1 / 33 | 61 / 0 / 29 | 52 / 1 / 38 | 62 / 4 / 20 |
| Catches, DB | 53 / 1 / 38 | 56 / 0 / 34 | 52 / 2 / 39 | 63 / — / 18 |
| YAC p50 / mean | 5.0 / 10.3 | 4.5 / 10.6 | **6.5 / 12.0** | |
| Runs, all | 56 / 5 / 17 | 63 / 4 / 15 | 63 / 3 / 15 | |
| Runs, unblocked man at the line: stuff when he hits | 22% | 29% | 19% | 43% (Defense) |

**Gates.**

1. **Missed share toward the NFL's 4–9%: not met.** Catches 0 → 1%.
2. **Broken no further from the solo cells: failed.** 29 → 38%.

**Why.** A failed grab happens at full stretch (1.5–2 yd), so it never becomes a first contact within 1.0 yd on the shared index. The receiver escapes, and the *next* contact is scored made or broken. The connect check produces more failed tackles (YAC +2 yd at the median), but the index cannot see them as misses. Where it does see them, they move away from the NFL.

- **The measurement question.** NFL charted misses include full-stretch whiffs that the 1.0 yd geometric index also cannot see. Defense's NFL "missed" (4–9%) counts only contacts within 1 yd for under 0.3 s.
- **The model question.** With σ = 0.1 yd and 0.1 s closure, most full-stretch grabs on a separating runner fail. That is plausibly too strict, given NFL YAC (the sim's mean is already 10.3 against the NFL's 5.0).
- **Attempt 2** (if pursued) would calibrate the connect boundary against a *grab-distance* operator on NFL tracking: tackler within reach (1.5–2 yd) and closing, then whether the carrier slows. Not more 1.0 yd contacts.

## Grab opportunities at hands range (`grabs.py`, NFL 2022 and sim mechanics records; 2026-11-10)

**Rule.** The first frame a defender is within 1.6 yd (hands range) of the carrier and closing. Then, over 0.5 s: contact (reaches 1.0 yd), slowed (the carrier loses ≥ 30% of his speed without contact), or **runs on** (the full-stretch whiff).

| | NFL | Sim, step 1 off | Step 1 | Step 1 + `GRAB_CONNECT` |
|---|---|---|---|---|
| Catches: contact / slowed / runs on | 87 / 2 / **11%** | 74 / 7 / **19%** | 74 / 7 / 19% | 72 / 4 / 24% |
| Catches, the first man to arrive: runs on | **10%** | **28%** | 26% | 31% |
| Catches, from behind: runs on | 18% | 29% | 23% | 29% |
| Catches, carrier ≥ 7 yd/s: runs on | 19% | 30% | 36% | 42% |
| Runs: contact / slowed / runs on | 72 / 9 / 20% | 72 / 12 / 16% | 71 / 13 / 16% | 71 / 13 / 16% |

**Reading.**

- **"We never whiff" was a measurement artefact.** Our misses happen *before* 1.0 yd, at hands range, where the shared contact index cannot see them.
- On catches we already have about twice the NFL's full-stretch failures. The first man to reach hands range fails to get to contact 28% of the time against the NFL's 10%.
- `GRAB_CONNECT` adds to that excess: the wrong direction outright, not too strict. It stays off, and attempt 2 is not needed.
- Runs at hands range match the NFL.

**The catch-tackle deficit has two parts:**

1. **Hands range to contact:** 74% against 87%. The first man arrives and does not close the last yard: his approach, breaking down, the runner's cut against him. Partly Defense's (the approach); partly mine (whether the reach geometry and the runner's evasion at that range are coherent).
2. **Contact to finish:** the dragged holds (35–44% as last man).

**Step 1** (`TKL_WHIFF` + `WHIFF_MARGIN` + `TKL_EXEC_STATE`) does not need a new misses source. Its only open question is the drag, which belongs to the drag-down work.

**The catcher's half of the last yard** (`after-catch.py`, the catcher's first 0.5 s; NFL 4,799 catches, sim 416):

| | NFL | Sim |
|---|---|---|
| Speed at the catch / +0.5 s, p50 | 4.76 / 4.65 yd/s | 4.17 / 4.19 |
| Heading change over 0.5 s, p50 / p75 | **14° / 25°** | **24° / 38°** |
| Same, contested (defender < 3 yd at the catch) | 12° / 24° | 19° / 33° |
| Upfield speed at +0.5 s, p50 | 2.30 | 1.75 |

- **No burst:** our catcher is slower than the NFL's.
- **A sharper turn:** he changes heading about 1.7× as much right after the catch, contested or not.
- That fits the first man at hands range failing to close (runs on 28% against 10%). The receiver cuts away as soon as he has the ball. A real one is still securing it and turning upfield.
- **Controller, not physics:** the carrier's behaviour from the catch, which uses full open-field cut logic at once. For whoever owns the post-catch carrier (Coverage's YAC stages, with Run Game's `carrier.ts`). A catch-securing phase on observable evidence (ball security, his turn upfield) is the candidate. Not a cap on cutting.

## Drag-down, new diagnosis: a swing is all or nothing, and the hip has a strength (`SWING_STRIP`, `HIP_STRENGTH`, off; 2026-11-10)

**Two findings from the drag bench.**

1. **`HELD_SWING` compares the right quantities but applies the answer as a fraction.**
   - It compares the holders' grip moment about the runner's hip (gripCapacity × legs share × lever, lever = 0.55 · legs · COM height) with his hip torque. Then it binds the fraction total/hip of every stride.
   - A hold that loses that comparison still removes, say, 60% of each stride. His base falls behind at 0.6 × his speed and every pairing trips at 0.15–0.25 s.
   - A swing cannot be partly held. Either the hip brings the leg through the hands (and the hands are pulled down it) or the leg stays.
2. **Hip torque ignores strength.**
   - It is `HIP_TORQUE_PER_KG × mass × fatigue`, while leg drive scales with power = mass·(0.55 + 0.75·strength).
   - On the bench, the "strong runner" (power ×1.3) had exactly the as-generated runner's hip. Bracing a standing holder's thigh pull used 36% of that hip, and the remaining 0.25 equalled the grip's moment (0.243), so the hold bound him.
   - That is the mechanical reason "a strong runner never steps out": his strength never reaches the joint that has to step out.

**Torque source.** Schache et al. 2011 (Med Sci Sports Exerc 43:1260) give peak hip *flexion* torque in early swing, 4.3 N·m/kg at 8.95 m/s, about equal to peak *extension* in late swing, 4.2. So the existing hip constant serves for the swing, and no new constant is added.

**Flags (off).**
- `SWING_STRIP` (needs `HELD_SWING`): bound = 1 if the grip moment ≥ the available hip torque, else 0. A losing hold is left to the existing slip, which pulls the hands down the leg and off past reach.
- `HIP_STRENGTH`: hip torque × power / (mass × 0.925), where 0.925 is power per kg at strength 0.5. This applies to every use of the hip: stride binding, `HELD_SWING`, and the hip brace's capacity.

**Bench** (`drag-bench.mts`; runner 92 kg, holder 84 kg; trip time, or the outcome):

| Pairing | holder | legs | default | `HELD_SWING` | + `SWING_STRIP` + `HIP_STRENGTH` |
|---|---|---|---|---|---|
| As generated | down | 0.6 / 0.8 | released / released | trip 0.20 / 0.20 | released (at 0.45 s) / released |
| As generated | up | 0.6 / 0.8 | 1.10 / 0.50 | 0.25 / 0.15 | 1.05 / 0.15 |
| Strong runner | down | 0.6 / 0.8 | released / released | 0.20 / 0.20 | released / released |
| Strong runner | up | 0.6 / 0.8 | dragging / 0.95 | 0.25 / 0.20 | dragging / 1.10 |
| Weak runner | down | 0.6 / 0.8 | 0.45 / 0.40 | 0.20 / 0.20 | 0.30 / 0.35 |
| Weak runner | up | 0.6 / 0.8 | 0.80 / 0.45 | 0.20 / 0.15 | 0.20 / 0.15 |

- The weak runner trips sooner in every cell.
- The strong runner is never tripped sooner than the as-generated runner.
- Only the strong runner and the as-generated one step out of a downed holder's hold.

**Head-on bench** (`leg-bench.mts`, yards to rest at legs 0.5 / 0.8 / 1.0): 0.74 / 0.68 / 0.69 → 0.77 / 0.67 / 0.62. Not surer: this mechanism does not touch the head-on case, which is CARRIER_BRACE's.

**Game gates, registered before the games** (8 games; `catch-break.mts` seeds 101/103/105/107 × 2, flags off against on; `yards.py` on `sim-export --seed 101 --games 8`; IRN v COM, strength 0.55; both sides measured from the same geometric first contact):

1. Catch holds dragged 3+ yd at 3+ yd/s fall (off share as measured).
2. Catch broken-at-first-contact does not rise; NFL 20%, same operator.
3. Runs: paired yards and missed/broken reported. No gate, mechanism read only.
4. No-contact world bit-identical with the flags off: by construction, the off path is ×1.

## CARRIER_BRACE trace and one trigger attempt (`BRACE_EVIDENCE`, off; 2026-11-10)

Fixed ref run set (12 seeds, 1,321 runs, paired off/on, run-ref-15). Same reference on both sides: geometric first contact within 1.0 yd after the handoff, and `yards.py`'s free-man rule. Trace: `scratchpad` trace.mts, reads the carrier's command (posture 0.75 = brace) each tick.

**When the brace fires** (on): 1,833 episodes in 1,188 runs, 1.39 a run.
- No defender in the cone by true state: 13% (perceived, or the commanded heading).
- Nearest trigger at onset: dist p50 2.43 yd, gap to his arms 0.81, closing 4.75 yd/s.
- The man braced at:
  - engaged with a blocker: **50%**;
  - squared to the carrier: 64%;
  - moving toward him: 48%;
  - all three (free, squared, coming): **30%**.
- Within 0.6 s:
  - no contact: **33%**;
  - front contact with the target: 28%;
  - side contact: 32%;
  - front contact with another man: 5%.
  - Lunged 59%; lunged and met nothing 10%.
- **No cost.** Carrier speed over the next 0.3 s goes 4.9 → 5.0 into a front hit and 4.9 → 5.25 into a side hit. Turn p50 7–9°.

**The free-man cell (38 → 24% in the yards.py game read) is mostly sampling.**
- Paired, the free man makes first contact 34 → 32%. Only 7 plays are lost: 3 to another free man meeting him front-on first, 2 to engaged men, 1 to no contact.
- The game read pairs whole games whose play sequences diverge, n ≈ 70 free-man plays.
- Stuff when the free man hits: 21 → 15%.

**Added breaks by first-contact approach** (on − off): side **+28**, front +7, behind +2.
- Added misses: front +12, side +10.
- The extra breaks are mostly side contacts, so they are not the square-hit mechanism.

**Draw** (n 85):
- missed 21 → 32, broken 11 → 17;
- 1.51 firings a run, 56% at engaged men;
- front first-contact share unchanged at 44%.
- The draw's carrier runs through traffic of engaged men and braces at them. The gain is not the brace through a square hit.

**Attempt (one, per Integration): `BRACE_EVIDENCE`.** He braces and lunges only at a man he sees free of blocks and squared up to him. Perceived facing and his own blockers' seen positions are used, nothing private.

**Gates (registered before the read).**
1. Share of firings at a free squared man ≥ 70%, and firings with no contact ≤ 20%.
2. Added breaks against off are front-majority.
3. Front-on carrier gain (hitterback, zone) keeps at least half of CARRIER_BRACE's rise.

**Not attempted here.** The brace has no physical cost: a lowered posture does not slow him or limit his cut in the World. That is a physics question, noted for the World. It is not a cost to add in the controller.

**`BRACE_EVIDENCE` read (missed gates 1 and 3; stays off).** Same fixed run set and operators.

| | CARRIER_BRACE | + BRACE_EVIDENCE |
|---|---|---|
| Firings a run | 1.39 | 0.57 |
| At a free, squared man (true state; gate 1 ≥ 70%) | 40% | **64%** |
| At an engaged man | 50% | 29% |
| No contact within 0.6 s (gate 2 ≤ 20%) | 33% | 17% |
| Lunged into nothing | 10% | 2% |
| Speed over the next 0.3 s, into a side hit | 4.9 → 5.25 | 4.75 → 4.75 |
| Speed over the next 0.3 s, into a front hit | 4.9 → 5.0 | 4.7 → 3.5 |
| Added breaks (gate 3: front-majority) | side +28, front +7 | front +5, side +3 |
| Front-on carrier gain −1..0 / 0..1 / 1..3 (ref 1.13 / 1.19 / 0.98) | 1.70 / 1.65 / 1.30 | **1.14** / 1.50 / 1.17 |
| Paired yards | +0.59 (SE 0.07) | +0.11 (SE 0.03) |
| Missed + broken open a run (ref 0.304) | 0.335 | 0.309 |

**Gate verdicts.**
- Gate 1 missed (64%). The gap is perception against true state: the carrier sees a delayed picture.
- Gate 2 passed.
- Gate 3 (breaks): passed.
- Gate 3 (half the front-on rise): missed at the line (+0.57 → +0.01). Passed at 0..1 (+0.31 of +0.46) and 1..3 (+0.19 of +0.32).

**The free-man cell.** Paired, the free man's first-contact share is 34 → 34%, and only 1 play is lost.

**What the miss says.**
- Nearly all of CARRIER_BRACE's front-on gain at the line came from bracing into men who were engaged with blockers: the back lowering his pads into the pile at the line of scrimmage.
- That is real football: a back runs behind his pads into traffic at the line.
- So "free of blocks" is the wrong evidence there. The right evidence is a body squared in his path, engaged or not.
- In space, "free and squared" is right: the side-hit speed gain is gone.
- A second trigger variant (squared in his path, engaged or not, inside the line's traffic) is a new attempt and needs Integration's call.

**Physics half (Integration, 2026-11-10).** A lowered, forward-leaning posture has no cost in the World: no limit on turning rate, top speed held, or the reach of the next cut. Whether the lean law charges for a committed forward lean when the hit comes from the side is open. This is the condition before any brace variant goes on.

**Drag-down game read (`SWING_STRIP` + `HIP_STRENGTH` + `HELD_SWING`; both gates passed).**

Population:
- `catch-break.mts`: seeds 101/103/105/107 × 2 games, off against on.
- `yards.py`: `sim-export --seed 101 --games 8`, provenance check passed (third run; identical to the second).
- IRN v COM, strength 0.55, run-ref-15.
- Both sides measured from the same geometric first contact.

| | off | on | NFL (same operator) |
|---|---|---|---|
| Catch holds dragged 3+ yd at 3+ yd/s (gate 1) | 172 / 873 (19.7%) | 108 / 746 (14.5%) | |
| Hold duration p50 | 0.85 s | 0.65 s | |
| Catches at first contact: made / missed / broken (gate 2: broken no higher) | 59 / 1 / 29 | **75 / 1 / 19** | 62 / 4 / 20 |
| YAC p50 / mean | 4.8 / 8.31 | 4.7 / 8.96 | |
| Runs at first contact: made / missed / broken | 62 / 2 / 15 | 68 / 3 / 14 | |
| Runs: unblocked man at the line, stuff when he hits | 7% | 14% | 43% |

- **By help class, dragged share:**
  - help 1: 22 → 15%;
  - help 2+: 16 → 7%;
  - help 0 (last man): 24 → 26%;
  - DB from behind in the open, help 0: 28 → 37% (n 46).
- **The last-man rise is inside noise.** These are unpaired games, binomial SE about 3 and 7 points.
- **The last-man drags that remain are shorter and faster.** Duration p50 1.48 → 0.95 s, runner speed at the grab 6.1 → 7.0 yd/s, holder down 74 → 57%.
- A fast runner who strips the hold still gains 3+ yd before it comes off. That is the mechanism working, not a new drag.
- **Catch made share rises past NFL (75 against 62%).** Whether a strong runner now gets free often enough in the open field is the open question for the next read, on the grab-distance operator (`grabs.py`).

## Drag-down attempt 2: `SWING_FLEXION` + `LEGS_HELD` (off; 2026-11-11)

**The measurement that set it.** Using `catch-break.mts` with holders, bind and fall fields, the arm `HIP_STRENGTH` + `HELD_SWING` + `SWING_STRIP` bound the runner's stride in 84–89% of holds at 0.05 s, and the runner fell at p50 0.25 s.
- Of those binds, 491 were by a single holder.
- The cause is the one hip budget. The swing is compared with hip × (1 − hipUsed), and bracing the hold's pull at capacity (HIP_BRACE) drives hipUsed to 1 in the first substep.

**The attempt (both off, both inert without `HELD_SWING`).**
- `SWING_FLEXION`: the swing is compared with hip flexion, a separate action from the brace's extension (Schache 2011: 4.3 / 4.2 N·m/kg).
- `LEGS_HELD`: the bind follows the legs held, 1 + lock per holder, capped at 2. With one leg held he loses half his drive and his base is not left behind.

**Bench.**
- The bench defect is fixed: the grip now follows the tackler pairing.
- Lock 0.45: weak runners trip (0.40–0.60 s); others release.
- Lock 0.56: strong runners release in every cell; weak runners trip 0.20–0.65 s.
- Lock 0.75: strong runners trip 0.40–1.10 s or keep dragging; weak runners 0.15–0.65 s.
- Head-on to rest: 0.73 / 0.66 / 0.62 yd.
- A flags-off game is bit-identical.
- **No distinct one-leg stumble.** Below lock about 0.5, the game's grip capacity cannot hold a leg at speed, so it slides off first.

**Game reads.**

*run-ref-17, IRN v COM (pre-3a4980bf collector), seed 201, 16 games per arm.* Catches made / missed / broken:

| | off | a1 | a2 | HIP_STRENGTH alone | NFL |
|---|---|---|---|---|---|
| All | 60 / 1 / 29 | 78 / 1 / 16 | 70 / 1 / 23 | 65 / 1 / 25 | 62 / 4 / 20 |
| Class 0 | 47 / 0 / 49 | 62 / 0 / 35 | 59 / 0 / 36 | 51 / 1 / 44 | 58 / 5 / 35 |
| Class 1 | 49 / 1 / 48 | 72 / 0 / 22 | 69 / 0 / 29 | 53 / 0 / 40 | 60 / 6 / 29 |

- Single-holder full binds: 491 (a1) → 166 (a2), and those are closed wraps, lock p50 1.0.
- Runner falls at p50 0.3–0.4 s.
- YAC median / trimmed / mean ± SE: off 4.70 / 5.99 / 8.58 ± 0.44; a2 4.40 / 5.66 / 8.33 ± 0.47.
- Paired 1,321 runs: a2 −0.04 (SE 0.02), broken 0.121 → 0.127. HIP_STRENGTH alone +0.02 (SE 0.02).

*run-ref-19, with CATCH_EYES, league-sampled identities, seed 201, 16 games per arm.* Catches made / missed / broken / other:

| | off | a2 | NFL |
|---|---|---|---|
| All | 63 / 0 / 24 / 13 | 69 / 1 / 20 / 11 | 62 / 4 / 20 / 14 |
| Class 0 | 53 / 1 / 42 | 53 / 0 / 43 | 58 / 5 / 35 |
| Class 1 | 49 / 0 / 47 | 67 / 0 / 31 | 60 / 6 / 29 |
| Class 2+ | 66 / 0 / 24 | 66 / 0 / 25 | 64 / 3 / 22 |

- Runs, class 0: 36 / 2 / 48 → 64 / 0 / 28 (n ≈ 40; NFL 46 / 9 / 39).
- Runs, class 1: 59 / 0 / 29 → 59 / 2 / 30 (NFL 50 / 6 / 36).
- YAC: off 4.00 / 5.52 / 8.23 ± 0.47; a2 3.40 / 5.23 / 8.19 ± 0.50.

**Gates.**
- Class 1 back toward the NFL: met on both bases.
- Class 0 held on catches: met. On run-ref-19 class 0 doesn't move (53 / 43 both); the run-ref-17 gain (47 / 49 → 59 / 36) is not there after CATCH_EYES.
- Overall made no higher than the NFL: missed (69 against 62).
  - The difference sits in missed (1 against 4) and other (11 against 14): the connect gap, not the bind.
  - Broken is 20 against 20.
- Strength ordering on the bench: met.

## The sack gap is the throw after contact, not the finish (`sack-hold.mts`, `qb-contact.py`; run-ref-19; 2026-11-11)

`qb-contact.py`, same code on the NFL (BDB 2025, 9,713 dropbacks) and the sim (run-ref-19 sim-export, seed 201, 16 games, 1,381 dropbacks):

| | NFL | sim |
|---|---|---|
| Defender within 1.0 yd of the QB before the ball is out | 12.5% | 13.0% |
| Of those: thrown | 30% (0.30 s after contact) | **70%** (0.10 s after) |
| Of those: not thrown | 70% (1.05 s) | 30% (0.80 s) |

`sack-hold.mts` (run-ref-19, IRN v COM, 16 games, 1,512 dropbacks, sacks 3.0%; 176 contacts before the ball is out).

The windup had started before contact in 134 of the 176 (76%). By when the hold began:

| Hold began | n | Ends | Throws |
|---|---|---|---|
| Before any windup | 34 | sack 91% | first contact → sack p50 0.65 s |
| During the load | 13 | throw 100% | complete 46%, 4.9 yd/att, held 0.72 at release |
| During the delivery | 79 | throw 100% | complete 47%, 8.5 yd/att, held 0.73 at release |
| No hold | 50 | | |

**Reading.**
- Rushers arrive as often as in the NFL, and a hold on a set QB finishes him faster than the NFL.
- The gap is what happens after contact. Our QB's throw is already under way when the rusher arrives, and it comes out, often complete.
- The load exemption in `qb.ts` (a windup in progress is immune to the hold) covers 13 plays; the delivery covers 79.
- A throw delivered with a man at 0.73 hold still completes 47% at 8.5 yd/att.
- That is the QB's timing against the rush and what contact does to a throw in motion: `qb.ts` (Coverage) and the ruling (Rules + Coaching). It is not the tackle finish.

### Sacks, attempt 1: `THROW_BODY` (off; physical half; gates registered before the read)

**The NFL reference** (`qb-contact.py`, BDB 2025, 9,713 dropbacks): a defender within 1 yd of the QB before the ball is out on 12.5% of dropbacks.
- 30% of those are thrown; contact to throw, quartiles 0.0 / 0.3 / 1.1 s.
- Throws after contact: 33% complete, 4.5 yd/att.
- Clean throws: 62% complete, 7.2 yd/att.

**Sim, run-ref-19:** 13.0% of dropbacks; 70% thrown (0.0 / 0.1 / 0.1 s); 47% complete at 9.0 yd/att. Clean throws: 64% at 10.6.

**Mechanism.**
- A hold acts on the throw through what it holds: interference = heldBy × (1 − the highest grasp's leg share).
- In the load, it pins the arm with that chance, rolled once per throw, and the throw is abandoned.
- A throw out under a hold is an arm throw to that degree. It uses the flick's existing speed and accuracy costs, so there is no new constant.
- A flags-off game is bit-identical.

**Gates** (league-sampled sim-export seed 201, 16 games, off against on; sack-hold IRN v COM 16 games):
1. Thrown after contact moves toward the NFL's 30%.
2. Completion and yd/att on throws after contact move toward 33% / 4.5.
3. The sack rate moves toward 6.3%.
4. No leak into clean-pocket throws: completion and yd/att within noise.
5. INT rate on hit throws reported.

## Pass-TD check on the drag-down set (`td-hold.mts`, run-ref-21; 2026-11-11)

**Question.** Three run-ref-21 league cards showed pass TD rate 7.6 → 8.9% with the five flags on, at about the same yards. Is it a defect in the binding?

**Population.** Seeds 11 and 23, 16 games each, five flags =0 vs =1. Unpaired: the arms diverge.

| | seed 11 | seed 23 |
|---|---|---|
| TDs | 85 → 76 | 118 → 111 |
| TDs per completion | 9.2 → 8.6% | 12.8 → 11.4% |
| Held before scoring | 48 → 37 | 53 → 58 |

- Yards after the first hold, catches inside 10 yd: 1.27 → 1.52 and 1.66 → 2.08. That is about +0.33, roughly 1.3 SE.
- Flat or down elsewhere.

**Tick traces** (seed 23 game 1, flags on). The stride never binds in any of them:
1. An ankle grab (lock 0.2) slides off in 0.4 s.
2. An upright waist wrap from behind; the runner carries the holder 2.9 yd in 0.55 s.
3. A front waist wrap; the holder is driven back 4.2 yd over 1.25 s.

A waist hold's moment never reaches hip flexion, flags or not.

**Verdict.** No path from the binding to these TDs, and the rise does not reproduce on run-ref-21.

**Open items** (not in this flag set; queued after sacks):
- **(b)** An upright waist wrap from behind that runs with the carrier and never commits weight. This is the holder's finish (HOLD_FINISH territory).
- **(c)** The head-on waist wrap driven back about 4 yd (NFL head-on yards after contact 2.3).

### Sacks, attempt 2 (timing half): `PICTURE_AGE` (off; gates registered before the read)

**The diagnostic** (`throw-path.mts`, IRN v COM, 16 games, run-ref-19).

140 throws were hit by a defender within 1 yd before release:

| Path | Hit throws | Detail |
|---|---|---|
| Hot / panic | 65 | 78% of that path's throws are hit; felt 0.42 s at the start; 89% to a receiver he was not reading; complete 53% |
| Current read | 60 | felt 1.66 s at the start, contact 0.3 s into the throw |

- The current-read case comes through `held()`'s credit for a rusher still engaged, built from the private `engagement.win`. That is the next item, as its own flag.
- The panic case: his completion estimate for an unread receiver comes from a picture that ages without growing uncertainty.

**Mechanism.**
- Each picture's position uncertainty is what the body could have done since he saw it, from its own acceleration (A = vmax / tau) over the age:
  - defender: min(A t²/2, vmax t);
  - receiver: min(A t²/2, v t).
- In time, it widens the margin spreads in quadrature.
- A fresh read changes nothing.

**Gates** (league-sampled sim-export seed 201, 16 games, THROW_BODY=1 in both arms, PICTURE_AGE off against on; sack-hold and throw-path IRN v COM 16 games):
1. Thrown after contact moves toward 30%.
2. Sacks move toward 6.3%.
3. Hit-throw completion and yd/att move toward 33% / 4.5.
4. No leak into clean throws.
5. By path: completion and target share for current-read, rhythm and outlet throws within noise. A rhythm suppression is reported as a cost.
6. The alternative taken when the gamble doesn't pay, split as sack / throw / scramble / throwaway against the NFL.

**`PICTURE_AGE` read (missed gates 1, 3 and 5; stays off).**

Population: run-ref-23 (develop facb5e0f merged); both arms THROW_BODY=1; PICTURE_AGE 0 vs 1.
- `qb-contact.py` on league-sampled sim-export, seed 201, 16 games.
- `sack-hold.mts` and `throw-path.mts`, IRN v COM, 16 games.

| | THROW_BODY | + PICTURE_AGE | NFL |
|---|---|---|---|
| Sacks (sack-hold) | 4.5% | **6.3%** | 6.3% |
| Defender within 1 yd before the ball is out | 13.1% | **20.6%** | 12.5% |
| No throw at all | 8.4% | 15.5% | 11.0% |
| Rusher within 1 yd: throw / sack / scramble | 61 / 35 / 4 | 59 / 38 / 3 | 30 / 47 / 23 |
| Throws after contact, complete / yd/att | 43% / 6.4 | 44% / 7.6 | 33% / 4.5 |
| Clean throws, complete / yd/att | 62% / 10.8 | 62% / 10.2 | 62% / 7.2 |
| Rhythm throws in the drop | 233 | **101** | |
| Hot / panic throws | 83 | 102 | |
| Out-of-reads throws | 47 | 88 | |

**Verdict.** The sack rate reaches the NFL by the wrong path.
- He holds the ball: rhythm throws are cut by more than half, so rushers reach him about 1.6 times as often.
- Thrown-after-contact and hit-throw quality don't move.
- Panic throws increase.

**The defect.** The receiver term ages a never-looked-at receiver from the snap. A rhythm throw goes to an installed route on timing; its uncertainty is the defender, whom he sees, not the receiver. That is the cost Integration predicted.

**Two attempts on sacks: stop and re-diagnose.** What both attempts leave:
1. The QB's throws still come out when rushers arrive mid-throw.
2. NFL QBs escape 23% of the time once a rusher is at 1 yd; ours 3–4%.
3. `held()` credits an engaged rusher from the private `engagement.win`. It is the source of the 60 current-read hit throws and the next item, as its own flag.

### `THROW_BODY` alone: candidate read (run-ref-24; 2026-11-11)

**Population.** League-sampled sim-export, seeds 201 and 301 (16 games each, THROW_BODY 0 vs 1); sack-hold IRN v COM, 16 games. NFL: BDB 2025, same operator.

| | seed 201 off → on | seed 301 off → on | NFL |
|---|---|---|---|
| Rusher at 1 yd: throw / sack / scramble | 75 / 21 / 4 → 65 / 30 / 6 | 72 / 23 / 5 → 63 / 33 / 4 | 30 / 47 / 23 |
| Throws after contact, complete / yd/att | 40% / 6.3 → 38% / 6.3 | 48% / 7.1 → 42% / 5.5 | 33% / 4.5 |
| Clean throws, complete / yd/att | 62% / 9.9 → 62% / 11.2 | 61% / 8.6 → 63% / 8.8 | 62% / 7.2 |
| YAC mean | 8.01 → 10.09 | 6.34 → 5.89 | |

**Sack-hold** (16 games):
- Sacks: 3.8 → 5.6% (NFL 6.3).
- A hold before the windup ends in a sack: 82 → 94%.
- Load-phase holds: 12 → 4 (pinned throws are abandoned).
- Delivery-phase holds: 41% / 4.9 → 32% / 3.6.
- INT on hit throws: 1–2%. Fumbles: none. THROW_BODY never knocks the ball loose; `passerLoss` is ready for that piece.

**The seed-201 YAC jump is divergence.**
- In game 201, the first difference is a held throw's ball flight, from frame 28. Every play before it is identical.
- Fatigue then carries the change into later plays.
- On seed 301 the YAC shift reverses.

**`passerLoss`** (Rule 8-1-1, per Rules + Coaching) is in `ball-rules.ts` with tests.

### `QB_FEEL` read on top of `THROW_BODY`, and a correction (run-ref-24; 2026-11-11)

**Population.** League sim-export, seed 201, 16 games; sack-hold and throw-path, IRN v COM, 16 games. Both arms THROW_BODY=1; QB_FEEL 0 vs 1.

| | QB_FEEL off | QB_FEEL on | NFL |
|---|---|---|---|
| Sacks (sack-hold) | 5.6% | 4.7% | 6.3% |
| Rusher at 1 yd: throw / sack / scramble | 65 / 30 / 6 | 64 / 36 / **0** | 30 / 47 / 23 |
| Throws after contact, complete / yd/att | 38% / 6.3 | 46% / 8.1 | 33% / 4.5 |
| Current-read hit throws | 44 | 42 | |
| Panic throws | 77 | 111 | |

It misses the same way as its own two attempts: fewer sacks, and its pocket move removes the scrambles.

**Correction.** Earlier I attributed the current-read hit throws to `held()`'s private `engagement.win` credit, citing "felt 1.66 s". That was the median over all current-read throws, not over the hit ones.
- For the hit current-read throws he felt the rusher at p50 **0.51 s** (quartiles 0.47–0.57), in both arms.
- Contact came 0.30 s after the throw started.
- He knew the rusher was about half a second away and threw anyway, about 0.2 s optimistic: constant-velocity extrapolation of an accelerating rusher.
- The private credit is still a model-rule violation, but it is not the cause of these hits.

## Escape: what the QB's body does before contact (`qb-escape.py`, `qb-pocket.py`, `pocket-trace.mts`; run-ref-24 + THROW_BODY; 2026-11-11)

**In the 0.5 s before a rusher reaches 1 yd** (NFL BDB 2025, 1,211 dropbacks; sim league seed 201, 16 games, 181):

| | NFL | Sim |
|---|---|---|
| QB speed (p50) | 2.25 yd/s | 1.05 yd/s |
| Moving (≥ 1.5 yd/s) | 70% | 34% |
| Toward the line (p50) | +0.60 | −0.20 |
| Moving: throw / sack / scramble | 27 / 43 / 30 | 51 / 39 / 10 |
| Set: throw / sack / scramble | 38 / 57 / 5 | 72 / 25 / 3 |

**Pocket path from set (deepest frame) to release, pressured:**

| | NFL | Sim |
|---|---|---|
| Path, p50 / p75 | 0.44 / 1.72 yd | 0.10 / 0.39 yd |
| Speed, p75 | 1.67 yd/s | 0.60 yd/s |
| Forward, p75 | 0.9 yd | 0.2 yd |
| Lateral, p75 | 0.8 yd | 0.1 yd |

- Set depth is fine: 7.6 against 7.9 yd, and −2.8 against −2.45 yd behind the tackles.

**`pocket-trace.mts`, the 132 set cases** (IRN v COM, 16 games):
- 86 asked to be set: the request was under 1.5 yd/s.
- 46 asked to move (p50 2.6 yd/s) but started too late to show in the 0.5 s window.
- Last 0.8 s: `pocketMove` 50% of ticks, windup 30%, drop 11%.

**`POCKET_CLIMB` (off), bench iterations, not yet read in games:**
1. **v1:** weigh standing against eight directions at 2.2 yd/s by felt time to contact one windup ahead. It moved on 995 of 1,003 calls, drifting with nobody near. Defect: any gain triggered a move.
2. **v2:** move only when he couldn't finish a throw where he stands. Barely moves: `held()`'s private credit (0.35–1.75 s for an engaged rusher) hides closing rushers.
3. **v3:** + `BLOCK_SEEN` (perceived block geometry in `held()`, QB_FEEL's, without its pocket move), and a horizon of the rest of the current read plus the windup.
   - With a rusher within 3 yd, the QB had 1,484 ticks, but `climb()` was consulted on only 285. It moved on 71.
   - The rest go to the windup, the drop and the throw decisions.

**Finding.** Pocket movement cannot live in `pocketMove` alone. The decision each tick under a closing rusher (throw now, keep reading while moving, escape) is spread across the set logic's branches. Building it is a controller restructure of the set phase, not one function.

### `BLOCK_SEEN` alone (run-ref-24/25 with THROW_BODY on; 2026-11-11)

**Population.** League sim-export, seed 201, 16 games; sack-hold and throw-path, IRN v COM, 16 games. Both arms THROW_BODY=1.

| | BLOCK_SEEN off | on | NFL |
|---|---|---|---|
| Sacks (sack-hold) | 5.6% | **4.3%** | 6.3% |
| Rusher at 1 yd: throw / sack / scramble | 65 / 30 / 6 | 69 / 29 / 2 | 30 / 47 / 23 |
| Throws after contact, complete / yd/att | 38% / 6.3 | 38% / 7.1 | 33% / 4.5 |
| Hot / panic throws (throw-path) | 77 | **139** | |
| Hit throws (throw-path) | 109 | 159 | |
| Felt minus actual time to contact on hit throws (p50) | 0.15 s | 0.14 s | |
| Pressured pocket path p75 | 0.39 yd | 0.30 yd | 1.72 yd |
| YAC mean | 10.09 | 8.83 | |

YAC differs by divergence, as on that seed before.

**Reading.**
- Truthful perception of a rusher in a block makes the QB feel pressure sooner.
- In the current set logic that sends more decisions into the hot/panic branch, which throws to anyone with P > 0.3: panic throws nearly double, and sacks fall.
- That is the branch the set-phase restructure replaces.

**Recommendation.** Ship BLOCK_SEEN with the restructure, which depends on it, not alone.

## Set-phase decision under pressure: design and interface (`SET_DECIDE`, off; proposed 2026-11-11)

**Football to build to** (`qb-moves.py`, NFL pocket dropbacks with a rusher at 1 yd, designed movement removed):
- 40% end outside the tackle box (13% with no rusher near). 69% of those leave away from the rusher; 69% set inside first and leave about 1.6 s after setting.
- Climbed 3+ yd: 15%. Slid: 9%. Stood: 24%.
- Throws from outside are poor (27% / 3.3); throws after climbing are good (55% / 9.2).
- Ours: outside 3%, slid 0%, stood 71%.

**One decision per tick under pressure** (felt time to contact at his spot below the time he still needs: the rest of his current read plus a windup). Same felt evidence throughout: `felt()` + `held()` (with `BLOCK_SEEN`: the perceived block read).
1. **Throw** if the read logic offers a throw it would take now (its own thresholds, unchanged).
2. **Move** otherwise, if a reachable spot buys the time he needs. Candidates: climb, slide either way, outside the box either way, judged by felt time to contact at the end of the needed time. He commits to a direction for one reaction time (no tick-to-tick jitter), and keeps reading while he moves: the read clock runs and his eyes stay downfield.
3. **Escape** when moving finds a lane past the line and the read logic offers nothing (the existing `shouldScramble` lane check, from where the movement has taken him).
4. **Trapped** (no spot buys time, no lane): the existing hot path (its throw-it-to-anyone bar), throw-away or evade, unchanged.

With nobody near, none of this runs. That is the clean-pocket test, and v1's drift is the failure it must not show.

**Interface wanted from the read logic** (Coverage's; called, not rewritten). One function would decouple us:
`bestThrowNow(a, sim, urgency): { ev: ThrowEval | null, take: boolean }`
- It wraps today's current-read / outlet / out-of-reads choice and its thresholds.
- `take` = it would start this throw now.

Until then, `SET_DECIDE` calls `ready`, `evaluate`, `bestOption` and the existing need/risk thresholds directly. The read order (readIdx / readStart / dwell) advances as today.

**Gates** (registered here, before the build):
1. Pressured pocket path p75 0.39 → toward 1.72 yd; forward and lateral toward 0.9 / 0.8.
2. Rusher at 1 yd: ends outside toward 40%, away from the rusher about 70%, climbed 3+ toward 15%.
3. Throw / sack / scramble toward 30 / 47 / 23.
4. Clean pocket: ends outside stays near 13% (no drift).
5. Time to throw.
6. Throws on the move cost accuracy (missSigma's existing speed term), reported.

Read with and without `BLOCK_SEEN`.

### `SET_DECIDE` bench iterations (off; 2026-11-11)

Two games (seed 401–402, IRN v COM league identities), THROW_BODY=1, with and without BLOCK_SEEN. qb-moves / qb-pocket, small n (17–29 rusher-at-1-yd dropbacks per arm).

1. **v1** (the decision before the hot path): moved, but in bursts of about 2 ticks. It re-decided every tick, and one step made standing look safe again.
2. **v2:** the time he needs is the rest of the read, or a full new look when it is done, plus a windup; and it runs in the drop. The 451 earlier "null with a rusher near" cases were "still has time", because the criterion counted only a windup.
3. **v3:** a committed direction runs for one reaction time. Moves last p50 4 ticks.
4. **v4:** no retreat past the set depth. The greedy time-to-contact always chose backward: straight-line reach doesn't see his blockers walling off the front. NFL pressured QBs retreat about 0%.

| Rusher at 1 yd | Stood | Outside | NFL stood | NFL outside |
|---|---|---|---|---|
| Off | 71% | 3% | 24% | 40% |
| v4 | 74% | 7% | | |
| v4 + BLOCK_SEEN | 61% | 7% | | |

- Clean pocket: ends outside 1% (no drift; passes v1's failure test).
- Pressured pocket path p75: 0.2–0.3 yd (NFL 1.72).

**Re-diagnosis.** In the pressured ticks:
- drop 32%;
- windup 28%: he is already throwing;
- set phase about 36%.

The current-read throw check runs before the decision. With a rusher bearing down he still starts a throw that, by his own felt time (0.15 s optimistic: a constant-velocity extrapolation of an accelerating rusher), he expects to finish. Then contact lands in the delivery, and the play classifies as "stood, threw".

So the movement can't show until the throw decision under imminent pressure uses the same evidence. That means a felt time to contact that sees closing acceleration, and asking "can I finish this throw before he arrives" before starting it.

### `SET_DECIDE` game read (16 games; misses its movement gates; stays off)

**Population.** League sim-export seed 201, 16 games; run-ref-25 (THROW_BODY on in every arm). NFL: BDB 2025 pocket dropbacks, designed movement removed, same operators.

| Rusher at 1 yd | THROW_BODY base | SET_DECIDE | + BLOCK_SEEN | NFL |
|---|---|---|---|---|
| n | 181 | 145 | 116 | 897 |
| Throw / sack / scramble | 65 / 30 / 6 | **49 / 46 / 6** | 59 / 41 / 1 | 30 / 47 / 23 (pocket: 29 / 49 / 22) |
| Stood | 71% | 66% | 70% | 24% |
| Ended outside | 3% | 6% | 3% | 40% |
| Climbed 3+ | 8% | 4% | 3% | 15% |
| Left away from the rusher | | 88% | | 69% |
| Throws after contact, complete / yd/att | 38% / 6.3 | **35% / 4.3** | 40% / 6.6 | 33% / 4.5 |

| All dropbacks | base | SET_DECIDE | + BLOCK_SEEN | NFL |
|---|---|---|---|---|
| Sacks | 5% | 7% | 5% | 7% |
| Clean throws, complete / yd/att | 62% / 11.2 | 63% / 9.3 | 63% / 9.7 | |
| Clean pocket ends outside (no drift) | 1% | 1% | 1% | |
| Pressured pocket path p75 | 0.39 yd | 0.24 yd | 0.21 yd | 1.72 yd |

YAC mean 10.09 → 8.02 ± 0.45: divergence on this seed, as before.

**Gates.**
- Hit-throw quality: met.
- Sack share at contact and the overall sack rate: met.
- Clean pocket: no drift, met.
- **Movement: missed.** Stood 71 → 66% is not material; ends-outside 6% against 40%; scrambles flat; pocket path flat.

**What worked.** `canFinish` with `feltClosing`. Not starting a throw he can't finish before the rusher he sees closing turns the 65% thrown-after-contact into 49%, and the extra plays become sacks, as in the NFL.

**What didn't.** The movement. Straight-line time to reach makes every spot near a closing rusher look covered: it sees rushers, not his blockers walling them off. So he still mostly stands until he's hit. With `BLOCK_SEEN` the engaged rushers count sooner and he freezes more.

**Next piece (Integration's note).** A spot's value from what he sees of bodies: a spot is good if no free rusher has an unblocked path to it and no teammate is standing in it. The NFL direction data (69% away from the rusher who reaches him; outside 40%) should fall out of that.

**Correction: what produced SET_DECIDE's throw/sack gains** (2026-11-11).
- `FINISH_CHECK` (the finish check alone) is a no-op: 69 calls, 0 refusals on one game. When the read logic offers a throw, the felt rusher (feltClosing included) is still about 0.5 s out, so the check passes.
- What changed under SET_DECIDE (throw-path, seeds 201–202, run-ref-26):
  - hot/panic throws 11 → 0;
  - hit throws 18 → 9;
  - refusals 9, only after he has moved.
- `setDecide` pre-empts the hot path: the panic throw is reached only when no spot buys time.
- The gain belongs to the decision structure. It doesn't split from the movement evaluation, which supplies the "trapped" test.

### Movement attempt (b): spot value from the bodies he sees (off; bench miss; 2026-11-11)

**Mechanism** (under SET_DECIDE).
- A rusher's time to a spot adds a detour around any teammate body on the line between them: 0.2 s + (width − offset) / 2, the perceived block read's geometry. It replaces `held()` in the decision.
- Spots with a teammate standing in them are excluded.
- In the drop the decision needs the rest of the drop plus a windup.
- Ability, perception and disposition are named in the code; `MOVE_FOR = 0` is the league-average disposition hook.

**Bench** (2 games, seed 401–402):

| | Rusher at 1 yd (n) | Stood | Throw | Outside |
|---|---|---|---|---|
| Walls | 17 | 71% | 71% | 6% |
| Walls + BLOCK_SEEN | 9 | 100% | 67% | 0% |
| NFL | | 24% | 30% | 40% |

- Throw-path, seeds 201–202, off → walls: rhythm 34 → **13**, outlet 25 → 6, panic 11 → 1.
- No-throw outcomes: sack / scramble / other 6 / 3 / 0 → 4 / 5 / 3. The "other" are strip-sacks (hit, fumble, recovery).

**Verdict.**
- Walled rushers count late, so standing looks safe almost everywhere and he moves even less.
- Rhythm throws are still suppressed with the drop gate, so something else in the decision pre-empts on-time throws. Not found yet.
- Two movement designs (straight-line time to reach; time to reach around his blockers) have missed in the same place. **Stop and re-diagnose.**

**Re-diagnosis needed before a third design.**
1. Find what removes rhythm and outlet throws under SET_DECIDE: trace the drop and outlet decisions on the plays that lose them.
2. On NFL film, what the QB sees at the moment he starts to leave (about 1.6 s after setting): which rusher, how far, whether engaged, and the blocker geometry. Same measures on ours.

The trigger needs to be grounded in that evidence, not in a time-to-reach model.

**Defect found and fixed: SET_DECIDE's drop hook** (re-diagnosis item i).
- The drop hook (added in v2) needed "the rest of the drop plus a windup", about 1.9 s at the start of the drop, which nearly every rusher beats.
- It ended the drop on **152 of 182** pass plays, at about 1% into the drop, always moving backward. The QB was in the set phase from the snap: his reads started at the line, and no rhythm throw was possible.
- **That contaminates the earlier SET_DECIDE 16-game read**: its rhythm suppression, and part of its throw/sack and movement numbers.
- Removed. SET_DECIDE now acts only in the set phase.
- Throw-path, seeds 201–202, off → fixed: rhythm 34 → 32, outlet 25 → 19, panic 11 → 2, hit throws 18 → 13, sacks 6 → 14, scrambles 3 → 10.
- League export, seeds 401–402, rusher at 1 yd (n 31): throw / sack / scramble 42 / 55 / 3; stood 71%, outside 6%.
- **Movement is still missing. Item ii (what NFL QBs see when they start to leave) stands.**

### Re-diagnosis (ii): what a QB sees when he starts to leave (`qb-leave.py`; 2026-11-11)

**Operator.** NFL BDB 2025 pocket dropbacks (designed movement dropped) and the sim (league seed 201, 16 games, THROW_BODY on), same code.
- LEAVE plays: he ends outside the box or climbs 3+ yd. The frame is the first after set over 2 yd/s.
- STAY plays: he stands. The frame is set + the leave plays' median time.
- AUC = how well each measure separates leave from stay.

| Measure | NFL leave | NFL stay | AUC | Sim leave | Sim stay |
|---|---|---|---|---|---|
| Time since snap | 2.90 s | 2.40 s | 0.82 | 3.10 | 2.70 |
| Nearest **winning** rusher distance | **3.25 yd** | **5.23 yd** | 0.32 | **7.22** | **7.97** |
| Nearest rusher closing speed | 1.18 | 2.52 | 0.31 | 0.31 | 1.66 |
| Nearest rusher distance | 2.64 | 3.12 | 0.39 | 2.83 | 3.30 |
| Time since set | 0.40 | 0.30 | 0.57 | 0.75 | 0.50 |
| Largest lane in front | 5.00 | 4.80 | 0.54 | 6.00 | 6.90 |
| Best receiver separation | 5.43 | 5.22 | 0.53 | | |
| Anyone > 3 yd open | 87% | 90% | 0.48 | | |
| Nearest winning rusher front / edge / behind | 39 / 53 / 7 | 61 / 38 / 1 | | 54 / 42 / 4 | 70 / 28 / 3 |

- "Winning" = a defender nearer the QB than the blocker nearest him, or with no blocker within 1.2 yd.
- n: NFL leave 922 / stay 1,834; sim leave 48 / stay 760.

**Reading.**
- NFL QBs leave when a rusher who has beaten his man is close (3.3 against 5.2 yd), more often from the edge, and later in the down.
- Coverage (anyone open), at this threshold, doesn't separate leave from stay.
- **In our games, the nearest winning rusher is 7–8 yd away at the same moments. Our rushers don't visibly win their rep until they're nearly on the QB**, so a QB reading leverage gets no cue.

**Ability.**
- Our QBs' top speed on throw plays (deciles 3.3–6.5 yd/s, mostly the drop) is above the NFL's (1.8–4.9). On scrambles: 7.4 against 8.1.
- "Never leaves" is not ability.

**Implication for the movement design.**
1. The trigger should be the leverage read: a rusher he sees past his blocker, nearer than the blocker, at about 3 yd, especially off the edge; not a time-to-reach model.
2. Our pass rush rarely presents that picture at distance. Rushers win late and close.
3. So part of the fix is upstream, in how a pass rush wins its rep over time: the OL/DL engagement, which is Defense's and the run-block lane's. That should be measured with the same leverage operator on NFL and sim before a third movement design.
