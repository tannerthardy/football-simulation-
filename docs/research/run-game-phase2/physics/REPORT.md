> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](../README.md) for remote evidence access and the next-work plan.

# Phase II shared-physics research

The new result is a small, reviewable **ground-budget repair**, independent of choosing a force–velocity curve. Two accepted-code paths can spend more than their own actual-normal-load traction allowance: yaw recomputes standing-weight traction, and the gait/lean allocator can leave residual lean after separately clipping opposing gait. Both defects reproduce in an ordinary frozen play and persist under timestep refinement. The isolated repair removes measured violations in all 44 retained legal run inputs. It does **not** establish better run blocking or pass protection: P019 still changes from maintained contact to a geometric edge shed, and a matched ordinary pass becomes incomplete. Those outcomes are retained for interpretation.

A second finding narrows the force–velocity draft's redirect failure. Center-only tangential hand forces couple translation while omitting the corresponding yaw. Adding the common force point and matching centered transport restores the rusher's corner with PR #297, without adopting the full patch-contact model. This is a useful independent mechanics control, not a qualified replacement default.

## Source and scope

Accepted source is `a5b024b9fbf8c51fc31401eefb79737be586814a`, refreshed October 26. #292 is merged; #297 remains open draft at `3f75293ae2474ff6f45dbf7b31b3eee1634f1d4a`. World/support/engagement physics is byte-identical to historical `58e0f5e`; current runner behavior is not. All 216 manifest-listed Phase I artifacts were read and SHA256 verified into `phase1-inventory.json`; old invalid manual-tick results remain in the immutable original package and are not used as native results here.

Research tree: `/workspace/physics-phase2`, detached at current accepted SHA. No accepted files, defaults or remote branches were changed. Pinned Node is `/workspace/run-game-research/runtime/node_modules/node/bin/node`, v22.23.3. Final engine source SHA256 is `e203a5ebfc838f30ab136ff0f6b2a806cca9ad08b3499de50b2550cc5cca160c`, with per-file hashes in `final-source.json`. This Python component-sorted-path digest differs from the repository’s globally string-sorted `sourceVersion()` digest `e28551bf02d90ddc7c7614b0b770fab883b8a39ea6ac48d54eaf40902b2e9688`; `source-hash-order-certificate.json` verifies every file byte and reproduces both orders. The root zone observer records the repository digest. This is hash ordering, not concurrent source mutation. `all-research.patch` contains the isolated switches and telemetry; `minimal-budget-candidate.patch` contains only the proposed two-bound repair against current accepted source. Its `git apply --check` passed against the clean current baseline. It is also applied alone in `/workspace/physics-budget-clean`; `clean-candidate-certificate.json` confirms exact attained-body equality with the research repair on the frozen native n11 witness. This is an implementation candidate for review, not merge approval.

The final 44-input baseline/repair replays and surface campaign record exact source, script hash, clean environment, command and elapsed time in their runtime JSON. Earlier discovery runs predate inactive instrumentation/branch additions. `summary.json` certifies that the final two native results equal the discovery results after removing elapsed time and added `requestedGait` telemetry. Original discovery outputs remain in `before-final-source/`.

## 1. The two budget defects

The existing feet model computes actual horizontal traction from standing traction and felt contact lift. Translation then uses that allowance. `turnBodyResponse`, however, independently calls `supportParams` and uses standing traction to fund yaw. Consequently a body can turn using traction its feet no longer have.

A declared turning/pad scene provides a simple witness: 111 kg defender, low opposing pads, target turn 1.2 rad, at .25 s. Actual traction is833.638 kg·yd/s²; translation uses833.638 while yaw uses an equivalent1009.849. The simultaneous demand is1.57081 times the actual budget. PR297 has the same defect. Twelve declared pad/turn configurations, in each of baseline and PR297, expose it; passing the actual allowance into the yaw motor bounds the maximum simultaneous ratio to1.0000000000000002.

The separate allocator defect appears when gait and committed lean oppose. The code solves a quadratic for the allowed lean fraction using the original gait, then clips gait independently. The resulting sum is no longer the sum for which the quadratic was solved. A native snapshot makes the zero-budget failure unambiguous: input n11, DE_S, .70 s, requested gait `(585.468,280.753)`, committed lean `(-897.932,226.690)`, actual traction0. Gait becomes zero, but attained force remains `(-483.758,122.128)`, magnitude498.936. No interpretation of a force–velocity curve permits spending a zero traction budget.

The snapshot includes all ordinary World arrays/maps, bodies, joints and active WeakMap attachment entries. Its accepted replay at12 substeps exactly equals the captured post-step bodies. Commands, bodies and controller clock are held fixed in all comparisons:

| Frozen n11 .70 s |12 substeps|24 substeps|48 substeps|
|---|---:|---:|---:|
|Accepted maximum translation excess|498.936|494.515|497.212|
|Accepted maximum translation+yaw excess|830.487|827.917|826.938|
|Yaw-only repair combined excess|498.934|495.138|497.207|
|Both-bound repair combined excess|≤2.3e-13|≤4.6e-13|≤4.6e-13|

Units are kg·yd/s². Combined demand is `hypot(translation force, peak yaw torque / support radius)`, compared to actual traction × availability. Work residuals remain at floating-point scale, no larger than2.6e-12 in these nine runs. Merely increasing physics subdivisions does not remove either defect.

The minimal repair passes the already computed actual traction × availability into the yaw motor and rechecks the attained net gait+lean vector after the existing allocation. Only an excess beyond1e-9 force units triggers its final radial projection; this tolerance avoids rounding-only edits, not football calibration. It scales the component/action accounting consistently and leaves committed support lean subject to the existing release process. It adds no strength, gait acceleration, contact benefit, release rule or outcome target.

This repairs an inconsistency in the engine's own normal-load model. It does not validate the anthropometric pad-height mapping, the1.1 turf coefficient, the lift cap, or the assumption that one scalar traction circle describes an athlete's feet.

## 2. Native transfer and retained opposing cases

The original `physics/native-seed10.json` supplies44 exact constructors, all snap-permitted. The observer wraps the ordinary tick and calls `sim.run()`; it does not pre-tick the simulation. These are current-source replays of retained inputs, not recaptured ordinal plays. World-boundary momentum closes within1.3e-11 across the reported arms.

| Arm, same44 inputs |Plays with a witnessed budget violation|Run-contact pair histories|Pairs with continuous opposed carry≥.5 s|Sum of each qualifying pair's longest interval|
|---|---:|---:|---:|---:|
|Accepted|44/44|266|17|13.45 s|
|Yaw uses actual traction|13/44|269|16|14.50 s|
|Both-bound repair|0/44|269|16|14.50 s|
|PR297 formula|not instrumented in this discovery run|267|13|12.10 s|
|Separate raw muscle + force-axis FV|not instrumented in this discovery run|268|13|12.30 s|

Every counted accepted witness exceeds its bound by at least26.39 force units; the44/44 result is not numerical noise from dividing by a zero allowance. The largest witness is1755.16. For the repair the largest retained numerical excess is6.9e-13. A pair qualifies only while upright, asking for lateral speed magnitude>1 yd/s and achieving opposite lateral speed magnitude>1 yd/s continuously. These are conditional pair-history exposures, not independent plays, prevalence in all football, or measures of blocking success.

The budget repair does not suppress opposed carry generally: n51 RT>DE_S remains1.90 s; n28 Y>DE_S increases1.15→1.45 s; n48 LG>DT_W increases.70→1.20 s. n4 changes which blocker owns the qualifying end contact. Total yards across44 change302.06→359.72. That total is reported to preserve the moved outcome, not to estimate an isolated causal benefit or tune toward a league average. Closed-loop contacts and subsequent decisions diverge.

P019 is retained with its historical seven setting pins (`OL_SPLITS`, `OL_STAGGER`, `FRONT_ALIGN`, `SNAP_REACT`, `PASS_FEEL`, `PASS_KICK`, `ARM_PRESS` all0). The original staged test and a constructor replay through the natural snap/run entry produce the same edge outcomes; these are historical-fixture settings, not the ordinary default population. Accepted physics retains both loaded edge engagements through throw3.10 s. PR297 loses LT at a geometric corner shed2.90 s before throw3.20; raw-muscle variants also expose an RT contact fall. Both-bound repair loses LT before throw3.05. The assertion is not removed or replaced.

P019's loss is not merely a missed engagement flag: in PR297 at2.90 s, LT's projection onto DE_W→QB is−.005 yd, versus+.561 yd accepted, and lateral offset is−.716 versus−.223 yd. The ordinary `abs(phi)>=1` corner condition fires. The same frozen World commands first change PR297 DE_S ground impulse at.55 s; thus physical execution changes before downstream controller divergence. This does not by itself establish whether the revised shed is more realistic. That requires protection/technique evidence, not a requirement that old contact duration survive every coherent mechanical change.

The pursuit-arrival suite supplies a second opposing native pass. After metadata-only sandbox workarounds, accepted source passes all six assertions. Repair has no decision at the suite's fixed4.00 s clock. Replaying the exact baseline constructor (SHA256 `2d1ebbb1deec18faaa6226553353bf299e46d47fbbeb500792de576532cd1782`) explains the censoring: accepted source completes a pass and ends at6.75 s/25.43 yd; repair produces an incompletion at3.70 s. Both throw to the same RB at2.85 s, with no recorded pressure. All eight preserved acquired-cue/free-body pursuit response trials are exactly equal between laws. Therefore this setup failure does not demonstrate a free-locomotion or pursuit-response regression; it retains a separate pass-flight/interaction outcome requiring interpretation. `pursuit-transfer.json` and `pass-transfer-trace.json` preserve the full comparison. A further controlled probe narrows the incompletion: intended target differs by only about .058 yd, but lateral launch speed changes −2.978→−5.133 yd/s. The global generator's four integer state words match at release while its cached normal sample differs. Restoring the baseline RNG state only at the QB's 2.85 s update, while retaining repaired physics and its acquired geometry, restores completion (28.01 yd); restoring only the baseline launch also restores completion (29.30 yd). These are diagnostic counterfactuals, not candidate policies or native acceptance arms. They show that random throw-phase/launch divergence mediates this missing pursuit witness; the incompletion is not a demonstrated defect in repaired ground force or preserved pursuit response.

Root's independent 53-opportunity observer completed the 40 original zone constructors on this frozen repair. All 40 plain-versus-observed own-state graphs and results match exactly (`budget-zone/index.json`, 91.63 s elapsed). A definitive repeat using only the clean candidate (no research switches) also passed all 40 plain/observed comparisons. `budget-zone-clean-certificate.json` verifies that all 40 complete results and complete observer frames are identical to the research variant. The clean repository `sourceVersion()` is `4c39c3636609629fb88ac0482dfaced7cbfdfe34cf77be9aa7e5de3b719b4ea2`; elapsed time was 81.073 s. Root's descriptive 53-job counts are 17 original-target member connections, 15 by its first-contact operator, and 11 jobs whose target later contacts the carrier, versus 16/14/12 in its matching accepted baseline. The added connection is S8-P054 J0 to SS at 3.70 s; it is not a demonstrated useful intervention. Its responsibility/access/contribution categories should be used for combo conclusions. Opposed carry counts above do not substitute for that operator.

## 3. Competing force laws and the broader surface

Seven arms were compared without changing controllers or choosing new favorable fixtures:

|Arm|Translation capacity interpretation|
|---|---|
|baseline|Accepted static shared leg bound; existing lean already has FV|
|pr297|Exact draft formula: signed FV of total ground-demand direction, preclipped pushForce, additional standing-traction clip|
|normal|Same signed demand-axis FV, actual-normal traction as final bound without the extra standing clip|
|muscle|Raw `power*G` rather than already traction-clipped strength, then actual-normal traction|
|load-axis|Raw muscle; FV speed projected against felt load instead of total ground demand|
|shared|Load-axis variant also uses its resulting leg bound in recovery reserve|
|ecc10|Raw muscle, demand-axis FV, eccentric ceiling1.1 rather than1.2|

All retain the calibrated gait floor in the shared capacity. The FV relation is linear `clamp(1-v/vmax,0,eccentric ceiling)`. These forms and ceilings are provisional reduced-model assumptions, not fitted human muscle data. `shared` is an experiment in simultaneous reserve accounting; it does not prove that corrective stepping should share the same velocity coordinate as axial push.

The surface contains73 valid declared scenes per arm: mass80/110/145 kg; strengths.3/.6/1; vmax5/7/9 and initial velocity−3/0/+3; pad combinations.2/.6/.9; contact angles0/.52/1.05 rad and body orientations0/.78/1.57; transverse velocity−3/0/+3; energy.6/1 and initial support deviation0/.12/.4; active/passive doubles; a150 kg strong defender opposing two weak blockers; reflection, rotation, reversed insertion order, subdivisions1/3/6/12/24/48, and six free-movement controls. The finite horizon is2 s with20 Hz unchanged commands. Data are response surfaces, not factorial population samples or empirical ratings calibration.

Six additional rows in the original 79-row surface attempted a turf-coefficient perturbation by editing cached support parameters once. World refreshes those parameters each tick, so that intervention was ineffective. Those rows are explicitly excluded from the73. `traction-surface.ts` replaces only those six declared cases, applying the same coefficient to each fresh cached support record before feet act;42 new runs cover all seven arms. This is a feet-budget sensitivity probe, not a globally changed turf model; yaw is not requested in these six scenes. Do not use the ineffective original rows as evidence of traction invariance. The corrected baseline strength1 defender speed is .126/1.007/2.351 yd/s at coefficients .7/1.1/1.5 respectively; PR297 gives .087/.391/1.071. At coefficient .7, strengths .4 and1 saturate to the same response; at 1.5 they separate. This identifies the genuine traction-limited region.

Selected defender final lateral speeds (yd/s):

|Declared scene|Accepted|PR297|Raw muscle|Load axis|Shared reserve|
|---|---:|---:|---:|---:|---:|
|Base113/.77 vs111/.62|1.007|.391|.490|.490|.490|
|110 kg blocker, strength.3|−2.278|−1.060|−1.060|−1.060|−1.060|
|110 kg blocker, strength1|.725|.283|.448|.448|.448|
|Low blocker/high defender pads|3.034|2.279|2.414|2.414|2.414|
|High blocker/low defender pads|−2.538|−1.651|−1.651|−1.651|−1.651|
|Transverse initial speed3|.742|.315|.366|.345|.345|
|Energy.6/support deviation.4|1.023|.761|.957|.957|.493|
|Strong150 kg defender vs two weak blockers|−3.233|−3.605|−3.782|−3.773|−3.771|

The surfaces reject a universal “increase strength” or “reduce defender carry” prescription. A legitimate double remains strong, and a sufficiently strong defender still defeats the weak double. Raw muscle restores strength differentiation hidden by preclipping, but exposes P019 support losses. Load-axis and force-axis assumptions differ under transverse motion and do not resolve the redirect adverse. Reserve allocation matters under disturbed support but has no measured universal advantage.

All six free-movement trajectories are exactly equal across seven arms, comparing achieved positions, velocities, support states and ground impulses rather than differing telemetry. Across the73 valid scenes per arm, maximum momentum residual is1.32e-12 and work residual4.11e-12; no body finishes off its feet in this declared surface. That finite selection does not certify support across arbitrary impacts. Existing tackle/support assertions provide separate opposing controls.

## 4. Center hands are a distinct confound

Every signed-FV arm fails the center-hand redirect corner: nearest QB≈4.80–4.85 yd and no shed within the original6 s window. All pass its patch-hand counterpart. Changing force direction, raw muscle or eccentric ceiling does not repair that mechanism; further FV tuning to preserve this fixture was stopped.

A reduced intervention gives only tangential hand impulses their common-point yaw arms and rotational effective mass. It does not change the patch model's gait-facing estimate, torso solver, hand aggregation, grasp model or policy. This restores corner turning with baseline and PR297, including mirrored trajectories. The first version used the old uncentered frame: angular momentum error falls from≈10 to≈2e-5 kg·yd²/s at48 substeps but does not close exactly. It is therefore a diagnostic branch, not the coherent final geometry.

The `centered` variant also evaluates the common hand frame at the same centered transport used by the sustained hand force. Its passive two-body angular residual is≤5.7e-14 across1/3/12/48 substeps and both signs; work remains closed. With PR297 it restores the center-hand redirect corner and reaches.923 yd from QB. Full patch is not needed to isolate this effect.

The coherent centered variant is still adverse on P019. Broader44-input transfer was run for the earlier uncentered diagnostic: qualifying pair histories fall17→10 with baseline law and13→9 with PR297, while other native outcomes move substantially. Those counts must not be attributed to the final centered variant or called improved protection. Native P019 and conserved local mechanics support continued common-point research; they do not qualify a new hand default.

Frozen-step controls further distinguish mechanics from online policy. Sixty-four redirect steps and63 P019 steps replay accepted World bodies exactly, including caches, before comparing eight law/hand arms on identical commands. Snapshots containing active grasp attachments were excluded from the old hand snapshot format because that format did not retain WeakMap attachment state. The native budget snapshot uses the corrected full graph and includes attachment entries. None of the mismatched old frozen rows is used as causal evidence.

## 5. Verification, corrections and falsifiers

The focused14-file check set contains155 assertions. After the metadata workaround, accepted physics passes149 non-pursuit assertions plus the separately rerun6 pursuit assertions. Budget repair passes148 non-pursuit assertions, fails retained P019, and the6 pursuit assertions are setup-censored by the earlier incompletion. Frozen pursuit transfer supplies the unchanged response control; it does not turn the skipped suite into six passes. TypeScript `tsc --noEmit` passed. No fixture or football assertion was edited.

The sandbox initially rejects `execFileSync('git')`; the research source scanner also rejects unregistered multivalued research switches. `metadata-helper.patch` reads the detached worktree HEAD directly and records the explicit research switch values. It changes provenance only. Original blocked logs remain, distinct from football failures. A transient missing `force` parameter in the research signature caused an immediate ReferenceError before a completed experiment; its failed logs are retained under `failed-signature-*` and excluded from findings.

The first global `World.prototype.step` adverse observer also recorded forecast preview Worlds. It did not alter the resulting games, but its mixed traces were invalid for direct causal comparisons. Those files remain in `forecast-contaminated-adverse/`; the corrected observer requires `this===active.world`. All20 original versus corrected adverse result records compare exactly in `adverse-observer-equivalence.json`. Final causal traces and snapshots use the corrected observer.

Falsifiers and remaining questions:

- The budget diagnosis would be falsified by a correct simultaneous-force accounting showing that the recorded yaw or leftover lean did not act. The actual velocity/spin updates, exact frozen replay, and closed work ledger rule that explanation out here.
- The minimal repair would fail its mechanical claim if any source-qualified step exceeded actual normal traction beyond rounding, or if free movement changed when actual normal load and attained budgets were unchanged. The44-input replays and declared controls pass; larger unseen contact sets remain untested.
- “Center redirect needs a different FV curve” is contradicted by the minimal common-point intervention with the unchanged PR297 curve. Whether that geometry generalizes requires native held-contact/press/grasp qualification; the P019 adverse is preserved.
- No surface identifies the correct human eccentric ceiling, contraction-speed coordinate, muscle mapping, pad normal-load model or corrective-step capacity. A lower scalar carry count cannot identify those parameters. FV adoption remains unresolved after competition.
- P019 needs football interpretation of altered protection geometry; ordinary P002 needs stochastic launch comparison, now isolated by the RNG/launch controls. Old successful protection is not automatically the correct physical answer; nor is every changed result evidence that a candidate is correct. No unrelated controller or catch policy was altered to restore them.

## 6. Reproduction and cost

Apply `all-research.patch` to an isolated checkout of the accepted SHA, link/install the matching dependencies, and retain the pinned Node. Apply `metadata-helper.patch` only for capture/test provenance in this sandbox. `run.py` launches clean environments; for example:

```sh
python /workspace/run-game-phase2/physics/run.py native baseline
PHYSICS_BUDGET=repair python /workspace/run-game-phase2/physics/run.py native baseline
python /workspace/run-game-phase2/physics/run.py surface
python /workspace/run-game-phase2/physics/run.py traction-surface
PHYSICS_HAND=centered python /workspace/run-game-phase2/physics/run.py angular baseline
```

Scripts currently import `/workspace/physics-phase2` explicitly so the intended engine cannot silently resolve to the legacy checkout. Repoint those imports together if reproducing elsewhere. `budget-native.ts` captures the two retained native witnesses; `budget-frozen.ts` performs nine one-step refinement comparisons. `frozen.ts` reads saved adverse World snapshots, not new game inputs. `pursuit-transfer.ts` captures only a bounded two-step ordinary prefix, then freezes the baseline constructor and acquired cues. `analyze.py` produces `summary.json`; `figures/budget.py` produces PNG/SVG.

The decisive final44-input baseline/repair run costs19.61/23.38 elapsed seconds; all seven final79-row surface arms cost≈12.34 s, and the repaired surface2.50 s. The corrected42 traction sensitivity runs cost≈6.33 s. These are host/load-dependent elapsed costs, not engine speed benchmarks. Runtime JSON preserves commands and per-arm measurements. No complete game, scorecard or league simulation was run in this lane.

Explicit44-input campaigns, including discovery, telemetry refinement and final-source confirmation, comprise11×44=484 native replay executions of44 unique constructor inputs. The two budget witnesses add2 replays of already included inputs. P019/redirect are declared historical/staged scenario executions and are counted separately; repeated observations and source confirmation are not independent data. Test-internal bounded captures and pursuit controls add executions outside that484 count; their logs and scripts are retained rather than presented as another population sample. Final causal frozen-step evidence contains127 valid source steps ×8 arms, plus9 native budget refinement probes. Failed or forecast-contaminated preliminary probes are excluded.

The useful next implementation unit is the minimal two-budget patch with this adverse evidence attached. It should be reviewed as an internal force-accounting correction, followed by the root's responsibility/access operator and explicit pass interpretation. It should not be bundled with FV calibration, hand-geometry promotion or combo release policy changes.


Independent opportunity peer review is in `opportunity-peer-review.md`. It verifies the historical 16/10/27 factual partition, but finds that one of the two unloaded reach positives (S9-P062 J1) deliberately retargets from LB_W to LB_M on acquired threat evidence and then blocks LB_M. The other (S7-P070 J0) has a real zero-command/departure obstruction, yet its hindsight unloaded endpoint is marginal and rearward and its target only assists a later tackle. Neither is presently a demonstrated missed useful block.
