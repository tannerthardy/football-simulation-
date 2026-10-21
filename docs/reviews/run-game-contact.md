# Run game: movement intentions, angled contact and useful protection

Follow-up: [first positioning cause of the cross-pair loss](run-game-positioning.md) isolates RG's experimental footwork, preserves the native defensive response and tests the keeper's reach/runoff transition. No defaults were promoted.

**Contact can discard a still-active reach intention before hands transmit any load. A narrow correction restores that request, but does not reliably improve protection. It stays default-off. The clearest late regression is a cross-pair collision that drops the keeper, not a premature release timer.**

Checkout was clean at `b143f1b`, `codex/defensive-flow`. Work continues on `codex/run-game-contact`. The workboard records the user's assignment of both offensive blocking and defensive reactions to this session. Primary physics was reviewed at `41103cb`; its loaded-recovery/tackle work was not merged. World, support/recovery, capacities, grip, tackling, RB reads and mesh are unchanged. Existing anchor split, torso release, keeper eligibility, zone technique and climb fixes are retained.

Reviewed: [trench timeline](trench-timeline.md), [engaged-zone physics](engaged-zone-physics.md), [wide-zone guidance](wide-zone-guidance.md), [RB information](run-read-information.md), [false-safe approach](run-read-approach.md), and [defensive flow](defensive-flow.md). Their historical source pins remain historical. No NFL average was used as a target.

## Inputs and measurement

[32 inputs](../../data/reviews/run-game-contact/input-manifest.json): the earlier 24 shared OZ/IZ/power/counter and draw/PA/exchange controls, plus mirrored WZ and straight-drive Duo, seeds 3/7, rosters 31/32. [16 fresh inputs](../../data/reviews/run-game-contact/input-manifest-fresh.json): mirrored OZ/WZ/IZ/Duo, seeds 11/19, rosters 41/42. All use Ace 11, Over/Cover 3, strength .55, LOS 40 and default center hands. The mirrors use the same roster/front; side-specific players/jobs are not identical reflected bodies. Controlled reach tests separately use both exact geometric sides.

Four arms, identical inputs/source/profiles/initial positions:

| Arm | `RUN_CONTACT_TRACK` | `PULL_PLAN` |
| --- | ---: | ---: |
| Baseline | 0 | 0 |
| Offensive only | 1 | 0 |
| Defensive only | 0 | 1 |
| Combined | 1 | 1 |

The defensive arm is the **previously parked** pull-planner trial, not a new recognition fix. `RUN_READ` and `RUN_READ_TURN` are cleared throughout. Both run-game flags remain default-off. All 192 recorded input/arm executions match fresh no-observer executions exactly. The original 24 baseline prefixes also match the preceding source exactly. Later extended frames are new evidence, not substituted for an ended frame.

The [bounded receipt](../../data/reviews/current/run-game-contact.json) contains all input outcomes, protection/censoring, technique summaries, end reasons, selected ownership histories and source/probe/raw-file hashes. Runtime source SHA-256 is `2dc56aa22381136a97c293c4e39988d943999cd14ff70cda293cb09943b82dca` for every arm. Detailed traces stay in ignored `out/run-game-contact/`.

The optional contact observer records the actual seal terms before/after hand-load feedback, displacement components, anchor result, requested facing, current facing/support, defender's acquired fit/flow, and end reason. The native probe records approach commands, final requests after contact/spacing, achieved poses/velocities, delivered owner/helper hand loads, body impulses, held aims and every actual opponent observation consumed. It adds no perception, RNG draw or prediction. Supplemental helper/World observation matches the first eight witnesses exactly.

Requests are at frame start; achieved bodies are at its 0.05-s endpoint. Exact-time samples require a recorded live frame. The already-repaired trench operator and its four counterexamples still pass. Original historical NFL/game files are absent, so the old exact 3-second deficits are not re-certified. NFL's 1.5-yard proximity proxy is not called contact here: body contact requires positive delivered impulse; an acquired wrap or successful diving leg grip is reported separately. A recorded engagement or zero hand load alone is not a protection/separation certificate.

## First wrong request and the single change

Ordinary `oz_strong-s3`, RG→DT_S, decision 0.50 s:

| State / request | X | Y |
| --- | ---: | ---: |
| Last approach request | +2.660 | -1.889 |
| RG achieved entry velocity | +1.107 | -0.854 |
| DT_S entry velocity | -1.463 | +0.601 |
| Engaged request | -0.205 | +0.305 |

Playside is negative Y. RG's held technique is still **reach**. Hand feedback is zero and anchoring is inactive. The contact controller substitutes defender-velocity matching plus shoulder correction for the continuing track, so this reversal precedes either proposed load mechanism. Facing goal is +0.083 rad, current torso +0.002; the body has not already turned to the goal.

The candidate lets a blocker expose his **held solo reach movement intention**, distinct from the free track advertised to teammates. Engaged reach uses the existing `.45 * own vmax` free-track tempo, projected into the maintained contact surface and bounded by the existing contact request envelope. The usual anchor, spacing, hand law and World still execute it. It applies only to the same acquired solo target while the held phase remains reach; unreleased combinations, down/cutoff/drive, seal and runoff retain their current policy. No guaranteed displacement, velocity or won block is added.

Six focused contracts verify the stationary-defender/attained-offset counterexample in both directions, actual bounded World response, unchanged hand parameters and bodies before integration, and seal/runoff/down/cutoff/drive/stale-target exclusions. An established seal can reasonably hold a useful wall without marching sideways; that is why the correction is not a floor on every block.

Matched solo-reach observations: wrong-way requests **17/146 → 0/181 ticks**, mean requested playside velocity 1.24→1.48 yd/s, achieved 1.01→1.06. Fresh observations: **14/183 → 8/194**, requested 1.16→1.34, achieved .90→.99. Denominators change with resulting technique histories; these are selected mechanism observations, not paired tick or NFL frequency estimates. The retained acquired-angle gate does not cover every angled takeover, and later runoff/seal decisions still dominate much of contact. No second adjustment was stacked to hide those limits.

## The other two hypotheses

**Hand-load feedback can oppose the blocker's own overtaking motion.** At unflipped WZ 1.15 s, RG moves playside 1.438 yd/s versus the defender's 1.194; feedback contributes against that direction. Its contribution reduces the pre-clamp seal request from about 2.19 to 1.88 yd/s (the existing cap would otherwise limit it to 2.12). The scalar cue treats transmitted relative-motion resistance as inferred opponent movement. In matched reach observations there are 25 ticks with opposing feedback exceeding .5 yd/s while the blocker has a playside speed advantage above .1 yd/s; fresh has 53. These selected counts show the ambiguity, not that removing the cue would preserve the complete block. The first ordinary reversal has no hand force at all. Grip and this cue were not weakened.

**Genuine backdrive still reduces lateral work.** In that same WZ RG tick, positive backfield load and actual backward X velocity activate the existing anchor. The playside request drops 1.876→.563 yd/s while X changes from -.603 to +2.4. This is a real interruption of diagonal intent, but unlike the older anchor reversal it follows genuine loss of depth. Matched baseline solo seal/runoff have 83/231 and 130/718 anchored ticks; fresh has 41/127 and 234/653. This does not prove bracing is wrong or its lateral share should be globally raised.

**Facing remains a separate intention/execution question.** Free zone track opens hips; close approach fitting can already redirect facing toward the opponent before engagement. Contact also requests opponent bearing. Requested facing is not achieved turning. In mirrored WZ, LG's acquired angled surface survives a keeper takeover while his displacement technique changes; at 1.55 s the runoff request is backfield/opposite playside (-1.24 yd/s in Y), with anchoring inactive. An altered surface basis, held shoulder read and driving component must be examined together before blaming inability to turn. Neither facing nor release duration was changed in this trial.

## Actual protection, improvements and adverse controls

Protection proxy: did the RB cross LOS before his first positive defender body impulse or acquired wrap/diving leg grip? Same-step ordering is explicitly uncertain. No encounter by the five-second stop is censored, not a promised safe arrival. Resulting back paths and openings can change with the blocking; a later opening in one arm is not a counterfactual opportunity in another.

| Inputs | Baseline observed gain | Offensive trial | Clean LOS arrivals |
| --- | ---: | ---: | --- |
| Shared OZ, including exchange controls, n=6 | 2.060 | 2.136 | 3→3 |
| Shared WZ, n=4 | 1.461 | 1.515 | 3→3, but one clean control lost and one uncertain case became clean |
| Fresh OZ, n=4 | 2.983 | 3.482 | 4→3 |
| Fresh WZ, n=4 | 3.915 | 4.754 | 4→4 |

Shared OZ has one live stop in each arm; its gain column is an observed spot, not a completed rushing average. Individual censored/ended/contact outcomes are retained. Non-stretch IZ, Duo, power/counter, draw and PA trajectories are exactly unchanged by the offensive switch. The enabled helper/keeper/cutoff/combo contracts also pass apart from the existing Tite failure.

- **Fresh gains:** `oz_strong-s19-fresh` completes .799→3.175 yd; first grip moves 3.30 s/+.592 yd to 3.90 s/+2.995. `wz_strong-s19-fresh` completes 3.994→8.332; grip 2.90 s/+1.931 to 3.55 s/+5.185. Both retain clean LOS arrivals.
- **Gain regression:** fresh mirrored WZ seed 19 completes 5.390→4.654. LOS arrival stays clean; first grip 3.25 s/+2.517 versus 3.45 s/+2.252. More time does not necessarily mean more useful depth.
- **Protection regression masked by gain:** shared mirrored WZ seed 3 completes .677→1.054, yet baseline's clean arrival becomes interrupted: DT_S grip at 2.65 s/+.315 versus 2.40 s/-.458.
- **Fresh protection regression:** mirrored OZ seed 19 completes .687→.524. Original first body contact is LB_M at 3.00 s/+.423; trial is DE_S at 3.75 s/-.006. Both contact defenders still have active loaded owner hands. The original crosses at 2.90 s; the trial at 3.85. A longer-held object does not certify the approach.

Those two lost protected arrivals are sufficient to reject production promotion. `RUN_CONTACT_TRACK=1` remains an explicit diagnostic trial. No default was flipped, assertion weakened or late block forced to persist.

## Explain the late loss: promotion, cross-pair collision, support, release

The clearest shared WZ regression must follow the **current keeper**. LT initially owns DT_S at .55 s; LG takes over at 1.10 in both arms. An observer that labels the entire engagement by its original owner falsely reports a later “LT failure.” The summary splits owner segments at promotion; this diagnostic bug is repaired without changing keeper/release policy.

In the trial's 2.25–2.30 s step, DT_W crosses from the adjacent RG block into LG. Delivered LG–DT_W collision impulse is **214.85 kg·yd/s**, closing 1.51 yd/s. LG was still up but already loaded, with support peak .623 and time outside base .183 s. LG falls at 2.270833 s; DT_W also falls at 2.279167. There is no queued strike in that input. The updater ends LG→DT_S at 2.30 because the blocker is off his feet. DT_S acquires the back at 2.40 before LOS. In the baseline same-clock step that cross-pair impact is absent and LG stays up.

Three reusable frozen inputs: [ordinary anchored step](../../data/reviews/current/run-game-anchor-step.json), [baseline late control](../../data/reviews/current/run-game-control-step.json), [trial late regression](../../data/reviews/current/run-game-regression-step.json). Full 22-body World replays reproduce the recorded positions, velocities, facing and spin **exactly**, using unchanged physics. A [four-body/two-hand-pair case](../../data/reviews/current/run-game-cross-pair.json) reproduces the LG and DT_W falls. The LG–DT_S pair alone remains up; dropping the cross contact loses the mechanism. Reduced endpoints are not claimed identical to the full native endpoints. [Replay evidence](../../data/reviews/current/run-game-cross-pair-replay.json) retains that distinction. Work residual is around 1e-12 or smaller; coherent accounting alone does not validate NFL loaded balance/recovery.

This is a handoff for primary's loaded-recovery investigation, not a demonstrated capacity defect or a request for stronger balance. From our side, stronger local intent changes adjacent geometry and collision risk. Extending the engagement after its keeper falls would conceal the failure.

Other endings remain separate: actual distance separation; support failure; torso leverage loss; runner passing the defender; keeper promotion; external ownership/tackle transitions; and observation ending while a rep remains. The receipt reports all and a separate late-lineman denominator. It does not turn a normal release or censored object into a failed block. Solo reach, runoff, seal, cutoff, down, combination and ordinary drive requests have separate summaries. Joined helper/keeper policy is unchanged; no earlier climb is manufactured.

## Defense and four-arm interaction

Same-input defensive traces reproduce the earlier distinction: middle backers can believe run at .35 s, observe a power pull at .95, then adjust at 1.10/1.30. The line-departure depth boundary can drop an already-visible pull at target-adoption time. OZ backers later request strong lateral work; engaged DL have contact-layer requests that differ from their original standing commands. Requested motion, spacing reduction, shoulder responsibility and achieved motion cannot be collapsed into “late recognition.”

No new reach/down/double/pull classifier or private play knowledge was added. The current DL response uses consumed blocker flow and its installed shoulder; backer landmarks use observed line/runner/puller motion within the fit. Contain, cutback/lag and PA rules are preserved. A new block-type heuristic would need its own demonstrated failure beyond this first milestone.

The parked defensive arm changes shared power/counter/draw/PA Post Dig, leaves OZ/WZ/IZ/Duo and PA Flood unchanged, and retains its known limitations. Combining it with the offensive trial is exactly equal to offensive-only on OZ/WZ and defensive-only on the affected gap/control inputs. Thus neither compensates for the other on this panel, but this activation split does not prove general independence. Fresh zone/drive inputs do not activate that defensive trial; fresh puller responses retain the earlier separate evidence. No defensive flag is promoted.

[Eight games](../../data/reviews/current/run-game-contact-games.json), two per arm, roster construction/initial seeds 101/102 matched:

| Arm | Legal run snaps | Yards/run | Mean yards before contact |
| --- | ---: | ---: | ---: |
| Baseline | 73 | 3.115 | .576 |
| Offensive only | 75 | 2.719 | .627 |
| Defensive only | 65 | 2.097 | .141 |
| Combined | 69 | 2.930 | .510 |

Calls, situations and later RNG diverge; these are small diagnostic game cohorts, not paired later plays or a promotion certificate. Nullified runs are excluded. Mixed games reinforce keeping the trials off; no coefficients are tuned to rescue yards/run.

## Bounded milestone and priority

1. **Late useful position / cross-pair contact comes next.** Use the regressing mirrored WZ keeper and successful baseline, including the four-body collision. Investigate the first acquired surface/footwork/neighbor-contact divergence while primary checks the loaded fall and recovery. Useful position, not lifetime, is the criterion.
2. **Puller timing and cue continuity.** Separate the puller's actual startup from perceived departure, unstable classification and held target adoption. Generic faster run recognition and the parked stronger planner do not settle that problem.
3. **Earned double release/climb.** Retain achieved keeper hands/position/support and an attainable backer approach. Do not force an earlier climb or reimplement the already-landed takeover/torso/climb repairs.

The single best next step is the **mirrored WZ cross-pair keeper loss**, with the frozen baseline/trial and primary's four-body check. No wider controller package or duration extension should precede that comparison.

Validation: the complete TypeScript suite has **1,519 passes and the same existing single Tite failure** (`test/zone-helper-check.test.ts:440`); all 145 Python tests pass. Enabled zone/keeper contracts have the same Tite failure and 37 passes; 115 additional enabled cutoff/helper/combo/fit controls pass. Build/typecheck pass. No physical or RB source changes; original baseline prefixes and observer neutrality are explicitly verified.

```sh
# From repo root, Node 22. O/D are 0/1 according to the table above.
env -u RUN_READ -u RUN_READ_TURN RUN_CONTACT_TRACK=1 PULL_PLAN=0 CONTACT_TRACE=1 FLOW_STOP=5 \
  FLOW_INPUTS=data/reviews/run-game-contact/input-manifest.json \
  node --import tsx scripts/diag/defense/flow-panel.ts out/run-game-contact/offense.json
python3 scripts/diag/trench/contact-summary.py out/run-game-contact out/run-game-contact/summary.json
# Frozen mechanical handoff; outputs go beside the input, so copy into out/ first.
cp data/reviews/current/run-game-cross-pair.json out/run-game-contact/cross-pair.json
node --import tsx scripts/diag/trench/replay-loaded-step.ts out/run-game-contact/cross-pair.json LG,DT_S,RG,DT_W
```
