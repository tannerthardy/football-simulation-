# Additional saved-game deep audit

This data-only commit preserves the original eight evidence files and adds six-domain offline analysis, 16 saved-play witness/control films, and three figures. It is a child of the original evidence root; it has no simulator development ancestry. Never merge it into develop or treat its evidence tag as a new engine baseline.

Engine: 70b4db6a3ef53acc1a0e90cd055f1087205daa30. Original root: b9b9c17597970ddc87aa4a4e271fc4cfeef71909. The original evidence branch and four game archives are unchanged. No new engine execution, games or test suite.

Download accepted-games-deep-audit-v1.tar.gz and extract it. Open out/accepted-game-deep-audit-2026-10-16/ceo/witness-film/index.html locally for the 16 standalone clips. Exact reproduction instructions, per-file hashes and all six lanes' scripts/screens/ledgers/traces are included. Reconstruct the omitted split-native directory from the original game archives when rerunning analyses.

The full report, six appendices, issue-register updates and paste-ready owner instructions are in source PR129: https://github.com/tannerthardy/football-simulation-/pull/129 (docs/reviews/accepted-game-deep-audit-2026-10-16/).

Audit coverage: all740 logs /561 observations /559 films /27,784 paired frames screened; fixed48ordinary/12tail detailed review plus mechanism controls. Flags are not defect rates; native catch invalidity remains unresolved despite an analytic operator proof. Capped endings remain unknown.

Verify the additional files with: sha256sum -c AUDIT-SHA256SUMS. SHA256SUMS still verifies the unchanged original evidence. See audit-receipt.json for bundle size/digest and the evidence-only retention tag.
