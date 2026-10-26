# INFO-1 and week strategy review

Read-only planning review, 2026-10-25. Current accepted source checked against the parent snapshot: `9ace17336ce8593b9d29454bebaa9ebaf11132e0`. Pending #274 inspected at `39fe5d0988966fee2f221100112809d99dc89b02`. I inspected the actual patch and source, current PLAN/GAPS, the new review, and deep-audit A05/A09/A12/A13/A18/A19. I did not rerun simulations or treat author/reviewer test reports as my own execution.

## 1. Most important new fact

[#274](https://github.com/tannerthardy/football-simulation-/pull/274) is the active successor to #260, not another unrelated assignment. Its review is now HOLD for an observed step-up false positive:

https://github.com/tannerthardy/football-simulation-/pull/274#issuecomment-6401811625

The independent review reports 360 matched dropbacks on develop, #260 and #274. Overall means are almost unchanged (6.816 / 6.866 / 6.821 yd/play), yet three named non-scramble Smash plays become substantially more explosive. In Cover3 #5 a QB six yards deep inside the pictured tackles moves toward the line at about 2.5 yd/s. Underneath defenders convert before he throws; YAC changes 1.2 to15.9. That is the useful defect, not the aggregate mean.

This is directly consistent with the code: [possession-read.ts at the inspected head](https://github.com/tannerthardy/football-simulation-/blob/39fe5d0988966fee2f221100112809d99dc89b02/src/sim/possession-read.ts#L100), line112, starts the latch with `up > 2.5` without any pocket-depth condition. The existing step-up unit negative only reaches2.4, so it does not exercise the actual failure. The outside-pictured-tackles branch is a separate condition and was accepted by the reviewer.

Do not copy a reviewer alternative without resolving its semantics. The review suggests front-of-pocket evidence OR .2–.3s of sustained speed, but also asks for a negative step-up lasting .3s. A persistence-only rule could still activate on that negative. The implementer should define credible observed running commitment relative to pocket geometry and own role, then test the named case plus a real retained-pass threat. Raising the speed threshold until four named plays disappear is not an acceptable mechanism.

## 2. What #274 actually adds and what remains

Actual implementation:
- Actor-local acquired-holder selection replaces authoritative carrier selection at migrated consumers.
- Recognized flight is copied into actor memory; possible catcher and unresolved landing-area responsibility are not a confirmed holder.
- It removes the global catch-induced defender replacement.
- Visible QB-running cue with a retained latch and observed reset/empty cues replaces several private `scrambled` paths.
- Rushers/underneath roles may respond while man/deep defenders retain plaster responsibilities before the QB crosses the line.
- `openToBall` uses observedHolder/qbRunning; `runFit` supplies explicit acquired/expected/unresolved inputs.
- Explicit `null` in executeRunFit means unresolved and avoids authoritative fallback. Undefined remains the legacy direct-caller path.
- A lexical guard prevents new listed true-state reads and caps known debt.

Still expressly open:
- recognition.ts uses private throw/handoff times and true holder selection.
- coverage/judgment.ts exits deep help on catchAt.
- engagement.ts retains true-state decisions, including pass-to-run mode changes that affect the shared rep.
- #256's acquired-target-or-true-carrier fallback remains a separate pending composition task.
- Existing throw recognition and live ball-phase gating remain approximations. This is not complete gaze/occlusion or whole-decision invariance.

The guard is useful lint, not a proof of information purity. It matches particular `sim.*` names, permits entire files for offense/physics, and does not cover aliases, ball.kind, windupAt, or all other event channels. Its test enforces “at or below” counts, not an exact semantic census. Preserve it and shrink actual debt when migrated; do not sell passing counts as complete knowledge isolation.

## 3. Recommended first work package: finish the acquired QB-running contract (S–M)

Owner: the existing Main Engine/INFO-1 implementer of #274, with Coverage/Defense verifying their response contracts. Do not give a second chat overlapping possession-read.ts ownership.

Sequence:
1. Restate the meaning of “QB observed committing to run.” Separate stepping up, mobile passing outside the pocket, a true escape running threat, designed QB runs and positive acquired possession.
2. Correct the inside-pocket activation using observable geometry/motion. If temporal support is used, identify evidence/sample times, not repeated wall-clock queries of the same stale picture as independent confirmation.
3. Keep role differences explicit. Man/deep roles retain a live receiver threat; underneath roles do not discard their zone merely because the QB adjusts in the pocket; edge/force/cutback jobs retain their supported boundaries.
4. Preserve reset, stutter, unknown-carrying, observed-empty and throw/flight transitions. Unknown must not fabricate certainty. A plausible fake may fool the read.
5. Reproduce the named positive and false-positive native windows with exact constructors. Find the first changed consumed cue/read/request and physically achieved consequence before interpreting completion/YAC.
6. Independently verify the original two-bypass possession boundary on a source-compatible exact capture: removing only catch replacement or only legacy transition must not be mislabelled as enforcing the boundary everywhere. Preserve flight anticipation and the legitimate hidden-state invariance controls.
7. Run affected source/test contracts under Node22.23.3, typecheck/build and applicable PLAN tiers. The author's “3334 pass, three baseline-runner failures on Node22.22” is qualified evidence, not a green approved-runtime suite. Verify those failures on the correct runtime; do not waive or quarantine them from prose alone.

Minimum opposing cases:
- deep inside-pocket step-up followed by a throw, including the named speed range;
- actual in-pocket escape toward the front;
- outside-box rollout that remains a live passer;
- outside-box turn upfield;
- designed QB run while roles retain fit;
- original man/deep receiver remains a live threat;
- stutter/reset/reacquisition, unknown/empty carrying;
- ordinary handoff and retained acquired flight/catch controls.

Completion is a credible cue plus correct role response with false positives visible, not zero mistakes or exact develop yardage. Preserve the existing author/reviewer matched datasets; avoid rerunning thousands of plays after every small local edit.

## 4. Second package: recognition and deep-help event admission (M, staged)

Start after the first contract is stable enough to consume. Research and fixture preparation can begin immediately; do not make all contact correctness a prerequisite.

The goal is not “remove every true-state reference.” Rules/physics need authoritative state. Migrate the named defensive decision consumers with an acquired replacement in the same change.

Proposed small interface:
- recognition consumes already acquired body/mesh/throw evidence and retains belief hysteresis;
- a remembered recognized-flight/possession interpretation is distinct from the actual air/held phase;
- deep help retires/continues responsibility from that interpretation rather than catchAt.

Do not simply have recognition ask hasObservedFlight if flight acquisition itself only runs after downstream throw recognition. Verify tick order and eliminate any circular “recognize → acquire → recognize” dependency. A recognition-facing admitted-event observation can be produced at the existing sensing/recognition boundary and then reused by consumers. That is an earned small interface, not a universal decision scheduler.

Verify fixed supplied evidence with different hidden handoff/catch outcomes, an observed real handoff, fake mesh, throw/throw fake where supported, caught/dropped/tipped ball, and retained coverage while no new cue is available. Measure cue timestamp → belief → action → useful body response. Do not stack another global latency on top of existing observation/recognition/cache/motor delays.

Then recompose #256's specific fallback onto the accepted interpretation, keeping sealed/native and pass controls. Either staging order may be used for prep; actual production composition must identify exact pins and interactions with Run's preparation.

## 5. Important current TKL-2 source correction

Current common.ts is source-qualified here:
https://github.com/tannerthardy/football-simulation-/blob/9ace17336ce8593b9d29454bebaa9ebaf11132e0/src/sim/behaviors/common.ts#L228

chase computes current acquired distance, work-rate effort and request each time it executes, then calls pursuitPoint. pursuitPoint recomputes interceptPoint on each call and only caches angleBias. The current Pursuit.update calls chase directly. I did not find a cached point/request episode in those functions.

Therefore PLAN/KNOWN_PROBLEMS wording about “held reduced budget until the next replan” must be verified rather than translated automatically into a cache-invalidation task. It may describe the forecast assuming today's reduced effort for its entire horizon while tomorrow's chase will switch to full effort inside12yd. Those are different defects.

Queue two distinct small questions after the current defense/contact priority:
A. Does the future forecast model the request policy that the controller will actually execute as separation/urgency changes?
B. Does distance-only pacing wrongly suppress effort in a genuine emergency?

For A, record requested budget, forecast assumptions, sampled point/deadline, each later actual budget transition and first physical response. Preserve explicit sampled-versus-biased/shaded qualification. If a future multi-phase effort model is introduced, its phases must be the controller's own published policy using forecast evidence; no future runner oracle and no return to assuming full effort while emitting reduced effort.

For B, use acquired runner direction/open field, goal-line threat and observed absence/presence of useful help to represent urgency. Do not query teammates' private assignments or use exact hidden “last defender” identities. Keep force/cutback responsibilities and low-information uncertainty. Need an active last-line opportunity plus a non-emergency long-distance/short-gain control and a fast-crossing case where premature gathering loses.

P002 is development evidence, not a target. Earlier root work showed its first-whiff difference used different consumed draws (.3366 vs .0374); both probabilities put either draw on the same side of the threshold. The whole TD cannot be assigned to distance pacing from the ending. Preserve the random-execution attribution. No full-speed-everywhere treatment, P002 tuning or fresh forecast platform.

## 6. Seven-day sequencing and ownership implications

A feasible week has three football implementation lanes plus supporting tools:
- Engine: #274 correction first; recognition/deep-help next only after that boundary is stable.
- Run: execute the already progressing preparation/access capability with the actual local candidate and review boundary; do not restart closed timing/helper hypotheses.
- Coverage: active COV-7 benefit/cost pilot using merged #271, with exact possession host pinned; COV-6 source/fixture work can proceed but avoid overlapping defense.ts semantic edits.
- Defense/contact remains the existing explicitly owned seam work (#273); if this is a separate active slot, use Tanner's existing G5/shared exception rather than pretending five overlapping football lanes are free.
- Tools/Measurin: independent replay of selected decisive controls and trait truthfulness; Integration: reusable ordinary-film diagnosis and bounded composition. Supporting chats do not each need their own new football policy.

Suggested milestones, not calendar promises:
- Day1: head/owner refresh, correct #274 false-positive cue, restage exact local controls; contact and run/coverage progress in their own files.
- Days2–3: independent verification and one active opposing transfer per changed mechanism; COV-7 prototype against real #271 cost, run preparation/continuity on coupled native world.
- Days3–5: migrate the next actual information consumer or recompose #256, one bounded unit at a time; run role/cost controls after each new host.
- Days5–7: one source-qualified composition checkpoint with shared exact captures; run the applicable shared scorecard once per stable candidate, inspect adverse individual mechanisms and give Tanner a small usable clip set.
- End checkpoint: accept demonstrated scope; preserve unmet questions and choose the next real bottleneck. Do not spend the final days generating a giant ledger to claim progress.

The same actor can have correct installation but wrong executable access, or correct acquired evidence but a bad cue interpretation. A small provenance/role/action contract can unify those boundaries; it does not yet earn a common utility brain.

## 7. Stretch work and what to park

Cheap/parallel:
- Confirm trait execution versus selection-only meanings using existing fixed-lineup inputs, without inventing leadBlock bonuses.
- Make one supported concept-family installer contract explicit: actual roles, eligible personnel, mirror/hash semantics and an intentionally bad call that fails for football reasons.
- Existing capture/trace portability and Node/runtime verification where they actually unblock a consumer.

Conditional stretch:
- A13 protection ownership preparation (one family with Mike/back scan/exchange convention), no full new contact adoption until G5 allows it.
- Same-workload profiling or copy/allocation correction if measured runtime reveals a new hot path, especially repeated acquired-flight copies. Preserve exact execution and keep it subordinate to football deliveries.

Park for this week:
- full shared chooser/attention scheduler, generic hidden-information rewrite, broad RNG migration;
- full gaze/occlusion or detailed feet/anatomy;
- full protection-family implementation, wider play library/league/coaching systems;
- more forecast candidates without measured transfer;
- an NFL-average tuning campaign or universal “everybody sprints” remedy;
- another broad audit or replacement validation framework.

## 8. Verification report required from each implementer

Ask each owner to return:
1. actual source/dependency pins and confirmed/corrected plan details;
2. the first consumed causal difference, not just retained state or an ending;
3. active benefit, active cost, and independently selected transfer with actual actor identity;
4. strongest adverse result and what remains unresolved;
5. observer neutrality/restoration qualification where diagnostics are used;
6. focused/applicable checks with runtime and reported-versus-independently-reproduced distinction;
7. exact next decision and stop condition.

An independent reviewer should reproduce one decisive positive and one strongest opposing case from fetchable bytes/code. Reject vacuous inactive controls as a policy-safety certificate, not legitimate unchanged controls themselves. No extra all-project approval ceremony is required for routine details.

## References inspected

- Current instructions/PLAN/GAPS at9ace1733:
  https://github.com/tannerthardy/football-simulation-/blob/9ace17336ce8593b9d29454bebaa9ebaf11132e0/docs/PLAN.md
  https://github.com/tannerthardy/football-simulation-/blob/9ace17336ce8593b9d29454bebaa9ebaf11132e0/docs/GAPS.md
- Pending #274, head39fe5d09:
  https://github.com/tannerthardy/football-simulation-/pull/274
- New review/step-up witness:
  https://github.com/tannerthardy/football-simulation-/pull/274#issuecomment-6401811625
- Actual guard:
  https://github.com/tannerthardy/football-simulation-/blob/39fe5d0988966fee2f221100112809d99dc89b02/test/decision-information-guard.test.ts
- Actual cue tests:
  https://github.com/tannerthardy/football-simulation-/blob/39fe5d0988966fee2f221100112809d99dc89b02/test/qb-running-cue.test.ts
- Known remaining recognition/deep-help consumers:
  https://github.com/tannerthardy/football-simulation-/blob/39fe5d0988966fee2f221100112809d99dc89b02/src/sim/recognition.ts#L205
  https://github.com/tannerthardy/football-simulation-/blob/39fe5d0988966fee2f221100112809d99dc89b02/src/sim/coverage/judgment.ts#L20
- Run preparation boundary and coordinator response:
  https://github.com/tannerthardy/football-simulation-/pull/256#issuecomment-6390441641
  https://github.com/tannerthardy/football-simulation-/pull/256#issuecomment-6390452732
- Deep audit: original-audit/ROADMAP.md, original-audit/REVIEW.md.

No production source was edited; no GitHub comments/messages/PRs were posted by this review. Refresh #274 status/head before final publication because its correction is actively in flight.
