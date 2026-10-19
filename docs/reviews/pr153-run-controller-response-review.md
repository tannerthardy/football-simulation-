# PR153 author-response review

Reviewed [response8d3c41f2](https://github.com/tannerthardy/football-simulation-/blob/8d3c41f2bbfc0bbcc923f3fa583ad9be0df44055/docs/reviews/run-game-v3-pr153-response.md),
runtime`76252fa98543b8c22c1560b153865b54655f46af`, against accepted
`f4146275ce7539816bf57b4ed55a0d2be10e48c7`. Submission and runtime source/test/
config trees agree. [Original scoped review](pr153-run-controller-review.md).
No production implementation, activation, merge or shared verification.

**The response makes useful progress. Accept the bounded experimental repairs
below; keep feature/package promotion held. One actor-reference defect remains,
and the power attribution is still too strong.**

## Dispositions

| Exact scope | Decision |
| --- | --- |
| `UC_MESH` excludes draw in `assign.ts:241` | **ACCEPT repair.** Both original mirrored draw-command checks now pass. This clears the draw rejection, not the ordinary depth/time/QB-motion holds. |
| Existing F-picture minus RB-home error in `LB_KEY` | **Original rejection cleared for that case.** Both real-hook fullback checks pass. The current actor-selection hunk has a separate defect below; do not accept the complete repair/feature yet. |
| `seenActor` inferred from persistent contradiction memory, `run-fits.ts:244` | **REJECT this inference; LB_KEY remains HOLD.** A later current RB picture can be labeled QB solely because this observer retired a mesh earlier. Portable installed-zone-controller check fails. |
| `ZONE_TE` near-surface return to ordinary fit, `blocking.ts:1031` | **ACCEPT as a repair to the held experiment.** Uses the existing acquired defender picture, preserves ordinary fit/assignments and excludes OL/default-off behavior. Both orientations pass; rolling back only this guard makes both fail. No stronger force/contact/spacing change. This does not approve ZONE_TE's broader footwork or its remaining gun protection cost. |
| Under-center `MESH_TEMPO` gate, `assign.ts:144–145` | **ACCEPT as a conservative experimental guard.** When UC is off it preserves the accepted under-center behavior, including the saved OZ control's sampled actors/events/result. It prevents exposing the demonstrated incompatible installation. It is not approval of UC_MESH or the package. |
| Under-center tempo + UC_MESH | **HOLD for promotion.** Functional dependency on a compatible meeting is demonstrated for this implementation. Necessity of every UC depth/time/movement hunk is not. |
| Shotgun tempo alone | **HOLD.** Now independently selectable from geometry; saved isolated evidence exists, with mixed negatives/4+ and remaining tail costs. No under-center dependency should be imposed on it. |
| `GUN_MESH_SIDE` | **HOLD.** Separating it was correct. Adverse OZ persists in both tempo strata; the claimed18→34 contrast is combined, not geometry-only. |
| ZONE_TE as a feature; STRETCH_FLAT | **HOLD.** The former's loss persists after chatter removal; the latter has no new useful recovery/runoff evidence. |
| SHED_PURSUE, shared contact/gait/Physics/capacities | **Outside this controller acceptance.** Pending contact review remains independent. |

ACCEPT here concerns the named corrections on the research branch, **not a
request to merge the experimental ancestry or activate any flag**. In particular,
an experimental TE repair absent ZONE_TE has no standalone production feature
to promote. Retain the current real transfer reach, acquired failed-exchange
secure-and-carry, draw/toss/keep contracts and legitimate defensive outcomes.

## 1. Under-center pushback is justified, with a narrower dependency claim

My earlier dependency wording was too broad. Source already supplying a mesh
and time establishes structural independence, **not a usable scheduled meeting**.
The newly accessible old-pin tapes establish the incompatibility, rather than
merely reporting changed gains:

| Old reviewed-pin selected case | Default handoff | Tempo alone | Closest sampled RB/QB distance with tempo |
| --- | --- | --- | --- |
| Ace OZ / Over / pair11 /77 |1.55s | No handoff; QB keeps |1.620yd |
| Ace WZ weak / Under / pair31 /3 |1.60s | No handoff; QB keeps |1.450yd |
| I Power weak / Over / pair31 /77 |1.85s | No handoff; QB keeps |1.276yd |

The receipts bind these to`1c578afb`, where tempo was not gated off. The batch's
800/800 OZ/WZ misses and11/400 Power misses remain author-reported panel counts;
I reused them, not a new panel. The selected failures are directly visible in
the published events/positions. The keeps are accepted recovery doing its job,
not evidence that transfer reach must grow or recovery should be removed.

At the guarded newer source, `w7-head-oz-default` and`w7-head-oz-tempo` have
identical sampled actor ticks, full event lists and result. This demonstrates
the guard's intended no-op on that input; it is not a full-state/RNG identity
proof for every play.

The evidence requires a compatible QB/RB meeting for this full-effort scheduler.
It does **not** make every UC_MESH choice necessary. Accepted OZ/WZ already use
the4.4/5.0yd landmark depths, so deeper IZ/gap geometry cannot be their missing
dependency. The stopped-QB and arrival-time experiments are useful negative
results, not an exhaustive proof that UC's exact time formula and through-speed
are the only lawful solution. Preserve the conservative gate; do not bundle
unreviewed depth or blocking changes as prerequisites by inference.

## 2. Remaining actor-reference defect

`executeRunFit` initializes `seen` from the current carrier when there is no
deep-QB mesh. But the repaired`seenActor` expression uses
`contradictedMesh.has(a) ? sim.qb : c` whenever the observer has ever retired that
expectation. The WeakSet remembers an expectation; it is not the identity of
every future consumed picture.

Reproduction uses **the installed Cover3 spot-zone controller**, run belief,
unchanged capabilities and staged personally acquired pictures. First retire a
QB mesh from an acquired carrying QB plus an empty back beyond reach. Later
present an identical current carrying-RB picture to both arms, such as after an
ordinary QB fumble/RB recovery. No native ending/frequency is claimed. In the
memory arm `seen` belongs to RB but`seenActor` becomes QB, disabling the new
step cue. Control reports flow=true; memory arm reports flow=false. Lateral
requests are +9.206 versus−1.217yd/s. These are requests, not achieved speeds.

The fullback correction is real. Its actor association still needs to be tracked
alongside the picture at acquisition/selection, including the specific `seen=qb`
transition. Do not clear legitimate mesh memory or weaken recovery to pass the
test. [Portable test and receipt](../../data/reviews/current/pr153-response-review/decision.json).

## 3. Gun contrast and actual path need precise labels

The four saved OZ cells,200 inputs each, are:

| | Geometry off | Own-side geometry on |
| --- | --- | --- |
| Tempo off |18 negatives |24 negatives |
| Tempo on |23 negatives |34 negatives |

Thus geometry alone is18→24 without tempo, and23→34 with tempo. Default18→34
changes **both** mechanisms. Its p=.007 cannot be presented as the isolated
geometry effect. Both strata still flag an adverse geometry risk; correcting
the contrast does not rescue the proposed universal spot. Existing paired raw
counts would permit the appropriate comparisons; no new lab is required.

Also separate a projected straight line from an executed path. The nominal line
to the old far-side spot may pass .30yd from the QB. In the saved
`w1-gun-default`, actual sampled closest distance is .854yd through the give and
.822yd over the published window. Handoff ends RunnerToMesh before the far-side
landmark is necessarily reached, and spacing modifies the route. The line alone
does not establish an actual QB collision in that case. The old installation is
not thereby certified realistic; neither review endorsed its path as a proven
legitimate across-face exchange.

## 4. Power evidence: legal give, unresolved total cause

The new w4 selected pair establishes a legal handoff at1.35s in both arms and
earlier runner arrival with tempo. It also explicitly records three slipping
DB holds in the tempo touchdown: NB and CB_S, then NB again. The control's
CB_S hold ends in a tackle. These may be legitimate different contests, changed
geometry/draws or an execution defect; the sampled witness lacks the full hold
law/budget/accounting needed to decide. **A legal handoff does not exclude its
changed arrival timing from the causal chain. Nor does this tape exclude DB
finishing as a contributor.**

The first-near-line operator improves on pooling late arrivals. Lower front-seven
presence is a credible lead, but does not establish that the increment18→40
Power breakaways is caused only by slow front-seven flow, or that tackling is
NFL-equivalent. Its 'broken' outcome is a survivor-conditioned motion proxy,
not a measured shed/tackle success. Speed is a centered ±.2s estimate, including
post-encounter motion. Ties retain every earliest defender, so encounter shares
are not automatically one exclusive first-defender outcome per run. NFL/sim
front, formation, field-position and exposure mixtures also differ.

Keep front-seven access, DB approach/hold execution and timing as separate links
until a representative extra-tail case identifies the first wrong action or law.
Do not cap the runner, increase block/tackle strength or declare Physics the
remaining owner merely because the averages or proximity counts differ.

## 5. TE repair and the next useful diagnosis

The new guard fixes a demonstrated controller discontinuity. The two staged
states on opposite sides of the defender's shoulder no longer demand saturated
opposite width; deleting only that guard restores both failures. This is useful
even when the play's gain barely changes. It uses existing information and
ordinary fit rather than extra strength or a new blocking policy.

The27 published native witnesses precede this guard (`b5577605`/`1c578afb`);
the later arm manifests and focused check support the repair. Do not relabel
those older command tapes as post-repair trajectories. The remaining gun adverse
still holds the full ZONE_TE proposal.

The loaded drive-line observation is a sensible next **diagnosis**. First compare
the consumed relative fit, requested contact-frame work and achieved support/
load against the defender's path to the runner. A fixed31-degree drive pointing
away in one TE rep warrants inspection, not a universal instruction to drive
through every defender's center. Preserve outside leverage, useful runoff,
keeper protection and earned defensive wins. No shared run-rep change is approved
by this review.

## Verification and publication limits

All27 embedded witness checksums reconstruct correctly with JSON.stringify + LF.
Receipts have exit0, unchanged inputs and no tracked changes; resolved flags and
commit agree with each witness. Both producing source hashes match Git. There
are **six**, not four, old-reviewed-pin witness entries. All15 arm manifest
runtime hashes match their commits and all recorded shards exit0. This validates
the published metadata; absent raw shard files, it does not independently rerun
their per-play identity or paired p-values. Raw-shard hashes remain references,
not uploaded raw arrays. The new launcher improves credential-free provenance;
its runtime/commit drift check does not also freeze every measurement script.

Independent focused work: **10 repaired checks pass**, **2 TE one-line rollback
checks fail as expected**, and **1 current-identity check fails** through the
installed zone hook. Skipped unrelated tests remain skipped. Node22.23.3,
current source`f94f3a44edfce8a845e28a7f0f6679d1703d1daa6b0b01f3ec9681db257ec328`;
diagnostic snapshot source restored exactly. About8.6s including refinement of
the identity fixture. **Zero new World steps, native continuations, broad arms,
games, NFL scans or shared-suite runs.** Author's1927/typecheck claim remains a
contributor receipt, not an independently repeated suite.

The [decision packet](../../data/reviews/current/pr153-response-review/decision.json)
preserves source/settings, check logs, portable failing test, rollback harness and
offline audits. Correct the seenActor association and the attribution wording;
do not launch another panel to settle these findings. Feature promotion remains
with independent scoped review and Integration's later exact verification.
