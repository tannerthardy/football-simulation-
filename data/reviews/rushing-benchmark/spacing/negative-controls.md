# Shared spacing: bounded opposing controls

Read-only recommendations; no simulations, production/test edits or tuning.
Inspected `src/sim/spacing.ts`, `test/traffic-control.test.ts`,
`test/traffic-turning.test.ts`, `test/spacing-yield.test.ts`, and published
`data/reviews/alley-support-and-tail-audit/audit/six-tail-command-witnesses.json.gz`.
The witness gzip matches SHA
`e5624cfa3155cf9810672a9ae7bb1e605e368ef9e058e19695b48ebe3f51f837`.
Spacing bytes are identical in baseline601, `out/coverage-continuation/alley-v1`
and the current checkout: file SHA
`b1aac502e9c49c31993a342de54ff19a6fe61bfddd01a488bd8396d8c61433a5`.
This does not attribute later combined-source outcome changes to spacing.

## Native motivating boundary

At C2/right SS4.20, contained request (+3.919804,+6.866186), facing1.570122,
cutSkill1.042857/posture.537755 becomes applied (0,0), preserving other fields.
At4.25, (+4.792815,+6.849808), facing1.443412 becomes (0,0). Those are recorded
refinement differences, not proof that traffic avoidance was wrong. Parent owns
the actual neighbor/preview diagnosis. The spacing pictures of teammates have
age.05, distinct from recognition receiver pictures (.25) and the pursuit
carrier picture (.15). Use the actual spacing observations, not the last
receiver/controller picture or hidden current neighbor geometry.

## Smallest useful control matrix

| Opposing control | Expected contract and failure to catch |
| --- | --- |
| Legitimate moving crossing versus an actually colliding crossing | Hold actor body/profile/posture/facing and command fixed. Change only the personally observed teammate crossing trajectory. If the original **attainable curved path** remains clear, preserve it even if a requested straight ray looks awkward. If the crossing actually enters that attainable path, preserve useful slowing/stopping. A change that simply disables gathers for pursuit would fail the latter. Existing tests predominantly use stationary forward traffic; the moving-crossing pair is the highest-value new negative. |
| New rear conflict, both peer orders | Reuse existing `(actor x50,vx9; forward x54.3,y±1.1; rear x49,vx9)` fixture. Neither half-speed nor zero may cure forward overlap by creating rear overlap. Preserve `traffic-turning` and mirrored `spacing-yield` assertions. Test all currently observed peers, not just the original worst one; candidate selection must not depend on which peer is iterated first. |
| Engaged, squeezed, loaded or tactile-constrained actor | Preserve the free-preview exclusions: engagement, requested/active squeeze, joint/last-contact constraint, support foot/strike, nonzero lean/load, non-upright state, free/dive/lunge, push. Do not move these guards into an early return that disables ordinary radial spacing. Existing loaded-grip test deliberately expects straight braking, **no free preview**, and actual negative grasp work afterward. A free forecast cannot certify a held actor's recovery. Retain posture/facing/skill/squeeze and actual joint/contact physics. |
| Stale constant-velocity observation | Hold the consumed picture, actor state and input command fixed; move only the teammate's unseen current body or next intent. Request must stay identical, with one existing observation per peer and no RNG/buffer mutation. Conversely, update only the observed velocity so the peer visibly leaves the corridor: next ordinary reconsideration may restore movement. A subsequent real cut may still cause collision; the finite picture is not an outcome guarantee. Do not use a teammate's hidden future intent, current target or support capacity. |
| Open field, parallel and mirrored lanes | Retain fast straight/parallel/near passable and empty attainable turn controls. Clear traffic should keep the ordinary request and avoid previews when the cheap envelope rejects it. Reflect x/y velocities, positions, body/request facing and squeeze heading consistently; use the same capabilities rather than a different generated player. Once the observed obstruction clears, normal calls must regain progress; no persistent freeze or remembered avoidance mode. A too-close runner must still physically collide rather than be teleported or receive extra braking. |

Existing tests already cover safe moving gathers, necessary stops, rear conflicts,
held-cue invariance, active/requested squeeze, loaded grip, clean lanes,
attainable-deflection rejection and unavoidable physical contact. Reuse these;
do not expand the scenario library before the native disagreement identifies
the exact contract to change. A valid result may still slow a defender and yield
a touchdown. Removal of a zero request is not sufficient validation.

## Selection and evidence boundaries

For a minimal repair, distinguish the behavior/contained command, radial
refinement, free-preview candidates and final applied command. If the repair
reconsiders a radial refinement, preserve ordinary straight following/closing
braking as the counterexample. If it changes only gather selection, retain
radial output byte-identical outside that gate. A nearby clear teammate must
not become a repulsion field, and solving one forecast conflict cannot create
another. Keep all non-velocity intent fields unless the diagnosed policy owns
them explicitly.

Use the six declared native tails as paired football guards, including the
PA/left immediate wrap and C2/left ordinary endpoint; preserve all adverse
executions. Existing witness selection contains no C2/left spacing window, so
that row's initial/outcome receipt is not a positive proof of crossing safety.
The parent may collect a declared opposing witness later, but this report does
not invent one. A controlled pure mirror is distinct from the football left
fixture, where receiver profiles/assignments differ.

Accept a shared change only when the same input/capabilities produce coherent
spacing across these controls and the first native applied command is explained
by an observed cue. Retain achieved displacement, teammate contacts, upright
support and existing work/force limits as separate checks. No safety-specific
exception, pursuit-slot exemption, wider traction/strength or cap-depth change
is supported by this spacing audit.
