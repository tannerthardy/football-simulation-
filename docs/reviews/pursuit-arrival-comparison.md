# Frozen pursuit arrival comparison (TKL-2)

This is an offline experiment, not a production pursuit correction. It separates
an estimator test, a particular steering policy's response, and runner forecast
error. The production controller, observations, contact and physical capacities
remain unchanged. The findings and portable input delivery are summarized in the
PR; generated inputs/reports belong in ignored `out/`.

## Source and frozen selection

Start: accepted develop `27617221a5d0cc2100226af7107be8fca64a401b`.
The native captures are #259 head
`06bf5ef7ee18ff0bca87362fa37386c6e002af55`, with Node 22.23.3 and their saved
resolved settings. #259 is merged. #260's INFO-1 changes and #255's measurement
branch are **not** simulator dependencies of this experiment. No change is made
to `common.ts` or its supplied-target exclusion contract.

Frozen native nominations, before comparing responses:

| Input | Actor | Target | Live decision time | Candidate horizons |
|---|---|---|---:|---|
| G1-P002 | D:SS `COM-LB1`, index 21 | O:RB `IRN-RB3`, index 6 | 4.25 s | 1.8 / 2.8 s |
| G1-P002 | same SS | same RB | 4.30 s | 1.8 / 2.8 s |
| G1-P012 | D:LB_W `IRN-LB4`, index 16 | O:RB `COM-RB1`, index 6 | 2.95 s | .15 s gather control |

Identity erratum (follow-up to #263): the earlier handwritten table/handoffs
mislabelled P002's catcher as `IRN-RB1`/index 1 and P012's index as 1. The
authoritative checksum-verified fixture already records `IRN-RB3`/index 6 and
`COM-RB1`/index 6 respectively. Those saved bodies, IDs, inputs and measurements
are unchanged; this corrects their human-readable labels.

The two normal plays are completed outcomes in unfinished game prefixes, not
completed games. P002 is **Comebacks**, not the audit's historical P002 sweep.
The full actor identity, actual target identity, calls, constructor checksum,
original outcome and source/settings are in each case. Do not infer roster
position from the SS slot label. A physics radius is a center-distance test,
not a promise that a legal grip will be acquired or survive.

The four #259 scalar inputs are also retained: aligned/head-on, transverse
momentum, faster crossing and escaping/fallback. They are declared **synthetic
complete bodies**: the native profile supplies the previously unspecified body
parameters, while the four estimator capacities remain 8/1/8/6 (vmax/tau/brake/
lateral). Radius is .7 yd. Coordinates are translated together by (40,26),
without changing relative geometry. Their unbounded algebraic paths are not
native football plays or NFL reconstructions. Capacity is identical across
arms of each case; these fixtures do not estimate human turning capacity.

## Capture and clocks

`pursuit-arrival.ts --capture` reruns a saved constructor input. During that
one normal execution it copies this instance's already computed helper record,
full Body, applied command and physics endpoints. It makes no extra perception,
decision, predictor, random draw or native physics call. Full initialization,
result, events, telemetry and replay must match the saved original. Complete
body state at the consumed helper must also equal state just before execution.

The authoritative starting Body uses V8 bytes/checksum, preserving every nested
support field, spin, sprint load, squeeze, filtered acceleration and any motor
history. Portable JSON tags preserve nonfinite support clocks and explicit
undefined elsewhere; use `parseArrivalJson` to read it. This is a bounded Body/
cue export, not a live-brain or general PlaySim serializer.

All clocks are live step-start seconds. `objective.horizon` is relative to that
decision; `clock + horizon` is its absolute deadline. Preserve the stored
floating sample time. Existing movement preview/World advances in .05-second
steps; `rows[].elapsed/t` state the actual response clock. Recorded samples are
used verbatim where present. P002's 2.8-second point at 4.25 was **not evaluated
by the native early-exit loop**; it is explicitly marked an offline evaluation
of that same consumed forecast. No later observation is substituted.

The runner forecast is exactly #259's fixed observed heading and relaxing
speed, with its recorded field bounds. The original future runner trajectory
is a separate diagnostic reference. Changing that reference cannot change an
objective or response. The runner might react differently to a counterfactual
defender; the frozen future is not a simulated counterfactual runner.

## Responses and interpretation

- `held-original`: hold the exact original applied request.
- `held-candidate`: aim once at the frozen candidate with the original requested
  speed/effort/other intent fields, and hold it. This is what the existing
  `previewFreeMovement` predicts; the independent World response must match it.
- `seek-candidate`: recompute only the direction to that fixed point at 20 Hz,
  retaining the same requested speed/effort/intent and all physical capacities.
  It is an offline fixed-point seek, **not** a production commitment timer.
- `seek-estimator-effort` (one attribution alternative): use the same seek,
  but match the estimator's full-effort assumption when the native command
  requests reduced effort. Both wanted speed and effort are aligned; the
  profile/body/support/forecast stay identical. Already-full-effort controls
  are inactive and exactly retain their requests. This is not a proposal to
  globally increase speed. The output states both native and response envelopes.

Selected native points also get their **actually recorded** bias/leverage
steering goal. Shifts are not invented for unselected points. Raw/applied
commands and their original ownership remain in the bundle. No offline rule
is labelled as a newly evaluated Pursuit decision. Close gathering has only
its original arm; intercept alternatives are intentionally inactive.

`recordedPairTrials` additionally crosses the two **verbatim recorded** requests
and steering points against both full native bodies. Each objective keeps its
original absolute deadline: the old 1.8-second objective has 1.75 seconds left
at 4.30; the later objective is 2.85 seconds ahead of the 4.25 body. The latter
cross has a cue from the next decision, explicitly marked unavailable at the
earlier clock. It is a diagnostic comparison, never a legitimate-information
policy proposal. `held-recorded` holds the exact recorded command; the seek
arm redirects toward that recorded steering point. No future cue enters any
other arm.

Each response starts from the full identical body and uses the unchanged
production World in empty space, with the native model and absolute clock.
The original request's first isolated full-body step is compared exactly with
the native step. Absence of contact/joints is recorded for the native actor;
an unloaded response is not a prediction through another body or a grip.

Measurements separate distance at the stated deadline, outside-radius error,
closest sampled point, first sampled radius entry, entry/minimum/end speed,
velocity heading, body facing, and signed miss along/left of the forecast
heading. Radius entry is sampled at 50 ms, not a substep contact timestamp.
Runner forecast error and distance to the **recorded future** runner are separate.
Facing is neither actual travel nor measured gaze. A torso turn does not erase
transverse momentum.

The necessary bound is a generous full-traction acceleration disk around
`p0 + v0*T`: radius `traction/mass * T*(T+dt)/2`, plus the objective's reach
radius. The dt allowance also covers a semi-implicit update; production free
motion uses trapezoidal translation. It applies only to the isolated body with
no external impulse. Exclusion can rule an arrival out under those assumptions;
passing **never** proves reachability. A seek miss is not an optimal-control
impossibility proof. Neither P002 point is excluded by this bound.

## Commands

On a source-compatible ordinary constructor capture:

```sh
node --import tsx scripts/diag/pursuit-arrival.ts --capture out/pursuit-P002/play.bin --actor SS --target RB --clocks 4.25,4.30 --out out/arrival/P002.json
node --import tsx scripts/diag/pursuit-arrival.ts --capture out/pursuit-P012/play.bin --actor LB_W --target RB --clocks 2.95 --out out/arrival/P012.json
node --import tsx scripts/diag/pursuit-arrival.ts --combine out/arrival/P002.json,out/arrival/P012.json --controls --out out/arrival/frozen.json
node --import tsx scripts/diag/pursuit-arrival.ts --input out/arrival/frozen.json --out out/arrival/comparison.json
node --import tsx scripts/diag/pursuit-arrival-export.ts --input out/arrival/frozen.json --results out/arrival/comparison.json --out out/arrival/panel
```

`--capture` checks actual execution equality, rather than relabelling an older
capture as current source. To regenerate the exact #259 input, use its published
capture commands on that pin. A portable frozen bundle from the PR comment can
instead be downloaded, checksum-verified and passed directly to `--input`.
No old source object or local absolute path is needed for that input delivery.
The response's current source/settings are recorded separately from its native
capture identity. The runner checks Node/settings and the content hash of
`src/physics`, `src/core` and `src/players` before comparing. An unrelated engine
change is separately qualified; a changed movement implementation is rejected.
The extractor and response operator also record their own code-content hash.

The exporter emits `selection.json`, `trials.json` and `manifest.json` in
Measurin's existing `movement-window-panel-v1` contract. Each case has stable
actors, absolute window, input/body/source pins, fixed evaluation point/deadline
and explicitly inactive arms. The selection bytes are hashed into the trials.
The manifest also indexes all eight recorded-point cross-comparisons, exported
with full timestamps/commands/states to `recorded-pair-trials.json`.
The fourth panel arm is the effort attribution, not an adopted controller fix.
Use the measurement owner's branch (an explicit tooling dependency) to run:

```sh
python3 scripts/data/movement_task_report.py out/arrival/panel/selection.json out/arrival/panel/trials.json out/arrival/panel/report.json --table out/arrival/panel/table.md
```

Panel owners are `OfflineArrivalExperiment`, with `evaluated:false`. Native
full-play restoration, isolated first-step equality and whole-play
counterfactual verification are distinct fields. The panel must not relabel
the latter as an exact original-play restoration; its ordinary verification
status correctly remains unavailable for these isolated trials. Missing gather
arms and filtered short-window rejection remain visible in exposure counts.

The next decision concerns a **steering-consistent estimate of the consumed
forecast**, not faster yaw/braking, mandatory stopping, a .8-second horizon or
a permanent held objective. The estimate also needs to agree with the request's
planned effort. Matching that assumption can change an arrival without any
capacity change; it does not establish contact with the actual runner.
Forecast accuracy still needs independent opposing
native inputs before a policy change can be justified. This experiment does
not establish that the audit's isolated reach-bound violation caused its native
P002 sweep, nor that touching a frozen forecast point would end P002 in a tackle.
