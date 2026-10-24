# Pursuit request / interception budget (TKL-2)

`chase` chooses its existing sprint request before interception planning, using
the already consumed runner picture. Inside 12 yd it requests full effort;
beyond 12 yd it preserves `.75 + .2 * workRate`. No rating, physical profile,
cadence, persistence timer, perception query, contact law or force changes.

## Interface and scope

`SprintRequest = {speed, effort}` uses the same controls as `runThrough`'s speed
fraction and `MoveCommand.effort`. `pursuitPoint` accepts this optional fifth
argument and forwards it to `interceptPoint(..., {request, radius})`. The same
object supplies the emitted interception sprint. Existing direct callers that
already request full speed retain their legacy model. Other `timeToReach`
consumers are not migrated by this change.

`radius` remains a center-to-center envelope. Geometry is independent of the
request budget. The contract was acknowledged by the TKL-5 owner in
[#264](https://github.com/tannerthardy/football-simulation-/pull/264#issuecomment-6382125103).
The existing interception/gather spans are deliberately preserved; this patch
does not certify those older spans as anatomically correct. Pending #264 and
#260 are not imported. INFO-1's target-exclusion work remains separate and the
around-body implementation is untouched.

The estimate still describes the **sampled** point. The later time bias and
leverage shift remain `steeringPointEstimate: 'not-evaluated'`. Close gathering
still bypasses interception. Partial gathering, navigation, contact techniques,
spacing and the snap guard can own later requests; their existing trace stages
remain visible. A certificate for the sprint's sampled point is not inherited
by a different request or objective.

## Scalar movement model

The wanted forward speed is the minimum of two independent limits:

```text
raw requested speed = profile.vmax * request.speed
wanted ceiling = min(raw requested speed,
                     profile.vmax * frozen speedScale * clamp(effort,0,1))
```

Effort is not multiplied twice. The ceiling limits what velocity the player
wants, not existing momentum or the body's braking/cutting capacities. The
physical profile remains intact. For the ordinary gait, forward acceleration
eases toward that speed on `profile.tau`. With the existing `GAIT_STEP` mode,
easing is also bounded by the **full** sprint drive curve: replacing physical
vmax with the requested cap would weaken that curve incorrectly. The estimator
integrates the two scalar phases at their analytic crossover. Above the wanted
speed, it carries current forward momentum while braking toward the budget;
it does not instantly clip velocity.

The approximate half-transverse penalty and away-motion braking/overshoot
remain. The model freezes `speedScale`; it does not simulate body yaw, support,
posture, the near-stop drive floor, evolving fatigue, contact, obstacles or a
future runner cut. A held budget is a forecast assumption, not a promise that
the controller will retain it after the next ordinary decision. This is still
an **estimated-feasible** result, never a physical guarantee or optimal-control
reachability oracle. If no sampled point passes, it returns the least-late
fallback with that status, even when a particular finite seek happens to arrive.

Selected command JSON exposes `estimate.request` with speed/effort, raw
requested speed, wanted-speed ceiling and leveling time. The wanted ceiling
is not a cap on current carried velocity. Console output also prints the
already computed budget, without another prediction, observation or draw.

## Reuse and reproduction

Accepted starting source: `cac9e1000b27e9222d47a23db6ebdf65eaac25f9`.
The implementation's first measured revision is `9830752da23489879952b703989f25938820378a`;
later source-qualified metadata/diagnostic changes are identified in the PR.
The six-game card is evidence for that exact behavior revision, not a claim
that every later source hash is identical. Settings and input checksums are in
each generated result. Raw output stays ignored `out/`.

Reuse #263's [delivered fixture and unpack command](https://github.com/tannerthardy/football-simulation-/pull/263#issuecomment-6379869270),
SHA256 `dcb9523ae5bc1cb6b8852a2fa74c5ce38ab6169477d3a607901bb8b0aeb415eb`.
Do not relabel the historical P002 sweep as the fixture's Comebacks play. The
saved target is **IRN-RB3/index6**; the earlier handwritten ID/index were wrong,
as the explicit [identity erratum](pursuit-arrival-comparison.md) records.

```sh
node --import tsx scripts/diag/pursuit-effort.ts --frozen out/effort/frozen-263.json --out out/effort/frozen-comparison.json
```

Fresh play seeds, actors and the exposure rule were nominated before treatment:
seed19 first completed catch from log2 (P004, D:FS IRN-CB1), and seed31's same
rule (P020 inactive for reduced effort; next catch P028, D:FS IRN-S1). Primary
active clocks are 3.10/3.15 s. P004's later first changed request at 3.35 is an
additional diagnostic snapshot of the same preselected play, not another
independent transfer. In a separate checkout of the accepted base:

```sh
node --import tsx scripts/diag/capture-game-play.ts --seed 19 --play 4 --max-steps 32 --out out/effort/fresh19
node --import tsx scripts/diag/command-trace.ts --capture out/effort/fresh19/play.bin --actor D:FS --from 0 --to 15 --out out/effort/fresh19/baseline.json
node --import tsx scripts/diag/capture-game-play.ts --seed 31 --play 28 --max-steps 32 --out out/effort/fresh31
node --import tsx scripts/diag/command-trace.ts --capture out/effort/fresh31/play.bin --actor D:FS --from 0 --to 15 --out out/effort/fresh31/baseline.json
```

On the candidate, reuse those exact files, using absolute paths across checkouts:

```sh
node --import tsx scripts/diag/pursuit-effort.ts --capture out/effort/fresh19/play.bin --baseline out/effort/fresh19/baseline.json --actor FS --out out/effort/native19.json
```

The operator checks complete candidate trace off/on execution and final
bodies/minds/RNG. Its `wholePlayFirstDifference` is the first recorded witness,
not an unrecorded substep. It also reports the first material selected request
change, entry body, consumed pictures, estimate and modifiers. An inactive
selected player can still see a changed play when teammates' decisions differ.

For a material contact change, `--tackle-window FROM,TO` passively copies real
chance/normal operations and genuine consumed uniform draws. Native tackle
events supply the actor/target identities. It preserves event-start and
World-end clocks separately and restores instance methods before whole-state
comparison. Copying this diagnostic operator into a baseline checkout supports
the same passive comparison; absent legacy budgets remain explicitly absent.
No execution draw is swapped or rerolled. These are isolated tool wrappers,
not hooks added to the engine or a production recording framework.

The PR retains the adverse P002 touchdown, the changed inactive P020, the
transverse miss, and seek arrivals that the approximate model rejects. A
forecast-point arrival, lower mean YAC or a changed tackle ending cannot by
itself establish better football. Contact-span changes require their own
evidence before any composition is tested.
