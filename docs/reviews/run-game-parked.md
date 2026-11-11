# Run Game lane: parked queue (2026-11-11)

Run Game, branch `run/G3-oz-backfield`. The run game was parked on 2026-11-10: run yards match the NFL (4.51 against 4.48 a carry), and the priority moved to tackling, coverage/YAC and the passing game. The lane then took three pass-game items (free rushers, the post-catch carrier, screens). The whole lane was parked on 2026-11-11.

This page holds the open questions and the evidence so far, so the work can resume where it stopped. The operators are in `scripts/diag/run-operators/zone-backside/`.

How the measurements were made:
- **Same code on both sides.** The NFL side is 2022 tracking (`out/mechanics/nfl-plays.jsonl.gz`). The sim side is a dump from `scripts/diag/run-operators/dump-zone.mts`, 570 matched zone runs.
- **Timing.** The NFL clock starts at the `ball_snap` tag, unshifted.
- **Base.** Sim figures are on develop f122c83c (run-ref-14) unless marked otherwise.

## Finished: BACKSIDE_SWAP + KEEPER_HIP (PR #511, on in run-ref-16)

PR #511 merged both flags. The run-ref-15 read was all +0.01 (SE 0.06) and OZ +0.04 (SE 0.21), and both are on by default from run-ref-16.

**The uncovered backside tackle.** This is the backside tackle with no front defender within 1 yd across of him, facing an end 2–3.5 yd outside him. Outside zone:

| | NFL | Off | On |
|---|---|---|---|
| Within 1.0 yd of the guard's man by 1.2 s | 22% | 3% | 19% |
| Within 1.0 yd by 1.5 s | 33% | 7% | 26% |
| First touch: the inside man | 35% | 15% | 30% |
| First touch: nobody | 30% | 76% | 60% |
| Backside backer touched by anyone | 46% | 21% | 16% |

The last row is the recorded known cost. The swap gives the backside backer to the backside guard, who now climbs out of a double later. The double-formation item below is the fix at its source.

**His speed is the body's, not a limit.** On `flatbench.mts` a free OT turned to his travel reaches 1.84 / 2.58 / 3.23 / 3.78 yd/s at 0.4 / 0.6 / 0.8 / 1.0 s from rest. The keeper runs 2.12 / 2.67 / 2.93 yd/s at 0.6 / 0.9 / 1.2 s after the snap, which is on that curve until he engages.

## Open 1: zone doubles that never form (outside zone)

A double counts as formed when two adjacent OL are each within 1.0 yd of the same front defender in one frame, by 1.0 s (`dblrel.py`).

| Doubles formed per run | NFL | Ours |
|---|---|---|
| IZ play side | 0.39 | 0.43 |
| IZ backside | 0.21 | 0.17 |
| OZ play side | 0.31 | 0.13 |
| OZ backside | 0.12 | 0.013 (0.035 with KEEPER_HIP) |

**Release timing matches.** p50 time to release:

| | NFL | Ours |
|---|---|---|
| IZ play side | 1.8 s | 1.6 s |
| IZ backside | 1.9 s | 1.9 s |
| OZ play side | 1.5 s | 1.7 s |

So the release read is not the problem. On OZ the members of an installed double race beside the man instead of putting hands on him. That's the same disease KEEPER_HIP fixed for the backside keeper.

**Next question:** of the installed OZ doubles (plan after the first tick), how many physically form, and which member fails to arrive? Measure owner and helper separately, with distance to the man at 0.6 / 0.9 s.

## Open 2: the IZ backside tackle and backside climb

Uncovered backside tackle on IZ, current head, flags off, n 98. First touch by 2.0 s, split by installed job (`btunc2.mts`):

| Job | n | Nobody | Inside DL | Backer |
|---|---|---|---|---|
| Solo cutoff on an end more than 1.5 yd outside | 47 | 23 | 13 | 11 |
| Double's climber (helper) | 16 | 13 | 1 | 1 |
| Double's keeper | 18 | 10 | 5 | 3 |
| Other solo | 17 | 6 | 8 | 2 |

The IZ double keeper's approach is fine (`btdouble.mts`, IZ only): 1.64 / 1.16 / 1.02 yd from the man at 0.6 / 0.9 / 1.2 s.

**The backside backer** (`btbsb.py`):

| | NFL | Ours |
|---|---|---|
| Tackle touches him | 36%, at p50 1.1 s | 18%, at 1.7 s |
| Anyone touches him | 58% | 31% |
| Snap distance | 4.82 yd | 5.50 yd |
| His flow by 1.2 s | +1.32 | +0.65 |

After release, the backside climber reaches a backer 15% of the time (NFL 32%). The backer isn't outrunning the climb. Two parts:
- the deeper or wider backside backer, which is Defense's alignment;
- the climb itself.

BACKSIDE_SWAP is stretch-only because on IZ the swap alone cost −0.21 yd (SE 0.08) without moving touches.

## Open 3: falls (from Flex's remaining-falls table, `docs/reviews/effective-mass.md`)

- **149 blocker lean-release falls, mostly C/G.** The run-block request drives into the man at about 1.25× the load (−1.74 yd/s), so when the load sags he drops. This is a technique/request question: lean no more than the load, the run-block analogue of PASS_ANCHOR.
- **165 blocker impact falls, mostly TEs (Y 73, H 36), at about 3.3 g.** Coherent physics per the impact bench, so it's a question of how the TE arrives at his block.

Diagnose each before building.

## Defense items sent (alignment, not ours)

- **The most common NFL front for an uncovered backside tackle doesn't exist in our fronts.** That's a stand-up edge off the ball with a backer over the tackle (IZ n 154, OZ n 110 of the NFL cohort).
- **Second-level men within 1.5 yd across the uncovered backside tackle are deeper:** depth p25 / p50 NFL 2.1 / 3.8, ours 3.6 / 4.3.

## Run-game flags still off on develop

- **Kept:** OL_ON_COUNT and REACH_HANDS (joint re-gate with DL_SNAP_TIME) and CARRIER_BRACE.
- **Removed in the develop prune (f52e3a0d):** BLOCK_RELEASE, ZONE_PAIR, STRETCH_TRACK, GUN_STRETCH_T, MESH_NFL.

## Pass game 1: the post-catch carrier (CATCH_EYES, off, promotion candidate)

**The question.** In the 0.5 s after the catch, our catcher changed heading 22° / 37° (p50 / p75) against the NFL's 14° / 25°. The first tackler at hands range ran on (never reached contact) on 26% of catches against the NFL's 10%. These are Flex's `scripts/diag/pass-operators/after-catch.py` and `scripts/diag/run-operators/grabs.py`, same code on both sides.

### What `carrier.ts` knew and did from the catch tick

`scripts/diag/pass-operators/catchturn.mts`, 8 games:
- `onBallCaught` (`src/sim/assign.ts`) replaces the receiver's behaviour with a fresh `BallCarrier`.
- Its `heading` is null and `nextEval` is 0, so its first lane read (`evaluate`) runs on the next tick.
- It reads every defender through `sim.see` with only the normal reaction delay. GAZE is off, and nothing marks a catcher's eyes as being on the ball, so he reads the whole field the instant he has it.
- On the catch tick his request still follows the route: 0.4° off his travel at p50.
- At +0.1 s it is 46° / 93° (p50 / p75) off his travel. He cuts as a fully informed runner while still catching.

### The arm: `CATCH_EYES` (off)

`src/sim/behaviors/carrier.ts`, with `catchAt` passed from `onBallCaught`.

For one reaction time after the catch, he carries the line he caught it on. The reaction time comes from the recognition rating and runs 0.14–0.42 s. If he caught it below 1.5 yd/s, he turns upfield instead. His first lane read comes after that, from his own picture. Nothing caps a cut or awards an outcome.

Read on 8 games each (`sim-export --seed 101 --games 8`, IRN/COM, develop f6fe9bf7):

| | NFL | Off | On |
|---|---|---|---|
| Heading change in 0.5 s, p50 / p75 | 14 / 25° | 22 / 37 | 13 / 20 |
| Same, contested (defender < 3 yd) | 12 / 24 | 18 / 30 | 12 / 19 |
| Speed at +0.5 s | 4.65 | 4.42 | 4.74 |
| Upfield speed at +0.5 s | 2.30 | 2.05 | 1.65 |
| First man at hands range on a catch: runs on / contact | 10 / 89% | 26 / 69% | 20 / 74% |
| Catch → first contact (1.0 yd), p50 | 0.6 s | 0.9 s | 0.9 s |
| Catcher's x gain catch → end, p50 / mean | 3.2 / 5.0 | 5.8 / 9.8 | 5.1 / 8.9 |

The last two rows come from `scripts/diag/pass-operators/catchcontact.py`. Run rows in `grabs.py` are unchanged.

### Split by direction of travel at the catch (`scripts/diag/pass-operators/catchdir.py`)

Same records; the second sim pair is develop 3a4980bf, after the fix below. Upfield speed at the catch → +0.5 s, heading change in 0.5 s p50 / p75:

| Travel at the catch | NFL | Off | On (after fix) |
|---|---|---|---|
| Upfield, in stride (NFL 19%, ours 26%) | +3.20 → +3.85, 12 / 24° | +3.95 → +4.45, 13 / 23 | +3.85 → +4.32, 10 / 17 |
| Across: crossers, outs (NFL 71%, ours 51%) | +1.25 → +2.10, 13 / 22 | −0.10 → +1.67, 25 / 32 | −0.20 → +1.00, 13 / 21 |
| Back to the ball / standing (NFL 10%, ours 22%) | −0.15 → +0.25, 37 / 79 | −1.85 → −0.22, 51 / 78 | −1.80 → +0.60, 63 / 110 |

Findings:
- **Route geometry, not the flag.** Our crossers arrive flat (−0.1 against +1.25 upfield at the catch), and twice as many of our catches are back to the ball. That's Coverage's route-depth item.
- **A defect, fixed.** The first build carried a line coming back toward the passer for the whole window: −2.10 → −1.93 at +0.5 s. Now a catcher coming back to the ball plants and turns upfield. He turns a little harder than the NFL (63 / 110 against 37 / 79).
- **The window by what he sees.** Every catcher gets the same window, one reaction time. In-stride upfield catchers turn 10 / 17° against the NFL's 12 / 24°, slightly under. That's consistent with a window a little long for a man who catches facing the defence. The refinement would scale the window by how far his body faces away from upfield at the catch. It's small, and not built.

After the fix, all catches, develop 3a4980bf: heading 23 / 37 → 15 / 30° (NFL 14 / 25). First man at hands range runs on 25 → 19%. Catch → first contact p50 0.9 → 0.8 s. Catcher x gain p50 / mean 5.6 / 9.2 → 4.1 / 7.7.

### Open

- **Upfield speed at +0.5 s on crossers moves away from the NFL.** Crossers keep their line for the window. Is that route geometry at the catch, or does the NFL catcher already bend upfield? Next: split by the route's direction at the catch.
- **The body side isn't modelled:** securing the ball and turning from the catch posture. That may hold the rest of the runs-on gap (20% against 10%).
- **Catch → first contact is unchanged** (0.9 s against 0.6 s). That gap is where the nearest defender is at the catch, not the carrier.
- **Coverage's panel run hasn't been read yet** (catch → first contact and YAC by stage).

## Pass game 2: free rushers

The full write-up is `docs/reviews/pass-pro-free-rushers.md`, with operators in `scripts/diag/pass-operators/`:
- `freerush.py` and `rushcount.py`, which run on both NFL and sim data;
- truth traces `freepass.mts`, `blitzpick.mts`, `blitzseen.mts`, `fakeblitz.mts`.

In short:
- **Total free:** free first pressure is 13.7 per 100 dropbacks against the NFL's 10.2.
- **The pool is DL who beat the block.** 50 of 57 free DL were engaged first. Edge DL come free 4.7 per 100 against the NFL's 1.8. Next: is the tackle beaten on depth or over-set? Coverage found the tackles kick 1.4 yd too deep by request.
- **Inside backer blitzes come free 4.3 per 100 against 1.1.** Blitzers stand walked up 2.4 yd off the ball, and the line's picture of them lags about 0.35 s, so they're recognised only near the line (C first assigned at 0.75 s).
- **BLITZ_READ, two attempts, not a candidate.** The patch is `docs/reviews/patches/blitz-read.patch`. Free inside backers fell 4.3 → 3.2, but the total held at 13.6.
- **Even numbers.** At even rushers and protectors our free first pressure is 25.7% against the NFL's 12.7%, and 19 of 33 free blitzes had no back in. That's the hot read and the protection call, handed to Coverage and Rules + Coaching.
- **A question, not a task:** is the protection's perception delay too long for a man the line is staring at before the snap?

## Pass game 3, the next real build: screens, flats and angles

From Coverage's route table (NFL BDB 2025 wk 1–3 against the sim's 732 panel on f52e3a0d), share of NFL targets:
- FLAT 12.7% (at −0.9 yd);
- SCREEN 7.7% (−2.4 yd, released at 1.7 s);
- ANGLE 4.4% (1.3 yd).

Ours: flat + swing 3.6%, no screens and no angle route. Our throws behind the line are 4.4% of targets against the NFL's 17.6%. When we do throw them, the nearest defender is 1.71 yd away at arrival against 5.24, so there's no blocking in front.

The build:
- the screen play itself: linemen releasing, the delay, the back or receiver setting up behind them;
- the back's flat, swing and angle releases and timing (ours release at 2.8 s, NFL flat 2.3 s).

Rules + Coaching owns how often it's called, and Coverage owns the QB choosing it.
