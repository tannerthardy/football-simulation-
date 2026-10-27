# Pullers: the start force does not depend on facing

Main Engine, Stage 1, 2026-10-27. This stacks on #336 (start law); base is
`claude/ol-start-law` `e80e4b35`.

**Question.** With #336, pullers still trail NFL in the first second. What
limits them?

**Answer.** Under #336 a below-cap request starts from the full force *in
that direction*:
- the directional speed factor (shuffle about 0.54 for a lineman going
  sideways, backpedal lower) scaled the start force as well as the top speed;
- so a square guard pulling sideways started at about half force, and the gait
  waited for his hips to turn (2 rad at `turnRate` about 6 rad/s, about 0.35 s).

NFL tracking says players don't do that:
- **NFL pullers barely turn.** BDB2025 weeks 1-2, 94 pulls on Power/Counter/Trap
  (`scripts/mechanics/nfl_pull_turn.py`, the shoulder-pad orientation `o`):
  - shoulders opened 10 degrees by 0.3 s and 19 by 0.5 s;
  - 90 degrees reached on 13 of 94;
  - peak turn rate median 1.6 rad/s;
  - yet they reach 0.5 yd/s at 0.1 s and 2.42 yd/s at 0.5 s.
- **NFL start force is the same in every direction.** Week 1, every player,
  frames starting from under 1 yd/s (`scripts/mechanics/nfl_start_dir.py`).
  90th-percentile start acceleration (yd/s²) by travel direction against the
  shoulders:

  | | forward | sideways | backward |
  |---|---|---|---|
  | All | 2.83 | 2.86 | 2.72 |
  | OL | 1.96 | 2.25 | 2.23 |
  | LB | 3.24 | 3.48 | 3.73 |
  | DB | 3.45 | 3.16 | 2.65 |

  Only DBs start a little softer going backward.

## The change (one line in `locomotionAccel`)

The start force is the body's own full start, `vmax · fatigue · endurance`
(times the squeeze narrowing), in any direction. It still falls to zero at the
speed his facing allows that way (`full`, with the directional factor).
- Full requests are bit-identical.
- So is any request whose cap is the forward one.
- One guard in his stance asked to pull (World, one body) reaches 0.5 yd/s at
  0.09 s instead of 0.18 s, and 2.07 yd/s at 0.5 s instead of 1.82.

## Film (run-only, seeds 7/9; `run_film_reference.py`, same rule NFL and sim)

| Pullers, moved at 0.5 / 1.0 / 1.5 s | NFL | #336 | + this |
|---|---|---|---|
| Power | 0.49 / 1.77 / 3.31 | 0.33 / 1.51 / 3.29 | 0.47 / 1.81 / 3.66 |
| Counter | 0.48 / 1.82 / 3.43 | 0.37 / 1.49 / 3.18 | 0.51 / 1.88 / 3.73 |
| Trap | 0.52 / 1.56 / 2.63 | 0.32 / 1.33 / 2.71 | 0.45 / 1.61 / 2.90 |

Other puller measures, NFL vs before → after this:
- Power deepest point: 1.31; 1.67 → 1.37 yd.
- Pullers who touch nobody: 1-2%; 23-25% → 9-11%.
- All OL at 0.3 / 0.5 / 1.0 s: NFL 0.19 / 0.46 / 1.44; 0.13 / 0.39 / 1.18 → 0.15 / 0.44 / 1.21.

Acceleration by speed (`scripts/diag/accel_envelope.py`):
- **Linemen, linebackers, receivers and backs** stay near NFL.
- **DBs are past NFL below 2 yd/s.** p90 at 0-1 yd/s goes 3.75 → 4.53 (NFL
  2.95); p90 at 1-2 yd/s goes 4.62 → 5.30 (NFL 4.30).
  - #336's review already traced DBs past NFL to their requested drop speed.
  - That is the coverage controller's, and Coverage is paused.
  - Tracking gives DBs only a modest backward start deficit (0.77 of forward),
    not the gap the old law imposed.

## Cost

The core suite has about 30 more recorded-scene and law-contract failures on
top of #336's own (see the PR). They are the same kind #336 re-records:
`gait-facing-contract` pins the old start arithmetic; the rest are recorded
scenes that move. Folding this change into #336 before its scenes are
re-recorded avoids re-recording them twice. Not re-recorded here.
