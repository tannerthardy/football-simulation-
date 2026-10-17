# PR106 independent tooling review

**HOLD** on author head `706a10cc22e87a5fced54641f00a5db2df249b4b`.
The initial failure path retains its partial row, but reopening the same output
replaces the failure index with an empty index and labels the attempted input
as skipped. No production/runtime promotion is proposed.

Reviewed from accepted `develop@d682b1f474cb6ba260a7b8b1119a62919c5a2159`,
source `bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`,
with canonical queue `bf493d881f423540962c6b1ad3b889fe2662e8c8`.
Fetched `origin/develop` matched. Author-tested tooling
`3d01f26c5f4e435590eec144573d2beeae9a4d2e` has the same source/scripts,
config, tests and package command as the author publication. Its intentionally
historical host remains accepted 3723204/source cda44ed; the receipt is not
current-develop execution evidence.

## Required small correction

In `scripts/diag/pass-game-suite.ts`, lines 40–43 reject intact failed/wall-censored
caches. Lines 84–93 then establish a new empty index after checking only prior
provenance; lines 104–115 catch the rejection and publish that empty index.
The skipped tail is derived from `rows.length`, so the already attempted input
becomes skipped. This affects both wall-censored and returned numerical-failure
rows. The raw partial cache remains, but the replacement index/report drops its
row, error/censor count, physical signature and cache link.

The exact pinned runner was evaluated with stubbed measurement and in-memory
IO, with **zero engine imports and zero native plays**:

| Three selected inputs | New/cached | Index rows | Censors / failures | Skipped |
| --- | ---: | ---: | ---: | --- |
| First wall-censored attempt | 1 / 0 | 1 | 1 / 0 | second, third |
| Same-output resume | 0 / 0 | 0 | 0 / 0 | first, second, third |
| First returned failed prefix | 1 / 0 | 1 | 0 / 1 | second, third |
| Same-output resume | 0 / 0 | 0 | 0 / 0 | first, second, third |

Measurement-call count does not increase on either resume. The original partial
cache still exists, and reading the replacement `index.json` confirms zero rows.
The existing wall-budget test checks no retry, but does not assert preservation
of the previous row/counts on its second invocation.

Smallest author fix: refuse incompatible/blocked reuse before replacing the
existing blocked index, or carry the intact blocked row and its accounting into
the replacement index. Keep no-silent-retry and keep untouched tail inputs
separate from attempted inputs. Add a zero-engine regression for first failure
and same-output rejection for both statuses. A thrown-measure stub also records
zero collected/new cases and an entirely skipped selection; this is a remaining
attempt-accounting limit, not a new native numerical-failure observation.
No engine change or broad study repeat is needed to decide this correction.

[Exact reproducer](../../../tools/review/pr106-failure-paths.cjs),
[stub result](../../../data/reviews/current/pr106-independent-tooling/failure-paths.json)
and [machine review](../../../data/reviews/current/pr106-independent-tooling/review.json)
retain the pin, runner SHA, source inventory, receipt reuse and cost.
Run `node tools/review/pr106-failure-paths.cjs` with installed TypeScript;
`PR106_TYPESCRIPT_PATH` can select an existing installation. The stub host was
Node 24.19.0; this does not replace the author's Node 22.23.3 receipt.

## Accepted contracts and evidence limits

Default `plan` calls no measurement; `run`/`inspect` require a nonempty checkpoint.
Budgets are 20 simulation seconds, 5 wall seconds/case and 30 wall minutes for the
loop, checked cooperatively between ticks. A tick can overrun. Constructor cost,
preflight and reporting are not hard deadlines. Fresh wall/failed rows are
inserted before stopping, unlike the original
[PR101 HOLD](https://github.com/tannerthardy/football-simulation-/pull/101#issuecomment-6220802845).
PR101's frozen operator remains unchanged at ed2fed9 and remains held separately.

Live tick/observer exceptions are caught in `measure` and return accumulated
partial observations with null terminal gain/YAC. Constructor and finalization
are outside that try; the stub's escaping exception is not proof of an observed
native failure there. Simulation and engine timeouts remain censors; collection
completion is separate from a completed football outcome.

Cache/reference guards include full manifest/input identity, runtime source,
all four collector files and source-helper hashes, operator, 44 declared flags,
World defaults, native routes, Node/platform/architecture and lock. Route/settings
exceptions remain explicit. Source differs at eight runtime files on current
develop, so importing the author's whole tree would undo accepted 107/112 work.
The old manifest/receipts must remain pinned. A current-source collection needs
a compatible historical reference via `--compare`; it must not silently become
a baseline. No reference refresh or new campaign is authorized by this review.

Reuse the author's 13 focused checks/build, 18 native finishes, 18-cache resume and
comparison, and offline report receipt. The 18 old/new collector physical-signature
matches validate the cue-cap correction on historical cda44ed. Full observer-off,
observer-on and recording equality is tested on one 0.5s prefix; it is not 18 full
observer-off comparisons. The cue window retains first 600/latest 1200 consumed
reads, with omission counts and no added sighting/RNG call. Raw caches were not
published in the committed receipt, so their full payload hashes and late-cue
contents were not independently rehashed here.

Terminal gain uses native completed outcomes. Clean terminal YAC excludes
censors/errors/timeouts, penalties, fumbles and returns. Throw/catch counts can
include observed events on unfinished prefixes; release distributions use throws.
No-post-catch-contact is a descriptive count, not a failed-tackle denominator.
Groups overlap, outcomes are unweighted stress exposures and no NFL population
or yardage-target claim is justified. Pinned HTML passes script parse and delimiter
escaping in the stub; rendered values use `textContent`. No browser visual claim.

## Eventual extraction and shared PA compatibility

The portable tooling boundary is four new `scripts/diag/pass-*` files,
`config/pass-game-suite-v1.json.gz`, `test/pass-game-suite.test.ts`,
`docs/PASS_GAME_SUITE.md` and the historical validation JSON, plus only the
`pass:suite` package-command insertion and README link. Reconcile ownership/docs
against current records; do not copy old WORKBOARD or accepted runtime/settings,
import diagnostics ancestry, repair 101 or regenerate frozen inputs. Existing
input-builder and observed APIs used by this tool are unchanged between hosts.
No implementation patch is supplied while the accounting HOLD remains.

PR106 contains 216 PA exposures/108 pairs. The separate shared registry at
101@ed2fed9 contains 432 cases/216 pairs. Their stored input hashes have zero
intersection; seeds/rosters/identity schemes differ and operators hash different
schemas. That count mismatch alone is not a second blocker or evidence of an
identical-input duplicate. Before allocating shared PA checkpoint work, reconcile
an offline full-input identity map and receipt references, retain complementary
historical exposures and execute any identical native input only once. Do not
launch another PA campaign or feed mismatched caches into a new operator. This
review neither invokes nor clears the held 101 execution operator.

New cost: zero native snaps/games, zero broad campaigns, zero repeated focused,
type/build or integration suites. Successful stub command 0.231s; an initial
fixture-only harness error cost 0.193s before measurement. Source reads and
publication are additional. Next: author returns the bounded accounting fix and
pinned stub receipt; Integration rechecks that tooling boundary separately from
runtime work and owns any required exact combined verification.
