# Tackle forms: what the engine can represent (2026-11-10)

Tanner's question: how much of the real variety of tackles can we represent? This is an inventory of the engine
(`src/sim/tackle.ts`, `src/physics/world.ts`) against the forms tackles take on film. Then a measurement plan to quantify
variety on NFL tracking and in the sim with the same operators. Diagnosis only; nothing here is built.

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
