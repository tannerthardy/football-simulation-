# A shared model of football execution and learning

This chapter proposes a small design contract. It connects the position
chapters without adding a new biomechanics simulator or promising a complete
mental model. The code audit started at `7ce3559`; proposals below are not
implemented merely because they appear in this handbook.

## 1. Keep the physical capabilities common

A tackle anchoring, a guard driving, a linebacker shedding, a runner absorbing
contact and a corner jamming all use the same body. Mass, traction, force/work
limits, reach, balance and recovery should keep their meaning across these
interactions. Technique changes placement, posture, timing, requested direction
and available contact; it should not quietly multiply strength for a named move.

The reduced [World](../../src/physics/world.ts) already provides shared movement,
support, collisions and force-limited joints. Preserve that foundation. A
controller requests a feasible action and receives actual motion and loads.
It may request something unachievable; the World limits execution rather than
awarding success. Do not increase acceleration to hide a late read, increase
grip to hide a bad approach, or fit displacement to a target rushing average.

This does not imply that all physical questions are answered. Contact/support
transitions retain numerical debt, and empirical grip/recovery/capacity mappings
remain uncertain. Reopen those laws when a controlled witness falsifies them.
Use the [physics guide](../PHYSICS_DEVELOPMENT.md), rather than starting another
anatomical expansion whenever a football play looks wrong.

## 2. Distinguish six kinds of state

| State | Meaning | Example |
| --- | --- | --- |
| Installation | What this team calls and teaches | A helper owns a particular second-level threat after his combination. |
| Responsibility | What the player presently must protect | A safety still owns the vertical until a permitted delivery is confirmed. |
| Acquired picture | What he has actually observed, and when | A last-seen guard path, peripheral runner picture or observed receiver stem. |
| Interpretation | What he believes that picture means | He suspects pull, play-action, an out-break or a vertical continuation. |
| Technique request | What he asks his body/hands to do | Gather, open hips, fit a shoulder, retreat while square, or maintain a grip. |
| Achieved feedback | What physically happened | Feet slipped, a hand missed, support moved, or the opponent crossed his face. |

Do not put the opponent's true next decision into an acquired picture. Do not
put successful hand contact into the responsibility label. Information access
and actual contact are different channels: a player can feel a hand load while
looking elsewhere. A replay should record those distinctions, not infer them
later from two nearby circles.

The existing [visualizer plan](../VISUALIZER_PLAN.md) calls for decision and
relationship recording. Recording should copy state already consumed by the
controller. Calling perception again to produce a nicer explanation can show
information that did not cause the original action or change execution.

## 3. A minimal attention pilot

Start with one hook/Mike role rather than a global eye rig. Give him an installed
line/back key and a receiving distribution, such as the final inside receiver.
Retain the age of his acquired pictures and a small peripheral summary. A key
change must follow a cue he consumed: a credible block/pull picture, receiver
release or possession declaration. While another key has priority, previously
seen information grows stale instead of secretly updating to the true position.

The pilot must use the same evidence contract wherever that role currently
reads recognition, release and run fit. Gating only one consumer while another
reads every fresh player would create cosmetic attention. Keep motion checks
and installed obligations available before the snap; visual attention should
not make the playbook disappear.

Possible errors then have causes. A defender trusts an initial false key; his
last-seen runner picture is old; he reads a convincing stem; or his body cannot
recover after the correct late declaration. Skill can affect interpretation,
precision and reacquisition, with bounded persistent error rather than an
independent “bust” draw every tick. The proper timing and peripheral accuracy
are effective assumptions until measured; current tracking is not eye data.

The previous QB torso proxy was withheld after native regressions. Removing
an information shortcut and deciding how to interpret body direction are
separate changes. Keep that lesson when building the pilot.

## 4. Movement is an action, not an instantaneous vector

An analytical interception point can be reasonable and still be unreachable
from the player's current speed and base. Compare a few short commands through
the existing movement law: continue, gather, or take a different approach.
Keep the actual posture/facing request consistent between prediction and
execution. Read feedback next tick rather than trusting the whole forecast.

The [teammate-turning repair](../archive/reviews/traffic-turning-and-football-handbook.md)
uses only continue/gather for eligible free bodies. It does not predict loaded
contact, squeezed shoulders or opponents' future decisions. This is a small
example of achievable control, not a universal play planner. More candidates
are justified only by a concrete failure that two commands cannot resolve.

Use the [orientation pilot](orientation-pilot.md) to study provider body/travel
differences separately from speed. It cannot establish head direction or
whether a given opposite-facing sample is a taught backpedal. Compare engine
and NFL paths with the same sampling/differentiation operator before changing
capacity. A known-path controller replaying measured motion is not prediction
of the player's football decision.

## 5. Player quality and future coaching

Randomized players should retain plausible physical variation and correlated
roster structure. NFL height, weight, age, experience, position, combine drills
and usage are useful references. None directly measures courage, processing
speed, playbook knowledge or block technique. Keep invented trait mappings
explicit, test sensitivity, and preserve roster-level variance.

For a future management game, installed technique familiarity can be separate
from physical capacity and general position comfort. A well-trained lineman
may choose a valid recovery more quickly, make a more accurate shoulder fit
and exchange work reliably. He can still lose to a stronger or better-positioned
opponent. Current `Player.familiarity` means position comfort; per-call training
has not been implemented. Do not reinterpret that field silently.

Practice development should eventually improve the same decisions used in a
game, rather than granting a success bonus to a named play. Coaches can differ
in landmarks, keys, exchange rules, risk and teaching emphasis. The shared
physics should execute those choices without requiring a different contact law
for each coach. This is an architectural direction, not a new progression system.

## 6. Demonstrate transfer before breadth

| Capability or contract | Ordinary witness | Difficult/adverse witness |
| --- | --- | --- |
| Shared traction/base | OT anchor and guard drive | Moderate shove recovers; stronger or badly directed load can defeat support. |
| Hand placement/load | DL shed and CB jam | Missed hands or inferior leverage cannot receive the force of a secure grip. |
| Achievable approach | Pursuit and puller fit | Crossing runner, moving target, unavoidable impact and rear teammate. |
| Visual key/memory | Mike reads a real run | Convincing play-action, late pull declaration and an owned receiver entering his zone. |
| Responsibility delivery | Match distribution | Delayed replacement help, motion and an unbalanced receiving surface. |
| Installed run read | RB presses then selects entry | Occupied approach, penetration, open passable crease and actual shoulder squeeze. |

Each witness needs initial profiles, source/tool pins and a counterexample in
which the repair should stay inactive. Mirror geometry where the physical laws
are symmetric. Keep real team installations asymmetric where their teaching
is asymmetric. Record whole-play adverse results instead of selecting only
the repaired local interaction.

Short controlled tests establish a mechanism; native plays check integration;
small full games catch unexpected behavior. NFL comparisons require matched
role/task/era and consistent definitions. They do not replace the earlier
checks. Good aggregate yards cannot redeem an impossible block, and a tough
legitimate block need not yield positive yards.

## 7. Special teams and rule context are a separate unfinished layer

The current [special-teams implementation](../../src/game/specialteams.ts)
simulates kick flight for place kicks but resolves coverage and return yards
largely from ratings and sampled outcomes. Those returns do not yet demonstrate
11-on-11 collisions, lane discipline or hands. Keep their validation separate
from scrimmage physics readiness.

A future physical return should reuse ordinary responsibilities: a blocker
establishes a legal surface, a coverage player preserves lane leverage, a
returner reads achieved blocks, and teammates avoid preventable collisions.
The distinctive layer is rule/possession context—when movement is permitted,
who may touch the ball, whether it remains live, and when a catch ends play.
Model those transitions explicitly rather than hiding them in a return-yard
distribution.

The served [2026 NFL Rule 6][rules] defines a landing zone, setup zone and
movement restrictions for dynamic kickoffs; Rule 10 separately defines a fair
catch. Those distinctions motivate future state-machine tests. This handbook
does not implement a complete new kick rule set or certify current season
compliance. Different historical seasons require different rule versions and
measurement cohorts.

The actual shared rulebook receipt was retrieved on 2026-10-11 from the served
2026 page: HTML SHA-256
`4b5493b0a3ff47bde3323a91c66f07d1db3daa378c2c3349e6d85749973dd064`.
The kickoff/fair-catch text was read from its embedded article payload. Some
internal linked assets still have 2025 names; their PDFs were not fetched.
Consult the official full articles before implementing their exceptions.

[rules]: https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
