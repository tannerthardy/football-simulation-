# Blocking Phase 2 design note: arms and hands (before any code)

Tools/Physics, 2026-11-24, for Integration and the outside reviewer. No code is written for this phase; the one scratch test (`2026-11-24-blocking-phase2-hand-height-test.md`, code on `tools/phase2-scratch`)
only checked where the pad lever lives. This note takes the plan's section 2C-2D, the outside spec's section 3 (critiqued below), the Phase 0 table and that scratch result, and says what Phase 2 builds, in what order,
behind which flags, and what proves it.

## 1. What the evidence says Phase 2 has to do

- **Strength and pad level are inert because the contact has no geometry.** One line joins two chests. A hand has no place across the shoulder line and no height, so no arm can lift, tip, turn or be set outside; `reach`
  and `press` are read by nothing that binds (the two 0.00 rows); a man's push is whatever his legs and grip give, and the contest is leg against leg or grip against grip.
- **The lever exists once the hands have a height** (scratch test): the vertical force on a man is `F x (the rise of each arm)`, and the difference of the two men's hand heights is a bigger term than the pad gap seen in games
  (offset difference 0.1-0.3 yd, against a median pad gap of 0.04-0.07 yd). Counting both arms (one per man) doubled the lift and brought the pad rows back at grip 1.3 (+0.09 -> +0.58); a high man with his hands on the low man's shoulders cancelled it
  (-0.21 body weights on the low man, pad rows +0.04). Hand height above the other man's centre of mass tips him (a 0.1 yd offset moves the walk-back up to 1 yd/s).
- **The standing-a-man-up still needs more than geometry gives**: 0.13-0.45 body weights of lift against about 0.6-1.0 held (`POSTURE_HOLD`, dormant). It wakes only when the arm can deliver a vertical force beyond the contact force's share,
  i.e. an arm with a capacity behind it (section 3).
- **Where the retreat is decided is the set**: 80-90% of an engaged pass blocker's retreat is his own request (plan section 8). Phase 2 does not change that; Phase 4's pass set does.

## 2. The model, in what the World holds

**Bodies stay reduced** (a COM, a base, pads at a pad height, a chest segment of half-span `CHEST_HALF`): no skeleton. **Each man gets two arms.** An arm is a strut:

- shoulder point: on the man's shoulder line (across his facing, +-`SHOULDER_HALF` about his chest centre) at his pad height `padHeight(posture)`;
- hand point: on the *other* man's torso patch (`HandJoint.contact` already carries a persistent material point `{on, local}` in the body frame, used under `handContact: 'patch'`; today shared by both hands): a place across his shoulder line `y_k` in `[-CHEST_HALF, +CHEST_HALF]` and a height `z_k`;
- a length limit `L = profile.reach` (derived from arm length, `0.25 + 0.85 x armIn`): the hand cannot be farther from the shoulder than `L`; the elbow angle is `theta = 2 asin(d / L)` for the straight-line reach `d` (an equal-segment two-link arm: forearm = upper arm; fine for a reduced model and checked below);
- state: `free | open | grip | slipped | displaced` (Phase 3 owns the transitions; Phase 2 owns the physics of each state).

**Contact force of an arm** = a force at the hand point, resolved on the *contact surface*, not on the arm:

- the **normal part** (into the other man's chest surface, `n`, the outward normal of his torso patch at that point) is the arm's push, `0 <= F_n <= F_axial(theta)`;
- the **tangential part** (along his surface: steering, holding, turning) is bounded by `min(mu_hand x F_n + (grip tension if gripped) , tau_shoulder / d)` (open hand: friction on the pad; gripped: also cloth);
- the *direction of the arm* is geometry (shoulder to hand), and the force the arm carries is along it (a strut), so the pair (normal, tangential) is a decomposition of one force: no extra `cos(flare)` on any capacity
  (the outside spec puts `cos phi` on every term; that counts the flare twice when the line is built from the two points).

**Capacities** (all stated; the sources are in the Phase 0 note):

| Quantity | Value / form | Source status |
|---|---|---|
| Axial push at lockout | the man's bench max `press` (2.1-2.3 kN for the staged linemen) | combine bench via Epley: derived, as in `supportParams` |
| Extension curve `f(theta)` | 1 at lockout, a stated dip in mid-range, falling when jammed | **no source for a two-handed push by elbow angle** (Seo et al.: one hand, seated, pull 1.29x flexed pull, flexed pull 1.26x flexed push; the lockout versus mid-range push ratio is untested; Lum's 90 degree sticking region is second-hand): a stated choice with a range |
| Pull (grip) | up to `min(grip friction, arm pull at that extension)`; one hand 340-500 N bare/rigid, lower through cloth | Seo 2010, Escobar-Molina 2023; Run Game's `ONE_ARM_PULL` (444 N, 250-444 N range for a jersey) is the cloth limit |
| Hand-on-pad friction | 0.4-1.1 by material (jersey/pad: unknown) | Seo 2010 (smooth to rubber); a stated choice for the jersey |
| Shoulder transverse torque | `tau_shoulder`, from the same bench rating (a stated fraction) | **no source**; the feet and trunk take what the arm cannot (Integration's note) |
| Hand speed, reach and re-fit | 4-6 m/s punch (a choice, boxing 7-9 m/s); re-fit latency 25-100 ms | Liu 2022, Piorkowski 2011, Weiler 2015; no lineman figure |

**The pair is solved together, each substep**: rows are the two men's up to four hand points (two per man); each row's unknowns are its normal and tangential impulse; the solve is `solveHands` extended from one row to up to four
with the arm budget per man shared (`allocateArms` already allocates the arm budget per body; the new allocation is per arm). Momentum and **angular momentum** close because every impulse is applied as an equal and opposite pair at its point
(the open defect in `pass-rush-hands.md` is an unclosed couple at an off-centre contact): the test asserts the sum of both men's linear and angular momentum change equals the external (ground) impulses, per tick, in every staged case.

## 3. What the arm adds that the legs and the pad line do not

1. **A force with an arm behind it.** The contest force between two men is whatever the legs and grips transmit (1.0-1.5 kN here), but each man's arm can carry up to `press` (2.1-2.3 kN) at lockout. Phase 2 lets the arm's
   force exceed what the legs need *in the direction of the arm*: a man who gets under the pads and presses up with the arm does not need the contact force's vertical share to be small; the vertical component is bounded by his arm capacity at that
   elbow and by the reaction on his own feet (which loads his traction: the lifter is pressed into the turf, the lifted man unloaded, as `PAD_LEVERAGE` already does).
2. **A place across the shoulder line.** An inside hand's line passes through the other man's centre and under his pads; an outside hand's line is off centre (a turning moment) and its elbow is wide; the same force then turns him, or
   is turned by him. The turn is a torque on both men about their centres from the off-centre point: today the contact is `center`, with a single shared patch, so the turn is absent.
3. **A length.** Reach is a limit: a long-armed man can keep his hands on a short-armed man's chest at lockout while the other cannot get to him; chest to chest the elbows jam and `f(theta)` falls.
4. **Tension.** An open hand cannot pull; a closed grip adds tension up to the lesser of the grip and the arm's pull at that extension. A grip inside the frame is legal; a grip that is kept on a man who is leaving is the hold
   (Run Game's staged case: a defender who pulls directly away from a blocker with inside hands, today with nothing restraining him because the joint carries no tension below control 0.3).
5. **The punch** is an impulse: the arm's momentum transferred on arrival, `J = min((1 + e) x m_eff x v_close, structural cap x dt)` with an effective arm mass `m_eff` 4-8 kg (a choice), `e` ~0.15 and `dt` ~0.03 s (choices); applied at the hand point.

`control` (the abstract hand-fight number in `setContactHands`) is not deleted in Phase 2 (Phase 3 owns it); Phase 2's capacities are what `control` currently scales, so with the new arms `control` becomes a scale on *state* (which hands are on and fitted) rather than a force
multiplier, and the staged benches run with the hands fitted and `control` frozen, as in Phase 0.

## 4. Critique of the outside spec's section 3 (to be checked, not adopted)

- **Equal-segment elbow geometry:** acceptable for a reduced strut model; the limit is `L` and the angle `2 asin(d / L)`. A real forearm is shorter than the upper arm; no source lets us do better.
- **`cos phi` on every capacity term:** double counts if the arm's line is built from the two points; use the geometry (project the arm force on the contact normal and surface), not a capacity factor.
- **Where shoulder torque comes from:** no source; a stated fraction of the bench rating, with the feet and trunk carrying the rest of a transverse load (yaw, base). A rating-fed capacity with no measurement is a choice to state, not a number to defend.
- **The extension curve `f(theta)`:** the outside spec's 0.75-0.80 at 90 degrees is a stated choice; its source (Lum 2020) is a review whose statement is second-hand. The verified ratios (Seo: extended pull 1.29x flexed pull, flexed pull 1.26x flexed push) say a pull gains with extension; nothing says what an open-hand push does.
- **Open hand versus grip:** agreed in form. Open hand: friction `mu_hand x F_n`; the open-hand value on a jersey over pads is unknown (Seo's materials: 0.40 aluminium to 1.10 rubber, cotton glove 0.40-0.61); Run Game's cloth limit (250-444 N) is the pull side.
- **The chop displacement condition** (the outside spec's explanation of why `RUSH_HANDS` let clubs beat set hands): `lambda x F_chop > mu x F_n + grip + tau/d` is the right shape; check it against the `RUSH_HANDS` record in Phase 3 (a displacement with a loaded inside hand in tight should be hard). Not a Phase 2 build.
- **Re-fit time = travel / hand speed:** acceptable, plus the latency to feel the displacement (25-100 ms).
- **Questions I would add:** (a) is the lift one arm's worth or two? (the scratch test: doubling the lift decides the pad lever; physically each man's arms push the other's chest and each arm's reaction goes into its owner's feet, so both are real; the existing single pad-to-pad line is the half); (b) should the contact surface be the chest plane (a normal that depends on his torso's yaw) or the pad line? The chest plane is the physical choice and is what gives an off-centre hand its turn; (c) does the pair solve add rows only for the engaged pair, or for every contact (a hand-fight on a third man)? Phase 2: the engaged pair only.

## 5. Order of work and flags (all off until the card)

1. **`HAND_ARMS`** (new, off): the per-arm record (shoulder point, hand place and height, state), the strut force at the hand, resolved on the torso surface, with `press`, `reach` and the extension curve. Bench rows: **press x1.3 and reach +0.15 yd now move the staged pair** (the Phase 0 0.00 rows), and the hand height rows of the scratch test are a built input rather than an env.
2. **Lift and tip from the arms** (same flag): the vertical component of each arm on the receiver and its reaction on the owner (conserved), tip at the hand's height; `POSTURE_HOLD` wakes when an arm's lift exceeds the legs' hold (the two phases merge, as Integration anticipated).
3. **Grip** (`HAND_GRIP`, off): tension up to `min(grip, arm pull)`; Run Game's staged case (a defender pulling directly away from inside hands) restrained for the grip's limit, not for `control`.
4. **Punch impulse** (`HAND_PUNCH`, off).
5. Each step has its own bench rows and a staged case (a win and a loss for the stated reason), then the games card; **no step lands without the gate for the one before.**

## 6. Gates, from the Phase 0 table and the scratch test

- Rows that must move: arm strength (press) and arm length (reach) from 0.00 to a believable amount (the lockout case large, chest to chest small); hand height difference (a low man under the pads against a high man on the shoulders) moves the staged pair the right way by an amount of the order of the scratch test's (+-0.3 to +0.6), and the tip rows fall or walk the man back.
- Lever restored at grip 1.3: lower pads +0.3-0.6; the stronger-lower man beats the heavier-higher in both reps; a weak-legged man is stood up when an arm lifts him (a staged row with a real lift force).
- Conservation: linear and angular momentum, vertical load (the pair's `liftImp` sums to zero), energy (the lift's work charged to the lifter's arms).
- Falls: blocker falls stay in the NFL's 1-5 per 100 dropbacks; no rating awards an outcome (arm strength only sets capacity; hand placement is a controller's choice from what he feels).
- Cost: two arms per man for every engaged pair each substep, measured on the full card; the pair's four rows must not cost more than a stated share of a game's run time.
- Whole-game gates read after the phase, never tuned to: the plan's list (interior rusher's gain at 1.0 s, off the block by 3 s, engaged lateral move at 2 s, pressure by source, sack funnel, falls, run stuffs and yards before contact, doubled lineman's movement, holding calls).

## 7. Decisions I need

1. **One arm's worth of lift or two** (section 4 question (a)): I recommend two, built from the per-arm geometry; the existing line is replaced, and this is what restores the pad lever.
2. The contact surface as the chest plane (a normal from his torso's yaw), with hands on chest-patch points across the shoulder line.
3. `HAND_ARMS` as the first flag, its bench gate as above; `HAND_GRIP` and `HAND_PUNCH` later.
4. Whether `POSTURE_HOLD` (#916) is closed in favour of folding its hold into `HAND_ARMS`, and `GRIP_MU` kept as its own small PR (still not landing alone; Integration's ruling stands).
