# Staged sensitivity table for the outside reviewer (Tools/Physics, 2026-11-24)

Self-contained. Branch `tools/blocking-phase0b`, develop `c7d4f2bf6` (engine-96), bench `scripts/diag/blocking/staged-bench.mts`.
**No engine change.** Companion notes: `2026-11-24-blocking-phase0.md` (sources, games, held walk-back), `2026-11-24-blocking-phase1-design.md`.

**Two corrections to Phase 0 that this file makes** (both from the reviewer's diff, Integration 19:38):
1. **Sign in the run rep.** The metric is the pair's mean velocity toward the offense's backfield in *both* modes, so **+ = the BLOCKER is
   driven back** in the run rep too. The Phase 0 label ("defender driven back") was wrong. In the staged run base row the defender, asking
   1.5 yd/s into the blocker, walks the centre, asking 3.0, back 0.33 yd/s (the centre is taller: his pads are the higher, lift +0.12 of his weight).
2. **The relaxed-cap columns of the Phase 0 table were not a clean grip change.** `TURF_MU_SCALE` scales the traction cap and the active
   drive of a man in hands, but the lean (resisting) push still reads the unscaled `sp.pushForce` (`world.ts:2166`), so the resisting man stayed
   capped at 1.1 x weight. This file replaces them with a **true change of the shared constant**: a scratch edit of `TURF_MU` in
   `support.ts` (`Number(process.env.SCRATCH_TURF_MU ?? 1.1)`, reverted, not committed; the one-line patch is the only way to reproduce the mu columns).

## 1. Setup of every staged case

**Bodies** (the `contactFixture` pair, the engine's own derived profiles): **C** (the blocker; 143.8 kg, power 1.271
body-weights, so leg drive 1,650 N; grip limit mu x weight = 1,551 N at mu 1.1; press capacity 2,269 N) and **DT_W** (the
rusher; 139.7 kg, power 1.201, leg drive 1,528 N; grip limit 1,507 N at mu 1.1; press 2,102 N). Leg drive is
`power x g x (mass / 110 kg)^-0.31`; the push each man can put into the ground is `min(leg drive, grip limit x (1 - lift / weight))`, where lift is the vertical
load the opponent's pad line of action puts on him (pad leverage, default on). Both men's legs are below grip at mu 1.3 or more (grip 1,833 / 1,780 N).

**Start:** head-on, torsos 0.1 yd apart, hands latched on both chests (one hands joint, control 0 frozen, neutral). No controllers: every tick the bench
gives each man a fixed requested velocity, `push = 1`, and a fixed requested pad level for 2.0 s; the World does everything else (feet, grip, lean, balance,
hands joint, torso contact). Posture reached in the base: blocker 0.79, rusher 0.73.

| Mode | Blocker (C) | Rusher / defender (DT_W) |
|---|---|---|
| **pass** (a bull rush into a set tackle) | asks 0 yd/s (anchors), posture 0.80 | asks 4.5 yd/s toward the QB, posture 0.74 |
| **run** (a drive block) | asks 3.0 yd/s into the defender, posture 0.85 | asks 1.5 yd/s into the blocker, posture 0.85 |

**Metric (both modes):** the pair's mean velocity toward the offense's backfield over 0.5-2.0 s, yd/s; **+ = the blocker is driven back.**
Each row reports the change from the same mode's base row. Differences under 0.02 yd/s are zero. mu 1.1 is today.

## 2. The table (change in the pair's velocity, yd/s)

| case | pass-mu1.1 | pass-mu1.3 | pass-mu1.5 | run-mu1.1 | run-mu1.3 | run-mu1.5 |
|---|---|---|---|---|---|---|
| base (staged C vs DT_W) | 0.34 (base) | 0.13 (base) | 0.13 (base) | 0.33 (base) | -0.04 (base) | -0.12 (base) |
| matched pair (DT_W takes the C profile: 144 kg, same strength) | -0.13 | +0.12 | +0.12 | -0.34 | +0.03 | +0.11 |
| rusher strength +0.2 | +0.00 | +0.09 | +0.08 | +0.00 | +0.16 | +0.11 |
| rusher strength -0.2 | -0.26 | -0.06 | -0.06 | -0.67 | -0.58 | -0.51 |
| blocker strength +0.2 | +0.00 | +0.00 | +0.00 | +0.00 | -0.00 | -0.01 |
| blocker strength -0.2 | +0.22 | +0.46 | +0.46 | +0.13 | +0.52 | +0.60 |
| rusher heavier +10% (power with mass) | +0.33 | +0.16 | +0.14 | +0.35 | +0.32 | +0.24 |
| rusher lighter -10% (power with mass) | -0.21 | -0.03 | -0.03 | -0.45 | -0.32 | -0.25 |
| blocker heavier +10% (power with mass) | -0.23 | -0.01 | -0.01 | -0.38 | -0.30 | -0.23 |
| blocker lighter -10% (power with mass) | +0.39 | +0.18 | +0.09 | +0.43 | +0.45 | +0.29 |
| rusher stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher longer arms (+0.15 yd reach) | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker longer arms (+0.15 yd reach) | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher lower pads (posture 1.0) | +0.29 | +0.09 | +0.00 | +0.22 | +0.25 | +0.03 |
| rusher higher pads (posture 0.45) | -0.22 | +0.01 | +0.01 | -0.59 | -0.09 | -0.01 |
| blocker lower pads (posture 1.0) | -0.18 | +0.01 | +0.01 | -0.17 | -0.08 | -0.00 |
| blocker higher pads (posture 0.45) | +0.31 | +0.11 | +0.01 | +0.44 | +0.49 | +0.30 |
| blocker wider base (balance 0.9) | -0.00 | -0.00 | -0.00 | -0.03 | -0.03 | -0.03 |
| rusher wider base (balance 0.9) | +0.03 | +0.01 | +0.01 | +0.02 | +0.02 | +0.02 |
| blocker more flexible (bend 0.9) | -0.26 | -0.05 | -0.00 | -1.02 | -0.51 | -0.16 |
| rusher asks 3.0 instead of 4.5 | +0.01 | +0.01 | +0.01 | +0.03 | +0.03 | +0.02 |
| blocker kicks back (asks 1.5 away) | +1.30 | +1.50 | +1.50 | +1.15 | +1.52 | +1.60 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | +0.15 | +0.19 | +0.10 | +0.12 | +0.34 | +0.13 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | -0.01 | +0.13 | +0.13 | -0.17 | +0.14 | +0.22 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | +0.58 | +0.43 | +0.08 | +0.62 | +0.71 | +0.53 |


Every row but the base is the change from that column's base; the mu 1.5 columns repeat mu 1.3 closely, so Phase 1's choice of 1.3 versus 1.5 is not what decides these rows.

### Rows with no mechanism in the engine today (missing, not zero)

| Row | Why it is missing |
|---|---|
| hand speed (faster hands) | hands have no travel; the joint is latched at first contact and has no hand position or speed |
| hands inside versus outside | a hand contact is one line between the two chests; hands have no place across the shoulder line and no height of their own |
| a defender pulls directly away from a blocker with inside hands (Run Game's staged tackle, run/tackle-repair 7ceffbc1) | no tension in the joint at control 0 (`engagement.ts:529`: `hold = 0` below control 0.3). In the World-only bench the centre distance grows 1.01 -> 2.44 yd over 2 s (defender 3.8 yd/s, blocker following at 2.9) and the joint object stays in the list; the bench does not reproduce the joint dropping at 0.85 s that Run Game saw (the engine's control-driven extension), so only the separation is reported |
| arm length / reach (rows exist, 0.00) | the hands' extension is fixed by the two radii in the fixture; the profile's `reach` is not read by the contact |
| arm strength / press (rows exist, 0.00) | the hands force (1.1-1.5 kN) never reaches the press capacity (2.1-2.3 kN) |
| posture held under load | posture slews to its request at 2.5 /s regardless of load; a man cannot be stood up |
| base with a direction | the base is a circle of radius about 0.17 yd; width acts only through `balance` into that radius |
| punch impulse, chop displacement, grip versus open hand | not modelled (Phase 2 and 3) |

**Present, not missing (correcting the Phase 0 note and the plan):** a linear force-velocity relation in the legs. `feet()` scales a man's leg force by
`clamp(1 - v_along / vmax, 0, 1.2)` (concentric loses force with speed, an eccentric yield keeps up to 1.2 x); at 0.3-1.5 yd/s against a `vmax` of about 9 yd/s it changes the force
by 3-17%. The parked `LEG_FV` concerns not stacking the lean push on the gait drive.

## 3. Which limit binds, per tick (summarised per row)

Definitions, per man, over 0.5-2.0 s of the rep: **grip binds** = the share of ticks where the ground impulse used is at least 95% of his grip limit
that tick (limit includes lift); **leg force below grip** = his leg drive is less than his grip limit after lift (share of ticks); **balance** = his capture
offset (`support.xi`) as a multiple of his base radius, mean and max. A man falls when that offset reaches the base plus his recovery step, about 5.5 base
radii for these bodies, so a ratio of 0.5 is about 9% of the fall threshold. **Lean-force angle** = atan(lean force / weight): the angle at which his leg force is aimed into the
load (the engine's `lean` is a force he carries by leaning, not a position).

### 3a. pass, mu 1.1 (today)

| case | pair (yd/s) | change | grip binds (share of ticks, blocker / rusher) | leg force below grip (blocker / rusher) | balance: offset / base radius, mean and max (blocker; rusher) | lean-force angle (deg) b / d |
|---|---|---|---|---|---|---|
| base (staged C vs DT_W) | 0.34 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 47 / 45 |
| matched pair (DT_W takes the C profile: 144 kg, same strength) | 0.20 | -0.13 | 0.87 / 0.90 | 0.00 / 0.00 | 0.05, 0.14; 0.03, 0.08 | 45 / 44 |
| rusher strength +0.2 | 0.34 | +0.00 | 1.00 / 0.00 | 0.00 / 0.00 | 0.03, 0.11; 0.03, 0.11 | 47 / 45 |
| rusher strength -0.2 | 0.08 | -0.26 | 0.23 / 0.00 | 0.00 / 1.00 | 0.02, 0.09; 0.02, 0.08 | 39 / 41 |
| blocker strength +0.2 | 0.34 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 47 / 45 |
| blocker strength -0.2 | 0.56 | +0.22 | 0.00 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.10 | 43 / 45 |
| rusher heavier +10% (power with mass) | 0.66 | +0.33 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.02, 0.08 | 48 / 44 |
| rusher lighter -10% (power with mass) | 0.12 | -0.21 | 0.42 / 0.00 | 0.00 / 1.00 | 0.03, 0.09; 0.03, 0.11 | 42 / 46 |
| blocker heavier +10% (power with mass) | 0.11 | -0.23 | 0.65 / 0.00 | 0.00 / 1.00 | 0.02, 0.07; 0.03, 0.10 | 43 / 46 |
| blocker lighter -10% (power with mass) | 0.72 | +0.39 | 0.97 / 0.00 | 0.00 / 1.00 | 0.04, 0.15; 0.02, 0.07 | 48 / 44 |
| rusher stronger arms (press x1.3) | 0.34 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 47 / 45 |
| blocker stronger arms (press x1.3) | 0.34 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 47 / 45 |
| rusher longer arms (+0.15 yd reach) | 0.34 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 47 / 45 |
| blocker longer arms (+0.15 yd reach) | 0.34 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 47 / 45 |
| rusher lower pads (posture 1.0) | 0.63 | +0.29 | 1.00 / 0.00 | 0.00 / 1.00 | 0.01, 0.01; 0.01, 0.04 | 48 / 45 |
| rusher higher pads (posture 0.45) | 0.12 | -0.22 | 0.35 / 1.00 | 0.00 / 0.00 | 0.04, 0.16; 0.04, 0.14 | 44 / 46 |
| blocker lower pads (posture 1.0) | 0.16 | -0.18 | 0.94 / 0.94 | 0.00 / 0.00 | 0.03, 0.12; 0.03, 0.11 | 46 / 46 |
| blocker higher pads (posture 0.45) | 0.64 | +0.31 | 1.00 / 0.00 | 0.00 / 1.00 | 0.02, 0.07; 0.02, 0.10 | 48 / 44 |
| blocker wider base (balance 0.9) | 0.33 | -0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.09; 0.03, 0.11 | 48 / 45 |
| rusher wider base (balance 0.9) | 0.36 | +0.03 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.11; 0.02, 0.09 | 47 / 46 |
| blocker more flexible (bend 0.9) | 0.07 | -0.26 | 0.00 / 1.00 | 1.00 / 0.00 | 0.01, 0.04; 0.01, 0.06 | 40 / 46 |
| rusher asks 3.0 instead of 4.5 | 0.35 | +0.01 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.10; 0.03, 0.11 | 47 / 45 |
| blocker kicks back (asks 1.5 away) | 1.63 | +1.30 | 0.10 / 0.00 | 0.00 / 0.94 | 0.09, 0.26; 0.06, 0.49 | 32 / 33 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | 0.49 | +0.15 | 0.97 / 0.00 | 0.00 / 1.00 | 0.01, 0.04; 0.01, 0.04 | 47 / 45 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | 0.32 | -0.01 | 0.71 / 1.00 | 0.45 / 0.00 | 0.03, 0.12; 0.02, 0.06 | 47 / 45 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | 0.91 | +0.58 | 1.00 / 0.00 | 0.00 / 1.00 | 0.05, 0.06; 0.01, 0.04 | 47 / 44 |


### 3b. pass, mu 1.3

| case | pair (yd/s) | change | grip binds (share of ticks, blocker / rusher) | leg force below grip (blocker / rusher) | balance: offset / base radius, mean and max (blocker; rusher) | lean-force angle (deg) b / d |
|---|---|---|---|---|---|---|
| base (staged C vs DT_W) | 0.13 | +0.00 | 0.16 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 45 / 46 |
| matched pair (DT_W takes the C profile: 144 kg, same strength) | 0.25 | +0.12 | 0.00 / 0.00 | 1.00 / 1.00 | 0.06, 0.14; 0.04, 0.08 | 46 / 46 |
| rusher strength +0.2 | 0.22 | +0.09 | 0.52 / 0.00 | 0.94 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 46 / 47 |
| rusher strength -0.2 | 0.07 | -0.06 | 0.06 / 0.00 | 1.00 / 1.00 | 0.02, 0.09; 0.02, 0.08 | 39 / 41 |
| blocker strength +0.2 | 0.13 | +0.00 | 0.16 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 44 / 46 |
| blocker strength -0.2 | 0.59 | +0.46 | 0.00 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.10 | 43 / 45 |
| rusher heavier +10% (power with mass) | 0.29 | +0.16 | 0.74 / 0.00 | 0.94 / 1.00 | 0.03, 0.11; 0.03, 0.08 | 47 / 45 |
| rusher lighter -10% (power with mass) | 0.10 | -0.03 | 0.13 / 0.00 | 1.00 / 1.00 | 0.03, 0.09; 0.04, 0.11 | 42 / 47 |
| blocker heavier +10% (power with mass) | 0.12 | -0.01 | 0.00 / 0.00 | 1.00 / 1.00 | 0.02, 0.07; 0.03, 0.10 | 42 / 46 |
| blocker lighter -10% (power with mass) | 0.31 | +0.18 | 0.94 / 0.00 | 1.00 / 1.00 | 0.04, 0.15; 0.03, 0.07 | 49 / 45 |
| rusher stronger arms (press x1.3) | 0.13 | +0.00 | 0.16 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 45 / 46 |
| blocker stronger arms (press x1.3) | 0.13 | +0.00 | 0.16 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 45 / 46 |
| rusher longer arms (+0.15 yd reach) | 0.13 | +0.00 | 0.16 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 45 / 46 |
| blocker longer arms (+0.15 yd reach) | 0.13 | +0.00 | 0.16 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.11 | 45 / 46 |
| rusher lower pads (posture 1.0) | 0.22 | +0.09 | 0.97 / 0.00 | 0.00 / 1.00 | 0.00, 0.01; 0.01, 0.05 | 49 / 46 |
| rusher higher pads (posture 0.45) | 0.14 | +0.01 | 0.00 / 0.00 | 1.00 / 1.00 | 0.04, 0.16; 0.04, 0.14 | 45 / 46 |
| blocker lower pads (posture 1.0) | 0.14 | +0.01 | 0.00 / 0.00 | 1.00 / 1.00 | 0.03, 0.12; 0.03, 0.11 | 45 / 46 |
| blocker higher pads (posture 0.45) | 0.24 | +0.11 | 0.97 / 0.00 | 0.00 / 1.00 | 0.02, 0.07; 0.03, 0.11 | 48 / 46 |
| blocker wider base (balance 0.9) | 0.13 | -0.00 | 0.19 / 0.00 | 1.00 / 1.00 | 0.03, 0.10; 0.03, 0.11 | 45 / 46 |
| rusher wider base (balance 0.9) | 0.15 | +0.01 | 0.19 / 0.00 | 1.00 / 1.00 | 0.03, 0.11; 0.03, 0.09 | 45 / 47 |
| blocker more flexible (bend 0.9) | 0.08 | -0.05 | 0.00 / 1.00 | 1.00 / 0.00 | 0.01, 0.05; 0.02, 0.07 | 44 / 47 |
| rusher asks 3.0 instead of 4.5 | 0.14 | +0.01 | 0.19 / 0.00 | 1.00 / 1.00 | 0.03, 0.10; 0.03, 0.11 | 45 / 46 |
| blocker kicks back (asks 1.5 away) | 1.63 | +1.50 | 0.00 / 0.00 | 1.00 / 1.00 | 0.09, 0.26; 0.06, 0.49 | 32 / 33 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | 0.32 | +0.19 | 0.97 / 0.00 | 0.00 / 1.00 | 0.01, 0.04; 0.01, 0.04 | 48 / 47 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | 0.26 | +0.13 | 0.00 / 0.00 | 1.00 / 1.00 | 0.04, 0.12; 0.02, 0.06 | 47 / 45 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | 0.56 | +0.43 | 1.00 / 0.00 | 0.00 / 1.00 | 0.02, 0.05; 0.01, 0.05 | 49 / 45 |


### 3c. run, mu 1.1 (today)

| case | pair (yd/s) | change | grip binds (share of ticks, blocker / rusher) | leg force below grip (blocker / rusher) | balance: offset / base radius, mean and max (blocker; rusher) | lean-force angle (deg) b / d |
|---|---|---|---|---|---|---|
| base (staged C vs DT_W) | 0.33 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.29; 0.06, 0.29 | 47 / 45 |
| matched pair (DT_W takes the C profile: 144 kg, same strength) | -0.01 | -0.34 | 0.84 / 0.84 | 0.00 / 0.00 | 0.12, 0.50; 0.12, 0.49 | 46 / 46 |
| rusher strength +0.2 | 0.33 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.29; 0.06, 0.29 | 47 / 45 |
| rusher strength -0.2 | -0.34 | -0.67 | 1.00 / 0.00 | 0.00 / 1.00 | 0.03, 0.17; 0.05, 0.23 | 45 / 42 |
| blocker strength +0.2 | 0.33 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.29; 0.06, 0.29 | 47 / 45 |
| blocker strength -0.2 | 0.46 | +0.13 | 0.84 / 0.00 | 1.00 / 1.00 | 0.05, 0.28; 0.04, 0.22 | 43 / 45 |
| rusher heavier +10% (power with mass) | 0.67 | +0.35 | 1.00 / 0.00 | 0.00 / 1.00 | 0.08, 0.35; 0.05, 0.27 | 48 / 44 |
| rusher lighter -10% (power with mass) | -0.12 | -0.45 | 1.00 / 0.00 | 0.00 / 1.00 | 0.05, 0.25; 0.07, 0.37 | 46 / 47 |
| blocker heavier +10% (power with mass) | -0.05 | -0.38 | 0.97 / 0.00 | 0.00 / 1.00 | 0.06, 0.27; 0.08, 0.38 | 46 / 47 |
| blocker lighter -10% (power with mass) | 0.76 | +0.43 | 0.97 / 0.00 | 0.00 / 1.00 | 0.07, 0.31; 0.04, 0.20 | 48 / 44 |
| rusher stronger arms (press x1.3) | 0.33 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.29; 0.06, 0.29 | 47 / 45 |
| blocker stronger arms (press x1.3) | 0.33 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.29; 0.06, 0.29 | 47 / 45 |
| rusher longer arms (+0.15 yd reach) | 0.33 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.29; 0.06, 0.29 | 47 / 45 |
| blocker longer arms (+0.15 yd reach) | 0.33 | +0.00 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.29; 0.06, 0.29 | 47 / 45 |
| rusher lower pads (posture 1.0) | 0.55 | +0.22 | 1.00 / 0.00 | 0.00 / 1.00 | 0.06, 0.25; 0.03, 0.18 | 48 / 45 |
| rusher higher pads (posture 0.45) | -0.27 | -0.59 | 0.00 / 1.00 | 0.87 / 0.00 | 0.10, 0.44; 0.12, 0.53 | 45 / 47 |
| blocker lower pads (posture 1.0) | 0.15 | -0.17 | 0.97 / 0.00 | 0.00 / 1.00 | 0.06, 0.30; 0.07, 0.33 | 47 / 46 |
| blocker higher pads (posture 0.45) | 0.76 | +0.44 | 1.00 / 0.00 | 0.00 / 1.00 | 0.08, 0.31; 0.03, 0.21 | 46 / 44 |
| blocker wider base (balance 0.9) | 0.30 | -0.03 | 1.00 / 0.00 | 0.00 / 1.00 | 0.06, 0.31; 0.06, 0.33 | 48 / 46 |
| rusher wider base (balance 0.9) | 0.35 | +0.02 | 1.00 / 0.00 | 0.00 / 1.00 | 0.06, 0.29; 0.06, 0.29 | 47 / 46 |
| blocker more flexible (bend 0.9) | -0.70 | -1.02 | 0.00 / 1.00 | 1.00 / 0.00 | 0.03, 0.15; 0.06, 0.16 | 44 / 48 |
| rusher asks 3.0 instead of 4.5 | 0.36 | +0.03 | 1.00 / 0.00 | 0.00 / 1.00 | 0.06, 0.30; 0.06, 0.32 | 47 / 45 |
| blocker kicks back (asks 1.5 away) | 1.48 | +1.15 | 0.00 / 0.00 | 0.00 / 0.00 | 0.01, 0.06; 0.02, 0.09 | 0 / 0 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | 0.45 | +0.12 | 1.00 / 0.00 | 0.00 / 1.00 | 0.07, 0.23; 0.04, 0.21 | 46 / 45 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | 0.16 | -0.17 | 0.16 / 0.87 | 0.87 / 0.00 | 0.09, 0.43; 0.07, 0.38 | 47 / 45 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | 0.95 | +0.62 | 1.00 / 0.00 | 0.00 / 1.00 | 0.14, 0.37; 0.02, 0.13 | 45 / 43 |


### 3d. run, mu 1.3

| case | pair (yd/s) | change | grip binds (share of ticks, blocker / rusher) | leg force below grip (blocker / rusher) | balance: offset / base radius, mean and max (blocker; rusher) | lean-force angle (deg) b / d |
|---|---|---|---|---|---|---|
| base (staged C vs DT_W) | -0.04 | +0.00 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.33; 0.08, 0.38 | 48 / 47 |
| matched pair (DT_W takes the C profile: 144 kg, same strength) | -0.01 | +0.03 | 0.00 / 0.00 | 1.00 / 1.00 | 0.14, 0.56; 0.13, 0.55 | 48 / 48 |
| rusher strength +0.2 | 0.12 | +0.16 | 0.87 / 0.00 | 0.13 / 1.00 | 0.08, 0.37; 0.08, 0.40 | 48 / 48 |
| rusher strength -0.2 | -0.62 | -0.58 | 0.19 / 0.00 | 0.16 / 1.00 | 0.04, 0.21; 0.06, 0.32 | 45 / 43 |
| blocker strength +0.2 | -0.04 | -0.00 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.33; 0.08, 0.39 | 48 / 47 |
| blocker strength -0.2 | 0.48 | +0.52 | 0.00 / 0.00 | 1.00 / 1.00 | 0.05, 0.28; 0.04, 0.23 | 43 / 45 |
| rusher heavier +10% (power with mass) | 0.28 | +0.32 | 0.87 / 0.00 | 0.13 / 1.00 | 0.08, 0.40; 0.06, 0.34 | 49 / 45 |
| rusher lighter -10% (power with mass) | -0.36 | -0.32 | 0.84 / 0.00 | 0.13 / 1.00 | 0.06, 0.28; 0.10, 0.47 | 46 / 49 |
| blocker heavier +10% (power with mass) | -0.34 | -0.30 | 0.39 / 0.00 | 0.32 / 1.00 | 0.06, 0.27; 0.10, 0.43 | 46 / 48 |
| blocker lighter -10% (power with mass) | 0.40 | +0.45 | 0.94 / 0.00 | 0.00 / 1.00 | 0.08, 0.42; 0.06, 0.34 | 49 / 45 |
| rusher stronger arms (press x1.3) | -0.04 | +0.00 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.33; 0.08, 0.38 | 48 / 47 |
| blocker stronger arms (press x1.3) | -0.04 | +0.00 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.33; 0.08, 0.38 | 48 / 47 |
| rusher longer arms (+0.15 yd reach) | -0.04 | +0.00 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.33; 0.08, 0.38 | 48 / 47 |
| blocker longer arms (+0.15 yd reach) | -0.04 | +0.00 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.33; 0.08, 0.38 | 48 / 47 |
| rusher lower pads (posture 1.0) | 0.20 | +0.25 | 0.94 / 0.00 | 0.00 / 1.00 | 0.07, 0.26; 0.05, 0.29 | 48 / 46 |
| rusher higher pads (posture 0.45) | -0.13 | -0.09 | 0.00 / 0.84 | 1.00 / 0.97 | 0.12, 0.50; 0.15, 0.60 | 47 / 47 |
| blocker lower pads (posture 1.0) | -0.12 | -0.08 | 0.23 / 0.00 | 0.97 / 1.00 | 0.07, 0.33; 0.08, 0.40 | 47 / 47 |
| blocker higher pads (posture 0.45) | 0.45 | +0.49 | 0.97 / 0.00 | 0.00 / 1.00 | 0.08, 0.35; 0.06, 0.31 | 49 / 45 |
| blocker wider base (balance 0.9) | -0.07 | -0.03 | 0.87 / 0.00 | 0.13 / 1.00 | 0.06, 0.32; 0.08, 0.39 | 48 / 47 |
| rusher wider base (balance 0.9) | -0.02 | +0.02 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.34; 0.07, 0.37 | 48 / 47 |
| blocker more flexible (bend 0.9) | -0.55 | -0.51 | 0.00 / 0.87 | 1.00 / 0.00 | 0.04, 0.19; 0.06, 0.21 | 46 / 49 |
| rusher asks 3.0 instead of 4.5 | -0.01 | +0.03 | 0.87 / 0.00 | 0.13 / 1.00 | 0.07, 0.34; 0.08, 0.40 | 48 / 47 |
| blocker kicks back (asks 1.5 away) | 1.48 | +1.52 | 0.00 / 0.00 | 1.00 / 1.00 | 0.01, 0.06; 0.02, 0.09 | 0 / 0 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | 0.29 | +0.34 | 0.97 / 0.00 | 0.00 / 1.00 | 0.07, 0.25; 0.05, 0.28 | 48 / 47 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | 0.09 | +0.14 | 0.00 / 0.00 | 1.00 / 1.00 | 0.10, 0.46; 0.08, 0.42 | 48 / 46 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | 0.67 | +0.71 | 1.00 / 0.00 | 0.00 / 1.00 | 0.08, 0.33; 0.04, 0.20 | 47 / 45 |


### Reading of the binding columns, and the reviewer's four items

- **mu 1.1 (today): the blocker is at grip and the rusher at his legs.** Pass base: blocker grip share 1.00 (his lifted grip 1,551 x (1 - 0.06) = 1,458 N
  against a hands force of 1,453 N); rusher legs below his pressed grip (1,528 N against 1,597 N).
- **mu 1.3 or 1.5: legs bind both men** (pass base legs below grip 1.00 / 1.00); grip binds only the blocker a share of the ticks (0.16).
- **Balance does not bind in any row.** The offset is 0.03-0.14 base radii in the pass rep and 0.07-0.56 in the run rep, against a fall threshold of about 5.5.
  The men hold about 1 body weight because they lean at **45-49 degrees** (lean-force angle); at that lean the reviewer's own statics put the no-step tip limit
  above 1 body weight, i.e. above grip, so **at the leans held a man meets grip (or legs) before balance**, as the reviewer's table gives for 25-35 degrees.
  The bench does not test upright or pass-set men (0-15 degrees), where the reviewer says balance binds: the controllers are off and posture is fixed.
  The games' lean angles are in section 4.
- **Item 1 (sign), corrected above.**
- **Item 2 (run, relaxed grip, the three pad rows): the reviewer's reading is right and the columns show it.** At mu 1.3 the staged run blocker is **grip-bound 87%** of the ticks in the base (lifted
  by 0.13 of his weight, grip 1,595 N against legs 1,650 N). When the rusher lowers his pads or the blocker raises his, more lift lands on the blocker and he is grip-bound 94-97% of
  the time (+0.25, +0.49); when the blocker lowers his pads he drops to 23% grip-bound and his **legs** bind (1,650 N), so there is nothing more for pad level to buy (-0.08). The
  direct case for **posture under load**: with legs binding, pad level reaches the contest only through lift on traction, and lowers it only for the man whose grip still binds.
- **Item 3 (blocker strength +0.2 does nothing even at relaxed grip; the second combo moves the wrong way):** at mu 1.3 the blocker's legs (1,650 N) already exceed the rusher's (1,528 N), so the
  leg-versus-leg contest is the rusher's limit, not his: +0.2 on the blocker adds nothing, +0.2 on the rusher (1,757 N) overtakes him (+0.09), and -0.2 on the blocker (1,269 N) loses him the contest
  (+0.46). That is a **crossover at the strength where the legs match**, not a missing mechanism. The second combo (heavier, higher rusher against a stronger, lower blocker): the blocker's extra strength is wasted for the same
  reason and his lower pads buy nothing while his legs bind (+0.01); the rusher's +10% mass adds 10% to his power with mass (+0.13). So the combo moves toward the rusher at mu 1.3 because
  *the blocker has nothing left to improve*, which is the defect, not a sign error.
- **Item 4 (the lean column decides what Phase 1 unlocks):** lean-force angle 44-49 degrees in every staged row and 31-36 degrees in the games' pairs at 1.0 s (section 4): above the
  reviewer's 35-degree row (tip limit 1.0 to 1.5 body weights with a step), so grip at 1.3 (1.3 BW) is the same size as the tip limit with a planted step; the bench shows legs binding below that.

## 4. Posture and lean actually held by engaged men in games

Read-only tap on `PlaySim.tick` (`scripts/diag/blocking/pad-gap.mts`), 12 games for lean and grip use (24,242 pair samples) and 4 games for requests; one sample per engaged pair (offensive lineman against a defender) per age;
files `data/reviews/blocking/phase0b-lean-grip-games.md` and `phase0b-retreat-vs-request-games.md`.

**Lean, balance and grip use (p50 [p90]), pairs at 1.0 s.**

| rep | blocker lean-force angle | defender lean-force angle | blocker offset / base radius | defender offset / base radius | grip use (ground impulse / limit) b / d | share at grip (>= 0.95) b / d |
|---|---|---|---|---|---|---|
| pass | 29 [36] deg | 32 [39] | 0.06 [0.37] | 0.07 [0.66] | 0.72 / 0.75 | 0.20 / 0.05 |
| run | 27 [40] deg | 32 [46] | 0.12 [0.94] | 0.17 [1.85] | 0.62 / 0.68 | 0.04 / 0.06 |

- Engaged men in games lean **27-32 degrees (p90 36-46)** at 1.0 s, 15-18 at first contact (0.3 s), against the staged bench's 44-49.
- **Balance is not near its limit**: offset / base radius is a median 0.06-0.17 (p90 0.37-1.85; a man falls at about 5.5).
- **Grip binds a minority of ticks**: the blocker is at 95% of his grip in 20% of pass pairs (the rusher 5%), 4-6% in runs; median use is 0.6-0.75 of the limit. So in games the typical engaged pair is **not** at the cap; the staged bench's 100% is the bench's
  fixed full request. The reviewer's row at 25-35 degrees (grip first at 1.1) fits the median pair; the pass-set blocker at 15 degrees at first contact is in its balance-limited range for the first 0.3 s only.

**Pad level** (defender pad height minus blocker's, yd; negative = the defender is lower): pass median -0.04 (p10 -0.15, p90 +0.08), run -0.07 (-0.21, +0.09); posture is a role constant (pass: defender 0.70, blocker 0.77; run: defender 0.93, blocker 0.80); the gap
tracks body height and bend (correlation with the defender's mass +0.53, with his bend -0.59). Lift is +-2% of weight at the median, about +-20% at the tails (`phase0b` and `phase0-pad-gap.md`).

**The blocker's retreat against his own request, by time since contact** (toward his backfield, yd/s; the request is the velocity he asked the World for that tick):

| rep | age s | pairs | blocker retreat velocity p50 | his requested retreat p50 | forced part (velocity - request), mean | rusher closing velocity p50 | rusher's request p50 |
|---|---|---|---|---|---|---|---|
| pass | 0.3 | 1,757 | +1.61 | +1.17 | +0.20 | +1.97 | +4.23 |
| pass | 0.6 | 1,605 | +1.89 | +1.58 | +0.43 | +1.86 | +4.14 |
| pass | 1.0 | 1,464 | +1.95 | +1.81 | +0.34 | +1.90 | +4.83 |
| pass | 1.5 | 1,127 | +1.74 | +1.27 | +0.39 | +1.75 | +4.17 |
| run (+ = blocker driven back) | 0.3 | 756 | -0.31 | -1.35 | +0.95 | -0.33 | +0.50 |
| run | 1.0 | 516 | -0.71 | -1.53 | +0.86 | -0.30 | +1.21 |
| run | 1.5 | 383 | -0.66 | -1.49 | +0.77 | -0.46 | +0.98 |

- **In passes about 80-90% of the engaged blocker's retreat is his own request** (kick back 1.2-1.8 yd/s); the contact adds a mean 0.2-0.43 yd/s. The rusher asks 4.1-4.8 and gets 1.8-2.0 (he is slowed to about 0.4 of his request).
  The pass set itself is the first thing to look at for the walk-back (Phase 4's pass set), as Integration suspected.
- **In runs the blocker asks to advance 1.35-1.55 yd/s and advances 0.3-0.7**: the contact takes back 0.8-0.95 yd/s of it (55-75% of his request). The defender's request is 0.5-1.2 yd/s and he gets back-driven at 0.3-0.5.
- Instantaneous p50 velocities at fixed ages; the forced part is a mean of the per-pair difference and carries the 0.05 s tick noise.

## 5. Where the bench agrees and disagrees with the section 7.9 predictions

| 7.9 prediction | bench | verdict |
|---|---|---|
| stronger legs: more walk-back only when not limited by grip, balance or arms | +0.2 strength: 0.00 at grip (mu 1.1); +0.09 to +0.16 for the rusher once legs bind; the blocker's +0.2 is inert whenever his legs already exceed the rusher's | **agrees**: strength shows only off the grip limit and where the legs are the contest |
| longer arms: large when he can lock out beyond reach, small chest to chest | 0.00 on every row | **missing mechanism** (reach is not read): an engine fault, not a prediction fault |
| lower pads: the strongest single lever | +0.29 / -0.59 (pass, run, mu 1.1); pass rep +0.09 / +0.01 at mu 1.3, 0.00 at 1.5; run rep still +0.25 / +0.49 at 1.3 | **agrees at today's grip; disagrees once legs bind**: pad level reaches only the traction cap (and balance), so the lever vanishes where legs bind (the reason for posture under load) |
| hands inside: a sixth to a quarter more push along the line, plus control of the turn | not representable | missing |
| balance can bind for upright or pass-set men | offset / base radius 0.03-0.14 (pass), 0.07-0.56 (run); lean 44-49 degrees | **not tested** for upright men; at the leans held grip or legs bind first |
