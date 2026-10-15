# Shared integration queue

Updated **2026-10-15 (America/Phoenix)**. Integration in this chat owns queue
triage, exact combined verification and publication. This page is the canonical
accepted-reference and readiness record; [STATUS](STATUS.md) is a signpost and
[WORKBOARD](WORKBOARD.md) records edit boundaries. The [detailed issue register](ISSUES.md)
retains individual mechanisms, adverse evidence and return conditions. Earlier
stages remain below.

<a id="accepted-development"></a>
## Accepted development reference

**`develop@7d1451b2c31786e075550183a6a93bbda23da29b`** is the accepted shared tree after
user-authorized documentation-only [#65](https://github.com/tannerthardy/football-simulation-/pull/65).
[Actual merge and acceptance](https://github.com/tannerthardy/football-simulation-/pull/65#issuecomment-6201484981)
and [protection receipt](../data/reviews/current/pr65-adoption-merged.json)
pin the actual publication. Its entire tree equals reviewed #65 head
`679e96f73e4e13a87dd2355dabeed83ce9cdfef6`; protected runtime/tests/settings
and prior receipts are byte-identical to accepted #63 merge `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`.
#65 imports no runtime candidate. #63's verified source remains implemented. The prior [#12](https://github.com/tannerthardy/football-simulation-/pull/12) run-contact components and moving-catch repair
remain included. **Historical comparison remains
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`.** GitHub's default branch is not a
substitute for the accepted pin; no default or historical-profile change occurs.

The accepted source was tested at `a862a05713d0b8bbd22683ce8a70d5ac16eb18e2`:
**1,720 TS / 145 Python checks, typecheck/build pass**.
[Exact combined receipt](../data/reviews/current/departed-center-integration/receipt.json)
and [merge compatibility receipt](../data/reviews/current/pr63-merge.json) are
reused unchanged: source, tests/tooling/settings, 44 flags and artifact hashes
match. Zero new runtime tests or simulations were needed for the merge.
The [earlier #12 receipt](../data/reviews/current/controller-combined-verification.json)
remains historical evidence.
Use Node 22.23.3 and the accepted 44-flag profile/components=1, existing center /
centered hands and legacy/mean support. No experimental default promotion.

The snapshot's [full pins and dependencies](../data/reviews/current/integration-queue.json)
are an audit of this update, not another accepted reference. Recheck mutable
refs and PR review state before acting. An unaccepted remote push does not
silently become approval; investigate a disagreement with this ledger.

<a id="ready-blocked-experimental"></a>
## Ready, blocked and experimental

| State | Exact candidate / evidence | Remaining decision, dependency and owner |
| --- | --- | --- |
| **Accepted and merged** | [#63](https://github.com/tannerthardy/football-simulation-/pull/63), develop `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`; publication `0f70bb2a4205497d7df8ed1ed59391d87084c603`, tested `a862a05713d0b8bbd22683ce8a70d5ac16eb18e2` | Explicit user acceptance/merge authority; [controller approval](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200453995) retained. Actual merged tree equals the verified publication. No further acceptance gate or rerun for this unchanged runtime. |
| **Independent review/extraction** | #13 `d5447c274e63952c023a171b177a1bd79aa72d6b`; #29 `b8e4d86866a9880c59e2e3f0809114b7667c058b` | Run Game/Integration: review the minimal actual controller corrections against accepted develop, preserving source-specific evidence. Neither is accepted merely because #54/#34 included it. |
| **Gap accepted via #63** | `codex/departed-center-gap@132c27a8f1d9ce9a4366b92f0ede0df42a0dac52`; implementation `d63bf4504e1a17e2f6a32738009a532838fc5e20`, evidence `92566b3b650bb2e855487cbf1eae6a2dbf60918b` | Integration verified the three extracted files byte-identical. Nine author focused passes reused; the original `73b9441` / `badddf4` history remains. No earlier zone/Duo dependency. Do not queue the same fix twice. |
| **Minimal extractions accepted via #63** | #57 `1f11e4546bc75ed6c5d139d3ac75fd09d214eb51`; #58 `f597cec3983e73ac5538f1f68a1ef7db4c49fa43`; #60 `987056fe5b6dec61d8377834c5b277600685cbcd`; #61 `351dcff82b96713b5abbc7602d9a051567d1b00a` | Existing riding mesh satisfies #57; exclude its #54 ancestry. #58 and #61 are independent. #60's final-stat and #61's sensing hunks do not overlap. #58's latest update is docs-only. Their bounded extracted scope is now accepted in develop. Original PR/branch stacks remain; this does not merge their complete ancestry. |
| **Blocked coverage** | [#34](https://github.com/tannerthardy/football-simulation-/pull/34) `306579fda9d496d45606445fd542239cf2f5acf4`, tested `cb240d236b3b5bbc13c855dab251fdf986a3ae77` | Pass Game/Pursuit owner: resolve the supported seam-gap expectation (`coverage-panel.test.ts:75`) and native-scramble fixture precondition (`qb-rusher-recording.test.ts:55`). 1,698 pass / two failures; Python skipped. Explanations have not cleared either contract. Do not rerun unchanged source. |
| **Held awareness promotion** | [#36](https://github.com/tannerthardy/football-simulation-/pull/36) `68284671d062dfd4e7e879bcd037bc21dad3e3ac`, engine/test `98411ef025dcaa3d024e430e1215eec81b13af1e` | Run Game + Awareness: review real rear teammate collision and bounded post-mesh coordination; honest information alone does not establish safe action. Experimental #41/#45/#47/#50/#52 dependencies need their own review. Not needed by #63. |
| **Full navigation trial held; prior rejection preserved** | `codex/run-entry-cues`: candidate `7f9d9a4b2e40946129281ae382c8483f717e8c5d`, evidence `4ee0e2cdc8480f271fc3d8e9178f6abd949b3f9e`; clarification `3246009b951b28912599bb6ef93b4141505c0fc8`, handoff tip `f5618d09f8a25e230217a5a0661098d15eeb5e9b` | Do-It-All! owns achievable approach and teammate-picture uncertainty. The original rejected result remains pinned: contact delays 2.55→2.90s but creates a 69.81 kg·yd/s RB/RG impact with .005 yd forecast clearance. Latest author review says collision alone is insufficient for rejection; private-state removal is independently justified, complete navigation improvement still held. No runtime import; no strength/vision/pass-pro/physics change. |
| **Separate navigation benefit unproved; owner seam approved** | `codex/run-entry-admission@75dbf46b12a4d186a7da6ebc463b9fba228f0b50`; information `f8ce858adf7a3859b10307520000f4eb3172d344`, approach `cfcb7db0ba17c978fd02fb179c61f4e8b1d66752`, tested `fd655f10ec67125e945aba473b952f08f67b71a9` | Do-It-All! supplies bounded approach evidence (40 checks/typecheck; P019 unchanged, P032 censored at3s). It directly calls/types `teammateInformation` / `TeammatePicture`, absent from accepted develop. [Proposed observation-only extraction](https://github.com/tannerthardy/football-simulation-/tree/94eb22aa396a8a0d5db7338add13437ce1007bf3/docs/reviews/run-entry-awareness-extraction) remains a separately reviewed proposal: after the .30s prediction cap, zero estimated velocity means unknown current motion, not stationary clearance. [Awareness approval](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6201016808) clears the existing-schema unknown/unsupported contract and observation-only staging scope. Do-It-All! owns consumer adaptation and current football-benefit proof; Integration owns composition. The original75dbf46 picture does not certify clear admission under corrected unknown semantics. Do not merge recorded ancestry or add live-state fallback. |
| **Active pass diagnosis / contract question** | [#64](https://github.com/tannerthardy/football-simulation-/pull/64) `db77674b0e2493017d8778c5cdc5dd1420e68002`, diagnostic `eba1b61756d7a85b3b8c39dc73196244e7eef719` | Run Game/pass-protection owner: P040 forecast improves in one trial but loses P019's useful edge control; both trials rejected. #67 is a separately reviewable free-approach candidate; the loaded foot-objective algebra remains an owner question, not a proven defect. Experimental #57/#54 host is explicit; do not import ancestry. |
| **Current physics candidate held** | [#66](https://github.com/tannerthardy/football-simulation-/pull/66) `29b00905edee16f00651317364b729c1b377eb5b`; Run adjudication evidence `4f90b6428b98224774bbd63a4adad6bb3e354b53` | [Run-owner adjudication](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200709352) identifies mirrored missed feasible collection and unsupported compulsory-climb expectations; no runtime/assertion was changed. Hold promotion for collection dependency. Integration still owns two center-history compatibility questions after reconciling accepted #63. Preserve seven original failures and yaw force-selection sensitivity/accuracy limits; no new suite/default promotion here. |
| **Verified isolated candidate; merge approval pending** | [#72 isolated integration](https://github.com/tannerthardy/football-simulation-/pull/72) of [#67](https://github.com/tannerthardy/football-simulation-/pull/67), tested `64177487272b7e0b2d51460e23ccdb6447508e39` on accepted develop7d1451b; [final receipt](https://github.com/tannerthardy/football-simulation-/blob/167547807a23052e04af2199104fc16b9850a501/data/reviews/current/pass-cutoff-integration/final-receipt.json), [scope and adverse evidence](https://github.com/tannerthardy/football-simulation-/blob/167547807a23052e04af2199104fc16b9850a501/docs/reviews/pass-cutoff-integration.md) | User accepted [Run adjudication](https://github.com/tannerthardy/football-simulation-/pull/67#issuecomment-6201827323); approved coverage-job filter applied. **1,724 TS/144 files,145 Python,typecheck/build pass**,44 flags/components=1,no skips/input drift;200.234s. Recommend only the isolated extraction, never original #64/#57/#54 ancestry. Native RT/RG/LT losses, C/LG traffic, forecast/contact limits and the earlier failed receipt remain. #69 and experimental physics excluded. Explicit merge authority remains required; no rerun for this unchanged candidate. |
| **Queued independent controller review** | [#69](https://github.com/tannerthardy/football-simulation-/pull/69), head `a159f82d4821f03082e5a110c190a5ef1396df60`, runtime/test `3b4ea698819074640626a215bf2f06af2735f25a`, evidence `bb430b1b2a801b5221e622f7f950d59bc8d8084f`, source `f22dc431da3e62d1b94a5b156835282b111c4bab2aebf9bfba10f64b4a464a67` | [Scoped review handoff](https://github.com/tannerthardy/football-simulation-/pull/69#issuecomment-6201486238). Independent controller reviewer / Do-It-All! boundary owner: acquired lost-owner cue, first-strike surface, achievable approach/braking, mirrored and obstructed controls, explicit force/reach/support contract. Reported63 focused checks/typecheck are contributor evidence, not combined acceptance. Actual base8c891f4 is byte-compatible with docs-only accepted7d1451b. No #67, entry-admission or #66 physics dependency; no new suite merely to queue. |
| **Owner disposition requested; remain open** | #4, #41, #51, #55, #56 | Handover owner, Awareness and Primary Physics must clarify live objective versus parked research. Requests are linked in the cleanup receipt. No need to finish experiments or run tests to answer. Legacy #1/#2 stay open for their separate owner/reference decisions. |
| **Closed research / preserved experimental branches** | [#54](https://github.com/tannerthardy/football-simulation-/pull/54) `4ae667e29b3ce085f43c5cb911b294349cda2b8f`; earlier zone/Duo `6122fb03c7104c0f9d762591d737cf2cf6a49067`; [#62](https://github.com/tannerthardy/football-simulation-/pull/62) `1f071b9568f3fcc790aff71ddf5ea032cca5cf16` | PR #54/#62 are closed as completed/parked records; every branch/film/receipt remains. #62's historical patch host is parked; primary Physics owns any independently reviewable current-develop contact-law extraction. No hands/grip/helper/turn package or experimental setting is enabled by this queue. |


Latest decisions: #65 is merged; accepted develop remains the full7d1451b pin
above. User accepted Run's #67 adjudication and approved final verification.
The isolated candidate now passes all four phases; the final receipt supports
a bounded merge recommendation, **not merge authorization**. No additional
simulation campaign or unchanged-suite rerun is justified. #69 remains queued
independently. The [earlier two-gate HOLD review](../data/reviews/current/pass-cutoff-independent-review.json)
and failed full receipt remain historical evidence, not the current decision.

#63's [shared receipt](https://github.com/tannerthardy/football-simulation-/blob/0f70bb2a4205497d7df8ed1ed59391d87084c603/data/reviews/current/departed-center-integration/receipt.json)
records **1,720 TS / 145 Python checks, typecheck/build pass**, source
`2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad`,
validation `bd503123ac660bf6e07e061dd5d74e832309390187aa822b5d6289cb1dfbc495`.
Final pass 200.945s; all recorded validation commands 427.975s, including failed
freezes and diagnostics. No extra game/roster campaign; preserved suite game
assertions did execute. The P069 source-specific golden and zone-key failure
remain visible. [Contract review, adverse results, limits and portable patches](https://github.com/tannerthardy/football-simulation-/blob/0f70bb2a4205497d7df8ed1ed59391d87084c603/docs/INTEGRATION.md#current-candidate-2026-10-15).

The entry trial is not the earlier portable gap correction. Its original
[rejected evidence](https://github.com/tannerthardy/football-simulation-/blob/4ee0e2cdc8480f271fc3d8e9178f6abd949b3f9e/docs/reviews/run-entry-cues/README.md)
reports 43 compatible focused passes and 8.04s native continuation, 25 prefix
scrimmages, zero completed games. These costs/results are reused, not rerun.
The [latest clarification](https://github.com/tannerthardy/football-simulation-/blob/3246009b951b28912599bb6ef93b4141505c0fc8/docs/reviews/run-entry-cues/README.md)
changes no runtime: removing hidden engagement/fatigue/down shortcuts has an
independent information contract. It does not establish attainable safe entry.
The original full trial stays out of this pass; an information-only promotion
needs its own explicit scope/review. Do not use a collision or yardage alone
as an automatic regression verdict, or combine the clarification with gap approval.
The newer [entry-admission report](https://github.com/tannerthardy/football-simulation-/blob/75dbf46b12a4d186a7da6ebc463b9fba228f0b50/docs/reviews/run-entry-admission/README.md)
keeps its information extraction separate. It admits achievable moving approaches
before ranking destinations, with 0.15s gather/no teammate impact through3s on
P032 and the complete P019 opposing result retained. Its native outcomes are
measured on recorded host `f62511a`, not accepted develop; P032 is censored, not
a new completed-run improvement. Source calls confirm the owned-information
interface is a real dependency. No new native run or shared suite is justified
while that host/review decision remains unresolved.

<a id="pr-dispositions"></a>
## Bounded PR cleanup — 2026-10-15

**43 PRs closed; 65 initially open → 23 open after new #67 arrived.**
The pass classified all 66 initial PRs and recorded #67 separately. This is a
bookkeeping decision, not simulation-code or scientific revalidation.
**All 106 starting branches remain; a worker added one, yielding 107.**
Develop, historical comparison, default branch, genuine stack bases, source,
tests, settings, dependency files and existing receipts are unchanged. No
merge, branch deletion, force-push, history rewrite or cleanup of local outputs.

| Closed disposition | PRs | Preservation / successor |
| --- | --- | --- |
| Incorporated / adoption complete | #6, #8, #9, #10 | #6 ancestry and exact #8/develop identity verified; #9/#10 component files match accepted #12. Excluded handover ancestry is not claimed included. |
| Superseded review/documentation vehicles | #17, #24, #37, #49 | #66, #29 and current #65/#63 are explicit successors, not blanket production acceptance. Existing master issue content is retained here in ISSUES. |
| Completed diagnostic/reference/audit | #5, #11, #14, #18, #22, #23, #26, #30, #35, #39, #42, #44, #54, #59 | Immutable reports, shared references, film, adverse results and next-owner questions remain linked. Branches remain available to active children. |
| Completed numerical milestones / rejected strategies | #3, #7, #15, #16, #19, #20, #21, #25, #31, #33, #38, #40, #43, #46, #48 | Each named successor retains the next bounded objective. Original cost/accuracy/fallback failures are not relabeled passing. |
| Parked/rejected controller research | #27, #28, #32, #45, #53, #62 | Preserve original trials; return only for the recorded decision-changing mechanism/host. No implicit promotion from a closed PR. |

[Exact disposition/evidence/successor and preservation receipt](../data/reviews/current/pr-queue-cleanup.json)
records every PR head/base/branch, all 43 durable closure comments, source
incorporation checks, unchanged child bases and owner requests. Closing a PR
retains its branch and committed files; reopen the same PR if its objective
becomes active again. Do not create another PR for another run/receipt of the
same candidate. A genuinely independent review/integration boundary can have
its own PR (#67's runtime correction versus #64's diagnosis, for example).

Subsequent integration event: #63 is now accepted and merged under explicit
user authority; the cleanup counts above remain their dated snapshot. This is
not a new PR-closure batch. #66/#67 and awareness/coverage blockers stay independent.
No new simulation or full-suite run was performed for cleanup or the unchanged merge.

<a id="agent-workflow"></a>
## Agent workflow: stay current without stopping useful work

1. **Start:** read [AGENTS](../AGENTS.md), [CLAUDE](../CLAUDE.md) and the top of
   this ledger. Fetch `origin develop`, compare its full SHA with the accepted
   pin above, record HEAD and a clean/dirty worktree status. In a new task use
   an isolated branch/worktree from the accepted commit; do not start from
   GitHub's old default, historical comparison or an arbitrary experiment.
2. **Claim a narrow boundary:** name the owner, files/functions and question
   in [WORKBOARD](WORKBOARD.md). Another PR is a dependency only when its code
   or contract is required. Shared-file edits can be independent; coordinate
   overlapping functions and behavior assumptions, not whole subsystems.
3. **Keep ongoing work:** commit/push coherent checkpoints on the owner's
   branch. At task start, before extending the affected mechanism and before
   handing it off, check accepted changes since the recorded base. Reconcile
   at a clean checkpoint when they affect the task; no universal rebase after
   every merge. A deliberately old research host is valid when named as such;
   its results do not certify current develop. Preserve its original evidence.
4. **Update safely:** the branch owner can normally merge accepted develop
   into their own clean feature branch; preserve genuine dependency stacks.
   Never reset/clean another checkout, force-push, rewrite published history
   or switch another worker's branch. If the experiment must stay immutable,
   prepare a new extraction branch and leave the original intact. Do not
   merge an entire experimental stack just to get one useful correction.
5. **Hand off something fetchable:** supply PR/branch, full base/code/evidence
   pins, minimal patch/dependencies, enabled settings, focused reproducer and
   opposing control, failures/adverse evidence, runtime and next decision.
   Include source, input and measurement hashes in the existing receipt.
   A different environment's local path alone is not a handoff. No full-suite
   repeat by contributors. See [TESTING_COSTS](TESTING_COSTS.md).

A cheap comparison in the owner's checkout, before deciding to reconcile:

```sh
git fetch origin develop
git status --short
git rev-parse HEAD origin/develop
git log --oneline HEAD..origin/develop -- src
```

Compare the fetched pin with this ledger before adopting it. A branch with
zero accepted commits missing can still have experimental ancestry; inspect
its diff/dependencies. Do not convert every "behind" count into a new test job.

<a id="queue-operation"></a>
## Integration's loop and publication

- Read new/changed handoffs and reviews; pin the actual heads, base and flag
  intent. Update an existing row, not a second competing queue. Classify ready,
  review-pending, blocked with a named owner, rejected or experimental.
- Continue the same PR for the same candidate/objective; a new run or receipt
  updates that PR. Create another only for an independently reviewable change
  or a genuinely different integration boundary. Completed/superseded research
  PRs can close with immutable findings/evidence and a successor while their
  branches stay available to active children.
- Prepare the smallest useful coherent candidate from accepted develop;
  do not wait for every owner. If one item is blocked, progress another
  independent item. This queue/agent-doc reconciliation imports no additional
  runtime contribution beyond accepted #63.
- Resolve mechanical conflicts by preserving both intended contracts. When
  behavior, ownership or a test expectation is ambiguous, involve the affected
  owner and preserve both witnesses; do not choose whichever branch is newer.
- Reuse receipts only for compatible source/tests/inputs/measurement/settings.
  Run one exact combined verification when runtime is ready, not one per
  contributor. Fail-fast evidence and skipped phases remain visible. A
  material adverse result gets one targeted diagnostic before a bigger batch.
  Docs/ref/queue changes use Git and link checks; no new games or code suite.
- After required acceptance **under existing merge authority**, recheck heads,
  merge only the reviewed scope, publish the exact accepted develop commit,
  included fixes, receipt and affected ongoing investigations. Acceptance,
  merge and historical/default-baseline decisions are distinct. This workflow
  creates no new merge authority, default switch or branch-retirement license.

After accepted #63, use the merged develop pin above. The following active
investigations should reconcile affected contracts at clean checkpoints: gap/lane work must account for stable C-gap
identity; exchange work must include the installed departure window; recognition
and containment work must use acquired blocking cues; catch work must distinguish
incidental acquisition from targeted tracking; analysis adapters must retain
intended versus achieved air depth and actual snap possession. Saved historical
film/results stay pinned; do not rewrite them or rerun every investigation.
No owner is ordered to rebase, migrate all research or repeat the shared suite.

<a id="current-candidate-2026-10-15"></a>
### Included fixes and affected investigations

| Accepted scope | Reconcile when extending affected work |
| --- | --- |
| Stable departing-center gap identity | Do-It-All!: run-lanes, independent gap branch, run-entry admission and its review-only Awareness extraction. Do not queue the gap fix again. |
| Installed riding-mesh departure cadence | Run Game: #57 exchange and #64/#67 saved-input/pass-protection work. Preserve original experimental-film hosts; assess the accepted condition before claiming current-develop outcomes. |
| Acquired blocking recognition and approved zone-key contract | Catching/Pursuit: #58, P045 technique/containment and #34 coverage. Upright waiting is unsure; acquired release/low-pad/own-contact controls remain. #34's two coverage contracts remain blocked independently. |
| Actual possession, holding spot, intended/achieved catch depth | Recording/analysis owners: #60 and downstream adapters. P022's coarse accept/decline policy and historical recordings stay separate. |
| Acquired-flight gating for incidental offensive catches | Catching + Awareness: #61 and #36's proposed PlaySim lifecycle extraction must preserve the incidental-readiness hook/import. Targeted TrackBall and attention/occlusion limitations remain. |
| Unchanged existing contact physics | Physics: #66 is separate; reconcile its two center-history compatibility checks against this accepted controller tree before a future promotion candidate. Run's collection dependency and yaw limits remain. |

The owner-directed publication is on [merged #63](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200751483).
#65 reconciles the tracking/ownership/navigation records by merging accepted
develop into its own branch and retaining both histories. Its diff against
accepted develop contains documentation and new bookkeeping evidence only.
This reconciliation does not authorize another merge, default switch, historical
baseline change, branch retirement or experimental promotion.

<details>
<summary>Pre-merge #63 verification ledger and prior history — preserved</summary>

The following is the published preparation record. Its pending decisions and
accepted pin are historical; use the accepted-development section above.

# Integration ledger

<a id="pre-merge-candidate-2026-10-15"></a>
## Current candidate — 2026-10-15

**Accepted develop remains `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`.**
Integration owns `codex/departed-center-integration` directly from that commit.
The five contributions below are verified together in [draft PR #63](https://github.com/tannerthardy/football-simulation-/pull/63),
with required review still pending. Experimental stacks were not merged. [Current priorities](STATUS.md),
[issue decisions](ISSUES.md), [ownership](WORKBOARD.md).

**Passing exact candidate:** `a862a05713d0b8bbd22683ce8a70d5ac16eb18e2`.
**1,720 TypeScript checks / 143 files, 145 Python checks, typecheck and build pass**;
all four phases complete, no skips/worker errors/input drift. Final wall
**200.945 s**, source `2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad`,
validation `bd503123ac660bf6e07e061dd5d74e832309390187aa822b5d6289cb1dfbc495`.
[Exact launcher](../data/reviews/current/departed-center-integration/combined-final.json) ·
[Shared review/receipt](../data/reviews/current/departed-center-integration/receipt.json) ·
[Five independently applicable patches](../data/reviews/current/departed-center-integration/patches).
The patches together reproduce the exact tested source/tests/scripts. Publication
adds docs/evidence only; a later doc-only #58 head does not invalidate this pass.

| Contribution / exact publication | Independent readiness and smallest portable extraction | Real dependency / excluded ancestry |
| --- | --- | --- |
| Gap `73b94412d1bb9cf6b0e4beb6e59c7aec466e5eee`, evidence `badddf495fa9ff7cfa6579709dec853dc449974e` | Accepted for the candidate: 3-line C-vacancy exclusion, saved-cue test and 96KB fixture. 28 artifacts/6 tools and all source-arm hashes verified; first changed request RB at2.20 with identical preceding bodies/joints and retained DT tackle. | Actual implementation parent `2df3edb`, earlier runtime parent `6122fb0`; same original mapper bytes on accepted develop. Earlier zone/Duo/clearance/detour code is **not** required and is excluded. Coupled controls apply to the author's branch, not this combined tree. |
| [#57](https://github.com/tannerthardy/football-simulation-/pull/57) `1f11e4546bc75ed6c5d139d3ac75fd09d214eb51`, tested `21d7763` | Minimal `RunnerToMesh` departure-window condition plus portable saved-input helper/fixture/tests. Riding mesh and installed time already exist on develop. P038 reaches a real handoff in the combined-source preflight. | PR is stacked on #54's evidence branch; **do not merge its ancestry**. Rejected late-QB chase and all other run/awareness code are excluded. Old experimental P069 film hashes are historical; a same-current-source cadence rollback pair preserves positions/events/stats exactly. Keeper tripwire is installed without requiring the parent's awareness API. |
| [#58](https://github.com/tannerthardy/football-simulation-/pull/58) `cb73b08177ba796b3963c91f7afc53beafe77cf8`, tested `dc0f104` | Two production files and recognition tests, already based on accepted develop. Reuse 66 focused checks/typecheck and selected game/native receipts. | No dependency on #61, #54 or pursuit pilots. Preserve power rushing6.82→1.17 and the matched92→25.31-yard containment evidence; not league calibration. P045 NFL tracking access/research is separate, not a runtime prerequisite. |
| [#60](https://github.com/tannerthardy/football-simulation-/pull/60) `987056fe5b6dec61d8377834c5b277600685cbcd`, tested `d3ea55c` | Three production files, replay fields and directly affected tests. Reuse 56 checks/typecheck and saved holding-boundary receipt. | No cadence dependency: other retained snaps still need actual credit. P022's corrected enforcement still accepts under the coarse heuristic; policy quality remains open. No physics or historical-box rewrite. |
| [#61](https://github.com/tannerthardy/football-simulation-/pull/61) `351dcff82b96713b5abbc7602d9a051567d1b00a`, tested `28018cf` | New incidental acquisition module, one once-per-tick hook, catch filter, saved-window fixture/tests; based on develop. Reuse 29 focused checks/typecheck and red evidence. | Independent of #58. Its tick hook and #60's final-stat edits share a file but not a mechanism/hunk. Body-facing approximation, missing occlusion and privileged targeted TrackBall remain explicit limitations. No claim to repair P023's complete interception ending. |

The first portability screen has **92 passes and one source-specific P069
historical-trajectory mismatch**. The single targeted current-source
cadence-rollback diagnostic passes with complete frame/event/stat equality.
The original fixture and upstream assertion remain preserved; the extracted
regression protects the matching current-source control. No accepted assertion
was changed for P069. The separately reviewed zone-key contract revision below
is explicit; failed evidence and original assertions are preserved.

The first frozen run at `c412d3a` stopped at strict typecheck: #61's JSON
slot index lacked an explicit offense-key type. Build, TypeScript suites and
Python were skipped by fail-fast. The extracted test adds only that static
annotation; no runtime or expectation changes. The failed receipt is retained.
The final refrozen verification passes as recorded above, using Node22.23.3, all44
accepted flags including `RUN_CONTACT_COMPONENTS=1`, and existing center hands /
centered integration / legacy support / per-solve work / speculative impacts /
mean support / bounded attachment / adaptive substeps. Settings, dependencies,
historical profile and unrelated runtime files stay unchanged.

The user's existing conditional gap integration authority is retained. Preparing
this broader candidate does not infer permission to merge unrelated PRs or
bypass required review. Publication, a passing receipt, merge, baseline adoption,
GitHub default and branch retirement remain distinct actions. No fresh full-game
campaign is justified by this local integration question. Follow
[TESTING_COSTS](TESTING_COSTS.md).

### Explicit zone-key contract review

The frozen `47e0da1` run passed typecheck/build and **1,717/1,718 TypeScript
checks**; Python was skipped by fail-fast. Its sole failure was the accepted
zone-key assertion that a stationary upright nearby receiver must produce a
`run` declaration (`defensive-awareness-contact.test.ts`, original line195).
That is the very speed-only blocking inference #58 removes.

Independent contract evidence is the accepted `showsBlock` helper: merely
waiting at the line is not blocking; delayed low pads/forward movement or
personally visible contact are evidence. The zone test's purpose is preserving
which local receiver is keyed, not assigning knowledge of his hidden job.
The [matched diagnostic](../data/reviews/current/departed-center-integration/zone-key-diagnostic.json)
reuses the same fixture and delayed cues with approved versus candidate
Recognition. It runs zero World steps: upright stationary `run→unsure`, release
`pass→pass`, low pads `run→run`, own-contact `run→run`. A different distant X
does not affect the current zone trajectory. No new endpoint is used as truth.

**Reviewed contract repair:** retain the local-key/release assertions, require
ambiguity for the upright cue, and add low-pad/own-contact run controls. Other
man-key/tactile/privacy checks remain. No numeric threshold or runtime changes.
The original failed assertion, full failed receipt and diagnostic remain
published. Thirty focused checks then passed. The new exact `a862a05`
verification passes; it does not convert the failed `47e0da1` run into a pass.


### Separately identified earlier work and remaining decisions

- **Earlier zone/Duo:** code `6ac628b9cd017fb475c477d41904264d463a6a46`,
  publication `6122fb03c7104c0f9d762591d737cf2cf6a49067`, source
  `1c4fe7fdef9377436543fd94571689279be84fa061b16e2b46c0602567565527`.
  The author recommends separate review and reports 201 checks/typecheck.
  Its broader navigation/clearance work consumes `teammateInformation` and
  depends on that experimental run stack; it is not needed by the gap fix.
  [Full prior review and rejected gap-run transfer](https://github.com/tannerthardy/football-simulation-/blob/badddf495fa9ff7cfa6579709dec853dc449974e/docs/reviews/run-lanes/README.md)
  remains preserved. Actual git merge base with approved develop is `a1b16e6`,
  despite older prose mentioning a historical fetched reference.
- **Latest gap handoff:** `codex/run-lanes` moved to `4da1c3a` with workboard
  documentation only. The author also published `codex/departed-center-gap`
  at `132c27a`, code `d63bf45`, evidence `92566b3`, directly from accepted
  develop. All three extracted files are byte-identical to this candidate.
  [Portable author handoff](https://github.com/tannerthardy/football-simulation-/blob/132c27a8f1d9ce9a4366b92f0ede0df42a0dac52/docs/reviews/departed-center-gap/README.md).
  The separate entry-risk trial is rejected after an RB/RG collision; its
  [owner record](https://github.com/tannerthardy/football-simulation-/blob/4da1c3aa82352e9dc4a953f11be494626b96d8eb/docs/WORKBOARD.md)
  preserves pins and the next clearance question. Neither trial nor older zone
  code is imported. No test repeat is needed for these documentation updates.
- **#58 refresh:** newest head `f597cec3983e73ac5538f1f68a1ef7db4c49fa43`
  adds only 17 documentation lines; runtime/tests/tooling match reviewed `cb73b08`.
  Its new P046/P009 tracking-guided native transfer is linked, not rerun. The
  selected #58/#61 native combination is not claimed measured by this receipt;
  the exact combined code suite passes. No new football campaign is automatic.
- **Still held:** #54 wholesale, earlier zone/Duo/detour imports, rejected QB
  late-chase, #34 coverage blockers, experimental hands/grips/helper/physics,
  P022 value policy, P045 approach/secondary support and unfinished run collection.
- **Smallest next decision:** review PR #63's exact candidate and explicit
  zone-key contract repair for integration. Gap already has conditional merge
  authority; the broader batch retains its required review. No new testing is
  justified for unchanged code/inputs/settings. Develop, historical reference,
  default branch and source branches remain unchanged in this preparation pass.

There were three frozen verification attempts: a fail-fast typecheck stop,
a 1,717-pass/one-failure TS run, and the final all-phase pass. Recorded validation
commands total about **428 s**, including failures and focused diagnostics;
source/evidence audit and patch checks are separately timed. No additional
full-game or roster campaign ran; preserved suite game assertions did execute.

<details>
<summary>Published 2026-10-14 integration ledger and prior receipts — preserved</summary>

# Integration ledger

Updated **2026-10-14 (America/Phoenix)**. [Priorities](STATUS.md),
[issue/blocker details](ISSUES.md), [file ownership](WORKBOARD.md).

## Accepted reference and verification ownership

`develop` at **a1b16e666a9ee7d1bc1d2aecba141fc535863b24** contains merged
[#12](https://github.com/tannerthardy/football-simulation-/pull/12).
Historical `4ded6b6` remains a comparison, not the development starting point.
The designated **Integration owner** freezes candidates and owns one combined
verification. Contributors supply compatible focused receipts.

The accepted #12 code was tested at `46a833dd006850a2c83a937bd3444181d8b10588`:
**1,684 TypeScript / 145 Python checks, typecheck/build pass**, 180.530 s,
44 flags/components=1. [Exact receipt](../data/reviews/current/controller-combined-verification.json),
[scope and adverse evidence](reviews/controller-integration.md).
Publication/merge commits are distinct from the tested commit; reuse depends on
source/test/input/settings/measurement compatibility, not PR state alone.

## Candidate dispositions

| Work / exact publication snapshot | Disposition | Remaining decision |
| --- | --- | --- |
| #12 accepted run/catch + shared policy/tooling; develop `a1b16e6` | Integrated | Maintain known limitations; no new baseline designation in this documentation pass |
| [#29](https://github.com/tannerthardy/football-simulation-/pull/29) `b8e4d86`; tested `ce93c3b` | Ready for isolated integration review; **not yet fully verified/merged** | [STALK-001](ISSUES.md#STALK-001): preserve two-line scope and complete required verification, independently if coverage stays parked |
| [#34](https://github.com/tannerthardy/football-simulation-/pull/34) `306579f`; tested `cb240d2` | **Blocked; follow-up parked while Pass Game helps awareness** | [COV-001/002](ISSUES.md#COV-001): supported controller/test-contract adjudication, then one revised combined pass including Python |
| [#36](https://github.com/tannerthardy/football-simulation-/pull/36) `6828467`; tested engine/tests `98411ef` | Focused candidate; **promotion held for Run Game review**, no full-suite claim | [INFO-001/002](ISSUES.md#INFO-001): real rear collision and bounded post-mesh coordination; preserve unchanged yielding/physics |
| [#35](https://github.com/tannerthardy/football-simulation-/pull/35) `fed330a` | Diagnostic preparation, not a runtime feature | D01/Y domain comparison for #36; preserve original incomplete-memory disclosure |
| [#17/#18](https://github.com/tannerthardy/football-simulation-/pull/17) `92743c0` / `b30284c` | Experimental contact correction/evidence; unpromoted | [PHY-001](ISSUES.md#PHY-001); retention review permits bounded controller work, not package adoption |
| Physics #3/#7/#15–#21/#25/#31/#33; latest #33 `abf0e1c` | Research, not a combined production candidate | Local correctness/composition, cost, and named transfer; [PHY-002](ISSUES.md#PHY-002) |
| #23/#27/#28 TE studies/intervention | Diagnostics and parked intervention; do not merge ancestry | [RUN-003](ISSUES.md#RUN-003): adverse transfer retained |
| #22/#26/#30/#32 run audits/reference/rejected alternatives | Evidence, not production changes | Reuse exact references; no automatic campaign or runtime merge |
| #13 RB assessment; #4/#5 hands/handover/helper experiments; Stick/seam/post/QB-pressure prototypes | Separate review/research; excluded from #34 | A named independent question before extraction; no broader candidate by collection |

Relevant #6/#8/#9/#10 code/evidence is incorporated through accepted #12 even
when the older draft PR remains open. Do not confuse code inclusion with PR
closure, or close/delete historical refs from this ledger alone.

## Parked coverage receipt — not a passing verification

[#34 exact receipt](https://github.com/tannerthardy/football-simulation-/blob/306579fda9d496d45606445fd542239cf2f5acf4/data/reviews/current/pass-controller-combined-verification.json):
**1,698 passed / two failed; Python skipped**. Typecheck/build and 94 affected
checks pass. Combined runtime 205.662 s; candidate `cb240d2`, publication `306579f`.
The [register](ISSUES.md#COV-001) preserves numeric failures, intended contracts,
next actions and owner return condition. Existing diagnostics do not clear them.
Do not rerun the same failed source or treat that receipt as covering #29 alone.

## Promotion path

1. Identify the smallest independently useful correction and opposing contract.
2. Resolve named blockers with saved/focused evidence. A changed ending is not
   automatically a defect; an assertion change needs a supported contract.
3. Integration freezes exact source, tests, inputs, flags/model choices and dependencies.
4. One owner performs the required combined verification; every phase must pass.
   Fail-fast skips remain skips, not inherited passes.
5. Publish exact receipt, remaining risks and final decision. Merge/reference
   changes remain separately reviewed; a draft or focused pass is not approval.

Use [TESTING_COSTS](TESTING_COSTS.md). No automatic mode/roster matrices or games.
For current development, use the historical launcher in candidate mode; it still
guards the original historical source hash:

```sh
npm run baseline:info -- --candidate
# Integration owner only, for a reviewed exact combined candidate:
npm run baseline:verify -- --candidate --fail-fast
```

Use Node22.23.3 and preserve accepted resolved settings. Do not edit the historical
profile/source pin simply to make the launcher label current development a baseline.

<details>
<summary>Historical #6 / #12 preparation and original receipts</summary>

The following original records describe their own stage. Then-current ownership,
43-flag and adoption-pending statements are historical, superseded above.

# Current integration ownership and evidence

Current task: [reviewed run/catch controller integration](reviews/controller-integration.md),
owned by the same Codex integration session. It starts from approved `c98c2fa`,
reuses #10's compatible independent verification, and verifies a minimal
catch-only extraction before one frozen combined run. The candidate changes
production requests and registers 44 flags/components=1. It is not merged or
designated a baseline. The #6-only pass and 43-flag receipt below are historical
evidence for their exact pins; their unchanged-production statement is not a
description of this new candidate.

This pass incorporates **PR #6 only** into the previously combined runtime.
The historical comparison stays
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` on
`codex/run-game-integration`, profile `run-game-2026-10-13`.
The candidate is on `codex/shared-candidate-verification`; its shared verification
receipt records the exact tested commit. This does not designate a new runtime
baseline or promote a feature.

## Owner and scope

**The Codex integration owner in this chat owns the exact combined verification.**
Contributors supply compatible focused receipts, not another shared-suite run.
This current assignment supersedes the generic integration-lead role in older
guidance; historical workboard rows continue to describe their original stages.
Controller and physics ownership/promotion boundaries remain with their owners.

| Contribution | Treatment in this pass |
| --- | --- |
| #6, `f9617dde9456c0ead2d66b46d4b42608adcd3585` | Incorporated: tiny testing loop, interpretation guide, opt-in roster tools, cache/budget guards and their tests. |
| #3, #4, #5 | Leave on existing branches; preserve their focused receipts and adverse evidence. Disabled experiments are not a reason to import runtime changes. |
| #7 | Excluded while marked not ready. |

#6 needs no runtime change from those contributions. The only merge conflict
was adjacent workboard ownership rows; both the current claim and #6's rows are
retained. **Production simulation code is unchanged.** Engine sources,
dependency lock and `config/baseline.json` are identical
to `4ded6b6`. New policy/tool assertions require one current combined suite;
the historical suite receipt does not cover those additions.

Any independently ready runtime correction gets a separate bounded assessment:
identify its commit, smallest dependencies, intended enabled/disabled state,
target question and focused opposing evidence before changing this candidate.
Do not broaden the merge just to collect disabled work. If #6 is later found to
need a dependency, identify the smallest required change before importing it.

## Flag reconciliation

Keep the existing **43 runtime flags** and their values in
[`config/baseline.json`](../config/baseline.json). The launcher checks the engine's
actual inventory, resets inherited values and records the resolved settings.
This pass supplies no overrides. All preserved experiments stay off, `CF_FLOW`
stays unset, and the default-on controllers retain their existing settings.

| Setting | Candidate / receipt treatment |
| --- | --- |
| Existing 43 environment flags | Exactly the historical profile; no additions or promotions. |
| `PULL_HANDOVER`, `RUN_CONTACT_COMPONENTS` from #4/#5 | Not present in this engine/profile; their branch receipts are not candidate receipts. Do not copy their 45-flag configuration into the historical profile. |
| `gripTiming: 'resolved'` from #3 or `'fast'` from #7 | Excluded API choices. Do not document them as available candidate settings. |
| Existing World/API choices | Historical defaults: center hands, legacy support, centered integration, per-solve work, speculative impacts, mean support, bounded attachments and adaptive contact steps. Explicit experimental choices still need input/setting pins in focused receipts. |

## Contributor handoff

Use the five-field report in [testing costs](TESTING_COSTS.md): what changed,
evidence for/against, unresolved risk, runtime and next decision. Link the saved
receipt and witness instead of rerunning a batch or repeating the shared suite.
Existing receipt metadata should identify:

- Tested commit and runtime/test/collector fingerprints, including relevant
  uncommitted changes; a branch label alone is insufficient.
- Exact inputs/fixture, actors/roles, initial state, call/seed and measurement.
- Resolved flags and API choices, Node/environment and relevant dependencies.
- Completed/failed/skipped coverage, opposing control and limitations.

These are compatibility checks on evidence, not new mandatory test groups.
Reuse an existing receipt when its tested code, inputs, settings and measurement
remain compatible. Different global source fingerprints cannot establish exact
candidate verification; any narrower reuse must explain which measured mechanism
and code dependencies remain unchanged. Mark other evidence historical or
branch-specific. #3/#4/#5 receipts remain useful on their own pins and do not
establish an integrated runtime correction here.

## One frozen verification

The owner commits all candidate code, tests, inputs and settings before running
the existing launcher once:

```sh
node scripts/baseline.mjs --verify --candidate --fail-fast --receipt out/shared-integration/verification.json
```

Use `.nvmrc` Node 22.23.3 and the existing lockfile dependencies. Verification
runs typecheck, build, all preserved TypeScript projects and Python checks.
The aggregate fails for a failed/skipped phase or changed inputs/commit.
Existing game assertions inside that suite remain; no additional roster screen,
audit or game campaign is needed to answer this policy-integration question.

Publish the tested commit and exact receipt with phase runtimes, resolved flags,
source/validation fingerprints and known limitations. A later publication commit
may add documentation/receipts only; explicitly distinguish it from the tested
commit and confirm unchanged runtime/validation fingerprints instead of repeating
the suite. Functional success does not erase the known center-hand conservation,
patch promotion, recovery-convergence or football failures in
[the historical baseline](BASELINE.md#known-failures-and-validation).


## Published verification evidence

- **What changed:** #6 at `f9617dde9456c0ead2d66b46d4b42608adcd3585`, plus ownership/flag documentation, incorporated into the existing combined baseline. Production simulation code is unchanged. Exact tested candidate: [`c3080e89c089ffe686596e2b7953062fcff5ac46`](https://github.com/tannerthardy/football-simulation-/commit/c3080e89c089ffe686596e2b7953062fcff5ac46).
- **Evidence for/against:** 1,669 TypeScript tests in 139 files, 145 Python checks, typecheck and build passed. Four phases completed with no skips or worker errors; inputs/commit unchanged. The [exact launcher receipt](../data/reviews/current/shared-integration-verification.json) is copied byte-for-byte, SHA256 `49e672b08efd10c993fa56200fd15ec36e21f2e9f5d3b92d0d5677389fdda0ce`. #6's focused evidence remains on its original pins; no contributor repeated the shared suite for this pass.
- **Unresolved risk:** Functional success does not resolve the historical conservation, contact-promotion, convergence or football defects. #3/#4/#5 remain separate; #7 remains excluded. No runtime correction or new baseline was assessed or promoted.
- **Runtime:** One combined verification, 186.804 s wall. Typecheck 10.821 s; build 12.419 s; all TypeScript projects 162.617 s; Python 0.945 s. No additional roster screen, audit or game campaign. Raw log stays in `out/shared-integration/verification.log`, SHA256 `35c1d6fbb94ebd1bba157963751ba43c7f77e2b664e45cb6d4bdd3cf579f52c4`.
- **Next decision:** Should #8 become the current shared development reference, with `4ded6b6` retained for historical comparisons? The existing receipt supports this decision; another audit or simulation campaign needs a specific unanswered question. Assess any independently ready runtime correction separately with dependencies, settings and focused evidence explicit. Contributors link compatible focused receipts; the integration owner owns the next combined verification only if its material inputs change.

The receipt's UTC interval is `2026-10-13T23:58:40.799Z` to `2026-10-14T00:01:47.603Z`.
It records Node `v22.23.3`, runtime `8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c` and validation
fingerprint `2636006bf58c4d30db9ff67049b18d4d33059ff7f0bf49c51e3e50617a0c9597`, with all 43 historical flag values.
The publication follow-up adds only docs/evidence; it is not represented as
another tested commit. Runtime and validation fingerprints must match this
receipt at publication. `4ded6b6` remains the historical comparison pin.

</details>

</details>

</details>
