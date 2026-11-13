# Gridiron Engine

A football simulation intended to support a future management game. Twenty-two
players make fallible decisions and move through one shared physics world;
blocking, tackling and running lanes should emerge from those interactions.
We build the mechanisms correctly rather than tune outcomes to NFL averages.

## Where to find things

- **Start here:** [approved operating plan](docs/PLAN.md) → [ranked gaps and lane assignments](docs/GAPS.md).
  The trunk is `develop`; fetch it and record its full SHA before work.
  GitHub's default `claude/football-sim-engine` is a legacy branch. The
  [branch map](docs/BRANCHES.md#verified-entry-points--2026-10-22) records the
  checked refs. GAPS' measured cohort and older checkpoint pins describe
  their recorded source, not necessarily today's trunk.
- **Historical comparisons:** [baseline/profile and known failures](docs/BASELINE.md)
  retain `4ded6b6`; it is not the new-task development starting point.
- **Simulation:** [single play](scripts/sim-play.ts), [game](scripts/sim-game.ts),
  [replay exporter](scripts/export-replay.ts); football execution in
  [src/sim](src/sim), shared movement/contact in [src/physics](src/physics),
  [players](src/players), [playbook](src/playbook), [game](src/game) and [league](src/league).
- **Working instructions:** [agent workflow](AGENTS.md),
  [football-model rules](CLAUDE.md#model-rules), [flags](docs/FLAGS.md) and
  [parked ideas](docs/PARKED.md). PLAN governs reviews and merging;
  [known problems](docs/KNOWN_PROBLEMS.md) supplies the detailed diagnosis.
- **Testing:** [current tiers and review policy](docs/PLAN.md),
  [selective-testing reference](docs/TESTING_COSTS.md),
  [interpret improvement/regression](docs/BEHAVIOR_REVIEW.md),
  [validation](docs/VALIDATION.md). Use evidence to judge the mechanism;
  the scorecard diagnoses changed statistics rather than deciding correctness.
- **Branches and recovery:** [branch map, cleanup record and pending decisions](docs/BRANCHES.md).
- **Football handbook and source sheets:** [handbook](docs/football-handbook/README.md),
  [pulling guards and moving run-game footwork](docs/football-handbook/moving-run-footwork.md),
  [HonestNFL concepts and original diagrams](docs/references/honest-nfl/CONCEPTS.md),
  [reading paths](docs/references/honest-nfl/READING-GUIDE.md).
- **Evidence and research:** [preserved measurements and receipts](data/reviews/current),
  [pinned reviews](docs/reviews), [archived research](docs/archive/reviews),
  [data/replay retrieval](data/README.md). Historical evidence describes its
  recorded code/settings, not today's implemented behavior; proposals in the
  [football handbook](docs/football-handbook/README.md) remain proposals.
  The former [integration queue](docs/INTEGRATION.md), [status](docs/STATUS.md),
  [issue register](docs/ISSUES.md) and [workboard](docs/WORKBOARD.md) preserve
  historical decisions; PLAN/GAPS replace their operating instructions.

## Quick start

Requires Node 22.23.3. Record the exact source and settings before comparisons.

```sh
npm ci
git rev-parse HEAD
npm run sim:game -- 701 --pbp
npm run replay -- 701 --games 1 --doc
```

The game/replay examples simulate games; run them when that is your task.
These run source defaults plus any environment overrides; record explicit
settings for comparisons. The historical `baseline:run` profile can override
those defaults and is only for reproducing that profile ([baseline guide](docs/BASELINE.md)).
For edits, use the smallest relevant check under PLAN. Navigation edits do not
need a scorecard or new games.

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
experiments. `npm test` keeps engine/controller contracts in the normal development
loop. `npm run test:workflows` runs native capture/replay, film/CLI and lab checks.
`npm run test:integration` includes those workflows and the game panels, keeping
the required core-plus-integration gate complete without repeating workflows.
`npm run test:all` retains every TypeScript assertion across core, workflows,
integration and research; see [the command map and measured costs](docs/TESTING_COSTS.md#current-test-loop).

Start assigned feature work from `develop` and follow PLAN's lane/review rules.
Preserve existing worker branches and source-qualified research.
