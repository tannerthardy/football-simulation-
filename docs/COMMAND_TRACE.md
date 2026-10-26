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
- `blockingChanges`: actual changes to the selected run blocker's stored
  responsibility, including replacements that emit no football event. Each
  row copies actor identity, native decision time `t`, pipeline phase, previous
  and current target/work kind, and the mutation path's reason. This includes
  changes made by a neighboring blocker or combination resolution before the
  selected actor's update. Stable target/kind pairs produce no row; a null
  target remains null. Recording does not add `block_threat` or any other
  native event, acquire another picture, or classify block success.

Blocking reasons name existing paths: available-target/find-work, crossing
exchange, penetration collection, threat reread, and combination release or
abandonment. Work-kind changes are retained even when the target is unchanged.
Multiple changes within a step remain ordered and chained, rather than being
collapsed to an endpoint guess.

On the frozen Phase II inputs replayed at develop `a5b024b9`, S9-P062 C changes
DT_S/combo to LB_W/climb at decision time 1.05; that state is visible in the
1.10 endpoint. His LB_W→LB_M reread is at 1.25, visible at endpoint 1.30.
S10-P009 LT's LB_M→SS replacement at 1.65, visible at 1.70, has no
`block_threat` event and is recorded as available-target/find-work. The first
C/LB_M load in S9-P062 is separately sampled at endpoint 2.25, after the
2.20–2.25 physics interval. Those clocks describe different stages; load is
not another responsibility transition or proof of a useful block.

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

On accepted develop `a8c0455ce7ad35d494688cd7fad9d36c479cc2be` plus this
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
streams, including negative-time staging; constructor completion is time zero,
and a summary-only difference is labeled at the result endpoint. This is the
first saved witness, not an inferred
unrecorded substep or causal decision.

The ordinary witness exercises fatigue, nonzero styles, man preferences,
audibles and one prior run/pass scouting observation. Its offensive coverage
scouting still contains the prior only; separate focused checks exercise
populated coverage history, nondefault scouting strengths and an advanced RNG
with a cached normal draw. These are restoration controls, not additional
ordinary-game witnesses or claims about football quality.

## Inspect pursuit prediction feasibility

Chase predictions now also expose the [requested speed/effort contract](reviews/pursuit-effort-contract.md)
in `estimate.request`: raw requested speed, wanted-speed ceiling and leveling
time. Console traces print this existing budget. It applies to the sampled
interception sprint; later biased/shaded objectives and modifier-owned requests
do not inherit feasibility. Other generic reach callers remain on their existing
model unless they explicitly supply a request.

`steps[].pursuit` contains helper calls actually made for the selected actor,
tagged by pipeline phase and stable target identity. It is absent when none
were recorded. A helper can be called and its request discarded by its caller:
compare its returned request with `decision.raw`, then follow the normal rewrite
list and achieved body state. The outer behavior remains the recorded owner.

An `intercept` record includes the two already consumed pictures, their ages,
the existing fixed-heading/relaxing-speed forecast and its field bounds,
pursuer velocity/capacities/speed scale, and the original sampled prediction:

- `prediction.estimate.status` is `estimated-feasible` or
  `fallback-no-estimated-feasible-candidate`. The latter means no **sampled**
  candidate in this search passed `timeToReach`; it does not prove interception
  impossible between samples or under a different forecast.
- `horizon`, `step` and `radius` describe the search. `prediction.t` and
  `arrivalTime` are seconds from this helper call. `slack = t - arrivalTime`;
  positive is estimated spare time, negative is estimated lateness. Null means
  the selected default did not receive an arrival estimate, not zero time.
- `physicalGuarantee` is always false. The scalar estimator omits body yaw,
  detailed support/contact/traffic and the later request's effort. The target
  path comes from the caller; the generic estimator does not validate its
  information source. Pursuit records its actual acquired-picture assumptions.
- `samples` copies the candidates the existing loop evaluated, through the
  first passing sample or search end. It adds no estimator/path evaluations.
  It exists only when a selected recorder requests it (`recordSamples` at the
  scalar API); ordinary prediction calls retain no candidate tape.
- The estimate applies to the **sampled point before time bias and leverage**.
  `biasedTime`, `forecastPoint`, `leverage` and `steeringPoint` show those
  existing later changes. `steeringPointEstimate: 'not-evaluated'` prevents
  treating the sampled test as validation of the shifted point.

A `chase` record gives the acquired hip, gathering fraction, contact radius
and existing helper requests: intercept sprint, approach/gather composition,
then around-body routing. These are before pipeline containment, engagement,
tackle bond, spacing and snap guard. A full close gather says
`planner: 'bypassed-close-gather'` and has no invented interception estimate.
A held tackle preserves its contact-owned request and the later bond rewrite.

For ordinary recorded witnesses, first capture their constructor inputs on the
same source/settings, then use the existing command:

```sh
node --import tsx scripts/diag/capture-game-play.ts --seed 7 --play 2 --max-steps 2 --out out/pursuit-P002
node --import tsx scripts/diag/command-trace.ts --capture out/pursuit-P002/play.bin --actor D:SS --from 3.30 --to 4.40 --out out/pursuit-P002/trace.json
node --import tsx scripts/diag/capture-game-play.ts --seed 7 --play 12 --max-steps 12 --out out/pursuit-P012
node --import tsx scripts/diag/command-trace.ts --capture out/pursuit-P012/play.bin --actor D:LB_W --from 2.90 --to 3.30 --out out/pursuit-P012/trace.json
```

Console summaries include the helper's estimate or gathering bypass, body
facing and actual travel heading (radians, undefined at negligible speed).
Facing is not velocity direction or gaze. Use full-precision JSON for small
slack differences. A changed forecast point, an unachieved request and a
modified request are different findings; none alone establishes a bad physical
capacity or the cause of an entire play. Point selection, steering, sensing,
physics and capacities are unchanged by this diagnostic contract.
