# Selective testing and roster coverage

Shared policy requested 2026-10-13. This adds a marginal-cost constraint to the
[roster audit](reviews/roster-capability-audit.md) and [validation](VALIDATION.md).
Choose the smallest check that answers the remaining question. **Do not multiply
the code suite by rosters, screen every edit, or run games for a local solver error.**

## When to spend more

| Stage | Trigger | Work and initial budget | Evidence |
| --- | --- | --- | --- |
| Local iteration | Every relevant edit | Failing witness, successful opposing control and relevant existing mechanical checks. Mirrors/edges only for distinct claims. Usually zero new full snaps. | Mechanism works and immediate control holds. |
| Transfer screen | Candidate mechanism works; capabilities might affect transfer | Four frozen matchups; choose affected calls. One call: 8 snaps. One call/one matchup: 2. Entire panel: at most 32. Reuse recorded baseline. | Transfer across relevant capabilities; not league certification. |
| Integration | Coherent engine candidate ready to integrate | Typecheck/build and preserved full code suite once, plus relevant shared football contracts. Broaden more for generation, fatigue, movement/contact than a narrow controller. | Required contracts preserved; candidate reviewable. |
| Major checkpoint | Integrated group of individually tested changes, or possible game-wide interaction | Explicitly budgeted independent roster pairs/games, declared schemes/seeds, ordinary film and tails, some untouched inputs. No default game count. | Fatigue, packages, calling, rules and interacting mechanisms together. |

Escalate when affected scope grows, evidence conflicts, or the cheaper stage
cannot answer the remaining question. Better averages do not trigger automatic
escalation or promotion. Physics laws and short contact tapes precede football
transfer. Known conservation/accounting failures remain failures.

## Opt-in screen: 2, 8, 16 or 32 snaps

`npm test` is unchanged: no roster multiplication or new game collector.
[`screen:roster`](../scripts/roster-screen.ts) without arguments prints a plan
and **simulates zero snaps**. Use .nvmrc Node 22.23.3 and `npm ci` once.

```sh
npm run screen:roster
# Typical controller candidate: one affected call, 8 snaps.
npm run screen:roster -- --compare data/reviews/current/roster-screen-baseline.json --calls slant_flat
# Pass or run subset: 16. Omit --calls for all 32.
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

To regenerate an incompatible baseline, use the pinned runtime, review why it
changed, then `npm run screen:roster -- --baseline`. Review and commit its result;
preserve historical receipts. The fixture builder performs no simulations and
is a maintainer tool, not a per-edit command.

## Cheap profiles, explicit broad checkpoints

Frozen-body screens bypass a changed generator/selector. Start those changes
with focused schema/selection tests and a small fresh profile audit, not games:

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

Run targeted failing/opposing controls first; chain successful checks with `&&`
before a screen. Full checks occur once before integrating an engine candidate:

```sh
npm run baseline:run -- --candidate -- npx vitest run --project core test/the-affected-mechanism.test.ts
# After the mechanism works, run only the relevant screen subset.
npm run baseline:verify -- --candidate --fail-fast
```

The opt-in `--fail-fast` preserves skipped command evidence and cannot issue a
passing receipt when phases are skipped. Failed typecheck/build avoids paying
for later suites. Existing assertions and default verifier behavior remain.
Fix a failure before retrying. Full games remain a separate checkpoint.
Record runtime by group; test count is not a cost estimate. Compare timings on
the same machine without competing collectors before claiming speed gains.

## Applying the roster recommendations

| Recommendation | Shared support now / next bounded candidate | Gate before broader spend |
| --- | --- | --- |
| Trait/missing-measurement semantics | Audit documents balance/TE/QB-bench concerns; cheap candidate profile mode now works on edited engines. Numerical changes stay separate. | Explain semantics, schema/physical checks and profile/same-latent checks, then relevant small screen. Do not choose means from desired tackle rates. |
| Consistent familiarity/lineup selection | Frozen inputs expose actual listed positions/jobs; fresh profile audit exercises packages/depth. Refactor/assignment changes stay separate. | Eligibility, familiarity, unique players and feasible complete assignments, plus composition. Frozen screen alone bypasses selection. |
| Diverse execution coverage | Four capability-selected fixtures, affected 2/8/16/32-case subsets and reusable baseline implemented. | Candidate mechanism first; opposing control and allowed offensive success retained. |
| League transfer | Broad cost previews, explicit checkpoint reasons and exact cache reuse implemented. | Integrated tested changes or demonstrated game-wide interaction, then independently generated pairs and game seeds with untouched inputs. |

This pass installs shared workflow/evidence tools first. It does not alter live
ratings, familiarity behavior or capacities to fit outcomes. Their bounded
follow-up candidates now have explicit evidence gates and a smaller testing bill.
