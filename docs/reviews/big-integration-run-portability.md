# Run slices for the integrated checkpoint

Prepared from accepted develop `2c98bed94adad8087c65f381d4090444ad283985`.
This extraction preserves the reviewed implementations and tests. It imports no
experimental parent, flag change, physics law, capability, release policy, mesh
scheduling or data-only evidence history. Integration owns the final combined
source and its required verification.

## Exact included source boundaries

- **#174 including #172 once:** latest publication
  [`e0c46a0cf60c9bfc4256d000d17798fdad3af97c`](https://github.com/tannerthardy/football-simulation-/commit/e0c46a0cf60c9bfc4256d000d17798fdad3af97c),
  unchanged reviewed runtime `5e55a1cc6bd90e21fbcb5c7d1a2e0843f53f55cd`,
  source SHA256 `f8f2f9bc44e2cc3fdeee3581627c9fb781a15e84ddf3404c1ec41710dc192fed`.
  Local portable commit `35add2d92af19906d7e520f78ef5b8e49df690cb` carries
  only `agent.ts`, `blocking.ts`, `engagement.ts` and the two reviewed tests.
  [Independent combined acceptance](https://github.com/tannerthardy/football-simulation-/blob/e0c46a0cf60c9bfc4256d000d17798fdad3af97c/docs/reviews/run-contact-combined-independent-review.md).
- **#185:** publication
  [`d0f767666208f6f22081e8f81ad10c7f7461b288`](https://github.com/tannerthardy/football-simulation-/commit/d0f767666208f6f22081e8f81ad10c7f7461b288),
  reviewed runtime `459f7506f8219df404cc9df59aa03aadf3ffb673`, validation
  `1fd8d1df5a04f633161fb252171977e969aa052a`, source SHA256
  `d7c8873f1b3f2740e2cba5ef3b1c3577c1cd04dc95c37b9588b22c7d43704d5e`.
  Local portable commit `ac5c1b14adbf562eb168d4306d2af6cca52c49a7` carries
  only the blocking increment and four reviewed test files.
  [Independent acceptance and adverse evidence](https://github.com/tannerthardy/football-simulation-/blob/d0f767666208f6f22081e8f81ad10c7f7461b288/data/reviews/current/puller-technique/independent-review.md).

The five #174 file contents equal its current publication exactly. #185's
blocking increment applies without textual conflict; its four test contents
also equal the publication. Existing accepted `run-contact-technique.ts` and
`puller-access-inputs.json.gz` satisfy all test fixture imports. Neither patch
changes settings or dependency files.

## Shared contact composition

The owners have already reconciled #169/#171/#177 with #174. Use
[`68e724179ce7d86308ee5d9f04328004ee73ece0`](https://github.com/tannerthardy/football-simulation-/commit/68e724179ce7d86308ee5d9f04328004ee73ece0)
as the reference; it contains no #185 increment. Its `engagement.ts` SHA256 is
`3f41b3373e7946f99bfcd437c3ec01f24da0be5676bb3e973dd6336ec4091c58`.
The exact reviewed four-action interaction test is included separately in this
packaging commit. It requires the defensive scopes and must be adopted only
with that composition, not claimed as a standalone #174 pass.

[Run's source/ordering acceptance and receipts](https://github.com/tannerthardy/football-simulation-/blob/e0c46a0cf60c9bfc4256d000d17798fdad3af97c/docs/reviews/run-contact-workoff-reconciliation.md)
preserve the first-attempt support bypass, current acquired support objective,
physical hand/load gates and shared request ordering. #174 writes blocker
intent, then the defensive continuation writes defender intent. Neither awards
release or overrides the opposing request. Existing component/native receipts
retain their original producers; they are not results for this larger build.

#185 changes the unengaged pull clearance/read path. On contact, the existing
`RunBlocker.update` engagement branch returns to the engagement controller;
#174's non-stretch connection command then follows the man at the unchanged
physical limits. The runoff hook is restricted to solo reach work and cannot
turn a kick/trap/lead pull into runoff. Shared `blocking.ts` hunks are disjoint.
No new semantic ambiguity was found by this bounded static portability review.

## Evidence preserved and reused

- #174: 39 focused checks/typecheck; the separate four-way reconciliation has
  56 affected checks/typecheck and final four mirrored action checks. No checks
  or native runs were repeated for this packaging.
- #185: 53 focused checks/typecheck. Both adjudicated assertions are preserved:
  explicit square initial clearance and the stronger mirrored held-motion GH
  contract. The original GH native-prefix failure remains at its immutable
  published evidence path, not erased or described as passing.
- Strong OZ retains DT contact at2.50s and the8s live censor; weak WZ's1.60yd
  finish and Power4.15→0.77 defensive counter remain costs of #174's source.
- #185 retains K01 gain6.33→5.86, unfinished RT/Sam collection, and K04's late
  RB/X impacts273.47 and34.52 kg·yd/s. These are exposed downstream traffic
  risks, not evidence that the puller had to manufacture Sam contact.
- No claim of general protection, optimal pulls, fixed explosive tails or NFL
  calibration follows. Existing acquired/private retarget debt remains separate.

Static extraction checks: `git diff --check`, file/blob equality, dependency
presence and unchanged settings. No source, test contract or setting was
invented to make integration easier. Required exact combined verification and
budgeted games belong to Integration, after the final all-owner freeze.
