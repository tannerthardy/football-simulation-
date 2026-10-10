# Finite support mechanical evidence

Read [the engineering review](../../../../docs/reviews/finite-support-foundation.md).
Physics is NOT READY. This is an unused research kernel; production World keeps
legacy support. No force/profile fitting, global resolution increase, coverage
expansion or PR #1 change is included.

- `manifest.json`: runtime/source/script pins, options and required checks.
- `stress.json`, `stress-ablation.json`: 24 original and 240 seeded candidates,
  independent command-budget reconstruction, maxima and reproducible rejected
  input snapshots. A nonconvergent candidate is rejected, not a passed case.
- `lifecycle-summary.json`: mirrored/partitioned finite steps across four body
  profiles and five conditions, with rejected cases and mirror-status failures.
  Full interval reports stay in ignored `out/` and are reproduced by the script.
- `production-summary.json`: unchanged actual World hand/tackle/shared-task
  guards. These do not run the new kernel or prove its football transfer.

Use Node 22.23.3. Source hashing is `scripts/source-version.ts`; options and
runtime are separate measurement coordinates. This cloud's executable is below;
elsewhere substitute your pinned executable. PATH from one tool call does not
persist into another.

```sh
set -e
PHYSICS_NODE=/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin/node
"$PHYSICS_NODE" -e 'if (process.version !== "v22.23.3") throw new Error("Use Node 22.23.3")'
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support.ts out/finite-support/lifecycle.json
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support.ts out/finite-support/lifecycle-ablation.json --no-block
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support-stress.ts out/finite-support/stress.json
"$PHYSICS_NODE" --import tsx scripts/diag/finite-support-stress.ts out/finite-support/stress-ablation.json --no-block
"$PHYSICS_NODE" --import tsx scripts/diag/hand-convergence.ts out/finite-support/production-hand.json
"$PHYSICS_NODE" --import tsx scripts/diag/shared-capabilities.ts out/finite-support/production-shared.json
"$PHYSICS_NODE" node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1
"$PHYSICS_NODE" node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
"$PHYSICS_NODE" node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

The mechanical scripts exit nonzero for contract violations. Their zero exit
status means the contracts checked on accepted cases hold; inspect rejection
counts and status disagreements separately. The low-level solve mutates its
diagnostic candidate even on failure; the lifecycle driver rolls its whole tick
back before throwing. The record explicitly distinguishes those contracts.

No new full-game statistical cohort or NFL fit was run: production motion is
unchanged and full-game reproducibility remains covered by the existing suite.
The previous production cohort is in
[constraint-work](../constraint-work/README.md). The acquired small empirical
reference and its limitations are in
[biomechanics-support](../../biomechanics-support/README.md).
