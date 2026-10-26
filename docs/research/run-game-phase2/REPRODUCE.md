> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](README.md) for remote evidence access and the next-work plan.

# Reproduce Phase II

The retained outputs are authoritative evidence, not a requirement to rerun hundreds of duplicate inputs. Start with hashes and a nominated witness. Use new output directories. All commands below operate in isolated research trees, never accepted develop. These scripts intentionally use recorded absolute workspace paths; preserve `/workspace` layout or consistently change every such import/path and record the change.

## 1. Verify and restore sources

```bash
python /workspace/run-game-phase2/VERIFY_PACKAGE.py
```

`sources/accepted-a5b024b9.tar.gz` contains the clean accepted `src`, scripts, tests/fixtures, data/config, package/lock/TypeScript/Vitest configuration and governing instruction files. `sources/source-files.json` hashes every included file. It is a source snapshot, not Git history and not a fabricated commit. The original repository is `https://github.com/tannerthardy/football-simulation-.git`; a normal checkout of exact commit a5b024b9 is preferred when Git-based capture/test provenance is required.

On a fresh machine, extract this snapshot into `/workspace/run-game-phase2-baseline`. Do not extract over an active checkout. Install package-lock-matching dependencies with Node22.23.3. The working environment used `/workspace/run-game-research/runtime/node_modules/node/bin/node`; the full Phase I ZIP deliberately excludes that runtime and npm caches. A fresh runtime can be installed separately with `npm install --prefix /workspace/run-game-research/runtime node@22.23.3`. Put that Node on PATH while running `npm ci` in the isolated accepted snapshot. `tsx` and Vitest come from its lockfile.

Extract `prior-package/gridiron-run-game-research.zip` beside this folder to restore `/workspace/run-game-research` if missing. It provides the exact original V8-serialized constructor sets; these are Node-version-dependent research artifacts, so do not silently deserialize with host Node24.

Reconstruct isolated variants by copying the accepted snapshot and applying only the named patch from that source root:

| Required tree | Patch / operation |
|---|---|
| `/workspace/run-game-audit` | Reverse `accepted-delta.patch` to restore historical carrier/test; all other engine source is identical |
| `/workspace/phase2-radial_unload` | `radial_unload.patch` |
| `/workspace/phase2-wider_arc` | `wider_arc.patch` |
| `/workspace/phase2-wider_arc-historical` | Reverse accepted delta, then wider arc |
| `/workspace/physics-budget-clean` | `physics/minimal-budget-candidate.patch` only |
| `/workspace/physics-phase2` | `physics/all-research.patch`; optional `metadata-helper.patch` only for documented sandbox provenance constraints |
| `/workspace/run-game-phase2-info-{geometry,detour,history,continuity,attribution}` | Corresponding `information/*.patch`, each applied independently to accepted source |

Use `git apply --check PATCH` followed by `git apply PATCH` inside an isolated tree; Git apply also works without repository history. For historical reversal use `git apply -R`. Link or install the same dependencies for each tree. SourceVersion depends on current working directory; `ENGINE_ROOT` alone does not fix a wrong cwd. `sources/reconstruction-check.json` records independent archive/patch reconstruction checks performed during packaging.

Some repository capture/test helpers spawn `git`; the managed sandbox rejects that child process even when shell Git works. The physics lane's explicit metadata helper reads known worktree metadata and records research settings. It does not change simulation behavior. Ordinary raw-input replays do not need a new game capture. Do not clear an infrastructure error by deleting a football assertion.

## 2. Exact native observer

```bash
NODE22=/workspace/run-game-research/runtime/node_modules/node/bin/node
TSX=/workspace/run-game-phase2-baseline/node_modules/tsx/dist/loader.mjs
R2=/workspace/run-game-phase2
INPUT=/workspace/run-game-research/current-zone-set.bin
cd /workspace/run-game-phase2-baseline
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-phase2-baseline AUDIT_COMMIT=a5b024b9fbf8c51fc31401eefb79737be586814a "$NODE22" --import "$TSX" "$R2/observer.mts" run "$INPUT" "$R2/repro-current"
```

For a small nominated witness, add `IDS=S7-P070,S9-P062`. For historical replay, change both cwd and ENGINE_ROOT to `/workspace/run-game-audit` and AUDIT_COMMIT to58e0f5ee13e1c29e9e6ab91cc22cccc576cfe3d7. Each output contains original setup hash, full frames, native events and exact plain/observed bounded-state/result validation. No manual initial tick is permitted.

For a route candidate, change cwd/ENGINE_ROOT to its isolated tree with the same original INPUT. Pilots used `IDS=S7-P041,S10-P015,S8-P039,S7-P071`. For the clean budget repair use `/workspace/physics-budget-clean` with no PHYSICS environment flags. The instrumented alternative uses `/workspace/physics-phase2` with `PHYSICS_ARM=baseline PHYSICS_BUDGET=repair`, other research settings unset. The clean40 results and complete frames match the research variant exactly; see its certificate.

## 3. Derived facts and conditional experiments

```bash
python "$R2/compact.py" "$R2/repro-current"
python "$R2/opportunity-screen.py" "$R2/repro-current"
python "$R2/build-job-ledger.py"
python "$R2/responsibility-timeline.py"
python "$R2/independent-opportunity-check.py"
python "$R2/build-experiment-ledger.py"
```

The latter scripts intentionally read the retained named arms and regenerate derived summaries; they do not run football. The independent check's raw-role reconstruction is distinct from the root screen. `corridor-compare.py BASE_FOLDER CANDIDATE_FOLDER` reads folders under R2 and writes a hybrid fixed-reference comparison. It must not be relabeled a causal contribution measure when runner paths diverge.

Conditional native hands removal, using historical source and the historical loaded-job screen:

```bash
cd /workspace/run-game-audit
env -i PATH=/usr/bin:/bin ENGINE_ROOT=/workspace/run-game-audit AUDIT_COMMIT=58e0f5ee13e1c29e9e6ab91cc22cccc576cfe3d7 "$NODE22" --import "$TSX" "$R2/hand-ablation.mts" "$INPUT" "$R2/historical-observed/opportunity-screen.json" "$R2/repro-hands-off"
```

This removes selected hands/pending strikes while retaining engagement-owned behavior and body contact. It is not a feasible controller or a fully restored unblocked defender.

Unloaded physical reach relaxations:

```bash
env -i PATH=/usr/bin:/bin "$NODE22" --import "$TSX" "$R2/reach-islands.mts" "$R2/historical-observed" "$R2/repro-reach.json"
env -i PATH=/usr/bin:/bin RELEASE_ONLY=1 "$NODE22" --import "$TSX" "$R2/reach-islands.mts" "$R2/historical-observed" "$R2/repro-release-reach.json"
```

These use historical World via a fixed import, original body/profile/support and future target points. They omit traffic/keeper evolution and observable targeting; positives are permissive nominations, not legal useful blocks. The scripts document their actual start/grid/horizon rules.

Generate film/figures without rerunning football:

```bash
MPLCONFIGDIR=/tmp/phase2-matplotlib XDG_CACHE_HOME=/tmp/phase2-cache python "$R2/make-film.py"
```

The standalone HTML embeds its data and can be opened directly. Figures use raw saved endpoints; no plotting interpolation becomes evidence.

## 4. Physics and information lanes

Use `physics/REPORT.md` section6 and `physics/run.py` for exact arm environment, frozen input selection, source assertion, runtime and numerical controls. **That runner writes fixed evidence filenames.** Reproduce in a copied research package with its hardcoded paths repointed, or change output paths explicitly; do not overwrite retained results. `all-research.patch` and minimal clean patch are different artifacts. The former includes branches/instrumentation; the latter only the two-budget correction.

`information/REPRODUCE.md` gives exact native development/heldout, acquired shadows, control islands, transition and focused-test commands. It also calls out fixed output paths, metadata-version limits and the consumed heldout set. Each runner model patch is independent. The six timed mode interventions are diagnostic only and must not be advertised as a general policy.

The physics package retains148/149 non-pursuit assertions for the budget candidate, the P019 failure and setup-censored pursuit suite; accepted source passes149 plus the separately rerun6 pursuit assertions. Geometry A passes31 focused carrier assertions. No broad integration/scorecard pass is claimed. The source archive supports re-running these checks, but altered outputs require new source and runtime identity.

## 5. Rebuild archives

`python build_bundle.py` regenerates the full manifest, full archive and smaller review archive outside R2. It excludes dependencies, caches and Git metadata; it preserves the complete original ZIP, invalid/superseded evidence and source snapshot. `VERIFY_PACKAGE.py` verifies file bytes, while archive CRC/hash validation is performed by the bundle builder. The review archive is not a substitute for full raw evidence.
