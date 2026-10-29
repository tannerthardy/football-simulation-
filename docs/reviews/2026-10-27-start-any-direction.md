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
- Only requests whose cap is the forward one (moving the way he faces) are
  bit-identical. A full request capped by facing changes too: at rest, for
  vmax 7.2 / tau 1.4 / shuffle 0.5 / backpedal 0.55, sideways goes 2.75 ->
  5.14 yd/s^2 and backward 2.83 -> 5.14; at 0.5 yd/s, sideways 2.21 -> 4.43
  (independent probe on #353). Forward is identical. (Corrected: an earlier
  version said all full requests were bit-identical.)
- Tracking percentiles support the direction-free start; they do not prove a
  universal isotropic force law.
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

## Where the DB/DL/LB overshoot comes from (requests, not the law)

Asked before merge: are the defenders' accelerations past NFL caused by the law,
or by their controllers' requests?

Tools:
- `scripts/diag/start-probe-defense.ts`: per tick, every DL/LB/DB on run-only
  seeds 7/9, under this law.
- `scripts/diag/start_attribution.py`.

Method:
- Each defender's probe speed is smoothed exactly as the film operator does
  (accel over ±0.2 s).
- Ticks are split by what he asked for: a **modest** request (no more than 1.25×
  the speed NFL players in that group and speed bin actually reach 0.5 s later),
  or a **larger** one.
- On every tick the World delivers the gait's plan (achieved / planned 1.00),
  and the plan is the law applied to the request.

| Accel p50 / p90 (yd/s²) | NFL | sim, modest request | sim, larger request | larger share | NFL speed 0.5 s later | larger requests come from |
|---|---|---|---|---|---|---|
| DB 0-1 yd/s | 1.41 / 2.94 | 1.54 / 2.84 | 2.09 / 3.60 | 61% | 1.76 | man, zone drops |
| DB 1-2 yd/s | 2.21 / 4.27 | 2.41 / 3.84 | 4.04 / 5.49 | 65% | 2.63 | man, zone drops |
| DL 1-2 yd/s | 2.84 / 4.25 | 1.64 / 3.12 | 4.07 / 6.00 | 84% | 2.46 | rush |
| DL 2-3 yd/s | 2.87 / 4.62 | 2.03 / 3.23 | 4.14 / 6.20 | 83% | 3.31 | rush |
| LB 1-2 yd/s | 2.82 / 4.65 | 2.21 / 3.93 | 4.03 / 5.22 | 89% | 2.70 | zone, man, blitz |
| LB 2-3 yd/s | 2.94 / 4.99 | 2.00 / 3.36 | 3.57 / 4.98 | 84% | 3.43 | zone, man, blitz |

- Asked for what NFL players reach, the law gives NFL-like acceleration, at or
  under NFL.
- The overshoot is all in the larger requests, most ticks: the requests are
  well beyond where an NFL player in the same state is 0.5 s later.
- No controller uses `effort` to start more gently: under 3% of these ticks
  have effort below 1.

**Named follow-ups (controllers, not this PR).** The first item is revised below.
1. **DL get-off on run plays** (Defense). See the next section. The 7.5-8 yd/s
   rush request is a pass-rush get-off, and it matches NFL pass rushers. The
   overshoot comes from a late start followed by a catch-up sprint, and NFL
   linemen meet the DL sooner.
2. **LB reads on runs** (plans `zone` / `man` / `blitz`, Defense, with
   Coverage for the drops). Requests 5.5-6 yd/s, against NFL 2.7-3.4.
3. **DB drops** (plans `man` / `zone`, Coverage, paused). Requests 3.5-5 yd/s,
   against NFL 1.8-2.6. This was already #336's finding.
4. **Engaged zone flow** (Defense for the DL's request, Run Game for the
   blocker's). This is the largest run-game item. See the section after next.

## DL on run plays: a pass-rush get-off, then a stall (trench geometry)

`scripts/diag/trench_flow.py` uses the same operator on NFL tracking and on sim
film traces from `scripts/diag/run-film-trace.ts`. Run-only seeds 7/9, this law.

| DL, after the snap | 0.2 s | 0.3 s | 0.4 s | 0.5 s | 0.6 s | 0.8 s | 1.0 s | 1.2 s |
|---|---|---|---|---|---|---|---|---|
| Speed p50, NFL runs | 0.64 | 0.87 | 1.12 | 1.37 | 1.60 | 1.91 | 2.12 | 2.19 |
| Speed p50, NFL passes | | 1.12 | 1.49 | 1.83 | 2.15 | 2.64 | 2.94 | |
| Speed p50, sim runs | 0.29 | 0.85 | 1.40 | 1.74 | 1.67 | 1.12 | 1.28 | 1.37 |
| Nearest opponent p50, NFL | 1.72 | 1.63 | 1.52 | 1.40 | 1.27 | 1.04 | 0.88 | 0.79 |
| Nearest opponent p50, sim | 1.81 | 1.74 | 1.58 | 1.34 | 1.04 | 0.72 | 0.75 | 0.81 |

- The snap geometry is the same: 1.83 vs 1.84 yd to the nearest opponent.
- **A late start.** At 0.1 s only about 40% of sim DL ask to move. Once they
  move, the sim DL's curve is the NFL pass rusher's: 1.74 at 0.5 s, against
  1.83 in the NFL.
- **The catch-up sprint is the overshoot.** On runs NFL DL are slower than
  that, and NFL linemen close the space steadily.
- **The stall.** After contact, sim DL slow to 1.1-1.4 yd/s while NFL DL keep
  moving at 1.9-2.2.

## Engaged zone flow: the physics carries it; the requests don't ask

Same operator, 0.8-1.2 s, a body within 1.3 yd of an opponent, zone runs.

|  | NFL | develop | this PR |
|---|---|---|---|
| OL lateral p50 (yd/s) | 2.30 | 0.70 | 0.95 |
| DL lateral p50 (yd/s) | 2.00 | 0.55 | 0.70 |

**Physics.** Two 135-140 kg linemen on a hand joint (extension 0.86, push 1000,
steer 330) both ask for 2 yd/s sideways:
- develop: 1.46 yd/s at 1 s;
- this PR: 1.92 yd/s by 0.75 s and 1.98 at 1.5 s, with the hands loaded or not.

In games (`scripts/diag/engaged-flow-probe.ts`, this law), engaged zone pairs
both ask for at least 1 yd/s the same way on 30% of ticks:
- requests median 1.8 (blocker) and 3.0 (defender);
- each body plans 1.5 and 3.6 yd/s² sideways and achieves 2.2 and 2.4.

The joint shares the pair's acceleration, and World delivers it.

**Requests.** On the other 70% of zone ticks the defender asks for little,
nothing, or the other way:
- all zone ticks: defender request median 0.56 yd/s along the blocker's side;
  blocker 1.14.
- The blocker mirrors the defender (`stepRunRep`:
  `seal = dLat + feedback + correction`), so the pair flows only as far as
  the DL asks.
- The DL's request is `requestToCover` toward his fit aim plus the held flow
  cue, bounded by containment (`stepRunRep`, defender half).
- Why it stays small or reverses when an NFL DL flows at 2 yd/s is the
  follow-up.
