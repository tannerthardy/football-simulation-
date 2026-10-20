# Exact Run / Catching reconciliation

Run accepts the shared source/command contract; Integration owns final combined
verification. #174 includes #172 once. #185 remains absent and unchanged.

- [Disposition and source-order review](../../../../docs/reviews/run-contact-workoff-reconciliation.md)
- [Pins, flags, costs and evidence qualifications](manifest.json)
- [Seven runtime file hashes](source-files.json)
- [56 focused checks](focused.json) · [typecheck](typecheck.json)
- [Final four mirrored shared-action checks](final-interaction.json)
- [Unmodified reused Catching65 receipt](reused-catching-focused.json)

Fetchable reference `codex/run-contact-workoff-reference`:
runtime57c39fb40aca15d1c08a3d14ded48f1a2d942b3b / final test-only
68e724179ce7d86308ee5d9f04328004ee73ece0 / full source
c838e75cff97238824e69909dcad658d707bff6fc62ed5f2538eb680211bde8f.
This is a minimal reviewed-source interaction reference, not a new production
baseline or a replacement for any owner's source PR.

The following are ordinary unified Git patches compressed individually to
preserve exact context whitespace. None includes research, #185 or settings:

| Patch | Apply to | Scope |
| --- | --- | --- |
| [run-on-catching.patch.gz](run-on-catching.patch.gz) | Exact Catching2302b48 | #174's3 runtime files + its2 tests + new4-check shared-action test |
| [engagement.patch.gz](engagement.patch.gz) | Accepted2c98bed | Exact reconciled `engagement.ts` only; use other reviewed source files separately |
| [combined.patch.gz](combined.patch.gz) | Accepted2c98bed | All7 reviewed runtime files +6 affected test files; excludes workboard/docs and unrelated ancestry |

Apply **one appropriate patch path**, never all three. Do not additionally
apply #172: its typed hook/runoff realization is already in #174. Keep #185 as
its own independent candidate. These patches do not authorize a merge or a new
baseline. Integration can inspect the immutable reference instead of applying
an artifact.

The read-only proof below checks exact owner-file identity, clean three-way
`engagement.ts` composition, single runoff/drive inclusion, unchanged settings
and absence of #185. It executes no engine ticks or network operation:

```sh
python3 data/reviews/current/run-contact-workoff-reconciliation/verify-source.py
```

Required commits must already be fetched (accepted2c98bed, Run1e2415a,
Catching2302b48, reference68e7241). Missing Git objects are an access prerequisite,
not permission to substitute an arbitrary current head.

Existing #174 native outcomes and Catching's WZ7/OZ4/WZORD results retain their
original producing sources. This pass adds zero native plays, games, NFL queries
or full-suite repetitions. It establishes command coexistence and source
reconciliation; it does not invent combined football endings.
