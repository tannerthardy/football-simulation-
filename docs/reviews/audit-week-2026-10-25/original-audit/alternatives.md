# Adversarial audit of the responsibility/opportunity proposal

Source: `/workspace/football-audit` at `c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`. Production and approved plans remain unchanged. Experiments live in `out/forensic-decision/alternatives.ts`; complete results are in `alternatives.json`, and existing focused test results in `focused-tests.log`. Copies of the script, data and logs are preserved together in `./evidence/decision/`. This investigation challenges the earlier architectural recommendation rather than assuming it.

## Revised conclusion

**The earlier roadmap overstated the case for making a common decision envelope the central architectural bet.** I reproduced a decision/execution inconsistency that is more concrete than the earlier conceptual complaint: a blocker chooses a new target but retains the previous target's held movement goal. A small target-transition invalidation fixes the demonstrated command mismatch while preserving normal commitment. The root investigation subsequently confirmed actual command and physical effects in two saved native plays, spanning blocking and zone coverage. A new opportunity policy is unnecessary for that defect; a small action-lifetime contract is now supported across roles.

I also reproduced the inability of the first-threat policy to distinguish nearby useful help from a nearby teammate whose observed motion takes him away. A small role-specific predicate changes the decision without a shared responsibility model. That illustrates a viable alternative, but physical football benefit and ordinary prevalence remain unproved.

Conversely, the existing coverage policy already demonstrates coherent help, discipline, recovery and trait-dependent response timing. It supplies counterevidence to the claim that a common framework is necessary to make adaptive behavior possible.

The supported next move is **repair semantic boundaries, then compare role-specific policy improvements against the smallest common interfaces that actually prevent recurrence**. Share evidence and decision records where useful. Do not add a global scheduler or universal utility model without a failing cross-role case that requires it.

## Experiment D1: a correct target change inherits the wrong movement goal

### Symptom and competing explanations

A lead blocker changes from the Mike to the safety, faces the safety, but initially requests lateral movement away from the safety. Possible causes are a wrong target choice, insufficient body turning, an excessive commitment delay, or a stale movement goal attached to the wrong target.

### Source path

`RunBlocker.update` reassesses threats at `blocking.ts:972-974`, then independently calls `availableTarget` at line 976. That function can replace an unavailable target on its own retarget cadence (`1256-1284`). The later attack code computes a new intercept, but stores it through `a.mind.aim('block-fit', lead, sim.t)` (`1470-1478`). `SnapMind.aim` returns the prior position until its deadline whenever the string key is unchanged (`mind.ts:72-78`). Its key contains neither target nor action generation.

This is not an error in choosing the new target. The choice has already changed correctly before the old position is returned.

### Controlled reproducer

The script uses real `PlaySim`, generated rosters, `RunBlocker.update`, `availableTarget`, `attack`, `SnapMind`, and the normal movement request functions. It supplies synthetic acquired pictures to isolate the controller; it does not advance a physical game. The FB begins at `(39.5,27.067)`, the Mike at `(41.5,26.667)`, and the safety at `(44,29.667)`. The runner is at `(37,26.667)`. Bodies are not overlapping in the decisive helper geometry.

At 1.80 s the lead chooses the Mike. At 1.85 s the Mike becomes unavailable and his supplied picture also shows down. The production replacement logic selects the safety. No new policy is installed.

| Stage | Current | Target-transition invalidation |
| --- | --- | --- |
| First target at 1.80 s | Mike | Mike |
| First requested velocity | `(2.405,-1.289)` yd/s | Identical |
| Target at 1.85 s | Safety | Safety |
| Facing at 1.85 s | `0.524` rad, toward safety | Identical |
| Held goal at 1.85 s | Mike's `(40.6,26.667)` until 2.01758 s | Safety's `(45.5,29.667)` |
| Requested velocity at 1.85 s | `(4.140,-1.048)` yd/s | `(7.736,+2.626)` yd/s |
| At 2.05 s | Finally adopts safety goal | Already has safety goal |

The local intervention invalidates only `block-fit` when the target identity changes. It changes no observation, target choice, body capacity, physical law or ordinary same-target cadence. The x component changes because the desired intercept also changes; the lateral sign reversal makes the mismatch especially clear.

### Opposing and failed-simple-fix controls

- **Same target, new small lateral cue:** both policies retain the original aim at 1.85 s and update at 2.05 s. Their complete movement commands are identical. The correction does not make every new picture trigger immediate replanning.
- **Same target, no new cue:** all three sampled commands are identical across current and corrected policies.
- **Return to an earlier target:** merely using `block-fit:<target-id>` fixes the first switch but can retrieve that target's earlier cached goal on a rapid return. In an explicitly injected policy-transition stress at 1.90 s, target-key output is `(1.869,-3.181)` while transition invalidation gives `(1.579,-3.900)` using the new acquired location. The ordinary lead's own reassessment cadence would not produce this return that early; the stress tests cache semantics, not observed native frequency. It argues for invalidation/action generation rather than accumulating identity keys and assuming the lifecycle is solved.

### Supported conclusion and limits

**Reproduced synthetic production-path defect:** a target change and its movement goal can disagree because commitment attaches to a name that is too broad. The invalidation correction addresses the first wrong request. This synthetic experiment alone does not establish physical arrival, better blocks, or ordinary-game prevalence. The target unavailability path also has authoritative-state issues studied separately; supplying an observed down picture here does not repair those. The subsequent native investigation below establishes a narrower physical connection.

The same `SnapMind.aim` API is used by run fits (`run-fits.ts:275,332,423`), force tracking (`force-track.ts:41`), zone drive (`defense.ts:539`), and engaged work (`engagement.ts:1014`). That makes a semantic contract worth auditing, not proof that all users have the defect. Engagement already includes blocker identity and fit in its key, showing that a local convention exists to reuse. A small API for invalidating an obsolete action may be sufficient; a shared chooser is not implied.

**Independent second-role confirmation:** the architecture investigation reproduced the same inconsistency in `ZoneCoverage.update`: target Y at 2.00 s changes to X at 2.05 s, but the held `zone-drive` goal still belongs to Y until 2.17098 s. The final probe changes acquired depth by only 0.02 yd across the ranking tie. The requested lateral velocity remains −5.391 yd/s; a target-aware diagnostic gives +5.104 yd/s toward X. Initial and same-target controls match. See `./evidence/architecture/zone-cache.json`.

**Failed native hypothesis retained:** an ordinary P029 Toss trace appeared to show the RT changing target 17→15 at 2.60 s while an old `block-fit` goal remained cached. The architecture agent's exact native replay and targeted invalidation found no activation, no changed requests/bodies/events, and the same 4.56-yard result. The new target used a contact branch and never consumed that cached goal. See `./evidence/architecture/native-cache.json`. A stale cache's existence is not evidence of stale execution.

### Native exposure and causal continuation

The root investigation then replayed all 130 captured setups from the saved seed-7 game; three reject before the snap, leaving 127 live plays. Across 2,915 `block-fit` and 65 `zone-drive` calls, 13 calls returned a held goal associated with a different target. These represent seven switch episodes in six plays, not 13 distinct player mistakes. The captured set is not a representative population sample; the call ratio is an implementation exposure count, not a football error rate.

The root replayed all six exposed plays with transition invalidation, plus the P029 negative control. Baseline parity checks matched the original census for all seven. Only two plays changed a raw request, the final request and physical motion:

| Native play | Exposed player | Effect of invalidating the obsolete goal | First physical difference | Largest paired body-position separation |
| --- | --- | --- | --- | ---: |
| G1-P093 | F, `block-fit` | At 3.70 s, same newly selected LB_M and facing; raw velocity changes from `(−0.315,3.396)` to `(−0.069,2.901)`. Downstream adjustments modify both commands, but the difference survives. | 3.75 s | 0.02976 yd |
| G1-P095 | FS, `zone-drive` | At 3.00 s, selects Z while the returned goal still belongs to X, 23.597 yd from the newly desired goal. Raw/final velocity changes from `(3.423,−7.165)` to `(4.698,+6.401)`; facing is identical. | 3.05 s | 0.71925 yd |
| G1-P129, P149, P159, P160 | RT, Y, RT, RT | Invalidation changes the returned cache value, but **no command, body or complete play result changes**. | None | 0 |
| G1-P029 control | RT | New target never calls the relevant aim cache. | None | 0 |

The maximum separation is over all paired bodies and ticks in a continuation, not necessarily the named player's final displacement. All seven comparisons retain the same yardage, duration and football outcome. The two changed trajectories establish a real execution consequence; they do not establish better coverage, better blocking or outcome improvement.

The four inert exposed plays are an especially valuable counterexample. `attack` computes the held aim at `blocking.ts:1478`, but `CLIMB_PLAN` then returns the separate `plannedClimb` command at `1503-1513`. The held value never reaches the fallback command at `1515-1519`. Therefore even **a returned stale goal is insufficient evidence that a stale action was executed**. Diagnosis must distinguish stored state, returned intermediate value, final command and physical consequence.

The native trace establishes a 0.05 s interval from changed request to first body-position difference in P093 and P095. It does not independently establish when the decisive new cue became available or first acquired, nor when the movement became useful football. Those earlier/later timestamps must not be invented from the command trace.

Reproduction and raw evidence: `/workspace/football-audit/out/forensic-root/aim-census.ts`, `aim-census.json`, `aim-native.ts`, `aim-native-traces.json` and `aim-native-summary.json`. These native results strengthen the small cross-role action-lifetime correction and leave the common opportunity chooser unearned.

There are two legitimate repair families: invalidate the obsolete goal when an allowed target switch happens, **or retain target identity and goal together until the existing commitment expires**. The appropriate choice depends on whether the specific transition is an immediate invalidation or an ordinary reconsideration. The invariant is atomic action identity and goal, not "always replan immediately."

## Experiment D2: local help eligibility versus common envelope

### What current code actually decides

`rereadThreat` first protects the current target if he is within four yards of the acquired runner (`1683-1684`). It scores other threats using distance minus positive closing speed over one second (`1678-1681`), limits them to the runner's forward region, and requires the blocker to be nearer than the runner (`1691-1693`). A teammate closer than the blocker by half a yard suppresses the new target.

The last test discards acquired teammate velocity and pose: `sim.see(...).pos` at line 1685. Therefore changing those facts alone cannot affect this eligibility decision. This is an identifiable simplification, not evidence that the engine lacks responsibilities altogether.

### Three arms, 11 situations, both lateral mirrors

1. **Current:** unmodified production method.
2. **Local:** preserve the method except the helper veto. Keep the acquired picture; require upright/unknown pose, and require proximity to persist under observed relative velocity over the blocker's existing decision interval. This is deliberately a cheap local forecast, not an oracle about blocking or a production-ready patch.
3. **Record envelope:** run the exact local policy while recording purpose, original target, options, help assessment, chosen target and commitment deadline. No new scheduler or utility calculation.

All 66 calls run the complete production `RunBlocker.update`; only the local method is replaced in memory for the two experimental arms.

| Situation | Current target | Local target | Interpretation |
| --- | --- | --- | --- |
| No nearby helper; Mike threatens runner | Mike | Mike | Current policy already adapts. |
| Upright stationary close helper | Safety | Safety | Preserve original duty. |
| Observed down close helper | Safety | Mike | Local rule uses a fact current eligibility discarded. A down body might still obstruct a path; physical superiority is not established. |
| Observed rising helper | Safety | Mike | Changed assumption, **not labeled a proven improvement**; recovery timing matters. |
| Unknown helper pose | Safety | Safety | Unknown is not automatically unavailable. |
| Close helper rapidly departing sideways | Safety | Mike | Candidate local correction to a transient proximity assumption; the helper might still screen, so test native usefulness before adopting. |
| Useful co-moving help control | Safety | Safety | No blanket removal of teamwork. |
| Distant candidate distraction | Safety | Safety | No gratuitous target chase. |
| Original defender near runner | Safety | Safety | Existing strong responsibility retained. |
| Original defender on near cutback side | Safety | Safety | Retains immediate original danger. |
| Candidate moving away from runner | Safety | Safety | Counterexample to the claim that this policy simply selects nearest bodies. |

Both mirrored matrices give the same target classifications. The record envelope and local arms produce identical complete commands in all 22 matched cases. **That equality is by construction:** it shows that recording a common vocabulary adds no intelligence by itself and is not necessary to express this local predicate. It cannot falsify an architecture that adds a genuinely different policy.

The synthetic down-picture comparison keeps the helper's actual physical support state upright in both arms; the local method consumes `Perceived.pose`, not actual support. The method intentionally leaves other legacy live eligibility checks in place to isolate the hypothesis. It is not an information-boundary migration.

### Cost and commitment

A six-batch alternating-order microbenchmark evaluates only target reassessment with identical supplied pictures. Current, local and record arms have medians of 44.88, 46.76 and 47.49 microseconds per decision in the final run, with overlapping ranges. Cloning the supplied pictures is substantial work in this synthetic setup. These timings establish neither a meaningful production overhead difference nor game cost. No arm adds simulation-time latency because all reuse the same cadence.

The current policy also recovers from a transient opportunity without keeping a separate permanent original-target object: Mike at 1.80 s, still Mike at 1.85 s while committed, then safety at 2.05 s once the supplied threat picture reverses. This successful case weakens the claim that every adaptation requires a newly formalized responsibility lifecycle.

## Experiment D3: existing coverage already adapts coherently across time

This test uses actual `PerceptionBuffer`, `ReleaseReader`, `CoverageJudgment` and its existing decision cadence, with linear synthetic position histories. It is adapted from existing projected-cap tests and exports timing rather than only pass/fail assertions.

The defender's assigned receiver has a nearby co-moving cap, so he helps another exposed vertical. At 1.15 s the helper falls. The helper's acquired picture remains upright through 1.20 s and becomes down at 1.25 s. The decision retains commitment until the next eligible read and then recovers the primary receiver.

| Observer profile | Decision interval | First acquired down picture | Return to primary | Fall-to-choice time |
| --- | ---: | ---: | ---: | ---: |
| Generated default | 0.19025 s | 1.25 s | 1.35 s | 0.20 s |
| Recognition/awareness both 1 | 0.25312 s | 1.25 s | 1.45 s | 0.30 s |
| Recognition/awareness both 99 | 0.14512 s | 1.25 s | 1.30 s | 0.15 s |

No common decision envelope is present. `CoverageJudgment` already retains primary versus override, uses projected help, commits, and recovers (`judgment.ts:20-97`). This is a concrete counterexample to a blanket "players cannot intelligently help" diagnosis. It does not measure time to useful physical movement, which begins after this choice; it does not validate every coverage rule or the teammate acquisition model.

The first audit's warning about stacked delays remains a risk to measure, not a demonstrated explanation for every late play. Here the additional wait after acquiring the down cue is an intentional commitment beat and differs sensibly by traits. Removing it indiscriminately would make the defender respond too continuously. A generic second scheduler would be unnecessary; a common record can simply reuse the existing deadline.

## Traits: choice, timing and execution are different claims

On a fixed lead-blocker helper scenario, ratings 1/50/99 for `leadBlock`, `runBlock`, recognition, awareness, discipline and anticipation all retain the same target under the current policy. That alone is not a defect: some situations should be decided the same way by all players.

Recognition changes decision interval from 0.25769 to 0.18749 s and physical-profile reaction time from 0.36829 to 0.21229 s; awareness also changes both. The script supplies fixed acquired pictures, so these numbers are channel effects, not measured full sensing latency in this scene. The coverage experiment above demonstrates an actual resulting choice-time difference.

`leadBlock` produces identical complete commands as well as identical target and timing in this fixed-lineup probe. A source search finds it in generation, roster-role weights and the rating list, but no simulation consumer. This corroborates the first audit's narrow trait-channel issue; it does not justify a new global IQ score. Wire a trait to a documented technique/recognition channel only after that channel works. Changing the player selection mechanism is separate from changing the selected player's execution.

## What can genuinely be shared, and what should remain different

The code has three different useful responsibility forms:

- **Coverage:** a called primary directive persists while a temporary help override is active; the rule may itself evolve with releases (`coverage/defender.ts:84-124`).
- **Free blocking:** the target and job can be replaced, and future danger can cause another replacement. Recreating the original target is not intrinsically correct. Combination ownership has a separate shared contact lifecycle (`blocking.ts:1758` onward).
- **Run fits:** an installed gap/force/cutback duty persists while the execution aim moves with line/runner information and eventually switches to pursuit (`run-fits.ts:300-447`). Multiple duties can belong to one body conditionally.

These support a shared **description** of known instruction, current action, evidence and action lifetime. They do not establish one shared **decision algorithm**. A framework that forces every role into "primary target plus temporary override" would be wrong for some legitimate reassignments; one that always replaces the original duty would break coverage recovery.

The strongest current abstractions to preserve are `SnapMind`'s stable variation/cadence, the existing role-specific reads, projected help, run-fit contracts, movement previews, and the separation of requests from physical execution. Improve their contracts and invalidation, not their names.

One useful cross-role interface would make an action's identity and generation explicit and tie cached goals/forecasts to it. Another would expose consumed observations and the final request modification stages. Both can be added independently of a common chooser.

## Credible alternatives

| Alternative | What it changes | Evidence now | Main failure risk |
| --- | --- | --- | --- |
| Local corrections only | Fix held-target goal invalidation, improve one role's help predicate | Sufficient for D1's wrong request and both affected native continuations; expresses D2 without framework | Similar mistakes may recur if conventions stay implicit. |
| Local policies plus small shared interfaces | Immutable acquired inputs; explicit action lifetime; common trace record; role owns choices | Best supported direction; blocking and zone coverage now share an executed cache-lifetime defect without needing the same football policy | Overly broad types or escape hatches can make the interface nominal only. |
| Common responsibility/opportunity orchestrator | Shared candidate generation/selection/commitment around all roles | No demonstrated necessity from these cases | Duplicate cadence, conflicting ownership, forced lifecycle semantics, apparent elegance without football improvement. |
| Learned evaluator or planner | Learn option values or search future outcomes | Not tested here; current role and movement contracts remain prerequisites | Optimizes wrong simulator assumptions and makes local causes harder to inspect. |

There is no evidence here that a lightweight common record is too expensive. There is also no evidence that a richer envelope improves choices. Both claims should remain open. Existing `plannedClimb` evaluates six trial leads with up to 26 preview samples each (`blocking.ts:1157-1167`); moving this forecast ahead of target selection for every candidate would multiply that routine's work. That is a concrete cost risk to measure, not a measured whole-game slowdown.

A common envelope would be earned by a case in which two role-specific policies with correct information and motor contracts still fail at the same responsibility transfer, and one small shared operation repairs both while retaining distinct football semantics. The necessity claim weakens if a local predicate/invalidation solves the cases, if the common component only logs them, or if it cannot outperform matched local policies on independent transfer cases at comparable cost.

## A01–A21: disposition and real dependencies

These recommendations do not edit the approved plan. They challenge the proposed audit roadmap.

| Package | Disposition | Revised scope, dependency and falsification condition |
| --- | --- | --- |
| A01 evidence validity | Keep | Independent urgent correctness work; must not wait for player architecture. Stop expansion once false certification and incompatible/missing states are explicit. |
| A02 gap evidence | Combine operationally with A01 review | Refresh source/definitions when new evidence changes the decision. No technical dependency on policy code; do not create another tracking system. |
| A03 film scouts | Keep, narrow | Use existing detectors and actual nominated clips. Measure false alarms and preserve ordinary controls. Stop adding detector categories when trace diagnosis, not discovery, is the bottleneck. |
| A04 request trace | Combine first delivery with A10 | Capture chosen target **and cached goal identity/deadline**, raw request and downstream stages for a current failure. D1 shows target alone is insufficient. It should make the next diagnosis cheaper immediately. |
| A05 knowledge boundary | Narrow, staged | Correct a consumer's acquired inputs and action lifetime; do not require whole-engine migration before a cache-key fix. Acquisition must still deliver phase changes. An immutable type is useful only if policy cannot reach hidden truth through a captured Agent/PlaySim. |
| A06 coverage transitions | Broaden to actual request/goal transition contract, retaining coverage owner | Pursuit/run-fit request and motor mismatches belong in the same command-path investigation when demonstrated, rather than automatically creating another lane. Do not assume all cases are coverage toggles. Depends on the selected trace and motor semantics, not A08. |
| A07 dive reach | Keep | Independent acquisition/geometry correctness. Depends on agreed body/contact coordinates and reachable opposing cases; no responsibility framework prerequisite. |
| A08 adaptation pilot | **Narrow and demote from central bet** | Compare current policy with the smallest local correction first. D1 needs no opportunity policy; D2 still needs native usefulness. Require an actual failed opportunity whose information and execution contracts are sound before larger selection work. |
| A09 common architecture | Defer common chooser; allow action lifetime and small records now | Two roles now share a native executed cache-lifetime defect, supporting that bounded contract. A common chooser still requires a common **policy** failure that local corrections cannot adequately solve; cache repair does not establish it. Cancel orchestration if only logging or role-specific logic transfers. |
| A10 causal experiments | Keep, combine initial delivery with A04 | Add semantic input-order identity from the root audit, but do not build a universal serializer. Tests must distinguish inherited stale state from valid history. Native observational repeat and one intervention are the true prerequisites. |
| A11 traits/lineup | Move narrow truthfulness checks earlier | `leadBlock` channel and root's lineup-order finding affect meaningful matchup claims now. Can run beside command repairs. Do not insist every rating changes every choice or every result improves. |
| A12 concept installation | Keep small family, independent preparation | Installation validity can be tested now. Broad tactical claims depend on valid movement/information/lineup semantics; a shared chooser is not a technical prerequisite. |
| A13 protection | Separate installer/ownership tests from full physical adoption | Identification and assignment contracts can proceed before G5 is completely solved; final useful protection depends on coherent blocking execution. Do not hide correct sacrificial free-rusher cases. |
| A14 contact law | Keep bounded correctness slot | Independent of A08/A09. Prioritize demonstrated law defect and relevant exposure; performance and current contact controls are real dependencies. Do not promote unrelated anatomical research. |
| A15 measurement/holdouts | Keep early for every claim it gates | Operator validity is needed before NFL-derived target or limit claims, including yaw. No global framework dependency. |
| A16 performance | Keep focused | Measure actual successful workload; D2 microbenchmark cannot set a game budget. Stop an optimization that changes semantics without a separately justified model change. |
| A17 RNG | Split | Root's semantic lineup-order normalization/stable initialization belongs early with A10/A11. Broader event-keyed RNG remains conditional; same seed does not pair divergent games. |
| A18 exploit search | Split | Small adversarial controls belong now in every causal investigation. Large matchup search waits for a supported trustworthy surface and cost. M3 is an organizational milestone, not a reason to defer all adversarial testing. |
| A19 attention/communication | Narrow and evidence-triggered | Explicit acquired-event/teammate-help semantics may be required during A05; detailed vision, gaze or communication simulations are not automatically required. Measure the complete timing chain before adding delays. |
| A20 broader product | Defer broad implementation | Keep capability boundaries honest; no evidence in this subaudit justifies accelerating league/feature expansion. |
| A21 learned/anatomical research | Keep parked | Must answer a bounded failure local contracts cannot express. "Players are dumb" is not sufficient, particularly when D1 is a stale cache. |

The original M2 milestone should become: **a player preserves valid commitment, changes an obsolete action without inheriting the wrong plan, and makes a justified role-specific adaptation on an unseen case**. A shared envelope should be an optional implementation, not part of the definition of success.

## Remaining decisive experiments

1. The native census and seven continuations are now complete: two executed effects, four returned-but-unused cases and one cached-but-uncalled control. Extend only to an independent game/call/personnel set needed to judge recurrence; preserve each denominator and do not turn this selected set into a population error rate.
2. On the affected native cases, measure first acquired cue, allowed decision transition, changed request, body response and **useful football contribution**. The current trace establishes the last mechanical boundary but not full cue-to-useful-action latency or improved outcomes. Compare transition invalidation with holding target and goal together where a change is ordinary reconsideration.
3. For help eligibility, find an actual departing/down helper witness and a helper that is legitimately screening. Compare only the local predicate; let physical interaction decide usefulness. The current illustrative projection is insufficient to certify a production fix.
4. Native blocking and zone coverage now both confirm execution effects. Test whether a small atomic action/goal interface covers both while preserving their different commitment semantics, same-target controls and rapid return-to-target behavior. Native pursuit transfer still remains unproved. Do not turn this result into evidence for a shared opportunity-ranking policy.
5. After motor and information repairs, rerun a small independent opportunity/discipline set. If existing policies now behave coherently, A08/A09 shrink further. If they still fail for common choice reasons, reconsider shared selection with actual evidence.

## Reproduction and evidence status

```bash
cd /workspace/football-audit
PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH node --import tsx out/forensic-decision/alternatives.ts
PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH npx vitest run test/first-threat.test.ts test/projected-cap.test.ts test/coverage-judgment.test.ts
```

Existing focused contracts: **34 tests in three files passed**. The diagnostic script also asserts complete local/record-envelope command equality across 22 pairs and same-target/no-new-cue equality for both goal-lifetime alternatives. These assertions protect the experimental comparison; they are not evidence that its hand-selected cases constitute a football benchmark.

**Established here:** synthetic production-path stale-goal defect; local correction of that command mismatch; current helper-veto insensitivity; existing help/recovery behavior and trait timing; narrow leadBlock non-consumption. **Established by the integrated root continuation:** two native executed cache-lifetime effects across blocking and zone coverage, plus five opposing native controls with no physical effect for distinct reasons.

**Not established here:** population frequency, final football improvement, a causal link to every skating/turn-away clip, or the necessity of a shared decision orchestrator. The saved-set native counts are exposure evidence, not population validity. Broader claims require independent continuations, useful-action measures and integration with the separate movement, update-order and film investigations.
