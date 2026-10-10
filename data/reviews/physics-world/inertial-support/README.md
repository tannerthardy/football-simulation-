# Inertial-foot research evidence

Read [the current review](../../../../docs/reviews/inertial-feet-and-support-readiness.md)
and [support integration design](../../../../docs/reviews/physical-support-integration-design.md).
**Not ready for production.** World does not import this research model.

`manifest.json` pins source, scripts, runtime and full ignored output hashes.
`gait-summary.json` preserves every case, all timestep-group statuses and
trajectory comparisons, phase-resolved slip totals and per-case peak context.
Full paths and per-landing lists remain in `out/`. All 288 cases and 96 timestep
triplets complete, but loaded-foot slip and coarse/fine controller sensitivity
remain substantial. Work closure alone is not movement realism.

`stress-summary.json` retains all rejection IDs and representative input
witnesses, plus independently reconstructed force/traction/grip caps and
linear/angular/work closure. Initially static and coupled midpoint-slip cohorts
converge 1,836/1,836. Unsplit midpoint candidates may reflect terminal velocity;
the gait driver must still integrate direction/stop/release events. The frozen
slip ablation rejects 1,101 overlong candidates for positive passive work. They
are retained event brackets, not valid trajectory intervals. Cohorts have
different additional controlled stop/static/rotor cases; random cases are paired.

`stress-multigrip-summary.json` adds four distinct constraints with repeated
owners/limbs and multiple owners. All 1,219 eligible random multigrip graphs
have independently recoverable rank-4 impulse ledgers; no cap audit is skipped.
The static and coupled-midpoint cohorts again converge 1,836/1,836, with zero
contract violations. Future redundant identical rows may be unidentifiable
from aggregate body state; an unverified cap must be reported, never replaced
by zero. This panel is numerical mechanics, not a double-team technique test.

`finite-*.json` preserve the massless comparison: lifecycle 160/160, original
24/24 and seed-4713 240/240 converge. Wider seeds 1001/2002 reject 3/6 of 1,000
cases. Their exact inputs remain in the summaries. That reduction still applies
a corrective-placement cap to normal leg retraction and is not a running model.
The preceding finite-support folder retains its original historical evidence.

The final gait probe applies a **fixed 0.01 s force pulse**, with the same total
external impulse at every timestep, through the shared gait driver. Earlier
development panels changed pulse duration with `dt`; they are historical and
not a direct before/after comparison. Cuts specify a desired speed and record
the actual cue speed. Motor timing, power and foot fractions are explicit priors.
The [two-subject model-mass extraction](../../biomechanics-support/README.md)
is not an empirical NFL strength or inertia calibration.

Use Node 22.23.3. Substitute your pinned executable outside this cloud:

```sh
set -e
PHYSICS_NODE=/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin/node
"$PHYSICS_NODE" --import tsx scripts/diag/inertial-gait.ts out/inertial-support-next/gait-final.json
"$PHYSICS_NODE" --import tsx scripts/diag/inertial-support-stress.ts out/inertial-support-next/stress-final.json --seed=9713 --cases=200 --grip-model=tether
"$PHYSICS_NODE" --import tsx scripts/diag/inertial-support-stress.ts out/inertial-support-next/stress-multigrip.json --seed=9713 --cases=200 --grip-model=tether --grips=4
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support.ts out/inertial-support-next/finite-lifecycle.json
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support-stress.ts out/inertial-support-next/finite-stress.json
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support-stress.ts out/inertial-support-next/finite-stress-seed1001.json --seed=1001 --cases=1000
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support-stress.ts out/inertial-support-next/finite-stress-seed2002.json --seed=2002 --cases=1000
"$PHYSICS_NODE" node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1
"$PHYSICS_NODE" node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
"$PHYSICS_NODE" node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

Focused reproduction is available with
`--scenario=held_step_1_grip900 --fraction=0.01 --dt=0.01 --transform=identity`.
`--quick` runs a small critical subset; it does not establish all triplets.
Stress scripts return nonzero for contract violations; inspect rejects and
projection flags even when exit status is zero. The atomic gait driver rolls
back failed ticks. Direct low-level candidates must be checked and discarded
if invalid.

351 TypeScript tests, 22 Python tests, typecheck and build pass. No new production
game cohort was needed because the new modules are unused by World. The prior
production sustained-contact failures remain unresolved; do not infer their
repair from these planar probes. No PR #1, coverage or outcome-fitting changes.
