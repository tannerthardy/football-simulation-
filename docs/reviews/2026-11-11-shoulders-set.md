# SHOULDERS_SET: the body is not the eyes (2026-11-11)

Flag: `SHOULDERS_SET`, off. Code in `src/sim/behaviors/qb.ts`: `bodyFacing`, `turnTime`, `motionFacing` and
`startThrow`. With the flag off the engine is bit-identical (same export hash, seed 999).

## Model

- **Before the throw.** After the drop, his front shoulder sets to his first read. His eyes move through the
  progression, but his feet go to a read only once his eyes have held it for `SHOULDER_SETTLE` (0.3 s). That value
  is a reaction time; it is not fitted. A look-off (0.25–0.35 s) therefore does not turn his body.
- **The throw.** The throw requests the turn. It takes `0.12 s + angle / 190 deg/s`, ends at the release, and the
  motion lasts at least that long. The constants are estimated from the NFL turn into the throw by angle
  (qb-release.py), not from yards.
- **Release-time estimate.** His estimate of when the ball comes out (`evaluate`) includes the turn to that man.
- **Arm load.** The load stays that of the base motion: time spent turning does not add load.
- **Gaze.** `sim.qbEyes` stays gaze only.

## Bench first

`scripts/diag/effective-mass/qb-turn-bench.mts` (the World alone):
- A set QB's body yaws 30° in 0.15 s, 90° in 0.28 s and 180° in 0.48 s.
- NFL throwing turns take 0.3 s for 15–45°, 0.5 s for 45–90° and 0.7 s for 90–180°.

So the time of a throwing turn is the step and hip turn, not the body's free yaw. It is modelled in the motion,
and the World's yaw capacity is left untouched.

Two defects were found on the bench before the gate read:
1. The turn finished early and then the shoulders held still.
2. Spreading the turn over the whole motion was slower than any NFL turn.

Now the turn occupies the motion's last `turnT` seconds, as in the NFL, where the shoulders close on the target up
to the release.

## Gates

Sources:
- Turn mix and timing: `throw-turn.mts`, seed 201, 8 games, set throws.
- Everything else: sim-export, seeds 201 and 301, 16 games each.

| | NFL | off | on |
|---|---|---|---|
| Turn 0–15° / 15–45° / 45–90° / 90°+ | 51 / 21 / 24 / 4% | 96 / 0 / 1 / 3% | 62 / 22 / 13 / 4% |
| Turn duration p50, 15–45° / 45–90° / 90°+ | 0.3 / 0.5 / 0.7 s | — | 0.3 / 0.5 / 0.8 s |
| Completion by turn, 0–15° / 15–45° / 45–90° / 90°+ | 75 / 71 / 75 / 77% | 60 / – / 50 / 79% | 53 / 52 / 67 / 71% |
| Release p50, rhythm throws (in the drop) | | 2.10 s | 2.10 s |
| Release p50, the read his eyes are on | | 2.80 s | 2.85 s |
| Release p50, another man | | 3.00 s | 3.05 s |
| Time to throw p50 (201 / 301) | | 2.65 / 2.70 s | 2.70 / 2.80 s |
| Completion, all throws (201 / 301) | | 59.3 / 58.9% | 61.6 / 58.5% |
| Sack at contact (201 / 301) | 49% | 33 / 29% | 26 / 33% |
| Hit throws, contact ≤0.2 s before release (201 / 301) | 47% | 89 / 88% | 80 / 78% |
| Hit throws completed (201 / 301) | 33% (43% targeted) | 40 / 42% | 34 / 45% |

Release time by read index (the read his eyes are on), off → on, in seconds:
- read 0: 2.60 → 2.60;
- read 1: 3.00 → 2.95;
- read 2: 3.30 → 3.35;
- read 3: 3.75 → 3.65.

Reading:
- **Turn timing** matches the NFL.
- **Completion** does not fall with the angle turned, as in the NFL.
- **Rhythm** throws are unchanged.
- **Time to throw** rises by 0.05–0.1 s.
- **Phase at contact** moves toward the NFL: the longer motion is where rushers now arrive.
- **Sacks and hit-throw completion** move in opposite directions on the two seeds, within noise.

Not matched: too few throws need a 45–90° turn (13% against 24%). That comes from how far his feet follow each read,
not from the turn itself. Before changing the reset rule, the next check is the shoulder angle to the target at his
last settled frame, in the sim, against the NFL's 50 / 25 / 18 / 7% (0–30° / 30–60° / 60–90° / 90°+). The sim
export carries no orientation yet. `SHOULDER_SETTLE` is not to be tuned to the mix.
