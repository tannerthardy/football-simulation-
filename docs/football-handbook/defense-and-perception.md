# Defense, perception and achievable technique

This chapter is an original coaching-to-simulation synthesis. Its purpose is
to turn a defensive responsibility into a small sequence of observable reads
and physically possible actions. It is a design reference, not an authenticated
NFL playbook, a finished feature list, or instructions contained in the supplied
textbooks. Teams teach different leverage, terminology and exchange rules.
Choose an explicit installation rather than treating a coverage name as a
universal algorithm.

The source review began at `7ce3559` on 2026-10-11. The shipped OL cutoff repair
does not change the defensive mechanisms discussed here. For current measured
status, use [current status](../STATUS.md),
the [defensive audit](../archive/reviews/defensive-awareness-technique-audit.md) and the
[pursuit audit](../archive/reviews/pursuit-and-tackle-technique-audit.md). Historical
witnesses retain their own source labels. The ideas below do not inherit their
measurements automatically.

## Evidence and vocabulary

Five public USA Football articles and the served official NFL rulebook were
retrieved and their actual text inspected for this chapter. They provide useful
teaching examples and rules, not league-wide eye-tracking data. Public coaching
articles reporting a particular coach's installation are distinguishable from
the official rulebook, which is a primary rules authority. The supplied
[reference catalog](../references/README.md) gives provenance for the generated
textbooks. Those are useful aids; their citations and diagrams are not
independent measurements.

The following labels matter throughout:

| Label | Meaning |
| --- | --- |
| Inspected coaching example | A specific author or reported coach teaches this approach; other installations can differ. |
| Local aid synthesis | A supplied manuscript proposes a useful abstraction. It is not verified NFL doctrine. |
| Engine finding | Inspected code or a source-pinned native witness demonstrates the stated mechanism. This need not establish its prevalence. |
| Model hypothesis | An implementable simplification requiring controlled tests and football review. It is not a fitted human constant. |

An **assignment** is the installed obligation. A **key** is the player or cue
the defender is taught to read. An **observation** is what he actually acquired,
with age and uncertainty. A **belief** is his interpretation. A **technique**
is the request he sends to his body. **Execution** is the motion and contact the
shared World achieves. A defender can have a sound assignment, a misleading
observation and an appropriate but unsuccessful recovery. Those are different
from abandoning the assignment with no admissible cue.

Use this diagnostic chain:

> Installed job → acquired cue → interpretation → feasible technique request
> → achieved movement/contact → football consequence.

The first invalid link is usually more useful than the final separation or
yardage. Two defenders near a receiver can be an intentional overlap, while
one nominal marker may already be physically unable to protect the route.

## 1. Bodies, hips, head direction and attention

The engine currently records planar position, velocity, body facing and coarse
pose through [PerceptionBuffer](../../src/sim/perception.ts). It delays a sample
and predicts its position forward with the sample's old velocity. This is a
fallible moving picture. It is not an acquisition, occlusion or gaze model:
`PlaySim.see` returns a requested player's picture without requiring the
observer to have looked there.

Four distinct signals should remain distinct:

1. **Travel direction:** the center of mass can move sideways or backward.
2. **Torso/hip orientation:** the body can face the receiver while backpedaling,
   or turn to run while the player still samples peripheral information.
3. **A visual key:** which receiver, blocker, runner or ball cue receives current
   attention. It need not be identical to body orientation.
4. **Interpretation:** what that cue suggests about a route, block or possession.
   Looking at something does not imply correctly understanding it.

In Mike Kuchar's inspected [off-man article][hips], defenders key their own
receiver and use alignment, leverage, cushion and hips. His
[press article][press] teaches patience, a low-body visual target and a
release-dependent hand response. Brady Grayvold's [deep-ball article][deep]
distinguishes an in-phase defender who can locate the ball from an out-of-phase
defender who first catches the receiver's near hip. These examples support
**role-dependent information priority**. They do not prove a universal gaze
cone, exact head-turn cost or perfect route prediction from hips.

In a reduced simulation, observed velocity, credible deceleration, body facing,
release position and received hand/body contact can represent a useful portion
of these cues. We do not need an anatomical pelvis or an eyeball rig to begin.
Calling body facing “eyes” would still be misleading. The rejected QB-direction
experiments in the [current audit](../archive/reviews/defensive-awareness-technique-audit.md#post-audit-promotion-decision-withhold-the-qb-proxy)
are a concrete warning: neutral torso direction biased empty zones, and the
narrowed proxy still worsened native passing. Removing hidden information and
inventing a replacement signal are two separate experiments.

An attention model should make **unacquired information older**, rather than
showing every fresh image and multiplying its evidence by an “eye discipline”
scalar. Preserve last-seen memory, allow peripheral summaries and explicit
reacquisition, and retain contact feedback outside the visual channel. Do not
replace uncertainty with a random bust every tick.

## 2. One defensive call spends eleven bodies

A usable defensive installation combines front, rush plan, eligible
distribution, coverage, presentation, leverage, run support and formation
checks. A safety carrying a live slot vertical is unavailable as an immediate
interior fitter even if he stands close to the box. A wide edge alignment is
not proof of contain. A nickel who travels with motion may leave the original
force lane to somebody else.

This is a local-aid synthesis from *The Geometry of the Fit*, sections 1,
5–8, printed pages 4, 11–18, and the
[Coverage Operating System](../references/Coverage_Operating_System_Manuscript.md#1-what-the-defense-really-calls),
sections 1–6 and 17. The inspected [Rip/Liz account][ripliz] gives a concrete
coaching example: overhangs can carry seams, while inside backers must account
for a back's later release because the overhang may no longer own the flat.
One call's responsibilities interact even when players read independently.

Store functional obligations rather than only a call name:

| Contract field | Example | Necessary distinction |
| --- | --- | --- |
| Primary pass obligation | Own #2 vertical, first to flat, MEG on #1 | A space landmark is different from a direct route relationship. |
| Conditional release | Deliver shallow #1, push on fast #3 | The observed declaration is different from a called route ID. |
| Help expectation | Post safety, deep half, inside rat | Installed help is different from visibly reachable help. |
| Run obligation | Box edge, spill, force, alley, cutback | Each applies only when its pass/run trigger permits. |
| Presentation | Two high, press-bail, mug | An appearance must not overwrite the actual obligation. |
| Fallback | Retain man on late motion, simpler push | A fallback must be physically executable from the current position. |

Current [buildRunFits](../../src/sim/run-fits.ts) links support to front and
coverage, selects force before deep/man candidates, and boxes an edge when
outside support is absent. Current alignment allocation prevents unsupported
pure-man ownership counts. These are necessary safeguards. They are not proof
that a late rotation, motion check or receiver delivery is achievable.

### A distribution is more specific than a shell

The following compact table is **local aid synthesis**, using the coverage
manuscript sections 7–12 and *The Second and Third Level*, sections 4, 6 and 21.
The inspected public Rip/Liz and Cover 7 accounts independently demonstrate
some of these match distinctions. The table does not authenticate every row as
one NFL team's install. Four-rusher examples leave seven coverage bodies;
changing the pressure count requires changing the distribution, not adding a
blitzer while retaining every other job.

| Family / functional example | Distribution and first important relation | Main movement/decision stress |
| --- | --- | --- |
| Cover 0 | Direct man obligations without a deep free cap; extra rushers must leave enough markers for all live eligibles | Correct initial alignment and denial leverage; rubs and late back releases have little free repair help. |
| Cover 1 | Underneath man plus a post player; an extra low rat/robber exists only if the actual ledger leaves one available | Use the real post-help relationship; underneath defenders cannot all abandon man when the QB moves. |
| 2-Man | Underneath man with two deep halves, often an installed trail technique | Picks/crossers, runner/spy accounting and the cost of underneath defenders turning away from the ball. |
| Spot Cover 2 / cloud example | Two halves, two flat corners, interior hook/seam distribution | Corner reroute/sink versus flat; half safety midpoint versus two verticals and sideline hole shot. |
| Tampa-style two-high | Half defenders plus a designated inside vertical runner, with corresponding underneath adjustment | Middle runner's actual seam turn and depth, play-action conflict and the space vacated underneath. |
| Spot Cover 3 | Three deep, usually four underneath with four rushers | Four vertical lanes can stretch three deep defenders; underneath seam help and rally paths matter. |
| Three-match / Rip-Liz example | Corners relate to #1, seam/flat players carry qualifying #2, hooks redistribute the back/final inside threats | Carrying #2 removes the overhang from ordinary flat availability; a later back release needs a different owner. |
| Quarters MOD / MEG examples | Corner and safety obligations depend on the chosen #1/#2 rules; MOD can release a permitted short route while MEG retains its man | Avoid confusing a shallow delivery with an abandoned vertical; safety read must preserve top leverage and conditional run support. |
| Palms / two-read example | Quick #2 out can transfer corner to #2 and safety to #1; #2 vertical can leave corner on #1 and safety on #2 | Both players interpret the same release independently; fake out, out-to-wheel and switch releases expose timing/technique. |
| Split field | Different distributions on each side, such as quarters and cloud/half | Strength, numbering, trips poach and run-support asymmetry; a single global coverage number loses essential information. |
| Inverted half / pressure replacement | A corner or another DB becomes a half defender while a safety/nickel occupies the underneath role | The actual replacement has to travel and orient; position labels alone do not identify the resulting coverage. |

Man, zone-match and man-match can look similar after a route declares. The
public [Cover 7 explanation][quarters] distinguishes their initial key and
relationship: a zone-match player starts from a space/route picture, while
a man-match player begins with a particular eligible and changes when the
installed declaration requires it. Treat these as useful teaching distinctions,
not reliable automated labels inferred from one frame of tracking.

## 3. Defensive line: block reaction before ball chasing

First-level technique is a policy about which shoulder or gap to influence,
how much penetration to seek and what evidence permits changing work. It is
not a hidden strength multiplier. The same body should use mass, traction,
balance, arm reach and work limits when rushing, squeezing, anchoring or
recovering.

The following run-fit teaching examples are **local aid synthesis**, principally
*Geometry*, sections 4–5, printed pages 10–12. Their values should be defined
for the chosen front, rather than presumed from a player's roster position.

| Acquired cue | Interpretation under the install | Feasible request | Believable error / diagnostic |
| --- | --- | --- | --- |
| Near blocker gains width across the defender's face | Reach attempt threatens the assigned edge | Work feet and hands toward the required shoulder; preserve a base | Defender attacks the ball too early, gets reached and cannot recover. Inspect actual shoulder and support before calling a strength loss. |
| Blocker steps down away; adjacent surface compresses | Down block may open a puller path | Squeeze the surface with the called leverage while finding the next visible threat | Chases inside so far that the kickout arrives outside his reachable shoulder. |
| An observed puller approaches the edge | Kickout/log possibility | Box on the outside half or spill through the inside half according to the support contract | Wrong-arming without outside support produces an intentional-looking but unsound bounce. |
| Blocker sits back and gives depth | Pass-set evidence, not conclusive proof | Attack an installed rush shoulder; stay capable of reacting to a draw | Overruns a slow draw because the rush plan treats every drop as a stationary QB. |
| Received hand/body load moves laterally | Blocker redirects the body | Adjust feet, anchor or work around within actual budgets | Desired rush direction remains fixed while the body is being steered. Inspect requested versus achieved motion. |
| Observed QB escapes beyond the rush relationship | Pocket phase changes | Recover toward an achievable path, retaining called contain if necessary | Every rusher chases the same current point and opens a second escape lane. |

Current [PassRusher](../../src/sim/behaviors/defense.ts) has speed, finesse and
power plans, snap readiness and delayed QB movement. Engagement controllers
and [World](../../src/physics/world.ts) own the subsequent loaded interaction.
A wide arc followed by a stop can therefore have several causes: a poor arc,
an attainable block redirect, a contradictory contact frame, a stalled desired
drive, or inadequate physical capacity. The replay shape alone does not choose
between them.

Useful trench diagnostics are time to threaten the blocker, shoulder at first
contact, blocker/rusher relative motion, pocket displacement **while still
engaged**, actual hand force and support, and recovery after contact ends.
Pressure proximity, a PFF hurry and a block win are different outcomes. Do
not fit a bull-rush force to sack totals. The 2021 protection labels described
in the [BDB2023 review](../archive/reviews/bdb2023-data-review.md#the-useful-addition-protection-labels)
can split assignment losses from attributed hits/hurries/sacks, but tracking
ends shortly after release and proximity alone does not prove hand contact.

## 4. Linebackers: keep a base while changing keys

A linebacker cannot stare at all five linemen, the QB, the back and every
route simultaneously. Nor should he be made blind to everything outside one
narrow ray. The useful simplification is a small **installed progression**:
primary block key, nearby back/receiver context, then the declaration that
permits run insertion or a coverage redistribution.

Guard-to-back and stack/track examples here are **local aid synthesis**, not a
verified universal NFL visual sequence. *Geometry* section 5.2 distinguishes
patient stack-track-fallback from fast plugging. The inspected [Rip/Liz
article][ripliz] reports different hook and overhang progressions; its “final
3 through” rule is a specific solution to a changing release distribution.
The inspected [Cover 7 article][quarters] describes a Mike relating directly
to #3 and a push on a fast release. Those examples should not be averaged into
one linebacker policy.

| Key picture | Interpretation | Action that preserves alternatives | Common error |
| --- | --- | --- | --- |
| Near guard fires out, back presses laterally | Run likely; crease remains undecided | Stack/scrape at a feasible pace, keep shoulders usable, retain the installed gap | Overcommits to the back's initial path and cannot plant for the bend. |
| Guard visibly pulls while back initially flows away | Gap concept or misdirection possible | Read pull direction and local surface; fold/insert according to the called exchange | Chases jet/back flow and loses the counter lane. A pull is evidence, not permission to know “Counter.” |
| Line gives a run look but slot releases vertically | Conflicting evidence | Preserve the pass obligation until its release rule is satisfied | Treats the line as a definitive run cue and vacates an RPO/glance threat. |
| #3 releases fast to the flat in a push install | Eligible distribution changed | Communicate/recognize replacement and move through a real exchange | Apex and hook both take the back or neither takes the new #3. |
| Assigned underneath receiver crosses; another route replaces behind | Possible carry/robot/delivery according to the call | Release only through the installed rule; turn and reacquire the next threat | Drops to empty grass, or carries the shallow so far that the dig becomes free. |
| Back remains near QB, then check-releases | Blocking and route intent still ambiguous | Keep remembered back position and reacquire when the visible path declares | Assumes a blocked back disappeared and cannot recover to the late release. |

Current [Recognition](../../src/sim/recognition.ts) already has situation priors,
coherent per-play error and hysteresis between run/pass beliefs. Its evidence
aggregation still samples all five OL plus QB/RB; reducing a weight does not
make the unchosen samples unavailable. [executeRunFit](../../src/sim/run-fits.ts)
also samples blocker and runner pictures independently. An attention pilot
must account for those consumers together or it merely hides omniscience in a
second function.

A fit should migrate with actual blockers, not a fixed painted gap. The current
pull/slice indicator is based on observed motion rather than the offensive run
name. Retain that property. Better players can locate the relevant work, place
themselves and interpret it sooner through existing focus, recognition and
reaction traits. Their body still may not reach the new lane in time. Do not
equate high awareness with knowing the play or removing recovery movement.

## 5. Corners: leverage, phase and the cost of turning

The inspected Kuchar articles offer one explicit installation: outside-eye
leverage with middle help and inside-eye leverage without it, with individual
ability affecting cushion. These are teaching examples, not “Cover 1 always
outside” or “press always has no help.” The press article describes a
no-deep-help version; press can also be used with safety help, zone presentation
or press-bail. The call must supply the actual leverage contract.

### Press and catch

Patient feet preserve the ability to answer either release. An early lunge
extends the body beyond recoverable support; a strike without a credible gate
can give a receiver the opposite path. Kuchar prefers an off-hand jam in his
example, while the supplied [WR/DB aid](../references/WR_DB_Mechanics_Textbook.md#11-cornerback-stance-and-press-man-mechanics)
describes multiple press families. Model the common interaction—feet, reachable
hands, real contact and recovery—before installing every named move.

The defender should not receive a successful jam just because he is close.
Ask whether a hand reaches the intended surface, what load it transmits and
whether the feet can maintain leverage. A missed strike can be a physical
loss without an assignment bust. A legal disruption can also delay an otherwise
correct route without deciding the entire pass outcome.

### Off-man, pedal and opening the hips

Kuchar's [off-man example][hips] uses a control pedal, speed pedal and man turn
as cushion disappears. Grayvold's [deep-ball example][deep] emphasizes turning
before a vertical receiver runs through the cushion. The useful engine law is
not one fixed distance for every receiver: estimate observed closure and the
time needed to orient and accelerate with the actual body. Existing
[ManCoverage](../../src/sim/behaviors/defense.ts) already accounts for
backpedal/turn limits. Diagnose its first bad command before granting DB-only
acceleration.

A retreating defender should first brake his retreat, redirect and then close
on a credible break. “Drive” is not instantaneous reversal. A receiver's speed
change and facing can support a break belief; neither is perfect proof of the
called route. An impatient defender can undercut a curl and lose to curl-and-go.
A cautious defender can surrender a short completion without having busted.

### In phase, out of phase and ball acquisition

Phase should combine separation, relative speed and usable leverage. It should
not be a distance-only label. A defender with enough phase can sample the ball
while maintaining the receiver relationship; an out-of-phase defender may need
to recover the near hip and infer arrival from the receiver's catch behavior.
The public articles describe this distinction. Tracking does not directly tell
us whether the player actually looked at the sky, QB, receiver's eyes or hands.

Do not make every out-of-phase defender incapable of defending a pass. A lawful
late hand contest can work. Likewise, locating the ball should not give access
to its future exact intercept or override footwork. Contest selection and
physical reach remain separate from catch/possession.

## 6. Nickel and overhang: a genuine conflict position

The nickel's two-way release and run-support conflicts require a specific
contract. He can be a man marker, wall, seam carrier, first-to-flat player,
force defender or pressure player. Some of those are conditional transitions;
they are not all simultaneous jobs.

In the inspected [Rip/Liz installation][ripliz], the overhang relates to #2,
reads fast #3 and carries a seam, with installed responses to under and smash.
In the inspected [Cover 7 installation][quarters], cut/push and first-to-flat
rules redistribute man relationships. The supplied
[coverage manuscript](../references/Coverage_Operating_System_Manuscript.md#15-bunch-stack-condensed-splits-orbit-and-empty)
adds useful bunch/stack and motion hypotheses. Its banjo/box examples are not
measured NFL frequencies or proof of what a named team called on film.

Against condensed splits or a bunch, a defender should preserve a reachable
release lane while waiting for enough evidence to exchange. Two defenders can
correctly overlap temporarily. An exchange fails when their local pictures,
interpretations or movement disagree; we should be able to show which failed.
Avoid a global “sort by final route and assign perfectly” operation.

Against a screen, blocking pace, release path and actual ball evidence can
change the technique. A low/stopped receiver alone is not conclusive: stalk-and-go
and wheel constraints exist. Crack replacement requires both an observed crack
and a called ownership rule. A CB abandoning live MEG because another defender
is blocked is not automatically correct team defense.

Current [showsBlock](../../src/sim/coverage-cues.ts) uses observed stance and
contact geometry rather than private route/engagement bookkeeping. Current
[Wall, Trap and Rob](../../src/sim/coverage/techniques.ts) are different
controllers. Those distinctions are useful starting points. Their actual
consumed pictures and achieved motion need inspection before adding a separate
screen recognition coefficient.

## 7. Safeties: protect a vertical before buying help elsewhere

“If you're even, he's leaving” is a useful warning about losing top leverage,
not a law that every safety should sprint backward at the snap. A safety must
compare cushion, observed closing rate, lateral reach and his current orientation.
He also needs to know whether the route is his, a bracket partner's or merely
a possible emergency threat.

The inspected Rip/Liz account teaches post safety position maintenance and warns
that moving too far from the midpoint breaks divider help. Its numerical depths
and look progression belong to that high-school installation. The inspected
Cover 7 account demonstrates a different slot/robber relation. Therefore a
universal “safety watches QB first” policy is inadequate.

### Vertical priority

Use the installed receiver/key to identify the earliest credible vertical. As
the route closes, open and gain depth early enough to remain physically on top.
Do not wait for a generic match-depth threshold if the owned receiver is already
running through the body's remaining cushion. Conversely, a shallow release
or visible replacement can permit a different job according to the call.

Current [CoverageJudgment](../../src/sim/coverage/judgment.ts) already retains
a confirmed uncapped primary vertical, and deep zone behavior prioritizes its
installed route. Those repairs are implemented; this chapter does not propose
them as new discoveries. Their thresholds remain model assumptions, not human
reaction measurements.

### Help is a moving relationship

Called help is not guaranteed help. A teammate above a route but moving slowly,
falling, turning away or being horizontally stretched may not sustain the roof
through the next decision. Current nearby-help judgment projects its consumed
moving picture for a short horizon, with a limited six-yard scope. Earlier
far-help expansion did not establish extra ordinary physical benefit. Retain
the [near-help evidence](../archive/reviews/near-help-persistence-and-current-priorities.md)
rather than expanding the horizon because a diagram says a safety is available.

Emergency help should preserve the owned vertical until there is admissible
evidence that help is secure or the primary threat has changed. A player can
make a believable bad gamble when his old picture suggests a teammate still
has the roof. That differs from a random override that abandons a receiver.

### Red zone and boundaries

Finite end-line space changes usable cushion and routes; a deep-half landmark
should not send a player voluntarily behind the end line. Preserve physical
momentum at the boundary: this is target and braking awareness, not a force
field that stops a body. Cover 2 or match variants can be used in compressed
space, with installed sink, trap and leverage adaptations. The inspected
Cover 7 article itself describes a distinct red-zone Switch variant. Do not
declare a coverage family invalid merely from its broad name.

When a safety fits a run from depth, he becomes an approaching tackler with a
force/alley/cutback responsibility. Pursuit cannot erase that responsibility
until the runner's observed commitment or the current help makes release sensible.

## 8. Route delivery must be physically possible

The inspected public coverage articles describe under, push and final receiver
distribution. The stronger **model hypothesis** is to represent a delivery as
a continuous relationship rather than instantaneous deletion at a yard line.
An installed rule may tell the sender to release, but the receiver's body and
the replacement defender still have to reach useful positions.

A minimal delivery record can contain sender, receiver, intended replacement,
last observed replacement picture and the installed declaration. It need not
be a global communication simulator. Distinguish:

- Knowing which neighbor is supposed to replace.
- Locally recognizing a check or exchange.
- Seeing that neighbor in a useful place.
- That neighbor actually being able to maintain the route relationship.

The first two can be shared installation or an explicitly modeled message; the
last two cannot be inferred from a hidden teammate job. If messages are added,
store send/receive/acknowledgment separately and test late/noisy communication.
Do not invent an exchange delay and call it measured NFL behavior.

Current [coverage rules](../../src/sim/coverage/rules.ts) include releases at
installed depths/areas, while [CoverageDefender](../../src/sim/coverage/defender.ts)
starts a new technique when its directive changes. The body preserves momentum,
but some technique-local read memory resets. A useful experiment traces one
seam handoff through the last wall, first roof instruction, hip opening and
first lost throw lane, alongside a successful ordinary control. More coverage
calls should wait until that elementary exchange is defensible.

## 9. Motion, presentation and anticipation

Pre-snap motion can alter eligible distribution, blocking surface or the
lead/ball path. They are separate effects. A backfield fly motion can change
the pass count without moving the five OL; a Y trade can change the edge;
an orbit can threaten a screen, reverse or fake without declaring possession.

Local aid examples in *Geometry* section 8, printed pages 16–18, and the
[coverage manuscript](../references/Coverage_Operating_System_Manuscript.md#3-the-presnap-timeline-declaration-check-motion-confirmation)
support a small response menu: travel/lock, bump/push, secondary rotation or
front reset. Each needs a replacement chain and a late-motion fallback. A
moving defender must retain velocity at the snap. “Check completed” must not
teleport him into a good leverage position.

The official rulebook's Rule 7 sets formation, shift and motion restrictions.
See the independently researched legal versions in the
[stress-test plan](../FOOTBALL_STRESS_TEST_PLAN.md#legal-versions-of-the-proposed-motion-pictures).
The current engine does **not** have installed pre-snap motion execution or a
complete screen concept pool. A test seeded with lateral velocity is useful
mechanics evidence, but cannot establish defensive communication or recognition
of preceding motion that was never simulated.

Anticipation can use personnel, situation, opponent tendencies and repeated
visible patterns as a prior. Current Recognition already shrinks scouting
toward league expectations and requires evidence/hysteresis for commitment.
An anticipatory defender should be quicker when the cue agrees, or meaningfully
wrong when an offense supplies a convincing constraint. He should not inspect
the selected play. Nor should a third-and-long prior make the defense unable
to respond to a run that visibly declares.

Disguise has a body cost. A safety rotating from a different shell spends time
and lateral momentum reaching his actual job. Evaluate whether he can arrive
before the threatened route, rather than rewarding the defense with both a
perfect false picture and an instantly settled post-snap alignment.

## 10. Pursuit, gathering and tackle selection

This section is **simulation synthesis**, supported by the supplied
[perimeter-defense aid](../references/WR_DB_Mechanics_Textbook.md#16-run-pass-keys-db-block-destruction-and-perimeter-tackling)
and current native controller findings. It is not a quantified claim about
NFL tackling instruction or a substitute for trained real-world coaching.

A pursuing defender needs a reachable interception, an appropriate shoulder and
a speed that leaves the required next action possible. Open-field gathering
buys the ability to answer a cut. A straight trailing chase preserves speed.
A force player protects outside access; an alley player approaches inside-out.
These should be different uses of common capacity, not different friction laws.

| Situation | Intended control | Failure worth distinguishing |
| --- | --- | --- |
| Runner approaches nearly head-on | Close while matching lateral motion; gather before the cut becomes unreachable | Arrives too fast to redirect, versus chooses an overly passive gather and gets run through. |
| Runner crosses the defender's face | Preserve an achievable angle; brake enough to contact the useful hip | Turns into a flat chase, versus correctly intercepts but loses contact. |
| Runner is faster and escaping | Chase at justified urgency, preserve last useful angle | Failure to catch is not proof of bad physics. |
| Force and alley converge | Preserve complementary shoulders and teammate headway | Both aim at the same current point and collide, versus an unavoidable collision under stale evidence. |
| Defender reaches laterally/rearward | Choose a limited reach or recovery appropriate to actual orientation | Full-quality form wrap acquired behind the body before a turn or tactile cue. |
| Defender is already gripping | Respond to actual grip load and support | A free-space motion preview pretends the loaded body can execute an unopposed step. |

Current [chase/pursuitPoint](../../src/sim/behaviors/common.ts) uses delayed
runner motion, acceleration inference and stable angle bias. Crossing approaches
already use the shared body envelope and short World previews. Current
[tackle opportunity](../../src/sim/tackle-window.ts) previews the last executed
command without another behavior decision. These are valuable mechanisms.

The retained [pursuit audit](../archive/reviews/pursuit-and-tackle-technique-audit.md)
also establishes three narrower problems: a requested clear ray can hide a
curved teammate collision; a tiny heading change crosses a discontinuous gather
policy; and a pre-contact rear wrap can acquire the same initial quality without
a shoulder turn. These findings do not prove excessive hit force. Better traffic
prediction, a continuous/hysteretic gather handoff and reachable acquisition
are controller/technique candidates. Do not solve them by increasing agility or
making teammates collisionless.

Tackle selection chooses an attempt, not the final fall. Reach, approach,
orientation and current support can make a wrap, lateral grab, desperate dive
or no immediate attempt plausible. After acquisition, shared grip force,
friction, collision impulse, corrective support and balance determine whether
the runner stays up. A failed tackle can mean a missed opportunity, failed
initial grip, slipping loaded hold or failed takedown; record them separately.

## 11. Legal disruption is separate from disruption strength

The inspected [official rulebook][rules] URL serves a page labelled as the 2026
NFL Rulebook. Some internal links and PDF asset names still refer to 2025;
that PDF was not downloaded or checked here. The following claims cite the
actual served article text, not an assumed PDF/version match. Rule 8,
section 4 distinguishes legal continuous contact inside five yards from illegal
initial/back/reinitiated contact under its specified conditions. Contact must
be released as the eligible receiver leaves the zone; incidental contact beyond
five yards can exist. Rule 8, section 5 gives the pass-interference definitions,
including materially hindering catch opportunity, timing and permissible
incidental contact. Defensive holding is addressed in 8-4-6 and 12-1-6;
restrictions do not all end together when the QB leaves the pocket.

A useful reduced officiating layer needs an actual predicate: eligibility,
location relative to LOS, ball/QB state, which player initiated contact,
whether a grip/restriction occurred, continuity/reinitiation, actual lost route
freedom and ball/catch opportunity where relevant. A long route delay, proximity,
pick-route name or “DB was not looking” label alone is insufficient. Looking
for the ball does not legalize every contact either.

Physical reach/contact facts may use the true World. Player decisions should
still use acquired evidence. An official assessing an interaction has a separate
observation/enforcement policy; do not reuse perfect global physics knowledge
as a defender's perception. Rule predicates can be deterministic while
enforcement remains imperfect. Neither requires anatomical fingers or skeletons.

## 12. Small awareness pilot before a general vision system

The best pilot is one explicitly installed hook/Mike role with a near-line/back
key and a #3 release obligation. Avoid replacing every `see` call at once. The
policy below is a **model hypothesis**, not an empirical eye-movement schedule.

1. Name its allowed primary/secondary keys at installation. Keep the assigned
   eligible inventory as shared pre-snap knowledge, without its private route.
2. At the role's existing decision/attention cadence, acquire the primary and
   a justified secondary glance. A fresh declaration or lost key can change
   priority; elapsed play time alone does not identify a route.
3. Retain the last acquired pictures between looks. Predict from remembered
   motion for a bounded interval; increased age reduces confidence. Avoid
   silently replacing a stale image with a current global position.
4. Feed the same acquired/remembered pictures to recognition, release reading
   and the scoped fit/coverage controller. Otherwise one consumer bypasses
   the restriction imposed on another.
5. Keep received contact and nearby mechanical spacing distinct from deliberate
   visual acquisition. A real hit is a tactile cue; an engagement type naming
   the offense's call is not.
6. Record actual key, acquisition time, sample age, belief, chosen instruction
   and achieved motion. Instrumentation copies state already consumed; it must
   not perform another observation to write a “why” bubble.

Pilot fixtures should include a correct primary run read, a delayed back
check-release, an immediate fast #3, play-action with a continuing seam and a
missed secondary cue while attention remains legitimately on the primary.
Include both recovery after reacquisition and a physically unreachable recovery.
Better recognition should improve relevant acquisition/interpretation without
providing perfect target knowledge. A defender can still be late or fooled.

Acceptance is a defensible sequence, bounded computation and observer/RNG
noninterference. A lower explosive rate is a secondary guard. Removing
omniscience may initially worsen coverage; do not add concealed compensating
speed or tune a gaze cone to recover final yardage. Before touching the current
QB oracle, compare oracle removal alone against removal plus any new directional
interpretation on the same retained adverse pass.

## 13. Ordinary controls and adverse stress cases

These are proposed tests, not claims that motion/screens are implemented or
that all listed cases have been collected. Use the shared World and exact
profile/input/source pins. “Good defense” need not yield a prescribed tackle,
incompletion or gain.

| Fixture | Stress | What to observe | Necessary ordinary/adverse control |
| --- | --- | --- | --- |
| Off-man go versus curl-and-go | Cushion/hip opening and false break | Delayed release, first open/drive instruction, achieved reversal | Plain go and curl; two receivers with different speed; sound shorter completion allowed. |
| Press outside release versus opposite return | Feet/hand discipline | First hand reach, support, lost gate and recovery | Missed strike stays a real loss; mirror the same bodies, not merely `flip` the call. |
| Four verticals versus three-match | Seam distribution and post roof | Owned vertical priority, wall/post overlap, top-leverage erosion | Two verticals with underneath stops; fast #3 changes underneath obligations. |
| Palms quick out → wheel | Locked exchange and later vertical | Corner/safety actual reads and whether the trap controller follows a credible turn-up | Plain out; #2 straight vertical; late out after a vertical stem. |
| Bunch mesh with wheel | Traffic, switching and delivery | Both defenders' acquired releases, branch and reachable lanes | Lock-man control; legal incidental rub versus actual restrictive contact. |
| #3 bender with backside glance | Poach versus isolated route priority | Weak safety's initial key, lateral travel and availability of backside help | #3 shallow; backside go; help visibly unavailable. |
| Crack versus crack-and-go | Run support conversion | Block cue, released coverage obligation and force replacement | Actual crack; receiver bluff while ball remains with QB. |
| Jet motion bubble versus counter away | Motion distribution and backside fit | Replacement chain, pre-snap history and lateral momentum | Same jet picture with sweep; no-motion control. Until motion exists, label seeded-velocity mechanics separately. |
| Moving TE split zone versus arc/flat | Slice block and keeper/route ambiguity | Edge response, LB key, actual wide-end contact | Stationary slice; visible arc; keep the opposite possibility uncertain until it declares. |
| Quads diamond screen versus screen-and-go | Extreme eligible overload | Formation legality, retained source-side support and screen-block contact | Ordinary trips bubble; changed screen side; currently a future install. |
| Third-and-27 inside zone versus three rush/eight drop | Pass prior without run blindness | First run declaration, reachable insert and post support | Same run against ordinary front; same defense against deep pass. No guaranteed run gain. |
| Two-high disguise with late rotation | Presentation has a movement cost | Rotation path, velocity at snap and earliest reachable roof | Settled true shell; unachievable late rotation stays a legitimate weakness. |
| Low-red-zone corner/flat combination | Compressed landmarks/boundary braking | Legal in-bounds target, maintained relation and achieved stop | Open-field version; momentum can still carry a body out. |
| Converging force and alley on a single cut | Gather and traffic | Requested versus achieved turn, teammate headway and useful shoulder | Straight clear lanes; stale-cue unavoidable collision; faster runner legitimately escapes. |
| Rear/lateral reach before and after contact | Acquisition versus tactile response | Shoulder/reach eligibility, observed cue, actual contact and initial grip | Facing runner; last-seen runner; real contact while looking elsewhere. |
| Down block plus kickout with spill/box alternatives | Front/support coherence | Required shoulder, partner availability and achieved displacement | Same physical profiles across box/spill; unsupported spill must not be rescued by bonus force. |

For each retain the first valid cue, first changed belief, first request, first
physical inability, contact/load transition and endpoint. Structural ownership,
direct relationships, selected targets and actual load must be separate fields.
An eight-second inspection window still live at its end is censored, not an
incompletion or timeout. Include natural ordinary endpoints and all adverse
pairs, rather than picking film only from explosives.

## 14. What NFL data can and cannot validate

The [source catalog](../../data/sources.json) and
[data guide](../../data/archive/catalog-2026-10-11.md#sources-and-useful-coverage) define actual
seasons, selections and extraction scope. A competition year is not its game
season. A large downloaded archive is not automatically an analyzed reference.

| Available reference | Useful defensive measurement | Important limit |
| --- | --- | --- |
| BDB2025, 2022 all-player tracking and charting | Alignment, eligible distribution, route-relative cushion, early hip/body-motion transitions, help geometry, release/catch/YAC windows, run support and pursuit where recorded | Historical analyses treat `o` as body orientation and `dir` as travel direction, not gaze; validate conventions for each release before transferring them, especially the provisional BDB2027 pilot. Charted family is not the team's complete match install. Summary tracking scope is currently narrower than label scope. |
| BDB2023, 2021 pass/protection cohort | Initial rush roles, blocking opponent references, pocket shape and labelled beaten/hit/hurry/sack attribution | Selected dropbacks; tracking ends about half a second after release in the reviewed week. It cannot validate long-flight closure or complete YAC/tackling. |
| BDB2026, 2023 selected pass players | Selected coverage/separation and pre-throw paths under its inclusion rules | Missing all-22 opponents and unobserved defenders can invalidate ownership/help/contact reconstruction. |
| BDB2027 matched combine and game paths | Same-athlete forward/cutting/pulling task demands, body/travel orientation in available game rows | Draft cohort, incomplete opponents and pre-release/contact/three-second windows. Combine groups omit RB/QB/LB; do not invent their measured profiles. |
| nflverse PBP, FTN charting and participation | Conditional pass/run tendency, explosive/success distribution, pressure/drop annotations where available, score/time/down context and roster variation | Associations are not thoughts or causal psychological effects. No continuous eye, hand, ground force or full 11-on-11 contact trajectories. |

Start with **operational proxies** that can be applied identically to engine
and NFL paths:

- Cushion and relative closing speed by route/defender role, split, field
  position and initial leverage. Separate correctly owned but beaten routes
  from demonstrated assignment violations.
- Time/depth of observed direction change, defenders' response displacement
  and top-leverage loss. These are response proxies, not true gaze acquisition
  or the exact instant a human recognized a break.
- Body/travel angle distribution for retreat, shuffle, bail and turn-and-run.
  Provider orientation needs wraparound handling and quality checks. A player
  moving backward with torso facing forward is not skating by definition.
- Speed-dependent acceleration, braking and curvature, using the same position
  filtering/differentiation operator and contact/window selection for both
  sources. Separate free movement, loaded contact and chosen pace.
- Nearby cap depth, lateral distance and relative velocity, followed through
  a defined short horizon. This estimates geometric help, not the teammate's
  actual responsibility or willingness to provide it.
- Pursuit approach angle, pre-contact speed and short-window team spacing,
  conditioned on field location, runner speed and number of possible helpers.
  Tracking proximity is not automatically a tackle attempt or grip.
- Pass release-to-arrival separation, first credible contact, yards before/after
  contact and explosive/success rates with explicit denominators. These are
  football guards, not parameters to force every generated roster to match.

Use held-out games/athletes, team/role stratification and uncertainty intervals
where the cohort permits. Generated roster variation can legitimately change
the mean. A good engine should preserve sensible conditional relationships and
plausible ranges, not reproduce one league average with hidden outcome bonuses.

We do **not** currently have dependable true gaze, which guard a linebacker
consciously keyed, route-call knowledge, communication acknowledgment, hand
forces, contact posture at every frame, ground reactions or subjective fear.
Those must remain unobserved states or explicit effective assumptions. The
72-trial [movement audit](../archive/reviews/movement-and-nfl-validation-audit.md)
demonstrates why numerical accounting and path-control evidence are useful but
not an NFL calibration certificate.

## 15. Research priorities that fit the engine's scope

First, repair reproduced movement requests with existing body limits. Then
pilot one attention progression and one route delivery. Build matching movement
proxies from data already owned before collecting more archives or expanding
anatomy. Use small native football witnesses to prove the same capabilities
generalize across jam, shed, fit, pursuit and tackle.

The most valuable human review is an exact source-labelled clip with the first
step or transition marked: expected key, permissible alternative, point where
the mistake became recoverable/unrecoverable, and whether the error looks like
a believable occasional loss or a systematic rule error. The owner need not
identify the secret NFL call. A description such as “keep your outside shoulder
until the runner crosses it” is more actionable than “safety looks bad.”

Do not declare physics finished because a coverage test passes, or require a
complete neuroscience model before making better football. The practical
milestone is that sound local reads produce attainable technique, mistaken
reads produce understandable recovery costs, and actual contact obeys the same
shared physical limits across positions.

## Run-support checks from the current film

Treat fit, interception and recovery as different responsibilities. A force
player protects his outside shoulder; interior help works toward that leverage;
an alley or deep cap is not simply another immediate gap plugger. Installed
relationships must survive disguise, but they do not supply perfect knowledge
of where teammates currently are.

Jerry Campbell's public [team-pursuit article][pursuit] teaches gap responsibility
first, contain and inside-out help, avoiding a teammate's pursuit path, and
gathering before contact. His [linebacker reaction article][lb-reaction] makes
run-to/run-away duties front-dependent and retains a counter check. These are
particular teaching installations, not measured NFL rates. Their public prose
was inspected; videos and diagrams were not quantitatively audited. Use actual
closing speed and physical stopping limits rather than making their fixed
coaching gather distance a universal trigger.

The current traces also distinguish a **fast lead blocker** from a receiver
release. Speed alone cannot erase observed low pads or nearby facing bodies
that suggest a block. That geometry is an inference, not measured hand contact.
A defender still needs his own run interpretation; upright releases, play-action
uncertainty and delayed pictures remain possible sources of mistakes.

Large replay markers are identification glyphs, not body surfaces. Apparent
overlap can be a reaching grab without a torso collision. Diagnose a miss from
consumed cues, requested approach, actual movement and load before adding a
generic tackle slowdown or stronger grip.

[pursuit]: https://footballtoolbox.net/philosophy-of-team-pursuit
[lb-reaction]: https://footballtoolbox.net/inside-linebackers-teaching-reaction-part-1

## Inspected source ledger

All six pages below returned HTTP 200 on 2026-10-11. Actual prose was inspected;
embedded videos and images were not quantitatively analyzed. Access receipts
and fetched HTML remained in `/tmp/football-defense-research/` for this session,
not as redistributed article copies. Hashes identify retrieved bytes, not a
promise that a future page request will be identical.

| Source | Publication / status | Retrieved HTML SHA-256 |
| --- | --- | --- |
| [Mike Kuchar, press eyes][press] | 2016-04-28; a specific press/catch install | `62a57a1f789a6310b41008e9c8554917d11d19cedd12359b86b85dd185774a21` |
| [Mike Kuchar, off-man hips][hips] | 2016-04-14; specific leverage/cushion/footwork examples | `c61dc1d54944101356bf1f213525a640bc90e9fb21fa9dfea5464a63d7513b21` |
| [Brady Grayvold, deep ball][deep] | 2017-11-30; phase, turn and catch-point teaching | `505fd8ece3879012351a241092d7fbad1ff222f01e9217c2befe90c16f859c58` |
| [Clayton Cason reporting Kyle Cogan, Rip/Liz][ripliz] | 2019-05-21; a high-school coordinator's match install | `8282cf5028be096214be3b66bd9d8dfbb7b744ba9ae798d168b0bd795cf749dd` |
| [Clayton Cason reporting Dante Bartee, quarters/Cover 7][quarters] | 2019-07-02; college coaching examples; terminology varies | `629492c35c4df81311ace53c71ecb8696c053f968c9e60e03797d2a5f864f443` |
| [NFL Football Operations rulebook][rules] | Generic rulebook URL redirected to the served 2026 rulebook; inspected Rule 8 contact/interference and associated holding content | `4b5493b0a3ff47bde3323a91c66f07d1db3daa378c2c3349e6d85749973dd064` |

Local aids actually inspected: *Geometry* sections 1, 4–8 (printed pages 4,
10–18); [WR/DB aid](../references/WR_DB_Mechanics_Textbook.md), sections 11–17;
[coverage manuscript](../references/Coverage_Operating_System_Manuscript.md),
sections 1–12, 15 and the motion/exchange/run-support laboratories; and
[*The Second and Third Level*](../references/football_coverage_mechanics_textbook.pdf),
sections 4 (printed pages 10–11), 6 (13–14) and 21 (37–38). PDFs were read
through the existing `pdftotext -layout` extracts; diagrams were not measured.
The [coverage literature review](../archive/reviews/coverage-literature-applications.md)
gives further exact aid anchors and existing observational labs. These chapter
references are teaching synthesis, not newly verified human measurements.

[press]: https://blogs.usafootball.com/blog/952/training-the-eyes-of-a-defensive-back-in-press-coverage
[hips]: https://blogs.usafootball.com/blog/1047/reading-the-wide-receiver-s-hips-to-teach-man-coverage
[deep]: https://blogs.usafootball.com/blog/5006/how-to-coach-defensive-backs-to-play-the-deep-ball
[ripliz]: https://blogs.usafootball.com/blog/7272/high-school-coordinator-explains-the-details-of-rip-liz-coverage
[quarters]: https://blogs.usafootball.com/blog/7382/college-coach-details-quarters-coverage
[rules]: https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
