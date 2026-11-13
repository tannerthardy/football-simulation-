> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](../README.md) for remote evidence access and the next-work plan.

# Reproduce the information lane

Use Node 22.23.3 and the existing lockfile installation. The scripts use absolute workspace imports and a `tsx` loader installed in `/workspace/run-game-audit/node_modules`. They are research scripts, not portable package commands. Keep the immutable Phase I input and current isolated source trees at the recorded paths, or change every absolute import deliberately and record that change. No command below requires changing accepted source or defaults.

Accepted checkout: `/workspace/run-game-phase2-baseline`, commit `a5b024b9fbf8c51fc31401eefb79737be586814a`. Candidate copies are `/workspace/run-game-phase2-info-{geometry,detour,history,continuity,attribution}`. Each retained patch is relative to accepted source, not stacked on the preceding candidate. `candidate-identities.json` gives final complete-engine hashes. The attribution patch adds only a diagnostic mask for the existing bonus; it is not an installed candidate. Do not apply these patches to the accepted checkout. Exact source copies are available in this workspace; reconstruct elsewhere from the accepted commit plus the named patch and the same package-lock dependencies.

The commands below write `.repro` outputs to avoid overwriting retained measurements. Shell variables are conveniences, not engine flags.

```bash
NODE22=/workspace/run-game-research/runtime/node_modules/node/bin/node
TSX=/workspace/run-game-audit/node_modules/tsx/dist/loader.mjs
INFO=/workspace/run-game-phase2/information
OLD=/workspace/run-game-research/runner-set.bin
cd /workspace/run-game-phase2-baseline
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-phase2-baseline SHADOW_WIN=1 CROSS_MODELS=1 CROSS_HISTORY=1 "$NODE22" --import "$TSX" "$INFO/native-probe.mts" measure "$OLD" "$INFO/accepted-history-shadow.repro.json"
```

For each of `geometry`, `detour`, `history`, change cwd and `ENGINE_ROOT` to that isolated tree; use `SHADOW_WIN=1 CROSS_MODELS=0 CROSS_HISTORY=0` and the same `measure` arguments. Each input has a native plain replay and an instrumented native replay. Accepted cross-model shadows add evaluator calls but install no shadow commands. Runtime JSON files record original argv, cwd, relevant environment and measured wall seconds; JSON `ms` is the script's internal interval and is not identical to process wall time. These diagnostic costs are not engine throughput benchmarks.

Fresh heldout capture was declared before execution. It advanced 42 and 44 match steps respectively to obtain 12 designated runs per seed 13/14; these are not 24 complete games. Input is already retained, so regeneration is optional:

```bash
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-phase2-baseline "$NODE22" --import "$TSX" "$INFO/holdout-capture.mts" capture "$INFO/heldout-set.repro.bin"
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-phase2-baseline SHADOW_WIN=1 CROSS_MODELS=1 "$NODE22" --import "$TSX" "$INFO/native-probe.mts" measure "$INFO/heldout-set.bin" "$INFO/heldout-accepted.repro.json"
cd /workspace/run-game-phase2-info-geometry
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-phase2-info-geometry SHADOW_WIN=1 CROSS_MODELS=0 "$NODE22" --import "$TSX" "$INFO/native-probe.mts" measure "$INFO/heldout-set.bin" "$INFO/heldout-geometry.repro.json"
```

Decision islands, native credit attribution, live-gap controls and transition diagnostics:

```bash
cd /workspace/run-game-phase2-baseline
env -i PATH=/usr/bin:/bin "$NODE22" --import "$TSX" "$INFO/decision-controls.mts" "$INFO/decision-controls.repro.json"
env -i PATH=/usr/bin:/bin "$NODE22" --import "$TSX" "$INFO/credit-attribution.mts" "$INFO/credit-attribution.repro.json"
env -i PATH=/usr/bin:/bin INPUT="$INFO/heldout-set.bin" NOMINATIONS='[{"id":"S14-P054","t":1.3}]' "$NODE22" --import "$TSX" "$INFO/credit-attribution.mts" "$INFO/heldout-credit-attribution.repro.json"
env -i PATH=/usr/bin:/bin "$NODE22" --import "$TSX" "$INFO/live-gap-shadow.mts" "$INFO/accepted-native.json" "$INFO/live-gap-shadow.repro.json"
env -i PATH=/usr/bin:/bin "$NODE22" --import "$TSX" "$INFO/live-gap-command-shadow.mts" "$INFO/live-gap-command-shadow.repro.json"
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-phase2-baseline MODE=suppress-exit "$NODE22" --import "$TSX" "$INFO/transition-boundary.mts" "$INFO/transition-suppress-exit.repro.json"
cd /workspace/run-game-phase2-info-geometry
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-phase2-info-geometry MODE=force-exit "$NODE22" --import "$TSX" "$INFO/transition-boundary.mts" "$INFO/transition-force-exit.repro.json"
```

The live-gap command script consumes the retained `live-gap-shadow.json` by a hardcoded path. The transition script consumes both retained binary sets and uses three nominated times inside its source. These are deliberately conditional diagnostic interventions, not autonomous football policies.

`protection-islands.mts OUTPUT.json` runs the four native-boundary/two-body controls. **It also writes the fixed path `protection-island-inputs.bin`**, so preserve that file or run a copied script with its output path changed when reproducing. It imports accepted World and records 12/48-substep arms. `continuity-pilot-history.json` can be reproduced with native-probe, `ENGINE_ROOT=/workspace/run-game-phase2-info-continuity`, `IDS=S12-P011`, `SHADOW_WIN=1 CROSS_MODELS=0 CROSS_HISTORY=0`; cwd must match that isolated tree.

The focused existing tests ran in the geometry tree:

```bash
cd /workspace/run-game-phase2-info-geometry
env -i PATH=/usr/bin:/bin "$NODE22" /workspace/run-game-audit/node_modules/vitest/vitest.mjs run test/carrier-crease.test.ts test/carrier-decision-cadence.test.ts test/carrier-boundary.test.ts test/carrier-recovery-cue.test.ts
```

Check the retained test log for actual test names/counts. Postprocessing alone is `python /workspace/run-game-phase2/information/summarize.py`; it rewrites only `summary.json` from retained measurements. `script-provenance.json` hashes final packaged scripts. Earlier script versions were not individually snapshotted; metadata additions and failed oracle experiments are documented in the report and retained outputs. A rerun with the final collector may include additional metadata fields without changing football results. Do not interpret the old `.bin` capture identity as a current-source capture.
