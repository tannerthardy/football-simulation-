# Shared support/contact integration evidence

Physics remains **NOT READY**. Read
[the handoff](../../../../docs/reviews/nfl-reference-and-support-integration.md)
and [development guide](../../../../docs/PHYSICS_DEVELOPMENT.md).

Final source: `e6f1cea4f7c3d2d1a5660c00b31d12cef68a8e1c73d6574931053e7937b5ab57`.
Baseline: `dfcd686`, source
`e0ecd30f2c6c160f463f1fbbdeef599b0956587ec61f0e74ab24a222e3041a18`.
The manifest pins source, scripts, reference inputs and reviewed artifacts.

Three numerical/geometry repairs: active and passive grasp share contact height
and leg moment routing; recovery integrates the existing speed ramp over time;
mid-step entry into the controlled base continues damping for the remainder.
No physical capability constants or global solver resolution were changed.

`before-hand-convergence.json` reproduces the previous final source. The
`intermediate-hand-convergence.json` report includes the first two repairs;
`hand-convergence.json` and other unprefixed reports use the final source.
All use the same nine fixtures, 20 Hz controls and 192-step numerical reference.
The two native-12 fall disagreements and large seed-7 block-path error remain.
The refined solver is not physical truth. Earlier baseline game/tracking
evidence remains in `../shared-actuation/` and is referenced by the manifest.

`shared-capabilities.json` uses the same physical body across five tasks, four
capability variants, both reflections and 6/12/48 substeps: 120 reps. It checks
planar momentum/work accounting and finite active arm budgets, not full 3D,
support energy or real-world strength magnitudes.

`calibration-16.txt`: two independently generated eight-team leagues, seed 7,
16 games. `kinematics.txt`: four independently generated matchups, seed 5,
recorded paths. `film-outcomes.json`: six fixed-team film games, seeds 7–12,
870 clips. Cohorts and pressure/contact definitions differ. Game outcomes
are guards and cannot causally attribute a regression to one mechanic.

`initial-tackle-test-failures.txt` records obsolete assumptions: constant total
momentum after a pile member falls (must subtract measured turf impulse), and
a physical fixture assumed to survive until a progress whistle. The corrected
tests retain conservation and isolate the standing-carrier officiating rule.
`tests-overload.txt` records 265 passing assertions plus a worker RPC timeout
under concurrent game load. The final quiet `tests.txt` exits cleanly.
`browser-pitch-assumption.txt` records a browser-check assumption that every
generated cohort contains a pitch; this cohort has none. The revised check
reports release/catch counts and verifies ordering when present. Dedicated
run-execution tests prescribe pitch plays; absence here is not a physics test.

Node 22; commands from repository root:

```sh
npm test
npm run typecheck
npm run build
python3 -m unittest discover -s test -p 'test_*.py'
node --import tsx scripts/diag/hand-convergence.ts out/hand-convergence.json
node --import tsx scripts/diag/hand-fight-trace.ts out/hand-trace.json 3 1
node --import tsx scripts/diag/shared-capabilities.ts out/shared-capabilities.json
node --import tsx scripts/scenario-pack.ts out/scenarios.json
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 16 7 2
node --import tsx scripts/export-replay.ts 7 --games 6 --out viewer/film-room.html --doc
python3 scripts/film-outcomes.py viewer/film-room.html --out out/film-outcomes.json
python3 scripts/check-replay-viewer.py viewer/film-room.html
```

Raw NFL data is unnecessary for these engine checks. NFL reference aggregates,
source manifests and reproduction commands are in `../../nflverse/` and
`data/README.md`. The engine architecture remains independent of names, clubs,
career progression and the future management-game layer. PR #1 was not touched.
