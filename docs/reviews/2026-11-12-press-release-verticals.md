# Pressed verticals stall at 6-8 yd: the release never ends (Coverage, 2026-11-12)

Status: a diagnosis for the receivers owner (`PRESS_RELEASE`, `src/sim/behaviors/receiver.ts` `handleRelease`). Nothing is built.

## Measure

`scripts/diag/pass-operators/press_release.py` runs the same code on NFL and sim.

- **Population:** the widest WR on a go/fade with the nearest defender within 3 yd at the snap.
  - NFL: BDB 2025 weeks 1–3; `routeRan` GO from `player_play.csv`.
  - Sim: engine-34 defaults (`ROUTE_CRAFT` on), sim-export seeds 11 and 23.
- **Coverage:** man (NFL n 747; ours n 153).

| t (s) | NFL depth | ours depth | NFL rec − corner | ours rec − corner | NFL rec speed | ours rec speed | NFL corner speed | ours corner speed |
|---|---|---|---|---|---|---|---|---|
| 1.0 | 0.5 | 0.9–1.0 | −1.4 | −1.0 | 3.6 | 4.6–5.0 | 2.2 | 2.6–2.9 |
| 1.5 | 2.4 | 3.2–3.5 | −0.8 | −0.1 to −0.2 | 5.5 | 6.1–6.5 | 4.3 | 4.5–4.9 |
| 2.0 | 5.0 | 5.5–5.8 | −0.5 | 0.0 | 6.6 | 3.9–4.1 | 5.8 | 5.5 |
| 2.5 | 8.2 | 6.7–7.1 | −0.1 | −0.7 to −0.8 | 7.2 | 1.5–1.6 | 6.7 | 2.8–3.2 |
| 3.0 | 11.6 | 6.8–7.0 | +0.1 | −1.4 | 7.3 | 2.8–3.1 | 7.0 | 1.3 |

- **Contact at the line is short.** Any contact in the first 1.5 s: ours 12–14% in man, NFL 18%.
- **Our receiver releases faster than the NFL's.** He is level with the corner at 1.5 s; the NFL receiver gets level at about 2.2 s.
- **Then he brakes.** From about 6.5 yd/s to 1.5 yd/s between 1.6 and 2.4 s, at 6–7 yd deep, and drifts about 3.5 yd toward the sideline.
- **The corner slows with him.** He is on the receiver's inside, a step on top.
- **Zone is unaffected.** In zone the receiver runs free.

## Cause

The release in `handleRelease` (the `PRESS_MIRROR` branch, widened by `PRESS_RELEASE`) holds while the corner is 0–5 yd ahead and laterally within the clearance:

- The clearance is the two radii + 0.2 + 0.7 × arm reach, about 1.4–1.5 yd.
- The target is `{ x: corner.x, y: corner.y ± clearance }`: level with the corner, not past him.
- Once the receiver is alongside (lateral about 1.1 yd), the target sits beside him. `runThrough` then points him sideways, his downfield speed dies, and he drifts outward.
- The mirroring man corner stays 0–1 yd on top, which keeps the release condition true. The two controllers slow each other to a stop.
- The release only ends when he gets past the corner.

`PRESS_RELEASE`'s promotion evidence stopped at 5 yd and 2.0 s, before this stall.

## Causal check

The `test/press-release.test.ts` fixture (four_verts vs cover1), 12 seeds × flip, 72 pressed WR. Only the flags change:

| at 3.0 s | default | `PRESS_RELEASE=0` | `PRESS_MIRROR=0 PRESS_RELEASE=0` | NFL |
|---|---|---|---|---|
| depth | 8.2 | 12.9 | 15.3 | 11.6 |
| receiver speed | 1.4 | 7.3 | 8.1 | 7.3 |
| receiver − corner | −1.2 | +0.4 | +1.1 | +0.1 |

With the defaults, the release geometry still holds for 88–100% of these receivers at 2.5–3.0 s.

## Verdict

This is a controller defect in the release request. It is not the jam's strength or duration, not a missing release move, and not the corner's speed.

The repair belongs in `handleRelease`: once he is level with the corner and into his stem, the release should end or aim downfield past the corner. The release itself stays.
