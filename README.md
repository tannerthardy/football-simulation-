# Gridiron Engine

A football simulation intended to support a future management game. Twenty-two
players make fallible decisions and move through one shared physics world;
blocking, tackling and running lanes should emerge from those interactions.
We build the mechanisms correctly rather than tune outcomes to NFL averages.

## Where to find things

- **Development reference:** `codex/run-game-integration` at historical
  `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` remains the designated starting point.
  [Draft #8](https://github.com/tannerthardy/football-simulation-/pull/8) is the
  verified policy/tooling candidate; adoption is **pending**. Its reviewed tree
  is `c98c2fa0e8de760c980ad3852e0ec85abcfadc8f`; subsequent #8 navigation adds
  documentation only. Production simulation code is unchanged.
- **Historical comparisons:** [baseline/profile and known failures](docs/BASELINE.md)
  pin `4ded6b6`; new reference adoption must preserve that exact comparison.
- **Simulation:** [single play](scripts/sim-play.ts), [game](scripts/sim-game.ts),
  [replay exporter](scripts/export-replay.ts); football execution in
  [src/sim](src/sim), shared movement/contact in [src/physics](src/physics),
  [players](src/players), [playbook](src/playbook), [game](src/game) and [league](src/league).
- **Integration and ownership:** [scope, flags and receipts](docs/INTEGRATION.md),
  [workboard](docs/WORKBOARD.md), [agent instructions](CLAUDE.md).
  [Draft #10](https://github.com/tannerthardy/football-simulation-/pull/10) is the
  separately verified component correction; runtime promotion remains pending.
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
npm run baseline:info
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
