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
| Counter BS-OL leverage | −0.40 | +0.25 | run game |
| Counter BS-OL contact | 2.0 s | 1.1 s | run game |
| Counter BS-OL blocks nobody | 14% | 6% | run game |
| Engaged defender displacement in 0.5 s (dDx) | ~0 | −0.1 to −0.35 | physics (Main Engine) |
| Interior OL approach angle | 16–27° | 42–72° | run game |
| Interior OL speed at contact | 1.6–2.5 | 0.7–1.2 | run game |
| Kicker's first block is a line man | 98% | 63–78% | Power Base partly; else assignment |
| Wrap first block | 2.0 s | 1.6 s | run game |
| Wrap blocks a backer | 5% | 24% | likely the counter back's track |
| BS-TE / back first contact | 0.7 s | 1.9 s | run game |

Notes:
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
3. **Interior OL technique.** Approach angle and speed (C, BS-OL), counter backside cutoff leverage and timing. This is the technique layer of the run-call design (`PULLERS.md`).
4. **Kicker blocks nobody (turn-ups).** End depth is with Defense; re-measure once item 2 lands.
5. **Draw shed**, with Defense (section 4).
6. **Pin-and-pull is not installed.** It's a new call candidate once 1 and 3 are sound.
7. **Static engagements** (dDx): physics, Main Engine.
