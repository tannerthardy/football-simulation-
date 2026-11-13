# Crossing teammate spacing diagnosis

The safety does perceive a plausible crossing threat. The proven unnecessary action is the **complete stop**, rather than the existence of collision avoidance. The original requested turn is unsafe against the consumed constant-velocity linebacker picture; a slower moving turn clears the same picture without stopping.

This is a shared controller choice defect, not a force, traction, strength, balance or body-contact defect. Keep the perception delay and the physical movement limits.

## Source and limits

- Native witness source: `601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
- Current frozen archive: `3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f` (`out/coverage-continuation/alley-v1`). Its only changed source file relative to 601 is `src/sim/behaviors/defense.ts`. Spacing and every physics/core/player file are byte-identical.
- Published saved witness SHA: `e5624cfa3155cf9810672a9ae7bb1e605e368ef9e058e19695b48ebe3f51f837`.
- Original full raw packet SHA: `68013aab627c373108864787fafef6f312fe0cd60267ffcd56fd4420a127f9c5`.
- Exact body decoder SHA: `4b397d4bb65ca5626c0214bb2db8e850f9879a419c8b6f6a2214f5b70e8dcf55`.

The diagnostic invokes the original production spacing function with reconstructed bodies and exactly the saved already-consumed teammate pictures. It replays **11/11 selected outputs exactly**. The same applied stop in a one-body World reproduces the actual complete achieved body after the first 50 ms, including energy/support, at both safety ticks.

All six native setups, profiles, exact initial bodies, full execution/plain signatures and endpoint receipts agree between the published subset and original raw packet. These are inherited native dual-execution checks, not new six-play simulations. `saved-prefix.json` retains the actual common command prefix. Short World rollouts below are held-command counterfactuals, not future full-play predictions or contact checkpoints.

## Exact chain

`PlaySim.tick` first consumes the defender's controller, contains coverage requests, applies engagement/tackle technique, obtains each teammate picture through the existing `see`, applies spacing, and only then sends the final intents to `World.step`.

For SS (#21) in `DA-R2-curl_flat-cover2-R`:

1. Controller/containment outputs agree from 3.50 through 4.10. Spacing does not change them.
2. At **4.15**, spacing picks the existing half-speed moving gather. This is an ordinary yield control, not evidence that every slowing request is wrong.
3. At **4.20**, the pursuit request is `(3.9198037108610055, 6.8661862644845435)`; at **4.25**, it is `(4.792815493543083, 6.849807584009485)`. The raw and contained requests are identical. Final World input becomes `(0,0)` at both ticks while preserving facing, cut skill and posture.
4. No radial headway correction is applied at either tick. The velocity-tube broad phase selects only **LB_M (#15)**. The free turning gather is the precise changing stage.
5. Mike is **5.80885 yd** away at 4.20 and **5.35471 yd** at 4.25. Spacing consumes the pipeline teammate picture of age **0.05 s**, not an old carrier picture. His seen velocities are approximately `(3.99,-5.35)` and `(4.15,-5.14)`, crossing toward the safety. The safety begins at approximately `(55.21,8.66)`, velocity `(-1.63,2.56)`, then `(55.13,8.78)`, velocity `(-1.45,2.27)`.
6. The original achievable curved path collides with that observed constant-velocity picture near the end of the 0.6 s horizon. The half-speed alternative still overlaps, so `gatherForTurn` goes directly to a zero request.

## Same-cue achievable alternatives

Clearance is the minimum swept center distance minus the existing `.9 * (radiusA + radiusB)` contact distance. Values use the production free movement law at the ordinary 50 ms decision interval, full original encoded body/support/profile/energy, and unchanged facing/posture/cut skill. All candidates remain physically upright.

| Requested fraction | 4.20 clearance (yd) | 4.25 clearance (yd) |
| --- | ---: | ---: |
| Original | -0.289483 | -0.059033 |
| 3/4 | -0.320054 | -0.130170 |
| Existing 1/2 | -0.058941 | -0.060863 |
| **1/4 moving gather** | **+0.444622** | **+0.347308** |
| Existing stop | +1.140581 | +1.149288 |

Quarter speed clears **all ten observed teammates**, not just Mike. It achieves a moving final velocity around `(0.97,1.70)` or `(1.15,1.64)` at 0.6 s rather than zero. This is enough to prove the full stop unnecessary under the same consumed cue. It does not prove the original full-speed pursuit safe under that cue.

The fraction/clearance relation is not monotonic: 3/4 is worse than original. Avoid a monotonic bisection or an analytical intercept assumption.

## Actual traffic versus the forecast

Mike's actual recorded raw request is already turning him toward `(8.99,+0.84)` at 4.20 and `(8.75,-0.31)` at 4.25. A two-body free World rollout from the exact saved safety/Mike bodies with their original held native requests produces **no contact**, minimum clearance +0.85315/+1.02188 yd, and both players remain up. The same is true for quarter/half gathers. All work/arm budgets and residual checks pass.

That is useful retrospective evidence that the crossing forecast is conservative. **Do not supply Mike's unobserved request to the safety or use the actual ball carrier's future state.** Replacing seen velocities with the hidden current velocity would also change the 4.25 conclusion; that is another reason to preserve the consumed picture in controls. Estimating teammate future curves from extra pose/history would be a larger perception feature, unnecessary for this bounded repair.

## Small shared repair

Retain the original risk test, tube broad phase, ordinary half-speed gather, stance/facing/skill, all-peer clearance checks, contact/load/engagement/squeeze exclusions and final stop guards. **Only after half speed fails**, evaluate one additional **quarter-speed moving gather** with the same production free preview. Choose it only if all samples stay up and it clears every observed teammate. Otherwise preserve the existing stop-or-original decision.

This needs one extra preview only in a failed-half conflict; clear paths and ordinary half gathers need no additional work. The fractions are controller requests, not new physical strength/traction multipliers. Do not raise agility or remove spacing.

## Required controls before promotion

Use `negative-controls.md` for precise existing tests and new opposing cases. Priorities:

- Exact native SS 4.20/4.25 both mirrors: quarter moving gather, unchanged raw request/read/body, no new observations, no body/RNG mutation.
- Preserve the already-safe ordinary half gather (including the 4.15 native prefix) and clear/open-field requests.
- Moving crossing peer that genuinely needs yielding; quarter also unsafe, existing real stop remains available.
- Rear traffic conflicts in both peer orders: quarter must not cure forward risk by creating a new conflict behind.
- Constrained/engaged/squeezed/down/dive actors: do not invoke free forecasts; preserve valid radial braking and physical contact work.
- All six retained native cases and the PA mirror control: report actual motion/contact/finish and any adverse change. Do not demand matching aggregate NFL yards or claim this one spacing repair explains the original touchdown.

Evidence: `diagnosis.json` stores exact commands/cues/bodies, radial/gather calculations, all-peer previews, bounded two-body World reports and six inherited native receipts. `saved-prefix.json` identifies the first complete stop. `diagnose-spacing.ts` is source-guarded and uses no new controller, perception, RNG or ball query.
