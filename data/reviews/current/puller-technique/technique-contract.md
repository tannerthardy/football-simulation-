# Puller technique contract audit

Read-only, 2026-10-20. Parent fetched accepted `origin/develop@2c98bed94adad8087c65f381d4090444ad283985`; #174's contact work is separate. Inspected AGENTS/CLAUDE/TESTING_COSTS, current puller source (unchanged by #174), current production-hook tests and existing handbook. No tests, simulations, source changes, network scans or reference downloads.

## Football contract

The handbook deliberately permits several families rather than one universal pull:

- Flat/open first steps commonly serve kick/trap; square/skip often serves Power's second-level insert; wrap/lead uses an open turn around the wall. Preserve a supportable strike surface while clearing actual bodies, not a mandatory 90-degree pose. `moving-run-footwork.md:99–148`, especially §§2.2–2.4; `trenches.md:215–270`.
- The tackle's near hip is an acquired moving surface, not a point which must be ceremonially visited. Exit region and attainable strike are coupled; leave the arc when the useful route opens, but remain/deepen/fail when genuine bodies obstruct it. `moving-run-footwork.md:186–210`, §§3.1–3.2.
- Kick versus log depends on the acquired edge and achieved wash. A permanent log tag does not prove a lane has opened; the wrapper/runner must respond from their own pictures. `moving-run-footwork.md:211–227`, §§3.3–3.4.
- Contact must actually constrain the defender's route through runner arrival; reaching a body or retaining loaded hands is insufficient. Turning/braking/support and reachable shoulder matter. `moving-run-footwork.md:229–244`, §3.5; Power §4.1 and Counter §4.2.

Literal anatomical foot placement is outside the reduced model. Requested/achieved orientation, depth, speed, support, contact and useful protection are measurable now. Body facing is not acquired gaze.

## Two actionable production hypotheses

### 1. Opening footwork is translated into an unintended body turn

`planRunBlocking` creates a straight-back first waypoint when PULL_STEP=0. `RunBlocker.update` returns `goTo(...facing:undefined)` for that first step (blocking.ts:955–957). `goTo` forwards that undefined facing (common.ts:19–29), while ordinary desired-facing selection follows requested velocity above 0.4 yd/s (kinematics.ts:122). Thus a pure backfield movement request also requests a turn toward the backfield; this is not merely World failing to achieve an appropriate pull pose. The next flat waypoint then changes that requested orientation again.

PULL_STEP couples a diagonal opening landmark with explicit playside facing. That is a plausible coherent first-step repair, not evidence that every role should universally use its exact angle. Preserve clear versus obstructed drop-step geometry and distinguish kick/trap open pull from Power square insertion. No startup acceleration or yaw-law change is required to demonstrate the command question.

Cheapest discriminator: saved native first-step raw/final velocity/facing and achieved yaw, with role/pullIdx and normal snap readiness. If the first meaningful spin begins from the backward-facing request, compare one installed role-appropriate facing/opening action from that same full context. If final intent is already appropriate and attained yaw fails, hand the exact interval to Physics instead.

### 2. The flat-pull corner uses inconsistent and sometimes unacquired objectives

`pullIdx` advancement tests distance to `plan.pullPath[idx]` (blocking.ts:913). The acquired target-y adjustment is stored into that point (938–941), correctly keeping the ordinary target progression consistent. But `nearWall` then replaces only the local steering point's x with `min(wp.x,a.pos.x-.35)` (942–952), without storing the changed x. `cornerSpeed` and `goTo` use that replacement point (953–957), while the next tick's completion test still uses the other point. The replacement retreats with the player's own body every tick.

The non-GH `nearWall` branch reads teammates' actual live positions (949), while GH uses held acquired `wrapTraffic` (943–947). Thus hidden current teammate changes can alter a non-GH route without a new teammate observation. A real production-hook fixed-picture counterfactual can demonstrate this dependency; it is not yet a quantified native failure frequency.

This is a concrete producer/progress/corner inconsistency and an information-boundary concern. At a 1.2-yard nearby-wall boundary it can switch the depth request between an old upfield corner and a moving retreat point, encouraging braking/reversal. Once a blocker has gone deeper than the old point but completed the lateral crossing, the old 2-D point test can also demand an unnecessary return toward it. Source inspection alone does not establish the motivating saved case actually hits this path; capture that interval before editing.

Coherent fix boundary: one acquired body-clearance/exit-region objective should drive clearance, steering, braking and progression. It must not merely remove avoidance, inflate through-speed, force a phase advance through bodies, or add a timer. An attained clear region may justify exiting the flat leg even without visiting the old point; a genuinely occupied route still requires depth or waiting.

## Exact opposing controls and existing evidence

Use the existing real-hook setup helpers rather than a broad matrix:

1. `test/puller-route-progress.test.ts` K01 mirrored clear/obstructed wall and unavailable-target controls. Add the distinct deep-but-laterally-complete state only if the native trace demonstrates the inconsistent completion contract.
2. Hold acquired teammate pictures fixed while moving only hidden actual teammate position across nearWall's branch boundary; the production hook must not change its route solely on that hidden change. Existing private-defender-contact controls cover a different dependency and cannot certify this one.
3. `test/puller-target-read.test.ts`: first step, unchanged uncleared wall, ordinary held read cadence, stationary target, penetrating kick/trap and widened-target progression. Existing `facing:undefined` assertions are old command expectations, not a football requirement; any change needs role/geometry justification rather than simple waiver.
4. `test/puller-kick-transition.test.ts`: mirrored upfield end fit after achieved clearance, preserving no free hands/teleportation.
5. A genuine box/squeeze edge and an acquired wrong-arm control: preserve inside-out kick versus physically executed log; do not require displacement or old gain.

There is no source evidence here for a global switch repeatedly discarding all intentions. `pullIdx`, `pullCleared`, `wrapOutside` and `block-log` are retained/monotonic; target reads have personal cadence. The temporary nearWall objective and automatic-facing translation are more specific candidates for visible request reversals than a universal commitment timer. Other retarget/lifecycle issues should be traced separately.

#163 actuator/gait and World/yaw remain Physics-owned. Global teammate spacing remains Flex-owned. The proposed investigation is the puller's own producer/controller contract in blocking.ts; shared helpers need owner coordination before edits. A real requested-versus-achieved mismatch under a justified complete command is required before a physical execution complaint.

## Follow-up: default depth-clearance facing adjudication

Parent supplied a native K01 trace at source10c052b: the initial negative-x command has facing undefined, so it requests approximately180°. At0.25s the next lateral request wants approximately+98° while achieved facing is approximately−76°; the body continues around to roughly−271° by0.75s, with over300° cumulative RG turn by1.2s. No target/role reversal occurred. These are parent observations, not independently rerun results.

**Recommendation:** make the complete command for the existing PULL_STEP=0 straight-back clearance point explicitly face upfield (0 in the current attack frame). This preserves a square depth-clearance action until the flat leg. It does not prescribe square shoulders for the whole kick, trap or wrap; the subsequent flat/fit phases keep their current orientation policy. PULL_STEP=1 keeps its authored diagonal opening point and playside-facing request. Use the existing attack frame rather than assuming global0 if that is variable.

This is a minimal installed-path/pose repair, not a new motor law, acceleration bonus or universal pulling-style framework. A pure depth-clearance waypoint should not silently request a pivot toward the player's own end zone. Square/skip movement during this short clearance phase is a defensible coaching choice across the default installed path. It may spend more time under real backpedal/shuffle limits; retain that cost rather than force the old arrival speed. Test requested and achieved motion separately.

The mirrored initial `facing:undefined` assertions in `puller-kick-transition.test.ts` encode the old command, not a football protection contract. Their substantive purpose is that a reset/uncleared first-step puller follows the installed clearance route rather than immediately fitting the end. Replace only that incidental expectation with the correct upfield-facing/first-route command while preserving backward clearance direction, acquired target/read eligibility, unchanged body state and no awarded hands. The after-clearance fit still requires its own personally read target and supported movement; it should not be identified merely by whether facing is defined. Flat-to-upfield route controls whose pullIdx is1 or2 remain separate and should not be relaxed by this adjudication.

## Independent corner review at de14562

Read source and tests only; no checks or simulations run. The ordinary corner correction is coherent for the current kick/trap/lead path constructors. Its one-sided lateral-station condition defines an exit region rather than requiring return to a missed point. Current acquired body clearance is required for that advance, and the same acquired rear surface fixes the flat-leg depth goal instead of issuing a retreat that moves with the puller. A penetrating kick/trap can still select its existing attack before completing a stationary point. GH/pullSurface traffic is separate. Normal goTo, cornerSpeed, physical execution and contact remain authoritative.

The two-point split-zone slicer is safe in the current constructor: advancing its final point makes kick fit true, and returns attack before the now-undefined waypoint would be used. Ordinary lead and trap constructors have three points. This safety relies on the installed role/path contract; it is not general support for arbitrary one/two-point lead paths.

One residual limitation should remain visible: readPull.clearanceX is the minimum depth of the entire installed crossing corridor, including wall members the puller has already passed laterally. The new current-clearance condition can therefore demand depth again if a distant, already-passed teammate sinks, even when that teammate cannot obstruct the turn-up segment. Existing controls distinguish clear from genuinely obstructed depth and held from hidden information; they do not isolate this remote-passed-wall case. That is a conservative corridor approximation, not demonstrated native harm in this review. Inspect it only if a material first changed request in the bounded native comparisons points there. Do not waive a genuine nearby obstruction or add another route planner to resolve a hypothetical.

No source-level blocker found in the exact default scope. Recommend the bounded candidate if the parent's native controls demonstrate useful motion/protection without a material unresolved adverse change; report the corridor limitation rather than claiming optimal routes or universal technique.

## GH held-motion test adjudication

At runtime459f7506 the parent's protected-check receipt reports exit1: the final `counter-gh.test.ts` test no longer reaches its asserted held-versus-carried crossing. Its extrapolated guard x38.5906345 remains slightly ahead of Hx38.5859426, rather than behind. The first12 GH assertions passed according to the parent. These results were not independently rerun here; the full focused set must not yet be reported as passing.

The underlying contract remains valid: advance held acquired traffic only by time since that read, avoiding a retreat caused solely by the old observed position. The native GH04 prefix's milliyard-level crossing is an incidental precondition, not that contract. Changed guard-controller geometry can invalidate that precondition without proving the GH branch lost motion carry.

Replace only this final prefix-dependent assertion with a robust staged held-read production-hook witness, preferably using a saved legitimate H/controller and traffic state. Keep H on its installed flat leg and short of its lateral station; provide a nearby acquired guard whose held x is comfortably ahead but whose time-carried x is comfortably behind. Keep the held-read timestamp/next-read gate so the real update must use acquired memory; assert no renewed traffic read, no backward retreat, positive lateral command, unchanged body/RNG and no awarded contact. A stationary version should retain the need for depth. Preserve the mirrored acquired/hidden traffic and reachable/unreachable connection controls unchanged.

This stages a controller contract rather than prescribing an ending. Keep the original failing native precondition and exact receipt visible; native GH transfer can then be judged on useful achieved movement/protection rather than silently requiring the old micro-crossing.

## Final checkpoint qualification

The historical de14562 corridor concern above was demonstrated in K04 and
repaired at459f750: an acquired passed body is retired only outside combined
widths and without closing into them before the ordinary next read. No-wall
is explicit null. The independent final disposition ACCEPTS this scope. The
GH test replacement at1fd8d1d now passes the contributor's full53 focused
checks/typecheck. Its preserved failure above is a previous checkpoint, not a
remaining failure. The final reviewer inspected and accepted the actual staged
held-memory production hook; no reviewer test/simulation repetition occurred.
