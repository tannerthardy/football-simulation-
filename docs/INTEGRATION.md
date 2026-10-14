# Integration ledger

Updated **2026-10-14 (America/Phoenix)**. [Priorities](STATUS.md),
[issue/blocker details](ISSUES.md), [file ownership](WORKBOARD.md).

## Accepted reference and verification ownership

`develop` at **a1b16e666a9ee7d1bc1d2aecba141fc535863b24** contains merged
[#12](https://github.com/tannerthardy/football-simulation-/pull/12).
Historical `4ded6b6` remains a comparison, not the development starting point.
The designated **Integration owner** freezes candidates and owns one combined
verification. Contributors supply compatible focused receipts.

The accepted #12 code was tested at `46a833dd006850a2c83a937bd3444181d8b10588`:
**1,684 TypeScript / 145 Python checks, typecheck/build pass**, 180.530 s,
44 flags/components=1. [Exact receipt](../data/reviews/current/controller-combined-verification.json),
[scope and adverse evidence](reviews/controller-integration.md).
Publication/merge commits are distinct from the tested commit; reuse depends on
source/test/input/settings/measurement compatibility, not PR state alone.

## Candidate dispositions

| Work / exact publication snapshot | Disposition | Remaining decision |
| --- | --- | --- |
| #12 accepted run/catch + shared policy/tooling; develop `a1b16e6` | Integrated | Maintain known limitations; no new baseline designation in this documentation pass |
| [#29](https://github.com/tannerthardy/football-simulation-/pull/29) `b8e4d86`; tested `ce93c3b` | Ready for isolated integration review; **not yet fully verified/merged** | [STALK-001](ISSUES.md#STALK-001): preserve two-line scope and complete required verification, independently if coverage stays parked |
| [#34](https://github.com/tannerthardy/football-simulation-/pull/34) `306579f`; tested `cb240d2` | **Blocked; follow-up parked while Pass Game helps awareness** | [COV-001/002](ISSUES.md#COV-001): supported controller/test-contract adjudication, then one revised combined pass including Python |
| Awareness implementation | Active user-assigned work; no published implementation snapshot verified here | Exact candidate, settings and observer-state contract; [INFO-001/002](ISSUES.md#INFO-001) |
| [#35](https://github.com/tannerthardy/football-simulation-/pull/35) `fed330a` | Diagnostic preparation, not a runtime feature | D01/Y comparison after awareness candidate; preserve incomplete-memory disclosure |
| [#17/#18](https://github.com/tannerthardy/football-simulation-/pull/17) `92743c0` / `b30284c` | Experimental contact correction/evidence; unpromoted | [PHY-001](ISSUES.md#PHY-001); retention review permits bounded controller work, not package adoption |
| Physics #3/#7/#15–#21/#25/#31/#33; latest #33 `abf0e1c` | Research, not a combined production candidate | Local correctness/composition, cost, and named transfer; [PHY-002](ISSUES.md#PHY-002) |
| #23/#27/#28 TE studies/intervention | Diagnostics and parked intervention; do not merge ancestry | [RUN-003](ISSUES.md#RUN-003): adverse transfer retained |
| #22/#26/#30/#32 run audits/reference/rejected alternatives | Evidence, not production changes | Reuse exact references; no automatic campaign or runtime merge |
| #13 RB assessment; #4/#5 hands/handover/helper experiments; Stick/seam/post/QB-pressure prototypes | Separate review/research; excluded from #34 | A named independent question before extraction; no broader candidate by collection |

Relevant #6/#8/#9/#10 code/evidence is incorporated through accepted #12 even
when the older draft PR remains open. Do not confuse code inclusion with PR
closure, or close/delete historical refs from this ledger alone.

## Parked coverage receipt — not a passing verification

[#34 exact receipt](https://github.com/tannerthardy/football-simulation-/blob/306579fda9d496d45606445fd542239cf2f5acf4/data/reviews/current/pass-controller-combined-verification.json):
**1,698 passed / two failed; Python skipped**. Typecheck/build and 94 affected
checks pass. Combined runtime 205.662 s; candidate `cb240d2`, publication `306579f`.
The [register](ISSUES.md#COV-001) preserves numeric failures, intended contracts,
next actions and owner return condition. Existing diagnostics do not clear them.
Do not rerun the same failed source or treat that receipt as covering #29 alone.

## Promotion path

1. Identify the smallest independently useful correction and opposing contract.
2. Resolve named blockers with saved/focused evidence. A changed ending is not
   automatically a defect; an assertion change needs a supported contract.
3. Integration freezes exact source, tests, inputs, flags/model choices and dependencies.
4. One owner performs the required combined verification; every phase must pass.
   Fail-fast skips remain skips, not inherited passes.
5. Publish exact receipt, remaining risks and final decision. Merge/reference
   changes remain separately reviewed; a draft or focused pass is not approval.

Use [TESTING_COSTS](TESTING_COSTS.md). No automatic mode/roster matrices or games.
For current development, use the historical launcher in candidate mode; it still
guards the original historical source hash:

```sh
npm run baseline:info -- --candidate
# Integration owner only, for a reviewed exact combined candidate:
npm run baseline:verify -- --candidate --fail-fast
```

Use Node22.23.3 and preserve accepted resolved settings. Do not edit the historical
profile/source pin simply to make the launcher label current development a baseline.

<details>
<summary>Historical #6 / #12 preparation and original receipts</summary>

The following original records describe their own stage. Then-current ownership,
43-flag and adoption-pending statements are historical, superseded above.

# Current integration ownership and evidence

Current task: [reviewed run/catch controller integration](reviews/controller-integration.md),
owned by the same Codex integration session. It starts from approved `c98c2fa`,
reuses #10's compatible independent verification, and verifies a minimal
catch-only extraction before one frozen combined run. The candidate changes
production requests and registers 44 flags/components=1. It is not merged or
designated a baseline. The #6-only pass and 43-flag receipt below are historical
evidence for their exact pins; their unchanged-production statement is not a
description of this new candidate.

This pass incorporates **PR #6 only** into the previously combined runtime.
The historical comparison stays
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` on
`codex/run-game-integration`, profile `run-game-2026-10-13`.
The candidate is on `codex/shared-candidate-verification`; its shared verification
receipt records the exact tested commit. This does not designate a new runtime
baseline or promote a feature.

## Owner and scope

**The Codex integration owner in this chat owns the exact combined verification.**
Contributors supply compatible focused receipts, not another shared-suite run.
This current assignment supersedes the generic integration-lead role in older
guidance; historical workboard rows continue to describe their original stages.
Controller and physics ownership/promotion boundaries remain with their owners.

| Contribution | Treatment in this pass |
| --- | --- |
| #6, `f9617dde9456c0ead2d66b46d4b42608adcd3585` | Incorporated: tiny testing loop, interpretation guide, opt-in roster tools, cache/budget guards and their tests. |
| #3, #4, #5 | Leave on existing branches; preserve their focused receipts and adverse evidence. Disabled experiments are not a reason to import runtime changes. |
| #7 | Excluded while marked not ready. |

#6 needs no runtime change from those contributions. The only merge conflict
was adjacent workboard ownership rows; both the current claim and #6's rows are
retained. **Production simulation code is unchanged.** Engine sources,
dependency lock and `config/baseline.json` are identical
to `4ded6b6`. New policy/tool assertions require one current combined suite;
the historical suite receipt does not cover those additions.

Any independently ready runtime correction gets a separate bounded assessment:
identify its commit, smallest dependencies, intended enabled/disabled state,
target question and focused opposing evidence before changing this candidate.
Do not broaden the merge just to collect disabled work. If #6 is later found to
need a dependency, identify the smallest required change before importing it.

## Flag reconciliation

Keep the existing **43 runtime flags** and their values in
[`config/baseline.json`](../config/baseline.json). The launcher checks the engine's
actual inventory, resets inherited values and records the resolved settings.
This pass supplies no overrides. All preserved experiments stay off, `CF_FLOW`
stays unset, and the default-on controllers retain their existing settings.

| Setting | Candidate / receipt treatment |
| --- | --- |
| Existing 43 environment flags | Exactly the historical profile; no additions or promotions. |
| `PULL_HANDOVER`, `RUN_CONTACT_COMPONENTS` from #4/#5 | Not present in this engine/profile; their branch receipts are not candidate receipts. Do not copy their 45-flag configuration into the historical profile. |
| `gripTiming: 'resolved'` from #3 or `'fast'` from #7 | Excluded API choices. Do not document them as available candidate settings. |
| Existing World/API choices | Historical defaults: center hands, legacy support, centered integration, per-solve work, speculative impacts, mean support, bounded attachments and adaptive contact steps. Explicit experimental choices still need input/setting pins in focused receipts. |

## Contributor handoff

Use the five-field report in [testing costs](TESTING_COSTS.md): what changed,
evidence for/against, unresolved risk, runtime and next decision. Link the saved
receipt and witness instead of rerunning a batch or repeating the shared suite.
Existing receipt metadata should identify:

- Tested commit and runtime/test/collector fingerprints, including relevant
  uncommitted changes; a branch label alone is insufficient.
- Exact inputs/fixture, actors/roles, initial state, call/seed and measurement.
- Resolved flags and API choices, Node/environment and relevant dependencies.
- Completed/failed/skipped coverage, opposing control and limitations.

These are compatibility checks on evidence, not new mandatory test groups.
Reuse an existing receipt when its tested code, inputs, settings and measurement
remain compatible. Different global source fingerprints cannot establish exact
candidate verification; any narrower reuse must explain which measured mechanism
and code dependencies remain unchanged. Mark other evidence historical or
branch-specific. #3/#4/#5 receipts remain useful on their own pins and do not
establish an integrated runtime correction here.

## One frozen verification

The owner commits all candidate code, tests, inputs and settings before running
the existing launcher once:

```sh
node scripts/baseline.mjs --verify --candidate --fail-fast --receipt out/shared-integration/verification.json
```

Use `.nvmrc` Node 22.23.3 and the existing lockfile dependencies. Verification
runs typecheck, build, all preserved TypeScript projects and Python checks.
The aggregate fails for a failed/skipped phase or changed inputs/commit.
Existing game assertions inside that suite remain; no additional roster screen,
audit or game campaign is needed to answer this policy-integration question.

Publish the tested commit and exact receipt with phase runtimes, resolved flags,
source/validation fingerprints and known limitations. A later publication commit
may add documentation/receipts only; explicitly distinguish it from the tested
commit and confirm unchanged runtime/validation fingerprints instead of repeating
the suite. Functional success does not erase the known center-hand conservation,
patch promotion, recovery-convergence or football failures in
[the historical baseline](BASELINE.md#known-failures-and-validation).


## Published verification evidence

- **What changed:** #6 at `f9617dde9456c0ead2d66b46d4b42608adcd3585`, plus ownership/flag documentation, incorporated into the existing combined baseline. Production simulation code is unchanged. Exact tested candidate: [`c3080e89c089ffe686596e2b7953062fcff5ac46`](https://github.com/tannerthardy/football-simulation-/commit/c3080e89c089ffe686596e2b7953062fcff5ac46).
- **Evidence for/against:** 1,669 TypeScript tests in 139 files, 145 Python checks, typecheck and build passed. Four phases completed with no skips or worker errors; inputs/commit unchanged. The [exact launcher receipt](../data/reviews/current/shared-integration-verification.json) is copied byte-for-byte, SHA256 `49e672b08efd10c993fa56200fd15ec36e21f2e9f5d3b92d0d5677389fdda0ce`. #6's focused evidence remains on its original pins; no contributor repeated the shared suite for this pass.
- **Unresolved risk:** Functional success does not resolve the historical conservation, contact-promotion, convergence or football defects. #3/#4/#5 remain separate; #7 remains excluded. No runtime correction or new baseline was assessed or promoted.
- **Runtime:** One combined verification, 186.804 s wall. Typecheck 10.821 s; build 12.419 s; all TypeScript projects 162.617 s; Python 0.945 s. No additional roster screen, audit or game campaign. Raw log stays in `out/shared-integration/verification.log`, SHA256 `35c1d6fbb94ebd1bba157963751ba43c7f77e2b664e45cb6d4bdd3cf579f52c4`.
- **Next decision:** Should #8 become the current shared development reference, with `4ded6b6` retained for historical comparisons? The existing receipt supports this decision; another audit or simulation campaign needs a specific unanswered question. Assess any independently ready runtime correction separately with dependencies, settings and focused evidence explicit. Contributors link compatible focused receipts; the integration owner owns the next combined verification only if its material inputs change.

The receipt's UTC interval is `2026-10-13T23:58:40.799Z` to `2026-10-14T00:01:47.603Z`.
It records Node `v22.23.3`, runtime `8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c` and validation
fingerprint `2636006bf58c4d30db9ff67049b18d4d33059ff7f0bf49c51e3e50617a0c9597`, with all 43 historical flag values.
The publication follow-up adds only docs/evidence; it is not represented as
another tested commit. Runtime and validation fingerprints must match this
receipt at publication. `4ded6b6` remains the historical comparison pin.

</details>
