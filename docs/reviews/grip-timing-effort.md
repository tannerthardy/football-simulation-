# Grip timing follow-up: physical effort cannot depend on refinement

Comparison baseline remains `4ded6b6`. This continues PR #3's explicit
`handContact: 'patch', gripTiming: 'resolved'` candidate; default midpoint and
center physics remain unchanged. Claude's support, balance and tackle variants
are not combined. No capacity, grip-force, support, recovery or fatigue law is
changed.

Runtime SHA-256 is
`a4bfc67148f4b8228acb419e6ab744c2d5195776233f231fe6e7765745a3ceb0`.
The [compact receipt](../../data/reviews/current/grip-timing-effort.json)
pins original/candidate source, all 43 flags, both input manifests, acquired
packet and held-tape hashes, failed attempt and fresh collector hash. Raw
trajectories and V8 packets remain under ignored `out/`.

## Diagnosis before correction

The previous native selected angled run had a 1.6435 yd difference in advance
after acquired grip between 12 and 96 outer steps. A replay starting with the
same acquired world and holding the same sixteen issued 20 Hz requests still
diverged: its maximum two-body path difference at 0.8 s was .0582543 yd.
Controller feedback therefore was not necessary for this divergence.

The convergence estimator omitted continuous capture-point deviation. In the
first 96-step interval, the existing normalized pose error was .014895 while
coarse/fine capture-point difference was 3.4867e-6 yd. Including that state
alone passed an early mirrored refinement test but worsened the later path
gap to .0778615 yd and exhausted the partition cap twice. That unsuccessful
attempt is preserved at `080eaa1` and reverted in the final candidate. No
reference was weakened to adopt it.

Recording energy and achieved lean exposed the stronger upstream error.
`feet()` added one lean-force sample per physical piece. The fatigue update
divided that sum by the original outer-step count, although `resolved` had
added many more pieces. A finer force calculation consequently charged more
effort for the same elapsed time. At .1 s, the original timing candidate's
runner energy was .943596 at 12 versus .983544 at 96. The rejected balance-only
attempt made this worse: .778335 versus .980535. Those are stored energy
fractions, not measured athlete capacities or NFL data.

## Bounded change

Only the resolved patch path now accumulates `achieved lean * elapsed time`
and divides by the controller tick duration. Both numerator and denominator
use physical time, as the existing local-sweep path already does. The same
`spendEnergy()` law receives the resulting mean lean; no coefficient, ceiling,
force, recovery rule or player profile changes. Trials remain scratch work,
and only accepted physical pieces contribute. Legacy operation order stays
unchanged.

Two mirrored tests compare energy after the same acquired full tick at 12
and 96 resolved steps with a separate 4096-step midpoint World reference.
The old candidate loses .0171757 too much energy at 12. The repaired paths
agree with the reference to within 1e-6 of stored energy. This budget permits
numerical approximation of changing lean; it does not guarantee identical
footwork or award a football result. All ten preceding timing contracts are
retained.

## Held-control evidence

The raw tape and original V8 packet are reused, including attachments, bodies,
issued commands and incoming support memory. The tape was collected at the
earlier source `c8909294…` with midpoint physics; its SHA and the original
baseline packet SHA identify the inputs. No new football decisions, RNG draws,
grip acquisitions or tackle policies occur during the replay.

| Maximum difference, 12 vs 96 | Original timing candidate | Effort correction |
| --- | ---: | ---: |
| Two-body position after .8 s | .0582543 yd | .0005854 yd |
| Capture-point deviation after .8 s | .0309821 yd | .0002480 yd |
| Runner energy after .1 s | .943596 vs .983544 | .9889882 vs .9889889 |
| Refinement cap hits | 0 | 0 |

The defender starts falling at 3.110547 versus 3.110946 s after correction,
a .399 ms timing difference. The original frozen first-event translation,
yaw, attachment and work results are unchanged: fatigue is charged after the
tick, so this correction repairs a later cause rather than altering that
already-validated first impulse.

Replaying .8 s still costs seconds. The correction is an accounting repair,
not the efficient production integration required before adoption. The omitted
balance state remains a numerical limitation; the rejected attempt shows why
simply tightening its tolerance cannot establish a whole-play repair.

## Validation and next boundary

Matched native and declared fresh inputs were collected separately from
the held-control replay. Fresh inputs are seed 5107, mirrored frontal 0°/3,
angled 60°/6 and rear 135°/6; both 12 and 96 outer steps. The fresh baseline
executes the immutable original `4ded6b6` source archive, not the current
candidate with its option disabled. All 43 baseline flags remain pinned.

All 10 original 12-step tackles, all 12 original 96-step tackles and all
12/12 fresh finishes are retained. Candidate-off remains 14/14 exactly equal
to the original matched 12-step results. The selected coarse escape pair
remains censored, never counted as new tackles. Native ending agreement stays
12/14 across resolution; the center-rear discrepancy remains outside this
correction.

| Advance after acquired grip, one mirror | Original baseline 12 / 96 | Corrected candidate 12 / 96 |
| --- | ---: | ---: |
| Selected angled 45°/8, seed 3001 | 21.4965 escape / 22.2749 censored | 22.9892 / 22.7470, both censored |
| Reused angled 45°/8, seed 4001 | 13.6890 / 13.3193 | 13.3272 / 13.3188 |
| Fresh angled 60°/6, seed 5107 | 6.2185 / 5.9776 | 5.9783 / 5.9780 |
| Fresh rear 135°/6, seed 5107 | 6.6399 / 6.5949 | 6.5811 / 6.5896 |

The original timing candidate's 1.6435 yd selected resolution gap falls to
.2422 yd, an improvement but still material. The reused angled gap falls
from .6268 to .0084 yd. Matched rear 135°/6 still advances .2644 yd farther
than the original coarse baseline, though its 12/96 agreement improves.
The ordinary frontal candidate's resolution gap worsens slightly versus the
earlier timing candidate (.000982→.001657 yd); its tackles remain intact.
Report these adverse changes rather than declaring universal improvement.

Fresh positive grip loads are separate from proximity or a missed attempt.
Their first reported tick intervals are [2.8,2.85] s frontal, [2.7,2.75] s
angled and [4.4,4.45] s rear, the same at both resolutions. These bracket
actual transmitted load; they do not give its exact within-tick onset. Fresh
fall-time differences are 3.141 ms frontal, 1.172 ms angled and .391 ms rear.
All twelve fresh outcomes are physical falls. Fresh paths mirror exactly;
matched advance differs by at most 8.57e-11 yd between mirrors. Worst native
kinetic-work residual is 3.98e-9; budget excesses remain floating-point scale,
with no support-work excess or refinement-limit hit. Represented planar work
does not establish closure of unrepresented vertical or limb energy.

Instrumented patch runs still take roughly 4–79 s per play, versus fractions
of a second for the original. Scheduling varies and this is not a controlled
game-cost benchmark, but the several hundred thousand accepted pieces in the
selected run establish that the prototype is impractical. It stays inactive.

The retained patch gate is 43/52 with precisely the same nine failures. Every
failing fixture still has zero timing invocations. Full-patch promotion remains
blocked by those separate controls; this pass neither hides nor repairs them.

Complete default-profile verification at `2571b79` passes **1,673 TypeScript
tests in 140 files, 145 Python checks, typecheck and build**, with no test or
worker errors. Source and harness were unchanged throughout the run. The
[validation receipt](../../data/reviews/current/grip-timing-effort-validation.json)
pins the complete commit, runtime `a4bfc671…`, harness `90dcc40a…`, Node 22.23.3
and actual flag profile. This full run uses production center/midpoint;
resolved-patch behavior is covered by the explicit contracts, matched/fresh
native panel and retained failing experimental gate described above. The
publication follow-up changes only documentation and this receipt.

The next integration implementation must preserve the independent impulse,
temporal-moment, material-motion, work and now effort contracts at practical
cost. Use event-aware force integration rather than adding a football rule or
changing recovery strength. Keep `4ded6b6` until a reviewed baseline change.

## Reproduce

Use Node 22.23.3 and the baseline launcher. The original timing collector must
first have saved its original acquired packets and baseline receipt. The new
held-control script writes a sixteen-request tape by default; `--replay`
reuses it rather than issuing new decisions. `--ticks=2 --tape-only` reduces
the effort reproduction to .1 s. Raw baseline/prior/corrected outputs are kept
in separate stage directories before making the compact report.

```sh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-timing-followup.ts --replay
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/grip-timing-fresh.ts
npm run baseline:run -- --candidate -- npx vitest run test/grip-timing.test.ts test/grip-timing-reference.test.ts --maxWorkers=1
python3 scripts/diag/physics/grip-timing-effort-report.py
```

For the fresh original baseline, copy the unchanged fresh collector into the
immutable source archive at the same directory depth, reset the declared flags
with `environment()` from its baseline launcher, and run it with `--baseline`
and `--out=` pointing to the current fresh artifact directory. The collector
requires the original source hash and checks matching inputs/flags. The compact
report checks the published fresh collector is byte-identical to the collected
copy. Full experimental-gate failures retain their names and per-test usage.
