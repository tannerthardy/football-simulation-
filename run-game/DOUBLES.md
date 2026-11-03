# Doubles, climbs, wraps and the counter back (2026-11-02/03)

Develop `3876a64c` (#390 merged). Unless stated, sim is the matched restage: 12 seeds (7–29 odd), stream 0, all concepts (`allarm.sh <wt> D0`).
NFL is BDB through the same operator (`scripts/mechanics/run_film_reference.py` loaders).

Tools:
- Python: `tools/py`.
- Scenes and diagnostics: `tools/ts`. Copy them into `scripts/diag` to run.
- Parked candidates: `patches/`. None is committed to a feature branch.

## Headline

Several run-game controller fixes are right in constructed scenes but neutral on full replays. They land late or against the wrong defender motion, because of four defensive gaps:
- **DL get-off and charge.** At the snap our DL barely move. At first OL contact they don't come forward: depth change over 0.5 s is −0.05…−0.2 vs NFL −0.3…−0.6.
- **DL lateral flow.** OZ DL lateral is about half NFL. Our DL flows toward the helper's side 9–13% of the time vs NFL 30–35%.
- **LB start.** LBs don't move at 0.5 s.
- **LB fit discipline.** LBs keep running downhill at 2.0–2.5 s instead of fitting their gap.

These were sent to Defense, who is working on DL get-off and the pre-snap OL stance tell. Re-test the parked patches on their branch.

## Counter wrapper (`wrapeye.py`, `kickspot.py`, `wrapclock.py`)

- **The wrapper's own path matches NFL.** Lateral, depth and speed are within 0.3 at every 0.5 s from 0.5 to 3.0 s.
- **The pullers run in tandem.**
  - Wrap–kick distance at 2.0 s: 1.06 vs NFL 2.46.
  - Depth separation: 0.43 vs 0.94.
  - 30% of the wrapper's first touches are on the kicker's man, vs 4% in NFL.
- **The back leaves the wrapper.** It crosses 1.9 yd inside the kick spot; NFL backs cross at the kick spot.

Patches, both directionally right and outcome-neutral:
- `wrap-race-v1`: the lead takes the man he can meet before that man meets the runner.
- `wrap-seam-v1`: eyes-inside first open seam.

## Counter back (`holecrowd.py`, `_ctrback`/`_ctrlev`)

- **Seam crowding at carrier −2 yd is NFL-like.** A free defender is at the seam 23% of the time vs NFL 20%.
- **Every read that chooses inside saturates "closed".** 99% of them.
- **With a leverage read, the remaining closers are legitimate threats:** free LBs, DL that are squared up or on the seam side, and men in the hole.

Patches (power first contact got worse):
- `ctr-back-keyread-v1`: key-only press until −2.
- `ctr-back-leverage-keypress-v1`: leverage plus key press. Crossing moves 1.92 → 1.64 yd inside the kick.

## Double shape (`dblflow.py`)

IZ members sit about 0.6 off the man and 0.3–0.45 in front, gap 1.3. NFL is about 0.5 / 0.6–0.7 / 1.0. This holds in every flow class, so it is real.

- **The hand-joint grip does not pin re-fit.** `_refitprobe`: a blocker gets 90° around the man in 1 s with hands on.
- **The shape comes from the helper's approach.** `dbl-B3-hip-from-snap` reproduces the NFL shape exactly. But it abandons the helper's gap and his eyes on the man: unblocked line rises 3 → 16%.
- **`dbl-B5-half-of-man` is the safe base.** Develop-level outcomes and shape.
- **Shape does not drive the pressed release.** It stays at 28% with NFL shape.

## Who climbs (`dblleave.py`, `_overtake`, `_relwhy`)

- **NFL hands the man over along his flow.** When the DL flows to the covered man, the covered man climbs 65% (IZ) / 76% (OZ).
- **The operator says ours are inverted.** The helper "leaves" 81% / 75%.
- **Code release already follows flow in OZ** (136 vs 46). The operator's "helper leaves" is a helper falling more than 1.3 yd behind a flowing DL.
- **NFL helpers out-run the DL laterally.** OZ: 2.85 vs DL 2.03. Ours roughly equal the DL: 1.90 vs 1.71.

The engaged-helper law had no lateral mirror of the man. `dbl-C5-overtake-intercept` combines four pieces:
- B5;
- release by flow;
- the helper's lateral mirror;
- the backer route to the intercept point.

In the OZ scene (`SCENE_CONCEPT=oz_strong _dblform.mts`) it gives the NFL overtake: C keeps the DT and RG climbs. But the hand-off lands at about 2.0 s vs NFL 1.3 s. On full replays it is neutral.

## Second level (`lbfit2.py`, `lbtempo.py`, `backertoucher.py`)

- **Untouched box LBs are 2–3× NFL** (IZ 33% vs 12%).
- **Climbers are not the problem.** They arrive on time: first touch 1.6–2.2 s on both sides. Near misses equal NFL.
- **Box LBs blocked:** 58–70% vs 82–86%.
- **LBs keep moving through blocks.** Lateral travel toward the carrier during the block: OZ 1.54 vs 0.40.
- **LB depth at carrier −2 yd matches NFL**, but late downhill does not: IZ 1.35/0.70 at 2.0/2.5 s vs NFL 0.70/−0.25.

`F1-ballside-fit`: no change, because the fit only applies in the last moment.

## First-level approach (`olfirst.py`)

At first DL contact, by role, across IZ/OZ/power/counter/trap:
- **Approach angle:** NFL 40–80° vs sim 15–35°.
- **Upfield speed:** NFL 0.1–0.9 vs sim 0.6–1.6.
- **Defender motion:** NFL DL keep coming forward (−0.3…−0.6 over 0.5 s); ours do not.

`G1-zone-step` changes nothing. The tracking "first contact" is our engage moment, after which the engagement drive (2.4 yd/s forward into a static DL) governs.

## C5 under counterfactual flow (2026-11-03)

`DEF_GETOFF` is already 0.5 (NFL-matched) in the candidate profile, so develop includes it.

With `CF_FLOW=over` (counterfactual DL flow with the line), develop vs `dbl-C5`:

| | develop | `dbl-C5` |
|---|---|---|
| OZ climbs by 2.5 s | 25% | 16% |
| IZ climbs by 2.5 s | 40% | 25% |
| Box LBs blocked (OZ) | 42% | 33% |
| Box LBs blocked (IZ) | 44% | 32% |
| IZ first contact | +1.26 | +1.02 |

C5's doubles hold too long. It is **rejected**, not parked.

The overtake decision alone (release by flow) needs a version that does not delay the climb.

## Mesh speed (2026-11-03, `meshspeed.py`, `_meshside`/`_meshtrace`)

**Compare within alignment families** (under centre / pistol / offset gun). Our play-call mix differs from NFL: NFL OZ is mostly under centre. Medians across families mislead.

**The gap is in the offset gun.**

| Handoff speed (yd/s), offset gun | sim | NFL |
|---|---|---|
| IZ | 2.48 | 3.70 |
| OZ | 2.62 | 4.55 |
| Power | 2.50 | 3.64 |

Pistol, under-centre IZ and counter are close.

**Far-side meshes cause most of it** (55% of offset runs).
- The mesh landmark sits 0.9 yd past the QB and 0.6 yd in front, 3.4 yd from the back.
- His straight line runs through the QB, about 0.15 yd from centre, so spacing brakes him.
- He reaches the ball at 2.7–2.8 yd/s; near-side meshes give 3.2–3.4.

**`M2-mesh-cross-in-front`** (cross in front of the QB at his own pace):
- Far-side handoff rises to 4.7 yd/s.
- Offset IZ 4.43 and power 4.61 now overshoot NFL.
- Power first contact +0.56 → +0.27; trap 1.33 → 1.01.
- **Not kept.**

The underlying item is the far-side mesh landmark: NFL backs take the ball as they pass in front of the QB. It is a concept-install geometry change, to be weighed against gap-scheme timing.

**`M3-faceside-mesh`** (cross the QB's face at body clearance; committed on `run/G2-mesh-emlos` 4cfada58, develop 85952c95):

| Offset-far handoff (yd/s) | develop | M3 | NFL |
|---|---|---|---|
| IZ | 2.42 | 3.58 | 3.86 |
| OZ | 2.48 | 3.62 | 4.61 |
| Power | 2.50 | 4.02 | 3.75 |

- Early patience is unchanged: 0.1 yd/s at 0.3 s (NFL 0.2–0.4).
- First contact, stream 0: IZ +0.62/+0.65 and OZ +0.20/+0.21, unchanged.
- First contact, power, 5 streams (n≈675): +0.52 → +0.46 (NFL +0.47).
- **Risk:** on power, unblocked linemen as the first hitter rise 5 → 7% (NFL 3%). The faster back reaches the line before a lost block is cleaned up. One pinned case, M7-P051, was re-recorded for this: DT_S hits at 1.9 s.

## Power pullers (2026-11-03, `powertime.py`, `powerhit.py`, `powerkick.py`, `_pulltrace`/`_pull2b`/`_pullfirst`/`_emlos`)

**The power puller's lateral race is NFL-like; his depth is not.**

| | NFL | sim |
|---|---|---|
| Lateral moved @1.0 / 1.5 / 2.0 s | 1.77 / 3.40 / 4.66 | 1.74 / 3.50 / 4.50 |
| Turn-up time | 2.4 s | 2.4 s |
| Depth @1.5 / 2.0 s | −0.97 / −0.31 | −1.33 / −1.13 |

NFL pullers start gaining ground from 1.0 s; ours stay flat behind the wall.

**Tight to the wall's tail (`P1`): no effect.** The observed rear surface of the down wall stays at about −0.75. Our down blockers do not move it forward, so tracking it changes nothing.

**Kick-outs on the end man are NFL-like (11 personnel).**

| At contact | NFL | sim |
|---|---|---|
| Time | 1.8 s | 1.9 s |
| Puller depth / lat | −1.13 / 2.71 | −1.26 / 3.23 |
| End depth | −0.65 | −0.75 |
| End moved in | −2.2 | −2.05 |

**The gap is who the guard blocks.**

| Guard's first contact | 11 personnel | 2 backs | 12+ |
|---|---|---|---|
| NFL: end man | 36% | 27% | 15% |
| NFL: LB | 33% | 40% | 39% |
| sim: end man | 74% | 69% | 74% |
| sim: LB | ~0 | ~0 | ~0 |

In NFL power, someone else (TE, H or FB) often has the end, and the guard wraps to a backer. Our install has the guard kick unless a fullback is in the backfield: 130 of 155 power snaps. That is a play-mix and install question, not a mechanism.

**Fixed: the kick man was sometimes a press DB.** The end man was the widest defender within 2 yd and 9 yd of the ball. In about 35 of 300 power and counter snaps, that was a corner or nickel pressed on a split receiver 8–9 yd out. Fixed on `run/G2-mesh-emlos`, regression test `test/kick-end-man.test.ts`:
- A defender standing off the ball (more than 1.1 yd) over a receiver split more than 3 yd outside the core is not the end man.
- A down end beside a flexed wing still is (`edge-key-hold` #76).

**Fixed, no measured effect: the FB's kick man is now a called kick,** so the lead guard's first-threat read does not double him.

**Open: lead guards on FB power block nobody.** 15 of 25 lead guards are not engaged by 3.5 s. Traces:
- The snap target is often a DB (FS, SS, CB).
- The first-threat read re-picks by distance to the hole each beat.
- The guard swings wide of the hole at −1.0…−1.5 depth instead of turning up.

Next: the lead guard's turn-up geometry and threat choice, measured against the NFL "guard's first contact = LB 33–40%" target.

**`dbl-C6-intercept-cost`** (release proposals costed to the backer's intercept point): neutral. Not kept.

## Covered tight end on power (`powerte.py`, `_teplan`, `_kickdbl`)

**Setup:** power plays with a playside inline TE. Buckets are the end man's alignment over the TE.

**How often the TE stays within 1.2 yd of the end man for at least 1.0 s:**

| End man's alignment | NFL | sim |
|---|---|---|
| Head-up | 68% | 14% |
| Outside | 28% | 8% |

**Why:** in our install the TE climbs to a backer in 62 of 83 such snaps. The guard kicks the end first in 103 of 130 power snaps, and nobody else engages the end first in all but 8.

**What the NFL guard hits first when the TE touches the end first** (NFL n=99, sim n=27):

| Guard's first contact | NFL | sim |
|---|---|---|
| The end man | 31% | 70% |
| A linebacker | 34% | 0% |
| Another lineman | 31% | 22% |

This is the "covered TE blocks his man, puller turns up" rule. It is parked for two reasons:
- It covers only about 10% of power snaps.
- The NFL guard still meets the end first 45% of the time even when the end is head-up on the TE, so the rule is ambiguous.

## Trap (`powerhit.py`, `CON=TRAP`)

First contact on trap is +1.52 vs NFL +0.43; behind the line 24% vs 46%.

**The trapped lineman does not charge.**

| Trapped lineman | NFL | sim |
|---|---|---|
| Depth at contact | −0.36…−0.46 | +0.24 |
| Movement in the 0.5 s before contact | 0.7–0.8 yd upfield | ~0.1 yd |
| Contact time | 1.1 s | 1.2–1.4 s |

This is the same DL get-off item that was sent to Defense.

## Counter wrap re-tests on `run/G2-mesh-emlos` (5 streams)

**Spacing at the kick:**

| | NFL | sim |
|---|---|---|
| Wrapper's lateral offset from the kicker | −1.70 | −1.13 |
| Wrapper–kicker distance | 1.94 | 1.32 |

The wrapper's "first block" on the kicker's man (28% vs NFL 4%) is mostly the wrapper passing within 1.2 yd behind the kicker. It is not a target choice.

**Patches re-tested:**
- `wrap-race-v1`: worse. Kicker's man 28 → 32%; blocks a line man 45 → 56%.
- Strike-reach "claimed" mates in `holeThreat`: no change.
- Both reverted.

## Defense's DL tempo flags (`PRESNAP_TELL=1 ACCEL_CUE=1`, merged locally with 85952c95, stream 0)

**OZ DL lateral velocity toward the play**, yd/s:

| | 0.3 s | 0.6 s | 1.0 s | 1.5 s |
|---|---|---|---|---|
| NFL | 0.65 | 1.50 | 2.50 | 3.20 |
| develop | 0.05 | 0.65 | 1.50 | 2.00 |
| both flags | 0.15 | 0.75 | 1.50 | 2.00 |

**OZ doubles:**

| | develop | both flags | NFL |
|---|---|---|---|
| DL flows to the helper | 10% | 18% | 32% |
| First release time | 2.31 s | 2.10 s | 1.29–1.81 s |

**Box LB lateral movement toward the play is zero for the first full second in every concept** (`lbtempo`):
- IZ: NFL 0.20 / 1.05 yd/s at 0.5 / 1.0 s.
- Counter: NFL 0.15 / 0.95 yd/s.

**The trapped lineman: what he asks for vs what his body does** (`_trapdl`, command trace, 153 trap plays, p50 upfield yd/s):

| t (s) | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 |
|---|---|---|---|---|---|---|
| Requested | 6.54 | 2.65 | 1.57 | 0.80 | 0.27 | 0.05 |
| Achieved | 1.10 | 1.35 | 1.27 | 1.05 | 0.72 | 0.44 |

- His `PassRusher` controller steers to a nearby point objective and stops there.
- After 0.6 s his body is braking down to the request, not falling short of it.
- So this is a controller issue (Defense), not physics.

## Kicker runs past a squeezing end (`lineunb.py`, `_kickmiss`, `_kickone`; fixed on `run/G2-mesh-emlos` 55ce8ba5)

**Who the unblocked linemen are.** Almost every unblocked lineman who makes the first hit on power is the playside end man (snap lat +5…+6.6). He squeezes flat down the line, 1.5–2 yd upfield of the kicker's flat leg, and the kicker runs past underneath him.

**What the command trace shows** (seed 7 #48):
- At 1.4 s the kicker requests 7.3 yd/s across and achieves 4.4.
- His corner already followed the end he saw. The leg after it still ended at the snap landmark, so a square turn up onto a moving end looked like no turn. The corner speed it allowed was 6–7.8 yd/s.

**Fix.** The corner and the leg after it both use where the end will be when the kicker arrives: the end's seen motion over the kicker's own closing time, capped at 1 s. The corner speed for the real turn drops to about 2.4 yd/s.

**Results** (5 streams, counter + power):

| | before | after | NFL |
|---|---|---|---|
| Counter: kick never lands | 5.9% | 4.1% | |
| Power, 11 personnel: kick never lands | 22 | 17 | |
| Kick spot, yd from the ball | 2.44 | 2.36 | 2.50 |
| Power: unblocked lineman first hitter | 7% | 6% | 3% |
| Power: first contact | +0.46 | +0.52 | +0.47 |
| Counter: first contact | +1.01 | +1.13 | +0.31 |

Test: `test/kick-squeeze-turn.test.ts`. The kicker asks for 4.4 yd/s with the fix and 6.4 without it.

## Blocked backer drifts toward the carrier (`lbfit3.py`, `_lbpair`; parked `patches/W1-climb-wall-drive.patch`)

**Defense's finding, reproduced.** After contact, NFL climbers move a blocked backer *away* from the carrier. Ours move with him toward it. Lateral displacement in the 1 s after contact:

| | Blocker (NFL) | Blocker (sim) | LB (NFL) | LB (sim) |
|---|---|---|---|---|
| IZ | −0.24 | +0.46 | 0.28 | 0.80 |
| OZ | −0.45 | +1.20 | 0.40 | 1.53 |
| Counter | −0.70 | +0.12 | −0.45 | 0.02 |

**Why.** An engaged run blocker stands. The engagement pushes along `e.drive`, which is fixed at contact from the installed plan, and mirrors the defender toward the seal offset. A climber's drive is the installed `up(±ps…)` or straight upfield after a release. It never uses where the runner is.

**W1 (wall drive).** At contact, with the runner acquired, the climber drives upfield and away from the runner on the side the backer is on. A sideways drive also seals the ball-side shoulder.

Climber–LB pairs by drive at contact (`_lbpair`):

| Pair | n | Blocker | LB |
|---|---|---|---|
| IZ, wall drive | 73 | −0.20 | 0.01 |
| IZ, straight-up drive | 24 | +0.23 | 0.56 |
| OZ, wall drive | 78 | +1.00 | 1.53 |
| OZ, straight-up drive | 34 | +0.83 | 0.78 |

The IZ walled pairs now match NFL (−0.24).

On OZ, the controller requests the right direction but the flowing backer carries the pair. That is engagement physics, so it goes to Main Engine.

**Outcomes.** Blocked LB reaches the carrier: IZ 27 → 30%, OZ 25%, unchanged. Three ledger pins move. Parked until Main Engine's engaged-lateral work lands.

**W2** (`patches/W2-climb-wall-nomirror.patch`) is W1 plus an engagement `wall` flag. A walled climber's feet stop mirroring the man's step toward the ball, judged in field terms. The engagement's lateral axis is perpendicular to the drive, so the wall's away part sits in "forward".

**Results:**

| Walled pairs | Blocker | LB |
|---|---|---|
| OZ, W1 | +1.00 | 1.53 |
| OZ, W2 | +0.74 | 1.40 |
| IZ | −0.22 | 0.02 |

- First contact is unchanged on every concept.
- Coverage is small. Of 123 climber wall attempts (2 seeds of OZ), only 25 start an engagement with the wall drive; the rest join or meet an existing engagement. About 80 walled pairs vs about 580 "blocked" box LBs by the proximity operator.

**Parked.** The OZ blocked-backer drift is mostly not climber walls.

**OZ blocked-backer cohort by blocker** (`_lbcohort`, develop + branch, stream 0; first offensive body within 1.2 yd of a box LB after the handoff; "ENG" = engaged with that blocker within 0.3 s). Lateral toward the carrier over 1 s:

| Cohort | n | Blocker | LB |
|---|---|---|---|
| ENG, C climbing | 56 | +1.73 | +1.97 |
| ENG, G climbing | 38 | +0.49 | +0.53 |
| ENG, T climbing | 22 | +0.06 | +0.38 |
| Passing contacts, not engaged | ~120 | | |

Passing contacts are mostly a climber or reach blocker brushing a man who is not his (C 29, G 12, reach 37).

**The drift is the centre's engaged pair** on the flowing Mike.

**No-mirror experiment** (climber `dLat` = 0): C pair +1.30 / +1.64, G +0.21, T −0.13. The mirror is a minor part.

The rest is one or more of:
- the installed zone climb drive `up(ps*.4)`, toward the play;
- arrival momentum;
- the backer's own engaged request.

Not changed.
