# Passing-game integration handoff

Prepared **October 14, 2026 (America/Phoenix)** for the user's integration agent.
Branch tips and PR states were rechecked for this handoff. This note recommends
an integration scope; it does not merge, promote or designate a new baseline.

**The moving-catch repair is already accepted. PR #29 is supported for isolated
integration review. Coverage and Stick are tested extraction/review candidates
on the older source. Keep the seam/post prototype and QB-pressure policy out
of the immediate batch.** There is no verified combined bundle containing all
of these changes.

## Start from the accepted source

Current accepted `develop`:
`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, runtime SHA-256
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
Use Node **22.23.3**, the accepted **44 flags**, `RUN_CONTACT_COMPONENTS=1`
and its recorded World defaults. Reverify the tip before integration.

Historical `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`, runtime `8433e88d…`,
has **43 flags**. Most passing-game research and the coverage/option receipts
use that source. They are reusable evidence for their pinned scope, not tests
of today's combined candidate. October 11 NFL review is historical too.

## Disposition

| Work | Integration recommendation | Evidence / material limits |
| --- | --- | --- |
| Moving catch-to-pursuit approach | **Already accepted through [PR #12](https://github.com/tannerthardy/football-simulation-/pull/12). Do not apply again.** | Existing moving interception replaces the inappropriate stationary arrival. Catch-only 59 checks/15 frozen complete states; combined verification 1,684 TS/145 Python, typecheck/build. Improved P58 and fresh same-execution first-grip entry/survival. P4 natural tackle→TD, changed interception/return, sideline tradeoff and unchanged P173 remain in the accepted review. |
| Acquired visual position for stalk movement | **Ready for isolated review: [draft PR #29](https://github.com/tannerthardy/football-simulation-/pull/29).** Adjacent run/stalk information fix, not a new pass-rush policy. | Only two production lines in `blocking.ts`; actual controller hidden invariance, visible response, exact fresh request and felt-contact preservation. 29 focused checks/typecheck, accepted 44 flags. Synthetic stale request falls 4.7746→2.5505 yd/s; deceleration is bounded, but static fit ignores known target velocity. No native protection/collection improvement claimed. |
| Coverage without private QB read identity | **Ready for extraction and integration-owner review; current-source checks still required.** Recommend the next passing-game controller candidate. | 64 focused checks/typecheck/build; 64 full diagnostic runs, two fresh rosters. Better spot catch position/contact/tackles; private `sim.qbEyes` identity removed from five zone decisions. Fresh match losses +5.44 YAC and incomplete→19.87-yard completion remain. No unresolved correctness blocker in its tested source. |
| Stick receiver/QB option agreement | **Separate, optional integration-review candidate; do not automatically include in the immediate batch.** Use the Stick-only parent, not the seam descendant. | 54 distinct compatible focused checks/typecheck/build; 33 full diagnostics, eight inputs/four fresh contexts. Shared taught sit/out rule with separate pictures and QB expectation, no private Stick branch at release. Two new TDs are execution-stream effects, not proof of improved decisions; a lost INT involves real competing catches. Native selected option throws agree. Receiver gaze/occlusion and natural disagreement frequency remain limited. |
| Seam/middle-read vertical/post | **Hold as a development prototype.** | An actual anticipated post catch and a carry-cue seam catch work; a discarded observed pole-carry cue was corrected. 36 affected checks/type/build, 26 full diagnostics. Receiver head-turn/acquisition model is incomplete; selected-post transfer to fresh players and call-menu effects remain unverified. Corner conversion is not installed. |
| QB pressure/contact danger and pass-rush timing | **Research/diagnosis only; no runtime policy to integrate.** | Historical clean release median 2.40 s/p90 3.20 s gives no support for globally faster rush. Moving contact-envelope forecast improves offline warning on P46/P150 and preserves the protected P39 control. No production QB pressure/escape change was installed. |

## Exact contributions and evidence

### Already accepted moving catch

PR #12 merged as `a1b16e6`. Its catch helper matches the reviewed contribution;
the source comparison found no helper difference. The minimal extraction is
`catch-approach.ts`, the `playBall` import/return in `defense.ts`, and the
catch-phase contract. The old source branch is
`codex/catch-pursuit-diagnosis` at
`c12c613bbd419b804d56cf2aa9cc68ee44c65bb3`; do not merge its research ancestry.

[Accepted extraction/combined review](https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/docs/reviews/controller-integration.md)
and its linked receipts preserve the adverse P4 draws, P16 contest, ordinary
rear tackles, fresh/sideline controls and P173 escape. The helper does not add
speed, grip strength, a post-catch delay or broaden its gate to P173.

### PR #29 stalk information

Head `b8e4d86866a9880c59e2e3f0809114b7667c058b`; tested source/contracts at
`ce93c3bcca17832b16950988703ca95a8aff6492`, runtime
`1eb3b26a97eacc6896c2ee510ef5afefe9583381307f5d754925cb4a5d1d544d`.
[Review/receipt](https://github.com/tannerthardy/football-simulation-/blob/b8e4d86866a9880c59e2e3f0809114b7667c058b/docs/reviews/stalk-visual-request.md).
The user's PR #18 hold is lifted. PR #24 supplied the small witness/proposal;
its diagnostic branch was not merged. Keep collection, hands and physics fixed.

### Coverage candidate

`codex/coverage-threat-selection` head
`b0b197ff3b68b5bb9e65811728868ff5cf76cf15`; actual-source film/type/build at
`3775fa4e812d65b1b829e8068f94fb0f76652ebd`, runtime
`601749e54c395b6180b182bd49cb137f28f9a1642151fd6b81b51b2d326391b1`.
[Review, inputs and receipts](https://github.com/tannerthardy/football-simulation-/blob/b0b197ff3b68b5bb9e65811728868ff5cf76cf15/docs/reviews/coverage-cue-repair.md).

Extract the coherent tested bundle: ZoneCoverage private-cue removal,
observed spot-lane squeeze, and curl/flat entry guard accepting generic #1 or
#2 selection, plus the information tests and preserved flat-test preconditions.
Cue removal alone was insufficient; its failures and defensive losses remain
in the review. Runtime scope is **only the ZoneCoverage section of
`defense.ts`**. Preserve the already accepted `playBall` moving-catch hook.
The source-only patch checks cleanly against the accepted-source/PR #29
checkout; this mechanical check is not combined runtime validation.

### Stick-only candidate

`codex/option-route-agreement` head
`f77b54010e3a6c233eacba0320e41f81844ca15f`; final football at
`44f4a24eee6e9d5d10dec4982966287c2ebf1205`, runtime
`8a7c5c6a9bb76b3603c3c5e4cacc1750478593091d55af1181bd19f821cc8599`.
[Review, coaching sources and receipts](https://github.com/tannerthardy/football-simulation-/blob/f77b54010e3a6c233eacba0320e41f81844ca15f/docs/reviews/option-route-agreement.md).

Source scope: `option-route.ts`, bounded `receiver.ts` Stick read/settling,
bounded `qb.ts` option memory/prediction/release, plus 19 option contracts.
Its source-only patch also checks cleanly against the accepted/PR #29 checkout.
It still requires current-source integration checks. Removing the old random
Stick conversion draw shifts later global execution: preserve the retained
draw/competing-catch controls, and do not install dummy draws or forced busts
to recover an old ending. This does not clean up Hook, all other route
prediction or every QB information shortcut.

The seam descendant `codex/seam-middle-read` at
`91279f164241c874e7f4ea5fed73b04a26773504`, runtime `d07d9645…`, includes
Stick and new route/call-menu work. Do not merge both parent and descendant
or take that entire branch as a shortcut.
[Seam prototype and limits](https://github.com/tannerthardy/football-simulation-/blob/91279f164241c874e7f4ea5fed73b04a26773504/docs/reviews/seam-middle-read.md).

### Research to retain, not promote

`codex/qb-contact-danger` at
`2f080ec3b072de3b7f6a6c8ef597168571cd1aa8` retains
[pressure research](https://github.com/tannerthardy/football-simulation-/blob/2f080ec3b072de3b7f6a6c8ef597168571cd1aa8/docs/reviews/qb-pressure-research.md)
and pass-rush timing. Its runtime is unchanged historical `8433e88d…`.
Route-combination labs and the coverage/pass-game overview are diagnostics,
not approved additions to the live call menu. Global catcher-identity awareness,
helper coordination, capability corrections and prolonged/ground-hold
experiments remain parked/separate.

## Recommended integration sequence

1. Verify accepted `develop` and preserve its already integrated catch repair.
2. Review/extract PR #29 independently. Then port the complete coverage bundle
   and its contracts, preserving the catch hook. Those are the recommended
   immediate additions; they do not depend on the option/pressure prototypes.
3. Make an explicit separate review decision on Stick-only. Keep seam/post,
   new corner rules, QB pressure policy, physics and roster changes outside
   that decision. Do not merge old diagnostic branch ancestry wholesale.
4. Use affected information/flat/catch contracts and the smallest existing
   ordinary/adverse football controls on each extracted change. Adapt old
   collectors to record the current 44 flags honestly; retain their original
   43-flag receipts as history. Add coverage only for a decision-changing risk.
5. Freeze the exact intended combination. **The designated integration agent
   runs the preserved full suite once on that exact combined source** and
   records commit, source/harness hashes, flags, inputs and failures. Reuse
   compatible receipts; no mandatory roster/game ladder or full suite per edit.

Investigate material adverse endings by separating available information,
decision quality, achieved geometry, execution randomness and numerical error.
A changed tackle/TD/INT is neither automatic failure nor proof of improvement.
Stop dependent integration on a genuine correctness blocker. This handoff
adds no new simulations, tests, merges or source changes.
