# BEND_FORECAST: pursue to where the carrier is going (attempt 1, a miss) (2026-11-17)

Defense lane, zone YAC. Base: develop 6f1136ae. Flag `BEND_FORECAST`, numeric bits, default 0.

## Why
- Forecast error, measured on staged zone pursuers 2.5-6 yd off a carrier > 6 yd/s from the side or behind.
  - The constant-velocity forecast is 0.44 yd off at +0.5 s and 1.57 yd p50 (2.10 p75) at +1.0 s.
  - The carrier ends ~1 yd further upfield, most just out of the catch.
  - Carriers' measured turn toward upfield: p50 19 deg/s, p75 40 deg/s.
- Oracle sizing (scratch, never lands; zone YAC, base 5.99):
  - D3, the same upfield bend applied as an oracle aim: 5.46.
  - D2, the carrier's own intended heading: 5.25.
  - D, his whole future path with him held to it: 4.26.

## The change
The pursuit planner's forecast of the carrier bends instead of running straight. The evidence is used in order:
- bit 2: his seen facing leads his velocity → turn toward the facing at 40 deg/s;
- bit 1: otherwise, the prior → turn toward upfield at 19 deg/s.

The target heading is a held belief: it changes only when his seen velocity or facing has moved 20 deg. PURSUIT_SPOT's
held spot is judged against the bent forecast. Stated choices: the two rates (measured p50 / p75) and the margin.

## Measured (staged 1,230-completion design)
| | base | bit 1 (prior) | bits 1+2 (body + prior) |
|---|---|---|---|
| zone YAC / 20+ / never-reached | 5.92 / 5.2% / 7.2% at 27.9 | 5.78 / 5.1% / 7.2% at 26.5 | 5.82 / 5.7% / 6.7% at 26.4 |
| man YAC | 3.07 | 2.76 | 3.27 |
| pursuers: closest approach p50 / inside 1 yd / behind at closest | 2.36 / 20% / 81% | 2.35 / 20% / 80% | 2.35 / 21% / 79% |
| head-on control: carrier 5+ after the cut | 1.4% | 3.2% | 3.8% |

- Offline, the upfield prior cuts the forecast error at +1.0 s from 1.57 to 1.30 yd p50 (p75 2.10 → 1.59).
- On the field the pursuer's closest approach does not move.
- Dither not run: a miss.

## Why it missed, and the sizing that explains it
- The oracle with the same bend (D3) got 0.5 yd only by aiming every pursuer at that point directly, bypassing the
  planner's commitments and the on-top point.
- Through the planner, a 0.3 yd better forecast at 1 s is within what the held spot already tolerates (1 yd +
  reach), so the aim barely changes.
- D with the carrier free (pursuers aim at his first-pass path, he reacts to the new pursuit): 5.14, against D's 4.26.
  About half of the oracle's gain is knowledge of where he goes; the other half is his reaction to defenders who arrive
  better placed.
