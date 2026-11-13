# Validation, measurement and workflow reconciliation for the next-week plan

Read-only review completed against develop `9ace17336ce8593b9d29454bebaa9ebaf11132e0`. No simulation, production edit, review approval, merge or outbound project comment was performed by this reviewer. Statements about previously run checks are the producing agents' reported results; source/patch inspection is identified separately.

## 1. What is complete, and what must not be reassigned

| Area | Current evidence | Planning consequence |
|---|---|---|
| A01/A02 validity and wording | #249 empty guard, #253 offline CI, #257 uncertainty wording, #272 planning refresh are merged. Current PLAN explicitly calls phase 1 complete. | Preserve contracts; no new guard, scorecard, workboard or mandatory receipt platform. The remaining metrics.py 0.1-yd comment is a cheap opportunistic wording edit, not a weekly program. |
| A04/A10/A17 trace, reconstruction, identity | #250/#252/#254 merged. #262/#265/#270 now deliver queue + paired captures + consumer. | Use existing constructor/command pipeline. Exact replay of a constructor is not arbitrary mid-play serialization, and source-qualified historical replay must remain historical. |
| A15 common turning arithmetic | #255 remains OPEN at `035214e0942238bb9fdd10241b42bd5a923b2ca7`; current PLAN says held. Patch actually changes one Python operator, both NFL adapters, sim adapter and tests; no sim physics. | It may be used as an explicitly pinned research dependency; do not imply merged or wait to inspect native cue/request transitions merely because an NFL comparison is unavailable. |
| Reserved pursuit transfer T4 | Completed in #255 comment6389270790. Both original P038/P117 cases active. P038 5.76→5.93 yd; P117 6.77→6.77. | Do not ask Measurin to finish missing reserved cases or replace nominations. The previous assignment is complete. |
| Ordinary-film follow-up | Completed in #270 comment6390002732. Seed53 first six eligible scrimmage plays, captured before alert inspection. Supported QB self-arrival inconsistency found outside scout nominations. | Do not ask Integration to build the same capture/queue or repeat seed53 triage. Use the actual defect handoff. |
| Trait-channel A11 | Current RAT-3 still says leadBlock selection-only and awareness/recognition timing effect. Current roles.ts reads leadBlock in FB/H-back role weights. No published trait diagnostic completion found among latest PRs, #255/#270 comments or trait branch search. | Treat the last trait brief as unfinished/unknown, not complete. Owner first checks for local/unpublished work before repeating it. |
| Detector precision | Historical18 unavailable; #270's eight alert concerns remain unresolved in its selected sample. Seed53 independent sample produced9 alerts but primary QB defect was outside those nominations. | Tool usability has improved; population precision/recall is still unproved. Neither eight uncertainties nor one blind discovery establishes precision. |

Current #272 docs still name #260/#264 as held; new #274/#273 now carry reworks. Refresh operational source/dependency references in task briefs without rewriting old evidence.

## 2. Most useful new ordinary-film lead

Source:
https://github.com/tannerthardy/football-simulation-/pull/270#issuecomment-6390002732

Fetchable packet:
https://github.com/tannerthardy/football-simulation-/blob/64c438dae4acb804cd9cb29d1ba654369845ee25/artifacts/ordinary53/README.md

Exact owner handoff:
https://github.com/tannerthardy/football-simulation-/blob/64c438dae4acb804cd9cb29d1ba654369845ee25/artifacts/ordinary53/owner-handoff.md

- Packet source50b80062, enginec243e860..., Node22.23.3; archive4,487,156bytes, SHA25607035b5f8ede618530ea819eecddfea6890b77b8e35136fb96e93b5a90fe89fc.
- P007 COM-QB3 / O:QB / index0,2.80–3.65s, PA Post-Dig, play seed1440603530, setup SHA9ccf69cacb6223fe0f28db393165371517caf6658c627332f04dd6da375204ff.
- At3.60 QB stands still. shouldScramble counts4/5 safe lanes because self ETA uses distance/(vmax*.8),1.2576s for9.19yd. Existing optimistic finite-acceleration full-effort estimate2.132s; held.8 World motion2.45s. All five lose the unchanged.35s margin under the generous finite-acceleration estimate.
- I independently inspected current9ace source: src/sim/behaviors/qb.ts:537+ retains exactly that constant-speed self calculation; defender comparisons use timeToReach. So the reported mismatch remains present in inspected code.
- Do not infer the2.39yd scramble was an overall bad choice. Escaping a sack or selecting a shorter intermediate escape remains legitimate.
- There is a separate acquired-information issue: shouldScramble reads live defender position/velocity/isDown/engagement. The producer substituted already-consumed pictures and still obtained4/5, so that leak does not explain the self-arrival error.
- Actual scramble transfers to BallCarrier. Verify its real intended speed/effort and chosen route before substituting a presumed0.8 request budget. A constant-speed optimism fix must not silently become a scramble ban.
- Opposing native control already available: seed53 P005 pressure escape. Reuse it before any new capture campaign.
- P004 packet question remains unresolved protection: COM-OG2 / O:RT / index2 on IRN-EDGE1 / D:DE_W / index11, not LT; real contact1.20, corner loss1.70, sack2.55. Avoid fixing incorrect visual identity or simply raising hand capacity.

Recommended time-boxed work package: Main/QB owner, small-to-medium, after the current INFO-1 repair or with an explicitly separate owner. Integration supplies exact replay, independent first-causal check and paired short film. First compare same-body stationary vs already-moving self ETA and the saved P007; keep pressure/progression/risk gates fixed. Then validate actual escape, not just endpoint counts. Treat defender-information correction separately.

## 3. Verification support for this week's football changes

Do not create another panel. Reuse saved-play/command traces, the b7e12948 movement-window reporter where needed, and purpose-specific existing diagnostics.

Each implementation owner should provide an independently reproducible minimal handoff:
1. actual base and candidate/dependency SHAs, Node/settings/lock identity;
2. exact constructor bytes/hash, actor playerId/team/slot/index, interval;
3. the precise claim and smallest opposing case;
4. first changed consumed observation/choice/request, and actual downstream/physical consequence;
5. reproduction command and fetchable artifacts.

Independent verifier performs the smallest check that could reject the claim:
- reconstruct unmodified case and verify same-arm observer neutrality;
- read the actual changed code and later consumers;
- verify active exposure rather than merely a method invocation or metadata;
- compare the named positive and adverse control;
- reproduce the decisive physical/control row before accepting a final-yardage story.

Published test counts, headings such as ACCEPT, and matching scorecard means are not independent scientific verification. Historical producer/source snapshots must not be relabelled current merely because a new tool can read them. Cross-treatment divergence is expected; observer on/off within one arm is the equality question.

Useful concrete pairings:
- Measurin independently verifies one actual consumed request-budget/arrival or feedback-preview claim for Defense/Run.
- Integration independently reproduces one native football transfer and tests that the watchable clip agrees with actor/load/clock identity.
- Physics verifies contact point, force/work/budget and loaded-motion limits.
- Football owning lane verifies installed duty, cue legitimacy and cost of the alternative.

No need for every partner to rerun all suites or the same six-game card.

### New #274 review requires a real negative cue, not a stats average

Fresh reviewer comment:
https://github.com/tannerthardy/football-simulation-/pull/274#issuecomment-6401811625

360 matched dropbacks have overall means6.816/6.866/6.821 (develop/#260/#274), yet selected ordinary non-scrambles regress after the new speed cue. In Smash/Cover3 #5, QB is6yd deep, inside pictured tackles, moving(2.5,.5); speed-only cue latches at3.20, underneath zones vacate, throw3.50, YAC1.2→15.9. Reviewer requests front-of-pocket and/or sustained runner evidence, fixed step-up negative case and three-arm comparison. This is a concrete example of why equal overall means cannot certify a replacement information cue.

Do not blindly encode the review's proposed thresholds. First state what observed feature distinguishes escape from stepping up, what remains ambiguous, and why a fooled response would be legitimate. If using sustained evidence, age/expiry must prevent repeatedly counting the same stale picture as fresh confirmation.

### Run feedback preview support

Shared contract request:
https://github.com/tannerthardy/football-simulation-/pull/255#issuecomment-6390773699

Additive own-state feedback callback in previewFreeMovement, used only by released-combination access; held-Intent callers retained. Existing owner reports21 checks, but utility confirmation remained requested in the read discussion. Independent support should verify:
- constant callback equals old held-Intent results;
- callback actually reads scratch own body, not captured real actor state;
- observed obstacle pictures/objective are frozen inputs, never live opponent decisions/RNG;
- reset/call-order isolation, cached support/spin/motor state and center/patch selection;
- prediction simulates the control feedback emitted later, with read cadence and objective lifetime clearly qualified;
- unloaded preview is not reused to certify loaded preparation;
- no silent success claim when access status is unvalidated.

Reuse current Run exposure and existing tests; no longer horizon or larger search by default.

## 4. Measurin's concrete scope

Priority1: supply independent operator/response checks to the current football owner. It should be a small check, not another production controller implementation.

Priority2, if not already done locally: A11 trait-channel truthfulness.
- Scope only leadBlock plus one existing mental timing channel (awareness/playRecognition).
- Trace generation, normalization, selection weights, derived profile/mind and actual execution consumer. Literal rg alone can miss derived/generic consumers.
- Hold actual personnel/body/unrelated ratings/settings fixed; use declared1/50/99 contrast, rebuilding only intended derived mental state.
- Separate selection-only effects from fixed-lineup effects.
- Show first consumed read/timing/control/request difference and one inactive obvious-duty control; higher ratings need not win every play or improve yards.
- If leadBlock remains selection-only, label it explicitly. Do not wire it into a success multiplier or duplicate runBlock.
- Deliver one runnable diagnostic and a concise source-qualified channel table, not a global trait framework.

Priority3, only when COV-6 needs it: use #255 operator as explicit dependency to compare native body/travel motion and actual technique transitions. Its common arithmetic does not make NFL o/dir/smoothing identical to simulation facing/secants. Unknown roster/partial windows stay unknown. No raw NFL CSVs were available for #255; fresh external calibration is not an entry gate to correcting demonstrated controller toggles.

Do not recreate T4. P038/P117 are development evidence now, not still-blind holdouts. T4:
https://github.com/tannerthardy/football-simulation-/pull/255#issuecomment-6389270790

## 5. Integration's concrete scope

First use the completed ordinary53 packet: owner handoff + current-source requalification + smallest P007 replay. This is a higher-value immediate action than another six-play sample or precision framework.

For current Run prototype, preserve the corrected film insight:
https://github.com/tannerthardy/football-simulation-/pull/268#issuecomment-6391082268

The original native viewer hid helper load and misplaced C's label; corrected film shows real C/RG takeover and RT reversal. RG's unconstrained intercept says attainable while its actual detour does not earn timely Mike access; RT later avoidance changes its reversal. Therefore:
- clip labels must attach to stable actors, equal yard scales, primary AND helper contacts where relevant;
- show both request and achieved movement, and the moment a spacing/contact stage changes it;
- a displayed corrected overlay is not a repaired football mechanism;
- candidate native gain2.31→3.72 is not confirmed protection benefit.

Only after owners consume the existing handoffs should Integration collect a new fixed small ordinary sample to test recurrent regressions or detector utility. Predeclare eligibility, source and exposure; retain no-positive/inactive cases. Compare alerted and independently selected intervals, but do not infer population recall from selected positives or severity-capped events.

At most two short ambiguous clips for Tanner per checkpoint, each with actual responsibility, plausible alternatives and a single specific football question. Do not request that Tanner grade hundreds of dots.

## 6. Performance and randomness

A16 is a guardrail this week, not a promise to reach5s/game.
- Profile the same fixed saved prefix/input and completed work. Record Node/worker count/warm-up/CPU-vs-elapsed.
- Count preview calls, candidates and one-body World steps at the relevant decision boundary; distinguish counters from a speed benchmark.
- Run's feedback access and #273's chooser may increase previews. First measure incremental cost and whether redundant queries can be reused without changing execution.
- No physical time-step reduction or fewer meaningful decisions presented as exact optimization.

A17: canonical construction is shipped. A changed play redistributes RNG consumption; same seed is not whole-play paired randomness. Passive actual chance/draw records can distinguish a threshold change from draw reassignment, without rerolls. Do not start a global purpose-key RNG migration merely to make favorable endings pair.

Use focused tests for local operators; one applicable quick card per production candidate and normal CI PR tier. Reuse compatible finished results. Full48-game campaigns need a specific unresolved composition/population question and a large-enough change; no routine broad campaign for tools/docs.

## 7. Artifact delivery and process limits

#270 notes+clips ZIP is user-scoped Library delivery; repository-only readers have original #265 bytes but not automatically those extra notes. Ordinary53 improved this with one fetchable packet and owner-handoff document.

Require a usable transfer, not a private out path or Git hash alone. Preserve per-file checksums, exact source and command, and machine identity. Use existing approved evidence-only publication channel; do not merge evidence branches into engine code.

Avoid86-part base64 threads: merged #255 timelines can fail transport. Existing 111 comments required paginated small-page reads; full tool failure is not proof data is unavailable.

The week should end with fewer unexplained mechanisms and usable native behavior, not a new dashboard, receipt system or full data recollection.

## Primary sources reviewed

- Current PLAN: https://github.com/tannerthardy/football-simulation-/blob/9ace17336ce8593b9d29454bebaa9ebaf11132e0/docs/PLAN.md
- Current GAPS: https://github.com/tannerthardy/football-simulation-/blob/9ace17336ce8593b9d29454bebaa9ebaf11132e0/docs/GAPS.md
- #272 merged status/description: https://github.com/tannerthardy/football-simulation-/pull/272
- #255 actual patch/operator docs: https://github.com/tannerthardy/football-simulation-/pull/255
- #270 actual patch + completed ordinary-film comment: https://github.com/tannerthardy/football-simulation-/pull/270#issuecomment-6390002732
- QB source inspected: https://github.com/tannerthardy/football-simulation-/blob/9ace17336ce8593b9d29454bebaa9ebaf11132e0/src/sim/behaviors/qb.ts#L537
- Measurin completed T4: https://github.com/tannerthardy/football-simulation-/pull/255#issuecomment-6389270790
- Run feedback contract: https://github.com/tannerthardy/football-simulation-/pull/255#issuecomment-6390773699
