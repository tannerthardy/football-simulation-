# Practical validation: keep the foundation, spend effort on football

## Recommendation

Keep the reduced shared World and treat its tested mechanical contracts as the
foundation for the next controller improvements. Do not reopen the anatomical
foot solver, repeat the entire convergence campaign, or simulate an old baseline
again for every small OL decision repair. Run focused checks while iterating,
then the full suite once on the final candidate. Expand diagnostics when the
changed mechanism or a retained failure calls for them.

This is a testing policy, not a declaration that the physics is complete. It
preserves every existing test, archived adverse result and independent oracle.
It changes where we spend repeated diagnostic effort. The
[development philosophy](physics-cost-benefit-and-development-philosophy.md)
already supports this smaller model; the
[keeper review](keeper-based-combination-work.md) supplies the latest concrete
example of a football rule being wrong while shared execution stays coherent.

## What we can build on without another research campaign

These are established contracts within the current reduced model, not measured
NFL capacities or promises about every nonlinear encounter.

| Contract | Evidence to retain | When to reopen it |
| --- | --- | --- |
| Body momentum changes are explained by recorded ground impulse; pair loads are equal and opposite. | `world-physics`, `actuation`, and scenario-pack tests; native residuals in the published panels. | World pair impulses, ground application, body integration or report accounting changes; otherwise an actual unexplained load. |
| Translation and yaw share bounded ground traction; simultaneous hands, grips and strikes share arm force/work limits. | `actuation`, `constraint-work`, `held-recovery`, and `bounded-attachment-world` tests. | Capacity mapping, force allocation, constraint rows, recovery allocation or shared actuator limits change. |
| Achieved sustained hand, finite-strike and active-reel force has correct restricted constant-force body travel. | `hand-force-integration`, `strike-force-integration`, and `grasp-reel-travel` tests, with independent force/travel oracles. | Force quadrature, movement integration or achieved-force bookkeeping changes. A different football outcome alone is not evidence of a quadrature defect. |
| Lower attachment geometry, velocity response, transmitted load and support mobility use the same bounded representation. | `bounded-attachment`, `bounded-attachment-world`, and `held-recovery` tests; the retained contact-transfer panels. | Attachment derivatives, support mobility, restraint geometry or held-support integration changes. |
| Ordinary free movement uses the calibrated integrator; passive encounters do not create unexplained kinetic energy. | `physics`, `world-physics`, `actuation`, and impact tests. | Movement integration, friction, impact or energy handling changes. |
| The same physical executor handles redirects, squeezes, seals, hits and tackles, including mirror checks. | [Scenario pack](../../../test/scenario-pack.test.ts) and the native football-transfer evidence. | A new shared interaction law, substantial technique request change, or an actual cross-scenario regression. |

For an OL target-classification change with no physical module or capability
change, ordinary regression tests and the relevant contact witness are enough
to protect these contracts during iteration. They do not require rebuilding the
old 18D research contact experiments. Keep research tests in the final suite;
run their detailed collectors again when their code or an applicable contract
actually changes.

## What remains unresolved

The current hand panel reports zero fall/corner disagreements in nine retained
redirect fixtures. It still has nonuniform native/refined trajectory error,
including roughly .182 yd maximum closest-distance error in the retained
panel. That supersedes the historical three-of-nine fall disagreement as the
current starting point; it does not establish universal convergence. Contact
onset, passive capture and support-chart transitions retain separate numerical
questions. Diagnose the first divergence in a material new football witness
before adding local event handling, persistent state or solver resolution.

Empirical grip magnitudes, support/recovery parameters and the mapping from
generated ratings to physical abilities are not fully calibrated. Physics can
be internally coherent and still make a reasonable request execute too strongly
or recover too readily. Conditional movement and contact comparisons are useful
here; a scoring target is not a force calibration.

Actual football has distinct controller debt: stale job techniques after OL
exchanges, shared combination attention, climbing paths and pickup lanes,
pursuit in traffic, help transfers and coverage responsibility. A release event
does not prove an achieved second-level block. An engagement does not prove
transmitted load. A good looking contact does not prove a legal block. Keep
installation, consumed observations, requested action and achieved execution
separately inspectable.

There is no evidence-based percentage for how much physics improvement remains.
The practical milestone is a foundation that generalizes across the retained
football interactions, stays stable under relevant variations and allows
controller work without new physical exceptions. We can move forward on that
foundation while retaining explicit limits.

## Choose checks by the changed mechanism

| Change | During iteration | Before publishing a coherent increment |
| --- | --- | --- |
| OL reading, target or technique transition | New feature/negative tests, nearby run tests and the fixed native witness. | Full suite/typecheck/build once; matched concept/front panel using the existing cohort, all adverse pairs, selected paired films. Reuse unchanged tackle/convergence archives; rerun a broader guard if changed requests could affect its interactions. |
| Pursuit, coverage or QB decisions | Relevant delayed-vision, assignment and approach tests; one executed failure plus ordinary controls. | Full final checks; a fixed conditional panel and a small game guard for changes to team responsibility or call progression. Do not infer a trend from two games. |
| World, support, shared limits or physical profiles | Relevant mechanical invariants and an independent oracle for the changed law. | Full final checks, the retained affected convergence panel, ordinary cross-interaction transfer, selected native football witnesses and an idle cost comparison. |
| Recording/export/viewer | Encoding/export tests; unchanged simulation with and without affected recording levels. | Relevant observer/RNG controls and offline decoding/browser/ZIP checks. Rerender from saved films when engine inputs are unchanged; do not resimulate to test a caption or layout. |
| Data extraction or a reference report | Relevant Python tests and pinned input/schema checks. | Recompute the changed extraction, preserve denominators and missingness; do not run football games for a documentation-only reference change. |

The final full suite still runs before an engine increment ships. A series of
small iterations on the same candidate needs that final run once after source
and tests freeze, not once per attempted approach. New failures, changed code
or unresolved concerns justify another run. Shared module changes require
wider coverage than a controller-only patch even if its diff is short.

The saved keeper full suite took 111.49 s; its game-rules and recognition files
accounted for about 72 s of test execution. The research tests were not the
dominant runtime. Keep those meaningful full-game checks. The first concurrent
run encountered a worker-RPC timeout while heavy collectors ran; the idle
single-worker rerun passed without a code change. Run the final suite away from
the large collectors and avoid treating scheduler contention as a source bug.
These recorded durations explain workflow cost; they are not a benchmark of a
new engine speedup.

## Commands already available

Use the pinned Node 22 environment. These commands run from the repository root
and write diagnostics to ignored `out/` paths. The focused OL command is an
example; add the new transition test rather than omitting it.

```sh
node node_modules/vitest/vitest.mjs run --maxWorkers=1 test/run-execution.test.ts test/run-technique.test.ts test/run-combo-retarget.test.ts test/combination-ownership.test.ts test/combo-transfer.test.ts test/zone-reach.test.ts
node node_modules/vitest/vitest.mjs run --maxWorkers=1 test/world-physics.test.ts test/actuation.test.ts test/constraint-work.test.ts test/scenario-pack.test.ts
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
```

The second command is a small shared-contract check, not a replacement for
affected support/attachment or force-integration tests when their code changes.
For final engine publication:

```sh
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

For an OL increment with the current unchanged combo collector, the latest
published final panel is the next candidate's baseline. Do not rerun the old
baseline merely to produce another `before` filename:

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/ol-next/candidate.json.gz
python3 scripts/diag/compare-combo-transfer.py data/reviews/physics-world/combo-transfer/after.json.gz out/ol-next/candidate.json.gz out/ol-next/comparison.json
```

Read [its scope and controls](../../../data/reviews/physics-world/combo-transfer/README.md)
before interpreting the output: 160 ordinary inputs use one roster pair, and
two prior witnesses use a second pair. Check input/profile equality and
observer neutrality, not just concept names. Native candidate evidence and
its source/collector pins remain required. The existing comparator emits a
large diagnostic file; compact its publication rather than duplicating native
state again.

Use the appropriate deeper commands when their mechanism is touched:

```sh
node --import tsx scripts/diag/hand-convergence.ts out/physics-next/hand-panel.json
node --import tsx scripts/diag/strike-force-review.ts out/physics-next/strike-oracle.json
node --import tsx scripts/diag/grasp-integration-review.ts out/physics-next/grasp-oracle.json
node --import tsx scripts/diag/run-contact-review.ts out/physics-next/runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/physics-next/tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/physics-next/games9.json 9 --games-only
```

The refined hand solver is a numerical reference, not NFL truth. The tackle
panel includes live inspection windows: retain their censoring rather than
counting them as forced misses. `run-contact-review` writes plain JSON despite
the output suffix. For cost, run matched arguments sequentially in separate
pinned source snapshots with no competing collectors; an existing game guard
is `node --import tsx scripts/diag/physics-cost.ts out/cost.json 2 9`. Report CPU
and wall time per play as well as game totals because changed paths change play
counts. Use the relevant existing focused cost probe when its controlled inputs
are a better match; two games alone do not establish a small speed change.

## Smaller, reusable evidence

Keep published evidence immutable. A baseline reference consists of the path,
engine-content hash, collector hash/schema, cohort/profile/input hashes,
measurement policy and existing verification manifest. Reuse it when those
agree. If a new collector needs observations absent from the old archive,
collect them against the pinned historical source with the same new collector;
do not relabel old data or run it through the new engine and call it baseline.
Freeze source while collectors run. Historical verification remains historical;
an old verifier's `--engine` check is expected to reject later changed engines.

For each new increment publish:

1. One compact summary and per-input outcome table, with every adverse pair and
   separate ordinary/supplemental denominators.
2. One native gzip candidate archive with actual observations, contact loads,
   transitions and observer controls; link its existing baseline instead of
   copying it. Keep compressed fixed films separately when the viewer needs
   more state than the measurement archive.
3. Source/tool pins, exact change, final checks and a short mechanism review.

The latest combo `comparison.json` is about 22 MB while its native before/after
archives are about 11/9 MB compressed. The comparison repeats detailed state
that already exists in the native archives. Retain current published files;
future summaries can reference play ID/tick/member and archive path for that
detail. Do not delete adverse outcomes to save bytes or round away native
loads. Stream large arrays through gzip as the combo collector already does.

Fixed film choices should be declared before results or explicitly labelled
retrospective witnesses. Include ordinary controls and the material adverse
case, not only touchdowns or the best-looking block. A final viewer check needs
representative actual recorded state, selected references, mobile/offline use
and the changed export path; a layout-only patch does not need new play
simulation. This does not add a CI framework or another physics backend.

## Useful research now

The best immediate football help is an identified clip/tick with a coaching
explanation of the expected job, read, approach and acceptable mistake. That
separates a wrong instruction from an incapable body. OL combo timing,
front-specific exchanges and approach footwork currently have more direct
value than a larger general-purpose motion archive.

Use NFL tracking and available scouting labels for conditional demands:
early OL/DL movement, reach/pull paths, contact onset, pursuit braking and
movement recovery. Compare distributions across generated roster profiles and
uncertainty rather than force-fitting one league mean. Detailed body data is
worth acquiring only for a demonstrated missing support/recovery mechanism;
small representative trials are enough to test that hypothesis. Broad scoring,
explosive and success-rate reports remain guards until calls, coverage,
blocking and pursuit are credible enough to explain their denominators.
