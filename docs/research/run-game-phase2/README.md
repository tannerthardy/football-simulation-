# Run-game Phase II: evidence and next work

Read the [executive report](MASTER_REPORT.md), then [next work](NEXT_WORK.md). This publication makes the completed research and concrete agent handoffs available for review. It is documentation only; experimental patches are retained in the evidence archive and are not applied to the engine by this PR.

The research isolates two traction-budget defects, an acquired-protection/runner-transition coupling, center-hand angular geometry, and a separate live-gap information seam. The number of genuinely feasible, useful missed blocks among the original53 jobs remains unidentified. Zero tested conversions passed the complete usefulness standard; this does not establish zero actual opportunities.

## Read in the repository

- [Blocking-success framework](BLOCKING_FRAMEWORK.md), [native observation](NATIVE_FRAMEWORK.md), and [tracking comparability](TRACKING_COMPARABILITY.md).
- [Combination investigation](COMBINATION_INVESTIGATION.md) and [independent opportunity review](INDEPENDENT_OPPORTUNITY_REVIEW.md).
- [Physics report](physics/REPORT.md) and [two-case adversarial review](physics/opportunity-peer-review.md).
- [Runner information investigation](information/RUNNER_INFORMATION_REPORT.md).
- [Implementation briefs](IMPLEMENTATION_ROADMAP.md), [baseline revalidation](BASELINE_REVALIDATION.md), and [reproduction instructions](REPRODUCE.md).

## Download the complete evidence

The [research evidence prerelease](https://github.com/tannerthardy/football-simulation-/releases/tag/research-run-game-phase2-20261026) retains the repository's access restrictions. It is a research artifact, not an engine release. Raw evidence stays outside Git history, consistent with PLAN.

| Asset | Purpose | SHA256 |
|---|---|---|
| `gridiron-run-game-phase2-full.zip` | Full Phase II raw data/scripts/inputs/patches/source, all53 job rows, failed/adverse evidence, native film, and the complete original Phase I ZIP; about650 MiB | `b841f54a1c8c14e3552223a37893a00e10a5a392cb11397ec481215393788947` |
| `gridiron-run-game-phase2-review.zip` | Small reading copy; does not replace the full evidence | `10f946f85fedb1db24afa6fcecd7a6ea12977519ec4acbb8b13f39a0db1e2c10` |

The release also exposes the original Phase I ZIP, job table/CSV, and checksums individually. Download with an authenticated GitHub CLI:

```bash
gh release download research-run-game-phase2-20261026 \
  --repo tannerthardy/football-simulation- \
  --pattern gridiron-run-game-phase2-full.zip \
  --pattern SHA256SUMS \
  --dir out/run-game-phase2-download
cd out/run-game-phase2-download
sha256sum --ignore-missing -c SHA256SUMS
unzip gridiron-run-game-phase2-full.zip
python run-game-phase2/VERIFY_PACKAGE.py
```

The archive contains787 files;786 manifest-listed file hashes and archive CRCs were checked. Its accepted-source snapshot reconstructs ten tested variants with matching source hashes. The original216-file Phase I manifest was independently verified. Files inside this frozen archive are not rewritten to include subsequent publication plans.

Native film is `run-game-phase2/figures/native-film.html` after extraction. It is self-contained and runs without a server. Original constructor artifacts require pinned Node22.23.3; see the detailed reproduction instructions before running scripts that use absolute workspace paths.

## Review and ownership

Historical source: `58e0f5ee13e1c29e9e6ab91cc22cccc576cfe3d7`. Accepted research baseline and publication base: `a5b024b9fbf8c51fc31401eefb79737be586814a`. Revalidate develop before any later implementation; the repository's legacy default branch is not the working baseline.

The next-work documents are proposed handoffs into existing tools, physics, run and shared-information ownership. They do not assign new agents, open competing implementation branches, or authorize a merge. Start with exact causal witnesses and preserve adverse results before broadening the football panel.
