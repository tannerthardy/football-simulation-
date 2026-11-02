# Gap schemes and pullers: diagnosis and plan (2026-11-02)

Base: `run/G2-puller-path` (#390 head 911d170d/after). 2022 NFL is scored with the same operator. Tools are in `tools/py/`.

## 1. Where the run game actually stands (`firsthit.py`)

First defender within 1.0 yd of the carrier; arm G0, all concepts, stream 0, 12 seeds.

Carrier depth at first contact:

| Concept | sim | NFL |
|---|---|---|
| Counter | +1.56 | +0.31 |
| Trap | +1.51 | +0.43 |
| Power | +0.48 | +0.47 |
| IZ | +0.59 | +0.52 |
| OZ | +0.21 | +0.04 |
| Draw | **−1.76** (56% behind LOS) | +1.25 (34%) |

**Gap runs are not the weak point.** The two consistent gaps:

1. **Unblocked box backers make first contact about 2× NFL** in every scheme. "Shed" backers (beat a block) are rarer than NFL.

   | Scheme | Unblocked, sim | Unblocked, NFL | Shed, sim | Shed, NFL |
   |---|---|---|---|---|
   | IZ | 18% | 8% | 10% | 23% |
   | Power | 16% | 9% | 21% | 24% |
   | Counter | 14% | 9% | 21% | 24% |
   | Trap | 13% | 6% | 15% | 27% |

2. **Draw: DL shed onto the back behind the LOS** (line shed 56% vs 38%).

## 2. Unblocked backers: whose were they?

LB first hitters never blocked; arm DRW (G0 pattern).
- **Owner is the combo climber in most cases.** He is released and still aimed at the backer, but too far away (power: 9 of 22 at ≥ 2 yd).
- **The climb decision is not late.** Power doubles: 574 of 665 call `block_climb` at p50 1.30 s.
- **The climber's trip is slow** (`climbtrip.py`): 1.2–1.3 s to get 1.5 yd off the DL; speed 0.3 s after release 1.6 yd/s.
- **Doubles climb by 2.5 s** (`doublerelg.py`, position operator):

  | | sim | NFL |
  |---|---|---|
  | Power | 27% | 39% |
  | Counter | 17% | 23% |
  | OZ | 26% | 52% |
  | IZ | 38% | 31% |

- **Film, seed 7 #35 LT (power):** he requests 3–4.8 yd/s at +30–42°, but achieves 1.2–2.0 yd/s while bending the down-block lateral momentum (−50°) onto the climb for about 0.5 s.
- **Physics / body capacity → Main Engine #164.** The second reproducer was sent 2026-11-02.

## 3. Gap-blocker scorecard (`gapcard.py`)

Per role, first sustained contact (1.2 yd × 3 frames before cross + 0.6 s). LB1 counter/power, DRW trap. Main gaps (sim vs NFL):

| Gap | sim | NFL | Owner |
|---|---|---|---|
| Kick puller blocks nobody | 10–13% | 2–3% | run game |
| Engaged defender displacement in 0.5 s (dDx) | ~0 | −0.1 to −0.35 | physics (Main Engine) |
| Interior OL approach angle | 16–27° | 42–72° | run game |
| Interior OL speed at contact | 1.6–2.5 | 0.7–1.2 | run game |
| Kicker's first block is a line man | 98% | 63–78% | Power Base partly; else assignment |
| Wrap first block | 2.0 s | 1.6 s | run game |
| Wrap blocks a backer | 5% | 24% | likely the counter back's track |
| BS-TE / back first contact | 0.7 s | 1.9 s | run game |

Notes:
- **Counter BS-OL rows dropped: an artefact.** Sim counter always pulls BSG + BST (112/112 snaps), so its 'BS-OL' (n = 86) are pulling tackles the rule-puller operator missed. NFL counter mixes GT and GH (tackle stays home), so the rows are not comparable.
- **Kicker blocks nobody:** most cases are turn-ups ("kick man behind the runner", counter 40 of 76). The end has gone deeper than the runner's track: end depth (Defense) plus the counter back cutting inside.
- **Static engagements:** NFL engaged defenders keep moving, penetrating and sliding; ours freeze.
- **Interior approach:** NFL interior linemen step laterally and let the man come; ours run straight in fast.
- **BS-TE / back contact time:** NFL backside TEs and backs arc, sift or lead through before contact.

## 4. Draw: one attempt, rejected

- `drawdl.py`: interior DL and OL match NFL to 1.5 s. At 2.0 s the DL are 1.77 deep (NFL 1.37) and the OL 1.35 deep (NFL 1.52).
  - In NFL the OL stay between rusher and back; ours let the DL by.
  - 35 of 40 behind-LOS line hitters shed from a draw blocker at p50 2.2 s, after the 1.3 s handoff.
- Attempt: ride the engaged rusher upfield and away from the runner's lane (`patches/draw-ride-rejected.patch`).
  - It made draw worse: contact −2.44, 69% behind LOS.
  - Riding the rusher deeper takes him to the mesh, where the draw back is.
- Next: diagnose the shed decision itself (defense contact logic, jointly with Defense) and the sim's early handoff (1.30 vs 1.50 s). No further controller attempt without that.

## 5. Plan (ranked by frequency × consequence)

1. **Second-level access.** The climber stall is physics (Main Engine #164). On our side:
   - the climb path after the DL's momentum: aim leaving off his hip, lead the backer;
   - OZ doubles climb half as often as NFL.
2. **Counter carrier track.** Pending Tanner's decision (aim B, the lane race after the kick lands). It should move backers outside to the wrap (wrap backer 5% vs 24%).
3. **Interior OL technique.** Approach angle and speed (C, BS-OL). Consequence not yet shown: sim leak rates are at or below NFL. This is the technique layer of the run-call design (`PULLERS.md`).
4. **Kicker blocks nobody (turn-ups).** End depth is with Defense; re-measure once item 2 lands.
5. **Draw shed**, with Defense (section 4).
6. **Pin-and-pull is not installed.** It's a new call candidate once 1 and 3 are sound.
7. **Static engagements** (dDx): physics, Main Engine.

## Climber stall decomposition (#164 with Main Engine, 2026-11-02)

`tools/ts/climbbatch.mts <worktree> [schemes]`: native captured snaps, saved stream, 12 seeds, #390 code. Covers every `block_climb` release, over the first 0.6 s.

| | power (136) | counter (113) | trap (85) | IZ (273) |
|---|---|---|---|---|
| Requested speed | 4.8 | 4.8 | 4.9 | 5.1 |
| Achieved speed | 1.65 | 1.59 | 1.36 | 2.15 |
| Request turn from pre-release motion | 62° | 58° | 75° | 56° |
| Pre-release speed | 1.50 | 1.55 | 1.71 | 1.95 |
| Hands joint / engagement with the released DL at 0.2 s | 0% | 0–1% | 0% | 0% |
| Body contact with that DL at 0.2 s | 57% | 62% | 55% | 40% |
| Distance to DL, release → 0.3 s | 0.74 → 0.68 | 0.73 → 0.68 | 0.73 → 0.68 | 0.89 → 0.91 |
| 1.5 yd off the DL within 0.6 s | 20% | 15% | 19% | 41% |

- The released DL moves away from the climber at about 0.6 yd/s, yet the gap shrinks: the climber drifts with him.
- About a third of requests point into the DL (cos > 0.2): power 40%, counter 34%, trap 20%.
- Those climbers do **not** do worse than the ones whose request points around him: around/away achieves 1.35–1.48 with contact 54–69%, into-DL 1.67–2.00 with contact 38–59%.

**Reading.** The request is not the limiter. With no hands joint and no engagement, a body in contact with the released DL achieves about 30% of a 5 yd/s request in any direction for about 0.3–0.5 s. That is contact or traction physics → Main Engine #164.

On my side: re-run the acceptance measures (`doublerelg.py`, `climbtrip.py`, `firsthit.py`) on their candidate.

## #164 follow-up with Main Engine (2026-11-02)

- **Main Engine's diagnosis** (`evidence/climb-164` 4f6703b8): no physics limit. The causes are the climb request flipping and contact friction sliding on the released DL.
- **Hip-side hold**: `run/G2-climb-hip` c8588cf5 (off develop).
  - Hip-flip releases 9% → 5% (power 26% → 13%).
  - Power climbs by 2.5 s: 27% → 30%.
  - Test: `climb-hip-side`.
- **Two technique attempts, both rejected:**

  | Attempt | Contact group, +0.3 s speed | Contact ticks | Result |
  |---|---|---|---|
  | Baseline (hip fix only) | 1.65 | 0.88 | — |
  | A: push-off impulse at release | 1.72 | 0.88 | no gain |
  | B: step-off (35% away from the DL) | 1.66 | 0.75 | no gain |

  Main Engine's zero-friction reference reaches 2.26.
- **Pressed vs clear** (`doublerelg.py` PRESSED section): no pressed penalty in NFL. Sim climbers are pressed on the DL 2–3× as often in the last 0.3 s of the double:

  | | sim | NFL |
  |---|---|---|
  | IZ | 32% | 10% |
  | OZ | 24% | 12% |
  | Power | 38% | 16% |

  That's a double-spacing / technique item for us.
- **Next:**
  1. Stretch-zone job churn: crossing exchange then reread; a release to a snap backer who has flowed away.
  2. Double spacing.

## Draw: the carrier, not the shed (2026-11-02)

`tools/py/drawshed.py` (positions only, same operator on both sides; sim = develop + hip fix, D0/H1).
- The shed matches NFL: leave → hit 0.1 s on both sides, and the carrier is 1.25 yd from the DL at leave on both sides.
- Carrier depth at leave: sim −3.36 vs NFL −1.84. At the hit: −3.00 vs −0.80.

`tools/py/drawback.py`, carrier depth by time:

| | NFL | sim |
|---|---|---|
| At the snap | −5.05 | −5.50 |
| At 1.0 s | 1.45 yd/s, +0.6 upfield | 3.2 yd/s lateral, +0.1 upfield |
| At 1.5 s | −4.52 | −5.27 |
| Upfield speed after the handoff | about 4.0 | 3.4 |
| At 3.0 s | +0.78 | −0.91 |

Next on our side: draw mesh path (#69) and post-handoff tempo. Defense informed.
