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
