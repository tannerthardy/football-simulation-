# Master issue register

Updated **2026-10-14 (America/Phoenix)**. Accepted development reference:
`develop` at `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`.

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
| [INFO-001](#INFO-001) | Teammates receive refreshed state without acquisition | Confirmed information defect | Active | Pass Game/Pursuit awareness owner; first shared teammate-information repair |
| [INFO-002](#INFO-002) | Call-based anticipation can expose hidden live state | Confirmed information-boundary limitation | Active with INFO-001 | Awareness owner; same acquisition/expectation boundary |
| [INFO-003](#INFO-003) | Other controller reads still need scoped information review | Known information debt; scope varies | Parked migration | Awareness + affected controller owner; after first reusable boundary passes |
| [STALK-001](#STALK-001) | Far stalk request reads hidden defender position | Confirmed defect; isolated correction prepared | Integration review | Integration + Run Game; #29-only verification or a repaired combined candidate |
| [COV-001](#COV-001) | Match/spot seam-gap contract fails | Failed contract; cause not adjudicated | Parked / blocks coverage | Pass Game, currently helping awareness; resume when available |
| [COV-002](#COV-002) | Scramble-recording fixture now throws | Failed fixture precondition; recorder defect unproved | Parked / blocks coverage | Pass Game + recording-contract owner; resume when available |
| [RUN-001](#RUN-001) | D01 loaded RT loses useful position through runner arrival | Observed protection failure; safe alternative unproved | Awaiting awareness candidate | Run Game; #35 exact candidate and observer initialization |
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

## Information and awareness

<a id="INFO-001"></a>
### INFO-001 — Refreshed teammate state without acquisition

**Observed:** accepted `PlaySim.see()` returns a .05-second-old teammate state
on request, without a visibility/acquisition gate. Global recording and delay
are not observer-owned memory. Spacing then uses that state. In D01 at 2.30,
RB is about 1.50 yd from RT and 152 degrees from torso-forward; the saved
interval has no RT/RB contact. This is not measured eye gaze or proof of no
earlier glance, but the code supplies no acquisition justification for refresh.

**Next:** one shared query separating acquired picture, aging memory, installed
expectation and unavailable information; migrate spacing first with yielding
policy unchanged. Hidden-state tests must advance reality snapshots while
holding legitimate inputs and private randomness fixed. Preserve observed,
remembered/called and tactile controls. Do not seed memory from all true bodies.

**Owner:** Pass Game/Pursuit is helping start awareness, per the user's current
assignment. A published awareness implementation/branch was not available at
this snapshot. Run Game has prepared [#35](https://github.com/tannerthardy/football-simulation-/pull/35)
at `fed330a`: D01/Y inputs and memory gaps, not an implemented repair.
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
### RUN-001 — Current D01; await honest information

Accepted H loses the positional screen while RT hands remain loaded; spacing
redirects an existing backfield recovery request. This does not prove no recovery
effort, inevitable collision, or a faulty yielding policy. [#32](https://github.com/tannerthardy/football-simulation-/pull/32)
`7f5999c` rejected two alternatives under the original information system.
Preserve their findings; do not stack a third adjustment or rerun them by default.

[#35](https://github.com/tannerthardy/football-simulation-/pull/35) prepares D01/Y
and reports incomplete Y observer-memory history. Next, obtain the awareness
owner's exact source/settings/initialization; compare information first with
unchanged yielding, native reactions and all 22 bodies. A later role-specific
yielding trial needs a remaining named policy question. No automatic promise
that removing privileged information improves yards or prevents collisions.

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
