# Run-game Phase II: evidence and next work

> **Archived 2026-10-26.** Dated research record. The findings are kept and still serve as background reading. The next-work briefs (`NEXT_WORK*.md`, `IMPLEMENTATION_ROADMAP.md`) are superseded: don't act on them directly. The work was re-scoped into the Claude lanes of 2026-10-26 and the road plan to the film review, as follows:
> - Main Engine owns the grip-budget repair: the zero-traction allocator first, then the yaw qualification.
> - Rules + Coaching owns the runner exit and hidden reads.
> - Run Game owns the S7-P070 climber departure.
> - Tools owns the responsibility ledger, built on #300.

Read the [executive report](MASTER_REPORT.md), then [next work](NEXT_WORK.md). This publication makes the completed research and concrete agent handoffs available for review. It is documentation only; experimental patches are retained in the evidence archive and are not applied to the engine by this PR.

The research isolates two traction-budget defects, an acquired-protection/runner-transition coupling, center-hand angular geometry, and a separate live-gap information seam. The number of genuinely feasible, useful missed blocks among the original53 jobs remains unidentified. Zero tested conversions passed the complete usefulness standard; this does not establish zero actual opportunities.

## Read in the repository

- [Blocking-success framework](BLOCKING_FRAMEWORK.md), [native observation](NATIVE_FRAMEWORK.md), and [tracking comparability](TRACKING_COMPARABILITY.md).
- [Combination investigation](COMBINATION_INVESTIGATION.md) and [independent opportunity review](INDEPENDENT_OPPORTUNITY_REVIEW.md).
- [Physics report](physics/REPORT.md) and [two-case adversarial review](physics/opportunity-peer-review.md).
- [Runner information investigation](information/RUNNER_INFORMATION_REPORT.md).
- [Implementation briefs](IMPLEMENTATION_ROADMAP.md), [baseline revalidation](BASELINE_REVALIDATION.md), and [reproduction instructions](REPRODUCE.md).

## Evidence access

**The complete evidence is now available through private Google Drive downloads.** See [download links and reassembly instructions](EVIDENCE_DOWNLOAD.md). Sign in to Tanner Hardy's connected Google account, or use its authenticated Drive tools; the files were not made public.

The original681,429,310-byte archive is split into seven parts to fit transfer limits. It includes all Phase II raw experiments, saved initial states, source/patches, per-job classifications, film, failed/adverse evidence, and the complete original Phase I ZIP. Each uploaded part was fetched back and SHA256-checked; the reassembled downloaded bytes match the original archive hash:

`b841f54a1c8c14e3552223a37893a00e10a5a392cb11397ec481215393788947`

The archive contains787 files, including786 manifest-listed hashes. Its original integrity/source-reconstruction checks remain unchanged. A smaller reading ZIP is linked in the download guide; it does not replace raw evidence. Original constructor artifacts require Node22.23.3.

GitHub's release-upload endpoint still returned HTTP401, so these are Drive links rather than unavailable release URLs. Local originals remain at `/workspace/run-game-phase2/` and `/workspace/gridiron-run-game-phase2-full.zip`. The frozen archive was not rewritten to include publication plans or subsequent reviews.

## Review and ownership

Historical source: `58e0f5ee13e1c29e9e6ab91cc22cccc576cfe3d7`. Accepted research baseline and publication base: `a5b024b9fbf8c51fc31401eefb79737be586814a`. Revalidate develop before any later implementation; the repository's legacy default branch is not the working baseline.

The next-work documents are proposed handoffs into existing tools, physics, run and shared-information ownership. They do not assign new agents, open competing implementation branches, or authorize a merge. Start with exact causal witnesses and preserve adverse results before broadening the football panel.
