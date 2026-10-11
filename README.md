# Gridiron Engine

A football simulation intended to support a future management game. Twenty-two
players make fallible decisions and move through one shared physics world;
blocking, tackling and running lanes should emerge from those interactions.
We build the mechanisms correctly rather than tune outcomes to NFL averages.

Start with [CLAUDE.md](CLAUDE.md), [status](docs/STATUS.md) and
[validation](docs/VALIDATION.md). Coaching research is in the
[football handbook](docs/football-handbook/README.md).

## Quick start

Requires Node 22.

```sh
npm ci
npm test
npm run test:all
npm run test:data
npm run typecheck
npm run build
npm run sim:game -- 7 --pbp
npm run replay -- 7 --games 6 --doc
```

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
loop; `npm run test:all` retains every TypeScript assertion.

Work and pushes belong on `claude/engine-priorities`. Do not touch main or PR #1.
