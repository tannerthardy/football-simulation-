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

**`dbl-C6-intercept-cost`** (release proposals costed to the backer's intercept point): neutral. Not kept.
