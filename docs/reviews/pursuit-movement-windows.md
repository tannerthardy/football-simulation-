# Actor windows in the movement-task panel

Use the existing report command on a frozen selection and saved command traces:

```sh
python3 scripts/data/movement_task_report.py out/pursuit-movement/selection.json out/pursuit-movement/trials.json out/pursuit-movement/report.json --table out/pursuit-movement/table.md
```

This is an optional input schema of the existing movement-task panel. Its NFL
fixture/mode report and `bdb2027_movement.motion` operator remain unchanged.
The new actor-window helper consumes existing `command-trace.ts` JSON; it
never runs a controller, advances physics or reconstructs intention from a path.
The turning helpers are the explicit #255 dependency, content-pinned in output.

## Small contract for Catching/Defense

Freeze a selection file **before comparing controller treatments**. `arms`
contains the expected names, and every case has a unique ID, source, stable
actor identity and `[from,to]` window. A player ID or team/slot is required;
a local index alone is insufficient. Use a different selection identity when
cases or windows change. A declared evaluation direction or point needs its
own source; these are experiment declarations, not inferred player intent.

A minimal selection, showing one case rather than an outcome-selected panel:

```json
{
  "schema": "movement-window-panel-v1",
  "selection": "Case/actor/window frozen before comparing treatments",
  "arms": ["reference", "intervention"],
  "cases": [{
    "id": "free-overrun",
    "category": "free-overrun",
    "actor": {"team": "D", "slot": "CB_W"},
    "window": [2.2, 2.5],
    "source": {"playId": "G1-P012", "captureSha256": "actual capture checksum"},
    "inputSha256": "actual native constructor checksum",
    "desiredDirection": {
      "vector": {"x": -8.335634921983658, "y": 1.5977897992512098},
      "source": "Recorded reference final.vel at 2.2s, frozen evaluation axis"
    }
  }]
}
```

`trials.json` binds to the **exact selection file bytes** through its top-level
`inputSha256`. Each trial names a case/arm and an existing `traceFile`, relative
to the trials file. An optional `traceSha256` pins those exact bytes. Its
per-trial `inputSha256` identifies the native constructor, not the selection.
For a captured play, the trace's `verification.setupSha256` must also match.
Inline `trace` objects are supported for focused fixtures and get a canonical
JSON content identity.

```json
{
  "inputSha256": "SHA256 of selection.json bytes",
  "trials": [{
    "caseId": "free-overrun", "arm": "reference",
    "traceFile": "free-overrun.json", "traceSha256": "actual trace checksum",
    "inputSha256": "actual native constructor checksum"
  }]
}
```

An absent arm creates explicit missing rows. Rejected, partial, missing and
filtered-operator failures stay in total and per-arm exposure counts. A failed
reference restoration or same-arm trace-on/off check is rejected. An intervention
may intentionally differ from the reference; those differences are retained,
counted and labelled separately from observer failure. The first declared arm
is the reference. An unavailable check stays unknown. The controller owner
supplies counterfactual traces; the existing capture CLI reproduces a source,
and is not itself a controller-intervention runner.
Source commit/content, resolved settings, Node version and verification come
from the saved trace; the reporter never substitutes its current checkout as
the source of an older trajectory. Input files and all measurement helpers are
hashed. `complete` describes a covered native measurement, not a correct player
choice or a compatible/beneficial intervention. CLI success means a descriptive
report was written; this command is not a preservation guard.

Current trace fields are used directly: `steps[].start/endpoint.body`, actual
step times, `decision.raw`, `final`, owner/evaluation state, rewrite stages,
contact reports, engagement/tackle membership and nullable support. Optional
`step.prediction` or `decision.prediction` is copied when supplied. The existing
recorder does not currently expose pursuit prediction outcomes; absence is
`unavailable:not-recorded`, not acceptance or rejection. Catching/Defense owns
any producer/controller/physics changes. No new engine fields are required.

## What each row measures

- **Native:** actual elapsed step-start/endpoint time, entry/exit stored velocity,
  body rotation and travel-heading change, entry-minus-minimum speed and signed
  entry-minus-exit speed, and velocity transverse/along the sourced direction.
  Negative along-axis velocity moves opposite that axis. Missing command
  intervals remain gaps; no cadence is assumed. Native heading uses nonzero
  stored velocity and is undefined at exactly zero. Near-stop angles are
  sensitive; a large low-speed heading change is not a capacity observation.
- **Sampled:** observed 0.1-second points relative to the frozen window start,
  plus the exact terminal point. Body angles are not interpolated. #255's
  position secants give velocity after clipping to the frozen window: centered
  inside runs, one-sided at window/gap edges. Its tracking-style heading
  requires at least 1 yd/s. The short terminal interval uses its actual elapsed
  time. Native coordinate precision is retained; NFL/replay quantization is
  not simulated. Native and sampled heading eligibility therefore differ.
- **Filtered:** the existing movement-task operator resamples position at 10Hz,
  smooths speed over five samples and trims derivative edges. Its original
  minimum-length, gap and gross-outlier screens remain. Output includes both
  resample span and derivative-center span: the filtered peak is not necessarily
  over the full native window, nor an instantaneous deceleration capacity.
- **Angles:** signed shortest endpoint differences and sums of contiguous
  absolute circular increments are separate. Neither recovers unobserved full
  revolutions. Raw orientations remain; #255 excursion markers are diagnostic
  counts, not automatic cleaning.
- **Objective:** a sourced fixed evaluation point permits closest observed
  distance; an arrival error also needs a supplied deadline and a state at that
  exact time. Otherwise, recorded moving/changing goal points give only distance
  to the contemporaneous recorded point at request time, without extrapolation.
  This is not an interception/arrival estimate or the true target's position.
  Raw/applied goals stay available in the request records.
- **Context:** supplied contact, engagement, tackle-bond and support fields only.
  A null/missing/unrecognized support state is unknown. Empty body-contact lists
  do not certify absence of hands or tackle load. Unrecorded intervals preserve
  unknown contact/support exposure. Event times retain engine conventions and
  are not substep contact timestamps. Case categories are source nominations,
  not a new causal classifier.

## Frozen ordinary-play controls

The initial six actor/windows below were nominated from the existing documented
G1-P012 ordinary-input recipe before any controller intervention was compared.
The capture used nine normal game steps, without forcing a call or outcome.
They are concrete controls for the current experiment, not a claim to have
received Catching's historical raw traces or an independent football population.

| Case | Actor | Window (s) | Baseline nomination |
| --- | --- | --- | --- |
| free-overrun | D:CB_W | 2.20–2.50 | Free residual motion after the applied pursuit direction reverses |
| useful-intercept | D:LB_W | 2.60–3.20 | Successful recorded initial grasp/wrap |
| stop-redirect | D:CB_W | 2.15–3.15 | Coverage→pursuit request transition and braking |
| coverage-turn | D:CB_W | 1.15–2.15 | Retained man-coverage turn control before the handoff |
| contact-torso | D:DT_S | 1.00–2.00 | Actual engagement-stage command rewrites and coupled torso motion |
| contact-fall | D:LB_M | 2.15–3.05 | Recorded body contacts and falling support |

Source locator: `acc1e101ef80a2521bc749862af5006bdc26d0e7` (develop
`2f7ac93c270812869f19779fc2f5659d53e94080` plus measurement dependency #255).
Engine content: `7aab01a5f815c6fa307e02638e5f9c12a9f626c0f871cafdfe40d92f3f126366`.
Constructor: `717f84889bff1ecaeffc6fde49326a192c14db51d968bfc1133f9e38498e49a8`.
Node 22.23.3; resolved settings are copied into every saved trace, without
parameter overrides from this measurement task. Keep the capture, frozen
selection, traces, tables and JSON in ignored `out/pursuit-movement/`.

Reproduce the known input on its matching source with the existing commands:

```sh
node --import tsx scripts/diag/capture-game-play.ts --seed 7 --play 12 --max-steps 12 --out out/pursuit-movement/ordinary-input
node --import tsx scripts/diag/command-trace.ts --capture out/pursuit-movement/ordinary-input/play.bin --actor D:CB_W --from 2.2 --to 2.5 --out out/pursuit-movement/free-overrun.json
```

Use the table's other actors/windows identically. Preserve the resulting source
pins and bind trace paths to the frozen selection; do not relabel later-source
P012 as this input. All selected original/plain/traced executions verified
exactly using the existing capture/replay tools. An independent repeated trace
of the saved free-overrun input gives identical metrics, context and requests.
The nominated categories qualify controls; they do not establish that every
coverage decision is correct or that contact caused a particular rotation.

No controller intervention was supplied for these ordinary controls. Expected
intervention rows remain missing. A focused synthetic pair proves the command
can distinguish transverse response when final yards are unchanged; it makes
no claim of an actual controller improvement. No NFL download, capacity retune,
physiological ceiling or new aggregate target is part of this diagnostic.

## Treatment evidence extension (pursuit-window-v2)

This extends the same command and numeric operators. It does not replace the
original six-case selection, SHA256
`f98586042870657058ec7876403793fec1a0e37d229afffe8d0bf4156832dc5d`.
A new `selectionVersion` identifies additional cases; `extends.selectionSha256`
identifies the original. Old saved reports keep their old operator hashes.
Existing native quantities on those six saved references remain exactly equal;
the additional fields have version `pursuit-window-v2`.

Accepted starting develop is `27617221a5d0cc2100226af7107be8fca64a401b`,
including prediction contract #259. Turning #255 (`035214e0942238bb9fdd10241b42bd5a923b2ca7`)
and the actor-window panel (`b7e12948aac78f41461ca9688abd17a63103c981`)
are **pending dependencies**. Their measurement composition is not accepted
trunk. Source/settings/input identity belongs to each trajectory; a common
play label does not join different captures.

The owner witnesses are the actual ordinary P002 **D:SS / COM-LB1** and P012
**D:LB_W / IRN-LB4**, regenerated on #259's exact source
`06bf5ef7ee18ff0bca87362fa37386c6e002af55`, Node 22.23.3, engine
`1b9fb92ca2fca728214dd95a3386ecf8ea1ec206b47706701fc4e7e9a335cdc2`.
P002's actual recorded target is **IRN-RB3**, despite RB1 in #259's prose;
P012's target is **COM-RB1**. Neither is a renamed original P012 corner window.
All resolved settings and constructor checksums remain in their captures.

Before any treatment implementation/export or outcomes were available, these
two existing native transfer entries were reserved in the owner handoff:

| ID | Actor | Fixed window | Situation |
| --- | --- | --- | --- |
| PT-R1-oblique-Z-R-S83 | FS | [2.00,5.00] s | Existing crossing/oblique pursuit from stationary entry, roster pair 19/20 |
| PT-R2-freeCut-RB-L-S131 | FS | [2.00,5.00] s | Existing ungrasped runner stop/reversal, roster pair 31/32 |

These are staged native 22-body encounters, not ordinary-game exposures. No
profile is changed. They are distinct from P002/P012, but use a previously known
fixture family, not a blind population holdout. The free-cut runner command switches at t=3; physical
reversal is measured, not assigned that time. Its redirection anchor is t=3,
with a declared negative-X evaluation axis. The crossing case uses its declared
negative-Y closing axis. Baseline planner calls do not establish that a future
treatment executes. Retain an inactive or early-ending case; do not substitute
another after seeing outcomes. The original gathering, coverage and
contact/fall controls stay in the extended selection.

The existing transfer collector can export just these entries, without another
128-entry run:

```sh
node --import tsx scripts/diag/pursuit-transfer.ts out/treatment-evidence/reserved-transfer-baseline.json.gz --select PT-R1-oblique-Z-R-S83 --select PT-R2-freeCut-RB-L-S131 --command-traces out/treatment-evidence/transfer
```

The geometry/input cohort is unchanged. Each optional trace uses the existing
selected recorder and retains collector hash, source/settings, initial-state
hash and exact observer parity. Its target trajectory comes from the existing
transfer collector's simultaneous full-precision states. Default full-panel
collection remains available. No new simulation/evaluation framework is added.

For the two ordinary owner inputs, run #259's documented captures on its pinned
source. Obtain full-precision actual target states with the same existing CLI,
rather than calling a perceived hip the actual runner:

```sh
node --import tsx scripts/diag/command-trace.ts --capture out/treatment-evidence/P002/play.bin --actor D:SS --from 3.30 --to 7.40 --out out/treatment-evidence/P002/extended-trace.json
node --import tsx scripts/diag/command-trace.ts --capture out/treatment-evidence/P002/play.bin --player-id IRN-RB3 --from 3.30 --to 7.40 --out out/treatment-evidence/P002/target-trace.json
node --import tsx scripts/diag/command-trace.ts --capture out/treatment-evidence/P012/play.bin --actor D:LB_W --from 2.90 --to 3.30 --out out/treatment-evidence/P012/trace.json
node --import tsx scripts/diag/command-trace.ts --capture out/treatment-evidence/P012/play.bin --player-id COM-RB1 --from 2.90 --to 3.95 --out out/treatment-evidence/P012/target-trace.json
```

An optional case `target` supplies a stable identity. A trial's `targetTraceFile`
and optional `targetTraceSha256` identify that actor's trace. A separate target
trace must match source/settings/Node and constructor identity, and pass its
observer check. Otherwise actual approach stays unavailable. Native inline
`targetTrajectory` is also supported with an explicit identity/source. Duplicate
conflicts are rejected; positions join only at actual simultaneous timestamps.
No time/position interpolation supplies an arrival.

`steps[].pursuit` now supplies the actual recorded horizon, selected time,
arrival estimate, signed slack, fallback/bypass status, target and pipeline
phase. All raw helper records remain with requests. Equality of a chase helper's
last returned command and `decision.raw` is reported; equality alone does not
establish policy activation or validate a shifted steering point. The recorder
can see helpers whose return is later discarded.

`predictionEvaluationWindow` explicitly bounds later observations used for a
sampled prediction deadline. P002's measurement remains [3.30,4.40], while its
declared deadline-observation span is [3.30,7.40]. Distances to the sampled point
and simultaneous actual target at that recorded time describe the continued
replanning trajectory. They are not a fixed-command reachability experiment,
nor evidence that the biased/leverage-shifted steering point was feasible.
Actual objective deadlines remain unavailable unless explicitly recorded.

Redirection reports the first contiguous reduction in heading error and,
separately, the first observed positive velocity along the sourced axis, after
`redirectionAfter` (window entry by default). Already-positive entry/anchor is
labelled. Native zero-speed headings stay undefined. These explicit response
events do not assert a correct football decision; inspect contact/support,
raw/applied requests and later response with them.

For treatment handoff, retain `exposureKind` (for example
`fixed-input-continuation` versus `new-whole-game-exposure`). Optional
`treatmentActivity` records the owner's activation witness, exact `actor`,
`window`, `appliedCalls` and `source`. Unscoped or missing activity is unavailable;
zero applications is an inactivity control. This is a proposed downstream
annotation, not an additional engine field or an agreed producer contract.
The controller owner must supply the actual activation definition/export.

The JSON comparison preserves raw/applied request differences, observer parity,
actual input identities, engine/settings identities and actor-level deltas.
It does not infer a favorable policy result from changed paths or final yards.
In particular, a fumble by another player cannot certify selected-pursuer
execution. Missing, rejected, partial, unknown-target and filtered-rejected
exposures remain visible. Raw portable captures, traces, manifests, tables and
test logs stay in ignored `out/treatment-evidence/`. Actual treatment and useful
independent transfer remain pending until the owner supplies those executions.
