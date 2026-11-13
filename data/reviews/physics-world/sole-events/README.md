# Coupled sole events: mechanics evidence

Read [the current engineering review](../../../../docs/reviews/sole-slip-events-and-contact-lifecycle.md).
This records research support work unused by production `World`. It does not
establish complete contact lifecycle, gait, NFL calibration or physics readiness.

All reports pin Node **22.23.3** and source SHA-256
`150d8ed430ec7321c9927cf967eb35824a01c721661e479edd18ec7813c07ff5`.
Source/script identities agree before and after execution; coupled comparisons
also pin their independent reference. The full suite at this source passes
**476 TypeScript tests** (one worker, 76.71 s), **22 Python tests**, typecheck and build.

| Artifact | Scope | Result |
| --- | --- | --- |
| [slip-stop-mechanics.json](slip-stop-mechanics.json) | Executed fixed-normal stop/unload, continuum comparisons, independent chord-law/body audits, representations and failed-event rollback | 4,538 ordinary intervals + 25 stop intervals; zero physical rejects or violations |
| [normal-event-reference.json](normal-event-reference.json) | Independent continuous touchdown/turn/release/replant target, exact force/loss integrals, RK4 comparisons, tiny roots and grazing classification | 19 cases; all 16 checks pass; six near-critical arithmetic refusals retained |
| [traction-regression.json](traction-regression.json) | Previous ordinary coupled shear/rocking/loaded-support panel at the new source | 7,870 intervals; zero ordinary rejects or violations |
| [normal-regression.json](normal-regression.json) | Previous normal pivot/rocking/loaded-support panel at the new source | 9,632 intervals; zero ordinary rejects or violations; all checks pass |

There are **22,065 accepted coupled body intervals** across the three kernel
panels. Expected rejected requests are separate and verify rollback; they are
not counted as successful motion. Test or interval counts are not readiness.

## Executed stop and rebound

For the principal fixture, foot mass is 2 kg, isotropic inertia .008 kg yd²,
normal stiffness 50,000 force/yd, indentation .01 yd, tangent stiffness
4,000 force/yd and friction .2. Gravity -10 yd/s² plus external center force
-480 gives achieved equilibrium normal support 500 and tangent cap 100.
These are **sensitivity assumptions**, not measured shoe/turf or NFL properties.
The contact point is at the center; legs transmit no force. Tangent motion and
external loads are collinear. Different mass/load/friction/stiffness cases
check transfer without a scenario multiplier.

Starting at 2 yd/s with saturated stretch .025 yd, exact sliding stops at
.04 s and .04 yd. Stored tangent energy **1.25** remains; plastic loss is **4**.
The event endpoint has exactly zero selected slip through the momentum solve,
and later elastic unloading converts that stored energy into motion. The
solved duration doses every physical force, including material-center forces;
no impulse or completed-state velocity correction is inserted.

The independent audit integrates the scalar piecewise chord shear law without
using the production shear integrator. It reconstructs normal force, actual
accepted body momentum, strain, state energy, external work and plastic loss.
Maximum stop-panel residuals in kg/yd/s units are:

- Per-body impulse: `2.270e-12`; energy/work: `2.773e-12`.
- Independent versus reported shear impulse: `8.327e-17`.
- Retained stop energy error: `8.882e-16`; selected stop velocity: exactly zero.
- Mirror/axis/foot-slot/split/translation response difference: `1.320e-12`.

Eight physical cases use .0016/.0008/.0004 s maximum intervals. Dynamic
endpoint errors decline by about **3.938–4.000** when intervals halve. The
largest finest mixed-coordinate endpoint error is `9.668e-5`; largest finest
traction-integral error is `1.934e-4`. These are continuum discretization
errors, distinct from conservation residuals. No-stop constant sliding cases
are already at roundoff and are not used to assert a refinement ratio.

Opposing force -40 produces a later opposite-direction yield and second stop.
The greatest event-time error across all three resolutions is `1.914e-5` s;
the second stop's finest error is about `1.201e-6` s. Initial saturated stops
agree within roundoff. An additional .00037 s partition and .37 yd/s input
exercise off-grid timing. Force exactly equal to capacity maintains sliding;
force above capacity accelerates. Neither creates a fictitious stop.

The diagnostic sums accepted durations with compensated arithmetic and splits
the final two intervals together to avoid a microscopic leftover call below
coordinate resolution. The full duration is executed in bounded pieces; no
body/shear state is changed to close the reporting clock. Genuine failed event
requests, phase-budget failures and unsupported geometry preserve the snapshot.

The stop API remains restricted. Tiny transverse motion can safely reject at
the unchanged general reversal guard. General tangent turning, variable normal
load, off-center rotating feet and simultaneous support events are unproved.
Its reported time domain is not a certified continuous root bracket.

## Normal-event target and limitations

The independent reference supplies ballistic approach and exact compressed
spring motion. Closing-only damping uses under-, critical- and overdamped
solutions; an actual normal velocity-zero turn disables that dashpot for
rebound. Touchdown and release have continuous velocity and no impact impulse.
Analytic force integrals and damping loss are compared with separately stepped
nonsmooth RK4 at 8,192/16,384/32,768/65,536 intervals. Grid phase can make
individual errors nonmonotonic; the early/late refinement envelope improves.
Finest maximum independent error is `3.846e-5`. Maximum analytic energy residual
is `1.083e-15`. Energy and kinetic-work rows are algebraically equivalent;
they are not two independent validations.

Tiny true turn/release roots are preserved. A repeated midpoint grazing root
is not classified as release. Near-grazing topology is not interval-certified.
Six near-critical cases around C=200 refuse numerically unresolved arithmetic,
while the exact critical case passes. Do not treat this target as robust
through arbitrary parameter conditioning or as a production response backend.

Ordinary normal/shear regression values remain at the preceding baseline.
The benchmark in the ordinary shear report is descriptive host timing only;
the normal and shear regressions ran concurrently after the full suite. No
real-time, connected 22-player cost or production football gain is claimed.

## Reproduction

Run from repository root with the pinned Node 22 runtime and a stable source
tree. Keep large diagnostics separate from the full test suite.

```sh
node --import tsx scripts/diag/sole-slip-events.ts out/sole-slip-events.json
node --import tsx scripts/diag/sole-normal-event-reference.ts out/sole-normal-event-reference.json
node --import tsx scripts/diag/sole-traction-stress.ts out/sole-events-traction-regression.json
node --import tsx scripts/diag/compliant-sole-stress.ts out/sole-events-normal-regression.json
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

| Script | SHA-256 |
| --- | --- |
| `sole-slip-events.ts` | `2140a86809cf3de82b0cc9c0f1a811e0122bd20b65ee6a634c532636e33a3117` |
| `sole-normal-event-reference.ts` | `1d8683f284698a5b0921a9415e38b37615eafd133a0d795f045a55f9e24d6fc3` |
| `sole-traction-reference.ts` | `946188a24d8090fd8a5b3d05a79f78ffbd0acfb4193a44ed49c85eeca42982a0` |
| `sole-traction-stress.ts` | `b13b0b713f3374f1c55c0522995493f905e31a624393569b25f16feeb56ba4b7` |
| `compliant-sole-stress.ts` | `3a7c528b6b28f38b310f1c7ae7abd8227aaaf7cf240ca591044dda0dd0819b65` |

No football cohort was rerun: `World` does not import these kernels. Native
hand-fighting fall/convergence problems remain for eventual integration.
The next design is actual normal onset/release through a shared endpoint
coordinate chart with kinematic/work and geometry checks. See the engineering
review for its contract and subsequent grip/control/World gates. PR #1 is untouched.
