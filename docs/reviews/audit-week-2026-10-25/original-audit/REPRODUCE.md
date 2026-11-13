# Reproducing the second audit

This package preserves the inputs, experimental scripts, sandbox patches, and outputs used for the deeper audit. It does **not** contain a proposed production patch. Start from the exact source revision below. Reading the saved results and figure does not require running a simulation.

## Pin, environment, and identity

- Repository: `https://github.com/tannerthardy/football-simulation-`.
- Revision: `c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`.
- Final freshness review: `ccdb69cba81e07c578f607ff1bf8ce0efe2edc68` / PR #246 adds only VIEW-1 documentation. Simulation source is identical; use the experimental pin for exact restoration. See `evidence/freshness.json` and `freshness.diff`.
- Runtime used: Node **22.23.3**, dependencies from the repository's `package-lock.json` (`tsx` 4.20.3, TypeScript 5.9.3, Vitest 3.2.4).
- Measurement runtime: Python **3.12.14**, NumPy **2.3.5**, pandas **2.2.3**. Figure runtime: matplotlib **3.10.8**. `git` and `patch` are needed by the restoration helper.
- No football feature-flag overrides were enabled for the ordinary game or the native baselines. Use a fresh environment; inherited `PASS_FIRST`, `PURSUE_AROUND`, `RUN_READ`, `SAFETY_TEMPO`, or other simulator overrides can invalidate comparisons.
- No `node_modules`, Node binary, Python environment, full production source tree, or external NFL tracking corpus is bundled. Repository access and installing the pinned dependencies are prerequisites for rerunning simulations. The stored evidence remains readable without them.

The ordinary input game is root `Rng(7)`, sequentially generated Ironmen/IRN then Comets/COM, strength `.55`, game seed `7`, light replay. The score is 36–29. Its identity is **not** interchangeable with a scorecard game or an older clip bearing the same `G1-P002` display ID.

`evidence/native-film.json` is the complete original current film:

- File SHA-256: `2ef353340021f522e8b37b347feeaf13bff8da460331051de3b462e4338a69c1`.
- Embedded source-version hash: `3e0bdcf720c1ba1df51848b48c6faece48e0860b43e956de1ad6ef372540f7a1`. This is the simulator's source hash, not the Git commit or the JSON file hash.
- `evidence/architecture/instrumented-film-plays.json` reproduces the original film's **entire packed plays array exactly**. `ordinary-census.json` records `neutralEqualPackedReplay: true`.

The capture contains 130 pre-constructor setup files, 127 play-result census rows, and 10 detailed selected traces. Those count different stages; do not treat all three as game-play counts or denominators. The selected traces are P002, P011, P017, P019, P029, P031, P038, P060, P117 and P142.

## Preserve the originals before rerunning

The experiment scripts write to their output locations, and some architecture scripts write directly into the audit's `evidence/architecture` directory. **Use a copy of this package and a disposable pinned checkout when regenerating results.** The preparation helper changes only restored scripts' absolute artifact paths and creates fresh source sandboxes; it does not change tracked production files or run any simulation.

In the original workspace:

```sh
export PATH="/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH"
export FBA_REPO=/workspace/football-audit
export FBA_AUDIT=/workspace/audit-deep
export FBA_SANDBOX=/tmp/football-audit-reproduction
cd "$FBA_REPO"
git rev-parse HEAD
npm ci --no-audit --no-fund
python3 "$FBA_AUDIT/prepare-reproduction.py" --repo "$FBA_REPO" --audit "$FBA_AUDIT" --sandbox-root "$FBA_SANDBOX"
```

Choose a fresh `FBA_SANDBOX`; the helper refuses to overwrite an existing one. On another machine, install Node 22.23.3, put it on PATH, and set the three paths to your pinned checkout, copied audit package and fresh scratch directory. Check out the exact commit before running the helper. Python packages can be installed into a separate virtual environment if unavailable:

```sh
python3 -m venv /tmp/football-audit-python
/tmp/football-audit-python/bin/pip install numpy==2.3.5 pandas==2.2.3 matplotlib==3.10.8
```

Use that environment's Python for measurements and figures. It is not needed by the TypeScript simulations.

To regenerate the reading formats, install Python Markdown 3.11.2, ReportLab 4.4.9 and Pillow 12.3.0, then run `python3 render-report.py` and `python3 render-report.py --full` from the copied package. The first command creates the HTML and consolidated PDF; the second also creates the complete PDF with appendices. The report is static; no simulator execution occurs during rendering.

Preparation restores `out/forensic-*` scripts and saved outputs, decompresses the additional large JSON outputs, restores the original film at `out/audit/film.json`, creates `film` and `architecture-game` sandboxes from the clean pinned `src/` and `scripts/`, applies the respective combined patches, and links their `node_modules` to the pinned checkout installation. Only known absolute artifact-path strings in copied audit scripts are rewritten. `restore-receipt.json` in the scratch directory records those rewrites.

Preparation was exercised without running simulations. Both reconstructed sandbox source trees matched the original experiment sandboxes byte-for-byte, excluding Python bytecode caches. Production `git status --short` remained empty. See `evidence/restoration-check.json`.

## Native setup restoration: do not regenerate a lineup from the seed alone

`G1-PNNN-setup.json` is serialized **before constructing PlaySim**. It preserves the call, players, scouting, energy, styles, situation, audibles, wind and seed/RNG state that construction consumes. A later `PlaySim` dump is not an equivalent starting input. Preserve object insertion order: the input-order experiment demonstrates that reordering the same player mappings can itself change execution on this revision.

The JSON requires a reviver:

- `{"__type":"Map","entries":[...]}` → `new Map(entries)`.
- `Set` uses the analogous entries form.
- `Rng` → `Object.assign(new Rng(key), fieldsWithoutType)`; do not merely reseed an already-consumed stream.
- `ScoutingReport` and `CoverageScouting` → fresh class instance plus saved fields, retaining their prototypes and nested maps.
- `{"__number":"-Infinity"}` and the other nonfinite strings → `Number(value)`.

The implemented revivers are included both for repository-relative scripts (`evidence/architecture/scripts/repository-out/revive.ts`) and sandbox scripts (`evidence/architecture/scripts/sandbox/revive.ts`). The film and contact scripts contain their own equivalent revivers. Slot identities must be read from each trace: P019 LB_W is index **16**, while P029 CB_S is index **18**.

Baseline verification is part of the experiments, not an optional final-yardage check. The film harness compares every actor's pre-tick position, velocity and facing and complete result/events to the selected native trace, then records the first intervention divergence. Contact scripts verify native output and unchanged prefixes. The workload observer verifies full result hashes. A failed neutrality check invalidates its dependent causal comparison.

## Focused reproduction commands and artifact map

Run repository-relative commands from `$FBA_REPO`. Run sandbox commands from the specified sandbox. Prefer the particular check needed; this document is not an instruction to rerun every experiment or the entire game.

### Film: pursuit and conditional run support

```sh
cd "$FBA_SANDBOX/film"
node --import tsx native.ts G1-P002 21 baseline yaw2x horizon08 accel0 brakeTurn fresher015 angularAcquired
node --import tsx native.ts G1-P117 21 baseline yaw2x horizon08 accel0 brakeTurn fresher015 angularAcquired
node --import tsx native.ts G1-P038 21 baseline angularAcquired
node --import tsx native.ts G1-P017 15 baseline angularAcquired
node --import tsx native.ts G1-P029 18 baseline acquiredFit acquiredBlockingFit
node --import tsx native.ts G1-P019 18 baseline acquiredFit
node --import tsx native.ts G1-P017 17 baseline acquiredFit acquiredBlockingFit
node --import tsx analyze.ts
node --import tsx slacks.ts
```

Outputs go to the restored repository's `out/forensic-film/`. Packaged originals are `evidence/film/`. Each arm includes selected actor states, final requests, interception points when computed, event lists, and the first divergence. `all-arm-summary.json` inventories the 32 saved unique arms from the investigation. Per-play `*-summary.json` files contain the last invocation's selected arms, not the complete historical set; the individual arm files are authoritative.

`angularAcquired` is the conservative headline forecast trial: it waits for personally consumed `carrying=true`. `angularForecast` is an earlier, globally activated exploratory variant and is retained separately. The retained `zeroDelay` variant conflates fresher information with removal of the two-picture acceleration estimate; it is excluded from substantive conclusions. `fresher015` preserves the intended older-picture spacing. An intervention count of zero does not mean a forecast arm was inactive: that field counts explicit policy/request replacements. Use the arm definition and first physical divergence.

Combined source changes are in `evidence/patches/film.patch`: only `behaviors/common.ts` and `behaviors/defense.ts`, with selected-actor diagnostics and optional interventions. They are sandbox changes, not a production recommendation.

### Locomotion and reach

```sh
cd "$FBA_REPO"
node --import tsx out/forensic-locomotion/native-replay.ts
node --import tsx out/forensic-locomotion/reach-bound.ts
node --import tsx out/forensic-locomotion/motor-panel.ts
node --import tsx out/forensic-locomotion/steering-panel.ts
node --import tsx out/forensic-locomotion/pursuit-panel.ts
```

These use unmodified pinned production imports. `native-replay` requires the saved P002 trace and `G1-P002-SS-3.8-body.json`. Other panels generate their profiles/scenes deterministically in their scripts. Originals are in `evidence/locomotion/`; full `motor-panel.json.gz` and `pursuit-panel.json.gz` are losslessly compressed. Smaller summary JSONs are retained as convenient postprocessed selections; the full raw outputs are authoritative. The panel scripts regenerate full outputs, not necessarily every hand-selected summary file.

Open-loop replay of native requests is not a changed full-play outcome. The transverse reach witness is a controlled capability/estimator test, not a native prevalence count or demonstrated explanation of P002.

### Contact

```sh
cd "$FBA_REPO"
AUDIT_ARCHITECTURE_DIR="$FBA_AUDIT/evidence/architecture" node --import tsx out/forensic-contact/native-dive.ts
AUDIT_ARCHITECTURE_DIR="$FBA_AUDIT/evidence/architecture" node --import tsx out/forensic-contact/blocked-facing.ts
node --import tsx out/forensic-contact/acquisition.ts
node --import tsx out/forensic-contact/dives.ts
node --import tsx out/forensic-contact/law-transfer.ts
node --import tsx out/forensic-contact/tangent-channel.ts
```

Scripts and originals are in `evidence/contact/`. `dives.ts` imports `acquisition.ts`'s `stage` helper. The native inputs are P048 for dive acquisition and P019 for blocker-facing. `contact-hook.ts` produces the ordinary-game contact census when installed by the architecture collector. Forced successful execution in the synthetic acquisition panels is a geometry/physics control, not an estimated dive success probability. The contact-law mode comparison is bundled; the tangential-channel surrogate is a separate narrow diagnostic. Neither is an approved replacement contact law.

### Decision alternatives and native action lifetime

```sh
cd "$FBA_REPO"
node --import tsx out/forensic-decision/alternatives.ts
node --import tsx out/forensic-architecture/zone-cache.ts
node --import tsx out/forensic-root/aim-native.ts
```

`evidence/decision/` contains the synthetic alternatives, exact comparison assertions, stdout and focused-test log. `evidence/architecture/zone-cache.json` is the synthetic second-role witness. `evidence/root/aim-native-summary.json` and `aim-native-traces.json.gz` contain the seven native paired continuations P029/P093/P095/P129/P149/P159/P160. They distinguish a stale returned goal, an actual request change, and a physical change. Retain the inert controls.

The broader saved-setup exposure census can be regenerated separately:

```sh
node --import tsx out/forensic-root/aim-census.ts
```

This restages all 130 captured constructor inputs plus paired comparisons. It is broader than the focused native continuation; it does not generate a fresh game or provide an independent held-out cohort. `aim-census.json` and its original log are packaged. Exact observed counts describe this saved input set.

The existing targeted contract tests previously passed:

```sh
npx vitest run test/first-threat.test.ts test/projected-cap.test.ts test/coverage-judgment.test.ts
```

They are not a substitute for the recorded causal experiments or proof of football generalization.

### Architecture: acquisition, mutation order, and native collector

```sh
cd "$FBA_SANDBOX/architecture-game"
node --import tsx catch-deferral.ts
node --import tsx native-cache.ts
node --import tsx plan-order.ts
node --import tsx replay-one.ts
```

Scripts are in `evidence/architecture/scripts/sandbox/`; outputs are in `evidence/architecture/`. `catch-deferral` is a four-arm SS-only acquisition experiment; changing either information route alone is not equivalent to changing both. `native-cache` is the P029 inert cache witness, not the later root continuation that proves active consequences in P093/P095. `plan-order` is the deliberately bounded early-read intervention. `replay-one` reconstructs the P002 3.8-second body snapshot and reports event neutrality.

`evidence/patches/architecture-game.patch` changes three source files: PlaySim stage/setup hooks, a game play-ID hook, and a default-off acquired-holder predicate used only by the catch factorial. The original full-game collector ran before the later predicate was added; the saved predicate is inactive unless the experiment enables it. No production source file was edited.

Only if the native capture itself must be regenerated:

```sh
cd "$FBA_SANDBOX/architecture-game"
node --import tsx collect.ts
```

That command runs the original ordinary game, overwrites setup/trace/census outputs in the **copied** audit package, and compares its packed plays to the restored original film. This is the largest optional reproduction step. The original capture and exact equality receipt are already preserved; the packaging task did not rerun it. An older `instrumentation-playsim.diff` covers only one source file; use the combined patch above for complete reconstruction.

### Root controls: input order and workload

```sh
cd "$FBA_REPO"
node --import tsx out/forensic-root/input-order-first-request.ts
node --import tsx out/forensic-root/input-order.ts
node --import tsx out/forensic-root/workload.ts
```

All scripts, summaries and original logs are in `evidence/root/`, with `input-order-full.json.gz` preserving full sampled states. The order panel changes only insertion order of identical player mappings, with canonicalization controls. Workload counts distinguish one-body previews from native 22-body steps. Its recorded wall times were obtained under concurrent audit load and include observer overhead; do not treat them as a clean throughput benchmark.

### Measurement operators and figures

```sh
cd "$FBA_REPO"
python3 out/forensic-validation/measure.py
MPLCONFIGDIR=/tmp/mpl-football-audit python3 "$FBA_AUDIT/figures/plot_native_mechanisms.py"
```

The measurement script loads the pinned repository's yaw/movement operators, the saved current film, and its generated small synthetic CSVs. Inputs, script, stdout and outputs are in `evidence/measurement/`; the existing `measurement-receipt.json` records the operator and source hashes. It needs **no external NFL corpus**. This does not reproduce the underlying NFL reference analyses; their raw source data and acquisition credentials are not in this package.

The figure uses the bundled `figures/native-mechanisms-inputs.json` by default and does not simulate or invent trajectories. Its script, metrics, SVG and PNG remain together in `figures/`. `--refresh-inputs` re-extracts from the original three trace files and currently uses the original `/workspace/football-audit` path; on a relocated copy, change only the figure script's `ROOT` path before using that optional refresh. Cached rendering works without that change. Source hashes are included in its cached inputs.

### First-audit checks retained for context

`evidence/first-audit/` preserves the original core/integration/Python test receipts, scorecards, information-boundary witness, empty-metrics guard witness, hand-law/trait probes, film-capture script and logs. `REPRODUCE-original.md` records their original commands. These are earlier checks on the **same pinned source**, not newly rerun checks from the deeper investigation. No broad test suite or scorecard was rerun for packaging. `prepare-reproduction.py` restores the TypeScript witnesses to their expected relative import locations; it relocates the old film HTML output into the copied audit package.

## Integrity, completeness, and limits

`evidence/packaging-receipt.json` records source paths, original byte sizes and SHA-256 hashes, archive paths, and gzip compression. `evidence/evidence-manifest.json` checks the preserved evidence files. Run:

```sh
python3 "$FBA_AUDIT/verify-evidence.py"
```

All additional full experiment outputs were retained. The largest added motor/pursuit/root traces are gzip-compressed, not omitted. The original 10 native architecture traces remain uncompressed in place. The package omits installed dependencies, source-tree duplicates, bytecode caches and external NFL data. It does not promise exact wall-clock timing, statistical representativeness, or football validity from matching deterministic outputs. The appendices explicitly distinguish successful fixes of a reproduced mechanism, negative controls, exploratory/confounded arms, and unresolved assignment or measurement questions.
