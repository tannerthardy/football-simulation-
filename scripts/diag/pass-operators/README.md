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
