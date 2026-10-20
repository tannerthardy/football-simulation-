# Puller intention/continuation audit

Read-only source review against accepted `2c98bed94adad8087c65f381d4090444ad283985` in `/workspace/perimeter-runs`. No tests, native runs, source edits, physical changes or new timers. Root owns fresh refs and implementation. Existing #69/#88 behavior is preserved in this assessment.

## What actually can switch

- `pullIdx` advances monotonically through waypoint tolerances. It is not repeatedly toggling the same path phase backward and forward.
- A kick becomes a log only after acquired inside-shoulder evidence; `block-log` is sticky, not oscillating each tick.
- The installed lead/wrapper target deliberately survives another blocker's private live engagement; this is the existing #69 information repair. Do not redo it.
- `readPull` holds target picture and wall-clearance evidence until its ordinary decision beat. `pullCleared` is monotone. These already provide finite decision continuity.
- The later `nearWall` branch is different: for non-GH pullers it checks **live actual OL positions every tick**, then replaces the locally emitted corner's x with `min(wp.x, own.x-.35)`. This can switch a forward/upfield request into a backward request without any acquired cue update. GH's corresponding path uses personally acquired `wrapTraffic` plus elapsed held time.

## Demonstrated source defect vs unanswered football effect

The non-GH `nearWall` input violates the acquired-information boundary. Changing a teammate's hidden current position across `distance<1.2 && teammate.x>own.x` changes route selection despite fixed `sim.see` evidence. The source data dependency is direct; a real-production-hook discriminator can prove emitted command impact cheaply.

Its **native frequency, contribution to spins, and whether a particular avoidant request is unjustified are not established by this source review**. A close wall can legitimately require depth. Do not remove teammate avoidance, increase capacity or introduce arbitrary persistence to make the old path win.

The branch also uses a target that stays .35 yd behind the blocker's changing current x while it remains active. Meanwhile waypoint progression is checked against the stored original wp before that local adjustment. This is a specific candidate cause for prolonged retreat or repeated corner correction, rather than proof of universal indecision. A native trace should record stored waypoint, emitted path and exact wall cue around the boundary.

## Smallest real-hook discriminator

Reuse `test/puller-route-progress.test.ts` K01 wrapper construction and the actual `RunBlocker.update`, avoiding another helper-only test:

1. Same saved input, own body/momentum/target, time and randomness in two fresh instances. Set phase `pullIdx=1`, but keep own feet more than .65 yd from the original second wp. Preserve lead role and distant target (>1.2 yd) so the private target-availability gate and attack transition do not obscure the mechanism.
2. Keep delivered `sim.see` pictures identical and held. Stage other teammates' acquired pictures ahead/far enough that achieved rear-wall clearance is satisfied. Set `pullSurface` absent and ensure no unrelated `block-log` tag selects a wrapper corner.
3. Put one OL's **hidden actual body** at `(own.x+.3, own.y+.1)` in one arm and more than1.2 yd away in the other; its delivered acquired picture remains identical/far in both. Other actual OL stay far. The first arm enters live nearWall and emits x behind the blocker; the second requests the stored waypoint. Assert same target/phase, different old command, no body change, no World/joint acquisition, unchanged RNG. Mirror the complete geometry rather than swap only a label.
4. Opposing control: deliver an acquired close obstructing teammate picture and retain the normal behind-wall response. Also preserve a clear acquired corridor and the first opening step. A repair must remove hidden-state sensitivity without bulldozing a real obstruction.

The smallest correction should use legitimate acquired wall evidence on the existing read cadence, with held elapsed motion if appropriate. It should not alter the shared spacing solver or turn every tick into a new sensor read. Any change to the corner's geometric behavior beyond the information repair needs its own native justification.

## Second private-state path to inspect only if the trace implicates it

The generic `availableTarget` gate still applies to kick/trap pullers: another actor's private `target.engagement` can invoke `findWork` and replace the reserved target. The lead-specific repair excludes leads, not kick/trap roles. `classifyWork` intentionally preserves reserved pull roles, so a replacement may retain the previous drive/log technique against a different man. `pullRead` correctly invalidates on target identity, but `block-log` itself is not target-keyed.

This is a source information risk and a precise possible target/technique inconsistency, **not a demonstrated current-play failure here**. A native target switch should trigger a paired hidden-engagement test through `RunBlocker.update`; do not broadly rewrite findWork or repeat #69's already accepted lead repair. If legitimately retargeting, target and per-target technique state should be adjudicated together, rather than adding a universal reversal timer.

## Boundaries

Run owns the pull controller's own path/read/target contract in blocking.ts. Flex owns shared spacing/traffic selection; Physics owns gait, actuator API and #163's acceleration-caller hold. `cornerSpeed` is a braking estimate, not a law granting an achievable turn. Root's native trace should distinguish reasonable low-speed turn/traffic response from the above upstream request changes before requesting solver work.

Recommendation: prioritize the non-GH nearWall acquired-information discriminator, then let the saved full-player trace decide whether the same cue/path transition is the first material blocker. Preserve genuine obstruction, useful kick/log leverage and a defender winning through a real block.
