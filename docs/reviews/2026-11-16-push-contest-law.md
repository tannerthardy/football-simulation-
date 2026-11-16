# The ground law in a push between engaged men: diagnosis and proposal (Tools, 2026-11-16; no build)

For Integration, from Flex's finding (anchor-staged.mts, anchor-games.mts, held-walkback.py on `claude/quirky-franklin-9lbwbp`): between two engaged men strength never enters the push, only mass. Nothing here is to be fitted to a pocket number (Flex showed the NFL pocket depth is the blocker's set: the uncovered NFL guard retreats 2.9 yd by himself). The question is the law.

## 1. What the law is today

Each body's ground force (`World.feet`, `src/physics/world.ts`, `src/physics/support.ts`):

* `traction = TURF_MU * m * g` with `TURF_MU = 1.1` ("model assumption", unsourced), scaled by the normal load (`PAD_LEVERAGE`: a lifted body has less, a pressed one more).
* `pushForce = min(legDrive, traction)`, `legDrive = power * g * allometry`, `power = m * (0.55 + 0.75 * strength)` (`players/physical.ts`): 0.55 to 1.30 of body weight before allometry.
* The force he can put on the ground along a direction: `pushForce * fv * along * a`, capped again by `traction * a`, with `fv = clamp(1 - v/vmax, 0, 1.2)`, `v` his velocity along the force. Pushing the way he moves loses force with speed (concentric); yielding against his motion (driven backward) gains it up to 1.2 times (eccentric credit, "multi-joint eccentric force is about 1.1 to 1.3x", comment, unsourced).

Two caps, close together: generated linemen's `legDrive / traction` is p10 0.83 to 0.89, p50 0.90 to 0.99, p90 0.97 to 1.06 (OT, OG, C, EDGE, DT, LB; 60 generated teams), and 3 to 14% of them (44% of DTs) are at or over it. So `legDrive` is under traction for most, and strength moves it by about +-7% only because the roster's strength spread is narrow.

## 2. Why strength drops out between two engaged men

For the man being driven backward `fv` is above 1 once his backward speed passes 0.2 `vmax` (about 1.6 yd/s), and `1.2 * legDrive` is over `traction` when `legDrive / traction > 0.83`, i.e. for essentially every lineman. His force is therefore `traction` (the Coulomb cap), whatever his strength. The pusher moving forward has `legDrive * (1 - v/vmax)`, which is under his own traction and, against a resister at `traction`, short unless `legDrive > traction_resister` (mass-compared). So the pair settles where `legDrive_pusher * (1 - v/vmax) = mu * m_resister * g`: strength enters only for the pusher, and only as long as it stays below his own cap (Flex's arms: rusher power x0.85 slows the pair 1.15 to 0.94 yd/s; x1.15 changes nothing, because he is lifted by his own pad level and capped; the blocker's power changes nothing at x0.85 or x1.15). The resister's strength cannot enter because he is at the traction cap, and mass enters through traction.

This is two things at once:

1. The eccentric credit applies to a man who is stepping, not planted. A man driven backward at 1 to 2 yd/s must take steps; a stepping man's sustained force is his stance foot's, and the swing foot carries none, so the time-averaged capacity cannot be the bilateral isometric times 1.2. The law treats him as double-planted continuously.
2. The cap that then binds is the unsourced `TURF_MU`, and it binds on both men at once (mass in, strength out).

## 3. What a stepping man would do (a probe, not a proposal of a value)

`docs/reviews/patches/2026-11-16-ecc-mult-probe.patch` (World probe, not for landing) multiplies the force of a body that is moving against his own push by `ECC_MULT`. Flex's staged pair (C 144 kg against DT 140 kg, both on their own pass rep, `SET_SPOT=1`), pair walk-back toward the QB, yd/s, 0.5 to 2.0 s:

| arm | credit as built (1.0) | 0.8 | 0.6 |
| --- | --- | --- | --- |
| base | 1.15 | 1.34 | 1.85 |
| blocker power x0.85 / x1.15 | 1.13 / 1.16 | 1.52 / 1.34 | 2.23 / 1.84 |
| blocker mass x0.9 / x1.1 | 1.56 / 0.95 | 1.61 / 1.27 | 2.22 / 1.77 |
| rusher power x0.85 / x1.15 | 0.94 / 1.15 | 1.10 / 1.34 | 1.49 / 1.85 |
| rusher mass x0.9 / x1.1 | 0.95 / 1.15 | 1.14 / 1.33 | 1.65 / 1.83 |

At 1.0 the blocker's strength moves the pair by 0.03 yd/s for -15%; at 0.8 by 0.18; at 0.6 by 0.39. Strength starts to count for the resister as soon as `1.2 * credit * legDrive < traction`, i.e. below about 0.9 for a lineman at 0.93 of traction. Mass sensitivity falls (blocker mass x0.9 to x1.1: 0.61 to 0.52 to 0.45 yd/s). The rusher's own power at +15% still does nothing at any level (he is traction-limited by his lift), a separate effect of `PAD_LEVERAGE` that the walk-back does not depend on.

The values 0.8 and 0.6 are not claims. They show where the law's strength dependence switches on.

## 4. The NFL witness

`held-walkback.py` on the BDB 2025 export (weeks 1 to 9; held interior pass pairs, `out/push-contest-nfl-walkback.txt`; the blocker's median weight 310 lb): the pair's median velocity toward the QB by time since contact, and by the rusher's weight minus the blocker's.

| window | all | rusher < -30 lb | -30..0 | 0..+30 | > +30 |
| --- | --- | --- | --- | --- | --- |
| 0.0 to 0.5 s | +1.61 | +1.90 | +1.58 | +1.50 | +1.39 |
| 0.5 to 1.0 s | +1.59 | +1.71 | +1.59 | +1.54 | +1.50 |
| 1.0 to 1.5 s | +1.32 | +1.26 | +1.35 | +1.31 | +1.42 |
| 1.5 to 2.5 s | +0.84 | +0.60 | +0.85 | +0.87 | +0.99 |

Three readings. Early (first second) the lighter rusher walks the pair back more (+1.9 against +1.4), the get-off and the set, not mass. Late (1.5 to 2.5 s) weight shows the right sign and a small size: +0.39 yd/s from a rusher 30 lb under to 30 lb over, where Flex's staged pair gives 0.20 yd/s for rusher mass x0.9 to x1.1 (62 lb of range) and 0.61 for the blocker's: the sim's mass dependence on both sides together is about twice the NFL's late-window slope, and it has none of the early reverse. And the pair is at 0.84 yd/s at 1.5 to 2.5 s against the sim's 1.15 on the staged pair. Selection (who is held, how long, the blocker's weight not controlled) makes the NFL slope a weak witness; it says mass is not the whole story, not what the slope should be.

## 5. Sources

What I could verify, and what I could not:

* Force-velocity of multi-joint maximal efforts is close to linear (Jaric 2015, *Int J Sports Med* 36:699-704; sprint F-v profiles: Samozino et al. 2016, *Scand J Med Sci Sports* 26:648-658). That supports `fv = 1 - v/vmax` as a concentric law. Both from memory of the literature; not re-read here.
* Braking is not the mirror of propulsion: maximal horizontal decelerations of team-sport athletes show horizontal ground forces up to six times those of accelerated or constant-speed running (Verheul, Harper and Robinson 2024, *J Sports Sci*), and early-stance braking forces up to 2.7 times those of the first steps of a maximal acceleration (Harper, McBurnie and Dos' Santos, review). Read as search summaries, not the full texts. These are a running man decelerating, a single braking step by a man planting a foot, not a lineman being pushed with his hands engaged; they show the braking foot can carry much more than the propulsive one, which is a reason the eccentric credit is not zero, and say nothing of a sustained, stepping resistance.
* The cleat-turf translational coefficient: the literature exists (Wannop and colleagues' translational traction on natural and artificial turf, *Sports Engineering* 2013 and 2024; Livesay et al. 2006 on rotational) but the full texts sit behind a login I cannot pass from here, so I have no coefficient to put against `TURF_MU = 1.1`. It stays unsourced. Someone with access should read those two papers for the translational coefficient under a loaded cleat.
* Linemen's push forces: the instrumented-sled study I found (1997, five Division I linemen) reports an average impact force at the sled of about 3,013 N at contact, not a sustained push; no sustained horizontal ground force of a lineman in a drive block turned up. That is the datum the law needs, and the search did not find it.
* The eccentric credit 1.1 to 1.3, the stepping argument and the duty values are not sourced anywhere I could verify.

## 6. Proposal (for a decision, nothing built)

1. Leave pocket depth alone (Flex: it is the blocker's set).
2. Keep `fv` as the concentric law; stop paying the eccentric credit to a man whose legs are stepping. The model needs a sustained-capacity term for a man moving against his own push at a pace that makes him step, not an unconditional 1.2: the capacity of a stepping man is his stance foot's share of the time, below the bilateral isometric. The law's own gait already knows when he is stepping (`feet()` has the gait plan and the stride), so the term can read it instead of a constant.
3. The value: no source. State it as a choice and read it at three levels (a stepping share of 1.0 as built, 0.8, 0.6), judged by the two properties the physics owes (strength enters for both men; mass dependence is weaker than today's) and against the NFL witness only in direction (late weight dependence small and positive; early get-off dominant), never by the pocket number.
4. Separately, `TURF_MU = 1.1` needs a source or a stated choice read at three levels (`TURF_MU_SCALE` exists on Flex's branch for it). It binds both men and sets how much mass counts.
5. Separately, `PAD_LEVERAGE` caps a lifted rusher's traction, so his strength cannot count either. That is a legitimate physical effect (a man lifted bears less), but together with the credit it removes the pusher's strength from the pair as well.

Decisions I need: whether (2) is the right shape (the stepping share read from the gait), and who reads the two turf papers for (4).
