# Keep the taught coverage until the defender recognizes the throw

**A repeated information/technique error is repaired. Broad YAC realism remains
unfinished.** This candidate preserves the installed man technique during the
existing throw-recognition interval. It does not tune an arrival gate, increase
defensive capability or resume the rejected late assigned-man variants.

## The broader football diagnosis

P045 exposed several different problems, which need different evidence:

| Problem | Other situations where it matters | What good football requires |
| --- | --- | --- |
| Losing the current technique at a hidden phase change | Press and off-man, outside leverage, trail with deep help, a safety carrying over the top, late match assignments | Continue the taught relationship until acquired evidence justifies a new task. A receiver's plant can change the request; an unseen release cannot. |
| Changing between cushion management, a ball landmark and receiver tracking | Verticals, curl/comeback, out/dig, crossers and an out-of-phase defender after a throw | Protect the credible deep threat, pay real turning/braking costs, and choose an attainable interception relationship. Extra speed or a smaller field-x gap alone does not establish better leverage. |
| Treating nominal help as available containment | A seam occupying the safety, switch releases, a departing helper, an actual free rally defender after a miss | Preserve each installed responsibility. Support needs a plausible lane and arrival, rather than duplicating the first defender's losing angle or abandoning another vertical. |
| Treating every explosive as a weak-grip failure | No-contact escapes, marginal rear reaches, ordinary successful rear tackles | Separate approach, acquisition, first solved load, slip and runner recovery. P045 has no receiver contact and cannot diagnose a grip law. |

These are different mechanisms, not a measured frequency ranking on current
develop. Current source and native evidence support the first repair now. The
remaining priorities and discriminating scenarios are below.

The coaching contract has independent support. Clayton Cason's [USA Football
quarters clinic](https://blogs.usafootball.com/blog/7382/college-coach-details-quarters-coverage)
(2019, retrieved successfully 2026-10-15) distinguishes eyes on the assigned
receiver in man/match from eyes on the QB in zone/match, and hip-pocket man
coverage from top-down zone technique. Its exchanges are installed rules,
not knowledge of a private route. [Our mechanics manuscript, sections 11–16](../references/WR_DB_Mechanics_Textbook.md)
explains the corresponding cushion, phase, plant and support tradeoffs. The
manuscript is a teaching reference, not an NFL measurement or a universal
installation. The correction preserves whatever technique was actually taught;
it does not impose one clinic's coverage rules on all calls.

Existing NFL tracking comparisons constrain separation and achieved approach;
they cannot reveal gaze, the intended assignment or grip force. The October 11
review is historical. Neither that review nor these nine selected inputs
establishes today's mean/p90 YAC or a population-wide causal share. No new NFL
query, restoration or calibration pipeline was started.

## The repeated incorrect decision

`ManCoverage.update` entered `playBall` immediately on `ball.kind === 'air'`.
Before `sawThrow` succeeded, that helper substituted generic inside-shade
tracking. It discarded press/off cushion, outside/head leverage, trail/over-top
options, facing, tracking gain and the existing bounded route-observation
history. The comment said to keep doing the same job; the actual request changed.

Saved accepted-source tapes show this interval in several unrelated encounters:

| Existing case | Unrecognized-flight man request ticks | Defender/receiver pairs |
| --- | ---: | ---: |
| P006 ordinary successful tackle | 16 | 2 |
| Current-source P010 ordinary successful tackle | 15 | 2 |
| P045 Quarters | 15 | 2 |
| Separate Y-Cross players/play | 36 | 5 |
| Separate Levels players/play | 35 | 5 |
| Separate Smash/man players/play | 38 | 5 |

These are exposure counts, not improvement counts. In P045, H2-CB2/CB_W
marks A2-WR1/X with outside leverage; H2-S2/FS's current job carries the same
receiver over the top. During 2.25–2.60 the corner's unaware-flight request
discards its technique. This does not establish that the safety's earlier
choice of help was correct or excuse abandoning #2's vertical threat.

The minimal correction adds a lazy continuation to `playBall`, supplied only
by `ManCoverage`. When existing throw recognition fails, it executes exactly
the existing man path, including response to acquired plants and normal run/
blocking evidence. When recognition succeeds, all ball/window contest branches
are unchanged. Generic callers keep their previous fallback. The callback runs
once; no second recognition query, sensing opportunity, random draw, timer,
route oracle or physical capability is introduced.

Counterfactual checks hold the body, history and acquired receiver picture
fixed while changing held versus unrecognized airborne reality. Requests and
achieved World movement must agree across inside, outside, head-up, press,
trail and over-top techniques. A genuinely acquired plant still changes the
request, while later hidden motion/facing/intended target do not. A recognized
attainable ball still takes priority. Seven of those eight checks fail on the
accepted source; the recognized-contest control already passes. All eight
pass on the candidate.

## Native results, including costs to the defense

Seven accepted baseline cases were reused. Two untouched generated player
pairs were declared before outcomes: Four Verticals against 2-Man trail and
mirrored Comebacks against off-man. Native recorded/plain executions match
on every case; the recorder is behavior-neutral. All nine plays finish.

| Case | Accepted result | Candidate result | Football interpretation |
| --- | --- | --- | --- |
| P006 | Tackle, -.079 YAC | Tackle, -.039 YAC | First contact3.35→3.55s; catch gap1.988→2.462yd. A real approach cost remains. |
| Current P010 | Tackle, .323 YAC | Tackle, .356 YAC | Catch/contact timing retained; small geometry/ending changes. Historical P010's interception is not the current result. |
| P045 | TD,49.504 YAC | TD,49.504 YAC | CB catch gap2.485→2.734yd, speed7.553→7.761yd/s, heading difference2.04→.30degrees. Still no receiver contact. |
| Separate Y-Cross | Tackle,15.197 YAC | Tackle,13.057 YAC | Same FS acquires at5.55→5.40s. This is not the previous plain-retention trial's identical-entry execution-draw result. |
| Separate Levels | Tackle, .237 YAC | Tackle, .322 YAC | Contact3.65→4.05s. A nearly stationary receiver makes along-route coordinates unreliable; retain raw positions/velocities. |
| Separate Smash/man | Tackle,4.406 YAC | Tackle,5.652 YAC | Original first defender misses; FS becomes first tackler. Material adverse acquisition change retained. |
| Mirrored boundary Y-Cross | Sack | Same sack | Unaffected opposing control; neither a zero-YAC catch nor an out-of-bounds ending. |
| Untouched vertical/trail | Tackle,6.78498 YAC | Tackle,6.78350 YAC | Same contact and finish times; available offense and successful tackle survive. |
| Untouched comeback/off | Incomplete | Incomplete | Opposing plant/drive context survives; not a completed-YAC observation. |

This is not a universal geometry gain. P006 illustrates why the old result
cannot be preserved by restoring hidden knowledge: at 1.70 its NB requests
(3.638,8.326)yd/s; at the unseen 1.75 release the old request jumps to
(1.642,7.575), while continuity requests (3.329,8.629). The next acquired heading
change clears `routeRead`; the old fallback froze that history. The corrected
body is farther forward at catch and makes contact later. The quality of the
retained press target needs separate work, not a hidden-release exception.

Smash is the material adverse control. Actual receiver is **F2O-WR3/H/index10**;
original first defender is **F2D-CB4/SS/index21**, with **F2D-S4/FS/index20**
supporting. At catch 2.85 the SS is slightly closer (1.708→1.670yd) but a little
slower (3.166→3.100yd/s). By3.30 it trails1.144yd versus1.011 in baseline;
the runner's post-catch velocity also differs. Baseline SS acquires at 3.30 and
carries solved load afterward. Candidate SS misses at 3.55, FS acquires at 3.65,
and SS assists at 4.10. FS's catch state is identical across arms; by 3.65 its
gap is1.163 versus1.623yd as it rallies to a different runner trajectory.
This is an approach/acquisition and execution change, not a failed hold on
identical entry geometry. Do not credit or blame the unchanged grip law for
the whole 1.245yd difference. Saved contact/load/slip histories and identities
remain in the evidence; no extra simulation is needed to establish this limit.

The improvement is specific: an unobserved throw no longer changes the taught
man request, its interpretation history or achievable movement. The adverse
football changes expose costs of those existing targets and subsequent
decisions. They are not erased, tuned away or presented as population benefits.

## What should be worked on next

| Priority / boundary | Evidence and smallest useful question |
| --- | --- |
| Retained man target and cushion-to-turn objective | Current P006/Smash/P045 costs remain. Contrast a common observed stem continuing vertically versus an acquired plant/comeback, measuring achieved position, velocity and leverage together. Review the objective before another forecast/arrival variant; prior P045 variants remain rejected. |
| Crosser leverage and fast bending routes | Source audit identifies two separate risks: `sign(ballY-receiver.y)` flips the requested man shoulder at the original ball stripe; deep-zone turn-and-run ends when field-x velocity drops below3 even if lateral speed remains high. These need acquired crosser/bend versus genuine stop controls. They are plausible code defects, not newly measured native frequencies or fixes in this PR. |
| Help and secondary containment | Use an actually free second defender and a competing vertical as opposing controls. P045 cannot require FS to rescue X while neglecting #2. Preserve the historical distant/departing/short-wall roof witnesses, but establish current occurrence before changing help policy. |
| Contact entry and load | Use ordinary successful rear tackles against matched marginal entries. Preserve no-contact separately. Controller acquisition choices can be reviewed here; grip/solver laws remain with Physics. |

`CoverageJudgment` also independently freezes overrides on global airborne
state. This candidate does not repair that upstream information boundary.
Existing recognition still approximates visibility through facing and reaction
time; it is not a full gaze/occlusion model. These limitations prevent claiming
global awareness is repaired.

**Ready for isolated information-contract review; not a YAC calibration or
automatic merge.** A second read-only controller review found no contract
blocker, including the adverse controls. Integration owns the exact combined
verification before integration. Do not import the archived assigned-man,
helper, roster, contact or broader experimental stacks.

## Exact source and reproduction

Base fetched develop: `7d1451b2c31786e075550183a6a93bbda23da29b`, documentation-only
after accepted runtime `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`. The explicit
`git fetch origin develop` result is `FETCH_HEAD`; this checkout's narrow fetch
mapping does not refresh `origin/develop`. Source before modification:
`2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad`.
Candidate source:
`d41b6b19e84846ff7c2a2af00fefe1aaef88935ce01b59db785112d7f7384aa2`.

Checkpoint: accepted develop advanced to
`4679a3c260188143bcc66f6f20534327c78d7eaa` through user-authorized [#72](https://github.com/tannerthardy/football-simulation-/pull/72).
The merge changes free pass-cutoff requests and their reviewed tests, not these
coverage functions. Initial evidence above stays pinned to its original source.
The ledger in that merge still names 7d1451b, but #72's explicit acceptance and
merge receipt establish 4679a3c as the new accepted runtime. Current-source
reconciliation/transfer is recorded separately below; no initial receipt is
relabeled or invalidated by a source change.

All 44 accepted flags/components=1, ordinary World defaults and capacities are
fixed. Node 22.23.3/Linux x64, lock, inputs, collectors, source/test fingerprints
and exact commands are retained in the receipts and comparison packet. The
native collector records consumed pictures and requests passively; queries
cannot add perception snapshots. Large tapes remain ignored under `out/`.

```sh
export PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH
npm run baseline:run -- --candidate -- npx vitest run --project core test/man-throw-recognition.test.ts test/catch-phase-control.test.ts test/catch-reach.test.ts test/coverage-mechanics.test.ts test/coverage-rules.test.ts
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs flight data/reviews/current/p045-defensive-inputs.json out/your-review/selected.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs transfer data/reviews/current/man-recognition-fresh-inputs.json out/your-review/untouched.json.gz
```

The reused four-case fixture is available without regeneration at
`f5db48929b28bc914e53bce39eb530bdd469d3e9:data/reviews/current/p045-assigned-man-fresh-inputs.json`.
Replay at the exact accepted/candidate source for native reproduction. The
saved-data comparator consumes paired tapes and performs no World steps.

**44 focused checks and typecheck pass.** The initial test fixture mistakenly
assigned a read-only carrier getter and failed setup; that harness error was
corrected before the seven meaningful accepted-source failures above. Both
failed receipts are preserved, not counted as passing evidence.

New native work is **22 executions**: nine candidate cases and two untouched
baseline cases, each recorded/plain. Seven compatible accepted baseline cases
are reused. Launcher commands total **37.385 seconds**, including failed
fixtures/red checks, focused green checks, typecheck, native collection and
the saved-data comparison. Untimed read-only inspection and fixture construction
are separate. Zero full suites, new game prefixes, full games or NFL queries.

[Compact comparison](../../data/reviews/current/man-recognition-comparison.json)
retains exact first-fork cues/requests, achieved vectors, receiver-relative
leverage, contact/grasp identity, load/survival and subsequent FS/SS geometry.
SHA256: `4d89d18c98ed194769b4ad3bb641105d1077f01a6f31bb1cbcf6bc1bf2549b9b`.
The [receipts](../../data/reviews/current/man-recognition-receipts.json) preserve
every launcher command/settings/input fingerprint, exit status and runtime.

```sh
npm run baseline:run -- --candidate -- python3 scripts/diag/man-recognition-review.py \
  --pair out/p045-assigned-man/accepted-native.json.gz out/man-recognition/selected-candidate.json.gz \
  --pair out/p045-assigned-man/fresh-accepted-native.json.gz out/man-recognition/reused-transfer-candidate.json.gz \
  --pair out/man-recognition/untouched-baseline.json.gz out/man-recognition/untouched-candidate.json.gz \
  --out out/your-review/comparison.json
```

## Current accepted-source checkpoint

Accepted #72 was merged normally into this research branch. Both workboard
claims are preserved; there is no production conflict. The only owned runtime
diff against `4679a3c260188143bcc66f6f20534327c78d7eaa` remains the 14-line man
continuation extraction/callback. Accepted PassProtector code is byte-identical.

Exact tested merge candidate: `d81cdbaae6784658b1e6306ca6b64e6f3bb74c8a`.
Current accepted engine SHA256:
`1822455c3fdf15aecfd362fd01d54c80a2e1f7e12c97b0a2d9b611141adba4a7`.
Current candidate engine SHA256:
`c237b8c9764f41a1bc54b25b7cd276ace665ac56e44ef0373ee41d52b599b051`.
The subsequent publication only changes documentation/measurement handling;
it does not change the tested engine or direct tests.

All eight direct recognition/World contracts pass on this combined source.
The two fixed transfer inputs were compared afresh on unchanged current
accepted source and candidate, recorded/plain in each arm:

| Current-source case | Accepted | Candidate | Interpretation |
| --- | --- | --- | --- |
| Untouched vertical/trail | Tackle,7.154575 YAC | Tackle,7.154956 YAC | Five man defenders actively exercise unrecognized-flight continuity; same incoming bodies at the first fork. Valid offense and tackle retained. |
| Untouched comeback/off | Sack | Identical native signature/sack | No throw, no actual catcher and no YAC. This is an unaffected opposing control, not current native plant transfer. The acquired-plant World/controller contract passes separately. |

No replacement was selected to manufacture an active or favorable ending.
The older incomplete comeback and all nine original-source cases retain their
own source-specific meaning. Initial 44 checks/typecheck remain initial-source
evidence; no exact combined full-suite pass is claimed for this candidate.
Integration remains the designated combined-verification owner.

[Current comparison](../../data/reviews/current/man-recognition-current-comparison.json)
SHA256: `4db2c88fa4fb15207eef25ef1bb57358bc23a013150507d6b854a7872a6b3b7c`.
[Checkpoint receipts](../../data/reviews/current/man-recognition-current-receipts.json)
record eight additional native executions and 9.680 additional launcher seconds.
**Task total: 30 new native executions; 47.065 launcher seconds.**

Two saved-data collector attempts failed on the sack's terminal tick: controller
requests existed but no World step ran. The final operator verifies the matched
requests/cues exactly and explicitly records that unstepped tick instead of
inventing body movement. A differing unstepped request still fails for missing
incoming-body evidence. Those failed receipts are preserved; no engine/native
rerun or relaxed comparison of differing data was used to resolve the issue.

```sh
npm run baseline:run -- --candidate -- python3 scripts/diag/man-recognition-review.py \
  --baseline-source 1822455c3fdf15aecfd362fd01d54c80a2e1f7e12c97b0a2d9b611141adba4a7 \
  --candidate-source c237b8c9764f41a1bc54b25b7cd276ace665ac56e44ef0373ee41d52b599b051 \
  --pair out/man-recognition/current-baseline.json.gz out/man-recognition/current-candidate.json.gz \
  --out out/your-review/current-comparison.json
```
