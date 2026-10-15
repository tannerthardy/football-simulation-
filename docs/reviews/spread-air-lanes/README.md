# Spread/air lane, climb and traffic review

**Adopt the departed-center gap bookkeeping correction only.** In P033 a
center leaving the surface inserted another outward boundary and renamed the
weak B gap as A. This is present in both the recorded film engine and the
previous run-lanes candidate. It creates a false late redirect. The correction
does not rescue the play: the same DT still reaches the runner at 2.20 s.

[Full measurements, information history, settings and receipts](summary.json) ·
[Native paired P033 replay, 1x](film/p033-paired.gif) ·
[Exact decision still](film/decision-2.20.png) ·
[Saved decision fixture](../../../test/fixtures/p033-gap-decision.json)

## The demonstrated correction

P033 is **Gun Trey Inside Zone Weak**, native log index32 / film P033,
rosters27101/27102, game702. C/RG share DT_S; C earns his climb toward LB_M at
2.00s, leaving RG. At2.00 the named B gap is correctly between LG and LT,
y31.30248. At2.20 the runner sees C1.52248yd beyond his snap depth, so the
existing surface classifier removes him. The departed-body loop then inserts
C's vacated spot as an additional outward body at offset zero. B now indexes
the positions belonging to A: preferred y27.96105. The actual B boundaries
remain LGy29.25544 and LTy34.05041, midpoint31.65292.

The correction skips C in that outward-vacancy loop. C already defines the
origin of the count. Other departed blockers still leave the existing named
vacancies. Public installation, classification thresholds, acquired pictures,
forecasts, sensing clocks and physics are unchanged. The existing fallback
center landmark is retained; this patch does not invent a new center track.

From the exact same2.20s state and consumed cues:

| Measure | Recorded | Corrected |
| --- | ---: | ---: |
| Preferred B landmark y |27.96105|31.65292|
| Selected entry y |28.17732|31.65292|
| Requested velocity x,y, yd/s |8.7916,−3.8776|6.6779,6.9090|
| Own achieved velocity before either request |4.2450,3.0503|identical|
| First defender contact |2.20s, DT_W|2.20s, DT_W|
| Result |−1.17yd, tackle|−1.13yd, tackle|

The original2.00s decision reproduces and stays unchanged. A same-cue probe
reproduces both original selected entries and original raw requests before
comparing the fix. Own-body previews preserve that exact source body and use
the existing free World law; they are not interacting contact predictions.

The native paired intervention preserves every preceding log/position/event
entry through P032 and the complete captured P033 initialization. The first
different request is RB at2.20; all22 bodies and joints are identical immediately
before it. The experiment applies the production correction only to P033's
PlaySim, keeping earlier plays original. This is an explicitly selected
counterfactual, not a production case gate. Every player subsequently reacts
naturally. DT_W retains access despite LG's real hand load (last resolved normal
576.33, tangent−298.60 native force units at the2.20 boundary). Correct gap
identity does not establish that the earlier bounce was the best choice or
that a different route could avoid this tackle.

The original Y/H impact at1.05,349.9495kg·yd/s, is identical. H's fall remains.
The4cm result change is not the success measure. No strength, handoff reach,
collision, body state, load/recovery law or hidden teammate intention was changed.

## The five nominated plays

These are selected witnesses, not failure-frequency estimates. Standard film
does not expose consumed observations or rejected lane scores. Where those
are absent, the trace stops at that missing boundary instead of inventing a
wrong decision.

| Play | Verified assignment and achieved evidence | First demonstrated mismatch / unresolved boundary |
| --- | --- | --- |
|P009 OZ,−.19|C initially reaches DT_W; LG helps, then keeps DT_W after C climbs to LB_M at1.80. C has no recorded backer block. RG falls at2.30; the first carrier contact is DT_S at2.75, assisted by LB_W.|C's climb is an assigned departure, not protection of both cutback defenders. His sampled applied request at1.80 is(.21,−1.16), while his achieved path stays near/below the line. The standard packet cannot separate his initial fit from spacing. Current climb clearance is newer; this clip does not prove that newer branch still makes this exact miss.|
|P011 Trap,+.63|RG traps DT_S. LG leaves the DT_W combination at2.40 toward LB_W; C stays. LG actually establishes a recorded block on LB_W at3.00. LB_W reaches RB at3.10. The3.65 LB_M shed from LG follows a3.65 assignment exchange.|The guard on the Will is LG, not the trapping RG. First achieved protection failure is Will's access0.10s after collection. At3.10 RB is(76.4,21.9), LG(77.0,22.1), Will(76.7,21.6). An assignment/contact label does not certify a seal. Force, consumed cues and the rejected alternative are absent; no new gap-run detour is justified.|
|P033 IZ Weak,−1.17|C/RG's DT_S work and C's earned2.00 climb are real. The runner had pressed the installed weak B side before the climb. At1.80 and2.00 the generic scorer also ranks that outside entry above the inside candidate.|Confirmed gap-name corruption at2.20, fixed above. Original raw and final requests are exactly equal from1.40 through2.20, so spacing did not create this bounce/reversal. The apparent inside seal controls another DT; DT_W still reaches the runner through LG's reachable side.|
|P037 Power,+45.51|LG is the installed puller to NB, not an aimless unassigned guard. RT/Y share DE_S; RT climbs to SS at1.20. At2.00 LG acquires NB at(45.41,24.61), velocity(1.59,1.65), age.25s. The flat/corner path updates as NB moves.|At2.20 the final corner is now aroundy25.00, but LG is still carrying−4.58yd/s laterally. By2.40 his request has turned positive y(+1.08), while actual y velocity remains−3.65. There is no LG block-contact event or sampled LG hand load in the complete play. Installed target→acquired target exists; attainable corner/arrival is the next execution question. The long gain does not certify that pull.|
|P039 IZ,−1.50|C contacts DT_S at.50. Their block link is still present at2.00 as the DT penetrates. At2.10 DT_S grasps RB, and the recorded link becomes a tackle. No explicit shed event exists.|A real penetrating defender win is supported. The recording does not resolve the exact release/attempt ordering at2.10; it is insufficient to diagnose a shed-law defect. Preserve this defensive win.|

P037's full prefix telemetry supplies the puller's actual velocity, acquired
NB picture and changing installed landmarks. It does not serialize a World
restart. P009/P011/P039 retain standard film; no extra replay was needed to
avoid the unsupported keeper/guard/shed interpretations.

## Shared information remains a separate unresolved contract

The exact P033 runner history is in `summary.json`. At2.20 lane selection uses
legacy teammate pictures aged.05s. Spacing uses owned observed pictures sampled
at1.95, available at2.20, aged.25s, projected for.25s. For LG, the two velocities
are(.5166,2.2379) versus(.2972,1.2364). These are different fallible pictures,
not an expired sighting. No teammate clock needs extending here.

PR57's saved P18/P8 compatibility evidence is reused, not rerun. Its publication
uses some collector-index labels; this report's Pnnn always means native
`log.index+1`, including kicks. The latest small-detour and defender-veto work
is absent from the recorded film; it does not migrate `runReadAim`, `liveAim`
or the legacy lane evaluator to owned teammate information. That gap remains.
The scorer's legacy private defender-engagement allowance also remains; this
patch adds no new information source and does not certify that legacy scorer
as fully legitimate.

The next bounded decision is to compare one actual entry using a single owned
teammate picture and an achievable own turn, with an ordinary wait/clear-path
control. Do not silently infer “LG has Will” from his live private target, use
his future route, bypass traffic, extend memory or transplant the rejected
zone detour into trap/power. Run Game retains P038/QBHandoff/RunnerToMesh and
protection; Physics retains World/capacities/load laws. Ownership and the
derived-gap-only information contract were recorded before this edit.

## Pins, controls, cost and reproduction

| Stage | Exact pin |
| --- | --- |
|Refreshed evidence branch head|`4ae667e29b3ce085f43c5cb911b294349cda2b8f`|
|PR57 evidence head|`e8a76a7f7cdc19dece85288f93a8d1e1273be0db`|
|Recorded engine|`f62511a513f2187884d74ae3b94435835e43309c` / source`dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba`|
|Previous run-lanes|`6122fb03c7104c0f9d762591d737cf2cf6a49067` / source`1c4fe7fdef9377436543fd94571689279be84fa061b16e2b46c0602567565527`|
|Corrected local engine|`73b94412d1bb9cf6b0e4beb6e59c7aec466e5eee` / source`97e2a7a7bcd2f795df0fb7acf9856bc7700d5642fbbe073a81a584778f6c41b6`|
|Isolated recorded-engine+fix arm, rejected as unpaired|source`43bf5e3771e7024371d658fb4852cd9c71ca5d894afa1695d87babac5bc5ff5f`|
|Paired P033-only intervention|source`0286a3529c0968c599ac2a60478e39e9cb6898accd3ea3ff612936cbee02effd`|
|Original game bytes|`15e553e26449ff44806293f1611bffd3362cbf2e4dd80d3f1447f0264681057f`|
|Original roster/input manifest|`c1c7cef835d143da40c62e6572e6e1d024dff281058a98215ecb78c93e6b5870`|

Before correction, `live-gaps.ts` and the entry function are byte-identical in
the recorded and previous local engines. Current source differs in other
controllers/navigation; the original film is not a combined-current-branch
test. The sole new runtime delta from the previous local engine is the
departed-center exclusion, with its explanatory comment.

Node22.23.3; all44 exact flags and World defaults are in the receipts and
summary: RUN_CONTACT_COMPONENTS=1, RUN_READ=0, center hands/centered integration,
legacy support/per-solve work/speculative impacts/mean support/bounded
attachments/adaptive substeps. Accepted develop remains
`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`; historical`4ded6b6` stays separate.
No merge, publication, default switch or baseline promotion occurred.

**52 affected tests and typecheck pass.** The saved-cue test first fails on the
old normal-side B gap, while its pre-departure and mirror controls pass. The
fix passes all three and the existing gap, run-system, carrier-cadence,
runner-clearance and defender-risk controls. Two naturally reacting current
source controls run to3.00s: Ace IZ Weak and Gun Wing split. Every saved full
state/information hash is identical to the prior candidate, as are requests,
contacts, timing and actual hand loads. Split C→LB_M normal impulse remains
1025.2797kg·yd/s. IZ Weak's LG glancing collection remains normal0/tangent84.6061;
that existing miss is not relabeled a successful repair.

Native collectors total **23.409s**:19.404s for three25-scrimmage prefixes and
4.005s for two short controls. These are77 physical scrimmage executions,
mostly replayed earlier context, zero completed games and no new rosters.
The original prefix exactly matches33 entries. The always-on isolated arm
changes inherited energy/mind inputs before P033 and is **rejected as paired
evidence**; its apparently similar ending is not counted as improvement.
One offline diagnostic establishes that input drift; the final scoped
intervention verifies the preceding32 entries and exact P033 initialization.
All arms and failures remain in the evidence packet. A failed standalone
reconstruction and a source-hash setup error each stop before any World step.
Same-cue previews cost.168s/16 scratch body steps. The emitted count32 is
corrected offline from the saved path lengths; original metadata/collector bytes
are preserved. No forecasts were repeated for that accounting correction.
Passing focused checks take
2.44s framework time (3.078s wrapper), typecheck13.958s wrapper. No shared suite
or full game was repeated. Offline packing/rendering costs are separate.

`scripts/diag/prepare-spread-air-runtime.py` creates original/corrected/
intervention sources from the exact git pin, without changing a worktree's
runtime. The prefix collector only collects P033 and verifies its native
context. `spread-air-gap-decision.mjs` compares the same recorded decision;
the report and film scripts are read-only reducers. Artifacts, scripts,
settings hashes, failure receipts and compact coupled traces are linked in
[the evidence manifest](artifacts.json). The native packets are diagnostic
observations, not complete serialized mid-play restart states.

One integration owner can include this narrow correction in the actual combined
candidate once. This local evidence supports gap identity and preserves the
named opposing controls; it does not establish functioning wide zone or resolve
the runner/spacing picture mismatch and puller collection.
