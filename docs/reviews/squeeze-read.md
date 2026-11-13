# DL_SQUEEZE reads the play from a seen carrier's lateral track

2026-10-28, Defense. Built on #347 (engaged-flow law). This follows Main
Engine's engaged zone flow question (#353): in engaged zone reps, the DL's
lateral p50 is 0.55–0.70 yd/s against NFL 2.00.

## What decided the DL's request

I instrumented the defender half of `stepRunRep` on #353 + #347: run-only
seed 7, zone runs, 0.8–1.2 s, 4,427 engaged ticks. "Toward the play" means
toward where the back ends up.

| Branch that set the request | Share | Request toward the play | Achieved toward the play |
| --- | --- | --- | --- |
| His own law (#347) | 57% | +2.31 yd/s | 1.17 |
| DL_SQUEEZE override | 30% | **−2.67** | 0.13 |
| Containment clamp | 13% | +1.46 | 0.44 |

The squeeze took the play's direction from the back: his lateral velocity
if above 1 yd/s, else his position relative to the DL. A blocker moving
against that direction counted as a down block, and the DL squeezed at full
lateral speed.

On zone, 58% of squeezes pointed against where the back ended up (87% at
0.5 s), while the blockers' seen flow ran with the play. Before and around
the mesh, the back's early path, or just where he stood, was read as the
play's direction, so zone reaches became "down blocks".

## The change (on, no flag)

- **Blocker's first step:** the direction of the first clear lateral flow
  the DL sees from his blocker (over 0.5 yd/s), held for the contact.
  - With the play: a reach.
  - Against it: a down block or a wash.
- **Play direction:** the lateral track of a back the DL has seen take the
  ball, at more than 1 yd/s.
  - No position fallback, and no read of the back before he has the ball.
  - Until then the DL makes no squeeze decision, and his ordinary request
    stands.
- **What still squeezes:** a down block or wash on a seen run track, at full
  effort. Nothing is banned or capped.

`test/dl-squeeze.test.ts` adds four cases. Each fails on the old read and
passes on the new one:

- A still back standing to the play side causes no squeeze.
- A reach first step stays a reach when the pair later moves against the
  play.

## Football review: why this read, and what it costs

A squeeze answers a down block, where a blocker comes from the side and
away from the hole. Two reads are needed:

- **What block is this?** The blocker's approach and first step.
- **Is it a down block or a zone cut-off?** A backside zone cut-off looks
  identical: same man beside him, same step toward him. Only the play's
  direction separates them.

Real DL get the play's direction from the line: in zone the whole line steps
one way; on gap plays the line blocks down and a guard pulls. The back is the
cue they trust least, because his early path is built to deceive (counter
steps away first; zone sets up the cutback).

A back-only read can be right for one family only. Two versions were
measured on the same snaps and dice:

| Same snaps and dice, k = 4 | #347 | This read (lateral track) | Alternative (path's crossing point at the DL's depth) |
| --- | --- | --- | --- |
| Zone squeezes toward the designed play side | 25% | 52% | 26% |
| Gap squeezes toward the designed play side | 70% | 81% | 69% |
| Zone squeezes per play | 1.76 | 0.72 | 1.61 |

- **The crossing point** answers "which side of me is the ball attacking".
  That's a gap read. In zone it fights the reach: inside zone aims inside
  the play-side DL. NFL zone DL almost never work against the flow (3–6%).
- **Classifying the block alone** (a blocker lined up beside the DL, first
  step toward him) was measured before building and rejected.
  - 43% of zone blocks look like that, including 43% of zone cut-offs.
  - It misses 41% of gap down blocks.
  - Among actual squeezes it doesn't separate right from wrong (zone 28% vs
    29% with the run).
- Both back reads move bodies alike (within 0.05 yd/s on every row below).
  This one is simpler and right for zone, where NFL DL don't squeeze.

## Evidence

**Engaged flow** (`trench_flow.py`, run-only seeds 7 and 9, 2 games each,
within 1.3 yd of an opponent, 0.8–1.2 s, lateral p50):

| | NFL | #353 + #347 | + this change | Squeeze off (diagnostic) |
| --- | --- | --- | --- | --- |
| DL zone | 2.00 | 0.90 | 1.20 | 1.25 |
| OL zone | 2.30 | 0.95 | 1.30 | 1.35 |
| DL gap | 0.75 | 0.60 | 0.85 | 0.80 |

**DL lateral speed toward the play by scheme** ([`dl_scheme.py`](../../scripts/diag/dl_scheme.py)). NFL BDB weeks 1–2 vs the
matched restage; play side = the carrier's side at 1.5 s. Cells read
0.3–1.0 s / 1.0–2.0 s.

| | NFL | #347 | This change |
| --- | --- | --- | --- |
| Zone, play-side DL | +1.00 / +2.08 | −0.15 / +0.69 | +0.09 / +1.20 |
| Zone, backside DL | +1.70 / +2.96 | +0.67 / +1.38 | +0.62 / +1.17 |
| Gap, play-side DL | −0.67 / −0.32 | −0.60 / −0.66 | −0.55 / −0.48 |
| Gap, backside DL | +0.82 / +1.13 | +0.43 / +0.44 | **+0.26 / +0.10** |

**Matched restage.** Run-only captures r7 and r11, k = 4 RNG shifts, 900
runs. #347's merged head vs this change.

| | #347 | This change |
| --- | --- | --- |
| Yards per run | 5.31 | 5.56 (+0.25 ± 0.65) |
| ≤ 0 yd / 10+ yd | 24.3% / 13.6% | 22.4% / 14.3% |
| Zone runs: yards, ≤ 0, 10+ | 6.10, 14.2%, 16.1% | 6.30, 13.0%, 16.7% |
| Gap runs: yards, ≤ 0, 10+ | 3.39, 37.1%, 8.8% | **4.07, 33.8%, 10.3%** |
| Plays with a squeeze: zone / gap | 77% / 98% | 51% / 84% |
| Missed + broken tackles per play | 0.393 | 0.413 (+0.020 ± 0.030) |
| … missed while engaged / free / dive | 0.164 / 0.053 / 0.034 | 0.188 / 0.053 / 0.040 |
| … broken | 0.141 | 0.132 |

**Gap-scheme down blocks still squeeze.** 84% of gap plays have a squeeze,
and the squeezes go toward the designed play side more often than before
(81% vs 70%). Of the gap squeezes the change removes, 55% pointed toward the
designed side, so it also loses some right ones (counter, duo, trap).

## Cost: gap backside DL stop chasing (KNOWN_PROBLEMS RUN-17)

- On gap runs the backside DL's movement toward the play from 1.0 to 2.0 s
  falls from +0.44 to +0.10 yd/s (NFL +1.13).
- Gap runs gain about 0.7 yd per carry.
- A gap back runs downhill, so the read waits for a lateral track that rarely
  comes. A backside DL facing a gap-scheme cut-off holds. The old misread
  happened to send him toward the play.
- The fix is what real DL key on gap schemes, the line's flow and the
  pulling guard. That read follows as its own PR.

## Missed tackles (KNOWN_PROBLEMS TKL-6)

The rise is all in tries made while engaged with a blocker (+0.023 ± 0.019);
free misses are flat and broken tackles fall slightly. It's the same cause as
#347's: `attempt()` adds a flat +0.3 to an engaged tackler's miss chance.
TKL-6 asks the tackle owner for a miss chance from his reach, balance and the
blocker's hold.

## Seal-hold: the end's widening (KNOWN_PROBLEMS RUN-18, resolved by #377)

With the squeeze read alone, the strong end on seal-hold travelled 2.0–2.7 yd
outward under a loaded seal. An independent trace found the cause, a defect
in #347's law, not "his own fit". The end was already wider than his
containment bound, and the engaged-flow law still added his held outward
flow, so he didn't stop as its comment says. The old squeeze misread had
hidden this by asking him inward.

#377 fixed it first, as its own change
([contain-flow](contain-flow.md)): while the bound applies, an outward held
flow is dropped. On this branch, merged onto it, seal-hold keeps its original
bar. The end travels 0.66 yd outward with 32 loaded steps and 0 pinned
(SEAL_HOLD off: 2.29 yd and 48 pinned, failing both checks).

## Limits

- Engaged zone flow is still about 60% of NFL's. The rest of the gap:
  - the containment clamp (13% of zone ticks);
  - free DL taking a pass-rush get-off on run snaps (Run Game's
    outside-zone measure).
- The first step is the DL's first picture of the blocker moving faster than
  0.5 yd/s after contact begins, not a measured footstep.
- Sim: seeds 7, 9 and 11, run-only, two generated teams. NFL: weeks 1–2.
