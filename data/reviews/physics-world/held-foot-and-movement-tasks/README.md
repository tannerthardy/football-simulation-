# Held-foot repair and matched movement tasks

Status: **physics NOT READY**. Read
[the handoff](../../../../docs/reviews/held-foot-and-movement-readiness.md)
for the repair, diagnostic limits, explicit readiness gates and ordered work.
Previous source-pinned baseline: `../support-integration/` at commit `dfa803d`.

- `hand-convergence.json`: unchanged nine real-technique fixtures, fixed 20 Hz
  controls, 6/12/24/48/96/192 substeps. Native 12 versus 192 still has two fall
  disagreements and 0.822 yd worst closest-distance error.
- `shared-capabilities.json`, `scenarios.json`: common body capabilities and
  real-technique transfer guards. Mathematical contracts are not contact-force
  validation.
- `movement-tasks.json`: **aggregate only**, 888 paths / 420 athletes, 3,552
  paired world trials. One earliest eligible event per athlete/drill; measured
  body and sprint inputs required. Five drills and disjoint development/reserved
  cohorts. No fitting. Neutral ratings and explicit missing-measurement proxies;
  path-following facing and no OL dummy contact. Denominators retain failed
  simulations; the 2025 table is not a trained-model holdout accuracy claim.
- `kinematics.txt`, `calibration-16.txt`: four recorded games, seed 5; sixteen
  games, seed 7, two independently generated leagues. Same definitions and seeds
  as the baseline; no physics parameters tuned to these outcomes. Passing guards
  regress. Generated-league and fixed-film cohorts differ.
- `film-outcomes.json`, `film-export.txt`, `browser-tests.json`: fresh six-game
  film, fixed teams, seeds 7–12. **920 clips / 27 concepts**, 20 browser checks;
  this cohort includes four pitch releases/catches. ZIP HTML matches the exported
  viewer. Old play IDs need their old source version.
- `tests.txt`, `data-tests.txt`, `typecheck.txt`, `build.txt`: completed checks
  (266 engine tests, 20 Python checks). Logs normalize trailing whitespace only.

The manifest fingerprints final engine source, scripts, reference inputs,
aggregates and replay files. Source remains unchanged during the measurements.
Raw Kaggle paths and intermediate per-athlete trial frames remain ignored in
`out/` / `data/raw/`. No new raw dataset was downloaded. This panel uses the
already acquired BDB2027 snapshot and existing numpy/pandas dependencies.

Reproduce from the repository root with Node 22 and Python plus
`scripts/data/requirements-movement.txt`:

```sh
python3 scripts/data/movement_task_fixtures.py data/raw/kaggle/nfl-big-data-bowl-2027/nfl-big-data-bowl-2027 out/movement-inputs.json
node --import tsx scripts/diag/movement-tasks.ts out/movement-inputs.json out/movement-trials.json
python3 scripts/data/movement_task_report.py out/movement-inputs.json out/movement-trials.json out/movement-report.json
npm test
npm run test:data
npm run typecheck
npm run build
node --import tsx scripts/diag/hand-convergence.ts out/held-foot-convergence.json
node --import tsx scripts/diag/shared-capabilities.ts out/held-foot-shared.json
node --import tsx scripts/scenario-pack.ts out/held-foot-scenarios.json
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 16 7 2
node --import tsx scripts/export-replay.ts 7 --games 6 --out viewer/film-room.html --doc
python3 scripts/film-outcomes.py viewer/film-room.html --out out/held-foot-film-outcomes.json
python3 scripts/check-replay-viewer.py viewer/film-room.html
```

Use `zipfile` to archive the standalone HTML under `film-room.html`. Keep the
library populated; `viewer/replay.template.html` intentionally has no play data.
The setup toolchain is already prepared; no reusable configuration change was
needed for this work. PR #1 was not modified.
