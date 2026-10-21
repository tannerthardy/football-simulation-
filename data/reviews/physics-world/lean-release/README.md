# Finite lean release and literature execution audit

Read [the review and candidate fixes](../../../../docs/reviews/physics-step-back-and-local-repair.md)
first. **NOT READY:** the isolated release is repaired, but live fall disagreement,
long-contact drift, mirror failure and force-infeasible held feet remain.

Baseline is commit `844145cfa1e3506789ee204b0bef2915cb03689f`, source
`23fd4c510883618b454f75354cfafcd7540c0b6c08de0c4906358cb1e9769296`.
Final engine source is
`0f1124fde702bfd754944b10bc2d35f2ebf4914c1a2fa864e701afb6683b47ad`.
Source identity hashes lexically sorted **relative path strings** under `src/`,
then NUL, bytes, NUL; scripts/docs/viewer files are separately hashed in the
manifest. Baseline measurements use an isolated archive, not a moving working
tree. No force, traction, strength or global-subdivision constants were fitted.

## What changed and what remains wrong

The world transfers already-committed unsupported lean before force relaxation
can erase it. A bounded local projection recomputes the same body's support
availability after each finite transfer. The transfer consumes remaining lean;
it adds no new impulse or muscle allowance. The world reports the transferred
geometry, remaining force-equivalent residual and maximum projection iterations.
This is a reduced support calculation, not a complete human energy model.

| Measurement | Baseline | Final |
|---|---:|---:|
| 900-unit lean transfer, 12 / 192 steps | 0.18569 / 0.22799 yd | 0.23482 / 0.23482 yd |
| 1100-unit lean transfer, 12 / 192 steps | 0.47271 / 0.63691 yd | 0.66202 / 0.66202 yd |
| Native hand-fight fall disagreements against 192 | 2/9 | **3/9** |
| Native hand-fight worst approach error | 0.82215 yd | 0.82204 yd |
| Long-contact worst defender ending error, 12 vs 48 | 8.50170 yd | 8.10155 yd |
| Long-contact worst carrier ending error, 12 vs 48 | 11.84205 yd | 10.94313 yd |
| Long-contact full-path mirror error, either actor | 0.69060 yd | 0.69060 yd |
| Shared-capability native mean/max position error vs 48 | 0.03017 / 0.07510 yd | 0.02973 / 0.06903 yd |
| Points/team-game, 16-game guard | 32.03 | **35.28** |
| 20+ yd completions/attempt | 14.26% | **16.14%** |
| YAC/completion | 8.88 yd | **9.17 yd** |
| Run yards/carry | 3.91 yd | 4.46 yd |

Lean rows use the fixed 100 kg profile, zero initial deviation and no retained
sensed-load memory. Final largest local residual is 3.161e-9 kg·yd/s²; one
1100-unit case reaches the 64-iteration bound. This is an exposed residual,
not a proven unique root. The added contract also includes recentering and
mirrored initial deviations; later fall timing is outside that contract.

The matched live wrap still reverses the QB's fall across resolutions: baseline
falls at 48/96/192; final falls at 24/48/96/192. Neither falls at 6/12. All trials
within each revision use identical incoming physical state and the same
192-step pre-wrap path. The repair does **not** resolve that reversal.

A zero-capacity leg hold still creates zero grip impulse and nonzero foot
restriction (native maximum lock 0.502). The next repair must give that
restraint a sustainable load path through the existing grip budget. Multiplying
lock by an arbitrary strength factor would not establish feasibility.

## Retained evidence and cohorts

- `support-before.json` / `support-after.json`: 48 lean trials (four incoming
  lean values, retained sensed-load memory on/off, six subdivisions) and 20
  leg trials (no grasp plus four capacities, four subdivisions). Four lean
  ticks and five leg ticks at 20 Hz. Raw controlled data retained in full.
- `wrap-feedback-before.json` / `wrap-feedback-after.json`: seed 3, power 1,
  real controllers and officiating; switch only the first incoming grasp step
  to 6/12/24/48/96/192. Full tick snapshots and selected substep markers retain
  intents, actual load/slip/held feet, support and direct feet-phase transfer.
- `hand-convergence.json`: nine seed/power fixtures, six subdivisions, 192 as
  numerical reference. The matching baseline is in `../grip-budget/`.
- `moving-contact-before.json` / `moving-contact-after.json`: 96 trials,
  roster seeds 7/19/31/43, both mirrors, crossing/near-crossing/frontal/trailing,
  6/12/48 subdivisions, five seconds. Straight 6 yd/s carrier; no acquisition
  rolls, wraps, evasion or scheme assignments. Both actors' ending differences
  and full native mirror-path maxima are retained, including the two fall-set
  disagreements. This is not an NFL tackle rate.
- `shared-capabilities.json`: 120 trials, five tasks (anchor, double, shed,
  absorbed contact, jam), four common profile variants, both mirrors and
  6/12/48 subdivisions. Baseline is in `../grip-budget/`.
- `kinematics.txt`: four games, seed 5; descriptive tracking-style guard.
  Geometric two-yard pressure is 33.6%, first run contact averages 0.91 yd,
  DL speed at 0.5 s is 1.58 yd/s and run peak acceleration is 4.74 yd/s².
- `calibration-16.txt`: sixteen games, seed 7, two generated leagues. Changes
  in execution affect RNG/calling/roster exposure; these means are guards,
  not isolated physics treatment effects. Baseline logs are in `../grip-budget/`.
- Test/typecheck/build logs: 287 engine tests, 22 Python data tests, both
  compiler checks pass. These checks do not establish physical realism.

The moving-contact reductions retain original profiles/metrics, initial/final
samples and sample count, plus matched 12-versus-48 and mirror aggregates.
Mirror error is the maximum over corresponding native path samples after
reflecting the lateral coordinate, for **both** actors. Continuous paths remain
in the ignored raw files named and hashed in each reduction.

Wrap reductions retain every tick and indexed first/last substeps plus selected
state/slip/direct-transfer boundary markers. They do not retain every continuous
substep; raw paths/hashes and original substep counts are included. JSON nulls
for nonfinite runtime timestamps make these witnesses unsuitable as reusable
`PlaySim` saves. Baseline projection diagnostics are **unmeasured nulls**, not
observed zero residuals. Intermediate experiments are not part of this evidence.

## Literature applications

[Offense process evidence](../offense-process/README.md) covers 84 four-second
reps across seven concepts and three fronts. It separates planned doubles from
concurrent physical load, keeper/climber release, puller contact, reachable mesh
and carrier support. All 84 observer/plain pairs match complete state/events
and the next RNG draw. Its small cells are execution witnesses, not scheme rates.

[Coverage process evidence](../coverage-process/README.md) covers eight fixtures
with zero narrow contract violations, seven inspection points and all 342
recorded state/key transitions. The getter copies already-consumed declarations
and current rule branches without perceiving again or choosing again. A
relationship ending or overlapping carry is not automatically a busted coverage.

[Contact literature review](../../../../docs/reviews/contact-literature-applications.md)
connects recoverable base, sustainable restraint, achievable arrival, geometry
and finite commitment to the universal world. Supplied books are teaching aids;
their citations/installations have not been independently verified as NFL facts.
No offensive or coverage controller expansion is included in this pass.

## Reproduction

Use Node 22 and installed repository dependencies. Run from the final checkout:

```sh
node --import tsx scripts/diag/support-budget.ts out/support-budget.json
node --import tsx scripts/diag/wrap-feedback.ts out/wrap-feedback.json
node --import tsx scripts/diag/hand-convergence.ts out/hand-convergence.json
node --import tsx scripts/diag/moving-contact.ts out/moving-contact.json
node --import tsx scripts/diag/shared-capabilities.ts out/shared-capabilities.json
node --import tsx scripts/diag/run-concept-process.ts out/run-process.json --verify
node --import tsx scripts/diag/coverage-contracts.ts out/coverage-contracts.json
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 16 7 2
npm test
npm run test:data
npm run typecheck
npm run build
```

To reconstruct the baseline, create an archive directory below `out/`, extract
`git archive 844145c src scripts test package.json package-lock.json tsconfig.json
vitest.config.ts` into it and link its `node_modules` to the root installation.
Copy the final `support-budget.ts` and `wrap-feedback.ts` into its `scripts/diag/`;
these are new observational probes rather than baseline engine changes. Run
them **from the archive root** so imports and source identity use archived code.
The other mechanical scripts are unchanged between revisions. Check the baseline
source hash before accepting the output. Both full probes generate raw paths;
the committed reductions are described above rather than substituted for full
raw simulation data.

No new NFL data or empirical contact-force fit was produced. Existing BDB and
nflverse reference hashes are pinned in the manifest. Tracking supplies movement
and task evidence, not ground force/grip measurements. Historical scramble/sack
classification and differing YBC definitions remain open: generic calibration
targets and first-contact tracking references must not be blended. Runtime logs
collected under varying concurrency do not establish performance change.

Previous published film/inspection artifacts remain on their recorded source
`23fd4c…`, with hashes in `../grip-budget/manifest.json`. They were not regenerated
or browser-revalidated for this repair. PR #1 was not touched.
