# Nearby observed help: persistence and transfer

Read the [review and priorities](../../../../docs/reviews/near-help-persistence-and-current-priorities.md).
Baseline commit: `46b33f900456c5eec1fed85853de688f2f7fbd57`.

Engine content hashes, defined in `scripts/source-version.ts`:

- Before: `248a44cfeab595291717eb5ace15b98c55b19a17e3fd29d87a706bc30018bd57`.
- Final near persistence: `704158f29be7a7e31b669fddfbf1cecb2fe2332d37a18eaa2db16a3f69e59c12`.
- Unpromoted far forecast: `3242197ad8c1f8b56e97fbe5dd7220950eda0956db6758a01157b4c16ed6ac82`.
- Near-only ablation: `afc90f1680febde1134b0db5df9f110f9bb717cf1655c78895b6ba0bdf62e483`.

Only `src/sim/coverage/judgment.ts` changes in the engine. `engine.patch`
preserves its exact before/final diff. `World` SHA256 stays
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
No new force capacities, anatomy, resolution, hidden assignments, random draws
or perception queries enter the check. The final check retains the six-yard
maximum and uses consumed helper age as a conservative persistence reserve,
not another dead-reckoning correction. Receiver-read age is not separately
propagated; uncertainty remains.

## Evidence and scope

- `panel-{before,after}.json.gz`: the same 24 inputs, profiles and collectors.
  All initial contexts and all observer/plain controls match. Complete endpoint
  contexts match in 21/24; execution payloads match in 23/24. Two matched
  directive changes occur in roster-two Smash. Repeated help queries are not
  independent decisions or bust frequency. `compare.py` reuses the pinned
  endpoint definitions in `../visible-help/compare.py`, preserving natural
  endpoints, defensive returns and live censors without invented yardage.
- `comparison.json` retains every pair and consumed cap-acceptance change.
  Snapshot reconstruction uses the actual observation and stable error; true
  hidden state appears only in separately labelled diagnostic fields.
- `current-runs.json.gz`, `current-tackles.json.gz`, `current-games9.json`
  pair with the same-named archives in `../grasp-reel/`, source248. The 144 run
  and 64 tackle rows are checked completely. Games match initial seeds/roster
  only; later calls, clocks and draws diverge. Neither scores nor receiver YAC
  establish causal improvements or NFL calibration. Concurrent timings are not
  benchmarks.
- `tests-before.log`: six expected failures and 15 passing controls on the
  original engine. `focused.log`: all 39 focused tests pass. `tests.log`:
  all 678 TypeScript tests pass. The 22 Python tests, typecheck and build also
  pass. Meaningful regressions cover near closing/approaching pictures, lateral
  departure, mirrored motion, helper age, observed pose and far uncertainty.
- `far-prototype/` retains the exact **different** source324, four-recording
  collector, original 21-test interpretation, staged/ordinary outcomes,
  mixed game guards and eight-clip film. Those tests and outcomes are not the
  final model's evidence. See its README before using historical scripts.
- `near-only-judgment.ts`, `panel-near-only-ablation.json.gz` and
  `near-only-games9.json` retain the exact ablation sourceafc. Its ordinary
  executions match the far prototype; the far extension has no additional
  demonstrated ordinary physical benefit. Final source704 has the same near
  behavior with revised explanatory comments, and is measured again rather
  than relabelled. The two-second distant forecast remains unvalidated.
- [HTML](../../../../viewer/projected-help.html) and
  [offline ZIP](../../../../viewer/projected-help.zip): five pairs, ten clips.
  The first four pairs were selected before outcomes; roster-two Smash is
  explicitly labelled retrospective, with its different roster preserved.
  Nine naturally finish; the baseline witness is live at eight seconds.
  Telemetry, events, profiles and initial states match the raw recordings.
  `film-integrity.json` and `browser-check.json` retain exact data checks,
  inspection of every clip, grouping/filter/mobile checks and actual WebM
  exports for both sources. Copy references, PNG/video stamps and filenames
  now use the selected clip's engine hash. Facing is body orientation, not eyes.

## Reproduce and inspect

Use Node 22.23.3 and installed dependencies. Run the full suite separately from
heavy simulation. Use ignored output paths, preserving the published archives.

```sh
node --import tsx scripts/diag/coverage-help-review.ts out/projected-help/new
node --import tsx scripts/diag/run-contact-review.ts out/projected-help/new-runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/projected-help/new-tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/projected-help/new-games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/projected-help/compare.py
python3 data/reviews/physics-world/projected-help/film-check.py data/reviews/physics-world/projected-help/panel-before.json.gz data/reviews/physics-world/projected-help/panel-after.json.gz viewer/projected-help.html out/projected-help/film-recheck
python3 data/reviews/physics-world/projected-help/verify-evidence.py --engine
```

The comparison/verifier commands inspect published recordings, without
resimulation. The film checker additionally opens Chromium through the installed
Python Playwright package and tests real exports, writing checks to its ignored
output directory. Omit `--engine` after later engine changes. Manifest hashes
check exact saved bytes; regenerated timestamps or gzip bytes may differ.

For baseline measurement, archive the baseline commit into an ignored scratch
checkout and reuse dependencies. Copy the current diagnostic collector there
so before/after observation tools match. For prototypes substitute their exact
retained judgment bytes and check the content hash before measuring. Never
overwrite live source during another agent's work or a running measurement.

To export these saved films without resimulation:

```sh
node --import tsx scripts/export-visible-help.ts data/reviews/physics-world/projected-help/panel-before.json.gz data/reviews/physics-world/projected-help/panel-after.json.gz out/projected-help/reexport.html 'Baseline: spacing-only help' 'Candidate: persistent near help'
```

The exporter accepts the previous four-pair cohort and this five-pair cohort,
with exact matching fixtures and explicit retrospective labels. Default labels
retain backward compatibility. Historical viewer artifacts are untouched.
