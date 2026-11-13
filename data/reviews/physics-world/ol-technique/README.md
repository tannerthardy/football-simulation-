# OL run technique: fixed football panel and retained candidates

Read the [coaching review](../../../../docs/reviews/offensive-line-run-technique.md)
and [implementation/results](../../../../docs/reviews/ol-technique-implementation.md).
Baseline commit: `cdcf4d2fded36d00eb23ff8aa6d2f9de6af599e1`.

- Baseline engine SHA256: `fedfb636eb7a02f298cff1fdf2e2fb213ef37645cc7e1f31b1ef05b52d338205`.
- Final engine SHA256: `a629d4d04485ade21e4354b8078ed6cd0bf56b155aa92b83dad7f97cc2d8172f`.
- Unchanged World SHA256: `4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
- Startup/stopping prototype: `84b632be4b1c6731aaf0b14f5f85e7637c0fc506671778a2e2e700a8a15907a9`.
- Same prototype with only startup reverted: `a0da15ea09c439270f1f969a66bcbc2193cf3f718d94a90850cf1168e56be98e`.

Only `src/sim/behaviors/blocking.ts` and `src/sim/run-block-fit.ts` change
in the engine. Existing physical capabilities, hand/contact force laws,
support, traction, movement execution and resolution remain unchanged.
These are diagnostic engine observations, not new NFL data or calibration.

## What is saved

- `before.json.gz` / `after.json.gz`: 160 fixed ordinary 11v11 inputs:
  one .55 generated roster pair, eight calls, five fronts, both directions,
  seeds 3/11. Split zone uses Gun Wing 12; others use Ace 11. Two named prior
  roster-two keeper witnesses are stored separately and excluded from pooling.
  Every phase also executes all 162 plain controls to prove recording does not
  change execution. Profiles/setup match across phases, and all plays end
  naturally. Initial hashes cover a recorded projection; they omit new private
  solo-technique metadata, so they do not prove complete controller equality.
- `before-film.json.gz` / `after-film.json.gz`: the predetermined first-seed
  Over inputs for eight calls/both directions plus the two prior witnesses.
  Full telemetry, events, profiles, native assignment transitions, consumed
  reads, requests, geometry and delivered loads stay intact. The
  [36-clip film room](../../../../viewer/ol-technique.html) and
  [offline ZIP](../../../../viewer/ol-technique.zip) use these saved recordings
  only. Native read images in the compact overlay are transition records,
  not a complete gaze trace. Controller time and completed-step load retain
  their separate conventions. Surviving tick-ending joints omit joints
  removed within a tick; actual delivered impulse/work still includes loads.
- `comparison.json`: every changed result, per-concept/front summaries and
  native witnesses. Final mean gain is 1.265 versus 1.427 yd; stuffs 38
  versus 32. OL fall events fall 17 to 11, and all eight old free obsolete
  keeper updates disappear. Independent checks prove 72 earned releases
  preserve keeper work and 34 actual new deep jobs use consumed observed
  depth. These controller fixes do not establish a broad rushing improvement.
- `startup-candidate*` / `no-startup*`: both rejected 160+2 phases, full film
  inputs and exact patches. Their comparisons retain adverse healthy down
  fits and delayed backer contact. `startup-ablation-comparison.json` isolates
  the startup reversion: it does not explain all core approach regressions.
  Prototype tests/logs are research records outside the production test suite.
- `engine.patch`: exact baseline-to-final source diff. The three patches
  independently reconstruct all phase engine hashes without writing live code.
- `current-runs.json.gz`, `current-tackles.json.gz`, `current-games9.json`:
  independent guards paired with same-named files in `../ol-retarget/`.
  The 144-run mean rises 1.326 to 1.585 yd, but stuffs rise 38 to 39 and
  broken holds 5 to 10. All 64 tackle rows are exact. Game scores and later
  choices diverge; retain their mixed results rather than claiming an isolated
  efficiency effect. No run times out or releases a lower grip at its bound.
  Concurrent collection times are not performance benchmarks.
- `tests-before.log`: 12 intended new regressions fail on baseline; seven
  controls pass. `focused.log`: 75 focused passes. `tests.log`: all 714
  TypeScript tests pass; `python.log`: 22 Python tests pass. Typecheck and
  build logs retain their successful exit/output. Empty compiler logs are
  expected for successful `tsc` runs; verifier checks their pinned bytes.
- `film-integrity.json` / `browser-check.json`: source/profile/telemetry/load
  integrity, natural endings, all 36 browser clips, eight concept groups,
  filters, copied references, mobile layout and actual video export checks.
- `verification-manifest.json` / `verify-evidence.py`: immutable byte pins,
  native release/new-work checks, paired guards and patch reconstruction.
  `--engine` additionally checks current code/tools/documentation pointers.
  Omit that flag after later development to inspect historical evidence.

## Rerun

Use Node 22.23.3 and installed dependencies from the repository root. Preserve
published archives and write new measurements to ignored output directories.
The collector creates a matching `new-film.json.gz` alongside `new.json.gz`.

```sh
node --import tsx scripts/diag/ol-technique-review.ts out/ol-technique/new.json.gz
node --import tsx scripts/diag/run-contact-review.ts out/ol-technique/new-runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/ol-technique/new-tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/ol-technique/new-games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 scripts/diag/compare-ol-technique.py data/reviews/physics-world/ol-technique/before.json.gz data/reviews/physics-world/ol-technique/after.json.gz out/ol-technique/comparison.json
python3 data/reviews/physics-world/ol-technique/verify-evidence.py --engine
```

The comparison/verifier inspect retained measurements without resimulation.
`run-contact-review` writes plain JSON even if given a `.gz` suffix; the saved
`current-runs.json.gz` here is intentionally compressed after collection with
decoded content unchanged. Other compressed archives are native tool outputs.
New collection timestamps/gzip bytes may differ while decoded execution matches.

To collect a baseline, archive the baseline commit into ignored scratch space,
reuse dependencies and copy the exact same collector there. Confirm its engine
content hash before running. Do not overwrite live code during another agent's
work or simulation. Rejected patches apply to that baseline, not to current code.

Export and browser checks consume saved films only:

```sh
node --import tsx scripts/export-ol-technique.ts data/reviews/physics-world/ol-technique/before-film.json.gz data/reviews/physics-world/ol-technique/after-film.json.gz out/ol-technique/replay.html
python3 data/reviews/physics-world/ol-technique/film-check.py data/reviews/physics-world/ol-technique/before-film.json.gz data/reviews/physics-world/ol-technique/after-film.json.gz out/ol-technique/replay.html out/ol-technique/browser
```

The browser checker requires Python Playwright and Chromium and starts its own
internal server. Unzip the published library and open its HTML to watch offline.

Next work remains shoulder acquisition versus stretch/seal intent, brief
post/check/climb, achieved kick/log traffic and missing Draw/perimeter installs.
No full anatomical solver expansion or scenario-specific strength bonus is
justified by these controller mistakes.
