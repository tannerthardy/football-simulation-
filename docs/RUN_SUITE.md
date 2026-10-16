# Run-suite development workflow

Adopted for Run's #101 tooling on 2026-10-16. Use alongside
[TESTING_COSTS](TESTING_COSTS.md). The completed **1,848-case census and its
results are preserved**; they are a checkpoint, not the per-edit test command.
[Historical report, source pins, inputs and films](reviews/run-playaction-stress/README.md).

## Everyday work and major checkpoints

| Occasion | Select | Decision |
| --- | --- | --- |
| Normal development | One saved failure, a relevant successful/opposing control, directly affected correctness checks. Often zero new snaps. | Is there a demonstrated decision/execution error? Did the correction preserve useful protection and legitimate defensive responses? |
| Named transfer uncertainty | The smallest relevant frozen subset, chosen before seeing results; a reserved input when useful. | Does this mechanism transfer to the different responsibility, geometry or execution? An adverse result gets a targeted diagnosis. |
| Major integrated improvement | Integration supplies the exact accepted build/settings; Run and Measurement declare a checkpoint and coverage once. Use the catalog broadly, reuse compatible evidence and coordinate shared PA execution. | Which mechanisms recur now, what improved/regressed, and which few should be investigated next? |

There is no mandatory ladder, full-catalog run after each patch, fixed calendar
cadence, automatic game campaign or requirement to preserve an old ending.
Broader coverage is appropriate after substantial controller/contact changes or
a group of related accepted corrections when interactions need reassessment.
A narrow independent fix can remain supported by its focused evidence until
that checkpoint. Integration alone owns the final combined code-suite run.

Judge information, responsibilities, attainable execution and protection through
runner arrival. A touchdown becoming a tackle can be correct; a longer gain can
hide missed protection. Numerical/accounting failures remain hard failures.
Report adverse and inconclusive evidence, censoring, changed execution draws and
known contact-law limitations separately from outcome changes.

## Catalog, ownership and shared play action

The new outer command leaves the original collector and its measurement/cache
identity unchanged. It selects cases from the original full manifest instead of
rebuilding a smaller manifest that would invalidate otherwise compatible caches.

| Partition | Cases | Scope / owner |
| --- | ---: | --- |
| `accepted-runs` | 1,176 | 880 primary + 152 formation transfers + 144 contextual run counterparts. Run owns inputs/interpretation. |
| `shared-pa` | 432 | 216 canonical PA/no-fake pairs. Shared with Pass; Catching defines pass situations and Run supplies run-action contracts. |
| `all-accepted` | 1,608 | Union of the two above, counted once. Use only when this entire checkpoint is needed. |
| `prototypes` | 240 | Buck/pin-pull/crack on the separately pinned #99 host. Never pool as accepted production. |

Run owns catalog maintenance and run diagnosis. Catching owns the pass-suite
design; this change does not implement a duplicate pass suite. Measurement owns
consistent cross-suite reporting; the schema/registry here are a concrete
handoff for reconciliation, not a claim that Measurement has reviewed them.
Integration supplies the exact accepted source/settings and handles adoption.

Export the canonical PA registry for both suites. Each pair records both exact
case IDs/input hashes and an **existing** run counterpart, including reused
neutral primary cases. Selecting one PA arm automatically adds its matched
control. When Run and Pass request the same pair, one receipt satisfies both
only if code, input, settings, environment and measurement are compatible.
Neither owner creates a renamed copy or bills the two arms again.

```sh
# Node22.23.3. Default plans zero snaps, prints partitions and optional sets.
npm run suite:run
npm run suite:run -- plan --set mesh --out out/mesh-plan.json
npm run suite:run -- plan --set shared-pa --out out/pa-plan.json
npm run suite:run -- registry --out out/shared-pa-registry.json
```

The four optional [starter sets](../config/run-suite-focus.json) are retrospective
diagnostic witnesses, not a compulsory mini-census:

| Set | Final cases | Question and opposing contrast |
| --- | ---: | --- |
| `mesh` | 3 | Two correlated I21/Wide9 stranded exchanges and an ordinary Ace exchange. Can legitimate physical recovery work without bypassing traffic? |
| `draw` | 3 | RB/QB draw and prompt-contact inside zone. Is feasible pass-style protection missing during presentation? This is a technique contrast, not a controlled causal arm. |
| `loaded-edge` | 2 | Weak/strong Ace WZ Over3. Did attainable work restrict the end's access through arrival? Opposite directions are not exact mirrors. |
| `shared-pa` | 4 | Flood PA/plain in neutral and pass-alert contexts. Separate legitimate early recognition from later recovery/protection/throw/coverage. |

Choose or edit a subset for the mechanism actually being changed. For arbitrary
saved inputs, provide a JSON array of exact catalog IDs with `--cases FILE`;
duplicates/unknown/empty IDs fail. A focused selection is capped at32 cases and
30 wall seconds, not targeted at32 cases. Most changes need two or three.

```sh
# First inspect the zero-snap plan. Use an Integration/owner-supplied full
# candidate commit AND source hash; both must match the checked-out runtime.
# Runtime/operator/config must be committed. New receipts never overwrite old ones.
npm run suite:run -- focus --set mesh --reason "QUESTION THE CHANGE ANSWERS" \
  --pin "FULL_40_CHARACTER_COMMIT" --source "FULL_64_CHARACTER_SOURCE_HASH" \
  --out out/mesh-candidate --cache-dir out/run-case-cache \
  --compare out/compatible-baseline/index.json

# Only at a declared meaningful integration checkpoint. Select PA here OR let
# Pass/Measurement supply its compatible shared receipt, not both executions.
npm run suite:run -- checkpoint --partition accepted-runs \
  --reason "INTEGRATION CHECKPOINT AND OPEN INTERACTION QUESTION" \
  --pin "FULL_40_CHARACTER_COMMIT" --source "FULL_64_CHARACTER_SOURCE_HASH" \
  --out out/integrated-run-checkpoint --cache-dir out/run-case-cache
```

These placeholders intentionally fail until replaced with real pins. The
current accepted reference is developbb6d4c73948d53ba841dd9338dd240146c739f8c,
source668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac;
check the [canonical queue](INTEGRATION.md#accepted-development) again before
future execution. New source can be evaluated intentionally, but it never reuses
an old source's trajectory as a cache hit. All44 baseline flags/components1,
CF_FLOW unset, Node22.23.3 and World defaults are recorded. Experiments remain
separate. Prototype runs need their own manifest, partition and compiled calls.

## Evidence reuse, limits and reserved inputs

Every trajectory key retains full input/seed, original manifest, engine source,
collector/helper hashes, Node/platform/architecture, dependency lock, resolved
flags and World settings. The outer receipt additionally records its own hash,
selection/config hashes, exact HEAD, reason, execution/cache counts, budgets,
censors, skipped tail and optional per-case baseline metrics/physical identity.
Selecting different subsets does not invalidate the original trajectory key.
Changing the measurement operator does. Changing playbook definitions requires a
versioned input update: old frozen calls do not silently become new calls.

`--compare` validates **every requested baseline row before any simulation**.
Candidate source/flags may intentionally differ; input, measurement and runtime
must match. Missing/corrupt/incompatible evidence fails without recollecting a
baseline. `--reuse-only` also requires all candidate rows already cached and
executes zero new snaps. Full old caches remain in the original collector outputs;
the committed compact census is suitable for diagnosis but cannot substitute for
a missing detailed replay cache. Preserve/share the required raw cases instead
of silently starting another baseline campaign.

Limits remain5 wall seconds per case and20 simulated seconds, with explicit
live censoring and no placeholder gain. Focus30 wall seconds; checkpoints use
the frozen manifest's declared campaign ceiling. A synchronous tick cannot be
preempted. Stops retain completed rows, failures and an unrun tail. Drift prevents
new rows entering the reusable cache; rejected raw evidence remains diagnostic.
Wall-censored evidence does not silently retry. Receipt completion establishes
execution under these rules, not successful football or automatic adoption.

[Eight reserved inputs](../config/run-suite-reserve.json) use seed902117 on the
same selected athletes and existing looks. They were frozen **without running**
after this workflow request. The old77/71001 cases are all already exposed; none
is now called a holdout. This reserve tests execution-seed transfer, not new
rosters/fronts or statistical NFL realism.

```sh
npm run suite:run -- plan --set reserve --out out/reserve-plan.json
# Select relevant reserve IDs BEFORE revealing results, rather than always8:
npm run suite:run -- plan --set reserve --reserve-cases out/relevant-reserve-ids.json
# Later, use focus plus explicit --unlock-reserve "TRANSFER QUESTION" and real pins.
```

Execution writes an opened-input ledger before the first native continuation;
it blocks accidental repeated reserve use in this checkout. Publish the ledger
and receipt, mark the exposed inputs consumed across owners, and predeclare a
new reserve before further tuning. This local guard is not a cross-checkout
blindness guarantee. Partial runs also expose their declared selection. No
reserve was opened to validate this tooling change.

## Reporting and choosing the next mechanism

At a broad checkpoint, Measurement reports distributions by accepted/prototype,
concept, formation, front/look, direction, roster and context, with denominators,
terminal/censored/missing counts, original cost and newly executed/cache counts.
Keep rare tails visible; do not infer NFL frequencies from this designed sample.
Rank a few mechanisms by **observed frequency within a declared eligible sample,
severity and confidence**, explaining the judgment rather than manufacturing one
weighted score. Correlated cases and overlapping flags are not independent bugs.

The current [ranked triage](reviews/run-playaction-stress/TRIAGE.md) gives one next
decision per mechanism. An unachieved job, transmitted force, low gain or altered
ending is an exposure indicator, not an automatic defect. Diagnose selected
failures plus successful/necessary opposing actions before proposing a fix.

The common reporting contract should follow the whole chain. Existing traces
provide these observations; missing detail gets a focused collector only when
it can change the next decision:

| Chain | Existing evidence | Limits to preserve |
| --- | --- | --- |
| Install → opening/contact |22-player snap, assignment/combo jobs,5Hz raw/final movement and achieved body state, hand loads, physical budgets and positive teammate impulses. | Not every intermediate modifier, consumed cue, support action or feasible-route proof is recorded. Load is not protection. |
| Exchange → runner choice | Native handoff/ball/carrier events, raw/final commands, arrival and first contact. | Full candidate read scores and legitimate observation history require a selected trace; no hindsight-optimal path assumption. |
| Defensive fit → finish | Recognition transitions, native positions/movement, carrier contact, outcome/tackle events, duration/gain/turnover/penalty. | Early recognition is not a diagnosis of aggression; first contact does not by itself certify coverage, tackle or contact realism. |
| Shared PA/pass chain | Protection/movement, read transitions, throw/catch clocks, receiver/defender positions and native contest/outcome events. | QB candidate scores, exact catch-contest execution draws and pursuit decisions are not all instrumented here. Catching/Measurement extend their shared pass evidence rather than treating completion as the whole chain. |

After a meaningful checkpoint, include a few short failure/control clips from
saved evidence when useful, alongside measurements. Provide downloadable film;
charts can appear inline. Reuse the existing offline #101 film for the current
diagnosis; there is no reason to regenerate it for a workflow-only edit.
