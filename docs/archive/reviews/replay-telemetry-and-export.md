# Source telemetry, player inspection and short video export

The viewer now records and displays a useful first portion of the visualizer
plan. The physics and football controllers are unchanged by recording. Missing
observations and decision causes remain explicit; a convincing explanation is
not synthesized after the play.

## What is recorded

`PlaySetup.recordLevel` and `GameOptions.recordLevel` select `light` (default),
`standard`, or `full`; recording must also be enabled. The exporter accepts
`--telemetry`. The shared schema is in `src/sim/types.ts`; the collector is
`src/sim/telemetry.ts`.

| Level | Additional state |
|---|---|
| Light | Existing paths, facing, ball, events. New exports also retain precise event actors and source notes. |
| Standard | Actual behavior/job/target, adjusted zone landmark, man leverage/press/hip state, final movement intent, fit contract, protection and run-block plan, live block/tackle relationships, exact coverage-job switches. |
| Full | Velocity, energy, posture, usable support, pad-height proxy, lean force and support deviation; run/pass and QB coverage beliefs; real requested perceptions/QB estimates; block control, angular progress, bases and hand limits/forces; tackle grip/joint state; last-step contacts; QB phase/read/pending throw evaluation; ball state and intended arrival. |

Snapshots use the positional replay's sampling boundary, including local
commands during pre-snap staging. `sampleEvery` means simulation ticks;
`sampleSeconds` specifies the interval explicitly (normally 0.1 s). Positional
frames retain their existing format; extra numeric telemetry is mostly rounded
to two decimals. Decision times retain the engine's 0.05 s tick timestamps.

`PlaySim.see` records the result that was actually returned. `QBMind.estimate`
records its actual memory-based estimate. Recording never calls either method
again to fill a panel and never advances the release reader. Perception keeps
the last request for an observer/target/source at the sampled tick. It is not
an exhaustive vision map. `see` age is visual sample latency; `qb` age is QB
memory age and excludes the additional latency already present in that memory.

Coverage decisions come from real job switches. Their listed inputs are reads
already consumed by the rule/judgment, and the available alternatives are the
primary rule directive and final judgment directive. Causal attribution remains
`cue: null`: these inputs do not prove which particular cue caused the choice.
Other behavior decisions are not yet universally instrumented.

The full records are copied from state, not live references to bodies or
belief maps. In particular, inspection does not run the protection coordinator,
evaluate an extra throw or draw an extra random value.

## What the viewer adds

Click a player or select him from the list. The inspector shows identity,
weight and recorded ratings, job/target/technique, movement and support, fit and
blocking plan, relationships, current block or grip values, actual decision
records, and detailed event notes. The ball detail includes height, possession,
and recorded intended flight arrival. The QB panel reports his current belief
and pending evaluation, not all possible throws.

Assignment, requested-movement, contact and perception layers can be stacked.
Perception ghosts require full recording and a selected player. Discrete jobs
and beliefs use the latest preceding sample; they are not interpolated into
fictional intermediate states. Legacy files still work, with unavailable layers
disabled and absent detail labeled unrecorded.

The units matter:

- Block `phi` is progress in quarter turns: 1 means 90 degrees, not one radian.
- Support availability is usable footwork under the existing reduced support
  model, not a probability of winning or falling.
- Lean and hand/grip force values use kg·yd/s²; extension and support offsets
  use yards. Configured push/hold/steer capacities differ from delivered force.
- The recorded QB pressure field is a count of high-pressure decision ticks,
  not seconds or a fresh pressure estimate.
- Pad height is the existing anthropometric proxy. No skeletal limb positions
  or a full 3D collision model are inferred.

## Short videos

Set the start/end times and choose **Export video**. The browser records the
visible field and layers at 1× into a WebM clip, with ID, source hash, seed,
timestamp, calls and result burned into the video. It records silently at
1280×840 with a requested 30 fps, and takes roughly the selected real duration.
Playback position/speed and inspector selection are restored afterward. Cancel
or hiding the tab cancels the capture rather than producing a partial clip.

The browser must support Canvas `captureStream`, `MediaRecorder` and a WebM
codec; unavailable support produces an explanation instead of a broken button.
No MP4 conversion is implemented. Use a standalone HTML in a supported browser
when an embedded preview restricts scripts or downloads.

## Reproduce and validate

```sh
node --import tsx scripts/export-replay.ts 7 --games 6 --telemetry standard --doc --out viewer/film-room.html
node --import tsx scripts/export-inspection.ts viewer/inspection-room.html
node --import tsx node_modules/vitest/vitest.mjs run test/replay-telemetry.test.ts test/replay-export.test.ts test/replay-telemetry-packing.test.ts
python3 scripts/check-replay-viewer.py viewer/film-room.html --video-out out/film-clip.webm
python3 scripts/check-replay-viewer.py viewer/inspection-room.html --video-out out/inspection-clip.webm
```

The separate inspector contains six **controlled fixtures**, labeled LAB-P001
through LAB-P006. They use ordinary generated rosters and unmodified play
controllers/world, with fixed offense/defense roster seeds 21/22 and play seeds
5/7/9/11/13/15. They are not game outcomes, an NFL cohort, or counterfactual
reproductions of the owner's earlier clips. The viewer labels the cohort and
hides the synthetic score display.

An existing library can be rebaked without rerunning games or replacing its
source metadata. This helper verifies every decoded telemetry payload, outer
play field and library metadata before writing the current template:

```sh
node --max-old-space-size=4096 --import tsx scripts/repack-replay.ts saved-library.html viewer/film-room.html
```

Focused verification passes 27 tests: 20 export/CLI tests, five recording
contracts and two lossless-packing contracts. Pass and run fixtures preserve exact results, events, positional
frames, final bodies and next RNG draw across all three levels. Tests also
check source-copy stability, real coverage history, disabled recording,
pre-snap commands and the unique snap frame. Typecheck is clean. Browser checks
exercise new inspection/layers and legacy behavior, invalid ranges, unavailable
recorders, injected recorder failure, cancellation and state restoration.
Actual downloaded VP9 WebM clips were decoded with `ffprobe` (1280×840;
36–43 decoded frames for requested 1.2 s clips), not merely checked for a
download event. Capture requests 30 fps; actual frame counts depend on browser
scheduling. Browser checks passed 28 checks on the existing 884-clip legacy
library. The final compressed standard library passed 32 checks across 875
filmed clips, with initial load in 4.170 s and 43 decoded video frames. The six
final-source compressed full fixtures passed 34 checks, loaded in 0.614 s and
produced 36 decoded video frames. These runs also force selection before
an in-flight decode completes, enforce the three-play cache limit, exercise
missing/corrupt decompression, and complete decoding during video capture to
verify that controls remain locked and then restore correctly. Timings are
observations from the test environment, not browser-wide performance guarantees.
Published evidence is in `data/reviews/physics-world/grip-budget/film-browser.json`,
`inspection-browser.json`, `legacy-browser.json` and `video-verification.json`.
Combined physics/source validation is recorded in the current
physics handoff before publishing the refreshed artifacts.

## Packaging and remaining design work

The optional telemetry is versioned JSON compressed losslessly per play with
gzip/base64. `const REPLAY` keeps positions, events, roster and library metadata
immediately available; the viewer decompresses only the selected play and
retains at most three decoded plays. Decode requests are serialized and stale
selections cannot overwrite the current one. Browsers without
`DecompressionStream('gzip')`, invalid payloads or unsupported versions show an
explicit inspection status while positional playback remains usable. Older
raw-JSON telemetry and light replays remain supported. Exporters and the rebake
helper share `scripts/replay-telemetry-packing.ts`.

The final-source standard library initially occupied 205,477,371 bytes. Per-play
compression reduced it to 43,510,636 bytes (about 41.5 MiB), below GitHub's 100 MB
file limit. The saved cohort contains 1,118 entries, 875 filmed clips and 765
official scrimmage plays across six games. All 875 telemetry payloads roundtrip
exactly through JSON, with every outer field and library metadata unchanged;
see `data/reviews/physics-world/grip-budget/film-packaging.json`. This avoids expanding the entire
telemetry library during initialization, though the uncompressed positional
data still contributes substantially to the single-file size.

The planned columnar channels are still pending. Shared TypeScript types cover engine and packaging; the inline
standalone viewer is still JavaScript, so browser contracts guard its schema
instead of a shared TypeScript viewer build. Six provisional full fixtures
contain 92–176 KB of gzipped telemetry per play; some exceed the proposed
150 KB budget. A full library of hundreds of such clips would be expensive,
which is why the main film library uses standard detail and the separate small
inspector uses full detail.

Complete causal decisions, all rejected throw/lane candidates, gaze cones,
ball-security meters, named camera/view presets, pocket polygons, side-on
trench art, pre-snap play art, swimlanes, automatic diagnoses, reachability maps
and paired comparisons remain planned. The source collector can be extended
when those real controller states exist; the viewer must continue to expose
missing state instead of guessing it.

This work makes physics easier to inspect. It does not establish physics
readiness or repair coverage, pursuit, tackling or contact convergence.
