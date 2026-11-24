# The rebuild's gates "release minus break" and "what is thrown when": the baseline on the old controller, both sides (harness item 3)

Tools/Physics, 2026-11-24, for Integration and the QB lane. **No new operator:** Rules' `scripts/diag/routes/qb_gates.py` (and `early_split.py`, `route_chart.py`, `nfl_routes.py`) on #876 (rules/route-chart), the gate definition Integration adopted (population: dropbacks without play action; measure: the share released under 2.0 s by target class; screens reported but not counted in the rhythm gate). This note runs it on engine-95 and keeps the recipe, so the QB lane and Integration can rerun the same two tables on any arm. Data: `data/reviews/qb/gates-engine95-baseline.md`.

## Recipe

1. NFL: `python3 -I scripts/diag/routes/nfl_routes.py DATA_DIR OUT.jsonl.gz` (BDB 2025 weeks 1-9, to the ball's arrival; about 4 minutes; DATA_DIR = `data/raw/bdb2025/big-data-bowl-data`).
2. Ours: the open-census recorder with full tracks, `node --import tsx scripts/diag/census/sim_plays.mts --full --all --seed 101 --games 2 --first {0,2,4,6}` and `--seed {202,303,404,505} --games 4` (24 games; `tools/open-census`, #866), concatenated.
3. `python3 -I scripts/diag/routes/qb_gates.py NFL=nfl-routes.jsonl.gz OURS=sim-all24.jsonl.gz --md out.md`; `early_split.py NFL.jsonl.gz OURS.jsonl.gz` for the availability / timing split.

## Baseline, engine-95 default (the width census's arm (a): develop ede9e5863, every new flag off), 24 games

**What is thrown when** (row %, release-time bands; NFL 6,234 targeted dropbacks, ours 1,622):

| release s | NFL n | NFL screen / back / flat / quick / intermediate / deep | ours n | ours screen / back / flat / quick / intermediate / deep |
|---|---|---|---|---|
| 0-1.5 | 353 | 66 / 7 / 8 / 11 / 4 / 4 | 31 | 100 / 0 / 0 / 0 / 0 / 0 |
| 1.5-2 | 894 | 13 / 18 / 10 / 49 / 4 / 7 | 95 | 58 / 11 / 4 / 20 / 0 / 6 |
| 2-2.5 | 1,846 | 7 / 16 / 3 / 44 / 15 / 15 | 368 | 5 / 13 / 14 / 58 / 8 / 3 |
| 2.5-3 | 1,538 | 3 / 19 / 3 / 19 / 31 / 24 | 489 | 0 / 19 / 16 / 52 / 11 / 3 |
| 3-3.5 | 850 | 3 / 18 / 5 / 12 / 40 / 22 | 372 | 0 / 16 / 12 / 37 / 25 / 10 |
| 3.5+ | 753 | 2 / 17 / 5 / 14 / 34 / 28 | 267 | 1 / 33 / 7 / 19 / 34 / 6 |
| all | 6,234 | 9 / 17 / 5 / 29 / 22 / 18 | 1,622 | 6 / 18 / 12 / 42 / 16 / 5 |

**The headline gate: non-screen throws under 2.0 s, share of dropbacks: NFL 899 of 6,234 (14.4%), ours 40 of 1,622 (2.5%)** (engine-92: 2.2%). Release p25 / p50 / p75 by class, NFL | ours: quick 1.9 / 2.2 / 2.5 | 2.3 / 2.6 / 3.0; flat 1.7 / 2.2 / 3.0 | 2.4 / 2.8 / 3.1; back 2.1 / 2.5 / 3.0 | 2.5 / 2.9 / 3.6; intermediate 2.5 / 2.8 / 3.3 | 2.8 / 3.3 / 3.6; deep 2.4 / 2.7 / 3.2 | 2.6 / 3.1 / 3.3; screen 1.2 / 1.6 / 2.2 | 1.3 / 1.6 / 1.9. Also: ours throws far fewer deep balls (5% of throws against 18%) and more quick routes (42% against 29%); the deep class is thin on both sides' early bands.

**Release minus break by family and break depth** (s; negative = the ball out before the break; p25 / p50 / p75 (n)), NFL | ours:

| family | break band | NFL | ours |
|---|---|---|---|
| HITCH | 3-7.5 | -0.2 / -0.1 / 0.1 (520) | 0.1 / 0.3 / 0.7 (437) |
| HITCH | 7.5-12 | -0.3 / 0.0 / 0.2 (200) | 0.0 / 0.2 / 0.8 (33) |
| HITCH | 12-18 | -0.2 / 0.0 / 0.4 (141) | 0.0 / 0.1 / 0.2 (25) |
| OUT | <3 | 0.2 / 0.5 / 0.7 (134) | 0.6 / 1.1 / 1.3 (23) |
| OUT | 3-7.5 | 0.1 / 0.2 / 0.4 (386) | 0.3 / 0.4 / 0.7 (145) |
| OUT | 7.5-12 | -0.1 / 0.0 / 0.3 (150) | 0.0 / 0.2 / 0.4 (26) |
| IN | 3-7.5 | 0.2 / 0.4 / 0.7 (173) | 0.5 / 0.6 / 0.8 (31) |
| IN | 7.5-12 | 0.0 / 0.2 / 0.5 (119) | 0.4 / 0.7 / 0.9 (63) |
| SLANT | <3 | 0.4 / 0.5 / 0.7 (152) | 0.5 / 0.9 / 1.7 (26) |
| SLANT | 3-7.5 | 0.1 / 0.3 / 0.5 (136) | 0.3 / 0.8 / 1.5 (35) |

The stops (hitches, 3-7.5 yd, n 520 | 437) are released **0.4 s later than the NFL's in the median (+0.3 against -0.1)**, outs 0.2 s later (0.4 against 0.2), ins 0.2-0.5 s later, slants 0.5 s later (0.8 against 0.3); where the NFL's p25 is before the break (hitches, 7.5-18 yd outs and ins), ours' p25 is at or after it (0.0 to 0.5 s). The break was not found for NFL 221 hitches, 146 outs, 16 ins and 163 slants (a break caught within 0.6 s of the arrival is not detectable: the earliest NFL throws are missing here, so the NFL's p25 is biased late) against ours 41, 11, 8 and 25.

**Availability against timing (early_split.py, non-PA dropbacks; NFL 7,207, ours 1,751):** a quick route on the field in non-screen plays: NFL 77.0% | ours 91.5%; given one, thrown under 2.0 s: **14.5% | 2.3%**; quick-route targets' release p25 / p50 / p75 **2.00 / 2.30 / 2.80 | 2.40 / 2.70 / 3.10**; QB retreat from his snap spot by the release, p10 / p50 / p90: 1.4 / 3.1 / 5.0 | 2.5 / 3.4 / 4.4. The gate is release timing, as Rules found, not the concept menu.

## Caveats

- 24 games, one draw; the family bands under 30 are not read; the hitch / out / in / slant families only, by the operator's route labels (ours from the engine's route ids, NFL from PFF `routeRan`).
- `early_split.py` excludes any play with a screen route on it (11.3% non-screen throws under 2.0 s on the NFL side); the adopted gate is `qb_gates.py`'s target class (14.4%). The two are not interchangeable.
- The run-time cost is the 24-game census recording (about 17 minutes on 4 cores) plus the NFL build once.
