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
