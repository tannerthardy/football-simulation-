# Blocking Phase 1 design note (legs, grip, posture under load, base): before any code

Tools/Physics, 2026-11-24, for Integration and the outside reviewer. No code is written. This follows the Phase 0 note
(`2026-11-24-blocking-phase0.md`, merged #911), the staged table (`2026-11-24-blocking-staged-table.md`), plan section 7 and the
outside spec. Integration's decisions it rests on: grip is a **stated range 1.3-1.5, starting at 1.3**, behind a flag; **posture
held under load is in Phase 1**; posture as a controller-played quantity follows the physics.

## 1. What Phase 1 changes, and what it leaves

| Piece | Today | Phase 1 |
|---|---|---|
| Grip | `TURF_MU = 1.1` times the normal load; one shared constant | a stated value 1.3 (range 1.3-1.5), flag `GRIP_MU`; same place, same law; surface later |
| Legs | `power x g x (mass/110)^-0.31`, linear force-velocity `clamp(1 - v/vmax, 0, 1.2)` | unchanged (it is already there); strength must now show because grip no longer sits right at it |
| Normal load | weight less pad-leverage lift (`liftFelt`) | unchanged shape; plus **posture under load** so the load is not free (section 3) |
| Posture | slews freely to the request at 2.5 /s | **held under load only as far as his legs hold it**; a man is stood up when the load exceeds his hold |
| Base | a circle, radius `rb` | adds length along the brace axis without shrinking across; mobility cost across (section 4) |
| Balance/recovery | capture point; recovery step is about 82% of the fall threshold | the step is not penalised as open-field running (it never should have been) |

Sources for the numbers are in the Phase 0 note section 4 and the reviewer's section 1. Checked since: **Kent et al. 2015
Sports Biomech 14(1):1-17** (a cleated shoe-form, vertical load 2.8 kN): peak horizontal force 3.2 kN on natural grass, 4.5 kN on infill
(abstract, read by an agent), so the traction coefficient (horizontal / vertical, my division) is about **1.14 on grass and 1.6
on infill**; its companion (Kent 2015, 14(2):246) gives 2.8-4.2 kN on grass (1.0-1.5), infill limited by the machine at 4.8 kN
(at least 1.7). With Penn State's dynamic 1.31-1.47 (read by me), **1.3 is the dynamic floor on infill and the middle of grass;
1.1 is the bottom of the grass range.** Nothing was found at lineman loads of 1.2-1.8 kN per foot.

## 2. Grip (the 1.1)

- One constant, `GRIP_MU`, flag default off until the card clears; **1.3**, with 1.1 and 1.5 as the other cells of the card.
- It replaces `TURF_MU` in `supportParams` (the traction in `feet()` and the friction budgets that read it). It is the same law as today: friction on
  the actual normal load, `mu x (m g - lift)`.
- **It moves everything that rests on grip:** locomotion and cuts at speed, yaw, the recovery reserve, tackles and wraps, run blocks.
  Cut and acceleration limits rarely hit 1.1 today, so the changes there are expected to be small; the card must show it.
- Load dependence (Kuhlman: slope changes near 888 N) and surface (grass versus infill, wet) are field properties for later, not now.

## 3. Posture under load (the missing relation)

**The relation we need**, stated as physics: to keep his pads at a requested level while the opponent presses up under them, a man
must carry the vertical push in his legs at that knee angle; if the load exceeds what his legs hold at that angle, his
pads rise (he is stood up). The opposite load, the opponent pressing down on him, is carried by his legs the same way, and
past their capacity he sinks.

**The simplest law:**

- Each man has a **vertical hold capacity** `H(p) = k x legDrive x g(p)`, in the same units as the leg force, with `g(p)` the knee-extensor
  torque-angle shape (isometric knee extensor torque peaks near 70 degrees of flexion, Pincivero et al. 2004, abstract read by an
  agent; a set lineman's best push is with hip and knee near 120 degrees, Martin and Beckham 2020, read), and `k` of order 1, a stated choice
  (the legs hold about their push force vertically, sustained pushes of 1.8-2.3 BW being the same effort).
- The vertical load on him: `V = + liftFelt` from the opponent (positive = lifting him) plus the horizontal push's own component
  through the pad line (already in `liftFelt`). If `V > H(p)`, the excess raises his posture target by `(V - H(p)) / (m g)` per unit
  stiffness: in one line, **posture rises at a rate proportional to the unheld lift**, limited by the same `POSTURE_RATE`. If the opponent
  presses down on him (`V < 0`) and `-V > H(p)`, posture falls the same way.
- **Conserved:** the pair's vertical load is equal and opposite (`liftImp` is added to one and subtracted from the other), so total
  normal load stays `(m_A + m_B) g`; horizontal ground impulse is the only external momentum input, as now. The work done in raising a man's
  pads is the opponent's work on him: charge it to the lifter's arms through the existing `spendEnergy` ledger and show the pair's energy closes
  within the bench's tolerance. Nothing here creates force: `H` only decides which of two existing loads wins the posture.
- **No rating awards an outcome:** strength enters only as the force his legs can hold; the posture result is the consequence.

**Knee-bend cost (reviewer 7.7).** Our deepest posture (1.0) already sits near the knee angle where legs are strongest, so a
force penalty for a deep bend would do nothing (agreed). The cost of playing low is **mobility** (first step and change of direction; `stepSpeed`,
turn rate) because a lower crouch gives up range, which is what the earlier POSTURE_FORCE result pointed at (2026-11-14: "the
next candidate is mobility"). Phase 1 adds that cost as a stated choice in `stepSpeed` and cut capacity, not in force, and does not extend the posture
range. The alternative (extend the range to a man who can over-crouch) needs an angle model we do not have.

**Gate (the bench):** with `GRIP_MU` 1.3 the pad-level rows keep working (the pass-rep +0.09 at 1.3 and 0.00 at 1.5 above must come back to about +0.3);
the stronger-lower man must beat the heavier-higher one in the combo rows; a weak man cannot hold the low posture under a lifting
opponent (posture rises, traction falls: an interior weak-legs case in the table).

## 4. Base shape and the recovery step

Re-diagnosis from the removed commits (`8db325f82`, `dcbb30561`, `b83bd9569`), answering the reviewer's three causes:

- **(a) The backpedal and shuffle penalty on the step: refuted as stated.** The commit says movement's directional factor "is not used" for
  the recovery step. **But the step was scaled:** `criticalDeviation = rb x s_base + step x s_step / omega0` and `prepareRecovery`'s step speed both
  took the same shape radius `s` (the ellipse radius in the push direction). The fall threshold is about 18% base and 82% step (rb 0.17 yd, step
  about 0.76 yd), so scaling both by `s` moved **the whole threshold by `s`**: 12% less along the main load in attempt 1 (set wide across his facing,
  along axis 1/sqrt(1.3) = 0.877) and 12% less across in attempt 2. The reviewer's mechanism (the step dominates) is right; the penalty it names was not what scaled it.
- **(b) The equal-area ellipse: confirmed by construction** (det P = 1: lengthening one axis by 14% shortens the other by 12%).
- **(c) A set stance has more area; its cost is mobility: not testable from the commits.**
- The falls (OL 3.6 -> 8.5 / 6.7, DL 4.8 -> 8.2 / 7.4 per 100 dropbacks) are consistent with a 12% threshold cut along the main load plus a 12% cut on
  the flank; **not tested.** The decisive test is cheap: apply an isotropic threshold of x0.88 and x1.14 (a one-line scratch edit) and count falls on the same games; if x0.88
  alone gives about 2x, the shape was never the cause, the threshold was.

**Phase 1 base:** keep the circle; add support along the brace axis (`rb_along = rb x (1 + a)`, `rb_across = rb`, so area grows), keep the recovery step unscaled
and unpenalised, charge the stagger as mobility across it (stepSpeed across x (1 - b)), and key the axis to the load he feels (his brace), not his facing.
Gate: falls by direction of the hit against the unflagged control; blocker falls stay in the NFL's 1-5 per 100 dropbacks.

## 5. What the grip change alone does to the bench (measured, scratch edit of `TURF_MU`, not committed)

The earlier relaxed-cap columns (`TURF_MU_SCALE`) were not a clean grip change (the lean push kept the unscaled cap, `world.ts:2166`); these are a true change of the shared
constant (staged-table file, section 2). Grip 1.1 -> 1.3 moves C / DT_W from 1,551 / 1,507 N to 1,833 / 1,780 N, above both men's legs (1,650 / 1,528 N):

| Row (pass rep, change in the pair's velocity toward the backfield, yd/s) | mu 1.1 | mu 1.3 | mu 1.5 |
|---|---|---|---|
| base (the pair's velocity) | 0.34 | 0.13 | 0.13 |
| rusher strength +0.2 | 0.00 | +0.09 | +0.08 |
| blocker strength +0.2 | 0.00 | 0.00 | 0.00 |
| blocker strength -0.2 | +0.22 | +0.46 | +0.46 |
| rusher / blocker +10% weight | +0.33 / -0.23 | +0.16 / -0.01 | +0.14 / -0.01 |
| rusher lower pads | +0.29 | +0.09 | 0.00 |
| blocker higher pads | +0.31 | +0.11 | +0.01 |
| matched pair | -0.13 | +0.12 | +0.12 |

- **Strength starts to show (the rusher's +0.09) and weight loses most of its edge (+0.33 -> +0.16 and -0.23 -> -0.01)**: as predicted.
- **The blocker's +0.2 stays inert:** his legs (1,650 N) already exceed the rusher's (1,528 N). It is a crossover where the legs match, not a missing mechanism.
- **The pad-level lever collapses (+0.29 -> +0.09 -> 0.00).** Grip alone makes pad level *worse*, because pad level reaches the contest only through the grip it modifies. In the
  run rep it survives (still +0.25 / +0.49 at 1.3) because the lifted blocker is still grip-bound there. So **grip alone is not enough**: posture under load, which gives pad level a route
  to the legs, is part of this phase for exactly this reason.

## 5b. How much of the trench Phase 1 changes (so nobody expects all of it)

From the games tap (12 games; `data/reviews/blocking/phase0b-lean-grip-games.md`): the typical engaged pair is **not** at the grip cap. Median grip use is 0.62-0.75 of the limit; pairs at 95% or more of grip at 1.0 s are 20%
of pass blockers (5% of the rushers they face) and 4-6% in runs. A grip change from 1.1 to 1.3 therefore changes the reps that reach the cap (about one pass block in five, about one run block in twenty) and
leaves the rest on legs and request; its effect on cuts and tackles is separate and expected small (to be shown on the card). Posture under load changes pairs whose vertical load exceeds what his legs hold, which
is not measured until it is built: report its share of ticks and pairs on the card, and read the whole-game statistics knowing that most engaged reps are decided by the requests (80-90% of a pass blocker's retreat is his own set).

## 6. Phase 2 spec: critique and my questions (reviewer section 3)

- **cos(flare) on every term double counts.** If the arm's line is built from its hand and shoulder points, the axial and transverse components
  already follow from the geometry; an extra `cos phi` on each capacity counts the flare twice.
- **Where the arm's numbers come from.** Seo, Armstrong & Young 2010 (full text read by an agent): one hand on a gripped handle, extended pull 339-472 N, flexed pull 274-345,
  flexed push 212-290 N, friction 0.4-1.1 by material; Escobar-Molina 2023 (grapplers, extended, 50% range) 444-498 N one arm. There is **no study of a lineman's two-handed push by elbow angle**, so the extension curve is a stated choice
  (the sourced ratios: extended pull 1.29x flexed pull, flexed pull 1.26x flexed push). The bench press at lockout against the 90 degree sticking region is a secondhand statement (Lum et al. 2020).
- **Shoulder torque as a rating-fed capacity.** There is no source for a lineman's shoulder transverse torque; the transverse load of a man being steered is carried by feet and trunk as much as the shoulder
  (Integration's note); propose a transverse capacity from the same bench `press` rating (a stated fraction) and let the feet and trunk take what the arm cannot.
- **Punch impulse.** 7.2-9.3 m/s boxing hand speed (Liu et al. 2022; Piorkowski 2011; Walilko 2005); no lineman number; 4-6 m/s is a choice and the effective mass 4-8 kg is a choice. Re-fit latency 25-100 ms
  (Weiler et al. 2015) bounds the chop-and-refit race.
- **Open hand versus grip** (Run Game's staged case): an open hand cannot pull a man away; a closed grip carries tension up to the lesser of the grip friction and the arm's pull at that extension.
  Sourced pull ceiling about 340-500 N one arm for a rigid handle, lower through cloth (Seo: cotton glove -42% where friction-limited).
- **The World's one-arm capacity is above the sourced pull** (Run Game, `run/tackle-repair` e93cbdea): the one-arm share of `armCap` for a 160 kg DT is about 713 N against the grapplers' extended pull of 498 +- 104 N and Seo's 340-470 N; Run Game's cloth limit (444 N, scaled by strength over the sample's +-1 SD, 250-444 N for a jersey) binds first, so nothing is decided yet. Phase 2's arm capacity by extension has to bring `armForce` under that band for a pull and keep the press (bench) separate.
- **Pair solved together:** agreed; cost to be measured; the current World already resolves joints for both bodies each substep, so the requirement is an
  angular momentum check (the open defect in `pass-rush-hands.md`).

## 7. Decisions I need

1. `GRIP_MU` 1.3 default-off flag and the card (cells 1.1 / 1.3 / 1.5), full red-diff with owner notes: go?
2. Posture under load with `k` = 1 and the mobility cost as a stated choice, behind its own flag `POSTURE_HOLD`: go?
3. Base: do the x0.88 / x1.14 isotropic threshold scratch test first (about 40 minutes of games) before building the new base: go?
