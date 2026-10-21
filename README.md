# Gridiron Engine

A football simulation intended to support a future management game. Twenty-two
players make fallible decisions and move through one shared physics world;
blocking, tackling and running lanes should emerge from those interactions.
We build the mechanisms correctly rather than tune outcomes to NFL averages.

## Where to find things

- **Development reference:** fetch `develop` and use the exact accepted pin in the
  [canonical integration queue](https://github.com/tannerthardy/football-simulation-/blob/codex/integration-queue/docs/INTEGRATION.md#accepted-development).
  The [reviewed #189 checkpoint](docs/reviews/finished-controller-integration.md)
  combines run/support/pursuit corrections, the approved yaw motor and achieved
  NFL rules/official accounting. Its exact freeze, game comparison, film and
  experimental holds are recorded there; adoption is distinct from research.
- **Historical comparisons:** [baseline/profile and known failures](docs/BASELINE.md)
  retain `4ded6b6`; it is not the new-task development starting point.
- **Simulation:** [single play](scripts/sim-play.ts), [game](scripts/sim-game.ts),
  [replay exporter](scripts/export-replay.ts); football execution in
  [src/sim](src/sim), shared movement/contact in [src/physics](src/physics),
  [players](src/players), [playbook](src/playbook), [game](src/game) and [league](src/league).
- **Integration and ownership:** [scope, flags and receipts](docs/INTEGRATION.md),
  [workboard](docs/WORKBOARD.md), [agent instructions](AGENTS.md).
  Follow the [safe update/handoff workflow](docs/INTEGRATION.md#agent-workflow);
  contributors keep independent branches and supply focused evidence.
- **Testing:** [tiny decision-driven loop and cost policy](docs/TESTING_COSTS.md),
  [interpret improvement/regression](docs/BEHAVIOR_REVIEW.md),
  [validation](docs/VALIDATION.md). Contributors supply focused receipts;
  one integration owner verifies the exact combined candidate.
- **Branches and recovery:** [branch map, cleanup record and pending decisions](docs/BRANCHES.md).
- **Football handbook and source sheets:** [handbook](docs/football-handbook/README.md),
  [pulling guards and moving run-game footwork](docs/football-handbook/moving-run-footwork.md),
  [HonestNFL concepts and original diagrams](docs/references/honest-nfl/CONCEPTS.md),
  [reading paths](docs/references/honest-nfl/READING-GUIDE.md).
- **Evidence and research:** [current receipts](data/reviews/current),
  [pinned reviews](docs/reviews), [archived research](docs/archive/reviews),
  [data/replay retrieval](data/README.md). Historical evidence describes its
  recorded code/settings, not today's implemented behavior; proposals in the
  [football handbook](docs/football-handbook/README.md) remain proposals.

## Quick start

Requires Node 22.23.3. Record the exact source and settings before comparisons.

```sh
npm ci
npm run baseline:info -- --candidate --flag RUN_CONTACT_COMPONENTS=1
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx scripts/sim-game.ts 701 --pbp
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx scripts/export-replay.ts 701 --games 1 --doc
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

Start new feature work from accepted develop and push its feature branch.
Reconcile ongoing work at clean checkpoints using the shared queue. Primary
retains physics promotion ownership. Do not touch main or PR #1.
