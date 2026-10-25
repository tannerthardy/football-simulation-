# Current run-game engine evidence

Read the [diagnosis](../../../../docs/reviews/run-game-current-diagnosis.md),
[OL](../../../../docs/reviews/run-ol-current-audit.md),
[runner](../../../../docs/reviews/run-carrier-current-audit.md) and
[defense](../../../../docs/reviews/run-defense-current-audit.md) audits. The
[separate NFL packet](../reference/README.md) defines conditional real-data
operators. This engine packet contains generated-player diagnostics, not raw
NFL tracking or a league-calibrated force model.

Watch [twenty saved paired clips](../../../../viewer/run-game-current.html) or
download the [offline ZIP](../../../../viewer/run-game-current.zip). The same
ten fixtures were selected before outcomes. Filter by source, concept or front;
BEFORE and FINAL IDs retain the fixture and engine identity. Inspect actual
completed loads separately from the chosen job. No exporter simulates a play.

## Source phases

| Phase | Whole-engine SHA-256 | Change |
| --- | --- | --- |
| `baseline` | `11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85` | Archived git `d087104` |
| `ol-only` | `01a504731ec27ee4d1767c9203ff71d91e597f0d0e67ad54084ea52664da3036` | Actual run context selects offensive hands/feet training |
| `final` | `09dd62c7d7cc5002312e93821ea0bf6f7dea3bb764ff75f509c59ff720e72d62` | OL repair plus consumed-pose recovery forecast |

World SHA stays
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
The two production-file identities are in `manifest.json`; all other source
files match baseline. No capacities, force limits or solver resolution changed.

## Inventory and definitions

| Files | Meaning |
| --- | --- |
| `baseline`, `ol-only`, `final` `.json.gz` and `.log` | Same unchanged 160+2 native collector, source/profile/input/observer/RNG pins, outcomes and OL process/load records. |
| Corresponding `-film.json.gz` | Ten predeclared full recordings per source, natural finishes and native OL ownership/read/load snapshots. |
| `*-summary.json.gz` | Concept/front/joint distributions, separate ordinary/supplemental and censor populations. |
| `ol-only`, `recovery`, `final` `-comparison.json.gz` | All paired outcomes, identical-execution counts and all adverse categories. Recovery isolates the second repair. |
| `contact-technique-*.json.gz`, `contact-technique-comparison.json` | 48 reduced actual loaded contacts per source; matched capacities/initial bodies/RNG and run/pass training controls. Candidate here means OL-only. |
| `contact-technique-*-tests.json` | Isolated nine-test receipts, including four meaningful old-source context failures. |
| `pass-baseline.json`, `pass-final.json`, `pass-comparison.json`, `pass-*-film.json.gz` | Same 24 native pass inputs, constructor census, six sampled plain/recording checks per source and all adverse after-possession outcomes. |
| `games-*.log`, `games-*-receipt.json` | Existing two-game seed-7 calibration harness used as a small regression guard. Its historical target column is not the new conditional NFL reference. |
| `audits/` | Nine current native consumed-pose cases; eight held-picture controls; separately pinned historical scratch counterfactuals; staged defensive source-law witnesses and original/reconstructed tools. |
| `viewer-metadata.json` | Explicit actual phase labels/title/explanation, rather than the exporter's historical combo-change labels. |
| `checks/`, `manifest.json` | Final checks, export/browser receipts, exact file and collector identities. |

Native ordinary panel: eight concepts × five fronts × both flips × seeds 3/11,
one pooled generated roster 31/32 at .55; Ace 11 except Split Zone Gun Wing 12;
Cover 3, centered LOS 40, first-down marker 50. Stock front personnel differs.
Two roster 41/42 witnesses are supplemental, never pooled. All 162 observed
executions per phase match plain result/body/intent/next-RNG signatures. Each
ordinary phase has 160 natural ends, zero censors and zero stale combo members.

Outcome gain is finite naturally finished `offenseYards`, not a defensive
fumble-return endpoint or game-level enforced gain. Stuff means gain ≤0;
four-yard success is an explicitly fixed first-down panel proxy. Whole-play
climbs include prepass reads missed by the old command-local counter. First
pair records provide lower-bound positive contact evidence; an absent early
record is not a proven whiff. Holding flags are not accepted penalty rates.
YBC is native physical-contact evidence, not an interchangeable NFL annotation.

Main mean changes 1.280→1.315 yd, stuffs 39→51; the isolated OL phase has 52.
The semantic repairs do not demonstrate globally better rushing. Keep adverse
Duo/Power, runner, YAC/scramble and two-game scoring changes visible. Accounting
consistency does not establish empirical strength/friction/grip calibration.

## Reproduce on a frozen source

Use Node 22.23.3 and the lockfile. Engine commands need no raw NFL data.
Write new artifacts under ignored `out/`, never over these published bytes:

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/run-review/panel.json.gz
node --import tsx scripts/diag/run-contact-technique.ts out/run-review/contact.json
node --import tsx scripts/diag/carrier-recovery-cue.ts out/run-review/cues.json.gz \
  --expected-source=09dd62c7d7cc5002312e93821ea0bf6f7dea3bb764ff75f509c59ff720e72d62
node --import tsx scripts/diag/pass-installation.ts out/run-review/pass.json
node --import tsx scripts/calibrate.ts 2 7 1
python3 scripts/diag/run-outcome-review.py summarize \
  out/run-review/panel.json.gz out/run-review/summary.json
python3 scripts/diag/run-outcome-review.py compare \
  data/reviews/run-game-current/engine/baseline.json.gz \
  out/run-review/panel.json.gz out/run-review/comparison.json
```

For a baseline reproduction, archive `d087104` into a new ignored directory,
share the installed `node_modules` and copy the identical current
`run-contact-technique.ts` collector; it uses old APIs and ignores the old
traits function's extra context argument. Existing native/pass/calibration
collectors are unchanged at baseline. To reconstruct OL-only, replace only
the archive's `src/sim/engagement.ts` with the final file. Confirm `01a504…`
before and after. The new native cue collector requires the new helper;
use the helper-independent held-picture controls for old-source failures.

`audits/recovery-mechanism-controls.ts.txt` loads a supplied source tree by
absolute path and checks its expected source. Copy it to a fresh `.ts` file
under `out/`, then run with `ENGINE_ROOT EXPECTED_SOURCE OUTPUT.json
--require-fixed`. Baseline deliberately exits 1 with six violated picture
invariants; final passes all eight. Staged defensive reproduction instructions
preserve their original ignored paths: copy the published tools from `audits/`
to those paths or adjust only the copy source paths in the instructions.
Their traffic section is excluded from production conclusions, and the manual
fit exchange is not called by ordinary playcalling. Its original inline tool
was not retained; the reconstructed tool is explicitly labelled.

Scratch carrier files preserve their original names/paths in embedded receipts.
`carrier-exploration-*` identifies the renamed baseline cues and OL-only
counterfactual; `carrier-counterfactual-baseline.json` is the d087 counterfactual.
Their forecasts are not executed candidates. Current native cues and held-picture
controls are the reusable promotion evidence; don't pool these source phases.

Re-export from the published saved data without simulation:

```sh
node --import tsx scripts/export-combo-transfer.ts \
  data/reviews/run-game-current/engine/baseline-film.json.gz \
  data/reviews/run-game-current/engine/final-film.json.gz \
  out/run-review/replay.html \
  data/reviews/run-game-current/engine/viewer-metadata.json
```

## Validation

895 TypeScript tests, 66 Python tests, typecheck and build pass. The original
JSON full-suite report has all tests passing but its command returned 1 without
stderr; the unchanged-source default-reporter repeat returned 0. Both receipts
are retained, rather than discarding the anomaly. No tests were loosened.

The viewer smoke uses installed Chromium over loopback HTTP with external
requests blocked. Direct `file://` navigation is blocked by managed browser
policy and remains unverified. The ZIP contains the identical embedded HTML;
local browser behavior can differ. Browser/WebM checks do not judge football
realism or guarantee codecs in every browser.

Native units: force kg·yd/s², impulse kg·yd/s, planar work kg·yd²/s². Numerical
residual/budget checks are internal consistency checks, not NFL force targets.
Pose and body-facing ticks are not measured eyes. The simplified get-up estimate
is explicit controller inference; public capability is not hidden phase progress.
