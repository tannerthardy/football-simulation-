# Achieved active-grip force and body travel

Read the [review and priorities](../../../../docs/reviews/active-grip-force-travel-and-current-priorities.md).
Baseline commit: `72910904ceccf5fecb9c94d8f9a11a08f44007b7`.

Engine content hashes, defined in `scripts/source-version.ts`:

- Before: `5b6c2f84e77672496996cb7caeb58341e09b7f53f6455919329b8823ea334f84`.
- Final: `248a44cfeab595291717eb5ace15b98c55b19a17e3fd29d87a706bc30018bd57`.
- Torso-only intermediate: `605e1d6cbe598282468694fa7424845b04f584ea1d46ec66e012dc2bb24eb0d8`.

Only `src/physics/world.ts` changes in the engine. `engine.patch` preserves its
exact before/final diff. Achieved active-reel body impulses receive midpoint
travel for both torso and lower attachments. Force limits, passive capture,
support chart/motor laws, player profiles and solver resolution stay the same.
The generic tackle exporter caption now correctly acknowledges each recorded
version's physical contact; the historical viewer files are untouched.

## Evidence and scope

- `oracle-after.json.gz` pairs with
  `../visible-help/grasp-oracle.json.gz`: 48 torso trials, two arbitrary force
  caps, four subdivisions, three rotations and active/passive controls. All 24
  active position checks fail before and pass after; all passive physical
  controls are exact. Velocity, momentum, COM, force/work domain checks pass in
  both versions. Free ground and a strong passive grip isolate body travel.
- `lower-oracle-{before,after}.json.gz` retain all 48 lower-attachment trials per
  phase and 48 exact observer/unobserved controls per phase. A single ordinary
  50 ms standing tick from rest has no ground/yaw impulse while actual bounded
  lower support moves and exchanges motor work. No foot position or mobility
  is manually frozen. The independent oracle validates **body COM travel**,
  not support-chart integration or empirical NFL gripping force.
- `hand-{before,after}.json.gz` retain 54 redirect runs per phase (nine inputs
  at six resolutions) and 12 frontal approach runs. Native 12-step versus
  192-step mean closest error changes 0.06167 to 0.06111 yd; max stays 0.18168.
  Fall/corner disagreements remain 0/9. The fine panel is a numerical reference,
  not football truth, and individual refinement errors remain nonuniform.
- `support-{before,after}.json.gz` retain all five matched captured-wrap starts,
  30 sustained trials and 20 switched-controller trajectories. Motion changes;
  fall sets do not. `local-comparison.json` records each pair and first change.
- `current-runs.json.gz`, `current-tackles.json.gz` and `current-games9.json`
  pair with the same-named baseline archives in `../visible-help/`. The fixed
  144 run inputs retain 17 lower gains, 11 higher and 116 equal; the two opposed
  finish-cause swaps remain explicit. Of 64 tackle inputs, 52 physical records
  change; outcomes, draws and whistle/down times match. Six carrier falls shift
  one 50 ms tick. The 56 primary inputs retain 14 live windows, while all eight
  retrospective witnesses finish. No physical timeout or excess motor work is
  hidden by an inspection censor.
- `comparison.json`, produced by `compare.py`, retains all local and football
  pairs, tool/fixture hashes, initial-input checks, adverse cases and both games.
  Games match initial seeds/roster only; later calls, clocks and draws diverge.
  Their results are mixed and are not a causal estimate or NFL calibration.
  Concurrent guard timing is not a benchmark.
- `tests-before.log` intentionally preserves seven expected position failures
  and two passing controls on the original engine. `lower-tests-before.log`
  preserves the torso-only checkpoint's two expected lower failures.
  `tests.log` is the final 657-test suite; `focused.log` contains 61 focused
  passes. Python's 22 tests, typecheck and build also pass.
- `torso-only/` is a separate, superseded phase. Its retained exact `world.ts`
  bytes reconstruct source605; its oracle/guards/comparisons must not be
  labelled as final248. Its torso oracle passes but the lower position defect
  remains. See `phase.json` and the review for scope.
- `film-{before,after}.json.gz` are the original nine full recordings per phase,
  copied from the unchanged tackle collector. The
  [HTML](../../../../viewer/grasp-reel.html) and
  [offline ZIP](../../../../viewer/grasp-reel.zip) contain 18 clips: seven paired
  primary geometries and two labelled retrospective witnesses. Four are live
  censors; 14 naturally finish. Parked bystanders and generated players are
  disclosed. Viewer time subtracts two seconds from ordinary engine labels.
  Full telemetry/events/profiles are exact after that shift; only the existing
  ordinary position/facing packing is quantized. Facing marks are not gaze.
  `export-integrity.json` and `browser-check.json` retain integrity, eight
  representative browser samples, filters, inspection and mobile checks.

## Reproduce and inspect

Use Node 22.23.3 with installed dependencies. Run full tests separately from
heavy simulation. Use ignored output paths, leaving published archives intact.

```sh
node --import tsx scripts/diag/grasp-integration-review.ts out/grasp-reel/oracle.json
node --import tsx scripts/diag/lower-reel-oracle.ts out/grasp-reel/lower-oracle.json
node --import tsx scripts/diag/hand-convergence.ts out/grasp-reel/hand.json
node --import tsx scripts/diag/grasp-support-convergence.ts out/grasp-reel/support.json
node --import tsx scripts/diag/run-contact-review.ts out/grasp-reel/runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/grasp-reel/tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/grasp-reel/games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/grasp-reel/compare.py
python3 data/reviews/physics-world/grasp-reel/verify-evidence.py --engine
```

The comparator rechecks the saved raw panels, requires unchanged baseline
collectors/scenarios, and deterministically regenerates the two comparison
reports (`--local-only` selects the local report). It does not resimulate.
The evidence verifier checks hashes, known before failures, final successes,
paired input/recording controls and retained censors. Omit `--engine` when
inspecting this evidence after later engine or tool changes.

For a new before measurement, archive the baseline commit into an ignored
scratch checkout and reuse dependencies. Copy the new lower oracle/tests there;
they do not affect the engine source hash. For the intermediate phase substitute
the retained `torso-only/world.ts`. Verify the engine hashes before measuring.
Never overwrite the live checkout during another agent's work or a measurement.
Regenerated timestamps/gzip bytes may differ; compare decoded measurements as
well as provenance. The manifest checks exact published bytes.

For film regeneration, decompress the two saved films to ignored JSON paths,
then pass them to `scripts/export-tackle-timing.ts` with an explicit HTML output
path. Export from the saved recordings, without resimulation. The existing
`film-check.py` reads the published paths and verifies the exact ZIP/HTML pair.
