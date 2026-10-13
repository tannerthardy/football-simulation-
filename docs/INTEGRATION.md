# Current integration ownership and evidence

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
retained. Engine sources, dependency lock and `config/baseline.json` are identical
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
