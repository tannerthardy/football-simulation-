# Gridiron Engine

A physics-driven American football simulation engine aiming for Football
Manager–level depth. Every snap is simulated at 20 Hz: 22 bodies with
individual sprint curves, cutting limits, reaction times and perception lag,
a 3D ball with drag, a technical trench model (hands, leverage, base,
footwork, rush moves and counters), route running against man and zone
coverage, quarterback reads and throw-window evaluation, ball-carrier vision,
pursuit angles, and tackling as a physical contest. Football outcomes such as
sacks, separation, yards after catch and broken tackles come out of that
interaction instead of being rolled from tables.

On top of the play engine sits a game layer: drives, clock management,
special teams, penalties, fatigue and substitutions, and offensive and
defensive coordinators that call plays from their schemes, their own
personnel, the opponent's alignment and what has been working.

See [docs/DESIGN.md](docs/DESIGN.md) for the full design and
[docs/ROADMAP.md](docs/ROADMAP.md) for status, calibration against NFL
baselines, and what's next.

See [data/README.md](data/README.md) for the shared NFL data catalog,
collaborator access, pinned upstream sources, and summary regeneration.
The [2026-10-08 engine review](docs/reviews/2026-10-08-engine-review.md)
records the current findings and improvement priorities.
The [realism implementation plan](docs/REALISM_PLAN.md) develops those findings
into modeling work packages, dependencies, and release criteria.

## Quick start

Requires Node 22.

```sh
npm install
npm test                 # physics, alignment, game-rule scenarios
npm run sim:game -- 7    # simulate a game (seed 7) and print the box score
npm run sim:game -- 7 --pbp   # ...with play-by-play
npm run calibrate -- 20  # 20 games vs. NFL baseline metrics
npm run replay -- 7      # bake a recorded game into out/replay.html
```

`npm run replay -- 7 --doc` writes a standalone HTML document you can open
straight from disk. The viewer shows every scrimmage play top-down (All-22),
with play calls, events on the timeline, route trails, and filters for
scoring plays, explosives, turnovers and sacks.

## Labs and diagnostics

| Script | What it isolates |
|---|---|
| `scripts/sim-play.ts` | Batch one pass concept or run against one coverage; completion, air yards, YAC distribution, sacks. |
| `scripts/matrix.ts` | Concept × coverage success matrix. |
| `scripts/debug-play.ts` | ASCII frame-by-frame view of a single play, or a per-player table. |
| `scripts/trench-lab.ts` | Pass-protection reps with the QB holding the ball: win rates and pressure and sack timing by matchup. |
| `scripts/open-field-lab.ts` | One carrier vs. one or two tacklers in scripted open-field scenarios (square, angle, chase, sideline). |
| `scripts/zone-style-lab.ts` | Pass concepts against one zone coverage played spot drop vs. pattern-match, on paired seeds. |
| `scripts/recognition-lab.ts` | How fast and how accurately each position group reads run vs. pass, by play and situation, with and without a scouting report. |
| `scripts/calibrate.ts` | Many full games; league-level metrics vs. NFL targets. |
| `scripts/tendencies.ts` | Play-calling tendencies (personnel, defensive packages, run-concept mix, play action, coverage shell, team spreads), measured like the NFL extractor. |

## Layout

```
src/core       RNG (seeded, forkable), vectors, field constants, units
src/players    measurables, ratings, physical profile, roles, generator
src/physics    traction-ellipse movement, time-to-reach, ball flight + throw solver
src/playbook   personnel, formations, routes, concepts, fronts, coverages, alignment
src/sim        play simulation: perception, trench model, tackling, catching, behaviors
src/game       game state machine, play callers, special teams, box score
src/league     team generation and scheme identity
scripts        runners, labs, calibration, replay export
viewer         replay viewer template
docs           design and roadmap
```

Gameplay is reproducible for a given seed. Each subsystem draws from its own
named random stream, so adding or reordering one doesn't shift another, and
player ids are roster-scoped (`IRN-QB1`), so the same team generates the same
ids in any process.
