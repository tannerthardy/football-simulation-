# Constraint/support load audit and passive friction repair

Read [the current review](../../../../docs/reviews/constraint-support-and-ground-friction.md)
first. **NOT READY:** valid leg grips still lack a sustainable foot-load model;
native hand falls and coarse/fine prolonged contact still disagree. Pressure,
sacks and some other football guards regress. No force/profile fitting or
global subdivision increase was used.

Baseline commit is `ba42c297883f8d1308ba47dbf44fa1a52aa561a2`, engine source
`0f1124fde702bfd754944b10bc2d35f2ebf4914c1a2fa864e701afb6683b47ad`.
Adopted source is
`d040bd04f864b12ba5f49250b7ca53b3609dd25bd41dfa3326d0b0181917fd4a`.
Source hashes include lexically sorted relative **path strings** under `src/`,
NUL, file bytes, NUL. The manifest separately pins scripts/tests/docs, historical
references, rejected experiments, raw observations and retained evidence.

## What is retained

- `comparison.json`: reduced before/after foot observations, long mirrored
  contact traces and the adopted 96-trial moving-contact panel. The foot panel
  has 162 trials/revision and includes final position/velocity/spin/support
  witnesses. Maximum lock is observed during support update after force and
  interval travel. No-grasp controls retain the same zero-force numerical
  island. Experimental foot impulse/limit values are null in the adopted source.
- Long-contact rows cover seeds 7/19, 12/48 subdivisions and ordinary versus
  identical reflected controls, eight mirrored pairs per revision. Full-path
  maximum position error includes both bodies. First-divergence witnesses,
  maximum absolute spin and final reflected-error components remain; full
  100-frame reports are reproducible under ignored `out/` and checksummed.
- Moving rows preserve all 96 profiles/metrics, first/final samples and sample
  counts. Native-versus-48 ending error is Euclidean distance for each actor;
  native mirror error is the maximum distance over all 100 matching frames,
  reflecting around `CENTER_Y = 80/3`. Sorted fall sets are compared separately.
  The matching baseline is `../lean-release/moving-contact-after.json`.
- `hand-after.json`: nine ordinary-technique fixtures at six resolutions plus
  frontal-approach sensitivity guards. The source-matched baseline is
  `../lean-release/hand-convergence.json`.
- `shared-after.json`: 120 reps across anchor, double drive, shed, absorbed hit
  and jam with one shared capability set and four profile variants. These
  mechanical controllers are separate from technique validation.
- `grip-after.json`: nine isolated and 27 real-technique trials; no observed
  transmitted-force budget violation. This does not validate the grip envelope
  against measured human forces.
- `scenarios-after.json`: the six real-technique interaction families, including
  both successful basic frontal tackle speeds. No new outcome assertions were
  weakened to accept the repair.
- `wrap-summary.json`: retained live QB wrap summaries and raw file hashes.
  All six post-wrap resolutions use identical incoming 192-step state within
  their revision; raw substep traces remain reproducible. The fall reversal
  remains at 6/12 versus 24/48/96/192.
- `calibration-before-8.txt` / `calibration-after-8.txt`: seed 7, two independent
  leagues, four games each. Use these matching eight-game logs, not the prior
  16-game means. `tracking-after.txt` uses four seed-5 games; matching baseline
  is `../lean-release/kinematics.txt`. These are descriptive guards; events and
  random draw paths change downstream. Elapsed times are not performance claims.
- Validation logs: 290 TypeScript tests/28 files, 22 Python tests, typecheck and
  build. `regression-tests-before.txt` intentionally records the two new passive
  contracts failing on the archived baseline; it is not an adopted test failure.
- Retained text logs remove trailing whitespace/extra final blank lines only;
  original stdout hashes remain in the manifest. Numerical content is unchanged.
- `rejected/`: the second support-equivalent foot candidate's **unapplied**, zero-context patch,
  failed focused test and eight-game log. `summary.json` pins both experimental
  source variants, raw files and selected witnesses. The first version's clean
  frontal tackles failed at both speeds/all resolutions; the revised recovery
  demand still fails the basic frontal tackle test. A better QB fall summary is
  not evidence to retain a mechanically invalid shortcut.

The reducer is `scripts/diag/constraint-support-summary.py`; it verifies raw
before/after engine pins and strips repeated full bodies/frames. Reconstruct its
inputs with the diagnostics listed in `data/README.md`. It does not run the
engine, fit parameters or alter controller observations. There are no new raw
NFL or AddBiomechanics subject measurements in this pass.

## Reproduction

Run from the repository root with Node 22 and installed dependencies. Keep the
engine frozen until each measurement completes. Raw adopted reports:

```sh
node --import tsx scripts/diag/foot-contact-audit.ts out/foot-restraint/foot-after.json
node --import tsx scripts/diag/long-contact-trace.ts out/foot-restraint/long-trace-after.json
node --import tsx scripts/diag/moving-contact.ts out/foot-restraint/moving-after.json
node --import tsx scripts/diag/hand-convergence.ts out/foot-restraint/hand-after.json
node --import tsx scripts/diag/shared-capabilities.ts out/foot-restraint/shared-after.json
node --import tsx scripts/diag/grip-budget.ts out/foot-restraint/grip-after.json
node --import tsx scripts/diag/wrap-feedback.ts out/foot-restraint/wrap-after.json
node --import tsx scripts/scenario-pack.ts out/foot-restraint/scenarios-after.json
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 8 7 2
```

For before reports, extract a clean archive without checking out over working
changes. The new diagnostics are observational and must be copied into it:

```sh
mkdir -p out/foot-restraint-baseline
git archive ba42c29 src scripts test package.json package-lock.json tsconfig.json vitest.config.ts > out/foot-restraint-baseline.tar
tar -xf out/foot-restraint-baseline.tar -C out/foot-restraint-baseline
ln -s ../../node_modules out/foot-restraint-baseline/node_modules
cp scripts/diag/foot-contact-audit.ts scripts/diag/long-contact-trace.ts out/foot-restraint-baseline/scripts/diag/
cp test/actuation.test.ts out/foot-restraint-baseline/test/
cd out/foot-restraint-baseline
node --import tsx scripts/diag/foot-contact-audit.ts ../foot-restraint/foot-before.json
node --import tsx scripts/diag/long-contact-trace.ts ../foot-restraint/long-trace-before.json
node node_modules/vitest/vitest.mjs run test/actuation.test.ts -t 'passive ground friction|passive stop'
cd ../..
python3 scripts/diag/constraint-support-summary.py out/foot-restraint out/constraint-review
```

The targeted baseline test command should fail. Do not weaken those contracts.
An existing archive/link must be handled deliberately, rather than extracting
over a modified engine. Use `calibrate.ts 8 7 2` and `kinematics-compare.ts 4 5`
inside the same isolated baseline if reproducing the football logs.

The unchanged film/inspection viewer is pinned to source `23fd4c5…`, not either
engine here. Owner LAB-P001–005 observations are queued in the review; facing
ticks are not gaze. No browser revalidation or viewer regeneration was performed
for this physics-only change. PR #1 was not touched.
