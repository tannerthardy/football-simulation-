# Blocking Phase 1: the flags and the bench gate (Tools/Physics, 2026-11-24)

`GRIP_MU` and `POSTURE_HOLD` are built, **off**, in `tools/phase1` (not landed; the card is not run). This is the bench gate Integration asked for first, four arms on the
same World-only staged bench as Phase 0 (`scripts/diag/blocking/staged-bench.mts`; setup and metric exactly as in `2026-11-24-blocking-staged-table.md`: the pair's mean velocity
toward the offense's backfield, **+ = the blocker is driven back**, yd/s, change from each column's own base row):

- **ref**: both flags off (today).
- **grip**: `GRIP_MU=1` (1.3).
- **post**: `POSTURE_HOLD=1` (legs follow the knee-angle shape `0.7 + 0.3 x posture`; a hold against vertical load; mobility cost across the face 0.3 x posture x sin^2).
- **both**.

## What was built

- `GRIP_MU` (`support.ts`): the shared `TURF_MU`, 1.1 off, 1.3 on, a number sets it. Everything that reads `traction` or `TURF_MU` follows (a one-line law; tackle push-off reads it too).
- `POSTURE_HOLD` (`world.ts`, `feet()`): for a man in a live hands joint, (1) his leg drive (both the active push and the lean push into a felt load) is multiplied by `0.7 + 0.3 x posture`;
  (2) the vertical load on him (`liftFelt`, positive lifting him) beyond what his legs hold, `1 x leg drive x that shape x fatigue`, moves his pads at up to the posture rate (full rate at an
  unheld quarter of his weight): stood up when lifted, sunk when pressed; the work, force times pad height change, is charged to the opponent's energy (the lifter); (3) a mobility cost across his face.
  Off, every multiplication is by exactly 1 (bit for bit).
- `test/grip-posture.test.ts`: six law tests (the coefficient, off = reference, a lower rusher pushes harder, the mobility cost's shape, a lift his legs do not hold stands him up).

## The bench, pass rep (rusher bulls 4.5, blocker anchors)

| case | pass-ref | pass-grip | pass-post | pass-both |
|---|---|---|---|---|
| base (staged C vs DT_W) | 0.34 (base) | 0.13 (base) | 0.12 (base) | 0.09 (base) |
| matched pair (DT_W takes the C profile: 144 kg, same strength) | -0.13 | +0.12 | +0.03 | +0.05 |
| rusher strength +0.2 | +0.00 | +0.09 | +0.00 | +0.03 |
| rusher strength -0.2 | -0.26 | -0.06 | -0.06 | -0.03 |
| blocker strength +0.2 | +0.00 | +0.00 | +0.00 | -0.00 |
| blocker strength -0.2 | +0.22 | +0.46 | +0.39 | +0.45 |
| rusher heavier +10% (power with mass) | +0.33 | +0.16 | +0.27 | +0.06 |
| rusher lighter -10% (power with mass) | -0.21 | -0.03 | -0.04 | -0.01 |
| blocker heavier +10% (power with mass) | -0.23 | -0.01 | -0.04 | -0.02 |
| blocker lighter -10% (power with mass) | +0.39 | +0.18 | +0.34 | +0.09 |
| rusher stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher longer arms (+0.15 yd reach) | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker longer arms (+0.15 yd reach) | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher lower pads (posture 1.0) | +0.29 | +0.09 | +0.50 | +0.12 |
| rusher higher pads (posture 0.45) | -0.22 | +0.01 | -0.04 | -0.02 |
| blocker lower pads (posture 1.0) | -0.18 | +0.01 | -0.02 | -0.01 |
| blocker higher pads (posture 0.45) | +0.31 | +0.11 | +0.25 | +0.12 |
| blocker wider base (balance 0.9) | -0.00 | -0.00 | +0.00 | -0.00 |
| rusher wider base (balance 0.9) | +0.03 | +0.01 | +0.01 | +0.00 |
| blocker more flexible (bend 0.9) | -0.26 | -0.05 | -0.04 | +0.00 |
| rusher asks 3.0 instead of 4.5 | +0.01 | +0.01 | +0.01 | +0.01 |
| blocker kicks back (asks 1.5 away) | +1.30 | +1.50 | +1.50 | +1.53 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | +0.15 | +0.19 | +0.35 | +0.21 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | -0.01 | +0.13 | -0.00 | +0.01 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | +0.58 | +0.43 | +0.78 | +0.46 |


## The bench, run rep (blocker drives 3.0, defender presses 1.5)

| case | run-ref | run-grip | run-post | run-both |
|---|---|---|---|---|
| base (staged C vs DT_W) | 0.33 (base) | -0.04 (base) | 0.18 (base) | -0.11 (base) |
| matched pair (DT_W takes the C profile: 144 kg, same strength) | -0.34 | +0.03 | -0.19 | +0.10 |
| rusher strength +0.2 | +0.00 | +0.16 | +0.00 | +0.12 |
| rusher strength -0.2 | -0.67 | -0.58 | -0.65 | -0.52 |
| blocker strength +0.2 | +0.00 | -0.00 | +0.00 | -0.01 |
| blocker strength -0.2 | +0.13 | +0.52 | +0.27 | +0.59 |
| rusher heavier +10% (power with mass) | +0.35 | +0.32 | +0.34 | +0.25 |
| rusher lighter -10% (power with mass) | -0.45 | -0.32 | -0.44 | -0.26 |
| blocker heavier +10% (power with mass) | -0.38 | -0.30 | -0.38 | -0.23 |
| blocker lighter -10% (power with mass) | +0.43 | +0.45 | +0.43 | +0.38 |
| rusher stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher longer arms (+0.15 yd reach) | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker longer arms (+0.15 yd reach) | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher lower pads (posture 1.0) | +0.22 | +0.25 | +0.35 | +0.32 |
| rusher higher pads (posture 0.45) | -0.59 | -0.09 | -0.51 | -0.32 |
| blocker lower pads (posture 1.0) | -0.17 | -0.08 | -0.18 | -0.12 |
| blocker higher pads (posture 0.45) | +0.44 | +0.49 | +0.43 | +0.46 |
| blocker wider base (balance 0.9) | -0.03 | -0.03 | -0.02 | -0.03 |
| rusher wider base (balance 0.9) | +0.02 | +0.02 | +0.02 | +0.01 |
| blocker more flexible (bend 0.9) | -1.02 | -0.51 | -0.73 | -0.30 |
| rusher asks 3.0 instead of 4.5 | +0.03 | +0.03 | +0.03 | +0.02 |
| blocker kicks back (asks 1.5 away) | +1.15 | +1.52 | +1.29 | +1.59 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | +0.12 | +0.34 | +0.25 | +0.43 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | -0.17 | +0.14 | -0.23 | -0.09 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | +0.62 | +0.71 | +0.76 | +0.80 |


## Gates, as Integration set them

| Gate | Result |
|---|---|
| **Pad rows come back at grip 1.3** | **Not met.** Pass rep, both: rusher lower pads +0.12, blocker higher pads +0.12, against ref +0.29 / +0.31 and grip alone +0.09 / +0.11. Posture alone (grip 1.1) is large (+0.50 / +0.25): at 1.1 the leg-angle factor adds to a grip-capped contest. At 1.3 the contest is leg versus leg, the pad-level effect (+8% leg force, +0.1) is the size of the strength effect. Run rep: lower pads +0.32, blocker higher +0.46, close to ref (+0.22 / +0.44). |
| **A stronger, lower man beats a heavier, higher one** | **Met in the run rep, a tie in the pass rep.** Combo (heavier, higher rusher against a stronger, lower blocker): run ref -0.17, grip +0.14 (wrong way), both -0.09; pass ref -0.01, grip +0.13, both +0.01. The first combo (stronger, lower rusher against a heavier, higher blocker) is +0.21 pass / +0.43 run (ref +0.15 / +0.12). |
| **A weak-legged man is stood up** | **Not met, and why.** A blocker of strength 0.05 against a rusher at posture 1.0: his pads end at 0.79 (his base 0.78): never stood up. The lift the pad geometry puts on a man is 0.06-0.2 of his body weight (the line of action is capped at 30 degrees, `LEVERAGE_SLOPE` 0.6, of a hand load of about 1 body weight), against about 1 body weight his legs hold (even the weakest man holds 0.6-0.8). The hold is **dormant by construction**: a lift that matters needs a lift force from the hands (arm force at the angle of the arm, Phase 2) rather than the pad-line geometry. The law test shows the hold works when a lift of 3 body weights is applied. |
| **Mobility cost shown, with a staged case** | Size: `1 - 0.3 x posture x sin^2(angle)` on leg drive across his face (0 straight ahead, 0.24-0.29 across it at posture 0.8-0.95) and `1 - 0.3 x posture` on the gait's cut factor of an engaged man. **Staged case: no visible effect (0.00-0.03 yd/s).** A rusher running 3.0 yd/s across a blocker who mirrors at 3.0, blocker posture 0.45 / 0.8 / 1.0: lateral velocities 2.50-2.54 yd/s for both men in every arm (the hands joint locks the pair, which moves as one block laterally, as the Phase 0 table found). A low man cannot be shown beaten across his face while the joint holds them together; the cost is in the code and its law test (the shape), and it will show only in the whole-game gate (engaged lateral move at 2 s: ours 0.4-0.5 yd against the NFL's 2.3) where a man leaves the lock. I do not claim a size for it beyond the stated choice. |

## What it says

1. **Grip alone** (1.3): strength starts to show, weight loses most of its edge, **pad level loses its lever** (as Phase 0 said). It does not land alone.
2. **The knee-angle factor restores a pad-level lever through the legs** (+0.50 at grip 1.1; +0.12 at 1.3). At 1.3 the lever is 8% of leg force: honest, small, and the same size as a strength row; it does not recover the ref's +0.29.
3. **The hold as specified is dormant.** The lift available from pad geometry is an order of magnitude below the legs' capacity, so a man is never stood up in a staged rep. Making it bind would need a hold capacity of about 0.1-0.2 body weights (a choice with no source: a sustained single-player push of 1.8-2.3 body weights is the same legs), or a lift force from the arms. I recommend **not tuning HOLD_K to make it bind**; it belongs with the hands (Phase 2), where the vertical component is a force with an arm behind it. Phase 1 would land with GRIP_MU, the knee-angle factor and the mobility cost, and the hold left in place but dormant (its law test passes).
4. **Balance still does not bind** and the bench's numbers stay where Phase 0 put them.

## Decisions I need

1. Land GRIP_MU 1.3 with the knee-angle factor and mobility cost (and the dormant hold), or hold the whole of Phase 1 until the hands exist so that the hold is real?
2. Is the mobility cost kept as a stated choice that only the whole-game gate can show, or removed until the hands let a man leave the lock?
3. The card (ref / grip / posture / both, 5 seeds x 32 games) waits for a quiet machine; the isotropic threshold test (x0.88 / x1.14) is running now (6 games per arm per seed).
