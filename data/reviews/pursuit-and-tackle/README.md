# Pursuit, support and contact transfer

Read the [review and next steps](../../../docs/reviews/pursuit-and-tackle-transfer.md)
first. This packet records controller repairs using the same physical world,
profiles, force/grip budgets and resolution. Its strongest causal witness is
the retained Cover6 standing wrap: YAC 20.421→9.660 yd, with .0061 yd spread
across 12/24/48 substeps. This is local evidence, not universal convergence.

Parent: `fcafcafa3775719f770ae5a9800911eb07df44b0`. Final whole-src SHA-256:
`8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`.
[`source-phases.json`](source-phases.json) identifies every intermediate phase,
including the withheld first arrival candidate. Originals are immutable;
[`baseline-references.json`](baseline-references.json) fingerprints the reused
run/pass baseline in `../decision-awareness/` without copying it again.

## What the evidence measures

| Directory | Population and limits |
| --- | --- |
| `approach/` | 16 ordinary native plays, four retrospective Split Zone witnesses, 12 isolated six-second encounters. Keep these populations separate; four isolated censors remain. All 32 initial inputs/profiles and recording controls match. |
| `runs/` | 160 balanced ordinary calls plus two separate supplemental controls. All 162 recorded/plain executions match; all finish naturally. Final mean 2.534 vs baseline 3.344 yd, mostly from tail repairs. A new lost fumble and all adverse outcomes remain. |
| `passing/` | 96 fixed calls, all observer-neutral, zero timeouts. Final mean 8.755 vs baseline 10.388 yd. This is not a league-frequency passing mix. |
| `comparisons/` | Complete per-input final/baseline and component/final changes, including worse cases. |
| `witnesses/` | Actual acquired pictures, raw and executed requests, full diagnostic replays and metadata provenance. A picture is not physical reach; facing is not eyes. |
| `loaded-contact/` | Read-only sustained-load diagnosis, declared technique counterfactuals and local refinement runs. Brake-with-grip was withheld; capacities were never changed. |
| `games/` | Five eight-game component checks with the same initial league inputs. Later snaps diverge. Final scoring/YAC improve versus baseline, but rushing worsens 6.95→7.27 YPC. Final tail audit retains every official run, initial input and nullified run separately. |
| `cost/` | Sequential two-game checks: CPU/play 97.54→105.09 ms (+7.74%). Trajectories/play counts differ; this is a coarse cost guard without repeats. |
| `checks/` | Full final 993 TS/66 Python tests, typecheck/build and focused feature evidence. The first full-suite fixture failure is retained separately from the corrected final pass. |
| `exploration/` | Original intermediate comparisons and patches. These are not measurements of the final engine. |
| `tools/` | Exact diagnostic collector bytes. Restore their recorded locations before running; relative imports and archive paths intentionally preserve provenance. |

The final games' 15 runs of 40+ yards produce 44.5% of rushing yards. Their
selection is retrospective. The conditional non-tail mean is descriptive,
not a replacement for the actual 7.27 YPC. Neither outcome nor a missing
contact flag proves sound execution. Trace the first invalid cue/request or
physical transition before changing force.

[`games/final-tail-findings.md`](games/final-tail-findings.md) details the full
distribution and exact untouched Duo replay. Unlike the broad aggregate audit,
that replay matches the complete game's score/log/quarter-score signature and
the target raw result. A linebacker believes run but maintains an off-man
cushion until his running assignment passes LOS. No counterfactual repair has
been tested. Preserve the installed insertion job, uncertain possession and
legitimate blocks/mistakes when diagnosing that next controller transition.

## Reproduce current controls

Use Node 22.23.3, the lockfile, and a frozen checkout at the final source above.
Run from the repository root. Publish new results to ignored `out/`; never
overwrite this packet. Diagnostics do not authorize force fitting.

```sh
node --import tsx scripts/diag/tackle-approach-review.ts out/pursuit-review/approach.json.gz
node --import tsx scripts/diag/combo-transfer-review.ts out/pursuit-review/runs.json.gz
node --import tsx scripts/diag/decision-awareness.ts out/pursuit-review/passing.json.gz
node --import tsx scripts/diag/late-man-entry.ts out/pursuit-review/late-man.json
node --import tsx scripts/calibrate.ts 8 7 2
node --import tsx scripts/diag/physics-cost.ts out/pursuit-review/cost.json 2 9
node node_modules/vitest/vitest.mjs run --maxWorkers=1
npm run typecheck
npm run build
npm run test:data
```

The run and passing collectors also produce companion `-film.json.gz` files
with their predeclared ten- and six-clip film selections. The approach collector
keeps diagnostic snapshots directly in its report rather than a companion film.
Use the unchanged collector bytes and initial profile/cohort checks when
comparing another revision; current source is not a historical baseline.

## Saved-only film

Open the HTML inside [the offline ZIP](../../../viewer/pursuit-and-tackle.zip).
There are **38 clips**: 20 ordinary run clips, 12 ordinary pass clips and six
higher-rate cue clips. Ordinary inputs were selected before outcomes. The two
Split Zone cue pairs are retrospective explosive witnesses; the Inside Zone
cue pair is an ordinary control. `B-`/`F-` IDs preserve the fixture; `CUE-`
distinguishes a repeated input with a different recording rate. Group by game
to select phase/population, or by concept/front/coverage. Select a player for
recorded job, intent, support, contact load and consumed-picture detail.

Rebuild from saved results, without resimulating:

```sh
node --import tsx scripts/export-pursuit-tackle.ts data/reviews/pursuit-and-tackle out/pursuit-review/comparison.html
```

The exporter validates source, companion results, initial players/geometry,
cohort and full recording before rendering. Baseline cue recordings lacked
cards; supplemental cards are reused only after matching both native phases'
ordered identity/profile/ratings and the baseline cue slot order. Recorded
baseline bodies, events and cues are unchanged. The metadata receipt states
this explicitly. No state is fabricated to fill missing frames.

## Restore research collectors

These original tools are not standalone scripts from `data/`: imports resolve
relative to their original execution locations. Work in an ignored archive
or temporary checkout, retaining package/tsconfig/dependencies and
`scripts/source-version.ts`. Verify its source hash before and after collection.

- `loaded-*.ts`, `changed-wait-witness.ts` and `first-wait-witness.ts` belong
  in that checkout's `scripts/diag/`. Run loaded refinement with output and
  mode arguments, e.g. `node --import tsx scripts/diag/loaded-refinement.ts
  out/refinement.json.gz keep-feet-steps24`. Reconstruct V3 by applying
  `exploration/arrival-v2.patch` then `wait-v3.patch` to the parent before
  repeating the declared counterfactual; verify the `030e…` source pin.
- `cue-*.ts` belong in `out/tackle-breakthrough/review/`. The final cue tool
  expects the saved approach baseline/final at `out/tackle-breakthrough/approach-panel/`
  and the original baseline cue at `out/tackle-breakthrough/review/cue-boundary.json.gz`.
  Restore those packet bytes under the named paths first. It verifies profile
  identity and writes final cue data/metadata there.
- `spacing-*.ts` belong in `out/tackle-breakthrough/review/` and retain dynamic
  archive imports. `chase-probe.ts` belongs in `scripts/diag/` (its retained name
  was `probe.ts`). Check each original argument list and frozen archive paths
  before execution.
- `game-tail-audit.ts` and `game-tail-summary.py` belong in
  `out/tackle-breakthrough/`. The audit imports `./final-source/`; restore the
  final frozen `src`, `scripts`, package/tsconfig and dependencies there.
  Retained game-log metrics match the plain final eight-game run; a complete
  duplicate endpoint/RNG control was not collected for that broad audit.
  Do not upgrade its retrospective read-only receipt to that stronger claim.
- `game2-duo-tail-witness.ts` and `game2-duo-tail-summary.py` also belong in
  `out/tackle-breakthrough/`. Restore the final archive and the saved broad
  audit as `games-final-tail-audit.json.gz` first. The tool replays only the
  exact game and observes only the selected snap. Its original output names
  in the receipt correspond to `games/duo-tail-*` in this publication.

Use [`manifest.json`](manifest.json) to verify packet and tool bytes. Gzipped
JSON/logs decode to the original contents; package paths in old receipts are
provenance paths, not rewritten claims that files were originally collected
inside this published directory.
