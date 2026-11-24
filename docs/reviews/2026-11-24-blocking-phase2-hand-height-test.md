# Phase 2 scratch test: the height of each man's hands as a free input (Tools/Physics, 2026-11-24)

Integration's ruling (20:28): before the Phase 2 design note, one scratch test on the bench: make the height at which each man's hand force is applied a free input (under the other's pads, at his chest, on his shoulders), with the arm's
line of action from the pusher's shoulder, re-run the pad rows and the combos, and say whether a low man with hands under the pads lifts and tips the high man, whether the high man pushing down on the shoulders loads the low man's feet, and
whether arm and leg strength then show because the lift is real. **Scratch only: `HAND_FREE` in `world.ts` and `HANDZ_B` / `HANDZ_R` / `DZ_LOW` / `DZ_HIGH` in the bench, on branch `tools/phase2-scratch` (not for landing, no PR).**

> **CORRECTION 2026-11-24 (20:50, after Integration's ruling on the lift accounting): finding 1 below, that counting both arms doubles the lift and brings the pad lever back, was a double count and is withdrawn.**
> The scratch gave *each* arm the full contact force `F` while the legs and grip balance one horizontal force `H` in total; with the arms' horizontal parts summing to `H` (section 2b of the Phase 2 design note), the equal split gives exactly the single pad-to-pad line, and the corrected scratch (arm share 1/2 each, `tools/phase2-scratch` 8-line commit) reproduces the reference **row for row** (pads regime = ref in every bench row, both reps). So the single line was the equal-split accounting all along, and the pad lever at grip 1.3 is the reference's (+0.09 pass), not +0.58.
> What survives with the right accounting (grip 1.3, change from base): hand-height *difference* still moves the pair; with the lower man's hands under the pads (dz -0.2) and the higher man's on the lower man's shoulders (dz +0.1) the lift on the high man is -0.12 body weights (the low man pressed), the pad rows go to +0.00 / +0.01 (pass) and +0.02 / +0.03 (run), the second combo (a heavier, higher rusher against a stronger, lower blocker) to +0.25 pass / +0.54 run, and hands above the other man's centre (both +0.1) tip him: blocker higher pads +1.39 (pass), +1.17 (run), the rusher's +0.2 strength +0.34 (run). The tables further down are the withdrawn double-counted version except where noted; the corrected tables are in `data/reviews/blocking/phase2-hand-height-corrected.md`.

## What the scratch does

Today's lift (`PAD_LEVERAGE`) is one line between the two pads: `rise = (pad_j - pad_i) / d` (capped at 30 degrees), applied once to the pair. The scratch replaces it with **two arms**: man i's arm runs from his shoulder (his pad height) to a hand at
`pad_j + dz_i` on j; j's arm from his shoulder to `pad_i + dz_j` on i; each arm carries the contact force; the vertical parts add on the receiver (each man's own arm's reaction included): net lift on j = `F x [(z_i - s_i) - (z_j - s_j)] / d`, each term capped at 0.6.
Tip moments use each hand's height (force on j at his hand's height, force on i at his). Regimes: **ref** (today's single line); **pads** (dz 0 both: both arms at the other's pad height); **shoulders** (dz +0.1 both); **dyn** (the lower man's hands under the other's pads, dz -0.2; the higher man's on the lower man's shoulders, dz +0.1). Grip 1.3, the Phase 0 bench otherwise (+ = the blocker is driven back).

## Results, pass rep (change from each column's base; the base row shows the pair's velocity)

| case | ref-pass-mu1.3 | pads-pass-mu1.3 | shoulders-pass-mu1.3 | dyn-pass-mu1.3 |
|---|---|---|---|---|
| base (staged C vs DT_W) | 0.13 (base) | 0.15 (base) | 0.15 (base) | 0.09 (base) |
| rusher strength +0.2 | +0.09 | +0.14 | +0.13 | +0.00 |
| blocker strength +0.2 | +0.00 | -0.00 | -0.00 | -0.00 |
| blocker strength -0.2 | +0.46 | +0.44 | +0.44 | +0.47 |
| rusher heavier +10% (power with mass) | +0.16 | +0.25 | +0.26 | +0.07 |
| rusher lower pads (posture 1.0) | +0.09 | +0.58 | +0.58 | +0.04 |
| blocker higher pads (posture 0.45) | +0.11 | +0.60 | +1.73 | +0.05 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | +0.19 | +0.74 | +0.74 | +0.10 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | +0.13 | +0.11 | +0.09 | +0.65 |
| COMBO weak-legged blocker (strength 0.05) under a rusher at posture 1.0 (stood up?) | +1.61 | +1.60 | +1.60 | +1.65 |

## Results, run rep

| case | ref-run-mu1.3 | pads-run-mu1.3 | shoulders-run-mu1.3 | dyn-run-mu1.3 |
|---|---|---|---|---|
| base (staged C vs DT_W) | -0.04 (base) | 0.32 (base) | 0.32 (base) | -0.47 (base) |
| rusher strength +0.2 | +0.16 | +0.16 | +0.26 | +0.02 |
| blocker strength +0.2 | -0.00 | -0.00 | -0.00 | -0.01 |
| blocker strength -0.2 | +0.52 | +0.18 | +0.18 | +0.83 |
| rusher heavier +10% (power with mass) | +0.32 | +0.31 | +0.42 | +0.38 |
| rusher lower pads (posture 1.0) | +0.25 | +0.44 | +0.44 | +0.35 |
| blocker higher pads (posture 0.45) | +0.49 | +0.77 | +0.86 | +0.38 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | +0.34 | +0.69 | +0.69 | +0.26 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | +0.14 | -0.23 | -0.40 | +1.31 |
| COMBO weak-legged blocker (strength 0.05) under a rusher at posture 1.0 (stood up?) | +1.36 | +1.00 | +1.00 | +1.79 |

## Reading

1. **Counting both arms doubles the lift, and that alone brings the pad lever back.** Lift on the higher man goes from 0.07-0.17 to 0.13-0.29 body weights (run rep up to 0.44); pad rows at grip 1.3: rusher lower pads +0.09 -> **+0.58**, blocker higher pads +0.11 -> **+0.60** (run +0.25 -> +0.44, +0.49 -> +0.77),
   above the reference +0.29 at grip 1.1; the first combo (a stronger, lower rusher against a heavier, higher blocker) **+0.19 -> +0.74**. The question of whether the existing single line (one arm's worth) or two arms' worth is the right lift is a modelling choice that decides the lever.
2. **The hold still does not wake up.** 0.13-0.45 body weights of lift against about 0.6-1.0 held: the weak-legged blocker's lift is 0.22 (pass) and 0.20 (run): not stood up, as before. A lift that stands a man up needs the arm to deliver more than the contact force's vertical share (a lifting force with the arm's own capacity behind it).
3. **Strength shows a little more when the lift is real:** the rusher's +0.2 strength +0.09 -> +0.14 (pass), +0.16 -> +0.16 (run); the blocker's +0.2 stays 0.00 (his legs already exceed the rusher's). The second combo (a heavier, higher rusher against a stronger, lower blocker) is **+0.11 (pass) / -0.23 (run)**: the stronger-lower
   blocker holds in the run rep and does not beat the heavier rusher in the pass rep.
4. **The difference between the two men's hand heights dominates pad level.** With the same offset on both men (pads, and shoulders) the offsets cancel in the lift (`z_i - s_i - z_j + s_j` has `dz_i - dz_j`): `pads` and `under` are identical; shoulders differ only through the tip moment. With the realistic asymmetry (**dyn**: the low man under the pads, the high man down on
   his shoulders) the offset difference is 0.3 yd against pad gaps of 0.04-0.2 yd: the lift on the high man goes **negative** (-0.21 to +0.21 body weights: the *low* man is pressed), and the pad rows collapse (+0.04 / +0.05) while the heavier-higher rusher beats the stronger-lower blocker by +0.65 (pass) / +1.31 (run). **A high man with his hands on the low man's shoulders
   cancels the low man's pad advantage**; the low man must get his hands under, and the arm's geometry (shorter distance, steeper line) decides. Hand placement is a larger lever than pad level at the pad gaps seen in games (median -0.04 to -0.07 yd).
5. **Tip:** hands at the shoulders, above the other man's centre of mass, tip him back: blocker higher pads under shoulders +1.73 (pass) and rusher higher pads -1.57 (run). The World already tips a man by contact height; with hand height free, the tip is large (a 0.1 yd hand offset changes the walk-back by up to 1 yd/s) and **is** a lever for a lineman who gets his hands above the other man's centre. Falls were not counted in the bench; the games card is where to see them.

## What this says for Phase 2

- The lever Integration looked for exists: **pad level, hand height and the arm's slope are one geometry**: the vertical force on a man is `F x (the rise of each arm)`, and the pad gap is a small part of it. Pad level alone (the Phase 0 finding) was the wrong place to look; the hands' height relative to the opponent's pads and to his own shoulders is the place.
- The single pad-to-pad line in `PAD_LEVERAGE` counts one arm. If the physics is two arms each carrying the contact force, the existing lift is half the physical value; this is a decision for the design note (the arm's force and where it goes), not a constant to set.
- Not shown here and needed before landing: the lift as a force with an arm behind it (the arm can push harder than the contact force transmits up if the man's legs and arms allow it: the press capacity 2.1-2.3 kN against a contact force of 1.0-1.5 kN), the hand's place across the shoulder line (inside versus outside, which changes the turn), hand speed and the fight for hand position (Phase 3), and falls and the games' pressure statistics.
