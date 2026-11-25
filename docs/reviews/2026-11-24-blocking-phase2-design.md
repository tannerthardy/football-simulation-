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

## 2b. The force balance (the lift is derived, not chosen)

Integration's ruling (20:41): the lift cannot rest on a count of arms. Here is the accounting, and what the existing single pad-to-pad line is in its terms. A stands at x < 0 and B at x > 0; one arm each (two arms a man sum the same way).

**Forces.** A's arm: shoulder point `S_A` (height `s_A`, his pad height), hand point `H_A` on B's chest at height `z_A`; unit direction `u_A = (cos a_A, sin a_A)` from `S_A` to `H_A` (`a_A > 0` when the hand is above the shoulder), force `F_A >= 0` along it.
B's arm: `S_B`, `H_B` on A's chest at `z_B`, direction `u_B = (-cos a_B, sin a_B)`, force `F_B`.

| Where | Force |
|---|---|
| on B at `H_A` (A's hand) | `F_A u_A = (F_A cos a_A, F_A sin a_A)` |
| on A at `S_A` (the reaction of A's own arm) | `-F_A u_A` |
| on A at `H_B` (B's hand) | `F_B u_B = (-F_B cos a_B, F_B sin a_B)` |
| on B at `S_B` (the reaction of B's own arm) | `-F_B u_B = (F_B cos a_B, -F_B sin a_B)` |

**Horizontal.** The total on B from both arms is `H = F_A cos a_A + F_B cos a_B`; on A it is `-H`. Each man's ground supplies `H` (A's ground `+H`, B's `-H`, for a pair at rest; `+-` the pair's inertia when it moves).
So the two arms' horizontal parts sum to **one** horizontal force `H` between the bodies, and `H` is bounded by what the legs and grip set, `H <= min(G_A, G_B)`; it is **not** `F` for each arm. (My scratch test gave each arm the full `H`: a double count, withdrawn in the hand-height note.)
How `H` splits between the two arms, `h_A = F_A cos a_A` and `h_B = F_B cos a_B` with `h_A + h_B = H`, is the one statically indeterminate quantity: it is set by how hard each man actually pushes through his arms (his arm effort within his arm capacity at that extension), not by a count.

**Vertical.** The load on each man's feet is `N_B = W_B - F_A sin a_A + F_B sin a_B` and `N_A = W_A + F_A sin a_A - F_B sin a_B`: the lift on B is `L = F_A sin a_A - F_B sin a_B = h_A tan a_A - h_B tan a_B`, and on A it is `-L`. The pair's total vertical load `W_A + W_B` is conserved
(every force acts as an equal and opposite pair at its point), the lifter's arm pushes **him** into his feet by the same `F sin a`, and a man whose arm slopes down (hand below shoulder: a high man pushing on a low man's shoulders) loads the other's feet.

**Moments.** Each force at a hand or shoulder point about each body's centre gives the tip (the World's `tip`, at the point's height, already) and the yaw from an off-centre point; with equal and opposite pairs at points, linear and angular momentum close by construction and the per-tick test asserts it.

**What the single pad-to-pad line is.** Today `liftImp[j] = press x (pad_j - pad_i)/d`, applied once, with `press` the net compressive force between the pads, i.e. `H`. In the accounting above, with each arm's hand on the other man's pad height (`z_A = pad_B`, `z_B = pad_A`), `tan a_A = (pad_B - pad_A)/d = s` and `tan a_B = (pad_A - pad_B)/d = -s`, so
`L = h_A s + h_B s = H s`: the single line is **exactly the accounting with the hands at the other's pad height, whatever the split**; it is not a blend and not half of anything. (Checked: the corrected scratch with arm shares 1/2 each and dz = 0 reproduces the reference in every bench row, both reps.) Moving a hand off the pad height changes `tan a` by `dz / d`: `L = H s + h_A dz_A / d - h_B dz_B / d`;
the pad gap `Delta = pad_B - pad_A` enters as `H Delta / d`, and the hands' placement as `(h_A dz_A - h_B dz_B)/d`.
For equal split and the lower man's hands under his opponent's pads (`dz_A = -0.2`) against the higher man's on the lower man's shoulders (`dz_B = +0.1`): `L = H (Delta + (-0.2 - 0.1)/2)/d = H (Delta - 0.15)/d`: a pad gap of 0.15 yd or less is cancelled. That is the scratch test's finding 2 (corrected), now derived.

## 2c. Step 2: the arm's capacity, accounted (what binds, for whom)

**Today** (`setContactHands`, `world.ts` joint rows): one joint per engaged pair carries one compressive limit, `push = pressForce(actor) x (0.35 + 0.65 |control|)`, the actor being whoever has the hands (`control >= 0`: the blocker; else the defender). The other man's arms are not in the contact at all (`pressUnits(actor)`: one actor budget). The staged run rep shows the limit binding (hands force 1,093 N against a joint limit of 1,196 N; blocker press x1.3 -> 1,421 N, pair -0.04); the pass rep is leg-limited (1,453 N against 1,668 N).

**The accounting.** Each arm k has a capacity along its own line, `C_k = press_k x f(theta_k) x s_k`, with `press_k` the man's two-arm bench max split over his arms in use, `f(theta)` the extension curve (1 at lockout, a stated dip in mid-range, falling when jammed), and `s_k` his state scale (the hand-fight standing the controller sets today through `control`; Phase 3 replaces it). From section 2b the two arms' horizontal parts sum to the one force H the legs and grip set, so
`H = h_A + h_B`, `h_k <= C_k cos a_k`, and `H <= min(G_A, G_B)` (legs/grip). The contact force is therefore bounded by `min(G_A, G_B, C_A cos a_A + C_B cos a_B)`; with one man's arms out (the other's `s = 0`, a man whose hands are on his own hips), it is bounded by the other's capacity alone, which is today's actor budget. **The step adds the second man's arms to the sum and the extension curve to each**; with the second man's `s` at zero and lockout geometry it is today's joint limit exactly (the identity test).
- Reach: `theta_k = 2 asin(d_k / L_k)` with `d_k` the shoulder-to-hand distance (the separation along the arm's line) and `L_k = profile.reach`. **At a fixed separation a longer arm is more flexed, so `f` is lower and his cap lower**; the advantage of reach is that the man who wins the hand fight holds the other at a larger separation, which is an outcome of first contact and the lockout (Phase 3), not an input: the bench gets two reach rows, one at a fixed separation (expected: a longer arm is slightly worse) and one at a fixed fraction of the arm's length (expected: no change), and **the sign at a fixed separation is not a bug**.
- `f(theta)` has no source for a two-handed push (Phase 0 note section 4): a stated choice, `f = 1` for `d / L >= 0.9` (lockout), falling linearly to `FLEX = 0.75` at `d / L = 0.75` (elbows about 95 degrees, the sticking region) and holding there; a range 0.7-0.85 for `FLEX` is the sensitivity. The pull's verified ratio (Seo: extended pull 1.29x flexed pull) is the same shape for a pull and is Step 3's.
- The lift beyond the contact share (what wakes `POSTURE_HOLD`) is **not** part of step 2: a vertical force the arm adds beyond the horizontal share costs the arm force it takes from H; the accounting is `F_k = sqrt(h_k^2 + v_k^2) <= C_k` with `v_k` the vertical share the man chooses (a controller's choice of where to put his hands and how hard to lift): a later step once a controller chooses.

**Gates for step 2 (bench):** the blocker's press rows move the run rep (shown today: hands force +30%, pair -0.04) and the defender's arms now have a row that moves it the other way; the identity at lockout with the second man's arms off; fixed-separation and fixed-fraction reach rows as above; momentum, vertical load and energy closed; the hands force never exceeds the sum of the two caps (a per-tick assertion in the staged cases).

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
- **Questions I would add:** (a) [answered in section 2b: the lift is derived from the force balance; the doubled lift of the first scratch was a double count]; (b) should the contact surface be the chest plane (a normal that depends on his torso's yaw) or the pad line? The chest plane is the physical choice and is what gives an off-centre hand its turn; (c) does the pair solve add rows only for the engaged pair, or for every contact (a hand-fight on a third man)? Phase 2: the engaged pair only.

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

1. **(Resolved by the accounting in section 2b: not a choice.)** The lift is `h_A tan a_A - h_B tan a_B`, the arm effort shares set by the pair solve; the existing single line is the special case with the hands at the other's pad height. The pad lever is the reference's (+0.09 at grip 1.3), and hand height difference is what moves it.
2. The contact surface as the chest plane (a normal from his torso's yaw), with hands on chest-patch points across the shoulder line.
3. `HAND_ARMS` as the first flag, its bench gate as above; `HAND_GRIP` and `HAND_PUNCH` later.
4. Whether `POSTURE_HOLD` (closed #916) is closed in favour of folding its hold into `HAND_ARMS`, and `GRIP_MU` kept as its own small PR (still not landing alone; Integration's ruling stands).
