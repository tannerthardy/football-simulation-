# Trace one player's command

Run from the repository root with Node from `.nvmrc`:

```sh
node --import tsx scripts/diag/command-trace.ts --actor D:CB_W --from 3.45 --to 3.60 --coverage cover3_buzz --concept curl_flat --seed 1 --roster 7 --formation gun_doubles_11 --out out/command-trace.json
```

This runs one native play using the generated-team recipe from
`scripts/diag/coverage-trace.ts`, without that script's additional diagnostic
reads. It prints three selected-player step summaries and writes the detailed
trace to ignored `out/`. It does not reconstruct a rounded film checkpoint.
The JSON records the actual input, Node version, source content hash, Git HEAD
and resolved engine settings. `--flip` mirrors the call. Run concepts work too;
choose their formation explicitly. `--help` lists options.

On develop `30fbae9235e86547129cfd372e77dc08091fdea4` plus this recorder,
the example catches at nominal event time 3.50 s. The command in the
3.50–3.55 s interval comes from `CoverageDefender` in man coverage of X;
the endpoint behavior is `Pursuit`. Pursuit's first update is the next step.
An endpoint replay label alone cannot establish command authorship.

For another existing native input or a game observer, enable recording on the
already constructed `PlaySim` before its next tick/run:

```ts
const trace = sim.recordCommands({
  actor: { team: 'D', slot: 'CB_W' }, // alternatively { playerId: exactId }
  from: 3.45,
  to: 3.60,
});
const result = sim.run();
console.log(trace.steps);
```

The selector must match exactly one actor. It retains player ID, team, slot
and current local index; indices alone are not stable across lineup ordering.
The window selects **step starts** in `[from, to)`. The endpoint may be at
or just beyond `to`. Calling `recordCommands` again replaces the recorder;
the previously returned trace remains readable. Pre-snap staging is not
recorded. With no call there is no collector, trace output or replay payload.
Neither `record: true` nor full replay telemetry is required.

Each step separates:

- `decision.owner`: the behavior whose `update` the pipeline entered, with
  its stored target/job before evaluation. `evaluated: false` means snap wait;
  that behavior did not issue a decision.
- `decision.ownerAfterUpdate` and `behaviorAfterUpdate`: stored target/job
  after that single call, including reassignment or delegation. The entry
  owner is the outer controller; this does not trace its internal call graph.
- `decision.raw`, changed `rewrites`, and `final`: copied requests with full
  precision, including facing, effort, cut skill, squeeze, push, posture,
  dive/lunge and any already attached movement objective. Stages are field
  containment, open-to-ball, technique-intent attachment, engagement, tackle
  bond, teammate spacing and snap guard. Only changes larger than `1e-9`
  appear in `rewrites`; raw/final values are not rounded. Multiple changes
  inside one stage are represented by that stage's resulting command.
- `start` and `endpoint`: behavior, achieved body state, current engagement,
  tackle membership and last physics report's selected-actor contacts. The
  endpoint is after ball/tackle/whistle processing at `endpointTime`; event
  timestamps retain the engine's own conventions and are not substep clocks.
- `observations`: timestamps/ages from this actor's **existing `sim.see`
  calls**, tagged by pipeline phase. They are witnesses of returned reads,
  not proof each read caused the chosen action. `sampledAt = requestedAt -
  age`; an unavailable age stays null. Duplicates remain duplicates. Reads
  made directly through other perception APIs and earlier cached pictures
  are not reconstructed. Later execution reads do not explain an earlier
  decision.

A null target with `targetSource: 'not-exposed'` means the controller does
not expose a stored target. In particular, the recorder never guesses a
pursuit target from true possession, calls a behavior, asks for a new picture,
or advances physics. A stored assignment and a command's movement objective
are separate: neither proves the player could actually reach that location.
Use the achieved body state and contact evidence to investigate execution.

This is optional diagnostic recording, independent of the lightweight packed
replay. It does not repair pursuit, tackle or awareness mechanisms.

## Reproduce an ordinary game play

First capture the **actual constructor input**, before `PlaySim` consumes or
changes anything. This command uses the same seed-7 teams, kickoff, rules,
coordinators and game loop as `export-replay.ts`, and stops after the selected
play. The number includes kicks and other log entries, not only scrimmage snaps.

```sh
node --import tsx scripts/diag/capture-game-play.ts --seed 7 --play 12 --max-steps 12 --out out/saved-game-play
node --import tsx scripts/diag/command-trace.ts --capture out/saved-game-play/play.bin --actor D:CB_W --from 2.10 --to 2.30 --out out/saved-game-play/trace.json
```

The original film is `out/saved-game-play/original.html`, clip **G1-P012**.
`reference.json` makes the original result, events, full telemetry, game replay,
input checksum and source/settings identity readable. **`play.bin` is the
authoritative input/reference**: its V8 encoding also preserves undefined,
Maps, nonfinite numbers, property order and shared object references. Use the
supported Node version. Keep all generated output in ignored `out/`.

On accepted develop `0293f70306870891aca112687ea93c3218ef7f81` plus this
capture path, this is Comets' Q1 second-and-15 Levels pass against Cover 1
and Mike A-gap pressure. It catches at 2.15 s and ends in a tackle. The
game prefix stops after nine normal steps; **the play is complete, the game
is unfinished**. No calls, players, flags or outcomes were forced. To discover
one catch instead of selecting a known log index, use `--play first-catch
--min-play 10 --max-steps 60`; selection happens only in the observer.

The actionable command attribution is CB_W at 2.15–2.20 s: `ManCoverage`
on X requests approximately `(9.75, -0.04)` yd/s. No later stage rewrites
that request. The endpoint is already labeled `Pursuit`. At 2.20 s Pursuit
requests approximately `(-8.34, 1.60)` yd/s, while achieved forward speed
is still positive as his body brakes. The first upfield request belongs to
the old man responsibility; subsequent forward displacement is not proof
that Pursuit still requests forward movement. This attribution alone does
not establish that the coverage decision or the braking was wrong.

The capture keeps the entire constructor `PlaySetup`, including pre-audible
calls, installed players, situation, numeric seed **or full advanced RNG state**,
energy Map, preferences, styles, scouting and audibles wherever present.
Known class prototypes (`Rng`, `ScoutingReport`, `CoverageScouting`) are restored
using the same approach as `saved-exchange.ts`; a seed key is never substituted
for an advanced stream. Unknown input prototypes/functions are rejected rather
than silently dropped. This is not a mid-play checkpoint or a general serializer.

`GameHooks.playSetup` is a read-only notification immediately before each
scrimmage/Try constructor; observers must copy retained data. The capture
observer records the original native `run()` result before game bookkeeping
can mutate referenced stats, then retains the selected original game log/replay.
The independent replay never re-runs that prefix or feeds post-snap reference
data into a player. Game-side replay flip comes from the saved presentation
context; replay frames/events/telemetry come from the new execution.

`--capture` refuses synthetic recipe overrides and mismatched engine source,
settings, Node or lockfile identities. A Git-only change with identical engine
content is allowed and both commits remain recorded. It then runs the one saved
play independently with trace off and on and compares **all result fields,
events, replay, initialization RNG, actual installed calls and actor readiness/
energy** against the original and each other. A matching ending is insufficient.
On mismatch it stops with the first field, expected/actual values, time and time
basis. It selects the earliest disagreement among saved frame/event/telemetry
streams; initialization is time zero, and a summary-only difference is labeled
at the result endpoint. This is the first saved witness, not an inferred
unrecorded substep or causal decision.

The ordinary witness exercises fatigue, nonzero styles, man preferences,
audibles and one prior run/pass scouting observation. Its offensive coverage
scouting still contains the prior only; separate focused checks exercise
populated coverage history, nondefault scouting strengths and an advanced RNG
with a cached normal draw. These are restoration controls, not additional
ordinary-game witnesses or claims about football quality.
