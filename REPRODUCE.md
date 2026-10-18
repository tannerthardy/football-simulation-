# Exact climb-access evidence (zero new collection to inspect)

Code:403d7a9f114e39fb069aa3d5cb2ede648c33cbe9, from accepted914f4d56a3b7ef2845ff0208f55d626c0ff5f880; candidate runtime06869378092c467aa529ffbb86abf8d1d2b76128e5f5d20a99c69bbf50347469. Neither #148 nor #149 is a dependency. Full decision/limitations are in code branch docs/reviews/climb-access.md.

Fetch this data-only branch and extract in a new, empty evidence directory:

```sh
git fetch origin refs/heads/codex/climb-access-evidence:refs/remotes/origin/codex/climb-access-evidence
mkdir -p out/climb-evidence-download
git archive origin/codex/climb-access-evidence | tar -x -C out/climb-evidence-download
(cd out/climb-evidence-download && sha256sum -c SHA256SUMS)
```

`manifest.json` gives archive and individual member hashes. Seven archives are each under32MiB. No symlinks, absolute member paths or parent traversals. `common.tar.gz` contains the two frozen input manifests, reduced comparisons, exact launch receipts/logs, both passive recorder versions, all source patches, failed launch, pure probes, analysis scripts and six trajectory plots. `candidate.tar.gz` has15 final-source native all22 continuations. Other archives retain all earlier baseline, held and unsuccessful variants, including the live trend Z26 censor. Do not call its gain zero or a completed outcome.

For the analysis scripts' original relative paths, use a *fresh checkout* of the code pin and create out/climb-objective-access. Extract common.tar.gz and each raw archive into that directory. The source archives are not needed to inspect saved evidence. Final candidate source is exactly the code pin. Baseline and each experimental host can be reconstructed in a separate empty folder by archiving accepted914f4d5, applying its common/*-from-accepted.patch, and using the pinned dependencies. **Never apply multiple arm patches to one host or patch a worker's active checkout.** The publication script already independently restored every patch and checked every canonical source byte. Intercept uses accepted source with sole explicit flagCLIMB_PLAN=0, not a new source patch.

Four compatible saved transfer baselines (Z16/Z18/Z20/Z27) are reused from:

- evidence commit15f5113709450363f3dbc744753cbc87b422e6f3 on codex/stalk-moving-surface-evidence;
- discovery-a.tar.gz contains baseline-2 (Z16/Z18);
- discovery-b.tar.gz contains baseline-3/-4 (Z20/Z27).

Fetch that branch, check its manifest, and extract those archives into out/zone-track-recovery. No need to rerun its28 inputs or fetch NFL data. The newer passive collector was separately proved identical on five original complete body/request/RNG/World histories. The new final candidate was also compared exactly with the earlier local-navigation prototype for all15 cases.

Node22.23.3, pinned package-lock.json, linux/x64, launcher44 settings and World defaults are in every receipt. No dependency update is needed. Read the actual receipts for exact commands/input IDs and source/flag qualification; `run-*.py` records historical local host paths, which must be adjusted for a different checkout. `report.py` is saved-data analysis only. Native recording requires explicit run mode; no-argument recorder mode prints a plan and simulates zero snaps.

Code tests (same focused77, no full suite) and a minimal explicit native replay:

```sh
node scripts/baseline.mjs --candidate --receipt out/climb-focused.json -- npx vitest run --project core test/climb-access.test.ts test/planned-climb-fit.test.ts test/combo-strike-access.test.ts test/combo-transfer.test.ts test/combo-attention.test.ts test/run-combo-retarget.test.ts
node scripts/baseline.mjs --candidate --receipt out/climb-Z14.json -- node --import tsx scripts/diag/climb-approach.mjs run out/climb-Z14 Z14 5 out/climb-objective-access/inputs.json.gz native
```

Publication included83 new native continuations + two1.8s prefixes, zero games. Collector wall36.504s; command wall76.580s including focused checks4.595s/typecheck9.948s and pure/failed probes. Packaging/analysis and previously collected baselines are excluded. Saved-data restoration is not another simulation campaign. All15 final-source cases finish naturally; only the separate trend Z26 trial remains live at5s.
