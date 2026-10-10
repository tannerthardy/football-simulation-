# Normal sole-compliance mechanics

Source: `05375672a5a6a56904169fc33627dd0fc2ba1ff03bf0088bcd3c7bddb344dfe9`.
Runtime: Node **22.23.3**. Script SHA256:
`3a7c528b6b28f38b310f1c7ae7abd8227aaaf7cf240ca591044dda0dd0819b65`.
Start/end hashes match; stale source/script output rejects.

Read [the current support review](../../../../docs/reviews/sole-compliance-and-next-support-step.md).
`mechanics.json` retains the complete diagnostic output, all inputs, independent
continuous references, resolutions, endpoint states, failure cases and checks.
It uses the preceding rigid-pivot reference by recorded file SHA256; that pure
mechanics reference retains its own historical source pin.

The 9,632 accepted intervals cover one-point pitch, weighted heel/toe rocking,
loaded small feet/passive legs/torso, coordinate changes and coincident-point
subdivision. Work/momentum are reconstructed independently from returned states
and declared input laws. Oversized local elastic/damping budgets and interior
onset reject atomically. K/C and sole shape are sensitivity assumptions, not
measured NFL material parameters. Normal-only research code remains unused by
`World` and has no friction, complete contact lifecycle or active gait.

Run from the repository root with Node 22:

```sh
node --import tsx scripts/diag/compliant-sole-stress.ts out/compliant-sole-stress.json
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

Run the full suite separately from CPU-heavy diagnostics. Source-pinned reports
are mechanics evidence for their stated regimes, not a physics readiness or
live-football performance certification.

Validation: **440 TypeScript tests, 22 Python tests, typecheck and build pass**.
