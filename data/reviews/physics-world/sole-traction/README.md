# Coupled finite sole traction: mechanics evidence

This records an unused research-model increment, not a production football
calibration or a physics-ready result. Read the
[engineering review](../../../../docs/reviews/sole-traction-and-next-physics-step.md).
Production `World` and replay behavior are unchanged. The material values
below are sensitivity fixtures, not measured NFL shoe/turf or strength values.

All four reports use Node 22.23.3 and source SHA-256
`d7f700a0a2255a7844f34181ed6389b62629c3318a29af1541bcd6699b6a8151`.
Each records equal source/script identifiers before and after execution.
The coupled script also checks its independent reference file's identity.

| Artifact | Scope | Result |
| --- | --- | --- |
| [shear-mechanics.json](shear-mechanics.json) | Exact branches, independent constant-cap vector integrals, independent fine plastic-return integration, covariance, area splitting and subdivision | 202 constitutive calls; zero violations |
| [coupled-mechanics.json](coupled-mechanics.json) | Loaded/sliding finite feet, two-point rocking, passive-leg loaded torso/feet, covariance and cost | 7,870 accepted intervals; zero ordinary rejects or mechanics violations |
| [one-d-reference.json](one-d-reference.json) | Independent exact oscillator/yield/slide/stop/unload reference; 13 cases, four partitions and mirrors | All 11 declared checks pass |
| [normal-regression.json](normal-regression.json) | Previous independent normal-support pivot/rocking/loaded panel at the new source | 9,632 intervals; zero ordinary rejects or violations; all declared checks pass |

## What is checked independently

The isolated reference does not use the production quadrature, half-angle
solution or its energy identity as a force oracle. Exact tanh/sech primitives
test rapidly turning yielded traction, including constitutive phase 1e6.
Affine-capacity cases retain the difference between 32,768- and 65,536-step
independent incremental plastic-return references. Dissipation is independently
summed from plastic flow, not defined by subtracting energies. A nearly
stationary cap-collapse case resolves a pressure-release force layer that
previously returned an accepted zero impulse. Quadrature error estimates are
still estimates, not certified interval bounds.

The coupled audit independently reconstructs energy from body velocities,
finite inertias, gravity, leg length/potential, normal indentation and saved
shear stretch. It reconstructs each body's impulse and torque using actual
material points, known input loads and the constitutive forces. It compares
reported attachment work with actual point displacement and independently
checks the tangent impulse against `μ*Jnormal`. The normal support is the
achieved candidate reaction, not a scheduled bodyweight share.

Maximum independent residuals for the coupled panel, in kg/yd/s units:

- Energy/work: `2.072e-10`.
- Per-body linear impulse: `1.328e-10`.
- Per-body spin impulse: `7.055e-13`.
- Tangent impulse above the normal-derived capacity: `2.082e-17`.
- Actual tangent attachment-work discrepancy: `3.846e-15`.
- Energy reconstructed from saved state versus reported energy: `1.365e-12`.
- Loaded-stance body covariance: `2.719e-12`; shear-stretch covariance:
  `3.227e-15`. Saturated collocated-split velocity error: `1.085e-16`.

Ten 1D cases compare with the independent exact constant-normal-load reference.
Foot mass is 2 kg, inertia .008 kg yd², actual normal load 500, normal K 50,000,
tangent Kt 1,000/4,000, μ .2/.6 and initial speed .1/2 yd/s. Known central
downward load 480 plus gravity balances normal support. Zero-slip external
force steps 40 and 120 distinguish sub-cap elastic response from yielded
sliding. Halving .0004/.0002/.0001 s intervals reduces endpoint errors by
3.993–4.001. The finest mixed-coordinate endpoint error is `7.372e-6`;
the finest traction-integral error is `1.165e-5`. The greatest first-yield
timing error across the three resolutions is `6.832e-7` s. These are local
material mechanics measurements, not snap reactions or NFL tackle timing.

The rocking foot uses two actual heel/toe points, mass 2, inertia .008, normal
K 50,000/C 60, tangent Kt 40,000, μ .4 and a .01 s horizon. An independent
explicit planar method with radial plastic returns supplies its continuous
target; it deliberately differs from Cayley/discrete-gradient production
integration. Reference refinements of 5e-8/2.5e-8 s differ by `1.517e-5`.
The coupled .0002/.0001/.00005 s errors decline from .0003014 to .00008888
to .00003441, approaching that first-order reference floor. They are not
claimed as an exact fourfold order measurement. Both points stay compressed.

The stance panel has a 96 kg torso, two 2 kg/.008-inertia feet, passive legs,
four weighted points per foot, normal K 100,000/C 80, tangent Kt 5,000,
μ .5 and a known shoulder load. It checks reflected, rotated, translated,
reordered and collocated-split representations at three resolutions.

A dedicated expected rejection retains a nearly zero net chord with initial
outward yield motion followed by reversal. The independent exact reference
shows about .00097656 plastic loss before stopping and spring unloading.
Body/shear rollback is checked; a zero-loss elastic reflection is not accepted.
Focused tests also cover initial over-cap return, legitimate elastic positive
work, zero flight traction, stale material/patch state and phase rejection.
Endpoint guards remain incomplete for arbitrary interior slip histories.

The benchmark records 25 loaded sliding intervals at 1/2/4/8 **collocated**
patches per foot. Each row records wall time, 950 full candidate evaluations
and all constitutive/quadrature calls, including finite differences. The
scenario is deliberately identical under splitting. Host timing is descriptive;
there is no claimed real-time or connected 22-player cost gate. New spatial
normal/shear/control mechanics must pass lifecycle and actual World gates
before replacing legacy response.

## Reproduction

Run from the repository root using Node 22.23.3 (`.nvmrc`), with a stable source
tree. Do not run the large diagnostics concurrently with the full test suite.
Outputs below stay ignored under `out/` unless explicitly archived.

```sh
node --import tsx scripts/diag/sole-shear-stress.ts out/sole-shear-stress.json
node --import tsx scripts/diag/sole-traction-reference.ts out/sole-traction-reference.json
node --import tsx scripts/diag/sole-traction-stress.ts out/sole-traction-stress.json
node --import tsx scripts/diag/compliant-sole-stress.ts out/sole-traction-normal-regression.json
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

Script SHA-256 identifiers:

| Script | SHA-256 |
| --- | --- |
| `sole-shear-stress.ts` | `01b2bc50598e7a61b9744a6efef660755f4a176df3de73d6eb1fce7ef8f711d1` |
| `sole-traction-reference.ts` | `946188a24d8090fd8a5b3d05a79f78ffbd0acfb4193a44ed49c85eeca42982a0` |
| `sole-traction-stress.ts` | `b13b0b713f3374f1c55c0522995493f905e31a624393569b25f16feeb56ba4b7` |
| `compliant-sole-stress.ts` | `3a7c528b6b28f38b310f1c7ae7abd8227aaaf7cf240ca591044dda0dd0819b65` |

Authoritative validation: **465 TypeScript tests, 22 Python tests, typecheck and
build pass**. The full TypeScript suite ran alone with one worker, in 82.24 s.
No football cohort was rerun because the production World path did not change.
No pressure, run efficiency, tackle-success or native hand-fall improvement
is claimed. Physics remains NOT READY; PR #1 was not touched.
