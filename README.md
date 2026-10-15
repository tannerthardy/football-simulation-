# Gridiron Engine

A football simulation intended to support a future management game. Twenty-two
players make fallible decisions and move through one shared physics world;
blocking, tackling and running lanes should emerge from those interactions.
We build the mechanisms correctly rather than tune outcomes to NFL averages.

## Where to find things

- **Development reference:** `develop` at accepted
  `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, including merged #12.
  [Current status](docs/STATUS.md) and [issue register](docs/ISSUES.md) distinguish
  that tree from pending integration candidates and historical evidence.
- **Historical comparisons:** [baseline/profile and known failures](docs/BASELINE.md)
  pin `4ded6b6`; the historical comparison remains unchanged.
- **Simulation:** [single play](scripts/sim-play.ts), [game](scripts/sim-game.ts),
  [replay exporter](scripts/export-replay.ts); football execution in
  [src/sim](src/sim), shared movement/contact in [src/physics](src/physics),
  [players](src/players), [playbook](src/playbook), [game](src/game) and [league](src/league).
- **Integration and ownership:** [scope, flags and receipts](docs/INTEGRATION.md),
  [workboard](docs/WORKBOARD.md), [agent instructions](CLAUDE.md).
  The [current candidate ledger](docs/INTEGRATION.md#current-candidate-2026-10-15)
  records exact extractions, dependencies, verification and remaining decisions.
- **Testing:** [tiny decision-driven loop and cost policy](docs/TESTING_COSTS.md),
  [interpret improvement/regression](docs/BEHAVIOR_REVIEW.md),
  [validation](docs/VALIDATION.md). Contributors supply focused receipts;
  one integration owner verifies the exact combined candidate.
- **Branches and recovery:** [branch map, cleanup record and pending decisions](docs/BRANCHES.md).
- **Evidence and research:** [current receipts](data/reviews/current),
  [pinned reviews](docs/reviews), [archived research](docs/archive/reviews),
  [data/replay retrieval](data/README.md). Historical evidence describes its
  recorded code/settings, not today's implemented behavior; proposals in the
  [football handbook](docs/football-handbook/README.md) remain proposals.

## Quick start

Requires Node 22.23.3. Record the exact source and settings before comparisons.

```sh
npm ci
npm run baseline:info -- --candidate
npm run sim:game -- 7 --pbp
npm run replay -- 7 --games 6 --doc
```

The game/replay examples simulate games; run them when that is your task.
For edits, use the smallest relevant check from the testing policy. Shared-suite
verification belongs to the integration owner, not every contributor.

The replay command writes `out/replay.html`, containing its own play data.
Open that file in a browser. Group/filter by concept, front, coverage or game;
share the film version, play ID and timestamp when reporting a problem.
Player ticks show body facing, not eyes. Event markers and player inspection
help separate the path from the result. A replay template alone has no plays.

For the existing guided run film and shared NFL inputs, see the
[data guide](data/README.md). Generated libraries are archived outside the
current tracked checkout; its retrieval instructions preserve collaborator
access. Scripts, the viewer template and compact references remain tracked.

## Layout

`src/physics` owns movement/contact; `src/sim` owns football controllers and
perception; `src/playbook` owns installed calls and alignment; `src/players`
owns profiles; `src/game` owns the game; `scripts` contains labs and exporters.
`test/integration` holds slow game panels, `test/research` holds paused physics
experiments. `npm test` keeps production contracts in the normal development
loop when relevant; `npm run test:all` retains every TypeScript assertion.

Start assigned feature work from the shared baseline and push its feature
branch. Primary retains physics promotion ownership. Do not touch main or PR #1.
