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
