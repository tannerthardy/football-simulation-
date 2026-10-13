# Selective testing and roster coverage

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

Escalate when affected scope grows, evidence conflicts, or the cheaper stage
cannot answer the remaining question. An adverse result first gets a targeted
diagnostic, not an automatic larger batch. Better averages do not trigger automatic
escalation or promotion. Physics laws and short contact tapes precede football
transfer. Known conservation/accounting failures remain failures.

## Opt-in screen: 2, 8, 16 or 32 snaps

`npm test` is unchanged: no roster multiplication or new game collector.
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
run. The current #6-only assignment is the Codex integration owner in this chat,
as recorded in [INTEGRATION.md](INTEGRATION.md). Local agents hand off compatible
focused receipts, limitations and candidate commits; they do not repeat the
shared suite. Historical integration-lead rows describe their original stage.

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
