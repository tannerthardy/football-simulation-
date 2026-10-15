# The large support-history gap follows an opposite turn request

**The saved witness does not demonstrate unstable recovery feedback.** At4.10s the runner headings straddle the antipode of the requested heading. The shortest-turn planner chooses opposite directions. With the validated contact integrator fixed, swapping that yaw target alone largely transfers the later support trajectory. Swapping only support deviation does not.

This is a causal diagnostic, with **no engine, controller, capacity, recovery or default changes**. Tested diagnostics `a713347`, from PR55 `1986d92`; runtime remains `c03b45d5b285e0cd364ad1bdd4f8b5cbe859508fdb8977ce6ea25cd20d96d6cd`. Baseline stays `4ded6b6`; fetched primary remains `862258c`. [Receipt](../../data/reviews/current/support-command-audit.json) pins flags, input/script hashes, exact results and limitations. Reuse the two [saved input-only packets](../../config/grip-native-support-packets.json) and [PR55 integrator/reference](grip-recovery-work.md). PR56 remains separately reviewable and is not combined here.

## First consequential difference

The two4.10s inputs include different issued yaw plans; they are not a controlled perturbation of support state alone. Both want heading0 and already spin in the negative direction. Their headings are1.2194° apart:

| History | Heading, rad | Margin from −π | Incoming spin, rad/s | Issued turn over the controller tick |
| --- | --- | --- | --- | --- |
| Previous | −3.124139605 | +.017453048 | −1.285822 | +.393111rad |
| Transition | −3.145421825 | −.003829171 | −1.343436 | −.393111rad |

The retained PR51 histories place both headings on the positive-shortest-turn side at4.05s. At4.10s the transition history has crossed −π and requests the negative turn; the previous history changes direction at4.15s. This is a discontinuity in the defined **facing-plan selection**, before the divergent recovery requests. Equivalent representations of each physical heading shifted by±2π preserve the same turn, so this is not a representation/wrapping arithmetic error.

The causal sequence is: opposite yaw targets → different angular response and attachment velocity → different held-foot/contact force → different achieved corrective step and support deviation → later changes in availability, yaw reserve and requested recovery speed. The controller's current instantaneous shortest-angle rule permits both branches. This witness alone does not establish which turn an athlete should prefer while loaded and already rotating.

For a declared5% diagnostic scale (force relative to allocated foot capacity, command relative to requested speed), force difference first exceeds the scale at4.1015625s:54.650kg·yd/s², while command difference is only.012729yd/s. Support deviation first differs by>.01yd at4.1125s; command difference does not exceed5% until4.1234375s. These are observation thresholds, not physical acceptance tolerances or NFL targets.

## Causal interventions and opposing controls

Replay the existing96 intervals /50ms with the unchanged corrective callback. The actual between-history deviation gap at the end is.073068yd, from.003817yd initially. Counterfactual swaps are diagnostic inputs, **not proposed controller corrections**.

| Change at4.10s, all other inputs retained | Previous history | Transition history |
| --- | --- | --- |
| Swap only support `xi`: final difference from its original trajectory | .003705yd | .004223yd |
| Swap only runner yaw target: final difference from its original trajectory | .075864yd | .076857yd |
| Same yaw swap: remaining gap to the other original history | .003284yd | .003862yd |
| Swap only holder yaw target: final difference from its original trajectory | .000140yd | .000194yd |

Material, pose, velocity and support-filter swaps are also retained in the receipt; none individually reproduces the dominant gap. They are conditional interventions, not additive causal percentages. Small `xi.x` perturbations from1e-3 down to±1e-6 give final/initial gain about.970 in the previous history and1.107 in the transition history. They do not show the approximately19-fold separation of the differently commanded histories. The inverted-pendulum model can still amplify legitimate disturbances elsewhere.

Opposing controls check the other history in both swap directions, exact observer-on/off equivalence, equivalent±2π representations, and nearby headings away from the antipodal boundary. No controller, RNG or physics settings are changed to make the trajectories agree. The original arms retain96/96 and95/96 accepted intervals; the latter has the same single native material-chart fallback. The yaw-swapped previous arm also has one such fallback, explicitly recorded.

## Accounting checks and what they establish

An independent closed-form evaluation of this **fully ramped, outside-base recovery phase** reconstructs capture-point displacement from achieved COM acceleration, the follow envelope, contact-height shift and held-foot velocity deficit. It agrees within1.2e-16yd on the original arms and targeted swaps; acceleration-filter differences are below5e-16. It deliberately refuses other phases. This checks consistency with the declared reduced model, not its biomechanical truth.

Recomputed ground yaw/translation/correction allocation agrees within2.3e-13kg·yd/s². Squared strength/traction excess is at most4.7e-10, consistent with roundoff at the approximately1e6 budget scale. Desired foot speed respects its allocated capacity. Planar body-energy versus recorded ground/contact work closes within3.2e-12 on the originals and below1e-8 for all diagnostic swaps. These are allocation/accounting checks, not validation of unmodeled vertical or limb energy.

Four new sampled intervals on the yaw-swapped controls pass the unchanged independent1024/2048 grip-reference gates: worst normalized candidate error.000643, refinement.000052, allowance.0625. Original full-tick reference evidence is reused. The new counterfactual continuations are not claimed to have an independently refined reference at every interval.

An exploratory budget observer initially mixed callback body order (holder/runner) with World indices (runner/holder), creating spurious excesses. That diagnostic mapping was corrected and explicitly asserted before collecting the final evidence; no engine or capacity change was made. A diagnostic-only TypeScript array annotation was also fixed before final build.

## Decision and remaining uncertainty

**No first unjustified recovery request or support-accounting difference was found in this witness. Do not change recovery strength or expand the solver.** The dominant cause is a discontinuous facing choice across an antipode, followed by a consistent physical response within the checked model. Calling the whole19-fold gap a recovery instability confounds the different commands.

Which earlier solver history is physically more accurate is not decided here, and this is not a diagnosis of the older .24yd witness. Whether shortest-angle choice is the right loaded-athlete controller remains open. Both directions are currently allowed, and changed tackle endings cannot choose the correct one. The best next step is a bounded facing-controller question: establish whether its turn-choice contract should consider existing angular motion near a half-turn, with a normal non-antipodal turn and a deliberate reversal as opposing controls. Do not force matching histories, add a dead band, or silently change that contract based on this tackle.

[PR56's reel-stop guard](https://github.com/tannerthardy/football-simulation-/pull/56) remains an independent native-force scope correction. Its720 old below-stop positive-reel calls and the native stop law establish that omission; the changed tackle is only consequence evidence. Its first observed violation is later than this fork. The old dry-cap numerical certificate, nine earlier43/52 patch failures, keeper/older.24yd witness and seed5001's inherited+.95s delay remain unresolved and separate.

## Reproduce and cost

Under Node22, run `node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/support-command-evidence.ts`. The complete instrumented diagnostic, including targeted swaps, small perturbations and four independent references, takes about2.14s on this host. This is diagnostic cost, not a solver benchmark or game-speed claim. Raw traces stay in ignored `out/support-command-audit/`; only the compact receipt is tracked.

The20 focused checks pass (four new causal/observer controls plus the existing16 corrective-foot contracts), in2.31s. Typecheck and final build pass. No full suite, new contact panel or games: runtime/source/defaults are byte-identical to PR55, whose1935pass/1retained dry-cap failure and145Python result remain historical evidence. Nothing is promoted or merged.
