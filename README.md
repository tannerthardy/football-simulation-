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
The [run blocking and decision update](docs/reviews/run-blocking-and-decision-update.md)
describes dynamic attention/commitment, combination exchanges and carrier
shoulder turning, with paired diagnostics and remaining calibration gaps.

## Quick start

Requires Node 22.

```sh
npm install
npm test                 # physics, alignment, game-rule scenarios
npm run sim:game -- 7    # simulate a game (seed 7) and print the box score
npm run sim:game -- 7 --pbp   # ...with play-by-play
npm run calibrate -- 20  # 20 games vs. NFL baseline metrics
npm run replay -- 7      # bake a recorded game into out/replay.html
npm run replay -- 7 --games 6 --doc   # film library from six games
```

`npm run replay -- 7 --doc` writes a standalone HTML document you can open
straight from disk. Use `--games 6` to collect many examples with the same
rosters and consecutive game seeds (7–12 in the example above). `--out path`
chooses where to save the HTML. The default remains one game.

For a ready-to-watch library, [download the film room ZIP](https://github.com/tannerthardy/football-simulation-/raw/refs/heads/claude/engine-priorities/viewer/film-room.zip),
unzip it, and open **film-room.html** in Chrome, Safari, Firefox, or Edge.
The included snapshot has 767 clips from six games (seeds 7–12), grouped into
27 concepts. It is also saved as [viewer/film-room.html](viewer/film-room.html)
for HTML previews. Sign in to GitHub with access to this private repository
to download it. The generated viewer contains the play data; the template is
the layout used by the exporter. It displays download instructions when
opened without recorded data.

The film room groups recorded plays by **offensive concept**: zone and gap
runs, quick game, dropback passes and play action. Choose a concept and click
**Watch selection**, or use a group's **Watch** button. Auto-next stays within
the matching clips, pauses briefly at each finish, and stops at the end;
**Loop selection** repeats the batch. Next/previous follow the displayed group
order. You can also group by defensive front, coverage, formation, or game
and combine filters for those fields, results and offensive team. Search
finds play calls, descriptions and player names.
Use **Hide filters** to give the field more room while watching.

Each replay has event jumps (snap, first block, handoff, throw, catch, first
carrier contact and finish when recorded), frame stepping, 0.25–4× playback,
route trails, slot labels and a wide view. Nullified snaps retain their film
and are labelled; they do not appear as official touchdowns, completions,
explosives, turnovers, sacks or stuffs. Unfilmed log entries are omitted.
Concepts and defensive labels come from the actual calls after any audible,
not from inferring a scheme from the animation.

To check a generated multi-game viewer in Chromium, with Python Playwright
installed, run `python3 scripts/check-replay-viewer.py out/replay.html`.
`--browser /path/to/chromium` selects an installed browser and
`--screenshots out/film-room` saves desktop, mobile and dark-mode previews.
The check covers grouping, combined filters, playback, loop/finish behavior,
scoreboard changes and empty selections; it blocks external fonts so the
viewer is also checked without a network connection.

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
| `scripts/run-development-lab.ts` | Six-front run development matrix; 10 Hz proximity, OL displacement, runner/contact/puller timing, local rule events. |
| `scripts/run-blocking-lab.ts` | Run concept × formation × front × flip on paired seeds; physical gains, stuffs, ownership, climbs and posture requests. |
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
