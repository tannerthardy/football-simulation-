# Constraint work and local impact evidence

Physics is NOT READY. Read
[the engineering review](../../../../docs/reviews/constraint-work-and-impact-timing.md).
Production uses per-solve constraint work, legacy support, speculative impact
and mean filtered follow. Local sweep and integrated follow are explicit
experiments; neither repairs the sustained fall disagreement. No global
resolution, force/profile tuning, coverage or PR #1 changes are included.

The manifest pins source, scripts, commands, policies, verification and the
separate earlier frozen cohorts. Large substep traces stay in ignored `out/`;
reviewed summaries and seeded regression reports travel with Git. Source
fingerprints use `scripts/source-version.ts`, sorting full `src/` path strings,
then hashing path/NUL/bytes/NUL. A source fingerprint alone does not encode
constructor options; consult each world's policy.

## Reproduce

Use the pinned Node 22.23.3 (`nvm use`, or an explicit executable path). A
PATH export in one shell tool call does not persist into the next. Record
`node -p process.version` in the same command context as each measurement.
Auxiliary Node24 results are labeled separately. `node --import tsx` works in
the sandbox; the tsx CLI may fail
because its IPC pipe is unavailable. Build once to use plain Node instead.
The path below is this cloud environment's installed runtime; elsewhere set
`PHYSICS_NODE` to your Node 22.23.3 executable. The version check catches a
different runtime before running the measurements.

```sh
set -e
PHYSICS_NODE=/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin/node
"$PHYSICS_NODE" -e 'if (process.version !== "v22.23.3") throw new Error("Use Node 22.23.3")'
"$PHYSICS_NODE" --import tsx scripts/diag/constraint-work.ts out/constraint-work/work.json
"$PHYSICS_NODE" --import tsx scripts/diag/hand-convergence.ts out/constraint-work/hand.json
"$PHYSICS_NODE" --import tsx scripts/diag/shared-capabilities.ts out/constraint-work/shared.json
IMPACT_TIMING=speculative SUPPORT_INTEGRATION=mean TRACE_STEM=out/constraint-work/trace-default "$PHYSICS_NODE" --import tsx scripts/diag/sustained-contact-trace.ts
IMPACT_TIMING=local-sweep SUPPORT_INTEGRATION=mean TRACE_STEM=out/constraint-work/trace-local "$PHYSICS_NODE" --import tsx scripts/diag/sustained-contact-trace.ts
IMPACT_TIMING=local-sweep SUPPORT_INTEGRATION=integrated TRACE_STEM=out/constraint-work/trace-integrated "$PHYSICS_NODE" --import tsx scripts/diag/sustained-contact-trace.ts
"$PHYSICS_NODE" --import tsx --import ./scripts/diag/enable-local-impact.ts scripts/diag/shared-capabilities.ts out/constraint-work/shared-local.json
"$PHYSICS_NODE" node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1
"$PHYSICS_NODE" node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
"$PHYSICS_NODE" node_modules/typescript/bin/tsc -p tsconfig.json
"$PHYSICS_NODE" dist/scripts/kinematics-compare.js 4 5
"$PHYSICS_NODE" dist/scripts/calibrate.js 8 7 2
python3 -m unittest discover -s test -p 'test_*.py'
```

The three-body work diagnostic already writes both policies in one output;
its preload is unnecessary for that file. Use the `enable-update-work` preload
on normal world/scenario probes when replaying the old numerical policy.
`enable-solver-work` explicitly selects the current policy.
`enable-integrated-support` selects the frozen-envelope follow experiment;
`enable-local-impact` selects the wholly unconstrained-island event experiment.
These selectors are diagnostic imports, not production imports.

## Scope

- `work-contracts.json`: actual private World rows, three unit masses, no
  integration or gameplay; numerical-work witnesses and zero-budget solves.
- `convergence-summary.json`: production hands/frontal tackles and shared
  capability tasks; refined resolution is a numerical reference, not NFL truth.
- `impact-summary.json`: seed-19 no-grasp scene, 12/48 steps, both closed-loop
  and matched coarse controls. Observers compare exact tick states with clean
  reruns. Summaries retain first-contact, force/support and fall evidence.
- `tracking-final.txt` / `calibration-final-8.txt`: small generated-roster
  guards, not physical fitting targets. All regressions belong in the review.
- `tracking-parent-node22.txt` / `calibration-parent-node22-8.txt`: clean
  reruns of parent `94174df` with the same actual Node 22.23.3 executable and
  seeds. The manifest records each parent command and exit code. Earlier
  Node24 runs are identified in `runtime-audit-appendix.md`.
- The acquired four-subject AddBiomechanics reference is in
  [biomechanics-support](../../biomechanics-support/README.md). Normal-load timing
  and markers inform the next support lifecycle. NFL grips/contact loads and
  disturbance-aligned Moore recovery remain unvalidated.
