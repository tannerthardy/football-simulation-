# Run protection: conclusions, failed shortcuts and next repairs

The evidence does **not** support describing the run-game problem as simply
superior defenders winning properly. Some defensive intentions are legitimate,
and those defenders must remain free to win. But intention, ownership in the
current model, and physically earned execution are different questions.

This work continues PR #4 on `codex/run-hand-coherence`, with comparison fixed
at `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. Its two earlier implementations
are not reassigned. Both new controller trials are preserved in commits and
withdrawn from the final runtime. Source, production tests, defaults, shared
solver and capacities are byte-identical to starting PR #4 `b64910e`.

## The general principle

**A useful block controls the defender's access to the ballcarrier's path for
the required time, while preserving achievable contact and the blocker's base.**
It need not keep the defender at a fixed distance, stop all motion, or maximize
the defender's distance from the blocker's chest. Running a defender past the
path can be useful; moving him off the chest can also help him enter the path.
An early touch is not automatically a failed block, and a large final gain is
not proof of correct blocking.

Leverage is directional and depends on time: the blocker's position and base,
contact geometry, available forces and torque, and the route the defender can
actually take before the runner arrives. A feet target, hand action and release
must serve that protection task together. They do not necessarily need the same
relative velocity. A blocker can move closer to maintain contact while his hands
run the defender farther past the lane.

The player must act on his installed responsibility and personally acquired
cues. Evaluation can inspect actual trajectories; a controller cannot use the
runner's future path, an opponent's private command, or a hidden assignment.
When cues are late or a reachable route is absent, a legitimate defensive win
is an acceptable result.

## Three broad issues established by this pass

1. **Contact execution is not yet certified.** Clean free-motion controls have
   no external ground impulse/yaw, torso contact or strike, yet production
   center hands change total angular momentum. Force/work limits pass; that
   does not supply the missing torque. The defect affects passive steering as
   well as new active hands and persists at finer timesteps.
2. **Body-relative heuristics do not define useful protection.** The original
   redirect helps a defender move farther off the blocker. That can sacrifice
   the lane. The two replacements below show that following a foot target or
   preserving one signed seal projection is also insufficient as a general
   rule. Protection needs the developing surface and arrival window.
3. **Many default contacts happen before useful blocking load.** In two
   ordinary native games, 43 of 81 first RB contacts involve a defender who
   never previously received blocking load. These are not all assignment busts;
   they are a reason to investigate approach, combinations, collection and lane
   choice instead of expecting stronger hands to solve the run game.

The existing hand-ownership model is an additional limitation: a noisy ratings
walk still chooses the controlling actor. A near-zero negative `control` value
can give the defender the active hand role. That is not evidence that he has
physically earned inside hands or is the superior player overall. Geometry,
contact, refitting and shared capabilities need to explain ownership before
we can make that claim. Existing parked hand-fight work is not reimplemented.

## Controlled trials: a real local conflict, two inadequate general rules

The [60-input manifest](run-hand-coherence-inputs.json) was declared before
candidate results: 20 preserved hand/gap controls, eight preserved PA controls,
and 32 new generated cases spanning eight run concepts, both directions and
Over/Under fronts. These are lab inputs, not NFL or ordinary-game frequencies.
An actual frozen checkout supplied all 60 comparison histories. Collection is
sharded to avoid JavaScript's single-string limit without shortening plays.

At WZ seed 23's native 2.25-s step, RG requests +.793 yd/s of relative foot
movement along the acquired surface, while his active hand target requests
approximately −1.430 yd/s along that surface. The blocker uses local contact
motion and consumes no runner picture in that hand decision. That exposed a
coordination question; it did not prove that prioritizing feet was universally
correct.

| Trial and preserved source | Rule tested | Alone, clean approaches gained / lost | Decision |
| --- | --- | ---: | --- |
| Foot-goal, `e02ad7e`; runtime `fb924f152014789b5b2fb629a1de4299c16777dedfd4adaf37648b9381051e60` | Cancel an active redirect opposing the own requested relative foot/surface motion | 2 / 1 | Withdrawn. Restores WZ 23, but disrupts a draw runoff. |
| Seal-side, `814c8e0`; runtime `24c030fd5efbd55aba979539b94cccc596ee6b2ed5f4a4a2ca0672fcc6ea3321` | Cancel a redirect moving the defender toward the protected side of the installed seal | 1 / 1 | Withdrawn. Does not establish timed path protection. |

The draw is informative. At 1.85 the first trial cancels LG/DT_W's drive
because its relative hand motion opposes closing the requested offset. The
second allows that step, but cancels at 1.90 as the hand tangent crosses the
sign of the seal projection. Those scalar tests do not establish whether
running the man past the runner's route is useful. Neither was repaired by
adding an angle band, timer, strength bonus or another exception.

The [complete receipt](run-hand-coherence-receipt.json) retains all 540
observed/plain pairs, every flag profile/source, all adverse rows and endings.
All pairs are neutral; all end by 13.30 s, with zero 25-s censoring.
The disabled candidate retains **60/60 complete state/RNG histories** against
the [actual frozen pin](run-hand-coherence-baseline.json).

| Paired result | Before → after completed gain, yd | Interpretation |
| --- | ---: | --- |
| WZ 23, original hands → foot-goal | −.261 → 1.526 | Restored clean approach, with a draw loss elsewhere. |
| Draw/Over 29, original hands → foot-goal | 10.937 → 10.002 | Earlier contact, from 3.00 to 2.75 s. |
| Trap/Under 29 mirror, original hands → seal-side | .081 → 5.095 | Restored clean approach. |
| Draw/Over 29, original hands → seal-side | 10.937 → 18.358 | Earlier contact, from 3.00 to 2.70 s, despite more final yardage. |
| WZ 23, combined hands → combined seal-side | −.262 → 1.489 | Restored clean approach. |
| New counter 23 mirror, combined hands → combined seal-side | 3.915 → .965 | New approach interruption, contact 3.55 → 3.10 s. |

The seal-side rule was tested alone before components and defensive hands.
Its components pairing has one gained/one lost clean approach; its full
combination also has one gained/one lost, with a different adverse case. That
is why a successful local example cannot stand in for protection of the whole
developing surface. These observations are not proof that every changed
defensive win is illegitimate. They are insufficient grounds to install either
rule as a general repair, especially under an angularly defective contact law.

The extended PA controls also matter. All eight remain exact through 3.5 s.
At endings, five retain full histories, two differ only in the hand `drive`
request metadata, and one changes physically. In `new-pa_flood-s23-mirror`,
RB catches a checkdown at 5.75; an LT/DT_W active drive starts at 5.80, and the
first physical difference is at 5.85. Enabling the original offensive hands
changes the endpoint from 70.216 yd at 13.30 s to 34.473 yd at 9.55 s. All
new guard arms retain that same late result. This is an inherited hand-action
case, not a new guard or pull-handover implementation. Pass approach labels
are not used to grade the RB-run panel.

The [eight-input request ablations](run-hand-checkdown-ablations.json) show
that the first changed LT/DT_W pair is not the cause of the touchdown loss:
removing it retains the 34.473-yd tackle, while retaining only it restores the
70.216-yd touchdown. The first changed body or force must not be mistaken for
the responsible protection action. Its World replay below is a law witness,
not a causal explanation of the endpoint.

The [four one-input follow-ups](run-hand-checkdown-pairs.json) identify the
responsible pair: **Y/FS's offensive hand action at 6.65 s**. Y/FS-only
reproduces the 34.473-yd tackle; removing Y/FS restores the 70.216-yd touchdown.
X/CB_W-only also retains the touchdown; removing X/CB_W does not rescue the
loss. This is useful evidence against explaining every adverse hand outcome
as a superior defender winning with his hands: the new tool is in the
offensive player's hands here. Its exact execution still needs a valid law.
The [Y/FS native World witness](run-hand-witness-checkdown-causal.json) retains
the causal request separately from the earlier LT law witness.
Together these follow-ups retain **20 additional neutral request-ablation
pairs**, alongside the 540 main-panel pairs.

## Ordinary default runs, not selected failures

The [native-game manifest](run-game-census-inputs.json) declares roster seed 71,
game seeds 73/79 and independent selection seed 707. Selection is drawn at
called-run entry before the outcome. All eligible runs remain in the denominator,
including the sampled 80-yard run. The [census receipt](run-game-census-receipt.json)
records 89 called runs, 81 RB handoffs/first RB contacts and 17 sampled clips.
None is nullified or censored. Full native run histories and game results match
plain observation; adding detailed cue capture preserves the earlier histories.

Among the 81 first RB contacts, 38 stoppers previously received blocking load,
30 were assigned but never engaged, and 13 were never assigned. An assignment
includes a combination's backer; it does not prove the climber was free or could
reach him in time. Unassigned defenders can be expected free defenders. These
are preliminary frequencies in two generated games, not league or NFL rates.

One preselected example, game 73 / zero-based log index 48, is OZ weak. LB_W
contacts RB at 2.30 without previous engagement. RG eventually targets him on
a climb; at 2.15 RG consumes a .30-s-old picture of LB_W moving
(−3.422, −1.658), and requests (−.225, +.754) by the 2.20-s sample. That is a
specific collection/arrival interval to investigate. It does not prove that
an earlier departure would preserve the first-level block or be physically
attainable. The source film includes actual commands, applied intents, targets,
and consumed cues, so the next investigation need not infer decisions from
positions or final yardage alone.

## Shared-law evidence and the next tests

The [48-row free-hand matrix](run-hand-law-matrix.json) uses the same native
bodies/requests at 12/24/48/96 substeps, in existing center and opt-in patch modes,
with active-drive and passive controls. It changes no solver source. On the two
cases clean in both modes, center residuals persist: OZ 19 active angular change
is 19.339 → 19.346 from 12 to 96; WZ 23 active is 22.887 → 22.893 and passive
is −22.882 → −22.887. Clean patch residuals stay below 2.19e−11. WZ 7 develops
torso contact in some refinements and in patch, so those rows stay labelled
contaminated rather than claimed as isolated hand-law controls. Fresh patch
acquisition at a frozen center state is not an original patch football replay.

The starting [four small witnesses](hand-action-protection.md) remain the
physics owner's handoff. The [late checkdown](run-hand-witness-checkdown.json) also has a two-body native World
replay at 5.80, with native/reduced pose error below 1.25e−14. Its free hand
control is angularly defective with and without active drive. Neither smaller
timesteps nor force/work compliance repairs that structural defect.

| Priority | Test that can disprove the explanation | Required evidence before a repair is accepted |
| --- | --- | --- |
| 1. Shared contact law | Free and grounded hand pairs, passive/active, mirrors, force-point torques, shared helpers and timestep refinement | Linear/angular momentum, work and ground/arm budgets account for achieved motion. The physics owner changes the solver once. Existing patch football failures remain gates. |
| 2. Timed protection | Frozen O/D/runner encounters: seal, overrun, inside escape, reverse flow, cutback and a legitimate defensive win | Contact closes the attainable route before runner arrival using acquired cues. Preserve useful runoff and physically earned defensive wins; do not require every run to cross clean. |
| 3. Combination and collection | Native keeper/helper/backer intervals, including the sampled OZ weak clip; held/removed load and slow/fast backer controls | The keeper really owns/transmits useful contact; the departure clears the old surface and can reach the observed backer. No fixed early-release timer. |
| 4. Ownership and refits | Equal physical profiles with different timing/geometry, then stronger/weaker bodies under the same law | Reaching, losing and regaining useful hands arise from contact, capabilities and paid actions; a scalar sign cannot award a block win. Coordinate with existing hand-fight work. |
| 5. Runner and defensive decisions | Change only the acquired picture of a developing lane, pull or cutback; include stale/missing pictures | Requests follow available evidence and their installed jobs. A blocked called lane or legitimate delayed read can change the result; neither side gets perfect future knowledge. |
| 6. Football realism | Random ordinary native/NFL film plus identical conditional movement/contact operators; games last | Comparable bodies show plausible timing, acceleration, turning, displacement, release and recovery. Outcome distributions are a final check, never strength/traction/yardage targets. |

## Reproduction and validation

On Node 22.23.3, final runtime diagnostics:

```sh
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/run-game-census.ts out/run-hand-coherence/ordinary-census-detailed.json
python3 scripts/diag/run-game-film.py
node scripts/baseline.mjs --candidate --flag HAND_MOTOR=1 -- node --import tsx scripts/diag/hand-law-matrix.ts
```

The standalone film is written to ignored `out/run-hand-coherence/ordinary-film.html`;
it shows 17 preselected clips, actual motion/commands and selected recent cues.
The raw census retains every consumed cue and full contact/support data. No
web server is required.

Archived trial A is `e02ad7e`; archived trial B is `814c8e0`. Preserve local
work before switching. At the corresponding source, use
`node scripts/diag/run-hand-coherence.mjs out/run-hand-coherence --arm <name>`.
The drivers record exact profiles and six ten-input shards. Trial A uses
`coherent-hands`; trial B uses `seal-hands`, `components-seal-hands` and
`combined-seal-hands`, with their unchanged-hand comparators. Final restored
runtime refuses archived guard arms. No third heuristic is stacked.

For the late checkdown pair tests, prepare `checkdown-input.json` from the
single manifest row `new-pa_flood-s23-mirror`, under `out/run-hand-coherence/`,
then run `node scripts/diag/checkdown-hand-pairs.mjs`. Removal/isolation touches
only active joint drive, with `HAND_MOTOR=1` and `RUN_HANDS=1`; ownership,
normal/hold/steer capacities, feet and RNG remain native. The eight-input
LT controls use the same collector with the PA subset and
`HAND_REMOVE=LT:DT_W` or `HAND_KEEP=LT:DT_W`.

The reducer `python3 scripts/diag/run-hand-coherence-report.py` checks inputs,
profiles, source/profile receipts, complete disabled parity, observation and
all pair outcomes. The frozen baseline was recollected on actual `4ded6b6`
with only the diagnostic helper copied in; see the prior review for the safe
helper procedure. Recollect baseline as ten-input shards with `--arm baseline`.
Historical source/collector hashes are retained rather than relabelled.

[Full final verification](run-hand-coherence-validation.json): 1,673 TypeScript
tests, 145 Python checks, typecheck and build pass with unchanged inputs across
the checks. The archived trial contracts also passed their 12 geometry checks
and 63 focused checks at trial B. The final film packaging was compacted after
full verification and its generated JavaScript syntax checked separately.
No shared solver, default, capacity or baseline promotion changed.
