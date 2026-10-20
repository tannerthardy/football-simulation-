# Offline approach replay: restoration boundary

Read-only audit of accepted `2c98bed94adad8087c65f381d4090444ad283985`, source `4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571`, and the existing `football-db-stalk-workoff` baseline capture. No controller calls, movement forecasts, tests or native runs were executed for this review.

**Verdict:** the tapes support an exact local shortlist/gather reconstruction after selecting the correct consumed cue and validating the reconstructed raw output. They are not complete simulator checkpoints. A locally composed raw-command preview must not be described as an exact prediction of the later refined request or reacting play.

## Minimum actor state

`chooseApproach` (`src/sim/approach-control.ts:20`) reads:

- Full `body`, `profile`, `pos`/`vel` getters and `r('tackling')`.
- `speedScale`: derived deterministically from body energy, sprintLoad and squeeze.
- `isDown(now)`: body support state plus scenario `downUntil`.
- Engagement truthiness, and installed `runFit.kind/edge/side`.
- Its explicit arguments: acquired `seen`, contact radius, lateral offset, original far command and time.

`gatheringApproach` (`common.ts:143`) needs the same body/profile/getters, tackling and speedScale; it makes no observation or random draw. No mind or behavior object is required. Reconstructing pursuit's far command additionally needs normalized awareness, anticipation, pursuit and workRate, the target profile, caller horizon and deterministic pursuit bias.

The saved initial record has the full player/ratings, profile and runFit. Each tick's **before** body has full precision position, velocity, facing, energy, profile, support, spin, sprintLoad, squeeze and squeezeHeading. Optional support fields are preserved whenever present, including foot/strike/yaw, lean, load, felt load, acceleration and recovery state. Use the complete deep clone, not a hand-written support subset. Body/profile-derived capacities need no hidden rating conversion. An Agent-shaped shell or `Object.create(Agent.prototype)` avoids constructor mind/RNG work; initialize any required ordinary defaults explicitly.

Limits: `downUntil` is not captured; ordinary native fixtures have no scenario parking, so explicitly document the default −1 assumption. Engagement is not captured at behavior entry: `repBefore` is taken after all decisions and engagement refinement. A rep can be created/released between those times. Tackle-bond membership/joints and last-step touch are also not complete in the tape. In particular, a new grip can own the action before support shows load/foot. Select clearly free pre-contact decisions or qualify the missing ownership proof; do not infer free solely from upright/zero load. JSON serializes nonfinite support `since` values as null (e.g. ordinary initial −Infinity); that is harmless to the narrow upright path only where the state-start timestamp is unused, and prevents a blanket bit-exact checkpoint claim.

## Match the consumed cue, not the last target row

Use each `calls` record's `[start,end)` slice into `cues`, preserving order, `a`, `b` and `consumer`. A `(time,observer,target)` lookup is insufficient: the same target is consumed at different delays in one update, and the wrapper does not record the requested delayScale itself.

Actual OZ4 examples (RB is the target):

| Actor/time | Ownership admission | Chase gather/shortlist picture | Pursuit current / older |
|---|---|---|---|
| Mike / 3.10 | 29899, age .20 | **29900, age .15** | 29901, age .15 / 29902, age .35 |
| FS / 2.50 | 24536, age .20 | **24537, age .15** | 24538, age .15 / 24539, age .35 |
| SS / 2.50 | 24545, age .20 | **24546, age .15** | Absent: full gather returns first |

Chase calls the fast-look `see`, gathers, and can return before `pursuitPoint`; otherwise the latter calls current and older pictures. An edge fit reuses its existing run-fit `seen` and does **not** acquire this faster chase picture. OZ4 DE_W at 1.90 uses cue **18639**, age .25, in behavior slice `[18639,18667)`; the selected `edge-fit` point is `(40.3,28.748220822928527)`. A keyed fit can inherit a cue consumed by the parent. Resolve the source branch before naming a cue index by role.

## Recover the right command stage

`calls.command` is already `blendApproach(chooseApproach(original,...), near, gather)`. It is not the pre-shortlist original. `ticks.requests` is later `containCoverage`, and `ticks.intents` is later contact/bond/spacing refinement, potentially carrying dive/lunge requests. Do not feed the saved final raw command into the old shortlist as its original, or gather it a second time.

For edge fit the far original is recoverable from the selected saved `edge-fit` aim using `track(speed=.9,gain=3,facing=π)`. For chase it is `runThrough` toward the reconstructed pursuit point, including effort. `Rng.fork('pursuit:'+idx)` depends only on setup seed and label (`src/core/rng.ts:123`), so its unrecorded WeakMap bias is reproducible without replaying prior random consumption. **The horizon remains caller-specific:** ordinary pursuit3, alley3.5, declared insertion2. The tape does not label that internal call boundary. Reconstruct the branch and compare the full final raw command to `calls.command` before claiming exact replay.

`previewFreeMovement` clones all body/support fields into a one-body scratch World, resets optional gait fields/time, and has no sensing/RNG. This reproduces the production helper's **empty-space held-command** prediction under the same source/import-time flags and default center hand model. It does not restore live joints, queued strikes, bodies nearby or future controller reads. Its World scratch arrays are not an independent missing actor state; the helper resets them through the ordinary step. Keep exact source and baseline environment with the replay.

The useful comparison for complete-command scoring is therefore: reconstruct and validate the original/gather/selected far components; compose each candidate as production will return it; preview those complete local raw commands from the same body and acquired picture. Later containment, spacing, contact, tackle ownership, cuts and ordinary tick replanning remain outside that forecast and require separately labeled native evidence.
