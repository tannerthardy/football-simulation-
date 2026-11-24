# Phase 1: is the missing mechanism a posture bound on the lean? (scratch test, Tools/Physics, 2026-11-24)

Integration's hypothesis (ruling 20:08): posture and lean are independent in the World, so a high-padded man leans as far as he needs for free; the horizontal force a man can
resist or deliver without tipping is about `W x b / z` (plan section 7.1), so a low man should carry more and a high man should have to step. Test, **scratch only**
(`LEAN_BOUND=<k>` in `scripts/diag/blocking/staged-bench.mts`; no engine change; no flag): the bench passes each man's `intent.leanCap`, the cap on the force-aimed lean, which the World already honours
(`mag = min(capacity, load x (1 + growth), ..., intent.leanCap)`), recomputed every tick from his current posture.

## (1) Today's lean limit, and what sets it

- **In the World there is none of its own.** A man's lean push into a felt load is `min(his leg capacity, the load x (1 + growth), the speed deficit, intent.leanCap)`. The lean is the force he
  carries aimed back along the load; whatever of it his base cannot balance becomes capture-point offset (`unsupportedLean`), which the recovery step answers (`criticalDeviation`).
- **The only posture-dependent bound is `intent.leanCap`, set by the engagement code** (`engagement.ts:1291`): `(1.05 - 0.55 x technique) x m x omega0^2 x criticalDeviation(posture)`, `omega0^2 = g / comHeight(posture)`, `criticalDeviation = baseRadius(posture) + recoverySpeed / omega0`
  (the stepping man's tip limit, about 5.5 base radii). For these bodies that is about 1.2 body weights. **The World-only bench does not set it**, so its men lean free: the 44-49 degrees of the staged table are the force they must aim to balance
  about 1.0 body weight of hand load; the bound is not reached.
- What each man needs: pass rep, blocker anchoring against a rusher's 1,450 N (about 1.0 body weight): a force-aimed lean of atan(1.0) = 45 degrees; run rep, the same. In games, 27-32 degrees at 1.0 s
  (median hand loads about 0.5-0.6 body weight).

## (2) Bound the lean by posture, through the engine's own geometry (no fitted curve)

`leanCap = k x m g x criticalDeviation(posture) / padHeight(posture)`: the capture-point deviation at which he must step or fall, over the height at which the push arrives
(the model's quantities for the reviewer's `W x b / z` with continuous stepping; k = 1 is the bound itself). Over posture 0.45 to 1.0 it moves from about 1.06 W to 1.29 W
(+22%: the base grows 28% and the pad drops 14% while the step term stays): the posture dependence is real and of order a fifth, not a factor of two.

## (3) Pad rows and combos with the bound, grip 1.1 and 1.3 (change in the pair's velocity, + = the blocker driven back; columns are k = 1 at grip 1.1, then k = 1, 0.6, 0.4 at grip 1.3)

Pass rep:

| case | pass-ref | lean1-pass-mu1.1 | lean1-pass-mu1.3 | lean0.6-pass-mu1.3 | lean0.4-pass-mu1.3 |
|---|---|---|---|---|---|
| base (staged C vs DT_W) | 0.34 (base) | 0.34 (base) | 0.30 (base) | 0.64 (base) | 0.62 (base) |
| rusher strength +0.2 | +0.00 | +0.00 | +0.07 | +0.04 | +0.00 |
| blocker strength +0.2 | +0.00 | +0.00 | -0.00 | -0.00 | -0.00 |
| blocker strength -0.2 | +0.22 | +0.22 | +0.29 | +0.00 | +0.00 |
| rusher heavier +10% (power with mass) | +0.33 | +0.33 | +0.14 | +0.27 | +0.33 |
| blocker heavier +10% (power with mass) | -0.23 | -0.20 | -0.15 | -0.26 | -0.25 |
| rusher lower pads (posture 1.0) | +0.29 | +0.29 | +0.02 | +0.00 | +0.11 |
| blocker lower pads (posture 1.0) | -0.18 | -0.15 | -0.11 | -0.08 | -0.06 |
| blocker higher pads (posture 0.45) | +0.31 | +0.31 | +0.05 | +0.13 | +0.10 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | +0.15 | +0.15 | +0.02 | -0.09 | -0.10 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | -0.01 | +0.07 | +0.10 | +0.19 | +0.22 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | +0.58 | +0.58 | +0.26 | +0.13 | +0.21 |

Run rep:

| case | run-ref | lean1-run-mu1.1 | lean1-run-mu1.3 | lean0.6-run-mu1.3 | lean0.4-run-mu1.3 |
|---|---|---|---|---|---|
| base (staged C vs DT_W) | 0.33 (base) | 0.33 (base) | -0.04 (base) | 0.32 (base) | 0.32 (base) |
| rusher strength +0.2 | +0.00 | +0.00 | +0.16 | +0.00 | +0.00 |
| blocker strength +0.2 | +0.00 | +0.00 | -0.00 | -0.00 | -0.00 |
| blocker strength -0.2 | +0.13 | +0.13 | +0.52 | +0.03 | +0.00 |
| rusher heavier +10% (power with mass) | +0.35 | +0.35 | +0.32 | +0.21 | +0.16 |
| blocker heavier +10% (power with mass) | -0.38 | -0.38 | -0.30 | -0.24 | -0.24 |
| rusher lower pads (posture 1.0) | +0.22 | +0.22 | +0.25 | +0.05 | +0.02 |
| blocker lower pads (posture 1.0) | -0.17 | -0.17 | -0.08 | -0.04 | -0.06 |
| blocker higher pads (posture 0.45) | +0.44 | +0.44 | +0.49 | +0.09 | +0.07 |
| COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6) | +0.12 | +0.12 | +0.34 | -0.08 | -0.13 |
| COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0) | -0.17 | -0.17 | +0.14 | +0.09 | +0.10 |
| COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45 | +0.62 | +0.62 | +0.71 | +0.20 | +0.11 |

(The first column is today's reference, no bound, grip 1.1; the base row shows the pair's velocity, every other row the change from its own column's base.)

## Reading

- **k = 1 changes almost nothing** (pass base 0.34 -> 0.34 at grip 1.1, 0.13 -> 0.30 at 1.3): the bound is about 1.2-1.3 body weights, above the 1.0 the men carry; lean-force angle falls from 44-49 to 39-43 degrees; balance still does not bind. Pad rows: lower pads +0.29 -> +0.29 at 1.1,
  +0.09 -> +0.02 at 1.3. **The lean bound at its geometric value is not the missing mechanism.**
- **Tighter bounds (k = 0.6 and 0.4, i.e. about 0.7 and 0.5 body weights: the reviewer's planted-step range) make the men step**: the pass base walk-back doubles to 0.62-0.64 and the pair moves with the blocker's own request, but
  **pad rows do not come back** (rusher lower pads 0.00 / +0.11, blocker higher +0.13 / +0.10: no larger than without the bound) and **weight keeps its place** (+-0.25-0.33 per 10%), because the tip limit is itself proportional to weight (`W b / z`): a tip-limited contest is decided by `Delta W x (b / z)`, so pad height buys 20% of one man's cap against a 3% weight difference that is never zero.
  The combos go the wrong way at k = 0.6 and 0.4: the stronger, lower rusher against a heavier, higher blocker is -0.09 / -0.10 (the blocker wins, as before), and the heavier-higher rusher against the stronger-lower blocker is +0.19 / +0.22 (the rusher wins).
- **A pad-level bound that is the model's own geometry cannot restore the lever** here: the posture range (0.45-1.0) changes the pad height by 14% and the base by 28%, and in this staged pair weight and the pad-height difference between two real men (the taller centre against the shorter tackle) are comparable.
- **The strength rows stay where they were**: +0.2 on the blocker 0.00 (his legs already exceed the rusher's), the weak-legged blocker +0.74 to +1.44: the grip/leg picture of Phase 0 is unchanged by the bound.

## What this means for Phase 1

1. The lean-bound mechanism, as specified with the model's own geometry, does not by itself make pad level decide a rep or let the stronger-lower man win in both reps. I do **not** recommend building it as the posture mechanism.
2. Three things are not tested and could still carry it: (a) a bound with a larger posture dependence than the model's (e.g. the reviewer's 20 cm of pad height as 1.2 -> 1.0 m on a z of 1.1 m, which our `padHeight` range (14%) understates: our `padHeightAt` maps posture 1.0 to a pad 23% below posture 0 versus a real lineman's 20 cm of 110: 18%); (b) a **hand placement** that moves where the push arrives (the push height `z` is a free variable in the real contest: under the pads versus on the shoulders: Phase 2); (c) the arm's own lift (Phase 2).
3. Posture-dependent *balance* needs the contact height as a *force-height pair*: the World already tips a man by `height` (`addLoad` tip moments with the contact height); the bench's fixed hand height (the pad height of the lower man) is what the contest uses. A dedicated test would put the hands' height under the other man's centre of mass (a real lineman's hands under the pads) and measure whether tip, not grip, decides a rep. That is Phase 2's hand place and I would do it there.

Reproduce: `LEAN_BOUND=0.6 GRIP_MU=1.3 node --import tsx scripts/diag/blocking/staged-bench.mts pass`.
