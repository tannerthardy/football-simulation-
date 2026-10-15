<!-- Existing issue register from #37 / #63 retained for the current queue; no new issue system. -->

# Master issue register

Updated **2026-10-15 (America/Phoenix)**. Accepted development reference:
`develop` at `4679a3c260188143bcc66f6f20534327c78d7eaa` (merged isolated #72; #63/#65 retained).

This is the canonical list of the consequential problems surfaced in current
work, including their evidence and return conditions. It is not a new exhaustive
audit or a claim that every old research concern affects today's engine.
Use [STATUS](STATUS.md) for the short priority list, [INTEGRATION](INTEGRATION.md)
for candidate/receipt decisions, and [WORKBOARD](WORKBOARD.md) before shared edits.

## Status and evidence rules

- **Active:** a named owner is working on a bounded next action.
- **Integration review:** a concrete correction has useful focused evidence;
  this does not mean it has passed combined verification or is approved to merge.
- **Blocked:** a named contract or prerequisite remains unresolved.
- **Parked:** preserve the item; resume only at its stated trigger. Parking a
  blocker does not make its candidate mergeable.
- **Research:** evidence applies to the declared experimental model, not production.
- **Resolved:** only the stated scope is complete; related limitations remain open.

Label evidence **confirmed defect**, **failed contract**, **observed limitation**,
**hypothesis**, or **enhancement**. A changed gain, tackle or ending alone is not
a defect. Historical/experimental witnesses must retain their source and settings.

## Quick index

| ID | Problem / decision | Evidence class | Status | Owner / return condition |
| --- | --- | --- | --- | --- |
| [RUN-005](#RUN-005) | Departed C renames outward B as A | Confirmed gap-identity defect | Resolved in accepted #63 | Integration; three-line fix only, preserve DT tackle |
| [RUN-006](#RUN-006) | Riding back leaves before the installed mesh window | Confirmed cadence defect | Resolved in accepted #63 | Integration + Run Game; real-reach transfer and same-source success control |
| [RUN-007](#RUN-007) | Lane/spacing pictures, late Will protection and P037 collection | Observed failures / unresolved boundaries | Active bounded owner follow-up | Do-It-All! + Run Game; no earlier zone/Duo/detour ancestry imported |
| [PASS-002](#PASS-002) | Slow upright receiver supplies false blocking cue | Confirmed recognition defect | Resolved bounded scope in accepted #63 | Integration; preserve real blocking and adverse run evidence |
| [PASS-003](#PASS-003) | Incidental catch lacks acquired flight | Confirmed opportunity/readiness defect | Resolved bounded scope in accepted #63 | Integration; preserve targeted check-release and acquired emergency catch |
| [PASS-004](#PASS-004) | P045 Quarters approach and secondary containment | Historical observed failure; cause not fully resolved | Active owner/measurement question | Catching And Defensive Pursuit; not solved by #58's different mechanism |
| [PASS-005](#PASS-005) | Edge-cutoff action station-keeps toward a future interception | Confirmed narrow controller mismatch; broader forecast/contact limitations | Bounded correction accepted via #72; forecast/contact limits open | Integration + Run Game; keep #69/physics separate and preserve defensive wins |
| [GAME-001](#GAME-001) | Behind-line holding spot and accept/decline value | Confirmed enforcement defect; policy limitation | #60 spot fix accepted via #63; policy open | Integration; correct state is distinct from optimal choice |
| [GAME-002](#GAME-002) | Retained-snap credit and intended/achieved air depth | Confirmed attribution/measurement defects | Resolved bounded scope in accepted #63 | Integration; actual possession segments, no historical rewrite |
| [INFO-001](#INFO-001) | Teammates receive refreshed state without acquisition | Confirmed information defect; #36 correction prepared | Active review; promotion held | Awareness + Run Game; rear collision/post-mesh coordination review |
| [INFO-002](#INFO-002) | Call-based anticipation can expose hidden live state | Confirmed limitation; #36 copied installed prior prepared | Active with INFO-001 | Awareness + Run Game; bounded installed expectations without hidden updates |
| [INFO-003](#INFO-003) | Other controller reads still need scoped information review | Known information debt; scope varies | Parked migration | Awareness + affected controller owner; after first reusable boundary passes |
| [STALK-001](#STALK-001) | Far stalk request reads hidden defender position | Confirmed defect; isolated correction prepared | Integration review | Integration + Run Game; #29-only verification or a repaired combined candidate |
| [COV-001](#COV-001) | Match/spot seam-gap contract fails | Failed contract; cause not adjudicated | Parked / blocks coverage | Pass Game, currently helping awareness; resume when available |
| [COV-002](#COV-002) | Scramble-recording fixture now throws | Failed fixture precondition; recorder defect unproved | Parked / blocks coverage | Pass Game + recording-contract owner; resume when available |
| [RUN-001](#RUN-001) | D01 loaded RT loses useful position through runner arrival | Observed failure; #36 changes information and retains adverse Y collision | Active domain review | Run Game; #35/#36 exact source/initialization and bounded coordination question |
| [RUN-002](#RUN-002) | Historical isolated-law RT joining / RG interior access | Experimental observed failures | Parked | Run Game + physics reviewer; only for a named current-source transfer question |
| [RUN-003](#RUN-003) | First-level TE base/dispatch policy | Observed role difference; intervention adverse | Parked | Run Game; a new decision-changing mechanism, not another gain-rescue trial |
| [RUN-004](#RUN-004) | Stalk fit ignores known target velocity | Observed approximation; protection effect unproved | Parked | Run Game; after STALK-001, one actual moving-target fit question |
| [PHY-001](#PHY-001) | Center-hand tangential law loses angular momentum | Confirmed live law defect | Open; correction experimental | Physics reviewer + Integration; isolated current-source contact review |
| [PHY-002](#PHY-002) | Accurate grip timing remains costly and incompletely composed | Experimental numerical/cost limitations | Active research | Primary Physics; #33 bounded World-interval composition question |
| [PHY-003](#PHY-003) | Long-hold balance/recovery history diverges | Observed experimental state divergence | Parked separately | Support/recovery owner; earliest accumulated-state fork on saved tape |
| [PHY-004](#PHY-004) | Raw hand operator trusts stale contact validity | Synthetic input-contract limitation; native occurrence unproved | Parked / explicit precondition | Physics + contact caller; a demonstrated invalid caller path |
| [PASS-001](#PASS-001) | Accepted catch/pursuit repair retains adverse outcomes | Observed tradeoffs/unresolved case | Parked | Pass Game/Pursuit; a named wrong decision/execution mechanism |
| [MODEL-001](#MODEL-001) | Vertical/airborne and richer hand/foot detail | Representational limits / enhancements | Deferred | Architecture + affected owner; repeatable failure simpler model cannot express |
| [DATA-001](#DATA-001) | Capability mappings and contact-capacity calibration | Evidence gap | Deferred | Roster/audit owner, no active assignment claimed; one named trait/measurement question |
| [REPO-001](#REPO-001) | GitHub default is still the old engine branch | Confirmed navigation problem | Open administrative item | Integration; separate reviewed default-branch decision |
| [REPO-002](#REPO-002) | Legacy PR/branch retirement and external evidence preservation | Historical cleanup holds; current disposition needs recheck | Parked | Integration + affected owners; refreshed preservation manifest |

## Accepted corrections and retained failures

The [integration ledger](INTEGRATION.md#ready-blocked-experimental) pins all
five independently assessed contributions accepted through merged #63.
Only their stated scopes are resolved; no new mandatory test groups are added.
Existing issues below retain their original evidence and return conditions.

<a id="RUN-005"></a>
### RUN-005 — A departing center changes the name of the run gap

P033's perceived C leaves the surface at 2.20 s and is incorrectly inserted
as an additional outward vacancy. B then indexes A's boundaries. The correction
at `73b9441` skips only C in that vacancy loop; the same DT still tackles the
runner. Evidence `badddf4` preserves the failed unpaired arm, exact paired
initialization and first changed request. Earlier zone/Duo/clearance/detour work
in its parent history is separate, not a dependency. **Resolved gap-identity scope in accepted #63.**

<a id="RUN-006"></a>
### RUN-006 — Riding departure starts before the mesh window

[#57](https://github.com/tannerthardy/football-simulation-/pull/57) now contains
a concrete condition repair, not only the old diagnosis. Installed cadence
already exists on accepted develop; proximity alone cannot permit departure
before `meshTime-.15`. Physical reach still controls the exchange. P038
transfers in the combined preflight. P069's historical experimental trajectory
is not a current-source golden: the matched current-source rollback control
preserves complete frames/events/stats. Rejected late-QB chase remains excluded.
**Accepted bounded correction via merged #63.**

<a id="RUN-007"></a>
### RUN-007 — Remaining lane, spacing and collection boundaries

The five-play review does not certify the earlier RB bounce, unify the legacy
lane picture with owned spacing, or repair Will protection and P037's puller
arrival. P011's LG actually collects Will but protection fails around arrival;
P037's +45.51 gain does not certify a successful LG block. P039 retains a
plausible penetrating DT win. Owners: Do-It-All! for its lane/climb scope and
Run Game for exchange/protection, with explicit function boundaries. Next:
one acquired, attainable entry/collection question and its opposing control;
no automatic roster sweep, stronger grip or hidden teammate intent. The original
[entry-risk trial and adverse collision](https://github.com/tannerthardy/football-simulation-/blob/4da1c3aa82352e9dc4a953f11be494626b96d8eb/docs/WORKBOARD.md)
remain preserved. Removing private-state shortcuts is independently justified;
the collision alone does not reject that information correction. The newer
`75dbf46` entry-admission handoff reports zero impact through3s, a .15s gather
and unchanged P019 control on its recorded host. It remains held on the
Awareness interface and sampled/unknown-motion contract, not part of accepted
#63. [Exact candidates, review-only extraction and owners](INTEGRATION.md#ready-blocked-experimental).
No new native replay or shared suite is justified while that contract is open.

<a id="PASS-005"></a>
### PASS-005 — Pass tackle station-keeps toward an interception point

#67's isolated extraction changes only the free edge-cutoff approach, through
the same predicted point at its existing .75*vmax budget. Candidate6417748 on
accepted7d1451b passed all four verification phases; [receipt](https://github.com/tannerthardy/football-simulation-/blob/167547807a23052e04af2199104fc16b9850a501/data/reviews/current/pass-cutoff-integration/final-receipt.json).
User accepted [Run's ordinary-fixture adjudication](https://github.com/tannerthardy/football-simulation-/pull/67#issuecomment-6201827323):
reciprocal response variates transfer the supported swim win to either approach;
earlier contact moves the rep clock. Native P040 RT/P019 RG/ordinary LT losses,
C/LG traffic and imperfect cutoff forecasts remain. The bounded correction is now accepted via #72 at4679a3c. Forecast accuracy,
contact law and general protection realism remain open.
#69 remains independent; future shared-file extraction must preserve this
PassProtector hunk if it is accepted. No additional game campaign is requested.

<a id="PASS-002"></a>
### PASS-002 — Slow upright release is interpreted as blocking

Controller owner approved the exact #63 zone-key contract and recognition
contribution in [the review](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200453995).
No recognition blocker remained. Explicit user acceptance/merge authority then
adopted the exact five-fix candidate; this grants no future merge authority. Preserve the original failed and final passing receipts.

[#58](https://github.com/tannerthardy/football-simulation-/pull/58) replaces the
speed-only blocking cue with acquired pad/contact evidence; contact is limited
to the observer himself. It is independent of #61 and #54. Preserve legitimate
blocking, PA, offensive wins, and the adverse power rushing6.82→1.17 evidence.
The matched92→25.31 gain supports earlier informed containment; it does not
calibrate the league. **Accepted bounded correction via merged #63.**

<a id="PASS-003"></a>
### PASS-003 — Incidental offensive catch without acquiring the flight

[#61](https://github.com/tannerthardy/football-simulation-/pull/61) supplies
once-per-tick observer-owned delivery before incidental attempts. P004/P024
protectors are not QB-selected targets. P034 is a legitimate check-release;
an acquired emergency catch remains allowed. Preserve the body-facing/occlusion
limitations, existing privileged targeted tracking, and no claim that P023's
entire interception is repaired. **Accepted bounded correction via merged #63.**

<a id="PASS-004"></a>
### PASS-004 — Quarters match approach and secondary containment

P045 is Quarters MOD, not Cover0. The historical clip has early pass reads,
an oblique CB arrival and no recorded carrier attempt before49.52YAC. This is
not #58's demonstrated slow-receiver run-read error. Catching And Defensive
Pursuit and the measurement owner retain the bounded approach question. P003's
plausible PA win and P006/P010 controls remain. NFL tracking access and coaching
questions are research dependencies, not reasons to rerun games for #58.

<a id="GAME-001"></a>
### GAME-001 — Holding enforcement is distinct from penalty value

[#60](https://github.com/tannerthardy/football-simulation-/pull/60) corrects
behind-line enforcement to the previous spot. P022's accepted alternative
becomes1st-and-20 at own25. Saved progress bounds its loss below8yd, so the
unchanged coarse heuristic still accepts. That adverse policy result remains
open; the exact8yd regression declining is not a native P022 replay. Preserve
safety, half-distance, turnover and third-down controls. **Spot correction
accepted via #63; calibrated accept/decline value and complex foul timing remain held.**

<a id="GAME-002"></a>
### GAME-002 — Official credit must follow actual possession

#60 records a sole completed snap possession as an actual rush when no rusher
was assigned, retaining `retainedSnap` and the failed-exchange description.
It separately records achieved catch depth while keeping intended target/air
depth. QB and receiver boxes already have distinct actual-recipient semantics.
No historical recording, comparison table, physical transfer or fumble is
invented. **Accepted bounded correction via merged #63.** More complex possession
allocation and versioned research-adapter migrations remain separate.

## Information and awareness

<a id="INFO-001"></a>
### INFO-001 — Refreshed teammate state without acquisition

**Observed:** accepted `PlaySim.see()` returns a .05-second-old teammate state
on request, without a visibility/acquisition gate. Global recording and delay
are not observer-owned memory. Spacing then uses that state. In D01 at 2.30,
RB is about 1.50 yd from RT and 152 degrees from torso-forward; the saved
interval has no RT/RB contact. This is not measured eye gaze or proof of no
earlier glance, but the code supplies no acquisition justification for refresh.

**Required contract:** one shared query separates acquired picture, aging memory,
installed expectation and unavailable information; spacing migrates first with
yielding unchanged. #36 reports this first implementation. Review its scoped
remaining questions instead of recollecting the same evidence. Hidden-state
checks advance reality snapshots with legitimate inputs/private randomness fixed;
observed, remembered/called and tactile controls oppose unavailability. Memory
must not be seeded from all true bodies.

**Owner/current candidate:** Pass Game/Pursuit prepared
[#36](https://github.com/tannerthardy/football-simulation-/pull/36), publication
`6828467`, tested engine/tests `98411ef`, harness `b331bc5`, branch
`codex/teammate-information`. Published evidence reports 37 focused checks and
typecheck, observer-owned acquisition/memory/expectations/touch/unavailability,
once-per-tick sensing and query/recording neutrality. Only spacing is migrated;
no full-suite pass or production merge is claimed. Run Game prepared
[#35](https://github.com/tannerthardy/football-simulation-/pull/35) at `fed330a`
with exact D01/Y inputs and memory gaps. The full #36 receipt is owner-published
evidence; this tracking pass does not independently rerun it.

**Promotion remains held:** H changes -.21 -> +1.14 yd, Y +1.49 -> +.62 yd,
both tackled; Y has a real rear teammate collision before a tactile cue. Motion
diverges by .15 s, so gains are not isolated late-spacing effects or general
improvement. Run Game reviews the collision and bounded post-mesh coordination.
The published next experiment is a request-only installed lane/timing expectation,
opposed by hidden divergence and an observed cutback; do not add RB yielding policy.
[Accepted information entry](../src/sim/playsim.ts),
[D01 source-pinned evidence](https://github.com/tannerthardy/football-simulation-/blob/1fbc013008faaa8ab0f677328d81c183c0b8c032/docs/reviews/run-drills/d01-analysis.md).

<a id="INFO-002"></a>
### INFO-002 — Anticipation must not inherit hidden execution

The spacing call adjustment starts from the refreshed teammate picture.
`RunBlocker.calledMotion()` also reads a track cleared each update and activated
by current behavior; the vector can be installed tempo while its availability
reveals private execution. No called-motion override is active in #35's six
inspected D01 RT/RB calls; this is a separate shared-boundary issue, not D01's
demonstrated cause. Derive expectations from legitimately known alignment,
installed call and acquired cues, without exposing live private branches.
[Code](../src/sim/behaviors/blocking.ts), [spacing adapter](../src/sim/playsim.ts).

<a id="INFO-003"></a>
### INFO-003 — Related consumers, not a global AI rewrite

Combination/runner reads share the teammate shortcut. General opponent `see()`
also largely models latency rather than acquisition, while QB has a distinct
observation/memory implementation. Do not label every truth read a bug: physics,
rules and physical eligibility legitimately use reality. Migrate named player
choices after the first boundary works; reuse existing useful memory/attention
mechanisms. Coverage's private QB-read dependency is separately recorded below.

## Isolated stalk correction

<a id="STALK-001"></a>
### STALK-001 — Useful correction awaiting integration

[#29](https://github.com/tannerthardy/football-simulation-/pull/29), publication
`b8e4d86`, tested `ce93c3b`, replaces the far fit's direct target position with
the ordinary perception input. Actual-controller hidden-invariance, visible
response and fresh-picture controls pass: **29 focused checks + typecheck**.
Integration found no isolated correctness blocker and reused compatible evidence.
No successful standalone full verification or merge is claimed here.

The stale-picture request slows 4.7746 -> 2.5505 yd/s; improved protection is
unproved. This removes direct live-coordinate dependence but does not certify
the underlying opponent acquisition model. It need not wait for all awareness
work. If coverage remains parked, Integration may prepare #29 alone and perform
its required verification. Do not import #24's diagnostic ancestry.
[Exact correction/evidence](https://github.com/tannerthardy/football-simulation-/blob/b8e4d86866a9880c59e2e3f0809114b7667c058b/docs/reviews/stalk-visual-request.md).

## Parked passing-game follow-up — retain until owner is available

The user reports the Pass Game owner is busy starting awareness. **Do not pull
that owner away or launch another campaign for these rows now.** Coverage remains
blocked, not rejected or approved. Resume when that owner is available, or an
explicitly assigned replacement can adjudicate the contracts.

Frozen [#34](https://github.com/tannerthardy/football-simulation-/pull/34): tested
`cb240d236b3b5bbc13c855dab251fdf986a3ae77`, publication `306579f`.
Exactly #29 plus the ZoneCoverage cue/spot/flat bundle. **94 affected checks,
typecheck/build pass; one combined run has 1,698 passed / two failed; Python
skipped by fail-fast.** One combined run cost **205.662 s**. Existing diagnostics
and adverse evidence remain; no current successful combined receipt exists.
[Full scope and diagnostics](https://github.com/tannerthardy/football-simulation-/blob/306579fda9d496d45606445fd542239cf2f5acf4/docs/reviews/pass-controller-integration.md),
[exact failed receipt](https://github.com/tannerthardy/football-simulation-/blob/306579fda9d496d45606445fd542239cf2f5acf4/data/reviews/current/pass-controller-combined-verification.json).

<a id="COV-001"></a>
### COV-001 — Comparative seam-gap contract

`test/integration/coverage-panel.test.ts:75` requires mean match gap to beat spot
gap by .4 yd. Observed match **3.166882**, spot **3.467355**: required match
< **3.067355**, so the assertion fails. Remaining spot depth/facing assertions
are not reached. The seed-1 diagnostic shows unchanged match motion and tighter
spot gaps; it does not adjudicate the 24-seed contract.

**Return action:** determine whether spot defenders legitimately squeeze lanes
while preserving called responsibilities, or incorrectly carry seams. Repair
the controller if needed; change a test only with a supported mechanism contract.
Do not merely lower the margin. Preserve meaningful match carrying, spot
depth/responsibility and facing coverage. Start from saved evidence, then run
the affected check after a concrete correction.

<a id="COV-002"></a>
### COV-002 — Native scramble fixture precondition

`test/qb-rusher-recording.test.ts:55` expects a scramble, but seed 0 now begins
a throw at completed boundary **2.40** rather than the comparison scramble at
**3.20**. QB policy is unchanged. Correct rusher attribution and recording
neutrality are the purpose; this seed's ending is not inherently required.
Neutrality assertions after the first failure remain unverified.

**Return action:** confirm the throw follows a legitimate opportunity. If the
fixture needs repair, retain meaningful native QB scramble-credit coverage,
movement/perception/RNG neutrality, ordinary-pass and handoff controls. Do not
change QB policy, delete scramble coverage, force a private phase or search
seeds merely for a pass. A supported fixture correction is not a coverage gain.

After both rows resolve, Integration freezes the revised candidate and performs
one combined verification including Python. Do not rerun unchanged failed #34.
Stick, seam/post and QB-pressure policies remain excluded/separate; no new
project is assigned to them by this register.

## Run-game mechanisms

<a id="RUN-001"></a>
### RUN-001 — Current D01; review the honest-information candidate

Accepted H loses the positional screen while RT hands remain loaded; spacing
redirects an existing backfield recovery request. This does not prove no recovery
effort, inevitable collision, or a faulty yielding policy. [#32](https://github.com/tannerthardy/football-simulation-/pull/32)
`7f5999c` rejected two alternatives under the original information system.
Preserve their findings; do not stack a third adjustment or rerun them by default.

[#35](https://github.com/tannerthardy/football-simulation-/pull/35) prepares D01/Y
and reports incomplete original Y observer-memory history. #36 now publishes a
from-start information candidate and retains a real rear collision/adverse Y
ending. Review that actual source/initialization and post-mesh coordination,
with unchanged yielding, native reactions and all 22 bodies. A later role-specific
yielding trial needs a remaining named policy question. Do not infer improved
football from H's gain or reject an honest collision from Y's loss alone.

<a id="RUN-002"></a>
### RUN-002 — Keep historical contact-law failures separate

[#17](https://github.com/tannerthardy/football-simulation-/pull/17) `92743c0` /
[#18](https://github.com/tannerthardy/football-simulation-/pull/18) `b30284c`
use historical `4ded6b6`, patch hands and legacy ground. RT briefly carries
lateral load before losing reach; a separate RG/DT_S interior failure involves
traffic despite maintained end load. These are not the same as accepted D01.
Current three-Ace reference [#26](https://github.com/tannerthardy/football-simulation-/pull/26)
`ba9544f` exists; do not recollect it for every worker or relabel historical
failures as current defects. Route changes must respect information, momentum
and spacing; no stronger hands or restored-yardage criterion.

<a id="RUN-003"></a>
### RUN-003 — TE policy remains parked

[#23](https://github.com/tannerthardy/football-simulation-/pull/23) measures a
tiny unloaded movement cost; it is not a live feature. [#27](https://github.com/tannerthardy/football-simulation-/pull/27)
isolates loaded effects; [#28](https://github.com/tannerthardy/football-simulation-/pull/28)
`82cfdf2` parks adoption after adverse current-production transfer. Do not revive
the .7 base request, lateral track, gathering or early release just to rescue a
gain. Return only with a new specific supported mechanism; reuse adverse controls.

<a id="RUN-004"></a>
### RUN-004 — Moving-target fit is a separate question

#29 retains a stationary fit despite available target velocity. Its projected
sample and free-step comparison do not establish native interception or
protection. After the input correction, investigate one genuine moving-target
fit failure if it changes the next decision. Do not bundle this into STALK-001.

## Physics

<a id="PHY-001"></a>
### PHY-001 — Live angular-law defect; experimental correction

Center hands deliver tangential impulses at separated COMs without balancing
moments; refinement does not remove the free-pair angular error. Common-point
mechanics close accounting, and #17 separates ground changes, but production
promotion is not approved. The historical patch promotion gate remains at its
pinned **43/52**; those failures invoke grip timing zero times and are not all
shown to share a cause. Numerical timing work is not their prerequisite/fix.
[Keeper law evidence](https://github.com/tannerthardy/football-simulation-/blob/22d3b34df18124ffad1a5eebd30d6f41bbb67d57/docs/reviews/keeper-contact-law.md).

**Next:** a bounded isolated current-source contact transfer/review when the
owner schedules it. Preserve valid opposing contacts and adverse football
evidence. Do not adopt all patch physics or infer realistic endings from ledgers.

<a id="PHY-002"></a>
### PHY-002 — Timing, shared-foot composition and cost

[#3](https://github.com/tannerthardy/football-simulation-/pull/3) and
[#7](https://github.com/tannerthardy/football-simulation-/pull/7) remain experimental.
Whole-World refinement became too expensive; local numerical experiments
#15–#21 and #25–#33 progressively address state, work, saturation and composition.
Newest [#33](https://github.com/tannerthardy/football-simulation-/pull/33)
`abf0e1c` crosses shared-foot cap/slip/reversal transitions with focused evidence,
but has no World insertion and event-case median **8.265–10.940 ms**, above the
provisional 2/5-ms typical/p95 screen. These are isolated research intervals,
not game-speed measurements or accepted production behavior.

**Next:** primary Physics's one saved full World interval with passive
normal/tangent group work and span-energy accounting. Native transfer follows
only if that local composition question clears; practical cost remains a
separate gate. Do not make every worker rerun physics panels.
[Published phase review](https://github.com/tannerthardy/football-simulation-/blob/45f96e8/docs/reviews/grip-phase-transition.md).

<a id="PHY-003"></a>
### PHY-003 — Long-hold support history

#7's saved experimental long hold retains about .24 yd disagreement with
requests/grip controls held. Capture-point drift precedes different outside-base
history and recovery requests. An identical late checkpoint alone does not
reproduce the native fork. This is evidence for accumulated state/history work,
not stronger recovery or a proven isolated final-crossing bug.
Use the existing long-hold tape and earliest state fork; keep this independent
of grip CPU work. [Exact evidence](https://github.com/tannerthardy/football-simulation-/blob/62f1f0e344c84e6501bb15257519f367eda9d58d/docs/reviews/grip-fast.md#remaining-24-yd-discrepancy).

<a id="PHY-004"></a>
### PHY-004 — Contact validity stays an explicit caller responsibility

The saved synthetic unreachable hand joint still transmits shear. This is not
a demonstrated native controller occurrence. Acquisition/reach/geometry/clearance
must remain valid at the input boundary; a stale object is insufficient.
The [completed review](https://github.com/tannerthardy/football-simulation-/pull/18#issuecomment-6173825589)
accepts bounded zero-compression shear for a declared reduced retained connection
and clears bounded controller work, not anatomical latch certification or patch
promotion. Any new native invalid caller path warrants a focused repair; do not
erase valid shear whenever compression vanishes.

## Preserved limitations and deferred work

<a id="PASS-001"></a>
### PASS-001 — Accepted catch evidence is not universal readiness

The accepted repair retains P4 stochastic execution, gain/clock and sideline
tradeoffs and untouched cases. Keep [the accepted receipt/review](reviews/controller-integration.md)
visible. A TD or more YAC is not automatically a defect. Resume only for a named
decision or execution failure; do not collect a new catch/roster campaign by default.

<a id="MODEL-001"></a>
<a id="DATA-001"></a>
### MODEL-001 / DATA-001 — Detail must earn its cost

Bodies are planar with height/posture reductions. Detailed airborne contact,
hurdles, independent limbs and ball exposure are limited; richer soles/gait
research remains unpromoted. No full skeleton, anatomy or online-learning project
is assigned. Require a repeatable mechanism the simpler model cannot represent.
Physical-profile/contact-capacity calibration remains an evidence gap; use one
named mapping/measurement question rather than fitting ratings to desired stats.
[Model direction](PHYSICS_DEVELOPMENT.md), [roster audit](reviews/roster-capability-audit.md).

<a id="REPO-001"></a>
<a id="REPO-002"></a>
### REPO-001 / REPO-002 — Navigation and preservation

GitHub's default was verified as `claude/football-sim-engine` on this update,
while accepted work starts from `develop`. Changing the default is an Integration
administrative decision, not a runtime promotion. This documentation change does
not change the default.

[BRANCHES](BRANCHES.md) preserves the earlier milestone manifest and owner/local
evidence holds. Its branch counts/dispositions are historical; this pass does not
re-audit or delete branches, close PRs, clean ignored files or claim archive tags
were created. Recheck exact tips, open-PR dependencies, links and other-environment
evidence before retirement. #6/#8/#9/#10 may remain open although their relevant
code is incorporated through #12; PR closure and branch retirement need their
own reviewed disposition.

## Completed scope — keep the evidence

- #63's five bounded corrections are accepted at develop
  `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`. Its merge tree exactly matches the
  verified publication; reuse the [combined receipt](../data/reviews/current/departed-center-integration/receipt.json)
  and [merge receipt](../data/reviews/current/pr63-merge.json).
  Related lane/collection, coverage, value-policy, information and physics
  limitations above remain open; their adverse results are preserved.


- **Accepted shared controllers/tooling:** [#12](https://github.com/tannerthardy/football-simulation-/pull/12)
  is merged into `develop` at `a1b16e6`. Tested code `46a833d` passed 1,684
  TypeScript / 145 Python checks, typecheck/build. Run-contact components and
  moving-catch correction are accepted; this does not resolve the rows above.
- **Retention review prerequisite:** completed for bounded controller work,
  as linked under PHY-004. Operator validity limitation and contact promotion remain.
- **Current three-Ace reference / D01–D03 explanation:** #26 and #30 provide
  source-pinned evidence; #35 prepares awareness comparison. Diagnostics completed
  are not runtime features to merge or proof every consumed picture was acquired.

## Keeping this useful

Architecture owns priorities; Integration updates candidate disposition and
exact reference/receipt links. Contributors include the relevant issue ID and
proposed state change in their normal five-field handoff. Keep this register's
editing under those owners to avoid concurrent master-list conflicts.

Update only when a defect is confirmed, a blocker changes, a candidate is
integrated/rejected/parked, or a return condition is met. Keep stable IDs and
evidence links; mark resolved scope rather than erasing failures. Claim files
in WORKBOARD before shared edits. A row is not an automatic test, campaign or
approval requirement: use [the cost-aware policy](TESTING_COSTS.md).
