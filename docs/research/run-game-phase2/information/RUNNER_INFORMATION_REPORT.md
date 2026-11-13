> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](../README.md) for remote evidence access and the next-work plan.

# Runner information: accepted-source revalidation and causal experiments

The accepted runner cleanup is present. The remaining proximity allowance still asserts future restraint from a nearby teammate, but removing it also changes the runner's decision to leave the designed track. That downstream mode coupling explains one preserved adverse Duo exactly and much of a fresh adverse Counter. It does not explain every adverse play. None of the tested replacements is ready to adopt unchanged.

## Baseline and bounded claim

Accepted develop is `a5b024b9fbf8c51fc31401eefb79737be586814a`, engine hash `8dd26440610c1a08b55b02c9e01cdbd5cf78c9cd6649ce801902a7068419f978`, Node 22.23.3, default settings recorded in every native output. See `../BASELINE_REVALIDATION.md`. PR #292 has merged; the historical private-win and true-position eligibility findings are retired as current defects. On 208 development and 304 heldout accepted consumed evaluations, toggling hidden engagement wins changes no answer. Accepted, A and C answers also remain invariant when other actors' true positions and engagement membership change while consumed acquired pictures remain fixed. B passed the same test on all 208 development packets. This establishes those interventions at this evaluator boundary, not information integrity of the whole engine.

Current `carrier.ts:375–381` still grants an extra .25 or .7 seconds whenever any acquired teammate is sufficiently close to a perceived defender. It need not be interposed, controlling that defender, facing appropriately, or continuing contact. Existing observed slowing is already in the acquired velocity. Removing the extra allowance does not discard observed slowing, teammate obstacles, acquired recovery cues, or explicit scenario parking. The physical validity of forecasting additional restraint must be established separately.

## Models and controls

Three materially different acquired-only models were evaluated in isolated source copies. Patches and exact source hashes are retained in this directory and `candidate-identities.json`.

| Model | Mechanism | Limit |
|---|---|---|
| A, geometry | Delete only the automatic proximity allowance; preserve existing acquired velocities and obstacles | Conservative about additional future protection; incomplete policy |
| C, detour | For each candidate point, tangent-plus-arc distance around an observed interposed body, divided by defender public maximum speed; maximum across blockers, bounded by the existing .6-second projection horizon | A geometric obstruction is not sustained restraint; overlapping/indeterminate start or endpoint earns no credit |
| B, acquired history | Same blocker repeatedly interposed with low stance, fresh upright pose, low relative motion and low defender closing speed earns up to .6 seconds after .2-second persistence | Infers contact from coarse motion; provisional constants, no hand-contact observation, no outcome calibration |

`model-definition.json` declares A/C before their runs. After their failure to explain adverse native Duos, `history-hypothesis.json` records the materially different persistence hypothesis. B uses maximum age .6 seconds, gap .4 seconds, relative speed and closing limits 1 yard/second, and lateral/near geometry from public body radii. No parameter was selected by yardage.

`decision-controls-history.json` contains 12 declared cues in both mirror directions: interposition, wash-away, driven-back, escape-through, scrape-over, incidental teammate beyond, nearby wrong side, displacement with leverage, climb-away, stale picture, unknown pose, and down blocker. All four evaluators receive identical packets; B also receives five preceding constructed packets. All 96 model/scene answers pass the hidden-position/membership invariance check. B preserves the interposition/wash-away direction choice while rejecting several deceptive cues. Those constructed sequences establish model behavior, not certified physical retention. C's largest path allowance in the clear interposition example is only .03438 seconds; it chooses the same directions as A across all 24 controls.

## Native development panel and observation checks

The frozen Phase I 24-input set, first 12 designated runs from seeds 11/12 at ordinary .55 roster strength, is replayed on current source. It is not a fresh current-source capture. Its SHA-256 is `102b32365dd8b661fb0bdaf5fd161c74c01b661a92e5e6b82ed5ac85761ca235`. Every arm calls native `sim.run()` and honors snap gating. No input is discarded based on the result.

| Arm | Inputs / passive replay equality | Native evaluator packets | Descriptive yards sum |
|---|---:|---:|---:|
| Accepted | 24 / 24 | 208 | 50.45 |
| A | 24 / 24 | 213 | 47.84 |
| C | 24 / 24 | 213 | 47.84 |
| B | 24 / 24 | 210 | 46.48 |

On the same 208 accepted consumed packets, A and C differ from accepted on 76 answers each; B differs on 68. C differs from A on two answer packets, but A/C have identical complete recorded native results and RB command traces on all 24 inputs. B differs from A on ten frozen answer packets. Native packet counts differ after installed commands change the trajectory; only the frozen-packet comparison uses identical observations.

The observer checks complete PlayResult plus bodies/support, minds and RNG, perception state, World own state/caches/joints, reachable active-joint WeakMap attachments, normalized complete engagement state, ball, phase and time. Every final native arm passes. `serializationHashEqual:false` is retained because V8 byte serialization is not a structural equality oracle; the explicit structural comparisons pass. Early false comparisons from WeakMap serialization and recursive participant graphs are retained under `superseded-oracle` and in initial-failure files, not counted as football failures. This is a bounded state comparison, not a proof over unreachable WeakMap keys or every future execution. Later collector versions add history metadata; packaged script hashes are final-version hashes, not invented invocation-time hashes.

## Preserved adverse cases and the changed causal explanation

| Development case | Accepted yards | A/C | B |
|---|---:|---:|---:|
| S11-P022 Counter | −0.63 | 5.32 | 5.78 |
| S11-P029 Duo | 12.05 | 2.89 | 2.89 |
| S12-P011 Duo | 5.34 | −1.29 | −1.29 |

A/C do not rescue either Duo. B does not rescue either Duo. B's BallCarrier-local memory begins at handoff, but the existing runner has already acquired ordinary opponent and teammate pictures before handoff. A diagnostic extension retains only those existing returns on the observing agent; it creates no extra perception call. At S12-P011 1.55 it gives DE_W/Y .6 seconds, DT_S/LG .55 and DE_S/H .35, yet the result remains −1.29. Memory lifetime alone does not explain the loss.

Per-defender attribution on exact consumed packets changes only which defender receives the accepted allowance; no shadow command is installed. Three development nominations and one heldout nomination reproduce the native evaluator exactly with all allowances and leave native continuation unchanged. At S12-P011 1.55, only DT_W's allowance restores the accepted answer; removing DT_W alone gives the no-credit answer. Y's apparently useful restraint of DE_W is not the controlling allowance. At S11-P029 1.25, DT_S controls the heading difference. At S11-P022 1.95, DE_W controls it. See `credit-attribution*.json`.

Four native states were also subjected to conditional two-body World access islands, at 12 and 48 substeps. Defender pursues a frozen native runner point; blocker repeats its last native intent. Retained hands, hands removed with torso/ground retained, and passive blocker are separate arms. Joint capacities are frozen and controller/handfight/shed feedback and other bodies are absent. These are physical mechanism controls, not native block-value estimates or online inputs.

At S12-P011 the Y→DE_W and C→DT_W native pairs both load all 14 following ticks. Yet active-versus-passive separation after .7 seconds is about 1.208 yards for Y and only .054–.056 yards for C. Hand load therefore does not certify equal access restriction. The LG→DT_S island is not a clean positive: active retention leaves the defender closer than the passive blocker. In the Counter island all three arms reach the frozen runner envelope at .5 seconds. These adverse controls remain in `protection-islands.json`; no universal load-to-protection inference is warranted.

## Fresh heldout test of the narrow A repair

A was frozen by mechanism before capturing seeds 13/14, first 12 designated run calls each, ordinary .55 rosters, installed calls/fronts retained, no outcome filtering. `heldout-definition.json` records the choice. Input SHA-256 is `7f2c4462c176dc8f333bf548b64975acf9cbbd586d5644acaffff6b1f6ce36c8`. Accepted capture/replay and both passive observer comparisons pass 24/24.

A changes 14 recorded results and 13 yardages. The descriptive totals are 287.99 accepted versus 226.19 A. These totals are not a target, estimate of league performance, or model-selection criterion. Important opposing cases are Counter S14-P054 44.83→−2.70, Trap S14-P023 (`trap` / `trap`) 6.33→−1.11, Draw S14-P043 (`draw` / `draw`) 29.85→12.01, and wide zone S14-P057 (`wz_strong` / `wideZone`) 26.23→30.87. Every pair is retained in `summary.json`. A passes 31 focused tests in four existing carrier test files; no full-suite, scorecard or integration approval is claimed.

The heldout Counter exposed a sharper seam than a bad route heading. At 1.30 both evaluators choose heading zero, with the same blocked flags. The accepted allowance changes best score 1.765863→.572666 when removed, while aim score is −.299422. `carrier.ts:235` uses this utility difference to expire `aimUntil`. Accepted exits the designed phase; A stays. At 1.35 the first actual requests differ: accepted velocity (9.287471, −1.822307) versus A (5.837003, −1.689642). Actual first contact moves from 6.85 to 1.95 seconds. DT_W's allowance alone causes the score difference.

## Six native transition interventions

This follow-up is diagnostic, selected after observing the adverse cases. It is not a new candidate or another heldout test. After one nominated actual update, A is forced to expire `aimUntil` at the accepted time; conversely accepted has only that expiration suppressed once. Every later decision and World step remains native; no future-protection bonus is added to A.

| Case / boundary | Accepted | A | A with one forced exit | Accepted with one suppressed exit |
|---|---:|---:|---:|---:|
| S11-P029 / 1.20 | 12.05 | 2.89 | −1.00 | 2.89 |
| S12-P011 / 1.55 | 5.34 | −1.29 | 5.34 | −1.29 |
| S14-P054 / 1.30 | 44.83 | −2.70 | 31.83 | −2.64 |

For S12-P011, A with the accepted transition reproduces the entire accepted event list and RB command trace exactly, not merely yards. Thus this adverse case does not demonstrate that a future-protection forecast is necessary. The unsupported allowance supplied a mode-transition trigger. The Counter supports the same mechanism partly; S11-P029 rejects a universal early-exit repair. Its forced exit is worse, and its route-selection issue remains unresolved. Do not turn the nominated timestamps into a football policy.

## Current live-gap seam

`live-gaps.ts` is unchanged from Phase I. Current-source replay finds 88 qualifying subject-membership geometry changes in 74 unique packets across 20 plays; these are not 88 incorrect decisions. Eighteen scratch actual-consumer probes in five predeclared plays reproduce the baseline command exactly, and five native continuations remain equal. Two commands change with only hidden membership changed behind a fixed acquired picture: S11-P014 Power 1.20 LG, and S11-P022 Counter 1.30 LG. The latter changes runner velocity from (6.488554, −.213034) to (6.436211, +.849643). No corrected live-gap policy or outcome benefit was tested. This is a separate information seam, not evidence that proximity credit should remain.

## Decision and smallest next work

A is the simplest defensible direction for removing unsupported automatic restraint credit. It is not ready unchanged because the existing designed-phase transition consumes the same score and has material native adverse cases. C adds complexity without changing any development continuation. B demonstrates that acquired history can distinguish constructed cues, but fails both native Duos; preserving earlier acquisitions does not fix the decisive witness. Retire both as proposed solutions in their current forms.

The next implementation brief should separate two contracts: estimating defender arrival from acquired evidence, and leaving the designed track when the acquired route is blocked. A new transition rule needs an acquired route/access rationale, competing-route controls, and fresh predeclared native cases. Preserve S11-P029 as a required adverse control. Do not reintroduce a retention duration merely to obtain the old score threshold, force early exits globally, tune to the heldout yardage losses, or conclude that all protection forecasting is unnecessary. Physical restriction is real in the Y island; a justified forecast remains an open problem.

Raw scripts, patches, inputs, failed hypotheses and outputs are retained. `REPRODUCE.md` supplies exact commands; `summary.json` is regenerated without simulations by `summarize.py`. Accepted source, defaults and remote state were not changed.
