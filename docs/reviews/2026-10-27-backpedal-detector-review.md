# Backpedal detector review on run-only film (seed 11)

Question: is the facing rule of the `backpedal` detector ("lineman backpedaling
while facing his own backfield") separating anything? It fires on 123 of 230
run plays here (407 of 894 over four seeds); a position-only check finds far
fewer.

Source: develop `55cc9e5` plus #329 (`4039cc8`) and the matched-restage commit,
Node 22.22.0 (`.nvmrc` 22.23.3). Events from
`node --import tsx scripts/weird-film.ts 11 --games 2 --run-only --top 0` (211
`backpedal` events, 207 on run plays); traces from
`node --import tsx scripts/diag/run-film-trace.ts 11 --games 2`. Sample: the 211
events sorted by play id and time, every ⌊i·211/20⌋-th (20 events, no picking by
eye). One (G2-P056) is a pass play the trace does not hold, so 19 are measured.

For each event, over its window: mean speed, and the median angle between the
lineman's facing and the direction he is travelling; his plan; the runner's
depth at the event start.

| Play | Slot | Concept | Window s | Speed yd/s | Facing vs travel | Plan | Runner depth yd |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G1-P002 | RT | oz_strong | 3.35-3.95 | 2.1 | 8° | climb | -1.4 |
| G1-P011 | LT | duo | 1.35-1.60 | 2.2 | 35° | drive | -4.2 |
| G1-P024 | LG | counter | 4.05-4.55 | 2.3 | 30° | pull | 0.6 |
| G1-P036 | LG | draw | 1.40-1.75 | 1.2 | 10° | draw | -5.3 |
| G1-P043 | RG | iz_strong | 3.15-3.65 | 1.8 | 27° | drive | -1.1 |
| G1-P071 | RT | power | 1.40-2.05 | 3.0 | 18° | cutoff | -4.1 |
| G1-P084 | C | power | 2.05-2.25 | 1.8 | 11° | down | -3.0 |
| G1-P107 | LT | power | 1.30-1.60 | 1.6 | 30° | drive | -4.4 |
| G1-P134 | C | oz_strong | 3.05-3.35 | 1.9 | 15° | reach | 0.8 |
| G1-P153 | LT | iz_weak | 2.05-2.30 | 1.5 | 28° | cutoff | -2.4 |
| G2-P019 | RT | duo | 1.45-1.70 | 1.2 | 36° | drive | -3.9 |
| G2-P023 | LG | iz_strong | 3.35-3.85 | 2.1 | 20° | drive | 1.4 |
| G2-P038 | C | power | 1.15-1.65 | 2.4 | 43° | down | -2.9 |
| G2-P069 | LT | draw | 1.70-1.95 | 3.1 | 22° | draw | -4.6 |
| G2-P080 | LG | iz_strong | 3.10-3.50 | 2.1 | 77° | drive | -0.4 |
| G2-P098 | LT | draw | 1.45-1.90 | 2.3 | 7° | combo | -5.0 |
| G2-P120 | RT | oz_weak | 1.00-1.55 | 2.7 | 42° | reach | -4.6 |
| G2-P140 | LT | draw | 1.50-2.05 | 2.5 | 27° | draw | -5.3 |
| G2-P152 | RG | draw | 2.70-3.30 | 2.7 | 12° | draw | -1.1 |

## Reading

- **Facing is travel.** 18 of 19 faced within 45° of the way they were going
  (median 27°; the one outlier, G2-P080, 77°). "Facing his own backfield" and
  "moving toward it" are the same observation here, so the facing clause adds
  nothing the velocity clause does not. A lineman running toward his backfield
  facing it is not backpedaling; a backpedal is facing the opposite way to travel.
- **Most are ordinary.** In 12 of 19 the runner was still 2+ yd behind the line
  (draws and early handoffs: linemen give ground while the play develops). The
  other 7 are later, unengaged blockers drifting back after contact; those are
  the ones a reviewer might care about, but the rule cannot tell them from the 12.
- **The threshold is ordinary NFL movement.** Over 1,394 NFL runs (BDB2025
  weeks 1-2, `nfl_bdb2025.py --plays-out`) and the 211 sim runs, through
  `scripts/mechanics/run_film_reference.py`'s loaders, with every 0.1 s step of
  any lineman toward his own goal faster than the threshold for 10 steps:

  | Threshold, 1 s sustained | NFL | Sim |
  | --- | --- | --- |
  | 1 yd/s (the detector's, but for 1 s not 0.25 s) | 45.7% | 38.4% |
  | 2 yd/s | 10.8% | 1.9% |
  | 3 yd of net displacement in 1 s | 3.0% | 1.4% |

  The detector's own threshold is met on nearly half of NFL runs, so it flags
  normal give-ground. At a speed that is unusual, the sim retreats *less* than
  NFL, the opposite of what the headline label implied.

## Decision

Demoted: `backpedal` is now a **candidate** relabelled "Unengaged lineman
running toward his own backfield". Rule, thresholds and id are unchanged (no
retuning, and no sim input is read differently), so events and probe keys still
line up. It stays in the film list to find the 7 post-contact drifts but no longer
claims a backpedal, and it is not evidence of a defect on its own. The
NFL-comparable form (2 yd/s for 1 s) is the number to compare, and the sim is
under it (1.9% vs 10.8%). Whether linemen *should* retreat faster on draws and
pulls is a question for the run-game owners; this review did not look.

Reproduce the NFL/sim comparison:
`python3 -I scripts/mechanics/ol_retreat_share.py out/run/trace-seed11.json`.
