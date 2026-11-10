# Run game: parked queue (2026-11-10)

Run Game, branch `run/G3-oz-backfield`. The run game was parked on 2026-11-10: run yards match the NFL (4.51 against 4.48 a carry), and the priority moved to tackling, coverage/YAC and the passing game.

This page holds the open questions and the evidence so far, so the work can resume where it stopped. The operators are in `scripts/diag/run-operators/zone-backside/`.

How the measurements were made:
- **Same code on both sides.** The NFL side is 2022 tracking (`out/mechanics/nfl-plays.jsonl.gz`). The sim side is a dump from `scripts/diag/run-operators/dump-zone.mts`, 570 matched zone runs.
- **Timing.** The NFL clock starts at the `ball_snap` tag, unshifted.
- **Base.** Sim figures are on develop f122c83c (run-ref-14) unless marked otherwise.

## Finished: BACKSIDE_SWAP + KEEPER_HIP (PR #511)

PR #511 holds both flags (off). It goes into the run-ref-15 read as a promotion candidate.

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

- **Keep:** OL_ON_COUNT and REACH_HANDS. Joint re-gate with DL_SNAP_TIME on run-ref-15.
- **Proposed for removal:** BLOCK_RELEASE, ZONE_PAIR, STRETCH_TRACK, GUN_STRETCH_T, MESH_NFL.
- **Ask Flex first:** CARRIER_BRACE.
