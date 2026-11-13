> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](../README.md) for remote evidence access and the next-work plan.

# Independent challenge of the two historical reach positives

Neither case is yet a proved missed useful block. **S9-P062 J1 is principally a responsibility-choice witness:** C leaves for LB_W, then deliberately switches to LB_M using acquired evidence and actually blocks him. **S7-P070 J0 is a departure-command/traffic witness:** RT keeps his LB_M responsibility but receives a zero-velocity fallback for half a second, then spends roughly another second on short detours. Its hypothetical unloaded interception is marginal, approaches the backer's rear, and concerns a later assist after two other defenders have already reached the carrier.

This review is read-only. `opportunity-peer-review.py` reads the complete historical native traces, checks event counterpart identities against actual possession, and writes extracted facts to `opportunity-peer-review.json`. It invokes no simulation, perception, controller or new RNG. Source remains historical58, with current-source conclusions kept separate.

## The partition is factual, but its labels need precision

The independently reproduced counts are **53 = 16 + 10 + 27**:

- 16 jobs have a >1 force-unit hand connection between an original member and the **original installed target**, at some point in the play.
- 10 have no such original-member/original-target connection, but that target actually contacts the carrier.
- 27 have neither observed fact.

Each target-contact event was checked against the carrier identity at that event's start/end frame; there are no target-only hits on somebody else in the ten, and no reversed hand orientation that creates an additional connection-only job. These checks support the arithmetic. They do not turn the categories into success, failure, usefulness or opportunity counts. In particular, “any member load” should be written “any member load on the original target”; S9-P062 C loads a different linebacker and therefore falls into the ten despite performing another block.

The ten also reproduce the proposed release-only screen:

| Category | Original jobs |
|---|---|
|No release, or release at/after target's actual carrier contact|S7-P003 J0; S7-P067 J0/J2; S8-P002 J0|
|Released before that contact, sampled unloaded controller misses|S10-P065 J0; S7-P032 J1; S7-P070 J1; S8-P017 J1|
|Released before that contact, sampled unloaded controller reaches|S7-P070 J0; S9-P062 J1|

“Misses” describes the sampled controller and endpoint grid. It is not an impossibility proof. Conversely, “reaches” means only that the isolated body enters a generous strike-distance envelope around a hindsight-selected future target position. The screen omits traffic, online uncertainty, actual contact eligibility, hand loading, sustained control, changed defender choices and keeper consequences. Its two positives should be split into one retained-target departure nomination and one alternative-responsibility nomination.

## S7-P070 J0: a command/access problem before a hypothetical useful block

RG/RT originally share DT_S with LB_M as the backer. At1.05 s RT releases, RG stays, and the recorded acquired LB_M picture is age.30 s. RG's hand load is535.25 force units at the release frame's start and510.28 at its end; the release therefore has an actual loaded keeper, not an invented remote handoff.

RT's release state is position(90.242,21.706), velocity(.836,1.74), and target distance4.35 yd. For every command tick1.05 through1.50, `departureAccess.kind` is `unvalidated` and both raw and final requested velocity are exactly zero. This is ten20 Hz commands covering.50 s. No downstream stage turns a fast request into a stop. The earliest meaningful mismatch is that the role releases while its local departure controller cannot validate an executing route. The body continues coasting and meets the old DT_S torso: the1.05 tick records61.07 kg·yd/s contact impulse, with the first contact interval1.0708–1.075 s. Contact is real, but it cannot explain the absence of a commanded departure.

A detour appears at1.55. It initially names RG as the acquired obstacle; later plans name DT_S. At1.85 RT asks for(1.064,−.619) yd/s while the backer is moving approximately(−.63,+3.12). Through2.45 the short detours keep RT near y22 while the target flows toward the carrier near y29. The direct request finally appears around2.60–2.65; by2.65 RT is7.57 yd from LB_M. The original target never changes. The existing wider-arc historical run retains the same early zero commands and still never connects; its minimum target separation remains4.014 yd. A wider-angle menu has not supplied a constructive repair here.

The unloaded solver's earliest positive at2.55 has only **.01362 yd** margin against its own envelope: endpoint separation1.14456 yd. Against the actual LB_M facing at that future clock, the blocker endpoint has front-axis projection **−.68998 yd**, in the rear hemisphere. This alone is not a legal-ruling determination—approach, contact point and applicable block rules would still matter—but it prevents interpreting this scalar endpoint as a certified usable strike. A route to a suitable shoulder could consume the entire margin.

The target's actual3.10 s contact is an **assist**. DE_W initiates contact at2.20; LB_W has another initial wrap at2.90 and eventually receives the tackle event at3.55. LB_M can still contribute after first contact, so2.20 is not a universal deadline. Equally, preventing LB_M's assist need not prevent or materially delay the tackle. That is the unresolved utility question. The zero-threat samples in the original pre-first-contact screen should not be used to call this defender irrelevant over the remaining live play.

A meaningful next local test first needs the validator's rejection reasons at1.05, using exactly the already acquired surfaces. If an existing physically executable, legal route can be proposed without future truth, keep the same release clock, keeper, target, capacities, collision bodies and ordinary defender reactions, then measure LB_M's access after2.20 and the competing LB_W/DE_W finish. Removing the old DL, teleporting RT to the unloaded endpoint, or forcing a hand connection would not test a legal missed opportunity. Given that the wider-arc treatment already failed, another arbitrary route-angle sweep is not justified. The current evidence supports diagnosis of release-to-command continuity, not an assertion that a useful block was available.

## S9-P062 J1: the center accepts another acquired responsibility

RG/C initially share DT_S and own LB_W. C releases at1.05 s with a direct departure request(6.510,−.412) yd/s. Keeper RG is upright and carries904.13 force units at the start of that release frame; positive load persists through the target's eventual carrier contact. C has no torso collision during the initial departure. There is no analogue of S7's zero-command stall.

At **1.25 s**, the recorded `block_threat` event changes C's target from LB_W(16) to LB_M(15): “first threat to the runner.” `RunBlocker.rereadThreat` makes this choice from the acquired carrier and defenders, not from their later contact outcomes. At that decision, the fresh acquired RB picture is age.05 s; both defensive pictures are age.25 s. Reconstructing the source's `distance − max(0, closing speed)` comparison from those exact returned pictures gives:

| Acquired quantity at1.25 s | Original LB_W | Replacement LB_M |
|---|---:|---:|
|Distance to acquired carrier|8.488 yd|7.153 yd|
|Closing speed along carrier line|2.630 yd/s|5.100 yd/s|
|Danger score|5.858|2.053|
|Distance from C|4.373 yd|2.350 yd|

The3.806 score advantage exceeds the source's2.5 switching margin. The original target is outside its4 yd commitment guard; C is closer to the new threat than the carrier is. The observed event and source also require no teammate to be materially nearer. This supports the stated acquired rationale; it does not independently validate that the danger heuristic picks the best football action. Exact pictures and computations are retained in `s9-retarget-evidence.json`.

C thereafter approaches LB_M and records `block_contact` at2.25. Once engaged, its raw block behavior returns a stand request and the ordinary engagement stage supplies the final movement. Treating that stage-owned motion as continued attempted interception of LB_W would be a controller-ownership error. C's first later torso collision is also with LB_M, not the original backer. The wider-arc run follows the same retarget and contact sequence.

The unloaded original-target solve reaches LB_W's future point at2.10 with.27099 yd margin and a frontal projection+.87246 yd. That makes it a stronger geometric endpoint than S7's, but the solve suppresses the observed choice to take LB_M. It is therefore evidence for a possible **alternative assignment**, not evidence that physics prevented C from executing its actual assignment. LB_M is also the other original combination's backer; that combination never releases a climber. C's actual block may be useful substitution for that absent release. The fact LB_W later reaches the carrier cannot establish that ignoring LB_M would have been better.

A small legal counterfactual would retain the already visible, upright LB_W at the1.25 decision and feed that responsibility through the ordinary acquired fit/strike path, with all players, collision rules, keeper duties and defensive responses active. It should compare **both** LB_W and LB_M access to the live carrier, rather than award success when C merely touches LB_W. An earlier LB_M tackle or loss of another necessary block would be a meaningful adverse result supporting the actual adaptation. An observer-only future LB position must not be the controller's goal. No such counterfactual was implemented in this review.

## Judgment

Both releases have observed loaded keepers at the release clock. That supports handoff execution but cannot prove the choice of release time was optimal or that the keeper would survive a changed departure. S7 has a genuine retained-role command/path obstruction, yet its utility-positive intervention is unconstructed. S9 is an intentional, acquired retarget with subsequent execution; it should be removed from any category labeled “missed original-target block because departure could not execute.” Keep it in the immutable53-job factual ledger with an explicit changed-responsibility annotation.

The defensible present bound is **zero demonstrated missed useful blocks among these two**, with one retained-target departure candidate and one alternative-responsibility comparison still unresolved. This does not mean zero missed opportunities exist. The27 remaining jobs are likewise unclassified for useful opportunity, not proved irrelevant, and the16 original-target connections are not proved beneficial blocks.
