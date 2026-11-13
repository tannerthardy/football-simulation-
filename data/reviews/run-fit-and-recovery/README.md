# Run fits, Draw presentation and recovery

Read the [review and next steps](../../../docs/reviews/run-fit-and-recovery.md)
first. Parent commit: `9c3c809af5506fa6882831b1f36602ed07684d02`.
Final whole-source SHA-256:
`c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8`.
[Source phases](source-phases.json) distinguish final native execution from
isolated foundations/components and the selected-snap controller counterfactual.
All physical laws, profile mappings, shared force/work/grip budgets and
resolution remain unchanged.

The strongest causal witness changes the retained untouched 90.6-yard Duo
touchdown into a six-yard physical tackle using only that snap's delayed
possession and man-to-run-fit transition. Earlier game history and complete
selected initial state remain exact. This is **not a final-native game or a
league statistic**. The possession-only control preserves the original finish.
See [Duo findings](duo/findings.md) for the first actual cue/request and loaded
grip/support lifecycle.

## What is retained

| Directory | Evidence and limits |
| --- | --- |
| `targeted/` | All 24 predeclared ordinary native inputs in both engines, full generated rosters, initial/endpoint state, complete tick/request/picture traces, full films, observer/RNG controls and every outcome. Eight Cover 1 Off fits acquire possession; eight Cover 0 controls remain physically exact. Draw presentation improves while its mean worsens 2.85→.88 yd. |
| `duo/` | Three isolated selected-snap phases, full hidden-state traces stored losslessly, observer controls, consumed cues, requested/achieved movement and actual contact/support/work. Retrospective one-play counterfactual, not representative frequency. |
| `foundation/` | Four predeclared native run/PA/dropback/pitch controls. Adding only the historical carrying channel is completely inert apart from the intended metadata. |
| `draw/` | Two isolated Gun Doubles Draw mirrors and all feature controls. Right gain improves; left worsens. Adverse helper-surface diagnosis is labeled an inference/hypothesis, not measured helper force. |
| `recovery/` | Exact original, recovery-only and final native witness. Same center recovery stays live and ends through actual leg support loss/contact. Acquisition and fumble/return credit remain. |
| `runs/`, `passing/`, `approach/`, `comparisons/` | Complete unchanged-cohort broad guards, exact input/profile/tool checks and all adverse outcomes. One defensive return becomes a TD despite unchanged offensive gain; one approach recovery changes. Four isolated inspection censors remain separate from natural ends. |
| `contact-audit/` | Nine read-only terminal witnesses and the retained-panel hold-age screen. The four-second cap does not explain those current tails; a tackle label alone does not prove a physical finish. |
| `components/` | Three minimal patches reproducing the exact possession-only, Draw-only and recovery-only source pins from the parent. Patch application was independently verified. |
| `games/`, `cost/` | Eight generated games with matching starting league inputs but diverging later populations; a separate sequential two-game CPU guard. Lower YPC accompanies more stuffs and higher scoring. No calibration/speedup claim. |
| `checks/`, `viewer/` | Full 1,074-test suite, final 15-case fixture rerun, 66 Python tests, clean compiler/build, initial compiler failures, 38 real-browser checks, screenshots and a decoded WebM sample. |
| `tools/` | Exact original collector/checker/codec bytes. Restore their original locations before running imports; historical paths are provenance. |

[Baseline references](baseline-references.json) fingerprint the immutable
previous packet rather than copying all its broad controls. Targeted results
are new comparisons against that same parent. Natural plays, retrospective
witnesses and isolated inspection encounters must remain separate populations.
Generated players/call frequencies do not represent NFL samples.

## Reproduce broad native controls

Use Node 22.23.3, installed lockfile dependencies and a frozen checkout with the
final source pin. Write new output to ignored `out/`; this reviewed packet is
immutable once published.

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/run-fit-review/runs.json.gz
node --import tsx scripts/diag/decision-awareness.ts out/run-fit-review/passing.json.gz
node --import tsx scripts/diag/tackle-approach-review.ts out/run-fit-review/approach.json.gz
python3 data/reviews/run-fit-and-recovery/tools/compare-panels.py --help
node --import tsx scripts/calibrate.ts 8 7 2
node --import tsx scripts/diag/physics-cost.ts out/run-fit-review/cost.json 2 9
node node_modules/vitest/vitest.mjs run --maxWorkers=1
npm run typecheck
npm run build
npm run test:data
```

`compare-panels.py` compares saved inputs only. Its defaults retain historical
`out/run-fit-follow-up/` paths; inspect its CLI before choosing new paths.
The broader collectors also write companion fixed-selection film. This
packet preserves those bytes even though the primary viewer uses the new
targeted cohort. Do not select fresh film by whether a gain looks better.

## Watch and rebuild the film

Open the HTML inside [the offline ZIP](../../../viewer/run-fit-and-recovery.zip).
There are **48 native clips**, both phases of all 24 targeted inputs. `B-`/`F-`
preserve the fixture ID; group/filter by concept, front, coverage or phase.
Select a defender to inspect the acquired possession picture and actual
`coverage-run-fit` choice. The film keeps successful blocks, mistakes, unchanged
controls and adverse Draw outcomes. It includes no hybrid counterfactual clips.
The recorded body-facing marks are not eye tracking.

Rebuild from saved data without simulating:

```sh
node --import tsx scripts/export-run-fit-recovery.ts \
  data/reviews/run-fit-and-recovery/targeted/baseline-film.json.gz \
  data/reviews/run-fit-and-recovery/targeted/final-film.json.gz \
  data/reviews/run-fit-and-recovery/targeted/cohort.json \
  out/run-fit-review/comparison.html
```

The exporter requires all input, source, tool, full player/profile, initial
frame and recording controls before rendering. The ZIP contains the exact
checked single HTML, with embedded positions and compressed full telemetry.
Generated plain HTML remains ignored locally; the ZIP is the published copy.
The [viewer receipt](checks/final-viewer-receipt.json) uses original collection
paths; the checked bytes are mapped here and inside the ZIP. All 38 browser
checks pass, with no JavaScript errors and font networking blocked. Actual
WebM export is decoded with ffprobe; [the sample](viewer/sample-export.webm)
is a functional export check, not a new simulation.

## Restore narrower research tools

The archived collectors are intentionally exact original bytes rather than
rewritten tools that might alter a witness. Restore source snapshots under
ignored paths, keeping package/tsconfig, dependencies and
`scripts/source-version.ts`. `sourceVersion` hashes full relative filenames in
lexical order, filename NUL, file bytes NUL.

- `targeted-panel.ts` belongs in `out/run-fit-follow-up/`. It takes `baseline`
  or `final`, running with the corresponding frozen archive as cwd. It reads
  the saved `targeted-cohort.json` from its declared root path. Restore
  `targeted/cohort.json` there exactly rather than silently regenerating it.
  `declare-targeted-panel.ts` records the cohort before simulation using the
  frozen baseline; declaration timestamps are historical evidence.
- `foundation-native-controls.ts` belongs in `out/possession-cue/`; its archive
  paths separate the parent from the foundation-only source. Decode and apply
  `components/possession-foundation.patch.gz` to the parent to reproduce that
  source without the recovery whistle change.
- `draw-component-review.ts` belongs in `out/run-entry-pose-audit/`; inspect its
  archive/argument paths. Decoded `components/draw-only.patch.gz` reproduces its isolated
  module. Restore the retained collector's named output paths as needed.
- `recovery-native-follow-up.ts` belongs in a frozen checkout's `scripts/diag/`.
  It takes output path and announced source pin. Parent, recovery-only patch
  and final source remain separate phases.
- `duo-transition-witness.ts.gz` and `summarize-duo-transition.py.gz` unpack into
  `out/run-fit-follow-up/`. The collector imports frozen parent/final archives
  and the immutable previous tail audit; see its named paths before running.
  It preserves the previous game's snaps until the selected target, then
  changes only the explicitly declared controller/channel.
- `cue-boundary-final.ts` belongs in `out/run-fit-follow-up/review/`. It verifies
  old saved cue/profile inputs against the current approach report. These three
  recordings are controls, separate from the primary targeted film.
- Broad collector copies belong in `scripts/diag/`; the browser checker is
  unpacked under `out/run-fit-follow-up/review/`. Restore exact relative imports.

Decode the lossless Duo archive without any engine imports:

```sh
node data/reviews/run-fit-and-recovery/tools/duo-witness-codec.mjs decode \
  data/reviews/run-fit-and-recovery/duo/witness.delta.json.gz \
  out/run-fit-review/duo-expanded.json.gz
```

It verifies the exact expanded JSON SHA-256 before writing. The archive
reconstructs all 339,983,239 original JSON bytes from 6,231,010 compressed
bytes; no observation is projected away. The two targeted trace files retain
their ordinary raw gzip form: an experimental delta saved only 13.6%, so its
additional codec dependency was withheld.

Use [the manifest](manifest.json) to verify publication bytes. Logs and large
JSON/tool files ending `.gz` decode to the original contents. Feature receipts
and evidence retain original collection filenames and explicitly disclose the
type-only fixture correction after the full suite. No failed outcome is hidden
or replaced with a tuned force/guaranteed result.
