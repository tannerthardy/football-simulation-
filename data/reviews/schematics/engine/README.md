# Call installation and schematic stress evidence

Read the [current review](../../../../docs/reviews/schematics-and-physics-stress.md),
[offensive audit](../../../../docs/reviews/offensive-scheme-system-audit.md),
[defensive audit](../../../../docs/reviews/defensive-scheme-system-audit.md) and
[original package chapter](../../../../docs/football-handbook/playcalling-and-schematic-packages.md).
Watch [seven saved clips](../../../../viewer/schematic-stress.html) or download
the [offline ZIP](../../../../viewer/schematic-stress.zip). No export resimulates
or selects new outcomes. Its five predetermined native adverse clips and the
saved PA Shot baseline/current pair retain IDs, sources and limitations.

This packet measures installation and native behavior with unchanged shared
physics. It does not fit NFL outcome rates or establish complete schematic or
physical readiness. The separate [NFL context packet](../context/README.md)
is descriptive real-data evidence with its own attribution/denominators.

## Contents

| Files | Meaning |
| --- | --- |
| `pass-baseline.json`, `pass-candidate.json` | Same constructor census of 306 pairs and fixed native24 panel; full per-case outcomes and source/tool/cohort/profile pins. |
| `pass-comparison.json` | All 24 joined native pairs; 12 controls have identical result/body/intent/RNG signatures. Means among different attempt populations remain descriptive. |
| `pass-*-film.json.gz` | Three predetermined full native recordings per revision, including PA Shot and a check-outlet control; not a highlight search. |
| `defense-baseline.json`, `defense-candidate-final.json` and their `all-calls`/`violations` gz files | Same 4,320 static automatic-caller allocations. Actual played/shown roof, pressure participants, rush budget, markers and missing underneath players. No physical play is run here. |
| `defense-roof-only-intermediate.*` | Withheld intermediate: zero roof/budget flags but named-underneath debt rises from 3 to 142 calls. The promoted named-zone guard reaches zero selected defects/debt in this matrix. |
| `stress-panel.json.gz` | All 20 native static11v11 rows plus eight reduced staged slice rows, consumed reads, initial state, intents, support/load/budgets, actual outcomes and reduced endpoint reflections. |
| `stress-film.json.gz` | Five predetermined adverse native recordings plus one reduced recording. Reduced play is an inspection censor, not football yardage or real presnap motion. |
| `baseline-offense-assignments.json.gz`, `baseline-offense-tool.txt`, `baseline-defensive-allocations.json.gz` | Initial source-pinned assignment inspections supporting the detailed audits. The offensive tool text retains its original bytes; copy to `out/scheme-audit/offense-contracts.ts` in the baseline checkout to run its original relative imports. |
| `checks/`, `manifest.json` | Final tests, typecheck/build, browser/export receipts, exact artifact identities and tools. Historical feature tests correctly fail on baseline; that is recorded separately. |

Baseline is git `beae5c7`, engine content SHA
`0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2`.
Final engine SHA is
`11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85`.
The withheld roof-only source is
`a2c377083c41c5fe6fd5e692599e003149b9f9e4b4efdb9a09188ff96161e360`.
All use the unchanged World SHA
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.

Reports retain original collection paths as provenance. Published final/baseline
basenames match those reports; the intermediate `defense-candidate.*` artifacts
were renamed `defense-roof-only-intermediate.*`. Resolve published bytes through
this inventory and `manifest.json`, rather than following a historical absolute
workspace path. Older published packets were not changed.

## Reproduction

Use Node22.23.3 and the repository lockfile. No raw NFL data is needed for engine
collectors. Run from a frozen checkout and write **new output under `out/`**:

```sh
node --import tsx scripts/diag/pass-installation.ts out/schematics/pass.json
node --import tsx scripts/diag/defensive-installation.ts out/schematics/defense.json
node --import tsx scripts/schematic-stress.ts out/schematics/stress.json
node node_modules/vitest/vitest.mjs run test/pass-installation.test.ts \
  test/defensive-call-integrity.test.ts test/schematic-stress.test.ts \
  test/schematic-stress-export.test.ts --maxWorkers=1
```

To reproduce the baseline pass/defensive collectors, use an archived `beae5c7`
source tree and copy the identical current collector files into its `scripts/diag`
directory. They import only API already available at baseline. Verify source SHA
before and after; the script, roster/cohort and World identities must match.
Four stock formation declarations legitimately differ between versions; the
defensive collector records those input hashes and evenly sampled situations.
Do not claim every native case has identical geometry after the legality repair.

The [exporter](../../../../scripts/export-schematic-stress.ts) is a saved-film
consumer with fixed source/case/observer guards. Its usage is printed in the
source; pass the report and film paths for the native stress packet and both
pass-panel revisions. Full recording is compared to plain execution, rather
than assumed harmless.

Re-export directly from the published packet, without resimulation:

```sh
node --import tsx scripts/export-schematic-stress.ts \
  data/reviews/schematics/engine/stress-panel.json.gz \
  data/reviews/schematics/engine/stress-film.json.gz \
  out/schematics/replay.html --paired \
  data/reviews/schematics/engine/pass-baseline.json \
  data/reviews/schematics/engine/pass-baseline-film.json.gz \
  data/reviews/schematics/engine/pass-candidate.json \
  data/reviews/schematics/engine/pass-candidate-film.json.gz
```

Final checks pass: 869 TypeScript tests, 37 Python data tests, typecheck and
build. The browser receipt records the agent-reported 31-check tool result;
its original stdout was not saved as a file. The separate offline-delivery
receipt tests extracted ZIP content with HTTP/HTTPS blocked. Direct `file://`
navigation was blocked by cloud browser policy, so that protocol is unverified.

## Physical and football definitions

Native controls remain 20Hz with the production solver resolution. Force is
kg·yd/s², impulse kg·yd/s and planar work kg·yd²/s². Numerical tolerances are
`1e-6` for the named residual/budget checks, not NFL strength calibration.
Reported penetration has no newly invented acceptance threshold. Bodies use
the declared on/off-line convention, not anatomical officiating. Natural
whistles, engine timeouts and reduced 2.5-second censors remain distinct.

Bunch Mesh lacks the second shallow crosser. Quad diamond is static Quick Outs,
not a screen. Native offensive motion/communication is unsupported. The current
empty prior still misreads a detached RB slot as a back. Third-and-27 uses stock
dime/Over and safety depth with an actual edge drop, not new prevent personnel.
Read witnesses are already-consumed observations, not measured eyes or proof of
causation. Better yards alone do not prove better technique or calibrated physics.
