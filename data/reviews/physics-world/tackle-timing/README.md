# Tackle timing and lower-attachment evidence

Read [the implementation and next work](../../../../docs/reviews/tackle-timing-and-lower-attachment.md)
and [the localized lower-bound diagnosis](../../../../docs/reviews/lower-attachment-bound.md).

## Pins and scope

- Baseline commit: `b7db9d8b6c5606aadee29a763de87327d01e1dcf`.
  Engine SHA-256: `2b405d9a79bbb09c21e5e1146a32632c62263fb9e67f319091196f45d8a80ef4`.
- Current engine SHA-256:
  `bbfaf460a9962459702dc5702b62b5b5e5933eac7c7e5ab1986095690d1759db`.
  Engine hashes cover `src`, including the new helper. Measurement tools,
  logs, reports and film are separately pinned in `verification.json`.
- `baseline-panel.json.gz` / `candidate-panel.json.gz` retain 56 primary rows
  (28 unmirrored inputs) and eight separate historical crossing witnesses.
  Two generated roster pairs and two reused play seeds are not an NFL cohort.
  Each source passes 64 observer controls and nine full-recording controls.
  `panel-comparison.json` validates source/script/input/profile/cohort agreement,
  compares actual attempt geometry and physical signatures, and keeps witnesses
  separate. Primary and crossing physical results remain identical.
- `baseline-brake-witness.json.gz` / `candidate-brake-witness.json.gz` retain
  four separately selected retrospective plant/brake rows: two seeds, mirrors
  and one unedited roster pair. Each source passes four recording controls.
  `brake-comparison.json` retains the first-attempt decision difference and
  mixed natural endpoints. Its original uncompressed artifact hashes refer to
  bytes now retained inside these gzip files, not to a second required download.
- Moving isolation fixtures use incoming straight-line perception history ending
  one tick before the staged pose. The first ordinary tick records that pose.
  Live window endpoints are censors, not engine timeouts or tackle failures.
  Event labels and post-physics geometry retain the ordinary 50 ms convention.
- `baseline-runs.json.gz` / `candidate-runs.json.gz` and `run-comparison.json`
  retain the same 144 actual 11v11 inputs and seven observer controls/source.
  Baseline is reused from the preceding increment's current-source report;
  script/cohort/source pins match. These are simulated forward-progress results
  **before game-level penalty enforcement**, not official NFL rushing statistics.
  Full contact traces remain for the unchanged 13 film fixtures.
- `trap-baseline.json.gz` / `trap-candidate.json.gz` and
  `trap-first-difference.json` diagnose the largest absolute gain difference,
  selected retrospectively. Recorded final-state/RNG signatures match panel
  rows. Baseline includes holding; later execution draws and approach angles
  change. Closer geometry alone does not explain the stronger acquired hold.
- `*-games-seed9.json`, `*-games-seed17.json` and `games-comparison.json` retain
  four starting-seed/roster matched full-game guards. Baseline is reused from
  the preceding current-source measurement. Divergent snaps change later calls
  and RNG; scores are not causal estimates or league calibration. No physical
  timeouts or motor-work excess; lower-bound releases remain unfixed (two→seven).
- `lower-attachment-baseline.json.gz` retains 36 variants of one diagnosed
  actual-World restart, eight representation/filter sensitivities and four
  capacity/reach negatives. It restores two bodies and a historical grasp,
  with missing optional state explicitly disclosed. This is not an exact replay
  or independent NFL sample. Four observer controls preserve signatures;
  primary/sensitivity lower-bound releases persist with spare force capacity.
- `helper-cost.json` is an isolated, warmed **current-helper-only** measurement
  on seven frozen inputs. Eligible calls cost approximately 0.03 ms wall time.
  It verifies input/body/perception/RNG immutability and scratch step counts
  outside timing. No tests, simulations or browser workloads run concurrently.
  This is not old-law comparison or full-game overhead. Physical-game counters
  exclude one-body previews, while game CPU includes their cost.

## Rerun

From the repository root, using pinned Node 22.23.3 and installed dependencies:

```sh
node --import tsx scripts/diag/tackle-timing-review.ts out/tackle-timing/panel.json.gz
python3 scripts/diag/compare-tackle-timing.py data/reviews/physics-world/tackle-timing/baseline-panel.json.gz out/tackle-timing/panel.json.gz out/tackle-timing/panel-comparison.json
node --import tsx scripts/diag/tackle-brake-witness.ts out/tackle-timing/brake.json
node --import tsx scripts/diag/run-contact-review.ts out/tackle-timing/runs.json
python3 scripts/diag/compare-run-contact.py data/reviews/physics-world/tackle-timing/baseline-runs.json.gz out/tackle-timing/runs-compact.json out/tackle-timing/run-comparison.json
node --import tsx scripts/diag/trace-run-approach.mts out/tackle-timing/trap.json 3 trap over L 3
node --import tsx scripts/diag/lower-attachment-review.ts out/tackle-timing/lower-bound.json
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/tackle-timing/games9.json 9 --games-only
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/tackle-timing/games17.json 17 --games-only
node --expose-gc --import tsx scripts/diag/tackle-window-cost.ts out/tackle-timing/cost.json
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

To regenerate baselines, use source at `b7db9d8` with the same new measurement
scripts copied in; keep `src` unchanged. Diagnostic/schema/script pins must
match before comparing. Keep engine/scripts frozen during each run. Benchmark
only after other workloads finish. No player traits, force capacities, physical
resolution, outcome rolls or NFL averages were fitted in this increment.

The raw panel commands also write `*-film.json` containing actual full recordings.
To regenerate the self-contained libraries under both sources:

```sh
node --import tsx scripts/export-tackle-timing.ts BASE-panel-film.json CAND-panel-film.json viewer/tackle-timing-review.html BASE-brake-film.json CAND-brake-film.json
node --import tsx scripts/export-run-contact-review.ts BASE-runs-film.json CAND-runs-film.json viewer/tackle-timing-runs.html
python3 scripts/check-replay-viewer.py viewer/tackle-timing-review.html --video-out out/tackle-timing/example.webm
python3 scripts/check-replay-viewer.py viewer/tackle-timing-runs.html
```

The [tackle HTML](../../../../viewer/tackle-timing-review.html) and
[ZIP](../../../../viewer/tackle-timing-review.zip) contain 26 clips grouped into
nine inspection concepts. Four live windows show observed advance and “Live
window”, with completed-result flags cleared. `export-integrity.json` verifies
normalized full recordings, captions and censor treatment. The
[run HTML](../../../../viewer/tackle-timing-runs.html) and
[ZIP](../../../../viewer/tackle-timing-runs.zip) preserve 26 matched 11v11 clips.
ZIPs contain the exact HTML; no server, fonts or external data are required.
