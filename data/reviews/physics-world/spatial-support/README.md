# Coupled spatial support: evidence

Source: `85380f9939728fcab866857478016f7707865fe06bf79634e08e003f90895148`.
Runtime: Node **22.23.3**. Each diagnostic records source and script SHA256 at
start/end and rejects a changing source. Do not relabel these as evidence for
a later engine revision.

Read [the current review](../../../../docs/reviews/spatial-feet-and-ground-readiness.md).
All modules are unused by production `World`; these reports establish local
component mechanics, not gait, falls or NFL readiness.

- `free-flight-and-impact.json`: 24 seeded input fixtures, three local
  resolutions, base/mirror/translated variants; 216 complete trajectories,
  3,024 intervals, 120 impacts. All independent checks pass; both deliberately
  insufficient numerical controls reject atomically.
- `ground-contact.json`: one/two established plants, small foot inertia,
  friction .05/.2/.8, torso forces 0/10/50/100, .004/.002/.001 s steps,
  .012/.04 s horizons, mirrored/translated variants. 432 complete trajectories,
  6,552 intervals; no ordinary rejection or independent violation. These
  intervals do not certify absence of an interior contact event.
- `sole-impact.json`: two fixed seeds and mirrors, 4,000 plastic impacts.
  Frozen actual pose; no spring or ground force integrated across time.
- `conditioning.json`: repeated low-inertia stance/shove regression and all
  three long hidden-release controls. The latter reject due to excessive
  elastic phase, not a proven earliest-event enclosure.

Free-flight/ground publications omit successful final states only, retaining
their deterministic hashes, input fixtures, maxima, comparisons, all failures
and unabridged output hashes. The scripts regenerate complete outputs. Results
include all cases; no solver rejection is filtered into a successful panel.

```sh
node --import tsx scripts/diag/spatial-support-stress.ts out/spatial-support-stress.json
node --import tsx scripts/diag/spatial-ground-stress.ts out/spatial-ground-stress.json
node --import tsx scripts/diag/sole-contact-stress.ts out/sole-contact-stress.json
node --import tsx scripts/diag/spatial-ground-conditioning.ts \
  --output=out/spatial-ground-conditioning.json --duration=.012
```

Use Node 22 from `.nvmrc` (the cloud installation is
`/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin/node`). Validation commands:

```sh
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

Avoid running the full-game tests concurrently with CPU-heavy diagnostics;
worker RPC timeouts do not produce a clean verification run.
