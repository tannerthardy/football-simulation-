# The held interior pair: what sets its net force, where mass and strength enter, and what the NFL shows (Tools, 2026-11-16; report, nothing built)

For Integration, after STEP_CREDIT (missed) and HAND_MOMENT (bounds only the press). The gap in question: a held interior rusher's speed toward the QB with `SET_SPOT` on is 1.65 / 0.79 / 0.43 / 0.17 yd/s over 0 to 2.5 s against the NFL's 2.03 / 1.74 / 1.39 / 0.85, with his request saturated at 4.49 the whole rep (Flex's #13). Scripts: `scripts/diag/pass-operators/held-pair-speed.py`, `held-walkback.py`, `held-walkback-fit.py`, `uncovered-retreat.py`; `scripts/diag/effective-mass/anchor-proportional.mts` (on `claude/quirky-franklin-9lbwbp`'s staged harness, `anchor-staged.mts`). Raw output in `out/pushpair/`, `out/defense-batch/`.

## 1. What sets the net force on a held pair (the World's terms, measured)

Two ground forces and a third-law contact between them. For the pair to move at a steady speed `v` toward the QB the rusher's ground force equals the blocker's:

* the blocker's feet, driven back, give `min(1.2 * legDrive, traction)` (the eccentric credit; every lineman's `legDrive` is above 0.83 of his traction, so this is `traction`): he sits at his cap;
* the rusher's feet give `pushForce * fv`, `fv = 1 - v / vmax`, `pushForce = min(legDrive, traction)`.

So the pair settles where `F_rusher_cap * (1 - v / vmax) = F_blocker_cap`, that is `v = vmax * (1 - F_blocker / F_rusher)`. The slope is `vmax`, about 8 to 9 yd/s per unit of force ratio: **a 1% change in the ratio of the two caps moves the pair by about 0.09 yd/s.** Checked on Flex's staged pair (C 144 kg against DT 140 kg, `SET_SPOT=1`, `ANCHOR_BINS=1`, ground impulse over its limit): the blocker's feet are at 0.49 / 0.91 / 1.00 / 1.00 of their limit in the four windows, the rusher's at 0.65 / 0.82 / 0.84 / 0.90, which is `1 - v / vmax` at the pair's speed (1.2 yd/s on a vmax of about 8: 0.85). The pair is a near-draw between two Coulomb limits of nearly equal height, and its speed is the small residual.

What builds the caps: mass (traction is `TURF_MU * m * g` times the normal load, `TURF_MU` the unsourced 1.1, equal for both so it cancels in the ratio), the lean (a felt load a man leans into, at most `1 + PUSH_GROWTH` times what he feels per substep), posture (`PAD_LEVERAGE`: a lifted man bears less). The contact's third law ties the two felt forces together (1.05 to 1.39 kN here).

## 2. Where mass and strength enter, by the staged pair (pair walk-back, 0.5 to 2.0 s, flag off, yd/s)

Earlier arms scaled `massKg` alone (`anchor-staged.mts`, and my 2026-11-16-push-contest-law note, §3, which reports "rusher mass x0.9 / x1.1: 0.95 / 1.15"). That is not a physical experiment: strength is `power = m * (0.55 + 0.75 * strength)`, so a heavier man is stronger, and mass-only left `legDrive` unchanged. With power scaled with mass (`anchor-proportional.mts`):

| arm | pair | change |
| --- | --- | --- |
| base (144 kg C, 140 kg DT) | 1.15 | |
| rusher mass and power x0.9 / x1.1 | 0.95 / 1.34 | -0.20 / +0.19 |
| blocker mass and power x0.9 / x1.1 | 1.42 / 0.97 | +0.27 / -0.18 |
| both x1.1 | 1.11 | -0.04 |
| rusher power x1.1 / x1.3 alone | 1.15 / 1.15 | 0 / 0 (his `pushForce` is his traction already) |
| rusher power x0.85 alone (earlier read) | 0.94 | -0.21 |

So mass with its strength is symmetric and about 0.2 yd/s for 10% (31 lb) on either side: **the mass dependence is fine.** My earlier note's "mass dependence is the issue" and the unequal rusher arm were the mass-only artifact. Strength alone enters only when a man is below his traction cap (he is at or over it for 44% of DTs and 3 to 14% of the others), and then only downward: strength cannot raise a man that already stands on his Coulomb limit. That is true to the physics of a man on a surface (a push beyond `mu * N` slips); what real linemen add is normal load through the hands and the lean, which this law has only as `PAD_LEVERAGE`'s few percent (lift 0.02 to 0.04 of weight at the staged pair).

## 3. The NFL, one operator (`held-walkback-fit.py`, BDB 2025 weeks 1 to 9, 25,562 held interior pairs, weights from `players.csv`)

Walk-back (the pair's velocity toward the QB) regressed on both men's weight, per +30 lb (about 10%), 90% bootstrap over plays:

| window since contact | rusher | blocker |
| --- | --- | --- |
| 0.5 to 1.0 s | -0.07 (-0.09 to -0.05) | -0.02 (-0.06 to +0.01) |
| 1.0 to 1.5 s | +0.05 (+0.02 to +0.08) | -0.04 (-0.08 to +0.01) |
| 1.5 to 2.5 s (n 1,822) | +0.18 (+0.14 to +0.22) | -0.17 (-0.26 to -0.09) |

Late, the NFL is symmetric and 0.17 to 0.18 per 30 lb, the sim's 0.18 to 0.27 per 10% (31 lb) with strength. Early there is no weight effect (the lighter rusher is slightly faster: the get-off). Weight is a weak proxy (strength, technique and the set are not in it), so the NFL slope is a floor; it cannot say the sim's is too steep. Strength is not in the data; weight is the only mass-or-strength column.

## 4. The gap is in the pair's speed over 0.5 to 1.5 s, and it is not the contact law

`held-pair-speed.py` (the same operator on NFL and sim exports; pair velocity and the rusher's own, p25 / p50 / p75):

| window | NFL pair | NFL rusher | sim, `SET_SPOT` etc. pair | sim rusher |
| --- | --- | --- | --- | --- |
| 0 to 0.5 s | 0.94 / 1.67 / 2.18 | 1.25 / 2.02 / 2.60 | 1.04 / 1.41 / 1.68 | 1.27 / 1.79 / 2.12 |
| 0.5 to 1.0 s | 0.96 / 1.64 / 2.18 | 1.02 / 1.74 / 2.32 | 0.62 / 1.02 / 1.32 | 0.57 / 0.98 / 1.29 |
| 1.0 to 1.5 s | 0.69 / 1.32 / 1.93 | 0.65 / 1.32 / 1.97 | 0.60 / 0.94 / 1.30 | 0.58 / 0.94 / 1.30 |
| 1.5 to 2.5 s | 0.20 / 0.75 / 1.28 | 0.19 / 0.78 / 1.32 | 0.29 / 0.73 / 1.02 | 0.25 / 0.71 / 1.00 |

(Sim: six games, seed 101, `SET_SPOT`, `SET_SPOT_TACKLE`, `POCKET_LEVEL` on Flex's branch, 1,449 pairs; the NFL rusher row reproduces Flex's 2.03 / 1.74 / 1.39 / 0.85; the sim rusher rows are 1.79 / 0.98 / 0.94 / 0.71. Flex's 1.65 / 0.79 / 0.43 / 0.17 were `SET_SPOT` alone; with `SET_SPOT`, `SET_SPOT_TACKLE` and `POCKET_LEVEL` their achieved rows are 1.63 / 1.03 / 0.97 / 0.74 (`held-request.mts`, seed 11, two games), which agree with mine. Reconciled 2026-11-16.) The p50 gap is -0.26, -0.62, -0.38, -0.02. Three things it is not:

* **Not a contact-law timeline.** The staged head-on pair, run through the same windows (`ANCHOR_BINS=1`), is 0.99 / 1.53 / 1.22 / 0.55 yd/s against the NFL pair 1.67 / 1.64 / 1.32 / 0.75 (and the games' 1.41 / 1.02 / 0.94 / 0.73): at 0.5 to 1.5 s the staged pair is within 0.1 of the NFL. A start posture of 0.8 for both changes it by 0.1 to 0.2. `PUSH_GROWTH` (0.25, 0.12, 0.06 per substep) changes nothing.
* **Not help from a second lineman.** Splitting pairs by a second OL within 1.5 yd of the rusher 0.5 s after contact, p50 by window: NFL alone 1.72 / 1.84 / 1.63 / 0.96, helped 1.64 / 1.46 / 1.05 / 0.57; sim alone 1.46 / 1.21 / 1.01 / 0.73, helped 1.40 / 0.92 / 0.90 / 0.71. The unhelped NFL pair is the fast one, and the sim's is 0.6 yd/s under it.
* **Not who gets pushed, but who walks.** Interior linemen with no defender within 3 yd (NFL, n 130 / 89 / 37 lineman-windows) move toward the QB at 1.37 / 1.86 / 0.63 yd/s at 0.5 to 1.0 / 1.0 to 1.5 / 1.5 to 2.5 s (p50; p25 to p75 0.95 to 1.71, 1.39 to 2.15, -0.35 to 1.20). That is the NFL blocker's own set retreat, with nobody on him, and it is the size of the held pair's speed (1.64 / 1.32 / 0.75). In the sim the staged blocker asks for 2.08 / 0.75 / 0.43 / 0.06 yd/s and gets 1.51 / 1.55 / 1.13 / 0.53: from 0.5 s on his retreat is the rusher's doing, not his own. (Flex's pocket-depth finding is the same fact: the uncovered NFL guard retreats 2.9 yd by himself.)

The sim's interior OL are almost always covered, so there is no sim counterpart of the uncovered row (1, 1 and 0 lineman-windows in six games); the comparison is the blocker's request against the NFL's uncovered velocity.

## 5. The one mechanism, and its staged gate

Do not build a third contact law. The measured contact law reproduces the NFL's mass slope with its strength and the staged pair's timeline; where strength cannot enter (a man at his traction cap) is physical and no constant here is fitted. The rusher's request "saturated at 4.49" is not the lever either: his achieved speed is the equilibrium above, however hard he asks.

The mechanism the data point to is **the blocker's own retreat while engaged**, a decision, not a force: a pass-set guard gives ground at a rate and to a depth set by the QB's drop and keeps his base while he does (the coached set; the kick-slide for a tackle, the retreat for a guard), and keeps retreating on the felt push rather than stopping his request at 0.4 to 0.06 yd/s. It belongs to the blocker's controller (Flex's `SET_SPOT` stage), under the commit-to-a-decision rule (a retreat decision persists until a perceived change clears a margin; the rate is bounded by what his base allows, not zeroed by a step function of his own speed).

Staged gate, in order, each against the NFL numbers above and nothing fitted to a pocket total:
1. The staged head-on pair with the blocker's retreat request read from the NFL's uncovered guard (1.37 / 1.86 / 0.63) as a stated choice, read at three levels (0.5x, 1x, 1.5x): the pair's windows against the NFL pair's IQR (0.96 to 2.18 at 0.5 to 1.0 s), and the mass-and-strength arms of §2 unchanged (a retreat request must not hide the contact: ±0.2 per 10% stays).
2. The held-pair games read (`held-pair-speed.py`, same operator, both exports): p50 by window within the NFL's IQR, release rates (NFL 49% by 1.0 s and 85% by 2.0 s; sim 31% and 73%).
3. Pass-protection card (16 games, three seeds): sack rate, time to throw, pocket depth at 2.5 s; the dither budget (the retreat must not re-aim); `test/engine-pin` unaffected.

What I did not measure: the blocker's retreat in the NFL when he is covered (tracking cannot separate his walk from the push; the uncovered sample is 130 lineman-windows and selects plays where nobody got to him), strength in the NFL (not in the data).
