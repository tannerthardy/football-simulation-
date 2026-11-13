# Run-read information measurement

Follow-up: [false clean approach diagnosis and parked turning-cost candidate](run-read-approach.md). It reuses this evidence, reports the fresh adverse controls, and investigates the five retained-key takeovers.

Measurement protocol declared before collecting the observer panel (2026-10-12, America/Phoenix). Source baseline: `f3b764d2792c8eba8769e7ec94880c05f68c270e`. No capacities, mesh policy or read heuristics change. `RUN_READ` remains opt-in.

Use the original counterfactual-probe's ordered 96 inputs: four OZ/WZ calls, seeds 3/7, roster pairs 31/32, 41/42, 51/52, Over/Under, both flips; Ace 11 versus Base 43 Cover 3, LOS 40, strength .55, default World. Keep the original eight-second observation bound and distinguish censored plays. Run read off/on separately, and repeat hold/overflow as context.

Record the consumed key/blocker picture and actual leverage, acquired versus currently found key, read commitment, press handoff, planner candidates/selection, requested motion and achieved path. Hooks reuse consumed values and make no perception or random draws. Verify instrumented versus unattached observers with exact per-tick physical/event fingerprints.

For ordinary runs losing at least .5 yard against their matched read-off input, replay the exact prefix to the first commitment and intervene only on the RB motion request. Test frozen bounce/bang/bend entries and the planner's selected entry using the existing carrier command and native World; defenders and blockers continue responding. Arrival means the RB reaches within .65 yard of the frozen point before opposing carrier contact. A bounded failed branch does not prove no possible path exists. Report arrival time, contacts, approach path, and branch outcome. Eventual openings on the original path are not an independent oracle.

Failure labels can overlap: wrong read (chosen answer fails while another tested answer arrives clean); missing blocked corridor (contact blocks the approach before entry); unreachable opening (not reached within the tested motion/horizon, without approach contact); late mesh (handoff exposure, descriptive unless intervention establishes causality); controller-choice mismatch (different selected entry with a clean committed-entry branch and failed selected-entry branch). A changed entry alone is not a harmful mismatch. Report unresolved cases, losses at several thresholds, and counts/yardage with denominators. Do not attribute common mesh delay to the incremental on/off loss without evidence.

## Findings

The largest supported first-level failure is **missing protection along the approach**, rather than a reversed leverage cue. Seventeen of the 34 ordinary inputs losing at least .5 yard have no clean arrival in any tested bounce/bang/bend branch and meet contact before the committed entry. Another five have a clean alternate answer and are classified primarily as read-opportunity errors. These are bounded route witnesses, not proof that blocking alone caused the on/off loss.

| Same 96 inputs per arm | Read off | Read on |
| --- | ---: | ---: |
| Ordinary defense | 2.674 | 1.978 |
| No flow (`hold`) | 4.702 | 4.375 |
| Overflow (`over`) | 2.016 | 2.224 |

Keep the original eight-second endpoints. Ordinary off/on each have one censored play, on different inputs. The 94 pairs completed in both arms average a .678-yard loss. The largest deficit (-34.45 yards) compares a censored off run; its mechanism remains unresolved. Branch gains on unfinished plays are not completed gains or recovered touchdowns.

Primary groups require the **actual executed path** to have failed to reach the frozen committed entry before contact. A bad candidate comparison that the actual controller corrects is not counted as an executed-entry failure. Overlapping labels use precedence: mismatch, read opportunity, corridor, unreachable, unresolved. Group yardage describes the matched deficit, not yards a fix would necessarily recover.

| Primary mechanism | Lost inputs (of 34) | Completed lost inputs (of 33) | Deficit on completed pairs |
| --- | ---: | ---: | ---: |
| Missing blocked corridor | 17 | 17 | 52.07 yd |
| Wrong read opportunity | 5 | 5 | 25.13 yd |
| Executed controller-choice mismatch | 1 | 1 | 0.70 yd |
| Unreachable opening independently isolated | 0 | 0 | 0 yd |
| Unresolved / after entry | 11 | 10 | 30.73 yd |

Late mesh is a shared constraint: every lost input hands off more than .2 seconds after its nominal mesh, but **all 96 matched handoff times and mesh paths are identical off/on**. Actual handoff averages 1.5375 s (median 1.55); nominal times are 1.15/1.20. The first sampled QB/RB distance within physical handoff reach is the actual transfer tick. Advancing a timer alone would not make it attainable. This panel establishes no causal lost-run count for mesh delay.

The corridor group stays largest at .25, .5 and 1-yard loss thresholds (21, 17, 13 primary cases). At 2 yards it ties unresolved at six. Overlapping labels identify 22 actual failed-entry runs with a blocked approach, including the five read-opportunity errors. Twenty-three committed-entry **branch** approaches meet contact; the actual controller rescues one through a different path. Twenty of those 23 branches were scored clean (`risk < .6`) at commitment. The held first key supplies 11 contacts; only four contact defenders still have an engagement at contact. The key's hands carry measured load at decision in 33 of the 34 lost inputs, yet that does not guarantee protection along the back's approach. Only one lost input has a leverage-sign disagreement with its true projected key/blocker relationship.

Zero isolated unreachable losses does not rule out late turning/arrival. Loaded approach failures can combine missing protection with inability to arrive before a closing defender. No unloaded preview or later opening on the original path is treated as a feasibility oracle.

## Controller handoff and executed path

`runRead()` commits an answer/entry. `pressAndRead()` writes that entry into `opts.aim`, clears its gap attachment, ends `aimUntil`, and returns null. `runReadAim()` independently scores moving surface creases: the entry is a lateral preference, not the final selected point. Later beats may select another crease again. The trace records those choices, requested/refined motion and achieved positions.

Five lost inputs have a clean direct branch to the committed point and a failed branch to the first planner-selected point. **Four actual paths nevertheless reach the committed point before contact.** Those candidate-mismatch witnesses do not explain their first-level execution loss. Only `oz_strong s3 31/32 under flip` also fails to execute the committed entry: commit 2.05 s, first planner 2.10 s, committed-point branch arrival 2.55 s, actual first contact 3.05 s. Actual gain is 2.69 versus 3.39 off. The branch's eventual gain improves only .43 yard, not the entire deficit.

`BallCarrier.update()` also caches `designed` before `pressAndRead()` ends the aiming window. Thirteen lost inputs still execute that cached phase on the commitment tick and select a crease one native tick later. Eighteen keep pressing after the ordinary controller has made its first crease selection. Those timing differences are observed, but their causal share is not isolated. The 17 failed corridors do not prove only upstream blocking needs repair: extended pressing may help create the bad decision state.

## Retained keys and lateral takeovers

The header claims a slant hands off the key, but the state only adopts a replacement before commitment if the old key is down or perceived more than 2.5 yards beyond the line. Moving inside the called surface does not trigger that handoff. `readKeys()` can identify a new current candidate while the state holds the original.

Seventeen lost inputs retain a key after the consumed candidate changes; 15 see the instantaneous geometric first defender change while keeping an earlier key. Five have a DL-to-DL takeover with the held lineman still at the line. Example: `oz_strong s3 51/52 over flip` holds DT_S while DE_S becomes the instantaneous surface key at 1.25/1.45 s. It later commits bang on DT_S at 2.05 s. Bang meets DT_S at 2.50 s before entry; bounce arrives at 2.50 s ahead of contact at 2.60 s.

This is a retained-key witness, not a rule to adopt every replacement. Many current candidates are filling linebackers, and the surface itself moves. These matched Over/Under calls contain no explicit slant call; the five are **slant-like lateral takeover witnesses**, not a dedicated slant-call experiment.

## Evidence, validation and reproduction

All 576 instrumented panel executions match fresh no-sink executions with exact per-tick fingerprints of bodies, mind/RNG state, perception, controller state, eyes/read state, events, joints and intents. All 376 entry branches reproduce the prefix through the original RB update at first commitment, before replacing its motion request. Blockers and defenders respond normally in each branch. Seven decisions begin with a tackle bond (one lost input); those cannot count as clean arrival.

A branch holds a frozen target for up to 2.5 s, updates its heading on the existing finite decision interval, and uses the existing carrier command and native World. Arrival within .65 yard releases the intervention. Eventual branch gain therefore includes later ordinary behavior. The first selected point can come from the next tick; testing it at commitment is a retrospective comparison, not information available to the actor earlier. Frozen targets omit later moving-entry updates. Failed branches exclude neither other routes nor better policies; clean arrival guarantees neither an open approach in another branch nor a good eventual run. Actual-path checks prevent candidate comparisons from overstating read and mismatch failures.

The [summary](../../data/reviews/run-read-information/summary.json) retains all 96 matched outcomes, acquired/held/current key IDs, actual/perceived leverage, identified blocker and achieved hand-load records, commitments/entries, actual arrivals, branch arrivals/contact/horizon, censoring and classifications. The [input manifest](../../data/reviews/run-read-information/input-manifest.json) freezes their order; the [source manifest](../../data/reviews/run-read-information/source-manifest.json) pins source hashes. Full consumed pictures, motion, opposing/surface paths, events and branches remain in `out/run-read-information/{current,hold,over}-{off,on}.json`; SHA-256 receipts are in the summary.

```sh
for flow in current hold over; do
  READ_INFO_BRANCHES=0
  if [ "$flow" = current ]; then READ_INFO_BRANCHES=1; fi
  CF_FLOW="$flow" RUN_READ=1 READ_INFO_BRANCHES="$READ_INFO_BRANCHES" \
    node --import tsx scripts/diag/zone/run-read-information.ts "out/run-read-information/$flow-on.json"
  env -u RUN_READ CF_FLOW="$flow" READ_INFO_BRANCHES=0 \
    node --import tsx scripts/diag/zone/run-read-information.ts "out/run-read-information/$flow-off.json"
done
python3 scripts/diag/zone/summarize-run-read-information.py
```

Use Node 22 and the pinned checkout; clear unrelated experimental environment switches. These measurements use default eyes/live aim and default center-hand World, and reproduce the unchanged counterfactual collector's means.

Typecheck passes. Core tests before and after: **1,328 passed; the same single Tite witness failed** in `test/zone-helper-check.test.ts:440` (expected 0 greater than 0). Inputs/assertions remain untouched. No controller policy, read heuristic, physics capacity or mesh implementation changed. `RUN_READ` stays default-off.

The next diagnostic priority is the **false clean approach contract**: locate the earliest action divergence in the 17 no-clean-answer losses, then compare consumed path-risk samples and engagement allowance against achieved seal/load and actual turning/arrival. That separates bad prediction or prolonged pressing from protection that never materialized. Retained-key takeover witnesses come next. Another read-controller iteration is premature on this evidence.
