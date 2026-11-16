# Contact that draws on no stance or base: one law or two (Tools, 2026-11-16)

For Integration, from Flex's two findings of one kind: **(A)** an engaged pair settles where the rusher's `pushForce * (1 - v/vmax)` equals the blocker's traction, so strength never enters (diagnosis in `2026-11-16-push-contest-law.md`, on claude/route-speed-diag); **(B)** the hands joint's push and steer limits are the same at a locked arm's length at any angle as bent in front of him and draw on no base, so a tackle running 4 yd/s holds 550 to 710 N on a rusher driving at him and the pair sits at arm's length (1.5 yd; the NFL's engaged rushers are hip to hip at 0.7 to 1.0). Nothing here changes a default: (A) is built behind `STEP_CREDIT` (off), (B) is a written law, not built.

## 1. One law or two

Both are the same statement, **a force reaching a body through a link is limited by the weakest link in the chain, and each link's limit is a force, a moment, or a time share**:

| link | limit | in the model today |
| --- | --- | --- |
| friction under the foot | `mu * N` | `traction` (`TURF_MU` 1.1, unsourced; `PAD_LEVERAGE` moves `N`) |
| the muscle at the joint | force-velocity, `pushForce * fv` | `fv = 1 - v/vmax`, up to 1.2 against his own motion |
| the base under his centre of mass | a moment: `F * h <= W * b` | `unsupportedLean`, the capture-point offset `xi`, `availability` (stepping, falling) |
| **the feet being on the ground** | **a time share** | **missing (A)**: a man driven backward holds the credit continuously |
| the arm | `armForce`, `ARM_GIVE` spring | `PAIR_HANDS`, hands joint `push` / `hold` / `steer` |
| **the trunk at the shoulder** | **a moment: `F * L * sin(theta) <= armForce * CHEST_HALF`** | **missing (B)**: the press does not feel the moment it puts on his trunk |

The two missing links are different kinds, so they are two laws that share one rule (the minimum over the chain) and must be separate bits: (A) is a time share on the legs, (B) is a moment on the trunk. The base-moment link already exists for the ground reaction (`unsupportedLean`); (B) adds the same kind of link for the hands. A third item in the same family is `PAD_LEVERAGE`'s lift, which lowers the friction link of a man whose pads are high: it is right physics (a lifted man bears less), and it is why a lifted rusher's strength cannot count (rusher power x1.15 changes nothing at any level in any arm below). The defect Flex found there, in 2026-11-08, is the pre-contact posture (he arrives upright), a Defense controller question, not a ground law; I leave `PAD_LEVERAGE` alone.

## 2. (A) the stepping share: `STEP_CREDIT` (off), read at three levels

A man whose legs yield against his own motion under a felt load (driven backward) is stepping: the base must be relocated as fast as he moves, and while one foot is placed the other carries the load. His leg force `fv` (credit included) is multiplied by `share = 1 - (1 - STEP_FLOOR) * min(1, v / stepSpeed)`, `stepSpeed` the gait's own recovery stepping speed (support.ts, 3.2 yd/s by default), `STEP_FLOOR` the one-leg share of two at full stepping. **`STEP_FLOOR` is a stated choice, no source**; read at 100 (off), 75 and 50. (The first form, `1 - v/stepSpeed`, run the pair to 2.7 yd/s at walk-back, the emergency stepping speed taken as the ordinary pace; dropped.)

**Staged pair** (Flex's `anchor-staged.mts`, C 144 kg against DT 140 kg, `SET_SPOT=1`; pair walk-back toward the QB, yd/s, 0.5 to 2.0 s):

| arm | off | 75 | 50 |
| --- | --- | --- | --- |
| base | 1.15 | 1.15 | 1.33 |
| blocker power x0.85 / x1.15 | 1.13 / 1.16 | 1.26 / 1.16 | 1.57 / 1.34 |
| rusher power x0.85 / x1.15 | 0.94 / 1.15 | 0.95 / 1.15 | 0.99 / 1.33 |
| blocker mass x0.9 / x1.1 | 1.56 / 0.95 | 1.56 / 0.99 | 1.81 / 1.17 |
| rusher mass x0.9 / x1.1 | 0.95 / 1.15 | 0.95 / 1.15 | 1.00 / 1.32 |

The two properties the flag owed:

1. **Strength enters for both men: only for the weak side.** A weaker blocker is walked back further (1.13 to 1.57 at 50), but a stronger one holds no better (x1.15: 1.16 / 1.16 / 1.34): he is at the traction cap for most of his range. The rusher's side does not move at all (his lift caps him).
2. **Mass dependence weaker and without sign problems: not met.** Blocker mass x0.9 to x1.1 spread: 0.61 off, 0.57 at 75, 0.64 at 50; rusher 0.20, 0.20, 0.32. Traction was the only place mass entered alone; `legDrive` itself is proportional to mass, so lifting the cap moves the mass dependence into strength times mass.

**Edge pair** (`edge-ride-staged.mts`, 293 / 292 / 279 edge rushers reaching the tackle's hip): centre distance p50 hip / +0.5 s / +1.0 s: 0.79 / 1.24 / 1.57 off; 0.81 / 1.26 / 1.58 at 75; 0.86 / 1.32 / 1.63 at 50. Hip to hip by +0.5 s: 80 / 78 / 74%. To the QB, hip to +1.0 s: 4.9 to 4.2 off, 4.9 to 4.1 at 75 and 50 (NFL 5.3 to 3.5). The flag moves the edge ride by 0.02 to 0.08 yd the wrong way (farther apart); it is not about the edge.

**Run set** (1,438 saved run plays, paired, capped at 20): mean 3.32 off, 3.46 at 75 (+0.14, SE 0.07), 3.52 at 50 (+0.21, SE 0.08); stuffs 14.7%, 12.2%, 12.9%; 10+ yd 5.6%, 6.5%, 6.4%. Blockers win more engaged reps against men driven back, defenders (who are the ones driven back on runs) give ground.

**Scorecard** (16 games per arm, 2 leagues, seed 23, paired; one card, flag-final code), off to 75 / 50:

| | off | 75 | 50 |
| --- | --- | --- | --- |
| sack rate per dropback | 5.6% | 5.0% (-0.6, -1.9 to +0.5) | 4.8% (-0.8, -2.0 to +0.3) |
| time to throw (s) | 2.70 | 2.76 (+0.06, +0.02 to +0.10) | 2.75 (+0.05, +0.01 to +0.10) |
| completion | 67.9% | 66.9% | 67.9% |
| yards / attempt | 8.74 | 8.22 (-0.52, ns) | 9.03 (+0.29, ns) |
| rush yd / carry, capped | 3.65 | 3.72 (+0.08, ns) | 3.80 (+0.15, ns) |
| run stuff rate | 12.1% | 9.7% (-2.4, -4.9 to +0.1) | 10.3% (-1.8, -3.5 to 0.0) |
| yards before contact | 0.85 | 0.85 | 1.12 (+0.26, +0.01 to +0.54) |

Pass protection (pressure by class and pocket depth with `POCKET_LEVEL` on are not rows this card has; run them before a card): the sack rate falls 0.6 to 0.8 points and the QB holds the ball 0.05 s longer at both levels (resolved, small), nothing else resolves. An earlier card, on a version of the code that differed only by a reassociated floating-point expression, moved its own off arm by +0.4 yd per carry (3.31 to 3.65 capped), which is the size of the single-card noise on the rush row; its +0.44 and +0.68 were that noise and are not carried.

Flag off is byte-identical to develop (233 plays of one saved file, hashes equal), with the arithmetic order of the original expression kept.

## 3. (B) the press bound, as a law (not built)

Flex's staged probe (`edge-ride-staged.mts`, 864 plays an arm; `DIAG_PRESS_EXT` in the probe-only patch on claude/quirky-franklin-9lbwbp): bound the hands joint's press by the moment it puts on the pusher's own trunk, `F * L * sin(theta) <= armForce * CHEST_HALF`, `L` the arm's reach to the chest, `theta` the angle off his facing. They report the median hip-to-hip distance moving from 1.11 to 1.40 yd to 1.03 to 1.07, no new constant (`CHEST_HALF` is the shoulders' hold already in the model), the press never costing the tackle speed or balance; `ARM_GIVE`'s spring alone is the weaker form, `BRACE_GAIT` changes no distance. I did not rerun it (their probe, their numbers).

Is it the right law or a special case? It is the trunk link of the chain above: a joint moment, `M_max / (L sin theta)`, where the joint is the shoulder girdle and `M_max` the chest's. For a straight press (`theta = 0`) it does not bind: a man pushing square, arms in front, can put all of `armForce` through; as the arm goes out to the side or locks out at the angle where it puts a moment on the trunk, the limit falls as `1 / sin(theta)` and with `L`. That is the right shape for arm-position dependence, and the only physical statement that makes "locked at arm's length at 0.45 yd to the side" weaker than "bent in front". It is the base-moment law (`F * h <= W * b`) applied one link up: the base is the trunk's own chest width rather than the feet. So it is a special case of the chain rule, not of (A).

Sources. Static two-handed push force depends on handle height and elbow angle, with the largest forces about 100 cm (a Waterloo thesis, Chow, on two-handed maximal push and pull) and an optimum exertion height of 50 to 90 cm in a Japanese isometric study; Kroemer's 1974 "Horizontal push and pull forces" (*Applied Ergonomics* 5) is the classic reference for normative values. I found these, not their numbers (no body-weight percentage by arm angle turned up, and I did not read the papers). The moment form has no number of its own to source: `CHEST_HALF` is the model's, and the law adds no constant. A source for `armForce * CHEST_HALF` as a trunk moment capacity (the moment a lineman's chest can sustain against a hand load) would be the one thing that would settle whether it is generous or tight.

Staged gates for (B), each bit separately readable:

1. Staged pair and edge pair with the bound on and off: hip-to-hip distance by time (NFL 0.7 to 1.0), tackle speed and balance unchanged, the pair walk-back for a straight press unchanged (the bound must not bind at `theta = 0`).
2. Run set paired, 1,438 plays: stuffs, yards and the split by run concept (a tight edge ride moves the edge defender's leverage).
3. Pass-protection read (pressure by class, never-released, pocket depth with `POCKET_LEVEL`) and the sack and time-to-throw rows on a 16-game card.
4. Only then a card with both bits, and then the interaction (A) x (B) on the same staged pair.

## 4. What I would do

* Keep `STEP_CREDIT` off. It repairs one property (strength enters on the weak side) and not the other (mass dependence), on an unsourced floor. Its effect on the run game is in the noise of the cards I have (+0.08 to +0.15 yd per carry, stuffs -1.8 to -2.4 points) and on the run set about +0.14 to +0.21 yd, so it is a small, directional change that wants a reason before it wants a card.
* The better reason would be the NFL witness (`held-walkback.py`): the early reverse (lighter rushers walk the pair back more) and the small late weight slope both come from the set and the get-off, not from the ground law. Pocket depth is the blocker's set (Flex), so the ground law has no NFL number to be read against except the late slope, and the sim's mass slope is twice that.
* Build (B) as the next bit if Integration wants a candidate for the edge ride, with the gates above; it adds no constant.
* `TURF_MU`: a stated choice at three levels (1.1 as is, and `TURF_MU_SCALE` 0.9 and 1.2 on Flex's branch) until someone can read the two Wannop papers.
