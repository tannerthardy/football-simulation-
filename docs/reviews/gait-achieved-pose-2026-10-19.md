# Gait must use the body's attained pose

Independent accepted-base proposal for parent and Physics review. Accepted
develop `f4146275ce7539816bf57b4ed55a0d2be10e48c7`, canonical queue
`9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`. Branch
`codex/gait-achieved-pose`; code
`36a77d17444658675f886c3914572faa181bd5a4`. The yaw correction in #162 is
separate and is not imported. Parent subsequently supplied two native prefixes
for this candidate and two for an isolated diagnostic composition. No new NFL
query, full suite or promotion.

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

## Native first divergence and execution qualification

The parent supplied exact frozen `TOSS` and `PASS13` inputs through six seconds,
terminating recording when a play finishes. Their input hashes are respectively
`d3814c8789c33f53f11b55bafe03216d3f4d1edb9932dece18144b5f40a1c571`
and `7778b1e4ff586b043b8fe5085f0df77dc2ed60dd0718a0215f2199f7e2e7e336`.
Initial physical bodies and every common initial-record field agree. The older
accepted recorder additionally stores `role` and `mindSnapDelay` metadata; the
new recorder's omission does not indicate a changed player or installation.
The unchanged source is the accepted runtime above; gait is `ee292a6a…`.
The old yaw-only tapes use `365e4a9d…`, whose compatibility with final #162
`51351a24…` is documented in its report. Diagnostic yaw-plus-gait composition
is `0eca9aa8931e5ca7f6dc07b24508bedbd80c6831d4a9a0013a1671f3e3167b70`.

Using a one-millionth-yard/yard-per-second/radian divergence threshold:

- TOSS first changes Y (`SO-TE2`) during tick 0.05–0.10 seconds. Its request,
  final intent and shared RNG agree; achieved velocity changes from
  `(0.30135, -0.15017)` to `(0.28915, -0.14409)` yards/second, a 0.01363-vector
  difference. The first materially changed request follows at 0.10 seconds;
  the first saved shared-RNG difference is at 0.70 seconds.
- PASS13 first changes CB_W (`SD-CB3`) during tick 0.15–0.20 seconds, again
  with the same request, intent and RNG. Velocity changes from
  `(0.26548, -0.07225)` to `(0.27815, -0.07569)`, a 0.01313-vector increase.
  The next request differs at 0.20 seconds, shared RNG at 0.50 seconds. Thus
  using attained pose can increase or decrease movement; this is not a global
  speed reduction.

These establish an initial physical-execution difference before a different
controller decision or random draw. Later paths consume different information,
requests and draws. The subsequent grasps are not matched-geometry or
matched-execution experiments, and their outcomes cannot diagnose grip quality.
The read-only reduction and records are
`out/gait-achieved-pose/{review-native.py,native-review.json}`; no new native
execution was needed for this review.

## Standalone and composition outcomes, including adverse evidence

| Frozen input | Accepted | Yaw only | Gait only | Diagnostic composition |
| --- | ---: | ---: | ---: | ---: |
| TOSS, completed tackle gain | 3.84 | 2.10 | 4.49 | 1.30 |
| PASS13, completed tackle gain | 22.74 | 16.13 | 19.11 | Live at 6 seconds |

Standalone gait preserves TOSS's DE_S (`SD-DT1`) missed tackle at 2.50 seconds
and physical runner collision at 2.55 seconds. Its first wrap changes from
CB_S at 3.60 seconds to LB_S at 3.70 seconds, followed by CB_S and FS assists;
the completed tackle moves from 4.20 to 4.40 seconds. The additional 0.65 yards
and later wrap are adverse evidence. PASS13 still throws to Y at 2.80 seconds
and catches at 3.80 seconds. The first wrap changes from FS at 5.05 seconds to
LB_S at 4.60 seconds; this remains a successful completion and defensive finish,
not an interception control or proof that every later defensive choice improves.

The composition delays TOSS's first physical runner contact to a LB_W wrap at
4.80 seconds and tackle at 5.55 seconds. Lower final gain does not erase that
delay. In composed PASS13, the same actual Y catches at 3.95 seconds, receives
LB_S/FS wraps at 5.55 seconds, and remains live at the six-second budget. It is
censored: neither a successful tackle nor a failed tackle has been established.
Event times above are controller tick-entry stamps; final recorded physics
endpoints are 0.05 seconds later. Do not confuse that convention with extra
simulated play duration.

The parent's existing operator compares 517 same-player/time windows that are
clear of all players and valid above two yards/second in **all four arms**
(192 TOSS, 325 PASS13); windows are correlated, not independent snaps:

| Mean per admitted sample | Accepted | Yaw only | Gait only | Both |
| --- | ---: | ---: | ---: | ---: |
| Alternating body-facing correction, degrees | 1.202 | 0.203 | 1.270 | 0.082 |
| Alternating travel-heading correction, degrees | 0.210 | 0.204 | 0.229 | 0.245 |
| Speed pulse, yards/second | 0.1252 | 0.1226 | 0.1252 | 0.1271 |

Gait alone does not fix yaw rocking. The composition retains the yaw motor's
large body-facing improvement but **increases path-heading reversal** in this
sample. No smoother-path claim is supported. Proximity is a tracking proxy,
not contact ownership; these two plays do not establish population transfer.
The existing NFL reference remains unchanged and is not a matched four-arm
population. No new NFL query or data acquisition was performed.

Native receipt `out/gait-achieved-pose/native/receipt.json` records 2.046 seconds
collection for the two completed standalone plays. Its `native-launch.json`
pins all 44 flags. Parent's separate composition receipts record 2.425 seconds
collection and 40 focused checks; they cover only that composed source.
Accepted/yaw baselines and the NFL/operator evidence are reused. No new games,
full-suite verification or additional tests accompanied this saved-data review.

## Disposition

The attained-pose mechanism remains supported for **independent Physics review**:
it removes unexecuted gait pose without changing the physical limits. No new
correctness blocker was identified. This author statement is not independent
approval or integration authority. Existing yaw ringing remains in the standalone
candidate; #162 repairs that separate mechanism. Both adverse native evidence
and the censored composed pass remain visible. Physics must decide the discrete
attained-start-pose convention and the two motor/gait repairs independently;
Integration owns exact combined verification. Path/controller jitter remains an
open task, rather than a reason to tune this correction to yardage totals.

## Fetchable evidence and continuation

The [immutable common evidence packet](https://github.com/tannerthardy/football-simulation-/tree/e39866c0339163443065df1d456a064fe3a73d9c/data/reviews/movement-continuation-2026-10-19)
is commit `e39866c0339163443065df1d456a064fe3a73d9c` on
`codex/movement-continuation-evidence-2026-10-19`. It preserves this candidate's
exact inputs, mechanical failures/passing receipts, native tapes, reduction and
runtime patches alongside the separately scoped yaw/contact/preview diagnostics.
Packet totals are not this candidate's test count or native budget. Eleven
source patches were restored and verified; its combined 20 new prefixes cover
seven inputs, 15 terminal and five censored, for 12.530 seconds case collection
across all arms. This gait candidate remains two native prefixes and 49 focused
checks; the composition remains diagnostic.

The parent's [movement continuation memo](https://github.com/tannerthardy/football-simulation-/blob/abd2dd2/docs/reviews/movement-request-continuation-2026-10-19.md)
links the independent yaw motor, gait and contact work. Contact draft #164 is
not a dependency or imported correction here. Physics-owner review remains
required, and Integration retains combined verification.
