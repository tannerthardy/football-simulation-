# Efficient grip integration candidate

This is a separate candidate on `codex/grip-fast-integration`, based on the
corrected PR #3 reference `8e36cce`. Shared baseline remains `4ded6b6`.
`gripTiming: 'resolved'` retains the corrected slow algorithm; the new explicit
`'fast'` option is inactive by default. No capacity, contact-force, fatigue or
recovery law changes. Claude's support/tackle experiments remain separate.

## Effort audit

| Solver path | Accumulation | Normalization |
| --- | --- | --- |
| Ordinary fixed subdivisions | One achieved lean sample per equal-width piece | Actual outer piece count |
| Local-sweep | Achieved lean multiplied by physical piece duration | Controller tick duration |
| Corrected resolved patch | Achieved lean multiplied by physical piece duration | Controller tick duration |
| Separate fast patch | Same physical-time integral | Controller tick duration |

Ordinary count weighting is correct because its pieces have equal duration.
Local-sweep already accounts for unequal impact splits. Resolved had added
pieces without changing its count divisor; PR #3 repaired that. No additional
ordinary defect was demonstrated or ordinary behavior changed here.

Four partition-invariance contracts prescribe equal achieved effort and speed
for equal elapsed time, calling the real foot accumulator and World fatigue
update. They compare 3/7/12/96 partitions, including unequal local-sweep pieces
and rejected scratch trials. This manufactured effort driver is not a claim
about contact-law validity. The earlier acquired native energy/reference tests
and independent impulse/temporal-moment/work contracts remain unchanged.

## Profile and bounded optimization

The original slow .8 s held-control profile takes 6.73 s with a CPU profiler.
About 11% of sampled CPU is structured cloning; most work is repeated physical
integration, support/constraint solving and allocation. Profiling cost is not
used as the uninstrumented performance benchmark.

The fast option preserves the same primitive solver and numerical tolerances.
It memoizes trial results inside a search and imports an accepted physical
trial rather than executing it again. Import preserves original bodies,
profiles, joints, plans, report/pair-map identities and shared support/material
attachments. There is no state extrapolation or artificial impulse. Observed
or custom worlds replay accepted pieces so observers see physical execution.
Tests compare imported and replayed multiple-contact results exactly, including
work and shared attachment identities in both mirrors. Only accepted physical
effort is committed; rejected trials cannot charge fatigue.

Cached resolution guesses are rejected and preserved at `79551d2`. Although
every chosen pair met the existing pose tolerance, a 96-step selected run moved
.2202 yd and a frontal control did more work. The estimator's response can be
nonmonotone, so the final candidate retains the reference's ascending search
order. This intentionally preserves the diagnostic .2422 yd native gap.

For an isolated passive row, a frozen-force cap exit can propose a split;
moving geometry and shared budgets still use the real physical solver and a
whole-interval coarse/fine comparison. Active reeling, ordinary normal loads,
multiple rows, impacts or pending strikes prevent that proposal. Dry initial
sliding needs a separate onset: the existing law starts sliding the grip down,
creating lower support on the next solve. A numerically bounded initial dose
resolves that topology change rather than averaging it across a whole step.

The cap-exit-only version is preserved at `64f5b40`. On a new dry-grip scene,
both it and the slow reference exhaust their limits. The final onset treatment
passes unchanged position/yaw/spin checks against a 65,536-piece World
reference. The slow reference's cap failure is retained explicitly in the
contract, separate from the nine historical patch-gate failures. Physical
plausibility of the instantaneous attachment transition is not established.

The finest candidate grid is bounded at 16,384 pieces, with at most 32,769
scratch primitive calls across its search. Failed searches discard all scratch
work and invoke the corrected slow reference with its existing limit reporting.
Including that fallback, the bound is 81,920 primitive calls per invoked outer
interval, not a wall-time guarantee. A forced small-search-budget contract
verifies identical motion, attachments and work after fallback. No failure is
called converged.

## Paired accuracy and adverse controls

The [compact receipt](../../data/reviews/current/grip-fast.json) pins runtime
`7a4283fc…`, the corrected reference `a4bfc671…`, baseline `8433e88d…`, all 43
flags and both input manifests. The matched panel has seven scenario types,
both mirrors and 12/96 outer partitions; fresh inputs use seed 6109 and
frontal 0°/3, angled 70°/6 and rear 135°/6, again mirrored at both resolutions.
Center controls use center contact; patch controls explicitly select patch.

All 10 baseline coarse and 12 baseline fine tackles remain tackles. The two
selected coarse escapes remain censored, not credited as finishes. Both slow
and fast have 10 tackles / 4 censored at 12, and 12 tackles / 2 censored at 96.
Every matched coarse advance equals the slow reference; the largest fine
change is 1.11e-5 yd on the frontal mirror pair. The long-hold benchmark ends
with exactly identical body position, velocity, facing, spin, energy and
support state in slow and fast modes. Multiple-contact import/replay contracts
also retain exact motion, work and shared attachment identities.

All 12 fresh finishes remain physical falls, with no outcome trade. However,
the fresh frontal fine run advances .004853 yd farther than slow, in both
mirrors. Its coarse/fine advance gap worsens from .000825 to .004028 yd.
This is reduced numerical agreement. No whole-play accuracy threshold was
declared, so it is not automatically a football regression or improvement. The
fresh 70° coarse run hits the reference's refinement cap once in each mirror;
fast exhausts its own search and falls back to that same limited result.
These completed tackles are not evidence of converged contact integration.
Fresh 70° coarse and 135° coarse also travel .3661 and .2124 yd farther than
the original baseline, respectively; those changes already exist in slow.

The matched panel has no limit/fallback hit. Across matched/fresh controls,
maximum represented kinetic-work residual is 3.98e-9; maximum arm-budget excess
is 5.49e-11 and support-work excess is zero. This does not establish closure
of unrepresented vertical or limb energy. The experimental gate remains
**43/52**, retaining the exact nine historical failures. Every failing gate
fixture has zero grip-timing trials or accepted intervals. Those failures,
the dry-onset slow-reference limitation and the fresh coarse cap hits are
reported separately.

## Keeper/contact-law boundary

The keeper angular-law witness is a separate investigation from this grip
timing optimization. Its historical contact/keeper evidence lives in
[angular-contact-repair.md](angular-contact-repair.md); the independent law
operator is [hand-angular-law.ts](../../scripts/diag/hand-angular-law.ts).
Keep its pinned law, geometry and controller-response claims distinct from
the acquired grasp's impulse/time-moment reference.

All nine current promotion failures record zero timing trials and accepted
intervals. Refinement of an uninvoked grip solver cannot repair those fixtures.
They retain their own assertions and need separate hand/contact, keeper
positioning or controller diagnosis. Zero invocation does not prove that all
nine share one angular-law cause. In particular, a lawful delivered tangent
force can still expose a controller that interprets resistance to turning as
opponent flow; delaying yaw or choosing a refinement level to preserve a
keeper outcome would conceal that distinction. No keeper-law change or
promotion is included here, and resolving timing cost alone cannot clear the
full patch's football gate.

## Remaining .24 yd discrepancy

The slow native 12/96 selected run still differs by .2422 yd after a 4.4 s
hold. Replay of the same acquired world, issued 96-step intents and grip-control
tape retains a .2355 yd maximum endpoint gap. Replaying intents alone gives the
same result: grip capacity stays 2267.0047 throughout. Neither a changed grip
capacity nor football controller feedback is necessary for the discrepancy.

The mismatch develops after the tackler is down at both resolutions. At 4.95 s
runner position differs by only .0011 yd but capture-point deviation differs
by .0054 yd. At 5.0 s one runner retains about .35 s of outside-base history
and requests a ~1 yd/s corrective step; the other resets that history and
requests zero. Position first differs by more than .005 yd at 5.10 s.
The convergence estimator does not observe continuous support deviation or
outside-base history. This is evidence for a base-crossing/recovery-history
integration issue, not a demonstrated need for stronger recovery. The trace
does not establish every earlier source of support error. Recovery laws are
preserved; the minimal handoff is the same two-body long-hold tape around
4.95–5.05 s and the recorded requested/achieved foot state.

Freezing the identical fine-run state at 4.95 s and replaying only the next
.05 s gives zero outside-base history at both resolutions; capture-point
displacement still differs by .000123 yd. It does not reproduce the native
.35 s history fork without the earlier accumulated state difference. Thus
the late base crossing amplifies earlier drift; it is not proof of an isolated
5.0 s recovery-code defect. `grip-late-repro.ts` saves that checkpoint and
compares 12/96 resolved with a 4096-piece physical reference. Keep this case
separate from the efficient solver's cost and pose controls.

## Practical acceptance budget

Before adoption into the next integration stage, propose same-machine median
physics tick ≤5 ms, 95th percentile ≤10 ms and measured maximum ≤50 ms on this
declared panel, with the sum of per-case median window costs ≤2× baseline.
These are engineering
budgets, not athlete capacities or NFL targets. The physics, attachment, work,
effort, mirror and retained-failure contracts must pass as well. A fast run that
merely selects a different support-history outcome does not clear the gate.

The benchmark harness times unmodified World calls externally: no observer
hooks, profiler, altered solver or per-step logging. Input construction is
outside the timed window; each repetition restores identical inputs. Cases
warm once, then repeat seven times (three for the long hold), serially on the
same CPU/Node version. Both tick and whole-window distributions are retained;
observed maxima do not prove a universal worst-case bound.

An initial benchmark run was rejected: V8 deserialization shared mutable
typed-array storage with its input buffers, so post-run byte hashes differed
between models. The corrected harness deep-clones every restored input and
checks serialized input hashes after each run. All published benchmark
samples use that corrected harness; the invalid samples remain in ignored
`out/grip-fast/mutable-benchmark/` for audit.

The corrected immutable-input benchmark runs serially on one AMD EPYC 9V74
host with Node 22.23.3. There are 310 measured ticks per mode, after warmups.
Baseline here means the immutable `4ded6b6` solver with explicit patch/midpoint
API for these contact inputs, not a claim about a whole production game.

| Cost | Baseline | Corrected slow | Fast candidate |
| --- | ---: | ---: | ---: |
| Median tick | 1.32 ms | 583 ms | 358 ms |
| 95th-percentile tick | 3.29 ms | 1,926 ms | 1,057 ms |
| Observed maximum tick | 8.35 ms | 2,290 ms | 1,586 ms |
| Frontal one-tick median | 2.51 ms | 23.1 ms | 29.7 ms |
| Angled one-tick median | 2.30 ms | 263 ms | 221 ms |
| Multiple-contact .2 s window median | 9.00 ms | 629 ms | 390 ms |
| Dry-onset .025 s window median | .094 ms | 1,413 ms | 30.3 ms |
| Long-hold 4.4 s window median | .118 s | 74.4 s | 47.0 s |

Long-hold measured windows range 44.6–48.1 s for fast and 70.1–78.0 s for slow.
Summed per-case median cost is 47.63 s fast versus .1323 s baseline, about
360× baseline. Trial reuse improves the long hold 1.59× and multiple contacts
1.61×; the isolated event split improves dry onset 46.6×. Simple frontal cost
regresses 28.6% from import overhead. All per-case/tick samples and tail/max
summaries are retained. The observed maximum is a measured panel worst case,
not the theoretical bound or a guarantee for untested scenes.

**Recommendation: retain for review and diagnostic use; not ready for the next
integration stage.** Keep resolved as the reference, baseline `4ded6b6` and
defaults unchanged. The candidate demonstrates correct accepted-trial reuse
and a useful isolated onset split, but neither practical cost nor long-hold
support consistency clears the proposed budget. The single best next solver
step is to resolve capped/relaxing grip force inside an interval without
refining the entire World, carrying impulse, temporal moment, attachment
motion and shared work/budgets together. Give the separately pinned late
support-history trace to Claude; do not adjust recovery strength here.

## Complete validation

At code/harness commit `f658941bd62bfba3db32fa590d20beb4641766a3`, the full
default-profile run passes **1,687 TypeScript assertions in 142 files,
145 Python checks, typecheck and build**, with no test/worker errors.
Runtime and harness are unchanged throughout the run. The
[validation receipt](../../data/reviews/current/grip-fast-validation.json)
pins runtime `7a4283fc…`, validation sources `76e2a239…`, Node 22.23.3 and
the exact flags. This full run uses ordinary center/midpoint defaults;
26 explicit effort/timing contracts, the matched/fresh panels and the retained
43/52 patch gate cover the candidate separately. Publication changes only
documentation and the validation receipt. PR #3 remains at the corrected
reference `8e36cce`; this candidate uses a separate draft branch.

## Reproduce

Use Node 22.23.3. Original packets/receipts must first be regenerated with
`grip-timing-evidence.ts out/grip-timing --baseline` in the immutable baseline
archive, copying that collector and its diagnostic dependencies at the same
directory depth. Run the collector without `--baseline` at `8e36cce` for the
corrected reference. Reset all declared flags using `environment()` from
`scripts/baseline.mjs` in each archive; runtime hash checks reject a substituted
source. Copy each stage's outputs into the current ignored `out/` directory.

```sh
npm run baseline:run -- --candidate -- npx vitest run test/grip-effort.test.ts test/grip-fast.test.ts test/grip-timing.test.ts test/grip-timing-reference.test.ts --maxWorkers=1
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-fast-evidence.ts
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-fast-evidence.ts --fresh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-fast-evidence.ts --long
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-late-repro.ts
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-fast-benchmark.ts --model=fast
npm run baseline:verify -- --candidate --receipt out/grip-fast/full-validation.json
```

For fresh baseline/slow panels, copy the same evidence collector into each
archive and use `--fresh --baseline` or `--fresh --slow`. For benchmarks, copy
the byte-identical benchmark at the same directory depth and use `--model=baseline`
or `--model=slow`. Run the three benchmark processes serially, without observer
hooks/profilers or other simulation jobs. The harness checks immutable input
bytes and repeated final states. Raw packets, native tapes, trajectories and
CPU profiles stay under ignored `out/`; the receipt keeps their hashes.
