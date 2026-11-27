# Selective testing and roster coverage

**Process precedence:** [PLAN](PLAN.md) and [GAPS](GAPS.md) supersede the
older workflow requirements in this reference. Keep the football-model,
mechanism-review and marginal-cost reasoning; use PLAN for current assignments,
merge criteria and testing tiers. Integration-owner/full-suite obligations,
receipt publication and historical flag profiles below are not current gates.
Documentation-only navigation changes need documentation/path checks, not games.

## Current test loop

Use the smallest check that answers the changed mechanism's question, under
[PLAN](PLAN.md) and [AGENTS](../AGENTS.md#no-github-actions). All execution is
manual/local. The tiers separate workloads; they do not remove assertions.

| Command | Workload | Use |
| --- | --- | --- |
| `npm test -- test/<file>.test.ts` | Selected engine/controller contracts | Local mechanism and opposing control |
| `npm test` | Core: 3,698 checks in 339 files | Broader engine/controller checkpoint |
| `npm run test:workflows` | Capture, restoration, film/CLI and lab workflows: 32 checks in four files | Changes to `PlaySetup`, game hooks, replay, provenance or the affected tools |
| `npm run test:integration` | Workflows plus native panels/full-game contracts: 42 checks in ten files | Required final integration gate, alongside core and static checks |
| `npm run test:research` | Paused physics experiments: 225 checks in 20 files | Work on those experimental mechanisms |
| `npm run test:all` | All four TypeScript tiers: 3,965 checks in 369 files | Complete combined-candidate verification |
| `npm run test:data -- --verbose` | Offline Python measurement checks | Affected data/extraction changes |

Counts describe develop `2a8b5de7a8892f77746b7dfbc1f642619e7738e9`
with this tier change; the historical timing source below has earlier counts.
New tests join their matching tier.
Append a file to workflow/integration commands to select the affected check,
for example `npm run test:workflows -- test/film-pairs.test.ts`. Workflow files
are excluded from `npm test`; use their named command when selecting them.

The required `npm test` plus `npm run test:integration` path retains all 3,740
production/workflow checks exactly once. The integration command selects both
the workflows and integration projects; do not run the whole workflow tier
again immediately beforehand. Research remains its own explicit scope.

`test:all` already includes core, workflows, integration and research. Running
every tier immediately before it repeats the same work, including six full-game
executions. Reuse compatible completed evidence and choose the applicable scope;
the merger's independent local verification still follows AGENTS. An additional
scorecard or game campaign needs its own football question. Static related-test
selection alone misses CLI children and dynamic source/fixture reads.

### Noise floor of the fixed run set (`ref:report --placebo N`)

A paired run-set delta is only as good as its floor. Each placebo arm replays the
1,321 fixed runs on the reference stack with one body nudged sideways after the
first tick and nothing else changed (`REF_PLACEBO=<slot>:<sign>`,
`REF_PLACEBO_SIZE=<yd>` in `scripts/diag/ref-replay.mts`); its paired delta
against `ref` is what play divergence alone does.
`npm run ref:report -- --skip-operators [--set fresh] --placebo 4 [--placebo-size 0.05] [--flag X=1]`
(about 20 minutes) prints the arms, their mean (bias), RMS (spread) and mean
paired SE per family, the candidate beside them, and each arm's share of plays
whose yards change.

**The floor depends on how hard plays diverge, and it is biased.** Measured on
engine-55 (develop 2478e998, 2026-11-13), paired yards a run (capped at 20):

| nudge | plays changed | all: mean / RMS / SE | IZ: mean / RMS / SE |
| --- | --- | --- | --- |
| 1e-3 yd, six arms (C+, LG+, LB+, C-, RT+, LT-) | 46-69% | -0.01 / 0.04 / 0.03 | -0.06 / 0.08 / 0.08 |
| 0.05 yd, four arms (C+, LB+, LG-, RT+) | 77-95% | -0.10 / 0.11 / 0.08 | -0.14 / 0.15 / 0.19 |
| 0.05 yd, same four arms, **fresh set** (`--set fresh`) | 78-94% | -0.00 / 0.03 / 0.09 | +0.20 / 0.23 / 0.19 |

- On `runSet` every 0.05 yd arm loses yards overall (-0.05 to -0.17) and on IZ
  (-0.08 to -0.20): perturbing that set hard lowers its yards whatever the
  mechanism. On `runSetFresh` (captured on engine-55 with new seeds, which no
  flag was promoted on) the overall bias is gone (-0.00) and the family biases
  change sign. So the bias is selection: the default engine is the survivor of
  many promotions judged on `runSet`'s exact plays (a winner's curse on the
  benchmark). Read run-set deltas on `--set fresh`; keep `runSet` for continuity
  and for the operators, and there read a candidate that diverges most plays
  against the placebo mean, not zero.
- Match the placebo to the candidate: compare its share of changed plays with
  the arms' and pick the size that matches (a mechanism change usually diverges
  90%+ of plays, like the 0.05 yd arms). Read the candidate's delta against the
  placebo mean and RMS, not against zero and its own paired SE.
- Duo, toss and draw are small families with a wide floor (toss RMS 0.59 at
  0.05 yd); read them only beside it.
- Re-run the arms when the run set or the reference stack changes materially.

## Suite cost review — F2, 2026-10-29

Comparison pin `f62c5bc07d8f00e3c2664fc183a7f92eb0f593d3` has the identical
tracked tree (`dafc87c238bd328a9de7c3d8dc16b72559d8e3a5`) as accepted develop
`9acefb012b5e98880337ba2a9d51aa0ef104f55a`, which merged the earlier PR #380
runtime optimizations during this review. This measures the **additional**
tier/scheduling change, with
identical engine code, test files, fixtures and seeds in both arms. Node 22.23.3,
Linux x64, four-CPU quota, no competing benchmark, source flag overrides unset,
and identical default/JSON reporters including npm/Vitest startup.

| Command | Before wall | After wall | Before CPU | After CPU |
| --- | ---: | ---: | ---: | ---: |
| `npm test` | 161.799 s | 117.193 s | 606.554 s | 441.041 s |
| `npm run test:all` | 369.904 s | 275.813 s | 1,019.346 s | 1,025.323 s |

These are **one paired measurement per command**, about 27.6% and 25.4% less
wall time on this machine. The core receipt is at
`96077e78e05c858ca39a87c3c04c6ea1268ed22a`; the final complete receipt is at
`9b7ec932279c9f6e6f1e3397e0d8f8e0f114a143`. Only the unselected integration/
research pools and the complete command change between those heads; the core
command and selected configuration remain identical. Timing varies with host
capacity, ordering and load; this is not a universal latency guarantee.

Four former core files consumed 100.460 of 301.511 summed file-wall seconds
in the refreshed core profile: `film-pairs`, `film-pack-inputs`, `saved-game-play`
and `play-lab`. They contain 32 checks (0.87% of the former core count) but start
native game prefixes, independent replays, CLI children and Git worktrees.
They now form the workflow tier. Summed file times overlap; they are not CPU or
suite elapsed time, and test count is not a measure of behavioral coverage.

The full suite originally split threads and forks into separate pools, with one
worker per pool. A trial with one thread and two forks took 377.163 s: the fork
workers finished while the thread queue stayed busy. All tiers now use the same
isolated thread pool. Complete verification caps it at three workers; standalone
integration caps it at two and workflows at one. File isolation, every timeout,
independent game executions and every assertion stay intact. Full-suite CPU
work is similar, while average CPU use rises from 2.76 to 3.72 cores. On a
constrained host, `npm exec -- vitest run --maxWorkers=1` lowers concurrency
while selecting all four projects. For the workflow/game integration scope use
`npm exec -- vitest run --project workflows --project integration --maxWorkers=1`.
Do not append another `--maxWorkers` to a script that already specifies it:
Vitest rejects duplicate scalar options rather than using the last one.

The final integration-gate repair includes workflows in `test:integration`.
The timings in this dated review used the earlier command map and source;
they do not measure the expanded 42-check integration command or develop
after #382. The core selection and complete
shared-pool implementation are retained; current-head verification must state
its own source and results.

All 3,929 test identities/statuses match across all 368 files: 3,927 pass,
the same two ordinary-frontal research assertions fail, and none are skipped.
Both complete commands exit 1. There are no new timeout or worker errors.
Core passes all 3,662 retained checks; the full run passes all 32 moved workflow
checks and all 10 integration checks. No test file was changed by this tier/
scheduling pass. Raw reports, timing and exact identity comparisons remain in
ignored `out/perf/`.

The blocking-responsibility ledger remains in core despite its cost: its named
native cases protect assignment/release and observation seams relevant to active
engine work. The six full-game executions remain in integration: official-record
checks and independent recording/film comparisons answer different questions.
Their scope and seeds are preserved. The main avoidable costs were triggering
whole workflows during routine checks, repeating complete scopes, and leaving
workers idle between separate queues.

## Offline data checks

Run `npm run test:data -- --verbose` locally on Python **3.12** and the Node
version in
`.nvmrc` (**22.23.3**). Install Python dependencies with
`python3 -m pip install -r scripts/data/requirements-movement.txt` (pinned
NumPy and pandas), and Node dependencies with `npm ci --no-audit --no-fund`.
Dependency installation/import errors and test failures fail the command.

Add offline measurement checks as `test/test_*.py` using ordinary
`unittest.TestCase` discovery. There is no module allowlist: mechanics-guard
checks and new measurement fixtures join automatically. Keep required checks
unconditional; missing tools or packages must produce errors, not skips.
Verbose output identifies every discovered test and reports any skips.

These checks use committed or synthetic fixtures, with no NFL download or game
collector. Select them for affected test, measurement, dependency, configuration
or reference-data changes; they need no simulated-game campaign. GitHub Actions
is not used for routine verification; follow AGENTS for execution venue.

## Engine and typecheck timing — F2, 2026-10-30

Manual comparison of develop `7a56d7904ba340b05998dccc3a1dbaf8f5207a73`
and runtime candidate `cd565ceb8acdf3ab877b457c73857d21caed2568`, using
Node 22.23.3, Linux x64 and a four-CPU container quota. Source-declared
environment overrides were unset in both arms; tests still set their own
flags. Each measurement includes npm/Vitest startup and identical default/JSON
reporters, with no competing benchmark process.

| Existing command | Base wall | Candidate wall | Base CPU | Candidate CPU |
| --- | ---: | ---: | ---: | ---: |
| `npm test` | 162.705 s | 159.774 s | 613.757 s | 602.265 s |
| `npm run test:all` | 367.846 s | 358.443 s | 1,041.899 s | 985.840 s |

These are **one paired measurement per command**: about 1.8% and 2.6% less
wall time, respectively. Machine variability and test scheduling still matter.
Within the complete suite, the two longest game-test files improve from
147.020 to 129.417 s and from 142.231 to 127.193 s (about 11–12%). These file
timings are concurrent observations, not independent benchmark repetitions.

The new two-component norm avoids the pinned runtime's general `Math.hypot`
temporary argument array, retaining its scaled arithmetic and argument order.
Higher-arity norms keep the built-in. Numeric edge checks and 2,750,324 manual
comparisons match exactly. Requalify exactness when upgrading Node. The earlier
support optimizations also remain: direct copies for ordinary flat records,
`structuredClone` for complex/shared state, a bounded cache of clock-only
coefficients, and skips for empty held-support work. Redundant facing and
zero-acceleration work is avoided without changing football parameters.

Seven frozen replays, two warmup groups and 12 measured groups per arm isolate
the additional norm/shortcut change from the first-pass support optimization
on the same develop composition. Base-then-candidate takes 19.820 → 16.985 s;
the reverse-order repeat takes 20.155 → 17.514 s. That is an additional 13–14%
for this warmed replay panel, not the entire test suite or a universal game rate.

Only no-emit typechecking adopts TypeScript's incremental cache, in ignored
`out/typescript/typecheck.tsbuildinfo`. On publication source
`423e797f2c5fcae4153a7ac600feefd9277c0ab1`, a fresh typecheck takes 15.144 s
and a warm check 3.083 s, versus 15.352 s for the original command. Warm checks
still fail on new and repeated errors, detect changed bytes with unchanged
size/mtime, and pass after errors are fixed or their source is deleted. They
emit no build output. The cache is disposable; a cold check remains valid.
Build stays unchanged: an incremental-build trial returned success without
recreating a missing JavaScript output. A Node bytecode-cache trial saved only
2.4% on one core run (159.774 → 155.980 s); it is not enabled automatically.

All 3,923 pre-existing test identities/statuses match the base. Two new numeric
checks pass: core has 3,690 passes in 342 files; the complete suite has 3,923
passes and the same two research failures in 368 files, with no skips. Both
complete-suite commands exit 1 at the ordinary-frontal `physical fall`
assertions in `test/research/continued-recovery-world.test.ts`. Focused checks
(81), Python checks (297), typecheck and build pass. Seven saved plays preserve
90,031 World-step states/reports, 797 controller ticks, 4,155 random draws and
complete results exactly.

Every pre-existing test/fixture, discovery rule, timeout, isolation setting,
worker setting and test command is unchanged. Raw output stays in ignored
`out/perf/`; exact identities and manual verification are summarized in the PR.
Develop advanced to `e70cc2abe8650b02a2ad6eac84839208a6d074a0` during these
measurements. Its separate squeeze repair is outside this pinned comparison;
the merger still verifies the updated combined head locally.

## Core and integration timing — F2, 2026-10-23

Measured against develop `c5667bc4f7d4aa0411599ac5db25127f285bf4bf` with
Node 22.23.3, Linux x64 and a four-CPU container quota. Runs were sequential
in the same workspace, using `npm test -- --reporter=json --outputFile=...`.
Wall time includes npm/Vitest startup and JSON reporting. Report all three
runs rather than comparing the slowest baseline with the fastest candidate.

| Core configuration | Run 1 | Run 2 | Run 3 | Median |
| --- | ---: | ---: | ---: | ---: |
| Original isolated forks | 147.739 s | 113.860 s | 116.255 s | 116.255 s |
| Isolated threads, slow file assigned to integration | 106.844 s | 103.501 s | 134.235 s | 106.844 s |

The median improvement is **8.1%**. Wall time still varies; this is not a
latency guarantee under arbitrary machine load. All three runs of each
configuration pass with no pass/fail changes. Every candidate core test is
under five seconds in these runs.

`hands-bunch.test.ts` reached 29.667 s for its native crossing-release test
in the cold baseline run (three-run median 1.357 s). Its entire two-test file
is now assigned to integration through one shared include/exclude list in
`vitest.config.ts`; its path, assertions, seeds and fixtures are untouched.
The existing full-game tests took 35.1–45.5 s each in the serial baseline
integration run and remain there. The PR contains the 30 slowest test names,
files, medians and maxima from the three baseline core runs plus that
integration run. Raw reports remain in ignored `out/F2-test-time/`.

| Project | Before | After |
| --- | ---: | ---: |
| Core | 3,086 | 3,084 |
| Integration | 7 | 9 |
| Research, unchanged discovery | 225 | 225 |
| Total | 3,318 | 3,318 |

Core uses worker threads with **file isolation retained**; flag/module state
must not be shared between files. All 60-second test limits remain unchanged.
`npm run test:integration` retains `--maxWorkers=1`. The new
`.github/workflows/tests.yml` runs core and integration in separate matrix
jobs/runners, with fail-fast disabled so a core failure does not cancel the
integration checks. Previously the only workflow ran the scorecard. Research
is still available separately; its count above is discovery, not a new claim
that the paused research suite passes. `npm run test:all` still selects all
three projects.

One serial integration run per configuration passed: 212.884 s before and
226.758 s after, including the newly assigned file. There is no claim that
the complete test workload became cheaper or that native games cannot exceed
their existing budget on an overloaded host. The tests-only quick scorecard
comparison preserved all six games and 800 play records exactly, excluding
only metadata and per-game elapsed milliseconds.

To reproduce timings and preserve per-test results:

```sh
npm test -- --reporter=json --outputFile=out/core.json
npm run test:integration -- --reporter=json --outputFile=out/integration.json
```

Shared policy requested 2026-10-13. This adds a marginal-cost constraint to the
[roster audit](reviews/roster-capability-audit.md) and [validation](VALIDATION.md).
Choose the smallest check that answers the remaining question. **Do not multiply
the code suite by rosters, screen every edit, or run games for a local solver error.**

## Default loop: one question, tiny evidence

This is the everyday workflow. The behavior-review categories interpret results;
they are not separate mandatory test suites or a requirement to collect more evidence.

1. State the **one question** the change should answer.
2. Run the smallest reproducer, one relevant opposing control and directly
   affected correctness tests. Reuse existing fixtures and compatible receipts.
3. If they support the change, run the smallest relevant transfer screen **only
   when transfer remains an open question**. Choose a subset once; do not
   automatically climb through 2, 8, 16 and 32 snaps. Zero transfer snaps is valid.
4. If a material adverse result appears, use **one targeted diagnostic** to
   distinguish a defect, a football tradeoff or changed randomness. Start with
   saved evidence; do not immediately launch a larger batch. If it cannot settle
   the cause, report the uncertainty and decide the next discriminating question.
5. Run the full code suite at integration under one owner for the exact combined
   candidate. Reserve additional games for changes whose interactions require games.

**Before adding a test or batch, name the decision its result could change. If
it would not change what we do next, skip it.** A bigger affected subsystem is a
reason to identify risks, not an automatic order to run every available panel.

Report only **what changed; evidence for/against; unresolved risk; runtime; next
decision**. Link existing receipts and traces instead of rerunning or copying them.
This compact report is enough for local work; the detailed behavior worksheet is
optional when a difficult result needs interpretation.

For the current work, start here rather than opening another roster audit:

| Work | First question/evidence | Opposing control / next spend |
| --- | --- | --- |
| Arrival | The small P4 matched-execution experiment identified in the arrival chat. | Reuse its relevant control; no new roster sweep to answer this question. |
| Blocking | The specific release/collection encounter. | A control where leaving early would harm useful work. Diagnose the encounter before broad screening. |
| Physics | The failing mechanical replay. | One opposing mechanical control; broader checks after a coherent correction and an identified transfer risk. |

## When to spend more

These are available scopes, **not a staircase or a checklist**. Additional
coverage is triggered by a specific unresolved risk, not by another policy category.

| Stage | Trigger | Work and initial budget | Evidence |
| --- | --- | --- | --- |
| Local iteration | A specific change/question | Smallest reproducer, one opposing control and directly affected correctness tests. Mirrors/edges only when they change the decision. Usually zero new full snaps. | Question answered and immediate control holds. |
| Transfer screen | Local evidence supports the change; a named capability/role transfer risk remains | Select only relevant frozen cases, once: 2, 8, 16 or at most 32. Reuse recorded baseline. No screen if the question is already answered. | Transfer across relevant capabilities; not league certification. |
| Integration | Exact combined engine candidate ready | One owner runs typecheck/build and the preserved full code suite once, with relevant shared football contracts. Other agents supply focused evidence. | Combined candidate's required contracts preserved. |
| Game evaluation | A named interaction cannot be resolved without games | Explicitly budgeted pairs/games, declared schemes/seeds and relevant fatigue/packages/calling/interaction measurements. Some untouched inputs for checkpoint transfer. No automatic checkpoint game count. | The specific game-wide risk resolved or bounded. |

**Paired snap replay instead of a card.** Use `scripts/diag/paired/replay.ts` when a flag touches only a minority of
snaps, and before reading any single-seed card. An unpaired card also measures the games taking a different path:
one changed snap changes every later situation and snap seed. In step 6 an unpaired 8-game YAC drop of 1.5 yd
was within 0.1 yd paired, on both paths' snaps.
- The tool captures each scrimmage snap's setup from N games and replays it under flag sets A and B, on the same
  bodies and seed.
- It reports per bucket: plays, how many differ, and means with paired standard errors.
- **Caveats:** the setup round trip is close but not exact (replayed means are within a few tenths of the game's), and
  motion is already applied in PlaySim's constructor.

Escalate when affected scope grows, evidence conflicts, or the cheaper stage
cannot answer the remaining question. An adverse result first gets a targeted
diagnostic, not an automatic larger batch. Better averages do not trigger automatic
escalation or promotion. Physics laws and short contact tapes precede football
transfer. Known conservation/accounting failures remain failures.

## Opt-in screen: 2, 8, 16 or 32 snaps

`npm test` has no roster multiplication or new game collector; its measured
project split is documented above.
[`screen:roster`](../scripts/roster-screen.ts) without arguments prints a plan
and **simulates zero snaps**. Use .nvmrc Node 22.23.3 and `npm ci` once.

```sh
npm run screen:roster
# Only if transfer across the four matchups is still an open question: 8 snaps.
npm run screen:roster -- --compare data/reviews/current/roster-screen-baseline.json --calls slant_flat
# Alternative subsets for a named risk, not the next steps in a sequence.
# Pass or run subset: 16. Omit --calls for all 32 only if needed.
npm run screen:roster -- --compare data/reviews/current/roster-screen-baseline.json --calls slant_flat,mesh
npm run screen:roster -- --compare data/reviews/current/roster-screen-baseline.json --calls iz_strong,oz_strong
# Narrow pair/call: two snaps.
npm run screen:roster -- --compare data/reviews/current/roster-screen-baseline.json --calls mesh --matchups ordinary
# Explicit experimental flag: the launcher resets all other ambient flags.
npm run baseline:run -- --candidate --flag REACH_CONTACT=1 -- node --import tsx scripts/roster-screen.ts --compare data/reviews/current/roster-screen-baseline.json --calls slant_flat
```

The [frozen fixture](../config/roster-screen.json) contains actual selected
`11`/nickel player profiles, IDs and slots. It was chosen from 96 seeded pairs
using capabilities **before observing outcomes**, rather than homogenized ratings:

| Matchup | Relevant distinction |
| --- | --- |
| `speed-gap` | Z speed advantage .72 yd/s over CB_S; attainable closing/gathering. |
| `technique-elusive` | FS tackling 86, RB elusiveness 94; technique and evasion both matter. |
| `ordinary` | Small movement differences, OL/DL power ratio .97, FS tackling 70. |
| `offensive-advantage` | Receiver speed edge .51 yd/s, OL/DL power ratio 1.42; opportunities for earned offensive wins. |

Labels describe profiles, not required winners or empirical NFL reference
athletes. Calls may target other players: inspect actual actors before attributing
a change. Mechanisms absent from these calls need their own targeted fixtures;
do not apply this panel blindly to every subsystem. Do not replace its seeds
to erase a regression.

The [committed baseline](../data/reviews/current/roster-screen-baseline.json)
lets another agent run only the candidate. It records the pinned runtime,
including documented physics/football failures; it is not a yardage target or
readiness certificate. Initial-profile fingerprints reveal physical-mapping
changes even though player inputs stay frozen.

## Evidence reuse and stopping

Per-case keys include engine source, full selected input/seed, frozen fixture,
runner/source-hash-helper and measurement version, Node, platform/architecture,
dependency lock, resolved runtime flags and World defaults. Content hashes are
checked. Unrelated docs/tests do not invalidate simulation evidence. Reports
separate newly executed and cached cases and retain original wall/CPU cost.

The baseline must be complete, use the pinned runtime/flags, and contain each
requested exact case. Candidate code/explicit flags may differ intentionally;
inputs, measurement and environment must match. A changed call definition can
invalidate the input too. Missing/stale/corrupt baseline evidence fails **before
candidate simulation**; it never silently launches another baseline batch.

Default limits: 32 cases maximum, 30 seconds per batch, five seconds per case.
Wall checks occur between physics ticks; this synchronous runner cannot preempt
one tick. Exhaustion fails, retains completed evidence and lists the unrun tail.
Unfinished cases are not cached as complete. Mid-collection source/input edits
fail the report and discard new cache entries. Favorable results never stop early.

```sh
# Smaller wall bill; resume reuses completed compatible cases.
npm run screen:roster -- --compare data/reviews/current/roster-screen-baseline.json --calls mesh --max-ms 10000 --case-ms 3000
# Declare exact preservation only when the case should truly be unaffected.
npm run screen:roster -- --compare data/reviews/current/roster-screen-baseline.json --calls slant_flat --unchanged ordinary/slant_flat/71001
```

Declared unaffected controls run first; an identity mismatch or nonfinite result
stops the batch and retains failure/skips. Deliberate shared physics changes can
alter all trajectories: their opposing controls assert the mechanism, rather
than exact yardage. Screen completion means execution without its declared hard
failures. Review changed cases before integrating; no outcome threshold or
automatic promotion was added.

Use the shared [improvement and regression procedure](BEHAVIOR_REVIEW.md) to
make that review explicit: declare a mechanism contract, trace the first
relevant divergence, check feasible/informed football responses and opposing
controls, then record improvement, valid outcome change, regression, tradeoff
or uncertainty. Apply the same standard to favorable and adverse yardage.
Material unexplained changes do not pass by looking more like NFL averages.
Use these categories only when helpful to the decision; filling a worksheet or
collecting a new trace for every changed signature is not mandatory.
The saved-result worksheet runs zero simulations; request new traces only when
they can settle an unresolved mechanism. These verdicts do not add a roster
matrix, per-edit screen or automatic full-game job.

To regenerate an incompatible baseline, use the pinned runtime, review why it
changed, then `npm run screen:roster -- --baseline`. Review and commit its result;
preserve historical receipts. The fixture builder performs no simulations and
is a maintainer tool, not a per-edit command.

## Cheap profiles, explicit broad checkpoints

Frozen-body screens bypass a changed generator/selector. Start those changes
with existing relevant schema/selection evidence. Use a small fresh profile
audit when the question needs newly generated/selected players, not games:

```sh
# 3 strengths × 8 teams: 1,272 profiles; zero games.
npm run baseline:run -- --candidate -- node --import tsx scripts/roster-audit.ts profiles --candidate --teams 8 --out out/roster-profiles-candidate
# Cost preview only, no simulations.
npm run baseline:run -- -- node --import tsx scripts/roster-audit.ts games --pairs 4 --reps 2 --plan
```

The broad runner requires explicit `--pairs`/`--reps` for encounters, contexts
and games. More than 32 audit snaps, any games, or the larger native panel also
require `--checkpoint "reason"`. Record the evidence motivating a broad run;
this is a CLI declaration, not a user permission round-trip. The previous
implicit defaults could launch 96 games. Never run this broad audit per edit.
Fresh rosters/holdouts belong at separate checkpoints, not repeated development.

## Fail cheap before paying for expensive checks

Run targeted failing/opposing controls first. A screen follows only if a transfer
question remains. Full checks belong to the integration owner, not every agent:

```sh
npm run baseline:run -- --candidate -- npx vitest run --project core test/the-affected-mechanism.test.ts
# Integration owner only, for the exact combined candidate:
npm run baseline:verify -- --candidate --fail-fast
```

The opt-in `--fail-fast` preserves skipped command evidence and cannot issue a
passing receipt when phases are skipped. Failed typecheck/build avoids paying
for later suites. Existing assertions and default verifier behavior remain.
Fix a failure before retrying. Additional games need an interaction question.
Record runtime by group; test count is not a cost estimate. Compare timings on
the same machine without competing collectors before claiming speed gains.

## One owner for shared integration checks

Record the integration owner in [WORKBOARD.md](WORKBOARD.md) before the combined
run. Integration in this chat owns the [current queue](INTEGRATION.md#ready-blocked-experimental)
and the exact combined check. Contributors supply compatible focused receipts,
limitations and fetchable candidate commits; they do not repeat the shared
suite. A new handoff, branch update or docs-only change does not trigger a
verification job. Historical owner rows/receipts describe their original stage.

The owner freezes the combined candidate and settings, runs the preserved full
code checks once, and publishes one receipt linked by all contributors. Record
the tested source/test/input/measurement versions, flags and environment. Reuse
results only while those remain compatible; a changed combined engine or test
contract is not covered by an old all-suite pass. Local evidence from a different
branch does not prove the combined candidate. Rerun because a material input
changed or a check failed, not because another agent is preparing its handoff.

Additional simulation games need a named interaction question and budget. Existing
game assertions inside the preserved full suite remain part of that suite; this
policy does not remove them or multiply their rosters.

## Applying the roster recommendations

| Recommendation | Shared support now / next bounded candidate | Gate before broader spend |
| --- | --- | --- |
| Trait/missing-measurement semantics | Audit documents balance/TE/QB-bench concerns; cheap candidate profile mode now works on edited engines. Numerical changes stay separate. | Answer the trait question with relevant existing schema/profile checks. Use a small screen only for unresolved execution transfer. Do not choose means from desired tackle rates. |
| Consistent familiarity/lineup selection | Frozen inputs expose actual listed positions/jobs; fresh profile audit exercises packages/depth. Refactor/assignment changes stay separate. | Eligibility, familiarity, unique players and feasible complete assignments, plus composition. Frozen screen alone bypasses selection. |
| Diverse execution coverage | Four capability-selected fixtures, affected 2/8/16/32-case subsets and reusable baseline implemented. | Candidate mechanism first; opposing control and allowed offensive success retained. |
| League transfer | Broad cost previews, explicit checkpoint reasons and exact cache reuse implemented. | A named unresolved league/interaction question needing games, then budgeted independent pairs/seeds with untouched inputs. Integration alone does not trigger games. |

This pass installs shared workflow/evidence tools first. It does not alter live
ratings, familiarity behavior or capacities to fit outcomes. Their bounded
follow-up candidates now have bounded evidence choices driven by the next decision.
