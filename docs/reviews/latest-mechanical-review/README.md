# Independent movement integration review

Accepted base: `f4146275ce7539816bf57b4ed55a0d2be10e48c7`, freshly checked
against remote develop. This reviewer authored no runtime implementation.
This publication changes only documentation and preserves portable patches;
it changes no engine, settings, tests, baseline or existing evidence.

| Scope | Exact publication reviewed | Disposition |
| --- | --- | --- |
| [#165](https://github.com/tannerthardy/football-simulation-/pull/165), attained-pose gait | `d922b7c27ec00536637aade935e6d9b2d07a9244`; code `36a77d17444658675f886c3914572faa181bd5a4` | **Technical ACCEPT**, isolated existing-law execution-order correction. Explicit convention disposition below; original Physics reservation is not relabeled as approval. |
| [#162](https://github.com/tannerthardy/football-simulation-/pull/162), bounded yaw response | `abd2dd266b46e87d323cc8bfbb8de341633cbbfa`; code `4df4fe406dbbf0edea42ab0a6ed16aeaf45c08f1` | **HOLD promotion**. Supported defect/repair, but this changes the ordinary shared motor response and recovery allocation. |
| [#153](https://github.com/tannerthardy/football-simulation-/pull/153), `GAIT_STEP=0.3` | `6184040fb0e2190b8799a2bd925df9e8af6494da`, Part 8 | **HOLD activation**. Experimental acceleration-law/default promotion. |

## #165: independent convention disposition

The question is whether a requested turn may grant directional gait capacity
before finite yaw achieves it. `locomotionAccel` documents an envelope at the
body's **current facing**. Ordinary `World.plan` and `stepBody` temporarily
substitute a rate-clipped requested pose to obtain acceleration, then restore
the actual pose. That grants capacity even if shared traction later prevents
all yaw. The correction removes only those two substitutions. The accepted
motor, target, inertia, traction, propulsion/braking laws, contact model,
perception and all 44 settings remain. Patch-mode World planning already uses
attained pose; no patch mode is activated.

**Explicit technical decision:** attained start pose for the current 50 ms
gait plan is a coherent first-order held-plan convention. World already freezes
the gait request and velocity-derived acceleration for that interval. Updating
only facing to an unattained future ceiling conflicts with that convention.
This correction does not promise exact interval-average gait or introduce a
substep gait integrator. It removes an ordering error under the existing
current-facing law, without a new response, strength or capability law.

The author and prior independent comment both reserved Physics disposition.
This review supplies an independent **technical** disposition of that precise
start-pose question; it does not claim the original Physics owner approved it.
Integration must explicitly record its final routine-correction versus
reserved-promotion classification before inclusion. No silent waiver is
recommended; exact combined verification remains Integration's.

Evidence and limits:

- Both mirrored quarter-turn starts achieve 0.190385 yd/s after 0.05 s,
  matching the attained-pose law, rather than 0.259616 yd/s. Finite yaw still
  acts. Three of five new contracts fail on accepted source; all five pass
  with the correction. Forward sprint, rest and traction-exhausted zero-yaw
  controls remain. Published 49 focused checks and typecheck pass.
- Native first physical differences precede changed requests/RNG; later
  grasps are not matched-execution grip experiments. `stepBody` remains a
  simplified unloaded forecast, not a contact-equivalence promise.
- **Adverse TOSS:** gain 3.84 to 4.49 yd; first wrap 3.60 to 3.70 s; tackle
  4.20 to 4.40 s. Earlier DE miss/body contact remains. PASS13 still catches
  and is tackled, 22.74 to 19.11 yd. Neither yardage sign decides correctness.
- Gait alone does not cure yaw ringing. Clear-window travel-heading reversal
  rises 0.210 to 0.229 degrees in the saved two-play comparison. This limits
  any smoothness claim, not the current-facing contract.

Smallest extraction: `src/physics/{kinematics,world}.ts` and
`test/gait-achieved-pose.test.ts`, byte-exact in
[pr165-portable.patch](pr165-portable.patch). It applies directly to accepted
develop, recovering source SHA256
`ee292a6a4396e81a50112f62cf344c759f62402cb9e3eb0bae8a257d00a5c2d1`.
No dependency on #162, #164 or the #153 package.

## #162: supported defect, reserved motor promotion

A constant no-contact 90-degree request overshoots 22.5 degrees and reverses
without changing intent or RNG. The proposed bounded critical response uses
incoming spin, the actual goal and finite braking; finite external-spin
removal and the existing torque/rate limits remain. Published 73 focused
checks/typecheck and 22 additional loaded/yaw checks support the implementation.

However, replacing `turnBody` with `turnBodyResponse` selects a different
ordinary angular response law. A helper's prior use in experimental patch
execution is not accepted production semantics. Its within-step peak torque
also replaces average net yaw impulse in the recovery traction reserve. Peak
reservation is conservative against hidden cancellation, but can reduce
support recovery while turning. Unchanged capacity numbers do not make that
allocation behavior unchanged. Both response and allocation need explicit
promotion disposition under the standing physical-law policy. **Keep the
original hold.** Do not import it as a dependency of #165 or #164.

Smallest coherent eventual extraction: its two physics files and the new
yaw-continuity test, [pr162-portable.patch](pr162-portable.patch), source SHA256
`51351a24096a139cecd658b527c54f73d391dfa14dacd20c8772bfc770383648`.
Motor-only replacement with a repeatedly clipped target was rejected; preserve
actual-goal wiring. TOSS first physical contact moves 2.55 to 4.35 s and finish
4.20 to 5.00 s despite lower gain; near-opponent path reversal worsens. Facing
reversal improves substantially; path reversal/pulsing barely change. Native
tapes use `365e4a9d...`; final source only removes a conditional containing
identical calls. Reuse is explicitly qualified, not relabeled as a new run.

## GAIT_STEP and Part 8

`GAIT_STEP=0.3` changes how propulsion approaches a submaximal requested speed
and the controller's expected gait lag. Existing experimental code still needs
law/default promotion; NFL agreement cannot approve it.

Part 8 arms use the research package `UC_MESH MESH_TEMPO QB_CARRYOUT PACE_LEAD`.
Preserve zone 20+ runs **28 to 63 per 1,200**, 40+ runs 22 to 48, and gap
negatives 93 to 138. DBs trailing 2–3 yd identify a diagnostic concern, not a
proved isolated accepted-source pursuit cause. Wide-zone flow and double-team
duration/displacement are investigation priorities, not force/duration targets.

The constant-request lone-body probe supports controller transitions as a
cause of its measured speed/path oscillations. It does not rule out #162's
separate no-contact yaw defect, prove all physics correct, or establish that
long doubles arise only from decisions. First-contact and proximity-based
double-duration operators retain their measurement limits. Keep `GAIT_STEP=0`.

## Composition, evidence and cost

#162/#165 overlap planning/motor code. If both are later approved, preserve
#165's attained-pose acceleration and #162's actual yaw goal; never restore
future-pose credit to resolve context. Recorded diagnostic composition
`0eca9aa8931e5ca7f6dc07b24508bedbd80c6831d4a9a0013a1671f3e3167b70`
has 40 focused checks/typecheck but is not an accepted production stack.
Composed PASS13 is live at six seconds, TOSS first contact is later still,
and travel-heading reversal rises to 0.245 degrees. Preserve those limitations.

#164's engagement controller has no textual overlap or genuine dependency.
Its isolated receipts remain local controller evidence; they do not prove a
future physical composition. Integration owns combined verification once on
the exact approved source/settings.

[Review receipt](review-receipt.json) records source/patch hashes and archive
checks. Both portable patches were applied via isolated Git indexes and their
complete sorted-path `src/` digests recovered. Four published archives and all
150 listed members were independently hashed. No engine tick, test, native
replay, game or shared-suite run was added; no NFL data was downloaded.

Reused producer costs: #162 final focused 2.117 s, typecheck 10.318 s, native
5.61 s; #165 focused 2.147 s, typecheck 11.451 s, two native prefixes 2.046 s.
These are original costs, not new runs or full-engine verification.

- [Yaw evidence](https://github.com/tannerthardy/football-simulation-/tree/ed6ebd21911a28f07a085094c393ea2613abeb69/data/reviews/movement-continuity).
- [Gait/interaction evidence](https://github.com/tannerthardy/football-simulation-/tree/e39866c0339163443065df1d456a064fe3a73d9c/data/reviews/movement-continuation-2026-10-19).
- [Existing #165 independent comment](https://github.com/tannerthardy/football-simulation-/pull/165#issuecomment-6279254245).
- [#162 continuation](https://github.com/tannerthardy/football-simulation-/pull/162#issuecomment-6279226446).

Next decision: Integration may explicitly classify isolated #165 for its next
compatible candidate. #162 and GAIT_STEP retain separate promotion holds. No
broad lab or game campaign is needed to make that distinction. Never merge the
data-only evidence histories to obtain these changes.
