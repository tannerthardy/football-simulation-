# Play Lab

A local program for building plays and situations, running them on the real
engine, studying them in detail, changing things, running them again and
leaving notes that agents can act on exactly. It answers
[VIEW-1](KNOWN_PROBLEMS.md#view-1).

```sh
npm ci          # once
npm run lab     # then open http://localhost:4173/
```

Everything is done by clicking. Files go under `out/lab/` (ignored by Git):
`scenarios/`, `notes/` and, later, `handoff/`.

## Rules the lab keeps

- **The engine decides the football.** A run is an ordinary `PlaySim` run of an
  ordinary `PlaySetup` (`lab-app/engine.ts`). The lab never edits a result or
  draws motion the engine did not record. Ratings, physics and controllers
  are used as they are.
- **Running the lab does not change games.** The only engine change is one
  optional `PlaySetup.alignment` input, which is absent in games.
  `test/play-lab.test.ts` checks that a game played in the same process after
  using the lab (a coach's-hand move, rating edits, a trace and a batch run)
  has the same games-identical hash (play log, score and box score, as
  `scripts/weird-identity.ts`) as the same game in a fresh process that never
  loads the lab.
- **Every human change is labelled.** Moving a player is a *coach's hand*
  intervention. It is saved with the scenario, drawn on the replay (dashed
  orange arrow from his own spot, an H badge on the player, the first row of
  the event list) and described as "not his choice" in his panel.
- **The same scenario file replays the same play.** The authority is the
  #254 constructor capture of the setup (`captureSetup`, V8 bytes with a
  sha256), plus the seed, the interventions and the engine switches.
  Imported game plays (`play.bin`) keep their saved bytes exactly; the lab
  shows "✓ same as the game's original" when the run matches.

## Building a play

**Build** tab:

- **Offense:** formation, run or pass, the play, flip, and whether the QB may
  check out at the line.
- **Defense:** personnel, front (only fronts installed for that personnel),
  coverage, pressure (only pressures compatible with the coverage) and zone
  technique.
- **Situation:** down, distance, ball spot and hash. Left and right are from
  the offense's view.
- **Rosters:** the roster seed and team strength generate the two teams.

**Players** tab: swap who plays a spot, or open a player and change any rating
(1–100) or measurable with sliders. Edits are stored as a list on the
scenario, and the edited player is what the engine gets.

**Arrange players:** drag anyone before the snap. The engine places the body
and his installed spot there before any pre-snap staging, so his job starts
from where he stands. Pre-snap fouls are still the engine's: the banner shows
its ruling (offside, illegal formation and so on). A drop that would put two
bodies inside each other is refused.

**Engine switches** (under Build): every switch the engine reads, with its
default. A scenario's switches run in their own worker, so they never leak
into another run.

**Seed / Next seed / Run batch:** run one seed, step to the next, or run N
seeds of the same setup. The batch shows a yards histogram, outcome counts
and a list sorted by yards; click a row to watch that play.

**Library:** saved scenarios, and game plays captured with
`scripts/diag/capture-game-play.ts` (any `play.bin` under `out/`).

## Watching a play

- Play or pause (space), step one frame (← →), jump a second (shift + ← →).
  Speed runs from 0.1× to 2×. Frames are recorded every tick (0.05 s).
- **Views:**
  - **All-22**: top-down. Scroll to zoom, drag to pan, double-click to reset.
  - **End zone**: from behind the offense; heights come from measurables.
  - **Player cam**: follows the selected player (or the ball carrier), turned
    so his facing points up.
  - **Compare A | B**: two runs from the Runs tab, side by side on one clock,
    with the first frame where any body differs by more than 1 cm and
    whose body it was.
- **Click a player** to follow him. Shift-click a second player for a note.
- **Filter:** offense, defense, a position group, or within X yards of the
  ball. Everyone else is dimmed, never hidden.
- **Events:** click one to jump there and select its player.
- **Player panel:**
  - speed achieved and asked for;
  - effort (from the trace), energy, support state, balance, posture;
  - job and target, run fit, read;
  - the command trace at this moment;
  - recent decisions, his events and ratings.

### Layers and where their data comes from

| Layer | What it shows | Engine source |
| --- | --- | --- |
| Requested vs actual | Yellow dashed: asked velocity and facing. White: achieved velocity. The solid tick is body facing. | telemetry `agents[i].intent` vs `agents[i].body.velocity`; frame facing |
| Job & target | Job label, coverage landmark, man/target links | telemetry `agents[i].job/landmark/target`, `links` |
| Command owner | Which controller owned the selected player's command, and which stage rewrote it | command trace `decision.ownerAfterUpdate`, `rewrites` (`sim.recordCommands`) |
| What he sees | The selected player's delayed picture of others he actually looked at, with its age | telemetry `perception` (actual `see` and QB calls) |
| Reach & contact | Reach circles, body contacts sized by impulse, engagements (move, control, hold), tackle grips and legs | profile `reach`; telemetry `contacts`, `blocks`, `tackle` |
| Falls & balance | Falling, down or rising; balance bar; support deviation | telemetry `body.state/balance/supportDeviation` |
| Ball flight | Whole flight path, aimed point and arrival time, catch point, QB's pending target and odds | frames `b`; telemetry `ball.intended/arrivalT`, `qb.pending`; events |
| Pursuit intercepts | The selected player's intercept point from his own estimate. Green = estimated feasible; orange = fallback. Square = steering point. | command trace `pursuit` records |
| Run fits & blocks | Gap fits, block kind and target, drive direction, pull path, pass-set lane | telemetry `runFit`, `runBlock`, `passSet` |
| Trails | Path so far | frames |
| Coach's hand | Original and moved spot, H badge | scenario `interventions` |

Gap letters are the one drawn estimate: they are placed between the offensive
linemen's spots at the snap and labelled as such. The trace layers re-run the
same play with the trace on. It records only; the run is identical.

## Notes for agents

Pause, select one or two players, press **N** (or Notes → Note this moment).
Pick a category (bad decision, impossible physics, wrong information,
missing technique, looks great, other), set the time window, write what you
saw, and save. A note (`out/lab/notes/<id>.json`, format
`play-lab-note-v1`) holds:

- the moment, the window and the players (team, slot, player id);
- the category and text;
- the seed, the engine switches and the interventions;
- the engine identity (commit, uncommitted `src` edits, engine source sha256
  and resolved settings);
- the result;
- the exact scenario that produced the run, so the moment restores even if
  the scenario is edited later.

**Copy reference** puts a plain-text reference on the clipboard, including a
link that reopens the lab at that moment and the headless command:

```sh
npm run lab:replay -- out/lab/notes/<id>.json [--json out/lab/replay/<id>.json]
npm run lab:replay -- out/lab/scenarios/<id>.json --seed 3 --at 1.2 --players D:LB_M,O:RB
```

`lab:replay` applies the note's switches before the engine loads and re-runs
the play. It then:

- says whether the engine source matches the note's, and whether the result
  reproduced;
- prints each noted player's state, perception and step-by-step command
  trace across the window, plus the events in it.

## Files

| Path | Purpose |
| --- | --- |
| `lab-app/engine.ts` | Recipe → `PlaySetup`; run, preview, trace; scenario format |
| `lab-app/server.ts` | Local server, engine worker pools (one per switch set), files, batch jobs |
| `lab-app/worker.ts`, `worker-entry.mjs` | Engine worker thread |
| `lab-app/public/` | The app (plain modules, no build step) |
| `lab-app/replay-cli.ts` | `npm run lab:replay` |
| `lab-app/game-hash.ts` | Games-identical hash used by the test |

Environment: `LAB_PORT` (default 4173) and `LAB_OUT` (default `out/lab`).

## Roadmap

1. **Build, run, see, note** (this PR).
2. **Change and re-run from a moment.** Engine snapshot/restore (bodies,
   support, joints, minds, perception history, behaviors, RNG streams) in its
   own PR, with restore-equals-uninterrupted tests. Branch from moment *t*:
   drag a player or change his velocity or facing, then re-run from there. The
   change is applied as honestly as the physics allows (no teleporting inside
   contact), and perception is aged so nobody knows about the move before they
   could see it. Fallback: re-run from the snap with the change at *t*, with
   the difference explained. Overlay compare and first divergence (already in
   Compare).
3. **Scripted situations and stress tests.** Scripted interventions saved as
   JSON (e.g. "at 1.2 s the RB cuts to the left B gap", "QB holds the ball
   until 3.0 s"); batches over seeds or grids with clickable tails; A/B on two
   branches or switch sets with matched seeds.
4. **Hand-off.** "Send to agents" export to `out/lab/handoff/<date>-<topic>/`
   with a README; `lab:replay` (already here) restores any note headless.
