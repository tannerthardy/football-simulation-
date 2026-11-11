# Pass-side operators

Measurement code for the pass game, sim against NFL with one operator per question. No engine change lives here.

**Inputs.**
- **Sim panel scripts** (`first-pressure.ts`, `backs-clock.ts`, `press.ts`, `route-start.ts`) read the saved matched-restage panel `out/matched-restage/seed7.json` and `seed11.json` (capture with `scripts/diag/matched-restage.ts capture <seed>`). They replay each dropback with 4 dice shifts: about 732 dropbacks.
- **Grid scripts** (`pressure-grid.ts`, `mug-grid.ts`) build their own plays and write JSON rows to the path given.
- **NFL twins** (`nfl_*.py`) read BDB 2025 tracking, e.g. `python3 -I scripts/diag/pass-operators/nfl_press.py <bdb dir> 1,2,3`.

Run sim scripts from the repo root with flags as env, e.g. `WR_SNAP=1 npx tsx scripts/diag/pass-operators/press.ts`.

| script | question | NFL twin |
|---|---|---|
| `pressure-grid.ts` | pass plays vs every pressure look: sacks, first defender within 2 yd of the QB, time to throw | — |
| `mug-grid.ts` | double mug packages: free rushers (first within 2 yd of the QB, never engaged) | — |
| `first-pressure.ts` | who makes the first pressure (blocked man / free, back on or off him); the back's contact before release | `nfl_backblock.py` |
| `backs-clock.ts` | back release kinds and timing; sack, scramble and throw times; QB clock | `nfl_backs_clock.py` |
| `press.ts` | pressed outside WR: contact, release speed and lateral move, CB ground given and offset | `nfl_press.py` |
| `route-start.ts` | ground from the snap position by group, stem speed / own top, WR / TE alignment depth | `nfl_route_start.py` |
| `yac-stages.ts <out.jsonl>` | one record per reception: air yards and defenders deeper at the catch, nearest defender distance and closing speed, catch to first contact (a defender's centre within 1.0 yd), after contact, the nearest two's pursuit, the nearest's distance and speed toward the catch point at the throw / mid-flight / catch, and his speed toward it from release -0.6 to +0.4 s with his technique label | `nfl_yac_stages.py <bdb dir> 1,2,3 <out.jsonl>`; both read by `yac_summary.py <nfl.jsonl> <sim.jsonl>` |
| `targets.ts <out.jsonl>` | every targeted throw: the target's air yards on arrival, result, separation, defenders deeper | `nfl_targets.py <bdb dir> 1,2,3 <out.jsonl>` |
| `zone-squeeze.ts` | zone plays: each non-rushing CB/S/LB and the nearest receiver within 7 yd at the release; his speed toward that receiver from release -0.8 s, target vs not | `nfl_zone_squeeze.py` |
| `qb-facing.ts` | how long the QB's body faces within 20 deg of the target before the release; motion length | `nfl_qb_facing.py` (BDB `o`) |
| `routes.ts` | every route run (WR/TE/RB) by route id: share of routes and targets, break depth/time, depth / downfield speed / time at the release when thrown to | `nfl_routes.py <bdb dir> 1,2,3` (BDB `routeRan` labels; `... dd` gives routes-run share per route by down and distance, non-PA / PA, from `player_play` over all weeks) |
| `route-timing.ts` | release minus the targeted receiver's own break (heading turn > 30 deg from his stem or speed < 65% of it, searched through ball arrival), per route | `nfl_route_timing.py` |
| `contest.ts` | targeted throws: the defender nearest the target at arrival and 0.3 s before (distance, closing, facing the ball), outcome and who defended it | `nfl_contest.py` (arrival = pass_arrived, else the outcome frame) |
| `task1.ts <out.jsonl>` | the cut per route (speed in / min / +0.4 / +0.8, turn in 0.4 s, gear-down), the throw by depth x pressure, time as a cost, interception origins; read with `task1_summary.py <nfl.jsonl> <sim.jsonl>` | `nfl_task1.py <bdb dir> 1,2,3 <out.jsonl>` |
| `read-choice.ts` | where each target sat in the QB's read order (read #1 / later / outlet / off-order) and how often each route is read #1 | — |
| `depthwidth.py <plays.jsonl.gz>` | (common format, NFL and sim alike) completion by the target's depth and width at the ball's arrival (pass_arrived, else the last frame); nearest defender at the release | itself on `out/mechanics/nfl-plays.jsonl.gz` |
| `relbreak.py <plays.jsonl.gz>` | (common format) release minus the target's break by route class from the trajectory (stop / in / out / breaks that keep climbing / none) and break depth | itself on the NFL file |
| `stopbreak.py <plays.jsonl.gz>` | (common format) completions on stop routes 8+ yd: the defender 2+ yd over the catcher, his downfield velocity from break -0.2 to +0.6 s and at the release, release minus break | itself on the NFL file |
| `flat-force.ts <out.jsonl>` | diagnostic, changes the play: the QB throws a ready flat / arrow / swing at set + MIN_T; his predicted P / INT vs the outcome, catch geometry, forecast mode, aim vs receiver at arrival | — (NFL reference: flats complete 87% with the nearest defender 3-4.5 yd, #538) |
| `throw-calibration.ts <out.jsonl>` | passive: every throw's predicted P / INT vs outcome, route, forecast mode and distance from the installed path, aim vs receiver at arrival | — |

Contact in the YAC operators is geometric and shared with Defense's `scripts/diag/defense-yards/yards.py`: a defender's centre within 1.0 yd of the carrier, on 0.1 s frames. Mine measures stages from the catch; theirs measures at +10 yd after the catch. Results: `docs/reviews/2026-11-10-yac-decomposition.md`.
