# Gait must use the body's attained pose

Independent accepted-base proposal for parent and Physics review. Accepted
develop `f4146275ce7539816bf57b4ed55a0d2be10e48c7`, canonical queue
`9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`. Branch
`codex/gait-achieved-pose`; no native runs, NFL query, full suite or promotion.
The yaw correction in #162 is separate and is not imported.

Question: does merely requesting a turn grant forward gait before finite
physical yaw executes it? Yes. `World.plan` and `stepBody` temporarily replace
the attained facing with the maximum rate-clipped requested pose, compute gait
acceleration in that unexecuted pose, then restore the real facing. The existing
traction-limited yaw motor can achieve much less rotation than that ceiling.

The smallest correction removes only those two temporary facing swaps. The
accepted yaw target, yaw motor, acceleration/capacity/braking laws, information,
controllers, contact and release rules remain unchanged. Center World planning
now agrees with patch planning's existing attained-pose convention; no patch
contact is activated. This is the current tick's attained start pose, not a new
substep gait integrator or prediction of the interval's average pose.

## Evidence and opposing controls

A 90-degree turn from rest, requesting nine yards/second sideways, previously
achieves 0.259616 yards/second after the first 0.05-second step. The same profile's
attained-pose sideways sprint law allows 0.190385. Asking for yaw with the same
translation request changes that first gait interval before the body has earned
the turn. The correction gives 0.190385 in both `World` and `stepBody`, for both
turn directions. It still executes finite yaw immediately; it does not hold a
turn request until a timer expires.

The frozen-body contract run on unchanged accepted runtime
`7d23555ad67094fbe2e79726d9b761dd5f068c06fb90ff0796ec61c953750197`
fails three assertions and passes two opposing controls. Candidate runtime
`ee292a6a4396e81a50112f62cf344c759f62402cb9e3eb0bae8a257d00a5c2d1`
passes all five. Forward sprint and rest keep their ordinary first-step motion.
A synthetic high-braking sideways entry exhausts traction, keeps actual yaw at
zero and preserves the same finite capped translation. The latter is a limiting
mechanical control, not a claimed NFL profile or exact saved football state.

Separately, the #162 review's paired pure diagnostic demonstrated the same
retained gait defect with its critical motor: virtual pose 0.4 radians versus
actual first-step pose 0.070865, with 0.0452 yards and 0.2102 yards/second extra
translation after 0.30 seconds. Those longer-trajectory values belong to #162's
motor and are not relabeled as this accepted-yaw candidate's transfer evidence.

## Focused receipts and limits

`out/gait-achieved-pose/baseline-contract-receipt.json` preserves the original
three failures; `focused-receipt.json` preserves 49 passing checks: the five new
contracts plus existing preview, actuator and loaded-recovery checks. The final
focused launcher costs 2.15 seconds. Typecheck also passes. All use the baseline
launcher's 44 resolved flags, including `RUN_CONTACT_COMPONENTS=1`, `GAIT_STEP=0`
and unset `CF_FLOW`. No observation, controller or diagnostic sampling is added
to live execution.

This establishes a physical consistency repair, not less path jitter or better
football endings. Existing yaw ringing remains in the independent candidate;
#162 repairs that separate mechanism. Relative heading, available acceleration
and subsequent contact can change after the first corrected gait interval.
Parent will review the tiny scope before arranging a bounded native comparison
of each isolated correction and their composition. Physics owns its acceptance;
Integration owns combined verification.
