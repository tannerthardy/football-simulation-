# Approach-control evidence

Read [the implementation, conclusions and next work](../../../../docs/reviews/approach-control-and-remaining-contact.md).

## Pins and retained scope

- Baseline: commit `38b5379`, source SHA-256
  `6100c9b5c338a993e04ffcdb5dbe7171bbbfc3e09a19ceb4f720c5407be8b4ca`.
- Final source SHA-256:
  `2b405d9a79bbb09c21e5e1146a32632c62263fb9e67f319091196f45d8a80ef4`.
- Broader-scope historical candidate:
  `21e9a3716e6069575de171d012b215c05fce3e2c130eecc1749af8bb9efb6e8c`.
  It is a retained diagnostic, not production. `verification.json` pins scripts
  and artifacts; engine hashes cover `src`, including uncommitted source.
- `baseline-approaches.json.gz` / `candidate-approaches.json.gz` retain all 120
  mechanical summaries, early collision windows, ten predetermined full traces
  and four separately labelled retrospective witnesses. `approach-comparison.json`
  validates identical cohorts/scripts/profiles and observer/mirror/refinement
  checks; compact non-film command differences are labelled earliest retained.
- `baseline-runs.json.gz` / `candidate-runs.json.gz` retain 144 actual 11v11 runs.
  Full contact windows are kept for the 12 predetermined film inputs and the
  historical Counter allocation diagnostic. `run-comparison.json` retains
  concept/front breakdowns and definitions. Paired full replay telemetry is in
  [the 26-clip film](../../../../viewer/approach-control-review.html).
- `baseline-tackles.json.gz` / `candidate-tackles.json.gz` and
  `tackle-comparison.json` retain actual tackle witnesses: four independent
  play seeds and both mirrors on one
  roster, not eight independent NFL samples. Reach/down endpoint samples and
  tick-start event stamps differ by up to 50 ms; do not infer precise latency by
  mixing their clocks. The paired replay is
  [here](../../../../viewer/approach-tackles.html).
- `scope-witness-*` records the explicitly retrospective
  `RC-R2-counter-under-R-S11` diagnosis. The broader candidate's actual grasp
  point/capacity trace exposes the lower attachment-bound release. Its final
  state/RNG signatures match the corresponding 144-panel rows. These artifacts
  must not be treated as representative play selection or the final engine.
- Four game guards, isolated command cost and verification logs are retained
  separately. Cost includes the preview; physical game tick/contact counters
  exclude one-body scratch Worlds. Full-game timings are not an isolated
  performance claim. Generated players/calls differ from an NFL sample.

## Rerun

From the repository root with Node 22 and installed dependencies:

```sh
node --import tsx scripts/diag/approach-control-review.ts out/approach/approaches.json
python3 scripts/diag/compare-approach-control.py data/reviews/physics-world/approach-control/baseline-approaches.json.gz out/approach/approaches-compact.json.gz out/approach/comparison.json
node --import tsx scripts/diag/approach-tackle-review.ts out/approach/tackles.json
node --import tsx scripts/diag/run-contact-review.ts out/approach/runs.json
python3 scripts/diag/compare-run-contact.py data/reviews/physics-world/approach-control/baseline-runs.json.gz out/approach/runs-compact.json out/approach/run-comparison.json
node --import tsx scripts/diag/trace-run-approach.mts out/approach/scope-witness.json 2 counter under R 11
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/approach/games9.json 9 --games-only
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/approach/games17.json 17 --games-only
node --expose-gc --import tsx scripts/diag/approach-control-cost.ts out/approach/cost.json
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

Run the same diagnostic scripts in a separate checkout at `38b5379` for baseline
comparisons. Keep engine and scripts frozen throughout each measured run; run
cost processes sequentially without tests/browser/game workloads. The larger
mechanical contacts are not tackle outcomes, and four game guards are not an
NFL calibration study. The NFL movement parameters already present in the shared
World were used without changes; this increment adds no new physical data fit.

To regenerate the paired run film, run the 144-panel script under both sources
and use their raw `*-film.json` files:

```sh
node --import tsx scripts/export-run-contact-review.ts BASE-film.json CAND-film.json viewer/approach-control-review.html
python3 scripts/check-replay-viewer.py viewer/approach-control-review.html
node --import tsx scripts/export-approach-tackles.ts BASE-tackles-film.json CAND-tackles-film.json viewer/approach-tackles.html
python3 scripts/check-replay-viewer.py viewer/approach-tackles.html --video-out out/approach/crossing.webm
```

The committed HTML files are self-contained and the ZIPs contain the same HTML.
The previous recovery-allocation report and film keep their original source pins.
