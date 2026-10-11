# Alley support and native tail audit

The [review](../../../docs/reviews/alley-support-and-native-tail-audit.md) explains
the mechanism, controls, mixed limits and next work. This packet contains
generated simulation evidence, not raw NFL tracking or a league-calibration fit.
The [offline film](../../../viewer/alley-support-and-tail-audit.zip) retains
all four selected pairs and labels their controller-substitution scope.

## Pins and evidence

- Parent commit: `7a25bc97d13d52fb48b24ebe4401e64ab56cc1a1`.
- Parent engine: `601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
- Candidate engine: `3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f`.
- Shared World: `4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`, unchanged.
- Withheld air-arrival engine: `485d383b354801a17e1f6c35edc2dc6b521a65447cd8425abc6809cd33bcc5f4`.
- Node `v22.23.3`, lockfile dependencies. Engine hashing uses sorted complete
  relative `src/` path strings + NUL + file bytes + NUL, as in
  `scripts/source-version.ts`. Only `src/sim/behaviors/defense.ts` changes.

| Location | What is retained |
| --- | --- |
| `native/` | Four complete selected baseline/policy pairs, original selection, observer/plain and first-fork/physical-budget analysis. |
| `runs/`, `passing/` | Candidate 162-run and 96-pass native reports. |
| `comparisons/` | Saved-only comparisons; every fixed execution is unchanged. |
| `games/` | Both source-pinned eight-game indexes with initial generated leagues, all log rows/native-input pins; conditional guard comparison. |
| `audit/` | Enriched six-tail command analysis, compact diagnosed windows with exact body codec, independent reviews. |
| `experiments/` | Withheld air-arrival source file, complete six-tail result packet and log; it worsens the PA mirror. |
| `cost/` | Fresh two-game/seed-9 reports for both frozen engines; changed play populations and timing noise remain. |
| `checks/` | Final suite/typecheck/build/Python logs, candidate-positive and baseline-negative feature checks, retained exploratory failures. |
| `film/` | Saved-only exporter/input receipts and browser checks; no simulation during export. |
| `tools/` | Exact executed collectors/analyzers, metadata normalization and reproduction helpers. |

The reused fixed parent baselines remain immutable in
[`../helper-fit-and-coverage/runs/final.json.gz`](../helper-fit-and-coverage/runs/final.json.gz)
and [`../helper-fit-and-coverage/passing/final.json.gz`](../helper-fit-and-coverage/passing/final.json.gz).
The six retained passing-tail parent traces are in that packet's
`coverage/final.json.gz`; do not substitute an older source's final report.
`manifest.json` records every included file hash and size.

The selected-policy packet uses baseline Game/PlaySim construction and complete
native prior history, then borrows only candidate `ManCoverage.update` for that
snap. Initial state, prefix, seed and first-transition picture match the parent;
the changed result and next RNG match that policy phase's own fresh plain run.
They are not required to match the old result. A metadata normalization receipt
corrects an inherited generic description that overstated that latter equality.
Executed tool/file hashes and unchanged complete row hashes are retained.
Original generic method/limits fields are also retained separately. The ignored
working directory keeps original binary backups; they are not duplicated in this
packet. No candidate settled-Game-log/plain checksum was exported; raw result,
complete ticks, physical/controller state and next RNG are the direct controls.

All eight Game simulations instead use the full frozen candidate. Their later
calls/RNG streams diverge from the parent. The two forms of evidence have
different purposes and must not be combined into a causal rate estimate.

The enriched command witness subset is deliberately compact. The 35 MB complete
six-play body trace is not duplicated here; its checksum and reproduction tools
are retained. The compact analysis covers all six endpoint/plain controls,
20,500 body-codec round trips and 747 static fallback reconstructions. The
selected windows preserve raw/contained/applied command provenance and exact
body snapshots needed for the next spacing/arrival diagnosis. Legacy ordinary
JSON projections lose non-finite/Map state; use the tagged body codec for exact
free-body previews. Body facing is not measured gaze.

## Reproduction

Run Node 22 with dependencies installed. Write new outputs to ignored `out/`;
do not overwrite this published evidence. Freeze complete source first.
Create a parent archive from `7a25bc9` and a candidate archive from the commit
containing this packet, including `src scripts package.json tsconfig.json`.
Symlink installed `node_modules` into each. The rejected experiment is the
parent archive with `experiments/arrival-v1-defense.ts` replacing
`src/sim/behaviors/defense.ts`; verify its recorded engine hash.

Broad collectors run **from the chosen frozen archive cwd**, retaining their
relative imports and source-hash contract:

```sh
node --import tsx scripts/diag/combo-transfer-review.ts /tmp/alley-runs.json.gz
node --import tsx scripts/diag/decision-awareness.ts /tmp/alley-passes.json.gz
node --import tsx scripts/diag/physics-cost.ts /tmp/alley-cost.json 2 9
```

The saved-only comparisons run from the repository root. They explicitly reuse
the pinned parent's published reports:

```sh
python3 data/reviews/alley-support-and-tail-audit/tools/compare_runs.py \
  /tmp/alley-runs.json.gz /tmp/alley-runs-comparison.json
python3 data/reviews/alley-support-and-tail-audit/tools/compare_passing.py \
  /tmp/alley-passes.json.gz /tmp/alley-passes-comparison.json
python3 data/reviews/alley-support-and-tail-audit/tools/compare-games.py \
  data/reviews/alley-support-and-tail-audit/games/baseline-index.json.gz \
  data/reviews/alley-support-and-tail-audit/games/candidate-index.json.gz \
  /tmp/alley-games-comparison.json
```

The ordinary Game collector dynamically imports the absolute frozen archive:

```sh
node --import tsx data/reviews/alley-support-and-tail-audit/tools/collect-games-pinned.ts \
  "$football_source_root" /tmp/alley-games "$football_source_sha"
```

For selected native counterfactuals, `tools/selected-counterfactual.ts` takes
`BASELINE_ARCHIVE BASELINE_INDEX OUTPUT_DIR CANDIDATE_ARCHIVE CANDIDATE_SHA`
followed by selected IDs. Keep `common.ts` beside it. The original primary/control
selection is explicit in `native/counterfactual-selection.json`; use all four
IDs, not only the improved tail. The historical `audit-counterfactual.py` expects
`counterfactual/` and `counterfactual-selection.json` beside its script; restore
those names to an ignored working directory or adapt paths and report the new
tool hash. No need to duplicate its already published analysis to read results.

The six-tail command tool accepts `ARCHIVE EXPECTED_SHA OUTPUT.json.gz REFERENCE`,
with the body codec beside it. Pass the immutable parent reference
`data/reviews/helper-fit-and-coverage/coverage/final.json.gz` explicitly.
The analysis tool is parent-source-only; its old static formula must not be
applied to a changed controller. The previous native-tail result collector
retains its separate old path contract documented in the preceding packet.

Repack film without executing the engine:

```sh
node --import tsx scripts/export-alley-fit-film.ts \
  data/reviews/alley-support-and-tail-audit/native \
  data/reviews/alley-support-and-tail-audit/games/baseline-index.json.gz \
  data/reviews/alley-support-and-tail-audit/native/counterfactual-selection.json \
  /tmp/alley-support-and-tail-audit.html
```

The exporter verifies complete paired initial/controller states, native Game
context/history and plain receipts before copying recorded frames, decisions
and player cards. It preserves the Toss's negative-time motion frames.
See the export receipt for its exact CLI/inputs and browser validation.

Force units are kg·yd/s², impulse kg·yd/s, work kg·yd²/s²; multiply force/impulse
by .9144 and work by .9144² for SI. Shared physical accounting is not NFL force
calibration, and no global physics readiness claim follows from this increment.
